import React from "react";
import { Egg, Layers, CalendarCheck2, Wallet } from "lucide-react";

export function StatsStrip() {
  const points = [
    {
      icon: <Egg className="h-5 w-5 text-accent" />,
      title: "Plateaux de 30 œufs",
      description: "Vos ramassages comptés automatiquement en plateaux complets, comme au marché.",
    },
    {
      icon: <Layers className="h-5 w-5 text-primary" />,
      title: "Sacs de provende",
      description: "Suivez vos sacs d'aliments de 50 kg ou 25 kg pour ne jamais tomber à court.",
    },
    {
      icon: <CalendarCheck2 className="h-5 w-5 text-accent" />,
      title: "Santé & Vaccins",
      description: "Des rappels clairs sur votre téléphone pour ne rater aucun vaccin ni vitamine.",
    },
    {
      icon: <Wallet className="h-5 w-5 text-primary" />,
      title: "Caisse en FCFA",
      description: "Notez vos règlements par MTN MoMo, Moov Money et en espèces simplement.",
    },
  ];

  return (
    <section className="py-10 border-b border-border bg-surface">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {points.map((item, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-surface-muted text-foreground shrink-0 mt-0.5">
                {item.icon}
              </div>
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-foreground">{item.title}</h3>
                <p className="text-xs text-muted leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
