"use client";

import React, { useEffect, useState } from "react";
import { Plus, Check, Lock, Save, AlertCircle } from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { api } from "@/lib/api-client";
import { FarmRole, Permission } from "@/lib/types";

export default function RolesMatrixPage() {
  const { activeFarm, hasPermission } = useAuth();
  const { toast } = useToast();

  const [roles, setRoles] = useState<FarmRole[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<FarmRole | null>(null);
  const [editedPermissions, setEditedPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Create Role Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [newRolePerms, setNewRolePerms] = useState<string[]>([]);
  const [submittingCreate, setSubmittingCreate] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeFarm?.id]);

  async function loadData() {
    setIsLoading(true);
    try {
      const [permsData, rolesData] = await Promise.all([
        api.roles.getPermissionsCatalog(),
        api.roles.listRoles(activeFarm?.id),
      ]);
      setPermissions(permsData.permissions);
      setRoles(rolesData);
      if (rolesData.length > 0) {
        setSelectedRole(rolesData[0]);
        setEditedPermissions(rolesData[0].permissions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSelectRole(role: FarmRole) {
    setSelectedRole(role);
    setEditedPermissions(role.permissions || []);
    setSuccessMsg(null);
  }

  function togglePermission(key: string) {
    if (selectedRole?.isSystem) {
      toast.warning("Les rôles système par défaut ne sont pas modifiables directement. Créez un rôle personnalisé pour adapter les accès.");
      return;
    }
    setEditedPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  }

  async function handleSaveRolePermissions() {
    if (!selectedRole || selectedRole.isSystem || !activeFarm?.id) return;
    setIsSaving(true);
    setSuccessMsg(null);
    try {
      const updated = await api.roles.updateRole(activeFarm.id, selectedRole.id, {
        permissions: editedPermissions,
      });
      toast.success("Permissions du rôle mises à jour avec succès !");
      setSelectedRole(updated);
      setRoles((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la mise à jour du rôle");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateCustomRole(e: React.FormEvent) {
    e.preventDefault();
    if (!newRoleName || !activeFarm?.id) return;
    setCreateError(null);
    setSubmittingCreate(true);
    try {
      const created = await api.roles.createRole(activeFarm.id, {
        name: newRoleName,
        description: newRoleDesc || undefined,
        permissions: newRolePerms,
      });
      setCreateModalOpen(false);
      setNewRoleName("");
      setNewRoleDesc("");
      setNewRolePerms([]);
      toast.success("Rôle personnalisé créé avec succès !");
      await loadData();
      setSelectedRole(created);
      setEditedPermissions(created.permissions || []);
    } catch (err: any) {
      const msg = err?.message || "Erreur lors de la création du rôle personnalisé";
      setCreateError(msg);
      toast.error(msg);
    } finally {
      setSubmittingCreate(false);
    }
  }

  // Group permissions dynamically by module/category
  const categories: Record<string, { label: string; perms: Permission[] }> = {};
  if (Array.isArray(permissions)) {
    permissions.forEach((p) => {
      const cat = p.category || "Général";
      if (!categories[cat]) {
        categories[cat] = { label: cat, perms: [] };
      }
      categories[cat].perms.push(p);
    });
  }

  return (
    <Shell>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-border">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Rôles & Droits d'Accès
          </h1>
          <p className="mt-1 text-xs text-muted">
            Choisissez ce que chaque employé a le droit de voir et de faire dans l'application.
          </p>
        </div>

        {hasPermission("role:create") && (
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-hover transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Créer un nouveau rôle</span>
          </button>
        )}
      </div>

      {successMsg && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-success-soft border border-success/20 p-3 text-xs font-semibold text-success">
          <Check className="h-4 w-4 text-success" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Grid: Left side Roles list, Right side Permissions Matrix */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Roles List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
              Liste des rôles ({roles.length})
            </h2>
            <div className="space-y-2">
              {roles.map((r) => {
                const isSelected = selectedRole?.id === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleSelectRole(r)}
                    className={`w-full rounded-xl p-3 text-left transition-all border ${
                      isSelected
                        ? "border-primary bg-primary-soft text-primary shadow-xs"
                        : "border-border bg-surface-muted text-foreground hover:bg-surface-hover"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{r.name}</span>
                      <Badge variant={r.isSystem ? "neutral" : "warning"} size="sm">
                        {r.isSystem ? "Standard" : "Personnalisé"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[11px] text-muted line-clamp-2">
                      {r.description || "Aucune description fournie"}
                    </p>
                    <div className="mt-2 text-[10px] font-mono font-medium text-muted">
                      {r.permissions.length} droit(s) accordé(s)
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Permissions Matrix */}
        <div className="lg:col-span-8">
          {selectedRole ? (
            <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-foreground">
                      Droits accordés à : {selectedRole.name}
                    </h2>
                    {selectedRole.isSystem && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-accent bg-accent-soft px-2 py-0.5 rounded-md">
                        <Lock className="h-3 w-3" />
                        Rôle par défaut
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted">
                    Cochez ou décochez les accès autorisés pour ce profil.
                  </p>
                </div>

                {!selectedRole.isSystem && hasPermission("role:update") && (
                  <button
                    type="button"
                    onClick={handleSaveRolePermissions}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-hover disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />
                    <span>{isSaving ? "Sauvegarde..." : "Enregistrer"}</span>
                  </button>
                )}
              </div>

              {/* Categorized Permissions Grid */}
              <div className="mt-6 space-y-6">
                {Object.entries(categories).map(([catKey, category]) => {
                  if (category.perms.length === 0) return null;

                  return (
                    <div
                      key={catKey}
                      className="rounded-xl border border-border bg-surface-muted p-4"
                    >
                      <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">
                        {category.label}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {category.perms.map((p) => {
                          const isChecked = editedPermissions.includes(p.key);
                          const isDisabled = selectedRole.isSystem;

                          return (
                            <label
                              key={p.key}
                              className={`flex items-start gap-2.5 rounded-xl p-2 transition-colors cursor-pointer ${
                                isChecked
                                  ? "bg-surface shadow-2xs border border-border"
                                  : "opacity-75 hover:opacity-100"
                              } ${isDisabled ? "cursor-not-allowed" : ""}`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isDisabled}
                                onChange={() => togglePermission(p.key)}
                                className="mt-0.5 h-4 w-4 rounded-md border-border text-primary focus:ring-primary"
                              />
                              <div className="text-xs leading-tight">
                                <span className="font-semibold text-foreground block">
                                  {p.label}
                                </span>
                                <span className="text-[11px] text-muted">
                                  {p.description}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-border p-6 text-xs text-muted">
              Sélectionnez un rôle pour visualiser et ajuster ses accès.
            </div>
          )}
        </div>
      </div>

      {/* CREATE CUSTOM ROLE MODAL */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Créer un rôle personnalisé pour l'agence"
        description="Définissez un nouvel intitulé et choisissez ses permissions d'accès initiales."
      >
        <form onSubmit={handleCreateCustomRole} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Intitulé du rôle
            </label>
            <input
              type="text"
              required
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="ex. Responsable Couvoir & Poussins"
              className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Description de la fonction
            </label>
            <input
              type="text"
              value={newRoleDesc}
              onChange={(e) => setNewRoleDesc(e.target.value)}
              placeholder="ex. Gestion opérationnelle des éclosions et des vaccins"
              className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-2">
              Permissions initiales ({newRolePerms.length} sélectionnée(s))
            </label>
            <div className="max-h-60 overflow-y-auto space-y-1.5 border border-border rounded-xl p-3 bg-surface-muted">
              {permissions.map((p) => {
                const isSelected = newRolePerms.includes(p.key);
                return (
                  <label
                    key={p.key}
                    className="flex items-center gap-2 p-1.5 text-xs cursor-pointer hover:bg-surface-hover rounded-lg"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        setNewRolePerms((prev) =>
                          prev.includes(p.key)
                            ? prev.filter((k) => k !== p.key)
                            : [...prev, p.key]
                        );
                      }}
                      className="h-3.5 w-3.5 text-primary rounded-md"
                    />
                    <span className="font-medium text-foreground">
                      {p.label}
                    </span>
                    <span className="text-[10px] text-muted font-mono ml-auto">
                      {p.key}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {createError && (
            <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{createError}</div>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setCreateModalOpen(false);
                setCreateError(null);
              }}
              className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted hover:bg-surface-hover"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submittingCreate}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-hover"
            >
              {submittingCreate ? "Création..." : "Créer le rôle"}
            </button>
          </div>
        </form>
      </Modal>
    </Shell>
  );
}
