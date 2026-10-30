"use client";

import React from "react";
import {
  Utensils,
  AlertTriangle,
  Wallet,
  Egg,
} from "lucide-react";

interface DashboardQuickActionsProps {
  isLoading?: boolean;
  onRefresh?: () => void;
  onOpenFeedingModal: () => void;
  onOpenMovementModal: () => void;
  onOpenEggModal?: () => void;
  onOpenFinanceModal?: (type?: "INCOME" | "EXPENSE") => void;
  canCreateFlockMovement?: boolean;
  canCreateEgg?: boolean;
  canCreateFinance?: boolean;
  canFeed?: boolean;
  hasEggAccess?: boolean;
  hasFinanceAccess?: boolean;
}

export function DashboardQuickActions({
  onOpenFeedingModal,
  onOpenMovementModal,
  onOpenEggModal,
  onOpenFinanceModal,
  canCreateFlockMovement = true,
  canCreateEgg = true,
  canCreateFinance = true,
  canFeed = true,
  hasEggAccess = true,
  hasFinanceAccess = true,
}: DashboardQuickActionsProps) {
  const showEgg = hasEggAccess && canCreateEgg && Boolean(onOpenEggModal);
  const showFinance = hasFinanceAccess && canCreateFinance && Boolean(onOpenFinanceModal);

  return (
    <div className="rounded-2xl border border-border bg-surface p-3 sm:p-4 shadow-xs">
      <div className="flex items-center justify-around gap-2 sm:gap-4">
        {/* 1. Ramasser (Ponte) */}
        {showEgg && onOpenEggModal && (
          <button
            type="button"
            onClick={onOpenEggModal}
            className="group flex flex-col items-center gap-1.5 focus:outline-none cursor-pointer"
          >
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/25 shadow-2xs group-hover:bg-amber-500/20 group-active:scale-95 transition-all">
              <Egg className="h-5 w-5 sm:h-6 sm:w-6 transition-transform group-hover:scale-110" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-foreground text-center truncate max-w-full">
              Ramasser
            </span>
          </button>
        )}

        {/* 2. Nourrir */}
        {canFeed && (
          <button
            type="button"
            onClick={onOpenFeedingModal}
            className="group flex flex-col items-center gap-1.5 focus:outline-none cursor-pointer"
          >
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/25 shadow-2xs group-hover:bg-emerald-500/20 group-active:scale-95 transition-all">
              <Utensils className="h-5 w-5 sm:h-6 sm:w-6 transition-transform group-hover:scale-110" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-foreground text-center truncate max-w-full">
              Nourrir
            </span>
          </button>
        )}

        {/* 3. Mortalité */}
        {canCreateFlockMovement && (
          <button
            type="button"
            onClick={onOpenMovementModal}
            className="group flex flex-col items-center gap-1.5 focus:outline-none"
          >
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/25 shadow-2xs group-hover:bg-rose-500/20 group-active:scale-95 transition-all">
              <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 transition-transform group-hover:scale-110" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-foreground text-center truncate max-w-full">
              Mortalité
            </span>
          </button>
        )}

        {/* 4. Encaisser */}
        {showFinance && onOpenFinanceModal && (
          <button
            type="button"
            onClick={() => onOpenFinanceModal("INCOME")}
            className="group flex flex-col items-center gap-1.5 focus:outline-none"
          >
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/25 shadow-2xs group-hover:bg-primary/20 group-active:scale-95 transition-all">
              <Wallet className="h-5 w-5 sm:h-6 sm:w-6 transition-transform group-hover:scale-110" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-foreground text-center truncate max-w-full">
              Encaisser
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
