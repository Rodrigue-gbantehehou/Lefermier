"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

export function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: "Est-ce que l'application est facile à utiliser ?",
      a: "Oui, très facile. Si vous savez envoyer un message sur WhatsApp ou composer un numéro sur votre téléphone, vous saurez utiliser Lefermier. Les boutons sont gros, les mots sont simples et il suffit de quelques secondes pour noter vos œufs ou vos sacs d'aliments.",
    },
    {
      q: "Est-ce que cela fonctionne sur mon téléphone portable ?",
      a: "Oui. Lefermier fonctionne sur tous les smartphones, qu'il s'agisse d'un téléphone Android ou d'un iPhone. L'application s'adapte automatiquement à votre écran.",
    },
    {
      q: "Faut-il payer quelque chose pour démarrer ?",
      a: "Non, l'inscription est totalement gratuite. Vous pouvez créer votre compte, enregistrer votre ferme et tester l'application tranquillement avec la formule Gratuite sans rien débourser.",
    },
    {
      q: "Comment se règle la formule Complète si je souhaite l'utiliser ?",
      a: "Vous n'avez pas besoin de carte bancaire. Vous pouvez régler votre abonnement mensuel de 9 500 FCFA directement par MTN Mobile Money ou Moov Money. Vous arrêtez quand vous voulez sans aucune contrainte.",
    },
    {
      q: "Et si la connexion Internet est faible au poulailler ?",
      a: "L'application a été allégée au maximum pour fonctionner même dans les zones rurales où le réseau Internet est parfois lent.",
    },
    {
      q: "Mon vétérinaire peut-il m'aider avec Lefermier ?",
      a: "Oui. Vous pouvez donner un accès spécial à votre vétérinaire. Il pourra voir la santé de vos poules et vos vaccins directement sur son téléphone pour mieux vous conseiller, sans voir vos finances privées.",
    },
  ];

  return (
    <section id="faq" className="py-16 md:py-24 bg-surface border-b border-border">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-soft text-primary text-xs font-semibold">
            <span>Questions courantes</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Les réponses à vos questions
          </h2>

          <p className="text-sm text-muted">
            Tout ce que vous devez savoir pour démarrer simplement.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((item, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className="rounded-xl border border-border bg-background overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 text-left text-sm font-semibold text-foreground hover:bg-surface-hover transition-colors"
                >
                  <span className="pr-4">{item.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-muted shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-primary" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-sm text-muted leading-relaxed border-t border-border/60 bg-surface">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
