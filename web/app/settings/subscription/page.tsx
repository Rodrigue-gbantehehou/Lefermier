"use client";

import React, { useEffect, useState } from "react";
import {
  CreditCard,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles,
  Users,
  Building2,
  Bird,
  BarChart3,
  HeartPulse,
  Package,
  Wallet,
  MessageSquare,
  ArrowUpRight,
  Star,
  X,
  Check,
  Zap,
  Shield,
} from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { useAuth } from "@/context/auth-context";
import { api, PublicPlan } from "@/lib/api-client";
import { cn } from "@/lib/utils";

/* ─── Constantes ─── */

const MODULE_LABELS: Record<string, string> = {
  flocks: "Lots & Volailles",
  eggs: "Ramassage des œufs",
  health: "Soins & Vaccins",
  health_alerts: "Alertes de Mortalité",
  prophylaxis_program: "Programmes Vaccinaux",
  inventory: "Stocks & Aliments",
  inventory_valuation: "Valorisation du Stock",
  feed_rationing: "Rationnement & IC",
  finance: "Caisse & Ventes",
  finance_margin: "Marges & Bénéfices",
  credit_debt: "Créances & Dettes",
  sales_receipts: "Reçus & Factures",
  reports_accounting: "Exports SYSCOHADA",
  contacts: "Clients & Fournisseurs",
  buildings: "Bâtiments d'élevage",
  performance_benchmark: "Comparatifs Inter-Bâtiments",
  team: "Équipe & Collaborateurs",
  custom_roles: "Rôles Sur-Mesure",
  dashboard_advanced: "Analyses Avancées",
  api_iot: "API & Capteurs IoT",
  priority_support: "Support Prioritaire WhatsApp",
};

const PLAN_ACCENT: Record<string, { tier: string; ring: string; cta: string }> = {
  FREE: {
    tier: "text-muted",
    ring: "border-border",
    cta: "bg-surface-hover hover:bg-surface-muted text-foreground border border-border",
  },
  STANDARD: {
    tier: "text-info",
    ring: "border-info/30",
    cta: "bg-info/10 hover:bg-info/20 text-info border border-info/30",
  },
  PRO: {
    tier: "text-primary",
    ring: "border-primary/30",
    cta: "bg-primary hover:bg-primary-hover text-white",
  },
};

function getAccent(sku: string) {
  return PLAN_ACCENT[sku] ?? PLAN_ACCENT.FREE;
}

const PLAN_ORDER = ["FREE", "STANDARD", "PRO", "ENTERPRISE"];

/* ─── Sous-composant PlanCard ─── */

interface PlanCardProps {
  plan: PublicPlan;
  currentSku: string;
  billingCycle: "MONTHLY" | "ANNUALLY";
  onSelect: (plan: PublicPlan) => void;
}

function PlanCard({ plan, currentSku, billingCycle, onSelect }: PlanCardProps) {
  const accent = getAccent(plan.sku);
  const isCurrent = plan.sku === currentSku;
  const isUp = PLAN_ORDER.indexOf(plan.sku) > PLAN_ORDER.indexOf(currentSku);

  const price =
    billingCycle === "ANNUALLY" && plan.allowedBillingCycles.includes("ANNUALLY")
      ? plan.priceAnnually
      : plan.priceMonthly;
  const priceLabel = billingCycle === "ANNUALLY" ? "/ an" : "/ mois";

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border bg-surface p-5 transition-all duration-150",
        isCurrent ? "border-primary ring-1 ring-primary/20 shadow-xs" : accent.ring,
        plan.isRecommended && !isCurrent && "shadow-xs"
      )}
    >
      {/* Badge flottant */}
      {isCurrent && (
        <div className="absolute -top-3 left-4">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
            <Check className="h-2.5 w-2.5" />
            Offre active
          </span>
        </div>
      )}
      {plan.isRecommended && !isCurrent && (
        <div className="absolute -top-3 left-4">
          <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
            <Star className="h-2.5 w-2.5" />
            Recommandé
          </span>
        </div>
      )}

      {/* En-tête */}
      <div className="mb-4 space-y-1">
        <div className="flex items-center justify-between">
          <span className={cn("text-[10px] font-bold uppercase tracking-wider", accent.tier)}>
            {plan.tier}
          </span>
          {plan.badge && (
            <Badge variant="neutral" className="text-[10px] font-bold">
              {plan.badge}
            </Badge>
          )}
        </div>
        <h3 className="text-sm font-bold text-foreground">{plan.name}</h3>
        {plan.description && (
          <p className="text-xs text-muted leading-relaxed line-clamp-2">{plan.description}</p>
        )}
      </div>

      {/* Prix */}
      <div className="mb-4 pb-4 border-b border-border">
        {plan.priceMonthly === 0 ? (
          <span className="text-2xl font-extrabold text-foreground">Gratuit</span>
        ) : (
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-foreground">
              {new Intl.NumberFormat("fr-FR").format(price)}
            </span>
            <span className="text-xs text-muted">FCFA {priceLabel}</span>
          </div>
        )}
        {plan.trialDays > 0 && !isCurrent && (
          <p className="text-[11px] text-success mt-1 font-medium flex items-center gap-1">
            <Check className="h-3 w-3" />
            {plan.trialDays} jours d'essai gratuit
          </p>
        )}
      </div>

      {/* Modules inclus */}
      <div className="flex-1 space-y-1.5 mb-4">
        {plan.modules.slice(0, 6).map((mod) => (
          <div key={mod} className="flex items-center gap-2 text-xs">
            <Check className="h-3.5 w-3.5 shrink-0 text-success" />
            <span className="text-muted truncate">{MODULE_LABELS[mod] ?? mod}</span>
          </div>
        ))}
        {plan.modules.length > 6 && (
          <p className="text-[11px] text-muted pl-5">
            + {plan.modules.length - 6} modules supplémentaires
          </p>
        )}
      </div>

      {/* Quotas */}
      <div className="grid grid-cols-2 gap-1.5 mb-4 text-center">
        {[
          { label: "Fermes", val: plan.quotas.maxFarms },
          { label: "Bandes", val: plan.quotas.maxFlocks },
          { label: "Membres", val: plan.quotas.maxMembers },
          { label: "Bâtiments", val: plan.quotas.maxBuildings },
        ].map(({ label, val }) => (
          <div key={label} className="rounded-lg border border-border bg-surface-muted px-2 py-1.5">
            <p className="text-xs font-bold text-foreground">{val >= 9999 ? "∞" : val}</p>
            <p className="text-[10px] text-muted">{label}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      {isCurrent ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-success/30 bg-success/5 py-2.5 text-xs font-bold text-success">
          <CheckCircle2 className="h-4 w-4" />
          Offre active
        </div>
      ) : (
        <button
          onClick={() => onSelect(plan)}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all cursor-pointer",
            accent.cta
          )}
        >
          {isUp ? (
            <>
              Passer à cette offre
              <ArrowUpRight className="h-3.5 w-3.5" />
            </>
          ) : (
            "Rétrograder vers cette offre"
          )}
        </button>
      )}
    </div>
  );
}

/* ─── Page principale ─── */

export default function SubscriptionPage() {
  const { activeFarm, activePlan } = useAuth();

  const [publicPlans, setPublicPlans] = useState<PublicPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "ANNUALLY">("MONTHLY");

  const [upgradeTarget, setUpgradeTarget] = useState<PublicPlan | null>(null);
  const [upgradeMessage, setUpgradeMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  async function fetchPlans() {
    try {
      setIsLoading(true);
      setError(null);
      const result = await api.subscriptions.getPlans();
      setPublicPlans(result.publicPlans);
    } catch (err: unknown) {
      setError((err as Error).message || "Impossible de charger les offres.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRequestUpgrade(e: React.FormEvent) {
    e.preventDefault();
    if (!activeFarm || !upgradeTarget) return;
    setIsSending(true);
    setUpgradeError(null);
    try {
      const res = await api.subscriptions.requestUpgrade({
        farmId: activeFarm.id,
        targetPlan: upgradeTarget.sku,
        message: upgradeMessage.trim(),
      });
      setSuccessMsg(res.message || `Demande envoyée pour l'offre ${upgradeTarget.name}.`);
      setUpgradeTarget(null);
      setUpgradeMessage("");
    } catch (err: unknown) {
      setUpgradeError((err as Error).message || "Erreur lors de l'envoi de la demande.");
    } finally {
      setIsSending(false);
    }
  }

  const currentSku = activePlan?.plan?.toUpperCase() ?? "FREE";

  function openUpgrade(plan: PublicPlan) {
    setUpgradeTarget(plan);
    setUpgradeMessage("");
    setUpgradeError(null);
    setSuccessMsg(null);
  }

  return (
    <Shell>
      <div className="max-w-6xl mx-auto space-y-8 pb-16">

        {/* En-tête */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted font-medium mb-1.5">
              <span>Paramètres</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground">Mon abonnement</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl flex items-center gap-2.5">
              <CreditCard className="h-6 w-6 text-primary" />
              <span>Mon abonnement</span>
            </h1>
            <p className="mt-1 text-xs text-muted">
              Consultez les offres disponibles et demandez un changement d'abonnement pour{" "}
              <strong>{activeFarm?.name || "votre ferme"}</strong>.
            </p>
          </div>
        </div>

        {/* Alerte succès */}
        {successMsg && (
          <div className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/5 p-4">
            <CheckCircle2 className="h-5 w-5 text-success mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-success">Demande envoyée !</p>
              <p className="text-xs text-muted mt-0.5">{successMsg}</p>
            </div>
            <button
              onClick={() => setSuccessMsg(null)}
              className="text-muted hover:text-foreground cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* KPI — récapitulatif de l'offre active */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            title="Offre actuelle"
            value={activePlan?.planName || "Starter (Découverte)"}
            subtitle={activePlan?.badge ? `Formule ${activePlan.badge}` : "Formule gratuite"}
            accent="primary"
            icon={<CreditCard className="h-5 w-5" />}
          />
          <StatCard
            title="Modules actifs"
            value={`${activePlan?.modules?.length ?? 0} module(s)`}
            subtitle="Fonctionnalités accessibles"
            accent="amber"
            icon={<Sparkles className="h-5 w-5" />}
          />
          <StatCard
            title="Statut abonnement"
            value="Actif"
            subtitle="Abonnement en cours"
            accent="primary"
            icon={<CheckCircle2 className="h-5 w-5" />}
          />
        </div>

        {/* Toggle facturation + Titre du catalogue */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-foreground">Catalogue des offres</h2>
            <p className="text-xs text-muted mt-0.5">
              Choisissez la formule adaptée à votre exploitation
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-border bg-surface-muted p-1 self-start sm:self-auto">
            <button
              onClick={() => setBillingCycle("MONTHLY")}
              className={cn(
                "rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                billingCycle === "MONTHLY"
                  ? "bg-surface text-foreground shadow-xs border border-border"
                  : "text-muted hover:text-foreground"
              )}
            >
              Mensuel
            </button>
            <button
              onClick={() => setBillingCycle("ANNUALLY")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                billingCycle === "ANNUALLY"
                  ? "bg-surface text-foreground shadow-xs border border-border"
                  : "text-muted hover:text-foreground"
              )}
            >
              Annuel
              <span className="rounded bg-success/15 px-1 py-0.5 text-[10px] font-bold text-success">
                −17%
              </span>
            </button>
          </div>
        </div>

        {/* Grille du catalogue */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 rounded-xl border border-danger/30 bg-danger/5 p-4">
            <AlertTriangle className="h-5 w-5 text-danger shrink-0" />
            <p className="text-sm text-danger flex-1">{error}</p>
            <button
              onClick={fetchPlans}
              className="text-xs text-danger underline hover:text-danger/80 cursor-pointer"
            >
              Réessayer
            </button>
          </div>
        ) : publicPlans.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {publicPlans.map((plan) => (
              <PlanCard
                key={plan.sku}
                plan={plan}
                currentSku={currentSku}
                billingCycle={billingCycle}
                onSelect={openUpgrade}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-border bg-surface">
            <CreditCard className="h-10 w-10 text-muted mb-3" />
            <p className="text-sm font-semibold text-foreground">Aucune offre disponible</p>
            <p className="text-xs text-muted mt-1">
              Aucune offre publiée pour le moment. Réessayez ultérieurement.
            </p>
            <button
              onClick={fetchPlans}
              className="mt-4 rounded-xl border border-border bg-surface-hover px-4 py-2 text-xs font-semibold text-muted hover:text-foreground transition-colors cursor-pointer"
            >
              Actualiser
            </button>
          </div>
        )}

        {/* Note informative sur la démarche */}
        <div className="rounded-xl border border-border bg-surface-hover p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Comment fonctionne le changement d'offre ?
              </p>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                Lorsque vous demandez un changement de formule, une notification est envoyée à l'équipe
                administratrice de Lefermier. Votre abonnement sera activé sans interruption de vos activités.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* ── Modale de demande de changement d'offre ── */}
      {upgradeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl">
            <div className="flex items-start justify-between border-b border-border p-5">
              <div>
                <p className="text-xs text-primary font-medium uppercase tracking-wider mb-0.5">
                  Changement de formule
                </p>
                <h3 className="text-base font-bold text-foreground">
                  Passer à l'offre{" "}
                  <span className="text-primary">{upgradeTarget.name}</span>
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Pour l'exploitation : <strong>{activeFarm?.name}</strong>
                </p>
              </div>
              <button
                onClick={() => setUpgradeTarget(null)}
                className="rounded-xl p-1.5 text-muted hover:bg-surface-hover hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRequestUpgrade} className="p-5 space-y-4">
              {upgradeError && (
                <div className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-xs text-danger">
                  {upgradeError}
                </div>
              )}

              {/* Récapitulatif offre cible */}
              <div className="rounded-xl border border-border bg-surface-muted p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">Formule demandée</span>
                  <span className="font-bold text-foreground">{upgradeTarget.name}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">Tarif ({billingCycle === "ANNUALLY" ? "Annuel" : "Mensuel"})</span>
                  <span className="font-bold text-foreground">
                    {upgradeTarget.priceMonthly === 0
                      ? "Gratuit"
                      : `${new Intl.NumberFormat("fr-FR").format(
                          billingCycle === "ANNUALLY"
                            ? upgradeTarget.priceAnnually
                            : upgradeTarget.priceMonthly
                        )} FCFA`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">Modules inclus</span>
                  <span className="font-semibold text-primary">
                    {upgradeTarget.modules.length} modules
                  </span>
                </div>
              </div>

              {/* Message facultatif */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Message pour l'administrateur (facultatif)
                </label>
                <textarea
                  value={upgradeMessage}
                  onChange={(e) => setUpgradeMessage(e.target.value)}
                  placeholder="Précisez un besoin particulier, date souhaitée, mode de règlement..."
                  rows={3}
                  className="w-full rounded-xl border border-border bg-surface-muted px-3 py-2.5 text-xs text-foreground placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setUpgradeTarget(null)}
                  className="flex-1 rounded-xl border border-border bg-surface-hover py-2.5 text-xs font-semibold text-muted hover:text-foreground transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-white hover:bg-primary-hover disabled:opacity-60 transition-all cursor-pointer"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Confirmer la demande
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  );
}
