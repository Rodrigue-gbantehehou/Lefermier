import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines Tailwind class names cleanly.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formats FCFA currency amounts without decimals, using space thousands separators.
 * Example: 1250000 -> "1 250 000 FCFA"
 */
export function formatFcfa(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return "0 FCFA";
  }
  const num = Math.round(Number(amount));
  const formatted = new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(num);

  return `${formatted} FCFA`;
}

/**
 * Formats integers (counts, birds, eggs).
 */
export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return "0";
  }
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(Number(value));
}

/**
 * Formats percentages with one decimal place.
 * Example: 92.4 -> "92.4 %"
 */
export function formatPercent(value: number | string | null | undefined): string {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return "0.0 %";
  }
  return `${Number(value).toFixed(1)} %`;
}

/**
 * Calcule les plateaux de 30 alvéoles et œufs libres.
 * Règle d'or : si < 30 œufs, affiche directement "X œufs" au lieu de "0 plateau + X œufs".
 */
export function calcEggTrays(goodEggs: number): { trays: number; loose: number; text: string } {
  const num = Math.max(0, Math.round(Number(goodEggs) || 0));
  const trays = Math.floor(num / 30);
  const loose = num % 30;

  let text = "";
  if (num === 0) {
    text = "0 œuf";
  } else if (trays === 0) {
    text = `${loose} œuf${loose > 1 ? "s" : ""}`;
  } else if (loose === 0) {
    text = `${trays} plateau${trays > 1 ? "x" : ""}`;
  } else {
    text = `${trays} plateau${trays > 1 ? "x" : ""} + ${loose} œuf${loose > 1 ? "s" : ""}`;
  }

  return { trays, loose, text };
}

/**
 * Format court pour les colonnes de tableaux : ex. "14 plat. + 5" ou "29 œufs" si < 30.
 */
export function formatEggTraysSummary(traysCount: number, looseEggs: number, totalEggs?: number): string {
  const t = Math.max(0, Math.round(Number(traysCount) || 0));
  const l = Math.max(0, Math.round(Number(looseEggs) || 0));
  const total = totalEggs !== undefined ? totalEggs : t * 30 + l;

  if (t === 0) {
    return `${total} œuf${total > 1 ? "s" : ""}`;
  }
  if (l === 0) {
    return `${t} plat.`;
  }
  return `${t} plat. + ${l}`;
}

/**
 * Formats ISO dates into French standard format (DD/MM/YYYY).
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "-";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(d);
  } catch {
    return dateString;
  }
}

/**
 * Formats ISO datetime into French format (DD/MM/YYYY HH:mm).
 */
export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return "-";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return dateString;
  }
}

/**
 * Filtre temporel : Tout, Aujourd'hui (Jour), Cette semaine, Ce mois.
 */
export type TimePeriod = "ALL" | "TODAY" | "WEEK" | "MONTH";

export const TIME_PERIOD_LABELS: Record<TimePeriod, string> = {
  ALL: "Tout",
  TODAY: "Aujourd'hui",
  WEEK: "Cette semaine",
  MONTH: "Ce mois",
};

/**
 * Vérifie si une date ISO se trouve dans la période sélectionnée.
 */
export function isDateInPeriod(dateString: string | null | undefined, period: TimePeriod): boolean {
  if (period === "ALL") return true;
  if (!dateString) return false;

  const target = new Date(dateString);
  if (isNaN(target.getTime())) return false;

  const now = new Date();
  const targetYear = target.getFullYear();
  const targetMonth = target.getMonth();
  const targetDate = target.getDate();

  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth();
  const nowDate = now.getDate();

  if (period === "TODAY") {
    return targetYear === nowYear && targetMonth === nowMonth && targetDate === nowDate;
  }

  if (period === "WEEK") {
    // Semaine calendaire en cours (Lundi 00:00:00 -> Dimanche 23:59:59)
    const currentDay = now.getDay(); // 0 = Dimanche, 1 = Lundi
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(nowYear, nowMonth, nowDate + diffToMonday, 0, 0, 0, 0);
    const sunday = new Date(monday.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
    return target >= monday && target <= sunday;
  }

  if (period === "MONTH") {
    return targetYear === nowYear && targetMonth === nowMonth;
  }

  return true;
}

// Re-export des utilitaires de gestion explicite des unités
export * from "./units";
