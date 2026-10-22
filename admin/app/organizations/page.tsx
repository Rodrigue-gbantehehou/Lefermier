"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Search,
  RefreshCw,
  AlertOctagon,
  CheckCircle2,
  Warehouse,
  Eye,
} from "lucide-react";
import { adminApi, OrganizationItem } from "@/lib/api-client";
import { AdminHeader } from "@/components/admin-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";

export default function AdminOrganizationsPage() {
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const fetchOrganizations = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const res = await adminApi.getOrganizations({
        status: statusFilter || undefined,
        search: search || undefined,
      });
      setOrganizations(res.data);
    } catch (err: unknown) {
      setApiError(
        (err as Error).message ||
          "Impossible de joindre le serveur API Symfony sur http://127.0.0.1:8000."
      );
      setOrganizations([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, [statusFilter]);

  const handleToggleStatus = async (org: OrganizationItem) => {
    const nextStatus = org.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const confirmMsg =
      nextStatus === "SUSPENDED"
        ? `Êtes-vous sûr de vouloir suspendre "${org.name}" ? L'accès à toutes ses fermes sera immédiatement bloqué.`
        : `Voulez-vous réactiver l'organisation "${org.name}" ?`;

    if (!window.confirm(confirmMsg)) return;

    setActionLoadingId(org.id);
    try {
      await adminApi.setOrganizationStatus(org.id, nextStatus);
      setOrganizations((prev) =>
        prev.map((o) => (o.id === org.id ? { ...o, status: nextStatus } : o))
      );
    } catch (err: unknown) {
      alert((err as Error).message || "Erreur de mise à jour");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <AdminHeader
        title="Gestion des Organisations & Fermes"
        description="Supervisez les organisations inscrites, leurs exploitations affiliées et appliquez les suspensions d'accès."
      />

      <main className="p-6 md:p-8 space-y-6 max-w-7xl">
        {apiError && (
          <div className="p-4 rounded-xl border border-warning/30 bg-warning-soft/70 text-xs text-foreground flex items-start gap-3">
            <AlertOctagon className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-warning">Serveur API Symfony non détecté</p>
              <p className="text-muted mt-0.5">
                {apiError} Les organisations réelles s'afficheront dès que le serveur backend sera démarré.
              </p>
              <p className="text-muted mt-1 font-mono text-[11px] bg-surface/70 px-2 py-1 rounded inline-block">
                cd api && symfony serve --port=8000
              </p>
            </div>
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle>
                  Organisations clientes {apiError ? "(Déconnecté)" : `(${organizations.length})`}
                </CardTitle>
                <CardDescription>
                  Chaque organisation regroupe une ou plusieurs fermes avicoles indépendantes.
                </CardDescription>
              </div>

              {/* Filtres & Recherche */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted" />
                  <Input
                    placeholder="Rechercher par nom..."
                    className="pl-8 text-xs h-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && fetchOrganizations()}
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-9 px-3 rounded-lg border border-border bg-surface text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                >
                  <option value="">Tous les statuts</option>
                  <option value="ACTIVE">Actives</option>
                  <option value="SUSPENDED">Suspendues</option>
                  <option value="TRIAL">En essai</option>
                </select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchOrganizations}
                  isLoading={isLoading}
                  className="gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Filtrer</span>
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {organizations.length === 0 && !isLoading ? (
              <EmptyState
                icon={<Building2 />}
                title={apiError ? "Connexion API indisponible" : "Aucune organisation trouvée"}
                description={
                  apiError
                    ? "Impossible de joindre le serveur API Symfony. Aucune donnée fictive n'est affichée."
                    : "Aucun résultat ne correspond aux filtres sélectionnés."
                }
                className="m-6"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organisation</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Formule</TableHead>
                    <TableHead>Fermes affiliées</TableHead>
                    <TableHead>Création</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations.map((org) => {
                    const isSuspended = org.status === "SUSPENDED";
                    return (
                      <TableRow key={org.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
                              <Building2 className="h-4 w-4" />
                            </div>
                            <div>
                              <Link
                                href={`/organizations/${org.id}`}
                                className="text-sm font-semibold text-foreground hover:text-primary hover:underline"
                              >
                                {org.name}
                              </Link>
                              <p className="text-[11px] text-muted font-mono">{org.slug}</p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          {org.status === "ACTIVE" && (
                            <Badge variant="success" dot>
                              Active
                            </Badge>
                          )}
                          {org.status === "SUSPENDED" && (
                            <Badge variant="destructive" dot>
                              Suspendue
                            </Badge>
                          )}
                          {org.status === "TRIAL" && (
                            <Badge variant="warning" dot>
                              Essai gratuit
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline" className="font-semibold text-xs">
                            {org.subscriptionPlan}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs text-muted">
                            <Warehouse className="h-3.5 w-3.5" />
                            <span>
                              {org.farmsCount} ferme{org.farmsCount > 1 ? "s" : ""}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="text-xs text-muted">
                          {formatDate(org.createdAt)}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/organizations/${org.id}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs gap-1.5 hover:bg-surface-hover"
                              >
                                <Eye className="h-3.5 w-3.5 text-muted" />
                                <span>Détail</span>
                              </Button>
                            </Link>

                            <Button
                              variant={isSuspended ? "success" : "destructive"}
                              size="sm"
                              isLoading={actionLoadingId === org.id}
                              onClick={() => handleToggleStatus(org)}
                              className="text-xs gap-1.5"
                            >
                              {isSuspended ? (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  <span>Réactiver</span>
                                </>
                              ) : (
                                <>
                                  <AlertOctagon className="h-3.5 w-3.5" />
                                  <span>Suspendre</span>
                                </>
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
