import { apiRequest } from "./client";
import {
  CommercialPlan,
  CreatePlanPayload,
  FinancialMetrics,
  OfferStatus,
  PlatformModuleGroup,
  SubscriptionItem,
  SubscriptionUpgradeRequestItem,
  UpdatePlanPayload,
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
   * Récupère la liste des modules applicatifs réels du backend groupés par catégorie.
   */
  async getModules(): Promise<PlatformModuleGroup[]> {
    const res = await apiRequest<{ status: string; data: PlatformModuleGroup[] }>(
      "/api/admin/subscriptions/modules"
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
  async createPlan(payload: CreatePlanPayload): Promise<CommercialPlan> {
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
  async updatePlan(idOrSku: string, payload: UpdatePlanPayload): Promise<CommercialPlan> {
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
   * Duplique une offre existante en mode brouillon pour en faire une variante.
   */
  async duplicatePlan(idOrSku: string): Promise<CommercialPlan> {
    const res = await apiRequest<{ status: string; data: CommercialPlan }>(
      `/api/admin/subscriptions/plans/${idOrSku}/duplicate`,
      {
        method: "POST",
      }
    );
    return res.data;
  },

  /**
   * Modifie rapidement le statut de publication d'une offre (DRAFT, PUBLISHED, ARCHIVED).
   */
  async updatePlanStatus(idOrSku: string, status: OfferStatus): Promise<CommercialPlan> {
    const res = await apiRequest<{ status: string; data: CommercialPlan }>(
      `/api/admin/subscriptions/plans/${idOrSku}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }
    );
    return res.data;
  },

  /**
   * Supprime une formule commerciale personnalisée (uniquement si 0 abonné).
   */
  async deletePlan(idOrSku: string): Promise<void> {
    await apiRequest<{ status: string; message: string }>(
      `/api/admin/subscriptions/plans/${idOrSku}`,
      {
        method: "DELETE",
      }
    );
  },

  /**
   * Récupère la liste des demandes de changement de formule formulées par les éleveurs.
   */
  async getUpgradeRequests(status?: string): Promise<{
    data: SubscriptionUpgradeRequestItem[];
    pendingCount: number;
    total: number;
  }> {
    const qs = status ? `?status=${status}` : "";
    return await apiRequest(`/api/admin/subscriptions/upgrade-requests${qs}`);
  },

  /**
   * Valide en 1 clic une demande d'abonnement (met à jour la formule de l'organisation).
   */
  async approveUpgradeRequest(
    id: string,
    adminNotes?: string
  ): Promise<{ status: string; message: string; data: SubscriptionUpgradeRequestItem }> {
    return await apiRequest(`/api/admin/subscriptions/upgrade-requests/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ adminNotes }),
    });
  },

  /**
   * Refuse une demande d'abonnement avec un motif.
   */
  async rejectUpgradeRequest(
    id: string,
    adminNotes: string
  ): Promise<{ status: string; message: string; data: SubscriptionUpgradeRequestItem }> {
    return await apiRequest(`/api/admin/subscriptions/upgrade-requests/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ adminNotes }),
    });
  },
};

