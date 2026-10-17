/**
 * User and Authentication types
 */
export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  roles: string[];
  activeFarmId?: string | null;
}

export interface Farm {
  id: string;
  name: string;
  code?: string | null;
  productionType?: "LAYER" | "BROILER" | "MIXED";
  location?: string | null;
  locationCity?: string | null;
  locationCountry?: string | null;
  currency?: string | null;
  surfaceAreaM2?: number | null;
  status: string;
  createdAt: string;
  userRole?: string | null;
  roleName?: string | null;
  permissions?: string[];
}

export interface Building {
  id: string;
  farmId: string;
  name: string;
  type: string;
  capacityBirds: number;
  lengthM?: number | null;
  widthM?: number | null;
  notes?: string | null;
}

export interface AuthResponse {
  token: string;
  user: User;
  farms?: Farm[];
  activeFarm?: Farm;
}

export interface Permission {
  key: string;
  category: string;
  label: string;
  description: string;
}

export interface FarmRole {
  id: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  permissions: string[];
  createdAt: string;
}

export interface FarmMember {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone?: string | null;
  role: string;
  roleDefinition?: FarmRole | null;
  permissions: string[];
  isActive: boolean;
  isOwner: boolean;
  createdAt: string;
}

/**
 * Livestock & Flocks
 */
export type FlockType = "BROILER" | "LAYER" | "MIXED";
export type FlockStatus = "ACTIVE" | "SOLD" | "DEPLETED";

export interface Flock {
  id: string;
  farmId: string;
  code?: string | null;
  buildingId?: string | null;
  buildingName?: string | null;
  name: string;
  type: FlockType;
  breed: string;
  initialQuantity: number;
  currentQuantity: number;
  startDate: string;
  expectedEndDate?: string | null;
  status: FlockStatus;
  notes?: string | null;
  mortalityCount?: number;
  mortalityRate?: number;
}

export type MovementType = "MORTALITY" | "SALE" | "CULL" | "TRANSFER";

export interface FlockMovement {
  id: string;
  flockId: string;
  type: MovementType;
  quantity: number;
  date: string;
  reason?: string | null;
  notes?: string | null;
  createdAt: string;
}

/**
 * Egg Production
 */
export type EggSession = "MORNING" | "NOON" | "EVENING";

export interface EggProduction {
  id: string;
  flockId: string;
  flockName?: string | null;
  date: string;
  session: EggSession;
  goodEggs: number;
  brokenEggs: number;
  abnormalEggs: number;
  totalEggs: number;
  traysCount: number;
  looseEggs: number;
  notes?: string | null;
  createdAt: string;
}

/**
 * Inventory
 */
export type InventoryCategory = "FEED" | "VACCINE" | "MEDICINE" | "EQUIPMENT" | "OTHER";
export type StockMovementType = "IN" | "OUT" | "ADJUSTMENT";

export interface InventoryItem {
  id: string;
  farmId: string;
  name: string;
  sku: string;
  category: InventoryCategory;
  unit: string;
  unitLabel?: string;
  unitShortLabel?: string;
  unitFamily?: string;
  minThreshold: number;
  currentStock: number;
  unitCostFcfa: number;
  totalValueFcfa?: number;
  isLowStock?: boolean;
}

export interface StockMovement {
  id: string;
  itemId: string;
  itemName?: string | null;
  type: StockMovementType;
  quantity: number;
  unit?: string;
  unitLabel?: string;
  unitShortLabel?: string;
  unitPriceFcfa: number;
  reason?: string | null;
  date: string;
  createdAt: string;
}

/**
 * Finance
 */
export type TransactionType = "INCOME" | "EXPENSE";
export type PaymentMethod =
  | "CASH"
  | "MTN_MOMO"
  | "MOOV_MONEY"
  | "CELTIIS_CASH"
  | "BANK_TRANSFER"
  | "CHECK";

export interface Transaction {
  id: string;
  farmId: string;
  flockId?: string | null;
  flockName?: string | null;
  type: TransactionType;
  category: string;
  amountFcfa: number;
  paymentMethod: PaymentMethod;
  reference?: string | null;
  date: string;
  notes?: string | null;
  createdAt: string;
}

/**
 * Dashboard KPI
 */
export interface DashboardKPI {
  liveBirdsTotal: number;
  activeFlocksCount: number;
  mortalityRateGlobal: number;
  eggProductionToday: {
    totalEggs: number;
    traysCount: number;
    looseEggs: number;
    layingRatePercent: number;
  };
  inventoryAlertsCount: number;
  financialSummary: {
    revenueFcfa: number;
    expenseFcfa: number;
    netCashflowFcfa: number;
  };
}

/**
 * Developer API Key
 */
export interface DeveloperApiKey {
  id: string;
  name: string;
  prefix: string;
  environment: "live" | "test";
  lastUsedAt?: string | null;
  createdAt: string;
  rawKey?: string; // only present upon creation
}
