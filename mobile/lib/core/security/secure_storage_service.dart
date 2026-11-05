import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

/// Service de coffre-fort sécurisé pour les jetons de session (JWT, Refresh Token)
/// et l'identifiant immuable du terminal (deviceId).
///
/// Utilise le stockage matériel sécurisé natif du système via [FlutterSecureStorage] :
/// - Android : Android Keystore matériel (avec EncryptedSharedPreferences).
/// - iOS / macOS : Apple Keychain matériel (avec kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly).
/// - Windows / Linux : DPAPI / libsecret.
class SecureStorageService {
  static final SecureStorageService _instance = SecureStorageService._internal();
  factory SecureStorageService() => _instance;
  SecureStorageService._internal();

  static const String _keyToken = "lf_jwt_token";
  static const String _keyRefreshToken = "lf_refresh_token";
  static const String _keyDeviceId = "lf_device_id_raw";

  // Anciennes clés SharedPreferences à migrer puis purger
  static const String _legacyEncToken = "lf_vault_enc_jwt_token";
  static const String _legacyEncRefreshToken = "lf_vault_enc_refresh_token";
  static const String _legacyBase64Token = "sec_vault_jwt_token";
  static const String _legacyBase64Refresh = "sec_vault_refresh_token";
  static const String _legacyDeviceId = "sec_vault_device_id";
  static const String _legacyPlainToken = "lefermier_jwt_token";
  static const String _legacyEntropySeed = "lf_vault_entropy_seed";

  static const FlutterSecureStorage _defaultStorage = FlutterSecureStorage(
    aOptions: AndroidOptions(resetOnError: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock_this_device),
  );

  FlutterSecureStorage _storage = _defaultStorage;
  final Map<String, String> _inMemoryFallback = {};

  String? _cachedToken;
  String? _cachedRefreshToken;
  String? _cachedDeviceId;

  @visibleForTesting
  void setStorageForTesting(FlutterSecureStorage storage) {
    _storage = storage;
  }

  Future<String?> _readSafe(String key) async {
    try {
      return await _storage.read(key: key);
    } catch (_) {
      return _inMemoryFallback[key];
    }
  }

  Future<void> _writeSafe(String key, String value) async {
    try {
      await _storage.write(key: key, value: value);
    } catch (_) {
      _inMemoryFallback[key] = value;
    }
  }

  Future<void> _deleteSafe(String key) async {
    try {
      await _storage.delete(key: key);
    } catch (_) {
      _inMemoryFallback.remove(key);
    }
  }

  /// Initialise le coffre-fort, génère le deviceId si absent et migre les clés héritées
  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();

    // 1. Initialiser ou restaurer l'identifiant terminal (deviceId)
    String? storedDeviceId = await _readSafe(_keyDeviceId);
    if (storedDeviceId == null || storedDeviceId.isEmpty) {
      final legacyNew = prefs.getString(_keyDeviceId);
      final legacyOld = prefs.getString(_legacyDeviceId);
      if (legacyNew != null && legacyNew.isNotEmpty) {
        storedDeviceId = legacyNew;
      } else if (legacyOld != null && legacyOld.isNotEmpty) {
        storedDeviceId = legacyOld;
      } else {
        storedDeviceId = "dev_${const Uuid().v4().replaceAll('-', '').substring(0, 20)}";
      }
      await _writeSafe(_keyDeviceId, storedDeviceId);
      await prefs.remove(_legacyDeviceId);
    }
    _cachedDeviceId = storedDeviceId;

    // 2. Lire les jetons depuis le stockage natif sécurisé
    _cachedToken = await _readSafe(_keyToken);
    _cachedRefreshToken = await _readSafe(_keyRefreshToken);

    // 3. Migration transparente si des jetons existent encore dans les anciens formats
    if (_cachedToken == null || _cachedToken!.isEmpty) {
      await _migrateLegacyKeys(prefs);
    }
  }

  String get deviceId => _cachedDeviceId ?? "dev_default";
  String? get token => _cachedToken;
  String? get refreshToken => _cachedRefreshToken;
  bool get hasToken => _cachedToken != null && _cachedToken!.isNotEmpty;

  Future<void> saveTokens({required String token, String? refreshToken}) async {
    _cachedToken = token;
    await _writeSafe(_keyToken, token);

    if (refreshToken != null && refreshToken.isNotEmpty) {
      _cachedRefreshToken = refreshToken;
      await _writeSafe(_keyRefreshToken, refreshToken);
    } else {
      _cachedRefreshToken = null;
      await _deleteSafe(_keyRefreshToken);
    }
  }

  Future<void> updateToken(String token) async {
    _cachedToken = token;
    await _writeSafe(_keyToken, token);
  }

  /// Efface les jetons de session. Le deviceId est préservé car il identifie le terminal matériel.
  Future<void> clearAuth() async {
    _cachedToken = null;
    _cachedRefreshToken = null;
    await _deleteSafe(_keyToken);
    await _deleteSafe(_keyRefreshToken);

    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_legacyEncToken);
    await prefs.remove(_legacyEncRefreshToken);
    await prefs.remove(_legacyBase64Token);
    await prefs.remove(_legacyBase64Refresh);
    await prefs.remove(_legacyPlainToken);
  }

  @visibleForTesting
  void resetForTesting() {
    _cachedToken = null;
    _cachedRefreshToken = null;
    _cachedDeviceId = null;
    _inMemoryFallback.clear();
    _storage = _defaultStorage;
  }

  // ---------------------------------------------------------------------------
  // Migration ascendante transparente des anciens formats vers FlutterSecureStorage
  // ---------------------------------------------------------------------------

  static const String _appSalt = "LeFermier_Secure_Vault_v2_2026";

  Future<void> _migrateLegacyKeys(SharedPreferences prefs) async {
    // 1. Récupération éventuelle de l'ancien token
    if (_cachedToken == null || _cachedToken!.isEmpty) {
      String? oldToken;
      final legacyEnc = prefs.getString(_legacyEncToken);
      if (legacyEnc != null && legacyEnc.isNotEmpty) {
        oldToken = _decryptLegacy(legacyEnc, prefs);
      }
      if (oldToken == null || oldToken.isEmpty) {
        final legacyBase64 = prefs.getString(_legacyBase64Token);
        final legacyPlain = prefs.getString(_legacyPlainToken);
        if (legacyBase64 != null && legacyBase64.isNotEmpty) {
          try {
            oldToken = utf8.decode(base64Decode(legacyBase64));
          } catch (_) {
            oldToken = legacyBase64;
          }
        } else if (legacyPlain != null && legacyPlain.isNotEmpty) {
          oldToken = legacyPlain;
        }
      }

      if (oldToken != null && oldToken.isNotEmpty) {
        _cachedToken = oldToken;
        await _writeSafe(_keyToken, oldToken);
      }
    }

    // 2. Récupération éventuelle de l'ancien refresh token
    if (_cachedRefreshToken == null || _cachedRefreshToken!.isEmpty) {
      String? oldRefresh;
      final legacyEncRefresh = prefs.getString(_legacyEncRefreshToken);
      if (legacyEncRefresh != null && legacyEncRefresh.isNotEmpty) {
        oldRefresh = _decryptLegacy(legacyEncRefresh, prefs);
      }
      if (oldRefresh == null || oldRefresh.isEmpty) {
        final legacyRefresh = prefs.getString(_legacyBase64Refresh);
        if (legacyRefresh != null && legacyRefresh.isNotEmpty) {
          try {
            oldRefresh = utf8.decode(base64Decode(legacyRefresh));
          } catch (_) {
            oldRefresh = legacyRefresh;
          }
        }
      }

      if (oldRefresh != null && oldRefresh.isNotEmpty) {
        _cachedRefreshToken = oldRefresh;
        await _writeSafe(_keyRefreshToken, oldRefresh);
      }
    }

    // 3. Purge définitive de toutes les clés d'anciennes versions
    await prefs.remove(_legacyEncToken);
    await prefs.remove(_legacyEncRefreshToken);
    await prefs.remove(_legacyBase64Token);
    await prefs.remove(_legacyBase64Refresh);
    await prefs.remove(_legacyPlainToken);
    await prefs.remove(_legacyDeviceId);
    await prefs.remove(_legacyEntropySeed);
  }

  String? _decryptLegacy(String envelope, SharedPreferences prefs) {
    if (!envelope.startsWith("v2:")) return null;
    final parts = envelope.split(':');
    if (parts.length != 4) return null;

    final ivHex = parts[1];
    final mac = parts[2];
    final cipherBase64 = parts[3];

    // Essayer avec la dérivation durcie 1 000 passes
    final seed = prefs.getString(_legacyEntropySeed) ?? "entropy_fallback_seed";
    final saltMaterial = utf8.encode("${_appSalt}_${deviceId}_$seed");
    var key = sha256.convert(saltMaterial).bytes;
    for (int i = 0; i < 1000; i++) {
      final hmac = Hmac(sha256, key);
      key = hmac.convert(saltMaterial).bytes;
    }

    var decrypted = _decryptWithKey(ivHex, mac, cipherBase64, key);
    if (decrypted != null) return decrypted;

    // Repli de compatibilité avec la dérivation 1 passe
    final legacyKey = sha256.convert(utf8.encode("${_appSalt}_$deviceId")).bytes;
    return _decryptWithKey(ivHex, mac, cipherBase64, legacyKey);
  }

  String? _decryptWithKey(String ivHex, String mac, String cipherBase64, List<int> key) {
    final hmac = Hmac(sha256, key);
    final expectedMac = hmac.convert(utf8.encode("$ivHex:$cipherBase64")).toString();
    if (mac != expectedMac) return null;

    try {
      final ivBytes = <int>[];
      for (int i = 0; i < ivHex.length; i += 2) {
        ivBytes.add(int.parse(ivHex.substring(i, i + 2), radix: 16));
      }
      final cipherBytes = base64Decode(cipherBase64);
      final plainBytes = _applyKeystream(cipherBytes, key, ivBytes);
      return utf8.decode(plainBytes);
    } catch (_) {
      return null;
    }
  }

  List<int> _applyKeystream(List<int> input, List<int> key, List<int> iv) {
    final output = List<int>.filled(input.length, 0);
    int blockIndex = 0;
    int streamOffset = 0;
    List<int> currentBlock = [];

    for (int i = 0; i < input.length; i++) {
      if (streamOffset >= currentBlock.length) {
        final blockHmac = Hmac(sha256, key);
        currentBlock = blockHmac.convert([...iv, blockIndex >> 8, blockIndex & 0xFF]).bytes;
        blockIndex++;
        streamOffset = 0;
      }
      output[i] = input[i] ^ currentBlock[streamOffset];
      streamOffset++;
    }
    return output;
  }
}
