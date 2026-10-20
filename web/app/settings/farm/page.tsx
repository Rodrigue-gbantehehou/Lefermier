"use client";

import React, { useEffect, useState } from "react";
import {
  Building2,
  Save,
  Plus,
  Warehouse,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Tag,
  Layers,
  Sparkles,
  Settings,
  Edit2,
  Archive,
  RotateCcw,
  Trash2,
  Filter,
} from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api-client";
import { CreateBuildingModal } from "@/components/farms/create-building-modal";
import { EditBuildingModal } from "@/components/farms/edit-building-modal";
import { formatNumber, formatDate } from "@/lib/utils";

interface BuildingItem {
  id: string;
  name: string;
  type: "POULTRY_HOUSE" | "BROODER" | "STORAGE" | "OTHER";
  capacity: number;
  surfaceArea?: number | null;
  isActive: boolean;
  createdAt: string;
}

export default function FarmSettingsPage() {
  const { activeFarm, refreshMe, hasPermission } = useAuth();

  // Farm Details Form
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [productionType, setProductionType] = useState<"LAYER" | "BROILER" | "MIXED">("LAYER");
  const [locationCity, setLocationCity] = useState("");
  const [locationCountry, setLocationCountry] = useState("BJ");
  const [savingFarm, setSavingFarm] = useState(false);
  const [farmSuccessMsg, setFarmSuccessMsg] = useState<string | null>(null);
  const [farmErrorMsg, setFarmErrorMsg] = useState<string | null>(null);

  // Buildings state
  const [buildings, setBuildings] = useState<BuildingItem[]>([]);
  const [loadingBuildings, setLoadingBuildings] = useState(false);

  // Add & Edit Building Modal
  const [buildingModalOpen, setBuildingModalOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<BuildingItem | null>(null);
  const [editBuildingModalOpen, setEditBuildingModalOpen] = useState(false);
  const [buildingFilter, setBuildingFilter] = useState<"ACTIVE" | "ARCHIVED" | "ALL">("ACTIVE");

  // Sync form with active farm
  useEffect(() => {
    if (activeFarm) {
      setName(activeFarm.name || "");
      setCode(activeFarm.code || "");
      setProductionType(activeFarm.productionType || "LAYER");
      setLocationCity(activeFarm.location || "");
      setLocationCountry(activeFarm.locationCountry || "BJ");
      loadBuildings(activeFarm.id);
    }
  }, [activeFarm]);

  async function loadBuildings(farmId: string) {
    setLoadingBuildings(true);
    try {
      const data = await api.farms.listBuildings(farmId);
      setBuildings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("Impossible de charger les bâtiments:", err);
    } finally {
      setLoadingBuildings(false);
    }
  }

  async function handleQuickToggleArchive(b: BuildingItem) {
    if (!activeFarm?.id) return;
    try {
      await api.farms.updateBuilding(activeFarm.id, b.id, {
        isActive: !b.isActive,
      });
      await loadBuildings(activeFarm.id);
    } catch (err: any) {
      alert(err?.message || "Erreur lors du changement de statut d'archivage.");
    }
  }

  async function handleSaveFarm(e: React.FormEvent) {
    e.preventDefault();
    if (!activeFarm?.id || !name.trim()) return;

    setSavingFarm(true);
    setFarmSuccessMsg(null);
    setFarmErrorMsg(null);

    try {
      await api.farms.update(activeFarm.id, {
        name: name.trim(),
        code: code.trim() || undefined,
        productionType,
        locationCity: locationCity.trim() || undefined,
        locationCountry,
      });

      await refreshMe();
      setFarmSuccessMsg("Les informations de l'exploitation ont été enregistrées avec succès !");
      setTimeout(() => setFarmSuccessMsg(null), 4000);
    } catch (err: any) {
      setFarmErrorMsg(err?.message || "Erreur lors de la mise à jour de l'exploitation.");
    } finally {
      setSavingFarm(false);
    }
  }



  const activeBuildings = buildings.filter((b) => b.isActive !== false);
  const archivedBuildings = buildings.filter((b) => b.isActive === false);
  const totalActiveCapacity = activeBuildings.reduce((sum, b) => sum + (b.capacity || 0), 0);

  const displayedBuildings = buildings.filter((b) => {
    if (buildingFilter === "ACTIVE") return b.isActive !== false;
    if (buildingFilter === "ARCHIVED") return b.isActive === false;
    return true;
  });

  const buildingTypeLabels: Record<string, { label: string; variant: "default" | "success" | "warning" | "neutral" }> = {
    POULTRY_HOUSE: { label: "Poulailler", variant: "default" },
    BROODER: { label: "Poussinière", variant: "warning" },
    STORAGE: { label: "Magasin stockage", variant: "neutral" },
    OTHER: { label: "Autre bâtiment", variant: "neutral" },
  };

  return (
    <Shell>
      {/* Page Header */}
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl flex items-center gap-2.5">
            <Settings className="h-6 w-6 text-primary" />
            <span>Paramètres de l'exploitation</span>
          </h1>
          <p className="mt-1 text-xs text-muted">
            Gérez l'identité légale, la localisation et les bâtiments d'élevage de votre ferme.
          </p>
        </div>

        {activeFarm && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Ferme active :</span>
            <span className="rounded-xl bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
              {activeFarm.name}
            </span>
          </div>
        )}
      </div>

      {!activeFarm ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center max-w-lg mx-auto">
          <Building2 className="mx-auto h-12 w-12 text-muted mb-3" />
          <h2 className="text-base font-bold text-foreground">Aucune exploitation active</h2>
          <p className="mt-1 text-xs text-muted">
            Veuillez sélectionner ou créer une ferme depuis l'en-tête pour configurer ses paramètres.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Colonne Gauche : Formulaire Général (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-border mb-5">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span>Identité & Coordonnées</span>
                  </h2>
                  <p className="text-xs text-muted mt-0.5">
                    Informations principales visibles sur vos rapports et documents.
                  </p>
                </div>
                <Badge variant="success" size="sm">
                  Exploitation Active
                </Badge>
              </div>

              {farmSuccessMsg && (
                <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-success/20 bg-success-soft p-3 text-xs text-success font-medium">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{farmSuccessMsg}</span>
                </div>
              )}

              {farmErrorMsg && (
                <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-danger/20 bg-danger-soft p-3 text-xs text-danger font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{farmErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSaveFarm} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Nom de l'exploitation avicole *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ex. Ferme Avicole Calavi Élite"
                    className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:bg-surface focus:outline-hidden transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Code identifiant court
                    </label>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="ex. FRM-CAL1"
                      className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs font-mono text-foreground focus:border-primary focus:bg-surface focus:outline-hidden transition-colors"
                    />
                    <p className="mt-1 text-[11px] text-muted">
                      Code court préfixant vos bandes et lots.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Type de production avicole
                    </label>
                    <select
                      value={productionType}
                      onChange={(e) => setProductionType(e.target.value as any)}
                      className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:bg-surface focus:outline-hidden transition-colors"
                    >
                      <option value="LAYER">Pondeuses (Œufs de table)</option>
                      <option value="BROILER">Poulets de chair</option>
                      <option value="MIXED">Mixte / Polyvalente</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Commune / Ville d'implantation
                    </label>
                    <input
                      type="text"
                      value={locationCity}
                      onChange={(e) => setLocationCity(e.target.value)}
                      placeholder="ex. Calavi, Allada, Parakou"
                      className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:bg-surface focus:outline-hidden transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Pays
                    </label>
                    <select
                      value={locationCountry}
                      onChange={(e) => setLocationCountry(e.target.value)}
                      className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:bg-surface focus:outline-hidden transition-colors"
                    >
                      <option value="BJ">Bénin (BJ)</option>
                      <option value="TG">Togo (TG)</option>
                      <option value="CI">Côte d'Ivoire (CI)</option>
                      <option value="SN">Sénégal (SN)</option>
                      <option value="NG">Nigeria (NG)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Devise de référence
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-muted">
                    <span className="font-bold text-foreground">Franc CFA (XOF)</span>
                    <span className="text-[11px]">— Devise standard UEMOA sans virgule flottante</span>
                  </div>
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingFarm}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-primary-hover transition-colors disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    <span>{savingFarm ? "Enregistrement..." : "Enregistrer les modifications"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Colonne Droite : Bâtiments & Capacités (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                    <Warehouse className="h-4 w-4 text-primary" />
                    <span>Bâtiments d'élevage</span>
                  </h2>
                  <p className="text-xs text-muted mt-0.5">
                    Poulaillers, poussinières et magasins de stockage.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setBuildingModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-primary-hover transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Ajouter</span>
                </button>
              </div>

              {/* Synthèse capacité */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-xl border border-border bg-surface-muted p-3">
                  <span className="text-[11px] text-muted block">Capacité active</span>
                  <span className="text-base font-extrabold text-foreground font-mono">
                    {formatNumber(totalActiveCapacity)} <span className="text-xs font-normal text-muted">sujets</span>
                  </span>
                </div>
                <div className="rounded-xl border border-border bg-surface-muted p-3">
                  <span className="text-[11px] text-muted block">Poulaillers actifs</span>
                  <span className="text-base font-extrabold text-foreground font-mono">
                    {activeBuildings.length} <span className="text-xs font-normal text-muted">/ {buildings.length} total</span>
                  </span>
                </div>
              </div>

              {/* Onglets de filtrage Actifs / Archivés */}
              <div className="flex items-center gap-1.5 mb-3 border-b border-border pb-2.5">
                <button
                  type="button"
                  onClick={() => setBuildingFilter("ACTIVE")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                    buildingFilter === "ACTIVE"
                      ? "bg-primary text-white"
                      : "text-muted hover:bg-surface-hover hover:text-foreground"
                  }`}
                >
                  Actifs ({activeBuildings.length})
                </button>
                <button
                  type="button"
                  onClick={() => setBuildingFilter("ARCHIVED")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                    buildingFilter === "ARCHIVED"
                      ? "bg-warning text-white"
                      : "text-muted hover:bg-surface-hover hover:text-foreground"
                  }`}
                >
                  Archivés ({archivedBuildings.length})
                </button>
                <button
                  type="button"
                  onClick={() => setBuildingFilter("ALL")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                    buildingFilter === "ALL"
                      ? "bg-surface-hover text-foreground font-bold"
                      : "text-muted hover:bg-surface-hover hover:text-foreground"
                  }`}
                >
                  Tous ({buildings.length})
                </button>
              </div>

              {/* Liste des bâtiments */}
              {loadingBuildings ? (
                <div className="py-8 text-center text-xs text-muted">
                  Chargement des bâtiments...
                </div>
              ) : displayedBuildings.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center">
                  <Warehouse className="mx-auto h-8 w-8 text-muted mb-2" />
                  <p className="text-xs font-bold text-foreground">
                    {buildingFilter === "ARCHIVED"
                      ? "Aucun bâtiment archivé"
                      : "Aucun bâtiment configuré"}
                  </p>
                  <p className="mt-1 text-[11px] text-muted">
                    {buildingFilter === "ARCHIVED"
                      ? "Tous vos poulaillers sont actuellement actifs."
                      : "Ajoutez vos poulaillers pour organiser vos bandes de volailles."}
                  </p>
                  {buildingFilter !== "ARCHIVED" && (
                    <button
                      type="button"
                      onClick={() => setBuildingModalOpen(true)}
                      className="mt-3 inline-flex items-center gap-1 rounded-xl bg-primary-soft px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Créer le premier bâtiment</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {displayedBuildings.map((b) => {
                    const badgeInfo = buildingTypeLabels[b.type] || { label: b.type, variant: "neutral" };
                    return (
                      <div
                        key={b.id}
                        className={`flex items-center justify-between rounded-xl border p-3 transition-colors ${
                          b.isActive !== false
                            ? "border-border bg-surface-muted hover:bg-surface-hover"
                            : "border-warning/30 bg-warning/5 opacity-80"
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-foreground truncate">{b.name}</span>
                            {b.isActive === false && (
                              <Badge variant="neutral" size="sm">
                                Archivé
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={badgeInfo.variant} size="sm">
                              {badgeInfo.label}
                            </Badge>
                            {b.surfaceArea && (
                              <span className="text-[10px] text-muted font-mono">
                                {b.surfaceArea} m²
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <span className="text-xs font-bold text-primary font-mono block">
                              {formatNumber(b.capacity)}
                            </span>
                            <span className="text-[10px] text-muted">places</span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingBuilding(b);
                                setEditBuildingModalOpen(true);
                              }}
                              title="Modifier ou ajuster la capacité"
                              className="rounded-lg border border-border bg-surface p-1.5 text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickToggleArchive(b)}
                              title={b.isActive !== false ? "Archiver ce bâtiment" : "Restaurer ce bâtiment"}
                              className={`rounded-lg border border-border bg-surface p-1.5 transition-colors ${
                                b.isActive !== false
                                  ? "text-muted hover:text-warning hover:bg-warning-soft"
                                  : "text-muted hover:text-success hover:bg-success-soft"
                              }`}
                            >
                              {b.isActive !== false ? (
                                <Archive className="h-3.5 w-3.5" />
                              ) : (
                                <RotateCcw className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CRÉATION DE BÂTIMENT */}
      <CreateBuildingModal
        isOpen={buildingModalOpen}
        onClose={() => setBuildingModalOpen(false)}
        suggestedName={`Poulailler ${buildings.length + 1}`}
        onSuccess={async () => {
          if (activeFarm?.id) {
            await loadBuildings(activeFarm.id);
          }
        }}
      />

      {/* MODAL MODIFICATION / AJUSTEMENT DE CAPACITÉ BÂTIMENT */}
      <EditBuildingModal
        isOpen={editBuildingModalOpen}
        onClose={() => {
          setEditBuildingModalOpen(false);
          setEditingBuilding(null);
        }}
        building={editingBuilding}
        onSuccess={async () => {
          if (activeFarm?.id) {
            await loadBuildings(activeFarm.id);
          }
        }}
      />
    </Shell>
  );
}
