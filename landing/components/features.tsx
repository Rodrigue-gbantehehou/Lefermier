import React from "react";
import type { LucideIcon } from "lucide-react";
import {
  Egg,
  Bird,
  Utensils,
  HeartPulse,
  PackageCheck,
  Wallet,
} from "lucide-react";

interface FeatureModule {
  Icon: LucideIcon;
  iconColor: string;
  badge: string;
  title: string;
  description: string;
  highlight: string;
}

export function Features() {
  const modules: FeatureModule[] = [
    {
      Icon: Egg,
      iconColor: "text-accent",
      badge: "Ponte & Alvéoles",
      title: "Collecte des œufs en plateaux de 30",
      description:
        "Saisie rapide des ramassages. Conversion automatique en plateaux de 30 alvéoles et calcul du taux de ponte selon les poules vivantes.",
      highlight: "Plateaux de 30 + œufs vrac",
    },
    {
      Icon: Bird,
      iconColor: "text-primary",
      badge: "Cheptel Vif",
      title: "Gestion des bandes & mortalité",
      description:
        "Suivi des effectifs, des mortalités et des réformes pour connaître à tout moment votre cheptel en bâtiment.",
      highlight: "Calcul instantané du taux de mortalité",
    },
    {
      Icon: Utensils,
      iconColor: "text-warning",
      badge: "Alimentation",
      title: "Tournée d'alimentation & abreuvement",
      description:
        "Distribution d'aliment en sacs de 50 kg ou au kilo. Validation en un clic du soin ou vaccin programmé dans l'eau de boisson.",
      highlight: "Validation 1-clic vaccin dans l'eau",
    },
    {
      Icon: HeartPulse,
      iconColor: "text-danger",
      badge: "Santé",
      title: "Prophylaxie automatisée",
      description:
        "Calendrier vaccinal par âge de bande (Gumboro, Newcastle, Anticoccidien) et accès dédié pour le Docteur Vétérinaire Conseil.",
      highlight: "Registre sanitaire sans oubli",
    },
    {
      Icon: PackageCheck,
      iconColor: "text-primary",
      badge: "Magasin",
      title: "Stocks & alertes de réapprovisionnement",
      description:
        "Surveillance des réserves de provende et de vaccins pour éviter toute rupture d'aliment.",
      highlight: "Sacs de 50 kg et alertes de seuil",
    },
    {
      Icon: Wallet,
      iconColor: "text-primary",
      badge: "Caisse",
      title: "Trésorerie en Francs CFA",
      description:
        "Encaissements des ventes d'œufs et règlements d'aliments par canal : MTN Mobile Money, Moov Money et Espèces.",
      highlight: "Soldes séparés par canal",
    },
  ];

  return (
    <section id="features" className="py-16 md:py-24 bg-surface border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
            <span>Modules Métier</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Les outils indispensables pour votre exploitation
          </h2>
          <p className="text-sm text-muted">
            Une interface claire pour organiser chaque étape de votre élevage avicole.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((m, idx) => {
            const IconComponent = m.Icon;
            return (
              <div
                key={idx}
                className="flex flex-col justify-between rounded-xl border border-border bg-background p-6 space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-10 w-10 rounded-lg bg-surface flex items-center justify-center border border-border">
                      <IconComponent className={`h-5 w-5 ${m.iconColor}`} />
                    </div>
                    <span className="text-[11px] font-semibold text-muted bg-surface-muted px-2.5 py-0.5 rounded">
                      {m.badge}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-1.5">{m.title}</h3>
                  <p className="text-xs sm:text-sm text-muted leading-relaxed">{m.description}</p>
                </div>
                <div className="pt-3 border-t border-border text-xs font-medium text-primary">
                  {m.highlight}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
