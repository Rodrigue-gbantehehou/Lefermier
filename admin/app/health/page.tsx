"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Server,
  Database,
  RefreshCw,
  Cpu,
  Wifi,
  AlertTriangle,
  Clock,
  Code2,
} from "lucide-react";
import { adminApi, HealthStatus } from "@/lib/api-client";
import { AdminHeader } from "@/components/admin-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function SystemHealthPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkHealth = async () => {
    setIsLoading(true);
    setApiError(null);
    const start = performance.now();
    try {
      const data = await adminApi.getHealth();
      const elapsed = Math.round(performance.now() - start);
      setHealth(data);
      setLatency(elapsed);
      setLastCheck(new Date());
    } catch (err: unknown) {
      setApiError(
        (err as Error).message ||
          "Impossible de joindre le serveur Symfony sur http://127.0.0.1:8000."
      );
      setHealth(null);
      setLatency(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const isConnected = !!health && !apiError;

  return (
    <div className="flex-1 flex flex-col">
      <AdminHeader
        title="Supervision Technique & État des Services"
        description="Surveillance en temps réel de la disponibilité de l'API Symfony et de la base de données MySQL."
      />

      <main className="p-6 md:p-8 space-y-6 max-w-7xl">
        {/* En-tête Statut Réel */}
        {apiError ? (
          <div className="p-4 rounded-xl border border-warning/30 bg-warning-soft/70 text-xs text-foreground flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-warning">Serveur API Symfony non détecté</p>
              <p className="text-muted">
                {apiError} Les métriques réelles (PHP, MySQL, mémoire) ne sont pas accessibles tant que l'API est hors-ligne.
              </p>
              <p className="text-muted font-mono text-[11px] bg-surface/70 px-2 py-1 rounded inline-block">
                cd api && symfony serve --port=8000
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-success-soft/60 border border-success/30">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-success text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-success">
                  API Symfony et Base de Données connectées
                </p>
                <p className="text-xs text-muted" suppressHydrationWarning>
                  {lastCheck
                    ? `Dernière vérification à ${lastCheck.toLocaleTimeString("fr-FR")}`
                    : "Connexion établie"}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={checkHealth}
              isLoading={isLoading}
              className="gap-2 bg-surface text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Tester à nouveau</span>
            </Button>
          </div>
        )}

        {/* Top actions & badge */}
        <div className="flex items-center justify-between">
          <Badge
            variant="outline"
            className="gap-1.5 bg-surface text-xs py-1"
          >
            <span
              className={`h-2 w-2 rounded-full ${isConnected ? "bg-success" : "bg-warning"} animate-pulse`}
            />
            <span>
              {isConnected ? "Services Opérationnels (Données Réelles)" : "API Déconnectée"}
            </span>
          </Badge>

          {apiError && (
            <Button
              variant="outline"
              size="sm"
              onClick={checkHealth}
              isLoading={isLoading}
              className="gap-2 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Réessayer la connexion</span>
            </Button>
          )}
        </div>

        {/* Métriques Système Réelles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Latence Réseau Réelle"
            value={latency !== null ? `${latency} ms` : "—"}
            subtitle={latency !== null ? "Temps aller-retour mesuré" : "Non mesurable"}
            icon={<Wifi />}
            accent="primary"
          />

          <StatCard
            title="Base de Données MySQL"
            value={
              health?.database.connected
                ? "Connectée"
                : isConnected
                ? "Erreur"
                : "—"
            }
            subtitle={
              health?.database.latency_ms !== null && health?.database.latency_ms !== undefined
                ? `Latence requête SELECT 1 : ${health.database.latency_ms} ms`
                : "En attente de connexion"
            }
            icon={<Database />}
            accent="sky"
          />

          <StatCard
            title="Consommation Mémoire PHP"
            value={health?.memory_usage_mb ? `${health.memory_usage_mb} Mo` : "—"}
            subtitle={
              health?.memory_peak_mb
                ? `Pic mémoire : ${health.memory_peak_mb} Mo`
                : "Non disponible"
            }
            icon={<Cpu />}
            accent="amber"
          />

          <StatCard
            title="Version Symfony"
            value={health?.symfony_version ?? "—"}
            subtitle={health?.php_version ? `PHP ${health.php_version}` : "Non disponible"}
            icon={<Server />}
            accent="primary"
          />
        </div>

        {/* Composants Système Réels */}
        <Card>
          <CardHeader>
            <CardTitle>Composants & Dépendances Réelles</CardTitle>
            <CardDescription>
              État retourné par le point de terminaison d'administration Symfony (GET /api/admin/health).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Backend Symfony */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-border bg-surface-muted/20">
              <div className="flex items-start gap-3.5 min-w-0 flex-1">
                <div className="h-10 w-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0 border border-primary/20">
                  <Server className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">API Backend REST (Symfony)</p>
                    {isConnected ? (
                      <Badge variant="success" dot className="text-[10px]">
                        Opérationnel
                      </Badge>
                    ) : (
                      <Badge variant="warning" dot className="text-[10px]">
                        Inaccessible
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    Moteur d'API central hébergé sur http://127.0.0.1:8000.
                  </p>
                  <span className="text-[11px] text-muted font-mono mt-1 block">
                    Endpoint : /api/admin/health
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-6 text-xs text-right shrink-0">
                <div>
                  <span className="text-muted block text-[10px]">Latence Réseau</span>
                  <span className="font-mono font-semibold text-foreground">
                    {latency !== null ? `${latency} ms` : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Base de données MySQL */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-border bg-surface-muted/20">
              <div className="flex items-start gap-3.5 min-w-0 flex-1">
                <div className="h-10 w-10 rounded-xl bg-sky-soft text-sky flex items-center justify-center shrink-0 border border-sky/20">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">Base de Données Relationnelle</p>
                    {health?.database.connected ? (
                      <Badge variant="success" dot className="text-[10px]">
                        Connectée (SELECT 1 OK)
                      </Badge>
                    ) : (
                      <Badge variant="warning" dot className="text-[10px]">
                        {isConnected ? "Erreur" : "Déconnectée"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    Driver : {health?.database.driver ?? "Doctrine DBAL (MySQL)"}
                  </p>
                  {health?.database.error && (
                    <p className="text-xs text-danger mt-1 font-mono">
                      Erreur : {health.database.error}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-6 text-xs text-right shrink-0">
                <div>
                  <span className="text-muted block text-[10px]">Latence Requête DB</span>
                  <span className="font-mono font-semibold text-foreground">
                    {health?.database.latency_ms !== null && health?.database.latency_ms !== undefined
                      ? `${health.database.latency_ms} ms`
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Détails de l'Environnement Réel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Environnement Serveur Réel</CardTitle>
            <CardDescription>
              Données techniques inspectées à l'exécution sur le serveur Symfony.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-surface border border-border">
                <span className="text-muted block text-[11px]">Version PHP</span>
                <span className="font-semibold text-foreground font-mono">
                  {health?.php_version ?? "Non disponible"}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-surface border border-border">
                <span className="text-muted block text-[11px]">Version Symfony Kernel</span>
                <span className="font-semibold text-foreground font-mono">
                  {health?.symfony_version ?? "Non disponible"}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-surface border border-border">
                <span className="text-muted block text-[11px]">Horodatage Serveur (UTC)</span>
                <span className="font-semibold text-foreground font-mono">
                  {health?.server_time ?? "Non disponible"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
