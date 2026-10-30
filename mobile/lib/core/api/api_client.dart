import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';
import 'api_endpoints.dart';

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;

  late final Dio dio;
  static const String _tokenKey = "lefermier_jwt_token";
  static const String _deviceRefreshKey = "lefermier_device_refresh_token";
  static const String _activeFarmKey = "lefermier_active_farm_id";

  String? _jwtToken;
  String? _activeFarmId;

  ApiClient._internal() {
    dio = Dio(
      BaseOptions(
        baseUrl: ApiEndpoints.defaultBaseUrl,
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
    final prefs = await SharedPreferences.getInstance();
    _jwtToken = prefs.getString(_tokenKey);
    _activeFarmId = prefs.getString(_activeFarmKey);
  }

  void setBaseUrl(String url) {
    dio.options.baseUrl = url;
  }

  Future<void> setAuthToken(String? token) async {
    _jwtToken = token;
    final prefs = await SharedPreferences.getInstance();
    if (token != null) {
      await prefs.setString(_tokenKey, token);
    } else {
      await prefs.remove(_tokenKey);
    }
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

  String? get activeFarmId => _activeFarmId;
  bool get isAuthenticated => _jwtToken != null;

  Future<bool> _attemptTokenRefresh() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final refreshToken = prefs.getString(_deviceRefreshKey);
      if (refreshToken == null) return false;

      final res = await dio.post(
        ApiEndpoints.deviceRefresh,
        data: {'refreshToken': refreshToken},
        options: Options(headers: {'Authorization': null}),
      );

      if (res.statusCode == 200 && res.data['token'] != null) {
        await setAuthToken(res.data['token']);
        return true;
      }
    } catch (_) {}
    return false;
  }
}
