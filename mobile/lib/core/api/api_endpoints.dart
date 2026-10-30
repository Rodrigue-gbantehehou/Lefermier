class ApiEndpoints {
  // Configurable base URL (Defaults to 10.0.2.2 for Android emulator, or localhost/LAN IP for real device)
  static const String defaultBaseUrl = "http://10.0.2.2:8000";

  // Authentication
  static const String login = "/api/auth/login";
  static const String register = "/api/auth/register";
  static const String deviceRegister = "/api/auth/device/register";
  static const String deviceRefresh = "/api/auth/device/refresh";
  static const String me = "/api/auth/me";

  // Multi-Tenancy
  static const String farms = "/api/farms";

  // Core Operations
  static const String flocks = "/api/flocks";
  static const String eggs = "/api/eggs";
  static const String transactions = "/api/transactions";
  static const String inventory = "/api/inventory";
  static const String health = "/api/health";

  // Offline Synchronization
  static const String syncPull = "/api/sync/pull";
}
