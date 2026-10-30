import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/models/farm.dart';

class AuthState {
  final bool isLoading;
  final bool isAuthenticated;
  final String? token;
  final String? error;
  final List<Farm> farms;
  final Farm? activeFarm;

  const AuthState({
    this.isLoading = false,
    this.isAuthenticated = false,
    this.token,
    this.error,
    this.farms = const [],
    this.activeFarm,
  });

  AuthState copyWith({
    bool? isLoading,
    bool? isAuthenticated,
    String? token,
    String? error,
    List<Farm>? farms,
    Farm? activeFarm,
  }) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      token: token ?? this.token,
      error: error,
      farms: farms ?? this.farms,
      activeFarm: activeFarm ?? this.activeFarm,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final ApiClient _apiClient;

  AuthNotifier(this._apiClient) : super(const AuthState()) {
    checkAuthStatus();
  }

  Future<void> checkAuthStatus() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      if (_apiClient.isAuthenticated) {
        state = state.copyWith(
          isAuthenticated: true,
          token: _apiClient.dio.options.headers['Authorization'] as String?,
        );
        await loadFarms();
      } else {
        state = state.copyWith(isLoading: false, isAuthenticated: false);
      }
    } catch (_) {
      state = state.copyWith(isLoading: false);
    }
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final response = await _apiClient.dio.post(
        ApiEndpoints.login,
        data: {
          'email': email.trim(),
          'password': password,
        },
      );

      final token = response.data['token'] as String?;
      if (token == null || token.isEmpty) {
        state = state.copyWith(
          isLoading: false,
          error: "Token d'authentification manquant dans la réponse.",
        );
        return false;
      }

      await _apiClient.setAuthToken(token);
      state = state.copyWith(
        isAuthenticated: true,
        token: token,
        isLoading: false,
      );

      await loadFarms();
      return true;
    } on DioException catch (e) {
      String message = "Identifiants invalides ou erreur de connexion.";
      if (e.response?.statusCode == 401) {
        message = "Email ou mot de passe incorrect.";
      } else if (e.response?.data != null && e.response?.data is Map) {
        final data = e.response!.data as Map;
        message = data['message'] ?? data['error'] ?? message;
      } else if (e.type == DioExceptionType.connectionError ||
                 e.type == DioExceptionType.connectionTimeout) {
        message = "Impossible de joindre le serveur. Vérifiez la connexion.";
      }
      state = state.copyWith(isLoading: false, error: message);
      return false;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: "Une erreur imprévue est survenue: $e",
      );
      return false;
    }
  }

  Future<void> loadFarms() async {
    try {
      final response = await _apiClient.dio.get(ApiEndpoints.farms);
      final rawList = response.data['data'] as List<dynamic>? ?? [];
      final farms = rawList
          .map((item) => Farm.fromJson(item as Map<String, dynamic>))
          .toList();

      Farm? selectedFarm = state.activeFarm;

      // Restaure la ferme active enregistrée si présente
      if (_apiClient.activeFarmId != null) {
        final found = farms.where((f) => f.id == _apiClient.activeFarmId);
        if (found.isNotEmpty) {
          selectedFarm = found.first;
        }
      }

      // Si aucune ferme active n'est définie, choisir la première
      if (selectedFarm == null && farms.isNotEmpty) {
        selectedFarm = farms.first;
        await _apiClient.setActiveFarmId(selectedFarm.id);
      }

      state = state.copyWith(
        farms: farms,
        activeFarm: selectedFarm,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false);
    }
  }

  Future<void> selectFarm(Farm farm) async {
    await _apiClient.setActiveFarmId(farm.id);
    state = state.copyWith(activeFarm: farm);
  }

  Future<void> logout() async {
    await _apiClient.setAuthToken(null);
    await _apiClient.setActiveFarmId(null);
    state = const AuthState();
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ApiClient());
});
