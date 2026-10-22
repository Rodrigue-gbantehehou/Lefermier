import React from "react";
import {
  CheckCircle2,
  ArrowRight,
  Smartphone,
  Egg,
  HeartPulse,
  Package,
  Wallet,
} from "lucide-react";

export function Hero() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 bg-background border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Simple, Clear, Friendly Copy */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
          

            {/* Simple Title without jargon or technical terms */}
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight">
              Votre élevage de poules,{" "}
              <span className="text-primary">géré simplement sur votre téléphone.</span>
            </h1>

            {/* Subtitle in plain, human French */}
            <p className="text-base sm:text-lg text-muted max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Finis les cahiers raturés ou perdus. Lefermier vous aide à noter vos ramassages d'œufs,
              surveiller vos sacs d'aliments et protéger la santé de vos volailles en quelques clics.
            </p>

            {/* Action Buttons */}
            <div className="pt-1 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5">
              <a
                href={`${appUrl}/register`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-white shadow-xs hover:bg-primary-hover transition-colors"
              >
                <span>Créer mon compte gratuit</span>
                <ArrowRight className="h-4 w-4" />
              </a>

              <a
                href="#simple-features"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-6 py-3.5 text-sm font-medium text-foreground hover:bg-surface-hover transition-colors"
              >
                <span>Voir comment ça marche</span>
              </a>
            </div>

            {/* Reassuring simple points */}
            <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-y-2 gap-x-6 text-xs text-muted">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span>Facile à utiliser au poulailler</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span>Sur n'importe quel smartphone</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span>Gratuit pour démarrer</span>
              </div>
            </div>
          </div>

          {/* Right Column: Real African Farmer Photo with Clean Simple Overlay */}
          <div className="lg:col-span-5">
            <div className="relative rounded-2xl border border-border bg-surface shadow-md overflow-hidden">
              <div className="aspect-[4/3] w-full relative">
                <img
                  src="/images/farmer-hero.jpg"
                  alt="Éleveur avicole souriant consultant son téléphone dans son poulailler"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Clean, Non-Technical Reassuring Caption */}
              <div className="p-4 bg-surface border-t border-border space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary-soft flex items-center justify-center text-primary">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-foreground">
                      Tout est accessible au creux de votre main
                    </h3>
                    <p className="text-[11px] text-muted">
                      Une saisie en 30 secondes chrono après chaque visite au bâtiment.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
