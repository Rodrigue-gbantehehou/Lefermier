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
  });
}
