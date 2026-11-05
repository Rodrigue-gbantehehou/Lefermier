"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Package, AlertTriangle, AlertCircle, Filter, Eye, Download } from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { StatCard } from "@/components/ui/stat-card";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { api } from "@/lib/api-client";
import { InventoryItem, InventoryCategory, StockMovement, StockMovementType } from "@/lib/types";
import { formatFcfa, formatNumber } from "@/lib/utils";
import { exportInventoryToCsv } from "@/lib/export";
import { ModuleLockedState } from "@/components/ui/module-locked-state";
import {
  formatInventoryUnit,
  getUnitLabel,
  getUnitShortLabel,
  convertUnit,
  getCompatibleMovementUnits,
  getPracticalMeasurementHint,
  ALL_UNITS_LIST,
} from "@/lib/units";

export default function InventoryPage() {
  const { activeFarm, hasPermission, hasModule } = useAuth();
  const { toast } = useToast();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [activeTab, setActiveTab] = useState<"ITEMS" | "MOVEMENTS">("ITEMS");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(true);

  // Create Item Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState<InventoryCategory>("FEED");
  const [customCategory, setCustomCategory] = useState("");
  const [unit, setUnit] = useState("BAG_50KG");
  const [packageWeightKg, setPackageWeightKg] = useState<number | string>(50);
  const [minThreshold, setMinThreshold] = useState<number | string>(10);
  const [currentStock, setCurrentStock] = useState<number | string>(50);
  const [unitCostFcfa, setUnitCostFcfa] = useState<number | string>(18500);
  const [submittingItem, setSubmittingItem] = useState(false);

  // Movement Modal
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [moveType, setMoveType] = useState<StockMovementType>("OUT");
  const [moveUnit, setMoveUnit] = useState<string>("BAG_50KG");
  const [quantity, setQuantity] = useState<number | string>(1);
  const [unitPrice, setUnitPrice] = useState<number | string>(0);
  const [reason, setReason] = useState("Consommation journalière bande");
  const [submittingMove, setSubmittingMove] = useState(false);

  function openMovementModal(item: InventoryItem) {
    setSelectedItem(item);
    setMoveError(null);
    const compatible = getCompatibleMovementUnits(item.unit, item.packageWeightKg);
    const defU = item.category === "FEED" ? "KG" : (compatible[0]?.code || item.unit);
    setMoveUnit(defU);
    setUnitPrice(item.unitCostFcfa || 0);
    setQuantity(item.category === "FEED" ? 15 : (item.unit === "ML" ? 30 : item.unit === "G" ? 15 : 1));
    setReason("Sortie consommation");
    setMovementModalOpen(true);
  }

  useEffect(() => {
    if (activeFarm?.id && hasModule("inventory")) {
      loadInventory();
    } else {
      setIsLoading(false);
    }
  }, [activeFarm?.id]);

  async function loadInventory() {
    if (!activeFarm?.id) return;
    setIsLoading(true);
    try {
      const [itemsData, movementsData] = await Promise.all([
        api.inventory.listItems({ farmId: activeFarm.id }),
        api.inventory.listFarmMovements(activeFarm.id),
      ]);
      setItems(itemsData);
      setMovements(movementsData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  const isBagUnit = unit === "BAG" || unit === "BAG_50KG" || unit === "BAG_25KG";

  async function handleCreateItem(e: React.FormEvent) {
    e.preventDefault();
    if (!activeFarm?.id) return;
    setCreateError(null);
    setSubmittingItem(true);
    try {
      await api.inventory.createItem({
        farmId: activeFarm.id,
        name,
        sku: sku || `SKU-${Date.now().toString().slice(-6)}`,
        category,
        customCategory: category === "OTHER" ? customCategory.trim() : undefined,
        unit,
        packageWeightKg: isBagUnit ? Number(packageWeightKg) : undefined,
        minThreshold: Number(minThreshold),
        currentStock: Number(currentStock),
        unitCostFcfa: Number(unitCostFcfa),
      });
      setCreateModalOpen(false);
      setName("");
      setSku("");
      setCustomCategory("");
      toast.success("Article créé avec succès !");
      await loadInventory();
    } catch (err: any) {
      const msg = err?.message || "Erreur lors de la création de l'article";
      setCreateError(msg);
      toast.error(msg);
    } finally {
      setSubmittingItem(false);
    }
  }

  async function handleAddMovement(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedItem) return;
    setMoveError(null);
    setSubmittingMove(true);
    try {
      await api.inventory.addMovement(selectedItem.id, {
        type: moveType,
        quantity: Number(quantity),
        unit: moveUnit,
        unitPriceFcfa: Number(unitPrice || selectedItem.unitCostFcfa),
        reason: reason || undefined,
        date: new Date().toISOString().split("T")[0],
      });
      setMovementModalOpen(false);
      setQuantity(1);
      setReason("");
      toast.success(
        moveType === "IN"
          ? "Approvisionnement enregistré avec succès !"
          : "Sortie de stock enregistrée avec succès !"
      );
      await loadInventory();
    } catch (err: any) {
      const msg = err?.message || "Erreur lors du mouvement de stock";
      setMoveError(msg);
      toast.error(msg);
    } finally {
      setSubmittingMove(false);
    }
  }

  const lowStockCount = items.filter((i) => i.currentStock <= i.minThreshold).length;
  const totalStockValue = items.reduce(
    (sum, i) => sum + i.currentStock * i.unitCostFcfa,
    0
  );

  const filteredItems = items.filter((i) => {
    if (filterCategory === "ALL") return true;
    return i.category === filterCategory;
  });

  const itemColumns: ColumnDef<InventoryItem>[] = [
    {
      key: "name",
      header: "Désignation",
      sortable: true,
      cell: (item) => (
        <div>
          <Link
            href={`/inventory/${item.id}`}
            className="hover:text-primary hover:underline transition-colors font-bold text-foreground block text-xs"
          >
            {item.name}
          </Link>
         
        </div>
      ),
    },
    {
      key: "category",
      header: "Catégorie",
      sortable: true,
      cell: (item) => (
        <span className="text-xs font-medium text-foreground">
          {item.category === "FEED"
            ? "Aliment"
            : item.category === "VACCINE"
            ? "Vaccin"
            : item.category === "MEDICINE"
            ? "Médicament"
            : item.category === "EQUIPMENT"
            ? "Matériel"
            : item.customCategory
            ? item.customCategory
            : "Autre"}
        </span>
      ),
    },
    {
      key: "unit",
      header: "Unité",
      sortable: true,
      cell: (item) => (
        <span className="text-xs font-mono text-muted">
          {getUnitLabel(item.unit)}
        </span>
      ),
    },
   
    {
      key: "currentStock",
      header: "Stock Actuel",
      sortable: true,
      align: "right",
      cell: (item) => {
        const isLow = item.currentStock <= item.minThreshold;
        return (
          <div>
            <span
              className={`font-mono font-bold text-xs ${
                isLow ? "text-danger" : "text-primary"
              }`}
            >
              {formatInventoryUnit(item.currentStock, item.unit)}
            </span>
            {isLow && (
              <span className="ml-1.5 inline-block text-[10px] text-danger font-semibold">
                (Alerte)
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "unitCostFcfa",
      header: "Coût Unitaire",
      sortable: true,
      align: "right",
      cell: (item) => (
        <span className="font-mono text-muted text-xs">
          {formatFcfa(item.unitCostFcfa)} <span className="text-[10px] text-muted">/ {getUnitShortLabel(item.unit)}</span>
        </span>
      ),
    },
    {
      key: "totalVal",
      header: "Valeur Totale",
      sortable: true,
      align: "right",
      accessor: (item) => item.currentStock * item.unitCostFcfa,
      cell: (item) => (
        <span className="font-mono font-bold text-foreground text-xs">
          {formatFcfa(item.currentStock * item.unitCostFcfa)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "center",
      cell: (item) => (
        <div className="flex items-center justify-center gap-1.5">
          <Link
            href={`/inventory/${item.id}`}
            className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-surface-hover hover:border-border-hover transition-colors inline-flex items-center gap-1"
            title="Consulter l'historique et la fiche 360°"
          >
            <Eye className="h-3 w-3 text-muted" />
            <span>Détails</span>
          </Link>
         
        </div>
      ),
    },
  ];

  const movementColumns: ColumnDef<StockMovement>[] = [
    {
      key: "date",
      header: "Date",
      sortable: true,
      cell: (m) => (
        <span className="font-mono text-xs text-foreground font-semibold">
          {m.date}
        </span>
      ),
    },
    {
      key: "type",
      header: "Opération",
      sortable: true,
      cell: (m) => {
        const isInc = m.type === "INCOMING" || (m.type as string) === "IN";
        const isFeed = m.type === "FEEDING" || (m.type as string) === "OUT";
        const isLoss = m.type === "LOSS";
        return (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
              isInc
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
                : isFeed
                ? "bg-primary/15 text-primary border border-primary/25"
                : isLoss
                ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25"
                : "bg-surface text-muted border border-border"
            }`}
          >
            {isInc
              ? "+ Approvisionnement"
              : isFeed
              ? "- Sortie / Nourri"
              : isLoss
              ? "! Perte"
              : "~ Ajustement"}
          </span>
        );
      },
    },
    {
      key: "itemName",
      header: "Produit / Article",
      sortable: true,
      cell: (m) => (
        <div>
          <Link
            href={`/inventory/${m.itemId}`}
            className="font-bold text-xs text-foreground hover:text-primary transition-colors block"
          >
            {m.itemName || "Article"}
          </Link>
          {m.itemCategory && (
            <span className="text-[10px] text-muted">
              {m.itemCategory === "FEED"
                ? "Aliment"
                : m.itemCategory === "MEDICINE"
                ? "Santé & Soins"
                : m.itemCategory}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "quantity",
      header: "Quantité",
      sortable: true,
      align: "right",
      cell: (m) => {
        const isInc = m.type === "INCOMING" || (m.type as string) === "IN";
        const isFeed = m.type === "FEEDING" || (m.type as string) === "OUT";
        const isLoss = m.type === "LOSS";
        return (
          <span
            className={`font-mono font-bold text-xs ${
              isInc
                ? "text-emerald-600 dark:text-emerald-400"
                : (isFeed || isLoss)
                ? "text-amber-600 dark:text-amber-400"
                : "text-foreground"
            }`}
          >
            {isInc ? "+" : (isFeed || isLoss ? "-" : "")}
            {formatNumber(m.quantity)} {m.unitShortLabel || m.unitLabel || m.unit || ""}
          </span>
        );
      },
    },
    {
      key: "cost",
      header: "Coût Total",
      align: "right",
      cell: (m) => {
        if (m.totalCostFcfa && m.totalCostFcfa > 0) {
          return (
            <div className="text-right">
              <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {formatFcfa(m.totalCostFcfa)}
              </span>
              {m.unitPriceFcfa > 0 && (
                <div className="text-[10px] text-muted font-mono">
                  {formatFcfa(m.unitPriceFcfa)} / u
                </div>
              )}
            </div>
          );
        }
        return <span className="text-xs text-muted font-mono">—</span>;
      },
    },
    {
      key: "flock",
      header: "Bande assignée",
      cell: (m) => (
        m.flock ? (
          <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            {m.flock.name}
          </span>
        ) : (
          <span className="text-xs text-muted">—</span>
        )
      ),
    },
    {
      key: "reason",
      header: "Motif / Fournisseur",
      cell: (m) => (
        <span className="text-xs text-muted italic">
          {m.reason || "—"}
        </span>
      ),
    },
  ];

  const filteredMovements = movements.filter((m) => {
    if (movementTypeFilter === "ALL") return true;
    if (movementTypeFilter === "INCOMING") return m.type === "INCOMING" || (m.type as string) === "IN";
    if (movementTypeFilter === "FEEDING") return m.type === "FEEDING" || (m.type as string) === "OUT";
    if (movementTypeFilter === "LOSS") return m.type === "LOSS";
    return true;
  });

  if (!hasModule("inventory")) {
    return (
      <Shell>
        <ModuleLockedState
          moduleName="Stocks & Aliments"
          description="Le suivi des stocks d'aliments et produits de soins n'est pas inclus dans votre formule actuelle."
        />
      </Shell>
    );
  }

  return (
    <Shell>
      {/* En-tête mobile natif */}
      <PageHeader
        title="Stocks & Intrants"
        subtitle={`${items.length} référence(s) en stock`}
        icon={<Package className="h-4 w-4" />}
        actions={
          <>
            <button
              type="button"
              onClick={() => exportInventoryToCsv(items, activeFarm?.name || "ferme")}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-hover shadow-2xs active:scale-95 transition-all cursor-pointer"
              title="Exporter CSV"
            >
              <Download className="h-3.5 w-3.5 text-muted" />
              <span className="hidden xs:inline">Export</span>
            </button>

            {hasPermission("inventory:create") && (
              <button
                type="button"
                onClick={() => {
                  setCreateError(null);
                  setCreateModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 sm:px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-primary-hover active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Nouvel article</span>
              </button>
            )}
          </>
        }
      />

      {/* KPI Cards */}
      <div className="mt-2 sm:mt-3.5 grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
        <StatCard
          title="Valeur du stock"
          value={formatFcfa(totalStockValue)}
          accent="primary"
          icon={<Package className="h-5 w-5" />}
        />
        <StatCard
          title="Références"
          value={items.length}
          accent="sky"
          icon={<Package className="h-5 w-5" />}
        />
        <StatCard
          title="Alertes réappro"
          value={lowStockCount}
          subtitle={lowStockCount > 0 ? "Sous le seuil d'alerte" : undefined}
          accent={lowStockCount > 0 ? "rose" : "zinc"}
          icon={<AlertTriangle className="h-5 w-5" />}
          className="col-span-2 sm:col-span-1"
        />
      </div>

      {/* Onglets : Articles en réserve vs Journal des mouvements */}
      <div className="mt-6 flex items-center border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("ITEMS")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
            activeTab === "ITEMS"
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          <Package className="h-4 w-4" />
          <span>Articles en réserve ({items.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("MOVEMENTS")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
            activeTab === "MOVEMENTS"
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          <Filter className="h-4 w-4" />
          <span>Journal des mouvements ({movements.length})</span>
        </button>
      </div>

      {activeTab === "ITEMS" ? (
        <div className="mt-4 sm:mt-6">
          <DataTable<InventoryItem>
            title="Articles en stock"
            data={filteredItems}
            columns={itemColumns}
            searchable={true}
            searchPlaceholder="Rechercher par produit, référence SKU..."
            searchAccessor={(item) => `${item.name} ${item.sku} ${item.category}`}
            pageSize={15}
            initialSort={{ key: "name", direction: "asc" }}
            isLoading={isLoading}
            secondaryFilter={
              <div className="flex items-center gap-1.5 shrink-0">
                {[
                  { label: "Tous", value: "ALL" },
                  { label: "Aliments", value: "FEED" },
                  { label: "Vaccins", value: "VACCINE" },
                  { label: "Médicaments", value: "MEDICINE" },
                  { label: "Matériel", value: "EQUIPMENT" },
                ].map((tab) => {
                  const isActive = filterCategory === tab.value;
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setFilterCategory(tab.value)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold shrink-0 transition-all active:scale-95 cursor-pointer ${
                        isActive
                          ? "bg-primary text-white shadow-xs"
                          : "bg-surface text-muted hover:text-foreground border border-border/80 hover:bg-surface-muted"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            }
            renderMobileCard={(item) => {
              const isLow = item.currentStock <= item.minThreshold;
              const totalVal = item.currentStock * item.unitCostFcfa;
              return (
                <div
                  className={`rounded-2xl border bg-surface p-4 shadow-xs space-y-3 transition-all ${
                    isLow ? "border-danger/40 bg-danger-soft/5" : "border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 border-b border-border/50 pb-2.5">
                    <div className="min-w-0">
                      <Link
                        href={`/inventory/${item.id}`}
                        className="font-bold text-xs text-foreground hover:text-primary transition-colors block truncate"
                      >
                        {item.name}
                      </Link>
                      <div className="text-[10px] text-muted font-mono">{item.sku}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div
                        className={`text-xs font-bold font-mono ${
                          isLow ? "text-danger" : "text-primary"
                        }`}
                      >
                        {formatInventoryUnit(item.currentStock, item.unit)}
                      </div>
                      {isLow ? (
                        <span className="inline-block text-[9px] text-danger font-semibold bg-danger-soft px-1.5 py-0.5 rounded mt-0.5">
                          Alerte ({formatInventoryUnit(item.minThreshold, item.unit, { short: true })})
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted">
                          Seuil : {formatInventoryUnit(item.minThreshold, item.unit, { short: true })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs py-0.5">
                    <div>
                      <span className="text-muted text-[11px] block">Catégorie</span>
                      <span className="font-semibold text-foreground text-xs">
                        {item.category === "FEED"
                          ? "Aliment"
                          : item.category === "VACCINE"
                          ? "Vaccin"
                          : item.category === "MEDICINE"
                          ? "Médicament"
                          : item.category === "EQUIPMENT"
                          ? "Matériel"
                          : item.category}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-muted text-[11px] block">Valeur estimée</span>
                      <span className="font-semibold font-mono text-foreground text-xs">
                        {formatFcfa(totalVal)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted font-mono">
                      {formatFcfa(item.unitCostFcfa)} / {getUnitShortLabel(item.unit)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/inventory/${item.id}`}
                        className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-surface-hover inline-flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3 text-muted" />
                        <span>Détails</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            }}
            emptyState={{
              icon: <Package className="h-6 w-6 text-primary" />,
              title: "Aucun article en stock",
              description: "Enregistrez vos aliments (Démarrage, Croissance, Ponte) pour suivre la consommation.",
              actionLabel: hasPermission("inventory:create") ? "Créer un article" : undefined,
              onAction: () => setCreateModalOpen(true),
            }}
          />
        </div>
      ) : (
        <div className="mt-4 sm:mt-6">
          <DataTable<StockMovement>
            title="Journal des approvisionnements & consommations"
            data={filteredMovements}
            columns={movementColumns}
            searchable={true}
            searchPlaceholder="Rechercher par article, motif, bande..."
            searchAccessor={(m) => `${m.itemName} ${m.reason || ""} ${m.flock?.name || ""} ${m.type}`}
            pageSize={20}
            initialSort={{ key: "date", direction: "desc" }}
            isLoading={isLoading}
            renderMobileCard={(m) => {
              const isInc = m.type === "INCOMING" || (m.type as string) === "IN";
              const isFeed = m.type === "FEEDING" || (m.type as string) === "OUT";
              const isLoss = m.type === "LOSS";

              const badgeBg = isInc
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                : isFeed
                ? "bg-primary/15 text-primary border-primary/25"
                : isLoss
                ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25"
                : "bg-surface text-muted border-border";

              const badgeLabel = isInc
                ? "+ Approvisionnement"
                : isFeed
                ? "- Sortie / Nourri"
                : isLoss
                ? "! Perte"
                : "~ Ajustement";

              return (
                <div className="rounded-2xl border border-border bg-surface p-3.5 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${badgeBg}`}>
                      {badgeLabel}
                    </span>
                    <span className="font-mono text-xs text-muted font-semibold">{m.date}</span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link href={`/inventory/${m.itemId}`} className="font-bold text-xs text-foreground hover:text-primary">
                        {m.itemName || "Article"}
                      </Link>
                      {m.flock && (
                        <div className="mt-0.5">
                          <span className="inline-flex items-center rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                            Lot : {m.flock.name}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={`font-mono font-bold text-xs ${isInc ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                        {isInc ? "+" : "-"}{formatNumber(m.quantity)} {m.unitShortLabel || m.unitLabel || m.unit || ""}
                      </span>
                      {m.totalCostFcfa && m.totalCostFcfa > 0 ? (
                        <div className="text-[10px] font-mono text-muted">{formatFcfa(m.totalCostFcfa)}</div>
                      ) : null}
                    </div>
                  </div>
                  {m.reason && (
                    <p className="text-[11px] text-muted italic border-t border-border/30 pt-1.5">{m.reason}</p>
                  )}
                </div>
              );
            }}
            secondaryFilter={
              <div className="flex items-center gap-1.5 shrink-0">
                {[
                  { label: "Tous", value: "ALL" },
                  { label: "Approvisionnements (+)", value: "INCOMING" },
                  { label: "Sorties / Nourri (-)", value: "FEEDING" },
                  { label: "Pertes", value: "LOSS" },
                ].map((tab) => {
                  const isActive = movementTypeFilter === tab.value;
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setMovementTypeFilter(tab.value)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold shrink-0 transition-all active:scale-95 cursor-pointer ${
                        isActive
                          ? "bg-primary text-white shadow-xs"
                          : "bg-surface text-muted hover:text-foreground border border-border/80 hover:bg-surface-muted"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            }
            emptyState={{
              icon: <Filter className="h-6 w-6 text-primary" />,
              title: "Aucun mouvement enregistré",
              description: "Enregistrez vos entrées en stock ou sorties de nourriture pour suivre l'historique.",
            }}
          />
        </div>
      )}

      {/* CREATE ITEM MODAL */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Nouvel article"
        description="Aliment ou intrant"
      >
        <form onSubmit={handleCreateItem} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Désignation *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex. Aliment Ponte"
              className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Catégorie
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as InventoryCategory)}
                className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs font-semibold text-foreground"
              >
                <option value="FEED">Alimentation</option>
                <option value="VACCINE">Vaccin</option>
                <option value="MEDICINE">Médicament</option>
                <option value="EQUIPMENT">Matériel</option>
                <option value="OTHER">Autre</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Unité *
              </label>
              <select
                value={unit}
                onChange={(e) => {
                  const newUnit = e.target.value;
                  setUnit(newUnit);
                  if (newUnit === "BAG_25KG") setPackageWeightKg(25);
                  else if (newUnit === "BAG_50KG" || newUnit === "BAG") setPackageWeightKg(50);
                }}
                className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs font-semibold text-foreground"
              >
                <optgroup label="Sacs & Provende">
                  <option value="BAG_50KG">Sac (Poids personnalisable)</option>
                  <option value="KG">Kilogramme (kg)</option>
                  <option value="G">Gramme (g)</option>
                  <option value="TON">Tonne (t)</option>
                </optgroup>
                <optgroup label="Santé & Vétérinaire">
                  <option value="DOSE">Dose vaccinale</option>
                  <option value="VIAL">Flacon / Ampoule</option>
                  <option value="SACHET">Sachet poudre</option>
                </optgroup>
                <optgroup label="Liquides & Désinfectants">
                  <option value="LITER">Litre (L)</option>
                  <option value="ML">Millilitre (mL)</option>
                </optgroup>
                <optgroup label="Matériel & Divers">
                  <option value="UNIT">Unité / Pièce</option>
                </optgroup>
              </select>
            </div>
          </div>

          {/* Saisie personnalisée si catégorie Autre */}
          {category === "OTHER" && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
              <label className="block text-xs font-semibold text-foreground mb-1">
                Précisez la catégorie / nature de l'intrant *
              </label>
              <input
                type="text"
                required
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="ex. Litière & Copeaux, Désinfectant, Carton d'alvéoles..."
                className="w-full rounded-xl border border-border bg-surface p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
              />
            </div>
          )}

          {/* Saisie personnalisée du poids par sac si conditionnement en sacs */}
          {isBagUnit && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Poids net par sac (kg) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      required
                      value={packageWeightKg}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setPackageWeightKg(e.target.value)}
                      placeholder="ex. 50 ou 40"
                      className="w-full rounded-xl border border-border bg-surface p-2 text-sm font-bold font-mono text-foreground focus:border-primary focus:outline-hidden"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-muted pointer-events-none">
                      kg / sac
                    </span>
                  </div>
                </div>

                <div className="flex flex-col justify-end">
                  <div className="text-[11px] text-muted">
                    Renseignez le poids réel de vos sacs (ex: 50 kg, 40 kg, 25 kg).
                  </div>
                </div>
              </div>

              {Number(currentStock) > 0 && Number(packageWeightKg) > 0 && (
                <div className="text-xs font-medium text-primary border-t border-border/40 pt-1.5 flex items-center justify-between">
                  <span>Capacité totale stockée :</span>
                  <span className="font-mono font-bold">
                    {currentStock} sacs × {packageWeightKg} kg ={" "}
                    {(Number(currentStock) * Number(packageWeightKg)).toLocaleString("fr-FR")} kg en magasin
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Stock Initial {isBagUnit ? "(Nombre de sacs)" : `(${getUnitShortLabel(unit)})`} *
              </label>
              <input
                type="number"
                min="0"
                step={isBagUnit ? "1" : "0.01"}
                required
                value={currentStock}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const val = e.target.value;
                  setCurrentStock(val === "" ? "" : Math.max(0, parseFloat(val) || 0));
                }}
                className="w-full rounded-xl border border-border bg-surface p-2.5 text-sm font-bold font-mono text-foreground focus:border-primary focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-danger mb-1">
                Seuil Alerte {isBagUnit ? "(Sacs)" : `(${getUnitShortLabel(unit)})`} *
              </label>
              <input
                type="number"
                min="0"
                step={isBagUnit ? "1" : "0.01"}
                required
                value={minThreshold}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const val = e.target.value;
                  setMinThreshold(val === "" ? "" : Math.max(0, parseFloat(val) || 0));
                }}
                className="w-full rounded-xl border border-border bg-surface p-2.5 text-sm font-mono text-foreground focus:border-danger focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-primary mb-1">
                Coût Unit. (FCFA)
              </label>
              <input
                type="number"
                min="0"
                required
                value={unitCostFcfa}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const val = e.target.value;
                  setUnitCostFcfa(val === "" ? "" : Math.max(0, parseInt(val) || 0));
                }}
                className="w-full rounded-xl border border-border bg-surface p-2.5 text-sm font-mono text-foreground focus:border-primary focus:outline-hidden"
              />
            </div>
          </div>

          {createError && (
            <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{createError}</div>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setCreateModalOpen(false);
                setCreateError(null);
              }}
              className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted hover:bg-surface-hover"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submittingItem}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-hover"
            >
              {submittingItem ? "Création..." : "Enregistrer l'article"}
            </button>
          </div>
        </form>
      </Modal>

      {/* STOCK MOVEMENT MODAL */}
      <Modal
        isOpen={movementModalOpen}
        onClose={() => setMovementModalOpen(false)}
        title={selectedItem ? `Stock : ${selectedItem.name}` : "Mouvement"}
        description="Entrée ou sortie"
      >
        <form onSubmit={handleAddMovement} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMoveType("IN")}
              className={`rounded-xl border py-2 text-xs font-bold ${
                moveType === "IN"
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-surface text-muted"
              }`}
            >
              + Entrée
            </button>
            <button
              type="button"
              onClick={() => setMoveType("OUT")}
              className={`rounded-xl border py-2 text-xs font-bold ${
                moveType === "OUT"
                  ? "border-accent bg-accent text-white"
                  : "border-border bg-surface text-muted"
              }`}
            >
              - Sortie
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Quantité *
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  required
                  value={quantity}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQuantity(val === "" ? "" : Math.max(0.01, parseFloat(val) || 0));
                  }}
                  className="w-full rounded-xl border border-border bg-surface p-2.5 text-sm font-bold font-mono text-foreground focus:border-primary focus:outline-hidden"
                />
                <select
                  value={moveUnit}
                  onChange={(e) => setMoveUnit(e.target.value)}
                  className="rounded-xl border border-border bg-surface-muted px-2.5 text-xs font-semibold text-foreground"
                >
                  {selectedItem &&
                    getCompatibleMovementUnits(selectedItem.unit, selectedItem.packageWeightKg).map((u) => (
                      <option key={u.code} value={u.code}>
                        {u.label}
                      </option>
                    ))}
                </select>
              </div>

              {/* Indication sobre et discrète de dosage (cuillère à soupe, décompte sacs, etc.) */}
              {(() => {
                const hint = getPracticalMeasurementHint(quantity, moveUnit, {
                  packageWeightKg: selectedItem?.packageWeightKg,
                  itemUnit: selectedItem?.unit,
                });
                return hint ? (
                  <p className="mt-1 text-[11px] text-muted flex items-center gap-1.5">
                    <span className="font-semibold text-primary">•</span>
                    <span>{hint}</span>
                  </p>
                ) : null;
              })()}
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Prix unitaire (FCFA / {getUnitShortLabel(moveUnit)})
              </label>
              <input
                type="number"
                min="0"
                value={unitPrice}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const val = e.target.value;
                  setUnitPrice(val === "" ? "" : Math.max(0, parseInt(val) || 0));
                }}
                className="w-full rounded-xl border border-border bg-surface p-2.5 text-sm font-mono text-foreground focus:border-primary focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Motif / Destination
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ex. Ravitaillement bâtiment Pondeuses B2"
              className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
            />
          </div>

          {moveError && (
            <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{moveError}</div>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setMovementModalOpen(false);
                setMoveError(null);
              }}
              className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted hover:bg-surface-hover"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submittingMove}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-hover"
            >
              {submittingMove ? "Enregistrement..." : "Valider le mouvement"}
            </button>
          </div>
        </form>
      </Modal>
    </Shell>
  );
}
