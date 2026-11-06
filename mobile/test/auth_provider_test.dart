import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/test/test_flutter_secure_storage_platform.dart';
import 'package:flutter_secure_storage_platform_interface/flutter_secure_storage_platform_interface.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:poulvia/core/api/api_client.dart';
import 'package:poulvia/core/api/api_endpoints.dart';
import 'package:poulvia/core/security/secure_storage_service.dart';
import 'package:poulvia/features/auth/auth_provider.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late ApiClient apiClient;

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    FlutterSecureStoragePlatform.instance = TestFlutterSecureStoragePlatform({});
    SecureStorageService().resetForTesting();
    apiClient = ApiClient();
  });

  tearDown(() {
    FlutterSecureStoragePlatform.instance = TestFlutterSecureStoragePlatform({});
    SecureStorageService().resetForTesting();
  });

  group('AuthNotifier - Logout Lifecycle & Secure Storage Failure Handling', () {
    test('logout refuses to mask deletion failure and preserves session when native vault fails', () async {
      // 1. Initialise des jetons dans un faux coffre-fort qui refusera la suppression
      final lockedData = <String, String>{
        'lf_jwt_token': 'active_jwt_token',
        'lf_refresh_token': 'active_refresh_token',
      };
      FlutterSecureStoragePlatform.instance = _UnresponsiveDeleteStoragePlatform(lockedData);
      SecureStorageService().resetForTesting();

      final notifier = AuthNotifier(apiClient);
      notifier.setAuthenticatedForTesting(token: 'active_jwt_token');

      expect(notifier.state.isAuthenticated, isTrue);

      // 2. Déconnexion normale (sans forçage)
      final success = await notifier.logout(force: false);

      // L'échec ne doit PAS être masqué :
      expect(success, isFalse);
      expect(notifier.state.isAuthenticated, isTrue);
      expect(notifier.state.error, contains("Échec de purge sécurisée"));
    });

    test('logout with force: true purges application session even if native vault fails', () async {
      final lockedData = <String, String>{
        'lf_jwt_token': 'active_jwt_token',
        'lf_refresh_token': 'active_refresh_token',
      };
      FlutterSecureStoragePlatform.instance = _UnresponsiveDeleteStoragePlatform(lockedData);
      SecureStorageService().resetForTesting();

      final notifier = AuthNotifier(apiClient);
      notifier.setAuthenticatedForTesting(token: 'active_jwt_token');

      expect(notifier.state.isAuthenticated, isTrue);

      // Déconnexion forcée
      final success = await notifier.logout(force: true);

      expect(success, isTrue);
      expect(notifier.state.isAuthenticated, isFalse);
    });

    test('logout succeeds and resets state when hardware vault deletes tokens successfully', () async {
      final secureData = <String, String>{};
      FlutterSecureStoragePlatform.instance = TestFlutterSecureStoragePlatform(secureData);
      SecureStorageService().resetForTesting();

      await SecureStorageService().saveTokens(token: 'token_to_purge', refreshToken: 'refresh_to_purge');

      final notifier = AuthNotifier(apiClient);
      notifier.setAuthenticatedForTesting(token: 'token_to_purge');

      expect(notifier.state.isAuthenticated, isTrue);

      final success = await notifier.logout();

      expect(success, isTrue);
      expect(notifier.state.isAuthenticated, isFalse);
      expect(secureData.containsKey('lf_jwt_token'), isFalse);
      expect(secureData.containsKey('lf_refresh_token'), isFalse);
    });

    test('logout dispatches HTTP device-logout with deviceId and refreshToken when authenticated', () async {
      final secureData = <String, String>{};
      FlutterSecureStoragePlatform.instance = TestFlutterSecureStoragePlatform(secureData);
      SecureStorageService().resetForTesting();

      await SecureStorageService().init();
      await SecureStorageService().saveTokens(token: 'active_jwt_token', refreshToken: 'active_refresh_token');

      final client = ApiClient();
      await client.init();

      RequestOptions? capturedOptions;
      client.dio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (options, handler) {
            if (options.path == ApiEndpoints.deviceLogout) {
              capturedOptions = options;
              return handler.resolve(
                Response(
                  requestOptions: options,
                  statusCode: 200,
                  data: {'success': true},
                ),
              );
            }
            handler.next(options);
          },
        ),
      );

      final notifier = AuthNotifier(client);
      notifier.setAuthenticatedForTesting(token: 'active_jwt_token');

      final success = await notifier.logout();

      expect(success, isTrue);
      expect(capturedOptions, isNotNull);
      expect(capturedOptions!.method, 'POST');
      expect(capturedOptions!.path, ApiEndpoints.deviceLogout);
      final data = capturedOptions!.data as Map<String, dynamic>;
      expect(data['refreshToken'], 'active_refresh_token');
      expect(data['deviceId'], SecureStorageService().deviceId);
    });

    test('logout succeeds locally and clears state even when HTTP device-logout fails (network error)', () async {
      final secureData = <String, String>{};
      FlutterSecureStoragePlatform.instance = TestFlutterSecureStoragePlatform(secureData);
      SecureStorageService().resetForTesting();

      await SecureStorageService().init();
      await SecureStorageService().saveTokens(token: 'offline_jwt', refreshToken: 'offline_refresh');

      final client = ApiClient();
      await client.init();

      client.dio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (options, handler) {
            if (options.path == ApiEndpoints.deviceLogout) {
              return handler.reject(
                DioException(
                  requestOptions: options,
                  type: DioExceptionType.connectionError,
                  error: 'Simulated connection error: No internet',
                ),
              );
            }
            handler.next(options);
          },
        ),
      );

      final notifier = AuthNotifier(client);
      notifier.setAuthenticatedForTesting(token: 'offline_jwt');

      // Logout should succeed locally despite HTTP failure
      final success = await notifier.logout();

      expect(success, isTrue);
      expect(notifier.state.isAuthenticated, isFalse);
      expect(secureData.containsKey('lf_jwt_token'), isFalse);
      expect(secureData.containsKey('lf_refresh_token'), isFalse);
    });

    test('forced logout places session tombstone so app restart does not resurrect session', () async {
      final lockedData = <String, String>{
        'lf_jwt_token': 'stale_jwt_token',
        'lf_refresh_token': 'stale_refresh_token',
      };
      FlutterSecureStoragePlatform.instance = _UnresponsiveDeleteStoragePlatform(lockedData);
      SecureStorageService().resetForTesting();

      final client = ApiClient();
      final notifier = AuthNotifier(client);
      notifier.setAuthenticatedForTesting(token: 'stale_jwt_token');

      // 1. Forced logout when native vault refuses deletion
      final success = await notifier.logout(force: true);
      expect(success, isTrue);
      expect(notifier.state.isAuthenticated, isFalse);

      // Verify tombstone is placed
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getBool(SecureStorageService.keySessionRevoked), isTrue);

      // 2. Simulate application restart
      SecureStorageService().resetForTesting();
      final freshClient = ApiClient();
      await freshClient.init();

      // Ensure freshClient did not resurrect the token
      expect(freshClient.isAuthenticated, isFalse);
      expect(freshClient.jwtToken, isNull);

      final freshNotifier = AuthNotifier(freshClient);
      await freshNotifier.checkAuthStatus();

      expect(freshNotifier.state.isAuthenticated, isFalse);
      expect(freshNotifier.state.token, isNull);
    });
  });
}

class _UnresponsiveDeleteStoragePlatform extends FlutterSecureStoragePlatform {
  final Map<String, String> data;
  _UnresponsiveDeleteStoragePlatform(this.data);

  @override
  Future<bool> containsKey({required String key, required Map<String, String> options}) async => data.containsKey(key);

  @override
  Future<void> delete({required String key, required Map<String, String> options}) async {
    // Simule un échec matériel de suppression
  }

  @override
  Future<void> deleteAll({required Map<String, String> options}) async {}

  @override
  Future<String?> read({required String key, required Map<String, String> options}) async => data[key];

  @override
  Future<Map<String, String>> readAll({required Map<String, String> options}) async => Map.from(data);

  @override
  Future<void> write({required String key, required String value, required Map<String, String> options}) async {
    throw Exception('Simulated locked vault');
  }
}
