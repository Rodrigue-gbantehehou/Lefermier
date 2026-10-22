"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Lock,
  Building2,
  Activity,
  Calendar,
} from "lucide-react";
import { AdminHeader } from "@/components/admin-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

export interface AuditLogItem {
  id: string;
  timestamp: string;
  actor: {
    fullName: string;
    email: string;
    role: string;
  };
  action: string;
  label: string;
  targetType: string;
  targetId: string;
  targetName: string;
  clientIp: string;
  status: string;
  details: string;
}

export default function AuditLogPage() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  // Données réelles : initialisé vide sans événements fictifs
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      search === "" ||
      log.targetName.toLowerCase().includes(search.toLowerCase()) ||
      log.actor.fullName.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase());

    const matchesAction = actionFilter === "" || log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  return (
    <div className="flex-1 flex flex-col">
      <AdminHeader
        title="Journal d'Audit & Sécurité"
        description="Traçabilité immuable des actions sensibles réalisées par les super-administrateurs plateforme."
      />

      <main className="p-6 md:p-8 space-y-6 max-w-7xl">
        {/* KPI de Sécurité & Audit Réels */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            title="Événements Enregistrés"
            value={auditLogs.length}
            subtitle="Actions sensibles tracées dans le système"
            icon={<ShieldCheck />}
            accent="primary"
          />

          <StatCard
            title="Actions Critiques Tracées"
            value={auditLogs.filter((l) => l.action.includes("SUSPEND") || l.action.includes("SUPER_ADMIN")).length}
            subtitle="Suspensions et changements de privilèges"
            icon={<AlertTriangle />}
            accent="amber"
          />

          <StatCard
            title="Journalisation d'Audit"
            value={auditLogs.length > 0 ? "Enregistrements actifs" : "Aucun événement"}
            subtitle="Section 7 ADMIN_RULES.md"
            icon={<Lock />}
            accent="sky"
          />
        </div>

        {/* Tableau du Journal d'Audit */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle>Historique des Événements d'Administration ({filteredLogs.length})</CardTitle>
                <CardDescription>
                  Conforme aux exigences de journalisation de la section 7 de ADMIN_RULES.md.
                </CardDescription>
              </div>

              {/* Filtres & Recherche */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted" />
                  <Input
                    placeholder="Filtrer par acteur, ressource..."
                    className="pl-8 text-xs h-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="h-9 px-3 rounded-lg border border-border bg-surface text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                >
                  <option value="">Toutes les actions</option>
                  <option value="ORGANIZATION_STATUS_UPDATE">Suspension d'organisation</option>
                  <option value="SUBSCRIPTION_PLAN_CHANGE">Changement d'offre</option>
                  <option value="SUPER_ADMIN_ELEVATION">Droits Super-Admin</option>
                  <option value="USER_STATUS_TOGGLE">Statut utilisateur</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredLogs.length === 0 ? (
              <EmptyState
                icon={<ShieldCheck />}
                title="Aucun événement d'audit enregistré"
                description="Le journal d'audit enregistrera automatiquement chaque opération sensible (suspension d'organisation, réinitialisation de compte) dès sa réalisation."
                className="m-6"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Heure (UTC)</TableHead>
                    <TableHead>Acteur</TableHead>
                    <TableHead>Action Réalisée</TableHead>
                    <TableHead>Ressource Cible</TableHead>
                    <TableHead>Détails de l'opération</TableHead>
                    <TableHead>Adresse IP</TableHead>
                    <TableHead className="text-right">Résultat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted whitespace-nowrap">
                        {formatDate(log.timestamp)}
                      </TableCell>

                      <TableCell>
                        <p className="text-xs font-semibold text-foreground">{log.actor.fullName}</p>
                        <span className="text-[10px] text-muted">{log.actor.email}</span>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-semibold">
                          {log.label}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <p className="text-xs font-semibold text-foreground">{log.targetName}</p>
                        <span className="text-[10px] text-muted font-mono">{log.targetId}</span>
                      </TableCell>

                      <TableCell className="text-xs text-muted max-w-xs truncate">
                        {log.details}
                      </TableCell>

                      <TableCell className="text-xs font-mono text-muted">
                        {log.clientIp}
                      </TableCell>

                      <TableCell className="text-right">
                        <Badge variant="success" dot className="text-[10px]">
                          Succès
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
