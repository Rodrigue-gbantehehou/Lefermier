import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/theme_provider.dart';
import '../../core/utils/currency_formatter.dart';
import '../../core/design_system/app_shimmer.dart';
import '../../core/design_system/app_empty_state.dart';
import 'finance_provider.dart';
import 'record_transaction_modal.dart';
import 'sales_receipt_modal.dart';

class FinancesScreen extends ConsumerStatefulWidget {
  final VoidCallback? onBack;
  final VoidCallback? onOpenMenu;
  const FinancesScreen({super.key, this.onBack, this.onOpenMenu});

  @override
  ConsumerState<FinancesScreen> createState() => _FinancesScreenState();
}

class _FinancesScreenState extends ConsumerState<FinancesScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(financeProvider.notifier).loadTransactions(showLoading: false);
    });
  }

  void _openRecordTransactionDialog([String initialType = "INCOME"]) {
    RecordTransactionModal.show(context, initialType: initialType);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final financeState = ref.watch(financeProvider);
    final summary = financeState.summary;

    final filteredTx = financeState.transactions.where((t) {
      if (financeState.filterType == null) return true;
      return t.type == financeState.filterType;
    }).toList();

    return Scaffold(
      appBar: AppBar(
        leading: widget.onBack != null
            ? IconButton(
                icon: const Icon(Icons.arrow_back_rounded),
                tooltip: "Retour",
                onPressed: widget.onBack,
              )
            : IconButton(
                icon: const Icon(Icons.menu_rounded),
                tooltip: "Menu",
                onPressed: widget.onOpenMenu ?? () => Scaffold.of(context).openDrawer(),
              ),
        title: const Text("Caisse & Finances"),
        actions: [
          IconButton(
            icon: Icon(
              isDark ? Icons.light_mode_rounded : Icons.dark_mode_rounded,
              color: isDark ? AppColors.accent : Colors.white,
              size: 20,
            ),
            tooltip: isDark ? "Activer le mode clair" : "Activer le mode sombre",
            onPressed: () => ref.read(themeModeProvider.notifier).toggleTheme(context),
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Colors.white),
            tooltip: "Actualiser",
            onPressed: () => ref.read(financeProvider.notifier).loadTransactions(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'fab_finances',
        onPressed: () => _openRecordTransactionDialog("INCOME"),
        backgroundColor: AppColors.success,
        icon: const Icon(Icons.add_rounded, color: Colors.white),
        label: const Text("Encaissement", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(financeProvider.notifier).loadTransactions(showLoading: false),
        child: financeState.isLoading
            ? SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 90),
                child: Column(
                  children: List.generate(5, (_) => AppShimmer.transactionRow()),
                ),
              )
            : SingleChildScrollView(
                physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 90),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // En-tête Caisse & Finances (Léger & Aéré)
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                "SOLDE DISPONIBLE",
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 0.8,
                                  color: AppColors.textMutedLight,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                "${summary.netBalance >= 0 ? '+' : ''}${CurrencyFormatter.formatFcfa(summary.netBalance)}",
                                style: TextStyle(
                                  fontSize: 26,
                                  fontWeight: FontWeight.w900,
                                  fontFamily: 'monospace',
                                  color: summary.netBalance >= 0 ? AppColors.success : AppColors.danger,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  Text(
                                    "+${CurrencyFormatter.formatFcfa(summary.totalIncome)}",
                                    style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.success,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  const Text("•", style: TextStyle(color: AppColors.textMutedLight)),
                                  const SizedBox(width: 8),
                                  Text(
                                    "-${CurrencyFormatter.formatFcfa(summary.totalExpense)}",
                                    style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.danger,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        OutlinedButton.icon(
                          onPressed: () => _openRecordTransactionDialog("EXPENSE"),
                          icon: const Icon(Icons.remove_rounded, size: 16),
                          label: const Text("Dépense", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColors.danger,
                            side: BorderSide(color: AppColors.danger.withValues(alpha: 0.4)),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Filtre segmenté mobile 3 boutons
                    Container(
                      decoration: BoxDecoration(
                        color: isDark ? Colors.grey.shade900 : Colors.grey.shade200,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      padding: const EdgeInsets.all(4),
                      child: Row(
                        children: [
                          Expanded(
                            child: InkWell(
                              onTap: () => ref.read(financeProvider.notifier).setFilterType(null),
                              borderRadius: BorderRadius.circular(10),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 8),
                                decoration: BoxDecoration(
                                  color: financeState.filterType == null
                                      ? (isDark ? AppColors.surfaceDark : Colors.white)
                                      : Colors.transparent,
                                  borderRadius: BorderRadius.circular(10),
                                  boxShadow: financeState.filterType == null
                                      ? [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4)]
                                      : null,
                                ),
                                alignment: Alignment.center,
                                child: Text(
                                  "Toutes",
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: financeState.filterType == null ? FontWeight.bold : FontWeight.w500,
                                    color: financeState.filterType == null
                                        ? AppColors.primary
                                        : AppColors.textMutedLight,
                                  ),
                                ),
                              ),
                            ),
                          ),
                          Expanded(
                            child: InkWell(
                              onTap: () => ref.read(financeProvider.notifier).setFilterType("INCOME"),
                              borderRadius: BorderRadius.circular(10),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 8),
                                decoration: BoxDecoration(
                                  color: financeState.filterType == "INCOME"
                                      ? (isDark ? AppColors.surfaceDark : Colors.white)
                                      : Colors.transparent,
                                  borderRadius: BorderRadius.circular(10),
                                  boxShadow: financeState.filterType == "INCOME"
                                      ? [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4)]
                                      : null,
                                ),
                                alignment: Alignment.center,
                                child: Text(
                                  "Recettes (+)",
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: financeState.filterType == "INCOME" ? FontWeight.bold : FontWeight.w500,
                                    color: financeState.filterType == "INCOME"
                                        ? AppColors.success
                                        : AppColors.textMutedLight,
                                  ),
                                ),
                              ),
                            ),
                          ),
                          Expanded(
                            child: InkWell(
                              onTap: () => ref.read(financeProvider.notifier).setFilterType("EXPENSE"),
                              borderRadius: BorderRadius.circular(10),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 8),
                                decoration: BoxDecoration(
                                  color: financeState.filterType == "EXPENSE"
                                      ? (isDark ? AppColors.surfaceDark : Colors.white)
                                      : Colors.transparent,
                                  borderRadius: BorderRadius.circular(10),
                                  boxShadow: financeState.filterType == "EXPENSE"
                                      ? [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4)]
                                      : null,
                                ),
                                alignment: Alignment.center,
                                child: Text(
                                  "Dépenses (-)",
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: financeState.filterType == "EXPENSE" ? FontWeight.bold : FontWeight.w500,
                                    color: financeState.filterType == "EXPENSE"
                                        ? AppColors.danger
                                        : AppColors.textMutedLight,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Titre Liste
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          "Journal de caisse",
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        Text(
                          "${filteredTx.length} opération(s)",
                          style: const TextStyle(fontSize: 12, color: AppColors.textMutedLight),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),

                    // Liste ou état vide
                    if (filteredTx.isEmpty)
                      AppEmptyState(
                        icon: Icons.account_balance_wallet_outlined,
                        title: "Aucune transaction enregistrée",
                        description: "Enregistrez vos premières ventes ou dépenses pour suivre votre rentabilité en direct.",
                        actionLabel: "Encaisser une vente",
                        onAction: () => _openRecordTransactionDialog("INCOME"),
                      )
                    else
                      ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: filteredTx.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (context, index) {
                          final tx = filteredTx[index];

                          return Card(
                            child: ListTile(
                              onTap: tx.isIncome ? () => SalesReceiptModal.show(context, transaction: tx) : null,
                              leading: CircleAvatar(
                                backgroundColor: tx.isIncome
                                    ? AppColors.success.withValues(alpha: 0.12)
                                    : AppColors.danger.withValues(alpha: 0.12),
                                child: Icon(
                                  tx.isIncome ? Icons.add_rounded : Icons.remove_rounded,
                                  color: tx.isIncome ? AppColors.success : AppColors.danger,
                                ),
                              ),
                              title: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Text(
                                      tx.note ?? tx.categoryLabel,
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  Text(
                                    "${tx.isIncome ? '+' : '-'}${CurrencyFormatter.formatFcfa(tx.amount)}",
                                    style: TextStyle(
                                      fontWeight: FontWeight.w900,
                                      fontSize: 14,
                                      fontFamily: 'monospace',
                                      color: tx.isIncome ? AppColors.success : AppColors.danger,
                                    ),
                                  ),
                                ],
                              ),
                              subtitle: Padding(
                                padding: const EdgeInsets.only(top: 4),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Expanded(
                                          child: Text(
                                            "${tx.categoryLabel} • ${tx.paymentMethodLabel}",
                                            style: const TextStyle(fontSize: 11, color: AppColors.textMutedLight),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                        Text(
                                          tx.date,
                                          style: const TextStyle(fontSize: 10, color: AppColors.textMutedLight),
                                        ),
                                      ],
                                    ),
                                    if (!tx.isPaid) ...[
                                      const SizedBox(height: 4),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: tx.isPartial
                                              ? AppColors.warning.withValues(alpha: 0.15)
                                              : AppColors.danger.withValues(alpha: 0.15),
                                          borderRadius: BorderRadius.circular(4),
                                          border: Border.all(
                                            color: tx.isPartial
                                                ? AppColors.warning.withValues(alpha: 0.5)
                                                : AppColors.danger.withValues(alpha: 0.5),
                                            width: 0.8,
                                          ),
                                        ),
                                        child: Text(
                                          "${tx.paymentStatusLabel} • Reste: ${CurrencyFormatter.formatFcfa(tx.remainingAmount)}",
                                          style: TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.bold,
                                            color: tx.isPartial ? AppColors.warning : AppColors.danger,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                  ],
                ),
              ),
      ),
    );
  }
}
