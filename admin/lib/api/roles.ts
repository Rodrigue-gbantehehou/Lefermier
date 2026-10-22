import { apiRequest } from "./client";
import {
  AdminRoleItem,
  CreateAdminRolePayload,
  UpdateAdminRolePayload,
  PermissionMeta,
} from "../types";

export interface PermissionsResponse {
  permissions: Record<string, PermissionMeta>;
  total: number;
}

export const rolesApi = {
  /**
   * Récupère le catalogue des permissions disponibles pour la console admin.
   */
  async getPermissions(): Promise<PermissionsResponse> {
    const res = await apiRequest<{ status: string; data: PermissionsResponse }>(
      "/api/admin/roles/permissions"
    );
    return res.data;
  },

  /**
   * Liste tous les rôles configurés pour l'administration plateforme.
   */
  async list(): Promise<AdminRoleItem[]> {
    const res = await apiRequest<{ status: string; data: AdminRoleItem[] }>("/api/admin/roles");
    return res.data;
  },

  /**
   * Crée un nouveau rôle collaborateur avec permissions granulaires.
   */
  async create(payload: CreateAdminRolePayload): Promise<AdminRoleItem> {
    const res = await apiRequest<{ status: string; data: AdminRoleItem }>("/api/admin/roles", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  /**
   * Met à jour les libellés ou les permissions d'un rôle existant.
   */
  async update(id: string, payload: UpdateAdminRolePayload): Promise<AdminRoleItem> {
    const res = await apiRequest<{ status: string; data: AdminRoleItem }>(`/api/admin/roles/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  /**
   * Supprime un rôle personnalisé non-système.
   */
  async delete(id: string): Promise<void> {
    await apiRequest(`/api/admin/roles/${id}`, {
      method: "DELETE",
    });
  },

  /**
   * Assigne ou révoque le rôle plateforme d'un utilisateur.
   */
  async assignUserRole(userId: string, roleId: string | null): Promise<void> {
    await apiRequest(`/api/admin/users/${userId}/role`, {
      method: "PUT",
      body: JSON.stringify({ roleId }),
    });
  },
};
