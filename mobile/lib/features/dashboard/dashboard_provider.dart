import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/models/flock.dart';
import '../../core/models/transaction.dart';
import '../auth/auth_provider.dart';
import '../../core/sync/offline_cache_service.dart';

class DashboardKpiData {
  final int todayGoodEggs;
  final int todayTraysCount;
  final double todayLayingRate;
  final int totalBirds;
  final int activeFlocksCount;
  final int currentMonthNetBalance;
  final int currentMonthIncome;
  final int currentMonthExpense;
  final String currency;
  final List<Flock> flocks;
  final List<Transaction> recentTransactions;

  const DashboardKpiData({
    this.todayGoodEggs = 0,
    this.todayTraysCount = 0,
    this.todayLayingRate = 0.0,
    this.totalBirds = 0,
    this.activeFlocksCount = 0,
    this.currentMonthNetBalance = 0,
    this.currentMonthIncome = 0,
    this.currentMonthExpense = 0,
    this.currency = "FCFA",
    this.flocks = const [],
    this.recentTransactions = const [],
  });

  factory DashboardKpiData.fromJson(Map<String, dynamic> json, List<Flock> flocks) {
    final eggToday = json['eggProduction']?['today'] as Map<String, dynamic>? ?? {};
    final flocksSummary = json['flocks'] as Map<String, dynamic>? ?? {};
    final finMonth = json['finances']?['currentMonth'] as Map<String, dynamic>? ?? {};
    final rawRecentTx = json['finances']?['recentTransactions'] as List<dynamic>? ?? [];

    final transactions = rawRecentTx
        .map((t) => Transaction.fromJson(t as Map<String, dynamic>))
        .toList();

    return DashboardKpiData(
      todayGoodEggs: (eggToday['goodEggs'] as num?)?.toInt() ?? 0,
      todayTraysCount: (eggToday['traysCount'] as num?)?.toInt() ?? 0,
      todayLayingRate: (eggToday['layingRate'] as num?)?.toDouble() ?? 0.0,
      totalBirds: (flocksSummary['totalBirds'] as num?)?.toInt() ?? 0,
      activeFlocksCount: (flocksSummary['activeFlocksCount'] as num?)?.toInt() ?? 0,
      currentMonthNetBalance: (finMonth['netBalance'] as num?)?.toInt() ?? 0,
      currentMonthIncome: (finMonth['income'] as num?)?.toInt() ?? 0,
      currentMonthExpense: (finMonth['expense'] as num?)?.toInt() ?? 0,
      currency: "FCFA",
      flocks: flocks,
      recentTransactions: transactions,
    );
  }
}

class DashboardState {
  final bool isLoading;
  final String? error;
  final DashboardKpiData kpi;

  const DashboardState({
    this.isLoading = false,
    this.error,
    this.kpi = const DashboardKpiData(),
  });

  DashboardState copyWith({
    bool? isLoading,
    String? error,
    DashboardKpiData? kpi,
    bool clearError = false,
  }) {
    return DashboardState(
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
      kpi: kpi ?? this.kpi,
    );
  }
}

class DashboardNotifier extends StateNotifier<DashboardState> {
  final ApiClient _apiClient;
  final Ref _ref;

  DashboardNotifier(this._apiClient, this._ref) : super(const DashboardState()) {
    loadDashboard();
  }

  Future<void> loadDashboard({bool showLoading = true}) async {
    final activeFarm = _ref.read(authProvider).activeFarm;
    if (activeFarm == null) {
      state = state.copyWith(isLoading: false);
      return;
    }

    // 1. Restitution instantanée depuis le cache local si données vides
    if (state.kpi.flocks.isEmpty && state.kpi.totalBirds == 0 && state.kpi.todayGoodEggs == 0) {
      final cachedDash = await OfflineCacheService().getMapCache(
        farmId: activeFarm.id,
        category: 'dashboard',
      );
      final cachedFlocks = await OfflineCacheService().getListCache(
        farmId: activeFarm.id,
        category: 'flocks',
      );
      if (cachedDash != null) {
        final flocks = (cachedFlocks ?? [])
            .map((item) => Flock.fromJson(item as Map<String, dynamic>))
            .toList();
        state = state.copyWith(
          kpi: DashboardKpiData.fromJson(cachedDash, flocks),
        );
      }
    }

    if (showLoading && state.kpi.flocks.isEmpty) {
      state = state.copyWith(isLoading: true, clearError: true);
    }

    try {
      // 1. Dashboard summary
      final dashRes = await _apiClient.dio.get(
        ApiEndpoints.farmDashboard(activeFarm.id),
      );

      // 2. Flocks list
      final flocksRes = await _apiClient.dio.get(
        ApiEndpoints.farmFlocks(activeFarm.id),
        queryParameters: {'status': 'ACTIVE'},
      );

      final rawFlocks = flocksRes.data['data'] as List<dynamic>? ?? [];
      final flocks = rawFlocks
          .map((item) => Flock.fromJson(item as Map<String, dynamic>))
          .toList();

      final dashData = dashRes.data['data'] as Map<String, dynamic>? ?? {};

      // Sauvegarde dans le cache local
      await OfflineCacheService().setCache(
        farmId: activeFarm.id,
        category: 'dashboard',
        data: dashData,
      );

      final kpi = DashboardKpiData.fromJson(
        dashData,
        flocks,
      );

      state = state.copyWith(
        isLoading: false,
        kpi: kpi,
      );
    } on DioException catch (e) {
      if (state.kpi.flocks.isEmpty) {
        String message = "Impossible de charger le tableau de bord.";
        if (e.response?.data is Map && e.response?.data['message'] != null) {
          message = e.response!.data['message'] as String;
        }
        state = state.copyWith(isLoading: false, error: message);
      } else {
        state = state.copyWith(isLoading: false);
      }
    } catch (e) {
      if (state.kpi.flocks.isEmpty) {
        state = state.copyWith(
          isLoading: false,
          error: "Erreur de chargement: $e",
        );
      } else {
        state = state.copyWith(isLoading: false);
      }
    }
  }
}

final dashboardProvider = StateNotifierProvider<DashboardNotifier, DashboardState>((ref) {
  // Déclenche un rechargement automatique si l'exploitation active change
  ref.watch(authProvider.select((s) => s.activeFarm?.id));
  return DashboardNotifier(ApiClient(), ref);
});
