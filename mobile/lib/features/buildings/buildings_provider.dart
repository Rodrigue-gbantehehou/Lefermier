import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/models/building.dart';
import '../auth/auth_provider.dart';

class BuildingsState {
  final bool isLoading;
  final bool isSubmitting;
  final String? error;
  final List<Building> buildings;
  final String? typeFilter; // null, 'POULTRY_HOUSE', 'BROODER', 'STORAGE'

  const BuildingsState({
    this.isLoading = false,
    this.isSubmitting = false,
    this.error,
    this.buildings = const [],
    this.typeFilter,
  });

  BuildingsState copyWith({
    bool? isLoading,
    bool? isSubmitting,
    String? error,
    List<Building>? buildings,
    String? typeFilter,
    bool clearError = false,
    bool clearFilter = false,
  }) {
    return BuildingsState(
      isLoading: isLoading ?? this.isLoading,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      error: clearError ? null : (error ?? this.error),
      buildings: buildings ?? this.buildings,
      typeFilter: clearFilter ? null : (typeFilter ?? this.typeFilter),
    );
  }

  int get totalCapacity {
    return buildings
        .where((b) => b.isActive && b.type != BuildingType.storage)
        .fold(0, (sum, b) => sum + b.capacity);
  }

  int get activeBuildingsCount {
    return buildings.where((b) => b.isActive).length;
  }

  List<Building> get filteredBuildings {
    if (typeFilter == null) return buildings;
    return buildings.where((b) => b.type.code == typeFilter).toList();
  }
}

class BuildingsNotifier extends StateNotifier<BuildingsState> {
  final ApiClient _apiClient;
  final Ref _ref;

  BuildingsNotifier(this._apiClient, this._ref) : super(const BuildingsState()) {
    loadBuildings();
  }

  Future<void> loadBuildings({bool showLoading = true}) async {
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
        ApiEndpoints.farmBuildings(activeFarm.id),
      );

      final rawList = response.data['data'] as List<dynamic>? ?? [];
      final buildings = rawList
          .map((item) => Building.fromJson(item as Map<String, dynamic>))
          .toList();

      state = state.copyWith(
        isLoading: false,
        buildings: buildings,
      );
    } on DioException catch (e) {
      String message = "Impossible de charger les bâtiments.";
      if (e.response?.data is Map && e.response?.data['message'] != null) {
        message = e.response!.data['message'] as String;
      }
      state = state.copyWith(isLoading: false, error: message);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: "Erreur: $e");
    }
  }

  void setFilter(String? type) {
    if (type == null) {
      state = state.copyWith(clearFilter: true);
    } else {
      state = state.copyWith(typeFilter: type);
    }
  }

  Future<bool> createBuilding({
    required String name,
    required String type,
    required int capacity,
    double? surfaceArea,
  }) async {
    final activeFarm = _ref.read(authProvider).activeFarm;
    if (activeFarm == null) return false;

    state = state.copyWith(isSubmitting: true, clearError: true);

    try {
      final payload = {
        'name': name.trim(),
        'type': type,
        'capacity': capacity,
        if (surfaceArea != null && surfaceArea > 0) 'surfaceArea': surfaceArea,
      };

      await _apiClient.dio.post(
        ApiEndpoints.farmBuildings(activeFarm.id),
        data: payload,
      );

      await loadBuildings(showLoading: false);
      state = state.copyWith(isSubmitting: false);
      return true;
    } on DioException catch (e) {
      String msg = "Erreur lors de la création du bâtiment.";
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

  Future<bool> updateBuilding({
    required String buildingId,
    required String name,
    required String type,
    required int capacity,
    double? surfaceArea,
    required bool isActive,
  }) async {
    final activeFarm = _ref.read(authProvider).activeFarm;
    if (activeFarm == null) return false;

    state = state.copyWith(isSubmitting: true, clearError: true);

    try {
      final payload = {
        'name': name.trim(),
        'type': type,
        'capacity': capacity,
        if (surfaceArea != null && surfaceArea > 0) 'surfaceArea': surfaceArea,
        'isActive': isActive,
      };

      await _apiClient.dio.put(
        ApiEndpoints.farmBuilding(activeFarm.id, buildingId),
        data: payload,
      );

      await loadBuildings(showLoading: false);
      state = state.copyWith(isSubmitting: false);
      return true;
    } on DioException catch (e) {
      String msg = "Erreur lors de la mise à jour du bâtiment.";
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

  Future<bool> deleteBuilding(String buildingId) async {
    final activeFarm = _ref.read(authProvider).activeFarm;
    if (activeFarm == null) return false;

    state = state.copyWith(isSubmitting: true, clearError: true);

    try {
      await _apiClient.dio.delete(
        ApiEndpoints.farmBuilding(activeFarm.id, buildingId),
      );

      await loadBuildings(showLoading: false);
      state = state.copyWith(isSubmitting: false);
      return true;
    } on DioException catch (e) {
      String msg = "Erreur lors de la suppression du bâtiment.";
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

final buildingsProvider = StateNotifierProvider<BuildingsNotifier, BuildingsState>((ref) {
  ref.watch(authProvider.select((s) => s.activeFarm?.id));
  return BuildingsNotifier(ApiClient(), ref);
});
