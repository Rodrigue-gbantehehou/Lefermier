"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Users,
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Ban,
  RefreshCw,
  Warehouse,
  Building2,
  ExternalLink,
} from "lucide-react";
import { adminApi, UserItem, UserFarmMembership } from "@/lib/api-client";
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
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const userId = params?.id;

  const [user, setUser] = useState<UserItem | null>(null);
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingActive, setIsUpdatingActive] = useState(false);
  const [isUpdatingSuperAdmin, setIsUpdatingSuperAdmin] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const fetchUserAndRoles = async () => {
    if (!userId) return;
    setIsLoading(true);
    setApiError(null);
    try {
      const [userData, rolesData] = await Promise.all([
        adminApi.getUser(userId),
        adminApi.roles.list().catch(() => []),
      ]);
      setUser(userData);
      setAvailableRoles(rolesData);
      setSelectedRoleId(userData.adminRole?.id || "");
    } catch (err: unknown) {
      setApiError(
        (err as Error).message ||
          "Impossible de joindre le serveur API Symfony sur http://127.0.0.1:8000."
      );
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserAndRoles();
  }, [userId]);

  const handleAssignRole = async () => {
    if (!user) return;
    setIsUpdatingRole(true);
    try {
      await adminApi.roles.assignUserRole(user.id, selectedRoleId || null);
      await fetchUserAndRoles();
      alert("Habilitation plateforme mise à jour avec succès.");
    } catch (err: unknown) {
      alert((err as Error).message || "Erreur lors de l'assignation du rôle.");
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleToggleActive = async () => {
    if (!user) return;
    const nextState = !user.isActive;
    const confirmMsg = nextState
      ? `Réactiver le compte de "${user.fullName}" ?`
      : `Désactiver le compte de "${user.fullName}" ? L'utilisateur sera immédiatement déconnecté de ses exploitations.`;

    if (!window.confirm(confirmMsg)) return;

    setIsUpdatingActive(true);
    try {
      await adminApi.setUserActive(user.id, nextState);
      setUser((prev: UserItem | null) => (prev ? { ...prev, isActive: nextState } : prev));
    } catch (err: unknown) {
      alert((err as Error).message || "Erreur lors de la mise à jour");
    } finally {
      setIsUpdatingActive(false);
    }
  };

  const handleToggleSuperAdmin = async () => {
    if (!user) return;
    const isCurrentlySuperAdmin = user.roles.includes("ROLE_SUPER_ADMIN");
    const nextSuperAdminState = !isCurrentlySuperAdmin;
    const confirmMsg = nextSuperAdminState
      ? `Accorder les droits SUPER-ADMINISTRATEUR à "${user.fullName}" ? Cette personne aura un accès total au back-office plateforme.`
      : `Révoquer les droits super-administrateur de "${user.fullName}" ?`;

    if (!window.confirm(confirmMsg)) return;

    setIsUpdatingSuperAdmin(true);
    try {
      await adminApi.setUserSuperAdmin(user.id, nextSuperAdminState);
      const updatedRoles = nextSuperAdminState
        ? [...user.roles, "ROLE_SUPER_ADMIN"]
        : user.roles.filter((r: string) => r !== "ROLE_SUPER_ADMIN");
      setUser((prev: UserItem | null) => (prev ? { ...prev, roles: updatedRoles } : prev));
    } catch (err: unknown) {
      alert((err as Error).message || "Erreur lors du changement de rôle");
    } finally {
      setIsUpdatingSuperAdmin(false);
    }
  };

  const isSuperAdmin = user?.roles.includes("ROLE_SUPER_ADMIN");

  return (
    <div className="flex-1 flex flex-col">
      <AdminHeader
        title={user ? `Compte : ${user.fullName}` : "Détail de l'utilisateur"}
        description="Fiche administrative complète de l'utilisateur, de ses habilitations et de ses fermes affiliées."
      />

      <main className="p-6 md:p-8 space-y-6 max-w-7xl">
        {/* Navigation & Retour */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/users"
            className="inline-flex items-center gap-2 text-xs font-medium text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Retour à la liste des utilisateurs</span>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchUserAndRoles}
            isLoading={isLoading}
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Actualiser</span>
          </Button>
        </div>

        {/* État si l'utilisateur n'est pas trouvé ou API hors-ligne */}
        {!user && !isLoading && (
          <EmptyState
            icon={<Users />}
            title={apiError ? "Connexion API indisponible" : "Utilisateur introuvable"}
            description={
              apiError
                ? `${apiError} Aucune donnée de secours n'est affichée. Veuillez démarrer l'API Symfony.`
                : "Ce compte n'existe pas dans la base de données de production."
            }
            action={
              <Link href="/users">
                <Button variant="outline" size="sm">
                  Retour à la liste des utilisateurs
                </Button>
              </Link>
            }
          />
        )}

        {/* Fiche En-tête Utilisateur */}
        {user && (
          <div className="p-6 rounded-2xl border border-border bg-surface shadow-xs space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-2xl bg-primary text-white font-bold text-xl flex items-center justify-center shrink-0 shadow-xs">
                  {user.firstName[0]}
                  {user.lastName[0]}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-xl font-bold text-foreground tracking-tight">{user.fullName}</h2>
                    {user.isActive ? (
                      <Badge variant="success" dot>Compte Actif</Badge>
                    ) : (
                      <Badge variant="destructive" dot>Compte Désactivé</Badge>
                    )}
                    {isSuperAdmin ? (
                      <Badge variant="default" className="gap-1 bg-primary">
                        <ShieldCheck className="h-3 w-3" />
                        <span>ROLE_SUPER_ADMIN</span>
                      </Badge>
                    ) : (
                      <Badge variant="secondary">ROLE_USER</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted font-mono mt-1">Identifiant ULID : {user.id}</p>
                  <p className="text-xs text-muted">Email principal : {user.email}</p>
                </div>
              </div>

              {/* Actions Rapides */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={isSuperAdmin ? "outline" : "secondary"}
                  size="default"
                  isLoading={isUpdatingSuperAdmin}
                  onClick={handleToggleSuperAdmin}
                  className="gap-2 text-xs font-medium"
                >
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span>{isSuperAdmin ? "Révoquer Super-Admin" : "Promouvoir Super-Admin"}</span>
                </Button>

                <Button
                  variant={user.isActive ? "destructive" : "success"}
                  size="default"
                  isLoading={isUpdatingActive}
                  onClick={handleToggleActive}
                  className="gap-2 text-xs font-semibold"
                >
                  {user.isActive ? (
                    <>
                      <Ban className="h-4 w-4" />
                      <span>Désactiver le compte</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Activer le compte</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Grille Coordonnées */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border/60 text-xs">
              <div className="p-3.5 rounded-xl bg-surface-muted/50 border border-border">
                <span className="text-muted block text-[11px] mb-1">Email de connexion</span>
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <Mail className="h-3.5 w-3.5 text-muted" />
                  <span>{user.email}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-muted/50 border border-border">
                <span className="text-muted block text-[11px] mb-1">Téléphone de contact</span>
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <Phone className="h-3.5 w-3.5 text-muted" />
                  <span>{user.phone || "Non renseigné"}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-muted/50 border border-border">
                <span className="text-muted block text-[11px] mb-1">Date d'inscription</span>
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <Calendar className="h-3.5 w-3.5 text-muted" />
                  <span>{formatDate(user.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section Exploitations Avicoles Associées */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Warehouse className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Exploitations Avicoles Associées ({user?.farms?.length ?? 0})</CardTitle>
                <CardDescription>
                  Fermes avicoles dans lesquelles cet utilisateur possède un rôle actif.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {(!user?.farms || user.farms.length === 0) ? (
              <EmptyState
                icon={<Warehouse />}
                title="Aucune ferme associée"
                description="Cet utilisateur n'est actuellement rattaché à aucune exploitation avicole."
                className="m-6"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ferme</TableHead>
                    <TableHead>Organisation Parente</TableHead>
                    <TableHead>Rôle Attribué</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {user.farms.map((farm: UserFarmMembership) => (
                    <TableRow key={farm.id}>
                      <TableCell className="font-semibold text-xs text-foreground">
                        {farm.name}
                      </TableCell>
                      <TableCell className="text-xs text-muted">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-muted" />
                          <span>{farm.organization}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs font-semibold">
                          {farm.role === "OWNER"
                            ? "Propriétaire"
                            : farm.role === "FARM_MANAGER"
                            ? "Gérant d'exploitation"
                            : farm.role === "PRODUCTION_LEAD"
                            ? "Chef d'élevage"
                            : farm.role === "ACCOUNTANT"
                            ? "Comptable"
                            : farm.role}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Section Habilitations & Sécurité */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Privilèges & Sécurité Plateforme</CardTitle>
                <CardDescription>
                  Impact des rôles accordés sur les accès au système.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-xs text-muted">
            <div className="p-3.5 rounded-xl bg-surface-muted/50 border border-border flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground text-sm">
                  {user?.adminRole
                    ? `Rôle Plateforme : ${user.adminRole.name}`
                    : isSuperAdmin
                    ? "Compte Administrateur Plateforme (Super-Admin)"
                    : "Compte Éleveur Standard (Isolation Ferme)"}
                </p>
                <p className="mt-0.5">
                  {user?.adminRole || isSuperAdmin
                    ? "Cet utilisateur est membre du personnel plateforme et détient des habilitations sur la console centrale admin/."
                    : "Cet utilisateur accède exclusivement à l'application éleveur web/ et mobile/. Il est strictement exclu de la console d'administration centrale."}
                </p>
              </div>
            </div>

            {/* Sélecteur d'attribution de rôle plateforme */}
            <div className="p-4 rounded-xl border border-border bg-surface space-y-3">
              <div>
                <p className="font-semibold text-foreground text-xs">
                  Modifier l&apos;habilitation d&apos;administration
                </p>
                <p className="text-[11px] text-muted">
                  Assignez un rôle prédéfini ou personnalisé (modèle RBAC). Sélectionnez &laquo; Aucun &raquo; pour révoquer tout accès admin.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <select
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                  className="h-9 px-3 rounded-lg border border-border bg-surface-muted/30 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer flex-1"
                >
                  <option value="">Aucun rôle plateforme (Accès éleveur web/ uniquement)</option>
                  {availableRoles.map((r: any) => (
                    <option key={r.id} value={r.id}>
                      {r.name} (ROLE_{r.code}) {r.isSystem ? "[Système]" : "[Personnalisé]"}
                    </option>
                  ))}
                </select>

                <Button
                  variant="default"
                  size="sm"
                  onClick={handleAssignRole}
                  isLoading={isUpdatingRole}
                  className="text-xs shrink-0"
                >
                  Appliquer l&apos;habilitation
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
