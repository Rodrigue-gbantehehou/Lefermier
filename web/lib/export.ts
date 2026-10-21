/**
 * Utilitaires d'export CSV / Excel compatibles UTF-8 avec BOM
 * Spécialement adaptés pour Microsoft Excel, LibreOffice et Google Sheets
 */

import { Transaction, InventoryItem, StockMovement } from "./types";
import { formatNumber } from "./utils";

function downloadCsv(content: string, filename: string) {
  // \uFEFF enables Excel to recognize UTF-8 encoding automatically
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvField(val: any): string {
  if (val === null || val === undefined) return "";
  const str = String(val).replace(/"/g, '""');
  if (str.includes(";") || str.includes("\n") || str.includes('"')) {
    return `"${str}"`;
  }
  return str;
}

export function exportTransactionsToCsv(transactions: Transaction[], farmName = "Ferme") {
  const headers = [
    "Date",
    "Référence",
    "Flux (Type)",
    "Catégorie",
    "Tiers / Partenaire",
    "Téléphone Partenaire",
    "Bande de volailles",
    "Montant Total (FCFA)",
    "Statut Règlement",
    "Montant Réglé (FCFA)",
    "Solde Dû (FCFA)",
    "Date Échéance",
    "En retard",
    "Mode de Paiement",
    "Description / Justificatif",
  ];

  const rows = transactions.map((t) => {
    const isOverdue = t.remainingAmountFcfa && t.remainingAmountFcfa > 0 && t.dueDate
      ? new Date(t.dueDate) < new Date()
      : false;

    const statusLabel =
      t.paymentStatus === "UNPAID"
        ? "À crédit (Non réglé)"
        : t.paymentStatus === "PARTIAL"
        ? "Acompte (Partiel)"
        : "Totalement réglé";

    return [
      t.date,
      t.reference || "",
      t.type === "INCOME" ? "Recette" : "Dépense",
      t.category,
      t.contact?.name || "",
      t.contact?.phone || "",
      t.flockName || "",
      t.amountFcfa,
      statusLabel,
      t.paidAmountFcfa !== undefined ? t.paidAmountFcfa : t.amountFcfa,
      t.remainingAmountFcfa || 0,
      t.dueDate || "",
      isOverdue ? "OUI (Échu)" : "NON",
      t.paymentMethod,
      t.notes || "",
    ]
      .map(escapeCsvField)
      .join(";");
  });

  const csv = [headers.join(";"), ...rows].join("\r\n");
  const cleanName = farmName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
  const dateStr = new Date().toISOString().split("T")[0];
  downloadCsv(csv, `tresorerie_${cleanName}_${dateStr}.csv`);
}

export function exportInventoryToCsv(items: InventoryItem[], farmName = "Ferme") {
  const headers = [
    "Code SKU",
    "Désignation de l'article",
    "Catégorie",
    "Unité de gestion",
    "Stock Actuel",
    "Seuil d'Alerte",
    "Statut du stock",
    "Prix Unitaire (FCFA)",
    "Valeur Totale (FCFA)",
    "Statut de l'article",
    "Notes",
  ];

  const rows = items.map((i) => {
    const isLow = i.currentStock <= i.minThreshold;
    const totalVal = i.currentStock * i.unitCostFcfa;

    return [
      i.sku || "",
      i.name,
      i.category,
      i.unit,
      i.currentStock,
      i.minThreshold,
      isLow ? "SOUS-SEUIL (Alerte)" : "NORMAL",
      i.unitCostFcfa,
      totalVal,
      i.isActive !== false ? "Actif" : "Archivé",
      i.notes || "",
    ]
      .map(escapeCsvField)
      .join(";");
  });

  const csv = [headers.join(";"), ...rows].join("\r\n");
  const cleanName = farmName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
  const dateStr = new Date().toISOString().split("T")[0];
  downloadCsv(csv, `inventaire_${cleanName}_${dateStr}.csv`);
}
