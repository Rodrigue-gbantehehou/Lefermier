"use client";

import React, { useState, useEffect } from "react";
import { Save, Warehouse, Building2, Box, Archive, RotateCcw, Trash2, AlertTriangle, Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { api } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";

export interface BuildingData {
  id: string;
  name: string;
  type: "POULTRY_HOUSE" | "BROODER" | "STORAGE" | "OTHER";
  capacity: number;
  surfaceArea?: number | null;
  isActive: boolean;
  createdAt?: string;
}

interface EditBuildingModalProps {
  isOpen: boolean;
  onClose: () => void;
  building: BuildingData | null;
  onSuccess?: () => void;
}

export function EditBuildingModal({
  isOpen,
  onClose,
  building,
  onSuccess,
}: EditBuildingModalProps) {
  const { activeFarm } = useAuth();

  const [name, setName] = useState("");
  const [type, setType] = useState<"POULTRY_HOUSE" | "BROODER" | "STORAGE" | "OTHER">("POULTRY_HOUSE");
  const [capacity, setCapacity] = useState<number | string>(1000);
  const [surfaceArea, setSurfaceArea] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (building && isOpen) {
      setName(building.name || "");
      setType(building.type || "POULTRY_HOUSE");
      setCapacity(building.capacity || 0);
      setSurfaceArea(building.surfaceArea !== null && building.surfaceArea !== undefined ? String(building.surfaceArea) : "");
      setIsActive(building.isActive !== undefined ? building.isActive : true);
      setConfirmDelete(false);
      setError(null);
    }
  }, [building, isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeFarm?.id || !building?.id) {
      setError("Données de bâtiment ou de ferme manquantes.");
      return;
    }
    if (!name.trim()) {
      setError("Le nom du poulailler / bâtiment est obligatoire.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await api.farms.updateBuilding(activeFarm.id, building.id, {
        name: name.trim(),
        type,
        capacity: Number(capacity) || 0,
        surfaceArea: surfaceArea ? parseFloat(surfaceArea) : undefined,
        isActive,
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Erreur lors de la mise à jour du bâtiment.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleArchive() {
    if (!activeFarm?.id || !building?.id) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.farms.updateBuilding(activeFarm.id, building.id, {
        isActive: !isActive,
      });
      setIsActive(!isActive);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Erreur lors du changement de statut d'archivage.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!activeFarm?.id || !building?.id) return;
    setDeleting(true);
    setError(null);
    try {
      await api.farms.deleteBuilding(activeFarm.id, building.id);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Impossible de supprimer ce bâtiment (des bandes ou stocks peuvent y être rattachés). Vous pouvez l'archiver à la place.");
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  if (!building) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Modifier le bâtiment : ${building.name}`}
      description="Ajustez la capacité d'accueil, les caractéristiques physiques ou l'état d'archivage."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-danger/20 bg-danger-soft p-3 text-xs text-danger flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* État Archivé / Actif */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-surface-muted p-3">
          <div>
            <div className="text-xs font-bold text-foreground">
              {isActive ? "Bâtiment en exploitation active" : "Bâtiment archivé / Hors service"}
            </div>
            <div className="text-[11px] text-muted">
              {isActive
                ? "Disponible pour loger de nouvelles bandes de volailles."
                : "Masqué des sélecteurs de création de lots, conserve l'historique."}
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggleArchive}
            disabled={submitting}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
              isActive
                ? "bg-warning-soft text-warning hover:bg-warning/20"
                : "bg-success-soft text-success hover:bg-success/20"
            }`}
          >
            {isActive ? (
              <>
                <Archive className="h-3.5 w-3.5" />
                <span>Archiver</span>
              </>
            ) : (
              <>
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Restaurer</span>
              </>
            )}
          </button>
        </div>

        {/* Nom du bâtiment */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Nom ou Numéro du bâtiment *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex. Poulailler 1, Bâtiment B..."
            className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
          />
        </div>

        {/* Type de bâtiment */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Type d'installation
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => setType("POULTRY_HOUSE")}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-2.5 text-xs font-semibold transition-all ${
                type === "POULTRY_HOUSE"
                  ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                  : "border-border bg-surface text-muted hover:bg-surface-hover"
              }`}
            >
              <Warehouse className="h-4 w-4" />
              <span>Poulailler</span>
            </button>
            <button
              type="button"
              onClick={() => setType("BROODER")}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-2.5 text-xs font-semibold transition-all ${
                type === "BROODER"
                  ? "border-warning bg-warning/10 text-warning font-bold shadow-xs"
                  : "border-border bg-surface text-muted hover:bg-surface-hover"
              }`}
            >
              <Building2 className="h-4 w-4" />
              <span>Poussinière</span>
            </button>
            <button
              type="button"
              onClick={() => setType("STORAGE")}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-2.5 text-xs font-semibold transition-all ${
                type === "STORAGE"
                  ? "border-neutral-500 bg-neutral-500/10 text-foreground font-bold shadow-xs"
                  : "border-border bg-surface text-muted hover:bg-surface-hover"
              }`}
            >
              <Box className="h-4 w-4" />
              <span>Stockage</span>
            </button>
            <button
              type="button"
              onClick={() => setType("OTHER")}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-2.5 text-xs font-semibold transition-all ${
                type === "OTHER"
                  ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                  : "border-border bg-surface text-muted hover:bg-surface-hover"
              }`}
            >
              <Building2 className="h-4 w-4" />
              <span>Autre</span>
            </button>
          </div>
        </div>

        {/* Capacité et Surface */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-foreground">
                Capacité d'accueil (poules) *
              </label>
            </div>
            <input
              type="number"
              min={0}
              required
              value={capacity}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const val = e.target.value;
                setCapacity(val === "" ? "" : Math.max(0, parseInt(val) || 0));
              }}
              placeholder="ex. 1000"
              className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs font-mono font-bold text-foreground focus:border-primary focus:outline-hidden"
            />
            {/* Quick capacity adjustments */}
            <div className="mt-1.5 flex flex-wrap gap-1">
              {[-500, -100, +100, +500].map((delta) => (
                <button
                  key={delta}
                  type="button"
                  onClick={() => setCapacity(Math.max(0, (Number(capacity) || 0) + delta))}
                  className="rounded-md border border-border bg-surface px-1.5 py-0.5 text-[10px] text-muted hover:bg-surface-hover"
                >
                  {delta > 0 ? `+${delta}` : delta}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Surface en m² (optionnel)
            </label>
            <input
              type="number"
              step="0.1"
              min={0}
              value={surfaceArea}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setSurfaceArea(e.target.value)}
              placeholder="ex. 120"
              className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs font-mono text-foreground focus:border-primary focus:outline-hidden"
            />
            <span className="mt-1.5 block text-[10px] text-muted">
              {capacity && surfaceArea && parseFloat(surfaceArea) > 0
                ? `${(Number(capacity) / parseFloat(surfaceArea)).toFixed(1)} poules / m²`
                : "Optionnel pour calcul de densité"}
            </span>
          </div>
        </div>

        {/* Zone de suppression définitive */}
        <div className="pt-2">
          {confirmDelete ? (
            <div className="rounded-xl border border-danger/30 bg-danger-soft p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs text-danger font-medium">
                Confirmer la suppression définitive de ce bâtiment ?
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-muted hover:bg-surface-hover"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-lg bg-danger px-3 py-1 text-xs font-bold text-white hover:bg-danger/90 disabled:opacity-50"
                >
                  {deleting ? "Suppression..." : "Oui, supprimer"}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="text-[11px] text-muted hover:text-danger flex items-center gap-1 transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              <span>Supprimer définitivement ce bâtiment</span>
            </button>
          )}
        </div>

        {/* Actions principales */}
        <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-3.5 py-2 text-xs font-semibold text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
          >
            Fermer
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{submitting ? "Enregistrement..." : "Enregistrer les modifications"}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
