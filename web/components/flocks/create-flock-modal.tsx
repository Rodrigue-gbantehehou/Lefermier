"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Bird, Warehouse, AlertCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { api } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { FlockType } from "@/lib/types";
import { CreateBuildingModal } from "@/components/farms/create-building-modal";

interface CreateFlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateFlockModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateFlockModalProps) {
  const { activeFarm } = useAuth();
  const { toast } = useToast();

  const [flockName, setFlockName] = useState("");
  const [flockType, setFlockType] = useState<FlockType>("LAYER");
  const [breed, setBreed] = useState("Lohmann Brown");
  const [initialQuantity, setInitialQuantity] = useState<number | string>(500);
  const [startDate, setStartDate] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedBuildingId, setSelectedBuildingId] = useState("");

  const [buildings, setBuildings] = useState<any[]>([]);
  const [buildingModalOpen, setBuildingModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getInitialFlockType = useCallback((productionType?: string): FlockType => {
    if (productionType === "BROILER") return "BROILER";
    return "LAYER";
  }, []);

  const getDefaultBreed = useCallback((type: FlockType): string => {
    if (type === "BROILER") return "Cobb 500";
    if (type === "MIXED") return "Goliath / Locale";
    return "Lohmann Brown";
  }, []);

  // Initialisation à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setStartDate(new Date().toISOString().split("T")[0]);
      const defaultType = getInitialFlockType(activeFarm?.productionType);
      setFlockType(defaultType);
      setBreed(getDefaultBreed(defaultType));
      setFlockName("");
      setInitialQuantity(500);
      setNotes("");
      setSelectedBuildingId("");

      if (activeFarm?.id) {
        api.farms
          .listBuildings(activeFarm.id)
          .then((b) => setBuildings(b || []))
          .catch(() => setBuildings([]));
      }
    }
  }, [isOpen, activeFarm?.id, activeFarm?.productionType, getInitialFlockType, getDefaultBreed]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeFarm?.id) return;
    setError(null);
    setSubmitting(true);

    try {
      const qty = parseInt(String(initialQuantity), 10);
      if (isNaN(qty) || qty <= 0) {
        throw new Error("L'effectif doit être supérieur à 0");
      }

      await api.flocks.create({
        farmId: activeFarm.id,
        name: flockName.trim(),
        type: flockType,
        breed: breed.trim(),
        initialQuantity: qty,
        startDate,
        notes: notes.trim() || undefined,
        buildingId: selectedBuildingId || undefined,
      });

      toast.success("Lot créé");
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Erreur lors de la création du lot.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Nouveau lot"
        description="Poussins ou bande"
      >
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          {/* Nom du lot */}
          <div>
            <label className="block text-[11px] font-bold text-foreground mb-1">
              Nom du lot *
            </label>
            <input
              type="text"
              required
              value={flockName}
              onChange={(e) => setFlockName(e.target.value)}
              placeholder="ex. Pondeuses A"
              className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
            />
          </div>

          {/* Bâtiment */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-foreground">
                Bâtiment
              </label>
              <button
                type="button"
                onClick={() => setBuildingModalOpen(true)}
                className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                <span>+ Nouveau</span>
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
              <option value="">-- Aucun bâtiment --</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.capacity ? `(${b.capacity} pl.)` : ""}
                </option>
              ))}
              <option value="__NEW__">➕ Créer un bâtiment...</option>
            </select>
          </div>

          {/* Type & Race */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-foreground mb-1">
                Type
              </label>
              <select
                value={flockType}
                onChange={(e) => {
                  const newType = e.target.value as FlockType;
                  setFlockType(newType);
                  setBreed(getDefaultBreed(newType));
                }}
                className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-hidden"
              >
                <option value="LAYER">Pondeuses</option>
                <option value="BROILER">Chair</option>
                <option value="MIXED">Mixte</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-foreground mb-1">
                Race *
              </label>
              <input
                type="text"
                required
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                placeholder="ex. Lohmann, Cobb 500"
                className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
              />
            </div>
          </div>

          {/* Effectif & Date */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-foreground mb-1">
                Effectif *
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
              <label className="block text-[11px] font-bold text-foreground mb-1">
                Date d'arrivée *
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

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-bold text-foreground mb-1">
              Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ex. Couvoir Cotonou, lot #1"
              className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-danger/30 bg-danger/10 p-2.5 text-xs text-danger flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-3.5 py-2 text-xs font-semibold text-muted hover:bg-surface-hover cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-hover active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
            >
              {submitting ? "Création..." : "Créer"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal création rapide d'un bâtiment si besoin */}
      {buildingModalOpen && (
        <CreateBuildingModal
          isOpen={buildingModalOpen}
          onClose={() => setBuildingModalOpen(false)}
          onSuccess={(b) => {
            setBuildings((prev) => [...prev, b]);
            setSelectedBuildingId(b.id);
            setBuildingModalOpen(false);
          }}
        />
      )}
    </>
  );
}
