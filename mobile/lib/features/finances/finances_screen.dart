import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/theme_provider.dart';
import '../../core/utils/currency_formatter.dart';
import '../../core/widgets/brand_loader.dart';
import 'finance_provider.dart';

class FinancesScreen extends ConsumerStatefulWidget {
  final VoidCallback? onBack;
  final VoidCallback? onOpenMenu;
  const FinancesScreen({super.key, this.onBack, this.onOpenMenu});

  @override
  ConsumerState<FinancesScreen> createState() => _FinancesScreenState();
}

class _FinancesScreenState extends ConsumerState<FinancesScreen> {
  void _openRecordTransactionDialog([String initialType = "INCOME"]) {
    String type = initialType; // 'INCOME' ou 'EXPENSE'
    String category = type == "INCOME" ? "EGG_SALE" : "FEED_PURCHASE";
    String paymentMethod = "CASH";
    final amountController = TextEditingController();
    final descController = TextEditingController();
    DateTime txDate = DateTime.now();

    final incomeCategories = [
      {"code": "EGG_SALE", "label": "Vente d'œufs"},
      {"code": "MEAT_POULTRY_SALE", "label": "Vente poulets de chair"},
      {"code": "LAYER_CULL_SALE", "label": "Vente réformes"},
      {"code": "CHICK_SALE", "label": "Vente poussins"},
      {"code": "MANURE_SALE", "label": "Vente fiente / fumier"},
      {"code": "OTHER_INCOME", "label": "Autre encaissement"},
    ];

    final expenseCategories = [
      {"code": "FEED_PURCHASE", "label": "Achat aliment"},
      {"code": "CHICK_PURCHASE", "label": "Achat poussins"},
      {"code": "MEDICATION_VACCINE", "label": "Santé, vaccins & véto"},
      {"code": "EQUIPMENT_LITTER", "label": "Litière / copeaux / matériel"},
      {"code": "SALARY_LABOR", "label": "Salaires & journaliers"},
      {"code": "UTILITIES", "label": "Électricité / Eau"},
      {"code": "TRANSPORT", "label": "Transport & livraison"},
      {"code": "OTHER_EXPENSE", "label": "Autre charge"},
    ];

    final paymentMethods = [
      {"code": "CASH", "label": "Espèces / Cash"},
      {"code": "MTN_MOMO", "label": "MTN Mobile Money"},
      {"code": "MOOV_MONEY", "label": "Moov Money"},
      {"code": "CELTIIS_CASH", "label": "Celtiis Cash"},
      {"code": "BANK_TRANSFER", "label": "Virement bancaire"},
    ];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          final isDark = Theme.of(ctx).brightness == Brightness.dark;
          final surfaceColor = isDark ? AppColors.surfaceDark : AppColors.surfaceLight;
          final borderColor = isDark ? AppColors.borderDark : AppColors.borderLight;
          final financeState = ref.watch(financeProvider);

          final currentCategories = type == "INCOME" ? incomeCategories : expenseCategories;

          return Container(
            decoration: BoxDecoration(
              color: surfaceColor,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
              border: Border.all(color: borderColor),
            ),
            padding: EdgeInsets.fromLTRB(
              20,
              12,
              20,
              MediaQuery.of(ctx).viewInsets.bottom + MediaQuery.of(ctx).padding.bottom + 20,
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.borderDark : AppColors.borderLight,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        type == "INCOME" ? "Nouvel Encaissement" : "Nouvelle Dépense",
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Bascule Recette / Dépense
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
                            onTap: () => setModalState(() {
                              type = "INCOME";
                              category = "EGG_SALE";
                            }),
                            borderRadius: BorderRadius.circular(10),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              decoration: BoxDecoration(
                                color: type == "INCOME" ? AppColors.success : Colors.transparent,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                "+ Recette / Vente",
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                  color: type == "INCOME" ? Colors.white : AppColors.textMutedLight,
                                ),
                              ),
                            ),
                          ),
                        ),
                        Expanded(
                          child: InkWell(
                            onTap: () => setModalState(() {
                              type = "EXPENSE";
                              category = "FEED_PURCHASE";
                            }),
                            borderRadius: BorderRadius.circular(10),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              decoration: BoxDecoration(
                                color: type == "EXPENSE" ? AppColors.danger : Colors.transparent,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                "- Dépense / Achat",
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                  color: type == "EXPENSE" ? Colors.white : AppColors.textMutedLight,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Montant en FCFA
                  TextField(
                    controller: amountController,
                    keyboardType: TextInputType.number,
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                    decoration: InputDecoration(
                      labelText: "Montant (FCFA) *",
                      hintText: "Ex: 25000",
                      suffixText: "FCFA",
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Boutons de raccourcis de montants
                  Row(
                    children: [
                      _AmountShortcutBtn(
                        label: "+5 000",
                        onTap: () {
                          final current = int.tryParse(amountController.text) ?? 0;
                          setModalState(() => amountController.text = "${current + 5000}");
                        },
                      ),
                      const SizedBox(width: 6),
                      _AmountShortcutBtn(
                        label: "+10 000",
                        onTap: () {
                          final current = int.tryParse(amountController.text) ?? 0;
                          setModalState(() => amountController.text = "${current + 10000}");
                        },
                      ),
                      const SizedBox(width: 6),
                      _AmountShortcutBtn(
                        label: "+25 000",
                        onTap: () {
                          final current = int.tryParse(amountController.text) ?? 0;
                          setModalState(() => amountController.text = "${current + 25000}");
                        },
                      ),
                      const SizedBox(width: 6),
                      _AmountShortcutBtn(
                        label: "+50 000",
                        onTap: () {
                          final current = int.tryParse(amountController.text) ?? 0;
                          setModalState(() => amountController.text = "${current + 50000}");
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Catégorie
                  const Text("Catégorie *", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: isDark ? Colors.grey.shade900 : Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: borderColor),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: currentCategories.any((c) => c['code'] == category)
                            ? category
                            : currentCategories.first['code'],
                        isExpanded: true,
                        items: currentCategories.map((c) {
                          return DropdownMenuItem<String>(
                            value: c['code'],
                            child: Text(c['label']!, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                          );
                        }).toList(),
                        onChanged: (val) {
                          if (val != null) {
                            setModalState(() => category = val);
                          }
                        },
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Mode de paiement
                  const Text("Mode de règlement *", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: isDark ? Colors.grey.shade900 : Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: borderColor),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: paymentMethod,
                        isExpanded: true,
                        items: paymentMethods.map((m) {
                          return DropdownMenuItem<String>(
                            value: m['code'],
                            child: Text(m['label']!, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                          );
                        }).toList(),
                        onChanged: (val) {
                          if (val != null) {
                            setModalState(() => paymentMethod = val);
                          }
                        },
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Description
                  TextField(
                    controller: descController,
                    decoration: InputDecoration(
                      labelText: "Note / Description (optionnel)",
                      hintText: "Ex: Vente 15 plateaux - Client Kossi, Achat 2 sacs provende...",
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      contentPadding: const EdgeInsets.all(12),
                    ),
                  ),
                  const SizedBox(height: 18),

                  // Boutons d'action
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => Navigator.pop(ctx),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: const Text("Annuler"),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: !financeState.isSubmitting
                              ? () async {
                                  final amount = int.tryParse(amountController.text.trim()) ?? 0;
                                  if (amount <= 0) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(
                                        content: Text("Veuillez saisir un montant valide en FCFA supérieur à 0."),
                                        backgroundColor: AppColors.danger,
                                      ),
                                    );
                                    return;
                                  }

                                  final messenger = ScaffoldMessenger.of(context);
                                  final navigator = Navigator.of(ctx);

                                  final success = await ref.read(financeProvider.notifier).recordTransaction(
                                    type: type,
                                    category: category,
                                    amount: amount,
                                    date: txDate,
                                    paymentMethod: paymentMethod,
                                    description: descController.text,
                                  );

                                  if (ctx.mounted) {
                                    if (success) {
                                      navigator.pop();
                                      messenger.showSnackBar(
                                        SnackBar(
                                          content: Text("Opération de ${CurrencyFormatter.formatFcfa(amount)} enregistrée"),
                                          backgroundColor: AppColors.success,
                                        ),
                                      );
                                    } else {
                                      final err = ref.read(financeProvider).error ?? "Une erreur est survenue.";
                                      messenger.showSnackBar(
                                        SnackBar(content: Text(err), backgroundColor: AppColors.danger),
                                      );
                                    }
                                  }
                                }
                              : null,
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            backgroundColor: type == "INCOME" ? AppColors.success : AppColors.danger,
                            foregroundColor: Colors.white,
                          ),
                          child: financeState.isSubmitting
                              ? const BrandLoader.button()
                              : Text(type == "INCOME" ? "Encaisser" : "Décaisser"),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
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
            ? const Center(child: BrandLoader(message: "Chargement de la caisse..."))
            : SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
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
                      Container(
                        padding: const EdgeInsets.all(28),
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: isDark ? AppColors.borderDark : AppColors.borderLight,
                          ),
                        ),
                        child: Column(
                          children: [
                            Icon(Icons.account_balance_wallet_outlined, size: 48, color: AppColors.success.withValues(alpha: 0.6)),
                            const SizedBox(height: 12),
                            const Text(
                              "Aucune transaction enregistrée",
                              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 6),
                            const Text(
                              "Enregistrez vos premières ventes ou dépenses pour suivre votre rentabilité en direct.",
                              textAlign: TextAlign.center,
                              style: TextStyle(fontSize: 12, color: AppColors.textMutedLight),
                            ),
                            const SizedBox(height: 16),
                            ElevatedButton.icon(
                              onPressed: () => _openRecordTransactionDialog("INCOME"),
                              icon: const Icon(Icons.add, size: 18),
                              label: const Text("Encaisser une vente"),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.success,
                                foregroundColor: Colors.white,
                              ),
                            ),
                          ],
                        ),
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
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      "${tx.categoryLabel} • ${tx.paymentMethodLabel}",
                                      style: const TextStyle(fontSize: 11, color: AppColors.textMutedLight),
                                    ),
                                    Text(
                                      tx.date,
                                      style: const TextStyle(fontSize: 10, color: AppColors.textMutedLight),
                                    ),
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


class _AmountShortcutBtn extends StatelessWidget {
  final String label;
  final VoidCallback onTap;

  const _AmountShortcutBtn({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 6),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : Colors.white,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: AppColors.primary.withValues(alpha: 0.25)),
          ),
          child: Text(
            label,
            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.primary),
          ),
        ),
      ),
    );
  }
}
