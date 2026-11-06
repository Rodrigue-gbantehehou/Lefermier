import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

/// Exception levée lorsqu'une opération critique sur le coffre-fort matériel échoue
class SecureStoragePersistenceException implements Exception {
  final String message;
  final bool rollbackFailed;

  const SecureStoragePersistenceException(
    this.message, {
    this.rollbackFailed = false,
  });

  @override
  String toString() => message;
}

/// Service de coffre-fort sécurisé pour les jetons de session (JWT, Refresh Token)
/// et l'identifiant immuable du terminal (deviceId).
///
/// Utilise le stockage sécurisé natif du système d'exploitation via [FlutterSecureStorage] :
/// - Android : Android Keystore (protection matérielle TEE/StrongBox lorsque l'appareil le supporte,
///   chiffrement AES-GCM 256 bits avec réinitialisation automatique en cas d'invalidation de clé).
/// - iOS / macOS : Apple Keychain (matériel Secure Enclave si disponible, avec
///   kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly interdisant l'exportation et la synchronisation iCloud).
/// - Windows / Linux : DPAPI (Data Protection API) / Secret Service API.
class SecureStorageService {
  static final SecureStorageService _instance = SecureStorageService._internal();
  factory SecureStorageService() => _instance;
  SecureStorageService._internal();

  static const String _keyToken = "lf_jwt_token";
  static const String _keyRefreshToken = "lf_refresh_token";
  static const String _keyDeviceId = "lf_device_id_raw";
  static const String _keySessionRevoked = "lf_session_revoked_marker";

  @visibleForTesting
  static const String keySessionRevoked = _keySessionRevoked;

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

  /// Écrit une valeur dans le stockage sécurisé.
  /// Confirme immédiatement la persistance par relecture.
  /// En cas d'indisponibilité ou d'échec du plugin, bascule en mémoire et retourne `false`.
  Future<bool> _writeSafe(String key, String value) async {
    try {
      await _storage.write(key: key, value: value);
      final confirmed = await _storage.read(key: key);
      if (confirmed == value) {
        _inMemoryFallback[key] = value;
        return true;
      }
      _inMemoryFallback[key] = value;
      return false;
    } catch (_) {
      _inMemoryFallback[key] = value;
      return false;
    }
  }

  /// Supprime une clé du stockage sécurisé et confirme sa suppression par relecture.
  /// Retourne `true` si la clé a été effectivement effacée.
  Future<bool> _deleteSafe(String key) async {
    _inMemoryFallback.remove(key);
    try {
      await _storage.delete(key: key);
      final remaining = await _storage.read(key: key);
      if (remaining != null && remaining.isNotEmpty) {
        // Tentative d'écrasement neutre si delete() n'a pas pris effet
        await _storage.write(key: key, value: "");
        final afterOverwrite = await _storage.read(key: key);
        if (afterOverwrite != null && afterOverwrite.isNotEmpty) {
          return false;
        }
      }
      return true;
    } catch (_) {
      return false;
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
      final deviceIdSaved = await _writeSafe(_keyDeviceId, storedDeviceId);
      // Sécurité critique : Ne supprimer l'ancienne clé que si l'écriture sécurisée est confirmée !
      if (deviceIdSaved) {
        await prefs.remove(_legacyDeviceId);
        await prefs.remove(_keyDeviceId);
      }
    } else {
      // deviceId est déjà confirmé dans le coffre natif : nettoyer les copies SharedPreferences obsolètes
      await prefs.remove(_legacyDeviceId);
      await prefs.remove(_keyDeviceId);
    }
    _cachedDeviceId = storedDeviceId;

    // 2. Vérifier si une session antérieure a été révoquée (tombstone anti-résurrection)
    final isSessionRevoked = prefs.getBool(_keySessionRevoked) ?? false;
    if (isSessionRevoked) {
      _cachedToken = null;
      _cachedRefreshToken = null;
      // Tentative de rattrapage de purge sur le matériel
      final tokenDeleted = await _deleteSafe(_keyToken);
      final refreshDeleted = await _deleteSafe(_keyRefreshToken);
      if (tokenDeleted && refreshDeleted) {
        await prefs.remove(_keySessionRevoked);
      }
    } else {
      // Lire les jetons depuis le stockage natif sécurisé
      _cachedToken = await _readSafe(_keyToken);
      _cachedRefreshToken = await _readSafe(_keyRefreshToken);

      // 3. Migration transparente et indépendante des jetons depuis les anciens formats
      await _migrateLegacyKeys(prefs);
    }
  }

  String get deviceId => _cachedDeviceId ?? "dev_default";
  String? get token => _cachedToken;
  String? get refreshToken => _cachedRefreshToken;
  bool get hasToken => _cachedToken != null && _cachedToken!.isNotEmpty;

  /// Sauvegarde durablement les jetons dans le stockage natif sécurisé de manière atomique (tout ou rien).
  /// En cas d'échec de la persistance ou de purge du jeton de rafraîchissement, un rollback immédiat
  /// supprime le jeton d'accès pour éviter toute persistance partielle.
  /// Si la suppression de rollback échoue également, lève une [SecureStoragePersistenceException] avec
  /// [rollbackFailed: true] et active le marqueur de révocation de session pour empêcher la résurrection du secret.
  Future<void> saveTokens({required String token, String? refreshToken}) async {
    final tokenSaved = await _writeSafe(_keyToken, token);
    if (!tokenSaved) {
      _cachedToken = null;
      throw const SecureStoragePersistenceException(
        "Échec de l'enregistrement sécurisé du jeton d'accès sur le terminal.",
      );
    }

    if (refreshToken != null && refreshToken.isNotEmpty) {
      final refreshSaved = await _writeSafe(_keyRefreshToken, refreshToken);
      if (!refreshSaved) {
        // Rollback atomique : suppression du jeton d'accès précédemment écrit
        final rollbackTokenDeleted = await _deleteSafe(_keyToken);
        _cachedToken = null;
        _cachedRefreshToken = null;
        if (!rollbackTokenDeleted) {
          final prefs = await SharedPreferences.getInstance();
          await prefs.setBool(_keySessionRevoked, true);
          throw const SecureStoragePersistenceException(
            "Échec de l'enregistrement du refresh token et échec critique du rollback du jeton d'accès sur le terminal. Attention : un secret partiel subsiste dans le stockage natif.",
            rollbackFailed: true,
          );
        }
        throw const SecureStoragePersistenceException(
          "Échec de l'enregistrement sécurisé du jeton de rafraîchissement sur le terminal. Écriture annulée.",
        );
      }
      _cachedToken = token;
      _cachedRefreshToken = refreshToken;
    } else {
      final refreshDeleted = await _deleteSafe(_keyRefreshToken);
      if (!refreshDeleted) {
        // Rollback atomique : si l'ancien refresh token ne peut pas être purgé, annuler l'écriture du token
        final rollbackTokenDeleted = await _deleteSafe(_keyToken);
        _cachedToken = null;
        _cachedRefreshToken = null;
        if (!rollbackTokenDeleted) {
          final prefs = await SharedPreferences.getInstance();
          await prefs.setBool(_keySessionRevoked, true);
          throw const SecureStoragePersistenceException(
            "Échec de la purge de l'ancien jeton de rafraîchissement et échec critique du rollback du jeton d'accès sur le terminal. Attention : un secret partiel subsiste dans le stockage natif.",
            rollbackFailed: true,
          );
        }
        throw const SecureStoragePersistenceException(
          "Échec de la purge de l'ancien jeton de rafraîchissement sur le terminal. Écriture annulée.",
        );
      }
      _cachedToken = token;
      _cachedRefreshToken = null;
    }

    // Réinitialiser tout marqueur de révocation de session suite à une sauvegarde réussie
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keySessionRevoked);
  }

  /// Met à jour le jeton d'accès dans le stockage natif sécurisé.
  /// Lève une [SecureStoragePersistenceException] si la persistance n'est pas confirmée.
  Future<void> updateToken(String token) async {
    final tokenSaved = await _writeSafe(_keyToken, token);
    if (!tokenSaved) {
      throw const SecureStoragePersistenceException(
        "Échec de la mise à jour sécurisée du jeton sur le terminal.",
      );
    }
    _cachedToken = token;
  }

  /// Efface les jetons de session. Le deviceId est préservé car il identifie le terminal matériel.
  /// Vérifie et confirme la suppression réelle des secrets dans le stockage natif.
  /// En cas d'échec de suppression matérielle, active un marqueur de session révoquée (tombstone)
  /// dans SharedPreferences afin d'interdire toute réhydratation lors des prochains lancements.
  /// Retourne `true` si le nettoyage sécurisé est confirmé, `false` sinon.
  /// Lève une [SecureStoragePersistenceException] si [throwOnFailure] est activé et que la suppression échoue.
  Future<bool> clearAuth({bool throwOnFailure = false}) async {
    _cachedToken = null;
    _cachedRefreshToken = null;

    final tokenDeleted = await _deleteSafe(_keyToken);
    final refreshDeleted = await _deleteSafe(_keyRefreshToken);

    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_legacyEncToken);
    await prefs.remove(_legacyEncRefreshToken);
    await prefs.remove(_legacyBase64Token);
    await prefs.remove(_legacyBase64Refresh);
    await prefs.remove(_legacyPlainToken);

    final success = tokenDeleted && refreshDeleted;
    if (success) {
      await prefs.remove(_keySessionRevoked);
    } else {
      await prefs.setBool(_keySessionRevoked, true);
    }

    if (!success && throwOnFailure) {
      throw const SecureStoragePersistenceException(
        "Échec de la purge sécurisée des jetons sur le stockage natif.",
      );
    }
    return success;
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
        final tokenMigrated = await _writeSafe(_keyToken, oldToken);
        if (tokenMigrated) {
          await prefs.remove(_legacyEncToken);
          await prefs.remove(_legacyBase64Token);
          await prefs.remove(_legacyPlainToken);
        }
      }
    } else {
      // Le jeton JWT est déjà présent et confirmé dans le coffre natif :
      // Purger immédiatement les anciennes copies résiduelles dans SharedPreferences
      await prefs.remove(_legacyEncToken);
      await prefs.remove(_legacyBase64Token);
      await prefs.remove(_legacyPlainToken);
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
        final refreshMigrated = await _writeSafe(_keyRefreshToken, oldRefresh);
        if (refreshMigrated) {
          await prefs.remove(_legacyEncRefreshToken);
          await prefs.remove(_legacyBase64Refresh);
        }
      }
    } else {
      // Le refresh token est déjà présent et confirmé dans le coffre natif :
      // Purger immédiatement les anciennes copies résiduelles dans SharedPreferences
      await prefs.remove(_legacyEncRefreshToken);
      await prefs.remove(_legacyBase64Refresh);
    }

    // 3. Purge du sel d'entropie uniquement si toutes les clés chiffrées héritées ont été migrées
    if (!prefs.containsKey(_legacyEncToken) && !prefs.containsKey(_legacyEncRefreshToken)) {
      await prefs.remove(_legacyEntropySeed);
    }
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
