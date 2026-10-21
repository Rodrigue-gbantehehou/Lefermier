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
      paymentStatus: t.paymentStatus || "PAID",
      paidAmountFcfa: Number(t.paidAmount !== undefined ? t.paidAmount : (t.paidAmountFcfa || t.amount || 0)),
      paidAmount: Number(t.paidAmount !== undefined ? t.paidAmount : (t.paidAmountFcfa || t.amount || 0)),
      remainingAmountFcfa: Number(t.remainingAmount !== undefined ? t.remainingAmount : (t.remainingAmountFcfa || 0)),
      remainingAmount: Number(t.remainingAmount !== undefined ? t.remainingAmount : (t.remainingAmountFcfa || 0)),
      dueDate: t.dueDate || null,
      isOverdue: !!t.isOverdue,
      paymentMethod: t.paymentMethod,
      reference: t.reference,
      date: t.transactionDate || t.date,
      notes: t.description || t.notes,
      createdAt: t.createdAt,
    }));
  },

  createTransaction: async (data: any) => {
    const categoryMap: Record<string, string> = {
      "Vente Oeufs": "EGG_SALE",
      "Vente Poulets Vifs": "MEAT_POULTRY_SALE",
      "Vente Fiente / Engrais": "MANURE_SALE",
      "Vente Fiente": "MANURE_SALE",
      "Autre Recette": "OTHER_INCOME",
      "Alimentation": "FEED_PURCHASE",
      "Vaccins & Soins": "MEDICATION_VACCINE",
      "Poussins / Achat Sujets": "CHICK_PURCHASE",
      "Achat Poussins": "CHICK_PURCHASE",
      "Main d'oeuvre": "SALARY_LABOR",
      "Carburant & Electricite": "UTILITIES",
      "Materiel & Entretien": "EQUIPMENT_LITTER",
      "Autre Depense": "OTHER_EXPENSE",
    };
    const category = categoryMap[data.category] || data.category || (data.type === "INCOME" ? "OTHER_INCOME" : "OTHER_EXPENSE");

    const description = [
      data.customCategory ? `[${data.customCategory}]` : "",
      data.description || data.notes || "",
    ].filter(Boolean).join(" ") || undefined;

    const payload = {
      type: data.type,
      category,
      amount: Number(data.amountFcfa !== undefined ? data.amountFcfa : data.amount || 0),
      paymentStatus: data.paymentStatus || "PAID",
      paidAmount: data.paidAmount !== undefined ? Number(data.paidAmount) : undefined,
      dueDate: data.dueDate || undefined,
      transactionDate: data.transactionDate || data.date || new Date().toISOString().split("T")[0],
      paymentMethod: data.paymentMethod || "CASH",
      reference: data.reference || undefined,
      description,
      contactId: data.contactId || undefined,
      flockId: data.flockId || undefined,
    };
    return apiRequest<Transaction>(`/farms/${data.farmId}/transactions`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
