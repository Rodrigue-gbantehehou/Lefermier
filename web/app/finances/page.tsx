"use client";

import React, { useEffect, useState } from "react";
import {
  Plus,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Download,
  Printer,
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { api } from "@/lib/api-client";
import {
  Transaction,
  TransactionType,
  PaymentMethod,
  Contact,
  PaymentStatus,
} from "@/lib/types";
import { formatFcfa, formatDate } from "@/lib/utils";
import { exportTransactionsToCsv } from "@/lib/export";
import { SalesReceiptModal } from "@/components/finances/sales-receipt-modal";
import { ModuleLockedState } from "@/components/ui/module-locked-state";

export default function FinancesPage() {
  const { activeFarm, hasPermission, hasModule } = useAuth();
  const { toast } = useToast();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(true);

  // New Transaction Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [type, setType] = useState<TransactionType>("INCOME");
  const [amountFcfa, setAmountFcfa] = useState<number | string>(0);
  const [category, setCategory] = useState("Vente Oeufs");
  const [customCategory, setCustomCategory] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("MTN_MOMO");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [txDate, setTxDate] = useState("");

  // Credit / Partial Payment State
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("PAID");
  const [paidAmount, setPaidAmount] = useState<number | string>("");
  const [dueDate, setDueDate] = useState<string>("");

  // Sales Receipt Modal
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedTxForReceipt, setSelectedTxForReceipt] = useState<Transaction | null>(null);

  useEffect(() => {
    setTxDate(new Date().toISOString().split("T")[0]);
  }, []);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (activeFarm?.id && hasModule("finance")) {
      loadTransactions();
    } else {
      setIsLoading(false);
    }
  }, [activeFarm?.id]);

  async function loadTransactions() {
    setIsLoading(true);
    try {
      const [txData, contactsData] = await Promise.all([
        api.finance.listTransactions({ farmId: activeFarm?.id }),
        activeFarm?.id ? api.contacts.list({ farmId: activeFarm.id, onlyActive: true }).catch(() => []) : Promise.resolve([]),
      ]);
      setTransactions(txData);
      setContacts(contactsData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeFarm?.id) return;
    setFormError(null);
    setSubmitting(true);
    try {
      await api.finance.createTransaction({
        farmId: activeFarm.id,
        type,
        amountFcfa: Number(amountFcfa),
        category,
        customCategory: (category === "Autre Recette" || category === "Autre Depense") ? customCategory.trim() : undefined,
        paymentMethod,
        reference: reference || undefined,
        notes: notes || undefined,
        contactId: selectedContactId || undefined,
        date: txDate,
        paymentStatus: type === "INCOME" ? paymentStatus : "PAID",
        paidAmount: type === "INCOME" && paymentStatus === "PARTIAL" ? Number(paidAmount) || 0 : undefined,
        dueDate: type === "INCOME" && paymentStatus !== "PAID" ? (dueDate || undefined) : undefined,
      });
      setModalOpen(false);
      setAmountFcfa(0);
      setCustomCategory("");
      setReference("");
      setNotes("");
      setSelectedContactId("");
      setPaymentStatus("PAID");
      setPaidAmount("");
      setDueDate("");
      toast.success(
        type === "INCOME"
          ? "Recette enregistrée avec succès !"
          : "Dépense enregistrée avec succès !"
      );
      await loadTransactions();
    } catch (err: any) {
      const msg = err?.message || "Erreur lors de la création de la transaction";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const totalIncome = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + (t.paidAmount !== undefined && t.paymentStatus !== "PAID" ? t.paidAmount : t.amountFcfa), 0);

  const totalExpense = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + t.amountFcfa, 0);

  const netBalance = totalIncome - totalExpense;

  const totalReceivables = transactions
    .filter((t) => t.type === "INCOME" && (t.paymentStatus === "PARTIAL" || t.paymentStatus === "UNPAID"))
    .reduce((sum, t) => {
      if (t.remainingAmount !== undefined) return sum + t.remainingAmount;
      const paid = t.paidAmount ?? 0;
      return sum + Math.max(0, t.amountFcfa - paid);
    }, 0);

  const filteredTransactions = transactions.filter((t) => {
    if (filterType === "ALL") return true;
    if (filterType === "CREDIT") {
      return t.type === "INCOME" && (t.paymentStatus === "PARTIAL" || t.paymentStatus === "UNPAID");
    }
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
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${isIncome ? "text-success" : "text-danger"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isIncome ? "bg-success" : "bg-danger"}`} />
            {isIncome ? "Recette" : "Dépense"}
          </span>
        );
      },
    },
    {
      key: "paymentMethod",
      header: "Moyen de Paiement",
      sortable: true,
      cell: (tx) => {
        const method = paymentMethodLabels[tx.paymentMethod] || {
          label: tx.paymentMethod,
        };
        return (
          <span className="text-xs font-medium text-muted">
            {method.label}
          </span>
        );
      },
    },
    {
      key: "reference",
      header: "Tiers & Référence",
      sortable: true,
      cell: (tx) => (
        <div className="flex flex-col text-xs">
          {tx.contact?.name ? (
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${tx.contact.type === "CLIENT" ? "bg-success" : "bg-info"}`} />
              {tx.contact.name}
            </span>
          ) : (
            <span className="text-muted italic">Sans tiers</span>
          )}
          {(tx.notes || tx.reference) && (
            <span className="text-muted truncate max-w-[200px]">{tx.notes || tx.reference}</span>
          )}
        </div>
      ),
    },
    {
      key: "paymentStatus",
      header: "Règlement & Échéance",
      sortable: true,
      cell: (tx) => {
        if (tx.type !== "INCOME") return <span className="text-muted text-xs">—</span>;
        const status = tx.paymentStatus || "PAID";
        if (status === "PAID") {
          return (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="h-3 w-3" /> Réglé
            </span>
          );
        }
        if (status === "PARTIAL") {
          const remaining = tx.remainingAmount ?? (tx.amountFcfa - (tx.paidAmount ?? 0));
          return (
            <div className="flex flex-col">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-warning bg-warning/10 px-2 py-0.5 rounded-full w-fit">
                <Clock className="h-3 w-3" /> Acompte
              </span>
              <span className="text-[10px] text-muted mt-0.5">
                Reste : <strong className="text-foreground">{formatFcfa(remaining)}</strong>
              </span>
              {tx.dueDate && (
                <span className={`text-[10px] ${tx.isOverdue ? "text-danger font-bold" : "text-muted"}`}>
                  Éch. : {formatDate(tx.dueDate)}
                </span>
              )}
            </div>
          );
        }
        return (
          <div className="flex flex-col">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-danger bg-danger/10 px-2 py-0.5 rounded-full w-fit">
              <AlertTriangle className="h-3 w-3" /> Non réglé
            </span>
            {tx.dueDate && (
              <span className={`text-[10px] ${tx.isOverdue ? "text-danger font-bold" : "text-muted"} mt-0.5`}>
                Éch. : {formatDate(tx.dueDate)}
              </span>
            )}
          </div>
        );
      },
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
          <div className="flex flex-col items-end">
            <span
              className={`font-mono font-bold text-sm ${
                isIncome ? "text-success" : "text-danger"
              }`}
            >
              {isIncome ? "+" : "-"} {formatFcfa(tx.amountFcfa)}
            </span>
            {isIncome && tx.paymentStatus === "PARTIAL" && tx.paidAmount !== undefined && (
              <span className="text-[10px] text-muted font-mono">
                Reçu : {formatFcfa(tx.paidAmount)}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (tx) => {
        if (tx.type !== "INCOME") return null;
        if (!hasModule("sales_receipts")) {
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toast.info("L'édition et impression de reçus officiels avec IFU est disponible à partir de la formule Standard.");
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-border/50 bg-surface-muted/50 px-2 py-1 text-[11px] font-semibold text-muted hover:text-foreground transition-colors"
              title="Disponible à partir de la formule Standard"
            >
              <Lock className="h-3 w-3" />
              <span>Reçu</span>
            </button>
          );
        }
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTxForReceipt(tx);
              setReceiptModalOpen(true);
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-surface-hover hover:text-primary transition-colors"
            title="Imprimer le reçu de vente officiel"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Reçu</span>
          </button>
        );
      },
    },
  ];

  if (!hasModule("finance")) {
    return (
      <Shell>
        <ModuleLockedState
          moduleName="Trésorerie & Ventes"
          description="Le suivi de la trésorerie, des ventes et des dépenses n'est pas inclus dans votre formule actuelle."
        />
      </Shell>
    );
  }

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

        <div className="flex items-center gap-2">
          {hasModule("reports_accounting") ? (
            <button
              type="button"
              onClick={() => exportTransactionsToCsv(transactions, activeFarm?.name || "ferme")}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground hover:bg-surface-hover transition-colors"
            >
              <Download className="h-4 w-4 text-muted" />
              <span>Exporter CSV</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => toast.info("L'export comptable complet SYSCOHADA (CSV/PDF) est disponible à partir de la formule Professionnel.")}
              className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-surface-muted/50 px-3 py-2 text-xs font-semibold text-muted hover:text-foreground transition-colors"
              title="Disponible à partir de la formule Professionnel"
            >
              <Lock className="h-3.5 w-3.5 text-muted" />
              <span>Exporter CSV</span>
            </button>
          )}

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
      </div>

      {/* KPI Cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <StatCard
          title="Créances clients"
          value={formatFcfa(totalReceivables)}
          subtitle="Solde impayé des ventes à crédit / acompte"
          accent={totalReceivables > 0 ? "amber" : "zinc"}
          icon={<Clock className="h-5 w-5 text-warning" />}
          trend={{
            value: totalReceivables > 0 ? "À encaisser" : "Aucun impayé",
            isPositive: totalReceivables === 0,
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
                { label: "Créances & Impayés", value: "CREDIT" },
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
        description="Enregistrez une entrée ou sortie de fonds avec le mode de paiement et suivi du règlement."
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
                {type === "INCOME" ? "Montant total de la vente" : "Montant en FCFA"}
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

          {/* Payment Status (for sales / receivables tracking) */}
          {type === "INCOME" && (
            <div className="rounded-xl border border-border/80 bg-surface-muted/50 p-3 space-y-3">
              <label className="block text-xs font-semibold text-foreground">
                Modalité de règlement client
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentStatus("PAID")}
                  className={`rounded-lg border px-2 py-1.5 text-xs font-semibold transition-all ${
                    paymentStatus === "PAID"
                      ? "border-success bg-success/15 text-success font-bold"
                      : "border-border bg-surface text-muted"
                  }`}
                >
                  ✓ Réglé 100%
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentStatus("PARTIAL");
                    if (!paidAmount && amountFcfa) {
                      setPaidAmount(Math.round(Number(amountFcfa) / 2));
                    }
                  }}
                  className={`rounded-lg border px-2 py-1.5 text-xs font-semibold transition-all ${
                    paymentStatus === "PARTIAL"
                      ? "border-warning bg-warning/15 text-warning font-bold"
                      : "border-border bg-surface text-muted"
                  }`}
                >
                  ⏳ Acompte
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentStatus("UNPAID");
                    setPaidAmount(0);
                  }}
                  className={`rounded-lg border px-2 py-1.5 text-xs font-semibold transition-all ${
                    paymentStatus === "UNPAID"
                      ? "border-danger bg-danger/15 text-danger font-bold"
                      : "border-border bg-surface text-muted"
                  }`}
                >
                  ⚠ À crédit
                </button>
              </div>

              {paymentStatus === "PARTIAL" && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-foreground mb-1">
                      Acompte encaissé (FCFA)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={Number(amountFcfa) || undefined}
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      placeholder="Montant perçu"
                      required
                      className="w-full rounded-lg border border-border bg-surface p-2 text-xs font-mono font-bold text-foreground focus:border-primary focus:outline-hidden"
                    />
                    <div className="mt-1 text-[10px] text-muted">
                      Reste dû : <strong className="text-foreground">{formatFcfa(Math.max(0, (Number(amountFcfa) || 0) - (Number(paidAmount) || 0)))}</strong>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-foreground mb-1">
                      Date d'échéance du solde
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full rounded-lg border border-border bg-surface p-2 text-xs text-foreground focus:border-primary focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              {paymentStatus === "UNPAID" && (
                <div className="pt-1">
                  <label className="block text-[11px] font-semibold text-foreground mb-1">
                    Date d'échéance convenue (Règlement total attendu)
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface p-2 text-xs text-foreground focus:border-primary focus:outline-hidden"
                  />
                  <p className="mt-1 text-[10px] text-danger">
                    La totalité ({formatFcfa(Number(amountFcfa) || 0)}) sera inscrite dans les créances clients à recouvrer.
                  </p>
                </div>
              )}
            </div>
          )}

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

              {(category === "Autre Recette" || category === "Autre Depense") && (
                <div className="mt-2">
                  <input
                    type="text"
                    required
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Précisez la catégorie (ex. Subvention, Vente sacs...)"
                    className="w-full rounded-xl border border-border bg-surface p-2 text-xs text-foreground focus:border-primary focus:outline-hidden"
                  />
                </div>
              )}
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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-foreground">
                Tiers associé ({type === "INCOME" ? "Client / Revendeuse" : "Fournisseur"})
              </label>
              <a
                href="/contacts"
                target="_blank"
                className="text-[11px] font-semibold text-primary hover:underline"
              >
                + Gérer les contacts
              </a>
            </div>
            <select
              value={selectedContactId}
              onChange={(e) => setSelectedContactId(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-hidden"
            >
              <option value="">-- Aucun tiers associé (Vente directe / Comptoir) --</option>
              {contacts
                .filter((c) =>
                  type === "INCOME"
                    ? c.type === "CLIENT" || c.type === "BOTH"
                    : c.type === "SUPPLIER" || c.type === "BOTH"
                )
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.city ? `(${c.city})` : ""} {c.phone ? `• ${c.phone}` : ""}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Libellé / Description / N° Reçu
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ex. Reçu N° 1045, Acompte 50 plateaux"
              className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
            />
          </div>

          {formError && (
            <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{formError}</div>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setModalOpen(false);
                setFormError(null);
              }}
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

      {/* SALES RECEIPT MODAL */}
      <SalesReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => {
          setReceiptModalOpen(false);
          setSelectedTxForReceipt(null);
        }}
        transaction={selectedTxForReceipt}
        farm={activeFarm}
      />
    </Shell>
  );
}
