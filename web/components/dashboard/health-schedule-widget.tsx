"use client";

import React from "react";
import Link from "next/link";
import { HeartPulse, ArrowRight, CheckCircle2 } from "lucide-react";
import { DashboardHealthOverview } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface HealthScheduleWidgetProps {
  health?: DashboardHealthOverview;
}

export function HealthScheduleWidget({
  health,
}: HealthScheduleWidgetProps) {
  if (!health || !health.hasAccess) {
    return null;
  }

  const upcoming = health.upcomingTreatments || [];
  const overdueCount = health.overdueCount || 0;

  return (
    <div className="mt-8 rounded-2xl border border-border bg-surface p-5 shadow-xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 shadow-2xs">
            <HeartPulse className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">
                Santé & Vaccinations prévues
              </h2>
              {overdueCount > 0 && (
                <span className="rounded-md bg-danger/10 px-2 py-0.5 text-[10px] font-bold text-danger">
                  {overdueCount} en retard
                </span>
              )}
            </div>
            <p className="text-xs text-muted">
              Calendrier vaccinal et soins programmés dans les 14 prochains jours.
            </p>
          </div>
        </div>
        <Link
          href="/health"
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground shadow-xs hover:bg-surface-hover transition-colors"
        >
          <span>Gérer tous les soins</span>
          <ArrowRight className="h-3.5 w-3.5 text-muted" />
        </Link>
      </div>

      {upcoming.length > 0 ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {upcoming.map((treatment) => (
            <div
              key={treatment.id}
              className="rounded-xl border border-border bg-surface-muted/40 p-3.5 space-y-2 hover:border-emerald-500/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-bold text-xs text-foreground truncate">
                  {treatment.title}
                </span>
                <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
                  {treatment.type}
                </span>
              </div>
              <div className="text-[11px] text-muted flex items-center justify-between">
                <span>Lot : {treatment.flockName}</span>
                <span className="font-mono font-semibold text-foreground">
                  {formatDate(treatment.scheduledDate)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <div className="text-xs">
            <p className="font-bold text-emerald-800 dark:text-emerald-200">
              Calendrier vaccinal à jour !
            </p>
            <p className="text-muted mt-0.5">
              Aucun soin ou vaccin n'est en attente pour les 14 prochains jours.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
