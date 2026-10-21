"use client";

import React, { useEffect, useState } from "react";
import {
  HeartPulse,
  Plus,
  Zap,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Syringe,
  Pill,
  Droplet,
  Sparkles,
  ShieldAlert,
  Trash2,
  Edit2,
  Check,
  Building,
  User,
  Coins,
  AlertCircle,
} from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { api } from "@/lib/api-client";
import {
  Flock,
  HealthTreatment,
  HealthTreatmentStatus,
  HealthTreatmentType,
  AdministrationMethod,
  InventoryItem,
} from "@/lib/types";
import { formatDate, formatNumber } from "@/lib/utils";

export default function HealthPage() {
  const { activeFarm } = useAuth();
  const { toast } = useToast();

  const [treatments, setTreatments] = useState<HealthTreatment[]>([]);
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [meta, setMeta] = useState<{ totalItems: number; overdueCount: number; upcomingCount: number }>({
    totalItems: 0,
    overdueCount: 0,
    upcomingCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filtres
  const [selectedFlockId, setSelectedFlockId] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedType, setSelectedType] = useState<string>("ALL");

  // Modale Nouveau Soin
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createFlockId, setCreateFlockId] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [createType, setCreateType] = useState<HealthTreatmentType>("VACCINATION");
  const [createCustomType, setCreateCustomType] = useState("");
  const [createMethod, setCreateMethod] = useState<AdministrationMethod>("DRINKING_WATER");
  const [createCustomMethod, setCreateCustomMethod] = useState("");
  const [createScheduledDate, setCreateScheduledDate] = useState("");
  const [createTargetAgeDays, setCreateTargetAgeDays] = useState<number | string>("");
  const [createInventoryItemId, setCreateInventoryItemId] = useState("");
  const [createQuantityUsed, setCreateQuantityUsed] = useState("");
  const [createCostFcfa, setCreateCostFcfa] = useState<number | string>("");
  const [createVeterinarian, setCreateVeterinarian] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Modale Génération Programme Automatique
  const [programModalOpen, setProgramModalOpen] = useState(false);
  const [programError, setProgramError] = useState<string | null>(null);
  const [programFlockId, setProgramFlockId] = useState("");
  const [programType, setProgramType] = useState("AUTO");
  const [generatingProgram, setGeneratingProgram] = useState(false);

  // Modale Valider l'administration
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [selectedTreatment, setSelectedTreatment] = useState<HealthTreatment | null>(null);
  const [completeDate, setCompleteDate] = useState("");
  const [completeCostFcfa, setCompleteCostFcfa] = useState<number | string>("");
  const [completeQuantityUsed, setCompleteQuantityUsed] = useState("");
  const [completeVeterinarian, setCompleteVeterinarian] = useState("");
  const [completeNotes, setCompleteNotes] = useState("");
  const [completeInventoryItemId, setCompleteInventoryItemId] = useState("");
  const [completeDeductStock, setCompleteDeductStock] = useState(true);
  const [submittingComplete, setSubmittingComplete] = useState(false);

  // Suggestions rapides pour le formulaire
  const PRESET_TREATMENTS = [
    {
      title: "Vaccin Gumboro 1ère dose (IBD)",
      type: "VACCINATION" as HealthTreatmentType,
      method: "DRINKING_WATER" as AdministrationMethod,
      age: 7,
    },
    {
      title: "Vaccin Newcastle (HB1 / Clone 30)",
      type: "VACCINATION" as HealthTreatmentType,
      method: "OCULAR_NASAL" as AdministrationMethod,
      age: 10,
    },
    {
      title: "Vaccin Gumboro 2ème dose (rappel)",
      type: "VACCINATION" as HealthTreatmentType,
      method: "DRINKING_WATER" as AdministrationMethod,
      age: 14,
    },
    {
      title: "Traitement préventif Anticoccidien",
      type: "TREATMENT" as HealthTreatmentType,
      method: "DRINKING_WATER" as AdministrationMethod,
      age: 18,
    },
    {
      title: "Vaccin Newcastle (LaSota)",
      type: "VACCINATION" as HealthTreatmentType,
      method: "DRINKING_WATER" as AdministrationMethod,
      age: 21,
    },
    {
      title: "Vermifugation / Déparasitage interne",
      type: "DEWORMING" as HealthTreatmentType,
      method: "DRINKING_WATER" as AdministrationMethod,
      age: 28,
    },
    {
      title: "Solution réhydratante & Anti-stress",
      type: "VITAMIN" as HealthTreatmentType,
      method: "DRINKING_WATER" as AdministrationMethod,
      age: 1,
    },
  ];

  useEffect(() => {
    if (activeFarm?.id) {
      loadData();
    }
  }, [activeFarm?.id, selectedFlockId, selectedStatus]);

  async function loadData() {
    if (!activeFarm?.id) return;
    setIsLoading(true);
    try {
      const [treatmentsRes, flocksRes, itemsRes] = await Promise.all([
        api.health.list(activeFarm.id, {
          flockId: selectedFlockId !== "ALL" ? selectedFlockId : undefined,
          status: selectedStatus !== "ALL" ? selectedStatus : undefined,
        }),
        api.flocks.list({ farmId: activeFarm.id }),
        api.inventory.listItems({ farmId: activeFarm.id }),
      ]);

      setTreatments(treatmentsRes.data || []);
      setMeta(treatmentsRes.meta || { totalItems: 0, overdueCount: 0, upcomingCount: 0 });
      setFlocks(flocksRes || []);
      setInventoryItems(itemsRes || []);

      if (flocksRes?.length > 0 && !createFlockId) {
        setCreateFlockId(flocksRes[0].id);
        setProgramFlockId(flocksRes[0].id);
      }
    } catch (err) {
      console.error("Erreur chargement données santé:", err);
    } finally {
      setIsLoading(false);
    }
  }

  function handleOpenCreateModal() {
    setCreateTitle("");
    setCreateType("VACCINATION");
    setCreateMethod("DRINKING_WATER");
    setCreateScheduledDate(new Date().toISOString().split("T")[0]);
    setCreateTargetAgeDays("");
    setCreateInventoryItemId("");
    setCreateQuantityUsed("");
    setCreateCostFcfa("");
    setCreateVeterinarian("");
    setCreateNotes("");
    if (flocks.length > 0 && !createFlockId) {
      setCreateFlockId(flocks[0].id);
    }
    setCreateModalOpen(true);
  }

  function applyPreset(preset: typeof PRESET_TREATMENTS[0]) {
    setCreateTitle(preset.title);
    setCreateType(preset.type);
    setCreateMethod(preset.method);
    setCreateTargetAgeDays(preset.age);

    const flock = flocks.find((f) => f.id === createFlockId);
    if (flock?.startDate) {
      const start = new Date(flock.startDate);
      start.setDate(start.getDate() + Math.max(0, preset.age - (flock.initialQuantity ? 1 : 1)));
      setCreateScheduledDate(start.toISOString().split("T")[0]);
    }
  }

  async function handleCreateTreatment(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    if (!activeFarm?.id || !createFlockId || !createTitle || !createScheduledDate) {
      const msg = "Veuillez remplir les champs obligatoires (bande, titre, date prévue).";
      setCreateError(msg);
      toast.warning(msg);
      return;
    }

    setSubmittingCreate(true);
    try {
      await api.health.create(activeFarm.id, {
        flockId: createFlockId,
        title: createTitle,
        type: createType,
        administrationMethod: createMethod,
        scheduledDate: createScheduledDate,
        targetAgeDays: createTargetAgeDays !== "" ? Number(createTargetAgeDays) : undefined,
        inventoryItemId: createInventoryItemId || undefined,
        quantityUsed: createQuantityUsed || undefined,
        costFcfa: createCostFcfa !== "" ? Number(createCostFcfa) : undefined,
        veterinarian: createVeterinarian || undefined,
        notes: [
          createType === "OTHER" && createCustomType ? `Intervention: ${createCustomType.trim()}` : "",
          createMethod === "OTHER" && createCustomMethod ? `Méthode: ${createCustomMethod.trim()}` : "",
          createNotes,
        ].filter(Boolean).join(" | ") || undefined,
      });

      setCreateModalOpen(false);
      setCreateCustomType("");
      setCreateCustomMethod("");
      toast.success("Soin planifié avec succès !");
      await loadData();
    } catch (err: any) {
      const msg = err?.message || "Erreur lors de la planification du soin.";
      setCreateError(msg);
      toast.error(msg);
    } finally {
      setSubmittingCreate(false);
    }
  }

  async function handleGenerateProgram(e: React.FormEvent) {
    e.preventDefault();
    setProgramError(null);
    if (!activeFarm?.id || !programFlockId) {
      const msg = "Veuillez sélectionner une bande.";
      setProgramError(msg);
      toast.warning(msg);
      return;
    }

    setGeneratingProgram(true);
    try {
      const res = await api.health.generateProgram(activeFarm.id, {
        flockId: programFlockId,
        programType: programType !== "AUTO" ? programType : undefined,
      });

      toast.success(`${res.length} interventions programmées avec succès pour cette bande !`);
      setProgramModalOpen(false);
      await loadData();
    } catch (err: any) {
      const msg = err?.message || "Erreur lors de la génération du programme.";
      setProgramError(msg);
      toast.error(msg);
    } finally {
      setGeneratingProgram(false);
    }
  }

  function handleOpenComplete(t: HealthTreatment) {
    setSelectedTreatment(t);
    setCompleteDate(new Date().toISOString().split("T")[0]);
    setCompleteCostFcfa(t.costFcfa || "");
    setCompleteQuantityUsed(t.quantityUsed || "");
    setCompleteVeterinarian(t.veterinarian || "");
    setCompleteNotes(t.notes || "");
    setCompleteInventoryItemId(t.inventoryItem?.id || "");
    setCompleteDeductStock(true);
    setCompleteModalOpen(true);
  }

  async function handleCompleteTreatment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTreatment) return;

    setSubmittingComplete(true);
    try {
      await api.health.complete(selectedTreatment.id, {
        administeredDate: completeDate,
        costFcfa: completeCostFcfa !== "" ? Number(completeCostFcfa) : undefined,
        quantityUsed: completeQuantityUsed || undefined,
        veterinarian: completeVeterinarian || undefined,
        notes: completeNotes || undefined,
        inventoryItemId: completeInventoryItemId || undefined,
        deductFromStock: completeDeductStock,
      });

      setCompleteModalOpen(false);
      toast.success("Administration du soin validée avec succès !");
      await loadData();
    } catch (err: any) {
      const msg = err?.message || "Erreur lors de la validation du soin.";
      setCompleteError(msg);
      toast.error(msg);
    } finally {
      setSubmittingComplete(false);
    }
  }

  async function handleDeleteTreatment(id: string) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette intervention ?")) return;
    try {
      await api.health.delete(id);
      toast.success("Intervention supprimée avec succès.");
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la suppression.");
    }
  }

  // Filtrage local additionnel
  const filteredTreatments = treatments.filter((t) => {
    if (selectedType !== "ALL" && t.type !== selectedType) return false;
    return true;
  });

  // Calculs synthétiques
  const completedCount = treatments.filter((t) => t.status === "COMPLETED").length;
  const totalCost = treatments.reduce((acc, t) => acc + (t.costFcfa || 0), 0);

  return (
    <Shell>
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2.5">
              <HeartPulse className="h-7 w-7 text-accent" />
              Santé & Prophylaxie
            </h1>
            <p className="mt-1 text-sm text-muted">
              Calendrier vaccinal, rappels sanitaires et suivi des traitements par bande.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                if (flocks.length === 0) {
                  toast.warning("Veuillez d'abord créer une bande de volailles.");
                  return;
                }
                setProgramError(null);
                setProgramModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3.5 py-2 text-sm font-semibold text-accent hover:bg-accent/20 transition-colors shadow-sm"
            >
              <Zap className="h-4 w-4" />
              Programme Standard 1-Clic
            </button>

            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover transition-colors"
            >
              <Plus className="h-4 w-4" />
              Planifier un soin
            </button>
          </div>
        </div>

        {/* Cartes KPI */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            title="Total interventions"
            value={meta.totalItems}
            subtitle={`${treatments.length} affichée(s)`}
            icon={<Calendar className="h-5 w-5" />}
            accent="sky"
          />
          <StatCard
            title="En retard"
            value={meta.overdueCount}
            subtitle={meta.overdueCount > 0 ? "⚠️ Nécessite attention" : "À jour"}
            icon={<AlertTriangle className="h-5 w-5" />}
            accent={meta.overdueCount > 0 ? "rose" : "zinc"}
          />
          <StatCard
            title="Soins administrés"
            value={completedCount}
            subtitle={`${meta.totalItems > 0 ? Math.round((completedCount / meta.totalItems) * 100) : 0}% de couverture`}
            icon={<CheckCircle2 className="h-5 w-5" />}
            accent="primary"
          />
          <StatCard
            title="Dépenses sanitaires"
            value={`${formatNumber(totalCost)} FCFA`}
            subtitle="Coût total des soins"
            icon={<Coins className="h-5 w-5" />}
            accent="amber"
          />
        </div>

        {/* Barre de filtres */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-3.5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted uppercase tracking-wider">
            <Filter className="h-4 w-4" />
            Filtres :
          </div>

          {/* Bande */}
          <select
            value={selectedFlockId}
            onChange={(e) => setSelectedFlockId(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
          >
            <option value="ALL">Toutes les bandes</option>
            {flocks.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.code || "Lot"})
              </option>
            ))}
          </select>

          {/* Statut */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="SCHEDULED">Planifiés / À venir</option>
            <option value="COMPLETED">Administrés</option>
            <option value="MISSED">En retard</option>
            <option value="CANCELLED">Annulés</option>
          </select>

          {/* Catégorie */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
          >
            <option value="ALL">Toutes les catégories</option>
            <option value="VACCINATION">Vaccinations</option>
            <option value="TREATMENT">Traitements curatifs</option>
            <option value="DEWORMING">Déparasitages</option>
            <option value="VITAMIN">Vitamines & Fortifiants</option>
            <option value="DISINFECTION">Désinfections</option>
            <option value="OTHER">Autres soins</option>
          </select>
        </div>

        {/* Liste des interventions */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-surface">
            <div className="flex items-center gap-3 text-muted">
              <Clock className="h-5 w-5 animate-spin text-accent" />
              <span>Chargement du calendrier prophylactique...</span>
            </div>
          </div>
        ) : filteredTreatments.length === 0 ? (
          <EmptyState
            title="Aucune intervention sanitaire trouvée"
            description="Créez une intervention ou utilisez la génération de programme en 1-clic pour planifier automatiquement les vaccins de votre bande."
            actionLabel="Générer le programme vaccinal"
            onAction={() => setProgramModalOpen(true)}
          />
        ) : (
          <div className="space-y-3">
            {filteredTreatments.map((t) => {
              const isScheduled = t.status === "SCHEDULED";
              const isCompleted = t.status === "COMPLETED";

              // Style badges
              const typeIcon = {
                VACCINATION: Syringe,
                TREATMENT: Pill,
                DEWORMING: Droplet,
                VITAMIN: Sparkles,
                DISINFECTION: ShieldAlert,
                OTHER: HeartPulse,
              }[t.type] || HeartPulse;

              const TypeIconComp = typeIcon;

              return (
                <div
                  key={t.id}
                  className={`flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between transition-all ${
                    t.isOverdue
                      ? "border-danger/40 bg-danger/5 shadow-sm"
                      : isCompleted
                      ? "border-border bg-surface/60 opacity-90"
                      : "border-border bg-surface hover:border-primary/30 shadow-sm"
                  }`}
                >
                  {/* Gauche : Infos principales */}
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                        t.type === "VACCINATION"
                          ? "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/40 dark:bg-purple-950/30 dark:text-purple-300"
                          : t.type === "VITAMIN"
                          ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300"
                          : t.type === "DEWORMING"
                          ? "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900/40 dark:bg-cyan-950/30 dark:text-cyan-300"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300"
                      }`}
                    >
                      <TypeIconComp className="h-5 w-5" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground text-base">
                          {t.title}
                        </span>

                        {t.isOverdue && (
                          <Badge variant="danger" size="sm">
                            ⚠️ En retard
                          </Badge>
                        )}

                        {isCompleted && (
                          <Badge variant="success" size="sm">
                            ✓ Administré
                          </Badge>
                        )}

                        {!t.isOverdue && isScheduled && (
                          <Badge variant="info" size="sm">
                            Planifié
                          </Badge>
                        )}

                        <Badge variant="neutral" size="sm">
                          {t.typeLabel}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                        <span className="font-medium text-foreground">
                          Bande : {t.flock?.name} ({t.flock?.code || "Lot"})
                        </span>
                        <span>•</span>
                        <span>Âge cible : <strong className="text-foreground">J{t.targetAgeDays}</strong></span>
                        <span>•</span>
                        <span>Mode : {t.administrationMethodLabel}</span>
                        {t.veterinarian && (
                          <>
                            <span>•</span>
                            <span>Véto : {t.veterinarian}</span>
                          </>
                        )}
                        {t.costFcfa !== null && t.costFcfa !== undefined && (
                          <>
                            <span>•</span>
                            <span className="font-semibold text-foreground">
                              {formatNumber(t.costFcfa)} FCFA
                            </span>
                          </>
                        )}
                      </div>

                      {t.notes && (
                        <p className="mt-1 text-xs text-muted/90 italic">
                          "{t.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Droite : Dates & Actions */}
                  <div className="flex shrink-0 flex-wrap items-center gap-3 sm:flex-col sm:items-end">
                    <div className="text-right text-xs">
                      <div className="text-muted">Prévu le :</div>
                      <div className="font-semibold text-foreground">
                        {formatDate(t.scheduledDate)}
                      </div>
                      {t.administeredDate && (
                        <div className="text-[11px] text-success">
                          Fait le {formatDate(t.administeredDate)}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isScheduled && (
                        <button
                          onClick={() => handleOpenComplete(t)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-success-hover transition-colors"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Valider
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteTreatment(t.id)}
                        className="rounded-lg border border-border p-1.5 text-muted hover:border-danger hover:text-danger transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODALE 1 : PLANIFIER UN SOIN */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Planifier une intervention sanitaire"
        description="Enregistrez une vaccination, un déparasitage ou un traitement préventif."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateTreatment} className="space-y-4">
          {/* Puces de presets rapides */}
          <div>
            <label className="text-xs font-semibold text-muted block mb-1.5">
              💡 Raccourcis fréquents (1-clic pour pré-remplir) :
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_TREATMENTS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  {p.title.split(":")[0]} (J{p.age})
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Bande concernée *
              </label>
              <select
                value={createFlockId}
                onChange={(e) => setCreateFlockId(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                {flocks.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.code || "Lot"} - {f.currentQuantity} têtes)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Titre de l'intervention *
              </label>
              <input
                type="text"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder="Ex: Vaccin Gumboro J7"
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Catégorie de soin *
              </label>
              <select
                value={createType}
                onChange={(e) => setCreateType(e.target.value as HealthTreatmentType)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                <option value="VACCINATION">Vaccination</option>
                <option value="TREATMENT">Traitement curatif (antibiotique...)</option>
                <option value="DEWORMING">Déparasitage / Vermifugation</option>
                <option value="VITAMIN">Vitamines & Fortifiants</option>
                <option value="DISINFECTION">Désinfection des locaux</option>
                <option value="OTHER">Autre intervention</option>
              </select>
              {createType === "OTHER" && (
                <div className="mt-2">
                  <input
                    type="text"
                    required
                    value={createCustomType}
                    onChange={(e) => setCreateCustomType(e.target.value)}
                    placeholder="Précisez l'intervention (ex. Épointage, Pesée...)"
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Mode d'administration *
              </label>
              <select
                value={createMethod}
                onChange={(e) => setCreateMethod(e.target.value as AdministrationMethod)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                <option value="DRINKING_WATER">Eau de boisson</option>
                <option value="INJECTION">Injection sous-cutanée / musculaire</option>
                <option value="OCULAR_NASAL">Goutte oculaire ou nasale</option>
                <option value="SPRAY">Nébulisation / Spray</option>
                <option value="FEED">Mélange dans l'aliment</option>
                <option value="TOPICAL">Application alaire / cutanée</option>
                <option value="OTHER">Autre méthode</option>
              </select>
              {createMethod === "OTHER" && (
                <div className="mt-2">
                  <input
                    type="text"
                    required
                    value={createCustomMethod}
                    onChange={(e) => setCreateCustomMethod(e.target.value)}
                    placeholder="Précisez la méthode (ex. Sonde, Gavage...)"
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Date prévue *
              </label>
              <input
                type="date"
                value={createScheduledDate}
                onChange={(e) => setCreateScheduledDate(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Âge cible (en jours)
              </label>
              <input
                type="number"
                min="0"
                value={createTargetAgeDays}
                onChange={(e) => {
                  const val = e.target.value;
                  setCreateTargetAgeDays(val === "" ? "" : Math.max(0, parseInt(val) || 0));
                }}
                onFocus={(e) => e.target.select()}
                placeholder="Ex: 7, 14, 21..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Coût estimé (FCFA)
              </label>
              <input
                type="number"
                min="0"
                value={createCostFcfa}
                onChange={(e) => {
                  const val = e.target.value;
                  setCreateCostFcfa(val === "" ? "" : Math.max(0, parseInt(val) || 0));
                }}
                onFocus={(e) => e.target.select()}
                placeholder="0"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Article de stock associé (optionnel)
              </label>
              <select
                value={createInventoryItemId}
                onChange={(e) => setCreateInventoryItemId(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                <option value="">Aucun article lié</option>
                {inventoryItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.currentStock} {item.unit})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Vétérinaire / Opérateur
              </label>
              <input
                type="text"
                value={createVeterinarian}
                onChange={(e) => setCreateVeterinarian(e.target.value)}
                placeholder="Ex: Dr. Dossou / Chef élevage"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Instructions & Remarques
            </label>
            <textarea
              rows={2}
              value={createNotes}
              onChange={(e) => setCreateNotes(e.target.value)}
              placeholder="Ex: Assoiffer les poules 2h avant la distribution dans l'eau..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          {createError && (
            <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{createError}</div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => {
                setCreateModalOpen(false);
                setCreateError(null);
              }}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submittingCreate}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50 transition-colors shadow-sm"
            >
              {submittingCreate ? "Planification..." : "Planifier l'intervention"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODALE 2 : GÉNÉRATION DU PROGRAMME STANDARD 1-CLIC */}
      <Modal
        isOpen={programModalOpen}
        onClose={() => setProgramModalOpen(false)}
        title="Générer le programme prophylactique standard"
        description="Génère automatiquement la chronologie vaccinale complète adaptée au Bénin et à l'Afrique de l'Ouest."
      >
        <form onSubmit={handleGenerateProgram} className="space-y-4">
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 text-xs text-foreground space-y-2">
            <div className="font-semibold text-accent flex items-center gap-1.5">
              <Zap className="h-4 w-4" />
              Programme officiel pré-calibré :
            </div>
            <ul className="list-disc list-inside space-y-1 text-muted">
              <li>
                <strong>Poulets de chair :</strong> Réception anti-stress (J1), Gumboro (J7, J14), Newcastle (J10, J21), Anticoccidien (J18), Déparasitage (J28).
              </li>
              <li>
                <strong>Poules pondeuses :</strong> Programme complet jusqu'à l'entrée en ponte (Gumboro x3, Newcastle, Variole aviaire, Coryza x2, purge vermifuge).
              </li>
            </ul>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Bande de volailles cible *
            </label>
            <select
              value={programFlockId}
              onChange={(e) => setProgramFlockId(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            >
              {flocks.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.breed} - {f.currentQuantity} têtes - Début : {formatDate(f.startDate)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Protocole à appliquer
            </label>
            <select
              value={programType}
              onChange={(e) => setProgramType(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            >
              <option value="AUTO">Automatique (Détecter selon le type de la bande)</option>
              <option value="STANDARD_BROILER">Protocole Poulet de Chair (45 jours)</option>
              <option value="STANDARD_LAYER">Protocole Pondeuses (Démarrage jusqu'à ponte)</option>
            </select>
          </div>

          {programError && (
            <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{programError}</div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => {
                setProgramModalOpen(false);
                setProgramError(null);
              }}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={generatingProgram}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50 transition-colors shadow-sm"
            >
              {generatingProgram ? "Génération en cours..." : "Générer les interventions"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODALE 3 : VALIDER L'ADMINISTRATION D'UN SOIN */}
      <Modal
        isOpen={completeModalOpen}
        onClose={() => setCompleteModalOpen(false)}
        title="Valider l'administration du soin"
        description={`Confirmez la réalisation de : ${selectedTreatment?.title}`}
      >
        <form onSubmit={handleCompleteTreatment} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Date d'administration *
              </label>
              <input
                type="date"
                value={completeDate}
                onChange={(e) => setCompleteDate(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Coût réel engagé (FCFA)
              </label>
              <input
                type="number"
                min="0"
                value={completeCostFcfa}
                onChange={(e) => {
                  const val = e.target.value;
                  setCompleteCostFcfa(val === "" ? "" : Math.max(0, parseInt(val) || 0));
                }}
                onFocus={(e) => e.target.select()}
                placeholder="0"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Quantité / Doses utilisées
              </label>
              <input
                type="text"
                value={completeQuantityUsed}
                onChange={(e) => setCompleteQuantityUsed(e.target.value)}
                placeholder="Ex: 1 flacon, 500 ml..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Vétérinaire / Responsable
              </label>
              <input
                type="text"
                value={completeVeterinarian}
                onChange={(e) => setCompleteVeterinarian(e.target.value)}
                placeholder="Ex: Dr. Dossou"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Déduire du stock du magasin
            </label>
            <select
              value={completeInventoryItemId}
              onChange={(e) => setCompleteInventoryItemId(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            >
              <option value="">Ne pas déduire de stock</option>
              {inventoryItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.currentStock} {item.unit} dispo)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Observations / Numéro de lot
            </label>
            <textarea
              rows={2}
              value={completeNotes}
              onChange={(e) => setCompleteNotes(e.target.value)}
              placeholder="Ex: Lot vaccin #VAC2026-09, bonne prise par les volailles..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          {completeError && (
            <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{completeError}</div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => {
                setCompleteModalOpen(false);
                setCompleteError(null);
              }}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submittingComplete}
              className="rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white hover:bg-success-hover disabled:opacity-50 transition-colors shadow-sm"
            >
              {submittingComplete ? "Validation..." : "Confirmer l'administration"}
            </button>
          </div>
        </form>
      </Modal>
    </Shell>
  );
}
