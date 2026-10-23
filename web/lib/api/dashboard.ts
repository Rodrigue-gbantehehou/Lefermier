import { apiRequest } from "./client";
import { DashboardKPI } from "../types";

export const dashboardApi = {
  getKpi: async (farmId?: string): Promise<DashboardKPI> => {
    if (!farmId) {
      return {
        liveBirdsTotal: 0,
        activeFlocksCount: 0,
        mortalityRateGlobal: 0,
        eggProductionToday: {
          totalEggs: 0,
          traysCount: 0,
          looseEggs: 0,
          layingRatePercent: 0,
        },
        inventoryAlertsCount: 0,
        financialSummary: {
          revenueFcfa: 0,
          expenseFcfa: 0,
          netCashflowFcfa: 0,
        },
      };
    }
    try {
      const raw = await apiRequest<any>(`/farms/${farmId}/dashboard`);
      const liveBirds = Number(raw?.flocks?.totalBirds ?? raw?.activeFlocks?.totalBirds ?? 0);
      const activeCount = Number(raw?.flocks?.activeFlocksCount ?? raw?.activeFlocks?.count ?? 0);
      const mortalityRate = Number(raw?.flocks?.averageMortalityRate ?? raw?.mortality?.ratePercent ?? 0);

      const eggsTotal = Number(raw?.eggProduction?.today?.totalEggs ?? raw?.todayEggs?.total ?? 0);
      const trays = Number(raw?.eggProduction?.today?.traysCount ?? Math.floor(eggsTotal / 30));
      const loose = Number(raw?.eggProduction?.today?.looseEggsCount ?? (eggsTotal % 30));
      const layingRate = Number(raw?.eggProduction?.today?.layingRate ?? raw?.layingRate?.percent ?? 0);

      const lowStock = Number(raw?.inventory?.lowStockCount ?? raw?.inventoryAlerts?.count ?? 0);

      const rev = Number(raw?.finances?.currentMonth?.income ?? raw?.financials?.incomeFcfa ?? 0);
      const exp = Number(raw?.finances?.currentMonth?.expense ?? raw?.financials?.expenseFcfa ?? 0);
      const net =
        raw?.finances?.currentMonth?.netBalance !== undefined
          ? Number(raw.finances.currentMonth.netBalance)
          : rev - exp;

      return {
        liveBirdsTotal: liveBirds,
        activeFlocksCount: activeCount,
        mortalityRateGlobal: mortalityRate,
        eggProductionToday: {
          totalEggs: eggsTotal,
          traysCount: trays,
          looseEggs: loose,
          layingRatePercent: layingRate,
        },
        hasEggAccess: raw?.eggProduction?.hasAccess ?? true,
        inventoryAlertsCount: lowStock,
        hasInventoryAccess: raw?.inventory?.hasAccess ?? true,
        financialSummary: {
          revenueFcfa: rev,
          expenseFcfa: exp,
          netCashflowFcfa: net,
        },
        hasFinanceAccess: raw?.finances?.hasAccess ?? true,
        subscription: raw?.subscription ?? undefined,
        health: raw?.health ?? undefined,
      };
    } catch (err) {
      console.warn("Erreur chargement KPIs dashboard:", err);
      return {
        liveBirdsTotal: 0,
        activeFlocksCount: 0,
        mortalityRateGlobal: 0,
        eggProductionToday: {
          totalEggs: 0,
          traysCount: 0,
          looseEggs: 0,
          layingRatePercent: 0,
        },
        inventoryAlertsCount: 0,
        financialSummary: {
          revenueFcfa: 0,
          expenseFcfa: 0,
          netCashflowFcfa: 0,
        },
      };
    }
  },
};
