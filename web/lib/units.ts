/**
 * Système de Gestion Centralisé et Normatif des Unités de Mesure — Lefermier
 * Conforme à la spécification docs/UNITS_AND_MEASUREMENTS.md
 */

export type UnitFamily = "MASS" | "VOLUME" | "VET_DOSE" | "PIECE";

export type InventoryUnitCode =
  | "KG"
  | "G"
  | "BAG_50KG"
  | "BAG_25KG"
  | "TON"
  | "DOSE"
  | "VIAL"
  | "SACHET"
  | "LITER"
  | "ML"
  | "UNIT";

export interface UnitDefinition {
  code: InventoryUnitCode;
  label: string;
  shortLabel: string;
  family: UnitFamily;
  multiplierToBase: number; // Relatif à l'unité de base (KG pour masse, L pour volume)
  categoryHint: string;
}

export const UNIT_DEFINITIONS: Record<InventoryUnitCode, UnitDefinition> = {
  BAG_50KG: {
    code: "BAG_50KG",
    label: "Sac de 50 kg",
    shortLabel: "sac (50kg)",
    family: "MASS",
    multiplierToBase: 50.0,
    categoryHint: "Aliments complets provenderie",
  },
  BAG_25KG: {
    code: "BAG_25KG",
    label: "Sac de 25 kg",
    shortLabel: "sac (25kg)",
    family: "MASS",
    multiplierToBase: 25.0,
    categoryHint: "Aliments demi-sac / concentrés",
  },
  KG: {
    code: "KG",
    label: "Kilogramme (kg)",
    shortLabel: "kg",
    family: "MASS",
    multiplierToBase: 1.0,
    categoryHint: "Matières premières, pesées, rations",
  },
  G: {
    code: "G",
    label: "Gramme (g)",
    shortLabel: "g",
    family: "MASS",
    multiplierToBase: 0.001,
    categoryHint: "Rations quotidiennes, prémix",
  },
  TON: {
    code: "TON",
    label: "Tonne (t)",
    shortLabel: "t",
    family: "MASS",
    multiplierToBase: 1000.0,
    categoryHint: "Livraisons en vrac",
  },
  DOSE: {
    code: "DOSE",
    label: "Dose vaccinale",
    shortLabel: "dose",
    family: "VET_DOSE",
    multiplierToBase: 1.0,
    categoryHint: "Vaccination individuelle",
  },
  VIAL: {
    code: "VIAL",
    label: "Flacon / Ampoule",
    shortLabel: "flacon",
    family: "VET_DOSE",
    multiplierToBase: 1.0,
    categoryHint: "Flacons vaccins ou sérums",
  },
  SACHET: {
    code: "SACHET",
    label: "Sachet hydrosoluble",
    shortLabel: "sachet",
    family: "VET_DOSE",
    multiplierToBase: 1.0,
    categoryHint: "Vitamines ou antibiotiques en poudre",
  },
  LITER: {
    code: "LITER",
    label: "Litre (L)",
    shortLabel: "L",
    family: "VOLUME",
    multiplierToBase: 1.0,
    categoryHint: "Désinfectants, bidons, eau de boisson",
  },
  ML: {
    code: "ML",
    label: "Millilitre (mL)",
    shortLabel: "mL",
    family: "VOLUME",
    multiplierToBase: 0.001,
    categoryHint: "Posologies fines et pipettes",
  },
  UNIT: {
    code: "UNIT",
    label: "Unité / Pièce",
    shortLabel: "u",
    family: "PIECE",
    multiplierToBase: 1.0,
    categoryHint: "Matériel, ampoules, abreuvoirs",
  },
};

export const ALL_UNITS_LIST = Object.values(UNIT_DEFINITIONS);

/**
 * Retourne le libellé complet d'une unité.
 */
export function getUnitLabel(unitCode: string | null | undefined): string {
  if (!unitCode) return "Unité";
  const def = UNIT_DEFINITIONS[unitCode as InventoryUnitCode];
  return def ? def.label : unitCode;
}

/**
 * Retourne le symbole court d'une unité.
 */
export function getUnitShortLabel(unitCode: string | null | undefined): string {
  if (!unitCode) return "u";
  const def = UNIT_DEFINITIONS[unitCode as InventoryUnitCode];
  return def ? def.shortLabel : unitCode;
}

/**
 * Convertit une quantité d'une unité source vers une unité cible si compatibles.
 * Retourne null si les unités sont de familles physiques différentes.
 */
export function convertUnit(
  quantity: number,
  fromUnitCode: string,
  toUnitCode: string
): number | null {
  if (fromUnitCode === toUnitCode) return quantity;

  const source = UNIT_DEFINITIONS[fromUnitCode as InventoryUnitCode];
  const target = UNIT_DEFINITIONS[toUnitCode as InventoryUnitCode];

  if (!source || !target || source.family !== target.family) {
    return null; // Incompatible
  }

  const baseQty = quantity * source.multiplierToBase;
  return Number((baseQty / target.multiplierToBase).toFixed(4));
}

/**
 * Formate une quantité de stock avec son unité explicite.
 * Exemples :
 * - (45, "BAG_50KG") => "45 sacs (50kg)"
 * - (1, "BAG_50KG") => "1 sac (50kg)"
 * - (25.5, "KG") => "25.5 kg"
 * - (10, "LITER") => "10 L"
 */
export function formatInventoryUnit(
  quantity: number | string | null | undefined,
  unitCode: string | null | undefined,
  options?: { short?: boolean }
): string {
  if (quantity === null || quantity === undefined || isNaN(Number(quantity))) {
    return `0 ${getUnitShortLabel(unitCode)}`;
  }

  const num = Number(quantity);
  const formattedNum = Number.isInteger(num)
    ? num.toString()
    : num.toFixed(num < 10 ? 2 : 1).replace(/\.00$/, "").replace(/\.0$/, "");

  const code = (unitCode || "UNIT") as InventoryUnitCode;
  const def = UNIT_DEFINITIONS[code];

  if (options?.short) {
    return `${formattedNum} ${def ? def.shortLabel : code}`;
  }

  // Format complet et grammaticalement accordé
  if (code === "BAG_50KG") {
    return num > 1 ? `${formattedNum} sacs (50kg)` : `${formattedNum} sac (50kg)`;
  }
  if (code === "BAG_25KG") {
    return num > 1 ? `${formattedNum} sacs (25kg)` : `${formattedNum} sac (25kg)`;
  }
  if (code === "DOSE") {
    return num > 1 ? `${formattedNum} doses` : `${formattedNum} dose`;
  }
  if (code === "VIAL") {
    return num > 1 ? `${formattedNum} flacons` : `${formattedNum} flacon`;
  }
  if (code === "SACHET") {
    return num > 1 ? `${formattedNum} sachets` : `${formattedNum} sachet`;
  }
  if (code === "UNIT") {
    return num > 1 ? `${formattedNum} unités` : `${formattedNum} unité`;
  }

  return `${formattedNum} ${def ? def.shortLabel : code}`;
}

/**
 * Formate un nombre de poules / oiseaux.
 * Exemple: 499 => "499 poules"
 */
export function formatPoultryCount(
  count: number | string | null | undefined,
  poultryType?: string
): string {
  const num = Math.round(Number(count) || 0);
  const isSingular = num <= 1;

  if (poultryType === "BROILER") {
    return `${num.toLocaleString("fr-FR")} ${isSingular ? "poulet de chair" : "poulets de chair"}`;
  }
  return `${num.toLocaleString("fr-FR")} ${isSingular ? "poule" : "poules"}`;
}
