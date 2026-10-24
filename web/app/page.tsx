"use client";

import React, { useEffect, useState } from "react";
import { Plus, Building2 } from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { CreateFarmModal } from "@/components/farms/create-farm-modal";
import {
  SubscriptionBanner,
  DashboardQuickActions,
  KpiSummaryCards,
  FlocksOverviewWidget,
  RecentEggsWidget,
  RecentFinancesWidget,
  InventoryAlertsWidget,
  HealthScheduleWidget,
  RecordEggModal,
  RecordMovementModal,
  RecordFeedingModal,
  RecordTransactionModal,
  PlanDetailsModal,
} from "@/components/dashboard";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api-client";
import {
  DashboardKPI,
  Flock,
  EggProduction,
  Transaction,
  InventoryItem,
} from "@/lib/types";

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

  function handleOpenFeedingModal(flockId?: string) {
    if (flockId) setSelectedFlockId(flockId);
    setFeedingModalOpen(true);
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
          {/* En-tête de page & Barre d'actions rapides */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between pb-6 border-b border-border">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  Tableau de bord — {activeFarm.name}
                </h1>
                <span className="rounded-md bg-surface-muted border border-border px-2 py-0.5 text-xs font-semibold text-muted">
                  {activeFarm.productionType === "BROILER"
                    ? "Poulets de chair"
                    : activeFarm.productionType === "LAYER"
                      ? "Pondeuses"
                      : "Mixte"}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">
                Vue d'ensemble opérationnelle, zootechnique et financière en temps réel.
              </p>
            </div>

            <DashboardQuickActions
              isLoading={isLoading}
              onRefresh={loadDashboardData}
              onOpenFeedingModal={() => handleOpenFeedingModal()}
              onOpenMovementModal={() => setMovementModalOpen(true)}
              onOpenEggModal={openCreateEggModal}
              onOpenFinanceModal={() => setFinanceModalOpen(true)}
              canCreateFlockMovement={hasPermission("flock:update") || hasPermission("flock:movement")}
              canCreateEgg={hasPermission("egg:create")}
              canCreateFinance={hasPermission("finance:create")}
              hasEggAccess={hasEggAccess}
              hasFinanceAccess={hasFinanceAccess}
            />
          </div>

          {/* Bannière Formule & Jauges Quotas */}
          <SubscriptionBanner
            subscription={kpi?.subscription}
            planName={activePlan?.planName}
            badge={activePlan?.badge}
            flocksCount={flocks.length}
            buildingsCount={kpi?.subscription?.quotas?.buildings?.current ?? 0}
            farmsCount={kpi?.subscription?.quotas?.farms?.current ?? 1}
            maxFlocks={activePlan?.quotas?.maxFlocks ?? 2}
            maxBuildings={activePlan?.quotas?.maxBuildings ?? 2}
            maxFarms={activePlan?.quotas?.maxFarms ?? 1}
            onOpenPlanModal={() => setPlanModalOpen(true)}
          />

          {/* Cartes KPI Dynamiques et adaptatives */}
          <KpiSummaryCards
            computedLiveBirds={computedLiveBirds}
            flocksCount={flocks.length || kpi?.activeFlocksCount || 0}
            computedMortality={computedMortality}
            productionType={activeFarm.productionType}
            hasEggAccess={hasEggAccess}
            computedEggsTotal={computedEggsTotal}
            computedTrays={computedTrays}
            computedLoose={computedLoose}
            computedLayingRate={computedLayingRate}
            hasFinanceAccess={hasFinanceAccess}
            computedNet={computedNet}
            computedRevenue={computedRevenue}
            hasInventoryAccess={hasInventoryAccess}
            computedLowStock={computedLowStock}
            hasHealthAccess={hasHealthAccess}
            overdueHealthCount={kpi?.health?.overdueCount || 0}
            pendingHealthCount={kpi?.health?.pendingCount || 0}
          />

          {/* Tableau des Bandes & Cheptel */}
          <FlocksOverviewWidget
            flocks={flocks}
            onOpenFeedingModal={handleOpenFeedingModal}
          />

          {/* Ramassages d'œufs & Caisse (Modules 'eggs' et 'finance') */}
          {(hasEggAccess || hasFinanceAccess) && (
            <div className={`mt-8 grid grid-cols-1 gap-6 ${hasEggAccess && hasFinanceAccess ? "lg:grid-cols-2" : ""}`}>
              {hasEggAccess && (
                <RecentEggsWidget
                  recentEggs={recentEggs}
                  canCreateEgg={hasPermission("egg:create")}
                  onOpenCreateEggModal={openCreateEggModal}
                  onOpenEditEggModal={openEditEggModal}
                />
              )}

              {hasFinanceAccess && (
                <RecentFinancesWidget
                  recentTransactions={recentTransactions}
                  canCreateFinance={hasPermission("finance:create")}
                  onOpenCreateFinanceModal={() => setFinanceModalOpen(true)}
                />
              )}
            </div>
          )}

          {/* Surveillance des stocks & Aliments (Module 'inventory') */}
          {hasInventoryAccess && (
            <InventoryAlertsWidget
              inventoryItems={inventoryItems}
            />
          )}

          {/* Santé Animale & Vaccinations (Module 'health') */}
          {hasHealthAccess && (
            <HealthScheduleWidget
              health={kpi?.health}
            />
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

      <CreateFarmModal
        isOpen={createFarmModalOpen}
        onClose={() => setCreateFarmModalOpen(false)}
      />

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
