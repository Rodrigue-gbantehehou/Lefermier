import { dashboardApi } from "./dashboard";
import { organizationsApi } from "./organizations";
import { usersApi } from "./users";
import { authApi } from "./auth";
import { rolesApi } from "./roles";
import { subscriptionsApi } from "./subscriptions";

export * from "../types";
export * from "./client";
export * from "./dashboard";
export * from "./organizations";
export * from "./users";
export * from "./auth";
export * from "./roles";
export * from "./subscriptions";

/**
 * Objet unifié adminApi découpé par domaine métier
 */
export const adminApi = {
  auth: authApi,
  dashboard: dashboardApi,
  organizations: organizationsApi,
  users: usersApi,
  roles: rolesApi,
  subscriptions: subscriptionsApi,

  // Méthodes directes pour rétro-compatibilité
  getStats: dashboardApi.getStats,
  getHealth: dashboardApi.getHealth,
  getOrganizations: organizationsApi.list,
  getOrganization: organizationsApi.get,
  setOrganizationStatus: organizationsApi.setStatus,
  updateSubscription: organizationsApi.updateSubscription,
  getUsers: usersApi.list,
  getUser: usersApi.get,
  setUserActive: usersApi.setActive,
  setUserSuperAdmin: usersApi.setSuperAdmin,
};

export const api = adminApi;
export default adminApi;
