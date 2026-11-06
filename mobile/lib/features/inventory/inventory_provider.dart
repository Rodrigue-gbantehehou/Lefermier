import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/models/inventory_item.dart';
import '../../core/models/stock_movement.dart';
import '../../core/sync/sync_service.dart';
import '../../core/sync/offline_cache_service.dart';
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
  final List<StockMovement> movements;
  final String? selectedCategory; // null = all
  final String? movementTypeFilter; // null = all, 'INCOMING', 'FEEDING', etc.
  final bool isDateDesc;
  final InventorySummary summary;

  const InventoryState({
    this.isLoading = false,
    this.isSubmitting = false,
    this.error,
    this.items = const [],
    this.movements = const [],
    this.selectedCategory,
    this.movementTypeFilter,
    this.isDateDesc = true,
    this.summary = const InventorySummary(),
  });

  List<StockMovement> get filteredMovements {
    var list = movements;
    if (movementTypeFilter != null) {
      if (movementTypeFilter == 'INCOMING') {
        list = list.where((m) => m.isIncoming).toList();
      } else if (movementTypeFilter == 'FEEDING') {
        list = list.where((m) => m.isFeeding).toList();
      } else {
        list = list.where((m) => m.type == movementTypeFilter).toList();
      }
    }
    final sorted = List<StockMovement>.from(list);
    sorted.sort((a, b) {
      final cmp = a.movementDate.compareTo(b.movementDate);
      if (cmp != 0) return isDateDesc ? -cmp : cmp;
      final aCreated = a.createdAt ?? a.id;
      final bCreated = b.createdAt ?? b.id;
      return isDateDesc ? -aCreated.compareTo(bCreated) : aCreated.compareTo(bCreated);
    });
    return sorted;
  }

  InventoryState copyWith({
    bool? isLoading,
    bool? isSubmitting,
    String? error,
    List<InventoryItem>? items,
    List<StockMovement>? movements,
    String? selectedCategory,
    String? movementTypeFilter,
    bool? isDateDesc,
    InventorySummary? summary,
    bool clearError = false,
    bool clearCategory = false,
    bool clearMovementTypeFilter = false,
  }) {
    return InventoryState(
      isLoading: isLoading ?? this.isLoading,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      error: clearError ? null : (error ?? this.error),
      items: items ?? this.items,
      movements: movements ?? this.movements,
      selectedCategory: clearCategory ? null : (selectedCategory ?? this.selectedCategory),
      movementTypeFilter: clearMovementTypeFilter ? null : (movementTypeFilter ?? this.movementTypeFilter),
      isDateDesc: isDateDesc ?? this.isDateDesc,
      summary: summary ?? this.summary,
    );
  }
}

class InventoryNotifier extends StateNotifier<InventoryState> {
  final ApiClient _apiClient;
  final Ref _ref;

  InventoryNotifier(this._apiClient, this._ref) : super(const InventoryState()) {
    loadItems();
    loadMovements();
  }

  Future<void> loadItems({bool showLoading = true}) async {
    final activeFarm = _ref.read(authProvider).activeFarm;
    if (activeFarm == null) {
      state = state.copyWith(isLoading: false);
      return;
    }

    // 1. Restitution instantanée depuis le cache hors-ligne
    final currentUserId = _ref.read(authProvider).user?.id ?? _apiClient.sessionSubject;
    if (state.items.isEmpty) {
      final cachedItems = await OfflineCacheService().getListCache(
        farmId: activeFarm.id,
        category: 'inventory_items',
        currentUserId: currentUserId,
      );
      if (cachedItems != null && cachedItems.isNotEmpty) {
        final items = cachedItems
            .map((item) => InventoryItem.fromJson(item as Map<String, dynamic>))
            .toList();
        int lowCount = 0;
        int totalVal = 0;
        for (final item in items) {
          if (item.isLowStock) lowCount++;
          if (item.estimatedTotalValue != null) totalVal += item.estimatedTotalValue!;
        }
        state = state.copyWith(
          items: items,
          summary: InventorySummary(
            totalItems: items.length,
            lowStockCount: lowCount,
            estimatedTotalValue: totalVal,
          ),
        );
      }
    }

    if (showLoading && state.items.isEmpty) {
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

      await OfflineCacheService().setCache(
        farmId: activeFarm.id,
        category: 'inventory_items',
        data: rawList,
        userId: currentUserId,
      );

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
      if (state.items.isEmpty) {
        String message = "Impossible de charger les stocks d'intrants.";
        if (e.response?.data is Map && e.response?.data['message'] != null) {
          message = e.response!.data['message'] as String;
        }
        state = state.copyWith(isLoading: false, error: message);
      } else {
        state = state.copyWith(isLoading: false);
      }
    } catch (e) {
      if (state.items.isEmpty) {
        state = state.copyWith(
          isLoading: false,
          error: "Erreur de chargement: $e",
        );
      } else {
        state = state.copyWith(isLoading: false);
      }
    }
  }

  Future<void> loadMovements({bool showLoading = false}) async {
    final activeFarm = _ref.read(authProvider).activeFarm;
    if (activeFarm == null) return;

    // 1. Restitution instantanée depuis le cache hors-ligne
    final currentUserId = _ref.read(authProvider).user?.id ?? _apiClient.sessionSubject;
    if (state.movements.isEmpty) {
      final cachedMovements = await OfflineCacheService().getListCache(
        farmId: activeFarm.id,
        category: 'inventory_movements',
        currentUserId: currentUserId,
      );
      if (cachedMovements != null && cachedMovements.isNotEmpty) {
        final movements = cachedMovements
            .map((m) => StockMovement.fromJson(m as Map<String, dynamic>))
            .toList();
        state = state.copyWith(movements: movements);
      }
    }

    if (showLoading && state.movements.isEmpty) {
      state = state.copyWith(isLoading: true, clearError: true);
    }

    try {
      final response = await _apiClient.dio.get(
        ApiEndpoints.farmInventoryMovements(activeFarm.id),
      );

      final rawList = response.data['data'] as List<dynamic>? ?? [];
      final movements = rawList
          .map((m) => StockMovement.fromJson(m as Map<String, dynamic>))
          .toList();

      await OfflineCacheService().setCache(
        farmId: activeFarm.id,
        category: 'inventory_movements',
        data: rawList,
        userId: currentUserId,
      );

      state = state.copyWith(
        isLoading: false,
        movements: movements,
      );
    } on DioException catch (e) {
      if (state.movements.isEmpty) {
        String message = "Impossible de charger le journal des mouvements.";
        if (e.response?.data is Map && e.response?.data['message'] != null) {
          message = e.response!.data['message'] as String;
        }
        state = state.copyWith(isLoading: false, error: message);
      } else {
        state = state.copyWith(isLoading: false);
      }
    } catch (e) {
      if (state.movements.isEmpty) {
        state = state.copyWith(
          isLoading: false,
          error: "Erreur de chargement: $e",
        );
      } else {
        state = state.copyWith(isLoading: false);
      }
    }
  }

  void setCategoryFilter(String? category) {
    if (category == null) {
      state = state.copyWith(clearCategory: true);
    } else {
      state = state.copyWith(selectedCategory: category);
    }
  }

  void setMovementTypeFilter(String? type) {
    if (type == null) {
      state = state.copyWith(clearMovementTypeFilter: true);
    } else {
      state = state.copyWith(movementTypeFilter: type);
    }
  }

  void toggleDateSortOrder() {
    state = state.copyWith(isDateDesc: !state.isDateDesc);
  }

  Future<bool> recordMovement({
    required String itemId,
    required String type, // 'FEEDING', 'INCOMING', 'LOSS', 'ADJUSTMENT'
    required double quantity,
    required DateTime date,
    String? unit,
    int? unitPrice,
    String? flockId,
    String? reason,
  }) async {
    state = state.copyWith(isSubmitting: true, clearError: true);

    final dateStr =
        "${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}";

    final payload = {
      'type': type,
      'quantity': quantity,
      'movementDate': dateStr,
      if (unit != null && unit.isNotEmpty) 'unit': unit,
      if (unitPrice != null) 'unitPrice': unitPrice,
      if (flockId != null && flockId.isNotEmpty) 'flockId': flockId,
      if (reason != null && reason.trim().isNotEmpty) 'reason': reason.trim(),
    };

    try {
      await _apiClient.dio.post(
        ApiEndpoints.inventoryMovements(itemId),
        data: payload,
      );

      state = state.copyWith(isSubmitting: false);
      await Future.wait([
        loadItems(showLoading: false),
        loadMovements(showLoading: false),
      ]);
      return true;
    } on DioException catch (e) {
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.sendTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.connectionError ||
          e.response == null) {
        await SyncService(_apiClient).enqueueAction(
          label: "Mouvement de stock ($type: $quantity)",
          method: "POST",
          endpoint: ApiEndpoints.inventoryMovements(itemId),
          payload: payload,
          idempotencyKey: e.requestOptions.headers['X-Idempotency-Key'] as String?,
        );
        state = state.copyWith(isSubmitting: false);
        return true;
      }

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
    String? customCategory,
    double initialStock = 0.0,
    double? alertThreshold,
    int? unitPrice,
    double? packageWeightKg,
    String? notes,
  }) async {
    final activeFarm = _ref.read(authProvider).activeFarm;
    if (activeFarm == null) return false;

    state = state.copyWith(isSubmitting: true, clearError: true);

    final payload = {
      'name': name.trim(),
      'category': category,
      if (customCategory != null && customCategory.trim().isNotEmpty) 'customCategory': customCategory.trim(),
      'unit': unit,
      'initialStock': initialStock,
      if (alertThreshold != null) 'alertThreshold': alertThreshold,
      if (unitPrice != null) 'unitPrice': unitPrice,
      if (packageWeightKg != null && packageWeightKg > 0) 'packageWeightKg': packageWeightKg,
      if (notes != null && notes.trim().isNotEmpty) 'notes': notes.trim(),
    };

    try {
      await _apiClient.dio.post(
        ApiEndpoints.farmInventory(activeFarm.id),
        data: payload,
      );

      state = state.copyWith(isSubmitting: false);
      await Future.wait([
        loadItems(showLoading: false),
        loadMovements(showLoading: false),
      ]);
      return true;
    } on DioException catch (e) {
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.sendTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.connectionError ||
          e.response == null) {
        await SyncService(_apiClient).enqueueAction(
          label: "Création article ($name)",
          method: "POST",
          endpoint: ApiEndpoints.farmInventory(activeFarm.id),
          payload: payload,
          idempotencyKey: e.requestOptions.headers['X-Idempotency-Key'] as String?,
        );
        state = state.copyWith(isSubmitting: false);
        return true;
      }

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
