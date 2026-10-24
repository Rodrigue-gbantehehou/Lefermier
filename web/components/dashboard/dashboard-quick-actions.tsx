"use client";

import React from "react";
import {
  RefreshCw,
  Utensils,
  AlertTriangle,
  Wallet,
  Egg,
  HeartPulse,
} from "lucide-react";

interface DashboardQuickActionsProps {
  isLoading: boolean;
  onRefresh: () => void;
  onOpenFeedingModal: () => void;
  onOpenMovementModal: () => void;
  onOpenEggModal?: () => void;
  onOpenFinanceModal?: () => void;
  canCreateFlockMovement: boolean;
  canCreateEgg: boolean;
  canCreateFinance: boolean;
  hasEggAccess: boolean;
  hasFinanceAccess: boolean;
}

export function DashboardQuickActions({
  isLoading,
  onRefresh,
  onOpenFeedingModal,
  onOpenMovementModal,
  onOpenEggModal,
  onOpenFinanceModal,
  canCreateFlockMovement,
  canCreateEgg,
  canCreateFinance,
  hasEggAccess,
  hasFinanceAccess,
}: DashboardQuickActionsProps) {
  return (
    <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-2 sm:gap-2.5">
      {/* Bouton Actualiser */}
      <button
        type="button"
        onClick={onRefresh}
        title="Actualiser les données"
        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 text-xs font-semibold text-foreground shadow-xs hover:bg-surface-hover transition-colors whitespace-nowrap"
      >
        <RefreshCw
          className={`h-3.5 w-3.5 shrink-0 ${
            isLoading ? "animate-spin text-primary" : "text-muted"
          }`}
        />
        <span>Actualiser</span>
      </button>

      {/* Bouton Nourrir (Alimentation rapide) */}
      <button
        type="button"
        onClick={onOpenFeedingModal}
        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-3.5 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition-colors whitespace-nowrap"
      >
        <Utensils className="h-3.5 w-3.5 shrink-0" />
        <span>Nourrir</span>
      </button>

      {/* Bouton Saisir Ponte (si module œufs actif) */}
      {hasEggAccess && canCreateEgg && onOpenEggModal && (
        <button
          type="button"
          onClick={onOpenEggModal}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-accent px-3.5 text-xs font-bold text-white shadow-xs hover:bg-accent-hover transition-colors whitespace-nowrap"
        >
          <Egg className="h-4 w-4 shrink-0" />
          <span>Saisir une ponte</span>
        </button>
      )}

      {/* Bouton Mouvement / Perte */}
      {canCreateFlockMovement && (
        <button
          type="button"
          onClick={onOpenMovementModal}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-danger px-3.5 text-xs font-bold text-white shadow-xs hover:opacity-90 transition-opacity whitespace-nowrap"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Mouvement / Perte</span>
        </button>
      )}

      {/* Bouton Recette / Dépense */}
      {hasFinanceAccess && canCreateFinance && onOpenFinanceModal && (
        <button
          type="button"
          onClick={onOpenFinanceModal}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-primary px-3.5 text-xs font-bold text-white shadow-xs hover:bg-primary-hover transition-colors whitespace-nowrap"
        >
          <Wallet className="h-4 w-4 shrink-0" />
          <span>Recette / Dépense</span>
        </button>
      )}
    </div>
  );
}
