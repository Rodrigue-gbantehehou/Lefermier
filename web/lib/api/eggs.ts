import { apiRequest } from "./client";
import { flocksApi } from "./flocks";
import { dashboardApi } from "./dashboard";
import { EggProduction } from "../types";

export const eggsApi = {
  list: async (params?: { farmId?: string; flockId?: string }) => {
    if (!params?.flockId && params?.farmId) {
      // Fetch active layer flocks first
      const flocks = await flocksApi.list({ farmId: params.farmId, status: "ACTIVE" });
      const layerFlocks = flocks.filter((f) => f.type === "LAYER" || f.type === "MIXED");
      const allProds: EggProduction[] = [];
      for (const lf of layerFlocks) {
        try {
          const list = await apiRequest<any[]>(`/flocks/${lf.id}/egg-productions`);
          if (Array.isArray(list)) {
            allProds.push(
              ...list.map((p) => ({
                id: p.id,
                flockId: lf.id,
                flockName: lf.name,
                date: p.productionDate || p.date,
                session: p.session === "AFTERNOON" ? "NOON" : p.session,
                goodEggs: p.goodEggs || 0,
                brokenEggs: p.crackedEggs !== undefined ? p.crackedEggs : (p.brokenEggs || 0),
                abnormalEggs: (p.dirtyEggs || 0) + (p.deformedEggs || 0) + (p.abnormalEggs || 0),
                totalEggs: p.totalEggs || 0,
                traysCount: p.traysCount || Math.floor((p.goodEggs || 0) / 30),
                looseEggs: p.looseEggsCount !== undefined ? p.looseEggsCount : ((p.goodEggs || 0) % 30),
                notes: p.notes,
                createdAt: p.createdAt,
              }))
            );
          }
        } catch {
          // continue
        }
      }
      return allProds;
    }
    if (!params?.flockId) return [];
    const list = await apiRequest<any[]>(`/flocks/${params.flockId}/egg-productions`);
    return (list || []).map((p) => ({
      id: p.id,
      flockId: params.flockId!,
      date: p.productionDate || p.date,
      session: p.session === "AFTERNOON" ? "NOON" : p.session,
      goodEggs: p.goodEggs || 0,
      brokenEggs: p.crackedEggs !== undefined ? p.crackedEggs : (p.brokenEggs || 0),
      abnormalEggs: (p.dirtyEggs || 0) + (p.deformedEggs || 0) + (p.abnormalEggs || 0),
      totalEggs: p.totalEggs || 0,
      traysCount: p.traysCount || Math.floor((p.goodEggs || 0) / 30),
      looseEggs: p.looseEggsCount !== undefined ? p.looseEggsCount : ((p.goodEggs || 0) % 30),
      notes: p.notes,
      createdAt: p.createdAt,
    }));
  },

  create: async (data: any) => {
    let session = data.session || "ALL_DAY";
    if (session === "NOON") session = "AFTERNOON";

    const payload = {
      productionDate: data.productionDate || data.date || new Date().toISOString().split("T")[0],
      session,
      goodEggs: Number(data.goodEggs || 0),
      crackedEggs: Number(data.crackedEggs !== undefined ? data.crackedEggs : (data.brokenEggs || 0)),
      dirtyEggs: Number(data.dirtyEggs || 0),
      deformedEggs: Number(data.deformedEggs !== undefined ? data.deformedEggs : (data.abnormalEggs || 0)),
      notes: data.notes || undefined,
      allowUpdate: data.allowUpdate !== undefined ? !!data.allowUpdate : true,
    };

    return apiRequest<EggProduction>(`/flocks/${data.flockId}/egg-productions`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update: async (id: string, data: any) => {
    const payload = {
      goodEggs: Number(data.goodEggs || 0),
      crackedEggs: Number(data.crackedEggs !== undefined ? data.crackedEggs : (data.brokenEggs || 0)),
      dirtyEggs: Number(data.dirtyEggs || 0),
      deformedEggs: Number(data.deformedEggs !== undefined ? data.deformedEggs : (data.abnormalEggs || 0)),
      notes: data.notes || undefined,
    };
    return apiRequest<EggProduction>(`/egg-productions/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  delete: async (id: string) => {
    return apiRequest<void>(`/egg-productions/${id}`, {
      method: "DELETE",
    });
  },

  getSummary: async (farmId?: string) => {
    const kpi = await dashboardApi.getKpi(farmId);
    return {
      totalEggsToday: kpi.eggProductionToday.totalEggs,
      traysCountToday: kpi.eggProductionToday.traysCount,
      layingRate: kpi.eggProductionToday.layingRatePercent,
    };
  },
};
