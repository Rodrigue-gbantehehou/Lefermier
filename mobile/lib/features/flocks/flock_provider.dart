import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/models/flock.dart';
import '../auth/auth_provider.dart';

class FlockSummary {
  final int totalBirds;
  final int initialBirds;
  final int activeFlocksCount;
  final double averageMortality;

  const FlockSummary({
    this.totalBirds = 0,
    this.initialBirds = 0,
    this.activeFlocksCount = 0,
    this.averageMortality = 0.0,
  });
}

class FlockState {
  final bool isLoading;
  final bool isSubmitting;
  final String? error;
  final List<Flock> flocks;
  final String? filterType; // null = tous, 'LAYER', 'BROILER'
  final FlockSummary summary;

  const FlockState({
    this.isLoading = false,
    this.isSubmitting = false,
    this.error,
    this.flocks = const [],
    this.filterType,
    this.summary = const FlockSummary(),
  });

  FlockState copyWith({
    bool? isLoading,
    bool? isSubmitting,
    String? error,
    List<Flock>? flocks,
    String? filterType,
    FlockSummary? summary,
    bool clearError = false,
    bool clearFilter = false,
  }) {
    return FlockState(
      isLoading: isLoading ?? this.isLoading,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      error: clearError ? null : (error ?? this.error),
      flocks: flocks ?? this.flocks,
      filterType: clearFilter ? null : (filterType ?? this.filterType),
      summary: summary ?? this.summary,
    );
  }
}

class FlockNotifier extends StateNotifier<FlockState> {
  final ApiClient _apiClient;
  final Ref _ref;

  FlockNotifier(this._apiClient, this._ref) : super(const FlockState()) {
    loadFlocks();
  }

  Future<void> loadFlocks({bool showLoading = true}) async {
    final activeFarm = _ref.read(authProvider).activeFarm;
    if (activeFarm == null) {
      state = state.copyWith(isLoading: false);
      return;
    }

    if (showLoading) {
      state = state.copyWith(isLoading: true, clearError: true);
    }

    try {
      final response = await _apiClient.dio.get(
        ApiEndpoints.farmFlocks(activeFarm.id),
      );

      final rawList = response.data['data'] as List<dynamic>? ?? [];
      final flocks = rawList
          .map((item) => Flock.fromJson(item as Map<String, dynamic>))
          .toList();

      int totalBirds = 0;
      int totalInitial = 0;
      int activeCount = 0;
      double totalMortality = 0.0;

      for (final f in flocks) {
        if (f.isActive) {
          totalBirds += f.currentQuantity;
          totalInitial += f.initialQuantity;
          activeCount++;
          totalMortality += f.calculatedMortalityRate;
        }
      }

      final avgMortality = activeCount > 0 ? (totalMortality / activeCount) : 0.0;

      state = state.copyWith(
        isLoading: false,
        flocks: flocks,
        summary: FlockSummary(
          totalBirds: totalBirds,
          initialBirds: totalInitial,
          activeFlocksCount: activeCount,
          averageMortality: avgMortality,
        ),
      );
    } on DioException catch (e) {
      String message = "Impossible de charger les bandes d'élevage.";
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

  void setFilterType(String? type) {
    if (type == null) {
      state = state.copyWith(clearFilter: true);
    } else {
      state = state.copyWith(filterType: type);
    }
  }

  Future<bool> recordMovement({
    required String flockId,
    required String type, // 'MORTALITY', 'CULLING', 'SALE', 'ADJUSTMENT'
    required int quantity,
    required DateTime date,
    String? reason,
  }) async {
    state = state.copyWith(isSubmitting: true, clearError: true);

    try {
      final dateStr =
          "${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}";

      await _apiClient.dio.post(
        ApiEndpoints.flockMovements(flockId),
        data: {
          'type': type,
          'quantity': quantity,
          'movementDate': dateStr,
          if (reason != null && reason.trim().isNotEmpty) 'reason': reason.trim(),
        },
      );

      state = state.copyWith(isSubmitting: false);
      await loadFlocks(showLoading: false);
      return true;
    } on DioException catch (e) {
      String message = "Échec de l'enregistrement du mouvement.";
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

  Future<bool> createFlock({
    required String code,
    required String name,
    required int initialQuantity,
    required DateTime startDate,
    required String poultryType,
    String? strain,
    int initialAgeDays = 1,
    String? notes,
  }) async {
    final activeFarm = _ref.read(authProvider).activeFarm;
    if (activeFarm == null) return false;

    state = state.copyWith(isSubmitting: true, clearError: true);

    try {
      final dateStr =
          "${startDate.year.toString().padLeft(4, '0')}-${startDate.month.toString().padLeft(2, '0')}-${startDate.day.toString().padLeft(2, '0')}";

      await _apiClient.dio.post(
        ApiEndpoints.farmFlocks(activeFarm.id),
        data: {
          'code': code.trim(),
          'name': name.trim(),
          'initialQuantity': initialQuantity,
          'startDate': dateStr,
          'poultryType': poultryType,
          if (strain != null && strain.trim().isNotEmpty) 'strain': strain.trim(),
          'initialAgeDays': initialAgeDays,
          if (notes != null && notes.trim().isNotEmpty) 'notes': notes.trim(),
        },
      );

      state = state.copyWith(isSubmitting: false);
      await loadFlocks(showLoading: false);
      return true;
    } on DioException catch (e) {
      String message = "Échec de la création de la bande.";
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

final flockProvider = StateNotifierProvider<FlockNotifier, FlockState>((ref) {
  // Déclenche un rechargement automatique si l'exploitation active change
  ref.watch(authProvider.select((s) => s.activeFarm?.id));
  return FlockNotifier(ApiClient(), ref);
});
