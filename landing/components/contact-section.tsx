"use client";

import React, { useState } from "react";
import { Send, CheckCircle2, Phone, Mail, MapPin, MessageSquare, AlertCircle } from "lucide-react";

export function ContactSection() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [farmType, setFarmType] = useState("LAYER");
  const [flockSize, setFlockSize] = useState("");
  const [message, setMessage] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage("Veuillez renseigner votre nom complet.");
      return;
    }
    if (!phone.trim() && !email.trim()) {
      setErrorMessage("Veuillez renseigner un numéro de téléphone ou un email pour vous recontacter.");
      return;
    }

    setSubmitting(true);

    try {
      // Simulate real transmission or POST to backend if configured
      await new Promise((resolve) => setTimeout(resolve, 800));
      setSubmitted(true);
    } catch {
      setErrorMessage("Une erreur réseau est survenue. Veuillez réessayer ou nous contacter par téléphone.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="contact" className="py-20 md:py-28 bg-background border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left info column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
              <span>Contact & Démonstration</span>
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
              Parlons de votre élevage et découvrez Lefermier
            </h2>

            <p className="text-sm text-muted leading-relaxed">
              Vous souhaitez une démonstration personnalisée, une aide pour configurer vos premiers poulaillers ou une formation pour votre équipe ? Notre équipe avicole vous répond rapidement.
            </p>

            <div className="space-y-4 pt-4 border-t border-border text-xs text-foreground">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary-soft text-primary">
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] text-muted block">Téléphone & WhatsApp</span>
                  <a href="tel:+22997000000" className="font-bold hover:text-primary transition-colors font-mono">
                    +229 97 00 00 00 / +229 95 00 00 00
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary-soft text-primary">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] text-muted block">Email officiel</span>
                  <a href="mailto:contact@lefermier.app" className="font-bold hover:text-primary transition-colors">
                    contact@lefermier.app
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary-soft text-primary">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] text-muted block">Zone d'intervention</span>
                  <span className="font-bold">Cotonou, Calavi, Porto-Novo et toute la sous-région</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right form column */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl border border-border bg-surface p-7 sm:p-9 shadow-lg">
              {submitted ? (
                <div className="text-center py-10 space-y-4 animate-in fade-in duration-300">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success-soft text-success shadow-xs">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">
                    Demande transmise avec succès !
                  </h3>
                  <p className="text-xs sm:text-sm text-muted max-w-md mx-auto leading-relaxed">
                    Merci {name}. Un conseiller Lefermier a bien reçu vos informations et prendra contact avec vous sur votre numéro {phone || email} pour planifier votre accompagnement.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setName("");
                      setPhone("");
                      setEmail("");
                      setMessage("");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground hover:bg-surface-hover"
                  >
                    Envoyer un autre message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h3 className="text-base font-bold text-foreground mb-1">
                    Demander une démonstration ou un renseignement
                  </h3>
                  <p className="text-xs text-muted mb-4">
                    Remplissez ce formulaire et nous vous recontacterons sous 24h.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="name" className="block text-xs font-semibold text-foreground mb-1">
                        Votre nom complet *
                      </label>
                      <input
                        id="name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="ex. Koffi Dossou"
                        className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-xs font-semibold text-foreground mb-1">
                        Téléphone / WhatsApp *
                      </label>
                      <input
                        id="phone"
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="ex. +229 97 00 00 00"
                        className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs font-mono text-foreground focus:border-primary focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="email" className="block text-xs font-semibold text-foreground mb-1">
                        Adresse email (optionnelle)
                      </label>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="votre-ferme@gmail.com"
                        className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label htmlFor="farmType" className="block text-xs font-semibold text-foreground mb-1">
                        Type d'élevage principal
                      </label>
                      <select
                        id="farmType"
                        value={farmType}
                        onChange={(e) => setFarmType(e.target.value)}
                        className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs font-semibold text-foreground"
                      >
                        <option value="LAYER">Poules pondeuses (Œufs de table)</option>
                        <option value="BROILER">Poulets de chair (Viande)</option>
                        <option value="MIXED">Élevage mixte (Pondeuses + Chair)</option>
                        <option value="LOCAL">Poules locales / Goliath</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="flockSize" className="block text-xs font-semibold text-foreground mb-1">
                      Nombre de sujets estimé dans votre ferme
                    </label>
                    <input
                      id="flockSize"
                      type="text"
                      value={flockSize}
                      onChange={(e) => setFlockSize(e.target.value)}
                      placeholder="ex. 1 500 pondeuses ou 500 poussins"
                      className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-xs font-semibold text-foreground mb-1">
                      Votre question ou vos besoins spécifiques
                    </label>
                    <textarea
                      id="message"
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Précisez votre demande (ex. aide à la configuration, questions sur les tarifs...)"
                      className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
                    />
                  </div>

                  {errorMessage && (
                    <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-xs font-bold text-white shadow-xs hover:bg-primary-hover transition-colors"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{submitting ? "Transmission en cours..." : "Envoyer ma demande"}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
