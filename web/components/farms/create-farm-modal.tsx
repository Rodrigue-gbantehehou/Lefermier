"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { api } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";

interface CreateFarmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (createdFarm: any) => void;
}

export function CreateFarmModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateFarmModalProps) {
  const { switchFarm, refreshMe } = useAuth();

  const [farmName, setFarmName] = useState("");
  const [productionType, setProductionType] = useState<"LAYER" | "BROILER" | "MIXED">("LAYER");
  const [locationCity, setLocationCity] = useState("Calavi");
  const [farmCode, setFarmCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!farmName.trim()) return;

    setError(null);
    setSubmitting(true);
    try {
      const created = await api.farms.create({
        name: farmName.trim(),
        productionType,
        locationCity: locationCity.trim() || undefined,
        code: farmCode.trim() || undefined,
      });

      // Réinitialiser les champs
      setFarmName("");
      setLocationCity("Calavi");
      setFarmCode("");

      await refreshMe();
      if (created?.id) {
        await switchFarm(created.id);
      }

      onSuccess?.(created);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Erreur lors de la création de l'exploitation.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Créer une nouvelle exploitation"
      description="Ajoutez une nouvelle ferme avicole à votre compte propriétaire."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-danger/20 bg-danger-soft p-3 text-xs text-danger">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Nom de l'exploitation *
          </label>
          <input
            type="text"
            required
            value={farmName}
            onChange={(e) => {
              const val = e.target.value;
              setFarmName(val);
              if (!farmCode) {
                const clean = val.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase();
                if (clean) setFarmCode(`FRM-${clean}`);
              }
            }}
            placeholder="ex. Ferme Avicole Calavi 2"
            className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Type de production
            </label>
            <select
              value={productionType}
              onChange={(e) => setProductionType(e.target.value as any)}
              className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
            >
              <option value="LAYER">Pondeuses (Œufs de table)</option>
              <option value="BROILER">Poulets de chair</option>
              <option value="MIXED">Mixte / Polyvalente</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Ville / Commune
            </label>
            <input
              type="text"
              value={locationCity}
              onChange={(e) => setLocationCity(e.target.value)}
              placeholder="ex. Calavi, Allada, Parakou"
              className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Code identifiant (optionnel)
          </label>
          <input
            type="text"
            value={farmCode}
            onChange={(e) => setFarmCode(e.target.value)}
            placeholder="ex. FRM-CAL2"
            className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs font-mono text-foreground focus:border-primary focus:outline-hidden"
          />
          <p className="mt-1 text-[11px] text-muted">
            Identifiant court unique pour vos rapports et ventilations.
          </p>
        </div>

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
            <span>{submitting ? "Création en cours..." : "Créer l'exploitation"}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
