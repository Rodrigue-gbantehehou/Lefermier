"use client";

import React from "react";
import Link from "next/link";
import { Package, ArrowRight, CheckCircle2 } from "lucide-react";
import { InventoryItem } from "@/lib/types";
import { formatInventoryUnit } from "@/lib/units";

interface InventoryAlertsWidgetProps {
  inventoryItems: InventoryItem[];
}

export function InventoryAlertsWidget({
  inventoryItems,
}: InventoryAlertsWidgetProps) {
  const lowStockItems = inventoryItems.filter(
    (i) => i.currentStock <= i.minThreshold || i.isLowStock
  );

  const categoryLabels: Record<string, string> = {
    FEED: "Alimentation",
    VACCINE: "Vaccin",
    MEDICINE: "Médicament",
    EQUIPMENT: "Matériel",
    OTHER: "Autre",
  };

  return (
    <div className="mt-8 rounded-2xl border border-border bg-surface p-5 shadow-xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl shadow-2xs ${
              lowStockItems.length > 0
                ? "bg-danger-soft text-danger"
                : "bg-success-soft text-success"
            }`}
          >
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">
              Surveillance des stocks & Aliments
            </h2>
            <p className="text-xs text-muted">
              {lowStockItems.length > 0
                ? `${lowStockItems.length} produit(s) en alerte ou presque épuisé(s)`
                : "Réserves d'aliments et produits de soin suffisantes"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/inventory"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground shadow-xs hover:bg-surface-hover transition-colors"
          >
            <span>Gérer tous les stocks</span>
            <ArrowRight className="h-3.5 w-3.5 text-muted" />
          </Link>
        </div>
      </div>

      {lowStockItems.length > 0 ? (
        <>
          {/* Mobile Cards View (< md) */}
          <div className="mt-4 space-y-2.5 md:hidden">
            {lowStockItems.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-danger/30 bg-danger-soft/10 p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2 border-b border-danger/20 pb-2">
                  <div>
                    <span className="font-bold text-xs text-foreground block">
                      {item.name}
                    </span>
                    <span className="text-[10px] text-muted">
                      {categoryLabels[item.category] || item.category}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-danger bg-danger-soft px-2 py-0.5 rounded-md">
                    <span className="h-1.5 w-1.5 rounded-full bg-danger animate-pulse" />
                    Urgence
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-0.5 font-mono">
                  <span className="text-[11px] text-muted">
                    Seuil : {formatInventoryUnit(item.minThreshold, item.unit, { short: true })}
                  </span>
                  <span className="font-bold text-danger text-xs">
                    Reste : {formatInventoryUnit(item.currentStock, item.unit)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table (>= md) */}
          <div className="hidden md:block mt-4 overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <table className="w-full min-w-[500px] text-left text-xs">
              <thead className="bg-danger-soft/40 text-danger">
                <tr>
                  <th className="py-2.5 px-3 font-semibold rounded-l-lg whitespace-nowrap">
                    Produit en alerte
                  </th>
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Catégorie</th>
                  <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">
                    Stock restant
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">
                    Seuil d'alerte
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-right rounded-r-lg whitespace-nowrap">
                    Urgence
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lowStockItems.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-hover transition-colors">
                    <td className="py-3 px-3 font-bold text-foreground">
                      {item.name}
                    </td>
                    <td className="py-3 px-3 text-muted">
                      <span className="text-xs font-medium text-muted">
                        {item.category === "OTHER" && item.customCategory
                          ? item.customCategory
                          : categoryLabels[item.category] || item.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-danger">
                      {formatInventoryUnit(item.currentStock, item.unit)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-muted">
                      {formatInventoryUnit(item.minThreshold, item.unit, { short: true })}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-danger">
                        <span className="h-1.5 w-1.5 rounded-full bg-danger animate-pulse" />
                        Commander d'urgence
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-success-soft/30 border border-success/20 p-4">
          <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
          <div className="text-xs">
            <p className="font-bold text-success">
              Toutes vos réserves sont au vert !
            </p>
            <p className="text-muted mt-0.5">
              Aucun aliment ou produit vétérinaire n'est en rupture. Les quantités en stock couvrent les besoins de vos poules.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
