/// Chemins relatifs des contrats d'API Symfony du projet Le Fermier.
/// Conforme à la documentation docs/ARCHITECTURE.md et aux routes Symfony existantes.
class ApiEndpoints {
  // Authentification & Session
  static const String login = "/api/auth/login";
  static const String register = "/api/auth/register";
  static const String deviceRegister = "/api/auth/device/register";
  static const String deviceRefresh = "/api/auth/device/refresh";
  static const String me = "/api/auth/me";

  // Exploitations (Multi-Tenancy)
  static const String farms = "/api/farms";

  // Opérations Métier Avicoles
  static const String flocks = "/api/flocks";
  static const String eggs = "/api/eggs";
  static const String transactions = "/api/transactions";
  static const String inventory = "/api/inventory";
  static const String health = "/api/health";

  // Helpers paramétrés par ID d'exploitation ou de bande
  static String farmFlocks(String farmId) => "/api/farms/$farmId/flocks";
  static String flockDetails(String flockId) => "/api/flocks/$flockId";
  static String flockMovements(String flockId) => "/api/flocks/$flockId/movements";
  static String farmEggs(String farmId) => "/api/farms/$farmId/egg-productions";
  static String flockEggs(String flockId) => "/api/flocks/$flockId/egg-productions";
  static String farmTransactions(String farmId) => "/api/farms/$farmId/transactions";
  static String farmDashboard(String farmId) => "/api/farms/$farmId/dashboard";

  // Synchronisation Hors-ligne
  static const String syncPull = "/api/sync/pull";
}
