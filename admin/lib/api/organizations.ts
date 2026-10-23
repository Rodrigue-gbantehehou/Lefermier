import { apiRequest } from "./client";
import { OrganizationItem, PaginatedResult } from "../types";

export const organizationsApi = {
  /**
   * Liste paginée des organisations avec filtres
   */
  list: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<PaginatedResult<OrganizationItem>> => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.status) query.set("status", params.status);
    if (params?.search) query.set("search", params.search);

    return apiRequest<PaginatedResult<OrganizationItem>>(
      `/api/admin/organizations?${query.toString()}`
    );
  },

  /**
   * Détail complet d'une organisation avec ses exploitations et collaborateurs
   */
  get: async (id: string): Promise<OrganizationItem> => {
    const res = await apiRequest<{ status: string; data: OrganizationItem }>(
      `/api/admin/organizations/${id}`
    );
    return res.data;
  },

  /**
   * Modifier le statut opérationnel d'une organisation (SUSPENDED / ACTIVE / TRIAL)
   */
  setStatus: async (
    id: string,
    status: "ACTIVE" | "SUSPENDED" | "TRIAL"
  ): Promise<any> => {
    return apiRequest(`/api/admin/organizations/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  },
};
