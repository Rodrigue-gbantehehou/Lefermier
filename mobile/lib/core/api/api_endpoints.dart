/// Chemins relatifs des contrats d'API Symfony du projet Le Fermier.
/// Conforme à la documentation docs/ARCHITECTURE.md et aux routes Symfony existantes.
class ApiEndpoints {
  // Authentification & Session
  static const String login = "/api/auth/login";
  static const String deviceSession = "/api/auth/device-session";
  static const String register = "/api/auth/register";
  static const String deviceRegister = "/api/auth/device/register";
  static const String deviceRefresh = "/api/auth/refresh";
  static const String deviceLogout = "/api/auth/device-logout";
  static const String me = "/api/auth/me";
  static const String changePassword = "/api/auth/change-password";

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
  static String farmInventory(String farmId) => "/api/farms/$farmId/inventory";
  static String farmInventoryMovements(String farmId) => "/api/farms/$farmId/inventory/movements";
  static String inventoryMovements(String itemId) => "/api/inventory/$itemId/movements";
  static String farmHealth(String farmId) => "/api/farms/$farmId/health-treatments";
  static String completeHealthTreatment(String treatmentId) => "/api/health-treatments/$treatmentId/complete";
  static String farmBuildings(String farmId) => "/api/farms/$farmId/buildings";
  static String farmBuilding(String farmId, String buildingId) => "/api/farms/$farmId/buildings/$buildingId";
  static String farmMembers(String farmId) => "/api/farms/$farmId/members";
  static String farmMember(String farmId, String memberId) => "/api/farms/$farmId/members/$memberId";

  // Synchronisation Hors-ligne
  static const String syncPull = "/api/sync/pull";
  static String farmSyncPull(String farmId) => "/api/farms/$farmId/sync/pull";

  static String farmDetails(String farmId) => "/api/farms/$farmId";
  static String farmContacts(String farmId) => "/api/farms/$farmId/contacts";
  static String contactDetails(String contactId) => "/api/contacts/$contactId";
  static String transactionReceiptPdf(String transactionId) => "/api/transactions/$transactionId/receipt/pdf";
  static String flockReportPdf(String flockId) => "/api/flocks/$flockId/report/pdf";

  // Abonnements & Formules
  static const String subscriptionPlans = "/api/subscriptions/plans";
  static String farmSubscription(String farmId) => "/api/subscriptions/farm/$farmId";
  static const String subscriptionRequestUpgrade = "/api/subscriptions/request-upgrade";
}
