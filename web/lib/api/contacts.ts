import { apiRequest } from "./client";
import { Contact, ContactType } from "../types";

export const contactsApi = {
  list: async (params?: {
    farmId?: string;
    type?: string;
    search?: string;
    onlyActive?: boolean;
  }): Promise<Contact[]> => {
    if (!params?.farmId) return [];
    const q = new URLSearchParams();
    if (params?.type && params.type !== "ALL") q.append("type", params.type);
    if (params?.search) q.append("search", params.search);
    if (params?.onlyActive !== undefined) q.append("onlyActive", String(params.onlyActive));
    const res = await apiRequest<any>(`/farms/${params.farmId}/contacts?${q.toString()}`);
    const rawList = Array.isArray(res) ? res : res?.data || [];
    return rawList.map((c: any) => ({
      id: c.id,
      farmId: c.farmId || params.farmId!,
      name: c.name,
      type: c.type || "CLIENT",
      phone: c.phone,
      email: c.email,
      address: c.address,
      city: c.city,
      notes: c.notes,
      isActive: c.isActive !== undefined ? c.isActive : true,
      createdAt: c.createdAt || new Date().toISOString(),
      updatedAt: c.updatedAt,
    }));
  },

  create: async (
    farmId: string,
    data: {
      name: string;
      type: ContactType;
      phone?: string;
      email?: string;
      address?: string;
      city?: string;
      notes?: string;
    }
  ): Promise<Contact> => {
    const res = await apiRequest<any>(`/farms/${farmId}/contacts`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return res?.data || res;
  },

  get: async (id: string): Promise<Contact> => {
    const res = await apiRequest<any>(`/contacts/${id}`);
    return res?.data || res;
  },

  update: async (
    id: string,
    data: {
      name: string;
      type: ContactType;
      phone?: string;
      email?: string;
      address?: string;
      city?: string;
      notes?: string;
      isActive?: boolean;
    }
  ): Promise<Contact> => {
    const res = await apiRequest<any>(`/contacts/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return res?.data || res;
  },

  delete: async (id: string): Promise<void> => {
    await apiRequest<void>(`/contacts/${id}`, {
      method: "DELETE",
    });
  },
};
