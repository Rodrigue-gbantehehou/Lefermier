import { apiRequest } from "./client";
import { PlatformStats, HealthStatus } from "../types";

export const dashboardApi = {
  /**
    * Statistiques globales de la plateforme (comptes, organisations, fermes, bandes)
    * Fait appel à GET /api/admin/stats sur le backend Symfony.
    */
  getStats: async (): Promise<PlatformStats> => {
    const res = await apiRequest<{ status: string; data: PlatformStats }>("/api/admin/stats");
    return res.data;
  },

  /**
   * État de santé réel des composants plateforme (PHP, Symfony, base de données)
   * Fait appel à GET /api/admin/health sur le backend Symfony.
   */
  getHealth: async (): Promise<HealthStatus> => {
    const res = await apiRequest<{ status: string; data: HealthStatus }>("/api/admin/health");
    return res.data;
  },
};
