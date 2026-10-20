import { apiRequest } from "./client";
import { InventoryItem, StockMovement } from "../types";

export const inventoryApi = {
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
    else if (
      ["BAG_50KG", "BAG_25KG", "KG", "G", "TON", "DOSE", "VIAL", "SACHET", "LITER", "ML", "UNIT"].includes(unit)
    ) {
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
    if (
      !unit ||
      !["BAG_50KG", "BAG_25KG", "KG", "G", "TON", "DOSE", "VIAL", "SACHET", "LITER", "ML", "UNIT"].includes(unit)
    ) {
      unit = undefined;
    }
    const payload = {
      type: movement.type || "OUT",
      quantity: Number(movement.quantity),
      movementDate: movement.movementDate || movement.date || new Date().toISOString().split("T")[0],
      unit,
      unitPrice: movement.unitPrice
        ? Number(movement.unitPrice)
        : movement.unitPriceFcfa
        ? Number(movement.unitPriceFcfa)
        : undefined,
      flockId: movement.flockId || undefined,
      reason: movement.reason || undefined,
    };
    return apiRequest<StockMovement>(`/inventory/${itemId}/movements`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  get: async (id: string): Promise<InventoryItem & { movements?: StockMovement[] }> => {
    const res = await apiRequest<any>(`/inventory/${id}`);
    const i = res?.data || res;
    return {
      id: i.id,
      farmId: i.farmId,
      name: i.name,
      sku: i.code || i.sku || (i.name ? i.name.slice(0, 4).toUpperCase() : "ART"),
      category: i.category === "MEDICATION" ? "MEDICINE" : i.category,
      unit: i.unit,
      unitLabel: i.unitLabel,
      unitShortLabel: i.unitShortLabel,
      minThreshold: i.alertThreshold !== undefined ? i.alertThreshold : (i.minThreshold || 0),
      currentStock: i.currentStock || 0,
      unitCostFcfa: i.unitPrice !== undefined ? i.unitPrice : (i.unitCostFcfa || 0),
      totalValueFcfa: i.estimatedTotalValue,
      notes: i.notes,
      isActive: i.isActive !== undefined ? i.isActive : true,
      isLowStock: i.isLowStock,
      movements: (i.movements || []).map((m: any) => ({
        id: m.id,
        itemId: i.id,
        itemName: i.name,
        type: m.type,
        quantity: m.quantity,
        unit: m.unit,
        unitLabel: m.unitLabel,
        unitShortLabel: m.unitShortLabel,
        unitPriceFcfa: Number(m.unitPrice || 0),
        totalCostFcfa: Number(m.totalCost || 0),
        reason: m.reason,
        date: m.movementDate || m.date,
        flock: m.flock,
        recordedBy: m.recordedBy,
        createdAt: m.createdAt,
      })),
    };
  },

  update: async (
    id: string,
    data: {
      name?: string;
      category?: string;
      unit?: string;
      alertThreshold?: number;
      minThreshold?: number;
      unitPrice?: number;
      unitCostFcfa?: number;
      notes?: string | null;
      isActive?: boolean;
    }
  ): Promise<InventoryItem> => {
    const payload: any = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.category !== undefined) payload.category = data.category === "MEDICINE" ? "MEDICATION" : data.category;
    if (data.unit !== undefined) payload.unit = data.unit;
    if (data.alertThreshold !== undefined) payload.alertThreshold = Number(data.alertThreshold);
    else if (data.minThreshold !== undefined) payload.alertThreshold = Number(data.minThreshold);
    if (data.unitPrice !== undefined) payload.unitPrice = Number(data.unitPrice);
    else if (data.unitCostFcfa !== undefined) payload.unitPrice = Number(data.unitCostFcfa);
    if (data.notes !== undefined) payload.notes = data.notes;
    if (data.isActive !== undefined) payload.isActive = data.isActive;

    const res = await apiRequest<any>(`/inventory/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return res?.data || res;
  },

  listMovements: async (itemId: string): Promise<StockMovement[]> => {
    const res = await apiRequest<any>(`/inventory/${itemId}/movements`);
    const rawList = Array.isArray(res) ? res : res?.data || [];
    return rawList.map((m: any) => ({
      id: m.id,
      itemId,
      type: m.type,
      quantity: m.quantity,
      unit: m.unit,
      unitLabel: m.unitLabel,
      unitShortLabel: m.unitShortLabel,
      unitPriceFcfa: Number(m.unitPrice || 0),
      totalCostFcfa: Number(m.totalCost || 0),
      reason: m.reason,
      date: m.movementDate || m.date,
      flock: m.flock,
      recordedBy: m.recordedBy,
      createdAt: m.createdAt,
    }));
  },
};
