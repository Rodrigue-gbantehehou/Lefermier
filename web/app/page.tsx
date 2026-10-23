"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bird,
  Egg,
  AlertTriangle,
  Wallet,
  RefreshCw,
  ArrowRight,
  Plus,
  Edit3,
  Building2,
  Utensils,
  CheckCircle2,
  TrendingUp,
  Package,
  Lock,
  Zap,
  HeartPulse,
} from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { StatCard } from "@/components/ui/stat-card";
import { CreateFarmModal } from "@/components/farms/create-farm-modal";
import {
  RecordEggModal,
  RecordMovementModal,
  RecordFeedingModal,
  RecordTransactionModal,
  PlanDetailsModal,
} from "@/components/dashboard";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api-client";
import {
  DashboardKPI,
  Flock,
  EggProduction,
  Transaction,
  InventoryItem,
} from "@/lib/types";
import { formatFcfa, formatNumber, formatPercent, formatEggTraysSummary, formatDate } from "@/lib/utils";
import { formatInventoryUnit } from "@/lib/units";

export default function DashboardPage() {
  const { activeFarm, hasPermission, hasModule, activePlan } = useAuth();
  const [kpi, setKpi] = useState<DashboardKPI | null>(null);
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [recentEggs, setRecentEggs] = useState<EggProduction[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [createFarmModalOpen, setCreateFarmModalOpen] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [eggModalOpen, setEggModalOpen] = useState(false);
  const [editingEgg, setEditingEgg] = useState<EggProduction | null>(null);
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [feedingModalOpen, setFeedingModalOpen] = useState(false);
  const [financeModalOpen, setFinanceModalOpen] = useState(false);
  const [selectedFlockId, setSelectedFlockId] = useState("");
  const [todayStr, setTodayStr] = useState("");

  function openCreateEggModal() {
    setEditingEgg(null);
    setEggModalOpen(true);
  }

  function openEditEggModal(egg: EggProduction) {
    setEditingEgg(egg);
    setEggModalOpen(true);
  }

  useEffect(() => {
    setTodayStr(new Date().toISOString().split("T")[0]);
    if (activeFarm?.id) {
      loadDashboardData();
    } else {
      setIsLoading(false);
    }
  }, [activeFarm?.id]);

  async function loadDashboardData() {
    setIsLoading(true);
    try {
      const [kpiData, flocksData, eggsData, txData, invData] = await Promise.all([
        api.dashboard.getKpi(activeFarm?.id).catch((err) => {
          console.warn("KPIs non accessibles ou restreints:", err);
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
      setRecentEggs(Array.isArray(eggsData) ? eggsData.slice(0, 5) : []);
      setRecentTransactions(Array.isArray(txData) ? txData.slice(0, 5) : []);
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

  // Calculs directs et résilients pour garantir l'affichage immédiat des statistiques
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

  // Date du jour initialisée dans useEffect pour éviter l'erreur de prerender SSR Next.js
  const todayEggsList = todayStr ? recentEggs.filter((e) => e.date === todayStr) : [];
  const fallbackTodayEggs =
    todayEggsList.length > 0
      ? todayEggsList.reduce((sum, e) => sum + (e.goodEggs || 0), 0)
      : recentEggs.length > 0
        ? recentEggs.slice(0, 2).reduce((sum, e) => sum + (e.goodEggs || 0), 0)
        : 0;

  const computedEggsTotal =
    kpi?.eggProductionToday?.totalEggs !== undefined && kpi.eggProductionToday.totalEggs > 0
      ? kpi.eggProductionToday.totalEggs
      : fallbackTodayEggs;

  const computedTrays =
    kpi?.eggProductionToday?.traysCount !== undefined && kpi.eggProductionToday.traysCount > 0
      ? kpi.eggProductionToday.traysCount
      : Math.floor(computedEggsTotal / 30);

  const computedLoose =
    kpi?.eggProductionToday?.looseEggs !== undefined
      ? kpi.eggProductionToday.looseEggs
      : computedEggsTotal % 30;

  const computedLayingRate =
    kpi?.eggProductionToday?.layingRatePercent !== undefined && kpi.eggProductionToday.layingRatePercent > 0
      ? kpi.eggProductionToday.layingRatePercent
      : computedLiveBirds > 0
        ? (computedEggsTotal / computedLiveBirds) * 100
        : 0;

  const computedLowStock =
    kpi?.inventoryAlertsCount !== undefined && kpi.inventoryAlertsCount > 0
      ? kpi.inventoryAlertsCount
      : inventoryItems.filter((i) => i.currentStock <= i.minThreshold || i.isLowStock).length;

  const fallbackIncome = recentTransactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + (t.amountFcfa || 0), 0);
  const fallbackExpense = recentTransactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + (t.amountFcfa || 0), 0);

  const computedRevenue =
    kpi?.financialSummary?.revenueFcfa !== undefined && kpi.financialSummary.revenueFcfa > 0
      ? kpi.financialSummary.revenueFcfa
      : fallbackIncome;

  const computedNet =
    kpi?.financialSummary?.netCashflowFcfa !== undefined && kpi.financialSummary.netCashflowFcfa !== 0
      ? kpi.financialSummary.netCashflowFcfa
      : fallbackIncome - fallbackExpense;

  // Accès aux modules selon l'offre souscrite
  const hasEggAccess = hasModule("eggs") && kpi?.hasEggAccess !== false;
  const hasFinanceAccess = hasModule("finance") && kpi?.hasFinanceAccess !== false;
  const hasInventoryAccess = hasModule("inventory") && kpi?.hasInventoryAccess !== false;
  const hasHealthAccess = hasModule("health") && kpi?.health?.hasAccess !== false;

  // Métriques et jauges de quotas de l'exploitation
  const flockQuota = kpi?.subscription?.quotas?.flocks || {
    current: flocks.length,
    max: activePlan?.quotas?.maxFlocks ?? 2,
    percent: Math.min(100, Math.round((flocks.length / (activePlan?.quotas?.maxFlocks ?? 2)) * 100)),
    isExceeded: flocks.length > (activePlan?.quotas?.maxFlocks ?? 2),
    isUnlimited: (activePlan?.quotas?.maxFlocks ?? 2) >= 9999,
  };

  const buildingQuota = kpi?.subscription?.quotas?.buildings || {
    current: 0,
    max: activePlan?.quotas?.maxBuildings ?? 2,
    percent: 0,
    isExceeded: false,
    isUnlimited: (activePlan?.quotas?.maxBuildings ?? 2) >= 9999,
  };

  const farmQuota = kpi?.subscription?.quotas?.farms || {
    current: 1,
    max: activePlan?.quotas?.maxFarms ?? 1,
    percent: 100,
    isExceeded: false,
    isUnlimited: (activePlan?.quotas?.maxFarms ?? 1) >= 9999,
  };

  const isFlockQuotaReached = !flockQuota.isUnlimited && flockQuota.current >= flockQuota.max;



  const dashboardFlockColumns: ColumnDef<Flock>[] = [
    {
      key: "name",
      header: "Nom du groupe",
      sortable: true,
      cell: (f) => (
        <div>
          <span className="font-bold text-foreground">{f.name}</span>
          {f.code && <div className="text-[10px] font-mono text-muted">{f.code}</div>}
        </div>
      ),
    },
    {
      key: "type",
      header: "Type d'élevage",
      sortable: true,
      cell: (f) => (
        <span className="text-xs font-medium text-foreground">
          {f.type === "LAYER"
            ? "Pondeuses"
            : f.type === "BROILER"
              ? "Chair"
              : "Mixte"}
        </span>
      ),
    },
    {
      key: "breed",
      header: "Race",
      sortable: true,
      accessor: (f) => f.breed || "-",
      cell: (f) => <span className="text-muted">{f.breed || "-"}</span>,
    },
    {
      key: "initialQuantity",
      header: "Au départ",
      sortable: true,
      align: "right",
      accessor: (f) => f.initialQuantity,
      cell: (f) => (
        <span className="font-mono text-muted">
          {formatNumber(f.initialQuantity)}
        </span>
      ),
    },
    {
      key: "currentQuantity",
      header: "Poules vivantes",
      sortable: true,
      align: "right",
      accessor: (f) => f.currentQuantity,
      cell: (f) => (
        <span className="font-mono font-bold text-primary">
          {formatNumber(f.currentQuantity)}
        </span>
      ),
    },
    {
      key: "losses",
      header: "Pertes (morts)",
      sortable: true,
      align: "right",
      accessor: (f) => f.initialQuantity - f.currentQuantity,
      cell: (f) => {
        const losses = f.initialQuantity - f.currentQuantity;
        return (
          <span className={`font-mono font-semibold ${losses > 0 ? "text-danger" : "text-muted"}`}>
            {losses > 0 ? `-${formatNumber(losses)}` : "0"}
          </span>
        );
      },
    },
    {
      key: "startDate",
      header: "Date d'arrivée",
      sortable: true,
      align: "right",
      accessor: (f) => f.startDate,
      cell: (f) => (
        <span className="font-mono text-muted">
          {formatDate(f.startDate)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Action",
      align: "right",
      cell: (f) => (
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedFlockId(f.id);
              setFeedingModalOpen(true);
            }}
            className="inline-flex items-center gap-1 rounded-lg bg-amber-600/10 border border-amber-600/20 px-2.5 py-1 text-xs font-bold text-amber-700 hover:bg-amber-600 hover:text-white transition-colors"
          >
            <Utensils className="h-3 w-3" />
            <span>Nourrir</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <Shell>
      {!activeFarm ? (
        <div className="mt-8 rounded-3xl border border-dashed border-border bg-surface p-8 sm:p-14 text-center max-w-2xl mx-auto shadow-xs animate-in fade-in duration-300">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 shadow-xs">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">
            Bienvenue sur votre espace d'élevage !
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-muted max-w-md mx-auto leading-relaxed">
            Votre compte est actif. Vous n'avez pas encore d'exploitation avicole associée.
            Créez votre première ferme pour enregistrer vos bandes de volailles, saisir vos pontes d'œufs et suivre vos stocks.
          </p>
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => setCreateFarmModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-primary-hover transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Créer ma première ferme</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Page Header */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between pb-6 border-b border-border">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Tableau de bord — {activeFarm.name}
              </h1>
              <p className="mt-1 text-xs text-muted">
                Vue d'ensemble opérationnelle, zootechnique et financière en temps réel.
              </p>
            </div>

            {/* Action Buttons Toolbar */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-2 sm:gap-2.5">
              <button
                type="button"
                onClick={loadDashboardData}
                title="Actualiser les données"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 text-xs font-semibold text-foreground shadow-xs hover:bg-surface-hover transition-colors whitespace-nowrap"
              >
                <RefreshCw className={`h-3.5 w-3.5 shrink-0 ${isLoading ? "animate-spin text-primary" : "text-muted"}`} />
                <span>Actualiser</span>
              </button>

              <button
                type="button"
                onClick={() => setFeedingModalOpen(true)}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-3.5 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition-colors whitespace-nowrap"
              >
                <Utensils className="h-3.5 w-3.5 shrink-0" />
                <span>Nourrir</span>
              </button>

              {hasPermission("flock:update") && (
                <button
                  type="button"
                  onClick={() => setMovementModalOpen(true)}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-danger px-3.5 text-xs font-bold text-white shadow-xs hover:opacity-90 transition-opacity whitespace-nowrap"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Mouvement / Perte</span>
                </button>
              )}

              {hasFinanceAccess && hasPermission("finance:create") && (
                <button
                  type="button"
                  onClick={() => setFinanceModalOpen(true)}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-primary px-3.5 text-xs font-bold text-white shadow-xs hover:bg-primary-hover transition-colors whitespace-nowrap"
                >
                  <Wallet className="h-4 w-4 shrink-0" />
                  <span>Recette / Dépense</span>
                </button>
              )}
            </div>
          </div>

          {/* Formule & Quotas de l'exploitation */}
          <div className="mt-6 rounded-2xl border border-border bg-surface p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/70">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-foreground">
                      Formule : {kpi?.subscription?.planName || activePlan?.planName || "Formule Starter"}
                    </span>
                    <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-extrabold text-primary">
                      {kpi?.subscription?.badge || activePlan?.badge || activePlan?.plan || "Actif"}
                    </span>
                    {kpi?.subscription?.isOverQuota && (
                      <span className="rounded-md bg-danger/15 px-2 py-0.5 text-[10px] font-bold text-danger">
                        Quota dépassé
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted">
                    Quotas de ressources et modules actifs sur votre ferme.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPlanModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface-muted px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-hover hover:border-primary/40 transition-colors shrink-0 self-start sm:self-auto"
              >
                <span>Détails & Modules</span>
                <ArrowRight className="h-3 w-3 text-muted" />
              </button>
            </div>

            {/* Jauges Quotas */}
            <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Bandes */}
              <div className="rounded-xl border border-border/80 bg-surface-muted/60 p-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">Bandes de volailles</span>
                  <span className="font-mono font-bold text-foreground">
                    {flockQuota.current} / {flockQuota.isUnlimited ? "Illimité" : flockQuota.max}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-border overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      flockQuota.isExceeded || flockQuota.percent >= 100
                        ? "bg-danger"
                        : flockQuota.percent >= 80
                          ? "bg-amber-500"
                          : "bg-primary"
                    }`}
                    style={{ width: `${Math.min(100, flockQuota.percent)}%` }}
                  />
                </div>
                <div className="text-[10px] text-muted">
                  {flockQuota.isUnlimited
                    ? "Aucune limite sur les bandes"
                    : flockQuota.isExceeded
                      ? "Limite dépassée"
                      : `${Math.max(0, flockQuota.max - flockQuota.current)} place(s) restante(s)`}
                </div>
              </div>

              {/* Bâtiments */}
              <div className="rounded-xl border border-border/80 bg-surface-muted/60 p-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">Bâtiments d'élevage</span>
                  <span className="font-mono font-bold text-foreground">
                    {buildingQuota.current} / {buildingQuota.isUnlimited ? "Illimité" : buildingQuota.max}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-border overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      buildingQuota.isExceeded || buildingQuota.percent >= 100
                        ? "bg-danger"
                        : buildingQuota.percent >= 80
                          ? "bg-amber-500"
                          : "bg-primary"
                    }`}
                    style={{ width: `${Math.min(100, buildingQuota.percent)}%` }}
                  />
                </div>
                <div className="text-[10px] text-muted">
                  {buildingQuota.isUnlimited
                    ? "Bâtiments illimités"
                    : `${Math.max(0, buildingQuota.max - buildingQuota.current)} bâtiment(s) disponible(s)`}
                </div>
              </div>

              {/* Fermes organisation */}
              <div className="rounded-xl border border-border/80 bg-surface-muted/60 p-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">Fermes rattachées</span>
                  <span className="font-mono font-bold text-foreground">
                    {farmQuota.current} / {farmQuota.isUnlimited ? "Illimité" : farmQuota.max}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-border overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      farmQuota.isExceeded || farmQuota.percent >= 100
                        ? "bg-danger"
                        : farmQuota.percent >= 80
                          ? "bg-amber-500"
                          : "bg-primary"
                    }`}
                    style={{ width: `${Math.min(100, farmQuota.percent)}%` }}
                  />
                </div>
                <div className="text-[10px] text-muted">
                  {farmQuota.isUnlimited
                    ? "Fermes illimitées"
                    : `${Math.max(0, farmQuota.max - farmQuota.current)} ferme(s) restante(s)`}
                </div>
              </div>
            </div>

            {/* Alerte si le quota de bandes est atteint */}
            {isFlockQuotaReached && (
              <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5 text-xs text-amber-800 dark:text-amber-300">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>
                    Quota de bandes atteint ({flockQuota.current}/{flockQuota.max}). Pour ajouter un nouveau groupe, passez à la formule supérieure.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPlanModalOpen(true)}
                  className="text-[11px] font-bold text-amber-700 dark:text-amber-200 underline hover:no-underline shrink-0"
                >
                  Voir les options
                </button>
              </div>
            )}
          </div>

          {/* KPI Cards Grid */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* Poules vivantes */}
            <StatCard
              title="Poules vivantes"
              value={`${formatNumber(computedLiveBirds)} poules`}
              subtitle={`${flocks.length || kpi?.activeFlocksCount || 0} groupe(s) en élevage`}
              accent="primary"
              icon={<Bird className="h-5 w-5" />}
            />

            {/* Pertes / Mortalité */}
            <StatCard
              title="Pertes (Mortalité)"
              value={formatPercent(computedMortality)}
              subtitle="Sur toutes les poules de la ferme"
              accent={computedMortality > 3 ? "rose" : "primary"}
              icon={<AlertTriangle className="h-5 w-5" />}
              trend={{
                value: computedMortality <= 2 ? "Normal (<3%)" : "Pertes constatées",
                isPositive: computedMortality <= 2,
              }}
            />

            {/* Œufs du Jour */}
            {hasEggAccess && (
              <StatCard
                title="Œufs récoltés aujourd'hui"
                value={`${formatNumber(computedEggsTotal)} œufs`}
                subtitle={
                  computedEggsTotal === 0
                    ? "Aucune ponte enregistrée"
                    : computedTrays === 0
                      ? "Moins d'un plateau complet (30 œufs)"
                      : `${computedTrays} plateau${computedTrays > 1 ? "x" : ""}${
                          computedLoose > 0 ? ` + ${computedLoose} œuf${computedLoose > 1 ? "s" : ""}` : " complets"
                        }`
                }
                accent="amber"
                icon={<Egg className="h-5 w-5" />}
              />
            )}

            {/* Rendement de Ponte */}
            {hasEggAccess && (
              <StatCard
                title="Rendement de ponte"
                value={formatPercent(computedLayingRate)}
                subtitle="Poules qui ont pondu aujourd'hui"
                accent="amber"
                icon={<TrendingUp className="h-5 w-5" />}
                trend={{
                  value: computedLayingRate >= 75 ? "Très bonne ponte (>75%)" : "Ponte modérée",
                  isPositive: computedLayingRate >= 75,
                }}
              />
            )}

            {/* Argent disponible en caisse */}
            {hasFinanceAccess && (
              <StatCard
                title="Argent disponible (Caisse)"
                value={formatFcfa(computedNet)}
                subtitle={`Total des ventes : ${formatFcfa(computedRevenue)}`}
                accent={computedNet >= 0 ? "primary" : "rose"}
                icon={<Wallet className="h-5 w-5" />}
                trend={{
                  value: computedNet >= 0 ? "Caisse positive" : "Caisse en déficit",
                  isPositive: computedNet >= 0,
                }}
                className="sm:col-span-2 xl:col-span-2"
              />
            )}

            {/* Produits presque finis */}
            {hasInventoryAccess && (
              <StatCard
                title="Aliments & Produits presque finis"
                value={`${computedLowStock} produit(s)`}
                subtitle="Stock bientôt vide à commander"
                accent={computedLowStock > 0 ? "rose" : "zinc"}
                icon={<AlertTriangle className="h-5 w-5" />}
                trend={{
                  value: computedLowStock === 0 ? "Stock suffisant" : "À commander vite",
                  isPositive: computedLowStock === 0,
                }}
                className="sm:col-span-2 xl:col-span-2"
              />
            )}
          </div>

          {/* Active Flocks Overview */}
          <div className="mt-8">
            <DataTable<Flock>
              title="Vos groupes de volaille en élevage"
              subtitle="Nombre de poules par groupe, race, pertes et date d'arrivée."
              data={flocks}
              columns={dashboardFlockColumns}
              searchable={true}
              searchPlaceholder="Rechercher un groupe..."
              searchAccessor={(f: Flock) => `${f.name} ${f.code || ""} ${f.breed || ""}`}
              pageSize={10}
              actions={
                <Link
                  href="/flocks"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  <span>Gérer les poules</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              }
              emptyState={{
                title: "Aucune poule enregistrée",
                description: "Ajoutez votre premier groupe de poussins ou poules pondeuses pour démarrer le suivi.",
              }}
            />
          </div>

          {/* Opérations Récentes : Récoltes d'œufs & Caisse (Modules 'eggs' et 'finance') */}
          {(hasEggAccess || hasFinanceAccess) && (
            <div className={`mt-8 grid grid-cols-1 gap-6 ${hasEggAccess && hasFinanceAccess ? "lg:grid-cols-2" : ""}`}>
              {/* Derniers ramassages d'œufs */}
              {hasEggAccess && (
                <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-4 border-b border-border">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent shadow-2xs">
                          <Egg className="h-5 w-5" />
                        </div>
                        <div>
                          <h2 className="text-base font-bold text-foreground">
                            Derniers ramassages d'œufs
                          </h2>
                          <p className="text-xs text-muted">
                            Récoltes récentes et alvéoles de ponte
                          </p>
                        </div>
                      </div>
                      <Link
                        href="/eggs"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                      >
                        <span>Voir tout</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                    {recentEggs.length === 0 ? (
                      <EmptyState
                        icon={<Egg className="h-6 w-6 text-accent" />}
                        title="Aucun ramassage récent"
                        description="Enregistrez la récolte d'œufs du jour pour suivre votre ponte."
                        actionLabel={hasPermission("egg:create") ? "Saisir une ponte" : undefined}
                        onAction={openCreateEggModal}
                        className="my-4 border-none"
                      />
                    ) : (
                      <>
                        {/* Mobile Cards View (< md) */}
                        <div className="mt-4 space-y-2.5 md:hidden">
                          {recentEggs.map((egg) => {
                            const sessionMap: Record<string, string> = {
                              MORNING: "Matin",
                              NOON: "Midi",
                              EVENING: "Soir",
                              ALL_DAY: "Journée",
                            };
                            return (
                              <div
                                key={egg.id}
                                className="rounded-xl border border-border bg-surface p-3 space-y-2 shadow-2xs"
                              >
                                <div className="flex items-start justify-between gap-2 border-b border-border/50 pb-2">
                                  <div>
                                    <span className="font-bold text-xs text-foreground block">
                                      {formatDate(egg.date)}
                                    </span>
                                    <span className="text-[10px] text-muted">
                                      {sessionMap[egg.session] || egg.session} • {egg.flockName || "Pondeuses"}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-bold font-mono text-xs text-accent block">
                                      {formatEggTraysSummary(egg.traysCount, egg.looseEggs, egg.goodEggs)}
                                    </span>
                                    <span className="text-[10px] text-muted font-mono">
                                      {formatNumber(egg.goodEggs)} œufs
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between text-xs pt-0.5">
                                  <span className="text-[11px] text-muted">
                                    Cassés :{" "}
                                    {egg.brokenEggs > 0 ? (
                                      <span className="text-danger font-semibold">-{egg.brokenEggs}</span>
                                    ) : (
                                      "0"
                                    )}
                                  </span>
                                  {hasPermission("egg:create") && (
                                    <button
                                      type="button"
                                      onClick={() => openEditEggModal(egg)}
                                      title="Modifier ce ramassage"
                                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-muted px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-surface-hover hover:border-accent hover:text-accent transition-colors"
                                    >
                                      <Edit3 className="h-3 w-3" />
                                      <span>Modifier</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Desktop Table (>= md) */}
                        <div className="hidden md:block mt-4 overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                          <table className="w-full min-w-[500px] text-left text-xs">
                            <thead className="bg-surface-muted text-muted">
                              <tr>
                                <th className="py-2.5 px-3 font-semibold rounded-l-lg whitespace-nowrap">Date & Moment</th>
                                <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Groupe</th>
                                <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">Plateaux de 30</th>
                                <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">Cassés</th>
                                <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">Total</th>
                                <th className="py-2.5 px-3 font-semibold text-right rounded-r-lg whitespace-nowrap">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {recentEggs.map((egg) => {
                                const sessionMap: Record<string, string> = {
                                  MORNING: "Matin",
                                  NOON: "Midi",
                                  EVENING: "Soir",
                                  ALL_DAY: "Journée",
                                };
                                return (
                                  <tr key={egg.id} className="hover:bg-surface-hover transition-colors">
                                    <td className="py-3 px-3 font-semibold text-foreground">
                                      <div>{formatDate(egg.date)}</div>
                                      <span className="text-[10px] text-muted">
                                        {sessionMap[egg.session] || egg.session}
                                      </span>
                                    </td>
                                    <td className="py-3 px-3 text-muted">
                                      {egg.flockName || "Pondeuses"}
                                    </td>
                                    <td className="py-3 px-3 text-right font-mono font-bold text-accent">
                                      {formatEggTraysSummary(egg.traysCount, egg.looseEggs, egg.goodEggs)}
                                    </td>
                                    <td className="py-3 px-3 text-right font-mono">
                                      {egg.brokenEggs > 0 ? (
                                        <span className="text-danger font-semibold">-{egg.brokenEggs}</span>
                                      ) : (
                                        <span className="text-muted">0</span>
                                      )}
                                    </td>
                                    <td className="py-3 px-3 text-right font-mono font-bold text-foreground">
                                      {formatNumber(egg.goodEggs)}
                                    </td>
                                    <td className="py-3 px-3 text-right">
                                      {hasPermission("egg:create") && (
                                        <button
                                          type="button"
                                          onClick={() => openEditEggModal(egg)}
                                          title="Modifier ce ramassage"
                                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-muted px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-surface-hover hover:border-accent hover:text-accent transition-colors"
                                        >
                                          <Edit3 className="h-3 w-3" />
                                          <span>Modifier</span>
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>

                  {hasPermission("egg:create") && (
                    <div className="mt-4 pt-3 border-t border-border flex justify-end">
                      <button
                        type="button"
                        onClick={openCreateEggModal}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-accent-hover transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Noter un ramassage</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Dernières opérations */}
              {hasFinanceAccess && (
                <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-4 border-b border-border">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary shadow-2xs">
                          <Wallet className="h-5 w-5" />
                        </div>
                        <div>
                          <h2 className="text-base font-bold text-foreground">
                            Dernières opérations
                          </h2>
                          <p className="text-xs text-muted">
                            Ventes encaissées et dépenses récentes
                          </p>
                        </div>
                      </div>
                      <Link
                        href="/finances"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        <span>Voir tout</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                    {recentTransactions.length === 0 ? (
                      <EmptyState
                        icon={<Wallet className="h-6 w-6 text-primary" />}
                        title="Aucune opération récente"
                        description="Enregistrez vos ventes d'œufs ou vos dépenses en aliments."
                        actionLabel={hasPermission("finance:create") ? "Nouvelle opération" : undefined}
                        onAction={() => setFinanceModalOpen(true)}
                        className="my-4 border-none"
                      />
                    ) : (
                      <>
                        {/* Mobile Cards View (< md) */}
                        <div className="mt-4 space-y-2.5 md:hidden">
                          {recentTransactions.map((tx) => {
                            const isIncome = tx.type === "INCOME";
                            const paymentLabels: Record<string, string> = {
                              CASH: "Espèces",
                              MTN_MOMO: "MoMo",
                              MOOV_MONEY: "Moov",
                              CELTIIS_CASH: "Celtiis",
                              BANK_TRANSFER: "Virement",
                              CHECK: "Chèque",
                            };
                            return (
                              <div
                                key={tx.id}
                                className="rounded-xl border border-border bg-surface p-3 space-y-1.5 shadow-2xs"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <span className="font-bold text-xs text-foreground block">
                                      {tx.category}
                                    </span>
                                    <span className="text-[10px] text-muted">
                                      {formatDate(tx.date)} • {paymentLabels[tx.paymentMethod] || tx.paymentMethod}
                                    </span>
                                  </div>
                                  <span
                                    className={`font-mono font-bold text-xs shrink-0 ${isIncome ? "text-success" : "text-danger"
                                      }`}
                                  >
                                    {isIncome ? "+" : "-"}{formatFcfa(tx.amountFcfa)}
                                  </span>
                                </div>
                                {tx.notes && (
                                  <p className="text-[11px] text-muted truncate border-t border-border/40 pt-1 mt-1">
                                    {tx.notes}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Desktop Table (>= md) */}
                        <div className="hidden md:block mt-4 overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                          <table className="w-full min-w-[460px] text-left text-xs">
                            <thead className="bg-surface-muted text-muted">
                              <tr>
                                <th className="py-2.5 px-3 font-semibold rounded-l-lg whitespace-nowrap">Date</th>
                                <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Opération</th>
                                <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Paiement</th>
                                <th className="py-2.5 px-3 font-semibold text-right rounded-r-lg whitespace-nowrap">Montant</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {recentTransactions.map((tx) => {
                                const isIncome = tx.type === "INCOME";
                                const paymentLabels: Record<string, string> = {
                                  CASH: "Espèces",
                                  MTN_MOMO: "MoMo",
                                  MOOV_MONEY: "Moov",
                                  CELTIIS_CASH: "Celtiis",
                                  BANK_TRANSFER: "Virement",
                                  CHECK: "Chèque",
                                };
                                return (
                                  <tr key={tx.id} className="hover:bg-surface-hover transition-colors">
                                    <td className="py-3 px-3 text-muted whitespace-nowrap">
                                      {formatDate(tx.date)}
                                    </td>
                                    <td className="py-3 px-3">
                                     
                                      {tx.notes && (
                                        <span className="text-[11px] text-muted truncate max-w-[140px] block">
                                          {tx.notes}
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-3 px-3 text-muted">
                                      <span className="text-xs font-medium text-muted">
                                        {paymentLabels[tx.type] || tx.type}
                                      </span>
                                    </td>
                                    <td
                                      className={`py-3 px-3 text-right font-mono font-bold whitespace-nowrap ${isIncome ? "text-success" : "text-danger"
                                        }`}
                                    >
                                      {isIncome ? "+" : "-"}{formatFcfa(tx.amountFcfa)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>

                  {hasPermission("finance:create") && (
                    <div className="mt-4 pt-3 border-t border-border flex justify-end">
                      <button
                        type="button"
                        onClick={() => setFinanceModalOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-primary-hover transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Noter une opération</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Surveillance des stocks & Aliments (Module 'inventory') */}
          {hasInventoryAccess && (() => {
            const lowStockItems = inventoryItems.filter(
              (i) => i.currentStock <= i.minThreshold || i.isLowStock
            );
            const unitLabels: Record<string, string> = {
              BAG: "sac(s)",
              BAG_50KG: "sac(s)",
              BAG_25KG: "sac(s)",
              KG: "kg",
              DOSE: "dose(s)",
              LITER: "litre(s)",
              UNIT: "unité(s)",
            };
            const categoryLabels: Record<string, string> = {
              FEED: "Alimentation",
              VACCINE: "Vaccin",
              MEDICINE: "Médicament",
              EQUIPMENT: "Matériel",
              OTHER: "Autre",
            };

            return (
              <div className="mt-8 rounded-2xl border border-border bg-surface p-5 shadow-xs">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl shadow-2xs ${lowStockItems.length > 0
                          ? "bg-danger-soft text-danger"
                          : "bg-success-soft text-success"
                        }`}
                    >
                      <Package className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-foreground">
                        Surveillance des stocks & Aliments
                      </h2>
                      <p className="text-xs text-muted">
                        {lowStockItems.length > 0
                          ? `${lowStockItems.length} produit(s) en alerte ou presque épuisé(s)`
                          : "Réserves d'aliments et produits de soin suffisantes"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href="/inventory"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground shadow-xs hover:bg-surface-hover transition-colors"
                    >
                      <span>Gérer tous les stocks</span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted" />
                    </Link>
                  </div>
                </div>

                {lowStockItems.length > 0 ? (
                  <>
                    {/* Mobile Cards View (< md) */}
                    <div className="mt-4 space-y-2.5 md:hidden">
                      {lowStockItems.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-xl border border-danger/30 bg-danger-soft/10 p-3 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2 border-b border-danger/20 pb-2">
                            <div>
                              <span className="font-bold text-xs text-foreground block">
                                {item.name}
                              </span>
                              <span className="text-[10px] text-muted">
                                {categoryLabels[item.category] || item.category}
                              </span>
                            </div>
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-danger bg-danger-soft px-2 py-0.5 rounded-md">
                              <span className="h-1.5 w-1.5 rounded-full bg-danger animate-pulse" />
                              Urgence
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs pt-0.5 font-mono">
                            <span className="text-[11px] text-muted">
                              Seuil : {formatInventoryUnit(item.minThreshold, item.unit, { short: true })}
                            </span>
                            <span className="font-bold text-danger text-xs">
                              Reste : {formatInventoryUnit(item.currentStock, item.unit)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table (>= md) */}
                    <div className="hidden md:block mt-4 overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                      <table className="w-full min-w-[500px] text-left text-xs">
                        <thead className="bg-danger-soft/40 text-danger">
                          <tr>
                            <th className="py-2.5 px-3 font-semibold rounded-l-lg whitespace-nowrap">Produit en alerte</th>
                            <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Catégorie</th>
                            <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">Stock restant</th>
                            <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">Seuil d'alerte</th>
                            <th className="py-2.5 px-3 font-semibold text-right rounded-r-lg whitespace-nowrap">Urgence</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {lowStockItems.map((item) => (
                            <tr key={item.id} className="hover:bg-surface-hover transition-colors">
                              <td className="py-3 px-3 font-bold text-foreground">
                                {item.name}
                              </td>
                              <td className="py-3 px-3 text-muted">
                                <span className="text-xs font-medium text-muted">
                                  {item.category === "OTHER" && item.customCategory
                                    ? item.customCategory
                                    : (categoryLabels[item.category] || item.category)}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-danger">
                                {formatInventoryUnit(item.currentStock, item.unit)}
                              </td>
                              <td className="py-3 px-3 text-right font-mono text-muted">
                                {formatInventoryUnit(item.minThreshold, item.unit, { short: true })}
                              </td>
                              <td className="py-3 px-3 text-right">
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-danger">
                                  <span className="h-1.5 w-1.5 rounded-full bg-danger animate-pulse" />
                                  Commander d'urgence
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="mt-4 flex items-center gap-3 rounded-xl bg-success-soft/30 border border-success/20 p-4">
                    <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                    <div className="text-xs">
                      <p className="font-bold text-success">
                        Toutes vos réserves sont au vert !
                      </p>
                      <p className="text-muted mt-0.5">
                        Aucun aliment ou produit vétérinaire n'est en rupture. Les quantités en stock couvrent les besoins de vos poules.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Widget Santé & Prophylaxie (Module 'health') */}
          {hasHealthAccess && kpi?.health && (
            <div className="mt-8 rounded-2xl border border-border bg-surface p-5 shadow-xs">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 shadow-2xs">
                    <HeartPulse className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-foreground">
                        Santé & Vaccinations prévues
                      </h2>
                      {kpi.health.overdueCount > 0 && (
                        <span className="rounded-md bg-danger/10 px-2 py-0.5 text-[10px] font-bold text-danger">
                          {kpi.health.overdueCount} en retard
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted">
                      Calendrier vaccinal et soins programmés dans les 14 prochains jours.
                    </p>
                  </div>
                </div>
                <Link
                  href="/health"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground shadow-xs hover:bg-surface-hover transition-colors"
                >
                  <span>Gérer tous les soins</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted" />
                </Link>
              </div>

              {kpi.health.upcomingTreatments && kpi.health.upcomingTreatments.length > 0 ? (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {kpi.health.upcomingTreatments.map((treatment) => (
                    <div
                      key={treatment.id}
                      className="rounded-xl border border-border bg-surface-muted/40 p-3.5 space-y-2 hover:border-emerald-500/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-xs text-foreground truncate">
                          {treatment.title}
                        </span>
                        <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
                          {treatment.type}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted flex items-center justify-between">
                        <span>Lot : {treatment.flockName}</span>
                        <span className="font-mono font-semibold text-foreground">
                          {formatDate(treatment.scheduledDate)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 flex items-center gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold text-emerald-800 dark:text-emerald-200">
                      Calendrier vaccinal à jour !
                    </p>
                    <p className="text-muted mt-0.5">
                      Aucun soin ou vaccin n'est en attente pour les 14 prochains jours.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* MODALES DASHBOARD EXTRAITES */}
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
      />

      {/* MODAL CRÉATION DE FERME */}
      <CreateFarmModal
        isOpen={createFarmModalOpen}
        onClose={() => setCreateFarmModalOpen(false)}
      />

      {/* MODALE DÉTAILS DE L'OFFRE & MODULES */}
      <PlanDetailsModal
        isOpen={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        subscription={kpi?.subscription}
        planName={activePlan?.planName}
        badge={activePlan?.badge}
        activeModules={activePlan?.modules}
      />
    </Shell>
  );
}
