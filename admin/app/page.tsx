"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Users,
  Warehouse,
  Egg,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Plus,
  ExternalLink,
  CreditCard,
  Activity,
  AlertTriangle,
} from "lucide-react";
import { adminApi, PlatformStats } from "@/lib/api-client";
import { AdminHeader } from "@/components/admin-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const loadStats = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const data = await adminApi.getStats();
      setStats(data);
      setLastRefreshed(new Date());
    } catch (err: unknown) {
      setApiError(
        (err as Error).message || "Impossible de joindre le serveur API."
      );
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <div className="flex-1 flex flex-col">
      <AdminHeader
        title="Tableau de bord"
        description="Vue d'ensemble de la plateforme."
      />

      <main className="p-6 md:p-8 space-y-6 max-w-7xl">
        {/* Alerte si API hors ligne */}
        {apiError && (
          <div className="p-4 rounded-xl border border-warning/30 bg-warning-soft/70 text-xs text-foreground flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
              <span>API hors ligne : les données réelles ne sont pas disponibles.</span>
            </div>
            <Button variant="outline" size="sm" onClick={loadStats} className="text-xs h-7">
              Réessayer
            </Button>
          </div>
        )}

        {/* Barre d'état & actualisation */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5 bg-surface text-xs py-1">
              <span
                className={`h-2 w-2 rounded-full ${apiError ? "bg-warning" : "bg-success"}`}
              />
              <span>{apiError ? "Hors ligne" : "En ligne"}</span>
            </Badge>
            {lastRefreshed && (
              <span className="text-xs text-muted" suppressHydrationWarning>
                Mis à jour à {lastRefreshed.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadStats}
              isLoading={isLoading}
              className="gap-2"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Actualiser</span>
            </Button>
            <Link href="/organizations">
              <Button size="sm" className="gap-2">
                <Building2 className="h-3.5 w-3.5" />
                <span>Organisations</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Chiffres clés */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Organisations"
            value={isLoading ? "…" : stats ? formatNumber(stats.organizations.total) : "—"}
            subtitle={
              stats
                ? `${stats.organizations.active} actives`
                : "Indisponible"
            }
            icon={<Building2 />}
            accent="primary"
            trend={
              stats && stats.organizations.trial > 0
                ? {
                    value: `${stats.organizations.trial} en essai`,
                    isPositive: true,
                    label: "essai",
                  }
                : undefined
            }
          />

          <StatCard
            title="Utilisateurs"
            value={isLoading ? "…" : stats ? formatNumber(stats.users.total) : "—"}
            subtitle={
              stats
                ? `${stats.users.active} actifs`
                : "Indisponible"
            }
            icon={<Users />}
            accent="amber"
          />

          <StatCard
            title="Fermes"
            value={isLoading ? "…" : stats ? formatNumber(stats.farms.total) : "—"}
            subtitle={stats ? "Fermes enregistrées" : "Indisponible"}
            icon={<Warehouse />}
            accent="sky"
          />

          <StatCard
            title="Bandes"
            value={isLoading ? "…" : stats ? formatNumber(stats.flocks.total) : "—"}
            subtitle={stats ? "Lots d'élevage suivis" : "Indisponible"}
            icon={<Egg />}
            accent="primary"
          />
        </div>

        {/* Grille principale : Accès rapides & État */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Accès rapide</CardTitle>
                <CardDescription>
                  Navigation vers les sections principales.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link
                  href="/organizations"
                  className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-surface-muted/30 hover:bg-surface-hover hover:border-primary/40 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary-soft text-primary flex items-center justify-center border border-primary/20">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        Organisations
                      </p>
                      <p className="text-xs text-muted">
                        Entreprises, fermes associées et abonnements.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {stats?.organizations.total ?? 0}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>

                <Link
                  href="/users"
                  className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-surface-muted/30 hover:bg-surface-hover hover:border-primary/40 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-accent-soft text-accent flex items-center justify-center border border-accent/20">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors">
                        Utilisateurs
                      </p>
                      <p className="text-xs text-muted">
                        Comptes éleveurs, accès et rôles administrateurs.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {stats?.users.total ?? 0}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>

                <Link
                  href="/subscriptions"
                  className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-surface-muted/30 hover:bg-surface-hover hover:border-info/40 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-info-soft text-info flex items-center justify-center border border-info/20">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground group-hover:text-info transition-colors">
                        Abonnements & Offres
                      </p>
                      <p className="text-xs text-muted">
                        Catalogue des formules, tarifs et quotas.
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted group-hover:text-info group-hover:translate-x-0.5 transition-all" />
                </Link>

                <Link
                  href="/audit"
                  className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-surface-muted/30 hover:bg-surface-hover hover:border-primary/40 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary-soft text-primary flex items-center justify-center border border-primary/20">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        Journal d'audit
                      </p>
                      <p className="text-xs text-muted">
                        Historique des actions d'administration.
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Colonne secondaire : Système & Liens */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Système</CardTitle>
                <CardDescription>Liens utiles</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <Link
                  href="/health"
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border hover:bg-surface-hover transition-colors font-medium text-foreground"
                >
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-500" />
                    <span>État des services</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted" />
                </Link>

                <Link
                  href="/roles"
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border hover:bg-surface-hover transition-colors font-medium text-foreground"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span>Rôles & Permissions</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted" />
                </Link>

                <a
                  href="http://127.0.0.1:8000/api/docs"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border hover:bg-surface-hover transition-colors font-medium text-muted hover:text-foreground"
                >
                  <span>Documentation API</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
