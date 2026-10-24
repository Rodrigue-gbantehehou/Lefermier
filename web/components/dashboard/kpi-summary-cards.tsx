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
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {/* 1. Cheptel vivant */}
      <StatCard
        title={isBroilerOnly ? "Poulets de chair vivants" : "Poules vivantes"}
        value={`${formatNumber(computedLiveBirds)} sujet${computedLiveBirds > 1 ? "s" : ""}`}
        subtitle={`${flocksCount} groupe(s) en élevage`}
        accent="primary"
        icon={<Bird className="h-5 w-5" />}
      />

      {/* 2. Pertes / Mortalité */}
      <StatCard
        title="Pertes (Mortalité)"
        value={formatPercent(computedMortality)}
        subtitle="Sur l'ensemble des lots en élevage"
        accent={computedMortality > 3 ? "rose" : "primary"}
        icon={<AlertTriangle className="h-5 w-5" />}
        trend={{
          value: computedMortality <= 2 ? "Normal (<3%)" : "Pertes constatées",
          isPositive: computedMortality <= 2,
        }}
      />

      {/* 3. Œufs du jour (Pondeuses & Mixte uniquement si module 'eggs') */}
      {showEggCards && (
        <StatCard
          title="Œufs récoltés aujourd'hui"
          value={`${formatNumber(computedEggsTotal)} œufs`}
          subtitle={
            computedEggsTotal === 0
              ? "Aucune ponte enregistrée aujourd'hui"
              : computedTrays === 0
                ? "Moins d'un plateau de 30 alvéoles"
                : `${computedTrays} plateau${computedTrays > 1 ? "x" : ""}${
                    computedLoose > 0 ? ` + ${computedLoose} œuf${computedLoose > 1 ? "s" : ""}` : " complets"
                  }`
          }
          accent="amber"
          icon={<Egg className="h-5 w-5" />}
        />
      )}

      {/* 4. Taux de ponte (Pondeuses & Mixte uniquement si module 'eggs') */}
      {showEggCards && (
        <StatCard
          title="Rendement de ponte"
          value={formatPercent(computedLayingRate)}
          subtitle="Poules ayant pondu aujourd'hui"
          accent="amber"
          icon={<TrendingUp className="h-5 w-5" />}
          trend={{
            value: computedLayingRate >= 75 ? "Très bonne ponte (>75%)" : "Ponte modérée",
            isPositive: computedLayingRate >= 75,
          }}
        />
      )}

      {/* 5. Caisse & Trésorerie (Module 'finance' uniquement) */}
      {hasFinanceAccess && (
        <StatCard
          title="Argent disponible (Caisse)"
          value={formatFcfa(computedNet)}
          subtitle={`Ventes cumulées : ${formatFcfa(computedRevenue)}`}
          accent={computedNet >= 0 ? "primary" : "rose"}
          icon={<Wallet className="h-5 w-5" />}
          trend={{
            value: computedNet >= 0 ? "Solde positif" : "Caisse en déficit",
            isPositive: computedNet >= 0,
          }}
          className={!showEggCards ? "sm:col-span-1" : "sm:col-span-2 xl:col-span-2"}
        />
      )}

      {/* 6. Stocks & Aliments critiques (Module 'inventory' uniquement) */}
      {hasInventoryAccess && (
        <StatCard
          title="Aliments & Produits bas"
          value={`${computedLowStock} produit${computedLowStock > 1 ? "s" : ""}`}
          subtitle="Articles sous le seuil d'alerte"
          accent={computedLowStock > 0 ? "rose" : "zinc"}
          icon={<Package className="h-5 w-5" />}
          trend={{
            value: computedLowStock === 0 ? "Réserves suffisantes" : "À commander vite",
            isPositive: computedLowStock === 0,
          }}
          className={!showEggCards ? "sm:col-span-1" : "sm:col-span-2 xl:col-span-2"}
        />
      )}

      {/* 7. Santé & Soins (Module 'health' si aucun soin critique ou alerte) */}
      {hasHealthAccess && (
        <StatCard
          title="Santé & Vaccinations"
          value={
            overdueHealthCount > 0
              ? `${overdueHealthCount} en retard`
              : `${pendingHealthCount} prévu(s)`
          }
          subtitle="Soins et vaccins planifiés"
          accent={overdueHealthCount > 0 ? "rose" : "primary"}
          icon={<HeartPulse className="h-5 w-5" />}
          trend={{
            value: overdueHealthCount === 0 ? "À jour" : "Soins urgents",
            isPositive: overdueHealthCount === 0,
          }}
        />
      )}
    </div>
  );
}
