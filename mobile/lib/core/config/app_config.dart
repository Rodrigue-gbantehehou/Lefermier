import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Configuration centralisée de l'application mobile Le Fermier.
/// Respecte l'architecture du projet :
/// - Aucune URL serveur en dur dans le code source.
/// - Injection possible au build via `--dart-define=API_BASE_URL=https://...`
/// - Sauvegarde dynamique de l'adresse du serveur dans SharedPreferences
class AppConfig {
  static const String _serverUrlKey = "lefermier_api_base_url";

  /// URL injectée via variable d'environnement Flutter (--dart-define=API_BASE_URL=...)
  static const String envApiUrl = String.fromEnvironment('API_BASE_URL');

  /// Récupère l'URL de base résolue :
  /// 1. Priorité à la configuration personnalisée stockée par l'utilisateur / exploitant
  /// 2. Sinon variable d'environnement de build (--dart-define)
  /// 3. Sinon résolution dynamique selon la plateforme d'exécution
  static Future<String> resolveApiBaseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    final customUrl = prefs.getString(_serverUrlKey);
    if (customUrl != null && customUrl.trim().isNotEmpty) {
      return customUrl.trim();
    }

    if (envApiUrl.isNotEmpty) {
      return envApiUrl;
    }

    // Détection dynamique selon la plateforme d'exécution en mode développement
    if (kIsWeb) {
      // Sur navigateur Web : même hôte ou port 8000
      return "http://localhost:8000";
    }

    // Sur émulateur Android (boucle locale spéciale 10.0.2.2)
    return "http://10.0.2.2:8000";
  }

  /// Sauvegarde une URL personnalisée (ex: IP locale de la ferme en Wi-Fi)
  static Future<void> setCustomApiBaseUrl(String? url) async {
    final prefs = await SharedPreferences.getInstance();
    if (url != null && url.trim().isNotEmpty) {
      await prefs.setString(_serverUrlKey, url.trim());
    } else {
      await prefs.remove(_serverUrlKey);
    }
  }
}
