"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bird, Lock, Mail, ArrowRight, AlertCircle, Sun, Moon } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useTheme } from "@/context/theme-context";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login({ email, password });
      router.push("/");
    } catch (err: any) {
      setError(
        err?.message || "Identifiants invalides. Veuillez vérifier votre adresse e-mail et mot de passe."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoFill = () => {
    setEmail("admin.test@lefermier.bj");
    setPassword("Lefermier2026@Secure!");
  };

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
        {/* Header / Logo */}
        <div className="text-center mb-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white shadow-md mb-3">
            <Bird className="h-8 w-8 text-accent" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Lefermier
          </h1>
          <p className="mt-1 text-xs text-muted">
            Logiciel de gestion avicole africaine
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-xl sm:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-foreground">
              Connexion à votre espace
            </h2>
            <p className="text-xs text-muted">
              Accédez au suivi de vos bandes, pontes, stocks et trésorerie.
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-danger/20 bg-danger-soft p-3.5 text-xs text-danger">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-danger" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Adresse e-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-muted" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="directeur@ferme.bj"
                  className="w-full rounded-xl border border-border bg-surface-muted py-2.5 pl-10 pr-3.5 text-sm text-foreground placeholder:text-muted/60 focus:border-primary focus:bg-surface focus:outline-hidden transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
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
                "Connexion en cours..."
              ) : (
                <>
                  Se connecter
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Helper */}

          <div className="mt-5 text-center text-xs text-muted">
            Pas encore de compte ?{" "}
            <Link
              href="/register"
              className="font-bold text-primary hover:underline"
            >
              Créer votre exploitation
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
