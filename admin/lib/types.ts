/**
 * Définition des types et interfaces TypeScript du domaine Administration Lefermier.
 * Conforme à docs/ADMIN_API_REFERENCE.md et admin/ADMIN_RULES.md.
 */

export interface PlatformStats {
  users: {
    total: number;
    active: number;
    inactive: number;
  };
  organizations: {
    total: number;
    active: number;
    suspended: number;
    trial: number;
  };
  farms: {
    total: number;
  };
  flocks: {
    total: number;
  };
}

export type OrganizationStatus = "ACTIVE" | "SUSPENDED" | "TRIAL";

export type SubscriptionPlan = string;

export interface FarmSummary {
  id: string;
  name: string;
  code: string;
  productionType: string;
  currency: string;
  locationCity: string;
  locationCountry: string;
  membersCount: number;
  createdAt: string;
}

export interface OrganizationMember {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  farms: Array<{
    id: string;
    name: string;
    role: string;
    isActive: boolean;
  }>;
}

export interface OrganizationItem {
  id: string;
  name: string;
  slug: string;
  subscriptionPlan: string;
  status: OrganizationStatus;
  farmsCount: number;
  farms: FarmSummary[];
  members?: OrganizationMember[];
  createdAt: string;
  updatedAt: string;
}

export interface UserFarmMembership {
  id: string;
  name: string;
  role: string;
  organization: string;
}

export interface UserItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string | null;
  roles: string[];
  isActive: boolean;
  adminRole?: {
    id: string;
    name: string;
    code: string;
  } | null;
  adminPermissions?: string[];
  farmsCount: number;
  farms: UserFarmMembership[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResult<T> {
  status: string;
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface HealthStatus {
  php_version: string;
  symfony_version: string;
  memory_usage_mb: number;
  memory_peak_mb: number;
  database: {
    connected: boolean;
    latency_ms: number | null;
    driver?: string;
    error?: string | null;
  };
  server_time: string;
}

export interface PermissionMeta {
  module: string;
  label: string;
  description: string;
}

export interface AdminRoleItem {
  id: string;
  name: string;
  code: string;
  description: string | null;
  permissions: string[];
  isSystem: boolean;
  usersCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdminRolePayload {
  name: string;
  code: string;
  permissions: string[];
  description?: string;
}

export interface UpdateAdminRolePayload {
  name?: string;
  permissions?: string[];
  description?: string;
}

export type OfferStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type BillingCycle = "MONTHLY" | "ANNUALLY";

export interface PlatformModuleMeta {
  key: string;
  category: string;
  categoryKey: string;
  label: string;
  description: string;
  icon: string;
  permissions: string[];
}

export interface PlatformModuleGroup {
  key: string;
  category: string;
  modules: PlatformModuleMeta[];
}

export interface PlanQuotas {
  maxFarms: number;
  maxFlocks: number;
  maxMembers: number;
  maxBuildings: number;
  retentionMonths: number;
}

export interface PlanFlags {
  accountingExports: boolean;
  healthAlerts: boolean;
  iotSensors: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
}

export interface CommercialPlan {
  id?: string;
  sku: string;
  name: string;
  tier: string;
  badge?: string | null;
  description?: string | null;
  priceMonthly: number;
  priceAnnually: number;
  currency: string;
  status: OfferStatus;
  availableFrom?: string | null;
  availableTo?: string | null;
  isAvailable?: boolean;
  isVisibilityPublic: boolean;
  trialDays: number;
  allowedBillingCycles: BillingCycle[];
  modules: string[];
  quotas: PlanQuotas;
  features: string[];
  flags: PlanFlags;
  isPopular: boolean;
  isRecommended: boolean;
  isActive?: boolean;
  isSystem?: boolean;
  version?: number;
  subscribersCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePlanPayload {
  sku: string;
  name: string;
  tier: string;
  badge?: string;
  description?: string;
  priceMonthly: number;
  priceAnnually: number;
  currency?: string;
  status?: OfferStatus;
  availableFrom?: string | null;
  availableTo?: string | null;
  isVisibilityPublic?: boolean;
  trialDays?: number;
  allowedBillingCycles?: BillingCycle[];
  modules?: string[];
  quotas: PlanQuotas;
  features: string[];
  flags?: PlanFlags;
  isPopular?: boolean;
  isRecommended?: boolean;
}

export interface UpdatePlanPayload {
  name?: string;
  tier?: string;
  badge?: string;
  description?: string;
  priceMonthly?: number;
  priceAnnually?: number;
  currency?: string;
  status?: OfferStatus;
  availableFrom?: string | null;
  availableTo?: string | null;
  isVisibilityPublic?: boolean;
  trialDays?: number;
  allowedBillingCycles?: BillingCycle[];
  modules?: string[];
  quotas?: Partial<PlanQuotas>;
  features?: string[];
  flags?: Partial<PlanFlags>;
  isPopular?: boolean;
  isRecommended?: boolean;
  isActive?: boolean;
}

export interface SubscriptionUsageMeter {
  current: number;
  max: number;
  percent: number;
  isUnlimited: boolean;
}

export interface SubscriptionItem {
  id: string;
  name: string;
  slug: string;
  status: OrganizationStatus;
  farms?: Array<{
    id: string;
    name: string;
    code?: string | null;
  }>;
  plan: {
    sku: string;
    name: string;
    tier: string;
    priceMonthly: number;
    priceAnnually: number;
    currency: string;
  };
  billingCycle: string;
  monthlyAmount: number;
  renewalDate: string;
  createdAt: string;
  usage: {
    farms: SubscriptionUsageMeter;
    flocks: SubscriptionUsageMeter;
    members: SubscriptionUsageMeter;
  };
  isOverQuota: boolean;
}

export interface FinancialMetrics {
  totalSubscriptions: number;
  activeSubscriptions: number;
  paidSubscriptions: number;
  trialSubscriptions: number;
  suspendedSubscriptions: number;
  conversionRate: number;
  mrr: {
    amount: number;
    currency: string;
    formatted: string;
  };
  arr: {
    amount: number;
    currency: string;
    formatted: string;
  };
  bySku: Record<string, { count: number; mrr: number }>;
}

export interface AuditActor {
  id?: string | null;
  fullName: string;
  email: string;
  role: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  actor: AuditActor;
  action: string;
  label: string;
  targetType: string;
  targetId: string;
  targetName: string;
  clientIp: string;
  status: string;
  details: string;
}

export interface SubscriptionUpgradeRequestItem {
  id: string;
  farmId: string;
  farmName: string;
  organizationId: string;
  organizationName: string;
  userId: string;
  userName: string;
  userEmail: string;
  currentPlan: string;
  targetPlan: string;
  targetPlanName: string;
  billingCycle: string;
  message?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNotes?: string | null;
  processedByName?: string | null;
  createdAt: string;
  processedAt?: string | null;
}
