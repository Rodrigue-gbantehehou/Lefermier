"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
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
  Users,
  ShieldCheck,
  KeyRound,
  Settings,
} from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api-client";
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

  // Add Building Modal
  const [buildingModalOpen, setBuildingModalOpen] = useState(false);
  const [buildingName, setBuildingName] = useState("");
  const [buildingType, setBuildingType] = useState<"POULTRY_HOUSE" | "BROODER" | "STORAGE" | "OTHER">("POULTRY_HOUSE");
  const [buildingCapacity, setBuildingCapacity] = useState<number>(1000);
  const [buildingSurface, setBuildingSurface] = useState<string>("");
  const [submittingBuilding, setSubmittingBuilding] = useState(false);
  const [buildingErrorMsg, setBuildingErrorMsg] = useState<string | null>(null);

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

  async function handleCreateBuilding(e: React.FormEvent) {
    e.preventDefault();
    if (!activeFarm?.id || !buildingName.trim()) return;

    setSubmittingBuilding(true);
    setBuildingErrorMsg(null);

    try {
      await api.farms.createBuilding(activeFarm.id, {
        name: buildingName.trim(),
        type: buildingType,
        capacity: Number(buildingCapacity) || 0,
        surfaceArea: buildingSurface ? parseFloat(buildingSurface) : undefined,
      });

      setBuildingModalOpen(false);
      setBuildingName("");
      setBuildingType("POULTRY_HOUSE");
      setBuildingCapacity(1000);
      setBuildingSurface("");

      await loadBuildings(activeFarm.id);
    } catch (err: any) {
      setBuildingErrorMsg(err?.message || "Erreur lors de la création du bâtiment.");
    } finally {
      setSubmittingBuilding(false);
    }
  }

  const totalCapacity = buildings.reduce((sum, b) => sum + (b.capacity || 0), 0);

  const buildingTypeLabels: Record<string, { label: string; variant: "default" | "success" | "warning" | "neutral" }> = {
    POULTRY_HOUSE: { label: "Poulailler", variant: "default" },
    BROODER: { label: "Poussinière", variant: "warning" },
    STORAGE: { label: "Magasin stockage", variant: "neutral" },
    OTHER: { label: "Autre bâtiment", variant: "neutral" },
  };

  return (
    <Shell>
      {/* Settings Navigation Tabs */}
      <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-border pb-4">
        <Link
          href="/settings/farm"
          className="flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-white shadow-xs"
        >
          <Building2 className="h-4 w-4" />
          <span>Exploitation</span>
        </Link>
        <Link
          href="/settings/members"
          className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
        >
          <Users className="h-4 w-4" />
          <span>Utilisateurs & Employés</span>
        </Link>
        <Link
          href="/settings/roles"
          className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Rôles & Permissions</span>
        </Link>
        <Link
          href="/developer"
          className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
        >
          <KeyRound className="h-4 w-4" />
          <span>Clés API Développeur</span>
        </Link>
      </div>

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
                  <span className="text-[11px] text-muted block">Capacité totale</span>
                  <span className="text-base font-extrabold text-foreground font-mono">
                    {formatNumber(totalCapacity)} <span className="text-xs font-normal text-muted">sujets</span>
                  </span>
                </div>
                <div className="rounded-xl border border-border bg-surface-muted p-3">
                  <span className="text-[11px] text-muted block">Infrastructures</span>
                  <span className="text-base font-extrabold text-foreground font-mono">
                    {buildings.length} <span className="text-xs font-normal text-muted">bâtiment(s)</span>
                  </span>
                </div>
              </div>

              {/* Liste des bâtiments */}
              {loadingBuildings ? (
                <div className="py-8 text-center text-xs text-muted">
                  Chargement des bâtiments...
                </div>
              ) : buildings.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center">
                  <Warehouse className="mx-auto h-8 w-8 text-muted mb-2" />
                  <p className="text-xs font-bold text-foreground">Aucun bâtiment configuré</p>
                  <p className="mt-1 text-[11px] text-muted">
                    Ajoutez vos poulaillers pour organiser vos bandes de volailles.
                  </p>
                  <button
                    type="button"
                    onClick={() => setBuildingModalOpen(true)}
                    className="mt-3 inline-flex items-center gap-1 rounded-xl bg-primary-soft px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Créer le premier bâtiment</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {buildings.map((b) => {
                    const badgeInfo = buildingTypeLabels[b.type] || { label: b.type, variant: "neutral" };
                    return (
                      <div
                        key={b.id}
                        className="flex items-center justify-between rounded-xl border border-border bg-surface-muted p-3 hover:bg-surface-hover transition-colors"
                      >
                        <div>
                          <div className="font-bold text-xs text-foreground">{b.name}</div>
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

                        <div className="text-right">
                          <span className="text-xs font-bold text-primary font-mono block">
                            {formatNumber(b.capacity)}
                          </span>
                          <span className="text-[10px] text-muted">places</span>
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
      <Modal
        isOpen={buildingModalOpen}
        onClose={() => setBuildingModalOpen(false)}
        title="Ajouter un bâtiment d'élevage"
        description="Créez un poulailler ou espace d'élevage au sein de cette exploitation."
        maxWidth="md"
      >
        <form onSubmit={handleCreateBuilding} className="space-y-4">
          {buildingErrorMsg && (
            <div className="rounded-xl border border-danger/20 bg-danger-soft p-3 text-xs text-danger">
              {buildingErrorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Nom ou désignation du bâtiment *
            </label>
            <input
              type="text"
              required
              value={buildingName}
              onChange={(e) => setBuildingName(e.target.value)}
              placeholder="ex. Poulailler Bâtiment A"
              className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Type de bâtiment
              </label>
              <select
                value={buildingType}
                onChange={(e) => setBuildingType(e.target.value as any)}
                className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
              >
                <option value="POULTRY_HOUSE">Poulailler</option>
                <option value="BROODER">Poussinière</option>
                <option value="STORAGE">Magasin de stockage</option>
                <option value="OTHER">Autre installation</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Capacité d'accueil (sujets) *
              </label>
              <input
                type="number"
                min={0}
                required
                value={buildingCapacity}
                onChange={(e) => setBuildingCapacity(parseInt(e.target.value) || 0)}
                placeholder="ex. 1500"
                className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs font-mono text-foreground focus:border-primary focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Surface au sol en m² (optionnel)
            </label>
            <input
              type="number"
              step="0.1"
              min={0}
              value={buildingSurface}
              onChange={(e) => setBuildingSurface(e.target.value)}
              placeholder="ex. 250.5"
              className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs font-mono text-foreground focus:border-primary focus:outline-hidden"
            />
          </div>

          <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setBuildingModalOpen(false)}
              className="rounded-xl border border-border px-3.5 py-2 text-xs font-semibold text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submittingBuilding}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              <span>{submittingBuilding ? "Ajout..." : "Créer le bâtiment"}</span>
            </button>
          </div>
        </form>
      </Modal>
    </Shell>
  );
}
