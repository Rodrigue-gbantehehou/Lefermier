import React from "react";
import { Check, ArrowRight, Shield } from "lucide-react";

export function Pricing() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <section id="pricing" className="py-16 md:py-24 bg-background border-b border-border">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
            <span>Tarifs simples et transparents</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Des tarifs clairs, sans surprise
          </h2>

          <p className="text-sm sm:text-base text-muted leading-relaxed">
            Tarifs en Francs CFA. Pas besoin de carte bancaire : vous pouvez régler simplement par
            MTN Mobile Money ou Moov Money.
          </p>
        </div>

        {/* 2 Simple Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          {/* Plan 1: Gratuit */}
          <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 flex flex-col justify-between shadow-xs">
            <div>
              <span className="inline-block text-xs font-semibold text-muted bg-surface-muted px-2.5 py-1 rounded-md mb-3">
                Pour démarrer
              </span>

              <h3 className="text-xl font-bold text-foreground">
                Formule Gratuite
              </h3>

              <p className="text-xs sm:text-sm text-muted mt-2 leading-relaxed">
                Idéal pour découvrir l'application et sécuriser le suivi de vos premières volailles.
              </p>

              <div className="my-5">
                <span className="text-3xl font-bold text-foreground">0 FCFA</span>
                <span className="text-xs text-muted block mt-1">Gratuit pour toujours</span>
              </div>

              <ul className="space-y-3 text-xs text-foreground border-t border-border pt-5">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0 stroke-[2.5]" />
                  <span>1 exploitation avicole</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0 stroke-[2.5]" />
                  <span>Jusqu'à 2 bandes (pondeuses ou chair)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0 stroke-[2.5]" />
                  <span>Comptage des ramassages en plateaux de 30</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0 stroke-[2.5]" />
                  <span>Suivi de l'aliment et des mortalités</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0 stroke-[2.5]" />
                  <span>Caisse simple en FCFA</span>
                </li>
              </ul>
            </div>

            <div className="pt-6">
              <a
                href={`${appUrl}/register`}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface-muted hover:bg-surface-hover px-4 py-3 text-xs font-semibold text-foreground transition-colors"
              >
                <span>Créer mon compte gratuit</span>
              </a>
            </div>
          </div>

          {/* Plan 2: Pro */}
          <div className="rounded-2xl border-2 border-primary bg-surface p-6 sm:p-8 flex flex-col justify-between shadow-sm relative">
            <div className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-primary text-white text-[11px] font-semibold">
              Recommandé
            </div>

            <div>
              <span className="inline-block text-xs font-semibold text-primary bg-primary-soft px-2.5 py-1 rounded-md mb-3">
                Pour les fermes professionnelles
              </span>

              <h3 className="text-xl font-bold text-foreground">
                Formule Complète
              </h3>

              <p className="text-xs sm:text-sm text-muted mt-2 leading-relaxed">
                Pour les éleveurs qui souhaitent un suivi rigoureux de leur santé et de leurs finances.
              </p>

              <div className="my-5">
                <span className="text-3xl font-bold text-primary">9 500 FCFA</span>
                <span className="text-xs text-muted block mt-1">par mois • Sans engagement</span>
              </div>

              <ul className="space-y-3 text-xs text-foreground border-t border-border pt-5">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0 stroke-[2.5]" />
                  <span>Autant de bandes et de bâtiments que vous voulez</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0 stroke-[2.5]" />
                  <span>Rappels de vaccins et soins automatiques</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0 stroke-[2.5]" />
                  <span>Validation du vaccin du jour en 1 clic dans l'eau</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0 stroke-[2.5]" />
                  <span>Alertes avant que vos sacs d'aliments ne manquent</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0 stroke-[2.5]" />
                  <span>Accès direct pour votre vétérinaire</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0 stroke-[2.5]" />
                  <span>Caisse séparée : MTN MoMo, Moov Money et Espèces</span>
                </li>
              </ul>
            </div>

            <div className="pt-6">
              <a
                href={`${appUrl}/register`}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary hover:bg-primary-hover px-4 py-3 text-xs font-semibold text-white shadow-xs transition-colors"
              >
                <span>Démarrer avec la formule Complète</span>
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Reassurance note */}
        <div className="mt-8 text-center text-xs text-muted flex items-center justify-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <span>Règlement mensuel par MTN MoMo ou Moov Money. Vous pouvez arrêter à tout moment.</span>
        </div>
      </div>
    </section>
  );
}
