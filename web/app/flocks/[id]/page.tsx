"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Bird,
  ArrowLeft,
  Calendar,
  Warehouse,
  AlertTriangle,
  Egg,
  HeartPulse,
  Wallet,
  Plus,
  RefreshCw,
  Edit2,
  TrendingDown,
  TrendingUp,
  Clock,
  CheckCircle2,
  Users,
  ShieldAlert,
} from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api-client";
import {
  Flock,
  FlockMovement,
  MovementType,
  EggProduction,
  EggSession,
  HealthTreatment,
  Transaction,
} from "@/lib/types";
import {
  formatDate,
  formatNumber,
  formatPercent,
  formatFcfa,
  calcEggTrays,
  formatEggTraysSummary,
} from "@/lib/utils";

const MOVEMENT_LABELS: Record<MovementType, { label: string; badge: "danger" | "warning" | "info" | "neutral" }> = {
  MORTALITY: { label: "Mortalité / Perte", badge: "danger" },
  SALE: { label: "Vente de sujets", badge: "info" },
  CULL: { label: "Réforme / Élimination", badge: "warning" },
  TRANSFER: { label: "Transfert bâtiment", badge: "neutral" },
  ADJUSTMENT: { label: "Ajustement d'inventaire", badge: "neutral" },
};

export default function FlockDetailPage() {
  const params = useParams();
  const flockId = params?.id as string;
  const router = useRouter();
  const { activeFarm, hasPermission } = useAuth();

  const [flock, setFlock] = useState<Flock | null>(null);
  const [movements, setMovements] = useState<FlockMovement[]>([]);
  const [eggProductions, setEggProductions] = useState<EggProduction[]>([]);
  const [treatments, setTreatments] = useState<HealthTreatment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [financialSummary, setFinancialSummary] = useState<{
    totalIncome: number;
    totalExpense: number;
    grossMargin: number;
    currency: string;
  }>({ totalIncome: 0, totalExpense: 0, grossMargin: 0, currency: "XOF" });

  const [buildings, setBuildings] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"movements" | "eggs" | "health" | "finance">("movements");
  const [isLoading, setIsLoading] = useState(true);

  // Modale Mouvement
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [moveType, setMoveType] = useState<MovementType>("MORTALITY");
  const [moveQty, setMoveQty] = useState<number | string>(1);
  const [moveDate, setMoveDate] = useState("");
  const [moveReason, setMoveReason] = useState("");
  const [submittingMove, setSubmittingMove] = useState(false);

  // Modale Collecte Œufs
  const [eggModalOpen, setEggModalOpen] = useState(false);
  const [eggDate, setEggDate] = useState("");
  const [eggSession, setEggSession] = useState<EggSession>("MORNING");
  const [goodEggs, setGoodEggs] = useState<number | string>(0);
  const [brokenEggs, setBrokenEggs] = useState<number | string>(0);
  const [abnormalEggs, setAbnormalEggs] = useState<number | string>(0);
  const [eggNotes, setEggNotes] = useState("");
  const [submittingEgg, setSubmittingEgg] = useState(false);

  // Modale Édition Bande
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBuildingId, setEditBuildingId] = useState("");
  const [editEstimatedEndDate, setEditEstimatedEndDate] = useState("");
  const [editStatus, setEditStatus] = useState<"ACTIVE" | "SOLD" | "DEPLETED">("ACTIVE");
  const [editNotes, setEditNotes] = useState("");
  const [submittingEdit, setSubmittingEdit] = useState(false);

  useEffect(() => {
    setMoveDate(new Date().toISOString().split("T")[0]);
    setEggDate(new Date().toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    if (flockId) {
      loadAllFlockData();
    }
  }, [flockId, activeFarm?.id]);

  async function loadAllFlockData() {
    setIsLoading(true);
    try {
      const [flockData, buildingsData] = await Promise.all([
        api.flocks.get(flockId),
        activeFarm?.id ? api.farms.listBuildings(activeFarm.id).catch(() => []) : Promise.resolve([]),
      ]);
      setFlock(flockData);
      setMovements(flockData.movements || []);
      setBuildings(buildingsData || []);

      // Données complémentaires
      const promises: Promise<any>[] = [];

      // Œufs si pondeuse ou mixte
      if (flockData.type === "LAYER" || flockData.type === "MIXED") {
        promises.push(
          api.eggs.list({ flockId }).then((prods) => setEggProductions(prods)).catch(() => {})
        );
      }

      // Santé
      if (activeFarm?.id) {
        promises.push(
          api.health.list(activeFarm.id, { flockId }).then((res) => setTreatments(res.data)).catch(() => {})
        );
      }

      // Finances
      promises.push(
        api.flocks.getTransactions(flockId).then((res) => {
          setTransactions(res.transactions);
          setFinancialSummary(res.summary);
        }).catch(() => {})
      );

      await Promise.all(promises);
    } catch (err) {
      console.error("Erreur chargement détails bande:", err);
    } finally {
      setIsLoading(false);
    }
  }

  // Action Mouvement
  async function handleAddMovement(e: React.FormEvent) {
    e.preventDefault();
    if (!flockId) return;
    setSubmittingMove(true);
    try {
      await api.flocks.addMovement(flockId, {
        type: moveType,
        quantity: Number(moveQty),
        movementDate: moveDate,
        reason: moveReason || undefined,
      });
      setMovementModalOpen(false);
      setMoveQty(1);
      setMoveReason("");
      await loadAllFlockData();
    } catch (err: any) {
      alert(err?.message || "Erreur lors de l'enregistrement du mouvement");
    } finally {
      setSubmittingMove(false);
    }
  }

  // Action Collecte Œufs
  async function handleAddEgg(e: React.FormEvent) {
    e.preventDefault();
    if (!flockId) return;
    setSubmittingEgg(true);
    try {
      await api.eggs.create({
        flockId,
        date: eggDate,
        session: eggSession,
        goodEggs: Number(goodEggs),
        brokenEggs: Number(brokenEggs),
        abnormalEggs: Number(abnormalEggs),
        notes: eggNotes || undefined,
      });
      setEggModalOpen(false);
      setGoodEggs(0);
      setBrokenEggs(0);
      setAbnormalEggs(0);
      setEggNotes("");
      await loadAllFlockData();
    } catch (err: any) {
      alert(err?.message || "Erreur lors de l'enregistrement de la collecte");
    } finally {
      setSubmittingEgg(false);
    }
  }

  // Action Modification Bande
  function openEditModal() {
    if (!flock) return;
    setEditName(flock.name);
    setEditBuildingId(flock.buildingId || "");
    setEditEstimatedEndDate(flock.expectedEndDate || "");
    setEditStatus(flock.status as any);
    setEditNotes(flock.notes || "");
    setEditModalOpen(true);
  }

  async function handleEditFlock(e: React.FormEvent) {
    e.preventDefault();
    if (!flockId || !editName.trim()) return;
    setSubmittingEdit(true);
    try {
      await api.flocks.update(flockId, {
        name: editName.trim(),
        buildingId: editBuildingId || null,
        estimatedEndDate: editEstimatedEndDate || null,
        status: editStatus,
        notes: editNotes.trim() || null,
      });
      setEditModalOpen(false);
      await loadAllFlockData();
    } catch (err: any) {
      alert(err?.message || "Erreur lors de la mise à jour de la bande");
    } finally {
      setSubmittingEdit(false);
    }
  }

  // Statistiques calculées
  const stats = useMemo(() => {
    if (!flock) {
      return {
        initial: 0,
        current: 0,
        losses: 0,
        mortalityRate: 0,
        survivalRate: 100,
        totalEggs: 0,
        totalTrays: 0,
      };
    }
    const initial = flock.initialQuantity || 0;
    const current = flock.currentQuantity || 0;
    const losses = Math.max(0, initial - current);
    const mortalityRate = flock.mortalityRate !== undefined ? flock.mortalityRate : (initial > 0 ? (losses / initial) * 100 : 0);
    const survivalRate = 100 - mortalityRate;

    const totalEggs = eggProductions.reduce((sum, p) => sum + (p.goodEggs || 0), 0);
    const totalTrays = Math.floor(totalEggs / 30);

    return {
      initial,
      current,
      losses,
      mortalityRate,
      survivalRate,
      totalEggs,
      totalTrays,
    };
  }, [flock, eggProductions]);

  // Colonnes Mouvements
  const movementColumns: ColumnDef<FlockMovement>[] = [
    {
      key: "date",
      header: "Date de l'opération",
      sortable: true,
      cell: (m) => <span className="font-mono text-xs text-foreground font-semibold">{formatDate(m.date)}</span>,
    },
    {
      key: "type",
      header: "Type de sortie",
      sortable: true,
      cell: (m) => {
        const conf = MOVEMENT_LABELS[m.type] || MOVEMENT_LABELS.MORTALITY;
        return <Badge variant={conf.badge}>{conf.label}</Badge>;
      },
    },
    {
      key: "quantity",
      header: "Quantité",
      sortable: true,
      align: "right",
      cell: (m) => (
        <span className="font-mono font-bold text-sm text-foreground">
          {formatNumber(m.quantity)} sujets
        </span>
      ),
    },
    {
      key: "reason",
      header: "Motif & Justification",
      cell: (m) => <span className="text-xs text-muted">{m.reason || "Non précisé"}</span>,
    },
    {
      key: "recordedBy",
      header: "Opérateur",
      cell: (m) => <span className="text-xs text-muted">{m.recordedBy || "-"}</span>,
    },
  ];

  // Colonnes Œufs
  const eggColumns: ColumnDef<EggProduction>[] = [
    {
      key: "date",
      header: "Date de collecte",
      sortable: true,
      cell: (p) => <span className="font-mono text-xs text-foreground font-semibold">{formatDate(p.date)}</span>,
    },
    {
      key: "session",
      header: "Séance",
      cell: (p) => {
        const map = { MORNING: "Matin", NOON: "Midi", AFTERNOON: "Midi", EVENING: "Soir", ALL_DAY: "Journée" };
        return <span className="text-xs text-muted">{(map as any)[p.session] || p.session}</span>;
      },
    },
    {
      key: "goodEggs",
      header: "Œufs conformes",
      align: "right",
      cell: (p) => (
        <span className="font-mono font-bold text-xs text-primary">
          {formatNumber(p.goodEggs)}
        </span>
      ),
    },
    {
      key: "traysCount",
      header: "Plateaux (30 alvéoles)",
      cell: (p) => (
        <span className="text-xs font-semibold text-foreground">
          {calcEggTrays(p.goodEggs).text}
        </span>
      ),
    },
    {
      key: "defects",
      header: "Pertes / Fêlés",
      align: "right",
      cell: (p) => {
        const broken = p.brokenEggs || 0;
        const abnormal = p.abnormalEggs || 0;
        return (
          <span className={`text-xs font-mono ${broken + abnormal > 0 ? "text-danger" : "text-muted"}`}>
            {broken + abnormal}
          </span>
        );
      },
    },
  ];

  // Colonnes Santé
  const healthColumns: ColumnDef<HealthTreatment>[] = [
    {
      key: "scheduledDate",
      header: "Date prévue",
      sortable: true,
      cell: (t) => <span className="font-mono text-xs text-foreground font-semibold">{formatDate(t.scheduledDate)}</span>,
    },
    {
      key: "title",
      header: "Soin / Vaccin",
      cell: (t) => (
        <div className="flex flex-col">
          <span className="font-semibold text-xs text-foreground">{t.title}</span>
          <span className="text-[11px] text-muted">{t.administrationMethod}</span>
        </div>
      ),
    },
    {
      key: "targetAgeDays",
      header: "Âge théorique",
      cell: (t) => <span className="text-xs text-muted font-mono">{t.targetAgeDays ? `J${t.targetAgeDays}` : "-"}</span>,
    },
    {
      key: "status",
      header: "Statut",
      cell: (t) => {
        const isDone = t.status === "COMPLETED";
        return (
          <Badge variant={isDone ? "success" : t.status === "MISSED" ? "danger" : "warning"}>
            {isDone ? "Administré" : t.status === "MISSED" ? "Manqué" : "Planifié"}
          </Badge>
        );
      },
    },
    {
      key: "costFcfa",
      header: "Coût engagé",
      align: "right",
      cell: (t) => (
        <span className="text-xs font-mono font-semibold text-foreground">
          {t.costFcfa ? formatFcfa(t.costFcfa) : "-"}
        </span>
      ),
    },
  ];

  // Colonnes Transactions
  const txColumns: ColumnDef<Transaction>[] = [
    {
      key: "date",
      header: "Date",
      sortable: true,
      cell: (tx) => <span className="font-mono text-xs text-foreground font-semibold">{formatDate(tx.date)}</span>,
    },
    {
      key: "type",
      header: "Type",
      cell: (tx) => {
        const isIncome = tx.type === "INCOME";
        return (
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${isIncome ? "text-success" : "text-danger"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isIncome ? "bg-success" : "bg-danger"}`} />
            {isIncome ? "Vente / Recette" : "Dépense liée"}
          </span>
        );
      },
    },
    {
      key: "category",
      header: "Catégorie",
      cell: (tx) => <span className="text-xs font-semibold text-foreground">{tx.category}</span>,
    },
    {
      key: "notes",
      header: "Tiers / Description",
      cell: (tx) => (
        <span className="text-xs text-muted truncate max-w-xs">
          {tx.contact?.name ? `${tx.contact.name} - ` : ""}
          {tx.notes || tx.reference || "-"}
        </span>
      ),
    },
    {
      key: "amountFcfa",
      header: "Montant (FCFA)",
      align: "right",
      cell: (tx) => {
        const isIncome = tx.type === "INCOME";
        return (
          <span className={`font-mono font-bold text-xs ${isIncome ? "text-success" : "text-danger"}`}>
            {isIncome ? "+" : "-"} {formatFcfa(tx.amountFcfa)}
          </span>
        );
      },
    },
  ];

  if (isLoading) {
    return (
      <Shell>
        <div className="bg-surface rounded-2xl border border-border p-16 flex flex-col items-center justify-center text-center">
          <RefreshCw className="h-8 w-8 text-primary animate-spin mb-3" />
          <p className="text-sm font-semibold text-foreground">Chargement de la fiche de bande...</p>
          <p className="text-xs text-muted mt-1">Analyse zootechnique et financière en cours</p>
        </div>
      </Shell>
    );
  }

  if (!flock) {
    return (
      <Shell>
        <div className="space-y-4">
          <Link
            href="/flocks"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux bandes
          </Link>
          <EmptyState
            icon={<Bird className="h-8 w-8 text-muted" />}
            title="Bande introuvable"
            description="Le groupe de volailles demandé n'existe pas ou vous n'avez pas l'autorisation d'y accéder."
            actionLabel="Voir toutes les bandes"
            onAction={() => router.push("/flocks")}
          />
        </div>
      </Shell>
    );
  }

  const isLayer = flock.type === "LAYER" || flock.type === "MIXED";

  return (
    <Shell>
      <div className="space-y-6">
        {/* Navigation fil d'ariane & En-tête */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Link
              href="/flocks"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Bandes de volailles
            </Link>
            <span className="text-muted text-xs">/</span>
            <span className="text-xs text-foreground font-semibold">{flock.name}</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-border">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{flock.name}</h1>
                {flock.code && (
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-muted/10 text-muted">
                    {flock.code}
                  </span>
                )}
                <Badge variant={flock.status === "ACTIVE" ? "success" : "neutral"}>
                  {flock.status === "ACTIVE" ? "En cours d'élevage" : flock.status === "SOLD" ? "Vendue" : "Clôturée"}
                </Badge>
                <Badge variant={flock.type === "LAYER" ? "warning" : flock.type === "BROILER" ? "info" : "neutral"}>
                  {flock.type === "LAYER" ? "Pondeuses" : flock.type === "BROILER" ? "Poulets de chair" : "Mixte"}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-muted pt-1">
                <span className="flex items-center gap-1">
                  <Bird className="h-3.5 w-3.5 text-primary" />
                  Souche : <strong className="text-foreground">{flock.strain || flock.breed}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Warehouse className="h-3.5 w-3.5 text-primary" />
                  Bâtiment : <strong className="text-foreground">{flock.buildingName || "Non affecté"}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  Arrivée : <strong className="text-foreground">{formatDate(flock.startDate)}</strong>
                </span>
                {flock.ageInWeeks !== undefined && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    Âge : <strong className="text-foreground">Semaine {flock.ageInWeeks} ({flock.ageInDays} jours)</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Boutons d'actions rapides */}
            <div className="flex flex-wrap items-center gap-2">
              {flock.status === "ACTIVE" && (
                <>
                  <button
                    onClick={() => setMovementModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-danger-soft text-danger hover:bg-danger/15 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Perte ou Vente
                  </button>

                  {isLayer && (
                    <button
                      onClick={() => setEggModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-accent-soft text-accent hover:bg-accent/15 transition-colors"
                    >
                      <Egg className="h-3.5 w-3.5" />
                      Collecte d'œufs
                    </button>
                  )}
                </>
              )}

              <button
                onClick={openEditModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-surface border border-border text-foreground hover:bg-surface-hover transition-colors"
              >
                <Edit2 className="h-3.5 w-3.5" />
                Modifier
              </button>
            </div>
          </div>
        </div>

        {/* 4 Indicateurs Zootechniques & Performances */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Cheptel Vivant"
            value={`${formatNumber(stats.current)} sujets`}
            subtitle={`Sur ${formatNumber(stats.initial)} introduits (${stats.survivalRate.toFixed(1)} % survie)`}
            icon={<Bird className="h-5 w-5" />}
            accent="primary"
          />

          <StatCard
            title="Pertes Cumulées"
            value={`${formatNumber(stats.losses)} morts`}
            subtitle={`Taux de mortalité : ${stats.mortalityRate.toFixed(2)} %`}
            icon={<AlertTriangle className="h-5 w-5" />}
            accent={stats.mortalityRate > 5 ? "rose" : "zinc"}
          />

          {isLayer ? (
            <StatCard
              title="Production Totale"
              value={`${formatNumber(stats.totalTrays)} plateaux`}
              subtitle={`${formatNumber(stats.totalEggs)} œufs récoltés au total`}
              icon={<Egg className="h-5 w-5" />}
              accent="amber"
            />
          ) : (
            <StatCard
              title="Cycle d'élevage"
              value={`J${flock.ageInDays || 1}`}
              subtitle={`Semaine ${flock.ageInWeeks || 1} de croissance`}
              icon={<Clock className="h-5 w-5" />}
              accent="sky"
            />
          )}

          <StatCard
            title="Marge Brute du Lot"
            value={formatFcfa(financialSummary.grossMargin)}
            subtitle={`Recettes: ${formatFcfa(financialSummary.totalIncome)} • Dép: ${formatFcfa(financialSummary.totalExpense)}`}
            icon={<Wallet className="h-5 w-5" />}
            accent={financialSummary.grossMargin >= 0 ? "primary" : "rose"}
          />
        </div>

        {/* Onglets de Consultation Approfondie */}
        <div className="space-y-4">
          <div className="border-b border-border">
            <nav className="flex space-x-6 overflow-x-auto pb-px">
              <button
                onClick={() => setActiveTab("movements")}
                className={`py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                  activeTab === "movements"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                <Bird className="h-4 w-4" />
                Mouvements d'effectif ({movements.length})
              </button>

              {isLayer && (
                <button
                  onClick={() => setActiveTab("eggs")}
                  className={`py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                    activeTab === "eggs"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  <Egg className="h-4 w-4" />
                  Ponte & Collectes ({eggProductions.length})
                </button>
              )}

              <button
                onClick={() => setActiveTab("health")}
                className={`py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                  activeTab === "health"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                <HeartPulse className="h-4 w-4" />
                Santé & Vaccinations ({treatments.length})
              </button>

              <button
                onClick={() => setActiveTab("finance")}
                className={`py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                  activeTab === "finance"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                <Wallet className="h-4 w-4" />
                Finances & Marge ({transactions.length})
              </button>
            </nav>
          </div>

          {/* Contenu des Onglets */}
          <div>
            {activeTab === "movements" && (
              movements.length === 0 ? (
                <EmptyState
                  icon={<Bird className="h-6 w-6" />}
                  title="Aucun mouvement d'effectif"
                  description="Aucune mortalité, vente ou réforme n'a été signalée pour cette bande. L'effectif est à 100% de son niveau initial."
                  actionLabel="+ Noter une première perte ou vente"
                  onAction={() => setMovementModalOpen(true)}
                />
              ) : (
                <DataTable data={movements} columns={movementColumns} pageSize={10} />
              )
            )}

            {activeTab === "eggs" && isLayer && (
              eggProductions.length === 0 ? (
                <EmptyState
                  icon={<Egg className="h-6 w-6" />}
                  title="Aucune ponte enregistrée"
                  description="Ce lot n'a pas encore de ramassage d'œufs enregistré."
                  actionLabel="+ Saisir une première collecte"
                  onAction={() => setEggModalOpen(true)}
                />
              ) : (
                <DataTable data={eggProductions} columns={eggColumns} pageSize={10} />
              )
            )}

            {activeTab === "health" && (
              treatments.length === 0 ? (
                <EmptyState
                  icon={<HeartPulse className="h-6 w-6" />}
                  title="Aucun soin planifié"
                  description="Aucun vaccin ou traitement n'est encore programmé pour cette bande. Vous pouvez générer automatiquement le programme officiel depuis la page Santé."
                  actionLabel="Aller au calendrier sanitaire"
                  onAction={() => router.push("/health")}
                />
              ) : (
                <DataTable data={treatments} columns={healthColumns} pageSize={10} />
              )
            )}

            {activeTab === "finance" && (
              transactions.length === 0 ? (
                <EmptyState
                  icon={<Wallet className="h-6 w-6" />}
                  title="Aucune transaction rattachée"
                  description="Aucune vente ni dépense directe n'a encore été rattachée à cette bande."
                  actionLabel="Enregistrer une transaction"
                  onAction={() => router.push("/finances")}
                />
              ) : (
                <DataTable data={transactions} columns={txColumns} pageSize={10} />
              )
            )}
          </div>
        </div>

        {/* Modale Mouvement d'Effectif */}
        <Modal
          isOpen={movementModalOpen}
          onClose={() => setMovementModalOpen(false)}
          title="Mouvement d'effectif de la bande"
          description={`Lot : ${flock.name} • Effectif vivant actuel : ${formatNumber(flock.currentQuantity)} sujets`}
        >
          <form onSubmit={handleAddMovement} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Type d'opération <span className="text-danger">*</span>
              </label>
              <select
                value={moveType}
                onChange={(e) => setMoveType(e.target.value as MovementType)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="MORTALITY">Mortalité / Sujet mort</option>
                <option value="SALE">Vente de poules vivantes</option>
                <option value="CULL">Réforme / Sujet malade ou blessé éliminé</option>
                <option value="TRANSFER">Transfert vers un autre bâtiment</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Nombre de sujets <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max={flock.currentQuantity}
                  required
                  value={moveQty}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMoveQty(val === "" ? "" : Math.max(1, parseInt(val) || 1));
                  }}
                  className="w-full px-3 py-2 text-sm font-mono font-bold bg-background border border-border rounded-lg text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Date de l'opération <span className="text-danger">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={moveDate}
                  onChange={(e) => setMoveDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Motif & Cause suspectée
              </label>
              <input
                type="text"
                placeholder="Ex: Coccidiose suspectée, Chaleur forte, Vente revendeuse marché"
                value={moveReason}
                onChange={(e) => setMoveReason(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setMovementModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-surface border border-border text-muted hover:text-foreground transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submittingMove}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-danger text-white hover:bg-danger/90 shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {submittingMove && <RefreshCw className="h-4 w-4 animate-spin" />}
                Valider la sortie
              </button>
            </div>
          </form>
        </Modal>

        {/* Modale Collecte Œufs */}
        {isLayer && (
          <Modal
            isOpen={eggModalOpen}
            onClose={() => setEggModalOpen(false)}
            title="Saisie du ramassage d'œufs"
            description={`Bande : ${flock.name} • Conversion automatique en plateaux de 30 alvéoles`}
          >
            <form onSubmit={handleAddEgg} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Date du ramassage <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={eggDate}
                    onChange={(e) => setEggDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Séance <span className="text-danger">*</span>
                  </label>
                  <select
                    value={eggSession}
                    onChange={(e) => setEggSession(e.target.value as EggSession)}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="MORNING">Matin</option>
                    <option value="NOON">Midi</option>
                    <option value="EVENING">Soir</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Bons œufs (conformes et propres) <span className="text-danger">*</span>
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
                  className="w-full px-3 py-2 text-sm font-mono font-bold bg-background border border-border rounded-lg text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <div className="mt-1 text-xs font-semibold text-primary">
                  {calcEggTrays(Number(goodEggs) || 0).text}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Œufs fêlés ou cassés
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
                    className="w-full px-3 py-2 text-sm font-mono bg-background border border-border rounded-lg text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Œufs anormaux ou sans coquille
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
                    className="w-full px-3 py-2 text-sm font-mono bg-background border border-border rounded-lg text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Observations de ponte
                </label>
                <input
                  type="text"
                  placeholder="Ex: Tapis légèrement poussiéreux, ponte régulière"
                  value={eggNotes}
                  onChange={(e) => setEggNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEggModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-surface border border-border text-muted hover:text-foreground transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submittingEgg}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-white hover:bg-primary-hover shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submittingEgg && <RefreshCw className="h-4 w-4 animate-spin" />}
                  Enregistrer la ponte
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* Modale Édition Bande */}
        <Modal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title="Modifier les paramètres de la bande"
          description="Ajustez les informations descriptives et le bâtiment d'affectation."
        >
          <form onSubmit={handleEditFlock} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Nom ou Libellé <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Bâtiment / Poulailler
                </label>
                <select
                  value={editBuildingId}
                  onChange={(e) => setEditBuildingId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">-- Non affecté --</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} (Capacité: {b.capacity} sujets)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Statut de la bande
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="ACTIVE">En cours d'élevage (Active)</option>
                  <option value="SOLD">Vendue entièrement</option>
                  <option value="DEPLETED">Réformée / Clôturée</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Date de fin estimée
              </label>
              <input
                type="date"
                value={editEstimatedEndDate}
                onChange={(e) => setEditEstimatedEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Remarques & Notes
              </label>
              <textarea
                rows={2}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-surface border border-border text-muted hover:text-foreground transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submittingEdit}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-white hover:bg-primary-hover shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {submittingEdit && <RefreshCw className="h-4 w-4 animate-spin" />}
                Enregistrer les modifications
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </Shell>
  );
}
