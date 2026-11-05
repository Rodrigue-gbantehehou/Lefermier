import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/models/farm.dart';
import '../../core/security/secure_storage_service.dart';
import '../../core/sync/offline_cache_service.dart';
import '../../core/sync/sync_service.dart';

class UserProfile {
  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final String fullName;
  final String? phone;
  final List<String> roles;

  const UserProfile({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.fullName,
    this.phone,
    this.roles = const [],
  });

  String get initials {
    final first = firstName.isNotEmpty ? firstName[0].toUpperCase() : '';
    final last = lastName.isNotEmpty ? lastName[0].toUpperCase() : '';
    final combined = '$first$last';
    return combined.isNotEmpty ? combined : (fullName.isNotEmpty ? fullName[0].toUpperCase() : 'U');
  }

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    final fName = (json['firstName'] ?? '').toString();
    final lName = (json['lastName'] ?? '').toString();
    final full = (json['fullName'] ?? '$fName $lName').toString().trim();
    return UserProfile(
      id: (json['id'] ?? '').toString(),
      email: (json['email'] ?? '').toString(),
      firstName: fName,
      lastName: lName,
      fullName: full.isNotEmpty ? full : (json['email'] ?? 'Utilisateur').toString(),
      phone: json['phone'] as String?,
      roles: (json['roles'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? const [],
    );
  }
}

class AuthState {
  final bool isLoading;
  final bool isAuthenticated;
  final String? token;
  final String? error;
  final List<Farm> farms;
  final Farm? activeFarm;
  final UserProfile? user;

  const AuthState({
    this.isLoading = false,
    this.isAuthenticated = false,
    this.token,
    this.error,
    this.farms = const [],
    this.activeFarm,
    this.user,
  });

  AuthState copyWith({
    bool? isLoading,
    bool? isAuthenticated,
    String? token,
    String? error,
    List<Farm>? farms,
    Farm? activeFarm,
    bool clearActiveFarm = false,
    UserProfile? user,
  }) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      token: token ?? this.token,
      error: error,
      farms: farms ?? this.farms,
      activeFarm: clearActiveFarm ? null : (activeFarm ?? this.activeFarm),
      user: user ?? this.user,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final ApiClient _apiClient;
  StreamSubscription<void>? _sessionExpiredSub;

  AuthNotifier(this._apiClient) : super(const AuthState()) {
    _sessionExpiredSub = _apiClient.onSessionExpired.listen((_) {
      _handleSessionExpired();
    });
    checkAuthStatus();
  }

  void _handleSessionExpired() {
    state = const AuthState();
  }

  @override
  void dispose() {
    _sessionExpiredSub?.cancel();
    super.dispose();
  }

  Future<void> checkAuthStatus() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      if (_apiClient.isAuthenticated) {
        state = state.copyWith(
          isAuthenticated: true,
          token: _apiClient.jwtToken,
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
      Response response;
      try {
        response = await _apiClient.dio.post(
          ApiEndpoints.deviceSession,
          data: {
            'email': email.trim().toLowerCase(),
            'password': password,
            'deviceId': SecureStorageService().deviceId,
            'deviceName': 'Mobile Le Fermier',
          },
        );
      } on DioException catch (de) {
        // Fallback rétro-compatible sur login classique si device-session non configuré
        if (de.response?.statusCode == 404) {
          response = await _apiClient.dio.post(
            ApiEndpoints.login,
            data: {
              'email': email.trim(),
              'password': password,
            },
          );
        } else {
          rethrow;
        }
      }

      final resData = response.data is Map
          ? (response.data['data'] is Map ? response.data['data'] : response.data)
          : null;
      final token = resData?['token'] as String?;
      final refreshToken = resData?['refreshToken'] as String?;

      if (token == null || token.isEmpty) {
        state = state.copyWith(
          isLoading: false,
          error: "Token d'authentification manquant dans la réponse.",
        );
        return false;
      }

      await _apiClient.setAuthTokens(token: token, refreshToken: refreshToken);
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
        message = data['message'] ?? data['detail'] ?? data['error'] ?? message;
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
      // Le profil /me fournit, pour chaque ferme, les permissions effectives (rôle ∩ abonnement)
      List<dynamic> rawList = [];
      UserProfile? user = state.user;
      try {
        final meResponse = await _apiClient.dio.get(ApiEndpoints.me);
        final profile = meResponse.data['data'] as Map<String, dynamic>? ?? const {};
        rawList = profile['farms'] as List<dynamic>? ?? [];
        if (profile.isNotEmpty) {
          user = UserProfile.fromJson(profile);
          await OfflineCacheService().setCache(
            farmId: null,
            category: 'user_profile',
            data: profile,
          );
        }
        await OfflineCacheService().setCache(
          farmId: null,
          category: 'farms',
          data: rawList,
        );
      } on DioException {
        try {
          final response = await _apiClient.dio.get(ApiEndpoints.farms);
          rawList = response.data['data'] as List<dynamic>? ?? [];
          await OfflineCacheService().setCache(
            farmId: null,
            category: 'farms',
            data: rawList,
          );
        } catch (_) {
          // Mode hors-ligne : tentative de restauration depuis le cache local
          final cachedFarms = await OfflineCacheService().getListCache(
            farmId: null,
            category: 'farms',
          );
          if (cachedFarms != null && cachedFarms.isNotEmpty) {
            rawList = cachedFarms;
          }
          final cachedProfile = await OfflineCacheService().getMapCache(
            farmId: null,
            category: 'user_profile',
          );
          if (cachedProfile != null && user == null) {
            user = UserProfile.fromJson(cachedProfile);
          }
        }
      }
      final farms = rawList
          .map((item) => Farm.fromJson(item as Map<String, dynamic>))
          .toList();

      Farm? selectedFarm;

      // 1. Restaure la ferme active enregistrée si elle est toujours présente dans la liste
      if (_apiClient.activeFarmId != null) {
        final found = farms.where((f) => f.id == _apiClient.activeFarmId);
        if (found.isNotEmpty) {
          selectedFarm = found.first;
        }
      }

      // 2. Sinon, si l'ancienne ferme en mémoire existe toujours dans la liste
      if (selectedFarm == null && state.activeFarm != null) {
        final found = farms.where((f) => f.id == state.activeFarm!.id);
        if (found.isNotEmpty) {
          selectedFarm = found.first;
          await _apiClient.setActiveFarmId(selectedFarm.id);
        }
      }

      // 3. Si aucune ferme active n'est définie mais qu'il y a des fermes, choisir la première
      if (selectedFarm == null && farms.isNotEmpty) {
        selectedFarm = farms.first;
        await _apiClient.setActiveFarmId(selectedFarm.id);
      } else if (farms.isEmpty) {
        selectedFarm = null;
        await _apiClient.setActiveFarmId(null);
      }

      state = state.copyWith(
        farms: farms,
        activeFarm: selectedFarm,
        clearActiveFarm: selectedFarm == null,
        user: user,
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

  Future<bool> register({
    required String firstName,
    required String lastName,
    required String email,
    required String password,
    String? phone,
    String? farmName,
    String? productionType,
    String? locationCity,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final payload = {
        'firstName': firstName.trim(),
        'lastName': lastName.trim(),
        'email': email.trim().toLowerCase(),
        'password': password,
        if (phone != null && phone.trim().isNotEmpty) 'phone': phone.trim(),
        if (farmName != null && farmName.trim().isNotEmpty) 'farmName': farmName.trim(),
        if (productionType != null) 'productionType': productionType,
        if (locationCity != null && locationCity.trim().isNotEmpty) 'locationCity': locationCity.trim(),
      };

      final response = await _apiClient.dio.post(
        ApiEndpoints.register,
        data: payload,
      );

      final data = response.data['data'] as Map<String, dynamic>?;
      final token = data?['token'] as String?;
      if (token == null || token.isEmpty) {
        state = state.copyWith(
          isLoading: false,
          error: "Jeton manquant après inscription.",
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
      String message = "Erreur lors de l'inscription.";
      if (e.response?.data != null && e.response?.data is Map) {
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
        error: "Une erreur est survenue: $e",
      );
      return false;
    }
  }

  Future<bool> createFarm({
    required String name,
    String? code,
    String productionType = 'LAYER',
    String? locationCity,
    String? phone,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await _apiClient.dio.post(
        ApiEndpoints.farms,
        data: {
          'name': name.trim(),
          if (code != null && code.trim().isNotEmpty) 'code': code.trim(),
          'productionType': productionType,
          if (locationCity != null && locationCity.trim().isNotEmpty) 'locationCity': locationCity.trim(),
          if (phone != null && phone.trim().isNotEmpty) 'phone': phone.trim(),
        },
      );

      await loadFarms();
      return true;
    } on DioException catch (e) {
      String message = "Erreur lors de la création de la ferme.";
      if (e.response?.data != null && e.response?.data is Map) {
        final data = e.response!.data as Map;
        message = data['message'] ?? data['error'] ?? message;
      }
      state = state.copyWith(isLoading: false, error: message);
      return false;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: "Erreur: $e");
      return false;
    }
  }

  Future<bool> updateFarm({
    required String farmId,
    required String name,
    String? code,
    String productionType = 'LAYER',
    String? locationCity,
    String? phone,
    String? email,
    String? address,
    String? ifu,
    String? rccm,
    String? description,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await _apiClient.dio.put(
        ApiEndpoints.farmDetails(farmId),
        data: {
          'name': name.trim(),
          if (code != null && code.trim().isNotEmpty) 'code': code.trim(),
          'productionType': productionType,
          if (locationCity != null && locationCity.trim().isNotEmpty) 'locationCity': locationCity.trim(),
          if (phone != null && phone.trim().isNotEmpty) 'phone': phone.trim(),
          if (email != null && email.trim().isNotEmpty) 'email': email.trim().toLowerCase(),
          if (address != null && address.trim().isNotEmpty) 'address': address.trim(),
          if (ifu != null && ifu.trim().isNotEmpty) 'ifu': ifu.trim(),
          if (rccm != null && rccm.trim().isNotEmpty) 'rccm': rccm.trim(),
          if (description != null && description.trim().isNotEmpty) 'description': description.trim(),
        },
      );

      await loadFarms();
      return true;
    } on DioException catch (e) {
      String message = "Erreur lors de la mise à jour de l'exploitation.";
      if (e.response?.data != null && e.response?.data is Map) {
        final data = e.response!.data as Map;
        message = data['message'] ?? data['error'] ?? message;
      }
      state = state.copyWith(isLoading: false, error: message);
      return false;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: "Erreur: $e");
      return false;
    }
  }

  Future<bool> deleteFarm(String farmId) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await _apiClient.dio.delete(
        ApiEndpoints.farmDetails(farmId),
      );

      final wasActive = _apiClient.activeFarmId == farmId || state.activeFarm?.id == farmId;
      if (wasActive) {
        await _apiClient.setActiveFarmId(null);
      }

      // Mise à jour optimiste immédiate de la mémoire
      final remainingFarms = state.farms.where((f) => f.id != farmId).toList();
      Farm? nextActive;
      if (wasActive) {
        nextActive = remainingFarms.isNotEmpty ? remainingFarms.first : null;
        if (nextActive != null) {
          await _apiClient.setActiveFarmId(nextActive.id);
        }
      } else {
        nextActive = state.activeFarm;
      }

      state = state.copyWith(
        farms: remainingFarms,
        activeFarm: nextActive,
        clearActiveFarm: nextActive == null,
        isLoading: false,
      );

      await loadFarms();
      return true;
    } on DioException catch (e) {
      String message = "Erreur lors de la suppression de l'exploitation.";
      if (e.response?.data != null && e.response?.data is Map) {
        final data = e.response!.data as Map;
        message = data['message'] ?? data['error'] ?? message;
      }
      state = state.copyWith(isLoading: false, error: message);
      return false;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: "Erreur: $e");
      return false;
    }
  }

  Future<String?> changePassword(String currentPassword, String newPassword) async {
    try {
      await _apiClient.dio.post(
        ApiEndpoints.changePassword,
        data: {
          'currentPassword': currentPassword,
          'newPassword': newPassword,
        },
      );
      return null;
    } on DioException catch (e) {
      if (e.response?.data != null && e.response?.data is Map) {
        final data = e.response!.data as Map;
        return (data['detail'] ?? data['message'] ?? data['error'] ?? "Erreur lors du changement de mot de passe.").toString();
      }
      return "Impossible de joindre le serveur. Vérifiez votre connexion.";
    } catch (e) {
      return "Erreur: $e";
    }
  }

  /// Nombre d'actions hors-ligne en attente d'envoi pour avertissement avant déconnexion
  Future<int> getPendingSyncCount() async {
    try {
      final queue = await SyncService(_apiClient).getQueue();
      return queue.where((i) => i.isPending).length;
    } catch (_) {
      return 0;
    }
  }

  Future<void> logout() async {
    try {
      final storage = SecureStorageService();
      final refreshToken = storage.refreshToken;
      if (refreshToken != null && _apiClient.isAuthenticated) {
        await _apiClient.dio.post(
          ApiEndpoints.deviceLogout,
          data: {
            'refreshToken': refreshToken,
            'deviceId': storage.deviceId,
          },
        );
      }
    } catch (_) {}
    await _apiClient.clearAuth();
    await _apiClient.setActiveFarmId(null);
    await SyncService(_apiClient).clearQueue();
    await OfflineCacheService().clearAllCache();
    state = const AuthState();
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ApiClient());
});
