"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAdminAuth } from "@/context/admin-auth-context";
import { AdminSidebar } from "@/components/admin-sidebar";
import { ShieldAlert, Lock, RefreshCw, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isSuperAdmin } = useAdminAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === "/login";
  const isAuthorized = isSuperAdmin || Boolean(user?.adminRole) || !!user?.roles?.includes("ROLE_ADMIN");

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthorized && !isLoginPage) {
        router.replace("/login");
      } else if (isAuthorized && isLoginPage) {
        router.replace("/");
      }
    }
  }, [isLoading, isAuthorized, isLoginPage, router]);

  // Si l'utilisateur est sur la page de connexion, afficher sans layout admin
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Pendant la vérification du jeton, ne rien révéler de l'interface admin
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-6">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="h-14 w-14 rounded-2xl bg-primary-soft text-primary flex items-center justify-center border border-primary/20 animate-pulse">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Console Centrale Lefermier</h2>
            <p className="text-xs text-muted mt-1">
              Contrôle cryptographique des privilèges d&apos;administration...
            </p>
          </div>
          <RefreshCw className="h-4 w-4 text-muted animate-spin mt-2" />
        </div>
      </div>
    );
  }

  // Si non autorisé (ex: simple éleveur ROLE_USER), bloquer complètement l'accès visuel
  if (!isAuthorized) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-6">
        <div className="w-full max-w-md p-8 rounded-2xl border border-destructive/30 bg-surface shadow-xl text-center space-y-4">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-destructive-soft text-destructive flex items-center justify-center border border-destructive/20">
            <Lock className="h-7 w-7" />
          </div>

          <div>
            <h1 className="text-lg font-bold text-foreground">Accès Administration Requis</h1>
            <p className="text-xs text-muted mt-1.5 leading-relaxed">
              Cette console d&apos;administration est strictement réservée au personnel habilité de la plateforme Lefermier.
              Les comptes éleveurs sont confinés à l&apos;application d&apos;exploitation.
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <Link href="/login" className="w-full">
              <Button className="w-full gap-2">
                <span>Se connecter avec un compte administrateur</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            <a
              href="http://localhost:3000"
              className="text-xs text-muted hover:text-foreground transition-colors py-1"
            >
              Retourner à l&apos;application éleveur
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Utilisateur authentifié ET rôle ROLE_SUPER_ADMIN vérifié
  return (
    <div className="min-h-screen flex bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {children}
      </div>
    </div>
  );
}
