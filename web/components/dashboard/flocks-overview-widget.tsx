"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Utensils, Bird } from "lucide-react";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { Flock } from "@/lib/types";
import { formatNumber, formatDate } from "@/lib/utils";

interface FlocksOverviewWidgetProps {
  flocks: Flock[];
  onOpenFeedingModal: (flockId: string) => void;
}

export function FlocksOverviewWidget({
  flocks,
  onOpenFeedingModal,
}: FlocksOverviewWidgetProps) {
  const columns: ColumnDef<Flock>[] = [
    {
      key: "name",
      header: "Nom du groupe",
      sortable: true,
      cell: (f) => (
        <div>
          <span className="font-bold text-foreground">{f.name}</span>
          {f.code && <div className="text-[10px] font-mono text-muted">{f.code}</div>}
        </div>
      ),
    },
    {
      key: "type",
      header: "Type d'élevage",
      sortable: true,
      cell: (f) => (
        <span className="text-xs font-medium text-foreground">
          {f.type === "LAYER"
            ? "Pondeuses"
            : f.type === "BROILER"
              ? "Poulets de chair"
              : "Mixte"}
        </span>
      ),
    },
    {
      key: "breed",
      header: "Race / Souche",
      sortable: true,
      accessor: (f) => f.strain || f.breed || "-",
      cell: (f) => <span className="text-muted">{f.strain || f.breed || "-"}</span>,
    },
    {
      key: "building",
      header: "Poulailler",
      sortable: true,
      accessor: (f) => f.buildingName || "-",
      cell: (f) => (
        <span className="text-muted text-xs">
          {f.buildingName || "Non affecté"}
        </span>
      ),
    },
    {
      key: "initialQuantity",
      header: "Au départ",
      sortable: true,
      align: "right",
      accessor: (f) => f.initialQuantity,
      cell: (f) => (
        <span className="font-mono text-muted">
          {formatNumber(f.initialQuantity)}
        </span>
      ),
    },
    {
      key: "currentQuantity",
      header: "Poules vivantes",
      sortable: true,
      align: "right",
      accessor: (f) => f.currentQuantity,
      cell: (f) => (
        <span className="font-mono font-bold text-primary">
          {formatNumber(f.currentQuantity)}
        </span>
      ),
    },
    {
      key: "losses",
      header: "Pertes (morts)",
      sortable: true,
      align: "right",
      accessor: (f) => Math.max(0, f.initialQuantity - f.currentQuantity),
      cell: (f) => {
        const losses = Math.max(0, f.initialQuantity - f.currentQuantity);
        return (
          <span
            className={`font-mono font-semibold ${
              losses > 0 ? "text-danger" : "text-muted"
            }`}
          >
            {losses > 0 ? `-${formatNumber(losses)}` : "0"}
          </span>
        );
      },
    },
    {
      key: "startDate",
      header: "Date d'arrivée",
      sortable: true,
      align: "right",
      accessor: (f) => f.startDate,
      cell: (f) => (
        <span className="font-mono text-muted">
          {formatDate(f.startDate)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Action",
      align: "right",
      cell: (f) => (
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenFeedingModal(f.id);
            }}
            className="inline-flex items-center gap-1 rounded-lg bg-amber-600/10 border border-amber-600/20 px-2.5 py-1 text-xs font-bold text-amber-700 hover:bg-amber-600 hover:text-white transition-colors"
          >
            <Utensils className="h-3 w-3" />
            <span>Nourrir</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="mt-8">
      <DataTable<Flock>
        title="Vos groupes de volaille en élevage"
        subtitle="Nombre de poules par groupe, race, pertes et date d'arrivée."
        data={flocks}
        columns={columns}
        searchable={true}
        searchPlaceholder="Rechercher un groupe..."
        searchAccessor={(f: Flock) => `${f.name} ${f.code || ""} ${f.breed || ""} ${f.strain || ""}`}
        pageSize={10}
        actions={
          <Link
            href="/flocks"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            <span>Gérer les volailles</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
        emptyState={{
          icon: <Bird className="h-8 w-8 text-primary" />,
          title: "Aucune volaille enregistrée",
          description:
            "Ajoutez votre premier groupe de poussins ou poules pondeuses pour démarrer le suivi.",
        }}
      />
    </div>
  );
}
