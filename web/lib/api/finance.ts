import { apiRequest } from "./client";
import { Transaction } from "../types";

export const financeApi = {
  listTransactions: async (params?: {
    farmId?: string;
    type?: string;
    category?: string;
    contactId?: string;
  }) => {
    if (!params?.farmId) return [];
    const q = new URLSearchParams();
    if (params?.type && params.type !== "ALL") q.append("type", params.type);
    if (params?.category) q.append("category", params.category);
    if (params?.contactId) q.append("contactId", params.contactId);
    const res = await apiRequest<any>(`/farms/${params.farmId}/transactions?${q.toString()}`);
    const rawList = Array.isArray(res) ? res : res?.data || [];
    return rawList.map((t: any) => ({
      id: t.id,
      farmId: t.farmId,
      flockId: t.flock?.id,
      flockName: t.flock?.name,
      contactId: t.contact?.id,
      contact: t.contact,
      type: t.type,
      category: t.category,
      amountFcfa: Number(t.amount !== undefined ? t.amount : t.amountFcfa || 0),
      paymentMethod: t.paymentMethod,
      reference: t.reference,
      date: t.transactionDate || t.date,
      notes: t.description || t.notes,
      createdAt: t.createdAt,
    }));
  },

  createTransaction: async (data: any) => {
    const payload = {
      type: data.type,
      category: data.category,
      amount: Number(data.amountFcfa !== undefined ? data.amountFcfa : data.amount || 0),
      transactionDate: data.transactionDate || data.date || new Date().toISOString().split("T")[0],
      paymentMethod: data.paymentMethod || "CASH",
      reference: data.reference || undefined,
      description: data.description || data.notes || undefined,
      contactId: data.contactId || undefined,
      flockId: data.flockId || undefined,
    };
    return apiRequest<Transaction>(`/farms/${data.farmId}/transactions`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
