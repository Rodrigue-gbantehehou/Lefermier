"use client";

import React, { useEffect, useState } from "react";
import { Plus, Package, AlertTriangle, Filter } from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api-client";
import { InventoryItem, InventoryCategory, StockMovementType } from "@/lib/types";
import { formatFcfa, formatNumber } from "@/lib/utils";
import {
  formatInventoryUnit,
  getUnitLabel,
  getUnitShortLabel,
  convertUnit,
  ALL_UNITS_LIST,
} from "@/lib/units";

export default function InventoryPage() {
  const { activeFarm, hasPermission } = useAuth();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(true);

  // Create Item Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState<InventoryCategory>("FEED");
  const [unit, setUnit] = useState("BAG_50KG");
  const [minThreshold, setMinThreshold] = useState<number>(10);
  const [currentStock, setCurrentStock] = useState<number>(50);
  const [unitCostFcfa, setUnitCostFcfa] = useState<number>(18500);
  const [submittingItem, setSubmittingItem] = useState(false);

  // Movement Modal
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [moveType, setMoveType] = useState<StockMovementType>("OUT");
  const [moveUnit, setMoveUnit] = useState<string>("BAG_50KG");
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [reason, setReason] = useState("Consommation journalière bande");
  const [submittingMove, setSubmittingMove] = useState(false);

  function openMovementModal(item: InventoryItem) {
    setSelectedItem(item);
    setMoveUnit(item.unit);
    setUnitPrice(item.unitCostFcfa);
    setQuantity(1);
    setReason(moveType === "OUT" ? "Consommation journalière bande" : "Achat et approvisionnement");
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

  async function handleCreateItem(e: React.FormEvent) {
    e.preventDefault();
    if (!activeFarm?.id) return;
    setSubmittingItem(true);
    try {
      await api.inventory.createItem({
        farmId: activeFarm.id,
        name,
        sku: sku || `SKU-${Date.now().toString().slice(-6)}`,
        category,
        unit,
        minThreshold: Number(minThreshold),
        currentStock: Number(currentStock),
        unitCostFcfa: Number(unitCostFcfa),
      });
      setCreateModalOpen(false);
      setName("");
      setSku("");
      await loadInventory();
    } catch (err: any) {
      alert(err?.message || "Erreur lors de la création de l'article");
    } finally {
      setSubmittingItem(false);
    }
  }

  async function handleAddMovement(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedItem) return;
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
      await loadInventory();
    } catch (err: any) {
      alert(err?.message || "Erreur lors du mouvement de stock");
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

        {hasPermission("inventory:create") && (
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-hover transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Nouvel Article</span>
          </button>
        )}
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

      {/* Category filter tabs */}
      <div className="mt-6 flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <Filter className="h-4 w-4 text-muted" />
        <span className="text-xs font-semibold text-muted">Catégorie :</span>
        {[
          { label: "Tous les produits", value: "ALL" },
          { label: "Aliments", value: "FEED" },
          { label: "Vaccins & Soins", value: "VACCINE" },
          { label: "Médicaments", value: "MEDICINE" },
          { label: "Matériel", value: "EQUIPMENT" },
        ].map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setFilterCategory(tab.value)}
            className={`rounded-xl px-3 py-1 text-xs font-semibold transition-colors ${
              filterCategory === tab.value
                ? "bg-primary text-white"
                : "text-muted hover:bg-surface-hover"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Items Table */}
      <div className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-xs">
        {filteredItems.length === 0 ? (
          <EmptyState
            icon={<Package className="h-6 w-6 text-primary" />}
            title="Aucun article en stock"
            description="Enregistrez vos aliments (Démarrage, Croissance, Ponte) pour suivre la consommation."
            actionLabel={hasPermission("inventory:create") ? "Créer un article" : undefined}
            onAction={() => setCreateModalOpen(true)}
            className="my-4 border-none"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-muted text-muted">
                <tr>
                  <th className="py-2.5 px-3 font-semibold rounded-l-lg">Désignation</th>
                  <th className="py-2.5 px-3 font-semibold">Catégorie</th>
                  <th className="py-2.5 px-3 font-semibold">Unité</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Seuil Alerte</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Stock Actuel</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Coût Unitaire</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Valeur Totale</th>
                  <th className="py-2.5 px-3 font-semibold text-center rounded-r-lg">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredItems.map((item) => {
                  const isLow = item.currentStock <= item.minThreshold;
                  const totalVal = item.currentStock * item.unitCostFcfa;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-surface-hover transition-colors"
                    >
                      <td className="py-3 px-3 font-bold text-foreground">
                        {item.name}
                        <div className="text-[10px] font-normal text-muted font-mono">
                          {item.sku}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <Badge
                          variant={
                            item.category === "FEED"
                              ? "default"
                              : item.category === "VACCINE"
                              ? "info"
                              : "neutral"
                          }
                          size="sm"
                        >
                          {item.category === "FEED"
                            ? "Aliment"
                            : item.category === "VACCINE"
                            ? "Vaccin"
                            : item.category === "MEDICINE"
                            ? "Médicament"
                            : item.category}
                        </Badge>
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant="neutral" size="sm">
                          {getUnitLabel(item.unit)}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-muted">
                        {formatInventoryUnit(item.minThreshold, item.unit, { short: true })}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span
                          className={`font-mono font-bold ${
                            isLow ? "text-danger" : "text-primary"
                          }`}
                        >
                          {formatInventoryUnit(item.currentStock, item.unit)}
                        </span>
                        {isLow && (
                          <span className="ml-1.5 inline-block text-[10px] text-danger font-semibold">
                            (Sous seuil !)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-muted">
                        {formatFcfa(item.unitCostFcfa)} <span className="text-[10px] text-muted">/ {getUnitShortLabel(item.unit)}</span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-foreground">
                        {formatFcfa(totalVal)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {hasPermission("inventory:update") && (
                          <button
                            type="button"
                            onClick={() => openMovementModal(item)}
                            className="rounded-lg bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary hover:text-white transition-colors"
                          >
                            Entrée / Sortie
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
              placeholder="ex. Aliment Ponte Premium (50kg)"
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
                Unité de stockage
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs font-semibold text-foreground"
              >
                <optgroup label="Aliments & Masse">
                  <option value="BAG_50KG">Sac de 50 kg</option>
                  <option value="BAG_25KG">Sac de 25 kg</option>
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

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Stock Initial
              </label>
              <input
                type="number"
                min="0"
                required
                value={currentStock}
                onChange={(e) => setCurrentStock(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full rounded-xl border border-border bg-surface p-2.5 text-sm font-bold font-mono text-foreground focus:border-primary focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-danger mb-1">
                Seuil Alerte
              </label>
              <input
                type="number"
                min="0"
                required
                value={minThreshold}
                onChange={(e) => setMinThreshold(Math.max(0, parseInt(e.target.value) || 0))}
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
                onChange={(e) => setUnitCostFcfa(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full rounded-xl border border-border bg-surface p-2.5 text-sm font-mono text-foreground focus:border-primary focus:outline-hidden"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
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
                  onChange={(e) => setQuantity(Math.max(0.01, parseFloat(e.target.value) || 0))}
                  className="w-full rounded-xl border border-border bg-surface p-2.5 text-sm font-bold font-mono text-foreground focus:border-primary focus:outline-hidden"
                />
                <select
                  value={moveUnit}
                  onChange={(e) => setMoveUnit(e.target.value)}
                  className="rounded-xl border border-border bg-surface-muted px-2.5 text-xs font-semibold text-foreground"
                >
                  <option value={selectedItem?.unit}>{getUnitLabel(selectedItem?.unit)} (Unité de base)</option>
                  {selectedItem?.unit === "BAG_50KG" && <option value="KG">Kilogramme (kg)</option>}
                  {selectedItem?.unit === "BAG_25KG" && <option value="KG">Kilogramme (kg)</option>}
                  {selectedItem?.unit === "KG" && <option value="BAG_50KG">Sac de 50 kg</option>}
                  {selectedItem?.unit === "KG" && <option value="BAG_25KG">Sac de 25 kg</option>}
                  {selectedItem?.unit === "LITER" && <option value="ML">Millilitre (mL)</option>}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Prix unitaire (FCFA / {getUnitShortLabel(moveUnit)})
              </label>
              <input
                type="number"
                min="0"
                value={unitPrice}
                onChange={(e) => setUnitPrice(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full rounded-xl border border-border bg-surface p-2.5 text-sm font-mono text-foreground focus:border-primary focus:outline-hidden"
              />
            </div>
          </div>

          {/* Live Unit Conversion Feedback */}
          {selectedItem && moveUnit !== selectedItem.unit && (() => {
            const converted = convertUnit(Number(quantity) || 0, moveUnit, selectedItem.unit);
            return (
              <div className="rounded-xl border border-primary/20 bg-primary-soft/50 p-3 text-xs text-primary">
                {converted !== null ? (
                  <p className="font-semibold">
                    ℹ️ <span className="font-bold font-mono">{quantity} {getUnitShortLabel(moveUnit)}</span> équivaut à{" "}
                    <span className="font-bold font-mono underline">{converted} {getUnitShortLabel(selectedItem.unit)}</span>{" "}
                    qui {moveType === "OUT" ? "seront déduits du" : "seront ajoutés au"} stock physique de l'article.
                  </p>
                ) : (
                  <p className="text-danger font-semibold">
                    ⚠️ Les unités {getUnitLabel(moveUnit)} et {getUnitLabel(selectedItem.unit)} sont incompatibles.
                  </p>
                )}
              </div>
            );
          })()}

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
