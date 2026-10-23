"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  CheckCircle2,
  Users,
  Lock,
  Layers,
  KeyRound,
  Info,
} from "lucide-react";
import { adminApi, AdminRoleItem, PermissionMeta } from "@/lib/api-client";
import { useAdminAuth } from "@/context/admin-auth-context";
import { AdminHeader } from "@/components/admin-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";

export default function AdminRolesPage() {
  const { hasPermission } = useAdminAuth();
  const canManageRoles = hasPermission("admin:roles:manage");

  const [roles, setRoles] = useState<AdminRoleItem[]>([]);
  const [permissions, setPermissions] = useState<Record<string, PermissionMeta>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Modal State (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<AdminRoleItem | null>(null);
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPermissions, setFormPermissions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Selected role for inspecting details
  const [selectedRole, setSelectedRole] = useState<AdminRoleItem | null>(null);

  const fetchRolesAndPermissions = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const [rolesData, permsData] = await Promise.all([
        adminApi.roles.list(),
        adminApi.roles.getPermissions(),
      ]);
      setRoles(rolesData);
      setPermissions(permsData.permissions || {});
      if (rolesData.length > 0 && !selectedRole) {
        setSelectedRole(rolesData[0]);
      }
    } catch (err: unknown) {
      setApiError(
        (err as Error).message || "Erreur de chargement des habilitations depuis le serveur API."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRolesAndPermissions();
  }, []);

  // Regrouper les permissions par module
  const permissionsByModule = useMemo(() => {
    const map: Record<string, Array<{ key: string; meta: PermissionMeta }>> = {};
    for (const [key, meta] of Object.entries(permissions)) {
      if (!map[meta.module]) {
        map[meta.module] = [];
      }
      map[meta.module].push({ key, meta });
    }
    return map;
  }, [permissions]);

  const openCreateModal = () => {
    setEditingRole(null);
    setFormName("");
    setFormCode("");
    setFormDescription("");
    setFormPermissions([]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (role: AdminRoleItem) => {
    setEditingRole(role);
    setFormName(role.name);
    setFormCode(role.code);
    setFormDescription(role.description || "");
    setFormPermissions(role.permissions);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleTogglePermission = (key: string) => {
    if (formPermissions.includes("*")) {
      // Si le rôle avait wildcard '*', en cochant une spécifique, on remplace par toutes sauf décochée
      const allKeys = Object.keys(permissions);
      setFormPermissions(allKeys.filter((k) => k !== key));
      return;
    }

    if (formPermissions.includes(key)) {
      setFormPermissions(formPermissions.filter((p) => p !== key));
    } else {
      setFormPermissions([...formPermissions, key]);
    }
  };

  const handleToggleAllInModule = (keys: string[]) => {
    const allIncluded = keys.every((k) => formPermissions.includes(k) || formPermissions.includes("*"));
    if (allIncluded) {
      setFormPermissions(formPermissions.filter((k) => !keys.includes(k) && k !== "*"));
    } else {
      const merged = Array.from(new Set([...formPermissions.filter((k) => k !== "*"), ...keys]));
      setFormPermissions(merged);
    }
  };

  const handleToggleWildcard = () => {
    if (formPermissions.includes("*")) {
      setFormPermissions([]);
    } else {
      setFormPermissions(["*"]);
    }
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim()) {
      setFormError("Le nom du rôle est requis.");
      return;
    }
    if (!editingRole && !formCode.trim()) {
      setFormError("Le code technique du rôle est requis.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingRole) {
        const updated = await adminApi.roles.update(editingRole.id, {
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          permissions: formPermissions,
        });
        setRoles((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        if (selectedRole?.id === updated.id) {
          setSelectedRole(updated);
        }
      } else {
        const created = await adminApi.roles.create({
          name: formName.trim(),
          code: formCode.trim().toUpperCase(),
          description: formDescription.trim() || undefined,
          permissions: formPermissions,
        });
        setRoles((prev) => [...prev, created]);
        setSelectedRole(created);
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      setFormError((err as Error).message || "Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRole = async (role: AdminRoleItem) => {
    if (role.isSystem) {
      alert("Les rôles système prédéfinis ne peuvent pas être supprimés.");
      return;
    }

    if (
      !window.confirm(
        `Êtes-vous certain de vouloir supprimer le rôle "${role.name}" (${role.code}) ?`
      )
    ) {
      return;
    }

    try {
      await adminApi.roles.delete(role.id);
      setRoles((prev) => prev.filter((r) => r.id !== role.id));
      if (selectedRole?.id === role.id) {
        setSelectedRole(roles.find((r) => r.id !== role.id) || null);
      }
    } catch (err: unknown) {
      alert((err as Error).message || "Impossible de supprimer ce rôle.");
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background">
      <AdminHeader
        title="Rôles & Permissions"
        description="Gestion des accès et des permissions."
      />

      <div className="p-6 space-y-6">
        {/* KPI / Resume Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-surface border-border flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted">Total rôles</p>
              <p className="text-2xl font-bold text-foreground mt-1">{roles.length}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <KeyRound className="h-5 w-5" />
            </div>
          </Card>

          <Card className="p-4 bg-surface border-border flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted">Rôles système</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {roles.filter((r) => r.isSystem).length}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </Card>

          <Card className="p-4 bg-surface border-border flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted">Rôles personnalisés</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {roles.filter((r) => !r.isSystem).length}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Layers className="h-5 w-5" />
            </div>
          </Card>

          <Card className="p-4 bg-surface border-border flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted">Permissions</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {Object.keys(permissions).length}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </Card>
        </div>

        {/* Action bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-muted">
            Sélectionnez un rôle pour voir ou modifier ses autorisations.
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRolesAndPermissions}
              disabled={isLoading}
              className="gap-2 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
            {canManageRoles && (
              <Button
                variant="default"
                size="sm"
                onClick={openCreateModal}
                className="gap-2 text-xs shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Nouveau rôle
              </Button>
            )}
          </div>
        </div>

        {apiError && (
          <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm flex items-center gap-3">
            <Info className="h-5 w-5 shrink-0" />
            <p className="flex-1">{apiError}</p>
            <Button variant="outline" size="sm" onClick={fetchRolesAndPermissions}>
              Réessayer
            </Button>
          </div>
        )}

        {/* Main RBAC Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Role List (5 columns) */}
          <div className="lg:col-span-5 space-y-3">
            <Card>
              <CardHeader className="pb-3 border-b border-border/70">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  <span>Rôles Collaborateurs Plateforme</span>
                  <span className="text-xs text-muted font-normal">{roles.length} enregistrés</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Sélectionnez un rôle pour inspecter sa matrice d&apos;habilitations.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 divide-y divide-border/60">
                {isLoading ? (
                  <div className="py-12 text-center text-sm text-muted space-y-2">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-primary" />
                    <p>Chargement des rôles...</p>
                  </div>
                ) : roles.length === 0 ? (
                  <EmptyState
                    icon={<KeyRound className="h-8 w-8 text-muted" />}
                    title="Aucun rôle trouvé"
                    description="Initialisez les rôles système par défaut."
                  />
                ) : (
                  roles.map((role) => {
                    const isSelected = selectedRole?.id === role.id;
                    const isWildcard = role.permissions.includes("*");

                    return (
                      <div
                        key={role.id}
                        onClick={() => setSelectedRole(role)}
                        className={`p-3.5 rounded-xl transition-all cursor-pointer flex flex-col gap-2 ${
                          isSelected
                            ? "bg-primary/5 border border-primary/30 shadow-xs"
                            : "hover:bg-surface-hover border border-transparent"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-foreground">
                                {role.name}
                              </span>
                              {role.isSystem ? (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                  Système
                                </Badge>
                              ) : (
                                <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                                  Personnalisé
                                </Badge>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-muted tracking-tight">
                              ROLE_{role.code}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            {canManageRoles && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(role);
                                }}
                                title="Modifier les habilitations"
                                className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-muted transition-colors"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {canManageRoles && !role.isSystem && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteRole(role);
                                }}
                                title="Supprimer ce rôle"
                                className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger-soft transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {role.description && (
                          <p className="text-xs text-muted line-clamp-2">{role.description}</p>
                        )}

                        <div className="flex items-center justify-between pt-1 text-[11px] text-muted">
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {role.usersCount} utilisateur{role.usersCount > 1 ? "s" : ""}
                          </span>
                          <span className="font-medium text-foreground">
                            {isWildcard
                              ? "Super-Admin (*)"
                              : `${role.permissions.length} permission${
                                  role.permissions.length > 1 ? "s" : ""
                                }`}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Detailed Permission Matrix of selected role (7 columns) */}
          <div className="lg:col-span-7">
            {selectedRole ? (
              <Card>
                <CardHeader className="border-b border-border/70 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-bold text-foreground">
                          {selectedRole.name}
                        </CardTitle>
                        <Badge
                          variant={selectedRole.isSystem ? "secondary" : "warning"}
                          className="text-[10px]"
                        >
                          {selectedRole.isSystem ? "Rôle Modèle Système" : "Rôle Personnalisé"}
                        </Badge>
                      </div>
                      <p className="text-xs font-mono text-muted mt-0.5">
                        Code d&apos;attribution : ROLE_{selectedRole.code}
                      </p>
                    </div>

                    {canManageRoles && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(selectedRole)}
                        className="gap-2 text-xs"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        Modifier Habilitations
                      </Button>
                    )}
                  </div>
                  {selectedRole.description && (
                    <p className="text-xs text-muted mt-2 bg-surface-muted/30 p-2.5 rounded-lg border border-border/50">
                      {selectedRole.description}
                    </p>
                  )}
                </CardHeader>

                <CardContent className="p-4 space-y-5">
                  {selectedRole.permissions.includes("*") ? (
                    <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-start gap-3">
                      <ShieldCheck className="h-5 w-5 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-sm">Privilèges Absolus (Wildcard `*`)</p>
                        <p className="text-xs opacity-90 mt-0.5">
                          Ce rôle détient l&apos;ensemble des permissions présentes et futures de la
                          console Lefermier sans restriction.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {/* Matrix by Module */}
                  <div className="space-y-4">
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      Détail des droits accordés par domaine
                    </p>

                    {Object.entries(permissionsByModule).map(([moduleName, perms]) => {
                      const isWildcard = selectedRole.permissions.includes("*");
                      const activeCount = isWildcard
                        ? perms.length
                        : perms.filter((p) => selectedRole.permissions.includes(p.key)).length;

                      return (
                        <div
                          key={moduleName}
                          className="rounded-xl border border-border/70 overflow-hidden bg-surface-muted/20"
                        >
                          <div className="px-4 py-2.5 bg-surface-muted/50 border-b border-border/60 flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground">{moduleName}</span>
                            <span className="text-[11px] font-semibold text-muted">
                              {activeCount} / {perms.length} accordé{activeCount > 1 ? "s" : ""}
                            </span>
                          </div>

                          <div className="p-3 divide-y divide-border/40">
                            {perms.map(({ key, meta }) => {
                              const isGranted =
                                isWildcard || selectedRole.permissions.includes(key);

                              return (
                                <div
                                  key={key}
                                  className="py-2.5 first:pt-1 last:pb-1 flex items-start justify-between gap-3"
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={`text-xs font-semibold ${
                                          isGranted ? "text-foreground" : "text-muted line-through"
                                        }`}
                                      >
                                        {meta.label}
                                      </span>
                                      <code className="text-[10px] text-muted font-mono bg-surface-muted px-1.5 py-0.5 rounded">
                                        {key}
                                      </code>
                                    </div>
                                    <p className="text-[11px] text-muted mt-0.5">
                                      {meta.description}
                                    </p>
                                  </div>

                                  <div className="shrink-0 mt-0.5">
                                    {isGranted ? (
                                      <Badge
                                        variant="success"
                                        className="gap-1 text-[10px] px-2 py-0.5"
                                      >
                                        <CheckCircle2 className="h-3 w-3" />
                                        Autorisé
                                      </Badge>
                                    ) : (
                                      <Badge
                                        variant="secondary"
                                        className="gap-1 text-[10px] px-2 py-0.5 opacity-60"
                                      >
                                        <Lock className="h-3 w-3" />
                                        Refusé
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center p-12 text-center text-muted">
                <p>Sélectionnez un rôle pour voir sa matrice de permissions.</p>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Modal Create / Edit Role */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRole ? `Modifier le rôle "${editingRole.name}"` : "Créer un Rôle Plateforme"}
        description="Configurez les droits d'accès granulaires pour les collaborateurs selon le modèle Microsoft RBAC."
        maxWidth="3xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSaveRole}
              disabled={isSubmitting}
              className="gap-2"
            >
              {isSubmitting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              {editingRole ? "Enregistrer les modifications" : "Créer le rôle"}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveRole} className="space-y-5">
          {formError && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-xs">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Nom affiché <span className="text-danger">*</span>
              </label>
              <Input
                placeholder="Ex: Responsable Support N2"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Code technique <span className="text-danger">*</span>
              </label>
              <Input
                placeholder="Ex: ADMIN_SUPPORT_N2"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                disabled={Boolean(editingRole)}
                className="text-xs font-mono"
                required
              />
              <p className="text-[10px] text-muted mt-1">
                Préfixé par ROLE_ lors de la vérification de sécurité.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Description de la mission
            </label>
            <Input
              placeholder="Ex: Traitement des réclamations éleveurs sans droit de résiliation..."
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="text-xs"
            />
          </div>

          {/* Quick Wildcard Toggle */}
          <div className="p-3 rounded-xl bg-surface-muted/40 border border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Privilège Super-Admin (Wildcard `*`)
                </p>
                <p className="text-[11px] text-muted">
                  Accorde automatiquement tous les droits actuels et futurs.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              id="wildcard-check"
              checked={formPermissions.includes("*")}
              onChange={handleToggleWildcard}
              className="h-4 w-4 rounded text-primary border-border focus:ring-primary cursor-pointer"
            />
          </div>

          {/* Permissions Grouped by Module with Checkboxes */}
          {!formPermissions.includes("*") && (
            <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Sélection des permissions granulaires
              </p>

              {Object.entries(permissionsByModule).map(([moduleName, perms]) => {
                const keys = perms.map((p) => p.key);
                const allSelected = keys.every((k) => formPermissions.includes(k));

                return (
                  <div
                    key={moduleName}
                    className="p-3 rounded-xl border border-border/80 bg-surface space-y-2.5"
                  >
                    <div className="flex items-center justify-between border-b border-border/50 pb-2">
                      <span className="text-xs font-bold text-foreground">{moduleName}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleAllInModule(keys)}
                        className="text-[11px] text-primary hover:underline font-medium"
                      >
                        {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
                      </button>
                    </div>

                    <div className="space-y-2">
                      {perms.map(({ key, meta }) => {
                        const isChecked = formPermissions.includes(key);

                        return (
                          <label
                            key={key}
                            className="flex items-start gap-2.5 cursor-pointer hover:bg-surface-muted/30 p-1.5 rounded-lg transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleTogglePermission(key)}
                              className="mt-0.5 h-4 w-4 rounded text-primary border-border focus:ring-primary"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-foreground">{meta.label}</p>
                              <p className="text-[11px] text-muted">{meta.description}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
