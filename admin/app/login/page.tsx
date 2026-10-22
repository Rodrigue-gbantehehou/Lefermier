"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/context/admin-auth-context";
import {
  ShieldAlert,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminLoginPage() {
  const router = useRouter();
  const { login } = useAdminAuth();

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
    } catch (err: unknown) {
      setError(
        (err as Error).message ||
          "Identifiants incorrects ou compte non habilité. Veuillez vérifier votre adresse e-mail et mot de passe."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-4 sm:p-6 lg:p-8 relative">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg border border-primary/20">
            <ShieldAlert className="h-9 w-9" />
          </div>
          <div>
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Lefermier
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Admin
              </span>
            </div>
            <p className="text-xs text-muted mt-1">
              Console Centrale d&apos;Administration Plateforme
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-xl space-y-6">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground">
              Connexion Super-Administrateur
            </h2>
            <p className="text-xs text-muted leading-relaxed">
              Accès strictement réservé aux créateurs et administrateurs habilités (<code className="text-primary font-mono text-[11px]">ROLE_SUPER_ADMIN</code>).
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl border border-danger/30 bg-danger-soft/70 text-xs text-danger flex items-start gap-3">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Adresse e-mail administrateur
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
                <Input
                  type="email"
                  required
                  placeholder="admin@lefermier.bj"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
                <Input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full gap-2 font-semibold text-xs mt-2"
              isLoading={isLoading}
            >
              <span>Accéder à la console centrale</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {/* Rappel de Sécurité */}
          <div className="pt-4 border-t border-border/70 flex items-center justify-between text-[11px] text-muted">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Chiffrement asymétrique JWT RSA</span>
            </div>
            <a
              href="http://localhost:3000"
              className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
            >
              <span>Espace Éleveur</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
