"use client";

import React, { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle2, Bird } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/context/toast-context";
import { api } from "@/lib/api-client";
import { Flock, EggProduction, EggSession } from "@/lib/types";
import { calcEggTrays, formatNumber } from "@/lib/utils";

interface RecordEggModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  flocks: Flock[];
  recentEggs?: EggProduction[];
  editingEgg?: EggProduction | null;
  defaultFlockId?: string;
}

export function RecordEggModal({
  isOpen,
  onClose,
  onSuccess,
  flocks,
  recentEggs = [],
  editingEgg = null,
  defaultFlockId,
}: RecordEggModalProps) {
  const { toast } = useToast();

  const [selectedFlockId, setSelectedFlockId] = useState(editingEgg?.flockId || defaultFlockId || (flocks[0]?.id ?? ""));
  const [eggDate, setEggDate] = useState("");
  const [eggSession, setEggSession] = useState<EggSession>("MORNING");
  const [goodEggs, setGoodEggs] = useState<number | string>(0);
  const [brokenEggs, setBrokenEggs] = useState<number | string>(0);
  const [abnormalEggs, setAbnormalEggs] = useState<number | string>(0);
  const [eggNotes, setEggNotes] = useState("");
  const [submittingEgg, setSubmittingEgg] = useState(false);
  const [eggError, setEggError] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (isOpen) {
      setEggError(null);
      if (editingEgg) {
        setSelectedFlockId(editingEgg.flockId);
        setEggDate(editingEgg.date);
        setEggSession(editingEgg.session);
        setGoodEggs(editingEgg.goodEggs);
        setBrokenEggs(editingEgg.brokenEggs);
        setAbnormalEggs(editingEgg.abnormalEggs);
        setEggNotes(editingEgg.notes || "");
      } else {
        setEggDate(todayStr);
        setEggSession("MORNING");
        setGoodEggs(0);
        setBrokenEggs(0);
        setAbnormalEggs(0);
        setEggNotes("");
        if (defaultFlockId) {
          setSelectedFlockId(defaultFlockId);
        } else if (flocks.length > 0) {
          setSelectedFlockId(flocks[0].id);
        }
      }
    }
  }, [isOpen, editingEgg, defaultFlockId, flocks, todayStr]);

  async function handleEggSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEggError(null);
    if (!selectedFlockId) {
      const msg = "Veuillez sélectionner une bande.";
      setEggError(msg);
      toast.warning(msg);
      return;
    }
    setSubmittingEgg(true);
    try {
      const targetDate = eggDate || todayStr;
      if (editingEgg) {
        await api.eggs.update(editingEgg.id, {
          goodEggs: Number(goodEggs),
          brokenEggs: Number(brokenEggs),
          abnormalEggs: Number(abnormalEggs),
          notes: eggNotes || undefined,
        });
        toast.success("Collecte mise à jour avec succès !");
      } else {
        await api.eggs.create({
          flockId: selectedFlockId,
          date: targetDate,
          session: eggSession,
          goodEggs: Number(goodEggs),
          brokenEggs: Number(brokenEggs),
          abnormalEggs: Number(abnormalEggs),
          notes: eggNotes || undefined,
          allowUpdate: true,
        });
        toast.success("Collecte d'œufs enregistrée avec succès !");
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'enregistrement de la collecte";
      setEggError(msg);
      toast.error(msg);
    } finally {
      setSubmittingEgg(false);
    }
  }

  const trayCalc = calcEggTrays(Number(goodEggs));

  const targetFlock =
    flocks.find((f) => f.id === selectedFlockId) ||
    (defaultFlockId ? flocks.find((f) => f.id === defaultFlockId) : flocks[0]);
  const isFlockLocked = Boolean(editingEgg || defaultFlockId || flocks.length <= 1);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        editingEgg
          ? "Modifier le ramassage d'œufs"
          : isFlockLocked && targetFlock
            ? `Collecte de ponte — ${targetFlock.name}`
            : "Enregistrer une collecte de ponte"
      }
      description={
        editingEgg
          ? "Mise à jour des quantités récoltées pour ce créneau de ponte."
          : isFlockLocked && targetFlock
            ? `Saisie des œufs récoltés pour ${targetFlock.name} avec calcul instantané en plateaux.`
            : "Saisie des œufs récoltés avec calcul instantané en plateaux de 30 alvéoles."
      }
    >
      <form onSubmit={handleEggSubmit} className="space-y-4">
        {!editingEgg &&
          recentEggs.some(
            (e) =>
              e.flockId === selectedFlockId &&
              e.date === (eggDate || todayStr) &&
              e.session === eggSession
          ) && (
            <div className="rounded-xl border border-warning/30 bg-warning-soft/30 p-3 text-xs text-warning flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                Une collecte existe déjà pour ce créneau. La validation mettra à jour directement ces chiffres.
              </span>
            </div>
          )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Bande pondeuse
            </label>
            {isFlockLocked && targetFlock ? (
              <div className="flex items-center justify-between rounded-xl border border-accent/20 bg-accent-soft/30 px-3 py-2 text-xs font-semibold text-foreground h-[38px]">
                <div className="flex items-center gap-1.5 truncate">
                  <Bird className="h-3.5 w-3.5 text-accent shrink-0" />
                  <span className="font-bold truncate">{targetFlock.name}</span>
                </div>
                <span className="font-mono text-[11px] font-bold text-accent shrink-0">
                  {formatNumber(targetFlock.currentQuantity)} poules
                </span>
              </div>
            ) : (
              <select
                value={selectedFlockId}
                onChange={(e) => setSelectedFlockId(e.target.value)}
                disabled={!!editingEgg}
                required
                className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs font-semibold text-foreground disabled:opacity-60"
              >
                {flocks.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.breed} — {formatNumber(f.currentQuantity)} poules)
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Date de collecte
            </label>
            <input
              type="date"
              value={eggDate || todayStr}
              onChange={(e) => setEggDate(e.target.value)}
              disabled={!!editingEgg}
              required
              className="w-full rounded-xl border border-border bg-surface-muted p-2 text-xs font-semibold text-foreground disabled:opacity-60 focus:border-accent focus:outline-hidden"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Session de ramassage
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(["MORNING", "NOON", "EVENING"] as EggSession[]).map((session) => (
              <button
                key={session}
                type="button"
                onClick={() => setEggSession(session)}
                className={`rounded-xl border py-2 text-xs font-bold transition-colors ${
                  eggSession === session
                    ? "border-accent bg-accent text-white shadow-xs"
                    : "border-border bg-surface text-muted hover:bg-surface-hover"
                }`}
              >
                {session === "MORNING"
                  ? "Matin"
                  : session === "NOON"
                  ? "Midi"
                  : "Soir"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-success mb-1">
              Bons œufs (vendables)
            </label>
            <input
              type="number"
              min="0"
              required
              value={goodEggs}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const val = e.target.value;
                setGoodEggs(val === "" ? "" : Math.max(0, parseInt(val) || 0));
              }}
              placeholder="0"
              className="w-full rounded-xl border border-success/30 bg-surface p-2.5 text-sm font-bold font-mono text-foreground focus:border-success focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-danger mb-1">
              Cassés / Fêlés
            </label>
            <input
              type="number"
              min="0"
              value={brokenEggs}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const val = e.target.value;
                setBrokenEggs(val === "" ? "" : Math.max(0, parseInt(val) || 0));
              }}
              placeholder="0"
              className="w-full rounded-xl border border-border bg-surface p-2.5 text-sm font-mono text-foreground focus:border-danger focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-warning mb-1">
              Anormaux / Petits
            </label>
            <input
              type="number"
              min="0"
              value={abnormalEggs}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const val = e.target.value;
                setAbnormalEggs(val === "" ? "" : Math.max(0, parseInt(val) || 0));
              }}
              placeholder="0"
              className="w-full rounded-xl border border-border bg-surface p-2.5 text-sm font-mono text-foreground focus:border-warning focus:outline-hidden"
            />
          </div>
        </div>

        {/* Estimation plateaux de 30 alvéoles */}
        <div className="rounded-2xl border border-accent/20 bg-accent-soft/30 p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-accent">
            <span>Équivalence en plateaux de 30</span>
            <span className="flex items-center gap-1 font-mono text-foreground bg-surface px-2.5 py-1 rounded-lg border border-accent/20 shadow-2xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              {trayCalc.text}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-xl bg-surface p-2 border border-border">
              <span className="text-[10px] text-muted block">Plateaux de 30</span>
              <span className="font-bold font-mono text-base text-accent">
                {trayCalc.trays}
              </span>
            </div>
            <div className="rounded-xl bg-surface p-2 border border-border">
              <span className="text-[10px] text-muted block">Œufs libres</span>
              <span className="font-bold font-mono text-base text-foreground">
                {trayCalc.loose}
              </span>
            </div>
            <div className="rounded-xl bg-surface p-2 border border-border">
              <span className="text-[10px] text-muted block">Total récolté</span>
              <span className="font-bold font-mono text-base text-foreground">
                {Number(goodEggs) + Number(brokenEggs) + Number(abnormalEggs)}
              </span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Notes / Observations
          </label>
          <input
            type="text"
            value={eggNotes}
            onChange={(e) => setEggNotes(e.target.value)}
            placeholder="ex. Légère baisse de ponte, couleur normale, coquille solide..."
            className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-accent focus:outline-hidden"
          />
        </div>

        {eggError && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{eggError}</span>
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
            disabled={submittingEgg}
            className="rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-accent-hover"
          >
            {submittingEgg
              ? "Enregistrement..."
              : editingEgg
              ? "Mettre à jour le ramassage"
              : "Valider la collecte"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
