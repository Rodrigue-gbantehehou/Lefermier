import { dashboardApi } from "./dashboard";
import { organizationsApi } from "./organizations";
import { usersApi } from "./users";
import { authApi } from "./auth";
import { rolesApi } from "./roles";
import { subscriptionsApi } from "./subscriptions";
import { auditApi } from "./audit";

export * from "../types";
export * from "./client";
export * from "./dashboard";
export * from "./organizations";
export * from "./users";
export * from "./auth";
export * from "./roles";
export * from "./subscriptions";
export * from "./audit";

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
  audit: auditApi,

  // Méthodes directes
  getStats: dashboardApi.getStats,
  getHealth: dashboardApi.getHealth,
  getOrganizations: organizationsApi.list,
  getOrganization: organizationsApi.get,
  setOrganizationStatus: organizationsApi.setStatus,
  updateSubscription: (id: string, plan: string) => subscriptionsApi.update(id, { plan }),
  getUsers: usersApi.list,
  getUser: usersApi.get,
  setUserActive: usersApi.setActive,
  getAuditLogs: auditApi.list,
};

export const api = adminApi;
export default adminApi;
