"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Package, AlertTriangle, AlertCircle, Filter, Eye, Download } from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { StatCard } from "@/components/ui/stat-card";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { api } from "@/lib/api-client";
import { InventoryItem, InventoryCategory, StockMovementType } from "@/lib/types";
import { formatFcfa, formatNumber } from "@/lib/utils";
import { exportInventoryToCsv } from "@/lib/export";
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
  const { activeFarm, hasPermission } = useAuth();
  const { toast } = useToast();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
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
    if (activeFarm?.id) {
      loadInventory();
    }
  }, [activeFarm?.id]);

  async function loadInventory() {
    setIsLoading(true);
    try {
      const data = await api.inventory.listItems({ farmId: activeFarm?.id });
      setItems(data);
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
          <div className="text-[10px] font-normal text-muted font-mono">
            {item.sku}
          </div>
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
      key: "minThreshold",
      header: "Seuil Alerte",
      sortable: true,
      align: "right",
      cell: (item) => (
        <span className="font-mono text-muted text-xs">
          {formatInventoryUnit(item.minThreshold, item.unit, { short: true })}
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
          {hasPermission("inventory:update") && (
            <button
              type="button"
              onClick={() => openMovementModal(item)}
              className="rounded-lg bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary hover:text-white transition-colors"
            >
              Mouvement
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <Shell>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-border">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Stocks, Aliments & Approvisionnements
          </h1>
          <p className="mt-1 text-xs text-muted">
            Suivi des sacs d'aliments, vaccins, vitamines et matériel avec alertes de seuil critique.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportInventoryToCsv(items, activeFarm?.name || "ferme")}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground hover:bg-surface-hover transition-colors"
          >
            <Download className="h-4 w-4 text-muted" />
            <span>Exporter CSV</span>
          </button>

          {hasPermission("inventory:create") && (
            <button
              type="button"
              onClick={() => {
                setCreateError(null);
                setCreateModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-hover transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Nouvel Article</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Valeur du stock"
          value={formatFcfa(totalStockValue)}
          subtitle="Argent total investi dans le stock"
          accent="primary"
          icon={<Package className="h-5 w-5" />}
        />
        <StatCard
          title="Produits en réserve"
          value={`${items.length} produit(s)`}
          subtitle="Aliments, vaccins et matériel"
          accent="sky"
          icon={<Package className="h-5 w-5" />}
        />
        <StatCard
          title="Produits presque épuisés"
          value={`${lowStockCount} produit(s)`}
          subtitle="Articles à recommander rapidement"
          accent={lowStockCount > 0 ? "rose" : "primary"}
          icon={<AlertTriangle className="h-5 w-5" />}
          trend={{
            value: lowStockCount === 0 ? "Stock suffisant" : "À commander vite",
            isPositive: lowStockCount === 0,
          }}
        />
      </div>

      {/* DataTable Articles en Stock */}
      <div className="mt-8">
        <DataTable<InventoryItem>
          title="Articles & Intrants en stock"
          subtitle="Suivi des sacs d'aliments, produits vétérinaires et consommables."
          data={filteredItems}
          columns={itemColumns}
          searchable={true}
          searchPlaceholder="Rechercher par produit, référence SKU..."
          searchAccessor={(item) => `${item.name} ${item.sku} ${item.category}`}
          pageSize={15}
          initialSort={{ key: "name", direction: "asc" }}
          isLoading={isLoading}
          secondaryFilter={
            <div className="flex flex-wrap items-center gap-1 rounded-xl bg-surface-muted p-1 border border-border/60">
              {[
                { label: "Tous", value: "ALL" },
                { label: "Aliments", value: "FEED" },
                { label: "Vaccins", value: "VACCINE" },
                { label: "Médicaments", value: "MEDICINE" },
                { label: "Matériel", value: "EQUIPMENT" },
              ].map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setFilterCategory(tab.value)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                    filterCategory === tab.value
                      ? "bg-primary text-white shadow-xs"
                      : "text-muted hover:text-foreground hover:bg-surface/50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
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
                    {hasPermission("inventory:update") && (
                      <button
                        type="button"
                        onClick={() => openMovementModal(item)}
                        className="rounded-lg bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary hover:text-white transition-colors"
                      >
                        Mouvement
                      </button>
                    )}
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

      {/* CREATE ITEM MODAL */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Créer un article d'inventaire"
        description="Ajoutez un aliment, intrant ou matériel au stock de l'exploitation."
      >
        <form onSubmit={handleCreateItem} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Désignation du produit
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
                <option value="MEDICINE">Médicament / Traitement</option>
                <option value="EQUIPMENT">Matériel / Équipement</option>
                <option value="OTHER">Autre Intrant</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Unité de stockage *
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

          <div className="grid grid-cols-3 gap-3">
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
        title={`Mouvement de stock : ${selectedItem?.name || ""}`}
        description="Enregistrez une livraison (entrée) ou une distribution aux poulaillers (sortie)."
      >
        <form onSubmit={handleAddMovement} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMoveType("IN")}
              className={`rounded-xl border py-2.5 text-xs font-bold ${
                moveType === "IN"
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-surface text-muted"
              }`}
            >
              + Entrée / Achat
            </button>
            <button
              type="button"
              onClick={() => setMoveType("OUT")}
              className={`rounded-xl border py-2.5 text-xs font-bold ${
                moveType === "OUT"
                  ? "border-accent bg-accent text-white"
                  : "border-border bg-surface text-muted"
              }`}
            >
              - Sortie / Consommation
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Quantité mouvementée
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
