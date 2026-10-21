"use client";

import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Flock, Farm } from "@/lib/types";
import { formatDate, formatNumber, formatFcfa, formatPercent, calcEggTrays } from "@/lib/utils";
import { PrintableDocument, PrintableModal } from "@/components/pdf";

interface FlockSummaryReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  flock: Flock | null;
  farm: Farm | null;
  eggTotal?: number;
  totalIncome?: number;
  totalExpense?: number;
  grossMargin?: number;
}

export function FlockSummaryReportModal({
  isOpen,
  onClose,
  flock,
  farm,
  eggTotal = 0,
  totalIncome = 0,
  totalExpense = 0,
  grossMargin = 0,
}: FlockSummaryReportModalProps) {
  if (!flock) return null;

  const initialQty = flock.initialQuantity || 1;
  const currentQty = flock.currentQuantity !== undefined ? flock.currentQuantity : initialQty;
  const totalLosses = Math.max(0, initialQty - currentQty);
  const finalMortalityRate = (totalLosses / initialQty) * 100;
  const traysInfo = calcEggTrays(eggTotal);
  const marginPerBird = Math.round(grossMargin / initialQty);
  const isClosed = flock.status === "DEPLETED" || flock.status === "SOLD";

  return (
    <PrintableModal
      isOpen={isOpen}
      onClose={onClose}
      title="Bilan Technique & Financier de Bande"
      description="Rapport officiel de synthèse pour l'archivage de fin de lot ou la présentation aux partenaires."
      farm={farm}
      downloadEndpoint={`/flocks/${flock.id}/report/pdf?download=1`}
      defaultFilename={`bilan-bande-${(flock.code || flock.id.slice(-6)).toLowerCase()}.pdf`}
    >
      <PrintableDocument
        id="printable-flock-report"
        title="Bilan de Bande Avicole"
        subtitle={`Synthèse zootechnique & compte d'exploitation — Lot ${flock.code || flock.name}`}
        documentNumber={`BIL-${flock.code || flock.id.slice(-6).toUpperCase()}`}
        farm={farm}
        badge={{
          text: isClosed ? "Lot Clôturé / Réformé" : "Actif en Production",
          variant: isClosed ? "neutral" : "success",
        }}
        watermark={isClosed ? "CLÔTURÉ" : "ACTIF"}
        signatures={[
          {
            title: "Le Chef d'Exploitation Avicole",
            subtitle: "Exploitation (Cachet & Signature)",
            hasStampBox: true,
          },
          {
            title: "Le Vétérinaire Conseil / Auditeur",
            subtitle: "Contrôle sanitaire et prophylactique",
            hasStampBox: true,
          },
        ]}
        notes={
          flock.notes
            ? `Bilan sanitaire & Observations : ${flock.notes}`
            : "Lot conduit selon le calendrier prophylactique standard de l'exploitation. Performances conformes aux fiches techniques de la souche."
        }
      >
        {/* Section 1 : Fiche d'Identité du Lot */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5 text-xs">
          <div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase block">Code Bande :</span>
            <span className="font-mono font-bold text-zinc-900">{flock.code || "—"}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase block">Nom du Lot :</span>
            <span className="font-bold text-zinc-900">{flock.name}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase block">Type / Souche :</span>
            <span className="font-bold text-zinc-900">
              {flock.type === "LAYER" ? "Pondeuses" : "Poulets de chair"} ({flock.breed || flock.strain || "Standard"})
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase block">Poulailler :</span>
            <span className="font-bold text-zinc-900">{flock.buildingName || "Non assigné"}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase block">Date d'arrivée :</span>
            <span className="font-mono text-zinc-800">{formatDate(flock.startDate)}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase block">Date de clôture :</span>
            <span className="font-mono text-zinc-800">
              {flock.actualEndDate
                ? formatDate(flock.actualEndDate)
                : flock.expectedEndDate
                ? formatDate(flock.expectedEndDate)
                : "En cours"}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase block">Âge atteint :</span>
            <span className="font-bold text-emerald-800">
              {flock.ageInWeeks
                ? `${flock.ageInWeeks} semaines`
                : flock.ageInDays
                ? `${flock.ageInDays} jours`
                : "—"}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase block">Statut :</span>
            <span className="font-bold text-zinc-900">
              {isClosed ? "Clôturé / Réformé" : "Actif en production"}
            </span>
          </div>
        </div>

        {/* Section 2 : Performances Zootechniques & Mortalité */}
        <div>
          <h3 className="text-xs font-extrabold uppercase text-emerald-800 tracking-wider mb-2.5 pb-1 border-b border-zinc-200">
            1. Performances Zootechniques & Mortalité
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded-xl border border-zinc-200 bg-white p-3">
              <span className="text-[10px] text-zinc-500 block">Effectif Initial</span>
              <span className="text-sm font-extrabold text-zinc-900 font-mono">
                {formatNumber(initialQty)} <span className="text-[10px] font-normal text-zinc-500">sujets</span>
              </span>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-3">
              <span className="text-[10px] text-zinc-500 block">Effectif Sorti / Vivant</span>
              <span className="text-sm font-extrabold text-zinc-900 font-mono">
                {formatNumber(currentQty)} <span className="text-[10px] font-normal text-zinc-500">sujets</span>
              </span>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-3">
              <span className="text-[10px] text-zinc-500 block">Pertes (morts)</span>
              <span className="text-sm font-extrabold text-rose-700 font-mono">
                {formatNumber(totalLosses)} <span className="text-[10px] font-normal text-zinc-500">sujets</span>
              </span>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-3">
              <span className="text-[10px] text-zinc-500 block">Taux Mortalité Final</span>
              <span
                className={`text-sm font-extrabold font-mono ${
                  finalMortalityRate > 5 ? "text-rose-700" : "text-emerald-700"
                }`}
              >
                {formatPercent(finalMortalityRate)}
              </span>
            </div>
          </div>

          {/* Pontes si pondeuses */}
          {flock.type === "LAYER" && (
            <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5 text-xs flex items-center justify-between">
              <div>
                <span className="font-bold text-zinc-900 block">
                  Production Cumulée d'Œufs de table :
                </span>
                <span className="text-[11px] text-zinc-500">
                  Standards ouest-africains (alvéoles de 30 œufs).
                </span>
              </div>
              <div className="text-right">
                <span className="text-base font-extrabold text-emerald-800 font-mono block">
                  {formatNumber(eggTotal)} œufs
                </span>
                <span className="text-xs font-bold text-zinc-800">
                  {traysInfo.trays} plateaux {traysInfo.loose > 0 ? `+ ${traysInfo.loose} œufs` : ""}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Section 3 : Compte d'Exploitation & Marge */}
        <div>
          <h3 className="text-xs font-extrabold uppercase text-emerald-800 tracking-wider mb-2.5 pb-1 border-b border-zinc-200">
            2. Compte d'Exploitation & Marge Nette du Lot
          </h3>
          <div className="rounded-xl border border-zinc-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-zinc-50 text-zinc-600 text-[11px] border-b border-zinc-200">
                <tr>
                  <th className="text-left py-2 px-3 font-semibold">Poste Comptable</th>
                  <th className="text-right py-2 px-3 font-semibold">Montant (FCFA)</th>
                  <th className="text-right py-2 px-3 font-semibold">Par Sujet Initial</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-emerald-800 flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Recettes Totales (Ventes d'œufs & volailles)</span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800">
                    {formatFcfa(totalIncome)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-zinc-600">
                    {formatFcfa(Math.round(totalIncome / initialQty))} / sujet
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-rose-700 flex items-center gap-1.5">
                    <TrendingDown className="h-3.5 w-3.5 text-rose-600" />
                    <span>Charges Opérationnelles (Aliments, poussins, soins)</span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                    {formatFcfa(totalExpense)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-zinc-600">
                    {formatFcfa(Math.round(totalExpense / initialQty))} / sujet
                  </td>
                </tr>
                <tr className="bg-zinc-50/80 font-bold text-zinc-900">
                  <td className="py-3 px-3 uppercase text-xs">
                    Marge Nette Dégagée (Bénéfice Exploitation)
                  </td>
                  <td
                    className={`py-3 px-3 text-right font-mono text-sm ${
                      grossMargin >= 0 ? "text-emerald-800 font-extrabold" : "text-rose-700"
                    }`}
                  >
                    {formatFcfa(grossMargin)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-emerald-800 font-extrabold">
                    {formatFcfa(marginPerBird)} / sujet
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </PrintableDocument>
    </PrintableModal>
  );
}
