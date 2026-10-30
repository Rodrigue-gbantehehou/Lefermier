"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  ContactRound,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Edit2,
  Trash2,
  ShoppingBag,
  Truck,
  Building,
  RefreshCw,
  ExternalLink,
  Users,
  AlertCircle,
} from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { api } from "@/lib/api-client";
import { Contact, ContactType } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { ModuleLockedState } from "@/components/ui/module-locked-state";

const TYPE_CONFIG: Record<
  ContactType,
  { label: string; badge: "success" | "info" | "warning" | "neutral"; icon: any; desc: string }
> = {
  CLIENT: {
    label: "Client / Acheteur",
    badge: "success",
    icon: ShoppingBag,
    desc: "Acheteurs d'œufs de table, poulets vifs/abattus, revendeuses",
  },
  SUPPLIER: {
    label: "Fournisseur",
    badge: "info",
    icon: Truck,
    desc: "Provenderies, couvoirs, pharmacies vétérinaires, intrants",
  },
  BOTH: {
    label: "Client & Fournisseur",
    badge: "warning",
    icon: Building,
    desc: "Partenaires commerciaux mixtes",
  },
};

const CITY_PRESETS = ["Cotonou", "Abomey-Calavi", "Allada", "Porto-Novo", "Bohicon", "Parakou", "Ouidah", "Zè"];

export default function ContactsPage() {
  const { activeFarm, hasPermission, hasModule } = useAuth();
  const { toast } = useToast();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // Modale Création / Édition
  const [modalOpen, setModalOpen] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<ContactType>("CLIENT");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("Abomey-Calavi");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modale Suppression
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (activeFarm?.id && hasModule("contacts")) {
      loadContacts();
    } else {
      setIsLoading(false);
    }
  }, [activeFarm?.id]);

  async function loadContacts() {
    if (!activeFarm?.id) return;
    setIsLoading(true);
    try {
      const data = await api.contacts.list({
        farmId: activeFarm.id,
        onlyActive: false,
      });
      setContacts(data);
    } catch (err) {
      console.error("Erreur chargement contacts:", err);
    } finally {
      setIsLoading(false);
    }
  }

  function openCreateModal(defaultType: ContactType = "CLIENT") {
    setContactError(null);
    setEditingContact(null);
    setName("");
    setType(defaultType);
    setPhone("");
    setEmail("");
    setCity("Abomey-Calavi");
    setAddress("");
    setNotes("");
    setIsActive(true);
    setModalOpen(true);
  }

  function openEditModal(c: Contact) {
    setContactError(null);
    setEditingContact(c);
    setName(c.name);
    setType(c.type);
    setPhone(c.phone || "");
    setEmail(c.email || "");
    setCity(c.city || "");
    setAddress(c.address || "");
    setNotes(c.notes || "");
    setIsActive(c.isActive);
    setModalOpen(true);
  }

  function openDeleteModal(c: Contact) {
    setContactToDelete(c);
    setDeleteModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeFarm?.id || !name.trim()) return;
    setContactError(null);
    setSubmitting(true);
    try {
      if (editingContact) {
        await api.contacts.update(editingContact.id, {
          name: name.trim(),
          type,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          city: city.trim() || undefined,
          address: address.trim() || undefined,
          notes: notes.trim() || undefined,
          isActive,
        });
        toast.success("Contact mis à jour avec succès !");
      } else {
        await api.contacts.create(activeFarm.id, {
          name: name.trim(),
          type,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          city: city.trim() || undefined,
          address: address.trim() || undefined,
          notes: notes.trim() || undefined,
        });
        toast.success("Contact créé avec succès !");
      }

      setModalOpen(false);
      await loadContacts();
    } catch (err: any) {
      const msg = err?.message || "Erreur lors de l'enregistrement du contact.";
      setContactError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!contactToDelete) return;
    setDeleting(true);
    try {
      await api.contacts.delete(contactToDelete.id);
      setDeleteModalOpen(false);
      setContactToDelete(null);
      toast.success("Contact supprimé avec succès.");
      await loadContacts();
    } catch (err: any) {
      toast.error(err?.message || "Impossible de supprimer ce contact.");
    } finally {
      setDeleting(false);
    }
  }

  // Filtrage
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const matchType = filterType === "ALL" || c.type === filterType;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.city && c.city.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q));
      return matchType && matchSearch;
    });
  }, [contacts, filterType, searchQuery]);

  // Statistiques
  const stats = useMemo(() => {
    const total = contacts.length;
    const clients = contacts.filter((c) => c.type === "CLIENT" || c.type === "BOTH").length;
    const suppliers = contacts.filter((c) => c.type === "SUPPLIER" || c.type === "BOTH").length;
    const active = contacts.filter((c) => c.isActive).length;
    return { total, clients, suppliers, active, inactive: total - active };
  }, [contacts]);

  // Colonnes de la table
  const columns: ColumnDef<Contact>[] = [
    {
      key: "name",
      header: "Nom & Raison Sociale",
      sortable: true,
      cell: (c) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground text-sm flex items-center gap-1.5">
            {c.name}
            {!c.isActive && (
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-muted/10 text-muted">
                Inactif
              </span>
            )}
          </span>
          {c.notes && (
            <span className="text-xs text-muted truncate max-w-xs">{c.notes}</span>
          )}
        </div>
      ),
    },
    {
      key: "type",
      header: "Type de Tiers",
      sortable: true,
      cell: (c) => {
        const conf = TYPE_CONFIG[c.type] || TYPE_CONFIG.CLIENT;
        return <div>{conf.label}</div>;
      },
    },
    {
      key: "phone",
      header: "Téléphone / MoMo",
      sortable: true,
      cell: (c) =>
        c.phone || c.email ? (
          <div className="flex flex-col gap-0.5 text-xs">
            {c.phone && (
              <a
                href={`tel:${c.phone.replace(/\s+/g, "")}`}
                className="inline-flex items-center gap-1 font-semibold text-foreground hover:text-primary"
              >
                <Phone className="h-3 w-3 text-muted" />
                {c.phone}
              </a>
            )}
            {c.email && (
              <a
                href={`mailto:${c.email}`}
                className="inline-flex items-center gap-1 text-muted hover:text-primary break-all"
              >
                <Mail className="h-3 w-3" />
                {c.email}
              </a>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted italic">Non renseigné</span>
        ),
    },
    {
      key: "city",
      header: "Ville & Localisation",
      sortable: true,
      cell: (c) => (
        <div className="flex items-center gap-1 text-xs text-foreground">
          {c.city ? (
            <>
              <span>{c.city}</span>
            </>
          ) : (
            <span className="text-muted italic">-</span>
          )}
        </div>
      ),
    },
    
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      cell: (c) => (
        <div className="flex items-center justify-end gap-1">
          {hasPermission("contact:update") && (
            <button
              onClick={() => openEditModal(c)}
              className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-primary-soft transition-colors cursor-pointer"
              title="Modifier le contact"
            >
              <Edit2 className="h-4 w-4" />
            </button>
          )}
          {hasPermission("contact:delete") && (
            <button
              onClick={() => openDeleteModal(c)}
              className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
              title="Supprimer le contact"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  if (!hasModule("contacts")) {
    return (
      <Shell>
        <ModuleLockedState
          moduleName="Contacts & Tiers"
          description="Le carnet de contacts des acheteurs, fournisseurs et partenaires n'est pas inclus dans votre formule actuelle."
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="space-y-3.5 sm:space-y-4">
        {/* En-tête mobile natif */}
        <PageHeader
          title="Contacts & Tiers"
          subtitle={`${stats.total} tiers enregistré(s)`}
          icon={<ContactRound className="h-4 w-4" />}
          actions={
            hasPermission("contact:create") && (
              <button
                type="button"
                onClick={() => openCreateModal("CLIENT")}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 sm:px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-primary-hover active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Nouveau contact</span>
              </button>
            )
          }
        />

        {/* Indicateurs Clés */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <StatCard
            title="Contacts"
            value={stats.total}
            icon={<Users className="h-5 w-5" />}
            subtitle={stats.active < stats.total ? `${stats.active} actifs` : undefined}
            accent="primary"
          />
          <StatCard
            title="Clients"
            value={stats.clients}
            icon={<ShoppingBag className="h-5 w-5" />}
            accent="primary"
          />
          <StatCard
            title="Fournisseurs"
            value={stats.suppliers}
            icon={<Truck className="h-5 w-5" />}
            accent="sky"
          />
          <StatCard
            title="Archivés"
            value={stats.inactive}
            icon={<AlertCircle className="h-5 w-5" />}
            accent="zinc"
          />
        </div>

        {/* Filtres & Recherche Hors Tableau (Style Vraie App Mobile) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          {/* Pastilles de Filtres Tactiles Défilantes */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 -mx-1 px-1 touch-pan-x">
            <button
              type="button"
              onClick={() => setFilterType("ALL")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold shrink-0 transition-all active:scale-95 cursor-pointer ${
                filterType === "ALL"
                  ? "bg-primary text-white shadow-xs"
                  : "bg-surface text-muted hover:text-foreground border border-border/80 hover:bg-surface-muted"
              }`}
            >
              Tous ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("CLIENT")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold shrink-0 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                filterType === "CLIENT"
                  ? "bg-success text-white shadow-xs"
                  : "bg-surface text-muted hover:text-foreground border border-border/80 hover:bg-surface-muted"
              }`}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Clients ({stats.clients})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("SUPPLIER")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold shrink-0 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                filterType === "SUPPLIER"
                  ? "bg-info text-white shadow-xs"
                  : "bg-surface text-muted hover:text-foreground border border-border/80 hover:bg-surface-muted"
              }`}
            >
              <Truck className="h-3.5 w-3.5" />
              Fournisseurs ({stats.suppliers})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("BOTH")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold shrink-0 transition-all active:scale-95 cursor-pointer ${
                filterType === "BOTH"
                  ? "bg-warning text-white shadow-xs"
                  : "bg-surface text-muted hover:text-foreground border border-border/80 hover:bg-surface-muted"
              }`}
            >
              Mixtes
            </button>
          </div>

          {/* Recherche textuelle mobile */}
          <div className="relative w-full sm:w-72 shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher nom, contact, ville..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full border border-border bg-surface pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted focus:border-primary focus:bg-surface-muted/30 focus:outline-hidden transition-all shadow-2xs"
            />
          </div>
        </div>

        {/* Table de Données ou État Vide */}
        {isLoading ? (
          <div className="bg-surface rounded-xl border border-border p-12 flex flex-col items-center justify-center text-center">
            <RefreshCw className="h-8 w-8 text-primary animate-spin mb-3" />
            <p className="text-sm font-medium text-foreground">Chargement de votre carnet d'adresses...</p>
            <p className="text-xs text-muted mt-1">Synchronisation des tiers de l'exploitation</p>
          </div>
        ) : filteredContacts.length === 0 ? (
          <EmptyState
            icon={<ContactRound className="h-6 w-6" />}
            title={searchQuery ? "Aucun contact correspondant" : "Aucun contact enregistré"}
            description={
              searchQuery
                ? `Aucun tiers ne correspond au filtre "${searchQuery}". Essayez un autre critère.`
                : "Constituez votre répertoire d'acheteurs d'œufs, clients de poulets de chair et fournisseurs d'aliments."
            }
            actionLabel={hasPermission("contact:create") ? "Ajouter un premier contact" : undefined}
            onAction={() => openCreateModal()}
          />
        ) : (
          <DataTable
            data={filteredContacts}
            columns={columns}
            pageSize={15}
            renderMobileCard={(c) => {
              const conf = TYPE_CONFIG[c.type] || TYPE_CONFIG.CLIENT;
              const TypeIcon = conf.icon;
              return (
                <div className="rounded-xl border border-border bg-surface p-3.5 shadow-xs">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <TypeIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-sm text-foreground break-words">{c.name}</p>
                        {!c.isActive && (
                          <Badge variant="neutral">Inactif</Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted">
                        {conf.label}
                        {c.city ? ` · ${c.city}` : ""}
                      </p>
                      {c.phone && (
                        <p className="mt-1 text-xs font-mono text-foreground">{c.phone}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 border-t border-border/60 pt-3">
                    {c.phone ? (
                      <a
                        href={`tel:${c.phone.replace(/\s+/g, "")}`}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2.5 text-xs font-bold text-white active:scale-95 transition-all"
                      >
                        <Phone className="h-4 w-4" />
                        Appeler
                      </a>
                    ) : (
                      <span className="flex-1 text-xs text-muted italic">Aucun téléphone</span>
                    )}
                    <button
                      type="button"
                      onClick={() => openEditModal(c)}
                      aria-label={`Modifier ${c.name}`}
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted hover:text-primary active:scale-95 transition-all"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openDeleteModal(c)}
                      aria-label={`Supprimer ${c.name}`}
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted hover:text-danger active:scale-95 transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            }}
          />
        )}

        {/* Modale Création / Modification de Contact */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingContact ? "Modifier contact" : "Nouveau contact"}
          description="Client ou fournisseur"
        >
          <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Nom <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Maman Pascaline, Provenderie Vano"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Type <span className="text-danger">*</span>
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as ContactType)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="CLIENT">Client (Œufs, Volailles)</option>
                  <option value="SUPPLIER">Fournisseur (Aliments, Soins)</option>
                  <option value="BOTH">Mixte (Client & Fournisseur)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Téléphone
                </label>
                <input
                  type="text"
                  placeholder="Ex: +229 97 00 00 00"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Ville
                </label>
                <input
                  type="text"
                  placeholder="Ex: Abomey-Calavi, Cotonou"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {CITY_PRESETS.slice(0, 5).map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => setCity(preset)}
                      className="px-1.5 py-0.5 text-[11px] font-medium rounded bg-muted/10 text-muted hover:text-foreground hover:bg-muted/20 transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="contact@exemple.bj"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Adresse / Repère
              </label>
              <input
                type="text"
                placeholder="Ex: Marché Dantokpa, Hangar 4"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Notes
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Règle par MoMo à la livraison"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              />
            </div>

            {editingContact && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                />
                <label htmlFor="isActiveToggle" className="text-xs font-medium text-foreground cursor-pointer">
                  Contact actif (disponible dans la sélection des transactions)
                </label>
              </div>
            )}

            {contactError && (
              <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium leading-relaxed">{contactError}</div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setContactError(null);
                }}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-surface border border-border text-muted hover:text-foreground transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-white hover:bg-primary-hover shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {submitting && <RefreshCw className="h-4 w-4 animate-spin" />}
                {editingContact ? "Mettre à jour" : "Enregistrer"}
              </button>
            </div>
          </form>
        </Modal>

        {/* Modale de Confirmation de Suppression */}
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Supprimer le contact"
          description="Action irréversible"
        >
          <div className="space-y-4 pt-2">
            <p className="text-sm text-foreground">
              Supprimer définitivement{" "}
              <strong className="text-danger">{contactToDelete?.name}</strong> ?
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-surface border border-border text-muted hover:text-foreground transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-danger text-white hover:bg-danger/90 shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {deleting && <RefreshCw className="h-4 w-4 animate-spin" />}
                Supprimer
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </Shell>
  );
}
