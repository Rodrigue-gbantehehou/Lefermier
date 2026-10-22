"use client";

import React, { useState, useEffect } from "react";
import { AlertCircle, Bird } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/context/toast-context";
import { api } from "@/lib/api-client";
import { Flock } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

interface RecordMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  flocks: Flock[];
  defaultFlockId?: string;
}

export function RecordMovementModal({
  isOpen,
  onClose,
  onSuccess,
  flocks,
  defaultFlockId,
}: RecordMovementModalProps) {
  const { toast } = useToast();

  const [moveFlockId, setMoveFlockId] = useState(defaultFlockId || (flocks[0]?.id ?? ""));
  const [moveType, setMoveType] = useState<"MORTALITY" | "SALE" | "CULL">("MORTALITY");
  const [moveQuantity, setMoveQuantity] = useState<number | string>(1);
  const [moveReason, setMoveReason] = useState("");
  const [submittingMove, setSubmittingMove] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMoveError(null);
      setMoveQuantity(1);
      setMoveReason("");
      setMoveType("MORTALITY");
      if (defaultFlockId) {
        setMoveFlockId(defaultFlockId);
      } else if (flocks.length > 0) {
        setMoveFlockId(flocks[0].id);
      }
    }
  }, [isOpen, defaultFlockId, flocks]);

  async function handleMoveSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMoveError(null);
    if (!moveFlockId) {
      const msg = "Veuillez sélectionner une bande.";
      setMoveError(msg);
      toast.warning(msg);
      return;
    }
    setSubmittingMove(true);
    try {
      await api.flocks.addMovement(moveFlockId, {
        type: moveType,
        quantity: Number(moveQuantity),
        date: new Date().toISOString().split("T")[0],
        reason: moveReason || undefined,
      });
      toast.success(
        moveType === "MORTALITY"
          ? "Perte / mortalité enregistrée avec succès."
          : "Mouvement de bande enregistré avec succès."
      );
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'enregistrement du mouvement";
      setMoveError(msg);
      toast.error(msg);
    } finally {
      setSubmittingMove(false);
    }
  }

  const selectedFlock =
    flocks.find((f) => f.id === moveFlockId) ||
    (defaultFlockId ? flocks.find((f) => f.id === defaultFlockId) : flocks[0]);
  const isFlockLocked = Boolean(defaultFlockId) || flocks.length <= 1;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        selectedFlock && isFlockLocked
          ? `Mouvement / Perte — ${selectedFlock.name}`
          : "Déclarer un mouvement ou une mortalité"
      }
      description={
        selectedFlock && isFlockLocked
          ? `Mise à jour automatique de l'effectif vif pour ${selectedFlock.name} (${formatNumber(selectedFlock.currentQuantity)} sujets vivants).`
          : "Mise à jour automatique de l'effectif vif de la bande."
      }
    >
      <form onSubmit={handleMoveSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Bande concernée
          </label>
          {isFlockLocked && selectedFlock ? (
            <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary-soft/30 px-3 py-2 text-xs font-semibold text-foreground h-[38px]">
              <div className="flex items-center gap-1.5 truncate">
                <Bird className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="font-bold truncate">{selectedFlock.name}</span>
              </div>
              <span className="font-mono text-[11px] font-bold text-primary shrink-0">
                {formatNumber(selectedFlock.currentQuantity)} sujets
              </span>
            </div>
          ) : (
            <select
              value={moveFlockId}
              onChange={(e) => setMoveFlockId(e.target.value)}
              required
              className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs font-semibold text-foreground"
            >
              {flocks.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} (Actuel : {formatNumber(f.currentQuantity)} sujets)
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Type d'opération
          </label>
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
              Mortalité
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
              Vente Vif
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
              Réforme
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Quantité (têtes / sujets)
          </label>
          <input
            type="number"
            min="1"
            required
            value={moveQuantity}
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              const val = e.target.value;
              setMoveQuantity(val === "" ? "" : Math.max(1, parseInt(val) || 1));
            }}
            className="w-full rounded-xl border border-border bg-surface p-2.5 text-sm font-bold font-mono text-foreground focus:border-danger focus:outline-hidden"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Cause / Motif
          </label>
          <input
            type="text"
            value={moveReason}
            onChange={(e) => setMoveReason(e.target.value)}
            placeholder="ex. Piquage, étouffement, autopsie suspecte..."
            className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-border-hover focus:outline-hidden"
          />
        </div>

        {moveError && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger flex items-start gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">{moveError}</div>
          </div>
        )}

        <div className="pt-2 flex justify-end gap-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted hover:bg-surface-hover"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={submittingMove}
            className="rounded-xl bg-danger px-4 py-2 text-xs font-bold text-white shadow-xs hover:opacity-90"
          >
            {submittingMove ? "Enregistrement..." : "Confirmer le mouvement"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
