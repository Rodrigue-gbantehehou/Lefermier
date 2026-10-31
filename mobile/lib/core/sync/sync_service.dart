import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';
import '../api/api_client.dart';
import '../api/api_endpoints.dart';
import '../models/sync_item.dart';

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
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final currentQueue = await getQueue();

    final newItem = SyncQueueItem(
      id: const Uuid().v4(),
      label: label,
      method: method.toUpperCase(),
      endpoint: endpoint,
      payload: payload,
      idempotencyKey: const Uuid().v4(),
      createdAt: DateTime.now(),
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
          sendTimeout: const Duration(seconds: 3),
          receiveTimeout: const Duration(seconds: 3),
        ),
      );
      return res.statusCode != null && res.statusCode! < 500;
    } catch (_) {
      return false;
    }
  }

  Future<int> flushQueue() async {
    final queue = await getQueue();
    if (queue.isEmpty) return 0;

    int successCount = 0;
    final remaining = <SyncQueueItem>[];

    for (final item in queue) {
      try {
        Response response;
        final opts = Options(
          headers: {
            'X-Idempotency-Key': item.idempotencyKey,
            'Idempotency-Key': item.idempotencyKey,
          },
        );

        if (item.method == 'POST') {
          response = await _apiClient.dio.post(item.endpoint, data: item.payload, options: opts);
        } else if (item.method == 'PUT') {
          response = await _apiClient.dio.put(item.endpoint, data: item.payload, options: opts);
        } else if (item.method == 'DELETE') {
          response = await _apiClient.dio.delete(item.endpoint, options: opts);
        } else {
          continue;
        }

        if (response.statusCode != null && response.statusCode! >= 200 && response.statusCode! < 300) {
          successCount++;
        } else {
          remaining.add(item.copyWith(
            retryCount: item.retryCount + 1,
            lastError: "Code HTTP ${response.statusCode}",
          ));
        }
      } on DioException catch (e) {
        // Si le serveur a déjà traité la requête (409 Conflict ou Idempotency HIT avec réponse déjà passée)
        if (e.response?.statusCode == 409 || e.response?.headers.value('x-cache-idempotency') == 'HIT') {
          successCount++;
        } else {
          remaining.add(item.copyWith(
            retryCount: item.retryCount + 1,
            lastError: e.message ?? "Erreur réseau",
          ));
        }
      } catch (e) {
        remaining.add(item.copyWith(
          retryCount: item.retryCount + 1,
          lastError: e.toString(),
        ));
      }
    }

    final prefs = await SharedPreferences.getInstance();
    await _saveQueue(prefs, remaining);
    return successCount;
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
