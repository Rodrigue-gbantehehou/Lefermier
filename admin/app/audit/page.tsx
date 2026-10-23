"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Building2,
  RefreshCw,
  Eye,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  CreditCard,
  KeyRound,
  AlertOctagon,
  LogIn,
} from "lucide-react";
import { adminApi, AuditLogItem } from "@/lib/api-client";
import { AdminHeader } from "@/components/admin-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

const ACTION_OPTIONS = [
  { value: "", label: "Toutes les actions" },
  { value: "AUTH_LOGIN_SUCCESS", label: "Connexion : réussie" },
  { value: "AUTH_LOGIN_FAILED", label: "Connexion : échec" },
  { value: "PASSWORD_CHANGE", label: "Mot de passe : modification" },
  { value: "PASSWORD_RESET", label: "Mot de passe : réinitialisation" },
  { value: "ORGANIZATION_STATUS_UPDATE", label: "Organisation : statut" },
  { value: "SUBSCRIPTION_PLAN_CHANGE", label: "Organisation : formule" },
  { value: "SUBSCRIPTION_PLAN_CREATE", label: "Formule : création" },
  { value: "SUBSCRIPTION_PLAN_UPDATE", label: "Formule : modification" },
  { value: "SUBSCRIPTION_PLAN_DELETE", label: "Formule : suppression" },
  { value: "USER_ACTIVE_STATUS_CHANGE", label: "Utilisateur : statut" },
  { value: "ADMIN_ROLE_ASSIGNED", label: "Utilisateur : rôle" },
  { value: "ADMIN_ROLE_CREATE", label: "Rôle : création" },
  { value: "ADMIN_ROLE_UPDATE", label: "Rôle : modification" },
  { value: "ADMIN_ROLE_DELETE", label: "Rôle : suppression" },
];

export default function AuditLogPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  // Debounce de recherche
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchAuditLogs = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const res = await adminApi.audit.list({
        page,
        limit,
        action: actionFilter || undefined,
        search: debouncedSearch.trim() || undefined,
      });
      setAuditLogs(res.data || []);
      setTotal(res.total || 0);
    } catch (err: unknown) {
      setApiError(
        (err as Error).message || "Impossible de charger le journal d'audit."
      );
      setAuditLogs([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, actionFilter, debouncedSearch]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const getActionBadgeVariant = (action: string) => {
    if (action.includes("FAILED") || action.includes("DELETE") || action.includes("SUSPEND")) return "destructive";
    if (action.includes("SUCCESS") || action.includes("CREATE")) return "success";
    if (action.includes("PASSWORD")) return "warning";
    if (action.includes("ROLE")) return "secondary";
    return "outline";
  };

  const getActionIcon = (action: string) => {
    if (action.startsWith("ORGANIZATION")) return <Building2 className="h-3.5 w-3.5 text-sky-500" />;
    if (action.startsWith("SUBSCRIPTION")) return <CreditCard className="h-3.5 w-3.5 text-emerald-500" />;
    if (action.startsWith("ADMIN_ROLE")) return <KeyRound className="h-3.5 w-3.5 text-purple-500" />;
    if (action.startsWith("AUTH_LOGIN")) return <LogIn className="h-3.5 w-3.5 text-blue-500" />;
    if (action.startsWith("PASSWORD")) return <Lock className="h-3.5 w-3.5 text-amber-500" />;
    return <UserCheck className="h-3.5 w-3.5 text-amber-500" />;
  };

  return (
    <div className="flex-1 flex flex-col">
      <AdminHeader
        title="Journal d'audit"
        description="Historique des actions d'administration."
      />

      <main className="p-6 md:p-8 space-y-6 max-w-7xl">
        {/* Alerte si erreur API */}
        {apiError && (
          <div className="p-4 rounded-xl border border-warning/30 bg-warning-soft/70 text-xs text-foreground flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertOctagon className="h-4 w-4 text-warning shrink-0" />
              <span>API hors ligne : impossible de charger le journal d'audit.</span>
            </div>
            <Button variant="outline" size="sm" onClick={fetchAuditLogs} className="text-xs h-7">
              Réessayer
            </Button>
          </div>
        )}

        {/* Chiffres clés */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            title="Total actions"
            value={total}
            subtitle={isLoading ? "Chargement..." : "Actions enregistrées"}
            icon={<ShieldCheck />}
            accent="primary"
          />

          <StatCard
            title="Filtre actif"
            value={actionFilter ? "Ciblé" : "Toutes"}
            subtitle={
              actionFilter
                ? ACTION_OPTIONS.find((o) => o.value === actionFilter)?.label || actionFilter
                : "Toutes les actions"
            }
            icon={<AlertTriangle />}
            accent="amber"
          />

          <StatCard
            title="Statut journal"
            value="Actif"
            subtitle="Traçabilité en temps réel"
            icon={<Lock />}
            accent="sky"
          />
        </div>

        {/* Tableau */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle>
                  Historique {total > 0 && `(${total})`}
                </CardTitle>
              </div>

              {/* Filtres, Recherche & Rafraîchissement */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted" />
                  <Input
                    placeholder="Rechercher..."
                    className="pl-8 text-xs h-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <select
                  value={actionFilter}
                  onChange={(e) => {
                    setActionFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 px-3 rounded-lg border border-border bg-surface text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                >
                  {ACTION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchAuditLogs}
                  disabled={isLoading}
                  className="gap-1.5 h-9"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                  <span>Actualiser</span>
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading && auditLogs.length === 0 ? (
              <div className="p-12 text-center text-muted text-xs flex flex-col items-center justify-center gap-2">
                <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                <span>Chargement du journal...</span>
              </div>
            ) : auditLogs.length === 0 ? (
              <EmptyState
                icon={<ShieldCheck />}
                title="Aucune action trouvée"
                description={
                  search || actionFilter
                    ? "Aucun résultat ne correspond aux filtres appliqués."
                    : "Les actions administratives apparaîtront ici dès qu'elles seront effectuées."
                }
                className="m-6"
                action={
                  (search || actionFilter) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearch("");
                        setActionFilter("");
                        setPage(1);
                      }}
                    >
                      Effacer les filtres
                    </Button>
                  )
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Auteur</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Cible</TableHead>
                      <TableHead>Détails</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow
                        key={log.id}
                        className="hover:bg-surface-hover/70 cursor-pointer"
                        onClick={() => setSelectedLog(log)}
                      >
                        <TableCell className="text-xs text-muted whitespace-nowrap">
                          {formatDate(log.timestamp)}
                        </TableCell>

                        <TableCell>
                          <p className="text-xs font-semibold text-foreground">{log.actor.fullName}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-muted">{log.actor.email}</span>
                          </div>

                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1.5">
                              {log.label || log.action}
                          </div>
                        </TableCell>

                        <TableCell>
                          <p className="text-xs font-semibold text-foreground">{log.targetName}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[10px] text-muted font-mono">{log.targetType}</span>
                          </div>
                        </TableCell>

                        <TableCell className="text-xs text-muted max-w-xs truncate" title={log.details}>
                          {log.details}
                        </TableCell>

                        <TableCell className="text-xs font-mono text-muted whitespace-nowrap">
                          {log.clientIp}
                        </TableCell>

                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLog(log);
                            }}
                            className="h-7 px-2 text-xs gap-1"
                          >
                            <Eye className="h-3.5 w-3.5 text-muted" />
                            <span>Voir</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-border flex items-center justify-between text-xs text-muted">
                <span>
                  Page {page} sur {totalPages} ({total} actions)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1 || isLoading}
                    className="h-8 gap-1"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span>Précédent</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || isLoading}
                    className="h-8 gap-1"
                  >
                    <span>Suivant</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Modal Détails */}
      {selectedLog && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedLog(null)}
          title="Détail de l'action"
          description={`ID : ${selectedLog.id}`}
          maxWidth="2xl"
          footer={
            <Button variant="outline" size="sm" onClick={() => setSelectedLog(null)}>
              Fermer
            </Button>
          }
        >
          <div className="space-y-4 text-xs">
            {/* Auteur & Statut */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-surface-muted/30 border border-border">
              <div>
                <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">Auteur</p>
                <p className="font-semibold text-foreground text-sm mt-0.5">{selectedLog.actor.fullName}</p>
                <p className="text-muted text-[11px]">{selectedLog.actor.email}</p>
                <Badge variant="secondary" className="mt-1 text-[10px]">
                  {selectedLog.actor.role}
                </Badge>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">Statut & Réseau</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant={selectedLog.status === "SUCCESS" ? "success" : "destructive"} dot>
                    {selectedLog.status === "SUCCESS" ? "Succès" : "Échec"}
                  </Badge>
                </div>
                <p className="text-muted mt-2">
                  IP : <strong className="text-foreground font-mono">{selectedLog.clientIp}</strong>
                </p>
                <p className="text-muted font-mono text-[10px] mt-0.5">{selectedLog.timestamp}</p>
              </div>
            </div>

            {/* Cible & Action */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-surface-muted/30 border border-border">
              <div>
                <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">Action</p>
                <p className="font-semibold text-foreground mt-0.5">{selectedLog.label}</p>
                <code className="text-[11px] text-primary font-mono mt-1 block">
                  {selectedLog.action}
                </code>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">Cible</p>
                <p className="font-semibold text-foreground mt-0.5">{selectedLog.targetName}</p>
                <div className="mt-1 text-[11px] text-muted">
                  Type : <span className="font-semibold text-foreground">{selectedLog.targetType}</span>
                </div>
                <div className="text-[10px] font-mono text-muted truncate" title={selectedLog.targetId}>
                  ID : {selectedLog.targetId}
                </div>
              </div>
            </div>

            {/* Description détaillée */}
            <div>
              <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1.5">
                Détails de l'opération
              </p>
              <div className="p-3 rounded-xl bg-surface-muted/50 border border-border font-mono text-[11px] text-foreground leading-relaxed whitespace-pre-wrap">
                {selectedLog.details}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
