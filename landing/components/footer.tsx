import React from "react";
import Link from "next/link";
import { Bird, ShieldCheck, Heart } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <footer className="border-t border-border bg-surface py-14 text-xs text-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-border">
          {/* Brand Col */}
          <div className="md:col-span-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white shadow-2xs">
                <Bird className="h-5 w-5" />
              </div>
              <span className="text-lg font-extrabold font-mono text-foreground">
                Le<span className="text-primary">fermier</span>
              </span>
            </div>
            <p className="text-xs text-muted max-w-sm leading-relaxed">
              Le logiciel professionnel de pilotage d'exploitations avicoles conçu pour les réalités d'Afrique de l'Ouest : plateaux de 30 œufs, sacs de provende 50 kg et caisse en FCFA.
            </p>
            <div className="pt-2 flex items-center gap-2 text-[11px] text-muted">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
              <span>Données isolées et strictement confidentielles.</span>
            </div>
          </div>

          {/* Nav links 1 */}
          <div className="md:col-span-3 space-y-2.5">
            <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px]">
              Navigation
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="#features" className="hover:text-primary transition-colors">
                  Modules & Fonctionnalités
                </a>
              </li>
              <li>
                <a href="#preview" className="hover:text-primary transition-colors">
                  Simulateur de plateaux de 30
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-primary transition-colors">
                  Comment ça marche
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-primary transition-colors">
                  Tarification en FCFA
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-primary transition-colors">
                  Foire aux questions (FAQ)
                </a>
              </li>
            </ul>
          </div>

          {/* Nav links 2 */}
          <div className="md:col-span-4 space-y-2.5">
            <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px]">
              Espace Exploitation
            </h4>
            <ul className="space-y-2">
              <li>
                <a href={`${appUrl}/login`} className="hover:text-primary transition-colors font-medium">
                  Connexion à mon compte
                </a>
              </li>
              <li>
                <a href={`${appUrl}/register`} className="hover:text-primary transition-colors font-medium">
                  Créer ma première ferme
                </a>
              </li>
              <li>
                <a href="#contact" className="hover:text-primary transition-colors">
                  Demande d'accompagnement
                </a>
              </li>
            </ul>

            <div className="pt-3">
              <a
                href={`${appUrl}/login`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2 font-bold text-primary hover:bg-primary/10 transition-colors"
              >
                <span>Accéder à l'application Lefermier →</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-muted">
          <div>
            © {currentYear} Lefermier. Tous droits réservés. Développé pour l'aviculture ouest-africaine.
          </div>
          <div className="flex items-center gap-4">
            <span className="hover:text-foreground cursor-pointer">Mentions Légales</span>
            <span>•</span>
            <span className="hover:text-foreground cursor-pointer">Confidentialité</span>
            <span>•</span>
            <span className="hover:text-foreground cursor-pointer">Conditions Générales</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
