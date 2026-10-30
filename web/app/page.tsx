"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Building2,
  RefreshCw,
  Egg,
  Utensils,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Bird,
  Wallet,
  Clock,
  ChevronRight,
  Warehouse,
  Package,
  HeartPulse,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { CreateFarmModal } from "@/components/farms/create-farm-modal";
import { CreateFlockModal } from "@/components/flocks/create-flock-modal";
import {
  RecordEggModal,
  RecordMovementModal,
  RecordFeedingModal,
  RecordTransactionModal,
  PlanDetailsModal,
} from "@/components/dashboard";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api-client";
import {
  DashboardKPI,
  Flock,
  EggProduction,
  Transaction,
  InventoryItem,
} from "@/lib/types";
import { formatFcfa, formatNumber, formatPercent, formatDate, cn } from "@/lib/utils";

export default function DashboardPage() {
  const { activeFarm, hasPermission, hasModule, activePlan, isOwner } = useAuth();
  const [kpi, setKpi] = useState<DashboardKPI | null>(null);
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [recentEggs, setRecentEggs] = useState<EggProduction[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [createFarmModalOpen, setCreateFarmModalOpen] = useState(false);
  const [createFlockModalOpen, setCreateFlockModalOpen] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [eggModalOpen, setEggModalOpen] = useState(false);
  const [editingEgg, setEditingEgg] = useState<EggProduction | null>(null);
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [feedingModalOpen, setFeedingModalOpen] = useState(false);
  const [financeModalOpen, setFinanceModalOpen] = useState(false);
  const [financeTxType, setFinanceTxType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [selectedFlockId, setSelectedFlockId] = useState("");
  const [todayStr, setTodayStr] = useState("");

  function openCreateEggModal() {
    setEditingEgg(null);
    setEggModalOpen(true);
  }

  function handleOpenFeedingModal(flockId?: string) {
    if (flockId) setSelectedFlockId(flockId);
    setFeedingModalOpen(true);
  }

  function openFinanceModal(type: "INCOME" | "EXPENSE") {
    setFinanceTxType(type);
    setFinanceModalOpen(true);
  }

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setTodayStr(today);

    if (activeFarm?.id) {
      loadDashboardData();
    } else {
      setIsLoading(false);
    }
  }, [activeFarm?.id]);

  // Écouteur pour les actions rapides déclenchées depuis le BottomNav ou la barre d'action
  useEffect(() => {
    function handleAction(e: any) {
      const act = e.detail?.action;
      if (act === "egg") openCreateEggModal();
      else if (act === "feed") handleOpenFeedingModal();
      else if (act === "movement") setMovementModalOpen(true);
      else if (act === "income") openFinanceModal("INCOME");
      else if (act === "expense") openFinanceModal("EXPENSE");
    }

    window.addEventListener("open-dashboard-action", handleAction);

    // Vérifier les paramètres d'URL (ex: /?action=egg)
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const actionParam = params.get("action");
      if (actionParam) {
        if (actionParam === "egg") openCreateEggModal();
        else if (actionParam === "feed") handleOpenFeedingModal();
        else if (actionParam === "movement") setMovementModalOpen(true);
        else if (actionParam === "income") openFinanceModal("INCOME");
        else if (actionParam === "expense") openFinanceModal("EXPENSE");

        // Nettoyer l'URL
        window.history.replaceState({}, "", "/");
      }
    }

    return () => window.removeEventListener("open-dashboard-action", handleAction);
  }, [flocks]);

  async function loadDashboardData() {
    setIsLoading(true);
    try {
      const [kpiData, flocksData, eggsData, txData, invData] = await Promise.all([
        api.dashboard.getKpi(activeFarm?.id).catch((err) => {
          console.warn("KPIs non accessibles:", err);
          return null;
        }),
        hasPermission("flock:read") || hasPermission("flock:view")
          ? api.flocks.list({ farmId: activeFarm?.id, status: "ACTIVE" }).catch(() => [])
          : Promise.resolve([]),
        hasPermission("egg:read") || hasPermission("egg:view")
          ? api.eggs.list({ farmId: activeFarm?.id }).catch(() => [])
          : Promise.resolve([]),
        hasPermission("finance:read") || hasPermission("finance:view")
          ? api.finance.listTransactions({ farmId: activeFarm?.id }).catch(() => [])
          : Promise.resolve([]),
        hasPermission("inventory:read") || hasPermission("inventory:view")
          ? api.inventory.listItems({ farmId: activeFarm?.id }).catch(() => [])
          : Promise.resolve([]),
      ]);

      setKpi(kpiData);
      setFlocks(Array.isArray(flocksData) ? flocksData : []);
      setRecentEggs(Array.isArray(eggsData) ? eggsData.slice(0, 8) : []);
      setRecentTransactions(Array.isArray(txData) ? txData.slice(0, 8) : []);
      setInventoryItems(Array.isArray(invData) ? invData : []);

      if (Array.isArray(flocksData) && flocksData.length > 0 && !selectedFlockId) {
        setSelectedFlockId(flocksData[0].id);
      }
    } catch (err) {
      console.error("Erreur chargement dashboard:", err);
    } finally {
      setIsLoading(false);
    }
  }

  // Calculs synthétiques
  const computedLiveBirds =
    kpi?.liveBirdsTotal !== undefined && kpi.liveBirdsTotal > 0
      ? kpi.liveBirdsTotal
      : flocks.reduce((sum, f) => sum + (f.currentQuantity || 0), 0);

  const totalInitial = flocks.reduce((sum, f) => sum + (f.initialQuantity || 0), 0);
  const totalLosses = Math.max(0, totalInitial - computedLiveBirds);
  const computedMortality =
    kpi?.mortalityRateGlobal !== undefined && kpi.mortalityRateGlobal > 0
      ? kpi.mortalityRateGlobal
      : totalInitial > 0
      ? (totalLosses / totalInitial) * 100
      : 0;

  const todayEggsList = todayStr ? recentEggs.filter((e) => e.date === todayStr) : [];
  const todayEggsCount = todayEggsList.reduce((sum, e) => sum + (e.goodEggs || 0), 0);
  const computedEggsTotal =
    kpi?.eggProductionToday?.totalEggs !== undefined && kpi.eggProductionToday.totalEggs > 0
      ? kpi.eggProductionToday.totalEggs
      : todayEggsCount;

  const computedTrays =
    kpi?.eggProductionToday?.traysCount !== undefined && kpi.eggProductionToday.traysCount > 0
      ? kpi.eggProductionToday.traysCount
      : Math.floor(computedEggsTotal / 30);

  const computedLayingRate =
    kpi?.eggProductionToday?.layingRatePercent !== undefined && kpi.eggProductionToday.layingRatePercent > 0
      ? kpi.eggProductionToday.layingRatePercent
      : computedLiveBirds > 0
      ? (computedEggsTotal / computedLiveBirds) * 100
      : 0;

  const lowStockItems = inventoryItems.filter(
    (i) => i.currentStock <= i.minThreshold || i.isLowStock
  );
  const computedLowStock =
    kpi?.inventoryAlertsCount !== undefined && kpi.inventoryAlertsCount > 0
      ? kpi.inventoryAlertsCount
      : lowStockItems.length;

  const overdueHealthCount = kpi?.health?.overdueCount || 0;
  const pendingHealthCount = kpi?.health?.pendingCount || 0;

  const todayIncome = recentTransactions
    .filter((t) => t.type === "INCOME" && (todayStr ? t.date === todayStr : true))
    .reduce((sum, t) => sum + (t.amountFcfa || 0), 0);

  const totalIncome = recentTransactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + (t.amountFcfa || 0), 0);
  const totalExpense = recentTransactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + (t.amountFcfa || 0), 0);

  const computedNet =
    kpi?.financialSummary?.netCashflowFcfa !== undefined && kpi.financialSummary.netCashflowFcfa !== 0
      ? kpi.financialSummary.netCashflowFcfa
      : totalIncome - totalExpense;

  // Inventaire d'aliments pour les stats opérationnelles
  const feedItems = inventoryItems.filter(
    (i) =>
      i.category === "FEED" ||
      i.category?.includes("FEED") ||
      i.name?.toLowerCase().includes("aliment")
  );
  const totalFeedStock = feedItems.reduce((sum, i) => sum + (i.currentStock || 0), 0);
  const hasLowFeed = feedItems.some(
    (i) => i.isLowStock || (i.minThreshold > 0 && i.currentStock <= i.minThreshold)
  );

  const isBroiler = activeFarm?.productionType === "BROILER";

  // Double vérification stricte : Abonnement de la ferme (Modules) & Droits du compte utilisateur (Permissions)
  const canViewEgg = hasModule("eggs") && !isBroiler && (hasPermission("egg:read") || hasPermission("egg:view") || isOwner);
  const canCreateEgg = hasModule("eggs") && !isBroiler && (hasPermission("egg:create") || isOwner);

  const canFeed = (hasModule("inventory") || hasModule("feed_rationing")) && (hasPermission("inventory:movement") || hasPermission("flock:update") || isOwner);
  const canRecordMovement = hasPermission("flock:movement") || hasPermission("flock:create") || hasPermission("flock:update") || isOwner;

  const canViewFinance = hasModule("finance") && (hasPermission("finance:read") || hasPermission("finance:view") || isOwner);
  const canCreateFinance = hasModule("finance") && (hasPermission("finance:create") || isOwner);

  const canViewHealth = hasModule("health") && (hasPermission("health:view") || hasPermission("health:read") || isOwner);
  const canManageHealth = hasModule("health") && (hasPermission("health:manage") || isOwner);

  const canViewInventory = hasModule("inventory") && (hasPermission("inventory:read") || hasPermission("inventory:view") || isOwner);

  // Fusion des événements récents filtrés selon les autorisations et modules
  const combinedActivities = [
    ...(canViewEgg
      ? recentEggs.map((e) => ({
          id: `egg-${e.id}`,
          date: e.date,
          type: "EGG" as const,
          title: `Ramassage • ${e.flockName || "Bande"}`,
          subtitle: `${e.session === "MORNING" ? "Matin" : e.session === "NOON" ? "Midi" : "Soir"}`,
          amountText: `+${formatNumber(e.goodEggs)} œufs`,
          detailText: `${Math.floor(e.goodEggs / 30)} plateau(x)`,
          positive: true,
        }))
      : []),
    ...(canViewFinance
      ? recentTransactions.map((t) => ({
          id: `tx-${t.id}`,
          date: t.date,
          type: "FINANCE" as const,
          title: `${t.type === "INCOME" ? "Vente" : "Dépense"} • ${t.category}`,
          subtitle: t.contact?.name || t.notes || (t.type === "INCOME" ? "Encaissement" : "Décaissement"),
          amountText: `${t.type === "INCOME" ? "+" : "-"} ${formatFcfa(t.amountFcfa)}`,
          detailText: t.paymentMethod ? t.paymentMethod.replace("_", " ") : "Comptant",
          positive: t.type === "INCOME",
        }))
      : []),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <Shell>
      {!activeFarm ? (
        <div className="mt-8 rounded-3xl border border-dashed border-border bg-surface p-8 sm:p-14 text-center max-w-2xl mx-auto shadow-xs">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 shadow-xs">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">
            Bienvenue sur Lefermier !
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-muted max-w-md mx-auto leading-relaxed">
            Créez votre première exploitation pour commencer le suivi de votre élevage.
          </p>
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => setCreateFarmModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-primary-hover transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Créer ma ferme</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3.5 sm:space-y-4">
          {/* 1. Vitaux du jour (100% opérationnel, court & précis) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {/* KPI 1 : Ponte ou Âge */}
            {canViewEgg ? (
              <StatCard
                title="Ponte"
                value={formatNumber(computedEggsTotal)}
                subtitle={computedTrays > 0 ? `${computedTrays} pl.` : "0 ramassage"}
                trend={
                  computedLayingRate > 0
                    ? { value: `${computedLayingRate.toFixed(1)}%`, isPositive: computedLayingRate >= 75 }
                    : undefined
                }
                accent="amber"
                icon={<Egg className="h-4 w-4" />}
              />
            ) : (
              <StatCard
                title="Âge"
                value={flocks.length > 0 ? `S${flocks[0].ageInWeeks || "?"}` : "—"}
                subtitle={flocks.length > 0 ? `J${flocks[0].ageInDays || "?"}` : "0 lot"}
                accent="sky"
                icon={<Clock className="h-4 w-4" />}
              />
            )}

            {/* KPI 2 : Vivantes */}
            <StatCard
              title="Vivantes"
              value={formatNumber(computedLiveBirds)}
              subtitle={totalLosses > 0 ? `${totalLosses} perte(s)` : "0 perte"}
              accent={computedMortality > 4 ? "rose" : "primary"}
              icon={<Bird className="h-4 w-4" />}
            />

            {/* KPI 3 : Aliment ou Lots */}
            {canViewInventory && feedItems.length > 0 ? (
              <StatCard
                title="Aliment"
                value={`${formatNumber(totalFeedStock)} ${feedItems[0]?.unitShortLabel || feedItems[0]?.unit || "sacs"}`}
                subtitle={hasLowFeed ? "Alerte réappro" : `${feedItems.length} réf.`}
                accent={hasLowFeed ? "rose" : "primary"}
                icon={<Utensils className="h-4 w-4" />}
              />
            ) : (
              <StatCard
                title="Lots"
                value={flocks.length}
                subtitle={
                  flocks.length > 0
                    ? `${flocks.filter((f) => f.type === "LAYER").length} ponte • ${flocks.filter((f) => f.type === "BROILER").length} chair`
                    : "0 lot actif"
                }
                accent="primary"
                icon={<Warehouse className="h-4 w-4" />}
              />
            )}

            {/* KPI 4 : Santé */}
            {canViewHealth ? (
              <StatCard
                title="Santé"
                value={
                  overdueHealthCount > 0
                    ? `${overdueHealthCount} retard`
                    : pendingHealthCount > 0
                    ? `${pendingHealthCount} prévu(s)`
                    : "À jour"
                }
                subtitle={
                  overdueHealthCount > 0
                    ? "Soin urgent"
                    : pendingHealthCount > 0
                    ? "À faire"
                    : "OK"
                }
                accent={overdueHealthCount > 0 ? "rose" : "primary"}
                icon={<HeartPulse className="h-4 w-4" />}
              />
            ) : (
              <StatCard
                title="Bâtiments"
                value={flocks.length}
                subtitle="En service"
                accent="primary"
                icon={<Warehouse className="h-4 w-4" />}
              />
            )}
          </div>

          {/* 3. Alertes (si stock bas ou vaccin en retard) */}
          {((canViewInventory && computedLowStock > 0) || (canViewHealth && overdueHealthCount > 0)) && (
            <div className="rounded-2xl border border-danger/30 bg-danger-soft p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-danger">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Alertes
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {lowStockItems.slice(0, 2).map((item) => (
                  <Link
                    key={item.id}
                    href={`/inventory/${item.id}`}
                    className="flex items-center justify-between rounded-xl bg-surface p-2.5 border border-border hover:border-danger/40 transition-colors"
                  >
                    <span className="font-semibold text-foreground truncate mr-2">
                      Stock bas : {item.name}
                    </span>
                    <span className="font-mono text-danger font-bold shrink-0">
                      Reste {item.currentStock} {item.unit}
                    </span>
                  </Link>
                ))}

                {overdueHealthCount > 0 && (
                  <Link
                    href="/health"
                    className="flex items-center justify-between rounded-xl bg-surface p-2.5 border border-border hover:border-danger/40 transition-colors"
                  >
                    <span className="font-semibold text-foreground truncate mr-2">
                      {overdueHealthCount} soin(s) en retard
                    </span>
                    <span className="text-[11px] font-bold text-danger shrink-0">
                      Calendrier →
                    </span>
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* 4. Mes lots */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <h2 className="text-xs sm:text-sm font-bold text-foreground">
                  Mes lots
                </h2>
                <span className="text-[10px] font-bold rounded-md bg-surface-muted px-1.5 py-0.5 text-muted">
                  {flocks.length}
                </span>
              </div>

              <div className="flex items-center gap-2">
             
                <Link
                  href="/flocks"
                  className="text-xs font-semibold text-muted hover:text-primary transition-colors flex items-center gap-0.5"
                >
                  <span>Voir tout</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {flocks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center">
                <Bird className="h-7 w-7 text-muted mx-auto mb-2 opacity-50" />
                <p className="text-xs text-muted">Aucun lot actif.</p>
                {(hasPermission("flock:create") || isOwner) && (
                  <button
                    type="button"
                    onClick={() => setCreateFlockModalOpen(true)}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-hover active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Nouveau lot</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {flocks.slice(0, 3).map((flock) => {
                  const losses = flock.initialQuantity - flock.currentQuantity;
                  return (
                    <div
                      key={flock.id}
                      className="rounded-2xl border border-border bg-surface p-3.5 shadow-2xs space-y-2.5 hover:border-primary/40 transition-all"
                    >
                      {/* En-tête du lot */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">
                            {flock.name}
                          </h3>
                          <div className="flex items-center gap-1.5 text-[11px] text-muted mt-0.5 truncate">
                            <span>{flock.breed || "Standard"}</span>
                            {flock.buildingName && (
                              <>
                                <span>•</span>
                                <span className="text-primary font-medium flex items-center gap-1 truncate">
                                  <Warehouse className="h-3 w-3 shrink-0" />
                                  {flock.buildingName}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <Badge variant={flock.type === "LAYER" ? "warning" : "info"} size="sm">
                          {flock.type === "LAYER" ? "Ponte" : "Chair"}
                        </Badge>
                      </div>

                      {/* Métriques clés en pastilles */}
                      <div className="grid grid-cols-3 gap-1.5 bg-surface-muted/60 rounded-xl p-2 text-center">
                        <div>
                          <div className="text-[10px] text-muted">Vivantes</div>
                          <div className="text-xs font-bold text-primary font-mono">
                            {formatNumber(flock.currentQuantity)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-muted">Âge</div>
                          <div className="text-xs font-bold text-foreground font-mono">
                            S{flock.ageInWeeks || "?"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-muted">Pertes</div>
                          <div className={cn("text-xs font-bold font-mono", losses > 0 ? "text-danger" : "text-muted")}>
                            {losses}
                          </div>
                        </div>
                      </div>

                      {/* Actions rapides sur le lot */}
                      <div className="flex items-center gap-1.5 pt-1 border-t border-border/50">
                        {canFeed && (
                          <button
                            type="button"
                            onClick={() => handleOpenFeedingModal(flock.id)}
                            className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 py-1.5 text-xs font-bold text-emerald-600 hover:bg-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                          >
                            <Utensils className="h-3.5 w-3.5" />
                            <span>Nourrir</span>
                          </button>
                        )}

                        <Link
                          href={`/flocks/${flock.id}`}
                          className={cn(
                            "inline-flex items-center justify-center gap-1 rounded-xl border border-border bg-surface py-1.5 text-xs font-semibold text-foreground hover:bg-surface-hover active:scale-95 transition-all",
                            canFeed ? "flex-1" : "w-full"
                          )}
                        >
                          <span>Fiche</span>
                          <ChevronRight className="h-3.5 w-3.5 text-muted" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 5. Journal */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs sm:text-sm font-bold text-foreground">
                Journal
              </h2>
              <span className="text-[10px] text-muted font-medium">
                {combinedActivities.length} op.
              </span>
            </div>

            {combinedActivities.length === 0 ? (
              <div className="rounded-2xl border border-border bg-surface p-6 text-center">
                <CheckCircle2 className="h-7 w-7 text-primary mx-auto mb-2 opacity-40" />
                <p className="text-xs text-muted">
                  Aucune opération récente.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-surface divide-y divide-border/60 overflow-hidden shadow-2xs">
                {combinedActivities.map((act) => (
                  <div
                    key={act.id}
                    className="flex items-center justify-between p-3 hover:bg-surface-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-2xs",
                          act.type === "EGG"
                            ? "bg-amber-500/15 text-amber-600"
                            : act.positive
                            ? "bg-success/15 text-success"
                            : "bg-danger/15 text-danger"
                        )}
                      >
                        {act.type === "EGG" ? (
                          <Egg className="h-4 w-4" />
                        ) : act.positive ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs font-bold text-foreground truncate">
                          {act.title}
                        </div>
                        <div className="text-[10px] text-muted truncate">
                          {formatDate(act.date)} • {act.subtitle}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-2">
                      <div
                        className={cn(
                          "text-xs font-bold font-mono",
                          act.type === "EGG"
                            ? "text-amber-600 font-extrabold"
                            : act.positive
                            ? "text-success"
                            : "text-danger"
                        )}
                      >
                        {act.amountText}
                      </div>
                      <div className="text-[10px] text-muted">
                        {act.detailText}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODALES DASHBOARD FONCTIONNELLES */}
      <RecordEggModal
        isOpen={eggModalOpen}
        onClose={() => {
          setEggModalOpen(false);
          setEditingEgg(null);
        }}
        onSuccess={loadDashboardData}
        flocks={flocks}
        recentEggs={recentEggs}
        editingEgg={editingEgg}
        defaultFlockId={selectedFlockId}
      />

      <RecordMovementModal
        isOpen={movementModalOpen}
        onClose={() => setMovementModalOpen(false)}
        onSuccess={loadDashboardData}
        flocks={flocks}
        defaultFlockId={selectedFlockId}
      />

      <RecordFeedingModal
        isOpen={feedingModalOpen}
        onClose={() => setFeedingModalOpen(false)}
        onSuccess={loadDashboardData}
        flocks={flocks}
        inventoryItems={inventoryItems}
        activeFarmId={activeFarm?.id}
        defaultFlockId={selectedFlockId}
      />

      <RecordTransactionModal
        isOpen={financeModalOpen}
        onClose={() => setFinanceModalOpen(false)}
        onSuccess={loadDashboardData}
        activeFarmId={activeFarm?.id}
        initialType={financeTxType}
      />

      <CreateFarmModal
        isOpen={createFarmModalOpen}
        onClose={() => setCreateFarmModalOpen(false)}
      />

      <CreateFlockModal
        isOpen={createFlockModalOpen}
        onClose={() => setCreateFlockModalOpen(false)}
        onSuccess={loadDashboardData}
      />

      {isOwner && (
        <PlanDetailsModal
          isOpen={planModalOpen}
          onClose={() => setPlanModalOpen(false)}
          subscription={kpi?.subscription}
          planName={activePlan?.planName}
          badge={activePlan?.badge}
          activeModules={activePlan?.modules}
        />
      )}
    </Shell>
  );
}
