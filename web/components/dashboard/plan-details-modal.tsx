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

interface ModuleItem {
  key: string;
  category: string;
  name: string;
  desc: string;
}

const ALL_MODULES: ModuleItem[] = [
  // Production
  { key: "flocks", category: "Volailles & Lots", name: "Lots & Volailles", desc: "Suivi des effectifs, mortalité, réformes et pesées" },
  { key: "eggs", category: "Volailles & Lots", name: "Ramassage des œufs", desc: "Collecte journalière, calibrage et calcul des alvéoles de 30" },

  // Santé
  { key: "health", category: "Santé & Soins", name: "Soins & Vaccins", desc: "Vaccinations, ordonnances et registre des soins vétérinaires" },
  { key: "prophylaxis_program", category: "Santé & Soins", name: "Programmes Vaccinaux 1-Clic", desc: "Génération automatique du calendrier vaccinal selon la souche" },
  { key: "health_alerts", category: "Santé & Soins", name: "Alertes de Mortalité", desc: "Notification temps réel si la mortalité dépasse le seuil critique" },

  // Stocks
  { key: "inventory", category: "Stocks & Aliments", name: "Stocks & Aliments", desc: "Sacs d'aliments, produits vétérinaires et alertes stock bas" },
  { key: "inventory_valuation", category: "Stocks & Aliments", name: "Valeur du stock", desc: "Estimation financière de la valeur du magasin en FCFA" },
  { key: "feed_rationing", category: "Stocks & Aliments", name: "Rationnement & Indice FCR", desc: "Consommation journalière et indice de conversion alimentaire" },

  // Finances
  { key: "finance", category: "Finances & Caisse", name: "Caisse & Ventes", desc: "Ventes, dépenses et caisse en FCFA (MoMo MTN, Moov, Celtiis, Espèces)" },
  { key: "finance_margin", category: "Finances & Caisse", name: "Marges & Bénéfices", desc: "Coût de revient et bénéfice net dégagé par lot" },
  { key: "credit_debt", category: "Finances & Caisse", name: "Créances & Dettes", desc: "Suivi des impayés revendeuses du marché et dettes provenderies" },
  { key: "sales_receipts", category: "Finances & Caisse", name: "Reçus & Factures Imprimables", desc: "Reçus officiels prêts à imprimer avec IFU et en-tête" },
  { key: "reports_accounting", category: "Finances & Caisse", name: "Exports Comptables SYSCOHADA", desc: "Grand livre et journaux d'achats/ventes en CSV et PDF" },

  // Clients & Tiers
  { key: "contacts", category: "Clients & Fournisseurs", name: "Clients & Fournisseurs", desc: "Carnet d'adresses acheteurs, revendeuses et provenderies" },

  // Bâtiments
  { key: "buildings", category: "Bâtiments & Fermes", name: "Bâtiments d'élevage", desc: "Poulaillers, poussinières, capacités et vides sanitaires" },
  { key: "performance_benchmark", category: "Bâtiments & Fermes", name: "Comparatifs Inter-Bâtiments", desc: "Benchmark des taux de ponte et rendements entre poulaillers" },

  // Équipe & Accès
  { key: "team", category: "Équipe & Accès", name: "Équipe & Collaborateurs", desc: "Comptes pour employés, gérants et comptables" },
  { key: "custom_roles", category: "Équipe & Accès", name: "Rôles Sur-Mesure & RBAC", desc: "Création de rôles personnalisés avec matrice de 22 permissions" },

  // Analyses
  { key: "dashboard_advanced", category: "Analyses & Alertes", name: "Analyses Avancées", desc: "Courbes de ponte hebdomadaires et projections consolidées" },

  // Intégrations & Capteurs
  { key: "api_iot", category: "API & Capteurs", name: "API & Capteurs Connectés", desc: "Sondes de température/hygrométrie IoT et clés API développeur" },

  // Assistance & Services
  { key: "priority_support", category: "Assistance & Services", name: "Support Prioritaire WhatsApp", desc: "Assistance zootechnique dédiée et hotline prioritaire" },
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
          <div className="divide-y divide-border rounded-2xl border border-border bg-surface-muted/50 overflow-hidden max-h-[320px] overflow-y-auto pr-1">
            {ALL_MODULES.map((mod) => {
              const isIncluded = modulesList.includes(mod.key);
              return (
                <div
                  key={mod.key}
                  className="flex items-center justify-between p-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-lg shrink-0 ${
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
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-semibold ${
                            isIncluded ? "text-foreground" : "text-muted line-through"
                          }`}
                        >
                          {mod.name}
                        </span>
                        <span className="rounded bg-surface px-1.5 py-0.2 text-[9px] font-semibold text-muted border border-border">
                          {mod.category}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted">{mod.desc}</p>
                    </div>
                  </div>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-bold shrink-0 ${
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
