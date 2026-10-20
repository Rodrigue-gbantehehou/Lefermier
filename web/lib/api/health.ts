import { apiRequest } from "./client";
import { HealthTreatment } from "../types";

export const healthApi = {
  list: async (
    farmId: string,
    params?: { flockId?: string; status?: string; from?: string; to?: string }
  ): Promise<{ data: HealthTreatment[]; meta: { totalItems: number; overdueCount: number; upcomingCount: number } }> => {
    const q = new URLSearchParams();
    if (params?.flockId) q.append("flockId", params.flockId);
    if (params?.status) q.append("status", params.status);
    if (params?.from) q.append("from", params.from);
    if (params?.to) q.append("to", params.to);
    const queryStr = q.toString() ? `?${q.toString()}` : "";
    const res = await apiRequest<any>(`/farms/${farmId}/health-treatments${queryStr}`);
    return {
      data: Array.isArray(res) ? res : res?.data || [],
      meta: res?.meta || { totalItems: 0, overdueCount: 0, upcomingCount: 0 },
    };
  },

  create: async (
    farmId: string,
    data: {
      flockId: string;
      title: string;
      type?: string;
      administrationMethod?: string;
      scheduledDate: string;
      targetAgeDays?: number;
      inventoryItemId?: string;
      quantityUsed?: string;
      costFcfa?: number;
      veterinarian?: string;
      notes?: string;
    }
  ): Promise<HealthTreatment> => {
    const res = await apiRequest<any>(`/farms/${farmId}/health-treatments`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return res?.data || res;
  },

  generateProgram: async (
    farmId: string,
    data: { flockId: string; programType?: string }
  ): Promise<HealthTreatment[]> => {
    const res = await apiRequest<any>(`/farms/${farmId}/health-treatments/generate-program`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return res?.data || res || [];
  },

  get: async (id: string): Promise<HealthTreatment> => {
    const res = await apiRequest<any>(`/health-treatments/${id}`);
    return res?.data || res;
  },

  update: async (id: string, data: Partial<HealthTreatment>): Promise<HealthTreatment> => {
    const res = await apiRequest<any>(`/health-treatments/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return res?.data || res;
  },

  complete: async (
    id: string,
    data: {
      administeredDate?: string;
      quantityUsed?: string;
      costFcfa?: number;
      veterinarian?: string;
      notes?: string;
      inventoryItemId?: string;
      deductFromStock?: boolean;
    }
  ): Promise<HealthTreatment> => {
    const res = await apiRequest<any>(`/health-treatments/${id}/complete`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return res?.data || res;
  },

  delete: async (id: string): Promise<void> => {
    await apiRequest<void>(`/health-treatments/${id}`, {
      method: "DELETE",
    });
  },
};
