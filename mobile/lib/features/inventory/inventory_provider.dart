import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/models/inventory_item.dart';
import '../auth/auth_provider.dart';

class InventorySummary {
  final int totalItems;
  final int lowStockCount;
  final int estimatedTotalValue;

  const InventorySummary({
    this.totalItems = 0,
    this.lowStockCount = 0,
    this.estimatedTotalValue = 0,
  });
}

class InventoryState {
  final bool isLoading;
  final bool isSubmitting;
  final String? error;
  final List<InventoryItem> items;
  final String? selectedCategory; // null = all
  final InventorySummary summary;

  const InventoryState({
    this.isLoading = false,
    this.isSubmitting = false,
    this.error,
    this.items = const [],
    this.selectedCategory,
    this.summary = const InventorySummary(),
  });

  InventoryState copyWith({
    bool? isLoading,
    bool? isSubmitting,
    String? error,
    List<InventoryItem>? items,
    String? selectedCategory,
    InventorySummary? summary,
    bool clearError = false,
    bool clearCategory = false,
  }) {
    return InventoryState(
      isLoading: isLoading ?? this.isLoading,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      error: clearError ? null : (error ?? this.error),
      items: items ?? this.items,
      selectedCategory: clearCategory ? null : (selectedCategory ?? this.selectedCategory),
      summary: summary ?? this.summary,
    );
  }
}

class InventoryNotifier extends StateNotifier<InventoryState> {
  final ApiClient _apiClient;
  final Ref _ref;

  InventoryNotifier(this._apiClient, this._ref) : super(const InventoryState()) {
    loadItems();
  }

  Future<void> loadItems({bool showLoading = true}) async {
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
        ApiEndpoints.farmInventory(activeFarm.id),
      );

      final rawList = response.data['data'] as List<dynamic>? ?? [];
      final items = rawList
          .map((item) => InventoryItem.fromJson(item as Map<String, dynamic>))
          .toList();

      int lowCount = 0;
      int totalVal = 0;
      for (final item in items) {
        if (item.isLowStock) lowCount++;
        if (item.estimatedTotalValue != null) totalVal += item.estimatedTotalValue!;
      }

      state = state.copyWith(
        isLoading: false,
        items: items,
        summary: InventorySummary(
          totalItems: items.length,
          lowStockCount: lowCount,
          estimatedTotalValue: totalVal,
        ),
      );
    } on DioException catch (e) {
      String message = "Impossible de charger les stocks d'intrants.";
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

  void setCategoryFilter(String? category) {
    if (category == null) {
      state = state.copyWith(clearCategory: true);
    } else {
      state = state.copyWith(selectedCategory: category);
    }
  }

  Future<bool> recordMovement({
    required String itemId,
    required String type, // 'FEEDING', 'INCOMING', 'LOSS', 'ADJUSTMENT'
    required double quantity,
    required DateTime date,
    String? flockId,
    String? reason,
  }) async {
    state = state.copyWith(isSubmitting: true, clearError: true);

    try {
      final dateStr =
          "${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}";

      await _apiClient.dio.post(
        ApiEndpoints.inventoryMovements(itemId),
        data: {
          'type': type,
          'quantity': quantity,
          'movementDate': dateStr,
          if (flockId != null && flockId.isNotEmpty) 'flockId': flockId,
          if (reason != null && reason.trim().isNotEmpty) 'reason': reason.trim(),
        },
      );

      state = state.copyWith(isSubmitting: false);
      await loadItems(showLoading: false);
      return true;
    } on DioException catch (e) {
      String message = "Échec de l'enregistrement du mouvement de stock.";
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

  Future<bool> createItem({
    required String name,
    required String category,
    required String unit,
    double initialStock = 0.0,
    double? alertThreshold,
    int? unitPrice,
    String? notes,
  }) async {
    final activeFarm = _ref.read(authProvider).activeFarm;
    if (activeFarm == null) return false;

    state = state.copyWith(isSubmitting: true, clearError: true);

    try {
      await _apiClient.dio.post(
        ApiEndpoints.farmInventory(activeFarm.id),
        data: {
          'name': name.trim(),
          'category': category,
          'unit': unit,
          'initialStock': initialStock,
          if (alertThreshold != null) 'alertThreshold': alertThreshold,
          if (unitPrice != null) 'unitPrice': unitPrice,
          if (notes != null && notes.trim().isNotEmpty) 'notes': notes.trim(),
        },
      );

      state = state.copyWith(isSubmitting: false);
      await loadItems(showLoading: false);
      return true;
    } on DioException catch (e) {
      String message = "Échec de la création de l'article en stock.";
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

final inventoryProvider = StateNotifierProvider<InventoryNotifier, InventoryState>((ref) {
  // Rechargement automatique lors du changement de ferme active
  ref.watch(authProvider.select((s) => s.activeFarm?.id));
  return InventoryNotifier(ApiClient(), ref);
});
