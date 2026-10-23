import { apiRequest } from "./client";
import { UserItem, PaginatedResult } from "../types";

export const usersApi = {
  /**
   * Liste paginée des comptes utilisateurs avec filtres
   */
  list: async (params?: {
    page?: number;
    limit?: number;
    active?: boolean;
    search?: string;
  }): Promise<PaginatedResult<UserItem>> => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.active !== undefined) query.set("active", String(params.active));
    if (params?.search) query.set("search", params.search);

    return apiRequest<PaginatedResult<UserItem>>(
      `/api/admin/users?${query.toString()}`
    );
  },

  /**
   * Détail complet d'un utilisateur
   */
  get: async (id: string): Promise<UserItem> => {
    const res = await apiRequest<{ status: string; data: UserItem }>(
      `/api/admin/users/${id}`
    );
    return res.data;
  },

  /**
   * Activer ou désactiver un compte utilisateur
   */
  setActive: async (id: string, isActive: boolean): Promise<any> => {
    return apiRequest(`/api/admin/users/${id}/active`, {
      method: "PUT",
      body: JSON.stringify({ isActive }),
    });
  },
};
