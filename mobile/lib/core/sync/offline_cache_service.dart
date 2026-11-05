import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

/// Service de persistance et de cache de lecture hors-ligne (Offline-First).
/// Permet de stocker et restituer instantanément les données en local
/// sans dépendance au réseau, organisées par exploitation (farmId).
class OfflineCacheService {
  static final OfflineCacheService _instance = OfflineCacheService._internal();
  factory OfflineCacheService() => _instance;
  OfflineCacheService._internal();

  static const String _prefix = "offline_cache_v2_";
  static const String _legacyPrefix = "offline_cache_";
  static const int _schemaVersion = 2;

  String _buildKey(String? farmId, String category, {bool legacy = false}) {
    final p = legacy ? _legacyPrefix : _prefix;
    if (farmId == null || farmId.isEmpty) {
      return "$p$category";
    }
    return "$p${farmId}_$category";
  }

  /// Sauvegarde des données JSON dans le cache local avec métadonnées d'enveloppe
  Future<void> setCache({
    required String? farmId,
    required String category,
    required dynamic data,
    String? userId,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final key = _buildKey(farmId, category);
      final envelope = {
        'v': _schemaVersion,
        'savedAt': DateTime.now().toIso8601String(),
        'userId': userId,
        'data': data,
      };
      final encoded = jsonEncode(envelope);
      await prefs.setString(key, encoded);
    } catch (_) {}
  }

  /// Récupère des données sous forme de Map depuis le cache local
  Future<Map<String, dynamic>?> getMapCache({
    required String? farmId,
    required String category,
    String? currentUserId,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_buildKey(farmId, category)) ??
          prefs.getString(_buildKey(farmId, category, legacy: true));

      if (raw == null || raw.isEmpty) return null;
      final decoded = jsonDecode(raw);

      // Enveloppe v2
      if (decoded is Map<String, dynamic> && decoded.containsKey('v') && decoded.containsKey('data')) {
        if (decoded['v'] != _schemaVersion) return null;
        if (currentUserId != null && decoded['userId'] != null && decoded['userId'] != currentUserId) {
          return null; // Isolation inter-comptes
        }
        final inner = decoded['data'];
        if (inner is Map<String, dynamic>) return inner;
        return null;
      }

      // Format historique
      if (decoded is Map<String, dynamic>) {
        return decoded;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Récupère des données sous forme de List depuis le cache local
  Future<List<dynamic>?> getListCache({
    required String? farmId,
    required String category,
    String? currentUserId,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_buildKey(farmId, category)) ??
          prefs.getString(_buildKey(farmId, category, legacy: true));

      if (raw == null || raw.isEmpty) return null;
      final decoded = jsonDecode(raw);

      // Enveloppe v2
      if (decoded is Map<String, dynamic> && decoded.containsKey('v') && decoded.containsKey('data')) {
        if (decoded['v'] != _schemaVersion) return null;
        if (currentUserId != null && decoded['userId'] != null && decoded['userId'] != currentUserId) {
          return null;
        }
        final inner = decoded['data'];
        if (inner is List) return inner;
        return null;
      }

      // Format historique
      if (decoded is List) {
        return decoded;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Retourne la date de mise en cache pour afficher la fraîcheur des données
  Future<DateTime?> getCacheAge({
    required String? farmId,
    required String category,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_buildKey(farmId, category));
      if (raw == null) return null;
      final decoded = jsonDecode(raw);
      if (decoded is Map<String, dynamic> && decoded['savedAt'] != null) {
        return DateTime.tryParse(decoded['savedAt'] as String);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Purge le cache d'une exploitation
  Future<void> clearFarmCache(String farmId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final farmPrefixV2 = "$_prefix${farmId}_";
      final farmPrefixLegacy = "$_legacyPrefix${farmId}_";
      final keysToRemove = prefs.getKeys().where(
        (k) => k.startsWith(farmPrefixV2) || k.startsWith(farmPrefixLegacy),
      ).toList();
      for (final k in keysToRemove) {
        await prefs.remove(k);
      }
    } catch (_) {}
  }

  /// Purge l'ensemble du cache hors-ligne
  Future<void> clearAllCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final keysToRemove = prefs.getKeys().where(
        (k) => k.startsWith(_prefix) || k.startsWith(_legacyPrefix),
      ).toList();
      for (final k in keysToRemove) {
        await prefs.remove(k);
      }
    } catch (_) {}
  }
}
