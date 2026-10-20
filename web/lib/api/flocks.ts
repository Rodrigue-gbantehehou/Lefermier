import { apiRequest } from "./client";
import { Flock, FlockMovement, Transaction } from "../types";

export const flocksApi = {
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

  get: async (id: string): Promise<Flock> => {
    const res = await apiRequest<any>(`/flocks/${id}`);
    const f = res?.data || res;
    return {
      id: f.id,
      farmId: f.farmId,
      code: f.code,
      name: f.name,
      type: f.poultryType || f.type || "LAYER",
      breed: f.strain || f.breed || "Standard",
      strain: f.strain || f.breed,
      initialQuantity: f.initialQuantity || 0,
      currentQuantity: f.currentQuantity !== undefined ? f.currentQuantity : f.initialQuantity,
      initialAgeDays: f.initialAgeDays || 1,
      ageInDays: f.ageInDays,
      ageInWeeks: f.ageInWeeks,
      mortalityRate: f.mortalityRate,
      startDate: f.startDate,
      expectedEndDate: f.estimatedEndDate || f.expectedEndDate,
      actualEndDate: f.actualEndDate,
      status: f.status || "ACTIVE",
      notes: f.notes,
      buildingId: f.building?.id || null,
      buildingName: f.building?.name || null,
      movements: (f.movements || []).map((m: any) => ({
        id: m.id,
        flockId: f.id,
        type: m.type,
        quantity: m.quantity,
        date: m.movementDate || m.date,
        reason: m.reason,
        recordedBy: m.recordedBy?.name,
        createdAt: m.createdAt,
      })),
    };
  },

  update: async (
    id: string,
    data: {
      name?: string;
      buildingId?: string | null;
      estimatedEndDate?: string | null;
      actualEndDate?: string | null;
      status?: string;
      notes?: string | null;
    }
  ): Promise<Flock> => {
    const res = await apiRequest<any>(`/flocks/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return res?.data || res;
  },

  getTransactions: async (
    flockId: string
  ): Promise<{
    transactions: Transaction[];
    summary: { totalIncome: number; totalExpense: number; grossMargin: number; currency: string };
  }> => {
    const res = await apiRequest<any>(`/flocks/${flockId}/transactions`);
    const rawList = res?.data || [];
    const summary = res?.meta?.summary || { totalIncome: 0, totalExpense: 0, netBalance: 0, grossMargin: 0, currency: "XOF" };
    return {
      transactions: rawList.map((t: any) => ({
        id: t.id,
        farmId: t.farmId,
        flockId: flockId,
        type: t.type,
        category: t.category,
        amountFcfa: Number(t.amount !== undefined ? t.amount : (t.amountFcfa || 0)),
        paymentMethod: t.paymentMethod,
        reference: t.reference,
        date: t.transactionDate || t.date,
        notes: t.description || t.notes,
        contact: t.contact,
        createdAt: t.createdAt,
      })),
      summary: {
        totalIncome: Number(summary.totalIncome || 0),
        totalExpense: Number(summary.totalExpense || 0),
        grossMargin: Number(summary.grossMargin !== undefined ? summary.grossMargin : (summary.netBalance || 0)),
        currency: summary.currency || "XOF",
      },
    };
  },

  listMovements: async (flockId: string): Promise<FlockMovement[]> => {
    const res = await apiRequest<any>(`/flocks/${flockId}/movements`);
    const rawList = Array.isArray(res) ? res : (res?.data || []);
    return rawList.map((m: any) => ({
      id: m.id,
      flockId: flockId,
      type: m.type,
      quantity: m.quantity,
      date: m.movementDate || m.date,
      reason: m.reason,
      recordedBy: m.recordedBy?.name,
      createdAt: m.createdAt,
    }));
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
};
