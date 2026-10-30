"use client";

import React from "react";
import {
  Bird,
  AlertTriangle,
  Egg,
  TrendingUp,
  Wallet,
  Package,
  HeartPulse,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { formatNumber, formatPercent, formatFcfa } from "@/lib/utils";

interface KpiSummaryCardsProps {
  computedLiveBirds: number;
  flocksCount: number;
  computedMortality: number;
  productionType?: "LAYER" | "BROILER" | "MIXED";
  hasEggAccess: boolean;
  computedEggsTotal: number;
  computedTrays: number;
  computedLoose: number;
  computedLayingRate: number;
  hasFinanceAccess: boolean;
  computedNet: number;
  computedRevenue: number;
  hasInventoryAccess: boolean;
  computedLowStock: number;
  hasHealthAccess?: boolean;
  overdueHealthCount?: number;
  pendingHealthCount?: number;
}

export function KpiSummaryCards({
  computedLiveBirds,
  flocksCount,
  computedMortality,
  productionType = "LAYER",
  hasEggAccess,
  computedEggsTotal,
  computedTrays,
  computedLoose,
  computedLayingRate,
  hasFinanceAccess,
  computedNet,
  computedRevenue,
  hasInventoryAccess,
  computedLowStock,
  hasHealthAccess,
  overdueHealthCount = 0,
  pendingHealthCount = 0,
}: KpiSummaryCardsProps) {
  const isBroilerOnly = productionType === "BROILER";
  const showEggCards = hasEggAccess && !isBroilerOnly;

  return (
    <div className="mt-4 sm:mt-6 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. Cheptel vivant */}
      <StatCard
        title={isBroilerOnly ? "Poulets de chair" : "Poules pondeuses"}
        value={formatNumber(computedLiveBirds)}
        subtitle={`${flocksCount} lot${flocksCount > 1 ? "s" : ""}`}
        accent="primary"
        icon={<Bird className="h-5 w-5" />}
      />

      {/* 2. Pertes / Mortalité */}
      <StatCard
        title="Mortalité"
        value={formatPercent(computedMortality)}
        accent={computedMortality > 3 ? "rose" : "primary"}
        icon={<AlertTriangle className="h-5 w-5" />}
      />

      {/* 3. Œufs du jour (Pondeuses & Mixte uniquement si module 'eggs') */}
      {showEggCards && (
        <StatCard
          title="Ponte du jour"
          value={formatNumber(computedEggsTotal)}
          subtitle={computedTrays > 0 ? `${computedTrays} plateau${computedTrays > 1 ? "x" : ""}` : undefined}
          accent="amber"
          icon={<Egg className="h-5 w-5" />}
        />
      )}

      {/* 4. Taux de ponte (Pondeuses & Mixte uniquement si module 'eggs') */}
      {showEggCards && (
        <StatCard
          title="Taux de ponte"
          value={formatPercent(computedLayingRate)}
          accent="amber"
          icon={<TrendingUp className="h-5 w-5" />}
        />
      )}

      {/* 5. Caisse & Trésorerie (Module 'finance' uniquement) */}
      {hasFinanceAccess && (
        <StatCard
          title="Solde de caisse"
          value={formatFcfa(computedNet)}
          accent={computedNet >= 0 ? "primary" : "rose"}
          icon={<Wallet className="h-5 w-5" />}
          className={!showEggCards ? "col-span-2 sm:col-span-1" : "col-span-2 xl:col-span-2"}
        />
      )}

      {/* 6. Stocks & Aliments critiques (Module 'inventory' uniquement) */}
      {hasInventoryAccess && (
        <StatCard
          title="Alertes stock"
          value={computedLowStock > 0 ? `${computedLowStock} critique(s)` : "Normal"}
          accent={computedLowStock > 0 ? "rose" : "zinc"}
          icon={<Package className="h-5 w-5" />}
          className={!showEggCards ? "sm:col-span-1" : "sm:col-span-2 xl:col-span-2"}
        />
      )}

      {/* 7. Santé & Soins (Module 'health' si aucun soin critique ou alerte) */}
      {hasHealthAccess && (
        <StatCard
          title="Santé & Soins"
          value={
            overdueHealthCount > 0
              ? `${overdueHealthCount} en retard`
              : pendingHealthCount > 0
              ? `${pendingHealthCount} à faire`
              : "À jour"
          }
          accent={overdueHealthCount > 0 ? "rose" : "primary"}
          icon={<HeartPulse className="h-5 w-5" />}
        />
      )}
    </div>
  );
}

