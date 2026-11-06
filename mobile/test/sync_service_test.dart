import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_secure_storage/test/test_flutter_secure_storage_platform.dart';
import 'package:flutter_secure_storage_platform_interface/flutter_secure_storage_platform_interface.dart';
import 'package:poulvia/core/api/api_client.dart';
import 'package:poulvia/core/models/sync_item.dart';
import 'package:poulvia/core/security/secure_storage_service.dart';
import 'package:poulvia/core/sync/sync_service.dart';

String _createMockJwt(String username) {
  final header = base64Url.encode(utf8.encode(jsonEncode({'alg': 'none', 'typ': 'JWT'}))).replaceAll('=', '');
  final payload = base64Url.encode(utf8.encode(jsonEncode({'username': username, 'sub': 'user_123'}))).replaceAll('=', '');
  return '$header.$payload.mock_signature';
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late ApiClient apiClient;
  late SyncService syncService;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    FlutterSecureStoragePlatform.instance = TestFlutterSecureStoragePlatform({});
    SecureStorageService().resetForTesting();
    apiClient = ApiClient();
    apiClient.dio.interceptors.clear();
    await apiClient.setAuthTokens(token: _createMockJwt('test_user'), refreshToken: 'refresh_token');
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

    test('retryFailedItem refuses to retry or adopt orphan action', () async {
      final prefs = await SharedPreferences.getInstance();
      final orphanItem = SyncQueueItem(
        id: 'orphan_retry_test',
        label: 'Action orpheline bloquée',
        method: 'POST',
        endpoint: '/api/orphan-test',
        payload: {},
        idempotencyKey: 'idem_orphan_retry',
        createdAt: DateTime.now(),
        ownerKey: null,
        status: SyncItemStatus.failed,
        lastError: 'Quarantaine de sécurité',
      );
      await prefs.setStringList('poulvia_sync_queue', [jsonEncode(orphanItem.toJson())]);

      final success = await syncService.retryFailedItem('orphan_retry_test');
      expect(success, isFalse);

      final queue = await syncService.getQueue();
      expect(queue.first.isFailed, isTrue);
      expect(queue.first.ownerKey, isNull);
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

    test('HTTP 401 preserves remaining queue items without silent truncation', () async {
      await syncService.enqueueAction(
        label: 'Action 1 - Réussie',
        method: 'POST',
        endpoint: '/api/action-1',
        payload: {'k': 1},
      );
      await syncService.enqueueAction(
        label: 'Action 2 - Non autorisée',
        method: 'POST',
        endpoint: '/api/action-2',
        payload: {'k': 2},
      );
      await syncService.enqueueAction(
        label: 'Action 3 - Subséquente',
        method: 'POST',
        endpoint: '/api/action-3',
        payload: {'k': 3},
      );

      apiClient.dio.interceptors.add(InterceptorsWrapper(
        onRequest: (options, handler) {
          if (options.path == '/api/action-1') {
            handler.resolve(Response(
              requestOptions: options,
              statusCode: 200,
              data: {'ok': true},
            ));
          } else if (options.path == '/api/action-2') {
            handler.reject(DioException(
              requestOptions: options,
              response: Response(
                requestOptions: options,
                statusCode: 401,
              ),
            ));
          } else {
            handler.resolve(Response(
              requestOptions: options,
              statusCode: 200,
              data: {'ok': true},
            ));
          }
        },
      ));

      final result = await syncService.flushQueue();

      expect(result.sentCount, 1);
      expect(result.pendingCount, 2);

      final queue = await syncService.getQueue();
      expect(queue.length, 2);
      expect(queue[0].label, 'Action 2 - Non autorisée');
      expect(queue[0].httpStatus, 401);
      expect(queue[1].label, 'Action 3 - Subséquente');
      expect(queue[1].isPending, isTrue);
    });

    test('Quarantines orphan actions without ownerKey into failed status', () async {
      final prefs = await SharedPreferences.getInstance();
      final orphanItem = SyncQueueItem(
        id: 'orphan_123',
        label: 'Action sans propriétaire',
        method: 'POST',
        endpoint: '/api/orphan',
        payload: {},
        idempotencyKey: 'idem_orphan',
        createdAt: DateTime.now(),
        ownerKey: null,
      );
      await prefs.setStringList('poulvia_sync_queue', [jsonEncode(orphanItem.toJson())]);

      final result = await syncService.flushQueue();

      expect(result.sentCount, 0);
      expect(result.failedCount, 1);

      final queue = await syncService.getQueue();
      expect(queue.length, 1);
      expect(queue.first.isFailed, isTrue);
      expect(queue.first.lastError, contains('quarantaine de sécurité'));
    });

    test('Preserves other users actions in queue without transmitting them', () async {
      final prefs = await SharedPreferences.getInstance();
      final aliceItem = SyncQueueItem(
        id: 'alice_123',
        label: 'Action de Alice',
        method: 'POST',
        endpoint: '/api/alice',
        payload: {},
        idempotencyKey: 'idem_alice',
        createdAt: DateTime.now(),
        ownerKey: 'user_alice',
      );
      await prefs.setStringList('poulvia_sync_queue', [jsonEncode(aliceItem.toJson())]);

      final result = await syncService.flushQueue();

      expect(result.sentCount, 0);
      expect(result.pendingCount, 1);

      final queue = await syncService.getQueue();
      expect(queue.length, 1);
      expect(queue.first.label, 'Action de Alice');
      expect(queue.first.ownerKey, 'user_alice');
    });
  });
}
