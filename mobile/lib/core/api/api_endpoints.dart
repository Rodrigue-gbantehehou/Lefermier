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

  // Synchronisation Hors-ligne
  static const String syncPull = "/api/sync/pull";
}
