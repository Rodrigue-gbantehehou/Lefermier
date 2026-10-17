"use client";

import React, { useEffect, useState } from "react";
import { Plus, Bird, Calendar } from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api-client";
import { Flock, FlockType } from "@/lib/types";
import { formatNumber, formatDate } from "@/lib/utils";

export default function FlocksPage() {
  const { activeFarm, hasPermission } = useAuth();

  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [isLoading, setIsLoading] = useState(true);

  // New Flock Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [flockName, setFlockName] = useState("");
  const [flockCode, setFlockCode] = useState("");
  const [flockType, setFlockType] = useState<FlockType>("LAYER");
  const [breed, setBreed] = useState("Lohmann Brown");
  const [initialQuantity, setInitialQuantity] = useState<number>(500);
  const [startDate, setStartDate] = useState("");

  useEffect(() => {
    setStartDate(new Date().toISOString().split("T")[0]);
  }, []);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Movement Modal
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [activeFlock, setActiveFlock] = useState<Flock | null>(null);
  const [moveType, setMoveType] = useState<"MORTALITY" | "SALE" | "CULL">("MORTALITY");
  const [moveQty, setMoveQty] = useState<number>(1);
  const [moveReason, setMoveReason] = useState("");
  const [submittingMove, setSubmittingMove] = useState(false);

  useEffect(() => {
    if (activeFarm?.id) {
      loadFlocks();
    }
  }, [activeFarm?.id]);

  async function loadFlocks() {
    setIsLoading(true);
    try {
      const data = await api.flocks.list({ farmId: activeFarm?.id });
      setFlocks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateFlock(e: React.FormEvent) {
    e.preventDefault();
    if (!activeFarm?.id) return;
    setSubmitting(true);
    try {
      await api.flocks.create({
        farmId: activeFarm.id,
        code: flockCode || undefined,
        name: flockName,
        type: flockType,
        poultryType: flockType,
        breed,
        strain: breed,
        initialQuantity: Number(initialQuantity),
        currentQuantity: Number(initialQuantity),
        startDate,
        status: "ACTIVE",
        notes: notes || undefined,
      });
      setCreateModalOpen(false);
      setFlockName("");
      setFlockCode("");
      await loadFlocks();
    } catch (err: any) {
      alert(err?.message || "Erreur lors de la création de la bande");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddMovement(e: React.FormEvent) {
    e.preventDefault();
    if (!activeFlock) return;
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
      await loadFlocks();
    } catch (err: any) {
      alert(err?.message || "Erreur lors de l'enregistrement du mouvement");
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
            <span className="font-bold text-foreground">{flock.name}</span>
            <Badge variant={flock.status === "ACTIVE" ? "success" : "neutral"} size="sm" dot>
              {flock.status === "ACTIVE" ? "Actif" : "Clôturé"}
            </Badge>
          </div>
          {flock.code && <span className="text-[10px] font-mono text-muted">{flock.code}</span>}
        </div>
      ),
    },
    {
      key: "type",
      header: "Type d'élevage",
      sortable: true,
      cell: (flock) => (
        <Badge
          variant={
            flock.type === "LAYER"
              ? "warning"
              : flock.type === "BROILER"
              ? "default"
              : "neutral"
          }
          size="sm"
        >
          {flock.type === "LAYER"
            ? "Pondeuses"
            : flock.type === "BROILER"
            ? "Chair"
            : "Mixte"}
        </Badge>
      ),
    },
    {
      key: "breed",
      header: "Race / Souche",
      sortable: true,
      accessor: (f) => f.breed || "-",
      cell: (flock) => <span className="text-muted">{flock.breed || "-"}</span>,
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
            {losses} {losses > 0 ? `(${mortalityRate.toFixed(1)} %)` : ""}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "Action",
      align: "right",
      cell: (flock) =>
        hasPermission("flock:update") && flock.status === "ACTIVE" ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveFlock(flock);
              setMovementModalOpen(true);
            }}
            className="rounded-lg bg-danger-soft px-2.5 py-1 text-xs font-bold text-danger hover:opacity-90 transition-opacity"
          >
            + Noter perte ou vente
          </button>
        ) : null,
    },
  ];

  return (
    <Shell>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-border">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Groupes de poules (Bandes)
          </h1>
          <p className="mt-1 text-xs text-muted">
            Suivi des poules pondeuses et poulets de chair, des effectifs vivants, des pertes et des ventes.
          </p>
        </div>

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

      {/* Main Table */}
      <div className="mt-6">
        <DataTable<Flock>
          title="Vos groupes de poules en élevage"
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
                      <p className="text-xs text-muted">
                        {flock.breed}
                      </p>
                    </div>
                    <Badge
                      variant={
                        flock.type === "LAYER"
                          ? "warning"
                          : flock.type === "BROILER"
                          ? "default"
                          : "neutral"
                      }
                      size="sm"
                    >
                      {flock.type === "LAYER"
                        ? "Pondeuses"
                        : flock.type === "BROILER"
                        ? "Chair"
                        : "Mixte"}
                    </Badge>
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
                        {losses} ({mortalityRate.toFixed(1)} %)
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
                  <span className="text-[11px] text-muted">
                    Départ : {formatNumber(flock.initialQuantity)} poules
                  </span>
                  {hasPermission("flock:update") && flock.status === "ACTIVE" && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveFlock(flock);
                        setMovementModalOpen(true);
                      }}
                      className="rounded-lg bg-danger-soft px-2.5 py-1 text-xs font-bold text-danger hover:opacity-90 transition-opacity"
                    >
                      + Noter perte ou vente
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Nom du groupe de poules *
              </label>
              <input
                type="text"
                required
                value={flockName}
                onChange={(e) => {
                  setFlockName(e.target.value);
                  if (!flockCode) {
                    const clean = e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6);
                    if (clean) setFlockCode(`LOT-${clean}`);
                  }
                }}
                placeholder="ex. Pondeuses Bâtiment A"
                className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Code du lot *
              </label>
              <input
                type="text"
                required
                value={flockCode}
                onChange={(e) => setFlockCode(e.target.value.toUpperCase())}
                placeholder="ex. LOT-2026-P01"
                className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs font-mono text-foreground focus:border-primary focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Type d'élevage
              </label>
              <select
                value={flockType}
                onChange={(e) => setFlockType(e.target.value as FlockType)}
                className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs font-semibold text-foreground"
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
                onChange={(e) => setInitialQuantity(Math.max(1, parseInt(e.target.value) || 1))}
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
              className={`rounded-xl border py-2 text-xs font-bold ${
                moveType === "MORTALITY"
                  ? "border-danger bg-danger text-white"
                  : "border-border bg-surface text-muted"
              }`}
            >
              Morts (Pertes)
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
              Poules vendues
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
              onChange={(e) => setMoveQty(Math.max(1, parseInt(e.target.value) || 1))}
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
              {submittingMove ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </Modal>
    </Shell>
  );
}
