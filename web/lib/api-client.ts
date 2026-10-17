import {
  AuthResponse,
  DashboardKPI,
  EggProduction,
  Farm,
  FarmRole,
  Flock,
  FlockMovement,
  InventoryItem,
  StockMovement,
  Permission,
  Transaction,
  User,
  DeveloperApiKey,
  FarmMember,
} from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

/**
 * Universal fetch wrapper with JWT injection & error handling
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  // Inject token if available on client-side
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("lefermier_token");
    if (token && !headers["Authorization"]) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  let body: any;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    let errorMsg = "Une erreur est survenue lors de la communication avec l'API.";
    if (body?.message) {
      errorMsg = body.message;
    } else if (body?.detail) {
      errorMsg = body.detail;
    } else if (body?.error) {
      errorMsg = body.error;
    } else if (response.status === 401) {
      errorMsg = "Session expirée ou identifiants incorrects.";
      if (typeof window !== "undefined") {
        localStorage.removeItem("lefermier_token");
      }
    } else if (response.status === 403) {
      errorMsg = "Action non autorisée avec vos permissions actuelles.";
    }

    throw new ApiError(errorMsg, response.status, body);
  }

  // If backend wraps payload in {"data": ...}, extract it, while keeping root if needed
  if (body && typeof body === "object" && "data" in body) {
    return body.data as T;
  }

  return body as T;
}

/**
 * Specific typed API helpers conforming directly to Symfony API routes
 */
export const api = {
  // Authentication
  auth: {
    login: (credentials: { email: string; password: string }) =>
      apiRequest<{ token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      }),
    register: (userData: {
      email: string;
      password: string;
      fullName: string;
      phone?: string;
      farmName?: string;
    }) => {
      const parts = userData.fullName.trim().split(" ");
      const firstName = parts[0] || "Éleveur";
      const lastName = parts.slice(1).join(" ") || "Aviculteur";
      return apiRequest<{ token: string; user: User; farm?: Farm | null }>(
        "/auth/register",
        {
          method: "POST",
          body: JSON.stringify({
            email: userData.email,
            password: userData.password,
            firstName,
            lastName,
            phone: userData.phone || undefined,
            farmName: userData.farmName || undefined,
          }),
        }
      );
    },
    me: () =>
      apiRequest<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        fullName: string;
        roles: string[];
        farms: any[];
      }>("/auth/me"),
  },

  // Dashboard
  dashboard: {
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
        // Map raw dashboard data to KPI structure accurately matching Symfony backend response
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
        const net = raw?.finances?.currentMonth?.netBalance !== undefined
          ? Number(raw.finances.currentMonth.netBalance)
          : (rev - exp);

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
          inventoryAlertsCount: lowStock,
          financialSummary: {
            revenueFcfa: rev,
            expenseFcfa: exp,
            netCashflowFcfa: net,
          },
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
  },

  // Farms
  farms: {
    list: async (): Promise<Farm[]> => {
      const me = await api.auth.me();
      return (me.farms || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        location: f.locationCity,
        surfaceAreaM2: f.surfaceAreaM2,
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        userRole: f.role,
      }));
    },
    create: async (data: {
      name: string;
      productionType?: "LAYER" | "BROILER" | "MIXED";
      locationCity?: string;
      locationCountry?: string;
      code?: string;
    }): Promise<any> => {
      const res = await apiRequest<any>("/farms", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return res?.data || res;
    },
    get: async (id: string): Promise<any> => {
      const res = await apiRequest<any>(`/farms/${id}`);
      return res?.data || res;
    },
    update: async (
      id: string,
      data: {
        name: string;
        productionType?: "LAYER" | "BROILER" | "MIXED";
        locationCity?: string;
        locationCountry?: string;
        code?: string;
      }
    ): Promise<any> => {
      const res = await apiRequest<any>(`/farms/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      return res?.data || res;
    },
    listBuildings: async (farmId: string): Promise<any[]> => {
      const res = await apiRequest<any>(`/farms/${farmId}/buildings`);
      return res?.data || res || [];
    },
    createBuilding: async (
      farmId: string,
      data: {
        name: string;
        type: "POULTRY_HOUSE" | "BROODER" | "STORAGE" | "OTHER";
        capacity: number;
        surfaceArea?: number;
      }
    ): Promise<any> => {
      const res = await apiRequest<any>(`/farms/${farmId}/buildings`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      return res?.data || res;
    },
  },

  // Flocks
  flocks: {
    list: async (params?: { farmId?: string; type?: string; status?: string }) => {
      if (!params?.farmId) return [];
      const q = new URLSearchParams();
      if (params?.status) q.append("status", params.status);
      const res = await apiRequest<any[]>(`/farms/${params.farmId}/flocks?${q.toString()}`);
      return (res || []).map((f: any) => ({
        id: f.id,
        farmId: params.farmId!,
        code: f.code,
        name: f.name,
        type: f.poultryType || f.type || "LAYER",
        breed: f.strain || f.breed || "Standard",
        strain: f.strain || f.breed,
        initialQuantity: f.initialQuantity || 0,
        currentQuantity: f.currentQuantity !== undefined ? f.currentQuantity : f.initialQuantity,
        startDate: f.startDate,
        expectedEndDate: f.estimatedEndDate || f.expectedEndDate,
        status: f.status || "ACTIVE",
        notes: f.notes,
        buildingId: f.building?.id || null,
        buildingName: f.building?.name || null,
      }));
    },
    create: async (data: any) => {
      const cleanCode =
        data.code ||
        `LOT-${(data.name || "BAN")
          .replace(/[^a-zA-Z0-9]/g, "")
          .toUpperCase()
          .slice(0, 4)}-${Date.now().toString().slice(-4)}`;

      const payload = {
        code: cleanCode,
        name: data.name,
        initialQuantity: Number(data.initialQuantity),
        startDate: data.startDate,
        poultryType: data.poultryType || data.type || "BROILER",
        strain: data.strain || data.breed || undefined,
        initialAgeDays: data.initialAgeDays ? Number(data.initialAgeDays) : 1,
        buildingId: data.buildingId || undefined,
        estimatedEndDate: data.estimatedEndDate || undefined,
        notes: data.notes || undefined,
      };

      return apiRequest<Flock>(`/farms/${data.farmId}/flocks`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    addMovement: async (flockId: string, movement: any) => {
      const payload = {
        type: movement.type,
        quantity: Number(movement.quantity),
        movementDate: movement.movementDate || movement.date || new Date().toISOString().split("T")[0],
        reason: movement.reason || undefined,
      };
      return apiRequest<FlockMovement>(`/flocks/${flockId}/movements`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
  },

  // Egg Production
  eggs: {
    list: async (params?: { farmId?: string; flockId?: string }) => {
      if (!params?.flockId && params?.farmId) {
        // Fetch active layer flocks first
        const flocks = await api.flocks.list({ farmId: params.farmId, status: "ACTIVE" });
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
      const kpi = await api.dashboard.getKpi(farmId);
      return {
        totalEggsToday: kpi.eggProductionToday.totalEggs,
        traysCountToday: kpi.eggProductionToday.traysCount,
        layingRate: kpi.eggProductionToday.layingRatePercent,
      };
    },
  },

  // Inventory
  inventory: {
    listItems: async (params?: { farmId?: string; category?: string; lowStockOnly?: boolean }) => {
      if (!params?.farmId) return [];
      const q = new URLSearchParams();
      if (params?.category && params.category !== "ALL") q.append("category", params.category);
      if (params?.lowStockOnly) q.append("lowStock", "true");
      const res = await apiRequest<any[]>(`/farms/${params.farmId}/inventory?${q.toString()}`);
      return (res || []).map((i: any) => ({
        id: i.id,
        farmId: params.farmId!,
        name: i.name,
        sku: i.code || i.sku || (i.name ? i.name.slice(0, 4).toUpperCase() : "ART"),
        category: i.category === "MEDICATION" ? "MEDICINE" : i.category,
        unit: i.unit,
        minThreshold: i.alertThreshold !== undefined ? i.alertThreshold : (i.minThreshold || 0),
        currentStock: i.currentStock || 0,
        unitCostFcfa: i.unitPrice !== undefined ? i.unitPrice : (i.unitCostFcfa || 0),
        notes: i.notes,
        isLowStock: i.isLowStock,
      }));
    },
    createItem: async (data: any) => {
      let category = data.category || "FEED";
      if (category === "MEDICINE") category = "MEDICATION";

      let unit = data.unit || "BAG_50KG";
      const u = String(unit).toLowerCase().trim();
      if (u.includes("50") || u.includes("sac 50")) unit = "BAG_50KG";
      else if (u.includes("25") || u.includes("sac 25")) unit = "BAG_25KG";
      else if (u.includes("kg") || u.includes("kilo")) unit = "KG";
      else if (u === "g" || u.includes("gramme")) unit = "G";
      else if (u === "t" || u.includes("tonne")) unit = "TON";
      else if (u.includes("dose") || u.includes("vaccin")) unit = "DOSE";
      else if (u.includes("flacon") || u.includes("vial")) unit = "VIAL";
      else if (u.includes("sachet")) unit = "SACHET";
      else if (u.includes("ml") || u.includes("milli")) unit = "ML";
      else if (u.includes("l") || u.includes("litre") || u.includes("liter")) unit = "LITER";
      else if (["BAG_50KG", "BAG_25KG", "KG", "G", "TON", "DOSE", "VIAL", "SACHET", "LITER", "ML", "UNIT"].includes(unit)) {
        // valid
      } else {
        unit = "UNIT";
      }

      const payload = {
        name: data.name,
        category,
        unit,
        initialStock: Number(data.initialStock !== undefined ? data.initialStock : (data.currentStock || 0)),
        alertThreshold: Number(data.alertThreshold !== undefined ? data.alertThreshold : (data.minThreshold || 0)),
        unitPrice: Number(data.unitPrice !== undefined ? data.unitPrice : (data.unitCostFcfa || 0)),
        notes: data.notes || undefined,
      };

      return apiRequest<InventoryItem>(`/farms/${data.farmId}/inventory`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    addMovement: async (itemId: string, movement: any) => {
      let unit = movement.unit;
      if (!unit || !["BAG_50KG", "BAG_25KG", "KG", "G", "TON", "DOSE", "VIAL", "SACHET", "LITER", "ML", "UNIT"].includes(unit)) {
        unit = undefined;
      }
      const payload = {
        type: movement.type || "OUT",
        quantity: Number(movement.quantity),
        movementDate: movement.movementDate || movement.date || new Date().toISOString().split("T")[0],
        unit,
        unitPrice: movement.unitPrice ? Number(movement.unitPrice) : (movement.unitPriceFcfa ? Number(movement.unitPriceFcfa) : undefined),
        flockId: movement.flockId || undefined,
        reason: movement.reason || undefined,
      };
      return apiRequest<StockMovement>(`/inventory/${itemId}/movements`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
  },

  // Finance
  finance: {
    listTransactions: async (params?: { farmId?: string; type?: string; category?: string }) => {
      if (!params?.farmId) return [];
      const q = new URLSearchParams();
      if (params?.type && params.type !== "ALL") q.append("type", params.type);
      if (params?.category) q.append("category", params.category);
      return apiRequest<Transaction[]>(`/farms/${params.farmId}/transactions?${q.toString()}`);
    },
    createTransaction: async (data: Partial<Transaction>) => {
      return apiRequest<Transaction>(`/farms/${data.farmId}/transactions`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
  },

  // Roles & Permissions
  roles: {
    getPermissionsCatalog: async () => {
      const res = await apiRequest<any>("/permissions");
      const raw = res?.permissions || {};
      const list: Permission[] = Array.isArray(raw)
        ? raw
        : Object.entries(raw).map(([key, val]: [string, any]) => ({
            key,
            category: val?.module || "Général",
            label: val?.label || key,
            description: val?.description || "",
          }));
      return {
        permissions: list,
        total: res?.total || list.length,
      };
    },
    listRoles: async (farmId?: string) => {
      if (!farmId) return [];
      const list = await apiRequest<any[]>(`/farms/${farmId}/roles`);
      return Array.isArray(list) ? list : [];
    },
    createRole: async (farmId: string, data: { name: string; description?: string; permissions: string[] }) => {
      return apiRequest<FarmRole>(`/farms/${farmId}/roles`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    updateRole: async (farmId: string, id: string, data: { name?: string; description?: string; permissions?: string[] }) => {
      return apiRequest<FarmRole>(`/farms/${farmId}/roles/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
  },

  // Developer Keys
  developer: {
    listKeys: async (farmId?: string) => {
      if (!farmId) {
        const farmList = await api.farms.list();
        farmId = farmList[0]?.id;
      }
      if (!farmId) return [];
      const res = await apiRequest<any>(`/farms/${farmId}/api-keys`);
      return Array.isArray(res) ? res : [];
    },
    createKey: async (farmId: string, data: { name: string; environment?: "live" | "test" }) => {
      return apiRequest<DeveloperApiKey>(`/farms/${farmId}/api-keys`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    deleteKey: async (farmId: string, id: string) => {
      return apiRequest<{ message: string }>(`/farms/${farmId}/api-keys/${id}`, {
        method: "DELETE",
      });
    },
  },

  // Members & Staff (Gestion des collaborateurs & employés)
  members: {
    list: async (farmId?: string): Promise<FarmMember[]> => {
      if (!farmId) return [];
      const res = await apiRequest<any>(`/farms/${farmId}/members`);
      return Array.isArray(res) ? res : [];
    },
    add: async (farmId: string, data: {
      email: string;
      firstName: string;
      lastName: string;
      phone?: string;
      role?: string;
      roleId?: string;
      password?: string;
    }): Promise<FarmMember> => {
      return apiRequest<FarmMember>(`/farms/${farmId}/members`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    update: async (farmId: string, membershipId: string, data: {
      role?: string;
      roleId?: string;
      isActive?: boolean;
    }): Promise<FarmMember> => {
      return apiRequest<FarmMember>(`/farms/${farmId}/members/${membershipId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    delete: async (farmId: string, membershipId: string): Promise<{ message: string }> => {
      return apiRequest<{ message: string }>(`/farms/${farmId}/members/${membershipId}`, {
        method: "DELETE",
      });
    },
  },
};

