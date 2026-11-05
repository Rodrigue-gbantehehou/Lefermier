import 'dart:convert';
import 'dart:math';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';
import '../api/api_client.dart';
import '../api/api_endpoints.dart';
import '../models/sync_item.dart';

class FlushResult {
  final int sentCount;
  final int pendingCount;
  final int failedCount;

  const FlushResult({
    this.sentCount = 0,
    this.pendingCount = 0,
    this.failedCount = 0,
  });
}

class SyncService {
  static const String _queueKey = "lefermier_sync_queue";
  static const String _lastSyncPrefix = "lefermier_last_sync_";

  final ApiClient _apiClient;

  SyncService(this._apiClient);

  Future<List<SyncQueueItem>> getQueue() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getStringList(_queueKey) ?? [];
    return raw.map((itemStr) {
      try {
        final map = jsonDecode(itemStr) as Map<String, dynamic>;
        return SyncQueueItem.fromJson(map);
      } catch (_) {
        return null;
      }
    }).whereType<SyncQueueItem>().toList();
  }

  Future<void> enqueueAction({
    required String label,
    required String method,
    required String endpoint,
    required Map<String, dynamic> payload,
    String? farmId,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final currentQueue = await getQueue();
    final effectiveFarmId = farmId ?? _apiClient.activeFarmId;
    final ownerKey = _apiClient.sessionSubject;

    final newItem = SyncQueueItem(
      id: const Uuid().v4(),
      label: label,
      method: method.toUpperCase(),
      endpoint: endpoint,
      payload: payload,
      idempotencyKey: const Uuid().v4(),
      createdAt: DateTime.now(),
      farmId: effectiveFarmId,
      ownerKey: ownerKey,
      status: SyncItemStatus.pending,
    );

    currentQueue.add(newItem);
    await _saveQueue(prefs, currentQueue);
  }

  Future<void> removeQueueItem(String id) async {
    final prefs = await SharedPreferences.getInstance();
    final currentQueue = await getQueue();
    currentQueue.removeWhere((item) => item.id == id);
    await _saveQueue(prefs, currentQueue);
  }

  Future<void> retryFailedItem(String id) async {
    final prefs = await SharedPreferences.getInstance();
    final currentQueue = await getQueue();
    final index = currentQueue.indexWhere((item) => item.id == id);
    if (index != -1) {
      final currentOwner = _apiClient.sessionSubject;
      currentQueue[index] = currentQueue[index].copyWith(
        status: SyncItemStatus.pending,
        retryCount: 0,
        ownerKey: currentQueue[index].ownerKey ?? currentOwner,
        clearNextAttempt: true,
        clearError: true,
      );
      await _saveQueue(prefs, currentQueue);
    }
  }

  Future<void> clearQueue() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_queueKey);
  }

  Future<DateTime?> getLastSyncTime(String farmId) async {
    final prefs = await SharedPreferences.getInstance();
    final val = prefs.getString("$_lastSyncPrefix$farmId");
    if (val != null) {
      return DateTime.tryParse(val);
    }
    return null;
  }

  Future<void> setLastSyncTime(String farmId, String isoTime) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString("$_lastSyncPrefix$farmId", isoTime);
  }

  Future<bool> checkConnectivity() async {
    try {
      final res = await _apiClient.dio.get(
        ApiEndpoints.farms,
        options: Options(
          sendTimeout: const Duration(seconds: 4),
          receiveTimeout: const Duration(seconds: 4),
        ),
      );
      return res.statusCode != null && res.statusCode! < 500;
    } catch (_) {
      return false;
    }
  }

  Future<FlushResult> flushQueue() async {
    final queue = await getQueue();
    if (queue.isEmpty) return const FlushResult();

    int sentCount = 0;
    int pendingCount = 0;
    int failedCount = 0;
    final updatedQueue = <SyncQueueItem>[];
    final currentOwner = _apiClient.sessionSubject;
    final now = DateTime.now();

    for (int i = 0; i < queue.length; i++) {
      final item = queue[i];

      // 1. Quarantaine de sécurité : actions orphelines (sans propriétaire identifié)
      // Ne sont JAMAIS transmises automatiquement sous la session d'un tiers.
      if (item.ownerKey == null || item.ownerKey!.isEmpty) {
        updatedQueue.add(item.copyWith(
          status: SyncItemStatus.failed,
          lastError: "Action orpheline sans propriétaire : mise en quarantaine de sécurité.",
        ));
        failedCount++;
        continue;
      }

      // 2. Isolation de sécurité : ne pas exécuter les actions d'un autre utilisateur
      if (currentOwner == null || item.ownerKey != currentOwner) {
        updatedQueue.add(item);
        if (item.isFailed) {
          failedCount++;
        } else {
          pendingCount++;
        }
        continue;
      }

      // 3. Les actions en échec définitif restent enregistrées pour consultation/réessai
      if (item.isFailed) {
        updatedQueue.add(item);
        failedCount++;
        continue;
      }

      // 4. Temporisation (Retry-After ou Exponential Backoff)
      if (item.nextAttemptAt != null && now.isBefore(item.nextAttemptAt!)) {
        updatedQueue.add(item);
        pendingCount++;
        continue;
      }

      try {
        Response response;
        final headers = <String, dynamic>{
          'X-Idempotency-Key': item.idempotencyKey,
          'Idempotency-Key': item.idempotencyKey,
        };
        if (item.farmId != null && item.farmId!.isNotEmpty) {
          headers['X-Farm-Id'] = item.farmId;
        }

        final opts = Options(headers: headers);

        if (item.method == 'POST') {
          response = await _apiClient.dio.post(item.endpoint, data: item.payload, options: opts);
        } else if (item.method == 'PUT') {
          response = await _apiClient.dio.put(item.endpoint, data: item.payload, options: opts);
        } else if (item.method == 'DELETE') {
          response = await _apiClient.dio.delete(item.endpoint, options: opts);
        } else {
          continue;
        }

        final isHit = response.headers.value('x-cache-idempotency')?.toUpperCase() == 'HIT';
        final isSuccessCode = response.statusCode != null && response.statusCode! >= 200 && response.statusCode! < 300;

        if (isSuccessCode || isHit) {
          sentCount++;
          // Succès confirmé : l'action est retirée de la file
        } else {
          updatedQueue.add(item.copyWith(
            retryCount: item.retryCount + 1,
            lastError: "Code HTTP ${response.statusCode}",
            httpStatus: response.statusCode,
          ));
          pendingCount++;
        }
      } on DioException catch (e) {
        final statusCode = e.response?.statusCode;
        final isHit = e.response?.headers.value('x-cache-idempotency')?.toUpperCase() == 'HIT';

        if (isHit) {
          sentCount++;
        } else if (statusCode == 409) {
          // 409 Conflict sur Symfony : Opération en cours de traitement par verrou d'idempotence
          // Respect de l'en-tête Retry-After si fourni
          int retryAfterSec = 2;
          final retryHeader = e.response?.headers.value('retry-after');
          if (retryHeader != null) {
            retryAfterSec = int.tryParse(retryHeader) ?? 2;
          }

          updatedQueue.add(item.copyWith(
            retryCount: item.retryCount + 1,
            nextAttemptAt: DateTime.now().add(Duration(seconds: retryAfterSec)),
            lastError: "Opération en cours de traitement sur le serveur (HTTP 409)",
            httpStatus: 409,
          ));
          pendingCount++;
        } else if (statusCode == 401) {
          // Session expirée : conserver l'action courante
          updatedQueue.add(item.copyWith(
            lastError: "Session non autorisée (HTTP 401)",
            httpStatus: 401,
          ));
          pendingCount++;

          // PROTECTION CRITIQUE : Conserver l'intégralité des actions subséquentes non traitées !
          for (int j = i + 1; j < queue.length; j++) {
            final nextItem = queue[j];
            updatedQueue.add(nextItem);
            if (nextItem.isFailed) {
              failedCount++;
            } else {
              pendingCount++;
            }
          }
          break;
        } else if (statusCode != null && (statusCode == 400 || statusCode == 403 || statusCode == 404 || statusCode == 422)) {
          // Erreur métier définitive (quota dépassé, validation invalide, ressource supprimée)
          String msg = "Erreur $statusCode";
          if (e.response?.data is Map) {
            final data = e.response!.data as Map;
            msg = data['detail'] ?? data['message'] ?? msg;
          }
          updatedQueue.add(item.copyWith(
            status: SyncItemStatus.failed,
            lastError: msg,
            httpStatus: statusCode,
          ));
          failedCount++;
        } else {
          // Erreur réseau / Timeout / Erreur 5xx transitoire -> Backoff exponentiel (max 60s)
          final delaySec = min(60, 2 << min(item.retryCount, 5));
          updatedQueue.add(item.copyWith(
            retryCount: item.retryCount + 1,
            nextAttemptAt: DateTime.now().add(Duration(seconds: delaySec)),
            lastError: e.message ?? "Erreur réseau de transmission",
            httpStatus: statusCode,
          ));
          pendingCount++;
        }
      } catch (e) {
        updatedQueue.add(item.copyWith(
          retryCount: item.retryCount + 1,
          lastError: e.toString(),
        ));
        pendingCount++;
      }
    }

    final prefs = await SharedPreferences.getInstance();
    await _saveQueue(prefs, updatedQueue);
    return FlushResult(
      sentCount: sentCount,
      pendingCount: pendingCount,
      failedCount: failedCount,
    );
  }

  Future<Map<String, dynamic>?> pullDelta(String farmId) async {
    try {
      final lastSync = await getLastSyncTime(farmId);
      final queryParams = <String, dynamic>{};
      if (lastSync != null) {
        queryParams['since'] = lastSync.toIso8601String();
      }

      final response = await _apiClient.dio.get(
        ApiEndpoints.farmSyncPull(farmId),
        queryParameters: queryParams,
      );

      final data = response.data['data'] as Map<String, dynamic>?;
      if (data != null && data['serverTime'] != null) {
        await setLastSyncTime(farmId, data['serverTime'] as String);
      }
      return data;
    } catch (_) {
      return null;
    }
  }

  Future<void> _saveQueue(SharedPreferences prefs, List<SyncQueueItem> queue) async {
    final list = queue.map((i) => jsonEncode(i.toJson())).toList();
    await prefs.setStringList(_queueKey, list);
  }
}
