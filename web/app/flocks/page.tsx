"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Bird, Calendar, Warehouse, ArrowRight, Eye, AlertCircle, Utensils } from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { RecordFeedingModal } from "@/components/dashboard";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { api } from "@/lib/api-client";
import { Flock, FlockType, InventoryItem } from "@/lib/types";
import { formatNumber, formatDate } from "@/lib/utils";
import { CreateBuildingModal } from "@/components/farms/create-building-modal";

export default function FlocksPage() {
  const { activeFarm, hasPermission } = useAuth();
  const { toast } = useToast();

  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [isLoading, setIsLoading] = useState(true);

  // Buildings
  const [buildings, setBuildings] = useState<any[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>("");
  const [buildingModalOpen, setBuildingModalOpen] = useState(false);

  // New Flock Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [flockName, setFlockName] = useState("");
  const [flockType, setFlockType] = useState<FlockType>("LAYER");
  const [breed, setBreed] = useState("Lohmann Brown");
  const [initialQuantity, setInitialQuantity] = useState<number | string>(500);
  const [startDate, setStartDate] = useState("");

  const getInitialFlockType = useCallback((productionType?: string): FlockType => {
    if (productionType === "BROILER") return "BROILER";
    return "LAYER";
  }, []);

  const getDefaultBreed = useCallback((type: FlockType): string => {
    if (type === "BROILER") return "Cobb 500";
    if (type === "MIXED") return "Goliath / Locale";
    return "Lohmann Brown";
  }, []);

  useEffect(() => {
    setStartDate(new Date().toISOString().split("T")[0]);
  }, []);

  // Automatically adapt flock type and breed based on the active farm's production type
  useEffect(() => {
    const defaultType = getInitialFlockType(activeFarm?.productionType);
    setFlockType(defaultType);
    setBreed(getDefaultBreed(defaultType));
  }, [activeFarm?.productionType, getInitialFlockType, getDefaultBreed]);

  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Movement Modal
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [activeFlock, setActiveFlock] = useState<Flock | null>(null);
  const [moveType, setMoveType] = useState<"MORTALITY" | "SALE" | "CULL">("MORTALITY");
  const [moveQty, setMoveQty] = useState<number | string>(1);
  const [moveReason, setMoveReason] = useState("");
  const [submittingMove, setSubmittingMove] = useState(false);

  // Feeding Modal
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [feedingModalOpen, setFeedingModalOpen] = useState(false);

  useEffect(() => {
    if (activeFarm?.id) {
      loadFlocks();
    }
  }, [activeFarm?.id]);

  async function loadFlocks() {
    setIsLoading(true);
    try {
      const [flocksData, buildingsData, invData] = await Promise.all([
        api.flocks.list({ farmId: activeFarm?.id }),
        activeFarm?.id ? api.farms.listBuildings(activeFarm.id).catch(() => []) : Promise.resolve([]),
        activeFarm?.id ? api.inventory.listItems({ farmId: activeFarm.id }).catch(() => []) : Promise.resolve([]),
      ]);
      setFlocks(flocksData);
      setBuildings(buildingsData || []);
      setInventoryItems(invData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateFlock(e: React.FormEvent) {
    e.preventDefault();
    if (!activeFarm?.id) return;
    setCreateError(null);
    setSubmitting(true);
    try {
      const autoCode = `LOT-${new Date().getFullYear()}-${(flockName || "BAN")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase()
        .slice(0, 4)}-${Math.floor(1000 + Math.random() * 9000)}`;

      await api.flocks.create({
        farmId: activeFarm.id,
        code: autoCode,
        name: flockName,
        type: flockType,
        poultryType: flockType,
        breed,
        strain: breed,
        buildingId: selectedBuildingId || undefined,
        initialQuantity: Number(initialQuantity),
        currentQuantity: Number(initialQuantity),
        startDate,
        status: "ACTIVE",
        notes: notes || undefined,
      });
      setCreateModalOpen(false);
      setFlockName("");
      setSelectedBuildingId("");
      toast.success("Bande créée avec succès !");
      await loadFlocks();
    } catch (err: any) {
      const msg = err?.message || "Erreur lors de la création de la bande";
      setCreateError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddMovement(e: React.FormEvent) {
    e.preventDefault();
    if (!activeFlock) return;
    setMoveError(null);
    setSubmittingMove(true);
    try {
      await api.flocks.addMovement(activeFlock.id, {
        type: moveType,
        quantity: Number(moveQty),
        date: new Date().toISOString().split("T")[0],
        reason: moveReason || undefined,
      });
      setMovementModalOpen(false);
      setMoveQty(1);
      setMoveReason("");
      toast.success(
        moveType === "MORTALITY"
          ? "Perte / mortalité enregistrée avec succès."
          : "Mouvement enregistré avec succès."
      );
      await loadFlocks();
    } catch (err: any) {
      const msg = err?.message || "Erreur lors de l'enregistrement du mouvement";
      setMoveError(msg);
      toast.error(msg);
    } finally {
      setSubmittingMove(false);
    }
  }


  const flockColumns: ColumnDef<Flock>[] = [
    {
      key: "name",
      header: "Nom du groupe",
      sortable: true,
      cell: (flock) => (
        <div>
          <div className="flex items-center gap-2">
            <Link
              href={`/flocks/${flock.id}`}
              className="font-bold text-foreground hover:text-primary hover:underline transition-colors flex items-center gap-1.5"
            >
              {flock.name}
              <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>

          </div>
          {flock.code && <span className="text-[10px] font-mono text-muted">{flock.code}</span>}
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
            <span className={`h-1.5 w-1.5 rounded-full ${flock.status === "ACTIVE" ? "bg-success" : "bg-muted"}`} />
            {flock.status === "ACTIVE" ? "Actif" : "Clôturé"}
          </span>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type d'élevage",
      sortable: true,
      cell: (flock) => (
        <span className="text-xs font-medium text-foreground">
          {flock.type === "LAYER"
            ? "Pondeuses"
            : flock.type === "BROILER"
              ? "Chair"
              : "Mixte"}
        </span>
      ),
    },


    {
      key: "startDate",
      header: "Date d'arrivée",
      sortable: true,
      accessor: (f) => f.startDate,
      cell: (flock) => (
        <span className="font-mono text-xs text-foreground">
          {formatDate(flock.startDate)}
        </span>
      ),
    },
    {
      key: "initialQuantity",
      header: "Au départ",
      sortable: true,
      align: "right",
      accessor: (f) => f.initialQuantity,
      cell: (flock) => (
        <span className="font-mono text-muted">
          {formatNumber(flock.initialQuantity)}
        </span>
      ),
    },
    {
      key: "currentQuantity",
      header: "Poules vivantes",
      sortable: true,
      align: "right",
      accessor: (f) => f.currentQuantity,
      cell: (flock) => (
        <span className="font-mono font-bold text-primary">
          {formatNumber(flock.currentQuantity)}
        </span>
      ),
    },
    {
      key: "losses",
      header: "Pertes (morts)",
      sortable: true,
      align: "right",
      accessor: (f) => f.initialQuantity - f.currentQuantity,
      cell: (flock) => {
        const losses = flock.initialQuantity - flock.currentQuantity;
        const mortalityRate = flock.initialQuantity > 0 ? (losses / flock.initialQuantity) * 100 : 0;
        return (
          <span className={`font-mono font-semibold ${losses > 0 ? "text-danger" : "text-muted"}`}>
            {losses}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "Action",
      align: "right",
      cell: (flock) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link
            href={`/flocks/${flock.id}`}
            className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-surface-hover hover:border-primary/40 transition-colors inline-flex items-center gap-1"
          >
            <Eye className="h-3 w-3 text-muted" />
            Fiche
          </Link>
          {flock.status === "ACTIVE" ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveFlock(flock);
                setFeedingModalOpen(true);
              }}
              className="rounded-lg bg-amber-600/10 border border-amber-600/20 px-2.5 py-1 text-xs font-bold text-amber-700 hover:bg-amber-600 hover:text-white transition-colors inline-flex items-center gap-1"
            >
              <Utensils className="h-3 w-3" />
              <span>Nourrir</span>
            </button>
          ) : null}
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
            Groupes de poules
          </h1>
          <p className="mt-1 text-xs text-muted">
            Suivi des poules pondeuses et poulets de chair, des effectifs vivants, des pertes et des ventes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasPermission("farm:update") && (
            <button
              type="button"
              onClick={() => setBuildingModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-surface-hover shadow-xs transition-colors"
            >
              <Warehouse className="h-4 w-4 text-primary" />
              <span>Nouveau poulailler</span>
            </button>
          )}

          {hasPermission("flock:create") && (
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-hover transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Nouveau groupe de poules</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="mt-6">
        <DataTable<Flock>
          title="Vos groupes de volaille en élevage"
          subtitle="Effectifs vivants, race, pertes constatées et suivi de vos bandes."
          data={flocks}
          columns={flockColumns}
          searchable={true}
          searchPlaceholder="Rechercher par nom, race, code..."
          searchAccessor={(f) => `${f.name} ${f.code || ""} ${f.breed || ""}`}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          isLoading={isLoading}
          renderGridItem={(flock) => {
            const losses = flock.initialQuantity - flock.currentQuantity;
            const mortalityRate =
              flock.initialQuantity > 0 ? (losses / flock.initialQuantity) * 100 : 0;

            return (
              <div
                key={flock.id}
                className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-xs hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-bold text-foreground">
                        {flock.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted">
                          {flock.breed}
                        </span>
                        {flock.buildingName && (
                          <span className="flex items-center gap-1 text-[11px] font-medium text-primary">
                            <Warehouse className="h-3 w-3" />
                            {flock.buildingName}
                          </span>
                        )}
                      </div>
                    </div>

                    {flock.type === "LAYER"
                      ? "Pondeuses"
                      : flock.type === "BROILER"
                        ? "Chair"
                        : "Mixte"}
                  </div>

                  {/* Quantitative Stats */}
                  <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-surface-muted p-3">
                    <div>
                      <span className="text-[11px] text-muted">
                        Poules vivantes
                      </span>
                      <p className="text-lg font-bold font-mono text-primary">
                        {formatNumber(flock.currentQuantity)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted">
                        Pertes (morts)
                      </span>
                      <p className="text-lg font-bold font-mono text-danger font-semibold">
                        {losses}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Arrivé le {formatDate(flock.startDate)}
                    </span>
                    <Badge variant={flock.status === "ACTIVE" ? "success" : "neutral"} size="sm" dot>
                      {flock.status === "ACTIVE" ? "Actif" : "Clôturé"}
                    </Badge>
                  </div>
                </div>

                {/* Card Action */}
                <div className="mt-5 pt-3 border-t border-border flex items-center justify-between">
                  <Link
                    href={`/flocks/${flock.id}`}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    Voir la fiche complète →
                  </Link>
                  {flock.status === "ACTIVE" && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveFlock(flock);
                        setFeedingModalOpen(true);
                      }}
                      className="rounded-lg bg-amber-600/10 border border-amber-600/20 px-2.5 py-1 text-xs font-bold text-amber-700 hover:bg-amber-600 hover:text-white transition-colors inline-flex items-center gap-1"
                    >
                      <Utensils className="h-3 w-3" />
                      <span>Nourrir</span>
                    </button>
                  )}
                </div>
              </div>
            );
          }}
          emptyState={{
            icon: <Bird className="h-6 w-6 text-primary" />,
            title: "Aucun groupe de poules trouvé",
            description: "Ajoutez votre premier groupe de poules pour démarrer le suivi de votre élevage.",
            actionLabel: hasPermission("flock:create") ? "Ajouter un groupe" : undefined,
            onAction: () => setCreateModalOpen(true),
          }}
        />
      </div>

      {/* CREATE FLOCK MODAL */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Ajouter un nouveau groupe de poules"
        description="Renseignez les informations de ce groupe (pondeuses ou poulets de chair)."
      >
        <form onSubmit={handleCreateFlock} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Nom du groupe de poules *
            </label>
            <input
              type="text"
              required
              value={flockName}
              onChange={(e) => setFlockName(e.target.value)}
              placeholder="ex. Pondeuses Bâtiment A"
              className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
            />
          </div>

          {/* Bâtiment d'accueil */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-foreground">
                Bâtiment / Poulailler d'accueil
              </label>
              <button
                type="button"
                onClick={() => setBuildingModalOpen(true)}
                className="flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary-hover hover:underline transition-colors"
              >
                <Plus className="h-3 w-3" />
                <span>+ Nouveau poulailler</span>
              </button>
            </div>
            <select
              value={selectedBuildingId}
              onChange={(e) => {
                if (e.target.value === "__NEW__") {
                  setBuildingModalOpen(true);
                } else {
                  setSelectedBuildingId(e.target.value);
                }
              }}
              className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-hidden"
            >
              <option value="">-- Aucun bâtiment assigné (ou non spécifié) --</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.capacity ? `(Capacité max : ${b.capacity} poules)` : ""}
                </option>
              ))}
              <option value="__NEW__">➕ Créer un nouveau poulailler...</option>
            </select>

            {buildings.length === 0 && (
              <div className="mt-2 flex items-center justify-between rounded-xl border border-primary/25 bg-primary/5 p-2.5 text-xs">
                <div className="flex items-center gap-2 text-primary font-medium">
                  <Warehouse className="h-4 w-4 shrink-0" />
                  <span>Aucun poulailler enregistré sur cette ferme.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setBuildingModalOpen(true)}
                  className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-primary-hover transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  <span>Créer en 1 clic</span>
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-foreground">
                  Type d'élevage
                </label>
                {activeFarm?.productionType && (
                  <span className="text-[10px] font-semibold text-primary">
                    Auto ({activeFarm.productionType === "BROILER" ? "Chair" : activeFarm.productionType === "LAYER" ? "Pondeuses" : "Mixte"})
                  </span>
                )}
              </div>
              <select
                value={flockType}
                onChange={(e) => {
                  const newType = e.target.value as FlockType;
                  setFlockType(newType);
                  setBreed(getDefaultBreed(newType));
                }}
                className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-hidden"
              >
                <option value="LAYER">Pondeuses (Œufs)</option>
                <option value="BROILER">Poulets de chair (Viande)</option>
                <option value="MIXED">Mixte</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Race des poules
              </label>
              <input
                type="text"
                required
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                placeholder="ex. Goliath, Lohmann Brown, Cobb 500..."
                className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Nombre de poules au départ
              </label>
              <input
                type="number"
                min="1"
                required
                value={initialQuantity}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const val = e.target.value;
                  setInitialQuantity(val === "" ? "" : Math.max(1, parseInt(val) || 1));
                }}
                className="w-full rounded-xl border border-border bg-surface p-2.5 text-sm font-bold font-mono text-foreground focus:border-primary focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Date d'arrivée à la ferme
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Remarques / Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ex. Fournisseur couvoir Cotonou, bâtiment B1"
              className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
            />
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
              disabled={submitting}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-hover"
            >
              {submitting ? "Enregistrement..." : "Enregistrer le groupe"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MOVEMENT / MORTALITY MODAL */}
      <Modal
        isOpen={movementModalOpen}
        onClose={() => setMovementModalOpen(false)}
        title={`Noter une perte ou vente - ${activeFlock?.name || "ce groupe"}`}
        description="Indiquez les poules mortes, vendues vivantes ou retirées du groupe."
      >
        <form onSubmit={handleAddMovement} className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setMoveType("MORTALITY")}
              className={`rounded-xl border py-2 text-xs font-bold ${moveType === "MORTALITY"
                  ? "border-danger bg-danger text-white"
                  : "border-border bg-surface text-muted"
                }`}
            >
              Morts (Pertes)
            </button>
            <button
              type="button"
              onClick={() => setMoveType("SALE")}
              className={`rounded-xl border py-2 text-xs font-bold ${moveType === "SALE"
                  ? "border-success bg-success text-white"
                  : "border-border bg-surface text-muted"
                }`}
            >
              Poules vendues
            </button>
            <button
              type="button"
              onClick={() => setMoveType("CULL")}
              className={`rounded-xl border py-2 text-xs font-bold ${moveType === "CULL"
                  ? "border-warning bg-warning text-white"
                  : "border-border bg-surface text-muted"
                }`}
            >
              Retirées (Réforme)
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Nombre de poules
            </label>
            <input
              type="number"
              min="1"
              required
              value={moveQty}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const val = e.target.value;
                setMoveQty(val === "" ? "" : Math.max(1, parseInt(val) || 1));
              }}
              className="w-full rounded-xl border border-border bg-surface p-2.5 text-sm font-bold font-mono text-foreground"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Raison ou remarque
            </label>
            <input
              type="text"
              value={moveReason}
              onChange={(e) => setMoveReason(e.target.value)}
              placeholder="ex. Chaleur, maladie suspectée, vente au marché..."
              className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground"
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
              className="rounded-xl bg-danger px-4 py-2 text-xs font-bold text-white shadow-xs hover:opacity-90"
            >
              {submittingMove ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </Modal>

      {/* QUICK CREATE BUILDING MODAL */}
      <CreateBuildingModal
        isOpen={buildingModalOpen}
        onClose={() => setBuildingModalOpen(false)}
        defaultCapacity={Number(initialQuantity) || 1000}
        suggestedName={`Poulailler ${buildings.length + 1}`}
        onSuccess={(newBuilding) => {
          setBuildings((prev) => [...prev, newBuilding]);
          setSelectedBuildingId(newBuilding.id);
        }}
      />
      {/* FEEDING MODAL */}
      <RecordFeedingModal
        isOpen={feedingModalOpen}
        onClose={() => setFeedingModalOpen(false)}
        onSuccess={loadFlocks}
        flocks={flocks}
        inventoryItems={inventoryItems}
        activeFarmId={activeFarm?.id}
        defaultFlockId={activeFlock?.id}
      />
    </Shell>
  );
}
