import { apiRequest } from "./client";
import {
  CommercialPlan,
  FinancialMetrics,
  SubscriptionItem,
} from "../types";

export const subscriptionsApi = {
  /**
   * Récupère le catalogue officiel des formules commerciales (SKUs & Quotas).
   */
  async getPlans(): Promise<CommercialPlan[]> {
    const res = await apiRequest<{ status: string; data: CommercialPlan[] }>(
      "/api/admin/subscriptions/plans"
    );
    return res.data;
  },

  /**
   * Récupère les métriques financières consolidées (MRR, ARR, taux de conversion).
   */
  async getMetrics(): Promise<FinancialMetrics> {
    const res = await apiRequest<{ status: string; data: FinancialMetrics }>(
      "/api/admin/subscriptions/metrics"
    );
    return res.data;
  },

  /**
   * Liste les souscriptions clientes avec leurs compteurs de quotas et statut.
   */
  async list(params?: {
    status?: string;
    plan?: string;
    search?: string;
  }): Promise<{ data: SubscriptionItem[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.plan) query.set("plan", params.plan);
    if (params?.search) query.set("search", params.search);

    const qs = query.toString();
    const res = await apiRequest<{ status: string; data: SubscriptionItem[]; total: number }>(
      `/api/admin/subscriptions${qs ? `?${qs}` : ""}`
    );
    return { data: res.data, total: res.total };
  },

  /**
   * Met à jour le plan ou le statut de souscription d'une organisation.
   */
  async update(
    id: string,
    payload: { plan?: string; status?: string }
  ): Promise<SubscriptionItem> {
    const res = await apiRequest<{ status: string; data: SubscriptionItem }>(
      `/api/admin/subscriptions/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      }
    );
    return res.data;
  },

  /**
   * Crée une nouvelle formule commerciale dans le catalogue plateforme.
   */
  async createPlan(payload: any): Promise<CommercialPlan> {
    const res = await apiRequest<{ status: string; data: CommercialPlan }>(
      "/api/admin/subscriptions/plans",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    return res.data;
  },

  /**
   * Met à jour une formule commerciale existante.
   */
  async updatePlan(idOrSku: string, payload: any): Promise<CommercialPlan> {
    const res = await apiRequest<{ status: string; data: CommercialPlan }>(
      `/api/admin/subscriptions/plans/${idOrSku}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      }
    );
    return res.data;
  },

  /**
   * Supprime une formule commerciale personnalisée.
   */
  async deletePlan(idOrSku: string): Promise<void> {
    await apiRequest<{ status: string; message: string }>(
      `/api/admin/subscriptions/plans/${idOrSku}`,
      {
        method: "DELETE",
      }
    );
  },
};
