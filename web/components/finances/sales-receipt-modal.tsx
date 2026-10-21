"use client";

import React from "react";
import { Transaction, Farm } from "@/lib/types";
import { formatDate, formatFcfa } from "@/lib/utils";
import { PrintableDocument, PrintableModal } from "@/components/pdf";

interface SalesReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  farm: Farm | null;
}

export function SalesReceiptModal({
  isOpen,
  onClose,
  transaction,
  farm,
}: SalesReceiptModalProps) {
  if (!transaction) return null;

  const isPartial = transaction.paymentStatus === "PARTIAL";
  const isUnpaid = transaction.paymentStatus === "UNPAID";
  const remaining = transaction.remainingAmountFcfa || 0;
  const paidAmount =
    transaction.paidAmountFcfa !== undefined
      ? transaction.paidAmountFcfa
      : isUnpaid
      ? 0
      : transaction.amountFcfa;

  const paymentLabels: Record<string, string> = {
    CASH: "Espèces (Cash)",
    MTN_MOMO: "MTN Mobile Money",
    MOOV_MONEY: "Moov Money",
    CELTIIS_CASH: "Celtiis Cash",
    BANK_TRANSFER: "Virement bancaire",
    CHECK: "Chèque",
  };

  const recipientInfo = transaction.contact
    ? {
        label: "Client / Revendeuse",
        name: transaction.contact.name,
        phone: transaction.contact.phone,
      }
    : {
        label: "Client / Acheteur",
        name: "Vente directe au comptoir / Client passage",
      };

  return (
    <PrintableModal
      isOpen={isOpen}
      onClose={onClose}
      title="Reçu de Vente Officiel"
      description="Format prêt à l'impression pour délivrance au client ou archivage comptable."
      farm={farm}
      downloadEndpoint={`/transactions/${transaction.id}/receipt/pdf?download=1`}
      defaultFilename={`recu-vente-${(transaction.reference || transaction.id.slice(-6)).toLowerCase()}.pdf`}
    >
      <PrintableDocument
        id="printable-sales-receipt"
        title="Reçu de Vente Officiel"
        subtitle="Pièce justificative d'encaissement et de livraison avicole"
        documentNumber={
          transaction.reference || `REC-${transaction.id.slice(-6).toUpperCase()}`
        }
        date={transaction.date}
        farm={farm}
        badge={{
          text: isPartial
            ? "Acompte (Partiel)"
            : isUnpaid
            ? "À Crédit (Non Réglé)"
            : "Payé / Réglé 100%",
          variant: isPartial ? "warning" : isUnpaid ? "danger" : "success",
        }}
        recipient={recipientInfo}
        watermark={!isPartial && !isUnpaid ? "PAYÉ" : isUnpaid ? "À CRÉDIT" : "ACOMPTE"}
        signatures={[
          {
            title: "Visa du Responsable d'Exploitation",
            subtitle: "Exploitation Avicole (Cachet & Signature)",
            hasStampBox: true,
          },
          {
            title: "Décharge / Signature du Client",
            subtitle: "Mention manuscrite 'Reçu conforme'",
            hasStampBox: true,
          },
        ]}
        notes={
          remaining > 0
            ? `Modalités de règlement : Vente assortie d'un solde restant dû de ${formatFcfa(
                remaining
              )}.${
                transaction.dueDate
                  ? ` Date limite d'échéance convenue au plus tard le ${formatDate(
                      transaction.dueDate
                    )}.`
                  : ""
              }`
            : undefined
        }
      >
        {/* Table des Articles / Prestations */}
        <div className="rounded-xl border border-zinc-200 overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold">
              <tr>
                <th className="py-2.5 px-3">Désignation</th>
                <th className="py-2.5 px-3 text-center">Bande / Origine</th>
                <th className="py-2.5 px-3 text-right">Total Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              <tr>
                <td className="py-3 px-3">
                  <div className="font-bold text-zinc-900">
                    {transaction.category === "EGG_SALE"
                      ? "Vente d'œufs de table"
                      : transaction.category === "BIRD_SALE"
                      ? "Vente de volailles (sujets vifs / abattus)"
                      : transaction.category}
                  </div>
                  {transaction.notes && (
                    <div className="text-[11px] text-zinc-500 italic mt-0.5">
                      {transaction.notes}
                    </div>
                  )}
                </td>
                <td className="py-3 px-3 text-center text-zinc-600 font-mono">
                  {transaction.flockName || "—"}
                </td>
                <td className="py-3 px-3 text-right font-mono font-bold text-zinc-900 text-sm">
                  {formatFcfa(transaction.amountFcfa)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Détail financier & Mode de paiement */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 pt-2">
          {/* Left info box */}
          <div className="space-y-1 text-xs text-zinc-600 sm:max-w-[45%]">
            <div>
              Mode de paiement :{" "}
              <strong className="text-zinc-900">
                {paymentLabels[transaction.paymentMethod] || transaction.paymentMethod}
              </strong>
            </div>
            <div className="text-[11px] text-zinc-500">
              Les marchandises vendues demeurent la propriété de l'exploitation jusqu'au règlement intégral.
            </div>
          </div>

          {/* Right totals box */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3.5 space-y-2 text-xs sm:w-72 shrink-0">
            <div className="flex justify-between items-center text-zinc-600">
              <span>Montant Total Vente :</span>
              <span className="font-mono font-bold text-zinc-900 text-sm">
                {formatFcfa(transaction.amountFcfa)}
              </span>
            </div>

            <div className="flex justify-between items-center text-emerald-800 font-semibold border-t border-zinc-200 pt-2">
              <span>Acompte / Payé :</span>
              <span className="font-mono font-bold">
                {formatFcfa(paidAmount)}
              </span>
            </div>

            {remaining > 0 && (
              <div className="flex justify-between items-center text-rose-700 font-bold bg-rose-50 border border-rose-200 px-2 py-1 rounded-lg">
                <span>Reste Dû :</span>
                <span className="font-mono">{formatFcfa(remaining)}</span>
              </div>
            )}
          </div>
        </div>
      </PrintableDocument>
    </PrintableModal>
  );
}
