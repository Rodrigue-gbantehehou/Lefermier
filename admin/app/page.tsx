"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Users,
  Warehouse,
  Egg,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  ExternalLink,
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
        (err as Error).message ||
          "Impossible de joindre l'API Symfony sur http://127.0.0.1:8000."
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
        title="Tableau de Bord Central"
        description="Vue consolidée de l'activité, des exploitations et des comptes de la plateforme Lefermier."
      />

      <main className="p-6 md:p-8 space-y-6 max-w-7xl">
        {/* Bannière d'état API si non connectée */}
        {apiError && (
          <div className="p-4 rounded-xl border border-warning/30 bg-warning-soft/70 text-xs text-foreground flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-warning">Serveur API Symfony non détecté</p>
              <p className="text-muted mt-0.5">
                {apiError} Les métriques réelles s'afficheront dès que le serveur backend sera démarré.
              </p>
              <p className="text-muted mt-1 font-mono text-[11px] bg-surface/70 px-2 py-1 rounded inline-block">
                cd api && symfony serve --port=8000
              </p>
            </div>
          </div>
        )}

        {/* Top bar with refresh & status badge */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5 bg-surface text-xs py-1">
              <span
                className={`h-2 w-2 rounded-full ${apiError ? "bg-warning" : "bg-success"} animate-pulse`}
              />
              <span>{apiError ? "API Déconnectée" : "API Connectée (Données Réelles)"}</span>
            </Badge>
            {lastRefreshed && (
              <span className="text-xs text-muted" suppressHydrationWarning>
                Dernière synchro : {lastRefreshed.toLocaleTimeString("fr-FR")}
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
                <Plus className="h-3.5 w-3.5" />
                <span>Gérer les fermes</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Organisations clientes"
            value={isLoading ? "…" : stats ? formatNumber(stats.organizations.total) : "—"}
            subtitle={
              stats
                ? `${stats.organizations.active} actives • ${stats.organizations.suspended} suspendues`
                : "En attente de connexion API"
            }
            icon={<Building2 />}
            accent="primary"
            trend={
              stats
                ? {
                    value: `${stats.organizations.trial} en essai`,
                    isPositive: true,
                    label: "période d'évaluation",
                  }
                : undefined
            }
          />

          <StatCard
            title="Utilisateurs inscrits"
            value={isLoading ? "…" : stats ? formatNumber(stats.users.total) : "—"}
            subtitle={
              stats
                ? `${stats.users.active} comptes actifs`
                : "En attente de connexion API"
            }
            icon={<Users />}
            accent="amber"
            trend={
              stats
                ? {
                    value: `${stats.users.inactive} inactifs`,
                    isPositive: false,
                    label: "désactivés",
                  }
                : undefined
            }
          />

          <StatCard
            title="Exploitations avicoles"
            value={isLoading ? "…" : stats ? formatNumber(stats.farms.total) : "—"}
            subtitle={stats ? "Fermes déployées sur le réseau" : "En attente de connexion API"}
            icon={<Warehouse />}
            accent="sky"
          />

          <StatCard
            title="Bandes suivies"
            value={isLoading ? "…" : stats ? formatNumber(stats.flocks.total) : "—"}
            subtitle={stats ? "Lots de pondeuses et chairs actifs" : "En attente de connexion API"}
            icon={<Egg />}
            accent="primary"
          />
        </div>

        {/* Two columns: Module overview & Quick actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column: Quick access & Status */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Modules de Gestion Prioritaires</CardTitle>
                <CardDescription>
                  Accès direct aux fonctionnalités centrales conformément aux règles ADMIN_RULES.md
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Link
                  href="/organizations"
                  className="flex items-center justify-between p-4 rounded-xl border border-border bg-surface-muted/30 hover:bg-surface-hover hover:border-primary/40 transition-all group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="h-10 w-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center border border-primary/20 group-hover:scale-105 transition-transform">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        Gestion des Organisations & Fermes
                      </p>
                      <p className="text-xs text-muted">
                        Consultation, modification des offres, suspension et réactivation d&apos;accès.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {stats?.organizations.total ?? 0} orgs
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>

                <Link
                  href="/users"
                  className="flex items-center justify-between p-4 rounded-xl border border-border bg-surface-muted/30 hover:bg-surface-hover hover:border-primary/40 transition-all group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="h-10 w-10 rounded-xl bg-accent-soft text-accent flex items-center justify-center border border-accent/20 group-hover:scale-105 transition-transform">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors">
                        Gestion des Comptes & Super-Admins
                      </p>
                      <p className="text-xs text-muted">
                        Activation de comptes, attribution du rôle ROLE_SUPER_ADMIN et audit des accès.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {stats?.users.total ?? 0} comptes
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>

                <Link
                  href="/subscriptions"
                  className="flex items-center justify-between p-4 rounded-xl border border-border bg-surface-muted/30 hover:bg-surface-hover hover:border-info/40 transition-all group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="h-10 w-10 rounded-xl bg-info-soft text-info flex items-center justify-center border border-info/20 group-hover:scale-105 transition-transform">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground group-hover:text-info transition-colors">
                        Plans & Abonnements Plateforme
                      </p>
                      <p className="text-xs text-muted">
                        Suivi des formules FREE, STANDARD, PRO et gestion des périodes de validité.
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted group-hover:text-info group-hover:translate-x-0.5 transition-all" />
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Platform Status & Security reminders */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Règles de Sécurité Plateforme</CardTitle>
                <CardDescription>Rappels stricts issus de ADMIN_RULES.md</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3.5 text-xs text-muted">
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-primary-soft/60 border border-primary/20">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-primary block">Cloisonnement strict</span>
                    L&apos;administration plateforme ne gère pas les opérations quotidiennes des fermes.
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-warning-soft/60 border border-warning/20">
                  <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-warning block">Opérations sensibles</span>
                    Toute suspension d&apos;organisation ou révocation de compte doit être confirmée.
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-surface-muted/60 border border-border">
                  <ShieldAlert className="h-4 w-4 text-muted shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-foreground block">Contrôle côté API</span>
                    Toutes les requêtes sont validées par le rôle serveur ROLE_SUPER_ADMIN.
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Documentation Associée</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <a
                  href="http://127.0.0.1:8000/api/docs"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-surface-hover transition-colors font-medium text-primary"
                >
                  <span>Spécification API Scalar / Swagger</span>
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
