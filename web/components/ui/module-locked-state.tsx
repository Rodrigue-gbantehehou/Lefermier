"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Lock, ArrowLeft, Zap } from "lucide-react";
import { PlanDetailsModal } from "@/components/dashboard/plan-details-modal";
import { useAuth } from "@/context/auth-context";

interface ModuleLockedStateProps {
  moduleName: string;
  description?: string;
  recommendedPlan?: string;
}

export function ModuleLockedState({
  moduleName,
  description,
  recommendedPlan = "Standard ou Pro",
}: ModuleLockedStateProps) {
  const { activePlan } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="mx-auto max-w-xl py-12 px-4 sm:py-20 text-center animate-in fade-in duration-300">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 mb-5 shadow-xs border border-amber-500/20">
        <Lock className="h-8 w-8" />
      </div>

      <div className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted border border-border px-3 py-1 text-xs font-semibold text-muted mb-3">
        <span>Formule actuelle :</span>
        <span className="font-bold text-foreground">
          {activePlan?.planName || "Formule Starter"}
        </span>
      </div>

      <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
        Module non inclus dans votre formule
      </h1>

      <p className="mt-2 text-xs sm:text-sm text-muted max-w-md mx-auto leading-relaxed">
        {description ||
          `La fonctionnalité « ${moduleName} » n'est pas activée sur votre exploitation avec votre formule actuelle.`}
      </p>

      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-xs font-semibold text-foreground shadow-xs hover:bg-surface-hover transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-muted" />
          <span>Retour au tableau de bord</span>
        </Link>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-primary-hover transition-colors"
        >
          <Zap className="h-4 w-4" />
          <span>Voir les détails de l'offre</span>
        </button>
      </div>

      <PlanDetailsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        planName={activePlan?.planName}
        badge={activePlan?.badge}
        activeModules={activePlan?.modules}
      />
    </div>
  );
}
