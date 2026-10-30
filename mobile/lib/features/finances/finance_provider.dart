import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/models/transaction.dart';
import '../auth/auth_provider.dart';

class FinanceSummary {
  final int totalIncome;
  final int totalExpense;
  final int netBalance;
  final String currency;

  const FinanceSummary({
    this.totalIncome = 0,
    this.totalExpense = 0,
    this.netBalance = 0,
    this.currency = "FCFA",
  });

  factory FinanceSummary.fromJson(Map<String, dynamic> json) {
    return FinanceSummary(
      totalIncome: (json['totalIncome'] as num?)?.toInt() ?? 0,
      totalExpense: (json['totalExpense'] as num?)?.toInt() ?? 0,
      netBalance: (json['netBalance'] as num?)?.toInt() ?? 0,
      currency: json['currency'] as String? ?? "FCFA",
    );
  }
}

class FinanceState {
  final bool isLoading;
  final bool isSubmitting;
  final String? error;
  final List<Transaction> transactions;
  final String? filterType; // null, 'INCOME', 'EXPENSE'
  final FinanceSummary summary;

  const FinanceState({
    this.isLoading = false,
    this.isSubmitting = false,
    this.error,
    this.transactions = const [],
    this.filterType,
    this.summary = const FinanceSummary(),
  });

  FinanceState copyWith({
    bool? isLoading,
    bool? isSubmitting,
    String? error,
    List<Transaction>? transactions,
    String? filterType,
    FinanceSummary? summary,
    bool clearError = false,
    bool clearFilter = false,
  }) {
    return FinanceState(
      isLoading: isLoading ?? this.isLoading,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      error: clearError ? null : (error ?? this.error),
      transactions: transactions ?? this.transactions,
      filterType: clearFilter ? null : (filterType ?? this.filterType),
      summary: summary ?? this.summary,
    );
  }
}

class FinanceNotifier extends StateNotifier<FinanceState> {
  final ApiClient _apiClient;
  final Ref _ref;

  FinanceNotifier(this._apiClient, this._ref) : super(const FinanceState()) {
    loadTransactions();
  }

  Future<void> loadTransactions({bool showLoading = true}) async {
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
        ApiEndpoints.farmTransactions(activeFarm.id),
      );

      final rawList = response.data['data'] as List<dynamic>? ?? [];
      final transactions = rawList
          .map((item) => Transaction.fromJson(item as Map<String, dynamic>))
          .toList();

      FinanceSummary summary = const FinanceSummary();
      if (response.data['meta']?['summary'] != null) {
        summary = FinanceSummary.fromJson(response.data['meta']['summary'] as Map<String, dynamic>);
      }

      state = state.copyWith(
        isLoading: false,
        transactions: transactions,
        summary: summary,
      );
    } on DioException catch (e) {
      String message = "Impossible de charger la caisse et les transactions.";
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

  Future<bool> recordTransaction({
    required String type, // 'INCOME', 'EXPENSE'
    required String category,
    required int amount,
    required DateTime date,
    String paymentMethod = "CASH",
    String? description,
    String? flockId,
  }) async {
    final activeFarm = _ref.read(authProvider).activeFarm;
    if (activeFarm == null) return false;

    state = state.copyWith(isSubmitting: true, clearError: true);

    try {
      final dateStr =
          "${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}";

      await _apiClient.dio.post(
        ApiEndpoints.farmTransactions(activeFarm.id),
        data: {
          'type': type,
          'category': category,
          'amount': amount,
          'transactionDate': dateStr,
          'paymentMethod': paymentMethod,
          'paymentStatus': 'PAID',
          if (description != null && description.trim().isNotEmpty) 'description': description.trim(),
          if (flockId != null && flockId.isNotEmpty) 'flockId': flockId,
        },
      );

      state = state.copyWith(isSubmitting: false);
      await loadTransactions(showLoading: false);
      return true;
    } on DioException catch (e) {
      String message = "Échec de l'enregistrement de l'opération de caisse.";
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

final financeProvider = StateNotifierProvider<FinanceNotifier, FinanceState>((ref) {
  // Déclenche un rechargement automatique si l'exploitation active change
  ref.watch(authProvider.select((s) => s.activeFarm?.id));
  return FinanceNotifier(ApiClient(), ref);
});
