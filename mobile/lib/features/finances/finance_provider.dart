import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/models/transaction.dart';
import '../../core/sync/sync_service.dart';
import '../../core/sync/offline_cache_service.dart';
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

    // 1. Restitution instantanée depuis le cache hors-ligne
    final currentUserId = _ref.read(authProvider).user?.id ?? _apiClient.sessionSubject;
    if (state.transactions.isEmpty) {
      final cachedTx = await OfflineCacheService().getListCache(
        farmId: activeFarm.id,
        category: 'finance_transactions',
        currentUserId: currentUserId,
      );
      final cachedSummary = await OfflineCacheService().getMapCache(
        farmId: activeFarm.id,
        category: 'finance_summary',
        currentUserId: currentUserId,
      );

      if (cachedTx != null) {
        final transactions = cachedTx
            .map((item) => Transaction.fromJson(item as Map<String, dynamic>))
            .toList();
        final summary = cachedSummary != null
            ? FinanceSummary.fromJson(cachedSummary)
            : const FinanceSummary();

        state = state.copyWith(
          transactions: transactions,
          summary: summary,
        );
      }
    }

    if (showLoading && state.transactions.isEmpty) {
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
        final sumMap = response.data['meta']['summary'] as Map<String, dynamic>;
        summary = FinanceSummary.fromJson(sumMap);
        await OfflineCacheService().setCache(
          farmId: activeFarm.id,
          category: 'finance_summary',
          data: sumMap,
          userId: currentUserId,
        );
      }

      await OfflineCacheService().setCache(
        farmId: activeFarm.id,
        category: 'finance_transactions',
        data: rawList,
        userId: currentUserId,
      );

      state = state.copyWith(
        isLoading: false,
        transactions: transactions,
        summary: summary,
      );
    } on DioException catch (e) {
      if (state.transactions.isEmpty) {
        String message = "Impossible de charger la caisse et les transactions.";
        if (e.response?.data is Map && e.response?.data['message'] != null) {
          message = e.response!.data['message'] as String;
        }
        state = state.copyWith(isLoading: false, error: message);
      } else {
        state = state.copyWith(isLoading: false);
      }
    } catch (e) {
      if (state.transactions.isEmpty) {
        state = state.copyWith(
          isLoading: false,
          error: "Erreur de chargement: $e",
        );
      } else {
        state = state.copyWith(isLoading: false);
      }
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
    String paymentStatus = "PAID",
    int? paidAmount,
    DateTime? dueDate,
    String? reference,
    String? description,
    String? flockId,
    String? contactId,
  }) async {
    final activeFarm = _ref.read(authProvider).activeFarm;
    if (activeFarm == null) return false;

    state = state.copyWith(isSubmitting: true, clearError: true);

    final dateStr =
        "${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}";
    final dueDateStr = dueDate != null
        ? "${dueDate.year.toString().padLeft(4, '0')}-${dueDate.month.toString().padLeft(2, '0')}-${dueDate.day.toString().padLeft(2, '0')}"
        : null;

    final payload = {
      'type': type,
      'category': category,
      'amount': amount,
      'transactionDate': dateStr,
      'paymentMethod': paymentMethod,
      'paymentStatus': paymentStatus,
      if (paidAmount != null && paymentStatus == 'PARTIAL') 'paidAmount': paidAmount,
      if (dueDateStr != null && paymentStatus != 'PAID') 'dueDate': dueDateStr,
      if (reference != null && reference.trim().isNotEmpty) 'reference': reference.trim(),
      if (description != null && description.trim().isNotEmpty) 'description': description.trim(),
      if (flockId != null && flockId.isNotEmpty) 'flockId': flockId,
      if (contactId != null && contactId.isNotEmpty) 'contactId': contactId,
    };

    try {
      await _apiClient.dio.post(
        ApiEndpoints.farmTransactions(activeFarm.id),
        data: payload,
      );

      state = state.copyWith(isSubmitting: false);
      await loadTransactions(showLoading: false);
      return true;
    } on DioException catch (e) {
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.sendTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.connectionError ||
          e.response == null) {
        await SyncService(_apiClient).enqueueAction(
          label: "Transaction ($type: $amount FCFA)",
          method: "POST",
          endpoint: ApiEndpoints.farmTransactions(activeFarm.id),
          payload: payload,
        );
        state = state.copyWith(isSubmitting: false);
        return true;
      }

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
