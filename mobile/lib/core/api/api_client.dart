import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';
import '../config/app_config.dart';
import '../security/secure_storage_service.dart';
import 'api_endpoints.dart';

/// Résultat d'une tentative de renouvellement de session.
enum RefreshOutcome {
  /// Nouveau JWT obtenu : la requête peut être rejouée.
  refreshed,

  /// Le serveur a refusé le refresh token (expiré, révoqué, réutilisé) : session terminée.
  rejected,

  /// Serveur injoignable ou réponse inexploitable : la session est conservée.
  unavailable,
}

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;

  /// Client principal (intercepteurs JWT, ferme active, idempotence, refresh).
  late final Dio dio;

  /// Client dédié au renouvellement : aucun intercepteur, donc aucune récursion possible.
  late final Dio _authDio;

  static const String _activeFarmKey = "poulvia_active_farm_id";
  static const String _hasSeenWelcomeKey = "poulvia_has_seen_welcome";
  static const String _retriedFlag = "_lf_retried_after_refresh";

  /// Routes publiques pour lesquelles un 401 signifie « identifiants invalides »,
  /// jamais « JWT expiré ». (`device-logout` n'en fait pas partie : il exige le JWT.)
  static const Set<String> _authPaths = {
    ApiEndpoints.login,
    ApiEndpoints.register,
    ApiEndpoints.deviceSession,
    ApiEndpoints.deviceRefresh,
  };

  String? _jwtToken;
  String? _cachedSubjectToken;
  String? _cachedSubject;
  String? _activeFarmId;
  bool _hasSeenWelcome = false;

  /// Renouvellement en cours, partagé par toutes les requêtes ayant reçu un 401.
  Future<RefreshOutcome>? _refreshInFlight;

  final StreamController<void> _sessionExpired = StreamController<void>.broadcast();

  /// Émis lorsque le serveur a définitivement refusé la session.
  Stream<void> get onSessionExpired => _sessionExpired.stream;

  ApiClient._internal() {
    _setup();
  }

  /// Instance isolée branchée sur un adaptateur HTTP simulé (tests uniquement).
  @visibleForTesting
  ApiClient.forTesting({required HttpClientAdapter adapter, String baseUrl = "http://test.local"}) {
    _setup();
    dio.httpClientAdapter = adapter;
    _authDio.httpClientAdapter = adapter;
    setBaseUrl(baseUrl);
  }

  void _setup() {
    final baseOptions = BaseOptions(
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 15),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    );
    dio = Dio(baseOptions);
    _authDio = Dio(baseOptions.copyWith());

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          if (_jwtToken != null && !_isAuthPath(options.path)) {
            options.headers['Authorization'] = 'Bearer $_jwtToken';
          }

          if (_activeFarmId != null && !options.headers.containsKey('X-Farm-Id')) {
            options.headers['X-Farm-Id'] = _activeFarmId;
          }

          // Clé d'idempotence générée une seule fois : elle est conservée lors d'un rejeu.
          if (['POST', 'PUT', 'PATCH'].contains(options.method) &&
              !options.headers.containsKey('X-Idempotency-Key')) {
            options.headers['X-Idempotency-Key'] = const Uuid().v4();
          }

          handler.next(options);
        },
        onError: (DioException error, handler) async {
          final retried = await _retryAfterRefreshIfPossible(error);
          if (retried != null) {
            return handler.resolve(retried);
          }
          handler.next(error);
        },
      ),
    );
  }

  /// Rejoue la requête une seule fois après un renouvellement réussi.
  /// Retourne `null` si la requête ne doit pas (ou ne peut pas) être rejouée.
  Future<Response<dynamic>?> _retryAfterRefreshIfPossible(DioException error) async {
    final opts = error.requestOptions;
    if (error.response?.statusCode != 401) return null;
    if (_isAuthPath(opts.path)) return null;
    if (opts.extra[_retriedFlag] == true) return null; // pas de second rejeu

    final sentAuth = opts.headers['Authorization'] as String?;
    if (sentAuth == null) return null; // requête non authentifiée : rien à renouveler

    final sentToken = sentAuth.replaceFirst('Bearer ', '');
    final RefreshOutcome outcome;
    if (_jwtToken != null && sentToken != _jwtToken) {
      // Un autre appel a déjà renouvelé le jeton pendant que celle-ci était en vol.
      outcome = RefreshOutcome.refreshed;
    } else {
      outcome = await refreshSession();
    }

    if (outcome != RefreshOutcome.refreshed) return null;

    opts.extra[_retriedFlag] = true;
    opts.headers['Authorization'] = 'Bearer $_jwtToken';
    try {
      return await dio.fetch<dynamic>(opts);
    } on DioException {
      return null;
    }
  }

  bool _isAuthPath(String path) {
    final uriPath = Uri.tryParse(path)?.path ?? path;
    return _authPaths.any((p) => uriPath.endsWith(p)) ||
        uriPath.contains('/api/auth/forgot-password') ||
        uriPath.contains('/api/auth/reset-password');
  }

  /// Renouvelle le JWT. Les appels concurrents partagent la même tentative :
  /// un seul `POST /api/auth/refresh` est émis, ce qui évite la détection de
  /// réutilisation (et la révocation de toute la famille de jetons) côté Symfony.
  Future<RefreshOutcome> refreshSession() {
    final inFlight = _refreshInFlight;
    if (inFlight != null) return inFlight;

    final future = _performRefresh().whenComplete(() => _refreshInFlight = null);
    _refreshInFlight = future;
    return future;
  }

  Future<RefreshOutcome> _performRefresh() async {
    final storage = SecureStorageService();
    final refreshToken = storage.refreshToken;
    if (refreshToken == null || refreshToken.isEmpty) {
      // Session « ancienne génération » sans refresh token : le 401 est définitif.
      await _expireSession();
      return RefreshOutcome.rejected;
    }

    try {
      final res = await _authDio.post<dynamic>(
        ApiEndpoints.deviceRefresh,
        data: {
          'refreshToken': refreshToken,
          'deviceId': storage.deviceId,
        },
      );

      final body = res.data;
      final data = body is Map ? (body['data'] is Map ? body['data'] : body) : null;
      final newToken = data is Map ? data['token'] as String? : null;
      if (newToken == null || newToken.isEmpty) {
        return RefreshOutcome.unavailable;
      }
      await setAuthTokens(token: newToken, refreshToken: data['refreshToken'] as String?);
      return RefreshOutcome.refreshed;
    } on DioException catch (e) {
      final status = e.response?.statusCode;
      if (status == 400 || status == 401 || status == 403) {
        await _expireSession();
        return RefreshOutcome.rejected;
      }
      // Timeout, coupure réseau, 5xx : on garde la session pour réessayer plus tard.
      return RefreshOutcome.unavailable;
    } catch (_) {
      return RefreshOutcome.unavailable;
    }
  }

  Future<void> _expireSession() async {
    await clearAuth();
    if (!_sessionExpired.isClosed) {
      _sessionExpired.add(null);
    }
  }

  Future<void> init() async {
    await SecureStorageService().init();
    _jwtToken = SecureStorageService().token;

    final prefs = await SharedPreferences.getInstance();
    _activeFarmId = prefs.getString(_activeFarmKey);
    _hasSeenWelcome = prefs.getBool(_hasSeenWelcomeKey) ?? false;
    setBaseUrl(await AppConfig.resolveApiBaseUrl());
  }

  void setBaseUrl(String url) {
    dio.options.baseUrl = url;
    _authDio.options.baseUrl = url;
  }

  Future<void> setAuthToken(String? token) async {
    if (token != null) {
      await SecureStorageService().updateToken(token);
      _jwtToken = token;
    } else {
      _jwtToken = null;
      await SecureStorageService().clearAuth();
    }
  }

  Future<void> setAuthTokens({required String token, String? refreshToken}) async {
    await SecureStorageService().saveTokens(token: token, refreshToken: refreshToken);
    _jwtToken = token;
  }

  Future<bool> clearAuth({bool throwOnFailure = false}) async {
    _jwtToken = null;
    return await SecureStorageService().clearAuth(throwOnFailure: throwOnFailure);
  }

  Future<void> setActiveFarmId(String? farmId) async {
    _activeFarmId = farmId;
    final prefs = await SharedPreferences.getInstance();
    if (farmId != null) {
      await prefs.setString(_activeFarmKey, farmId);
    } else {
      await prefs.remove(_activeFarmKey);
    }
  }

  Future<void> setHasSeenWelcome(bool seen) async {
    _hasSeenWelcome = seen;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_hasSeenWelcomeKey, seen);
  }

  bool get hasSeenWelcome => _hasSeenWelcome;
  String? get activeFarmId => _activeFarmId;
  String? get jwtToken => _jwtToken;
  bool get isAuthenticated => _jwtToken != null && _jwtToken!.isNotEmpty;

  /// Identité du titulaire de la session, lue dans le JWT (claim `username`).
  /// Disponible hors ligne ; sert à cloisonner l'outbox et le cache par utilisateur.
  String? get sessionSubject {
    final token = _jwtToken;
    if (token == null) return null;
    if (token == _cachedSubjectToken) return _cachedSubject;

    String? subject;
    final parts = token.split('.');
    if (parts.length == 3) {
      try {
        final payload = jsonDecode(utf8.decode(base64Url.decode(base64Url.normalize(parts[1]))));
        if (payload is Map) {
          subject = (payload['username'] ?? payload['email'] ?? payload['sub'])?.toString();
        }
      } catch (_) {}
    }
    _cachedSubjectToken = token;
    _cachedSubject = subject;
    return subject;
  }
}
