"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  Ban,
  Mail,
  Phone,
  Eye,
} from "lucide-react";
import { adminApi, UserItem } from "@/lib/api-client";
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
import { useAdminAuth } from "@/context/admin-auth-context";

export default function AdminUsersPage() {
  const { hasPermission } = useAdminAuth();
  const canManageUsers = hasPermission("admin:users:manage");

  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const activeParam =
        activeFilter === "true" ? true : activeFilter === "false" ? false : undefined;
      const res = await adminApi.getUsers({
        active: activeParam,
        search: search || undefined,
      });
      setUsers(res.data);
    } catch (err: unknown) {
      setApiError(
        (err as Error).message ||
          "Impossible de joindre le serveur API Symfony sur http://127.0.0.1:8000."
      );
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [activeFilter]);

  const handleToggleActive = async (user: UserItem) => {
    const nextState = !user.isActive;
    const confirmMsg = nextState
      ? `Réactiver le compte de "${user.fullName}" ?`
      : `Désactiver le compte de "${user.fullName}" ? L'utilisateur ne pourra plus se connecter.`;

    if (!window.confirm(confirmMsg)) return;

    setActionLoadingId(user.id);
    try {
      await adminApi.setUserActive(user.id, nextState);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isActive: nextState } : u))
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
        title="Utilisateurs"
        description="Comptes et droits d'accès."
      />

      <main className="p-6 md:p-8 space-y-6 max-w-7xl">
        {apiError && (
          <div className="p-4 rounded-xl border border-warning/30 bg-warning-soft/70 text-xs text-foreground flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Ban className="h-4 w-4 text-warning shrink-0" />
              <span>API hors ligne : impossible de charger les utilisateurs.</span>
            </div>
            <Button variant="outline" size="sm" onClick={fetchUsers} className="text-xs h-7">
              Réessayer
            </Button>
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle>
                  Utilisateurs {users.length > 0 && `(${users.length})`}
                </CardTitle>
              </div>

              {/* Filtres & Recherche */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted" />
                  <Input
                    placeholder="Rechercher..."
                    className="pl-8 text-xs h-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && fetchUsers()}
                  />
                </div>

                <select
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value)}
                  className="h-9 px-3 rounded-lg border border-border bg-surface text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                >
                  <option value="">Tous les comptes</option>
                  <option value="true">Actifs</option>
                  <option value="false">Désactivés</option>
                </select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchUsers}
                  isLoading={isLoading}
                  className="gap-1.5 h-9"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Actualiser</span>
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {users.length === 0 && !isLoading ? (
              <EmptyState
                icon={<Users />}
                title="Aucun utilisateur trouvé"
                description="Aucun compte ne correspond aux filtres appliqués."
                className="m-6"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Fermes</TableHead>
                    <TableHead>Créé le</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const isSuperAdmin = user.roles.includes("ROLE_SUPER_ADMIN");
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2.5">
                           
                            <div>
                              <Link
                                href={`/users/${user.id}`}
                                className="text-sm font-semibold text-foreground hover:text-primary hover:underline"
                              >
                                {user.fullName}
                              </Link>
                              <p className="text-[11px] text-muted font-mono">  {user.adminRole ? (
                              <span>{user.adminRole.name}</span>
                          ) : isSuperAdmin ? (

                            <span>SUPER ADMIN</span>
                          ) : (
                            <span>Éleveur</span>
                          )}</p>
                               
                            </div>
                            
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-1.5 text-foreground">
                              <span>{user.email}</span>
                            </div>
                            {user.phone && (
                              <div className="flex items-center gap-1.5 text-muted">
                                <span>{user.phone}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>

                       


                        <TableCell>
                          <span className="text-xs text-muted">
                            {user.farmsCount} ferme{user.farmsCount > 1 ? "s" : ""}
                          </span>
                        </TableCell>

                        <TableCell className="text-xs text-muted">
                          {formatDate(user.createdAt)}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/users/${user.id}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs gap-1.5 hover:bg-surface-hover"
                              >
                                <Eye className="h-3.5 w-3.5 text-muted" />
                                <span>Détail</span>
                              </Button>
                            </Link>

                            {canManageUsers && (
                              <Button
                                variant={user.isActive ? "destructive" : "success"}
                                size="sm"
                                isLoading={actionLoadingId === user.id}
                                onClick={() => handleToggleActive(user)}
                                className="text-xs gap-1.5"
                              >
                                {user.isActive ? (
                                  <>
                                    <Ban className="h-3.5 w-3.5" />
                                    <span>Désactiver</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span>Activer</span>
                                  </>
                                )}
                              </Button>
                            )}
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
