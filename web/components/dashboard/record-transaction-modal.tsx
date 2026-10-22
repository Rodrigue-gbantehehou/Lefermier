"use client";

import React, { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/context/toast-context";
import { api } from "@/lib/api-client";
import { PaymentMethod } from "@/lib/types";
import { formatFcfa } from "@/lib/utils";

interface RecordTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  activeFarmId?: string;
}

export function RecordTransactionModal({
  isOpen,
  onClose,
  onSuccess,
  activeFarmId,
}: RecordTransactionModalProps) {
  const { toast } = useToast();

  const [txType, setTxType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [txAmount, setTxAmount] = useState<number | string>(0);
  const [txCategory, setTxCategory] = useState("Vente Oeufs");
  const [txCustomCategory, setTxCustomCategory] = useState("");
  const [txPaymentMethod, setTxPaymentMethod] = useState<PaymentMethod>("MTN_MOMO");
  const [txNotes, setTxNotes] = useState("");
  const [submittingTx, setSubmittingTx] = useState(false);
  const [financeError, setFinanceError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFinanceError(null);
      setTxType("INCOME");
      setTxAmount(0);
      setTxCategory("Vente Oeufs");
      setTxCustomCategory("");
      setTxPaymentMethod("MTN_MOMO");
      setTxNotes("");
    }
  }, [isOpen]);

  async function handleFinanceSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFinanceError(null);
    if (!activeFarmId) return;
    setSubmittingTx(true);
    try {
      await api.finance.createTransaction({
        farmId: activeFarmId,
        type: txType,
        amountFcfa: Number(txAmount),
        category: txCategory,
        customCategory:
          txCategory === "Autre Recette" || txCategory === "Autre Depense"
            ? txCustomCategory.trim()
            : undefined,
        paymentMethod: txPaymentMethod,
        date: new Date().toISOString().split("T")[0],
        notes: txNotes || undefined,
      });
      toast.success(
        txType === "INCOME"
          ? "Recette enregistrée avec succès !"
          : "Dépense enregistrée avec succès !"
      );
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Erreur lors de la transaction financière";
      setFinanceError(msg);
      toast.error(msg);
    } finally {
      setSubmittingTx(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Enregistrer une transaction financière"
      description="Encaissement ou décaissement en FCFA avec mode de paiement local."
    >
      <form onSubmit={handleFinanceSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setTxType("INCOME");
              setTxCategory("Vente Oeufs");
            }}
            className={`rounded-xl border py-2.5 text-xs font-bold transition-colors ${
              txType === "INCOME"
                ? "border-primary bg-primary text-white"
                : "border-border bg-surface text-muted hover:bg-surface-hover"
            }`}
          >
            + Recette / Vente
          </button>
          <button
            type="button"
            onClick={() => {
              setTxType("EXPENSE");
              setTxCategory("Alimentation");
            }}
            className={`rounded-xl border py-2.5 text-xs font-bold transition-colors ${
              txType === "EXPENSE"
                ? "border-danger bg-danger text-white"
                : "border-border bg-surface text-muted hover:bg-surface-hover"
            }`}
          >
            - Dépense / Achat
          </button>
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Montant en FCFA
          </label>
          <input
            type="number"
            min="1"
            required
            value={txAmount}
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              const val = e.target.value;
              setTxAmount(val === "" ? "" : Math.max(0, parseInt(val) || 0));
            }}
            placeholder="ex. 45000"
            className="w-full rounded-xl border border-border bg-surface p-2.5 text-base font-bold font-mono text-foreground focus:border-primary focus:outline-hidden"
          />
          <div className="mt-1 text-[11px] text-muted font-mono">
            Aperçu : {formatFcfa(Number(txAmount) || 0)}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Catégorie
            </label>
            <select
              value={txCategory}
              onChange={(e) => setTxCategory(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs font-semibold text-foreground"
            >
              {txType === "INCOME" ? (
                <>
                  <option value="Vente Oeufs">Vente Œufs</option>
                  <option value="Vente Poulets Vifs">Vente Poulets Vifs</option>
                  <option value="Vente Fiente / Engrais">Vente Fiente</option>
                  <option value="Autre Recette">Autre Recette</option>
                </>
              ) : (
                <>
                  <option value="Alimentation">Alimentation</option>
                  <option value="Vaccins & Soins">Vaccins & Soins</option>
                  <option value="Poussins / Achat Sujets">Achat Poussins</option>
                  <option value="Main d'oeuvre">Main d'œuvre</option>
                  <option value="Carburant & Electricite">Énergie / Eau</option>
                  <option value="Autre Depense">Autre Dépense</option>
                </>
              )}
            </select>

            {(txCategory === "Autre Recette" || txCategory === "Autre Depense") && (
              <div className="mt-2">
                <input
                  type="text"
                  required
                  value={txCustomCategory}
                  onChange={(e) => setTxCustomCategory(e.target.value)}
                  placeholder="Précisez la catégorie (ex. Subvention, Vente sacs...)"
                  className="w-full rounded-xl border border-border bg-surface p-2 text-xs text-foreground focus:border-primary focus:outline-hidden"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Moyen de paiement
            </label>
            <select
              value={txPaymentMethod}
              onChange={(e) => setTxPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs font-semibold text-foreground"
            >
              <option value="MTN_MOMO">MTN Mobile Money</option>
              <option value="MOOV_MONEY">Moov Money</option>
              <option value="CELTIIS_CASH">Celtiis Cash</option>
              <option value="CASH">Espèces</option>
              <option value="BANK_TRANSFER">Virement Bancaire</option>
              <option value="CHECK">Chèque</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Référence / Client / Fournisseur
          </label>
          <input
            type="text"
            value={txNotes}
            onChange={(e) => setTxNotes(e.target.value)}
            placeholder="ex. Vente à la restauratrice Mme Dossou"
            className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
          />
        </div>

        {financeError && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger flex items-start gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">
              {financeError}
            </div>
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
            disabled={submittingTx}
            className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-hover"
          >
            {submittingTx ? "Enregistrement..." : "Valider l'opération"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
