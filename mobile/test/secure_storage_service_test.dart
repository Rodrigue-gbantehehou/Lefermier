import 'dart:convert';
import 'package:flutter_secure_storage/test/test_flutter_secure_storage_platform.dart';
import 'package:flutter_secure_storage_platform_interface/flutter_secure_storage_platform_interface.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:lefermier/core/security/secure_storage_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late Map<String, String> secureStorageData;

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    secureStorageData = {};
    FlutterSecureStoragePlatform.instance = TestFlutterSecureStoragePlatform(secureStorageData);
    SecureStorageService().resetForTesting();
  });

  tearDown(() {
    FlutterSecureStoragePlatform.instance = TestFlutterSecureStoragePlatform({});
    SecureStorageService().resetForTesting();
  });

  group('SecureStorageService - Hardware-Backed Secure Storage (Keystore/Keychain)', () {
    test('Stores and retrieves access token and refresh token via secure storage', () async {
      final storage = SecureStorageService();
      await storage.init();
      const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature';

      await storage.saveTokens(token: testToken, refreshToken: 'refresh_abc');

      expect(storage.token, testToken);
      expect(storage.refreshToken, 'refresh_abc');
      expect(storage.hasToken, isTrue);

      // Verify stored directly in native secure storage data
      expect(secureStorageData['lf_jwt_token'], testToken);
      expect(secureStorageData['lf_refresh_token'], 'refresh_abc');

      // Verify fresh instance reads the values
      SecureStorageService().resetForTesting();
      final freshStorage = SecureStorageService();
      await freshStorage.init();

      expect(freshStorage.token, testToken);
      expect(freshStorage.refreshToken, 'refresh_abc');
    });

    test('updateToken updates JWT in secure storage', () async {
      final storage = SecureStorageService();
      await storage.init();
      await storage.saveTokens(token: 'token_v1', refreshToken: 'refresh_v1');

      await storage.updateToken('token_v2');

      expect(storage.token, 'token_v2');
      expect(storage.refreshToken, 'refresh_v1');
      expect(secureStorageData['lf_jwt_token'], 'token_v2');
    });

    test('clearAuth purges tokens from secure storage while preserving deviceId', () async {
      final storage = SecureStorageService();
      await storage.init();
      final devId = storage.deviceId;

      await storage.saveTokens(token: 'token_to_purge', refreshToken: 'ref_to_purge');
      await storage.clearAuth();

      expect(storage.token, isNull);
      expect(storage.refreshToken, isNull);
      expect(storage.deviceId, devId);

      expect(secureStorageData.containsKey('lf_jwt_token'), isFalse);
      expect(secureStorageData.containsKey('lf_refresh_token'), isFalse);
      expect(secureStorageData['lf_device_id_raw'], devId);
    });

    test('Generates and preserves deviceId in secure storage across restarts', () async {
      final storage = SecureStorageService();
      await storage.init();
      final originalDeviceId = storage.deviceId;
      expect(originalDeviceId.startsWith('dev_'), isTrue);
      expect(secureStorageData['lf_device_id_raw'], originalDeviceId);

      SecureStorageService().resetForTesting();
      final freshStorage = SecureStorageService();
      await freshStorage.init();
      expect(freshStorage.deviceId, originalDeviceId);
    });

    test('Migrates legacy deviceId from SharedPreferences to secure storage and purges old key', () async {
      SharedPreferences.setMockInitialValues({
        'sec_vault_device_id': 'legacy_device_id_xyz789',
      });

      SecureStorageService().resetForTesting();
      final storage = SecureStorageService();
      await storage.init();

      expect(storage.deviceId, 'legacy_device_id_xyz789');
      expect(secureStorageData['lf_device_id_raw'], 'legacy_device_id_xyz789');

      final prefs = await SharedPreferences.getInstance();
      expect(prefs.containsKey('sec_vault_device_id'), isFalse);
    });

    test('Migrates legacy base64-encoded token to secure storage on startup', () async {
      const legacyToken = 'legacy_jwt_clear_token';
      final legacyBase64 = base64Encode(utf8.encode(legacyToken));

      SharedPreferences.setMockInitialValues({
        'sec_vault_jwt_token': legacyBase64,
        'sec_vault_refresh_token': legacyBase64,
      });

      SecureStorageService().resetForTesting();
      final storage = SecureStorageService();
      await storage.init();

      expect(storage.token, legacyToken);
      expect(storage.refreshToken, legacyToken);
      expect(secureStorageData['lf_jwt_token'], legacyToken);

      final prefs = await SharedPreferences.getInstance();
      expect(prefs.containsKey('sec_vault_jwt_token'), isFalse);
      expect(prefs.containsKey('sec_vault_refresh_token'), isFalse);
    });

    test('Migrates legacy plain token to secure storage and purges SharedPreferences', () async {
      final prefs = await SharedPreferences.getInstance();
      const token = 'jwt_token_from_plain';
      await prefs.setString('lefermier_jwt_token', token);

      SecureStorageService().resetForTesting();
      final storage = SecureStorageService();
      await storage.init();

      expect(storage.token, token);
      expect(secureStorageData['lf_jwt_token'], token);

      expect(prefs.containsKey('lefermier_jwt_token'), isFalse);
    });

    test('Migrates refresh token independently when JWT token is already present in secure storage', () async {
      const legacyRefresh = 'legacy_refresh_secret';
      final legacyBase64 = base64Encode(utf8.encode(legacyRefresh));

      // JWT is already in native secure storage
      secureStorageData['lf_jwt_token'] = 'already_saved_jwt';

      // Refresh token is still in SharedPreferences
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('sec_vault_refresh_token', legacyBase64);

      SecureStorageService().resetForTesting();
      final storage = SecureStorageService();
      await storage.init();

      expect(storage.token, 'already_saved_jwt');
      expect(storage.refreshToken, legacyRefresh);
      expect(secureStorageData['lf_refresh_token'], legacyRefresh);

      // Legacy key must now be purged
      expect(prefs.containsKey('sec_vault_refresh_token'), isFalse);
    });

    test('Preserves legacy keys in SharedPreferences if secure storage write fails', () async {
      final prefs = await SharedPreferences.getInstance();
      const legacyToken = 'precious_token_to_preserve';
      final legacyBase64 = base64Encode(utf8.encode(legacyToken));
      await prefs.setString('sec_vault_jwt_token', legacyBase64);
      await prefs.setString('sec_vault_device_id', 'legacy_device_777');

      // Simulate failing secure storage
      FlutterSecureStoragePlatform.instance = _FailingSecureStoragePlatform();

      SecureStorageService().resetForTesting();
      final storage = SecureStorageService();
      await storage.init();

      // Legacy keys must be PRESERVED and not deleted because write to secure storage failed!
      expect(prefs.containsKey('sec_vault_jwt_token'), isTrue);
      expect(prefs.containsKey('sec_vault_device_id'), isTrue);

      // In-memory fallback retains values so the active session does not crash
      expect(storage.token, legacyToken);
      expect(storage.deviceId, 'legacy_device_777');
    });

    test('saveTokens throws SecureStoragePersistenceException and does not cache token when write fails', () async {
      FlutterSecureStoragePlatform.instance = _FailingSecureStoragePlatform();

      SecureStorageService().resetForTesting();
      final storage = SecureStorageService();

      expect(
        () => storage.saveTokens(token: 'failing_token', refreshToken: 'failing_refresh'),
        throwsA(isA<SecureStoragePersistenceException>()),
      );

      // Token must NOT be presented as authenticated
      expect(storage.token, isNull);
      expect(storage.hasToken, isFalse);
    });

    test('updateToken throws SecureStoragePersistenceException when write fails', () async {
      FlutterSecureStoragePlatform.instance = _FailingSecureStoragePlatform();

      SecureStorageService().resetForTesting();
      final storage = SecureStorageService();

      expect(
        () => storage.updateToken('failing_update'),
        throwsA(isA<SecureStoragePersistenceException>()),
      );
    });

    test('clearAuth returns false and throws on throwOnFailure when delete fails', () async {
      final fakeData = <String, String>{
        'lf_jwt_token': 'secret_to_delete',
        'lf_refresh_token': 'refresh_to_delete',
      };
      FlutterSecureStoragePlatform.instance = _FailingDeleteStoragePlatform(fakeData);

      SecureStorageService().resetForTesting();
      final storage = SecureStorageService();

      // Without throwOnFailure: returns false
      final success = await storage.clearAuth();
      expect(success, isFalse);

      // With throwOnFailure: throws SecureStoragePersistenceException
      expect(
        () => storage.clearAuth(throwOnFailure: true),
        throwsA(isA<SecureStoragePersistenceException>()),
      );
    });

    test('clearAuth confirms complete deletion and returns true when tokens are erased', () async {
      final storage = SecureStorageService();
      await storage.init();
      await storage.saveTokens(token: 'jwt_to_clear', refreshToken: 'refresh_to_clear');

      expect(secureStorageData.containsKey('lf_jwt_token'), isTrue);
      expect(secureStorageData.containsKey('lf_refresh_token'), isTrue);

      final success = await storage.clearAuth();
      expect(success, isTrue);
      expect(secureStorageData.containsKey('lf_jwt_token'), isFalse);
      expect(secureStorageData.containsKey('lf_refresh_token'), isFalse);
      expect(storage.token, isNull);
      expect(storage.refreshToken, isNull);
    });

    test('Falls back gracefully when secure storage read throws', () async {
      FlutterSecureStoragePlatform.instance = _FailingReadStoragePlatform();

      SecureStorageService().resetForTesting();
      final storage = SecureStorageService();
      // Should not throw an unhandled exception during init
      await storage.init();
      expect(storage.token, isNull);
    });

    test('Purges legacy copies from SharedPreferences when tokens already exist natively at startup', () async {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('sec_vault_jwt_token', 'legacy_copy_jwt');
      await prefs.setString('sec_vault_refresh_token', 'legacy_copy_refresh');
      await prefs.setString('sec_vault_device_id', 'legacy_copy_device');
      await prefs.setString('lf_vault_entropy_seed', 'seed_to_purge');

      // Native storage already contains valid tokens
      secureStorageData['lf_jwt_token'] = 'native_secure_jwt';
      secureStorageData['lf_refresh_token'] = 'native_secure_refresh';
      secureStorageData['lf_device_id_raw'] = 'native_device_999';

      SecureStorageService().resetForTesting();
      final storage = SecureStorageService();
      await storage.init();

      expect(storage.token, 'native_secure_jwt');
      expect(storage.refreshToken, 'native_secure_refresh');
      expect(storage.deviceId, 'native_device_999');

      // All legacy duplicate keys must be purged from SharedPreferences
      expect(prefs.containsKey('sec_vault_jwt_token'), isFalse);
      expect(prefs.containsKey('sec_vault_refresh_token'), isFalse);
      expect(prefs.containsKey('sec_vault_device_id'), isFalse);
      expect(prefs.containsKey('lf_vault_entropy_seed'), isFalse);
    });
  });
}

class _FailingSecureStoragePlatform extends FlutterSecureStoragePlatform {
  @override
  Future<bool> containsKey({required String key, required Map<String, String> options}) async => false;

  @override
  Future<void> delete({required String key, required Map<String, String> options}) async {}

  @override
  Future<void> deleteAll({required Map<String, String> options}) async {}

  @override
  Future<String?> read({required String key, required Map<String, String> options}) async => null;

  @override
  Future<Map<String, String>> readAll({required Map<String, String> options}) async => {};

  @override
  Future<void> write({required String key, required String value, required Map<String, String> options}) async {
    throw Exception('Simulated KeyStore write failure');
  }
}

class _FailingDeleteStoragePlatform extends FlutterSecureStoragePlatform {
  final Map<String, String> data;
  _FailingDeleteStoragePlatform(this.data);

  @override
  Future<bool> containsKey({required String key, required Map<String, String> options}) async => data.containsKey(key);

  @override
  Future<void> delete({required String key, required Map<String, String> options}) async {
    // Simulates OS refusing deletion
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

class _FailingReadStoragePlatform extends FlutterSecureStoragePlatform {
  @override
  Future<bool> containsKey({required String key, required Map<String, String> options}) async => false;

  @override
  Future<void> delete({required String key, required Map<String, String> options}) async {}

  @override
  Future<void> deleteAll({required Map<String, String> options}) async {}

  @override
  Future<String?> read({required String key, required Map<String, String> options}) async {
    throw Exception('Simulated hardware read failure');
  }

  @override
  Future<Map<String, String>> readAll({required Map<String, String> options}) async => {};

  @override
  Future<void> write({required String key, required String value, required Map<String, String> options}) async {}
}
