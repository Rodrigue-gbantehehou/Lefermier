/**
 * Système de Gestion Centralisé et Normatif des Unités de Mesure — Lefermier
 * Conforme à la spécification docs/UNITS_AND_MEASUREMENTS.md
 */

export type UnitFamily = "MASS" | "VOLUME" | "VET_DOSE" | "PIECE";

export type InventoryUnitCode =
  | "BAG"
  | "BAG_50KG"
  | "BAG_25KG"
  | "KG"
  | "G"
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
  BAG: {
    code: "BAG",
    label: "Sac",
    shortLabel: "sac",
    family: "MASS",
    multiplierToBase: 50.0,
    categoryHint: "Sacs de provende ou intrants (poids libre)",
  },
  BAG_50KG: {
    code: "BAG_50KG",
    label: "Sac",
    shortLabel: "sac",
    family: "MASS",
    multiplierToBase: 50.0,
    categoryHint: "Aliments provenderie / sacs",
  },
  BAG_25KG: {
    code: "BAG_25KG",
    label: "Sac",
    shortLabel: "sac",
    family: "MASS",
    multiplierToBase: 25.0,
    categoryHint: "Demi-sacs / concentrés",
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
  toUnitCode: string,
  options?: { packageWeightKg?: number }
): number | null {
  if (fromUnitCode === toUnitCode) return quantity;

  const source = UNIT_DEFINITIONS[fromUnitCode as InventoryUnitCode];
  const target = UNIT_DEFINITIONS[toUnitCode as InventoryUnitCode];

  if (!source || !target || source.family !== target.family) {
    return null; // Incompatible
  }

  let sourceMultiplier = source.multiplierToBase;
  if ((fromUnitCode === "BAG" || fromUnitCode === "BAG_50KG" || fromUnitCode === "BAG_25KG") && options?.packageWeightKg && options.packageWeightKg > 0) {
    sourceMultiplier = options.packageWeightKg;
  }

  let targetMultiplier = target.multiplierToBase;
  if ((toUnitCode === "BAG" || toUnitCode === "BAG_50KG" || toUnitCode === "BAG_25KG") && options?.packageWeightKg && options.packageWeightKg > 0) {
    targetMultiplier = options.packageWeightKg;
  }

  const baseQty = quantity * sourceMultiplier;
  return Number((baseQty / targetMultiplier).toFixed(4));
}

/**
 * Retourne la liste des unités de mouvement compatibles pour un article de stock.
 */
export function getCompatibleMovementUnits(
  itemUnit: string | null | undefined,
  packageWeightKg?: number
): { code: string; label: string; shortLabel: string }[] {
  const code = (itemUnit || "UNIT") as InventoryUnitCode;
  const def = UNIT_DEFINITIONS[code];
  const bagWeight = packageWeightKg || 50;

  if (!def) return [{ code: "UNIT", label: "Unité (u)", shortLabel: "u" }];

  if (def.family === "MASS") {
    const isBag = code === "BAG" || code === "BAG_50KG" || code === "BAG_25KG";
    return [
      ...(isBag ? [{ code, label: `Sac (${bagWeight} kg)`, shortLabel: "sac" }] : []),
      { code: "KG", label: "Kilogramme (kg - Pesée balance)", shortLabel: "kg" },
      { code: "G", label: "Gramme (g - Poudre / Vitamines)", shortLabel: "g" },
    ];
  }

  if (def.family === "VOLUME") {
    return [
      { code: "ML", label: "Millilitre (mL - Dose liquide)", shortLabel: "mL" },
      { code: "LITER", label: "Litre (L - Bidon / Bouteille)", shortLabel: "L" },
    ];
  }

  if (def.family === "VET_DOSE") {
    const res = [{ code: def.code, label: `${def.label} (${def.shortLabel})`, shortLabel: def.shortLabel }];
    if (def.code !== "DOSE") res.push({ code: "DOSE", label: "Dose vaccinale", shortLabel: "dose" });
    if (def.code !== "VIAL") res.push({ code: "VIAL", label: "Flacon", shortLabel: "flacon" });
    if (def.code !== "SACHET") res.push({ code: "SACHET", label: "Sachet", shortLabel: "sachet" });
    return res;
  }

  return [{ code: def.code, label: `${def.label} (${def.shortLabel})`, shortLabel: def.shortLabel }];
}

/**
 * Retourne une indication pratique de dosage agricole (cuillère à soupe, sac, etc.)
 */
export function getPracticalMeasurementHint(
  quantity: number | string | null | undefined,
  movementUnit: string,
  options?: { packageWeightKg?: number; itemUnit?: string }
): string | null {
  const qty = Number(quantity);
  if (!qty || isNaN(qty) || qty <= 0) return null;

  // Vitamines / Médicaments liquides : 1 cuillère à soupe = 15 mL, 1 cuillère à café = 5 mL
  if (movementUnit === "ML") {
    const spoons = (qty / 15).toFixed(1).replace(/\.0$/, "");
    return qty >= 5
      ? `≈ ${spoons} c. à soupe (1 c. à soupe = 15 mL)`
      : null;
  }

  // Vitamines / Médicaments en poudre : 1 cuillère à soupe rase ≈ 15 g
  if (movementUnit === "G") {
    const spoons = (qty / 15).toFixed(1).replace(/\.0$/, "");
    return qty >= 5
      ? `≈ ${spoons} c. à soupe rase (1 c. à soupe ≈ 15 g)`
      : null;
  }

  // Provende / Intrants : Pesée en kg convertie en sacs
  const isBag = options?.itemUnit === "BAG" || options?.itemUnit === "BAG_50KG" || options?.itemUnit === "BAG_25KG";
  const bagWeight = options?.packageWeightKg || 50;

  if (movementUnit === "KG" && isBag) {
    const bags = (qty / bagWeight).toFixed(2);
    return `≈ ${bags} sac (sac de ${bagWeight} kg)`;
  }

  if ((movementUnit === "BAG" || movementUnit === "BAG_50KG" || movementUnit === "BAG_25KG")) {
    const totalKg = (qty * bagWeight).toLocaleString("fr-FR");
    return `Soit ~${totalKg} kg au total`;
  }

  return null;
}

/**
 * Formate une quantité de stock avec son unité explicite.
 * Exemples :
 * - (45, "BAG_50KG", { packageWeightKg: 50 }) => "45 sacs (50 kg)"
 * - (1, "BAG") => "1 sac"
 * - (25.5, "KG") => "25.5 kg"
 * - (10, "LITER") => "10 L"
 */
export function formatInventoryUnit(
  quantity: number | string | null | undefined,
  unitCode: string | null | undefined,
  options?: { short?: boolean; packageWeightKg?: number }
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

  // Format accordé pour les sacs avec poids personnalisable
  if (code === "BAG" || code === "BAG_50KG" || code === "BAG_25KG") {
    const weightLabel = options?.packageWeightKg ? ` (${options.packageWeightKg} kg)` : "";
    return num > 1 ? `${formattedNum} sacs${weightLabel}` : `${formattedNum} sac${weightLabel}`;
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
