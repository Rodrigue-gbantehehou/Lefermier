import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';
import '../config/app_config.dart';
import '../security/secure_storage_service.dart';
import 'api_endpoints.dart';

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;

  late final Dio dio;
  static const String _tokenKey = "lefermier_jwt_token";
  static const String _activeFarmKey = "lefermier_active_farm_id";
  static const String _hasSeenWelcomeKey = "lefermier_has_seen_welcome";

  String? _jwtToken;
  String? _activeFarmId;
  bool _hasSeenWelcome = false;

  ApiClient._internal() {
    dio = Dio(
      BaseOptions(
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 15),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          // Inject JWT if available
          if (_jwtToken != null) {
            options.headers['Authorization'] = 'Bearer $_jwtToken';
          }

          // Inject Active Farm ID if present
          if (_activeFarmId != null && !options.headers.containsKey('X-Farm-Id')) {
            options.headers['X-Farm-Id'] = _activeFarmId;
          }

          // Add idempotency key for mutating POST/PUT/PATCH requests
          if (['POST', 'PUT', 'PATCH'].contains(options.method)) {
            if (!options.headers.containsKey('X-Idempotency-Key')) {
              options.headers['X-Idempotency-Key'] = const Uuid().v4();
            }
          }

          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          // Handle automatic 401 token refresh if device refresh token exists
          if (error.response?.statusCode == 401) {
            final refreshed = await _attemptTokenRefresh();
            if (refreshed) {
              final opts = error.requestOptions;
              opts.headers['Authorization'] = 'Bearer $_jwtToken';
              try {
                final cloneReq = await dio.request(
                  opts.path,
                  options: Options(
                    method: opts.method,
                    headers: opts.headers,
                  ),
                  data: opts.data,
                  queryParameters: opts.queryParameters,
                );
                return handler.resolve(cloneReq);
              } catch (_) {}
            }
          }
          return handler.next(error);
        },
      ),
    );
  }

  Future<void> init() async {
    await SecureStorageService().init();
    _jwtToken = SecureStorageService().token;

    final prefs = await SharedPreferences.getInstance();
    // Migration transparente si ancien token dans SharedPreferences brut
    if (_jwtToken == null && prefs.containsKey(_tokenKey)) {
      final oldToken = prefs.getString(_tokenKey);
      if (oldToken != null) {
        await SecureStorageService().saveTokens(token: oldToken);
        _jwtToken = oldToken;
        await prefs.remove(_tokenKey);
      }
    }

    _activeFarmId = prefs.getString(_activeFarmKey);
    _hasSeenWelcome = prefs.getBool(_hasSeenWelcomeKey) ?? false;
    dio.options.baseUrl = await AppConfig.resolveApiBaseUrl();
  }

  void setBaseUrl(String url) {
    dio.options.baseUrl = url;
  }

  Future<void> setAuthToken(String? token) async {
    _jwtToken = token;
    if (token != null) {
      await SecureStorageService().updateToken(token);
    } else {
      await SecureStorageService().clearAuth();
    }
  }

  Future<void> setAuthTokens({required String token, String? refreshToken}) async {
    _jwtToken = token;
    await SecureStorageService().saveTokens(token: token, refreshToken: refreshToken);
  }

  Future<void> clearAuth() async {
    _jwtToken = null;
    await SecureStorageService().clearAuth();
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

  Future<bool> _attemptTokenRefresh() async {
    final storage = SecureStorageService();
    final refreshToken = storage.refreshToken;
    if (refreshToken == null || refreshToken.isEmpty) return false;

    try {
      final res = await dio.post(
        ApiEndpoints.deviceRefresh,
        data: {
          'refreshToken': refreshToken,
          'deviceId': storage.deviceId,
        },
        options: Options(headers: {'Authorization': null}),
      );

      final data = res.data is Map ? (res.data['data'] ?? res.data) : null;
      if (res.statusCode == 200 && data != null && data['token'] != null) {
        final newToken = data['token'] as String;
        final newRefresh = data['refreshToken'] as String?;
        await setAuthTokens(token: newToken, refreshToken: newRefresh);
        return true;
      }
    } catch (_) {
      await clearAuth();
    }
    return false;
  }
}
