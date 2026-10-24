"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  CreditCard,
  Building2,
  Check,
  TrendingUp,
  Coins,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  Layers,
  ArrowUpRight,
  AlertTriangle,
  Calendar,
  Users,
  Warehouse,
  ChevronRight,
  ExternalLink,
  SlidersHorizontal,
  Info,
  CheckCircle2,
  Clock,
  Ban,
  Plus,
  Edit3,
  Trash2,
  Copy,
  Eye,
  Lock,
  Globe,
  Archive,
  BarChart3,
  Package,
  Wallet,
  ShieldAlert,
  Bird,
  Egg,
  Cpu,
  Contact,
  X,
} from "lucide-react";
import {
  adminApi,
  CommercialPlan,
  CreatePlanPayload,
  FinancialMetrics,
  OfferStatus,
  BillingCycle,
  PlatformModuleGroup,
  SubscriptionItem,
  OrganizationStatus,
  UpdatePlanPayload,
} from "@/lib/api-client";
import { AdminHeader } from "@/components/admin-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { formatNumber, formatDate } from "@/lib/utils";
import { useAdminAuth } from "@/context/admin-auth-context";

// Modules par défaut du backend si l'API est indisponible
const DEFAULT_MODULE_GROUPS: PlatformModuleGroup[] = [
  {
    key: "production",
    category: "Volailles & Lots",
    modules: [
      {
        key: "flocks",
        category: "Volailles & Lots",
        categoryKey: "production",
        label: "Lots & Volailles",
        description: "Suivi des effectifs, mortalité, réformes et pesées.",
        icon: "Bird",
        permissions: ["flock:view", "flock:create", "flock:movement"],
      },
      {
        key: "eggs",
        category: "Volailles & Lots",
        categoryKey: "production",
        label: "Ramassage des œufs",
        description: "Collecte quotidienne, calibrage, alvéoles de 30 et taux de ponte.",
        icon: "Egg",
        permissions: ["egg:view", "egg:create"],
      },
    ],
  },
  {
    key: "health",
    category: "Santé & Soins",
    modules: [
      {
        key: "health",
        category: "Santé & Soins",
        categoryKey: "health",
        label: "Soins & Vaccins",
        description: "Vaccinations, ordonnances et registre des soins vétérinaires.",
        icon: "ShieldAlert",
        permissions: ["health:view", "health:manage"],
      },
      {
        key: "prophylaxis_program",
        category: "Santé & Soins",
        categoryKey: "health",
        label: "Programmes Vaccinaux 1-Clic",
        description: "Génération automatique du calendrier prophylactique selon la souche.",
        icon: "Zap",
        permissions: ["health:manage"],
      },
      {
        key: "health_alerts",
        category: "Santé & Soins",
        categoryKey: "health",
        label: "Alertes Automatiques de Mortalité",
        description: "Notification dès que la mortalité d'un lot dépasse le seuil critique.",
        icon: "HeartPulse",
        permissions: ["health:view"],
      },
    ],
  },
  {
    key: "inventory",
    category: "Stocks & Aliments",
    modules: [
      {
        key: "inventory",
        category: "Stocks & Aliments",
        categoryKey: "inventory",
        label: "Stocks & Aliments",
        description: "Sacs d'aliments, produits vétérinaires et alertes de stock bas.",
        icon: "Package",
        permissions: ["inventory:view", "inventory:create", "inventory:movement"],
      },
      {
        key: "inventory_valuation",
        category: "Stocks & Aliments",
        categoryKey: "inventory",
        label: "Valeur du stock",
        description: "Estimation financière de la valeur totale du magasin en FCFA.",
        icon: "Coins",
        permissions: ["inventory:valuation"],
      },
      {
        key: "feed_rationing",
        category: "Stocks & Aliments",
        categoryKey: "inventory",
        label: "Rationnement & Indice de Consommation",
        description: "Consommation journalière par sujet et calcul de l'indice de conversion (IC / FCR).",
        icon: "Scale",
        permissions: ["inventory:view", "inventory:movement"],
      },
    ],
  },
  {
    key: "finance",
    category: "Finances & Caisse",
    modules: [
      {
        key: "finance",
        category: "Finances & Caisse",
        categoryKey: "finance",
        label: "Caisse & Ventes",
        description: "Ventes d'œufs et volailles, dépenses et caisse en FCFA.",
        icon: "Wallet",
        permissions: ["finance:view", "finance:create"],
      },
      {
        key: "finance_margin",
        category: "Finances & Caisse",
        categoryKey: "finance",
        label: "Marges & Bénéfices",
        description: "Coût de revient et calcul de la marge nette bénéficiaire par lot.",
        icon: "TrendingUp",
        permissions: ["finance:margin"],
      },
      {
        key: "credit_debt",
        category: "Finances & Caisse",
        categoryKey: "finance",
        label: "Créances & Dettes",
        description: "Suivi des impayés revendeuses du marché et dettes de provenderie.",
        icon: "Clock",
        permissions: ["finance:view"],
      },
      {
        key: "sales_receipts",
        category: "Finances & Caisse",
        categoryKey: "finance",
        label: "Reçus & Factures Imprimables",
        description: "Édition de reçus de vente et factures prêts à imprimer avec IFU.",
        icon: "Receipt",
        permissions: ["finance:view", "finance:create"],
      },
      {
        key: "reports_accounting",
        category: "Finances & Caisse",
        categoryKey: "finance",
        label: "Exports Comptables & SYSCOHADA",
        description: "Grand livre, journaux d'achats et ventes conformes SYSCOHADA (CSV/PDF).",
        icon: "FileSpreadsheet",
        permissions: ["finance:view"],
      },
    ],
  },
  {
    key: "commercial",
    category: "Clients & Fournisseurs",
    modules: [
      {
        key: "contacts",
        category: "Clients & Fournisseurs",
        categoryKey: "commercial",
        label: "Clients & Fournisseurs",
        description: "Contacts des acheteurs, revendeuses du marché et provenderies avec IFU.",
        icon: "Contact",
        permissions: ["contact:view", "contact:create"],
      },
    ],
  },
  {
    key: "infra",
    category: "Bâtiments & Fermes",
    modules: [
      {
        key: "buildings",
        category: "Bâtiments & Fermes",
        categoryKey: "infra",
        label: "Bâtiments d'élevage",
        description: "Poulaillers, poussinières, capacités et suivi des vides sanitaires.",
        icon: "Warehouse",
        permissions: ["building:manage"],
      },
      {
        key: "performance_benchmark",
        category: "Bâtiments & Fermes",
        categoryKey: "infra",
        label: "Comparatifs Inter-Bâtiments",
        description: "Comparaison des rendements et taux de ponte entre poulaillers.",
        icon: "Layers",
        permissions: ["dashboard:financials"],
      },
    ],
  },
  {
    key: "team",
    category: "Équipe & Accès",
    modules: [
      {
        key: "team",
        category: "Équipe & Accès",
        categoryKey: "team",
        label: "Équipe & Collaborateurs",
        description: "Comptes pour employés, gérants et comptables avec rôles.",
        icon: "Users",
        permissions: ["member:manage"],
      },
      {
        key: "custom_roles",
        category: "Équipe & Accès",
        categoryKey: "team",
        label: "Rôles Sur-Mesure & RBAC Avancé",
        description: "Création de rôles personnalisés avec matrice de 22 permissions.",
        icon: "ShieldCheck",
        permissions: ["role:manage"],
      },
    ],
  },
  {
    key: "analytics",
    category: "Analyses & Alertes",
    modules: [
      {
        key: "dashboard_advanced",
        category: "Analyses & Alertes",
        categoryKey: "analytics",
        label: "Analyses & Alertes Avancées",
        description: "Courbes de ponte hebdomadaires et indicateurs consolidés.",
        icon: "BarChart3",
        permissions: ["dashboard:financials"],
      },
    ],
  },
  {
    key: "integrations",
    category: "API & Capteurs",
    modules: [
      {
        key: "api_iot",
        category: "API & Capteurs",
        categoryKey: "integrations",
        label: "API & Capteurs Connectés",
        description: "Capteurs connectés IoT et clés API développeur pour logiciels tiers.",
        icon: "Cpu",
        permissions: ["api_key:manage"],
      },
    ],
  },
  {
    key: "services",
    category: "Assistance & Services",
    modules: [
      {
        key: "priority_support",
        category: "Assistance & Services",
        categoryKey: "services",
        label: "Support Prioritaire WhatsApp & Téléphone",
        description: "Assistance zootechnique dédiée, ligne directe WhatsApp et support réactif.",
        icon: "Headphones",
        permissions: ["farm:view"],
      },
    ],
  },
];

export default function SubscriptionsPage() {
  const { hasPermission } = useAdminAuth();
  const canManageSubscriptions = hasPermission("admin:subscriptions:manage");

  // Vue active : "offers" (Fiches d'offres - Principale) | "subscriptions" (Clients abonnés) | "analytics" (MRR/ARR)
  const [activeView, setActiveView] = useState<"offers" | "subscriptions" | "analytics">("offers");

  const [plans, setPlans] = useState<CommercialPlan[]>([]);
  const [moduleGroups, setModuleGroups] = useState<PlatformModuleGroup[]>(DEFAULT_MODULE_GROUPS);
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Filtres catalogue des offres
  const [offerSearch, setOfferSearch] = useState("");
  const [offerStatusFilter, setOfferStatusFilter] = useState<string>("ALL");
  const [offerVisibilityFilter, setOfferVisibilityFilter] = useState<string>("ALL");

  // Filtres souscriptions clients
  const [subSearch, setSubSearch] = useState("");
  const [subStatusFilter, setSubStatusFilter] = useState<string>("");
  const [subPlanFilter, setSubPlanFilter] = useState<string>("");

  // Modale Création / Modification d'une offre (par sections)
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<"general" | "pricing" | "visibility" | "modules" | "quotas">("general");
  const [editingPlan, setEditingPlan] = useState<CommercialPlan | null>(null);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [planModalError, setPlanModalError] = useState<string | null>(null);

  // État du formulaire d'offre
  const initialPlanForm = {
    sku: "",
    name: "",
    tier: "Professionnel",
    badge: "",
    description: "",
    priceMonthly: 15000,
    priceAnnually: 150000,
    currency: "XOF",
    status: "PUBLISHED" as OfferStatus,
    isPermanent: true,
    availableFromDate: "",
    availableToDate: "",
    isVisibilityPublic: true,
    trialDays: 14,
    allowMonthly: true,
    allowAnnually: true,
    selectedModules: [
      "flocks",
      "eggs",
      "inventory",
      "inventory_valuation",
      "health",
      "finance",
      "finance_margin",
      "contacts",
      "buildings",
      "team",
      "dashboard_advanced",
    ],
    maxFarms: 3,
    maxFarmsUnlimited: false,
    maxFlocks: 10,
    maxFlocksUnlimited: false,
    maxMembers: 5,
    maxMembersUnlimited: false,
    maxBuildings: 6,
    maxBuildingsUnlimited: false,
    retentionMonths: 12,
    featuresText: "Suivi des lots et mortalité\nCollecte et calibrage des œufs\nGestion des stocks et magasins\nCalcul de rentabilité et marges\nSupport email réactif sous 24h",
    isPopular: false,
    isRecommended: false,
  };

  const [planForm, setPlanForm] = useState(initialPlanForm);

  // Modale d'Aperçu Haute Fidélité (Preview)
  const [previewPlan, setPreviewPlan] = useState<CommercialPlan | null>(null);
  const [previewBillingCycle, setPreviewBillingCycle] = useState<BillingCycle>("MONTHLY");

  // Modale d'attribution / modification de souscription client
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionItem | null>(null);
  const [newPlanSku, setNewPlanSku] = useState<string>("");
  const [newStatus, setNewStatus] = useState<OrganizationStatus>("ACTIVE");
  const [isUpdatingSub, setIsUpdatingSub] = useState(false);
  const [subModalError, setSubModalError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const [plansData, modulesData, metricsData, subsData] = await Promise.all([
        adminApi.subscriptions.getPlans(),
        adminApi.subscriptions.getModules().catch(() => DEFAULT_MODULE_GROUPS),
        adminApi.subscriptions.getMetrics().catch(() => null),
        adminApi.subscriptions.list({
          status: subStatusFilter || undefined,
          plan: subPlanFilter || undefined,
          search: subSearch || undefined,
        }).catch(() => ({ data: [], total: 0 })),
      ]);

      setPlans(plansData);
      if (modulesData && modulesData.length > 0) {
        setModuleGroups(modulesData);
      }
      setMetrics(metricsData);
      setSubscriptions(subsData.data || []);
    } catch (err: unknown) {
      setApiError(
        (err as Error).message || "Impossible de joindre le serveur API Symfony sur http://127.0.0.1:8000."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [subStatusFilter, subPlanFilter]);

  // Filtrage des fiches d'offres
  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      // Recherche nom ou SKU
      if (offerSearch.trim()) {
        const q = offerSearch.toLowerCase();
        const matches =
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.tier.toLowerCase().includes(q);
        if (!matches) return false;
      }
      // Filtre statut
      if (offerStatusFilter !== "ALL" && p.status !== offerStatusFilter) {
        return false;
      }
      // Filtre visibilité
      if (offerVisibilityFilter === "PUBLIC" && !p.isVisibilityPublic) return false;
      if (offerVisibilityFilter === "PRIVATE" && p.isVisibilityPublic) return false;

      return true;
    });
  }, [plans, offerSearch, offerStatusFilter, offerVisibilityFilter]);

  // Ouverture du formulaire de création
  const openCreatePlanModal = () => {
    setEditingPlan(null);
    setPlanForm(initialPlanForm);
    setActiveSection("general");
    setPlanModalError(null);
    setIsPlanModalOpen(true);
  };

  // Ouverture du formulaire d'édition
  const openEditPlanModal = (plan: CommercialPlan) => {
    setEditingPlan(plan);

    const fromDate = plan.availableFrom ? plan.availableFrom.substring(0, 10) : "";
    const toDate = plan.availableTo ? plan.availableTo.substring(0, 10) : "";
    const isPerm = !plan.availableFrom && !plan.availableTo;

    const allowed = plan.allowedBillingCycles || ["MONTHLY", "ANNUALLY"];
    const allowM = allowed.includes("MONTHLY");
    const allowA = allowed.includes("ANNUALLY");

    setPlanForm({
      sku: plan.sku,
      name: plan.name,
      tier: plan.tier,
      badge: plan.badge || "",
      description: plan.description || "",
      priceMonthly: plan.priceMonthly,
      priceAnnually: plan.priceAnnually,
      currency: plan.currency || "XOF",
      status: plan.status || "PUBLISHED",
      isPermanent: isPerm,
      availableFromDate: fromDate,
      availableToDate: toDate,
      isVisibilityPublic: plan.isVisibilityPublic ?? true,
      trialDays: plan.trialDays ?? 0,
      allowMonthly: allowM,
      allowAnnually: allowA,
      selectedModules: plan.modules && plan.modules.length > 0 ? plan.modules : initialPlanForm.selectedModules,
      maxFarms: plan.quotas.maxFarms >= 9999 ? 10 : plan.quotas.maxFarms,
      maxFarmsUnlimited: plan.quotas.maxFarms >= 9999,
      maxFlocks: plan.quotas.maxFlocks >= 9999 ? 20 : plan.quotas.maxFlocks,
      maxFlocksUnlimited: plan.quotas.maxFlocks >= 9999,
      maxMembers: plan.quotas.maxMembers >= 9999 ? 10 : plan.quotas.maxMembers,
      maxMembersUnlimited: plan.quotas.maxMembers >= 9999,
      maxBuildings: (plan.quotas.maxBuildings ?? 2) >= 9999 ? 10 : (plan.quotas.maxBuildings ?? 2),
      maxBuildingsUnlimited: (plan.quotas.maxBuildings ?? 2) >= 9999,
      retentionMonths: plan.quotas.retentionMonths,
      featuresText: plan.features.join("\n"),
      isPopular: !!plan.isPopular,
      isRecommended: !!plan.isRecommended,
    });

    setActiveSection("general");
    setPlanModalError(null);
    setIsPlanModalOpen(true);
  };

  // Toggle d'un module accessible
  const handleToggleModule = (moduleKey: string) => {
    setPlanForm((prev) => {
      const exists = prev.selectedModules.includes(moduleKey);
      if (exists) {
        return {
          ...prev,
          selectedModules: prev.selectedModules.filter((k) => k !== moduleKey),
        };
      } else {
        return {
          ...prev,
          selectedModules: [...prev.selectedModules, moduleKey],
        };
      }
    });
  };

  // Cocher/Décocher tous les modules d'une catégorie
  const handleToggleCategoryModules = (categoryModules: string[], checkAll: boolean) => {
    setPlanForm((prev) => {
      if (checkAll) {
        const combined = Array.from(new Set([...prev.selectedModules, ...categoryModules]));
        return { ...prev, selectedModules: combined };
      } else {
        return {
          ...prev,
          selectedModules: prev.selectedModules.filter((k) => !categoryModules.includes(k)),
        };
      }
    });
  };

  // Calcul automatique annuel (2 mois offerts)
  const applyAnnualDiscount = () => {
    const discounted = Math.round(planForm.priceMonthly * 10);
    setPlanForm((prev) => ({ ...prev, priceAnnually: discounted }));
  };

  // Sauvegarde d'une offre (création ou mise à jour non destructive)
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.name.trim()) {
      setPlanModalError("Le nom de l'offre commerciale est obligatoire.");
      return;
    }
    if (!editingPlan && !planForm.sku.trim()) {
      setPlanModalError("Le code technique SKU est obligatoire (ex: ELEVAGE_PRO).");
      return;
    }

    if (!planForm.allowMonthly && !planForm.allowAnnually) {
      setPlanModalError("Vous devez autoriser au moins une période de facturation (mensuelle ou annuelle).");
      return;
    }

    setIsSavingPlan(true);
    setPlanModalError(null);

    const allowedBilling: BillingCycle[] = [];
    if (planForm.allowMonthly) allowedBilling.push("MONTHLY");
    if (planForm.allowAnnually) allowedBilling.push("ANNUALLY");

    const payload: CreatePlanPayload = {
      sku: planForm.sku.trim().toUpperCase(),
      name: planForm.name.trim(),
      tier: planForm.tier.trim(),
      badge: planForm.badge.trim() || undefined,
      description: planForm.description.trim() || undefined,
      priceMonthly: Number(planForm.priceMonthly),
      priceAnnually: Number(planForm.priceAnnually),
      currency: planForm.currency,
      status: planForm.status,
      availableFrom: !planForm.isPermanent && planForm.availableFromDate ? `${planForm.availableFromDate}T00:00:00Z` : null,
      availableTo: !planForm.isPermanent && planForm.availableToDate ? `${planForm.availableToDate}T23:59:59Z` : null,
      isVisibilityPublic: planForm.isVisibilityPublic,
      trialDays: Number(planForm.trialDays),
      allowedBillingCycles: allowedBilling,
      modules: planForm.selectedModules,
      quotas: {
        maxFarms: planForm.maxFarmsUnlimited ? 9999 : Number(planForm.maxFarms),
        maxFlocks: planForm.maxFlocksUnlimited ? 9999 : Number(planForm.maxFlocks),
        maxMembers: planForm.maxMembersUnlimited ? 9999 : Number(planForm.maxMembers),
        maxBuildings: planForm.maxBuildingsUnlimited ? 9999 : Number(planForm.maxBuildings),
        retentionMonths: Number(planForm.retentionMonths),
      },
      features: planForm.featuresText
        .split("\n")
        .map((f) => f.trim())
        .filter((f) => f.length > 0),
      isPopular: planForm.isPopular,
      isRecommended: planForm.isRecommended,
    };

    try {
      if (editingPlan) {
        await adminApi.subscriptions.updatePlan(editingPlan.id || editingPlan.sku, payload as UpdatePlanPayload);
      } else {
        await adminApi.subscriptions.createPlan(payload);
      }

      await fetchData();
      setIsPlanModalOpen(false);
    } catch (err: unknown) {
      setPlanModalError((err as Error).message || "Une erreur est survenue lors de l'enregistrement de l'offre.");
    } finally {
      setIsSavingPlan(false);
    }
  };

  // Duplication d'une offre en brouillon
  const handleDuplicatePlan = async (plan: CommercialPlan) => {
    try {
      const duplicated = await adminApi.subscriptions.duplicatePlan(plan.id || plan.sku);
      await fetchData();
      openEditPlanModal(duplicated);
    } catch (err: unknown) {
      alert((err as Error).message || "Erreur lors de la duplication de l'offre.");
    }
  };

  // Changement rapide de statut (Publier / Archiver)
  const handleQuickStatusChange = async (plan: CommercialPlan, targetStatus: OfferStatus) => {
    try {
      await adminApi.subscriptions.updatePlanStatus(plan.id || plan.sku, targetStatus);
      await fetchData();
    } catch (err: unknown) {
      alert((err as Error).message || "Erreur lors du changement de statut.");
    }
  };

  // Suppression protégée
  const handleDeletePlan = async (plan: CommercialPlan) => {
    const subscribers = plan.subscribersCount ?? 0;
    if (subscribers > 0) {
      const wantArchive = window.confirm(
        `Suppression impossible : Cette offre compte actuellement ${subscribers} client(s) abonné(s).\n\nPour protéger ces clients sans interrompre leur service, voulez-vous plutôt ARCHIVER cette offre ? Elle ne sera plus proposée aux nouveaux clients mais restera active pour les abonnés existants.`
      );
      if (wantArchive) {
        handleQuickStatusChange(plan, "ARCHIVED");
      }
      return;
    }

    if (!window.confirm(`Supprimer définitivement l'offre "${plan.name}" (${plan.sku}) ? Cette action est irréversible.`)) {
      return;
    }

    try {
      await adminApi.subscriptions.deletePlan(plan.id || plan.sku);
      await fetchData();
    } catch (err: unknown) {
      alert((err as Error).message || "Erreur lors de la suppression de l'offre.");
    }
  };

  // Ouvrir aperçu client
  const openPreview = (plan: CommercialPlan) => {
    setPreviewPlan(plan);
    const allowed = plan.allowedBillingCycles || ["MONTHLY", "ANNUALLY"];
    setPreviewBillingCycle(allowed.includes("MONTHLY") ? "MONTHLY" : "ANNUALLY");
  };

  // Gestion des souscriptions d'organisations
  const openManageSubModal = (sub: SubscriptionItem) => {
    setSelectedSubscription(sub);
    setNewPlanSku(sub.plan.sku);
    setNewStatus(sub.status);
    setSubModalError(null);
    setIsSubModalOpen(true);
  };

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubscription) return;

    setIsUpdatingSub(true);
    setSubModalError(null);
    try {
      await adminApi.subscriptions.update(selectedSubscription.id, {
        plan: newPlanSku,
        status: newStatus,
      });

      await fetchData();
      setIsSubModalOpen(false);
    } catch (err: unknown) {
      setSubModalError((err as Error).message || "Erreur lors de la mise à jour de l'abonnement.");
    } finally {
      setIsUpdatingSub(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background">
      <AdminHeader
        title="Offres & Abonnements"
        description="Gestion des offres, tarifs, modules et abonnés."
      />

      <main className="p-6 md:p-8 space-y-6 max-w-7xl">
        {/* Barre d'alerte en cas d'erreur API */}
        {apiError && (
          <div className="p-4 rounded-xl border border-warning/30 bg-warning-soft/70 text-xs text-foreground flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
              <span>{apiError}</span>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData} className="text-xs h-7">
              Réessayer
            </Button>
          </div>
        )}

        {/* Chiffres clés */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Revenus / mois"
            value={metrics?.mrr?.formatted || "0 FCFA"}
            subtitle={metrics?.arr?.formatted ? `Annuel : ${metrics.arr.formatted}` : "Revenus réguliers"}
            icon={<Coins className="h-5 w-5 text-emerald-500" />}
          />
          <StatCard
            title="Offres"
            value={plans.length}
            subtitle={`${plans.filter((p) => p.status === "PUBLISHED").length} actives · ${plans.filter((p) => p.status === "DRAFT").length} brouillons`}
            icon={<Layers className="h-5 w-5 text-primary" />}
          />
          <StatCard
            title="Abonnés payants"
            value={metrics?.paidSubscriptions ?? subscriptions.filter((s) => s.monthlyAmount > 0).length}
            subtitle={`Conversion : ${metrics?.conversionRate ?? 0}%`}
            icon={<CreditCard className="h-5 w-5 text-blue-500" />}
          />
          <StatCard
            title="En essai gratuit"
            value={metrics?.trialSubscriptions ?? subscriptions.filter((s) => s.status === "TRIAL").length}
            subtitle="Comptes en test"
            icon={<Clock className="h-5 w-5 text-amber-500" />}
          />
        </div>

        {/* Barre d'actions & Sélecteur de vue */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
          <div className="flex items-center gap-1.5 p-1 bg-surface-muted/60 border border-border rounded-xl">
            <button
              onClick={() => setActiveView("offers")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeView === "offers"
                  ? "bg-surface text-foreground shadow-xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Offres ({plans.length})
            </button>
            <button
              onClick={() => setActiveView("subscriptions")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeView === "subscriptions"
                  ? "bg-surface text-foreground shadow-xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Abonnés ({subscriptions.length})
            </button>
            <button
              onClick={() => setActiveView("analytics")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeView === "analytics"
                  ? "bg-surface text-foreground shadow-xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Revenus
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              isLoading={isLoading}
              className="gap-1.5 text-xs h-9"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Actualiser</span>
            </Button>

            {canManageSubscriptions && (
              <Button
                variant="default"
                size="sm"
                onClick={openCreatePlanModal}
                className="gap-1.5 text-xs h-9 font-semibold shadow-xs"
              >
                <Plus className="h-4 w-4" />
                <span>Nouvelle offre</span>
              </Button>
            )}
          </div>
        </div>

        {/* VUE 1 : FICHES D'OFFRES */}
        {activeView === "offers" && (
          <div className="space-y-6">
            {/* Barre de recherche et filtres offres */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-surface border border-border">
              <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
                  <Input
                    placeholder="Rechercher une offre..."
                    value={offerSearch}
                    onChange={(e) => setOfferSearch(e.target.value)}
                    className="pl-9 text-xs h-9"
                  />
                </div>

                <select
                  value={offerStatusFilter}
                  onChange={(e) => setOfferStatusFilter(e.target.value)}
                  className="h-9 px-3 rounded-lg border border-border bg-surface text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                >
                  <option value="ALL">Tous les statuts</option>
                  <option value="PUBLISHED">Publiées</option>
                  <option value="DRAFT">Brouillons</option>
                  <option value="ARCHIVED">Archivées</option>
                </select>

                <select
                  value={offerVisibilityFilter}
                  onChange={(e) => setOfferVisibilityFilter(e.target.value)}
                  className="h-9 px-3 rounded-lg border border-border bg-surface text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                >
                  <option value="ALL">Toutes visibilités</option>
                  <option value="PUBLIC">Publiques</option>
                  <option value="PRIVATE">Privées</option>
                </select>
              </div>

              <div className="text-xs text-muted font-medium">
                {filteredPlans.length} offre{filteredPlans.length > 1 ? "s" : ""}
              </div>
            </div>

            {/* Grille des Fiches d'Offres */}
            {filteredPlans.length === 0 ? (
              <EmptyState
                icon={<Layers className="h-8 w-8 text-muted" />}
                title="Aucune offre trouvée"
                description="Modifiez votre recherche ou créez une nouvelle offre."
                className="py-16"
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPlans.map((plan) => {
                  const subscribers = plan.subscribersCount ?? 0;
                  const isDraft = plan.status === "DRAFT";
                  const isArchived = plan.status === "ARCHIVED";
                  const isPublished = plan.status === "PUBLISHED" || (!isDraft && !isArchived);

                  const isExpired = plan.availableTo && new Date(plan.availableTo) < new Date();
                  const isFuture = plan.availableFrom && new Date(plan.availableFrom) > new Date();

                  const activeModulesCount = plan.modules ? plan.modules.length : 0;

                  return (
                    <Card
                      key={plan.sku}
                      className={`flex flex-col justify-between transition-all duration-200 hover:shadow-md relative border ${
                        plan.isRecommended
                          ? "border-primary ring-1 ring-primary/40 bg-surface shadow-xs"
                          : isArchived
                          ? "opacity-80 bg-surface-muted/20 border-border"
                          : isDraft
                          ? "border-dashed border-border bg-surface"
                          : "bg-surface border-border"
                      }`}
                    >
                      {/* En-tête de la fiche */}
                      <CardHeader className="pb-3 border-b border-border/60 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {/* Statut de publication */}
                            {isPublished && (
                              <Badge variant="success" dot className="text-[10px] font-semibold">
                                Publiée
                              </Badge>
                            )}
                            {isDraft && (
                              <Badge variant="secondary" className="text-[10px] font-semibold bg-amber-500/10 text-amber-600 border-amber-500/20">
                                Brouillon
                              </Badge>
                            )}
                            {isArchived && (
                              <Badge variant="destructive" dot className="text-[10px] font-semibold">
                                Archivée
                              </Badge>
                            )}

                            {/* Badge visibilité */}
                            {plan.isVisibilityPublic ? (
                              <span className="text-[10px] font-medium text-muted flex items-center gap-1 bg-surface-muted px-1.5 py-0.5 rounded">
                                <Globe className="h-2.5 w-2.5" />
                                Publique
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-amber-600 flex items-center gap-1 bg-amber-500/10 px-1.5 py-0.5 rounded">
                                <Lock className="h-2.5 w-2.5" />
                                Privée
                              </span>
                            )}

                            {/* Badge marketing */}
                            {plan.badge && (
                              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-primary border-primary/30">
                                {plan.badge}
                              </Badge>
                            )}
                          </div>

                          {/* Version & Abonnés */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] font-mono text-muted bg-surface-muted/80 px-1.5 py-0.5 rounded">
                              v{plan.version ?? 1}
                            </span>
                            <Badge
                              variant={subscribers > 0 ? "secondary" : "outline"}
                              className="text-[10px] font-semibold gap-1"
                              title={`${subscribers} organisation(s) abonnée(s)`}
                            >
                              <Users className="h-2.5 w-2.5" />
                              {subscribers}
                            </Badge>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-baseline justify-between gap-2">
                            <CardTitle className="text-lg font-bold text-foreground">
                              {plan.name}
                            </CardTitle>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                              {plan.tier}
                            </span>
                            <span className="text-[11px] font-mono text-muted bg-surface-muted px-1.5 py-0.2 rounded border border-border/50">
                              SKU: {plan.sku}
                            </span>
                          </div>
                          {plan.description && (
                            <p className="text-xs text-muted line-clamp-2 mt-2 leading-relaxed">
                              {plan.description}
                            </p>
                          )}
                        </div>
                      </CardHeader>

                      {/* Corps : Tarification & Règles temporelles */}
                      <CardContent className="p-4 space-y-4 flex-1">
                        {/* Bloc Prix */}
                        <div className="p-3 rounded-xl bg-surface-muted/40 border border-border/70 flex items-baseline justify-between">
                          <div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-black text-foreground tracking-tight">
                                {formatNumber(plan.priceMonthly)}
                              </span>
                              <span className="text-xs font-bold text-muted">
                                {plan.currency || "FCFA"}
                              </span>
                              <span className="text-xs text-muted">/ mois</span>
                            </div>
                            {plan.priceAnnually > 0 && (
                              <p className="text-[11px] text-muted mt-0.5">
                                ou {formatNumber(plan.priceAnnually)} {plan.currency || "FCFA"} / an
                              </p>
                            )}
                          </div>

                          <div className="text-right">
                            {plan.trialDays > 0 ? (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                {plan.trialDays}j d'essai gratuit
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted block">Sans essai gratuit</span>
                            )}
                            <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-muted">
                              {(plan.allowedBillingCycles || ["MONTHLY", "ANNUALLY"]).map((c) => (
                                <span key={c} className="font-mono uppercase">
                                  {c === "MONTHLY" ? "Mois" : "An"}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Durée de validité de l'offre */}
                        <div className="text-xs space-y-1 p-2.5 rounded-lg bg-surface border border-border/60">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-muted flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Disponibilité :
                            </span>
                            {isExpired ? (
                              <span className="font-bold text-danger flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Expirée
                              </span>
                            ) : isFuture ? (
                              <span className="font-bold text-amber-500">
                                Bientôt
                              </span>
                            ) : (
                              <span className="font-bold text-emerald-600">
                                Ouverte
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-foreground font-medium">
                            {!plan.availableFrom && !plan.availableTo ? (
                              <span>Offre permanente</span>
                            ) : (
                              <span>
                                {plan.availableFrom && `Du ${formatDate(plan.availableFrom)} `}
                                {plan.availableTo ? `au ${formatDate(plan.availableTo)}` : "en cours"}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Limites */}
                        <div className="space-y-1.5 pt-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                            Limites :
                          </p>
                          <div className="grid grid-cols-2 gap-1.5 text-xs text-muted">
                            <div className="flex items-center justify-between p-1.5 rounded-md bg-surface-muted/30 border border-border/40">
                              <span>Fermes :</span>
                              <span className="font-bold text-foreground">
                                {plan.quotas.maxFarms >= 9999 ? "Illimité" : plan.quotas.maxFarms}
                              </span>
                            </div>
                            <div className="flex items-center justify-between p-1.5 rounded-md bg-surface-muted/30 border border-border/40">
                              <span>Lots :</span>
                              <span className="font-bold text-foreground">
                                {plan.quotas.maxFlocks >= 9999 ? "Illimité" : plan.quotas.maxFlocks}
                              </span>
                            </div>
                            <div className="flex items-center justify-between p-1.5 rounded-md bg-surface-muted/30 border border-border/40">
                              <span>Bâtiments :</span>
                              <span className="font-bold text-foreground">
                                {(plan.quotas.maxBuildings ?? 2) >= 9999 ? "Illimité" : (plan.quotas.maxBuildings ?? 2)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between p-1.5 rounded-md bg-surface-muted/30 border border-border/40">
                              <span>Comptes :</span>
                              <span className="font-bold text-foreground">
                                {plan.quotas.maxMembers >= 9999 ? "Illimité" : plan.quotas.maxMembers}
                              </span>
                            </div>
                          </div>
                          <div className="text-[11px] text-muted flex items-center justify-between px-1">
                            <span>Historique :</span>
                            <span className="font-semibold text-foreground">
                              {plan.quotas.retentionMonths >= 9999 ? "Illimité" : `${plan.quotas.retentionMonths} mois`}
                            </span>
                          </div>
                        </div>

                        {/* Modules accessibles */}
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted">
                            <span>Modules :</span>
                            <span className="text-primary font-semibold">{activeModulesCount} inclus</span>
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {(plan.modules || []).slice(0, 6).map((mKey) => (
                              <span
                                key={mKey}
                                className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-primary-soft text-primary border border-primary/20"
                              >
                                {mKey}
                              </span>
                            ))}
                            {(plan.modules || []).length > 6 && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-surface-muted text-muted">
                                +{(plan.modules || []).length - 6}
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>

                      {/* Pied de carte : Actions */}
                      <div className="p-3 border-t border-border/70 bg-surface-muted/20 flex items-center justify-between gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPreview(plan)}
                          className="text-xs h-8 gap-1.5"
                          title="Aperçu de l'offre"
                        >
                          <Eye className="h-3.5 w-3.5 text-muted" />
                          <span>Aperçu</span>
                        </Button>

                        <div className="flex items-center gap-1.5">
                          {canManageSubscriptions && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDuplicatePlan(plan)}
                                className="text-xs h-8 px-2"
                                title="Dupliquer"
                              >
                                <Copy className="h-3.5 w-3.5 text-muted" />
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditPlanModal(plan)}
                                className="text-xs h-8 gap-1 font-semibold"
                              >
                                <Edit3 className="h-3.5 w-3.5 text-primary" />
                                <span>Modifier</span>
                              </Button>

                              {!plan.isSystem && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeletePlan(plan)}
                                  className="text-xs h-8 px-2"
                                  title={subscribers > 0 ? "Offre avec abonnés : archiver" : "Supprimer"}
                                >
                                  {subscribers > 0 ? (
                                    <Archive className="h-3.5 w-3.5 text-amber-500" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VUE 2 : ORGANISATIONS ABONNÉES */}
        {activeView === "subscriptions" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-surface border border-border">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted" />
                  <Input
                    placeholder="Rechercher un abonné..."
                    value={subSearch}
                    onChange={(e) => setSubSearch(e.target.value)}
                    className="pl-8 text-xs h-9"
                  />
                </div>

                <select
                  value={subStatusFilter}
                  onChange={(e) => setSubStatusFilter(e.target.value)}
                  className="h-9 px-3 rounded-lg border border-border bg-surface text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                >
                  <option value="">Tous les statuts</option>
                  <option value="ACTIVE">Actif</option>
                  <option value="TRIAL">Essai gratuit</option>
                  <option value="SUSPENDED">Suspendu</option>
                </select>

                <select
                  value={subPlanFilter}
                  onChange={(e) => setSubPlanFilter(e.target.value)}
                  className="h-9 px-3 rounded-lg border border-border bg-surface text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                >
                  <option value="">Toutes les offres</option>
                  {plans.map((p) => (
                    <option key={p.sku} value={p.sku}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <span className="text-xs text-muted">
                {subscriptions.length} organisation{subscriptions.length > 1 ? "s" : ""}
              </span>
            </div>

            <Card>
              <CardContent className="p-0">
                {subscriptions.length === 0 ? (
                  <EmptyState
                    icon={<Building2 className="h-8 w-8 text-muted" />}
                    title="Aucun abonné trouvé"
                    description="Aucun résultat pour cette recherche."
                    className="py-12"
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-muted/50 border-b border-border/80 text-muted uppercase text-[10px] tracking-wider font-semibold">
                        <tr>
                          <th className="py-3 px-4">Organisation</th>
                          <th className="py-3 px-3">Offre</th>
                          <th className="py-3 px-3">Statut</th>
                          <th className="py-3 px-3">Fermes</th>
                          <th className="py-3 px-3">Lots</th>
                          <th className="py-3 px-3">Comptes</th>
                          <th className="py-3 px-3">Renouvellement</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {subscriptions.map((sub) => {
                          const farmsMeter = sub.usage.farms;
                          const flocksMeter = sub.usage.flocks;
                          const membersMeter = sub.usage.members;

                          return (
                            <tr key={sub.id} className="hover:bg-surface-hover transition-colors">
                              <td className="py-3 px-4 font-semibold text-foreground">
                                <Link
                                  href={`/organizations/${sub.id}`}
                                  className="hover:text-primary hover:underline flex items-center gap-1.5"
                                >
                                  <span>{sub.name}</span>
                                  <ExternalLink className="h-3 w-3 text-muted" />
                                </Link>
                                {sub.farms && sub.farms.length > 0 ? (
                                  <div className="flex flex-wrap items-center gap-1 mt-1">
                                    <span className="text-[10px] text-muted">Fermes :</span>
                                    {sub.farms.map((f) => (
                                      <span
                                        key={f.id}
                                        className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-surface-muted text-foreground border border-border/50"
                                      >
                                        {f.name}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-muted block mt-0.5">
                                    Aucune ferme
                                  </span>
                                )}
                              </td>

                              <td className="py-3 px-3">
                                <Badge variant="outline" className="text-xs font-semibold">
                                  {sub.plan.name} ({sub.plan.sku})
                                </Badge>
                              </td>

                              <td className="py-3 px-3">
                                {sub.status === "ACTIVE" && <Badge variant="success" dot>Actif</Badge>}
                                {sub.status === "TRIAL" && <Badge variant="warning" dot>Essai</Badge>}
                                {sub.status === "SUSPENDED" && <Badge variant="destructive" dot>Suspendu</Badge>}
                              </td>

                              <td className="py-3 px-3">
                                <span className="font-semibold text-foreground">
                                  {farmsMeter.current} / {farmsMeter.isUnlimited ? "∞" : farmsMeter.max}
                                </span>
                              </td>

                              <td className="py-3 px-3">
                                <span className="font-semibold text-foreground">
                                  {flocksMeter.current} / {flocksMeter.isUnlimited ? "∞" : flocksMeter.max}
                                </span>
                              </td>

                              <td className="py-3 px-3">
                                <span className="font-semibold text-foreground">
                                  {membersMeter.current} / {membersMeter.isUnlimited ? "∞" : membersMeter.max}
                                </span>
                              </td>

                              <td className="py-3 px-3 text-muted">
                                {formatDate(sub.renewalDate)}
                              </td>

                              <td className="py-3 px-4 text-right">
                                {canManageSubscriptions && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openManageSubModal(sub)}
                                    className="text-xs gap-1.5 h-8"
                                  >
                                    <SlidersHorizontal className="h-3.5 w-3.5" />
                                    <span>Gérer</span>
                                  </Button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* VUE 3 : ANALYSES & INDICATEURS FINANCIERS */}
        {activeView === "analytics" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-5 space-y-3">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                  Revenus par mois
                </span>
                <p className="text-3xl font-black text-foreground">
                  {metrics?.mrr?.formatted || "0 FCFA"}
                </p>
                <p className="text-xs text-muted">
                  Sur les {metrics?.paidSubscriptions ?? 0} abonnés payants.
                </p>
              </Card>

              <Card className="p-5 space-y-3">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                  Revenus par an
                </span>
                <p className="text-3xl font-black text-emerald-600">
                  {metrics?.arr?.formatted || "0 FCFA"}
                </p>
                <p className="text-xs text-muted">
                  Total projeté sur 12 mois.
                </p>
              </Card>

              <Card className="p-5 space-y-3">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                  Taux de conversion
                </span>
                <p className="text-3xl font-black text-primary">
                  {metrics?.conversionRate ?? 0}%
                </p>
                <p className="text-xs text-muted">
                  Part des comptes passés au payant.
                </p>
              </Card>
            </div>

            {/* Répartition par offre */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold">Revenus par offre</CardTitle>
                <CardDescription className="text-xs">
                  Part de chaque offre dans les revenus mensuels.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(metrics?.bySku || {}).map(([sku, data]) => {
                  const plan = plans.find((p) => p.sku === sku);
                  const planName = plan?.name || sku;
                  const totalMrr = metrics?.mrr?.amount || 1;
                  const percent = Math.min(100, Math.round((data.mrr / (totalMrr > 0 ? totalMrr : 1)) * 100));

                  return (
                    <div key={sku} className="space-y-1.5 p-3 rounded-xl bg-surface-muted/30 border border-border/50">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{planName}</span>
                          <span className="text-[10px] font-mono text-muted uppercase bg-surface px-1.5 py-0.5 rounded border">
                            {sku}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-muted">{data.count} abonné{data.count > 1 ? "s" : ""}</span>
                          <span className="font-bold text-foreground">
                            {formatNumber(data.mrr)} FCFA / mois ({percent}%)
                          </span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-surface-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODALE DE CRÉATION & MODIFICATION D'UNE OFFRE */}
      <Modal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        title={editingPlan ? `Modifier l'offre "${editingPlan.name}"` : "Nouvelle offre"}
        description="Renseignez les détails de l'offre."
        maxWidth="4xl"
        footer={
          <div className="flex flex-wrap items-center justify-between w-full gap-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  // Générer un faux plan pour aperçu
                  const previewData: CommercialPlan = {
                    sku: planForm.sku || "PRO_PREVIEW",
                    name: planForm.name || "Nouvelle Offre",
                    tier: planForm.tier,
                    badge: planForm.badge,
                    description: planForm.description,
                    priceMonthly: Number(planForm.priceMonthly),
                    priceAnnually: Number(planForm.priceAnnually),
                    currency: planForm.currency,
                    status: planForm.status,
                    isVisibilityPublic: planForm.isVisibilityPublic,
                    trialDays: Number(planForm.trialDays),
                    allowedBillingCycles: [
                      ...(planForm.allowMonthly ? (["MONTHLY"] as BillingCycle[]) : []),
                      ...(planForm.allowAnnually ? (["ANNUALLY"] as BillingCycle[]) : []),
                    ],
                    modules: planForm.selectedModules,
                    quotas: {
                      maxFarms: planForm.maxFarmsUnlimited ? 9999 : Number(planForm.maxFarms),
                      maxFlocks: planForm.maxFlocksUnlimited ? 9999 : Number(planForm.maxFlocks),
                      maxMembers: planForm.maxMembersUnlimited ? 9999 : Number(planForm.maxMembers),
                      maxBuildings: planForm.maxBuildingsUnlimited ? 9999 : Number(planForm.maxBuildings),
                      retentionMonths: Number(planForm.retentionMonths),
                    },
                    features: planForm.featuresText
                      .split("\n")
                      .map((f) => f.trim())
                      .filter((f) => f.length > 0),
                    flags: {
                      accountingExports: false,
                      healthAlerts: true,
                      iotSensors: false,
                      apiAccess: false,
                      prioritySupport: false,
                    },
                    isPopular: planForm.isPopular,
                    isRecommended: planForm.isRecommended,
                    version: editingPlan ? (editingPlan.version ?? 1) + 1 : 1,
                    subscribersCount: editingPlan?.subscribersCount ?? 0,
                  };
                  openPreview(previewData);
                }}
                className="text-xs gap-1.5"
              >
                <Eye className="h-3.5 w-3.5 text-muted" />
                <span>Aperçu de l'offre</span>
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsPlanModalOpen(false)}
                disabled={isSavingPlan}
              >
                Annuler
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleSavePlan}
                isLoading={isSavingPlan}
                className="font-semibold text-xs gap-1.5"
              >
                <Check className="h-4 w-4" />
                <span>{editingPlan ? "Enregistrer" : "Créer l'offre"}</span>
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          {planModalError && (
            <div className="p-3.5 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{planModalError}</span>
            </div>
          )}

          {/* Alerte abonnés existants protégés */}
          {editingPlan && (editingPlan.subscribersCount ?? 0) > 0 && (
            <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Abonnés actuels protégés</p>
                <p className="opacity-90 mt-0.5">
                  Cette offre a <strong>{editingPlan.subscribersCount} abonné(s)</strong>.
                  Leurs conditions actuelles restent inchangées.
                </p>
              </div>
            </div>
          )}

          {/* Navigation par sections du formulaire */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-surface-muted/60 border border-border rounded-xl">
            <button
              type="button"
              onClick={() => setActiveSection("general")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSection === "general"
                  ? "bg-surface text-foreground shadow-xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              1. Infos
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("pricing")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSection === "pricing"
                  ? "bg-surface text-foreground shadow-xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              2. Tarifs & Dates
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("visibility")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSection === "visibility"
                  ? "bg-surface text-foreground shadow-xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              3. Statut & Accès
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("modules")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSection === "modules"
                  ? "bg-surface text-foreground shadow-xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              4. Modules ({planForm.selectedModules.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("quotas")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSection === "quotas"
                  ? "bg-surface text-foreground shadow-xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              5. Limites
            </button>
          </div>

          {/* SECTION 1 : INFOS */}
          {activeSection === "general" && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Nom de l'offre <span className="text-danger">*</span>
                  </label>
                  <Input
                    placeholder="Ex: Standard (Éleveur Pro)"
                    value={planForm.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPlanForm((prev) => ({
                        ...prev,
                        name: val,
                        sku: !editingPlan && !prev.sku ? val.toUpperCase().replace(/[^A-Z0-9]/g, "_").slice(0, 20) : prev.sku,
                      }));
                    }}
                    className="text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Code SKU <span className="text-danger">*</span>
                  </label>
                  <Input
                    placeholder="Ex: STANDARD, COOP_PRO"
                    value={planForm.sku}
                    onChange={(e) => setPlanForm((prev) => ({ ...prev, sku: e.target.value.toUpperCase() }))}
                    disabled={Boolean(editingPlan)}
                    className="text-xs font-mono"
                    required
                  />
                  <p className="text-[10px] text-muted mt-0.5">Code unique de l'offre.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Niveau
                  </label>
                  <select
                    value={planForm.tier}
                    onChange={(e) => setPlanForm((prev) => ({ ...prev, tier: e.target.value }))}
                    className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                  >
                    <option value="Découverte">Découverte</option>
                    <option value="Professionnel">Professionnel</option>
                    <option value="Multi-Sites">Multi-Sites</option>
                    <option value="Grand Compte">Grand Compte</option>
                    <option value="Personnalisé">Sur-mesure</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Badge (Optionnel)
                  </label>
                  <Input
                    placeholder="Ex: Populaire, Promo"
                    value={planForm.badge}
                    onChange={(e) => setPlanForm((prev) => ({ ...prev, badge: e.target.value }))}
                    className="text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Courte description de l'offre..."
                  value={planForm.description}
                  onChange={(e) => setPlanForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full p-3 rounded-lg border border-border bg-surface text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Points forts (1 par ligne)
                </label>
                <textarea
                  rows={3}
                  placeholder="1 point fort par ligne..."
                  value={planForm.featuresText}
                  onChange={(e) => setPlanForm((prev) => ({ ...prev, featuresText: e.target.value }))}
                  className="w-full p-3 rounded-lg border border-border bg-surface text-xs text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* SECTION 2 : TARIFS & DATES */}
          {activeSection === "pricing" && (
            <div className="space-y-5 pt-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Prix mensuel ({planForm.currency}) <span className="text-danger">*</span>
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="500"
                    value={planForm.priceMonthly}
                    onChange={(e) => setPlanForm((prev) => ({ ...prev, priceMonthly: Number(e.target.value) }))}
                    className="text-xs font-semibold"
                    required
                  />
                  <p className="text-[10px] text-muted mt-0.5">0 pour gratuit.</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-foreground">
                      Prix annuel ({planForm.currency})
                    </label>
                    <button
                      type="button"
                      onClick={applyAnnualDiscount}
                      className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                    >
                      2 mois offerts (-17%)
                    </button>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    step="1000"
                    value={planForm.priceAnnually}
                    onChange={(e) => setPlanForm((prev) => ({ ...prev, priceAnnually: Number(e.target.value) }))}
                    className="text-xs font-semibold"
                  />
                  <p className="text-[10px] text-muted mt-0.5">Tarif pour 1 an.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Devise
                  </label>
                  <select
                    value={planForm.currency}
                    onChange={(e) => setPlanForm((prev) => ({ ...prev, currency: e.target.value }))}
                    className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                  >
                    <option value="XOF">XOF (Franc CFA)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>

              {/* Facturation autorisée */}
              <div className="p-4 rounded-xl border border-border bg-surface space-y-2">
                <p className="text-xs font-semibold text-foreground">
                  Facturation autorisée
                </p>
                <div className="flex flex-wrap items-center gap-6 text-xs text-foreground pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={planForm.allowMonthly}
                      onChange={(e) => setPlanForm((prev) => ({ ...prev, allowMonthly: e.target.checked }))}
                      className="rounded text-primary focus:ring-primary/40 h-4 w-4"
                    />
                    <span>Mensuelle</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={planForm.allowAnnually}
                      onChange={(e) => setPlanForm((prev) => ({ ...prev, allowAnnually: e.target.checked }))}
                      className="rounded text-primary focus:ring-primary/40 h-4 w-4"
                    />
                    <span>Annuelle</span>
                  </label>
                </div>
              </div>

              {/* Validité de l'offre */}
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                <div className="flex items-start gap-2.5">
                  <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-foreground">
                      Validité de l'offre
                    </p>
                    <p className="text-xs text-muted mt-0.5 leading-relaxed">
                      Période pendant laquelle l'offre est disponible aux nouveaux clients. Les abonnés actuels conservent leur abonnement.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/60 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
                      <input
                        type="radio"
                        name="offer_validity"
                        checked={planForm.isPermanent}
                        onChange={() => setPlanForm((prev) => ({ ...prev, isPermanent: true }))}
                        className="text-primary focus:ring-primary/40"
                      />
                      <span>Offre permanente</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
                      <input
                        type="radio"
                        name="offer_validity"
                        checked={!planForm.isPermanent}
                        onChange={() => setPlanForm((prev) => ({ ...prev, isPermanent: false }))}
                        className="text-primary focus:ring-primary/40"
                      />
                      <span>Offre temporaire (Promo)</span>
                    </label>
                  </div>
                </div>

                {!planForm.isPermanent && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Date de début
                      </label>
                      <Input
                        type="date"
                        value={planForm.availableFromDate}
                        onChange={(e) => setPlanForm((prev) => ({ ...prev, availableFromDate: e.target.value }))}
                        className="text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Date de fin
                      </label>
                      <Input
                        type="date"
                        value={planForm.availableToDate}
                        onChange={(e) => setPlanForm((prev) => ({ ...prev, availableToDate: e.target.value }))}
                        className="text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION 3 : STATUT & ACCÈS */}
          {activeSection === "visibility" && (
            <div className="space-y-5 pt-1">
              {/* Statut */}
              <div className="p-4 rounded-xl border border-border bg-surface space-y-3">
                <p className="text-xs font-semibold text-foreground">Statut</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label
                    className={`p-3 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all ${
                      planForm.status === "PUBLISHED"
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border hover:bg-surface-hover"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">🟢 Publiée</span>
                      <input
                        type="radio"
                        name="plan_status"
                        checked={planForm.status === "PUBLISHED"}
                        onChange={() => setPlanForm((prev) => ({ ...prev, status: "PUBLISHED" }))}
                        className="text-primary"
                      />
                    </div>
                    <span className="text-[11px] text-muted">
                      Active et visible.
                    </span>
                  </label>

                  <label
                    className={`p-3 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all ${
                      planForm.status === "DRAFT"
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border hover:bg-surface-hover"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-600">🟡 Brouillon</span>
                      <input
                        type="radio"
                        name="plan_status"
                        checked={planForm.status === "DRAFT"}
                        onChange={() => setPlanForm((prev) => ({ ...prev, status: "DRAFT" }))}
                        className="text-primary"
                      />
                    </div>
                    <span className="text-[11px] text-muted">
                      En préparation, masquée.
                    </span>
                  </label>

                  <label
                    className={`p-3 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all ${
                      planForm.status === "ARCHIVED"
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border hover:bg-surface-hover"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-danger">⚪ Archivée</span>
                      <input
                        type="radio"
                        name="plan_status"
                        checked={planForm.status === "ARCHIVED"}
                        onChange={() => setPlanForm((prev) => ({ ...prev, status: "ARCHIVED" }))}
                        className="text-primary"
                      />
                    </div>
                    <span className="text-[11px] text-muted">
                      Fermée aux nouveaux clients.
                    </span>
                  </label>
                </div>
              </div>

              {/* Visibilité */}
              <div className="p-4 rounded-xl border border-border bg-surface space-y-3">
                <p className="text-xs font-semibold text-foreground">Visibilité</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <label
                    className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                      planForm.isVisibilityPublic
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border hover:bg-surface-hover"
                    }`}
                  >
                    <Globe className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">Offre Publique</span>
                        <input
                          type="radio"
                          name="plan_visibility"
                          checked={planForm.isVisibilityPublic}
                          onChange={() => setPlanForm((prev) => ({ ...prev, isVisibilityPublic: true }))}
                          className="text-primary"
                        />
                      </div>
                      <p className="text-[11px] text-muted mt-0.5">
                        Visible par tout le monde.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                      !planForm.isVisibilityPublic
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border hover:bg-surface-hover"
                    }`}
                  >
                    <Lock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">Offre Privée</span>
                        <input
                          type="radio"
                          name="plan_visibility"
                          checked={!planForm.isVisibilityPublic}
                          onChange={() => setPlanForm((prev) => ({ ...prev, isVisibilityPublic: false }))}
                          className="text-primary"
                        />
                      </div>
                      <p className="text-[11px] text-muted mt-0.5">
                        Réservée ou sur devis.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Essai gratuit */}
              <div className="p-4 rounded-xl border border-border bg-surface space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Essai gratuit</p>
                    <p className="text-[11px] text-muted">
                      Jours offerts avant le premier paiement.
                    </p>
                  </div>
                  <div className="w-36">
                    <Input
                      type="number"
                      min="0"
                      max="90"
                      value={planForm.trialDays}
                      onChange={(e) => setPlanForm((prev) => ({ ...prev, trialDays: Number(e.target.value) }))}
                      className="text-xs font-semibold text-center"
                      placeholder="Jours d'essai"
                    />
                  </div>
                </div>
              </div>

              {/* Mises en avant */}
              <div className="flex flex-wrap items-center gap-6 p-4 rounded-xl border border-border bg-surface text-xs text-foreground">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.isRecommended}
                    onChange={(e) => setPlanForm((prev) => ({ ...prev, isRecommended: e.target.checked }))}
                    className="rounded text-primary focus:ring-primary/40 h-4 w-4"
                  />
                  <span>Marquer comme <strong>Recommandée</strong></span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.isPopular}
                    onChange={(e) => setPlanForm((prev) => ({ ...prev, isPopular: e.target.checked }))}
                    className="rounded text-primary focus:ring-primary/40 h-4 w-4"
                  />
                  <span>Marquer comme <strong>Populaire</strong></span>
                </label>
              </div>
            </div>
          )}

          {/* SECTION 4 : MODULES */}
          {activeSection === "modules" && (
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between text-xs text-muted">
                <p>
                  Cochez les modules inclus dans cette offre.
                </p>
                <span className="font-semibold text-primary">
                  {planForm.selectedModules.length} sélectionné{planForm.selectedModules.length > 1 ? "s" : ""}
                </span>
              </div>

              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                {moduleGroups.map((group) => {
                  const catModuleKeys = group.modules.map((m) => m.key);
                  const allChecked = catModuleKeys.every((k) => planForm.selectedModules.includes(k));

                  return (
                    <div key={group.key} className="p-4 rounded-xl border border-border bg-surface space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-border/60">
                        <span className="text-xs font-bold text-foreground tracking-tight">
                          {group.category}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleCategoryModules(catModuleKeys, !allChecked)}
                            className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                          >
                            {allChecked ? "Tout décocher" : "Tout cocher"}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {group.modules.map((mod) => {
                          const isChecked = planForm.selectedModules.includes(mod.key);
                          return (
                            <label
                              key={mod.key}
                              className={`p-3 rounded-lg border flex items-start gap-2.5 cursor-pointer transition-all ${
                                isChecked
                                    ? "border-primary/50 bg-primary/5"
                                  : "border-border/60 hover:bg-surface-hover"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleModule(mod.key)}
                                className="rounded text-primary focus:ring-primary/40 h-4 w-4 mt-0.5"
                              />
                              <div className="flex-1">
                                <span className="text-xs font-bold text-foreground block">
                                  {mod.label}
                                </span>
                                <span className="text-[11px] text-muted block mt-0.5 leading-snug">
                                  {mod.description}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 5 : LIMITES */}
          {activeSection === "quotas" && (
            <div className="space-y-4 pt-1">
              <p className="text-xs text-muted">
                Fixez les plafonds pour cette offre.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Fermes */}
                <div className="p-3.5 rounded-xl border border-border bg-surface space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">Fermes max</label>
                    <label className="text-xs text-primary font-semibold flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={planForm.maxFarmsUnlimited}
                        onChange={(e) => setPlanForm((prev) => ({ ...prev, maxFarmsUnlimited: e.target.checked }))}
                        className="rounded"
                      />
                      Illimité
                    </label>
                  </div>
                  <Input
                    type="number"
                    min="1"
                    disabled={planForm.maxFarmsUnlimited}
                    value={planForm.maxFarmsUnlimited ? "" : planForm.maxFarms}
                    onChange={(e) => setPlanForm((prev) => ({ ...prev, maxFarms: Number(e.target.value) }))}
                    placeholder={planForm.maxFarmsUnlimited ? "Illimité" : "Ex: 3"}
                    className="text-xs font-semibold"
                  />
                </div>

                {/* Lots */}
                <div className="p-3.5 rounded-xl border border-border bg-surface space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">Lots max</label>
                    <label className="text-xs text-primary font-semibold flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={planForm.maxFlocksUnlimited}
                        onChange={(e) => setPlanForm((prev) => ({ ...prev, maxFlocksUnlimited: e.target.checked }))}
                        className="rounded"
                      />
                      Illimité
                    </label>
                  </div>
                  <Input
                    type="number"
                    min="1"
                    disabled={planForm.maxFlocksUnlimited}
                    value={planForm.maxFlocksUnlimited ? "" : planForm.maxFlocks}
                    onChange={(e) => setPlanForm((prev) => ({ ...prev, maxFlocks: Number(e.target.value) }))}
                    placeholder={planForm.maxFlocksUnlimited ? "Illimité" : "Ex: 10"}
                    className="text-xs font-semibold"
                  />
                </div>

                {/* Bâtiments */}
                <div className="p-3.5 rounded-xl border border-border bg-surface space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">Bâtiments max</label>
                    <label className="text-xs text-primary font-semibold flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={planForm.maxBuildingsUnlimited}
                        onChange={(e) => setPlanForm((prev) => ({ ...prev, maxBuildingsUnlimited: e.target.checked }))}
                        className="rounded"
                      />
                      Illimité
                    </label>
                  </div>
                  <Input
                    type="number"
                    min="1"
                    disabled={planForm.maxBuildingsUnlimited}
                    value={planForm.maxBuildingsUnlimited ? "" : planForm.maxBuildings}
                    onChange={(e) => setPlanForm((prev) => ({ ...prev, maxBuildings: Number(e.target.value) }))}
                    placeholder={planForm.maxBuildingsUnlimited ? "Illimité" : "Ex: 6"}
                    className="text-xs font-semibold"
                  />
                </div>

                {/* Comptes */}
                <div className="p-3.5 rounded-xl border border-border bg-surface space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">Comptes max</label>
                    <label className="text-xs text-primary font-semibold flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={planForm.maxMembersUnlimited}
                        onChange={(e) => setPlanForm((prev) => ({ ...prev, maxMembersUnlimited: e.target.checked }))}
                        className="rounded"
                      />
                      Illimité
                    </label>
                  </div>
                  <Input
                    type="number"
                    min="1"
                    disabled={planForm.maxMembersUnlimited}
                    value={planForm.maxMembersUnlimited ? "" : planForm.maxMembers}
                    onChange={(e) => setPlanForm((prev) => ({ ...prev, maxMembers: Number(e.target.value) }))}
                    placeholder={planForm.maxMembersUnlimited ? "Illimité" : "Ex: 5"}
                    className="text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-surface space-y-2">
                <label className="block text-xs font-semibold text-foreground">
                  Historique conservé
                </label>
                <select
                  value={planForm.retentionMonths}
                  onChange={(e) => setPlanForm((prev) => ({ ...prev, retentionMonths: Number(e.target.value) }))}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                >
                  <option value={3}>3 mois</option>
                  <option value={6}>6 mois</option>
                  <option value={12}>12 mois (1 an)</option>
                  <option value={36}>3 ans</option>
                  <option value={120}>10 ans</option>
                  <option value={9999}>Illimité</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* MODALE D'APERÇU */}
      {previewPlan && (
        <Modal
          isOpen={Boolean(previewPlan)}
          onClose={() => setPreviewPlan(null)}
          title="Aperçu de l'offre"
          description="Rendu de l'offre vue par les clients."
          maxWidth="lg"
          footer={
            <div className="flex items-center justify-end w-full">
              <Button variant="default" size="sm" onClick={() => setPreviewPlan(null)} className="text-xs">
                Fermer
              </Button>
            </div>
          }
        >
          <div className="p-5 rounded-2xl border-2 border-primary/40 bg-surface shadow-lg space-y-5">
            {/* Header de la carte d'aperçu */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
                  {previewPlan.tier}
                </span>
                <h3 className="text-2xl font-black text-foreground mt-0.5">{previewPlan.name}</h3>
                {previewPlan.badge && (
                  <Badge variant="outline" className="mt-1 text-xs font-bold text-primary border-primary/30">
                    {previewPlan.badge}
                  </Badge>
                )}
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-muted bg-surface-muted px-2 py-0.5 rounded border">
                  SKU: {previewPlan.sku}
                </span>
              </div>
            </div>

            {previewPlan.description && (
              <p className="text-xs text-muted leading-relaxed">
                {previewPlan.description}
              </p>
            )}

            {/* Sélecteur de cycle interactif Mensuel/Annuel pour la preview */}
            <div className="p-4 rounded-xl bg-surface-muted/40 border border-border/80 flex items-center justify-between">
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-foreground">
                    {previewBillingCycle === "MONTHLY"
                      ? formatNumber(previewPlan.priceMonthly)
                      : formatNumber(previewPlan.priceAnnually)}
                  </span>
                  <span className="text-xs font-bold text-muted">
                    {previewPlan.currency || "FCFA"}
                  </span>
                  <span className="text-xs text-muted">
                    {previewBillingCycle === "MONTHLY" ? " / mois" : " / an"}
                  </span>
                </div>
                {previewPlan.priceAnnually > 0 && previewBillingCycle === "ANNUALLY" && (
                  <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                    Économisez avec le paiement annuel
                  </p>
                )}
              </div>

              {(previewPlan.allowedBillingCycles?.length ?? 2) > 1 && (
                <div className="flex items-center gap-1 p-1 bg-surface border border-border rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setPreviewBillingCycle("MONTHLY")}
                    className={`px-2.5 py-1 rounded font-semibold transition-all cursor-pointer ${
                      previewBillingCycle === "MONTHLY" ? "bg-primary text-white" : "text-muted"
                    }`}
                  >
                    Mois
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewBillingCycle("ANNUALLY")}
                    className={`px-2.5 py-1 rounded font-semibold transition-all cursor-pointer ${
                      previewBillingCycle === "ANNUALLY" ? "bg-primary text-white" : "text-muted"
                    }`}
                  >
                    An
                  </button>
                </div>
              )}
            </div>

            {/* Essai gratuit */}
            {previewPlan.trialDays > 0 && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Profitez de {previewPlan.trialDays} jours d'essai gratuit !</span>
              </div>
            )}

            {/* Disponibilité temporaire si applicable */}
            {(previewPlan.availableFrom || previewPlan.availableTo) && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 text-xs flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  Offre temporaire :{" "}
                  {previewPlan.availableTo ? `jusqu'au ${formatDate(previewPlan.availableTo)}` : "en cours"}
                </span>
              </div>
            )}

            {/* Limites de ressources */}
            <div className="space-y-2 pt-2 border-t border-border">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
                Ressources incluses :
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Warehouse className="h-3.5 w-3.5 text-primary" />
                  <span>
                    <strong>{previewPlan.quotas.maxFarms >= 9999 ? "Illimité" : previewPlan.quotas.maxFarms}</strong> ferme(s)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Bird className="h-3.5 w-3.5 text-primary" />
                  <span>
                    <strong>{previewPlan.quotas.maxFlocks >= 9999 ? "Illimité" : previewPlan.quotas.maxFlocks}</strong> lot(s)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  <span>
                    <strong>{(previewPlan.quotas.maxBuildings ?? 2) >= 9999 ? "Illimité" : (previewPlan.quotas.maxBuildings ?? 2)}</strong> bâtiment(s)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  <span>
                    <strong>{previewPlan.quotas.maxMembers >= 9999 ? "Illimité" : previewPlan.quotas.maxMembers}</strong> compte(s)
                  </span>
                </div>
              </div>
            </div>

            {/* Fonctionnalités incluses */}
            <div className="space-y-2 pt-2 border-t border-border">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
                Inclus dans l'offre :
              </span>
              <div className="space-y-1.5">
                {previewPlan.features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-foreground">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button variant="default" size="default" disabled className="w-full text-xs font-bold py-3 mt-4">
              Souscrire (Aperçu)
            </Button>
          </div>
        </Modal>
      )}

      {/* MODALE D'ATTRIBUTION D'OFFRE */}
      <Modal
        isOpen={isSubModalOpen}
        onClose={() => setIsSubModalOpen(false)}
        title={selectedSubscription ? `Abonnement de "${selectedSubscription.name}"` : "Abonnement"}
        description="Modifier l'offre ou le statut de cette organisation."
        footer={
          <div className="flex items-center justify-between w-full">
            <Button variant="outline" size="sm" onClick={() => setIsSubModalOpen(false)} disabled={isUpdatingSub}>
              Annuler
            </Button>
            <Button variant="default" size="sm" onClick={handleSaveSubscription} isLoading={isUpdatingSub}>
              Enregistrer
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveSubscription} className="space-y-4">
          {subModalError && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-xs">
              {subModalError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Offre attribuée
            </label>
            <select
              value={newPlanSku}
              onChange={(e) => setNewPlanSku(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
            >
              {plans.map((p) => (
                <option key={p.sku} value={p.sku}>
                  {p.name} ({p.sku}) — {formatNumber(p.priceMonthly)} {p.currency || "FCFA"}/mois
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Statut
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as OrganizationStatus)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
            >
              <option value="ACTIVE">Actif</option>
              <option value="TRIAL">Essai gratuit</option>
              <option value="SUSPENDED">Suspendu</option>
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
}
