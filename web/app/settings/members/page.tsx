"use client";

import React, { useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  Mail,
  Phone,
  Check,
  UserX,
  Edit2,
  Trash2,
  Lock,
} from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api-client";
import { FarmMember, FarmRole } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default function MembersManagementPage() {
  const { activeFarm, hasPermission, user: currentUser, isLoading: authLoading } = useAuth();

  const [members, setMembers] = useState<FarmMember[]>([]);
  const [roles, setRoles] = useState<FarmRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal Ajout Collaborateur
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRoleId, setNewRoleId] = useState("");
  const [newRoleEnum, setNewRoleEnum] = useState("MANAGER");
  const [newPassword, setNewPassword] = useState("");
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Modal Modification Collaborateur
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FarmMember | null>(null);
  const [editRoleId, setEditRoleId] = useState("");
  const [editRoleEnum, setEditRoleEnum] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  useEffect(() => {
    if (activeFarm?.id) {
      loadData();
    } else if (!authLoading) {
      setIsLoading(false);
    }
  }, [activeFarm?.id, authLoading]);

  async function loadData() {
    if (!activeFarm?.id) return;
    setIsLoading(true);
    try {
      const [membersData, rolesData] = await Promise.all([
        api.members.list(activeFarm.id).catch(() => []),
        api.roles.listRoles(activeFarm.id).catch(() => []),
      ]);
      setMembers(Array.isArray(membersData) ? membersData : []);
      setRoles(Array.isArray(rolesData) ? rolesData : []);
      if (Array.isArray(rolesData) && rolesData.length > 0 && !newRoleId) {
        setNewRoleId(rolesData[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setFeedbackMsg({
        type: "error",
        text: err?.message || "Impossible de charger la liste des collaborateurs.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!activeFarm?.id || !newEmail || !newFirstName || !newLastName) return;

    setSubmittingCreate(true);
    setFeedbackMsg(null);
    try {
      await api.members.add(activeFarm.id, {
        email: newEmail,
        firstName: newFirstName,
        lastName: newLastName,
        phone: newPhone || undefined,
        roleId: newRoleId || undefined,
        role: newRoleEnum,
        password: newPassword || undefined,
      });

      setFeedbackMsg({
        type: "success",
        text: `Collaborateur ${newFirstName} ${newLastName} ajouté avec succès !`,
      });
      setCreateModalOpen(false);
      setNewEmail("");
      setNewFirstName("");
      setNewLastName("");
      setNewPhone("");
      setNewPassword("");
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Erreur lors de l'ajout du collaborateur.");
    } finally {
      setSubmittingCreate(false);
    }
  }

  function openEditModal(member: FarmMember) {
    setSelectedMember(member);
    setEditRoleId(member.roleDefinition?.id || "");
    setEditRoleEnum(member.role || "MANAGER");
    setEditIsActive(member.isActive);
    setEditModalOpen(true);
  }

  async function handleUpdateMember(e: React.FormEvent) {
    e.preventDefault();
    if (!activeFarm?.id || !selectedMember) return;

    setSubmittingEdit(true);
    setFeedbackMsg(null);
    try {
      await api.members.update(activeFarm.id, selectedMember.id, {
        roleId: editRoleId || undefined,
        role: editRoleEnum || undefined,
        isActive: editIsActive,
      });

      setFeedbackMsg({
        type: "success",
        text: `Accès et rôle de ${selectedMember.fullName} mis à jour avec succès.`,
      });
      setEditModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Erreur lors de la mise à jour du collaborateur.");
    } finally {
      setSubmittingEdit(false);
    }
  }

  async function handleDeleteMember(member: FarmMember) {
    if (member.isOwner) {
      alert("Le propriétaire de l'exploitation ne peut pas être retiré.");
      return;
    }

    if (
      !confirm(
        `Voulez-vous vraiment retirer ${member.fullName} de l'exploitation "${activeFarm?.name}" ? Ses accès seront immédiatement révoqués.`
      )
    ) {
      return;
    }

    if (!activeFarm?.id) return;
    try {
      await api.members.delete(activeFarm.id, member.id);
      setFeedbackMsg({
        type: "success",
        text: `${member.fullName} a été retiré de l'équipe avec succès.`,
      });
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Erreur lors de la dissociation du collaborateur.");
    }
  }

  // Calculs KPI
  const activeCount = members.filter((m) => m.isActive).length;
  const customRoleCount = members.filter((m) => m.roleDefinition).length;

  return (
    <Shell>
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-border">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Gestion des Utilisateurs & Employés
          </h1>
          <p className="mt-1 text-xs text-muted">
            Employés, techniciens avicoles, vétérinaires, magasiniers et chefs d'élevage rattachés à{" "}
            <span className="font-semibold text-foreground">{activeFarm?.name || "l'exploitation"}</span>.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-hover transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          <span>Ajouter un Utilisateur / Employé</span>
        </button>
      </div>

      {feedbackMsg && (
        <div
          className={`mt-4 flex items-center gap-2 rounded-xl border p-3 text-xs font-semibold ${
            feedbackMsg.type === "success"
              ? "bg-success-soft text-success border-success/20"
              : "bg-danger-soft text-danger border-danger/20"
          }`}
        >
          {feedbackMsg.type === "success" ? (
            <Check className="h-4 w-4 shrink-0 text-success" />
          ) : (
            <UserX className="h-4 w-4 shrink-0 text-danger" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Nombre total d'employés"
          value={`${members.length} personne(s)`}
          subtitle={`${activeCount} personne(s) en service`}
          accent="primary"
          icon={<Users className="h-5 w-5" />}
          trend={{
            value: "Équipe au complet",
            isPositive: true,
          }}
        />
        <StatCard
          title="Postes attribués"
          value={`${customRoleCount} assigné(s)`}
          subtitle="Postes créés pour la ferme"
          accent="amber"
          icon={<ShieldCheck className="h-5 w-5" />}
          trend={{
            value: "Postes de la ferme",
            isPositive: true,
          }}
        />
        <StatCard
          title="Comptes autorisés"
          value={members.length > 0 ? `${Math.round((activeCount / members.length) * 100)}%` : "100%"}
          subtitle="Personnes pouvant se connecter"
          accent={activeCount === members.length ? "primary" : "rose"}
          icon={<Shield className="h-5 w-5" />}
          trend={{
            value: activeCount === members.length ? "Accès autorisés" : "Comptes bloqués",
            isPositive: activeCount === members.length,
          }}
        />
      </div>

      {/* Members Table */}
      <div className="mt-8 rounded-2xl border border-border bg-surface p-5 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div>
            <h2 className="text-sm font-bold text-foreground">
              Liste des Utilisateurs & Employés ({members.length})
            </h2>
            <p className="text-xs text-muted">
              Attribution des accès et contrôle des privilèges par profil métier.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-xs text-muted animate-pulse">
            Chargement de l'équipe...
          </div>
        ) : members.length === 0 ? (
          <EmptyState
            icon={<Users className="h-6 w-6 text-primary" />}
            title="Aucun utilisateur ou employé rattaché"
            description="Ajoutez des employés ou techniciens pour leur attribuer des tâches opérationnelles."
            actionLabel="Ajouter un employé"
            onAction={() => setCreateModalOpen(true)}
            className="my-6 border-none"
          />
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-muted text-muted">
                <tr>
                  <th className="py-2.5 px-3 font-semibold rounded-l-lg">Utilisateur / Employé</th>
                  <th className="py-2.5 px-3 font-semibold">Contact</th>
                  <th className="py-2.5 px-3 font-semibold">Rôle Attribué</th>
                  <th className="py-2.5 px-3 font-semibold">Permissions</th>
                  <th className="py-2.5 px-3 font-semibold">Statut</th>
                  <th className="py-2.5 px-3 font-semibold">Date d'embauche</th>
                  <th className="py-2.5 px-3 font-semibold text-center rounded-r-lg">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {members.map((m) => {
                  const roleName = m.roleDefinition?.name || m.role || "Membre";
                  const isCurrent = currentUser?.id === m.userId;

                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-surface-hover transition-colors"
                    >
                      {/* Name & Avatar */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-soft font-bold text-primary text-xs uppercase shadow-2xs">
                            {m.firstName.charAt(0)}
                            {m.lastName.charAt(0)}
                            {m.isActive && (
                              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-surface" />
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-foreground block">
                              {m.fullName}
                              {isCurrent && (
                                <span className="ml-1.5 text-[10px] font-normal text-muted">(Vous)</span>
                              )}
                            </span>
                            <span className="text-[11px] text-muted block">
                              ID: {m.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 text-muted">
                            <Mail className="h-3 w-3" />
                            <span>{m.email}</span>
                          </div>
                          {m.phone && (
                            <div className="flex items-center gap-1 text-muted">
                              <Phone className="h-3 w-3" />
                              <span>{m.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Rôle */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant={
                              m.isOwner
                                ? "danger"
                                : m.roleDefinition
                                ? "warning"
                                : "info"
                            }
                            size="sm"
                          >
                            {m.isOwner ? "Propriétaire (Owner)" : roleName}
                          </Badge>
                          {m.roleDefinition?.isSystem && (
                            <span title="Rôle système prédéfini">
                              <Lock className="h-3 w-3 text-muted" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Permissions atomiques */}
                      <td className="py-3 px-3 font-mono text-[11px] text-muted">
                        {m.isOwner
                          ? "Accès total (22/22)"
                          : `${m.permissions?.length || 0} permission(s)`}
                      </td>

                      {/* Statut */}
                      <td className="py-3 px-3">
                        <Badge
                          variant={m.isActive ? "success" : "danger"}
                          size="sm"
                        >
                          {m.isActive ? "Actif" : "Suspendu"}
                        </Badge>
                      </td>

                      {/* Date de création */}
                      <td className="py-3 px-3 text-muted">
                        {formatDate(m.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {hasPermission("member:manage") && !m.isOwner && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditModal(m)}
                                className="rounded-lg p-1.5 text-muted hover:bg-surface-muted hover:text-foreground transition-colors"
                                title="Modifier le rôle ou statut"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteMember(m)}
                                className="rounded-lg p-1.5 text-danger hover:bg-danger-soft transition-colors"
                                title="Retirer de l'exploitation"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                          {m.isOwner && (
                            <span className="text-[10px] text-muted italic">
                              Protégé
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE MEMBER MODAL */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Ajouter un Utilisateur / Employé"
        description={`Ajoutez un employé, technicien, chef d'élevage ou gestionnaire pour l'exploitation "${activeFarm?.name}".`}
      >
        <form onSubmit={handleAddMember} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Prénom *
              </label>
              <input
                type="text"
                required
                value={newFirstName}
                onChange={(e) => setNewFirstName(e.target.value)}
                placeholder="ex. Koffi"
                className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Nom *
              </label>
              <input
                type="text"
                required
                value={newLastName}
                onChange={(e) => setNewLastName(e.target.value)}
                placeholder="ex. Mensah"
                className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Adresse Email (Identifiant de connexion) *
            </label>
            <input
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="koffi.mensah@lefermier.bj"
              className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Numéro de téléphone
            </label>
            <input
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="+229 97 00 00 00"
              className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Attribution du Rôle dans l'agence *
            </label>
            <select
              value={newRoleId}
              onChange={(e) => {
                setNewRoleId(e.target.value);
                const role = roles.find((r) => r.id === e.target.value);
                if (role) {
                  setNewRoleEnum(role.name.includes("Ponte") ? "PRODUCTION_LEAD" : "MANAGER");
                }
              }}
              className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
            >
              <optgroup label="Rôles de la matrice d'agence">
                {roles
                  .filter((r) => r.name !== "Propriétaire")
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.permissions?.length || 0} permissions)
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Rôles standards prédéfinis">
                <option value="">Gestionnaire / Manager d'exploitation</option>
              </optgroup>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Mot de passe initial (Optionnel)
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Laisser vide pour mot de passe par défaut : Lefermier@2026"
              className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
            />
            <p className="mt-1 text-[11px] text-muted">
              L'employé pourra modifier son mot de passe après sa première connexion.
            </p>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted hover:bg-surface-hover"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submittingCreate}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-hover"
            >
              {submittingCreate ? "Ajout..." : "Créer l'utilisateur / employé"}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT MEMBER MODAL */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Modifier les accès de ${selectedMember?.fullName || ""}`}
        description="Mettez à jour son profil métier ou suspendez temporairement ses accès."
      >
        <form onSubmit={handleUpdateMember} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Rôle dans la matrice d'agence
            </label>
            <select
              value={editRoleId}
              onChange={(e) => setEditRoleId(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
            >
              <option value="">Rôle standard (sans matrice)</option>
              {roles
                .filter((r) => r.name !== "Propriétaire")
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.permissions?.length || 0} permissions)
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Statut du compte
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEditIsActive(true)}
                className={`rounded-xl border py-2.5 text-xs font-bold ${
                  editIsActive
                    ? "border-success bg-success text-white"
                    : "border-border bg-surface text-muted"
                }`}
              >
                Actif (Accès autorisé)
              </button>
              <button
                type="button"
                onClick={() => setEditIsActive(false)}
                className={`rounded-xl border py-2.5 text-xs font-bold ${
                  !editIsActive
                    ? "border-danger bg-danger text-white"
                    : "border-border bg-surface text-muted"
                }`}
              >
                Suspendu (Bloqué)
              </button>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted hover:bg-surface-hover"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submittingEdit}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-hover"
            >
              {submittingEdit ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </Modal>
    </Shell>
  );
}
