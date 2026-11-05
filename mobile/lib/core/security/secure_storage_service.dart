import 'dart:convert';
import 'dart:math';
import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

/// Service de coffre-fort sécurisé pour les jetons de session (JWT, Refresh Token)
/// et l'identifiant immuable du terminal (deviceId).
///
/// Implémente un chiffrement symétrique authentifié (Chiffrement par flux HMAC-SHA256
/// avec vecteur d'initialisation unique et code d'authentification de message MAC).
/// Les données stockées sont protégées contre l'extraction en clair et les altérations.
class SecureStorageService {
  static final SecureStorageService _instance = SecureStorageService._internal();
  factory SecureStorageService() => _instance;
  SecureStorageService._internal();

  static const String _vaultPrefix = "lf_vault_enc_";
  static const String _keyToken = "${_vaultPrefix}jwt_token";
  static const String _keyRefreshToken = "${_vaultPrefix}refresh_token";
  static const String _keyDeviceId = "lf_device_id_raw";
  static const String _keyEntropySeed = "lf_vault_entropy_seed";

  // Anciennes clés non chiffrées ou en Base64 à migrer puis purger
  static const String _legacyBase64Token = "sec_vault_jwt_token";
  static const String _legacyBase64Refresh = "sec_vault_refresh_token";
  static const String _legacyDeviceId = "sec_vault_device_id";
  static const String _legacyPlainToken = "lefermier_jwt_token";

  static const String _appSalt = "LeFermier_Secure_Vault_v2_2026";

  String? _cachedToken;
  String? _cachedRefreshToken;
  String? _cachedDeviceId;
  String? _cachedEntropySeed;

  /// Initialise le coffre-fort, génère le deviceId si absent et migre les clés héritées
  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();

    // 1. Initialiser ou restaurer l'identifiant terminal (persistance immédiate de l'hérité)
    final existingNew = prefs.getString(_keyDeviceId);
    final existingLegacy = prefs.getString(_legacyDeviceId);

    if (existingNew != null && existingNew.isNotEmpty) {
      _cachedDeviceId = existingNew;
    } else if (existingLegacy != null && existingLegacy.isNotEmpty) {
      _cachedDeviceId = existingLegacy;
      await prefs.setString(_keyDeviceId, existingLegacy);
    } else {
      _cachedDeviceId = "dev_${const Uuid().v4().replaceAll('-', '').substring(0, 20)}";
      await prefs.setString(_keyDeviceId, _cachedDeviceId!);
    }

    // 2. Sel d'entropie d'installation (Key stretching)
    _cachedEntropySeed = prefs.getString(_keyEntropySeed);
    if (_cachedEntropySeed == null || _cachedEntropySeed!.isEmpty) {
      final rand = Random.secure();
      final seedBytes = List<int>.generate(32, (_) => rand.nextInt(256));
      _cachedEntropySeed = seedBytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
      await prefs.setString(_keyEntropySeed, _cachedEntropySeed!);
    }

    // 3. Tenter de lire les jetons chiffrés avec la clé dérivée du terminal
    _cachedToken = _readEncrypted(prefs, _keyToken);
    _cachedRefreshToken = _readEncrypted(prefs, _keyRefreshToken);

    // 4. Migration transparente si anciennes clés Base64 ou texte brut présentes
    await _migrateLegacyKeys(prefs);
  }

  String get deviceId => _cachedDeviceId ?? "dev_default";
  String? get token => _cachedToken;
  String? get refreshToken => _cachedRefreshToken;
  bool get hasToken => _cachedToken != null && _cachedToken!.isNotEmpty;

  Future<void> saveTokens({required String token, String? refreshToken}) async {
    _cachedToken = token;
    final prefs = await SharedPreferences.getInstance();
    await _writeEncrypted(prefs, _keyToken, token);

    if (refreshToken != null && refreshToken.isNotEmpty) {
      _cachedRefreshToken = refreshToken;
      await _writeEncrypted(prefs, _keyRefreshToken, refreshToken);
    }
  }

  Future<void> updateToken(String token) async {
    _cachedToken = token;
    final prefs = await SharedPreferences.getInstance();
    await _writeEncrypted(prefs, _keyToken, token);
  }

  /// Efface les jetons de session. Le deviceId est préservé car il identifie le terminal matériel.
  Future<void> clearAuth() async {
    _cachedToken = null;
    _cachedRefreshToken = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyToken);
    await prefs.remove(_keyRefreshToken);
    await prefs.remove(_legacyBase64Token);
    await prefs.remove(_legacyBase64Refresh);
    await prefs.remove(_legacyPlainToken);
  }

  @visibleForTesting
  void resetForTesting() {
    _cachedToken = null;
    _cachedRefreshToken = null;
    _cachedDeviceId = null;
    _cachedEntropySeed = null;
  }

  // ---------------------------------------------------------------------------
  // Moteur de chiffrement symétrique authentifié (HMAC-SHA256 Multi-Pass Vault)
  // ---------------------------------------------------------------------------

  List<int> _deriveKey() {
    final seed = _cachedEntropySeed ?? "entropy_fallback_seed";
    final saltMaterial = utf8.encode("${_appSalt}_${deviceId}_$seed");
    var key = sha256.convert(saltMaterial).bytes;
    // PBKDF2-like stretching : 1 000 passes de HMAC-SHA256
    for (int i = 0; i < 1000; i++) {
      final hmac = Hmac(sha256, key);
      key = hmac.convert(saltMaterial).bytes;
    }
    return key;
  }

  List<int> _deriveLegacyKey() {
    final keyMaterial = utf8.encode("${_appSalt}_$deviceId");
    return sha256.convert(keyMaterial).bytes;
  }

  String _encrypt(String plaintext) {
    final key = _deriveKey();
    final random = Random.secure();
    final ivBytes = List<int>.generate(12, (_) => random.nextInt(256));
    final ivHex = ivBytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();

    final plainBytes = utf8.encode(plaintext);
    final cipherBytes = _applyKeystream(plainBytes, key, ivBytes);
    final cipherBase64 = base64Encode(cipherBytes);

    // Calcul du MAC (HMAC-SHA256) sur IV + Texte chiffré pour garantir l'intégrité
    final hmac = Hmac(sha256, key);
    final mac = hmac.convert(utf8.encode("$ivHex:$cipherBase64")).toString();

    return "v2:$ivHex:$mac:$cipherBase64";
  }

  String? _decryptWithKey(String envelope, List<int> key, {bool silent = false}) {
    if (!envelope.startsWith("v2:")) return null;
    final parts = envelope.split(':');
    if (parts.length != 4) return null;

    final ivHex = parts[1];
    final mac = parts[2];
    final cipherBase64 = parts[3];

    // Vérification d'intégrité
    final hmac = Hmac(sha256, key);
    final expectedMac = hmac.convert(utf8.encode("$ivHex:$cipherBase64")).toString();
    if (mac != expectedMac) {
      if (!silent) {
        debugPrint("SecureStorage: intégrité compromise ou clé erronée.");
      }
      return null;
    }

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

  String? _decrypt(String envelope) {
    // 1. Tenter avec la clé durcie PBKDF2
    final decrypted = _decryptWithKey(envelope, _deriveKey(), silent: true);
    if (decrypted != null) return decrypted;

    // 2. Repli de compatibilité sur la clé v2 initiale (1 passe) si migration en cours
    final legacyDecrypted = _decryptWithKey(envelope, _deriveLegacyKey(), silent: true);
    if (legacyDecrypted != null) {
      return legacyDecrypted;
    }

    debugPrint("SecureStorage: intégrité compromise ou clé erronée.");
    return null;
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

  String? _readEncrypted(SharedPreferences prefs, String key) {
    final raw = prefs.getString(key);
    if (raw == null || raw.isEmpty) return null;
    final value = _decrypt(raw);
    if (value != null) {
      // Re-chiffrer avec la clé durcie si c'était l'ancienne clé
      final hardenedKey = _deriveKey();
      if (_decryptWithKey(raw, hardenedKey, silent: true) == null) {
        _writeEncrypted(prefs, key, value);
      }
    }
    return value;
  }

  Future<void> _writeEncrypted(SharedPreferences prefs, String key, String value) async {
    final encrypted = _encrypt(value);
    await prefs.setString(key, encrypted);
  }

  Future<void> _migrateLegacyKeys(SharedPreferences prefs) async {
    bool hasMigrated = false;

    // Récupération éventuelle de l'ancien token
    if (_cachedToken == null) {
      final legacyBase64 = prefs.getString(_legacyBase64Token);
      final legacyPlain = prefs.getString(_legacyPlainToken);
      String? oldToken;
      if (legacyBase64 != null && legacyBase64.isNotEmpty) {
        try {
          oldToken = utf8.decode(base64Decode(legacyBase64));
        } catch (_) {
          oldToken = legacyBase64;
        }
      } else if (legacyPlain != null && legacyPlain.isNotEmpty) {
        oldToken = legacyPlain;
      }

      if (oldToken != null && oldToken.isNotEmpty) {
        _cachedToken = oldToken;
        await _writeEncrypted(prefs, _keyToken, oldToken);
        hasMigrated = true;
      }
    }

    // Récupération éventuelle de l'ancien refresh token
    if (_cachedRefreshToken == null) {
      final legacyRefresh = prefs.getString(_legacyBase64Refresh);
      if (legacyRefresh != null && legacyRefresh.isNotEmpty) {
        String? oldRefresh;
        try {
          oldRefresh = utf8.decode(base64Decode(legacyRefresh));
        } catch (_) {
          oldRefresh = legacyRefresh;
        }
        if (oldRefresh.isNotEmpty) {
          _cachedRefreshToken = oldRefresh;
          await _writeEncrypted(prefs, _keyRefreshToken, oldRefresh);
          hasMigrated = true;
        }
      }
    }

    // Nettoyage définitif des clés non sécurisées
    if (prefs.containsKey(_keyDeviceId)) {
      await prefs.remove(_legacyDeviceId);
    }
    if (hasMigrated || prefs.containsKey(_legacyBase64Token) || prefs.containsKey(_legacyPlainToken)) {
      await prefs.remove(_legacyBase64Token);
      await prefs.remove(_legacyBase64Refresh);
      await prefs.remove(_legacyPlainToken);
    }
  }
}
