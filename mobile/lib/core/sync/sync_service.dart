import 'dart:async';
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

/// Verrou asynchrone minimaliste sans dépendance externe.
///
/// Garantit que les opérations de lecture-modification-écriture sur la file
/// SharedPreferences (enqueueAction, flushQueue, removeQueueItem, retryFailedItem,
/// clearQueue) ne s'entrecroisent pas, même avec plusieurs appels concurrents.
///
/// Principe : chaque opération protégée s'enchaîne sur la queue de futures
/// existante. L'appelant attend que toutes les opérations antérieures soient
/// terminées avant d'exécuter la sienne.
///
/// Exemple de concurrence résolue :
///   t0: flushQueue() démarre → lit queue [A, B], commence à traiter A
///   t1: enqueueAction(C) demande le verrou → attend que flushQueue() finisse
///   t2: flushQueue() finit, sauvegarde [B] (A réussi, C pas encore en file)
///   t3: enqueueAction(C) obtient le verrou → lit [B], ajoute C, sauvegarde [B, C]
class _AsyncMutex {
  Future<void> _tail = Future.value();

  Future<T> protect<T>(Future<T> Function() action) {
    final completer = Completer<void>();
    final prev = _tail;
    _tail = completer.future;
    return prev
        .then((_) => action())
        .whenComplete(() => completer.complete());
  }
}

class SyncService {
  static const String _queueKey = "lefermier_sync_queue";
  static const String _lastSyncPrefix = "lefermier_last_sync_";

  /// Verrou partagé par toutes les opérations qui mutent la file.
  /// Statique : garantit l'exclusion mutuelle même si plusieurs instances
  /// SyncService coexistent dans le même processus Dart.
  static final _AsyncMutex _queueLock = _AsyncMutex();

  final ApiClient _apiClient;

  SyncService(this._apiClient);

  /// Lecture seule — pas de verrou nécessaire (SharedPreferences est thread-safe
  /// en lecture). Le verrou s'applique uniquement aux cycles lecture-modif-écriture.
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

  /// Ajoute une action à la file.
  ///
  /// [idempotencyKey] : clé à réutiliser si l'opération avait déjà été tentée
  /// (ex: timeout réseau). Passer `e.requestOptions.headers['X-Idempotency-Key']`
  /// depuis le catch DioException du provider. Si absente, une nouvelle UUID est
  /// générée — ce qui créerait un doublon côté serveur si la requête initiale
  /// avait bien été reçue avant le timeout.
  Future<void> enqueueAction({
    required String label,
    required String method,
    required String endpoint,
    required Map<String, dynamic> payload,
    String? farmId,
    String? idempotencyKey,
  }) =>
      _queueLock.protect(() async {
        final prefs = await SharedPreferences.getInstance();
        final currentQueue = await _readQueue(prefs);
        final effectiveFarmId = farmId ?? _apiClient.activeFarmId;
        final ownerKey = _apiClient.sessionSubject;

        final newItem = SyncQueueItem(
          id: const Uuid().v4(),
          label: label,
          method: method.toUpperCase(),
          endpoint: endpoint,
          payload: payload,
          idempotencyKey: idempotencyKey ?? const Uuid().v4(),
          createdAt: DateTime.now(),
          farmId: effectiveFarmId,
          ownerKey: ownerKey,
          status: SyncItemStatus.pending,
        );

        currentQueue.add(newItem);
        await _saveQueue(prefs, currentQueue);
      });

  /// Retire un élément de la file par son identifiant.
  Future<void> removeQueueItem(String id) =>
      _queueLock.protect(() async {
        final prefs = await SharedPreferences.getInstance();
        final currentQueue = await _readQueue(prefs);
        currentQueue.removeWhere((item) => item.id == id);
        await _saveQueue(prefs, currentQueue);
      });

  /// Relance une action en échec.
  ///
  /// Sécurité stricte :
  /// 1. Les actions orphelines (sans propriétaire) restent en quarantaine.
  /// 2. Une action appartenant à un tiers ne peut pas être relancée.
  Future<bool> retryFailedItem(String id) =>
      _queueLock.protect(() async {
        final prefs = await SharedPreferences.getInstance();
        final currentQueue = await _readQueue(prefs);
        final index = currentQueue.indexWhere((item) => item.id == id);
        if (index == -1) return false;

        final item = currentQueue[index];
        if (item.ownerKey == null || item.ownerKey!.isEmpty) return false;

        final currentOwner = _apiClient.sessionSubject;
        if (currentOwner == null || item.ownerKey != currentOwner) return false;

        currentQueue[index] = item.copyWith(
          status: SyncItemStatus.pending,
          retryCount: 0,
          clearNextAttempt: true,
          clearError: true,
        );
        await _saveQueue(prefs, currentQueue);
        return true;
      });

  /// Vide entièrement la file.
  Future<void> clearQueue() =>
      _queueLock.protect(() async {
        final prefs = await SharedPreferences.getInstance();
        await prefs.remove(_queueKey);
      });

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

  /// Envoie toutes les actions en attente vers l'API.
  ///
  /// Protégé par le mutex : garantit qu'aucune action ne peut être ajoutée
  /// (et perdue) pendant la lecture initiale et la sauvegarde finale.
  ///
  /// Fusion post-traitement : relit la file après le traitement pour capturer
  /// les actions ajoutées *pendant* l'exécution réseau (hors verrou), et les
  /// fusionne avec les résultats du traitement. Seuls les IDs *initiaux* sont
  /// exclus — pas les nouveaux arrivants.
  Future<FlushResult> flushQueue() =>
      _queueLock.protect(() async {
        final prefs = await SharedPreferences.getInstance();
        final queue = await _readQueue(prefs);
        if (queue.isEmpty) return const FlushResult();

        // Snapshot des IDs présents AVANT le traitement.
        // Utilisé pour la fusion : on exclut ces IDs de latestQueue afin de
        // ne conserver que les éléments réellement nouveaux. Sans cela, les
        // items réussis — retirés de updatedQueue — seraient réintroduits.
        final initialIds = queue.map((e) => e.id).toSet();

        int sentCount = 0;
        int pendingCount = 0;
        int failedCount = 0;
        final updatedQueue = <SyncQueueItem>[];
        final currentOwner = _apiClient.sessionSubject;
        final now = DateTime.now();

        for (int i = 0; i < queue.length; i++) {
          final item = queue[i];

          // 1. Quarantaine : actions orphelines
          if (item.ownerKey == null || item.ownerKey!.isEmpty) {
            updatedQueue.add(item.copyWith(
              status: SyncItemStatus.failed,
              lastError: "Action orpheline sans propriétaire : mise en quarantaine de sécurité.",
            ));
            failedCount++;
            continue;
          }

          // 2. Isolation : ne pas exécuter les actions d'un autre utilisateur
          if (currentOwner == null || item.ownerKey != currentOwner) {
            updatedQueue.add(item);
            if (item.isFailed) {
              failedCount++;
            } else {
              pendingCount++;
            }
            continue;
          }

          // 3. Actions en échec définitif : conservées pour consultation/réessai
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
              // Méthode non reconnue : quarantaine explicite
              updatedQueue.add(item.copyWith(
                status: SyncItemStatus.failed,
                lastError: 'Méthode HTTP non supportée : ${item.method}',
              ));
              failedCount++;
              continue;
            }

            final isHit = response.headers.value('x-cache-idempotency')?.toUpperCase() == 'HIT';
            final isSuccessCode = response.statusCode != null &&
                response.statusCode! >= 200 &&
                response.statusCode! < 300;

            if (isSuccessCode || isHit) {
              sentCount++;
              // Succès : l'item est retiré de updatedQueue (non réajouté)
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
              updatedQueue.add(item.copyWith(
                lastError: "Session non autorisée (HTTP 401)",
                httpStatus: 401,
              ));
              pendingCount++;

              // PROTECTION CRITIQUE : conserver l'intégralité des actions non traitées
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
            } else if (statusCode != null &&
                (statusCode == 400 || statusCode == 403 || statusCode == 404 || statusCode == 422)) {
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

        // Fusion post-traitement : capture les actions ajoutées pendant l'exécution
        // réseau ci-dessus (qui se déroule hors verrou, puisqu'on est déjà dans
        // _queueLock.protect). On relit la file et on ajoute uniquement les IDs
        // qui n'existaient pas au début du flush (initialIds).
        //
        // Note : pendant flushQueue(), le mutex bloque les enqueueAction concurrents.
        // Mais les appels réseau (await dio.post/put/delete) libèrent le thread Dart
        // et permettent à d'autres microtâches de progresser. Des enqueueAction
        // en attente du verrou s'exécuteront après flushQueue(). La fusion ci-dessous
        // assure qu'on ne perd pas ces actions si elles ont été ajoutées avant la
        // sauvegarde finale.
        final latestQueue = await _readQueue(prefs);
        final newEntries = latestQueue.where((e) => !initialIds.contains(e.id)).toList();
        final mergedQueue = [...updatedQueue, ...newEntries];

        await _saveQueue(prefs, mergedQueue);
        return FlushResult(
          sentCount: sentCount,
          pendingCount: pendingCount,
          failedCount: failedCount,
        );
      });

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

  /// Lecture interne sans SharedPreferences.getInstance() supplémentaire.
  Future<List<SyncQueueItem>> _readQueue(SharedPreferences prefs) async {
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

  Future<void> _saveQueue(SharedPreferences prefs, List<SyncQueueItem> queue) async {
    final list = queue.map((i) => jsonEncode(i.toJson())).toList();
    await prefs.setStringList(_queueKey, list);
  }
}
