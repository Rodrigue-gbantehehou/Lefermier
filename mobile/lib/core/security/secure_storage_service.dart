import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

/// Service de stockage sécurisé des identifiants et jetons sensibles.
/// Fournit une persistance robuste, isolation des clés et génération
/// d'un identifiant terminal (deviceId) unique et immuable par appareil.
class SecureStorageService {
  static final SecureStorageService _instance = SecureStorageService._internal();
  factory SecureStorageService() => _instance;
  SecureStorageService._internal();

  static const String _prefix = "sec_vault_";
  static const String _keyToken = "${_prefix}jwt_token";
  static const String _keyRefreshToken = "${_prefix}refresh_token";
  static const String _keyDeviceId = "${_prefix}device_id";

  String? _cachedToken;
  String? _cachedRefreshToken;
  String? _cachedDeviceId;

  /// Initialise et précharge les clés en mémoire
  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _cachedToken = _readObfuscated(prefs, _keyToken);
    _cachedRefreshToken = _readObfuscated(prefs, _keyRefreshToken);
    _cachedDeviceId = prefs.getString(_keyDeviceId);

    // Si aucun deviceId n'existe encore pour ce terminal, en générer un immuable
    if (_cachedDeviceId == null || _cachedDeviceId!.isEmpty) {
      _cachedDeviceId = "dev_${const Uuid().v4().replaceAll('-', '').substring(0, 20)}";
      await prefs.setString(_keyDeviceId, _cachedDeviceId!);
    }
  }

  String get deviceId => _cachedDeviceId ?? "dev_default";
  String? get token => _cachedToken;
  String? get refreshToken => _cachedRefreshToken;
  bool get hasToken => _cachedToken != null && _cachedToken!.isNotEmpty;

  Future<void> saveTokens({required String token, String? refreshToken}) async {
    _cachedToken = token;
    final prefs = await SharedPreferences.getInstance();
    await _writeObfuscated(prefs, _keyToken, token);

    if (refreshToken != null && refreshToken.isNotEmpty) {
      _cachedRefreshToken = refreshToken;
      await _writeObfuscated(prefs, _keyRefreshToken, refreshToken);
    }
  }

  Future<void> updateToken(String token) async {
    _cachedToken = token;
    final prefs = await SharedPreferences.getInstance();
    await _writeObfuscated(prefs, _keyToken, token);
  }

  Future<void> clearAuth() async {
    _cachedToken = null;
    _cachedRefreshToken = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyToken);
    await prefs.remove(_keyRefreshToken);
  }

  // Obfuscation pour éviter le texte brut dans le stockage local
  String? _readObfuscated(SharedPreferences prefs, String key) {
    final raw = prefs.getString(key);
    if (raw == null) return null;
    try {
      final decoded = utf8.decode(base64Decode(raw));
      return decoded;
    } catch (_) {
      return raw; // Rétro-compatibilité si c'était en clair
    }
  }

  Future<void> _writeObfuscated(SharedPreferences prefs, String key, String value) async {
    final encoded = base64Encode(utf8.encode(value));
    await prefs.setString(key, encoded);
  }
}
