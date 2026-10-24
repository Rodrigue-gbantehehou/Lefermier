"use client";

import React from "react";
import { Zap, ArrowRight, AlertTriangle } from "lucide-react";
import { DashboardSubscription } from "@/lib/types";

interface SubscriptionBannerProps {
  subscription?: DashboardSubscription;
  planName?: string;
  badge?: string | null;
  flocksCount: number;
  buildingsCount?: number;
  farmsCount?: number;
  maxFlocks?: number;
  maxBuildings?: number;
  maxFarms?: number;
  onOpenPlanModal: () => void;
}

export function SubscriptionBanner({
  subscription,
  planName,
  badge,
  flocksCount,
  buildingsCount = 0,
  farmsCount = 1,
  maxFlocks = 2,
  maxBuildings = 2,
  maxFarms = 1,
  onOpenPlanModal,
}: SubscriptionBannerProps) {
  const flockQuota = subscription?.quotas?.flocks || {
    current: flocksCount,
    max: maxFlocks,
    percent: Math.min(100, Math.round((flocksCount / maxFlocks) * 100)),
    isExceeded: flocksCount > maxFlocks,
    isUnlimited: maxFlocks >= 9999,
  };

  const buildingQuota = subscription?.quotas?.buildings || {
    current: buildingsCount,
    max: maxBuildings,
    percent: Math.min(100, Math.round((buildingsCount / maxBuildings) * 100)),
    isExceeded: buildingsCount > maxBuildings,
    isUnlimited: maxBuildings >= 9999,
  };

  const farmQuota = subscription?.quotas?.farms || {
    current: farmsCount,
    max: maxFarms,
    percent: Math.min(100, Math.round((farmsCount / maxFarms) * 100)),
    isExceeded: farmsCount > maxFarms,
    isUnlimited: maxFarms >= 9999,
  };

  const isFlockQuotaReached = !flockQuota.isUnlimited && flockQuota.current >= flockQuota.max;
  const isAnyOverQuota = subscription?.isOverQuota || flockQuota.isExceeded || buildingQuota.isExceeded;

  return (
    <div className="mt-6 rounded-2xl border border-border bg-surface p-4 sm:p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/70">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-foreground">
                Formule : {subscription?.planName || planName || "Formule Starter"}
              </span>
              <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-extrabold text-primary">
                {subscription?.badge || badge || "Actif"}
              </span>
              {isAnyOverQuota && (
                <span className="rounded-md bg-danger/15 px-2 py-0.5 text-[10px] font-bold text-danger">
                  Quota dépassé
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted">
              Quotas d'utilisation et modules actifs sur votre ferme.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenPlanModal}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface-muted px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-hover hover:border-primary/40 transition-colors shrink-0 self-start sm:self-auto"
        >
          <span>Détails & Modules</span>
          <ArrowRight className="h-3 w-3 text-muted" />
        </button>
      </div>

      {/* Jauges Quotas */}
      <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Bandes */}
        <div className="rounded-xl border border-border/80 bg-surface-muted/60 p-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">Bandes de volailles</span>
            <span className="font-mono font-bold text-foreground">
              {flockQuota.current} / {flockQuota.isUnlimited ? "Illimité" : flockQuota.max}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-border overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                flockQuota.isExceeded || flockQuota.percent >= 100
                  ? "bg-danger"
                  : flockQuota.percent >= 80
                    ? "bg-amber-500"
                    : "bg-primary"
              }`}
              style={{ width: `${Math.min(100, flockQuota.percent)}%` }}
            />
          </div>
          <div className="text-[10px] text-muted">
            {flockQuota.isUnlimited
              ? "Aucune limite sur les bandes"
              : flockQuota.isExceeded
                ? "Limite dépassée"
                : `${Math.max(0, flockQuota.max - flockQuota.current)} place(s) restante(s)`}
          </div>
        </div>

        {/* Bâtiments */}
        <div className="rounded-xl border border-border/80 bg-surface-muted/60 p-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">Bâtiments d'élevage</span>
            <span className="font-mono font-bold text-foreground">
              {buildingQuota.current} / {buildingQuota.isUnlimited ? "Illimité" : buildingQuota.max}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-border overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                buildingQuota.isExceeded || buildingQuota.percent >= 100
                  ? "bg-danger"
                  : buildingQuota.percent >= 80
                    ? "bg-amber-500"
                    : "bg-primary"
              }`}
              style={{ width: `${Math.min(100, buildingQuota.percent)}%` }}
            />
          </div>
          <div className="text-[10px] text-muted">
            {buildingQuota.isUnlimited
              ? "Bâtiments illimités"
              : `${Math.max(0, buildingQuota.max - buildingQuota.current)} bâtiment(s) disponible(s)`}
          </div>
        </div>

        {/* Fermes organisation */}
        <div className="rounded-xl border border-border/80 bg-surface-muted/60 p-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">Fermes rattachées</span>
            <span className="font-mono font-bold text-foreground">
              {farmQuota.current} / {farmQuota.isUnlimited ? "Illimité" : farmQuota.max}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-border overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                farmQuota.isExceeded || farmQuota.percent >= 100
                  ? "bg-danger"
                  : farmQuota.percent >= 80
                    ? "bg-amber-500"
                    : "bg-primary"
              }`}
              style={{ width: `${Math.min(100, farmQuota.percent)}%` }}
            />
          </div>
          <div className="text-[10px] text-muted">
            {farmQuota.isUnlimited
              ? "Fermes illimitées"
              : `${Math.max(0, farmQuota.max - farmQuota.current)} ferme(s) restante(s)`}
          </div>
        </div>
      </div>

      {/* Alerte si le quota de bandes est atteint */}
      {isFlockQuotaReached && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5 text-xs text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              Quota de bandes atteint ({flockQuota.current}/{flockQuota.max}). Pour ajouter un nouveau groupe, passez à la formule supérieure.
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenPlanModal}
            className="text-[11px] font-bold text-amber-700 dark:text-amber-200 underline hover:no-underline shrink-0"
          >
            Voir les options
          </button>
        </div>
      )}
    </div>
  );
}
