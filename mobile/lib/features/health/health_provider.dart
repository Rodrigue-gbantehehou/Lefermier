import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/models/health_treatment.dart';
import '../auth/auth_provider.dart';

class HealthSummary {
  final int totalTreatments;
  final int overdueCount;
  final int upcomingCount;

  const HealthSummary({
    this.totalTreatments = 0,
    this.overdueCount = 0,
    this.upcomingCount = 0,
  });

  int get pendingCount => upcomingCount;
  int get completedCount => totalTreatments >= upcomingCount ? totalTreatments - upcomingCount : 0;
}

class HealthState {
  final bool isLoading;
  final bool isSubmitting;
  final String? error;
  final List<HealthTreatment> treatments;
  final String? statusFilter; // null, 'SCHEDULED', 'COMPLETED'
  final String? flockFilter;
  final HealthSummary summary;

  const HealthState({
    this.isLoading = false,
    this.isSubmitting = false,
    this.error,
    this.treatments = const [],
    this.statusFilter,
    this.flockFilter,
    this.summary = const HealthSummary(),
  });

  HealthState copyWith({
    bool? isLoading,
    bool? isSubmitting,
    String? error,
    List<HealthTreatment>? treatments,
    String? statusFilter,
    String? flockFilter,
    HealthSummary? summary,
    bool clearError = false,
    bool clearStatus = false,
    bool clearFlock = false,
  }) {
    return HealthState(
      isLoading: isLoading ?? this.isLoading,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      error: clearError ? null : (error ?? this.error),
      treatments: treatments ?? this.treatments,
      statusFilter: clearStatus ? null : (statusFilter ?? this.statusFilter),
      flockFilter: clearFlock ? null : (flockFilter ?? this.flockFilter),
      summary: summary ?? this.summary,
    );
  }
}

class HealthNotifier extends StateNotifier<HealthState> {
  final ApiClient _apiClient;
  final Ref _ref;

  HealthNotifier(this._apiClient, this._ref) : super(const HealthState()) {
    loadTreatments();
  }

  Future<void> loadTreatments({bool showLoading = true}) async {
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
        ApiEndpoints.farmHealth(activeFarm.id),
      );

      final rawList = response.data['data'] as List<dynamic>? ?? [];
      final treatments = rawList
          .map((item) => HealthTreatment.fromJson(item as Map<String, dynamic>))
          .toList();

      int overdue = 0;
      int upcoming = 0;
      final meta = response.data['meta'] as Map<String, dynamic>? ?? {};
      overdue = (meta['overdueCount'] as num?)?.toInt() ?? 0;
      upcoming = (meta['upcomingCount'] as num?)?.toInt() ?? 0;

      state = state.copyWith(
        isLoading: false,
        treatments: treatments,
        summary: HealthSummary(
          totalTreatments: treatments.length,
          overdueCount: overdue,
          upcomingCount: upcoming,
        ),
      );
    } on DioException catch (e) {
      String message = "Impossible de charger le carnet sanitaire.";
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

  void setStatusFilter(String? status) {
    if (status == null) {
      state = state.copyWith(clearStatus: true);
    } else {
      state = state.copyWith(statusFilter: status);
    }
  }

  Future<bool> completeTreatment({
    required String treatmentId,
    required DateTime administeredDate,
    String? veterinarian,
    String? notes,
  }) async {
    state = state.copyWith(isSubmitting: true, clearError: true);

    try {
      final dateStr =
          "${administeredDate.year.toString().padLeft(4, '0')}-${administeredDate.month.toString().padLeft(2, '0')}-${administeredDate.day.toString().padLeft(2, '0')}";

      await _apiClient.dio.put(
        ApiEndpoints.completeHealthTreatment(treatmentId),
        data: {
          'administeredDate': dateStr,
          if (veterinarian != null && veterinarian.trim().isNotEmpty) 'veterinarian': veterinarian.trim(),
          if (notes != null && notes.trim().isNotEmpty) 'notes': notes.trim(),
        },
      );

      state = state.copyWith(isSubmitting: false);
      await loadTreatments(showLoading: false);
      return true;
    } on DioException catch (e) {
      String message = "Échec de la validation de l'administration.";
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

  Future<bool> createTreatment({
    required String flockId,
    required String title,
    required String type, // 'VACCINATION', 'ANTIBIOTIC', 'DEWORMING', 'VITAMIN'
    required String method, // 'DRINKING_WATER', 'EYE_DROP', 'INJECTION'
    required DateTime scheduledDate,
    int? targetAgeDays,
    String? notes,
  }) async {
    final activeFarm = _ref.read(authProvider).activeFarm;
    if (activeFarm == null) return false;

    state = state.copyWith(isSubmitting: true, clearError: true);

    try {
      final dateStr =
          "${scheduledDate.year.toString().padLeft(4, '0')}-${scheduledDate.month.toString().padLeft(2, '0')}-${scheduledDate.day.toString().padLeft(2, '0')}";

      await _apiClient.dio.post(
        ApiEndpoints.farmHealth(activeFarm.id),
        data: {
          'flockId': flockId,
          'title': title.trim(),
          'type': type,
          'administrationMethod': method,
          'scheduledDate': dateStr,
          if (targetAgeDays != null) 'targetAgeDays': targetAgeDays,
          if (notes != null && notes.trim().isNotEmpty) 'notes': notes.trim(),
        },
      );

      state = state.copyWith(isSubmitting: false);
      await loadTreatments(showLoading: false);
      return true;
    } on DioException catch (e) {
      String message = "Échec de la planification du traitement.";
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

  Future<bool> generateStandardProgram(String flockId, String programType) async {
    final activeFarm = _ref.read(authProvider).activeFarm;
    if (activeFarm == null) return false;

    state = state.copyWith(isSubmitting: true, clearError: true);

    try {
      await _apiClient.dio.post(
        "/api/farms/${activeFarm.id}/health-treatments/generate-program",
        data: {
          'flockId': flockId,
          'programType': programType, // 'STANDARD_LAYER' ou 'STANDARD_BROILER'
        },
      );

      state = state.copyWith(isSubmitting: false);
      await loadTreatments(showLoading: false);
      return true;
    } on DioException catch (e) {
      String message = "Échec de la génération du programme vaccinal.";
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

final healthProvider = StateNotifierProvider<HealthNotifier, HealthState>((ref) {
  // Rechargement automatique lors du changement de ferme active
  ref.watch(authProvider.select((s) => s.activeFarm?.id));
  return HealthNotifier(ApiClient(), ref);
});
