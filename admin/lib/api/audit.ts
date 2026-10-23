import { apiRequest } from "./client";
import { AuditLogItem } from "../types";

export interface AuditListParams {
  page?: number;
  limit?: number;
  action?: string;
  search?: string;
}

export interface AuditListResponse {
  status: string;
  data: AuditLogItem[];
  total: number;
  page: number;
  limit: number;
}

export const auditApi = {
  /**
   * Récupère la liste paginée des logs d'audit sensibles
   */
  list: async (params?: AuditListParams): Promise<AuditListResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.action) query.set("action", params.action);
    if (params?.search) query.set("search", params.search);

    const qs = query.toString();
    return apiRequest<AuditListResponse>(
      `/api/admin/audit-logs${qs ? `?${qs}` : ""}`
    );
  },
};
