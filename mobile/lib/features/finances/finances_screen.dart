import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/theme_provider.dart';
import '../../core/utils/currency_formatter.dart';
import '../../core/models/transaction.dart';

class FinancesScreen extends StatelessWidget {
  const FinancesScreen({super.key});

  final List<Transaction> _transactions = const [
    Transaction(
      id: "tx-1",
      type: "INCOME",
      amount: 25000,
      date: "Aujourd'hui",
      category: "EGGS",
      paymentMethod: "MTN_MOMO",
      note: "Vente 12 plateaux - Dame Adjoua",
    ),
    Transaction(
      id: "tx-2",
      type: "EXPENSE",
      amount: 18500,
      date: "Hier",
      category: "FEED",
      paymentMethod: "CASH",
      note: "Achat 1 sac aliment ponte 50kg",
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Caisse & Finances"),
        actions: [
          Consumer(
            builder: (context, ref, _) {
              final isDark = Theme.of(context).brightness == Brightness.dark;
              return IconButton(
                icon: Icon(
                  isDark ? Icons.light_mode_rounded : Icons.dark_mode_rounded,
                  color: isDark ? Colors.amber : null,
                  size: 20,
                ),
                tooltip: isDark ? "Activer le mode clair" : "Activer le mode sombre",
                onPressed: () => ref.read(themeModeProvider.notifier).toggleTheme(context),
              );
            },
          ),
        ],
      ),
      body: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
        itemCount: _transactions.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (context, index) {
          final tx = _transactions[index];

          return Card(
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: tx.isIncome ? AppColors.success.withValues(alpha: 0.12) : AppColors.danger.withValues(alpha: 0.12),
                child: Icon(
                  tx.isIncome ? Icons.add_rounded : Icons.remove_rounded,
                  color: tx.isIncome ? AppColors.success : AppColors.danger,
                ),
              ),
              title: Text(
                tx.note ?? (tx.isIncome ? "Recette" : "Dépense"),
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              ),
              subtitle: Text(
                "${tx.date} • ${tx.paymentMethod ?? 'Espèces'}",
                style: const TextStyle(fontSize: 11, color: AppColors.textMutedLight),
              ),
              trailing: Text(
                "${tx.isIncome ? '+' : '-'}${CurrencyFormatter.formatFcfa(tx.amount)}",
                style: TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 13,
                  fontFamily: 'monospace',
                  color: tx.isIncome ? AppColors.success : AppColors.danger,
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
