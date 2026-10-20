import { apiRequest } from "./client";
import { farmsApi } from "./farms";
import { DeveloperApiKey, FarmMember, FarmRole, Permission } from "../types";

export const rolesApi = {
  getPermissionsCatalog: async () => {
    const res = await apiRequest<any>("/permissions");
    const raw = res?.permissions || {};
    const list: Permission[] = Array.isArray(raw)
      ? raw
      : Object.entries(raw).map(([key, val]: [string, any]) => ({
          key,
          category: val?.module || "Général",
          label: val?.label || key,
          description: val?.description || "",
        }));
    return {
      permissions: list,
      total: res?.total || list.length,
    };
  },

  listRoles: async (farmId?: string) => {
    if (!farmId) return [];
    const list = await apiRequest<any[]>(`/farms/${farmId}/roles`);
    return Array.isArray(list) ? list : [];
  },

  createRole: async (
    farmId: string,
    data: { name: string; description?: string; permissions: string[] }
  ): Promise<FarmRole> => {
    return apiRequest<FarmRole>(`/farms/${farmId}/roles`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateRole: async (
    farmId: string,
    id: string,
    data: { name?: string; description?: string; permissions?: string[] }
  ): Promise<FarmRole> => {
    return apiRequest<FarmRole>(`/farms/${farmId}/roles/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
};

export const developerApi = {
  listKeys: async (farmId?: string) => {
    if (!farmId) {
      const farmList = await farmsApi.list();
      farmId = farmList[0]?.id;
    }
    if (!farmId) return [];
    const res = await apiRequest<any>(`/farms/${farmId}/api-keys`);
    return Array.isArray(res) ? res : [];
  },

  createKey: async (farmId: string, data: { name: string; environment?: "live" | "test" }) => {
    return apiRequest<DeveloperApiKey>(`/farms/${farmId}/api-keys`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  deleteKey: async (farmId: string, id: string) => {
    return apiRequest<{ message: string }>(`/farms/${farmId}/api-keys/${id}`, {
      method: "DELETE",
    });
  },
};

export const membersApi = {
  list: async (farmId?: string): Promise<FarmMember[]> => {
    if (!farmId) return [];
    const res = await apiRequest<any>(`/farms/${farmId}/members`);
    return Array.isArray(res) ? res : [];
  },

  add: async (
    farmId: string,
    data: {
      email: string;
      firstName: string;
      lastName: string;
      phone?: string;
      role?: string;
      roleId?: string;
      password?: string;
    }
  ): Promise<FarmMember> => {
    return apiRequest<FarmMember>(`/farms/${farmId}/members`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  update: async (
    farmId: string,
    membershipId: string,
    data: {
      role?: string;
      roleId?: string;
      isActive?: boolean;
    }
  ): Promise<FarmMember> => {
    return apiRequest<FarmMember>(`/farms/${farmId}/members/${membershipId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  delete: async (farmId: string, membershipId: string): Promise<{ message: string }> => {
    return apiRequest<{ message: string }>(`/farms/${farmId}/members/${membershipId}`, {
      method: "DELETE",
    });
  },
};
