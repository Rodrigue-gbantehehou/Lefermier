"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Plus,
  Egg,
  Layers,
  TrendingUp,
  Edit3,
  AlertTriangle,
  AlertCircle,
  Sun,
  Moon,
  Calendar,
  RotateCcw,
  Sparkles,
  Check,
} from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { StatCard } from "@/components/ui/stat-card";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { api } from "@/lib/api-client";
import { EggProduction, EggSession, Flock } from "@/lib/types";
import { formatNumber, formatPercent, calcEggTrays, formatDate } from "@/lib/utils";
import { ModuleLockedState } from "@/components/ui/module-locked-state";

export default function EggsPage() {
  const { activeFarm, hasPermission, hasModule } = useAuth();
  const { toast } = useToast();

  const [productions, setProductions] = useState<EggProduction[]>([]);
  const [sessionFilter, setSessionFilter] = useState<"ALL" | EggSession>("ALL");
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [summary, setSummary] = useState<{
    totalEggsToday: number;
    traysCountToday: number;
    layingRate: number;
  }>({ totalEggsToday: 0, traysCountToday: 0, layingRate: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const filteredProductions = useMemo(() => {
    if (sessionFilter === "ALL") return productions;
    return productions.filter((p) => p.session === sessionFilter);
  }, [productions, sessionFilter]);

  // New Collection Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [eggError, setEggError] = useState<string | null>(null);
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

  // Quick helper for numeric adjustments
  function addGoodEggs(amount: number) {
    setGoodEggs((prev) => {
      const current = typeof prev === "number" ? prev : parseInt(prev) || 0;
      return Math.max(0, current + amount);
    });
  }

  function addBrokenEggs(amount: number) {
    setBrokenEggs((prev) => {
      const current = typeof prev === "number" ? prev : parseInt(prev) || 0;
      return Math.max(0, current + amount);
    });
  }

  function addAbnormalEggs(amount: number) {
    setAbnormalEggs((prev) => {
      const current = typeof prev === "number" ? prev : parseInt(prev) || 0;
      return Math.max(0, current + amount);
    });
  }

  function setToday() {
    setCollectionDate(new Date().toISOString().split("T")[0]);
  }

  function setYesterday() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    setCollectionDate(d.toISOString().split("T")[0]);
  }

  function openCreateModal() {
    setEggError(null);
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
    setEggError(null);
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
    if (activeFarm?.id && hasModule("eggs")) {
      loadData();
    } else {
      setIsLoading(false);
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
    setEggError(null);
    setSubmitting(true);
    try {
      if (editingEggId) {
        await api.eggs.update(editingEggId, {
          goodEggs: Number(goodEggs),
          brokenEggs: Number(brokenEggs),
          abnormalEggs: Number(abnormalEggs),
          notes: notes || undefined,
        });
        toast.success("Collecte mise à jour avec succès !");
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
        toast.success("Collecte d'œufs enregistrée avec succès !");
      }
      setModalOpen(false);
      setEditingEggId(null);
      setGoodEggs(0);
      setBrokenEggs(0);
      setAbnormalEggs(0);
      setNotes("");
      await loadData();
    } catch (err: any) {
      const msg = err?.message || "Erreur lors de l'enregistrement de la collecte";
      setEggError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const trayCalc = calcEggTrays(Number(goodEggs));
  const selectedFlock = flocks.find((f) => f.id === selectedFlockId);
  const currentLayingRate =
    selectedFlock && selectedFlock.currentQuantity > 0
      ? ((Number(goodEggs || 0) / selectedFlock.currentQuantity) * 100).toFixed(1)
      : null;
  const todayStr = collectionDate;
  const todayDamaged = productions
    .filter((p) => (todayStr ? p.date === todayStr : false))
    .reduce((sum, p) => sum + (p.brokenEggs || 0) + (p.abnormalEggs || 0), 0);

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
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              p.session === "MORNING"
                ? "bg-amber-500"
                : p.session === "NOON"
                ? "bg-blue-500"
                : "bg-muted"
            }`}
          />
          {p.session === "MORNING"
            ? "Matin"
            : p.session === "NOON"
            ? "Midi"
            : "Soir"}
        </span>
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

  if (!hasModule("eggs")) {
    return (
      <Shell>
        <ModuleLockedState
          moduleName="Production d'œufs"
          description="L'enregistrement des ramassages d'œufs et le calcul des plateaux de 30 alvéoles ne sont pas inclus dans votre formule actuelle."
        />
      </Shell>
    );
  }

  return (
    <Shell>
      {/* En-tête mobile natif */}
      <PageHeader
        title="Production d'œufs"
        subtitle={`${formatNumber(summary.totalEggsToday)} œuf(s) récolté(s) aujourd'hui`}
        icon={<Egg className="h-4 w-4 text-accent" />}
        actions={
          hasPermission("egg:create") && (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 sm:px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-accent-hover active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Ramassage</span>
            </button>
          )
        }
      />

      {/* KPI Cards */}
      <div className="mt-2 sm:mt-3.5 grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
        <StatCard
          title="Ponte du jour"
          value={formatNumber(summary.totalEggsToday)}
          subtitle={summary.traysCountToday > 0 ? `${summary.traysCountToday} plateau${summary.traysCountToday > 1 ? "x" : ""}` : undefined}
          accent="amber"
          icon={<Egg className="h-5 w-5" />}
          className="col-span-2 sm:col-span-1"
        />
        <StatCard
          title="Taux de ponte"
          value={formatPercent(summary.layingRate)}
          accent="primary"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          title="Cassés / Fêlés"
          value={todayDamaged}
          accent={todayDamaged > 0 ? "rose" : "zinc"}
          icon={<Layers className="h-5 w-5" />}
        />
      </div>


      {/* Production History Table & Mobile Cards */}
      <div className="mt-6 sm:mt-8">
        <DataTable<EggProduction>
          title="Historique des collectes"
          data={filteredProductions}
          columns={eggColumns}
          periodFilter={true}
          dateAccessor={(p) => p.date}
          searchable={true}
          searchPlaceholder="Rechercher par bande, session..."
          searchAccessor={(p) => `${p.flockName || ""} ${p.session} ${p.notes || ""}`}
          pageSize={15}
          initialSort={{ key: "date", direction: "desc" }}
          isLoading={isLoading}
          secondaryFilter={
            <div className="flex items-center gap-1.5 shrink-0">
              {[
                { label: "Toutes sessions", value: "ALL" },
                { label: "Matin", value: "MORNING" },
                { label: "Midi", value: "NOON" },
                { label: "Soir", value: "EVENING" },
              ].map((tab) => {
                const isActive = sessionFilter === tab.value;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setSessionFilter(tab.value as any)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold shrink-0 transition-all active:scale-95 cursor-pointer ${
                      isActive
                        ? "bg-primary text-white shadow-xs"
                        : "bg-surface text-muted hover:text-foreground border border-border/80 hover:bg-surface-muted"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          }
          renderMobileCard={(p) => {
            const trayInfo = calcEggTrays(p.goodEggs);
            const sessionConfig = {
              MORNING: {
                label: "Matin",
                icon: Sun,
                color: "text-amber-500 bg-amber-500/10 border-amber-500/30",
              },
              NOON: {
                label: "Midi",
                icon: Sun,
                color: "text-blue-500 bg-blue-500/10 border-blue-500/30",
              },
              EVENING: {
                label: "Soir",
                icon: Moon,
                color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/30",
              },
            }[p.session] || {
              label: p.session,
              icon: Sun,
              color: "text-muted bg-surface-muted border-border",
            };
            const SessionIcon = sessionConfig.icon;

            return (
              <div
                key={p.id}
                className="rounded-2xl border border-border bg-surface p-4 shadow-xs space-y-3 transition-all hover:border-primary/40 active:scale-[0.99]"
              >
                {/* Header carte mobile : Date + Session Badge + Bande */}
                <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">
                      {formatDate(p.date)}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${sessionConfig.color}`}
                    >
                      <SessionIcon className="h-3 w-3" />
                      {sessionConfig.label}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-primary truncate max-w-[120px]">
                    {p.flockName || "Bande"}
                  </span>
                </div>

                {/* Bloc Plateaux mis en valeur */}
                <div className="rounded-xl bg-accent/10 border border-accent/20 p-3 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-accent/80">
                      Rendement de ponte
                    </div>
                    <div className="text-sm font-extrabold text-accent">
                      {trayInfo.text}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-semibold text-muted">
                      Total ramassé
                    </div>
                    <div className="text-sm font-bold font-mono text-foreground">
                      {formatNumber(p.totalEggs)} œufs
                    </div>
                  </div>
                </div>

                {/* Breakdown Qualité (Bons, Cassés, Anormaux) */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-xl bg-surface-muted border border-border/60 py-1.5 px-2">
                    <div className="text-[10px] font-medium text-muted">Bons œufs</div>
                    <div className="font-mono font-bold text-success text-xs mt-0.5">
                      {formatNumber(p.goodEggs)}
                    </div>
                  </div>
                  <div className="rounded-xl bg-surface-muted border border-border/60 py-1.5 px-2">
                    <div className="text-[10px] font-medium text-muted">Cassés</div>
                    <div
                      className={`font-mono font-bold text-xs mt-0.5 ${
                        p.brokenEggs > 0 ? "text-danger" : "text-muted"
                      }`}
                    >
                      {p.brokenEggs > 0 ? formatNumber(p.brokenEggs) : "0"}
                    </div>
                  </div>
                  <div className="rounded-xl bg-surface-muted border border-border/60 py-1.5 px-2">
                    <div className="text-[10px] font-medium text-muted">Anormaux</div>
                    <div
                      className={`font-mono font-bold text-xs mt-0.5 ${
                        p.abnormalEggs > 0 ? "text-warning" : "text-muted"
                      }`}
                    >
                      {p.abnormalEggs > 0 ? formatNumber(p.abnormalEggs) : "0"}
                    </div>
                  </div>
                </div>

                {/* Footer carte mobile : Notes + Bouton Modifier */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  {p.notes ? (
                    <span className="text-[11px] text-muted truncate max-w-[190px] italic">
                      "{p.notes}"
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted/60">Sans remarque</span>
                  )}

                  {hasPermission("egg:create") && (
                    <button
                      type="button"
                      onClick={() => openEditModal(p)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-muted px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-surface-hover hover:border-accent hover:text-accent transition-colors"
                    >
                      <Edit3 className="h-3 w-3" />
                      <span>Modifier</span>
                    </button>
                  )}
                </div>
              </div>
            );
          }}
          emptyState={{
            icon: <Egg className="h-6 w-6 text-accent" />,
            title: "Aucune collecte enregistrée",
            description: "Enregistrez votre première collecte d'œufs pour suivre les rendements de vos pondeuses.",
            actionLabel: hasPermission("egg:create") ? "Enregistrer une collecte" : undefined,
            onAction: () => setModalOpen(true),
          }}
        />
      </div>

      {/* COLLECTION MODAL (Bottom Sheet sur smartphone) */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingEggId(null);
        }}
        title={editingEggId ? "Modifier ramassage" : "Collecte d'œufs"}
        description={
          editingEggId
            ? "Mise à jour des quantités"
            : "Saisie journalière"
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editingEggId &&
            productions.some(
              (p) =>
                p.flockId === selectedFlockId &&
                p.date === collectionDate &&
                p.session === session
            ) && (
              <div className="rounded-xl border border-warning/30 bg-warning-soft/30 p-3 text-xs text-warning flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  Ce créneau existe déjà. Les données seront mises à jour.
                </span>
              </div>
            )}

          {/* Bande pondeuse */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Bande
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

          {/* Date de collecte avec boutons rapides Aujourd'hui / Hier */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-foreground">
                Date
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={setToday}
                  className="rounded-lg bg-surface-muted border border-border px-2 py-0.5 text-[10px] font-semibold text-muted hover:text-foreground"
                >
                  Aujourd'hui
                </button>
                <button
                  type="button"
                  onClick={setYesterday}
                  className="rounded-lg bg-surface-muted border border-border px-2 py-0.5 text-[10px] font-semibold text-muted hover:text-foreground"
                >
                  Hier
                </button>
              </div>
            </div>
            <input
              type="date"
              required
              value={collectionDate}
              onChange={(e) => setCollectionDate(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
            />
          </div>

          {/* Session de collecte avec grandes touches tactiles */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Séance
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "MORNING", label: "Matin", icon: Sun, color: "text-amber-500" },
                { id: "NOON", label: "Midi", icon: Sun, color: "text-blue-500" },
                { id: "EVENING", label: "Soir", icon: Moon, color: "text-indigo-500" },
              ].map((s) => {
                const Icon = s.icon;
                const isSelected = session === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSession(s.id as EggSession)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition-all active:scale-95 ${
                      isSelected
                        ? "border-accent bg-accent text-white shadow-xs"
                        : "border-border bg-surface text-muted hover:bg-surface-hover"
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${isSelected ? "text-white" : s.color}`} />
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bons Œufs avec pavé tactile de saisie rapide (+30, +60, +150, etc.) */}
          <div className="rounded-2xl border border-success/30 bg-success/5 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-success flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                Bons œufs *
              </label>
              <button
                type="button"
                onClick={() => setGoodEggs(0)}
                className="text-[10px] font-semibold text-muted hover:text-foreground flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                Remise à 0
              </button>
            </div>

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
              className="w-full rounded-xl border border-success/40 bg-surface p-3 text-lg font-extrabold font-mono text-foreground focus:border-success focus:outline-hidden text-center"
            />

            {/* Raccourcis tactiles pour les plateaux africains (30 œufs par plateau) */}
            <div>
              <div className="text-[10px] font-semibold text-muted mb-1">
                Plateaux (30 œufs) :
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => addGoodEggs(30)}
                  className="rounded-lg border border-success/30 bg-surface py-1.5 text-xs font-bold text-success hover:bg-success/10 active:scale-95 transition-all"
                >
                  +1 pl. (30)
                </button>
                <button
                  type="button"
                  onClick={() => addGoodEggs(60)}
                  className="rounded-lg border border-success/30 bg-surface py-1.5 text-xs font-bold text-success hover:bg-success/10 active:scale-95 transition-all"
                >
                  +2 pl. (60)
                </button>
                <button
                  type="button"
                  onClick={() => addGoodEggs(150)}
                  className="rounded-lg border border-success/30 bg-surface py-1.5 text-xs font-bold text-success hover:bg-success/10 active:scale-95 transition-all"
                >
                  +5 pl. (150)
                </button>
                <button
                  type="button"
                  onClick={() => addGoodEggs(300)}
                  className="rounded-lg border border-success/30 bg-surface py-1.5 text-xs font-bold text-success hover:bg-success/10 active:scale-95 transition-all"
                >
                  +10 pl. (300)
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                <button
                  type="button"
                  onClick={() => addGoodEggs(1)}
                  className="rounded-lg border border-border bg-surface py-1 text-xs font-bold text-foreground hover:bg-surface-hover active:scale-95 transition-all"
                >
                  +1 œuf
                </button>
                <button
                  type="button"
                  onClick={() => addGoodEggs(5)}
                  className="rounded-lg border border-border bg-surface py-1 text-xs font-bold text-foreground hover:bg-surface-hover active:scale-95 transition-all"
                >
                  +5 œufs
                </button>
                <button
                  type="button"
                  onClick={() => addGoodEggs(-1)}
                  className="rounded-lg border border-border bg-surface py-1 text-xs font-bold text-muted hover:text-danger active:scale-95 transition-all"
                >
                  -1 œuf
                </button>
              </div>
            </div>
          </div>

          {/* Déclassés : Cassés et Anormaux */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-danger/30 bg-danger/5 p-2.5">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-danger">
                  Cassés / Fêlés
                </label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => addBrokenEggs(1)}
                    className="rounded bg-surface border border-danger/30 px-1.5 py-0.5 text-[10px] font-bold text-danger"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => addBrokenEggs(5)}
                    className="rounded bg-surface border border-danger/30 px-1.5 py-0.5 text-[10px] font-bold text-danger"
                  >
                    +5
                  </button>
                </div>
              </div>
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
                className="w-full rounded-xl border border-border bg-surface p-2 text-sm font-mono text-foreground focus:border-danger focus:outline-hidden text-center"
              />
            </div>

            <div className="rounded-xl border border-warning/30 bg-warning/5 p-2.5">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-warning">
                  Anormaux / Petits
                </label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => addAbnormalEggs(1)}
                    className="rounded bg-surface border border-warning/30 px-1.5 py-0.5 text-[10px] font-bold text-warning"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => addAbnormalEggs(5)}
                    className="rounded bg-surface border border-warning/30 px-1.5 py-0.5 text-[10px] font-bold text-warning"
                  >
                    +5
                  </button>
                </div>
              </div>
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
                className="w-full rounded-xl border border-border bg-surface p-2 text-sm font-mono text-foreground focus:border-warning focus:outline-hidden text-center"
              />
            </div>
          </div>

          {/* Live Plateaux & Rendement Display */}
          <div className="rounded-xl bg-accent-soft p-3.5 text-xs text-accent border border-accent/20">
            <div className="flex items-center justify-between font-bold">
              <span>Équivalence :</span>
              <span className="text-sm font-mono font-extrabold">{trayCalc.text}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] opacity-80">
              <span>
                Total :{" "}
                {Number(goodEggs || 0) + Number(brokenEggs || 0) + Number(abnormalEggs || 0)} œufs
              </span>
              {currentLayingRate && (
                <span className="font-semibold text-accent">
                  Taux : {currentLayingRate}%
                </span>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ex. Ponte stable, éclairage vérifié"
              className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
            />
          </div>

          {eggError && (
            <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{eggError}</div>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setModalOpen(false);
                setEditingEggId(null);
                setEggError(null);
              }}
              className="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-muted hover:bg-surface-hover"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-accent px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-accent-hover active:scale-95 transition-all flex items-center gap-2"
            >
              {submitting ? (
                "Enregistrement..."
              ) : editingEggId ? (
                "Modifier"
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Enregistrer</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Floating Action Button (FAB) Mobile — Toujours sous le pouce */}
      {hasPermission("egg:create") && (
        <button
          type="button"
          onClick={openCreateModal}
          aria-label="Noter un ramassage"
          className="fixed bottom-20 right-4 z-30 flex items-center gap-2 rounded-full bg-accent px-4 py-3 text-xs font-bold text-white shadow-xl shadow-accent/40 border-2 border-surface active:scale-90 transition-all sm:hidden"
        >
          <Plus className="h-4 w-4" />
          <span>Ramassage</span>
        </button>
      )}
    </Shell>
  );
}

