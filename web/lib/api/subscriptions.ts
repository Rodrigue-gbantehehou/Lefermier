import { apiRequest } from "./client";

export interface PublicPlan {
  id: string;
  sku: string;
  name: string;
  tier: string;
  badge?: string | null;
  description?: string | null;
  priceMonthly: number;
  priceAnnually: number;
  currency: string;
  status: string;
  isAvailable: boolean;
  isVisibilityPublic: boolean;
  trialDays: number;
  allowedBillingCycles: string[];
  modules: string[];
  quotas: {
    maxFarms: number;
    maxFlocks: number;
    maxMembers: number;
    maxBuildings: number;
    retentionMonths: number;
  };
  features: string[];
  flags: {
    accountingExports: boolean;
    healthAlerts: boolean;
    iotSensors: boolean;
    apiAccess: boolean;
    prioritySupport: boolean;
  };
  isPopular: boolean;
  isRecommended: boolean;
  subscribersCount: number;
}

export interface UpgradeRequestPayload {
  farmId: string;
  targetPlan: string;
  message?: string;
}

export interface UpgradeRequestResult {
  farmId: string;
  farmName: string;
  currentPlan: string;
  requestedPlan: string;
  requestedPlanName: string;
  userEmail: string | null;
  message: string;
}

export interface PlansResponse {
  /** Offres publiques : visibles dans le catalogue tarifaire. */
  publicPlans: PublicPlan[];
  /** Offres privées / sur devis : affichées avec un CTA "Contacter" (isVisibilityPublic = false). */
  privatePlans: PublicPlan[];
}

export const subscriptionsApi = {
  /**
   * Catalogue complet des offres : publiques (catalogue) + privées (sur devis).
   */
  async getPlans(): Promise<PlansResponse> {
    const raw = await apiRequest<any>("/subscriptions/plans");

    // Cas 1 : payload objet { publicPlans: [...] }
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      if (Array.isArray(raw.publicPlans)) {
        return {
          publicPlans: (raw.publicPlans as PublicPlan[]).filter(
            (p) => p.isVisibilityPublic !== false
          ),
          privatePlans: [],
        };
      }
      // Cas 2 : payload non déballé { data: [...] }
      if (Array.isArray(raw.data)) {
        const publicPlans = (raw.data as PublicPlan[]).filter(
          (p) => p.isVisibilityPublic !== false
        );
        return { publicPlans, privatePlans: [] };
      }
    }

    // Cas 3 : tableau direct de plans (si apiRequest a déballé body.data qui était un tableau)
    if (Array.isArray(raw)) {
      const publicPlans = (raw as PublicPlan[]).filter(
        (p) => p.isVisibilityPublic !== false
      );
      return { publicPlans, privatePlans: [] };
    }

    return { publicPlans: [], privatePlans: [] };
  },

  /**
   * @deprecated Utiliser getPlans() — retourne uniquement les plans publics pour rétrocompatibilité.
   */
  async getPublicPlans(): Promise<PublicPlan[]> {
    const { publicPlans } = await subscriptionsApi.getPlans();
    return publicPlans;
  },

  /**
   * Soumet une demande de changement d'offre par le propriétaire de la ferme.
   */
  async requestUpgrade(
    payload: UpgradeRequestPayload
  ): Promise<{ message: string; data: UpgradeRequestResult }> {
    return await apiRequest<{ message: string; data: UpgradeRequestResult }>(
      "/subscriptions/request-upgrade",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  },
};
