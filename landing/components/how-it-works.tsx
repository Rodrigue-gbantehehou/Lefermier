import React from "react";
import { Building2, Bird, CheckCircle, ArrowRight } from "lucide-react";

export function HowItWorks() {
  const steps = [
    {
      step: "01",
      icon: <Building2 className="h-6 w-6 text-primary" />,
      title: "Créez votre exploitation",
      description:
        "Indiquez le nom de votre ferme et la capacité de vos premiers poulaillers ou bâtiments d'élevage. Vous pouvez gérer plusieurs fermes indépendantes avec un seul compte.",
    },
    {
      step: "02",
      icon: <Bird className="h-6 w-6 text-accent" />,
      title: "Enregistrez vos bandes de poules",
      description:
        "Précisez la race (Lohmann, Goliath, Cobb...), le type (pondeuses ou chair), l'effectif de départ et la date d'arrivée. Le calendrier vaccinal est automatiquement calculé.",
    },
    {
      step: "03",
      icon: <CheckCircle className="h-6 w-6 text-success" />,
      title: "Notez votre journée en 30 secondes",
      description:
        "Ramassage des œufs du matin, tournée d'aliment pesée au kilo et encaissement des ventes d'œufs. Votre tableau de bord se met à jour en direct sans paperasse.",
    },
  ];

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
            <span>Prise en main Terrain</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
            Comment démarrer avec Lefermier en{" "}
            <span className="text-primary">3 étapes simples</span>
          </h2>
          <p className="text-sm sm:text-base text-muted leading-relaxed">
            Pas besoin d'être un expert informatique : l'application est conçue pour être
            utilisée directement depuis votre poulailler sur un simple téléphone.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((item, idx) => (
            <div
              key={idx}
              className="relative rounded-2xl border border-border bg-surface p-7 shadow-xs space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="h-12 w-12 rounded-xl bg-surface-muted flex items-center justify-center">
                  {item.icon}
                </div>
                <span className="text-3xl font-extrabold font-mono text-muted/30">
                  {item.step}
                </span>
              </div>

              <h3 className="text-lg font-bold text-foreground">
                {item.title}
              </h3>

              <p className="text-xs sm:text-sm text-muted leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <a
            href={`${appUrl}/register`}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-primary-hover transition-colors"
          >
            <span>Démarrer l'enregistrement de ma ferme</span>
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
