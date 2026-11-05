import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:lefermier/core/security/secure_storage_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    SecureStorageService().resetForTesting();
  });

  group('SecureStorageService - Authenticated Cryptographic Vault', () {
    test('Encrypts and decrypts access token round-trip', () async {
      final storage = SecureStorageService();
      await storage.init();
      const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature';

      await storage.saveTokens(token: testToken, refreshToken: 'refresh_abc');

      expect(storage.token, testToken);
      expect(storage.refreshToken, 'refresh_abc');
      expect(storage.hasToken, isTrue);

      // Verify fresh instance reads the decrypted values
      SecureStorageService().resetForTesting();
      final freshStorage = SecureStorageService();
      await freshStorage.init();

      expect(freshStorage.token, testToken);
      expect(freshStorage.refreshToken, 'refresh_abc');
    });

    test('Stored raw value uses v2 envelope with authentication tag', () async {
      final storage = SecureStorageService();
      await storage.init();
      await storage.saveTokens(token: 'secret_jwt_token');

      final prefs = await SharedPreferences.getInstance();
      final rawStored = prefs.getString('lf_vault_enc_jwt_token');

      expect(rawStored, isNotNull);
      expect(rawStored!.startsWith('v2:'), isTrue);

      final parts = rawStored.split(':');
      expect(parts.length, 4); // v2 : iv : mac : ciphertext
    });

    test('Tampering with ciphertext causes decryption failure and returns null', () async {
      final storage = SecureStorageService();
      await storage.init();
      await storage.saveTokens(token: 'legitimate_token');

      final prefs = await SharedPreferences.getInstance();
      final rawStored = prefs.getString('lf_vault_enc_jwt_token')!;
      final parts = rawStored.split(':');

      // Tamper with the ciphertext (alter the last character)
      final tamperedCiphertext = parts[3].endsWith('A') ? '${parts[3].substring(0, parts[3].length - 1)}B' : '${parts[3]}A';
      final tamperedRaw = '${parts[0]}:${parts[1]}:${parts[2]}:$tamperedCiphertext';
      await prefs.setString('lf_vault_enc_jwt_token', tamperedRaw);

      // Create fresh instance to verify decryption failure
      SecureStorageService().resetForTesting();
      final freshStorage = SecureStorageService();
      await freshStorage.init();

      expect(freshStorage.token, isNull);
    });

    test('Tampering with MAC tag causes decryption failure and returns null', () async {
      final storage = SecureStorageService();
      await storage.init();
      await storage.saveTokens(token: 'legitimate_token');

      final prefs = await SharedPreferences.getInstance();
      final rawStored = prefs.getString('lf_vault_enc_jwt_token')!;
      final parts = rawStored.split(':');

      // Tamper with HMAC tag
      const tamperedTag = '0000000000000000000000000000000000000000000000000000000000000000';
      final tamperedRaw = '${parts[0]}:${parts[1]}:$tamperedTag:${parts[3]}';
      await prefs.setString('lf_vault_enc_jwt_token', tamperedRaw);

      SecureStorageService().resetForTesting();
      final freshStorage = SecureStorageService();
      await freshStorage.init();

      expect(freshStorage.token, isNull);
    });

    test('Migrates legacy base64-encoded token to encrypted v2 format on startup', () async {
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

      final prefs = await SharedPreferences.getInstance();
      // Legacy plain keys must be completely purged
      expect(prefs.containsKey('sec_vault_jwt_token'), isFalse);
      expect(prefs.containsKey('sec_vault_refresh_token'), isFalse);

      // Must be re-persisted under secure v2 keys
      final rawSecured = prefs.getString('lf_vault_enc_jwt_token');
      expect(rawSecured, isNotNull);
      expect(rawSecured!.startsWith('v2:'), isTrue);
    });

    test('clearAuth removes both memory cache and disk records', () async {
      final storage = SecureStorageService();
      await storage.init();
      await storage.saveTokens(token: 'token_to_purge', refreshToken: 'ref_to_purge');
      await storage.clearAuth();

      expect(storage.token, isNull);
      expect(storage.refreshToken, isNull);

      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getString('lf_vault_enc_jwt_token'), isNull);
      expect(prefs.getString('lf_vault_enc_refresh_token'), isNull);
    });

    test('Migrates legacy deviceId into lf_device_id_raw and persists across restarts', () async {
      SharedPreferences.setMockInitialValues({
        'sec_vault_device_id': 'legacy_device_id_xyz789',
      });

      SecureStorageService().resetForTesting();
      final storage = SecureStorageService();
      await storage.init();

      expect(storage.deviceId, 'legacy_device_id_xyz789');

      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getString('lf_device_id_raw'), 'legacy_device_id_xyz789');
      // The legacy key should be cleaned up
      expect(prefs.containsKey('sec_vault_device_id'), isFalse);

      // Verify second initialization retains the migrated device ID
      SecureStorageService().resetForTesting();
      final freshStorage = SecureStorageService();
      await freshStorage.init();
      expect(freshStorage.deviceId, 'legacy_device_id_xyz789');
    });

    test('Generates and preserves key entropy seed for key stretching', () async {
      final storage = SecureStorageService();
      await storage.init();

      final prefs = await SharedPreferences.getInstance();
      final seed = prefs.getString('lf_vault_entropy_seed');
      expect(seed, isNotNull);
      expect(seed!.length, 64); // 32 bytes in hex = 64 characters

      // Subsequent init preserves the same entropy seed
      SecureStorageService().resetForTesting();
      final freshStorage = SecureStorageService();
      await freshStorage.init();
      expect(prefs.getString('lf_vault_entropy_seed'), seed);
    });
  });
}
