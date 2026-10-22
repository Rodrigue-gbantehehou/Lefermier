import React from "react";
import { Egg, Utensils, HeartPulse, Wallet, Check } from "lucide-react";

export function SimpleFeatures() {
  return (
    <section id="simple-features" className="py-16 md:py-24 bg-surface border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading in plain language */}
        <div className="max-w-2xl mx-auto text-center space-y-3 mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-soft text-primary text-xs font-semibold">
            <span>Simple et efficace</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Les 4 choses simples que Lefermier fait pour vous
          </h2>

          <p className="text-sm sm:text-base text-muted">
            Pas besoin d'être un spécialiste de l'informatique : chaque fonction a été créée pour
            vous faire gagner du temps et vous éviter les tracas au poulailler.
          </p>
        </div>

        {/* Feature 1 with Real Egg Trays Photo */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mb-16 rounded-2xl border border-border bg-background p-6 sm:p-8">
          <div className="lg:col-span-6 space-y-4">
            <div className="h-10 w-10 rounded-xl bg-accent-soft flex items-center justify-center text-accent">
              <Egg className="h-5 w-5" />
            </div>

            <h3 className="text-xl font-bold text-foreground">
              1. Notez vos œufs, l'application compte vos plateaux de 30
            </h3>

            <p className="text-sm text-muted leading-relaxed">
              Après le ramassage du matin ou du soir, entrez simplement le nombre d'œufs ramassés.
              Lefermier calcule automatiquement le nombre de plateaux de 30 alvéoles complets et
              les œufs restants en vrac.
            </p>

            <ul className="space-y-2 text-xs text-foreground">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary shrink-0 stroke-[2.5]" />
                <span>Fini les calculs de tête compliqués</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary shrink-0 stroke-[2.5]" />
                <span>Sachez facilement si vos poules pondent bien chaque jour</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary shrink-0 stroke-[2.5]" />
                <span>Évitez les pertes et les erreurs lors des livraisons</span>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-6">
            <div className="rounded-xl overflow-hidden border border-border shadow-xs aspect-[4/3] relative">
              <img
                src="/images/egg-trays.jpg"
                alt="Rangement des œufs dans les plateaux alvéolés de 30 œufs"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* 3 Other Core Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Feature 2: Feed */}
          <div className="rounded-2xl border border-border bg-background p-6 space-y-3.5">
            <div className="h-10 w-10 rounded-xl bg-warning-soft flex items-center justify-center text-warning">
              <Utensils className="h-5 w-5" />
            </div>

            <h3 className="text-base font-bold text-foreground">
              2. Suivez vos sacs d'aliments
            </h3>

            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              Quand vous ouvrez un sac de provende pour nourrir la bande, notez-le en un clic. Vous
              savez toujours combien de sacs il vous reste dans votre magasin pour ne jamais être en
              panne d'aliment.
            </p>
          </div>

          {/* Feature 3: Health */}
          <div className="rounded-2xl border border-border bg-background p-6 space-y-3.5">
            <div className="h-10 w-10 rounded-xl bg-danger-soft flex items-center justify-center text-danger">
              <HeartPulse className="h-5 w-5" />
            </div>

            <h3 className="text-base font-bold text-foreground">
              3. N'oubliez aucun vaccin
            </h3>

            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              L'application vous rappelle les soins et vaccins programmés selon l'âge de vos sujets.
              Quand vous donnez l'eau de boisson, vous pouvez valider le vaccin du jour en une seule
              seconde.
            </p>
          </div>

          {/* Feature 4: Money */}
          <div className="rounded-2xl border border-border bg-background p-6 space-y-3.5">
            <div className="h-10 w-10 rounded-xl bg-primary-soft flex items-center justify-center text-primary">
              <Wallet className="h-5 w-5" />
            </div>

            <h3 className="text-base font-bold text-foreground">
              4. Gardez le compte de votre argent
            </h3>

            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              Enregistrez vos ventes d'œufs et vos dépenses en Francs CFA. Gardez les sous bien
              séparés : ce qui est entré sur votre compte MTN Mobile Money, Moov Money et ce qui est
              dans la caisse en espèces.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
