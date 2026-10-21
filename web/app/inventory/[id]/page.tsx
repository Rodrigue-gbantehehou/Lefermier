"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Package,
  ArrowLeft,
  AlertTriangle,
  AlertCircle,
  Wallet,
  Plus,
  Minus,
  Edit2,
  RefreshCw,
  CheckCircle2,
  Bird,
  Info,
  Tag,
  Layers,
  Utensils,
  Archive,
  RotateCcw,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { api } from "@/lib/api-client";
import {
  InventoryItem,
  StockMovement,
  StockMovementType,
  InventoryCategory,
  Flock,
  Contact,
} from "@/lib/types";
import { formatDate, formatNumber, formatFcfa } from "@/lib/utils";
import {
  formatInventoryUnit,
  getUnitLabel,
  getUnitShortLabel,
  getCompatibleMovementUnits,
  getPracticalMeasurementHint,
  ALL_UNITS_LIST,
} from "@/lib/units";

const CATEGORY_LABELS: Record<InventoryCategory, { label: string; badge: "default" | "success" | "warning" | "info" | "neutral" }> = {
  FEED: { label: "Aliment & Nutrition", badge: "default" },
  VACCINE: { label: "Vaccin biologique", badge: "warning" },
  MEDICINE: { label: "Médicament & Soins", badge: "danger" as any },
  EQUIPMENT: { label: "Matériel & Équipement", badge: "info" },
  OTHER: { label: "Autre intrant", badge: "neutral" },
};

const MOVEMENT_CONFIG: Record<
  string,
  { label: string; badge: "success" | "warning" | "danger" | "info" | "neutral"; sign: string; color: string }
> = {
  IN: {
    label: "Approvisionnement (Entrée)",
    badge: "success",
    sign: "+",
    color: "text-success",
  },
  INCOMING: {
    label: "Approvisionnement (Entrée)",
    badge: "success",
    sign: "+",
    color: "text-success",
  },
  OUT: {
    label: "Consommation bande (Sortie)",
    badge: "warning",
    sign: "-",
    color: "text-warning",
  },
  FEEDING: {
    label: "Nourrissage des volailles",
    badge: "warning",
    sign: "-",
    color: "text-warning",
  },
  LOSS: {
    label: "Perte / Avarie",
    badge: "danger",
    sign: "-",
    color: "text-danger",
  },
  ADJUSTMENT: {
    label: "Ajustement d'inventaire",
    badge: "info",
    sign: "±",
    color: "text-info",
  },
};

function InventoryItemDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { activeFarm, hasPermission } = useAuth();
  const { toast } = useToast();
  const itemId = params?.id as string;

  // Main state
  const [item, setItem] = useState<(InventoryItem & { movements?: StockMovement[] }) | null>(null);
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [suppliers, setSuppliers] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"movements" | "details">("movements");
  const [movementFilter, setMovementFilter] = useState<string>("ALL");

  // Modals state
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [moveType, setMoveType] = useState<StockMovementType>("IN");
  const [moveUnit, setMoveUnit] = useState<string>("KG");
  const [moveQty, setMoveQty] = useState<number | string>(15);
  const [moveUnitPrice, setMoveUnitPrice] = useState<number | string>("");
  const [moveDate, setMoveDate] = useState(new Date().toISOString().split("T")[0]);
  const [moveReason, setMoveReason] = useState("");
  const [moveFlockId, setMoveFlockId] = useState("");
  const [submittingMove, setSubmittingMove] = useState(false);

  // Détection article aliment / provende & conditionnement en sacs
  const isFeed = Boolean(
    item?.category === "FEED" ||
    item?.name?.toLowerCase().includes("aliment") ||
    item?.name?.toLowerCase().includes("provende") ||
    item?.name?.toLowerCase().includes("farine") ||
    item?.name?.toLowerCase().includes("granul")
  );
  const isBagItem = Boolean(
    item?.unit === "BAG" || item?.unit === "BAG_50KG" || item?.unit === "BAG_25KG"
  );
  const itemBagWeight = item?.packageWeightKg || (item?.unit === "BAG_25KG" ? 25 : 50);

  // Edit Item Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState<InventoryCategory>("FEED");
  const [editCustomCategory, setEditCustomCategory] = useState("");
  const [editUnit, setEditUnit] = useState("BAG_50KG");
  const [editPackageWeightKg, setEditPackageWeightKg] = useState<number | string>(50);
  const [editMinThreshold, setEditMinThreshold] = useState<number | string>(10);
  const [editUnitCost, setEditUnitCost] = useState<number | string>(0);
  const [editNotes, setEditNotes] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  useEffect(() => {
    if (itemId) {
      loadItemData();
    }
  }, [itemId]);

  useEffect(() => {
    if (activeFarm?.id) {
      api.flocks.list({ farmId: activeFarm.id, status: "ACTIVE" }).then(setFlocks).catch(() => {});
      api.contacts.list({ farmId: activeFarm.id, type: "SUPPLIER" }).then(setSuppliers).catch(() => {});
    }
  }, [activeFarm?.id]);

  async function loadItemData() {
    setLoading(true);
    try {
      const data = await api.inventory.get(itemId);
      setItem(data);
      setEditName(data.name || "");
      setEditCategory(data.category || "FEED");
      setEditCustomCategory(data.customCategory || "");
      setEditUnit(data.unit || "BAG_50KG");
      setEditPackageWeightKg(data.packageWeightKg || (data.unit === "BAG_25KG" ? 25 : 50));
      setEditMinThreshold(data.minThreshold || 0);
      setEditUnitCost(data.unitCostFcfa || 0);
      setEditNotes(data.notes || "");
      setEditIsActive(data.isActive !== undefined ? data.isActive : true);
    } catch (err) {
      console.error("Erreur chargement article:", err);
    } finally {
      setLoading(false);
    }
  }

  function openMovementModal(type: StockMovementType) {
    setMoveError(null);
    setMoveType(type);
    setMoveUnitPrice(item?.unitCostFcfa || 0);
    setMoveDate(new Date().toISOString().split("T")[0]);
    setMoveFlockId(flocks[0]?.id || "");

    const compatible = getCompatibleMovementUnits(item?.unit, item?.packageWeightKg);
    const defaultUnit = compatible[0]?.code || item?.unit || "UNIT";

    if (type === "OUT") {
      if (isFeed) {
        setMoveUnit("KG"); // Pour la provende : pesée balance en kg
        setMoveQty(15);
        setMoveReason("Ration repas");
      } else if (item?.unit === "LITER" || item?.unit === "ML") {
        setMoveUnit("ML"); // Pour les vitamines liquides : millilitres
        setMoveQty(30);
        setMoveReason("Traitement eau de boisson");
      } else if (item?.unit === "KG" || item?.unit === "G") {
        setMoveUnit("G"); // Pour les vitamines poudre : grammes
        setMoveQty(15);
        setMoveReason("Vitamines / Poudre");
      } else {
        setMoveUnit(defaultUnit);
        setMoveQty(1);
        setMoveReason("Consommation");
      }
    } else if (type === "IN") {
      setMoveUnit(item?.unit || defaultUnit);
      setMoveQty(isBagItem ? 10 : 1);
      setMoveReason("Approvisionnement");
    } else {
      setMoveUnit(item?.unit || defaultUnit);
      setMoveQty(item?.currentStock || 0);
      setMoveReason("Ajustement inventaire");
    }

    setMoveModalOpen(true);
  }

  async function handleRecordMovement(e: React.FormEvent) {
    e.preventDefault();
    if (!item?.id) return;

    setMoveError(null);
    setSubmittingMove(true);
    try {
      await api.inventory.addMovement(item.id, {
        type: moveType,
        quantity: Number(moveQty),
        unit: moveUnit,
        unitPrice: moveUnitPrice ? Number(moveUnitPrice) : undefined,
        movementDate: moveDate,
        flockId: moveType === "OUT" && moveFlockId ? moveFlockId : undefined,
        reason: moveReason.trim() || undefined,
      });

      setMoveModalOpen(false);
      toast.success("Mouvement de stock enregistré avec succès !");
      await loadItemData();
    } catch (err: any) {
      const msg = err?.message || "Erreur lors de l'enregistrement du mouvement.";
      setMoveError(msg);
      toast.error(msg);
    } finally {
      setSubmittingMove(false);
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!item?.id) return;

    setEditError(null);
    setSubmittingEdit(true);
    try {
      const isBagEdit = editUnit === "BAG" || editUnit === "BAG_50KG" || editUnit === "BAG_25KG";
      await api.inventory.update(item.id, {
        name: editName.trim(),
        category: editCategory,
        customCategory: editCategory === "OTHER" ? editCustomCategory.trim() : null,
        unit: editUnit,
        packageWeightKg: isBagEdit ? Math.max(0.1, Number(editPackageWeightKg) || 50) : null,
        minThreshold: Number(editMinThreshold) || 0,
        unitCostFcfa: Number(editUnitCost) || 0,
        notes: editNotes.trim() || null,
        isActive: editIsActive,
      });

      setEditModalOpen(false);
      toast.success("Article mis à jour avec succès !");
      await loadItemData();
    } catch (err: any) {
      const msg = err?.message || "Erreur lors de la modification de l'article.";
      setEditError(msg);
      toast.error(msg);
    } finally {
      setSubmittingEdit(false);
    }
  }

  async function handleToggleArchive() {
    if (!item?.id) return;
    try {
      await api.inventory.update(item.id, {
        isActive: !item.isActive,
      });
      toast.success(item.isActive ? "Article archivé avec succès." : "Article restauré avec succès.");
      await loadItemData();
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors du changement de statut d'archivage.");
    }
  }

  // Derived stats
  const movements = useMemo(() => item?.movements || [], [item]);

  const filteredMovements = useMemo(() => {
    if (movementFilter === "ALL") return movements;
    return movements.filter((m) => m.type === movementFilter);
  }, [movements, movementFilter]);

  const totalInQty = useMemo(
    () =>
      movements
        .filter((m) => m.type === "IN")
        .reduce((sum, m) => sum + Number(m.quantity || 0), 0),
    [movements]
  );

  const totalOutQty = useMemo(
    () =>
      movements
        .filter((m) => m.type === "OUT")
        .reduce((sum, m) => sum + Number(m.quantity || 0), 0),
    [movements]
  );

  const totalSpentFcfa = useMemo(
    () =>
      movements
        .filter((m) => m.type === "IN")
        .reduce(
          (sum, m) =>
            sum +
            Number(
              m.totalCostFcfa !== undefined
                ? m.totalCostFcfa
                : Number(m.quantity || 0) * (m.unitPriceFcfa || item?.unitCostFcfa || 0)
            ),
          0
        ),
    [movements, item]
  );

  const isLowStock = item ? item.currentStock <= item.minThreshold : false;
  const isCriticalStock = item ? item.currentStock <= item.minThreshold * 0.5 : false;
  const totalStockValue = item ? item.currentStock * item.unitCostFcfa : 0;

  // Stock security gauge percentage (cap at 100% when stock >= 2x threshold)
  const stockRatioPercent = item?.minThreshold && item.minThreshold > 0
    ? Math.min(100, Math.round((item.currentStock / (item.minThreshold * 2)) * 100))
    : 100;

  const movementColumns: ColumnDef<StockMovement>[] = [
    {
      key: "date",
      header: "Date",
      cell: (m: StockMovement) => (
        <span className="font-mono text-xs text-foreground">
          {formatDate(m.date)}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type d'opération",
      cell: (m: StockMovement) => {
        const conf = MOVEMENT_CONFIG[m.type as StockMovementType] || {
          label: m.type,
          badge: "neutral",
        };
        return (
          <Badge variant={conf.badge} size="sm">
            {conf.label}
          </Badge>
        );
      },
    },
    {
      key: "quantity",
      header: "Quantité",
      align: "right",
      cell: (m: StockMovement) => {
        const conf = MOVEMENT_CONFIG[m.type as string] || { sign: "", color: "text-foreground" };
        const unitName = m.unitShortLabel || getUnitShortLabel(m.unit || item?.unit || "UNIT");

        // Équivalence sac <-> kg selon le poids réel du sac
        const isMovementInKg = m.unit === "KG" || unitName.toLowerCase() === "kg";
        const isMovementInBags = m.unit === "BAG" || m.unit === "BAG_50KG" || m.unit === "BAG_25KG" || unitName.toLowerCase() === "sac";

        let equivLabel: string | null = null;
        if (isBagItem && isMovementInKg) {
          const bags = (Number(m.quantity) / itemBagWeight).toFixed(2);
          equivLabel = `≈ ${bags} sac (${itemBagWeight} kg)`;
        } else if (isBagItem && isMovementInBags) {
          const totalKg = (Number(m.quantity) * itemBagWeight).toLocaleString("fr-FR");
          equivLabel = `≈ ${totalKg} kg`;
        }

        return (
          <div className="flex flex-col items-end">
            <span className={`font-mono text-xs font-bold ${conf.color}`}>
              {conf.sign} {formatNumber(m.quantity)} <span className="text-[10px] text-muted font-normal">{unitName}</span>
            </span>
            {equivLabel && (
              <span className="text-[10px] font-mono text-muted">
                {equivLabel}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "unitPrice",
      header: "Prix unitaire",
      align: "right",
      cell: (m: StockMovement) => (
        <span className="font-mono text-xs text-muted">
          {m.unitPriceFcfa > 0 ? formatFcfa(m.unitPriceFcfa) : "—"}
        </span>
      ),
    },
    {
      key: "totalCost",
      header: "Valeur totale",
      align: "right",
      cell: (m: StockMovement) => {
        const total = m.totalCostFcfa !== undefined && m.totalCostFcfa > 0
          ? m.totalCostFcfa
          : (m.unitPriceFcfa || 0) * (m.quantity || 0);
        return (
          <span className="font-mono text-xs font-bold text-foreground">
            {total > 0 ? formatFcfa(total) : "—"}
          </span>
        );
      },
    },
    {
      key: "flock",
      header: "Bande / Lot rattaché",
      cell: (m: StockMovement) => {
        if (!m.flock) return <span className="text-xs text-muted">—</span>;
        return (
          <Link
            href={`/flocks/${m.flock.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-surface-muted px-2 py-0.5 text-xs font-semibold text-primary hover:bg-primary-soft transition-colors"
          >
            <Bird className="h-3 w-3" />
            <span>{m.flock.name || m.flock.code}</span>
          </Link>
        );
      },
    },
    {
      key: "reason",
      header: "Motif / Remarque",
      cell: (m: StockMovement) => (
        <span className="truncate text-xs text-muted max-w-[220px]" title={m.reason || "—"}>
          {m.reason ? m.reason.replace(/^\[(Matin|Midi|Soir|Journée)\]\s*/i, "") : "—"}
        </span>
      ),
    },
    {
      key: "recordedBy",
      header: "Enregistré par",
      cell: (m: StockMovement) => (
        <span className="text-xs text-muted">
          {m.recordedBy?.name || "Système"}
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <Shell>
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <p className="text-xs text-muted">Chargement de la fiche article 360°...</p>
          </div>
        </div>
      </Shell>
    );
  }

  if (!item) {
    return (
      <Shell>
        <div className="rounded-2xl border border-border bg-surface p-8 text-center max-w-md mx-auto">
          <AlertTriangle className="mx-auto h-12 w-12 text-warning mb-3" />
          <h2 className="text-base font-bold text-foreground">Article introuvable</h2>
          <p className="mt-1 text-xs text-muted">
            L'article d'inventaire demandé n'existe pas ou a été supprimé.
          </p>
          <Link
            href="/inventory"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-hover transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Retour à l'inventaire</span>
          </Link>
        </div>
      </Shell>
    );
  }

  const categoryBadge = CATEGORY_LABELS[item.category] || { label: item.category, badge: "neutral" };
  const unitLabel = getUnitLabel(item.unit);
  const unitShort = getUnitShortLabel(item.unit);

  return (
    <Shell>
      {/* Back Button & Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/inventory"
            className="rounded-xl border border-border bg-surface p-2 text-muted hover:bg-surface-hover hover:text-foreground transition-colors shadow-xs"
            title="Retour à la liste des stocks"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {item.name}
              </h1>
              <Badge variant={categoryBadge.badge} size="sm">
                {item.category === "OTHER" && item.customCategory
                  ? item.customCategory
                  : categoryBadge.label}
              </Badge>
              {item.isActive === false && (
                <Badge variant="neutral" size="sm">
                  Archivé
                </Badge>
              )}
            
            </div>
            <p className="mt-1 text-xs text-muted flex items-center gap-2">
              <span>
                Unité standard : <strong className="text-foreground">{unitLabel}</strong>
                {isBagItem && (
                  <span className="font-mono text-primary font-semibold ml-1">
                    ({itemBagWeight} kg / sac)
                  </span>
                )}
              </span>
              <span>•</span>
              <span>Seuil de sécurité : <strong className="text-foreground">{formatNumber(item.minThreshold)} {unitShort}</strong></span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {hasPermission("inventory:update") && (
            <>
              <button
                type="button"
                onClick={() => openMovementModal("IN")}
                className="inline-flex items-center gap-1.5 rounded-xl bg-success px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-success/90 transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Approvisionner</span>
              </button>

              <button
                type="button"
                onClick={() => openMovementModal("OUT")}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-hover transition-colors cursor-pointer"
                title={isFeed ? "Distribuer la provende aux volailles" : "Enregistrer une sortie ou un traitement"}
              >
                {isFeed ? <Utensils className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                <span>{isFeed ? "Nourrir" : "Distribuer"}</span>
              </button>
            </>
          )}
          {hasPermission("inventory:create") && (
            <button
              type="button"
              onClick={() => setEditModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface p-2 text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-hover transition-colors shadow-xs"
              title="Modifier les paramètres de l'article"
            >
              <Edit2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Jauge d'Alerte de Stock */}
      <div className={`mb-6 rounded-2xl border p-4 shadow-xs transition-colors ${
        isCriticalStock
          ? "border-danger/30 bg-danger-soft/50"
          : isLowStock
          ? "border-warning/30 bg-warning-soft/50"
          : "border-border bg-surface"
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            {isLowStock ? (
              <AlertTriangle className={`h-4 w-4 shrink-0 ${isCriticalStock ? "text-danger" : "text-warning"}`} />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
            )}
            <span className="text-xs font-bold text-foreground">
              {isCriticalStock
                ? "Niveau de stock critique — Réapprovisionnement urgent requis"
                : isLowStock
                ? "Attention — Stock sous le seuil d'alerte défini"
                : "Niveau de stock normal et sécurisé"}
            </span>
          </div>
          <span className="text-xs font-mono text-muted">
            {formatNumber(item.currentStock)} / {formatNumber(item.minThreshold * 2)} {unitShort} (Objectif tampon)
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-2.5 w-full rounded-full bg-border overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isCriticalStock
                ? "bg-danger"
                : isLowStock
                ? "bg-warning"
                : "bg-success"
            }`}
            style={{ width: `${Math.max(5, stockRatioPercent)}%` }}
          />
        </div>
      </div>

      {/* 4 KPI Highlight Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          title="Stock Actuel Disponible"
          value={formatInventoryUnit(item.currentStock, item.unit, { packageWeightKg: item.packageWeightKg })}
          subtitle={
            isBagItem
              ? `Soit ~${formatNumber(item.currentStock * itemBagWeight)} kg au total`
              : isLowStock
              ? `Alerte sous le seuil (${formatNumber(item.minThreshold)} ${unitShort})`
              : `Seuil d'alerte à ${formatNumber(item.minThreshold)} ${unitShort}`
          }
          icon={<Package className="h-5 w-5" />}
        />

        <StatCard
          title="Valeur Marchande du Stock"
          value={formatFcfa(totalStockValue)}
          subtitle={`Coût unitaire : ${formatFcfa(item.unitCostFcfa)} / ${unitShort}`}
          icon={<Wallet className="h-5 w-5" />}
        />

        <StatCard
          title="Cumul des Entrées"
          value={`${formatNumber(totalInQty)} ${unitShort}`}
          subtitle={`Dépense cumulée : ${formatFcfa(totalSpentFcfa)}`}
          icon={<TrendingUp className="h-5 w-5" />}
        />

        <StatCard
          title="Cumul des Sorties"
          value={`${formatNumber(totalOutQty)} ${unitShort}`}
          subtitle="Distribué aux bandes de volailles"
          icon={<TrendingDown className="h-5 w-5" />}
        />
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6 flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("movements")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-colors ${
            activeTab === "movements"
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:border-border hover:text-foreground"
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Historique des mouvements de stock ({movements.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("details")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-colors ${
            activeTab === "details"
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:border-border hover:text-foreground"
          }`}
        >
          <Info className="h-4 w-4" />
          <span>Fiche technique & Paramètres</span>
        </button>
      </div>

      {/* TAB 1: MOVEMENTS HISTORY */}
      {activeTab === "movements" && (
        <div className="space-y-4">
          {/* Sub-filters for movements */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 rounded-xl border border-border bg-surface p-1 shadow-xs">
              <button
                type="button"
                onClick={() => setMovementFilter("ALL")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  movementFilter === "ALL"
                    ? "bg-primary text-white"
                    : "text-muted hover:bg-surface-hover hover:text-foreground"
                }`}
              >
                Tous ({movements.length})
              </button>
              <button
                type="button"
                onClick={() => setMovementFilter("IN")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  movementFilter === "IN"
                    ? "bg-success text-white"
                    : "text-muted hover:bg-surface-hover hover:text-foreground"
                }`}
              >
                Entrées ({movements.filter((m) => m.type === "IN").length})
              </button>
              <button
                type="button"
                onClick={() => setMovementFilter("OUT")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  movementFilter === "OUT"
                    ? "bg-warning text-white"
                    : "text-muted hover:bg-surface-hover hover:text-foreground"
                }`}
              >
                Sorties ({movements.filter((m) => m.type === "OUT").length})
              </button>
              <button
                type="button"
                onClick={() => setMovementFilter("ADJUSTMENT")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  movementFilter === "ADJUSTMENT"
                    ? "bg-info text-white"
                    : "text-muted hover:bg-surface-hover hover:text-foreground"
                }`}
              >
                Ajustements ({movements.filter((m) => m.type === "ADJUSTMENT").length})
              </button>
            </div>

            <button
              type="button"
              onClick={loadItemData}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-hover transition-colors shadow-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Actualiser</span>
            </button>
          </div>

          {filteredMovements.length === 0 ? (
            <EmptyState
              title="Aucun mouvement de stock enregistré"
              description={
                movementFilter !== "ALL"
                  ? "Aucune opération ne correspond à ce filtre pour cet article."
                  : "Enregistrez votre premier approvisionnement ou votre première distribution aux volailles."
              }
              icon={<Package className="h-8 w-8" />}
              actionLabel={hasPermission("inventory:update") ? "Enregistrer une entrée" : undefined}
              onAction={hasPermission("inventory:update") ? () => openMovementModal("IN") : undefined}
            />
          ) : (
            <DataTable
              columns={movementColumns}
              data={filteredMovements}
              keyExtractor={(m) => m.id}
            />
          )}
        </div>
      )}

      {/* TAB 2: TECHNICAL DETAILS & SETTINGS */}
      {activeTab === "details" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Card 1: Caractéristiques Produit */}
          <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4 border-b border-border pb-3">
              <Package className="h-4 w-4 text-primary" />
              <span>Caractéristiques & Conditionnement</span>
            </h2>

            <dl className="space-y-3.5 text-xs">
              <div className="flex justify-between py-1 border-b border-border/50">
                <dt className="text-muted">Nom de l'article :</dt>
                <dd className="font-bold text-foreground">{item.name}</dd>
              </div>

              <div className="flex justify-between py-1 border-b border-border/50">
                <dt className="text-muted">Code SKU / Référence :</dt>
                <dd className="font-mono font-bold text-foreground">{item.sku || "—"}</dd>
              </div>

              <div className="flex justify-between py-1 border-b border-border/50">
                <dt className="text-muted">Catégorie :</dt>
                <dd>
                  <Badge variant={categoryBadge.badge} size="sm">
                    {categoryBadge.label}
                  </Badge>
                </dd>
              </div>

              <div className="flex justify-between py-1 border-b border-border/50">
                <dt className="text-muted">Unité de gestion :</dt>
                <dd className="font-bold text-foreground">{unitLabel} ({unitShort})</dd>
              </div>

              {isBagItem && (
                <>
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <dt className="text-muted">Poids net d'un sac :</dt>
                    <dd className="font-mono font-bold text-primary">{itemBagWeight} kg / sac</dd>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <dt className="text-muted">Masse totale en stock :</dt>
                    <dd className="font-mono font-bold text-foreground">
                      ~{formatNumber(item.currentStock * itemBagWeight)} kg ({formatNumber(item.currentStock)} sacs)
                    </dd>
                  </div>
                </>
              )}

              <div className="flex justify-between py-1 border-b border-border/50">
                <dt className="text-muted">Seuil d'alerte sécurité :</dt>
                <dd className="font-mono font-bold text-foreground">{formatNumber(item.minThreshold)} {unitShort}</dd>
              </div>

              <div className="flex justify-between py-1 border-b border-border/50">
                <dt className="text-muted">Prix unitaire de référence :</dt>
                <dd className="font-mono font-bold text-foreground">{formatFcfa(item.unitCostFcfa)} / {unitShort}</dd>
              </div>

              <div className="flex justify-between py-1">
                <dt className="text-muted">Statut d'activité :</dt>
                <dd>
                  <Badge variant={item.isActive !== false ? "success" : "neutral"} size="sm">
                    {item.isActive !== false ? "Actif en exploitation" : "Archivé / Inactif"}
                  </Badge>
                </dd>
              </div>
            </dl>
          </div>

          {/* Card 2: Notes & Actions administratives */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3 border-b border-border pb-3">
                <Info className="h-4 w-4 text-primary" />
                <span>Notes & Consignes d'utilisation</span>
              </h2>
              {item.notes ? (
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap bg-surface-muted p-3.5 rounded-xl border border-border">
                  {item.notes}
                </p>
              ) : (
                <p className="text-xs text-muted italic">
                  Aucune note ou consigne particulière renseignée pour cet article.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3 border-b border-border pb-3">
                <Tag className="h-4 w-4 text-primary" />
                <span>Actions & Archivage</span>
              </h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary-soft px-4 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Modifier la fiche</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleArchive}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                    item.isActive !== false
                      ? "bg-warning-soft text-warning hover:bg-warning/20"
                      : "bg-success-soft text-success hover:bg-success/20"
                  }`}
                >
                  {item.isActive !== false ? (
                    <>
                      <Archive className="h-3.5 w-3.5" />
                      <span>Archiver l'article</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Restaurer l'article</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MOUVEMENT DE STOCK (Distribution, Nourrissage, Entrée, Ajustement) */}
      <Modal
        isOpen={moveModalOpen}
        onClose={() => setMoveModalOpen(false)}
        title={
          moveType === "IN"
            ? "Approvisionnement de stock"
            : moveType === "OUT"
            ? isFeed
              ? "Distribution d'aliment"
              : "Sortie de stock"
            : "Ajustement d'inventaire"
        }
        description={`${item.name} • Stock disponible : ${formatInventoryUnit(item.currentStock, item.unit, { packageWeightKg: item.packageWeightKg })}`}
        maxWidth="md"
      >
        <form onSubmit={handleRecordMovement} className="space-y-4">
          {/* Ligne 1 : Type d'opération & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Type d'opération *
              </label>
              <select
                value={moveType}
                onChange={(e) => {
                  const newType = e.target.value as StockMovementType;
                  setMoveType(newType);
                  const compatible = getCompatibleMovementUnits(item.unit, item.packageWeightKg);
                  if (newType === "IN") {
                    setMoveUnit(item.unit || compatible[0]?.code || "UNIT");
                    setMoveReason("Approvisionnement");
                  } else if (newType === "OUT") {
                    if (isFeed) {
                      setMoveUnit("KG");
                      setMoveReason("Ration repas");
                    } else if (item.unit === "LITER" || item.unit === "ML") {
                      setMoveUnit("ML");
                      setMoveReason("Traitement eau de boisson");
                    } else if (item.unit === "KG" || item.unit === "G") {
                      setMoveUnit("G");
                      setMoveReason("Vitamines / Poudre");
                    } else {
                      setMoveUnit(compatible[0]?.code || item.unit || "UNIT");
                      setMoveReason("Sortie consommation");
                    }
                  }
                }}
                className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
              >
                <option value="OUT">Sortie / Distribution</option>
                <option value="IN">Entrée / Approvisionnement</option>
                <option value="ADJUSTMENT">Ajustement inventaire</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={moveDate}
                onChange={(e) => setMoveDate(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
              />
            </div>
          </div>

          {/* Bande de volailles destinataire (si Sortie) */}
          {moveType === "OUT" && flocks.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1 flex items-center justify-between">
                <span>Bande de volailles</span>
                {(() => {
                  const f = flocks.find((fl) => fl.id === moveFlockId);
                  return f ? (
                    <span className="text-[11px] font-mono text-muted">
                      {formatNumber(f.currentQuantity)} sujets
                    </span>
                  ) : null;
                })()}
              </label>
              <select
                value={moveFlockId}
                onChange={(e) => setMoveFlockId(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden font-medium"
              >
                <option value="">-- Aucune bande spécifique --</option>
                {flocks.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.code}) — {formatNumber(f.currentQuantity)} sujets
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quantité & Choix de l'unité */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Quantité & Unité *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="any"
                min="0.001"
                required
                value={moveQty}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setMoveQty(e.target.value)}
                placeholder="ex. 15"
                className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-sm font-mono font-bold text-foreground focus:border-primary focus:outline-hidden"
              />
              <select
                value={moveUnit}
                onChange={(e) => setMoveUnit(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-hidden"
              >
                {getCompatibleMovementUnits(item.unit, item.packageWeightKg).map((u) => (
                  <option key={u.code} value={u.code}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Indication sobre et discrète de dosage (cuillère à soupe, décompte sacs, etc.) */}
            {(() => {
              const hint = getPracticalMeasurementHint(moveQty, moveUnit, {
                packageWeightKg: item.packageWeightKg,
                itemUnit: item.unit,
              });
              return hint ? (
                <p className="mt-1.5 text-[11px] text-muted flex items-center gap-1.5">
                  <span className="font-semibold text-primary">•</span>
                  <span>{hint}</span>
                </p>
              ) : null;
            })()}
          </div>

          {/* Prix unitaire (si Entrée) */}
          {moveType === "IN" && (
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Prix unitaire d'achat (FCFA / {getUnitShortLabel(moveUnit)})
              </label>
              <input
                type="number"
                min="0"
                value={moveUnitPrice}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setMoveUnitPrice(e.target.value)}
                placeholder={item.unitCostFcfa ? `Prix habituel : ${item.unitCostFcfa} FCFA` : "Optionnel"}
                className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs font-mono text-foreground focus:border-primary focus:outline-hidden"
              />
            </div>
          )}

          {/* Motif / Remarque avec suggestions discrètes */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Motif / Remarque
            </label>
            <input
              type="text"
              value={moveReason}
              onChange={(e) => setMoveReason(e.target.value)}
              placeholder={isFeed ? "ex. Ration matin, distribution repas..." : "ex. Traitement eau de boisson, vitamines..."}
              className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
            />
            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-muted">Suggestions :</span>
              {(isFeed
                ? ["Ration matin", "Ration midi", "Ration soir", "Réassort"]
                : ["Traitement eau", "Vitamines", "Soins", "Approvisionnement"]
              ).map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setMoveReason(sug)}
                  className="text-[10px] px-2 py-0.5 rounded-md border border-border bg-surface hover:bg-surface-hover text-muted hover:text-foreground transition-colors cursor-pointer"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {moveError && (
            <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{moveError}</div>
            </div>
          )}

          <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => {
                setMoveModalOpen(false);
                setMoveError(null);
              }}
              className="rounded-xl border border-border px-3.5 py-2 text-xs font-semibold text-muted hover:bg-surface-hover hover:text-foreground transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submittingMove}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-hover transition-colors disabled:opacity-50 cursor-pointer"
            >
              <span>{submittingMove ? "Enregistrement..." : "Enregistrer le mouvement"}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL MODIFICATION ARTICLE */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Modifier l'article : ${item.name}`}
        description="Ajustez les paramètres de cet intrant, son unité ou son seuil d'alerte."
        maxWidth="md"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Désignation de l'article *
            </label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Catégorie *
              </label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value as InventoryCategory)}
                className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
              >
                <option value="FEED">Aliment & Nutrition</option>
                <option value="VACCINE">Vaccin biologique</option>
                <option value="MEDICINE">Médicament & Soins</option>
                <option value="EQUIPMENT">Matériel & Équipement</option>
                <option value="OTHER">Autre</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Unité de gestion *
              </label>
              <select
                value={editUnit}
                onChange={(e) => {
                  const newU = e.target.value;
                  setEditUnit(newU);
                  if (newU === "BAG_25KG" && (!editPackageWeightKg || editPackageWeightKg === 50)) {
                    setEditPackageWeightKg(25);
                  }
                }}
                className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
              >
                {ALL_UNITS_LIST.map((u) => (
                  <option key={u.code} value={u.code}>
                    {u.label} ({u.shortLabel})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Précision personnalisée si catégorie Autre */}
          {editCategory === "OTHER" && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
              <label className="block text-xs font-semibold text-foreground mb-1">
                Précisez la catégorie / nature de l'intrant *
              </label>
              <input
                type="text"
                required
                value={editCustomCategory}
                onChange={(e) => setEditCustomCategory(e.target.value)}
                placeholder="ex. Litière & Copeaux, Désinfectant, Carton d'alvéoles..."
                className="w-full rounded-xl border border-border bg-surface p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
              />
            </div>
          )}

          {/* Saisie personnalisée du poids par sac */}
          {(editUnit === "BAG" || editUnit === "BAG_50KG" || editUnit === "BAG_25KG") && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
              <label className="block text-xs font-semibold text-foreground">
                Poids net par sac (kg) *
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0.1"
                  max="1000"
                  step="0.1"
                  required
                  value={editPackageWeightKg}
                  onChange={(e) => setEditPackageWeightKg(e.target.value)}
                  placeholder="ex. 50, 40, 25..."
                  className="w-full rounded-xl border border-border bg-surface p-2.5 text-xs font-mono font-bold text-foreground focus:border-primary focus:outline-hidden"
                />
                <span className="text-xs font-bold text-muted whitespace-nowrap">kg / sac</span>
              </div>
              <p className="text-[11px] text-muted">
                Définit le poids exact d'un sac pour calculer fidèlement le poids total en magasin ({formatNumber(item.currentStock)} sacs = ~{formatNumber(item.currentStock * (Number(editPackageWeightKg) || 50))} kg) et convertir les pesées de machine.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Seuil d'alerte de stock *
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                required
                value={editMinThreshold}
                onChange={(e) => setEditMinThreshold(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs font-mono text-foreground focus:border-primary focus:outline-hidden"
              />
              <span className="mt-1 block text-[10px] text-muted">
                Déclenche l'alerte dès que le stock descend à ce niveau.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Prix unitaire d'achat moyen (FCFA)
              </label>
              <input
                type="number"
                min="0"
                value={editUnitCost}
                onChange={(e) => setEditUnitCost(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs font-mono text-foreground focus:border-primary focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Notes et spécifications techniques
            </label>
            <textarea
              rows={3}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Instructions de conservation, posologie, fournisseur habituel..."
              className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
            />
          </div>

          {editError && (
            <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{editError}</div>
            </div>
          )}

          <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => {
                setEditModalOpen(false);
                setEditError(null);
              }}
              className="rounded-xl border border-border px-3.5 py-2 text-xs font-semibold text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submittingEdit}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              <span>{submittingEdit ? "Enregistrement..." : "Enregistrer les modifications"}</span>
            </button>
          </div>
        </form>
      </Modal>
    </Shell>
  );
}

export default function InventoryItemDetailPage() {
  return (
    <Suspense
      fallback={
        <Shell>
          <div className="flex h-96 items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-xs text-muted">
              <Package className="h-5 w-5 animate-pulse text-primary" />
              <span>Chargement de la fiche article...</span>
            </div>
          </div>
        </Shell>
      }
    >
      <InventoryItemDetailContent />
    </Suspense>
  );
}
