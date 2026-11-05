import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:lefermier/core/api/api_client.dart';
import 'package:lefermier/core/models/sync_item.dart';
import 'package:lefermier/core/sync/sync_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late ApiClient apiClient;
  late SyncService syncService;

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    apiClient = ApiClient();
    apiClient.dio.interceptors.clear();
    syncService = SyncService(apiClient);
  });

  group('SyncService - Outbox Queue & Reliability', () {
    test('enqueueAction creates item with UUID, idempotencyKey, and pending status', () async {
      await syncService.enqueueAction(
        label: 'Collecte du matin',
        method: 'POST',
        endpoint: '/api/egg-harvests',
        payload: {'quantity': 150},
        farmId: 'farm_123',
      );

      final queue = await syncService.getQueue();
      expect(queue.length, 1);
      final item = queue.first;

      expect(item.label, 'Collecte du matin');
      expect(item.method, 'POST');
      expect(item.endpoint, '/api/egg-harvests');
      expect(item.payload, {'quantity': 150});
      expect(item.farmId, 'farm_123');
      expect(item.idempotencyKey.isNotEmpty, isTrue);
      expect(item.status, SyncItemStatus.pending);
      expect(item.isPending, isTrue);
      expect(item.isFailed, isFalse);
    });

    test('HTTP 409 Conflict is NOT deleted, sets nextAttemptAt and increments retryCount', () async {
      await syncService.enqueueAction(
        label: 'Vente 10 plateaux',
        method: 'POST',
        endpoint: '/api/finance/transactions',
        payload: {'amount': 25000},
        farmId: 'farm_123',
      );

      // Intercept request to simulate Symfony 409 Conflict with Retry-After: 4
      apiClient.dio.interceptors.add(InterceptorsWrapper(
        onRequest: (options, handler) {
          handler.reject(DioException(
            requestOptions: options,
            response: Response(
              requestOptions: options,
              statusCode: 409,
              headers: Headers.fromMap({'retry-after': ['4']}),
            ),
          ));
        },
      ));

      final result = await syncService.flushQueue();

      expect(result.sentCount, 0);
      expect(result.pendingCount, 1);
      expect(result.failedCount, 0);

      // Verify item remains in queue
      final queue = await syncService.getQueue();
      expect(queue.length, 1);
      final item = queue.first;
      expect(item.isPending, isTrue);
      expect(item.retryCount, 1);
      expect(item.httpStatus, 409);
      expect(item.nextAttemptAt, isNotNull);
      expect(item.nextAttemptAt!.isAfter(DateTime.now()), isTrue);
    });

    test('HTTP 200 with X-Cache-Idempotency: HIT is treated as success and removed', () async {
      await syncService.enqueueAction(
        label: 'Traitement antiparasitaire',
        method: 'POST',
        endpoint: '/api/health-treatments',
        payload: {'notes': 'test'},
      );

      apiClient.dio.interceptors.add(InterceptorsWrapper(
        onRequest: (options, handler) {
          handler.resolve(Response(
            requestOptions: options,
            statusCode: 200,
            headers: Headers.fromMap({'x-cache-idempotency': ['HIT']}),
            data: {'success': true},
          ));
        },
      ));

      final result = await syncService.flushQueue();

      expect(result.sentCount, 1);
      expect(result.pendingCount, 0);

      final queue = await syncService.getQueue();
      expect(queue.isEmpty, isTrue);
    });

    test('Definitive rejection (HTTP 422) marks action as failed with error message', () async {
      await syncService.enqueueAction(
        label: 'Pesée de bande invalide',
        method: 'POST',
        endpoint: '/api/flocks/weights',
        payload: {'weight': -5},
      );

      apiClient.dio.interceptors.add(InterceptorsWrapper(
        onRequest: (options, handler) {
          handler.reject(DioException(
            requestOptions: options,
            response: Response(
              requestOptions: options,
              statusCode: 422,
              data: {'detail': 'Le poids doit être strictement positif.'},
            ),
          ));
        },
      ));

      final result = await syncService.flushQueue();

      expect(result.sentCount, 0);
      expect(result.failedCount, 1);

      final queue = await syncService.getQueue();
      expect(queue.length, 1);
      final item = queue.first;
      expect(item.isFailed, isTrue);
      expect(item.httpStatus, 422);
      expect(item.lastError, contains('Le poids'));
    });

    test('retryFailedItem resets status to pending and clears previous errors', () async {
      await syncService.enqueueAction(
        label: 'Action rejetée',
        method: 'POST',
        endpoint: '/api/items',
        payload: {},
      );

      apiClient.dio.interceptors.add(InterceptorsWrapper(
        onRequest: (options, handler) {
          handler.reject(DioException(
            requestOptions: options,
            response: Response(
              requestOptions: options,
              statusCode: 400,
              data: {'detail': 'Format JSON erroné'},
            ),
          ));
        },
      ));

      await syncService.flushQueue();
      var queue = await syncService.getQueue();
      expect(queue.first.isFailed, isTrue);

      await syncService.retryFailedItem(queue.first.id);

      queue = await syncService.getQueue();
      expect(queue.first.isPending, isTrue);
      expect(queue.first.lastError, isNull);
      expect(queue.first.retryCount, 0);
    });

    test('removeQueueItem completely purges target item', () async {
      await syncService.enqueueAction(
        label: 'Action A',
        method: 'POST',
        endpoint: '/api/a',
        payload: {},
      );
      await syncService.enqueueAction(
        label: 'Action B',
        method: 'POST',
        endpoint: '/api/b',
        payload: {},
      );

      final queue = await syncService.getQueue();
      expect(queue.length, 2);

      await syncService.removeQueueItem(queue.first.id);

      final updated = await syncService.getQueue();
      expect(updated.length, 1);
      expect(updated.first.label, 'Action B');
    });
  });
}
