"use client";

import React, { useEffect, useState } from "react";
import { Plus, Wallet, ArrowUpRight, ArrowDownRight, Filter } from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api-client";
import { Transaction, TransactionType, PaymentMethod } from "@/lib/types";
import { formatFcfa, formatDate } from "@/lib/utils";

export default function FinancesPage() {
  const { activeFarm, hasPermission } = useAuth();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(true);

  // New Transaction Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [type, setType] = useState<TransactionType>("INCOME");
  const [amountFcfa, setAmountFcfa] = useState<number | string>(0);
  const [category, setCategory] = useState("Vente Oeufs");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("MTN_MOMO");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [txDate, setTxDate] = useState("");

  useEffect(() => {
    setTxDate(new Date().toISOString().split("T")[0]);
  }, []);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (activeFarm?.id) {
      loadTransactions();
    }
  }, [activeFarm?.id]);

  async function loadTransactions() {
    setIsLoading(true);
    try {
      const data = await api.finance.listTransactions({ farmId: activeFarm?.id });
      setTransactions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeFarm?.id) return;
    setSubmitting(true);
    try {
      await api.finance.createTransaction({
        farmId: activeFarm.id,
        type,
        amountFcfa: Number(amountFcfa),
        category,
        paymentMethod,
        reference: reference || undefined,
        notes: notes || undefined,
        date: txDate,
      });
      setModalOpen(false);
      setAmountFcfa(0);
      setReference("");
      setNotes("");
      await loadTransactions();
    } catch (err: any) {
      alert(err?.message || "Erreur lors de la création de la transaction");
    } finally {
      setSubmitting(false);
    }
  }

  const totalIncome = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + t.amountFcfa, 0);

  const totalExpense = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + t.amountFcfa, 0);

  const netBalance = totalIncome - totalExpense;

  const filteredTransactions = transactions.filter((t) => {
    if (filterType === "ALL") return true;
    return t.type === filterType;
  });

  const paymentMethodLabels: Record<PaymentMethod, { label: string; badge: "warning" | "info" | "default" | "neutral" }> = {
    MTN_MOMO: { label: "MTN MoMo", badge: "warning" },
    MOOV_MONEY: { label: "Moov Money", badge: "info" },
    CELTIIS_CASH: { label: "Celtiis Cash", badge: "default" },
    CASH: { label: "Espèces", badge: "neutral" },
    BANK_TRANSFER: { label: "Virement Bancaire", badge: "neutral" },
    CHECK: { label: "Chèque", badge: "neutral" },
  };

  const txColumns: ColumnDef<Transaction>[] = [
    {
      key: "date",
      header: "Date",
      sortable: true,
      accessor: (tx) => tx.date,
      cell: (tx) => <span className="font-medium text-foreground">{formatDate(tx.date)}</span>,
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      cell: (tx) => {
        const isIncome = tx.type === "INCOME";
        return (
          <Badge variant={isIncome ? "success" : "danger"} size="sm">
            {isIncome ? "Recette" : "Dépense"}
          </Badge>
        );
      },
    },
    {
      key: "category",
      header: "Catégorie",
      sortable: true,
      accessor: (tx) => tx.category,
      cell: (tx) => <span className="font-semibold text-foreground">{tx.category}</span>,
    },
    {
      key: "paymentMethod",
      header: "Moyen de Paiement",
      sortable: true,
      cell: (tx) => {
        const method = paymentMethodLabels[tx.paymentMethod] || {
          label: tx.paymentMethod,
          badge: "neutral" as const,
        };
        return (
          <Badge variant={method.badge} size="sm">
            {method.label}
          </Badge>
        );
      },
    },
    {
      key: "reference",
      header: "Référence / Tiers",
      sortable: true,
      accessor: (tx) => tx.notes || tx.reference || "-",
      cell: (tx) => <span className="text-muted">{tx.notes || tx.reference || "-"}</span>,
    },
    {
      key: "amountFcfa",
      header: "Montant (FCFA)",
      sortable: true,
      align: "right",
      accessor: (tx) => (tx.type === "INCOME" ? tx.amountFcfa : -tx.amountFcfa),
      cell: (tx) => {
        const isIncome = tx.type === "INCOME";
        return (
          <span
            className={`font-mono font-bold text-sm ${
              isIncome ? "text-success" : "text-danger"
            }`}
          >
            {isIncome ? "+" : "-"} {formatFcfa(tx.amountFcfa)}
          </span>
        );
      },
    },
  ];

  return (
    <Shell>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-border">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Trésorerie, Ventes & Dépenses
          </h1>
          <p className="mt-1 text-xs text-muted">
            Encaissements et décaissements en FCFA (MTN Mobile Money, Moov, Celtiis, Espèces).
          </p>
        </div>

        {hasPermission("finance:create") && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-hover transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Nouvelle Transaction</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Ventes encaissées"
          value={formatFcfa(totalIncome)}
          subtitle="Argent reçu des ventes d'œufs et poulets"
          accent="primary"
          icon={<ArrowUpRight className="h-5 w-5 text-success" />}
          trend={{
            value: "Entrées d'argent",
            isPositive: true,
          }}
        />
        <StatCard
          title="Dépenses payées"
          value={formatFcfa(totalExpense)}
          subtitle="Achats d'aliments, soins et charges"
          accent="rose"
          icon={<ArrowDownRight className="h-5 w-5 text-danger" />}
          trend={{
            value: "Sorties d'argent",
            isPositive: false,
          }}
        />
        <StatCard
          title="Argent restant en caisse"
          value={formatFcfa(netBalance)}
          subtitle={netBalance >= 0 ? "Bénéfice net disponible" : "Caisse en déficit"}
          accent={netBalance >= 0 ? "primary" : "rose"}
          icon={<Wallet className="h-5 w-5" />}
          trend={{
            value: netBalance >= 0 ? "Caisse positive" : "Caisse dans le rouge",
            isPositive: netBalance >= 0,
          }}
        />
      </div>

      {/* Transactions Table */}
      <div className="mt-8">
        <DataTable<Transaction>
          title="Historique des flux de trésorerie"
          subtitle="Suivi des encaissements et décaissements en FCFA. Filtrable par Jour, Semaine ou Mois."
          data={filteredTransactions}
          columns={txColumns}
          periodFilter={true}
          dateAccessor={(tx) => tx.date}
          searchable={true}
          searchPlaceholder="Rechercher par catégorie, référence, notes..."
          searchAccessor={(tx) => `${tx.category} ${tx.reference || ""} ${tx.notes || ""}`}
          pageSize={15}
          initialSort={{ key: "date", direction: "desc" }}
          isLoading={isLoading}
          secondaryFilter={
            <div className="flex items-center gap-1 rounded-xl bg-surface-muted p-1 border border-border/60">
              {[
                { label: "Toutes", value: "ALL" },
                { label: "Recettes", value: "INCOME" },
                { label: "Dépenses", value: "EXPENSE" },
              ].map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setFilterType(tab.value)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                    filterType === tab.value
                      ? "bg-primary text-white shadow-xs"
                      : "text-muted hover:text-foreground hover:bg-surface/50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          }
          emptyState={{
            icon: <Wallet className="h-6 w-6 text-primary" />,
            title: "Aucune transaction trouvée",
            description: "Enregistrez une vente d'œufs ou un achat d'aliment pour débuter le suivi financier.",
            actionLabel: hasPermission("finance:create") ? "Enregistrer une opération" : undefined,
            onAction: () => setModalOpen(true),
          }}
        />
      </div>

      {/* TRANSACTION MODAL */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nouvelle transaction de trésorerie"
        description="Enregistrez une entrée ou sortie de fonds avec le mode de paiement."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setType("INCOME");
                setCategory("Vente Oeufs");
              }}
              className={`rounded-xl border py-2.5 text-xs font-bold ${
                type === "INCOME"
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-surface text-muted"
              }`}
            >
              + Recette / Vente
            </button>
            <button
              type="button"
              onClick={() => {
                setType("EXPENSE");
                setCategory("Alimentation");
              }}
              className={`rounded-xl border py-2.5 text-xs font-bold ${
                type === "EXPENSE"
                  ? "border-danger bg-danger text-white"
                  : "border-border bg-surface text-muted"
              }`}
            >
              - Dépense / Achat
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Montant en FCFA
              </label>
              <input
                type="number"
                min="1"
                required
                value={amountFcfa}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const val = e.target.value;
                  setAmountFcfa(val === "" ? "" : Math.max(0, parseInt(val) || 0));
                }}
                placeholder="0"
                className="w-full rounded-xl border border-border bg-surface p-2.5 text-sm font-bold font-mono text-foreground focus:border-primary focus:outline-hidden"
              />
              <div className="mt-1 text-[11px] text-muted font-mono">
                {formatFcfa(Number(amountFcfa) || 0)}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Date de l'opération
              </label>
              <input
                type="date"
                required
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Catégorie
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-hidden"
              >
                {type === "INCOME" ? (
                  <>
                    <option value="Vente Oeufs">Vente Œufs</option>
                    <option value="Vente Poulets Vifs">Vente Poulets Vifs</option>
                    <option value="Vente Fiente / Engrais">Vente Fiente / Engrais</option>
                    <option value="Autre Recette">Autre Recette</option>
                  </>
                ) : (
                  <>
                    <option value="Alimentation">Alimentation</option>
                    <option value="Vaccins & Soins">Vaccins & Soins</option>
                    <option value="Poussins / Achat Sujets">Achat Poussins / Sujets</option>
                    <option value="Main d'oeuvre">Main d'œuvre / Salaires</option>
                    <option value="Carburant & Electricite">Énergie / Carburant / Eau</option>
                    <option value="Materiel & Entretien">Matériel & Entretien</option>
                    <option value="Autre Depense">Autre Dépense</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Moyen de paiement
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-hidden"
              >
                <option value="MTN_MOMO">MTN Mobile Money</option>
                <option value="MOOV_MONEY">Moov Money</option>
                <option value="CELTIIS_CASH">Celtiis Cash</option>
                <option value="CASH">Espèces</option>
                <option value="BANK_TRANSFER">Virement Bancaire</option>
                <option value="CHECK">Chèque</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Libellé / Tiers / Justificatif
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ex. Facture N° 1045 - Société Avicole du Sud"
              className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted hover:bg-surface-hover"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-hover"
            >
              {submitting ? "Enregistrement..." : "Valider l'opération"}
            </button>
          </div>
        </form>
      </Modal>
    </Shell>
  );
}
