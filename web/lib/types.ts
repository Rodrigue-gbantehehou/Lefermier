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
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  ifu?: string | null;
  rccm?: string | null;
  description?: string | null;
  surfaceAreaM2?: number | null;
  status: string;
  createdAt: string;
  userRole?: string | null;
  roleName?: string | null;
  permissions?: string[];
  subscription?: FarmSubscription | null;
}

export interface FarmSubscription {
  plan: string;
  planName: string;
  tier?: string | null;
  badge?: string | null;
  modules: string[];
  quotas: {
    maxFarms?: number;
    maxFlocks?: number;
    maxMembers?: number;
    maxBuildings?: number;
    retentionMonths?: number;
  };
  status?: string;
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
  strain?: string | null;
  initialQuantity: number;
  currentQuantity: number;
  initialAgeDays?: number;
  ageInDays?: number;
  ageInWeeks?: number;
  startDate: string;
  expectedEndDate?: string | null;
  actualEndDate?: string | null;
  status: FlockStatus;
  notes?: string | null;
  mortalityCount?: number;
  mortalityRate?: number;
  movements?: FlockMovement[];
}

export type MovementType = "MORTALITY" | "SALE" | "CULL" | "TRANSFER" | "ADJUSTMENT";

export interface FlockMovement {
  id: string;
  flockId: string;
  type: MovementType;
  quantity: number;
  date: string;
  reason?: string | null;
  notes?: string | null;
  recordedBy?: string | null;
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
  customCategory?: string | null;
  unit: string;
  unitLabel?: string;
  unitShortLabel?: string;
  unitFamily?: string;
  minThreshold: number;
  currentStock: number;
  packageWeightKg?: number;
  unitCostFcfa: number;
  totalValueFcfa?: number;
  isLowStock?: boolean;
  notes?: string | null;
  isActive?: boolean;
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
  totalCostFcfa?: number;
  reason?: string | null;
  date: string;
  flock?: { id: string; code: string; name: string } | null;
  recordedBy?: { id: string; name: string } | null;
  createdAt: string;
}

/**
 * Contacts & Tiers (Clients, Fournisseurs, Vétérinaires, Revendeuses)
 */
export type ContactType = "CLIENT" | "SUPPLIER" | "BOTH";

export interface Contact {
  id: string;
  farmId: string;
  name: string;
  type: ContactType;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Finance
 */
export type TransactionType = "INCOME" | "EXPENSE";
export type PaymentStatus = "PAID" | "PARTIAL" | "UNPAID";
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
  contactId?: string | null;
  contact?: {
    id: string;
    name: string;
    type: ContactType;
    phone?: string | null;
  } | null;
  type: TransactionType;
  category: string;
  amountFcfa: number;
  paymentStatus?: PaymentStatus;
  paidAmountFcfa?: number;
  paidAmount?: number;
  remainingAmountFcfa?: number;
  remainingAmount?: number;
  dueDate?: string | null;
  isOverdue?: boolean;
  paymentMethod: PaymentMethod;
  reference?: string | null;
  date: string;
  notes?: string | null;
  createdAt: string;
}

/**
 * Quotas & Dashboard Subscription
 */
export interface QuotaMetric {
  current: number;
  max: number;
  percent: number;
  isExceeded: boolean;
  isUnlimited: boolean;
}

export interface DashboardSubscription {
  plan: string;
  planName: string;
  tier: string;
  badge?: string | null;
  status: string;
  modules: string[];
  quotas: {
    flocks: QuotaMetric;
    buildings: QuotaMetric;
    farms: QuotaMetric;
    members: QuotaMetric;
  };
  isOverQuota: boolean;
}

export interface DashboardHealthOverview {
  hasAccess: boolean;
  pendingCount: number;
  overdueCount: number;
  upcomingTreatments: Array<{
    id: string;
    title: string;
    flockName: string;
    type: string;
    scheduledDate: string;
    status: string;
  }>;
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
  hasEggAccess?: boolean;
  inventoryAlertsCount: number;
  hasInventoryAccess?: boolean;
  financialSummary: {
    revenueFcfa: number;
    expenseFcfa: number;
    netCashflowFcfa: number;
  };
  hasFinanceAccess?: boolean;
  subscription?: DashboardSubscription;
  health?: DashboardHealthOverview;
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

/**
 * Health & Prophylaxis types
 */
export type HealthTreatmentType =
  | "VACCINATION"
  | "TREATMENT"
  | "DEWORMING"
  | "VITAMIN"
  | "DISINFECTION"
  | "OTHER";

export type AdministrationMethod =
  | "DRINKING_WATER"
  | "INJECTION"
  | "OCULAR_NASAL"
  | "SPRAY"
  | "FEED"
  | "TOPICAL"
  | "OTHER";

export type HealthTreatmentStatus =
  | "SCHEDULED"
  | "COMPLETED"
  | "CANCELLED"
  | "MISSED";

export interface HealthTreatment {
  id: string;
  title: string;
  type: HealthTreatmentType;
  typeLabel: string;
  administrationMethod: AdministrationMethod;
  administrationMethodLabel: string;
  targetAgeDays: number;
  scheduledDate: string;
  administeredDate?: string | null;
  status: HealthTreatmentStatus;
  statusLabel: string;
  isOverdue: boolean;
  quantityUsed?: string | null;
  costFcfa?: number | null;
  veterinarian?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  flock: {
    id: string;
    code: string;
    name: string;
    poultryType: string;
    currentQuantity: number;
    currentAgeDays: number;
  };
  inventoryItem?: {
    id: string;
    name: string;
    category: string;
    unit: string;
    unitPrice?: number | null;
  } | null;
  recordedBy?: {
    id: string;
    fullName: string;
  } | null;
}
