"use client";

import React from "react";
import Link from "next/link";
import { Egg, ArrowRight, Edit3, Plus } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { EggProduction } from "@/lib/types";
import { formatDate, formatNumber, formatEggTraysSummary } from "@/lib/utils";

interface RecentEggsWidgetProps {
  recentEggs: EggProduction[];
  canCreateEgg: boolean;
  onOpenCreateEggModal: () => void;
  onOpenEditEggModal: (egg: EggProduction) => void;
}

export function RecentEggsWidget({
  recentEggs,
  canCreateEgg,
  onOpenCreateEggModal,
  onOpenEditEggModal,
}: RecentEggsWidgetProps) {
  const sessionMap: Record<string, string> = {
    MORNING: "Matin",
    NOON: "Midi",
    EVENING: "Soir",
    ALL_DAY: "Journée",
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent shadow-2xs">
              <Egg className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Derniers ramassages d'œufs
              </h2>
              <p className="text-xs text-muted">
                Récoltes récentes et alvéoles de ponte
              </p>
            </div>
          </div>
          <Link
            href="/eggs"
            className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
          >
            <span>Voir tout</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recentEggs.length === 0 ? (
          <EmptyState
            icon={<Egg className="h-6 w-6 text-accent" />}
            title="Aucun ramassage récent"
            description="Enregistrez la récolte d'œufs du jour pour suivre votre ponte."
            actionLabel={canCreateEgg ? "Saisir une ponte" : undefined}
            onAction={onOpenCreateEggModal}
            className="my-4 border-none"
          />
        ) : (
          <>
            {/* Mobile Cards View (< md) */}
            <div className="mt-4 space-y-2.5 md:hidden">
              {recentEggs.map((egg) => (
                <div
                  key={egg.id}
                  className="rounded-xl border border-border bg-surface p-3 space-y-2 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-border/50 pb-2">
                    <div>
                      <span className="font-bold text-xs text-foreground block">
                        {formatDate(egg.date)}
                      </span>
                      <span className="text-[10px] text-muted">
                        {sessionMap[egg.session] || egg.session} • {egg.flockName || "Pondeuses"}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold font-mono text-xs text-accent block">
                        {formatEggTraysSummary(egg.traysCount, egg.looseEggs, egg.goodEggs)}
                      </span>
                      <span className="text-[10px] text-muted font-mono">
                        {formatNumber(egg.goodEggs)} œufs
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <span className="text-[11px] text-muted">
                      Cassés :{" "}
                      {egg.brokenEggs > 0 ? (
                        <span className="text-danger font-semibold">-{egg.brokenEggs}</span>
                      ) : (
                        "0"
                      )}
                    </span>
                    {canCreateEgg && (
                      <button
                        type="button"
                        onClick={() => onOpenEditEggModal(egg)}
                        title="Modifier ce ramassage"
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-muted px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-surface-hover hover:border-accent hover:text-accent transition-colors"
                      >
                        <Edit3 className="h-3 w-3" />
                        <span>Modifier</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (>= md) */}
            <div className="hidden md:block mt-4 overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="w-full min-w-[500px] text-left text-xs">
                <thead className="bg-surface-muted text-muted">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold rounded-l-lg whitespace-nowrap">
                      Date & Moment
                    </th>
                    <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Groupe</th>
                    <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">
                      Plateaux de 30
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">
                      Cassés
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">
                      Total
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right rounded-r-lg whitespace-nowrap">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentEggs.map((egg) => (
                    <tr key={egg.id} className="hover:bg-surface-hover transition-colors">
                      <td className="py-3 px-3 font-semibold text-foreground">
                        <div>{formatDate(egg.date)}</div>
                        <span className="text-[10px] text-muted">
                          {sessionMap[egg.session] || egg.session}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-muted">
                        {egg.flockName || "Pondeuses"}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-accent">
                        {formatEggTraysSummary(egg.traysCount, egg.looseEggs, egg.goodEggs)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        {egg.brokenEggs > 0 ? (
                          <span className="text-danger font-semibold">-{egg.brokenEggs}</span>
                        ) : (
                          <span className="text-muted">0</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-foreground">
                        {formatNumber(egg.goodEggs)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {canCreateEgg && (
                          <button
                            type="button"
                            onClick={() => onOpenEditEggModal(egg)}
                            title="Modifier ce ramassage"
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-muted px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-surface-hover hover:border-accent hover:text-accent transition-colors"
                          >
                            <Edit3 className="h-3 w-3" />
                            <span>Modifier</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {canCreateEgg && (
        <div className="mt-4 pt-3 border-t border-border flex justify-end">
          <button
            type="button"
            onClick={onOpenCreateEggModal}
            className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-accent-hover transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Noter un ramassage</span>
          </button>
        </div>
      )}
    </div>
  );
}
