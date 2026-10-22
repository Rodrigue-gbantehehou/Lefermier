"use client";

import React, { useState, useEffect } from "react";
import {
  Utensils,
  Droplet,
  Plus,
  Trash2,
  AlertCircle,
  Bird,
  Sparkles,
  Check,
  CheckCircle2,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/context/toast-context";
import { api } from "@/lib/api-client";
import { Flock, InventoryItem, HealthTreatment } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { getUnitShortLabel, getPracticalMeasurementHint, formatInventoryUnit } from "@/lib/units";

interface WaterProductItem {
  id: string;
  itemId: string;
  quantity: number | string;
  unit: string;
  notes?: string;
}

interface RecordFeedingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  flocks: Flock[];
  inventoryItems: InventoryItem[];
  activeFarmId?: string;
  defaultFlockId?: string;
}

export function RecordFeedingModal({
  isOpen,
  onClose,
  onSuccess,
  flocks,
  inventoryItems,
  activeFarmId,
  defaultFlockId,
}: RecordFeedingModalProps) {
  const { toast } = useToast();

  const [feedFlockId, setFeedFlockId] = useState(defaultFlockId || (flocks[0]?.id ?? ""));
  const [feedSession, setFeedSession] = useState<"MORNING" | "NOON" | "EVENING">("MORNING");
  const [feedDate, setFeedDate] = useState("");
  const [feedItemId, setFeedItemId] = useState("");
  const [feedWeightKg, setFeedWeightKg] = useState<number | string>(25);
  const [feedNotes, setFeedNotes] = useState("");

  const [waterMode, setWaterMode] = useState<"CLEAR" | "TREATED">("CLEAR");
  const [waterVolumeLiters, setWaterVolumeLiters] = useState<number | string>(50);
  const [waterProducts, setWaterProducts] = useState<WaterProductItem[]>([]);

  // Soins & Vaccins planifiés
  const [scheduledTreatments, setScheduledTreatments] = useState<HealthTreatment[]>([]);
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string | null>(null);
  const [isLoadingTreatments, setIsLoadingTreatments] = useState(false);

  const [submittingFeeding, setSubmittingFeeding] = useState(false);
  const [feedingError, setFeedingError] = useState<string | null>(null);

  const availableFeeds = inventoryItems.filter(
    (i) =>
      i.category === "FEED" ||
      i.unit.startsWith("BAG") ||
      i.name.toLowerCase().includes("provende") ||
      i.name.toLowerCase().includes("aliment") ||
      i.name.toLowerCase().includes("farine")
  );

  const availableHealthProducts = inventoryItems.filter(
    (i) =>
      i.category === "MEDICINE" ||
      i.category === "VACCINE" ||
      i.category === "OTHER" ||
      ["ML", "LITER", "G", "SACHET", "DOSE", "VIAL"].includes(i.unit)
  );

  useEffect(() => {
    if (isOpen) {
      setFeedingError(null);
      setFeedDate(new Date().toISOString().split("T")[0]);
      const targetId = defaultFlockId || (flocks.length > 0 ? flocks[0].id : "");
      setFeedFlockId(targetId);
      if (availableFeeds.length > 0) {
        setFeedItemId(availableFeeds[0].id);
      }
      setFeedWeightKg(25);
      setFeedNotes("");
      setWaterMode("CLEAR");
      setWaterVolumeLiters(50);
      setWaterProducts([]);
      setSelectedTreatmentId(null);
    }
  }, [isOpen, defaultFlockId, flocks]);

  // Charger les soins programmés pour la bande ciblée
  useEffect(() => {
    if (isOpen && activeFarmId && feedFlockId) {
      setIsLoadingTreatments(true);
      api.health
        .list(activeFarmId, {
          flockId: feedFlockId,
          status: "SCHEDULED",
        })
        .then((res) => {
          setScheduledTreatments(res.data || []);
        })
        .catch((err) => {
          console.warn("Erreur chargement soins programmés:", err);
          setScheduledTreatments([]);
        })
        .finally(() => {
          setIsLoadingTreatments(false);
        });
    } else {
      setScheduledTreatments([]);
      setSelectedTreatmentId(null);
    }
  }, [isOpen, activeFarmId, feedFlockId]);

  const targetDate = feedDate || new Date().toISOString().split("T")[0];
  const todayTreatments = scheduledTreatments.filter((t) => {
    return t.scheduledDate === targetDate || t.isOverdue;
  });
  const primarySuggestedTreatment =
    todayTreatments.find((t) => t.administrationMethod === "DRINKING_WATER") ||
    todayTreatments[0] ||
    null;
  const selectedTreatment =
    scheduledTreatments.find((t) => t.id === selectedTreatmentId) || null;

  function handleApplyScheduledTreatment(treatment: HealthTreatment) {
    setSelectedTreatmentId(treatment.id);
    setWaterMode("TREATED");

    // Recherche d'un article de stock correspondant
    let matchedItem = availableHealthProducts.find(
      (i) => i.id === treatment.inventoryItem?.id
    );
    if (!matchedItem && treatment.title) {
      const titleLower = treatment.title.toLowerCase();
      matchedItem = availableHealthProducts.find(
        (i) =>
          titleLower.includes(i.name.toLowerCase()) ||
          i.name.toLowerCase().includes(titleLower.split(" ")[0].toLowerCase())
      );
    }
    const itemToUse = matchedItem || availableHealthProducts[0] || inventoryItems[0];

    if (itemToUse) {
      const defaultUnit =
        itemToUse.unit === "LITER" ? "ML" : itemToUse.unit === "KG" ? "G" : itemToUse.unit;
      setWaterProducts([
        {
          id: `wp_${Date.now()}`,
          itemId: itemToUse.id,
          quantity: defaultUnit === "ML" ? 15 : defaultUnit === "G" ? 15 : 1,
          unit: defaultUnit,
          notes: `Validation en 1 clic : ${treatment.title}`,
        },
      ]);
    }
  }

  function addWaterProduct() {
    const defaultItem = availableHealthProducts[0] || inventoryItems[0];
    const defaultUnit =
      defaultItem?.unit === "LITER"
        ? "ML"
        : defaultItem?.unit === "KG"
        ? "G"
        : defaultItem?.unit || "ML";

    setWaterProducts((prev) => [
      ...prev,
      {
        id: `wp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        itemId: defaultItem?.id || "",
        quantity: defaultUnit === "ML" ? 15 : defaultUnit === "G" ? 15 : 1,
        unit: defaultUnit,
      },
    ]);
  }

  function removeWaterProduct(id: string) {
    setWaterProducts((prev) => prev.filter((p) => p.id !== id));
  }

  function updateWaterProduct(id: string, updates: Partial<WaterProductItem>) {
    setWaterProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const updated = { ...p, ...updates };
        if (updates.itemId && updates.itemId !== p.itemId) {
          const item = inventoryItems.find((i) => i.id === updates.itemId);
          if (item) {
            updated.unit =
              item.unit === "LITER" ? "ML" : item.unit === "KG" ? "G" : item.unit;
          }
        }
        return updated;
      })
    );
  }

  async function handleFeedingSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedingError(null);
    if (!activeFarmId) return;
    if (!feedFlockId) {
      const msg = "Veuillez sélectionner une bande.";
      setFeedingError(msg);
      toast.warning(msg);
      return;
    }

    const sessionLabel =
      feedSession === "MORNING"
        ? "Matin"
        : feedSession === "NOON"
        ? "Midi"
        : "Soir";
    const targetFlock = flocks.find((f) => f.id === feedFlockId);
    setSubmittingFeeding(true);

    try {
      // 1. Décompte de la provende si renseignée
      if (feedItemId && Number(feedWeightKg) > 0) {
        await api.inventory.addMovement(feedItemId, {
          type: "FEEDING",
          quantity: Number(feedWeightKg),
          unit: "KG",
          movementDate: feedDate || new Date().toISOString().split("T")[0],
          flockId: feedFlockId,
          reason: `Ration ${sessionLabel} (${feedWeightKg} kg) - ${
            targetFlock?.name || "Bande"
          }`,
        });
      }

      // 2. Décompte des produits dans l'eau
      if (waterMode === "TREATED" && waterProducts.length > 0) {
        for (const wp of waterProducts) {
          if (wp.itemId && Number(wp.quantity) > 0) {
            const productItem = inventoryItems.find((i) => i.id === wp.itemId);
            await api.inventory.addMovement(wp.itemId, {
              type: "FEEDING",
              quantity: Number(wp.quantity),
              unit: wp.unit,
              movementDate: feedDate || new Date().toISOString().split("T")[0],
              flockId: feedFlockId,
              reason: `Abreuvement ${sessionLabel} (${wp.quantity} ${getUnitShortLabel(
                wp.unit
              )}) - ${targetFlock?.name || "Bande"}`,
            });
          }
        }

        // Si un vaccin ou soin planifié a été validé en 1 clic
        if (selectedTreatmentId) {
          const wpFirst = waterProducts[0];
          await api.health
            .complete(selectedTreatmentId, {
              administeredDate: feedDate || new Date().toISOString().split("T")[0],
              quantityUsed: wpFirst
                ? `${wpFirst.quantity} ${getUnitShortLabel(wpFirst.unit)}`
                : undefined,
              inventoryItemId: wpFirst?.itemId || undefined,
              deductFromStock: false, // Déjà déduit dans la boucle de stock ci-dessus
              notes: `Administré lors de la tournée ${sessionLabel}${
                waterVolumeLiters ? ` dans ${waterVolumeLiters} L d'eau` : ""
              }${feedNotes ? ` - ${feedNotes}` : ""}`,
            })
            .catch((err) => console.warn("Erreur validation soin planifié:", err));
        } else {
          // Traçabilité de soin spontané
          for (const wp of waterProducts) {
            if (wp.itemId && Number(wp.quantity) > 0) {
              const productItem = inventoryItems.find((i) => i.id === wp.itemId);
              await api.health
                .create(activeFarmId, {
                  flockId: feedFlockId,
                  title: productItem?.name || "Traitement eau de boisson",
                  type:
                    productItem?.category === "VACCINE"
                      ? "VACCINATION"
                      : "TREATMENT",
                  administrationMethod: "DRINKING_WATER",
                  scheduledDate:
                    feedDate || new Date().toISOString().split("T")[0],
                  inventoryItemId: wp.itemId,
                  quantityUsed: `${wp.quantity} ${getUnitShortLabel(wp.unit)}`,
                  notes: `Tournée ${sessionLabel}${
                    waterVolumeLiters ? ` dans ${waterVolumeLiters} L d'eau` : ""
                  }${wp.notes ? ` - ${wp.notes}` : ""}`,
                })
                .catch(() => {});
            }
          }
        }
      }

      toast.success(
        selectedTreatmentId
          ? `Tournée enregistrée et vaccin « ${selectedTreatment?.title} » validé au carnet de santé !`
          : "Tournée d'alimentation et abreuvement enregistrée avec succès !"
      );
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Erreur lors de l'enregistrement de la distribution.";
      setFeedingError(msg);
      toast.error(msg);
    } finally {
      setSubmittingFeeding(false);
    }
  }

  const selectedFlock =
    flocks.find((f) => f.id === feedFlockId) ||
    (defaultFlockId ? flocks.find((f) => f.id === defaultFlockId) : flocks[0]);
  const isFlockLocked = Boolean(defaultFlockId) || flocks.length <= 1;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        selectedFlock && isFlockLocked
          ? `Nourrir — ${selectedFlock.name}`
          : "Tournée d'alimentation & abreuvement"
      }
      description={
        selectedFlock && isFlockLocked
          ? `Distribution d'aliment et abreuvement pour ${selectedFlock.name} (${selectedFlock.breed ? `${selectedFlock.breed} • ` : ""}${formatNumber(selectedFlock.currentQuantity)} sujets vivants).`
          : "Ration quotidienne de provende pesée et préparation de l'eau de boisson (avec cocktail de soins éventuel)."
      }
      maxWidth="2xl"
    >
      <form onSubmit={handleFeedingSubmit} className="space-y-4">
        {/* Section 1 : Bande & Moment */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Bande de volailles
            </label>
            {isFlockLocked && selectedFlock ? (
              <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary-soft/30 px-3 py-2 text-xs font-semibold text-foreground h-[38px]">
                <div className="flex items-center gap-1.5 truncate">
                  <Bird className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="font-bold truncate">{selectedFlock.name}</span>
                </div>
                <span className="font-mono text-[11px] font-bold text-primary shrink-0">
                  {formatNumber(selectedFlock.currentQuantity)} sujets
                </span>
              </div>
            ) : (
              <select
                value={feedFlockId}
                onChange={(e) => setFeedFlockId(e.target.value)}
                required
                className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs font-semibold text-foreground"
              >
                {flocks.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.currentQuantity} sujets)
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Date
            </label>
            <input
              type="date"
              value={feedDate}
              onChange={(e) => setFeedDate(e.target.value)}
              required
              className="w-full rounded-xl border border-border bg-surface-muted p-2 text-xs font-semibold text-foreground focus:border-primary focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Moment
            </label>
            <div className="grid grid-cols-3 gap-1">
              {(["MORNING", "NOON", "EVENING"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFeedSession(s)}
                  className={`rounded-lg border py-2 text-xs font-bold transition-colors ${
                    feedSession === s
                      ? "border-amber-600 bg-amber-600 text-white"
                      : "border-border bg-surface text-muted hover:bg-surface-hover"
                  }`}
                >
                  {s === "MORNING" ? "Matin" : s === "NOON" ? "Midi" : "Soir"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 2 : Aliment / Provende */}
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
            <Utensils className="h-4 w-4" />
            <span>1. Distribution d'aliment (Provende)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-7">
              <label className="block text-xs font-semibold text-foreground mb-1">
                Aliment en magasin
              </label>
              <select
                value={feedItemId}
                onChange={(e) => setFeedItemId(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface p-2.5 text-xs font-semibold text-foreground"
              >
                <option value="">-- Aucun aliment à cette tournée --</option>
                {availableFeeds.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} (Stock :{" "}
                    {formatInventoryUnit(item.currentStock, item.unit, {
                      packageWeightKg: item.packageWeightKg,
                    })}
                    )
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-5">
              <label className="block text-xs font-semibold text-foreground mb-1">
                Poids pesé (kg)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={feedWeightKg}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFeedWeightKg(
                      val === "" ? "" : Math.max(0, parseFloat(val) || 0)
                    );
                  }}
                  placeholder="ex. 25"
                  className="w-full rounded-xl border border-border bg-surface p-2.5 text-sm font-mono font-bold text-foreground focus:border-amber-600 focus:outline-hidden"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-muted pointer-events-none">
                  kg
                </span>
              </div>
            </div>
          </div>

          {feedItemId && (
            <div className="flex items-center justify-between text-[11px] text-muted">
              {(() => {
                const item = inventoryItems.find((i) => i.id === feedItemId);
                const hint = getPracticalMeasurementHint(feedWeightKg, "KG", {
                  itemUnit: item?.unit,
                  packageWeightKg: item?.packageWeightKg,
                });
                return (
                  <>
                    <span>
                      Article : <strong>{item?.name}</strong>
                    </span>
                    {hint && (
                      <span className="font-mono text-amber-700 dark:text-amber-400 font-bold bg-surface px-2 py-0.5 rounded-md border border-amber-500/20">
                        {hint}
                      </span>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* Section 3 : Abreuvement & Traitement de l'eau */}
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-400">
              <Droplet className="h-4 w-4" />
              <span>2. Abreuvement
              </span>
            </div>
            <div className="flex items-center gap-1 bg-surface rounded-lg p-0.5 border border-border">
              <button
                type="button"
                onClick={() => setWaterMode("CLEAR")}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${
                  waterMode === "CLEAR"
                    ? "bg-primary text-white"
                    : "text-muted hover:text-foreground"
                }`}
              >
                Eau claire
              </button>
              <button
                type="button"
                onClick={() => {
                  setWaterMode("TREATED");
                  if (waterProducts.length === 0) {
                    addWaterProduct();
                  }
                }}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${
                  waterMode === "TREATED"
                    ? "bg-primary text-white"
                    : "text-muted hover:text-foreground"
                }`}
              >
                Eau avec traitement
              </button>
            </div>
          </div>

          {waterMode === "CLEAR" ? (
            <div className="space-y-2">
              <p className="text-[11px] text-muted italic">
                Abreuvoirs approvisionnés en eau pure (aucun additif ni médicament ce créneau).
              </p>
              {primarySuggestedTreatment && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 flex items-center justify-between gap-2 text-xs animate-in fade-in">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                    <Sparkles className="h-4 w-4 shrink-0 text-amber-600" />
                    <span>
                      Rappel : <strong>{primarySuggestedTreatment.title}</strong> est programmé pour cette bande.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setWaterMode("TREATED");
                      handleApplyScheduledTreatment(primarySuggestedTreatment);
                    }}
                    className="text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline shrink-0"
                  >
                    Passer en eau traitée & valider →
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Suggestion / Validation en 1 clic */}
              {selectedTreatment ? (
                <div className="rounded-xl border border-success/30 bg-success-soft/30 p-3 flex items-center justify-between gap-2.5 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-success">
                        Vaccin lié : « {selectedTreatment.title} »
                      </span>
                      <p className="text-[11px] text-muted">
                        Ce soin sera automatiquement validé et archivé dans le carnet de santé de la bande lors de l'enregistrement.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTreatmentId(null)}
                    className="text-xs text-muted hover:text-danger hover:underline font-semibold shrink-0"
                  >
                    Délier
                  </button>
                </div>
              ) : primarySuggestedTreatment ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/15 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-in fade-in duration-200">
                  <div className="flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        Vaccin prévu aujourd'hui :{" "}
                        <span className="text-amber-700 dark:text-amber-400 font-extrabold">
                          {primarySuggestedTreatment.title}
                        </span>
                      </p>
                      <p className="text-[11px] text-muted">
                        Méthode :{" "}
                        {primarySuggestedTreatment.administrationMethod === "DRINKING_WATER"
                          ? "Eau de boisson"
                          : primarySuggestedTreatment.administrationMethod}{" "}
                        • Âge cible : J{primarySuggestedTreatment.targetAgeDays}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApplyScheduledTreatment(primarySuggestedTreatment)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition-colors shrink-0 whitespace-nowrap"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Valider le vaccin prévu aujourd'hui : « {primarySuggestedTreatment.title} »</span>
                  </button>
                </div>
              ) : null}

              {/* Volume d'eau préparé */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Volume d'eau préparé dans les abreuvoirs (Litres)
                </label>
                <div className="relative w-48">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={waterVolumeLiters}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setWaterVolumeLiters(e.target.value)}
                    placeholder="ex. 50"
                    className="w-full rounded-xl border border-border bg-surface p-2 text-xs font-mono font-bold text-foreground focus:border-primary focus:outline-hidden"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-muted pointer-events-none">
                    Litres
                  </span>
                </div>
              </div>

              {/* Liste des produits ajoutés dans l'eau */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-foreground">
                  Médicaments / Vitamines ajoutés à cette eau :
                </label>

                {waterProducts.map((wp, index) => {
                  const selItem = inventoryItems.find((i) => i.id === wp.itemId);
                  const hint = getPracticalMeasurementHint(wp.quantity, wp.unit, {
                    itemUnit: selItem?.unit,
                  });

                  return (
                    <div
                      key={wp.id}
                      className="rounded-xl border border-border bg-surface p-2.5 space-y-1.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-muted">
                          Produit #{index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeWaterProduct(wp.id)}
                          title="Supprimer ce produit"
                          className="text-muted hover:text-danger p-1 rounded-md hover:bg-surface-muted transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        {/* Sélection du médicament/vitamine */}
                        <div className="sm:col-span-7">
                          <select
                            value={wp.itemId}
                            onChange={(e) =>
                              updateWaterProduct(wp.id, { itemId: e.target.value })
                            }
                            required
                            className="w-full rounded-lg border border-border bg-surface-muted p-2 text-xs font-semibold text-foreground focus:border-primary focus:outline-hidden"
                          >
                            <option value="">-- Choisir un produit --</option>
                            {availableHealthProducts.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name} ({item.currentStock} {item.unit})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Quantité & Unité */}
                        <div className="sm:col-span-5 flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={wp.quantity}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) =>
                              updateWaterProduct(wp.id, {
                                quantity: e.target.value,
                              })
                            }
                            required
                            placeholder="Dose"
                            className="w-24 rounded-lg border border-border bg-surface-muted p-2 text-xs font-mono font-bold text-foreground focus:border-primary focus:outline-hidden"
                          />
                          <select
                            value={wp.unit}
                            onChange={(e) =>
                              updateWaterProduct(wp.id, { unit: e.target.value })
                            }
                            className="flex-1 rounded-lg border border-border bg-surface-muted p-2 text-xs font-semibold text-foreground"
                          >
                            <option value="ML">mL (liquide)</option>
                            <option value="LITER">Litre (L)</option>
                            <option value="G">Gramme (g)</option>
                            <option value="SACHET">Sachet</option>
                            <option value="DOSE">Dose</option>
                            <option value="VIAL">Flacon</option>
                          </select>
                        </div>
                      </div>

                      {/* Repère agricole pratique */}
                      {hint && (
                        <div className="text-[11px] font-mono text-blue-700 dark:text-blue-300 font-semibold bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md inline-block">
                          💡 {hint}
                        </div>
                      )}
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={addWaterProduct}
                  className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-hover hover:underline transition-colors pt-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Ajouter un autre médicament / vitamine dans l'eau</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {feedingError && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger flex items-start gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">
              {feedingError}
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-end gap-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted hover:bg-surface-hover"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={submittingFeeding}
            className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition-colors"
          >
            {submittingFeeding
              ? "Enregistrement de la tournée..."
              : "Valider la distribution"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
