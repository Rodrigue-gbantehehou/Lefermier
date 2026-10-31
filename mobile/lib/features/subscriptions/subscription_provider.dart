import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/models/subscription_plan.dart';
import '../auth/auth_provider.dart';

class SubscriptionState {
  final bool isLoading;
  final bool isSubmitting;
  final String? error;
  final String? successMessage;
  final SubscriptionPlanModel? currentPlan;
  final List<SubscriptionPlanModel> publicPlans;
  final String orgStatus;
  final String billingCycle; // 'MONTHLY', 'ANNUALLY'

  const SubscriptionState({
    this.isLoading = false,
    this.isSubmitting = false,
    this.error,
    this.successMessage,
    this.currentPlan,
    this.publicPlans = const [],
    this.orgStatus = 'ACTIVE',
    this.billingCycle = 'MONTHLY',
  });

  SubscriptionState copyWith({
    bool? isLoading,
    bool? isSubmitting,
    String? error,
    String? successMessage,
    SubscriptionPlanModel? currentPlan,
    List<SubscriptionPlanModel>? publicPlans,
    String? orgStatus,
    String? billingCycle,
    bool clearError = false,
    bool clearSuccess = false,
  }) {
    return SubscriptionState(
      isLoading: isLoading ?? this.isLoading,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      error: clearError ? null : (error ?? this.error),
      successMessage: clearSuccess ? null : (successMessage ?? this.successMessage),
      currentPlan: currentPlan ?? this.currentPlan,
      publicPlans: publicPlans ?? this.publicPlans,
      orgStatus: orgStatus ?? this.orgStatus,
      billingCycle: billingCycle ?? this.billingCycle,
    );
  }
}

class SubscriptionNotifier extends StateNotifier<SubscriptionState> {
  final ApiClient _apiClient;
  final Ref _ref;

  SubscriptionNotifier(this._apiClient, this._ref) : super(const SubscriptionState()) {
    loadSubscription();
  }

  void setBillingCycle(String cycle) {
    state = state.copyWith(billingCycle: cycle);
  }

  Future<void> loadSubscription({bool showLoading = true}) async {
    final activeFarm = _ref.read(authProvider).activeFarm;
    if (activeFarm == null) {
      state = state.copyWith(isLoading: false);
      return;
    }

    if (showLoading) {
      state = state.copyWith(isLoading: true, clearError: true, clearSuccess: true);
    }

    try {
      // 1. Charger le catalogue des offres
      final plansRes = await _apiClient.dio.get(ApiEndpoints.subscriptionPlans);
      final rawPlans = (plansRes.data['publicPlans'] as List<dynamic>?) ??
          (plansRes.data['data']?['publicPlans'] as List<dynamic>?) ??
          [];
      final publicPlans = rawPlans
          .map((p) => SubscriptionPlanModel.fromJson(p as Map<String, dynamic>))
          .toList();

      // 2. Charger le statut de la ferme active
      final farmPlanRes = await _apiClient.dio.get(
        ApiEndpoints.farmSubscription(activeFarm.id),
      );

      SubscriptionPlanModel? currentPlan;
      String status = 'ACTIVE';

      if (farmPlanRes.data['data'] != null) {
        final currentPlanMap = farmPlanRes.data['data']['currentPlan'] as Map<String, dynamic>?;
        if (currentPlanMap != null) {
          currentPlan = SubscriptionPlanModel.fromJson(currentPlanMap);
        }
        status = farmPlanRes.data['data']['orgStatus'] as String? ?? 'ACTIVE';
      }

      state = state.copyWith(
        isLoading: false,
        publicPlans: publicPlans,
        currentPlan: currentPlan,
        orgStatus: status,
      );
    } on DioException catch (e) {
      String message = "Impossible de charger les formules d'abonnement.";
      if (e.response?.data is Map && e.response?.data['message'] != null) {
        message = e.response!.data['message'] as String;
      }
      state = state.copyWith(isLoading: false, error: message);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: "Erreur: $e");
    }
  }

  Future<bool> requestUpgrade({
    required String targetPlan,
    String? message,
  }) async {
    final activeFarm = _ref.read(authProvider).activeFarm;
    if (activeFarm == null) return false;

    state = state.copyWith(isSubmitting: true, clearError: true, clearSuccess: true);

    try {
      final response = await _apiClient.dio.post(
        ApiEndpoints.subscriptionRequestUpgrade,
        data: {
          'farmId': activeFarm.id,
          'targetPlan': targetPlan,
          'billingCycle': state.billingCycle,
          if (message != null && message.trim().isNotEmpty) 'message': message.trim(),
        },
      );

      final msg = response.data['message'] as String? ??
          "Votre demande de changement d'offre a été enregistrée.";

      state = state.copyWith(
        isSubmitting: false,
        successMessage: msg,
      );
      return true;
    } on DioException catch (e) {
      String msg = "Erreur lors de la demande d'évolution d'offre.";
      if (e.response?.data is Map && e.response?.data['message'] != null) {
        msg = e.response!.data['message'] as String;
      }
      state = state.copyWith(isSubmitting: false, error: msg);
      return false;
    } catch (e) {
      state = state.copyWith(isSubmitting: false, error: "Erreur: $e");
      return false;
    }
  }
}

final subscriptionProvider = StateNotifierProvider<SubscriptionNotifier, SubscriptionState>((ref) {
  ref.watch(authProvider.select((s) => s.activeFarm?.id));
  return SubscriptionNotifier(ApiClient(), ref);
});
