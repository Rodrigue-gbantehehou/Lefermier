"use client";

import React from "react";
import { X, Check, Lock, Zap, ShieldCheck } from "lucide-react";
import { DashboardSubscription } from "@/lib/types";

interface PlanDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription?: DashboardSubscription;
  planName?: string;
  badge?: string | null;
  activeModules?: string[];
}

const ALL_MODULES = [
  { key: "flocks", name: "Lots & Volailles", desc: "Suivi des effectifs et mortalité" },
  { key: "eggs", name: "Ramassage des œufs", desc: "Collecte journalière et calibrage" },
  { key: "inventory", name: "Stocks & Aliments", desc: "Sacs d'aliments et alertes stock bas" },
  { key: "health", name: "Soins & Vaccins", desc: "Vaccinations et rappels vétérinaires" },
  { key: "finance", name: "Caisse & Ventes", desc: "Recettes des ventes et dépenses" },
  { key: "contacts", name: "Clients & Fournisseurs", desc: "Carnet d'adresses et revendeuses" },
  { key: "buildings", name: "Bâtiments d'élevage", desc: "Poulaillers et capacités" },
  { key: "team", name: "Équipe & Accès", desc: "Comptes employés et rôles" },
  { key: "api_iot", name: "API & Capteurs", desc: "Intégrations IoT et clés d'accès" },
];

export function PlanDetailsModal({
  isOpen,
  onClose,
  subscription,
  planName,
  badge,
  activeModules = [],
}: PlanDetailsModalProps) {
  if (!isOpen) return null;

  const currentPlanName = subscription?.planName || planName || "Formule Starter";
  const currentBadge = subscription?.badge || badge || "Actif";
  const modulesList = subscription?.modules || activeModules;

  const quotas = subscription?.quotas;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-surface border border-border p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">
                  {currentPlanName}
                </h3>
                <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[11px] font-extrabold text-primary">
                  {currentBadge}
                </span>
              </div>
              <p className="text-xs text-muted">
                Détail des modules accessibles et limites de votre exploitation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quotas */}
        {quotas && (
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-muted">
              Limites d'utilisation
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-xl border border-border bg-surface-muted p-2.5 text-center">
                <div className="text-[11px] text-muted">Bandes</div>
                <div className="mt-1 font-mono text-xs font-bold text-foreground">
                  {quotas.flocks.current} / {quotas.flocks.isUnlimited ? "∞" : quotas.flocks.max}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-surface-muted p-2.5 text-center">
                <div className="text-[11px] text-muted">Bâtiments</div>
                <div className="mt-1 font-mono text-xs font-bold text-foreground">
                  {quotas.buildings.current} / {quotas.buildings.isUnlimited ? "∞" : quotas.buildings.max}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-surface-muted p-2.5 text-center">
                <div className="text-[11px] text-muted">Fermes</div>
                <div className="mt-1 font-mono text-xs font-bold text-foreground">
                  {quotas.farms.current} / {quotas.farms.isUnlimited ? "∞" : quotas.farms.max}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-surface-muted p-2.5 text-center">
                <div className="text-[11px] text-muted">Équipe</div>
                <div className="mt-1 font-mono text-xs font-bold text-foreground">
                  {quotas.members.current} / {quotas.members.isUnlimited ? "∞" : quotas.members.max}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Liste des modules */}
        <div className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-muted">
            Modules de la plateforme
          </div>
          <div className="divide-y divide-border rounded-2xl border border-border bg-surface-muted/50 overflow-hidden">
            {ALL_MODULES.map((mod) => {
              const isIncluded = modulesList.includes(mod.key);
              return (
                <div
                  key={mod.key}
                  className="flex items-center justify-between p-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-lg ${
                        isIncluded
                          ? "bg-success/10 text-success"
                          : "bg-muted/10 text-muted"
                      }`}
                    >
                      {isIncluded ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Lock className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <div>
                      <span
                        className={`font-semibold ${
                          isIncluded ? "text-foreground" : "text-muted line-through"
                        }`}
                      >
                        {mod.name}
                      </span>
                      <p className="text-[10px] text-muted">{mod.desc}</p>
                    </div>
                  </div>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                      isIncluded
                        ? "bg-success/15 text-success"
                        : "bg-muted/15 text-muted"
                    }`}
                  >
                    {isIncluded ? "Inclus" : "Offre supérieure"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Info & Upgrade */}
        <div className="rounded-2xl bg-primary/5 border border-primary/20 p-3.5 text-xs text-muted flex items-start gap-2.5">
          <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Pour débloquer plus de bandes, gérer les soins vétérinaires ou activer la trésorerie avancée, faites évoluer votre formule auprès de votre responsable.
          </p>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-primary-hover transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
