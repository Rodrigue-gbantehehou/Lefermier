"use client";

import React, { useState, useEffect } from "react";
import { Plus, Warehouse, Sparkles, Building2, Box } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { api } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";

interface CreateBuildingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (createdBuilding: any) => void;
  defaultCapacity?: number;
  suggestedName?: string;
}

export function CreateBuildingModal({
  isOpen,
  onClose,
  onSuccess,
  defaultCapacity = 1000,
  suggestedName,
}: CreateBuildingModalProps) {
  const { activeFarm } = useAuth();

  const [name, setName] = useState(suggestedName || "Poulailler 1");
  const [type, setType] = useState<"POULTRY_HOUSE" | "BROODER" | "STORAGE" | "OTHER">("POULTRY_HOUSE");
  const [capacity, setCapacity] = useState<number | string>(defaultCapacity || 1000);
  const [surfaceArea, setSurfaceArea] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync suggestion when modal opens or suggestedName changes
  useEffect(() => {
    if (isOpen) {
      if (suggestedName) {
        setName(suggestedName);
      }
      if (defaultCapacity) {
        setCapacity(defaultCapacity);
      }
      setError(null);
    }
  }, [isOpen, suggestedName, defaultCapacity]);

  const quickNameSuggestions = [
    "Poulailler 1",
    "Poulailler 2",
    "Bâtiment A",
    "Bâtiment B",
    "Poussinière 1",
    "Hangar Stockage",
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeFarm?.id) {
      setError("Aucune exploitation active sélectionnée.");
      return;
    }
    if (!name.trim()) {
      setError("Le nom du poulailler / bâtiment est obligatoire.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const created = await api.farms.createBuilding(activeFarm.id, {
        name: name.trim(),
        type,
        capacity: Number(capacity) || 0,
        surfaceArea: surfaceArea ? parseFloat(surfaceArea) : undefined,
      });

      onSuccess?.(created);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Erreur lors de la création du bâtiment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ajouter un Poulailler / Bâtiment"
      description="Créez rapidement un poulailler pour y loger vos bandes de poules ou stocker vos intrants."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-danger/20 bg-danger-soft p-3 text-xs text-danger">
            {error}
          </div>
        )}

        {/* Suggestions rapides */}
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted mb-1.5">
            <Sparkles className="h-3 w-3 text-primary" />
            <span>Suggestions rapides de nom :</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {quickNameSuggestions.map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => {
                  setName(sug);
                  if (sug.includes("Poussinière")) setType("BROODER");
                  else if (sug.includes("Stockage")) setType("STORAGE");
                  else setType("POULTRY_HOUSE");
                }}
                className={`rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors ${
                  name === sug
                    ? "border-primary bg-primary/10 text-primary font-bold"
                    : "border-border bg-surface-muted text-muted hover:border-border-hover hover:text-foreground"
                }`}
              >
                {sug}
              </button>
            ))}
          </div>
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
            {/* Quick capacity buttons */}
            <div className="mt-1.5 flex gap-1">
              {[500, 1000, 2000, 5000].map((cap) => (
                <button
                  key={cap}
                  type="button"
                  onClick={() => setCapacity(cap)}
                  className="rounded-md border border-border bg-surface px-1.5 py-0.5 text-[10px] text-muted hover:bg-surface-hover"
                >
                  {cap}
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

        {/* Actions */}
        <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-3.5 py-2 text-xs font-semibold text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            <span>{submitting ? "Création..." : "Créer le bâtiment"}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
