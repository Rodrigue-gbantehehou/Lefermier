"use client";

import React, { useEffect, useState } from "react";
import { Plus, Egg, Layers, TrendingUp, Edit3, AlertTriangle } from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api-client";
import { EggProduction, EggSession, Flock } from "@/lib/types";
import { formatNumber, formatPercent, calcEggTrays, formatDate } from "@/lib/utils";

export default function EggsPage() {
  const { activeFarm, hasPermission } = useAuth();

  const [productions, setProductions] = useState<EggProduction[]>([]);
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [summary, setSummary] = useState<{
    totalEggsToday: number;
    traysCountToday: number;
    layingRate: number;
  }>({ totalEggsToday: 0, traysCountToday: 0, layingRate: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // New Collection Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFlockId, setSelectedFlockId] = useState("");
  const [collectionDate, setCollectionDate] = useState("");

  useEffect(() => {
    setCollectionDate(new Date().toISOString().split("T")[0]);
  }, []);
  const [session, setSession] = useState<EggSession>("MORNING");
  const [goodEggs, setGoodEggs] = useState<number | string>(0);
  const [brokenEggs, setBrokenEggs] = useState<number | string>(0);
  const [abnormalEggs, setAbnormalEggs] = useState<number | string>(0);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingEggId, setEditingEggId] = useState<string | null>(null);

  function openCreateModal() {
    setEditingEggId(null);
    setCollectionDate(new Date().toISOString().split("T")[0]);
    setSession("MORNING");
    setGoodEggs(0);
    setBrokenEggs(0);
    setAbnormalEggs(0);
    setNotes("");
    if (flocks.length > 0 && !selectedFlockId) {
      setSelectedFlockId(flocks[0].id);
    }
    setModalOpen(true);
  }

  function openEditModal(p: EggProduction) {
    setEditingEggId(p.id);
    setSelectedFlockId(p.flockId);
    setCollectionDate(p.date);
    setSession(p.session);
    setGoodEggs(p.goodEggs);
    setBrokenEggs(p.brokenEggs);
    setAbnormalEggs(p.abnormalEggs);
    setNotes(p.notes || "");
    setModalOpen(true);
  }

  useEffect(() => {
    if (activeFarm?.id) {
      loadData();
    }
  }, [activeFarm?.id]);

  async function loadData() {
    setIsLoading(true);
    try {
      const [prodsData, flocksData, summaryData] = await Promise.all([
        api.eggs.list({ farmId: activeFarm?.id }),
        api.flocks.list({ farmId: activeFarm?.id, type: "LAYER", status: "ACTIVE" }),
        api.eggs.getSummary(activeFarm?.id),
      ]);
      setProductions(prodsData);
      setFlocks(flocksData);
      setSummary(summaryData);
      if (flocksData.length > 0 && !selectedFlockId) {
        setSelectedFlockId(flocksData[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFlockId) return;
    setSubmitting(true);
    try {
      if (editingEggId) {
        await api.eggs.update(editingEggId, {
          goodEggs: Number(goodEggs),
          brokenEggs: Number(brokenEggs),
          abnormalEggs: Number(abnormalEggs),
          notes: notes || undefined,
        });
      } else {
        await api.eggs.create({
          flockId: selectedFlockId,
          date: collectionDate,
          session,
          goodEggs: Number(goodEggs),
          brokenEggs: Number(brokenEggs),
          abnormalEggs: Number(abnormalEggs),
          notes: notes || undefined,
          allowUpdate: true,
        });
      }
      setModalOpen(false);
      setEditingEggId(null);
      setGoodEggs(0);
      setBrokenEggs(0);
      setAbnormalEggs(0);
      setNotes("");
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Erreur lors de l'enregistrement de la collecte");
    } finally {
      setSubmitting(false);
    }
  }

  const trayCalc = calcEggTrays(Number(goodEggs));

  const eggColumns: ColumnDef<EggProduction>[] = [
    {
      key: "date",
      header: "Date",
      sortable: true,
      accessor: (p) => p.date,
      cell: (p) => <span className="font-medium text-foreground">{formatDate(p.date)}</span>,
    },
    {
      key: "flockName",
      header: "Bande",
      sortable: true,
      accessor: (p) => p.flockName || "Bande",
      cell: (p) => <span className="font-semibold text-primary">{p.flockName || "Bande"}</span>,
    },
    {
      key: "session",
      header: "Session",
      sortable: true,
      cell: (p) => (
        <Badge
          variant={
            p.session === "MORNING"
              ? "warning"
              : p.session === "NOON"
              ? "info"
              : "neutral"
          }
          size="sm"
        >
          {p.session === "MORNING"
            ? "Matin"
            : p.session === "NOON"
            ? "Midi"
            : "Soir"}
        </Badge>
      ),
    },
    {
      key: "goodEggs",
      header: "Bons Œufs",
      sortable: true,
      align: "right",
      accessor: (p) => p.goodEggs,
      cell: (p) => (
        <span className="font-mono font-bold text-success">
          {formatNumber(p.goodEggs)}
        </span>
      ),
    },
    {
      key: "brokenEggs",
      header: "Cassés / Fêlés",
      sortable: true,
      align: "right",
      accessor: (p) => p.brokenEggs,
      cell: (p) => (
        <span className="font-mono text-danger">
          {p.brokenEggs > 0 ? formatNumber(p.brokenEggs) : "-"}
        </span>
      ),
    },
    {
      key: "abnormalEggs",
      header: "Anormaux",
      sortable: true,
      align: "right",
      accessor: (p) => p.abnormalEggs,
      cell: (p) => (
        <span className="font-mono text-warning">
          {p.abnormalEggs > 0 ? formatNumber(p.abnormalEggs) : "-"}
        </span>
      ),
    },
    {
      key: "totalEggs",
      header: "Total Œufs",
      sortable: true,
      align: "right",
      accessor: (p) => p.totalEggs,
      cell: (p) => (
        <span className="font-mono font-bold text-foreground">
          {formatNumber(p.totalEggs)}
        </span>
      ),
    },
    {
      key: "trays",
      header: "Plateaux de 30",
      sortable: true,
      align: "right",
      accessor: (p) => p.goodEggs,
      cell: (p) => {
        const trayInfo = calcEggTrays(p.goodEggs);
        return (
          <span className="font-mono font-bold text-accent">
            {trayInfo.text}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "Action",
      align: "right",
      cell: (p) =>
        hasPermission("egg:create") ? (
          <button
            type="button"
            onClick={() => openEditModal(p)}
            title="Modifier ce ramassage"
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-muted px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-surface-hover hover:border-accent hover:text-accent transition-colors"
          >
            <Edit3 className="h-3 w-3" />
            <span>Modifier</span>
          </button>
        ) : null,
    },
  ];

  return (
    <Shell>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-border">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Production d'œufs & Alvéoles
          </h1>
          <p className="mt-1 text-xs text-muted">
            Collectes quotidiennes par session (Matin, Midi, Soir) et conversion normalisée en plateaux de 30 œufs.
          </p>
        </div>

        {hasPermission("egg:create") && (
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-accent-hover transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Noter un ramassage</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Œufs récoltés aujourd'hui"
          value={`${formatNumber(summary.totalEggsToday)} œufs`}
          subtitle="Total ramassé sur la journée"
          accent="amber"
          icon={<Egg className="h-5 w-5" />}
        />
        <StatCard
          title="Plateaux de 30 récoltés"
          value={`${formatNumber(summary.traysCountToday)} plateaux`}
          subtitle="Plateaux complets prêts à vendre"
          accent="primary"
          icon={<Layers className="h-5 w-5" />}
        />
        <StatCard
          title="Rendement de ponte"
          value={formatPercent(summary.layingRate)}
          subtitle="Part des poules qui ont pondu"
          accent="amber"
          icon={<TrendingUp className="h-5 w-5" />}
          trend={{
            value: (summary.layingRate || 0) >= 75 ? "Très bonne ponte" : "Ponte faible",
            isPositive: (summary.layingRate || 0) >= 75,
          }}
        />
      </div>

      {/* Production History Table */}
      <div className="mt-8">
        <DataTable<EggProduction>
          title="Historique des collectes d'œufs"
          subtitle="Détail par date, bande pondeuse et répartition de qualité. Filtrable par Jour, Semaine ou Mois."
          data={productions}
          columns={eggColumns}
          periodFilter={true}
          dateAccessor={(p) => p.date}
          searchable={true}
          searchPlaceholder="Rechercher par bande, session..."
          searchAccessor={(p) => `${p.flockName || ""} ${p.session} ${p.notes || ""}`}
          pageSize={15}
          initialSort={{ key: "date", direction: "desc" }}
          isLoading={isLoading}
          emptyState={{
            icon: <Egg className="h-6 w-6 text-accent" />,
            title: "Aucune collecte enregistrée",
            description: "Enregistrez votre première collecte d'œufs pour suivre les rendements de vos pondeuses.",
            actionLabel: hasPermission("egg:create") ? "Enregistrer une collecte" : undefined,
            onAction: () => setModalOpen(true),
          }}
        />
      </div>

      {/* COLLECTION MODAL */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingEggId(null);
        }}
        title={editingEggId ? "Modifier le ramassage d'œufs" : "Nouvelle collecte d'œufs"}
        description={
          editingEggId
            ? "Mise à jour des quantités récoltées pour ce créneau de ponte."
            : "Enregistrez les œufs ramassés. Le nombre de plateaux et d'œufs libres est calculé en temps réel."
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editingEggId && productions.some(
            (p) => p.flockId === selectedFlockId && p.date === collectionDate && p.session === session
          ) && (
            <div className="rounded-xl border border-warning/30 bg-warning-soft/30 p-3 text-xs text-warning flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                Une collecte existe déjà pour ce créneau. La validation mettra à jour directement ces chiffres.
              </span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Bande pondeuse
              </label>
              <select
                value={selectedFlockId}
                onChange={(e) => setSelectedFlockId(e.target.value)}
                required
                className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs font-semibold text-foreground"
              >
                {flocks.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({formatNumber(f.currentQuantity)} poules)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Date de collecte
              </label>
              <input
                type="date"
                required
                value={collectionDate}
                onChange={(e) => setCollectionDate(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Session
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["MORNING", "NOON", "EVENING"] as EggSession[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSession(s)}
                  className={`rounded-xl border py-2 text-xs font-bold ${
                    session === s
                      ? "border-accent bg-accent text-white"
                      : "border-border bg-surface text-muted hover:bg-surface-hover"
                  }`}
                >
                  {s === "MORNING" ? "Matin" : s === "NOON" ? "Midi" : "Soir"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-success mb-1">
                Bons œufs (vendables)
              </label>
              <input
                type="number"
                min="0"
                required
                value={goodEggs}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const val = e.target.value;
                  setGoodEggs(val === "" ? "" : Math.max(0, parseInt(val) || 0));
                }}
                placeholder="0"
                className="w-full rounded-xl border border-success/30 bg-surface p-2.5 text-sm font-bold font-mono text-foreground focus:border-success focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-danger mb-1">
                Cassés / Fêlés
              </label>
              <input
                type="number"
                min="0"
                value={brokenEggs}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const val = e.target.value;
                  setBrokenEggs(val === "" ? "" : Math.max(0, parseInt(val) || 0));
                }}
                placeholder="0"
                className="w-full rounded-xl border border-border bg-surface p-2.5 text-sm font-mono text-foreground focus:border-danger focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-warning mb-1">
                Anormaux
              </label>
              <input
                type="number"
                min="0"
                value={abnormalEggs}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const val = e.target.value;
                  setAbnormalEggs(val === "" ? "" : Math.max(0, parseInt(val) || 0));
                }}
                placeholder="0"
                className="w-full rounded-xl border border-border bg-surface p-2.5 text-sm font-mono text-foreground focus:border-warning focus:outline-hidden"
              />
            </div>
          </div>

          {/* Tray calculation live display */}
          <div className="rounded-xl bg-accent-soft p-3.5 text-xs text-accent border border-accent/20">
            <div className="flex items-center justify-between font-bold">
              <span>Résultat en plateaux de 30 :</span>
              <span className="text-sm font-mono">{trayCalc.text}</span>
            </div>
            <div className="mt-1 text-[11px] opacity-80">
              Total ramassé : {Number(goodEggs || 0) + Number(brokenEggs || 0) + Number(abnormalEggs || 0)} œufs
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Notes / Remarques
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ex. Remplacement ampoules dans le poulailler"
              className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setModalOpen(false);
                setEditingEggId(null);
              }}
              className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted hover:bg-surface-hover"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-accent-hover"
            >
              {submitting
                ? "Enregistrement..."
                : editingEggId
                ? "Mettre à jour le ramassage"
                : "Valider la collecte"}
            </button>
          </div>
        </form>
      </Modal>
    </Shell>
  );
}
