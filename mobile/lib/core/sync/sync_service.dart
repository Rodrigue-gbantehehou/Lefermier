import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';
import '../api/api_client.dart';
import '../api/api_endpoints.dart';
import '../models/sync_item.dart';

/// Résultat d'un appel à [SyncService.flushQueue].
///
/// [skipped] est vrai quand un autre flush était déjà en cours au moment de
/// l'appel. Dans ce cas, les trois compteurs sont à zéro mais cela NE signifie
/// PAS que la file était vide ou que toutes les actions ont été transmises.
/// Un appelant ne doit PAS avancer le curseur de synchronisation sur [skipped].
///
/// [sentCount]   : actions transmises avec succès (HTTP 2xx ou cache-idempotency HIT).
/// [pendingCount]: actions encore en attente (erreur réseau, 401, 409, Retry-After…).
/// [failedCount] : actions en échec définitif (400 / 403 / 404 / 422 / orphelines).
class FlushResult {
  final int sentCount;
  final int pendingCount;
  final int failedCount;
  final bool skipped;

  const FlushResult({
    this.sentCount = 0,
    this.pendingCount = 0,
    this.failedCount = 0,
    this.skipped = false,
  });

  /// Vrai quand TOUTES les actions du snapshot initial ont été traitées sans
  /// rester en attente ni en erreur définitive. C'est la seule condition sous
  /// laquelle le curseur de synchronisation peut être avancé.
  bool get allDispatched => !skipped && pendingCount == 0 && failedCount == 0;
}

/// Verrou asynchrone minimaliste sans dépendance externe.
///
/// Garantit que les opérations de lecture-modification-écriture sur la file
/// SharedPreferences (enqueueAction, phases I/O de flushQueue, removeQueueItem,
/// retryFailedItem, clearQueue) ne s'entrecroisent pas.
///
/// IMPORTANT : les appels réseau (Dio) sont exécutés HORS du verrou pour que
/// l'utilisateur puisse toujours ajouter des actions pendant qu'un flush est en
/// cours. Seules les phases de lecture et d'écriture dans SharedPreferences sont
/// protégées.
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
  static const String _queueKey = "poulvia_sync_queue";
  static const String _lastSyncPrefix = "poulvia_last_sync_";

  /// Verrou partagé par toutes les opérations qui mutent la file.
  /// Statique : garantit l'exclusion mutuelle même si plusieurs instances
  /// SyncService coexistent dans le même processus Dart.
  static final _AsyncMutex _queueLock = _AsyncMutex();

  /// Guard contre les flushQueue() simultanés.
  /// Si un flush est déjà en cours, le second appel retourne immédiatement
  /// un FlushResult vide plutôt que de lire le même snapshot et d'envoyer
  /// des doublons réseau. L'idempotence backend reste la dernière ligne de défense,
  /// mais ce guard évite la contention au niveau de la file locale.
  static bool _flushInProgress = false;

  final ApiClient _apiClient;

  SyncService(this._apiClient);

  /// Lecture seule — pas de verrou nécessaire.
  Future<List<SyncQueueItem>> getQueue() async {
    final prefs = await SharedPreferences.getInstance();
    return _readQueue(prefs);
  }

  /// Ajoute une action à la file (sous verrou).
  ///
  /// [idempotencyKey] : clé à réutiliser si l'opération avait déjà été tentée.
  /// Passer `e.requestOptions.headers['X-Idempotency-Key']` depuis le catch DioException
  /// du provider pour que le serveur reconnaisse la requête comme un doublon.
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
        final currentQueue = _readQueue(prefs);
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

  /// Retire un élément de la file (sous verrou).
  Future<void> removeQueueItem(String id) =>
      _queueLock.protect(() async {
        final prefs = await SharedPreferences.getInstance();
        final currentQueue = _readQueue(prefs);
        currentQueue.removeWhere((item) => item.id == id);
        await _saveQueue(prefs, currentQueue);
      });

  /// Relance une action en échec (sous verrou).
  Future<bool> retryFailedItem(String id) =>
      _queueLock.protect(() async {
        final prefs = await SharedPreferences.getInstance();
        final currentQueue = _readQueue(prefs);
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

  /// Vide la file (sous verrou).
  Future<void> clearQueue() =>
      _queueLock.protect(() async {
        final prefs = await SharedPreferences.getInstance();
        await prefs.remove(_queueKey);
      });

  Future<DateTime?> getLastSyncTime(String farmId) async {
    final prefs = await SharedPreferences.getInstance();
    final val = prefs.getString("$_lastSyncPrefix$farmId");
    return val != null ? DateTime.tryParse(val) : null;
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
  /// Architecture en 3 phases pour séparer verrou local et appels réseau :
  ///
  /// Phase A (sous verrou) : lire la file et extraire le snapshot initial.
  ///   → Garantit que personne ne modifie la file pendant la lecture.
  ///
  /// Phase B (hors verrou) : exécuter les requêtes réseau.
  ///   → enqueueAction(), removeQueueItem(), etc. peuvent s'exécuter librement
  ///     pendant les appels Dio potentiellement lents.
  ///
  /// Phase C (sous verrou) : fusionner les résultats avec les nouvelles entrées.
  ///   → On relit la file, on écarte les IDs initiaux (traités en phase B),
  ///     et on sauvegarde [résultats du traitement + nouvelles entrées].
  Future<FlushResult> flushQueue() async {
    // Guard contre les appels simultanés : un seul flush actif à la fois.
    // Retourne skipped:true (et non un résultat vide) pour que l'appelant
    // puisse distinguer "file vide" de "flush ignoré car déjà en cours".
    if (_flushInProgress) return const FlushResult(skipped: true);
    _flushInProgress = true;
    try {
    // ── Phase A : lecture sous verrou ──────────────────────────────────────────
    late List<SyncQueueItem> queue;
    await _queueLock.protect(() async {
      final prefs = await SharedPreferences.getInstance();
      queue = _readQueue(prefs);
    });

    if (queue.isEmpty) return const FlushResult();
    // Snapshot des IDs présents AVANT le traitement réseau.
    // Utilisé en phase C pour distinguer les entrées initiales (traitées)
    // des nouvelles entrées ajoutées pendant la phase B.
    final initialIds = queue.map((e) => e.id).toSet();

    // ── Phase B : traitement réseau HORS verrou ────────────────────────────────
    int sentCount = 0;
    int pendingCount = 0;
    int failedCount = 0;
    final updatedQueue = <SyncQueueItem>[];
    final currentOwner = _apiClient.sessionSubject;
    final now = DateTime.now();

    for (int i = 0; i < queue.length; i++) {
      final item = queue[i];

      // Quarantaine : actions orphelines
      if (item.ownerKey == null || item.ownerKey!.isEmpty) {
        updatedQueue.add(item.copyWith(
          status: SyncItemStatus.failed,
          lastError: "Action orpheline sans propriétaire : mise en quarantaine de sécurité.",
        ));
        failedCount++;
        continue;
      }

      // Isolation : ne pas exécuter les actions d'un autre utilisateur
      if (currentOwner == null || item.ownerKey != currentOwner) {
        updatedQueue.add(item);
        if (item.isFailed) { failedCount++; } else { pendingCount++; }
        continue;
      }

      // Échec définitif : conservé pour consultation/réessai
      if (item.isFailed) {
        updatedQueue.add(item);
        failedCount++;
        continue;
      }

      // Temporisation (Retry-After ou Exponential Backoff)
      if (item.nextAttemptAt != null && now.isBefore(item.nextAttemptAt!)) {
        updatedQueue.add(item);
        pendingCount++;
        continue;
      }

      // Appels réseau — hors verrou, enqueueAction peut s'exécuter en parallèle
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
          updatedQueue.add(item.copyWith(
            status: SyncItemStatus.failed,
            lastError: 'Méthode HTTP non supportée : ${item.method}',
          ));
          failedCount++;
          continue;
        }

        final isHit = response.headers.value('x-cache-idempotency')?.toUpperCase() == 'HIT';
        final isSuccess = response.statusCode != null &&
            response.statusCode! >= 200 &&
            response.statusCode! < 300;

        if (isSuccess || isHit) {
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
          if (retryHeader != null) retryAfterSec = int.tryParse(retryHeader) ?? 2;
          updatedQueue.add(item.copyWith(
            retryCount: item.retryCount + 1,
            nextAttemptAt: DateTime.now().add(Duration(seconds: retryAfterSec)),
            lastError: "Opération en cours de traitement sur le serveur (HTTP 409)",
            httpStatus: 409,
          ));
          pendingCount++;
        } else if (statusCode == 401) {
          updatedQueue.add(item.copyWith(lastError: "Session non autorisée (HTTP 401)", httpStatus: 401));
          pendingCount++;
          // Conserver toutes les actions non traitées
          for (int j = i + 1; j < queue.length; j++) {
            final nextItem = queue[j];
            updatedQueue.add(nextItem);
            if (nextItem.isFailed) { failedCount++; } else { pendingCount++; }
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
        updatedQueue.add(item.copyWith(retryCount: item.retryCount + 1, lastError: e.toString()));
        pendingCount++;
      }
    }

    // ── Phase C : fusion et écriture sous verrou ───────────────────────────────
    // On relit la file pour capturer les actions ajoutées pendant la phase B
    // (hors verrou). On n'inclut que les IDs qui n'existaient pas au début du flush.
    //
    // Tombstone : si l'utilisateur a appelé removeQueueItem() sur un item pendant
    // la phase B, cet item est absent de latestQueue mais présent dans updatedQueue
    // (en état d'erreur ou en attente). On l'exclut de la fusion pour respecter la
    // suppression intentionnelle.
    return await _queueLock.protect(() async {
      final prefs = await SharedPreferences.getInstance();
      final latestQueue = _readQueue(prefs);
      final latestIds = latestQueue.map((e) => e.id).toSet();
      // IDs supprimés intentionnellement par l'utilisateur pendant la phase réseau
      final deletedDuringFlush = initialIds.difference(latestIds);
      // N'inclure dans la file finale que les items non supprimés intentionnellement
      final survivingUpdated = updatedQueue.where((e) => !deletedDuringFlush.contains(e.id)).toList();
      final newEntries = latestQueue.where((e) => !initialIds.contains(e.id)).toList();
      final mergedQueue = [...survivingUpdated, ...newEntries];
      await _saveQueue(prefs, mergedQueue);
      return FlushResult(
        sentCount: sentCount,
        pendingCount: pendingCount,
        failedCount: failedCount,
      );
    });
    } finally {
      _flushInProgress = false;
    }
  }

  Future<Map<String, dynamic>?> pullDelta(String farmId) async {
    try {
      final lastSync = await getLastSyncTime(farmId);
      final queryParams = <String, dynamic>{};
      if (lastSync != null) queryParams['since'] = lastSync.toIso8601String();

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

  List<SyncQueueItem> _readQueue(SharedPreferences prefs) {
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
