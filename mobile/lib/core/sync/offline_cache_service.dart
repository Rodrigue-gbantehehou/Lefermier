import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

/// Service de persistance et de cache de lecture hors-ligne (Offline-First).
/// Permet de stocker et restituer instantanément les données en local
/// sans dépendance au réseau, organisées par exploitation (farmId).
class OfflineCacheService {
  static final OfflineCacheService _instance = OfflineCacheService._internal();
  factory OfflineCacheService() => _instance;
  OfflineCacheService._internal();

  static const String _prefix = "offline_cache_";

  String _buildKey(String? farmId, String category) {
    if (farmId == null || farmId.isEmpty) {
      return "$_prefix$category";
    }
    return "$_prefix${farmId}_$category";
  }

  /// Sauvegarde des données JSON dans le cache local
  Future<void> setCache({
    required String? farmId,
    required String category,
    required dynamic data,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final key = _buildKey(farmId, category);
      final encoded = jsonEncode(data);
      await prefs.setString(key, encoded);
    } catch (_) {}
  }

  /// Récupère des données sous forme de Map depuis le cache local
  Future<Map<String, dynamic>?> getMapCache({
    required String? farmId,
    required String category,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final key = _buildKey(farmId, category);
      final raw = prefs.getString(key);
      if (raw == null || raw.isEmpty) return null;
      final decoded = jsonDecode(raw);
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
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final key = _buildKey(farmId, category);
      final raw = prefs.getString(key);
      if (raw == null || raw.isEmpty) return null;
      final decoded = jsonDecode(raw);
      if (decoded is List) {
        return decoded;
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
      final farmPrefix = "$_prefix${farmId}_";
      final keysToRemove = prefs.getKeys().where((k) => k.startsWith(farmPrefix)).toList();
      for (final k in keysToRemove) {
        await prefs.remove(k);
      }
    } catch (_) {}
  }

  /// Purge l'ensemble du cache hors-ligne
  Future<void> clearAllCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final keysToRemove = prefs.getKeys().where((k) => k.startsWith(_prefix)).toList();
      for (final k in keysToRemove) {
        await prefs.remove(k);
      }
    } catch (_) {}
  }
}
