"use client";

import React, { useEffect, useState } from "react";
import {
  Warehouse,
  Plus,
  Edit3,
  Trash2,
  Building2,
  Box,
  RefreshCw,
  Users,
  CheckCircle2,
} from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { CreateBuildingModal } from "@/components/farms/create-building-modal";
import { EditBuildingModal } from "@/components/farms/edit-building-modal";
import { ModuleLockedState } from "@/components/ui/module-locked-state";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api-client";
import { formatNumber } from "@/lib/utils";

interface Building {
  id: string;
  name: string;
  type: "POULTRY_HOUSE" | "BROODER" | "STORAGE" | "OTHER";
  capacity: number;
  surfaceArea?: number | null;
  isActive: boolean;
  createdAt?: string;
}

export default function BuildingsPage() {
  const { activeFarm, hasPermission, hasModule } = useAuth();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (activeFarm?.id && hasModule("buildings")) {
      loadBuildings();
    } else {
      setIsLoading(false);
    }
  }, [activeFarm?.id]);

  async function loadBuildings() {
    if (!activeFarm?.id) return;
    setIsLoading(true);
    try {
      const data = await api.farms.listBuildings(activeFarm.id);
      setBuildings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erreur chargement bâtiments:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!activeFarm?.id) return;
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce poulailler / bâtiment ?")) return;
    setDeletingId(id);
    try {
      await api.farms.deleteBuilding(activeFarm.id, id);
      await loadBuildings();
    } catch (err: any) {
      alert(err?.message || "Erreur lors de la suppression du bâtiment.");
    } finally {
      setDeletingId(null);
    }
  }

  const typeLabels: Record<string, string> = {
    POULTRY_HOUSE: "Poulailler de ponte / chair",
    BROODER: "Poussinière (Démarrage)",
    STORAGE: "Magasin d'aliment & Intrants",
    OTHER: "Bâtiment annexe",
  };

  const totalCapacity = buildings.reduce((sum, b) => sum + (Number(b.capacity) || 0), 0);
  const totalPoultryHouses = buildings.filter((b) => b.type === "POULTRY_HOUSE" || b.type === "BROODER").length;

  if (!hasModule("buildings")) {
    return (
      <Shell>
        <ModuleLockedState
          moduleName="Poulaillers & Bâtiments d'élevage"
          description="La gestion avancée des poulaillers, bâtiments et capacités d'accueil n'est pas incluse dans votre formule actuelle."
        />
      </Shell>
    );
  }

  return (
    <Shell>
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-border">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl flex items-center gap-2.5">
            <Warehouse className="h-6 w-6 text-primary" />
            <span>Poulaillers & Bâtiments d'élevage</span>
          </h1>
          <p className="mt-1 text-xs text-muted">
            Gestion des infrastructures, poulaillers, poussinières et capacités d'accueil.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadBuildings}
            title="Actualiser la liste"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-foreground shadow-xs hover:bg-surface-hover transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-primary" : "text-muted"}`} />
            <span>Actualiser</span>
          </button>

          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-primary px-3.5 text-xs font-bold text-white shadow-xs hover:bg-primary-hover transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Nouveau poulailler</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Bâtiments d'élevage"
          value={`${buildings.length} bâtiment(s)`}
          subtitle={`${totalPoultryHouses} poulailler(s) et poussinière(s)`}
          accent="primary"
          icon={<Warehouse className="h-5 w-5" />}
        />

        <StatCard
          title="Capacité d'accueil totale"
          value={`${formatNumber(totalCapacity)} sujets`}
          subtitle="Places disponibles sur l'ensemble du site"
          accent="amber"
          icon={<Users className="h-5 w-5" />}
        />

        <StatCard
          title="État des installations"
          value={buildings.filter((b) => b.isActive).length.toString()}
          subtitle="Bâtiments actuellement en service actif"
          accent="sky"
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
      </div>

      {/* Buildings List */}
      <div className="mt-8">
        {buildings.length === 0 ? (
          <EmptyState
            icon={<Warehouse className="h-10 w-10 text-primary" />}
            title="Aucun bâtiment créé"
            description="Créez votre premier poulailler pour y loger vos poussins et suivre vos bandes de volailles."
            actionLabel="Créer un poulailler"
            onAction={() => setCreateModalOpen(true)}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {buildings.map((b) => (
              <div
                key={b.id}
                className="rounded-2xl border border-border bg-surface p-5 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 border-b border-border/70 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Warehouse className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground">
                          {b.name}
                        </h3>
                        <span className="text-[11px] text-muted block">
                          {typeLabels[b.type] || b.type}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        b.isActive
                          ? "bg-success/15 text-success"
                          : "bg-surface-muted text-muted"
                      }`}
                    >
                      {b.isActive ? "En service" : "Désactivé"}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Capacité maximale :</span>
                      <span className="font-mono font-bold text-foreground">
                        {formatNumber(b.capacity)} volailles
                      </span>
                    </div>
                    {b.surfaceArea && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted">Superficie :</span>
                        <span className="font-mono text-foreground">
                          {b.surfaceArea} m²
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-border/70 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingBuilding(b)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-muted px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-hover hover:border-primary/40 transition-colors"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Modifier</span>
                  </button>

                  <button
                    type="button"
                    disabled={deletingId === b.id}
                    onClick={() => handleDelete(b.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-danger/20 bg-danger/10 px-2.5 py-1.5 text-xs font-semibold text-danger hover:bg-danger hover:text-white transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{deletingId === b.id ? "..." : "Supprimer"}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modales */}
      <CreateBuildingModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={loadBuildings}
      />

      {editingBuilding && (
        <EditBuildingModal
          isOpen={true}
          building={editingBuilding}
          onClose={() => setEditingBuilding(null)}
          onSuccess={loadBuildings}
        />
      )}
    </Shell>
  );
}
