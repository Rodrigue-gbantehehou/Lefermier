import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/models/member.dart';
import '../auth/auth_provider.dart';

class MembersState {
  final bool isLoading;
  final bool isSubmitting;
  final String? error;
  final List<FarmMember> members;
  final String? roleFilter;

  const MembersState({
    this.isLoading = false,
    this.isSubmitting = false,
    this.error,
    this.members = const [],
    this.roleFilter,
  });

  MembersState copyWith({
    bool? isLoading,
    bool? isSubmitting,
    String? error,
    List<FarmMember>? members,
    String? roleFilter,
    bool clearError = false,
    bool clearFilter = false,
  }) {
    return MembersState(
      isLoading: isLoading ?? this.isLoading,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      error: clearError ? null : (error ?? this.error),
      members: members ?? this.members,
      roleFilter: clearFilter ? null : (roleFilter ?? this.roleFilter),
    );
  }

  int get activeMembersCount => members.where((m) => m.isActive).length;

  List<FarmMember> get filteredMembers {
    if (roleFilter == null) return members;
    return members.where((m) => m.role.code == roleFilter).toList();
  }
}

class MembersNotifier extends StateNotifier<MembersState> {
  final ApiClient _apiClient;
  final Ref _ref;

  MembersNotifier(this._apiClient, this._ref) : super(const MembersState()) {
    loadMembers();
  }

  Future<void> loadMembers({bool showLoading = true}) async {
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
        ApiEndpoints.farmMembers(activeFarm.id),
      );

      final rawList = response.data['data'] as List<dynamic>? ?? [];
      final members = rawList
          .map((item) => FarmMember.fromJson(item as Map<String, dynamic>))
          .toList();

      state = state.copyWith(
        isLoading: false,
        members: members,
      );
    } on DioException catch (e) {
      String message = "Impossible de charger les collaborateurs de l'exploitation.";
      if (e.response?.data is Map && e.response?.data['message'] != null) {
        message = e.response!.data['message'] as String;
      }
      state = state.copyWith(isLoading: false, error: message);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: "Erreur: $e");
    }
  }

  void setFilter(String? role) {
    if (role == null) {
      state = state.copyWith(clearFilter: true);
    } else {
      state = state.copyWith(roleFilter: role);
    }
  }

  Future<bool> addMember({
    required String email,
    required String firstName,
    required String lastName,
    String? phone,
    required String role,
    String? password,
  }) async {
    final activeFarm = _ref.read(authProvider).activeFarm;
    if (activeFarm == null) return false;

    state = state.copyWith(isSubmitting: true, clearError: true);

    try {
      final payload = {
        'email': email.trim().toLowerCase(),
        'firstName': firstName.trim(),
        'lastName': lastName.trim(),
        if (phone != null && phone.trim().isNotEmpty) 'phone': phone.trim(),
        'role': role,
        if (password != null && password.trim().isNotEmpty) 'password': password.trim(),
      };

      await _apiClient.dio.post(
        ApiEndpoints.farmMembers(activeFarm.id),
        data: payload,
      );

      await loadMembers(showLoading: false);
      state = state.copyWith(isSubmitting: false);
      return true;
    } on DioException catch (e) {
      String msg = "Erreur lors de l'ajout du collaborateur.";
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

  Future<bool> updateMember({
    required String membershipId,
    required String role,
    required bool isActive,
  }) async {
    final activeFarm = _ref.read(authProvider).activeFarm;
    if (activeFarm == null) return false;

    state = state.copyWith(isSubmitting: true, clearError: true);

    try {
      final payload = {
        'role': role,
        'isActive': isActive,
      };

      await _apiClient.dio.put(
        ApiEndpoints.farmMember(activeFarm.id, membershipId),
        data: payload,
      );

      await loadMembers(showLoading: false);
      state = state.copyWith(isSubmitting: false);
      return true;
    } on DioException catch (e) {
      String msg = "Erreur lors de la mise à jour du collaborateur.";
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

  Future<bool> removeMember(String membershipId) async {
    final activeFarm = _ref.read(authProvider).activeFarm;
    if (activeFarm == null) return false;

    state = state.copyWith(isSubmitting: true, clearError: true);

    try {
      await _apiClient.dio.delete(
        ApiEndpoints.farmMember(activeFarm.id, membershipId),
      );

      await loadMembers(showLoading: false);
      state = state.copyWith(isSubmitting: false);
      return true;
    } on DioException catch (e) {
      String msg = "Erreur lors du retrait du collaborateur.";
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

final membersProvider = StateNotifierProvider<MembersNotifier, MembersState>((ref) {
  ref.watch(authProvider.select((s) => s.activeFarm?.id));
  return MembersNotifier(ApiClient(), ref);
});
