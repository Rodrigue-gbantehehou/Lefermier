import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/models/sync_item.dart';
import '../../core/sync/sync_service.dart';
import '../auth/auth_provider.dart';
import '../flocks/flock_provider.dart';
import '../eggs/egg_provider.dart';
import '../finances/finance_provider.dart';
import '../inventory/inventory_provider.dart';
import '../health/health_provider.dart';
import '../dashboard/dashboard_provider.dart';

class SyncState {
  final bool isOnline;
  final bool isSyncing;
  final DateTime? lastSyncTime;
  final List<SyncQueueItem> pendingActions;
  final int lastSyncSuccessCount;
  final String? lastError;

  const SyncState({
    this.isOnline = true,
    this.isSyncing = false,
    this.lastSyncTime,
    this.pendingActions = const [],
    this.lastSyncSuccessCount = 0,
    this.lastError,
  });

  SyncState copyWith({
    bool? isOnline,
    bool? isSyncing,
    DateTime? lastSyncTime,
    List<SyncQueueItem>? pendingActions,
    int? lastSyncSuccessCount,
    String? lastError,
    bool clearError = false,
  }) {
    return SyncState(
      isOnline: isOnline ?? this.isOnline,
      isSyncing: isSyncing ?? this.isSyncing,
      lastSyncTime: lastSyncTime ?? this.lastSyncTime,
      pendingActions: pendingActions ?? this.pendingActions,
      lastSyncSuccessCount: lastSyncSuccessCount ?? this.lastSyncSuccessCount,
      lastError: clearError ? null : (lastError ?? this.lastError),
    );
  }

  int get pendingCount => pendingActions.where((i) => i.isPending).length;
  int get failedCount => pendingActions.where((i) => i.isFailed).length;
  List<SyncQueueItem> get pendingList => pendingActions.where((i) => i.isPending).toList();
  List<SyncQueueItem> get failedList => pendingActions.where((i) => i.isFailed).toList();
}

class SyncNotifier extends StateNotifier<SyncState> {
  final SyncService _syncService;
  final Ref _ref;

  SyncNotifier(this._syncService, this._ref) : super(const SyncState()) {
    init();
  }

  Future<void> init() async {
    await refreshState();
  }

  Future<void> refreshState() async {
    final activeFarm = _ref.read(authProvider).activeFarm;
    DateTime? lastSync;
    if (activeFarm != null) {
      lastSync = await _syncService.getLastSyncTime(activeFarm.id);
    }

    final queue = await _syncService.getQueue();
    final online = await _syncService.checkConnectivity();

    if (!mounted) return;
    state = state.copyWith(
      isOnline: online,
      lastSyncTime: lastSync,
      pendingActions: queue,
    );
  }

  Future<bool> enqueueAction({
    required String label,
    required String method,
    required String endpoint,
    required Map<String, dynamic> payload,
    String? farmId,
  }) async {
    await _syncService.enqueueAction(
      label: label,
      method: method,
      endpoint: endpoint,
      payload: payload,
      farmId: farmId,
    );

    final queue = await _syncService.getQueue();
    if (!mounted) return true;
    state = state.copyWith(pendingActions: queue);

    // Si on est en ligne, tenter de synchroniser immédiatement
    if (state.isOnline) {
      triggerSync();
    }
    return true;
  }

  Future<void> retryAction(String id) async {
    await _syncService.retryFailedItem(id);
    await refreshState();
    if (state.isOnline) {
      triggerSync();
    }
  }

  Future<void> removeAction(String id) async {
    await _syncService.removeQueueItem(id);
    await refreshState();
  }

  Future<void> triggerSync() async {
    final activeFarm = _ref.read(authProvider).activeFarm;
    if (activeFarm == null || state.isSyncing) return;

    if (!mounted) return;
    state = state.copyWith(isSyncing: true, clearError: true);

    try {
      final online = await _syncService.checkConnectivity();
      if (!online) {
        if (!mounted) return;
        state = state.copyWith(
          isSyncing: false,
          isOnline: false,
          lastError: "Connexion impossible. Vos actions restent stockées en toute sécurité.",
        );
        return;
      }

      // 1. Envoyer la file d'attente hors-ligne (Push robuste)
      final flushResult = await _syncService.flushQueue();

      // 2. Rechargement complet des providers — on attend leur réussite avant
      // de faire avancer le curseur de synchronisation. Sans ce await, lastSyncTime
      // pourrait avancer alors que les données locales n'ont pas encore été mises à jour.
      await Future.wait([
        _ref.read(dashboardProvider.notifier).loadDashboard(showLoading: false),
        _ref.read(flockProvider.notifier).loadFlocks(showLoading: false),
        _ref.read(eggProvider.notifier).loadData(showLoading: false),
        _ref.read(financeProvider.notifier).loadTransactions(showLoading: false),
        _ref.read(inventoryProvider.notifier).loadItems(showLoading: false),
        _ref.read(healthProvider.notifier).loadTreatments(showLoading: false),
      ]);

      // 3. Curseur de synchronisation : avancé APRÈS que les rechargements ont abouti.
      // pullDelta() sera activé quand le backend exposera un endpoint /sync/delta
      // permettant d'appliquer des changements incrémentiels. Pour l'instant on enregistre
      // le timestamp de la dernière sync complète réussie.
      await _syncService.setLastSyncTime(activeFarm.id, DateTime.now().toIso8601String());

      final queue = await _syncService.getQueue();
      final lastSync = await _syncService.getLastSyncTime(activeFarm.id);

      if (!mounted) return;
      state = state.copyWith(
        isSyncing: false,
        isOnline: true,
        pendingActions: queue,
        lastSyncTime: lastSync,
        lastSyncSuccessCount: flushResult.sentCount,
        lastError: flushResult.failedCount > 0
            ? "${flushResult.failedCount} action(s) ont rencontré une erreur définitive."
            : null,
      );
    } catch (e) {
      if (!mounted) return;
      state = state.copyWith(
        isSyncing: false,
        lastError: "Erreur pendant la synchronisation: $e",
      );
    }
  }

  Future<void> clearQueue() async {
    await _syncService.clearQueue();
    if (!mounted) return;
    state = state.copyWith(pendingActions: []);
  }
}

final syncServiceProvider = Provider<SyncService>((ref) {
  return SyncService(ApiClient());
});

final syncProvider = StateNotifierProvider<SyncNotifier, SyncState>((ref) {
  ref.watch(authProvider.select((s) => s.activeFarm?.id));
  final service = ref.watch(syncServiceProvider);
  return SyncNotifier(service, ref);
});
