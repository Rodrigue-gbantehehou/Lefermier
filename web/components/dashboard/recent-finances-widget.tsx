"use client";

import React from "react";
import Link from "next/link";
import { Wallet, ArrowRight, Plus } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Transaction } from "@/lib/types";
import { formatDate, formatFcfa } from "@/lib/utils";

interface RecentFinancesWidgetProps {
  recentTransactions: Transaction[];
  canCreateFinance: boolean;
  onOpenCreateFinanceModal: () => void;
}

export function RecentFinancesWidget({
  recentTransactions,
  canCreateFinance,
  onOpenCreateFinanceModal,
}: RecentFinancesWidgetProps) {
  const paymentLabels: Record<string, string> = {
    CASH: "Espèces",
    MTN_MOMO: "MoMo MTN",
    MOOV_MONEY: "Moov Money",
    CELTIIS_CASH: "Celtiis Cash",
    BANK_TRANSFER: "Virement",
    CHECK: "Chèque",
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary shadow-2xs">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Dernières opérations
              </h2>
              <p className="text-xs text-muted">
                Ventes encaissées et dépenses récentes
              </p>
            </div>
          </div>
          <Link
            href="/finances"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            <span>Voir tout</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <EmptyState
            icon={<Wallet className="h-6 w-6 text-primary" />}
            title="Aucune opération récente"
            description="Enregistrez vos ventes d'œufs ou vos dépenses en aliments."
            actionLabel={canCreateFinance ? "Nouvelle opération" : undefined}
            onAction={onOpenCreateFinanceModal}
            className="my-4 border-none"
          />
        ) : (
          <>
            {/* Mobile Cards View (< md) */}
            <div className="mt-4 space-y-2.5 md:hidden">
              {recentTransactions.map((tx) => {
                const isIncome = tx.type === "INCOME";
                return (
                  <div
                    key={tx.id}
                    className="rounded-xl border border-border bg-surface p-3 space-y-1.5 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-xs text-foreground block">
                          {tx.category}
                        </span>
                        <span className="text-[10px] text-muted">
                          {formatDate(tx.date)} • {paymentLabels[tx.paymentMethod] || tx.paymentMethod}
                        </span>
                      </div>
                      <span
                        className={`font-mono font-bold text-xs shrink-0 ${
                          isIncome ? "text-success" : "text-danger"
                        }`}
                      >
                        {isIncome ? "+" : "-"}
                        {formatFcfa(tx.amountFcfa)}
                      </span>
                    </div>
                    {tx.notes && (
                      <p className="text-[11px] text-muted truncate border-t border-border/40 pt-1 mt-1">
                        {tx.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop Table (>= md) */}
            <div className="hidden md:block mt-4 overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="w-full min-w-[460px] text-left text-xs">
                <thead className="bg-surface-muted text-muted">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold rounded-l-lg whitespace-nowrap">
                      Date
                    </th>
                    <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Opération</th>
                    <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Paiement</th>
                    <th className="py-2.5 px-3 font-semibold text-right rounded-r-lg whitespace-nowrap">
                      Montant
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentTransactions.map((tx) => {
                    const isIncome = tx.type === "INCOME";
                    return (
                      <tr key={tx.id} className="hover:bg-surface-hover transition-colors">
                        <td className="py-3 px-3 text-muted whitespace-nowrap">
                          {formatDate(tx.date)}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-foreground block">
                            {tx.category}
                          </span>
                          {tx.notes && (
                            <span className="text-[11px] text-muted truncate max-w-[140px] block">
                              {tx.notes}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-muted">
                          <span className="text-xs font-medium text-muted">
                            {paymentLabels[tx.paymentMethod] || tx.paymentMethod}
                          </span>
                        </td>
                        <td
                          className={`py-3 px-3 text-right font-mono font-bold whitespace-nowrap ${
                            isIncome ? "text-success" : "text-danger"
                          }`}
                        >
                          {isIncome ? "+" : "-"}
                          {formatFcfa(tx.amountFcfa)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {canCreateFinance && (
        <div className="mt-4 pt-3 border-t border-border flex justify-end">
          <button
            type="button"
            onClick={onOpenCreateFinanceModal}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-primary-hover transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Noter une opération</span>
          </button>
        </div>
      )}
    </div>
  );
}
