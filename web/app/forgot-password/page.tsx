"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bird,
  Lock,
  Mail,
  Phone,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Sun,
  Moon,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { useTheme } from "@/context/theme-context";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  // Step 1: Request Code | Step 2: Enter Code & New Password | Step 3: Success
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [devCodeHint, setDevCodeHint] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Handle Step 1 : Request reset
  async function handleRequestCode(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim()) {
      setError("Veuillez renseigner votre adresse e-mail ou numéro de téléphone.");
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      const res = await api.auth.forgotPassword({
        identifier: identifier.trim(),
        channel,
      });

      setInfoMessage(res.message);
      if (res.devCode) {
        setDevCodeHint(res.devCode);
        setCode(res.devCode); // Pre-fill for instant local testing
      }
      setStep(2);
    } catch (err: any) {
      setError(err?.message || "Impossible de traiter la demande pour le moment.");
    } finally {
      setIsLoading(false);
    }
  }

  // Handle Step 2 : Reset password with code
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) {
      setError("Le code de vérification à 6 chiffres est obligatoire.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Le nouveau mot de passe doit comporter au moins 8 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      await api.auth.resetPassword({
        identifier: identifier.trim(),
        code: code.trim(),
        newPassword,
      });

      setStep(3);
    } catch (err: any) {
      setError(err?.message || "Le code saisi est invalide ou a expiré.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background p-4 sm:p-6 lg:p-8">
      {/* Theme Toggle Top Right */}
      <div className="absolute top-4 right-4">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Basculer le thème"
          className="rounded-xl border border-border bg-surface p-2 text-muted shadow-xs transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4 text-accent" />
          ) : (
            <Moon className="h-4 w-4 text-primary" />
          )}
        </button>
      </div>

      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/25">
            <Bird className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            Lefermier
          </h1>
          <p className="mt-1 text-xs font-semibold text-primary uppercase tracking-wider">
            Récupération de compte & mot de passe
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-border bg-surface p-6 sm:p-8 shadow-sm">
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-danger/20 bg-danger-soft p-3.5 text-xs text-danger font-medium">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1 : DEMANDE DE CODE */}
          {step === 1 && (
            <form onSubmit={handleRequestCode} className="space-y-4">
              <div className="text-center mb-4">
                <h2 className="text-sm font-bold text-foreground">
                  Mot de passe oublié ?
                </h2>
                <p className="mt-1 text-xs text-muted">
                  Choisissez comment vous souhaitez recevoir votre code de réinitialisation sécurisé.
                </p>
              </div>

              {/* Canal Email / SMS */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-surface-muted border border-border">
                <button
                  type="button"
                  onClick={() => setChannel("email")}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                    channel === "email"
                      ? "bg-primary text-white shadow-xs"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>Par E-mail</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChannel("sms")}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                    channel === "sms"
                      ? "bg-primary text-white shadow-xs"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>Par SMS</span>
                </button>
              </div>

              {/* Champ Identifiant */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  {channel === "email" ? "Votre adresse e-mail" : "Votre numéro de téléphone (WhatsApp / SMS)"}
                </label>
                <div className="relative">
                  {channel === "email" ? (
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-muted" />
                  ) : (
                    <Phone className="absolute left-3.5 top-3 h-4 w-4 text-muted" />
                  )}
                  <input
                    type={channel === "email" ? "email" : "tel"}
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={channel === "email" ? "directeur@ferme.bj" : "+229 97 00 00 00"}
                    className="w-full rounded-xl border border-border bg-surface-muted py-2.5 pl-10 pr-3.5 text-sm text-foreground placeholder:text-muted/60 focus:border-primary focus:bg-surface focus:outline-hidden transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-primary-hover disabled:opacity-60"
              >
                {isLoading ? (
                  "Envoi en cours..."
                ) : (
                  <>
                    <span>Envoyer le code de réinitialisation</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-primary transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Retour à la connexion</span>
                </Link>
              </div>
            </form>
          )}

          {/* STEP 2 : SAISIE DU CODE ET DU NOUVEAU MOT DE PASSE */}
          {step === 2 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="text-center mb-4">
                <h2 className="text-sm font-bold text-foreground">
                  Vérification du code
                </h2>
                <p className="mt-1 text-xs text-muted">
                  Un code à 6 chiffres a été généré pour <strong>{identifier}</strong>.
                </p>
              </div>

              {devCodeHint && (
                <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary-soft p-3 text-xs text-primary">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 shrink-0" />
                    <span>Code de test Sandbox : <strong className="font-mono text-sm tracking-widest">{devCodeHint}</strong></span>
                  </div>
                </div>
              )}

              {/* Code input */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Code de vérification (6 chiffres) *
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3 h-4 w-4 text-muted" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="123456"
                    className="w-full rounded-xl border border-border bg-surface-muted py-2.5 pl-10 pr-3.5 text-center font-mono text-base font-bold tracking-widest text-foreground focus:border-primary focus:bg-surface focus:outline-hidden transition-colors"
                  />
                </div>
              </div>

              {/* Nouveau mot de passe */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Nouveau mot de passe (min. 8 caractères) *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-border bg-surface-muted py-2.5 pl-10 pr-3.5 text-sm text-foreground focus:border-primary focus:bg-surface focus:outline-hidden transition-colors"
                  />
                </div>
              </div>

              {/* Confirmation mot de passe */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Confirmer le mot de passe *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-border bg-surface-muted py-2.5 pl-10 pr-3.5 text-sm text-foreground focus:border-primary focus:bg-surface focus:outline-hidden transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-primary-hover disabled:opacity-60"
              >
                {isLoading ? (
                  "Mise à jour..."
                ) : (
                  <>
                    <span>Valider et changer le mot de passe</span>
                    <CheckCircle2 className="h-4 w-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-between pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-muted hover:text-foreground transition-colors"
                >
                  ← Modifier l'identifiant
                </button>
                <Link
                  href="/login"
                  className="font-semibold text-primary hover:underline"
                >
                  Annuler
                </Link>
              </div>
            </form>
          )}

          {/* STEP 3 : SUCCÈS CONFIRMÉ */}
          {step === 3 && (
            <div className="text-center py-4 space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success-soft text-success mb-2">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <h2 className="text-base font-bold text-foreground">
                Mot de passe mis à jour avec succès !
              </h2>

              <p className="text-xs text-muted leading-relaxed">
                Votre nouveau mot de passe a été enregistré de façon sécurisée. Vous pouvez maintenant vous connecter avec vos nouveaux identifiants.
              </p>

              <div className="pt-3">
                <Link
                  href="/login"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-md hover:bg-primary-hover transition-colors"
                >
                  <span>Aller à l'écran de connexion</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
