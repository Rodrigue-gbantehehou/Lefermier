import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines Tailwind CSS classes with clsx and twMerge (shadcn standard).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formate un nombre entier (comptes, organisations, fermes, volailles).
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
 * Formate une date ISO en format français lisible.
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return dateString;
  }
}
