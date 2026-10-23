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
} from "lucide-react";
import {
  adminApi,
  CommercialPlan,
  FinancialMetrics,
  SubscriptionItem,
  OrganizationStatus,
} from "@/lib/api-client";
import { AdminHeader } from "@/components/admin-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { formatNumber, formatDate } from "@/lib/utils";
import { useAdminAuth } from "@/context/admin-auth-context";

export default function SubscriptionsPage() {
  const { hasPermission } = useAdminAuth();
  const canManageSubscriptions = hasPermission("admin:subscriptions:manage");

  const [activeTab, setActiveTab] = useState<"subscriptions" | "plans" | "analytics">("subscriptions");
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [plans, setPlans] = useState<CommercialPlan[]>([]);
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [planFilter, setPlanFilter] = useState<string>("");

  // Modal State for Upgrading / Managing Subscription
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionItem | null>(null);
  const [newPlanSku, setNewPlanSku] = useState<string>("");
  const [newStatus, setNewStatus] = useState<OrganizationStatus>("ACTIVE");
  const [isUpdating, setIsUpdating] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const [subsData, plansData, metricsData] = await Promise.all([
        adminApi.subscriptions.list({
          status: statusFilter || undefined,
          plan: planFilter || undefined,
          search: search || undefined,
        }),
        adminApi.subscriptions.getPlans(),
        adminApi.subscriptions.getMetrics(),
      ]);

      setSubscriptions(subsData.data);
      setPlans(plansData);
      setMetrics(metricsData);
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
  }, [statusFilter, planFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const openManageModal = (sub: SubscriptionItem) => {
    setSelectedSubscription(sub);
    setNewPlanSku(sub.plan.sku);
    setNewStatus(sub.status);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubscription) return;

    setIsUpdating(true);
    setModalError(null);
    try {
      const updated = await adminApi.subscriptions.update(selectedSubscription.id, {
        plan: newPlanSku,
        status: newStatus,
      });

      setSubscriptions((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s))
      );
      // Refresh metrics
      const newMetrics = await adminApi.subscriptions.getMetrics();
      setMetrics(newMetrics);

      setIsModalOpen(false);
    } catch (err: unknown) {
      setModalError((err as Error).message || "Erreur lors de la mise à jour de l'abonnement.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Modal State for Creating / Editing Commercial Plans
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<CommercialPlan | null>(null);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [planModalError, setPlanModalError] = useState<string | null>(null);

  const initialPlanForm = {
    sku: "",
    name: "",
    tier: "Professionnel",
    badge: "",
    description: "",
    priceMonthly: 15000,
    priceAnnually: 153000,
    maxFarms: 3,
    maxFlocks: 10,
    maxMembers: 5,
    retentionMonths: 12,
    accountingExports: false,
    healthAlerts: true,
    iotSensors: false,
    apiAccess: false,
    prioritySupport: false,
    featuresText: "1 exploitation avicole\nSaisie quotidienne ponte & mortalités\nSupport email sous 24h",
    isPopular: false,
    isRecommended: false,
  };

  const [planForm, setPlanForm] = useState(initialPlanForm);

  const openCreatePlanModal = () => {
    setEditingPlan(null);
    setPlanForm(initialPlanForm);
    setPlanModalError(null);
    setIsPlanModalOpen(true);
  };

  const openEditPlanModal = (plan: CommercialPlan) => {
    setEditingPlan(plan);
    setPlanForm({
      sku: plan.sku,
      name: plan.name,
      tier: plan.tier,
      badge: plan.badge || "",
      description: plan.description || "",
      priceMonthly: plan.priceMonthly,
      priceAnnually: plan.priceAnnually,
      maxFarms: plan.quotas.maxFarms,
      maxFlocks: plan.quotas.maxFlocks,
      maxMembers: plan.quotas.maxMembers,
      retentionMonths: plan.quotas.retentionMonths,
      accountingExports: !!plan.flags.accountingExports,
      healthAlerts: !!plan.flags.healthAlerts,
      iotSensors: !!plan.flags.iotSensors,
      apiAccess: !!plan.flags.apiAccess,
      prioritySupport: !!plan.flags.prioritySupport,
      featuresText: plan.features.join("\n"),
      isPopular: !!plan.isPopular,
      isRecommended: !!plan.isRecommended,
    });
    setPlanModalError(null);
    setIsPlanModalOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.name.trim()) {
      setPlanModalError("Le nom de la formule est obligatoire.");
      return;
    }
    if (!editingPlan && !planForm.sku.trim()) {
      setPlanModalError("Le code SKU est obligatoire (ex: PRO_MAX).");
      return;
    }

    setIsSavingPlan(true);
    setPlanModalError(null);

    const features = planForm.featuresText
      .split("\n")
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    const payload = {
      sku: planForm.sku.toUpperCase().trim(),
      name: planForm.name.trim(),
      tier: planForm.tier.trim(),
      badge: planForm.badge.trim() || null,
      description: planForm.description.trim() || null,
      priceMonthly: Number(planForm.priceMonthly) || 0,
      priceAnnually: Number(planForm.priceAnnually) || 0,
      quotas: {
        maxFarms: Number(planForm.maxFarms) || 1,
        maxFlocks: Number(planForm.maxFlocks) || 2,
        maxMembers: Number(planForm.maxMembers) || 2,
        retentionMonths: Number(planForm.retentionMonths) || 3,
      },
      flags: {
        accountingExports: planForm.accountingExports,
        healthAlerts: planForm.healthAlerts,
        iotSensors: planForm.iotSensors,
        apiAccess: planForm.apiAccess,
        prioritySupport: planForm.prioritySupport,
      },
      features,
      isPopular: planForm.isPopular,
      isRecommended: planForm.isRecommended,
    };

    try {
      if (editingPlan) {
        await adminApi.subscriptions.updatePlan(editingPlan.id || editingPlan.sku, payload);
      } else {
        await adminApi.subscriptions.createPlan(payload);
      }
      setIsPlanModalOpen(false);
      await fetchData();
    } catch (err: unknown) {
      setPlanModalError((err as Error).message || "Erreur lors de l'enregistrement de la formule.");
    } finally {
      setIsSavingPlan(false);
    }
  };

  const handleDeletePlan = async (plan: CommercialPlan) => {
    if (!window.confirm(`Confirmez-vous la suppression de la formule "${plan.name}" (${plan.sku}) ?`)) {
      return;
    }

    try {
      await adminApi.subscriptions.deletePlan(plan.id || plan.sku);
      await fetchData();
    } catch (err: unknown) {
      alert((err as Error).message || "Erreur lors de la suppression de la formule.");
    }
  };

  // SKU styling helper
  const getSkuBadge = (sku: string) => {
    const matchedPlan = plans.find((p) => p.sku === sku);
    const label = matchedPlan?.name || sku;
    switch (sku) {
      case "ENTERPRISE":
        return <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/30 text-xs">{label}</Badge>;
      case "PRO":
        return <Badge className="bg-primary/10 text-primary border border-primary/30 text-xs">{label}</Badge>;
      case "STANDARD":
        return <Badge className="bg-blue-500/10 text-blue-600 border border-blue-500/30 text-xs">{label}</Badge>;
      case "FREE":
        return <Badge className="bg-surface-muted text-muted border border-border text-xs">{label}</Badge>;
      default:
        return <Badge variant="outline" className="text-xs font-semibold">{label}</Badge>;
    }
  };

  const getStatusBadge = (status: OrganizationStatus) => {
    switch (status) {
      case "ACTIVE":
        return <Badge variant="success" dot className="text-xs">Actif</Badge>;
      case "TRIAL":
        return <Badge variant="warning" dot className="text-xs">Essai (Trial)</Badge>;
      case "SUSPENDED":
      default:
        return <Badge variant="destructive" dot className="text-xs">Suspendu</Badge>;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background">
      <AdminHeader
        title="Abonnements"
        description="Formules, abonnements actifs et quotas."
      />

      <div className="p-6 md:p-8 space-y-6 max-w-7xl">
        {/* KPI Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 bg-surface border-border flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">Revenu mensuel</span>
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Coins className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold font-mono text-foreground">
                {metrics ? metrics.mrr.formatted : "—"}
              </div>
              <p className="text-[11px] text-muted mt-0.5">
                Annuel : {metrics ? metrics.arr.formatted : "—"}
              </p>
            </div>
          </Card>

          <Card className="p-4 bg-surface border-border flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">Abonnements payants</span>
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <CreditCard className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-foreground">
                {metrics ? `${metrics.paidSubscriptions} / ${metrics.totalSubscriptions}` : "—"}
              </div>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {metrics ? `${metrics.conversionRate}% conversion` : "—"}
              </p>
            </div>
          </Card>

          <Card className="p-4 bg-surface border-border flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">En essai</span>
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-foreground">
                {metrics ? metrics.trialSubscriptions : "—"}
              </div>
              <p className="text-[11px] text-muted mt-0.5">
                Organisations en test
              </p>
            </div>
          </Card>

          <Card className="p-4 bg-surface border-border flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">Quotas</span>
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-foreground">
                {subscriptions.filter((s) => s.isOverQuota).length > 0 ? (
                  <span className="text-danger flex items-center gap-1">
                    <AlertTriangle className="h-5 w-5" />
                    {subscriptions.filter((s) => s.isOverQuota).length} dépassé(s)
                  </span>
                ) : (
                  <span className="text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="h-5 w-5" />
                    100% Conforme
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted mt-0.5">
                Capacité fermes respectée
              </p>
            </div>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-border flex items-center justify-between">
          <nav className="flex space-x-6">
            <button
              onClick={() => setActiveTab("subscriptions")}
              className={`py-3 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === "subscriptions"
                  ? "border-primary text-primary font-bold"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              <CreditCard className="h-4 w-4" />
              <span>Abonnements</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-surface-muted text-foreground">
                {subscriptions.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("plans")}
              className={`py-3 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === "plans"
                  ? "border-primary text-primary font-bold"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>Formules & Tarifs</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-surface-muted text-foreground">
                {plans.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("analytics")}
              className={`py-3 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === "analytics"
                  ? "border-primary text-primary font-bold"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              <span>Statistiques</span>
            </button>
          </nav>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
            className="gap-2 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>

        {apiError && (
          <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm flex items-center gap-3">
            <Info className="h-5 w-5 shrink-0" />
            <p className="flex-1">{apiError}</p>
            <Button variant="outline" size="sm" onClick={fetchData}>
              Réessayer
            </Button>
          </div>
        )}

        {/* TAB 1: SOUSCRIPTIONS & LICENCES CLIENTS */}
        {activeTab === "subscriptions" && (
          <div className="space-y-4">
            {/* Filter and Search Bar */}
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted" />
                <Input
                  placeholder="Rechercher par organisation ou slug..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 text-xs h-9 bg-surface"
                />
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-9 px-3 rounded-lg border border-border bg-surface text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                >
                  <option value="">Tous les états de licence</option>
                  <option value="ACTIVE">Actif (Active)</option>
                  <option value="TRIAL">Essai (Trial)</option>
                  <option value="SUSPENDED">Suspendu (Suspended)</option>
                </select>

                <select
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value)}
                  className="h-9 px-3 rounded-lg border border-border bg-surface text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                >
                  <option value="">Toutes les formules</option>
                  {plans.map((p) => (
                    <option key={p.sku || p.id} value={p.sku}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>

                <Button type="submit" variant="default" size="sm" className="text-xs">
                  Filtrer
                </Button>
              </div>
            </form>

            {/* Subscriptions Table */}
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="py-16 text-center text-sm text-muted space-y-2">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-primary" />
                    <p>Chargement des souscriptions réelles...</p>
                  </div>
                ) : subscriptions.length === 0 ? (
                  <EmptyState
                    icon={<CreditCard className="h-8 w-8 text-muted" />}
                    title="Aucune souscription correspondante"
                    description="Modifiez vos critères de recherche ou réinitialisez les filtres."
                    className="m-8"
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-muted/50 border-b border-border/80 text-muted uppercase text-[10px] tracking-wider font-semibold">
                        <tr>
                          <th className="py-3 px-4">Organisation Cliente</th>
                          <th className="py-3 px-3">Formule (SKU)</th>
                          <th className="py-3 px-3">État Licence</th>
                          <th className="py-3 px-3">Consommation Quota Fermes</th>
                          <th className="py-3 px-3">Bandes Actives</th>
                          <th className="py-3 px-3">Membres</th>
                          <th className="py-3 px-3">Facturation</th>
                          <th className="py-3 px-3">Prochain Renouvellement</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {subscriptions.map((sub) => {
                          const farmsMeter = sub.usage.farms;
                          const flocksMeter = sub.usage.flocks;
                          const membersMeter = sub.usage.members;

                          return (
                            <tr
                              key={sub.id}
                              className={`hover:bg-surface-hover transition-colors ${
                                sub.isOverQuota ? "bg-danger/5" : ""
                              }`}
                            >
                              <td className="py-3.5 px-4 font-semibold text-foreground">
                                <Link
                                  href={`/organizations/${sub.id}`}
                                  className="hover:text-primary hover:underline flex items-center gap-1.5"
                                >
                                  <span>{sub.name}</span>
                                  <ExternalLink className="h-3 w-3 text-muted" />
                                </Link>
                                <span className="text-[10px] font-mono text-muted block mt-0.5">
                                  {sub.slug}
                                </span>
                              </td>

                              <td className="py-3 px-3">
                                {getSkuBadge(sub.plan.sku)}
                              </td>

                              <td className="py-3 px-3">
                                {getStatusBadge(sub.status)}
                              </td>

                              {/* Resource Meter: Farms */}
                              <td className="py-3 px-3 min-w-[140px]">
                                <div className="space-y-1">
                                  <div className="flex justify-between text-[11px]">
                                    <span className="font-medium text-foreground">
                                      {farmsMeter.current} / {farmsMeter.isUnlimited ? "∞" : farmsMeter.max}
                                    </span>
                                    {!farmsMeter.isUnlimited && (
                                      <span className="text-muted">{farmsMeter.percent}%</span>
                                    )}
                                  </div>
                                  {!farmsMeter.isUnlimited && (
                                    <div className="h-1.5 w-full bg-surface-muted rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all ${
                                          farmsMeter.percent >= 100
                                            ? "bg-danger"
                                            : farmsMeter.percent >= 75
                                            ? "bg-amber-500"
                                            : "bg-primary"
                                        }`}
                                        style={{ width: `${Math.min(100, farmsMeter.percent)}%` }}
                                      />
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* Resource Meter: Flocks */}
                              <td className="py-3 px-3 min-w-[120px]">
                                <span className="text-[11px] font-medium text-foreground">
                                  {flocksMeter.current} / {flocksMeter.isUnlimited ? "∞" : flocksMeter.max}
                                </span>
                              </td>

                              {/* Resource Meter: Members */}
                              <td className="py-3 px-3 min-w-[110px]">
                                <span className="text-[11px] font-medium text-foreground">
                                  {membersMeter.current} / {membersMeter.isUnlimited ? "∞" : membersMeter.max}
                                </span>
                              </td>

                              <td className="py-3 px-3 font-mono font-bold text-foreground">
                                {sub.monthlyAmount === 0
                                  ? "0 FCFA"
                                  : `${formatNumber(sub.monthlyAmount)} FCFA`}
                                <span className="text-[10px] text-muted font-normal block">
                                  / mois
                                </span>
                              </td>

                              <td className="py-3 px-3 text-muted text-[11px]">
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5 text-muted" />
                                  <span>{formatDate(sub.renewalDate)}</span>
                                </div>
                              </td>

                              <td className="py-3 px-4 text-right">
                                {canManageSubscriptions && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openManageModal(sub)}
                                    className="text-xs gap-1.5"
                                  >
                                    <SlidersHorizontal className="h-3.5 w-3.5" />
                                    <span>Mettre à niveau</span>
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

        {/* TAB 2: CATALOGUE DES FORMULES & QUOTAS */}
        {activeTab === "plans" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Grille des Formules Commerciales (Microsoft 365 Tiering)
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  Périmètres techniques, plafonds de ressources (Service Limits) et tarification applicable aux organisations clientes.
                </p>
              </div>

              {canManageSubscriptions && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={openCreatePlanModal}
                  className="gap-2 shrink-0 text-xs shadow-xs"
                >
                  <Plus className="h-4 w-4" />
                  <span>Nouvelle Formule Commerciale</span>
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {plans.map((p) => {
                const subscriberCount = subscriptions.filter(
                  (s) => s.plan.sku === p.sku
                ).length;

                return (
                  <Card
                    key={p.sku}
                    className={`flex flex-col justify-between relative ${
                      p.isRecommended
                        ? "border-primary ring-1 ring-primary/30 shadow-md bg-surface"
                        : "bg-surface"
                    }`}
                  >
                    {p.isRecommended && (
                      <span className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-white tracking-wider uppercase shadow-xs">
                        Recommandé
                      </span>
                    )}

                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                          {p.tier}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {subscriberCount} abonné{subscriberCount > 1 ? "s" : ""}
                        </Badge>
                      </div>

                      <CardTitle className="text-base font-bold text-foreground mt-1">
                        {p.name}
                      </CardTitle>

                      <div className="mt-2.5 flex items-baseline gap-1">
                        <span className="text-2xl font-bold font-mono text-foreground">
                          {p.priceMonthly === 0 ? "0 FCFA" : `${formatNumber(p.priceMonthly)} FCFA`}
                        </span>
                        <span className="text-xs text-muted">/ mois</span>
                      </div>
                      {p.priceAnnually > 0 && (
                        <p className="text-[11px] text-emerald-600 font-medium">
                          {formatNumber(p.priceAnnually)} FCFA / an (-15% engagement)
                        </p>
                      )}

                      <CardDescription className="text-xs mt-2 min-h-[38px]">
                        {p.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4 pt-0">
                      {/* Service Limits / Quotas */}
                      <div className="p-3 rounded-xl bg-surface-muted/50 border border-border/80 space-y-1.5 text-xs">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                          Limites de Quota (Service Limits)
                        </p>
                        <div className="flex justify-between">
                          <span className="text-muted">Exploitations max :</span>
                          <span className="font-semibold text-foreground">
                            {p.quotas.maxFarms >= 9999 ? "Illimité" : p.quotas.maxFarms}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted">Bandes simultanées :</span>
                          <span className="font-semibold text-foreground">
                            {p.quotas.maxFlocks >= 9999 ? "Illimité" : p.quotas.maxFlocks}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted">Comptes collaborateurs :</span>
                          <span className="font-semibold text-foreground">
                            {p.quotas.maxMembers >= 9999 ? "Illimité" : p.quotas.maxMembers}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted">Rétention d&apos;historique :</span>
                          <span className="font-semibold text-foreground">
                            {p.quotas.retentionMonths} mois
                          </span>
                        </div>
                      </div>

                      {/* Included Features */}
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                          Fonctionnalités incluses :
                        </p>
                        {p.features.map((feature, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-muted">
                            <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>

                      {/* Actions Formule */}
                      {canManageSubscriptions && (
                        <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditPlanModal(p)}
                            className="gap-1.5 text-xs flex-1 h-8"
                          >
                            <Edit3 className="h-3.5 w-3.5 text-primary" />
                            <span>Modifier</span>
                          </Button>
                          {!p.isSystem && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeletePlan(p)}
                              className="h-8 px-2.5 text-xs"
                              title="Supprimer cette formule personnalisée"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: ANALYSE MRR & REVENUE RUN-RATE */}
        {activeTab === "analytics" && metrics && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* MRR Breakdown by SKU */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold flex items-center justify-between">
                    <span>Ventilation du Revenu Récurrent (MRR) par Formule</span>
                    <span className="text-xs text-emerald-600 font-mono font-bold">
                      {metrics.mrr.formatted}
                    </span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Contribution mensuelle de chaque SKU commercial à la trésorerie plateforme.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(metrics.bySku).map(([sku, data]) => {
                    const percentOfTotal =
                      metrics.mrr.amount > 0
                        ? Math.round((data.mrr / metrics.mrr.amount) * 100)
                        : 0;

                    return (
                      <div key={sku} className="space-y-1.5 p-3 rounded-xl bg-surface-muted/30 border border-border/60">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            {getSkuBadge(sku)}
                            <span className="text-muted">({data.count} client{data.count > 1 ? "s" : ""})</span>
                          </div>
                          <span className="font-mono font-bold text-foreground">
                            {formatNumber(data.mrr)} FCFA / mois
                          </span>
                        </div>
                        <div className="h-2 w-full bg-surface-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${percentOfTotal}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-right text-muted">{percentOfTotal}% du revenu global</p>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Conversion & Churn Prevention Tile */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">
                    Santé du Parc Abonnés & Conversion
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Indicateurs de rétention et statut des licences dans le cloud Lefermier.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-surface-muted/40 border border-border">
                    <span className="text-muted">Total Souscriptions hébergées :</span>
                    <span className="font-bold text-foreground text-sm">{metrics.totalSubscriptions}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700">
                    <span>Souscriptions Actives payantes :</span>
                    <span className="font-bold text-sm">{metrics.paidSubscriptions}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700">
                    <span>Périodes d&apos;essai actives :</span>
                    <span className="font-bold text-sm">{metrics.trialSubscriptions}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger">
                    <span>Souscriptions Suspendues pour impayé :</span>
                    <span className="font-bold text-sm">{metrics.suspendedSubscriptions}</span>
                  </div>

                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-xs space-y-1.5 mt-2">
                    <p className="font-bold text-primary flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4" />
                      Projection de Croissance Annuelle (ARR)
                    </p>
                    <p className="text-muted leading-relaxed">
                      Sur la base de la cadence mensuelle actuelle de{" "}
                      <span className="font-mono font-semibold text-foreground">
                        {metrics.mrr.formatted}
                      </span>
                      , la projection de chiffre d&apos;affaires contractuel s&apos;élève à{" "}
                      <span className="font-mono font-bold text-primary">
                        {metrics.arr.formatted}
                      </span>
                      .
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Modal Mettre à niveau / Modifier la souscription */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          selectedSubscription
            ? `Gérer l'abonnement : ${selectedSubscription.name}`
            : "Modifier l'abonnement"
        }
        description="Ajustez la formule commerciale (SKU), les quotas applicables et le statut de licence client."
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={isUpdating}
            >
              Annuler
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSaveSubscription}
              disabled={isUpdating}
              className="gap-2"
            >
              {isUpdating && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              Appliquer la formule
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveSubscription} className="space-y-4">
          {modalError && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-xs">
              {modalError}
            </div>
          )}

          {selectedSubscription && (
            <div className="p-3 rounded-xl bg-surface-muted/50 border border-border text-xs space-y-1">
              <p className="font-semibold text-foreground">Organisation : {selectedSubscription.name}</p>
              <p className="text-muted">Slug technique : {selectedSubscription.slug}</p>
              <p className="text-muted">
                Formule actuelle :{" "}
                <span className="font-mono font-bold text-foreground">
                  {selectedSubscription.plan.name} ({selectedSubscription.plan.sku})
                </span>
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Formule Commerciale Cible (SKU)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {plans.map((p) => {
                const isSelected = newPlanSku === p.sku;
                return (
                  <div
                    key={p.sku}
                    onClick={() => setNewPlanSku(p.sku)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-xs"
                        : "border-border hover:bg-surface-hover"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-xs text-foreground">{p.name}</span>
                      {isSelected && <Check className="h-4 w-4 text-primary" />}
                    </div>
                    <p className="text-xs font-mono font-bold text-foreground">
                      {p.priceMonthly === 0 ? "0 FCFA" : `${formatNumber(p.priceMonthly)} FCFA`}
                      <span className="text-[10px] text-muted font-normal"> / mois</span>
                    </p>
                    <p className="text-[10px] text-muted mt-1">
                      Max {p.quotas.maxFarms >= 9999 ? "∞" : p.quotas.maxFarms} ferme(s), {p.quotas.maxFlocks >= 9999 ? "∞" : p.quotas.maxFlocks} bandes
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Statut de la Licence
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as OrganizationStatus)}
              className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
            >
              <option value="ACTIVE">Actif (Accès régulier accordé)</option>
              <option value="TRIAL">Période d&apos;essai (Trial)</option>
              <option value="SUSPENDED">Suspendu (Accès bloqué pour impayé)</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* MODAL CRÉATION / ÉDITION D'UNE FORMULE COMMERCIALE */}
      <Modal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        title={editingPlan ? `Modifier la formule : ${editingPlan.name}` : "Créer une nouvelle formule commerciale"}
        description="Définissez les tarifs FCFA, quotas de ressources plafonds et fonctionnalités de l'offre (modèle Microsoft 365 Licensing)."
        maxWidth="3xl"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPlanModalOpen(false)}
              disabled={isSavingPlan}
            >
              Annuler
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSavePlan}
              disabled={isSavingPlan}
              className="gap-2"
            >
              {isSavingPlan && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              <span>{editingPlan ? "Enregistrer les modifications" : "Créer la formule"}</span>
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSavePlan} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {planModalError && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-xs">
              {planModalError}
            </div>
          )}

          {/* Identité & SKU */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Nom commercial de la formule *
              </label>
              <Input
                value={planForm.name}
                onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                placeholder="Ex: Coopérative Plus"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Code SKU (identifiant technique unique) *
              </label>
              <Input
                value={planForm.sku}
                onChange={(e) => setPlanForm({ ...planForm, sku: e.target.value.toUpperCase() })}
                placeholder="Ex: COOP_PLUS"
                disabled={!!editingPlan}
                required
                className="font-mono uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Gamme (Tier) *
              </label>
              <select
                value={planForm.tier}
                onChange={(e) => setPlanForm({ ...planForm, tier: e.target.value })}
                className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
              >
                <option value="Découverte">Découverte (Starter)</option>
                <option value="Professionnel">Professionnel (Standard)</option>
                <option value="Multi-Sites">Multi-Sites (Coopérative)</option>
                <option value="Grand Compte">Grand Compte (Industriel)</option>
                <option value="Personnalisé">Sur-Mesure (Partenaire)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Badge d&apos;affichage (optionnel)
              </label>
              <Input
                value={planForm.badge}
                onChange={(e) => setPlanForm({ ...planForm, badge: e.target.value })}
                placeholder="Ex: Populaire, Recommandé, Sur-Mesure"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Description de l&apos;offre
            </label>
            <Input
              value={planForm.description}
              onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
              placeholder="Pour les éleveurs en développement..."
            />
          </div>

          {/* Tarification */}
          <div className="p-3.5 rounded-xl bg-surface-muted/50 border border-border space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5 text-primary" />
              <span>Tarification (FCFA / XOF)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Prix Mensuel (FCFA) *
                </label>
                <Input
                  type="number"
                  min="0"
                  step="500"
                  value={planForm.priceMonthly}
                  onChange={(e) => {
                    const monthly = Number(e.target.value);
                    setPlanForm({
                      ...planForm,
                      priceMonthly: monthly,
                      priceAnnually: Math.round(monthly * 12 * 0.85),
                    });
                  }}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Prix Annuel (-15% engagement) (FCFA) *
                </label>
                <Input
                  type="number"
                  min="0"
                  step="1000"
                  value={planForm.priceAnnually}
                  onChange={(e) => setPlanForm({ ...planForm, priceAnnually: Number(e.target.value) })}
                  required
                />
              </div>
            </div>
          </div>

          {/* Quotas Plafonds (Service Limits) */}
          <div className="p-3.5 rounded-xl bg-surface-muted/50 border border-border space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-primary" />
              <span>Plafonds de Quotas (Service Limits — 9999 = Illimité)</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-muted mb-1">
                  Exploitations max
                </label>
                <Input
                  type="number"
                  min="1"
                  value={planForm.maxFarms}
                  onChange={(e) => setPlanForm({ ...planForm, maxFarms: Number(e.target.value) })}
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-muted mb-1">
                  Bandes max
                </label>
                <Input
                  type="number"
                  min="1"
                  value={planForm.maxFlocks}
                  onChange={(e) => setPlanForm({ ...planForm, maxFlocks: Number(e.target.value) })}
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-muted mb-1">
                  Membres max
                </label>
                <Input
                  type="number"
                  min="1"
                  value={planForm.maxMembers}
                  onChange={(e) => setPlanForm({ ...planForm, maxMembers: Number(e.target.value) })}
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-muted mb-1">
                  Rétention (mois)
                </label>
                <Input
                  type="number"
                  min="1"
                  value={planForm.retentionMonths}
                  onChange={(e) => setPlanForm({ ...planForm, retentionMonths: Number(e.target.value) })}
                  required
                />
              </div>
            </div>
          </div>

          {/* Options & Flags */}
          <div className="p-3.5 rounded-xl bg-surface-muted/50 border border-border space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
              Capacités & Modules Inclus
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={planForm.accountingExports}
                  onChange={(e) => setPlanForm({ ...planForm, accountingExports: e.target.checked })}
                  className="rounded text-primary focus:ring-primary/30 h-4 w-4"
                />
                <span className="text-foreground">Exports comptables SYSCOHADA</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={planForm.healthAlerts}
                  onChange={(e) => setPlanForm({ ...planForm, healthAlerts: e.target.checked })}
                  className="rounded text-primary focus:ring-primary/30 h-4 w-4"
                />
                <span className="text-foreground">Alertes sanitaires & mortalité</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={planForm.iotSensors}
                  onChange={(e) => setPlanForm({ ...planForm, iotSensors: e.target.checked })}
                  className="rounded text-primary focus:ring-primary/30 h-4 w-4"
                />
                <span className="text-foreground">Capteurs connectés IoT</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={planForm.apiAccess}
                  onChange={(e) => setPlanForm({ ...planForm, apiAccess: e.target.checked })}
                  className="rounded text-primary focus:ring-primary/30 h-4 w-4"
                />
                <span className="text-foreground">Accès API REST intégrateurs</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={planForm.prioritySupport}
                  onChange={(e) => setPlanForm({ ...planForm, prioritySupport: e.target.checked })}
                  className="rounded text-primary focus:ring-primary/30 h-4 w-4"
                />
                <span className="text-foreground">Support prioritaire WhatsApp/Tél</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={planForm.isRecommended}
                  onChange={(e) => setPlanForm({ ...planForm, isRecommended: e.target.checked })}
                  className="rounded text-primary focus:ring-primary/30 h-4 w-4"
                />
                <span className="text-foreground font-semibold">Mettre en avant (&laquo; Recommandé &raquo;)</span>
              </label>
            </div>
          </div>

          {/* Fonctionnalités détaillées */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Liste des fonctionnalités affichées (une par ligne)
            </label>
            <textarea
              rows={4}
              value={planForm.featuresText}
              onChange={(e) => setPlanForm({ ...planForm, featuresText: e.target.value })}
              placeholder="Ex: 5 exploitations avicoles&#10;Gestion automatisée des stocks&#10;Support email sous 24h"
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
