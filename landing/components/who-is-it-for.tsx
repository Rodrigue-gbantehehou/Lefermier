import React from "react";
import { UserCheck, Shield, Stethoscope, Users } from "lucide-react";

export function WhoIsItFor() {
  const profiles = [
    {
      icon: <UserCheck className="h-6 w-6 text-primary" />,
      title: "Éleveurs & Propriétaires",
      description:
        "Gardez le contrôle total sur votre cheptel, vos stocks d'aliments et vos recettes financières, même si vous n'êtes pas présent physiquement tous les jours sur le site.",
    },
    {
      icon: <Users className="h-6 w-6 text-accent" />,
      title: "Gérants & Équipes d'exploitation",
      description:
        "Finie la corvée des cahiers tachés ou égarés : notez les ramassages d'œufs et les sacs de provende en 30 secondes chrono depuis un simple smartphone.",
    },
    {
      icon: <Stethoscope className="h-6 w-6 text-rose-600" />,
      title: "Vétérinaires & Consultants Avicoles",
      description:
        "Bénéficiez d'un accès dédié (rôle Consultant Vétérinaire) pour inspecter l'historique des courbes de ponte, des mortalités et des vaccinations sans déplacer de paperasse.",
    },
    {
      icon: <Shield className="h-6 w-6 text-emerald-600" />,
      title: "Coopératives & Multi-sites",
      description:
        "Gérez plusieurs fermes distinctes ou plusieurs poulaillers sous un seul compte sécurisé, avec isolation stricte des données et gestion fine des permissions d'accès.",
    },
  ];

  return (
    <section className="py-20 bg-surface-muted border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
            <span>Pour Qui ?</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
            Une solution adaptée à toute l'équipe avicole
          </h2>
          <p className="text-sm sm:text-base text-muted leading-relaxed">
            Du propriétaire au soigneur avicole, Lefermier simplifie le quotidien de chacun
            avec des interfaces claires et adaptées à chaque responsabilité.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {profiles.map((p, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-border bg-surface p-6 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="h-12 w-12 rounded-xl bg-surface-muted flex items-center justify-center mb-4">
                  {p.icon}
                </div>
                <h3 className="text-base font-bold text-foreground mb-2">
                  {p.title}
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                  {p.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
