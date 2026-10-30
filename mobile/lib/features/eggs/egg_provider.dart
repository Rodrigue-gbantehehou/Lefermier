import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/models/egg_production.dart';
import '../../core/models/flock.dart';
import '../auth/auth_provider.dart';

class EggSummaryStats {
  final int totalGoodEggs;
  final int totalCrackedEggs;
  final int totalDirtyEggs;
  final int totalDeformedEggs;
  final int totalEggs;
  final int totalTrays;
  final int totalLooseEggs;
  final double averageLayingRate;
  final int collectionsCount;

  int get totalDamagedEggs => totalCrackedEggs + totalDirtyEggs + totalDeformedEggs;

  const EggSummaryStats({
    this.totalGoodEggs = 0,
    this.totalCrackedEggs = 0,
    this.totalDirtyEggs = 0,
    this.totalDeformedEggs = 0,
    this.totalEggs = 0,
    this.totalTrays = 0,
    this.totalLooseEggs = 0,
    this.averageLayingRate = 0.0,
    this.collectionsCount = 0,
  });

  factory EggSummaryStats.fromJson(Map<String, dynamic> json) {
    return EggSummaryStats(
      totalGoodEggs: json['totalGoodEggs'] as int? ?? 0,
      totalCrackedEggs: json['totalCrackedEggs'] as int? ?? 0,
      totalDirtyEggs: json['totalDirtyEggs'] as int? ?? 0,
      totalDeformedEggs: json['totalDeformedEggs'] as int? ?? 0,
      totalEggs: json['totalEggs'] as int? ?? 0,
      totalTrays: json['totalTrays'] as int? ?? 0,
      totalLooseEggs: json['totalLooseEggs'] as int? ?? 0,
      averageLayingRate: (json['averageLayingRate'] as num?)?.toDouble() ?? 0.0,
      collectionsCount: json['collectionsCount'] as int? ?? 0,
    );
  }
}

class EggState {
  final bool isLoading;
  final bool isSubmitting;
  final String? error;
  final List<EggProduction> productions;
  final List<Flock> layerFlocks;
  final String? selectedFlockId;
  final EggSummaryStats summary;

  const EggState({
    this.isLoading = false,
    this.isSubmitting = false,
    this.error,
    this.productions = const [],
    this.layerFlocks = const [],
    this.selectedFlockId,
    this.summary = const EggSummaryStats(),
  });

  EggState copyWith({
    bool? isLoading,
    bool? isSubmitting,
    String? error,
    List<EggProduction>? productions,
    List<Flock>? layerFlocks,
    String? selectedFlockId,
    EggSummaryStats? summary,
    bool clearError = false,
    bool clearSelectedFlock = false,
  }) {
    return EggState(
      isLoading: isLoading ?? this.isLoading,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      error: clearError ? null : (error ?? this.error),
      productions: productions ?? this.productions,
      layerFlocks: layerFlocks ?? this.layerFlocks,
      selectedFlockId: clearSelectedFlock ? null : (selectedFlockId ?? this.selectedFlockId),
      summary: summary ?? this.summary,
    );
  }
}

class EggNotifier extends StateNotifier<EggState> {
  final ApiClient _apiClient;
  final Ref _ref;

  EggNotifier(this._apiClient, this._ref) : super(const EggState()) {
    loadData();
  }

  Future<void> loadData({bool showLoading = true}) async {
    final activeFarm = _ref.read(authProvider).activeFarm;
    if (activeFarm == null) {
      state = state.copyWith(isLoading: false);
      return;
    }

    if (showLoading) {
      state = state.copyWith(isLoading: true, clearError: true);
    }

    try {
      // 1. Récupération des bandes pondeuses actives de l'exploitation
      final flocksRes = await _apiClient.dio.get(
        ApiEndpoints.farmFlocks(activeFarm.id),
        queryParameters: {'status': 'ACTIVE'},
      );
      final rawFlocks = flocksRes.data['data'] as List<dynamic>? ?? [];
      final flocks = rawFlocks
          .map((item) => Flock.fromJson(item as Map<String, dynamic>))
          .where((f) => f.isLayer)
          .toList();

      // 2. Récupération des collectes d'œufs
      final endpoint = state.selectedFlockId != null
          ? ApiEndpoints.flockEggs(state.selectedFlockId!)
          : ApiEndpoints.farmEggs(activeFarm.id);

      final eggsRes = await _apiClient.dio.get(endpoint);
      final rawEggs = eggsRes.data['data'] as List<dynamic>? ?? [];
      final productions = rawEggs
          .map((item) => EggProduction.fromJson(item as Map<String, dynamic>))
          .toList();

      EggSummaryStats summary = const EggSummaryStats();
      if (eggsRes.data['meta']?['summary'] != null) {
        summary = EggSummaryStats.fromJson(eggsRes.data['meta']['summary'] as Map<String, dynamic>);
      }

      state = state.copyWith(
        isLoading: false,
        layerFlocks: flocks,
        productions: productions,
        summary: summary,
      );
    } on DioException catch (e) {
      String message = "Impossible de charger les données de ponte.";
      if (e.response?.data is Map && e.response?.data['message'] != null) {
        message = e.response!.data['message'] as String;
      }
      state = state.copyWith(isLoading: false, error: message);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: "Erreur de chargement: $e",
      );
    }
  }

  Future<void> filterByFlock(String? flockId) async {
    if (flockId == null) {
      state = state.copyWith(clearSelectedFlock: true);
    } else {
      state = state.copyWith(selectedFlockId: flockId);
    }
    await loadData();
  }

  Future<bool> recordProduction({
    required String flockId,
    required DateTime date,
    required String session,
    required int goodEggs,
    int crackedEggs = 0,
    int dirtyEggs = 0,
    int deformedEggs = 0,
    String? notes,
  }) async {
    state = state.copyWith(isSubmitting: true, clearError: true);

    try {
      final dateStr = "${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}";

      await _apiClient.dio.post(
        ApiEndpoints.flockEggs(flockId),
        data: {
          'productionDate': dateStr,
          'session': session,
          'goodEggs': goodEggs,
          'crackedEggs': crackedEggs,
          'dirtyEggs': dirtyEggs,
          'deformedEggs': deformedEggs,
          if (notes != null && notes.trim().isNotEmpty) 'notes': notes.trim(),
          'allowUpdate': true,
        },
      );

      state = state.copyWith(isSubmitting: false);
      await loadData(showLoading: false);
      return true;
    } on DioException catch (e) {
      String message = "Échec de l'enregistrement de la collecte.";
      if (e.response?.data is Map && e.response?.data['message'] != null) {
        message = e.response!.data['message'] as String;
      }
      state = state.copyWith(isSubmitting: false, error: message);
      return false;
    } catch (e) {
      state = state.copyWith(isSubmitting: false, error: "Erreur: $e");
      return false;
    }
  }
}

final eggProvider = StateNotifierProvider<EggNotifier, EggState>((ref) {
  // Déclenche un rechargement automatique si l'exploitation active change
  ref.watch(authProvider.select((s) => s.activeFarm?.id));
  return EggNotifier(ApiClient(), ref);
});
