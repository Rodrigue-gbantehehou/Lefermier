import 'package:flutter_secure_storage/test/test_flutter_secure_storage_platform.dart';
import 'package:flutter_secure_storage_platform_interface/flutter_secure_storage_platform_interface.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:lefermier/core/api/api_client.dart';
import 'package:lefermier/core/security/secure_storage_service.dart';
import 'package:lefermier/features/auth/auth_provider.dart';

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
