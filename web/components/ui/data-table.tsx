"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Filter,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { TimePeriod, TIME_PERIOD_LABELS, isDateInPeriod } from "@/lib/utils";

export interface ColumnDef<T> {
  key: string;
  header: React.ReactNode;
  accessor?: (item: T) => any;
  cell?: (item: T) => React.ReactNode;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  className?: string;
  headerClassName?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  keyExtractor?: (item: T, index: number) => string | number;
  title?: string;
  subtitle?: string;
  badge?: React.ReactNode;

  // Filtre temporel (Jour / Semaine / Mois)
  periodFilter?: boolean;
  dateAccessor?: (item: T) => string | null | undefined;
  defaultPeriod?: TimePeriod;
  activePeriod?: TimePeriod;
  onPeriodChange?: (period: TimePeriod) => void;
  includeAll?: boolean;

  // Recherche textuelle
  searchable?: boolean;
  searchPlaceholder?: string;
  searchAccessor?: (item: T) => string;

  // Tri
  initialSort?: {
    key: string;
    direction: "asc" | "desc";
  };

  // Filtres complémentaires (ex: sélecteur de type d'élevage, onglets métiers)
  secondaryFilter?: React.ReactNode;

  // Actions d'en-tête (boutons d'ajout, export)
  actions?: React.ReactNode;

  // Bascule d'affichage (Tableau vs Cartes / Grille)
  viewMode?: "table" | "grid";
  onViewModeChange?: (mode: "table" | "grid") => void;
  renderGridItem?: (item: T) => React.ReactNode;
  renderMobileCard?: (item: T) => React.ReactNode;

  // Pagination
  pageSize?: number;

  // Clic sur ligne
  onRowClick?: (item: T) => void;
  rowClassName?: (item: T) => string;

  // État vide
  emptyState?: {
    icon?: React.ReactNode;
    title?: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
  };

  isLoading?: boolean;
  className?: string;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  title,
  subtitle,
  badge,
  periodFilter = false,
  dateAccessor,
  defaultPeriod = "MONTH",
  includeAll = false,
  activePeriod: controlledPeriod,
  onPeriodChange,
  searchable = true,
  searchPlaceholder = "Rechercher...",
  searchAccessor,
  initialSort,
  secondaryFilter,
  actions,
  viewMode = "table",
  onViewModeChange,
  renderGridItem,
  renderMobileCard,
  pageSize = 15,
  onRowClick,
  rowClassName,
  emptyState,
  isLoading = false,
  className = "",
}: DataTableProps<T>) {
  // Période temporelle interne si non contrôlée
  const [internalPeriod, setInternalPeriod] = useState<TimePeriod>(
    defaultPeriod === "ALL" && !includeAll ? "MONTH" : defaultPeriod
  );
  const selectedPeriod = controlledPeriod !== undefined ? controlledPeriod : internalPeriod;

  const handlePeriodChange = (p: TimePeriod) => {
    if (controlledPeriod === undefined) {
      setInternalPeriod(p);
    }
    onPeriodChange?.(p);
    setCurrentPage(1);
  };

  // Recherche
  const [searchQuery, setSearchQuery] = useState("");

  // Tri
  const [sortState, setSortState] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(initialSort || null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // 1. Filtrage temporel (Jour / Semaine / Mois / Tout)
  const periodFilteredData = useMemo(() => {
    if (!periodFilter || !dateAccessor || selectedPeriod === "ALL") {
      return data;
    }
    return data.filter((item) => {
      const dateVal = dateAccessor(item);
      return isDateInPeriod(dateVal, selectedPeriod);
    });
  }, [data, periodFilter, dateAccessor, selectedPeriod]);

  // 2. Filtrage recherche
  const searchFilteredData = useMemo(() => {
    if (!searchable || !searchQuery.trim()) {
      return periodFilteredData;
    }
    const q = searchQuery.toLowerCase().trim();

    return periodFilteredData.filter((item) => {
      if (searchAccessor) {
        return searchAccessor(item).toLowerCase().includes(q);
      }
      // Recherche globale sur les valeurs primitives
      return Object.values(item as any).some((val) => {
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(q);
      });
    });
  }, [periodFilteredData, searchable, searchQuery, searchAccessor]);

  // 3. Tri
  const sortedData = useMemo(() => {
    if (!sortState) return searchFilteredData;

    const col = columns.find((c) => c.key === sortState.key);
    if (!col) return searchFilteredData;

    const getValue = (item: T) => {
      if (col.accessor) return col.accessor(item);
      return (item as any)[col.key];
    };

    return [...searchFilteredData].sort((a, b) => {
      const valA = getValue(a);
      const valB = getValue(b);

      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      let comparison = 0;
      if (typeof valA === "number" && typeof valB === "number") {
        comparison = valA - valB;
      } else if (valA instanceof Date && valB instanceof Date) {
        comparison = valA.getTime() - valB.getTime();
      } else {
        const strA = String(valA);
        const strB = String(valB);
        // Tentative de détection de date ISO
        const isDateA = !isNaN(Date.parse(strA)) && strA.length >= 10;
        const isDateB = !isNaN(Date.parse(strB)) && strB.length >= 10;
        if (isDateA && isDateB) {
          comparison = new Date(strA).getTime() - new Date(strB).getTime();
        } else {
          comparison = strA.localeCompare(strB, "fr", { numeric: true, sensitivity: "base" });
        }
      }

      return sortState.direction === "asc" ? comparison : -comparison;
    });
  }, [searchFilteredData, sortState, columns]);

  // 4. Pagination
  const totalItems = sortedData.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedData = useMemo(() => {
    if (pageSize <= 0) return sortedData;
    const start = (safePage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, safePage, pageSize]);

  const handleSort = (key: string) => {
    setSortState((prev) => {
      if (prev?.key !== key) {
        return { key, direction: "asc" };
      }
      if (prev.direction === "asc") {
        return { key, direction: "desc" };
      }
      return null;
    });
  };

  const periodOptions: { label: string; value: TimePeriod }[] = [
    ...(includeAll ? [{ label: "Tout", value: "ALL" as TimePeriod }] : []),
    { label: "Aujourd'hui", value: "TODAY" },
    { label: "Cette semaine", value: "WEEK" },
    { label: "Ce mois", value: "MONTH" },
  ];

  const getKey = (item: T, idx: number) => {
    if (keyExtractor) return keyExtractor(item, idx);
    if ((item as any).id) return (item as any).id;
    return idx;
  };

  return (
    <div className={`rounded-2xl border border-border bg-surface p-3.5 sm:p-5 shadow-xs ${className}`}>
      {/* 1. Header Toolbar */}
      <div className="flex flex-col gap-4 pb-4 border-b border-border">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {title && (
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">{title}</h2>
                
              </div>
            )}
            {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
          </div>

          {/* Action buttons (New, Export, etc.) & View Switcher */}
          <div className="flex items-center gap-2">
            {actions}

            {/* Toggle Table vs Grid if renderGridItem provided */}
            {renderGridItem && onViewModeChange && (
              <div className="flex items-center rounded-xl border border-border bg-surface-muted p-0.5">
                <button
                  type="button"
                  onClick={() => onViewModeChange("table")}
                  title="Vue Tableau"
                  className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                    viewMode === "table"
                      ? "bg-surface text-primary shadow-xs"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  <List className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onViewModeChange("grid")}
                  title="Vue Grille / Cartes"
                  className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                    viewMode === "grid"
                      ? "bg-surface text-primary shadow-xs"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 2. Secondary Filter & Period Filter Toolbar */}
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between pt-1">
          {/* Left: Period Tabs (Jour / Semaine / Mois / Tout) */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {periodFilter && (
              <div className="flex items-center gap-1 rounded-xl bg-surface-muted p-1 border border-border/60">
                <Calendar className="h-3.5 w-3.5 text-muted ml-1.5 hidden sm:block" />
                {periodOptions.map((opt) => {
                  const isActive = selectedPeriod === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handlePeriodChange(opt.value)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-primary text-white shadow-xs"
                          : "text-muted hover:text-foreground hover:bg-surface/50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Slot for category or custom pills */}
            {secondaryFilter}
          </div>

          {/* Right: Search Input */}
          {searchable && (
            <div className="relative w-full lg:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={searchPlaceholder}
                className="w-full rounded-xl border border-border bg-surface-muted pl-8.5 pr-8 py-1.5 text-xs text-foreground placeholder:text-muted focus:border-primary focus:bg-surface focus:outline-hidden transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setCurrentPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. Table / Grid Content */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-muted animate-pulse">
          Chargement des données...
        </div>
      ) : totalItems === 0 ? (
        <EmptyState
          icon={emptyState?.icon || <Filter className="h-6 w-6 text-muted" />}
          title={searchQuery ? "Aucun résultat trouvé" : emptyState?.title || "Aucune donnée disponible"}
          description={
            searchQuery
              ? "Modifiez vos filtres de recherche."
              : emptyState?.description || "Aucun enregistrement trouvé pour cette période."
          }
          actionLabel={
            searchQuery
              ? "Effacer la recherche"
              : emptyState?.actionLabel
          }
          onAction={
            searchQuery
              ? () => {
                  setSearchQuery("");
                }
              : emptyState?.onAction
          }
          className="my-6 border-none"
        />
      ) : viewMode === "grid" && renderGridItem ? (
        <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {paginatedData.map((item, idx) => (
            <React.Fragment key={getKey(item, idx)}>
              {renderGridItem(item)}
            </React.Fragment>
          ))}
        </div>
      ) : (
        <>
          {/* VUE MOBILE (< 768px) : Cartes tactiles empilées sans aucun défilement horizontal forcé */}
          <div className="mt-4 space-y-3 md:hidden">
            {paginatedData.map((item, idx) => {
              const rowKey = getKey(item, idx);
              const customRowClass = rowClassName ? rowClassName(item) : "";
              const isClickable = !!onRowClick;

              if (renderMobileCard) {
                return (
                  <div
                    key={rowKey}
                    onClick={() => onRowClick?.(item)}
                    className={isClickable ? "cursor-pointer" : ""}
                  >
                    {renderMobileCard(item)}
                  </div>
                );
              }

              // Rendu automatique intelligent en carte mobile
              const firstCol = columns[0];
              const actionCol = columns.find(
                (c) => c.key === "actions" || c.key === "action" || (!c.header && c.cell)
              );
              const rightCol =
                columns.find(
                  (c) =>
                    c !== firstCol &&
                    c !== actionCol &&
                    (c.align === "right" ||
                      c.key.toLowerCase().includes("amount") ||
                      c.key.toLowerCase().includes("montant") ||
                      c.key.toLowerCase().includes("total"))
                ) ||
                (columns.length > 2 && columns[columns.length - (actionCol ? 2 : 1)] !== firstCol
                  ? columns[columns.length - (actionCol ? 2 : 1)]
                  : null);

              const middleCols = columns.filter(
                (c) => c !== firstCol && c !== actionCol && c !== rightCol
              );

              return (
                <div
                  key={rowKey}
                  onClick={() => onRowClick?.(item)}
                  className={`rounded-2xl border border-border bg-surface p-4 shadow-xs space-y-2.5 transition-all ${
                    isClickable ? "cursor-pointer active:scale-[0.99] hover:border-primary/50" : ""
                  } ${customRowClass}`}
                >
                  {/* Haut de la carte : Titre / Date principale + Montant ou Statut */}
                  <div className="flex items-start justify-between gap-2 border-b border-border/50 pb-2.5">
                    <div className="min-w-0 font-bold text-xs text-foreground">
                      {firstCol?.cell
                        ? firstCol.cell(item)
                        : firstCol?.accessor
                        ? firstCol.accessor(item)
                        : (item as any)[firstCol?.key || ""]}
                    </div>
                    {rightCol && (
                      <div className="text-right shrink-0">
                        {rightCol.cell
                          ? rightCol.cell(item)
                          : rightCol.accessor
                          ? rightCol.accessor(item)
                          : (item as any)[rightCol.key]}
                      </div>
                    )}
                  </div>

                  {/* Corps de la carte : Détails en paires clé/valeur */}
                  {middleCols.length > 0 && (
                    <div className="space-y-1.5 text-xs py-0.5">
                      {middleCols.map((col) => {
                        const content = col.cell
                          ? col.cell(item)
                          : col.accessor
                          ? col.accessor(item)
                          : (item as any)[col.key];

                        if (content === null || content === undefined || content === "") return null;

                        return (
                          <div key={col.key} className="flex items-center justify-between gap-2 py-0.5">
                            <span className="text-[11px] text-muted font-medium shrink-0">
                              {col.header} :
                            </span>
                            <span className="text-right text-xs font-semibold text-foreground truncate max-w-[65%]">
                              {content}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Bas de la carte : Actions (bouton Reçu, détails, etc.) */}
                  {actionCol && (
                    <div className="pt-2 border-t border-border/50 flex items-center justify-end">
                      {actionCol.cell
                        ? actionCol.cell(item)
                        : actionCol.accessor
                        ? actionCol.accessor(item)
                        : (item as any)[actionCol.key]}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* VUE TABLEAU DESKTOP & TABLETTE (>= 768px) */}
          <div className="hidden md:block mt-4 overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-muted text-muted">
                <tr>
                  {columns.map((col, idx) => {
                    const isSorted = sortState?.key === col.key;
                    const isFirst = idx === 0;
                    const isLast = idx === columns.length - 1;
                    const alignClass =
                      col.align === "right"
                        ? "text-right"
                        : col.align === "center"
                        ? "text-center"
                        : "text-left";

                    return (
                      <th
                        key={col.key}
                        className={`py-2.5 px-3 font-semibold whitespace-nowrap ${alignClass} ${
                          isFirst ? "rounded-l-lg" : ""
                        } ${isLast ? "rounded-r-lg" : ""} ${col.headerClassName || ""}`}
                      >
                        {col.sortable ? (
                          <button
                            type="button"
                            onClick={() => handleSort(col.key)}
                            className={`inline-flex items-center gap-1 hover:text-foreground transition-colors group ${
                              alignClass === "text-right" ? "justify-end ml-auto" : ""
                            }`}
                          >
                            <span>{col.header}</span>
                            {isSorted ? (
                              sortState?.direction === "asc" ? (
                                <ArrowUp className="h-3.5 w-3.5 text-primary" />
                              ) : (
                                <ArrowDown className="h-3.5 w-3.5 text-primary" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 opacity-30 group-hover:opacity-100 transition-opacity" />
                            )}
                          </button>
                        ) : (
                          <span>{col.header}</span>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedData.map((item, idx) => {
                  const rowKey = getKey(item, idx);
                  const customRowClass = rowClassName ? rowClassName(item) : "";
                  const isClickable = !!onRowClick;

                  return (
                    <tr
                      key={rowKey}
                      onClick={() => onRowClick?.(item)}
                      className={`transition-colors ${
                        isClickable ? "cursor-pointer hover:bg-surface-hover/80" : "hover:bg-surface-hover/50"
                      } ${customRowClass}`}
                    >
                      {columns.map((col) => {
                        const alignClass =
                          col.align === "right"
                            ? "text-right"
                            : col.align === "center"
                            ? "text-center"
                            : "text-left";

                        let content: React.ReactNode;
                        if (col.cell) {
                          content = col.cell(item);
                        } else if (col.accessor) {
                          content = col.accessor(item);
                        } else {
                          content = (item as any)[col.key];
                        }

                        return (
                          <td
                            key={col.key}
                            className={`py-3 px-3 ${alignClass} ${col.className || ""}`}
                          >
                            {content}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 4. Footer Pagination & Status */}
      {totalItems > 0 && (
        <div className="mt-4 pt-3 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-muted">
          <div>
            Affichage de{" "}
            <span className="font-semibold text-foreground">
              {Math.min(totalItems, (safePage - 1) * pageSize + 1)}
            </span>{" "}
            à{" "}
            <span className="font-semibold text-foreground">
              {Math.min(totalItems, safePage * pageSize)}
            </span>{" "}
            sur <span className="font-semibold text-foreground">{totalItems}</span> éléments
            {periodFilter && selectedPeriod && (
              <span className="ml-1.5 opacity-75">
                (Période : {TIME_PERIOD_LABELS[selectedPeriod] || selectedPeriod})
              </span>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-surface text-foreground disabled:opacity-30 disabled:pointer-events-none hover:bg-surface-hover transition-colors"
                title="Page précédente"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="text-xs font-semibold px-2">
                Page {safePage} / {totalPages}
              </span>

              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-surface text-foreground disabled:opacity-30 disabled:pointer-events-none hover:bg-surface-hover transition-colors"
                title="Page suivante"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
