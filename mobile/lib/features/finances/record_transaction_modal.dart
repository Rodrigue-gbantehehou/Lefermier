import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../dashboard/dashboard_provider.dart';
import '../flocks/flock_provider.dart';
import 'finance_provider.dart';

class RecordTransactionModal extends ConsumerStatefulWidget {
  final String initialType;
  final VoidCallback? onSaved;

  const RecordTransactionModal({
    super.key,
    this.initialType = "INCOME",
    this.onSaved,
  });

  static Future<bool?> show(
    BuildContext context, {
    String initialType = "INCOME",
    VoidCallback? onSaved,
  }) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => RecordTransactionModal(
        initialType: initialType,
        onSaved: onSaved,
      ),
    );
  }

  @override
  ConsumerState<RecordTransactionModal> createState() => _RecordTransactionModalState();
}

class _RecordTransactionModalState extends ConsumerState<RecordTransactionModal> {
  late String _type;
  String _category = "EGG_SALE";
  final _amountController = TextEditingController();
  final _descController = TextEditingController();
  String _paymentMethod = "CASH";
  String? _selectedFlockId;
  final DateTime _date = DateTime.now();

  final List<Map<String, String>> _incomeCategories = [
    {"code": "EGG_SALE", "label": "Vente d'œufs"},
    {"code": "BIRD_SALE", "label": "Vente de volailles"},
    {"code": "MANURE_SALE", "label": "Vente de fiente / fumier"},
    {"code": "OTHER_INCOME", "label": "Autre recette"},
  ];

  final List<Map<String, String>> _expenseCategories = [
    {"code": "FEED", "label": "Achat d'aliment"},
    {"code": "VET_MEDICINE", "label": "Produits vétérinaires & vaccins"},
    {"code": "LABOR", "label": "Salaires & Main d'œuvre"},
    {"code": "EQUIPMENT", "label": "Matériel & Réparations"},
    {"code": "PACKAGING", "label": "Alvéoles & Emballages"},
    {"code": "ENERGY", "label": "Électricité, Gaz & Eau"},
    {"code": "TRANSPORT", "label": "Carburant & Logistique"},
    {"code": "OTHER_EXPENSE", "label": "Autre charge"},
  ];

  final List<Map<String, String>> _paymentMethods = [
    {"code": "CASH", "label": "Espèces (Main à main)"},
    {"code": "MTN_MOMO", "label": "MTN Mobile Money"},
    {"code": "MOOV_MONEY", "label": "Moov Money"},
    {"code": "CELTIIS_CASH", "label": "Celtiis Cash"},
    {"code": "WAVE", "label": "Wave Money"},
    {"code": "BANK_TRANSFER", "label": "Virement bancaire"},
  ];

  @override
  void initState() {
    super.initState();
    _type = widget.initialType;
    _category = _type == "INCOME" ? "EGG_SALE" : "FEED";
  }

  @override
  void dispose() {
    _amountController.dispose();
    _descController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surfaceColor = isDark ? AppColors.surfaceDark : AppColors.surfaceLight;
    final borderColor = isDark ? AppColors.borderDark : AppColors.borderLight;
    final finState = ref.watch(financeProvider);
    final flockState = ref.watch(flockProvider);

    final currentCategories = _type == "INCOME" ? _incomeCategories : _expenseCategories;

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
        MediaQuery.of(context).viewInsets.bottom + MediaQuery.of(context).padding.bottom + 20,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Poignée de glissement
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

            // En-tête
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(
                      _type == "INCOME" ? Icons.add_circle_outline_rounded : Icons.remove_circle_outline_rounded,
                      color: _type == "INCOME" ? AppColors.success : AppColors.danger,
                      size: 22,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      _type == "INCOME" ? "Nouvel Encaissement" : "Nouvelle Dépense",
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded),
                  onPressed: () => Navigator.pop(context, false),
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
                      onTap: () {
                        setState(() {
                          _type = "INCOME";
                          _category = "EGG_SALE";
                        });
                      },
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        decoration: BoxDecoration(
                          color: _type == "INCOME" ? AppColors.success : Colors.transparent,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          "Recette (+)",
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                            color: _type == "INCOME" ? Colors.white : AppColors.textMutedLight,
                          ),
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: InkWell(
                      onTap: () {
                        setState(() {
                          _type = "EXPENSE";
                          _category = "FEED";
                        });
                      },
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        decoration: BoxDecoration(
                          color: _type == "EXPENSE" ? AppColors.danger : Colors.transparent,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          "Dépense (-)",
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                            color: _type == "EXPENSE" ? Colors.white : AppColors.textMutedLight,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Montant
            TextField(
              controller: _amountController,
              keyboardType: TextInputType.number,
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w900,
                color: _type == "INCOME" ? AppColors.success : AppColors.danger,
                fontFamily: 'monospace',
              ),
              decoration: InputDecoration(
                labelText: "Montant (FCFA) *",
                hintText: "Ex : 15 000",
                prefixIcon: const Icon(Icons.monetization_on_outlined),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                contentPadding: const EdgeInsets.all(12),
              ),
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
                  value: _category,
                  isExpanded: true,
                  items: currentCategories.map((c) {
                    return DropdownMenuItem<String>(
                      value: c['code'],
                      child: Text(c['label']!, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                    );
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) setState(() => _category = val);
                  },
                ),
              ),
            ),
            const SizedBox(height: 14),

            // Mode de règlement
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
                  value: _paymentMethod,
                  isExpanded: true,
                  items: _paymentMethods.map((m) {
                    return DropdownMenuItem<String>(
                      value: m['code'],
                      child: Text(m['label']!, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                    );
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) setState(() => _paymentMethod = val);
                  },
                ),
              ),
            ),
            const SizedBox(height: 14),

            // Bande rattachée optionnelle
            if (flockState.flocks.isNotEmpty) ...[
              const Text("Bande liée (optionnel)", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color: isDark ? Colors.grey.shade900 : Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: borderColor),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String?>(
                    value: _selectedFlockId,
                    isExpanded: true,
                    hint: const Text("Toute l'exploitation (Global)", style: TextStyle(fontSize: 13)),
                    items: [
                      const DropdownMenuItem<String?>(
                        value: null,
                        child: Text("Toute l'exploitation (Global)", style: TextStyle(fontSize: 13)),
                      ),
                      ...flockState.flocks.map((f) {
                        return DropdownMenuItem<String?>(
                          value: f.id,
                          child: Text(f.name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                        );
                      }),
                    ],
                    onChanged: (val) => setState(() => _selectedFlockId = val),
                  ),
                ),
              ),
              const SizedBox(height: 14),
            ],

            // Description / Référence
            TextField(
              controller: _descController,
              decoration: InputDecoration(
                labelText: "Description ou n° reçu (optionnel)",
                hintText: "Ex : Facture n°42, Client Restaurant Étoile...",
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              ),
            ),
            const SizedBox(height: 20),

            // Boutons d'action
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context, false),
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
                    onPressed: !finState.isSubmitting
                        ? () async {
                            final rawAmount = int.tryParse(_amountController.text.replaceAll(' ', ''));
                            if (rawAmount == null || rawAmount <= 0) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text("Veuillez saisir un montant valide"),
                                  backgroundColor: AppColors.danger,
                                ),
                              );
                              return;
                            }

                            final scaffoldMessenger = ScaffoldMessenger.of(context);
                            final navigator = Navigator.of(context);

                            final success = await ref.read(financeProvider.notifier).recordTransaction(
                              type: _type,
                              category: _category,
                              amount: rawAmount,
                              date: _date,
                              paymentMethod: _paymentMethod,
                              description: _descController.text.trim().isNotEmpty
                                  ? _descController.text.trim()
                                  : null,
                              flockId: _selectedFlockId,
                            );

                            if (mounted) {
                              if (success) {
                                ref.read(dashboardProvider.notifier).loadDashboard(showLoading: false);
                                widget.onSaved?.call();

                                navigator.pop(true);
                                scaffoldMessenger.showSnackBar(
                                  SnackBar(
                                    content: Text("Opération de $rawAmount FCFA enregistrée avec succès"),
                                    backgroundColor: AppColors.success,
                                  ),
                                );
                              } else {
                                final err = ref.read(financeProvider).error ?? "Une erreur est survenue.";
                                scaffoldMessenger.showSnackBar(
                                  SnackBar(content: Text(err), backgroundColor: AppColors.danger),
                                );
                              }
                            }
                          }
                        : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _type == "INCOME" ? AppColors.success : AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: finState.isSubmitting
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Text("Enregistrer"),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
