import { apiRequest } from "./client";
import { authApi } from "./auth";
import { Farm } from "../types";

export const farmsApi = {
  list: async (): Promise<Farm[]> => {
    const me = await authApi.me();
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
      phone?: string;
      email?: string;
      address?: string;
      ifu?: string;
      rccm?: string;
      description?: string;
    }
  ): Promise<any> => {
    const res = await apiRequest<any>(`/farms/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return res?.data || res;
  },

  listBuildings: async (farmId: string, params?: { onlyActive?: boolean }): Promise<any[]> => {
    const q = new URLSearchParams();
    if (params?.onlyActive !== undefined) q.append("onlyActive", String(params.onlyActive));
    const query = q.toString() ? `?${q.toString()}` : "";
    const res = await apiRequest<any>(`/farms/${farmId}/buildings${query}`);
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

  updateBuilding: async (
    farmId: string,
    buildingId: string,
    data: {
      name?: string;
      type?: "POULTRY_HOUSE" | "BROODER" | "STORAGE" | "OTHER";
      capacity?: number;
      surfaceArea?: number;
      isActive?: boolean;
    }
  ): Promise<any> => {
    const res = await apiRequest<any>(`/farms/${farmId}/buildings/${buildingId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return res?.data || res;
  },

  deleteBuilding: async (farmId: string, buildingId: string): Promise<void> => {
    await apiRequest<void>(`/farms/${farmId}/buildings/${buildingId}`, {
      method: "DELETE",
    });
  },
};
