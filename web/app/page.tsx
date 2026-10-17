"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bird,
  Egg,
  AlertTriangle,
  Wallet,
  TrendingUp,
  RefreshCw,
  ArrowRight,
  Package,
  Plus,
  CheckCircle2,
  Calendar,
  Edit3,
  Building2,
} from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { CreateFarmModal } from "@/components/farms/create-farm-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api-client";
import {
  DashboardKPI,
  Flock,
  EggSession,
  PaymentMethod,
  EggProduction,
  Transaction,
  InventoryItem,
} from "@/lib/types";
import { formatFcfa, formatNumber, formatPercent, calcEggTrays, formatEggTraysSummary, formatDate, formatInventoryUnit } from "@/lib/utils";

export default function DashboardPage() {
  const { activeFarm, hasPermission } = useAuth();

  const [kpi, setKpi] = useState<DashboardKPI | null>(null);
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [recentEggs, setRecentEggs] = useState<EggProduction[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [todayStr, setTodayStr] = useState<string>("");

  useEffect(() => {
    setTodayStr(new Date().toISOString().split("T")[0]);
  }, []);

  // Modals state
  const [createFarmModalOpen, setCreateFarmModalOpen] = useState(false);
  const [eggModalOpen, setEggModalOpen] = useState(false);
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [financeModalOpen, setFinanceModalOpen] = useState(false);

  // Egg Form state
  const [selectedFlockId, setSelectedFlockId] = useState("");
  const [eggDate, setEggDate] = useState("");
  const [eggSession, setEggSession] = useState<EggSession>("MORNING");
  const [goodEggs, setGoodEggs] = useState<number | string>(0);
  const [brokenEggs, setBrokenEggs] = useState<number | string>(0);
  const [abnormalEggs, setAbnormalEggs] = useState<number | string>(0);
  const [eggNotes, setEggNotes] = useState("");
  const [submittingEgg, setSubmittingEgg] = useState(false);
  const [editingEggId, setEditingEggId] = useState<string | null>(null);

  function openCreateEggModal() {
    setEditingEggId(null);
    setEggDate(todayStr || new Date().toISOString().split("T")[0]);
    setEggSession("MORNING");
    setGoodEggs(0);
    setBrokenEggs(0);
    setAbnormalEggs(0);
    setEggNotes("");
    if (flocks.length > 0 && !selectedFlockId) {
      setSelectedFlockId(flocks[0].id);
    }
    setEggModalOpen(true);
  }

  function openEditEggModal(egg: EggProduction) {
    setEditingEggId(egg.id);
    setSelectedFlockId(egg.flockId);
    setEggDate(egg.date);
    setEggSession(egg.session);
    setGoodEggs(egg.goodEggs);
    setBrokenEggs(egg.brokenEggs);
    setAbnormalEggs(egg.abnormalEggs);
    setEggNotes(egg.notes || "");
    setEggModalOpen(true);
  }

  // Movement Form state
  const [moveFlockId, setMoveFlockId] = useState("");
  const [moveType, setMoveType] = useState<"MORTALITY" | "SALE" | "CULL">("MORTALITY");
  const [moveQuantity, setMoveQuantity] = useState<number | string>(1);
  const [moveReason, setMoveReason] = useState("");
  const [submittingMove, setSubmittingMove] = useState(false);

  // Finance Form state
  const [txType, setTxType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [txAmount, setTxAmount] = useState<number | string>(0);
  const [txCategory, setTxCategory] = useState("Vente Oeufs");
  const [txPaymentMethod, setTxPaymentMethod] = useState<PaymentMethod>("MTN_MOMO");
  const [txNotes, setTxNotes] = useState("");
  const [submittingTx, setSubmittingTx] = useState(false);

  useEffect(() => {
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
        setMoveFlockId(flocksData[0].id);
      }
    } catch (err) {
      console.error("Erreur chargement dashboard:", err);
    } finally {
      setIsLoading(false);
    }
  }

  // Handle Egg Submission
  async function handleEggSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFlockId) return;
    setSubmittingEgg(true);
    try {
      const targetDate = eggDate || todayStr || new Date().toISOString().split("T")[0];
      if (editingEggId) {
        await api.eggs.update(editingEggId, {
          goodEggs: Number(goodEggs),
          brokenEggs: Number(brokenEggs),
          abnormalEggs: Number(abnormalEggs),
          notes: eggNotes || undefined,
        });
      } else {
        await api.eggs.create({
          flockId: selectedFlockId,
          date: targetDate,
          session: eggSession,
          goodEggs: Number(goodEggs),
          brokenEggs: Number(brokenEggs),
          abnormalEggs: Number(abnormalEggs),
          notes: eggNotes || undefined,
          allowUpdate: true,
        });
      }
      setEggModalOpen(false);
      setEditingEggId(null);
      setGoodEggs(0);
      setBrokenEggs(0);
      setAbnormalEggs(0);
      setEggNotes("");
      await loadDashboardData();
    } catch (err: any) {
      alert(err?.message || "Erreur lors de l'enregistrement de la collecte");
    } finally {
      setSubmittingEgg(false);
    }
  }

  // Handle Movement Submission
  async function handleMoveSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!moveFlockId) return;
    setSubmittingMove(true);
    try {
      await api.flocks.addMovement(moveFlockId, {
        type: moveType,
        quantity: Number(moveQuantity),
        date: new Date().toISOString().split("T")[0],
        reason: moveReason || undefined,
      });
      setMovementModalOpen(false);
      setMoveQuantity(1);
      setMoveReason("");
      await loadDashboardData();
    } catch (err: any) {
      alert(err?.message || "Erreur lors de l'enregistrement du mouvement");
    } finally {
      setSubmittingMove(false);
    }
  }

  // Handle Finance Submission
  async function handleFinanceSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeFarm?.id) return;
    setSubmittingTx(true);
    try {
      await api.finance.createTransaction({
        farmId: activeFarm.id,
        type: txType,
        amountFcfa: Number(txAmount),
        category: txCategory,
        paymentMethod: txPaymentMethod,
        date: new Date().toISOString().split("T")[0],
        notes: txNotes || undefined,
      });
      setFinanceModalOpen(false);
      setTxAmount(0);
      setTxNotes("");
      await loadDashboardData();
    } catch (err: any) {
      alert(err?.message || "Erreur lors de la transaction financière");
    } finally {
      setSubmittingTx(false);
    }
  }

  const trayCalc = calcEggTrays(Number(goodEggs));

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
        <Badge
          variant={
            f.type === "LAYER"
              ? "warning"
              : f.type === "BROILER"
              ? "default"
              : "neutral"
          }
          size="sm"
        >
          {f.type === "LAYER"
            ? "Pondeuses"
            : f.type === "BROILER"
            ? "Chair"
            : "Mixte"}
        </Badge>
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

        {/* Action Buttons Toolbar: Perfectly aligned in 2x2 grid on mobile, inline-flex on sm+ */}
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

          {hasPermission("egg:create") && (
            <button
              type="button"
              onClick={openCreateEggModal}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-accent px-3.5 text-xs font-bold text-white shadow-xs hover:bg-accent-hover transition-colors whitespace-nowrap"
            >
              <Egg className="h-4 w-4 shrink-0" />
              <span>Saisir Ponte</span>
            </button>
          )}

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

          {hasPermission("finance:create") && (
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

        {/* Rendement de Ponte */}
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

        {/* Argent disponible en caisse */}
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

        {/* Produits presque finis */}
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
      </div>

      {/* Active Flocks Overview */}
      <div className="mt-8">
        <DataTable<Flock>
          title="Vos groupes de poules en élevage"
          subtitle="Nombre de poules par groupe, race, pertes et date d'arrivée."
          data={flocks}
          columns={dashboardFlockColumns}
          searchable={true}
          searchPlaceholder="Rechercher un groupe..."
          searchAccessor={(f) => `${f.name} ${f.code || ""} ${f.breed || ""}`}
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

      {/* Opérations Récentes : Récoltes d'œufs & Caisse */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Derniers ramassages d'œufs */}
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
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-muted text-muted">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold rounded-l-lg">Date & Moment</th>
                      <th className="py-2.5 px-3 font-semibold">Groupe</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Plateaux de 30</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Cassés</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Total</th>
                      <th className="py-2.5 px-3 font-semibold text-right rounded-r-lg">Action</th>
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

        {/* Dernières opérations de caisse */}
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary shadow-2xs">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">
                    Dernières opérations de caisse
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
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-muted text-muted">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold rounded-l-lg">Date</th>
                      <th className="py-2.5 px-3 font-semibold">Opération</th>
                      <th className="py-2.5 px-3 font-semibold">Paiement</th>
                      <th className="py-2.5 px-3 font-semibold text-right rounded-r-lg">Montant</th>
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
                            <span className="font-bold text-foreground block">
                              {tx.category}
                            </span>
                            {tx.notes && (
                              <span className="text-[11px] text-muted truncate max-w-[140px] block">
                                {tx.notes}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-muted">
                            <Badge variant="neutral" size="sm">
                              {paymentLabels[tx.paymentMethod] || tx.paymentMethod}
                            </Badge>
                          </td>
                          <td
                            className={`py-3 px-3 text-right font-mono font-bold whitespace-nowrap ${
                              isIncome ? "text-success" : "text-danger"
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
      </div>

      {/* Alertes de Stock & Aliments */}
      {(() => {
        const lowStockItems = inventoryItems.filter(
          (i) => i.currentStock <= i.minThreshold || i.isLowStock
        );
        const unitLabels: Record<string, string> = {
          BAG_50KG: "sac(s) 50kg",
          BAG_25KG: "sac(s) 25kg",
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
                  className={`flex h-9 w-9 items-center justify-center rounded-xl shadow-2xs ${
                    lowStockItems.length > 0
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
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-danger-soft/40 text-danger">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold rounded-l-lg">Produit en alerte</th>
                      <th className="py-2.5 px-3 font-semibold">Catégorie</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Stock restant</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Seuil d'alerte</th>
                      <th className="py-2.5 px-3 font-semibold text-right rounded-r-lg">Urgence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {lowStockItems.map((item) => (
                      <tr key={item.id} className="hover:bg-surface-hover transition-colors">
                        <td className="py-3 px-3 font-bold text-foreground">
                          {item.name}
                        </td>
                        <td className="py-3 px-3 text-muted">
                          <Badge variant="neutral" size="sm">
                            {categoryLabels[item.category] || item.category}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-danger">
                          {formatInventoryUnit(item.currentStock, item.unit)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-muted">
                          {formatInventoryUnit(item.minThreshold, item.unit, { short: true })}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Badge variant="danger" size="sm" dot>
                            Commander d'urgence
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
        </>
      )}

      {/* MODAL 1: Saisie Ponte */}
      <Modal
        isOpen={eggModalOpen}
        onClose={() => {
          setEggModalOpen(false);
          setEditingEggId(null);
        }}
        title={editingEggId ? "Modifier le ramassage d'œufs" : "Enregistrer une collecte de ponte"}
        description={
          editingEggId
            ? "Mise à jour des quantités récoltées pour ce créneau de ponte."
            : "Saisie des œufs récoltés avec calcul instantané en plateaux de 30 alvéoles."
        }
      >
        <form onSubmit={handleEggSubmit} className="space-y-4">
          {!editingEggId && recentEggs.some(
            (e) => e.flockId === selectedFlockId && e.date === (eggDate || todayStr) && e.session === eggSession
          ) && (
            <div className="rounded-xl border border-warning/30 bg-warning-soft/30 p-3 text-xs text-warning flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                Une collecte existe déjà pour ce créneau. La validation mettra à jour directement ces chiffres.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Bande pondeuse
              </label>
              <select
                value={selectedFlockId}
                onChange={(e) => setSelectedFlockId(e.target.value)}
                disabled={!!editingEggId}
                required
                className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs font-semibold text-foreground disabled:opacity-60"
              >
                {flocks.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.breed} — {formatNumber(f.currentQuantity)} poules)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Date de collecte
              </label>
              <input
                type="date"
                value={eggDate || todayStr}
                onChange={(e) => setEggDate(e.target.value)}
                disabled={!!editingEggId}
                required
                className="w-full rounded-xl border border-border bg-surface-muted p-2 text-xs font-semibold text-foreground disabled:opacity-60 focus:border-accent focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Session de ramassage
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["MORNING", "NOON", "EVENING"] as EggSession[]).map((session) => (
                <button
                  key={session}
                  type="button"
                  onClick={() => setEggSession(session)}
                  className={`rounded-xl border py-2 text-xs font-bold transition-colors ${
                    eggSession === session
                      ? "border-accent bg-accent text-white shadow-xs"
                      : "border-border bg-surface text-muted hover:bg-surface-hover"
                  }`}
                >
                  {session === "MORNING"
                    ? "Matin"
                    : session === "NOON"
                    ? "Midi"
                    : "Soir"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-success mb-1">
                Bons œufs (vendables)
              </label>
              <input
                type="number"
                min="0"
                required
                value={goodEggs}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const val = e.target.value;
                  setGoodEggs(val === "" ? "" : Math.max(0, parseInt(val) || 0));
                }}
                placeholder="0"
                className="w-full rounded-xl border border-success/30 bg-surface p-2.5 text-sm font-bold font-mono text-foreground focus:border-success focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-danger mb-1">
                Cassés / Fêlés
              </label>
              <input
                type="number"
                min="0"
                value={brokenEggs}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const val = e.target.value;
                  setBrokenEggs(val === "" ? "" : Math.max(0, parseInt(val) || 0));
                }}
                placeholder="0"
                className="w-full rounded-xl border border-border bg-surface p-2.5 text-sm font-mono text-foreground focus:border-danger focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-warning mb-1">
                Anormaux / Petits
              </label>
              <input
                type="number"
                min="0"
                value={abnormalEggs}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const val = e.target.value;
                  setAbnormalEggs(val === "" ? "" : Math.max(0, parseInt(val) || 0));
                }}
                placeholder="0"
                className="w-full rounded-xl border border-border bg-surface p-2.5 text-sm font-mono text-foreground focus:border-warning focus:outline-hidden"
              />
            </div>
          </div>

          {/* Zootechnical Calculation Preview */}
          <div className="rounded-xl bg-accent-soft p-3 text-xs text-accent border border-accent/20">
            <div className="flex items-center justify-between font-bold">
              <span>Conversion en plateaux de 30 :</span>
              <span className="text-sm font-mono">{trayCalc.text}</span>
            </div>
            <div className="mt-1 text-[11px] opacity-80">
              Total ramassé : {Number(goodEggs || 0) + Number(brokenEggs || 0) + Number(abnormalEggs || 0)} œufs
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Observations / Notes
            </label>
            <input
              type="text"
              value={eggNotes}
              onChange={(e) => setEggNotes(e.target.value)}
              placeholder="ex. Légère baisse due à la chaleur"
              className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setEggModalOpen(false);
                setEditingEggId(null);
              }}
              className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted hover:bg-surface-hover"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submittingEgg}
              className="rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-accent-hover"
            >
              {submittingEgg
                ? "Enregistrement..."
                : editingEggId
                ? "Mettre à jour le ramassage"
                : "Valider la collecte"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Mouvement / Mortalité */}
      <Modal
        isOpen={movementModalOpen}
        onClose={() => setMovementModalOpen(false)}
        title="Déclarer un mouvement ou une mortalité"
        description="Mise à jour automatique de l'effectif vif de la bande."
      >
        <form onSubmit={handleMoveSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Bande concernée
            </label>
            <select
              value={moveFlockId}
              onChange={(e) => setMoveFlockId(e.target.value)}
              required
              className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs font-semibold text-foreground"
            >
              {flocks.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} (Actuel: {formatNumber(f.currentQuantity)} sujets)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Type d'opération
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMoveType("MORTALITY")}
                className={`rounded-xl border py-2 text-xs font-bold ${
                  moveType === "MORTALITY"
                    ? "border-danger bg-danger text-white"
                    : "border-border bg-surface text-muted"
                }`}
              >
                Mortalité
              </button>
              <button
                type="button"
                onClick={() => setMoveType("SALE")}
                className={`rounded-xl border py-2 text-xs font-bold ${
                  moveType === "SALE"
                    ? "border-success bg-success text-white"
                    : "border-border bg-surface text-muted"
                }`}
              >
                Vente Vif
              </button>
              <button
                type="button"
                onClick={() => setMoveType("CULL")}
                className={`rounded-xl border py-2 text-xs font-bold ${
                  moveType === "CULL"
                    ? "border-warning bg-warning text-white"
                    : "border-border bg-surface text-muted"
                }`}
              >
                Réforme
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Quantité (têtes / sujets)
            </label>
            <input
              type="number"
              min="1"
              required
              value={moveQuantity}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const val = e.target.value;
                setMoveQuantity(val === "" ? "" : Math.max(1, parseInt(val) || 1));
              }}
              className="w-full rounded-xl border border-border bg-surface p-2.5 text-sm font-bold font-mono text-foreground"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Cause / Motif
            </label>
            <input
              type="text"
              value={moveReason}
              onChange={(e) => setMoveReason(e.target.value)}
              placeholder="ex. Piquage, étouffement, autopsie suspecte..."
              className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setMovementModalOpen(false)}
              className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted hover:bg-surface-hover"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submittingMove}
              className="rounded-xl bg-danger px-4 py-2 text-xs font-bold text-white shadow-xs hover:opacity-90"
            >
              {submittingMove ? "Enregistrement..." : "Confirmer le mouvement"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Recette / Dépense */}
      <Modal
        isOpen={financeModalOpen}
        onClose={() => setFinanceModalOpen(false)}
        title="Enregistrer une transaction financière"
        description="Encaissement ou décaissement en FCFA avec mode de paiement local."
      >
        <form onSubmit={handleFinanceSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setTxType("INCOME");
                setTxCategory("Vente Oeufs");
              }}
              className={`rounded-xl border py-2.5 text-xs font-bold ${
                txType === "INCOME"
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-surface text-muted"
              }`}
            >
              + Recette / Vente
            </button>
            <button
              type="button"
              onClick={() => {
                setTxType("EXPENSE");
                setTxCategory("Alimentation");
              }}
              className={`rounded-xl border py-2.5 text-xs font-bold ${
                txType === "EXPENSE"
                  ? "border-danger bg-danger text-white"
                  : "border-border bg-surface text-muted"
              }`}
            >
              - Dépense / Achat
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Montant en FCFA
            </label>
            <input
              type="number"
              min="1"
              required
              value={txAmount}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const val = e.target.value;
                setTxAmount(val === "" ? "" : Math.max(0, parseInt(val) || 0));
              }}
              placeholder="ex. 45000"
              className="w-full rounded-xl border border-border bg-surface p-2.5 text-base font-bold font-mono text-foreground"
            />
            <div className="mt-1 text-[11px] text-muted font-mono">
              Aperçu : {formatFcfa(Number(txAmount) || 0)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Catégorie
              </label>
              <select
                value={txCategory}
                onChange={(e) => setTxCategory(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs font-semibold text-foreground"
              >
                {txType === "INCOME" ? (
                  <>
                    <option value="Vente Oeufs">Vente Œufs</option>
                    <option value="Vente Poulets Vifs">Vente Poulets Vifs</option>
                    <option value="Vente Fiente / Engrais">Vente Fiente</option>
                    <option value="Autre Recette">Autre Recette</option>
                  </>
                ) : (
                  <>
                    <option value="Alimentation">Alimentation</option>
                    <option value="Vaccins & Soins">Vaccins & Soins</option>
                    <option value="Poussins / Achat Sujets">Achat Poussins</option>
                    <option value="Main d'oeuvre">Main d'œuvre</option>
                    <option value="Carburant & Electricite">Énergie / Eau</option>
                    <option value="Autre Depense">Autre Dépense</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Moyen de paiement
              </label>
              <select
                value={txPaymentMethod}
                onChange={(e) => setTxPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs font-semibold text-foreground"
              >
                <option value="MTN_MOMO">MTN Mobile Money</option>
                <option value="MOOV_MONEY">Moov Money</option>
                <option value="CELTIIS_CASH">Celtiis Cash</option>
                <option value="CASH">Espèces</option>
                <option value="BANK_TRANSFER">Virement Bancaire</option>
                <option value="CHECK">Chèque</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Référence / Client / Fournisseur
            </label>
            <input
              type="text"
              value={txNotes}
              onChange={(e) => setTxNotes(e.target.value)}
              placeholder="ex. Vente à la restauratrice Mme Dossou"
              className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setFinanceModalOpen(false)}
              className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted hover:bg-surface-hover"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submittingTx}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-hover"
            >
              {submittingTx ? "Enregistrement..." : "Valider l'opération"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL CRÉATION DE FERME */}
      <CreateFarmModal
        isOpen={createFarmModalOpen}
        onClose={() => setCreateFarmModalOpen(false)}
      />
    </Shell>
  );
}
