import { authApi } from "./auth";
import { dashboardApi } from "./dashboard";
import { farmsApi } from "./farms";
import { flocksApi } from "./flocks";
import { eggsApi } from "./eggs";
import { inventoryApi } from "./inventory";
import { financeApi } from "./finance";
import { contactsApi } from "./contacts";
import { healthApi } from "./health";
import { rolesApi, developerApi, membersApi } from "./settings";
import { subscriptionsApi } from "./subscriptions";

export * from "./client";
export * from "./auth";
export * from "./dashboard";
export * from "./farms";
export * from "./flocks";
export * from "./eggs";
export * from "./inventory";
export * from "./finance";
export * from "./contacts";
export * from "./health";
export * from "./settings";
export * from "./subscriptions";

export const api = {
  auth: authApi,
  dashboard: dashboardApi,
  farms: farmsApi,
  flocks: flocksApi,
  eggs: eggsApi,
  inventory: inventoryApi,
  finance: financeApi,
  contacts: contactsApi,
  roles: rolesApi,
  developer: developerApi,
  members: membersApi,
  health: healthApi,
  subscriptions: subscriptionsApi,
};

export default api;
