import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/currency_formatter.dart';
import '../../core/widgets/brand_loader.dart';
import '../dashboard/dashboard_provider.dart';
import '../flocks/flock_provider.dart';
import '../contacts/contacts_provider.dart';
import 'finance_provider.dart';

class RecordTransactionModal extends ConsumerStatefulWidget {
  final String initialType;
  final String? initialCategory;
  final VoidCallback? onSaved;

  const RecordTransactionModal({
    super.key,
    this.initialType = "INCOME",
    this.initialCategory,
    this.onSaved,
  });

  static Future<bool?> show(
    BuildContext context, {
    String initialType = "INCOME",
    String? initialCategory,
    VoidCallback? onSaved,
  }) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => RecordTransactionModal(
        initialType: initialType,
        initialCategory: initialCategory,
        onSaved: onSaved,
      ),
    );
  }

  @override
  ConsumerState<RecordTransactionModal> createState() => _RecordTransactionModalState();
}

class _RecordTransactionModalState extends ConsumerState<RecordTransactionModal> {
  late String _type;
  late String _category;
  final _amountController = TextEditingController();
  final _descController = TextEditingController();
  final _refController = TextEditingController();
  String _paymentMethod = "CASH";
  String? _selectedFlockId;
  String? _selectedContactId;
  final DateTime _date = DateTime.now();

  // Gestion des règlements & crédits
  String _paymentStatus = "PAID"; // PAID, PARTIAL, UNPAID
  final _paidAmountController = TextEditingController();
  DateTime? _dueDate;

  // Calculateur rapide
  bool _showCalculator = false;
  String _eggSaleMode = "TRAYS"; // "TRAYS" (Plateaux de 30) ou "UNITS" (Oeufs à l'unité)
  final _calcUnitsController = TextEditingController(text: "10");
  final _calcUnitPriceController = TextEditingController(text: "2200");

  final List<Map<String, String>> _incomeCategories = [
    {"code": "EGG_SALE", "label": "Vente d'œufs de table"},
    {"code": "MEAT_POULTRY_SALE", "label": "Vente poulets de chair"},
    {"code": "LAYER_CULL_SALE", "label": "Vente poules réformées"},
    {"code": "CHICK_SALE", "label": "Vente de poussins"},
    {"code": "MANURE_SALE", "label": "Vente de fiente / fumier"},
    {"code": "OTHER_INCOME", "label": "Autre encaissement"},
  ];

  final List<Map<String, String>> _expenseCategories = [
    {"code": "FEED_PURCHASE", "label": "Achat d'aliment / provende"},
    {"code": "CHICK_PURCHASE", "label": "Achat de poussins d'un jour"},
    {"code": "MEDICATION_VACCINE", "label": "Santé, vaccins & vétérinaire"},
    {"code": "EQUIPMENT_LITTER", "label": "Litière (copeaux) & matériel"},
    {"code": "SALARY_LABOR", "label": "Salaires & journaliers"},
    {"code": "UTILITIES", "label": "Électricité, Gaz & Eau"},
    {"code": "TRANSPORT", "label": "Carburant & Logistique"},
    {"code": "RENT_LEASE", "label": "Loyer ou bail foncier"},
    {"code": "OTHER_EXPENSE", "label": "Autre charge"},
  ];

  final List<Map<String, String>> _paymentMethods = [
    {"code": "CASH", "label": "Espèces (Main à main)"},
    {"code": "MTN_MOMO", "label": "MTN Mobile Money"},
    {"code": "MOOV_MONEY", "label": "Moov Money"},
    {"code": "CELTIIS_CASH", "label": "Celtiis Cash"},
    {"code": "BANK_TRANSFER", "label": "Virement bancaire"},
    {"code": "CHECK", "label": "Chèque"},
    {"code": "OTHER", "label": "Autre règlement (Wave, etc.)"},
  ];

  @override
  void initState() {
    super.initState();
    _type = widget.initialType;
    if (widget.initialCategory != null) {
      _category = widget.initialCategory!;
    } else {
      _category = _type == "INCOME" ? "EGG_SALE" : "FEED_PURCHASE";
    }
    _calcUnitsController.addListener(_onCalcChanged);
    _calcUnitPriceController.addListener(_onCalcChanged);
  }

  void _onCalcChanged() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _calcUnitsController.removeListener(_onCalcChanged);
    _calcUnitPriceController.removeListener(_onCalcChanged);
    _amountController.dispose();
    _descController.dispose();
    _refController.dispose();
    _paidAmountController.dispose();
    _calcUnitsController.dispose();
    _calcUnitPriceController.dispose();
    super.dispose();
  }

  void _applyCalculation() {
    final qty = int.tryParse(_calcUnitsController.text.trim()) ?? 0;
    final price = int.tryParse(_calcUnitPriceController.text.trim()) ?? 0;
    if (qty > 0 && price > 0) {
      final total = qty * price;
      setState(() {
        _amountController.text = "$total";
        if (_category == "EGG_SALE") {
          if (_eggSaleMode == "TRAYS") {
            final totalEggs = qty * 30;
            _descController.text = "$qty plateaux ($totalEggs œufs) à ${CurrencyFormatter.formatFcfa(price)}/plateau";
          } else {
            final trays = qty ~/ 30;
            final rem = qty % 30;
            final breakdown = trays > 0
                ? (rem > 0 ? " ($trays plat. + $rem œufs)" : " ($trays plateaux)")
                : "";
            _descController.text = "$qty œufs$breakdown à ${CurrencyFormatter.formatFcfa(price)}/œuf";
          }
        } else if (_category == "MEAT_POULTRY_SALE" || _category == "LAYER_CULL_SALE") {
          _descController.text = "$qty sujets à ${CurrencyFormatter.formatFcfa(price)}";
        }
        _showCalculator = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surfaceColor = isDark ? AppColors.surfaceDark : AppColors.surfaceLight;
    final borderColor = isDark ? AppColors.borderDark : AppColors.borderLight;
    final finState = ref.watch(financeProvider);
    final flockState = ref.watch(flockProvider);
    final contactsState = ref.watch(contactsProvider);

    final currentCategories = _type == "INCOME" ? _incomeCategories : _expenseCategories;

    final rawAmount = int.tryParse(_amountController.text.replaceAll(' ', '')) ?? 0;
    final rawPaid = int.tryParse(_paidAmountController.text.replaceAll(' ', '')) ?? 0;
    final remainingDebt = (rawAmount - rawPaid).clamp(0, 999999999);

    final canCalculate = _category == "EGG_SALE" ||
        _category == "MEAT_POULTRY_SALE" ||
        _category == "LAYER_CULL_SALE";

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
                          _category = "FEED_PURCHASE";
                          _paymentStatus = "PAID";
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
                    if (val != null) {
                      setState(() {
                        _category = val;
                        if (_category == "EGG_SALE") {
                          _calcUnitPriceController.text = "2200";
                        } else if (_category == "MEAT_POULTRY_SALE" || _category == "LAYER_CULL_SALE") {
                          _calcUnitPriceController.text = "3000";
                        }
                      });
                    }
                  },
                ),
              ),
            ),
            const SizedBox(height: 14),

            // Calculateur d'unités si vente d'œufs ou volailles
            if (canCalculate) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    _category == "EGG_SALE" ? "Calculateur de vente d'œufs" : "Calculateur par tête",
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.accent),
                  ),
                  TextButton.icon(
                    onPressed: () => setState(() => _showCalculator = !_showCalculator),
                    icon: Icon(_showCalculator ? Icons.keyboard_arrow_up : Icons.calculate_outlined, size: 16),
                    label: Text(_showCalculator ? "Fermer" : "Calculer", style: const TextStyle(fontSize: 12)),
                    style: TextButton.styleFrom(visualDensity: VisualDensity.compact),
                  ),
                ],
              ),
              if (_showCalculator) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.accent.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.accent.withValues(alpha: 0.3)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (_category == "EGG_SALE") ...[
                        Row(
                          children: [
                            Expanded(
                              child: InkWell(
                                onTap: () {
                                  setState(() {
                                    _eggSaleMode = "TRAYS";
                                    _calcUnitsController.text = "10";
                                    _calcUnitPriceController.text = "2200";
                                  });
                                },
                                borderRadius: BorderRadius.circular(8),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(vertical: 7),
                                  decoration: BoxDecoration(
                                    color: _eggSaleMode == "TRAYS" ? AppColors.accent : Colors.transparent,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  alignment: Alignment.center,
                                  child: Text(
                                    "Plateaux (30 œufs)",
                                    style: TextStyle(
                                      fontSize: 11.5,
                                      fontWeight: FontWeight.bold,
                                      color: _eggSaleMode == "TRAYS" ? Colors.white : AppColors.accent,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: InkWell(
                                onTap: () {
                                  setState(() {
                                    _eggSaleMode = "UNITS";
                                    _calcUnitsController.text = "300";
                                    _calcUnitPriceController.text = "75";
                                  });
                                },
                                borderRadius: BorderRadius.circular(8),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(vertical: 7),
                                  decoration: BoxDecoration(
                                    color: _eggSaleMode == "UNITS" ? AppColors.accent : Colors.transparent,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  alignment: Alignment.center,
                                  child: Text(
                                    "À l'unité (détail)",
                                    style: TextStyle(
                                      fontSize: 11.5,
                                      fontWeight: FontWeight.bold,
                                      color: _eggSaleMode == "UNITS" ? Colors.white : AppColors.accent,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                      ],
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _calcUnitsController,
                              keyboardType: TextInputType.number,
                              decoration: InputDecoration(
                                labelText: _category == "EGG_SALE"
                                    ? (_eggSaleMode == "TRAYS" ? "Nb plateaux (30)" : "Nombre total d'œufs")
                                    : "Nb volailles",
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                                contentPadding: const EdgeInsets.all(10),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: TextField(
                              controller: _calcUnitPriceController,
                              keyboardType: TextInputType.number,
                              decoration: InputDecoration(
                                labelText: _category == "EGG_SALE"
                                    ? (_eggSaleMode == "TRAYS" ? "Prix / plateau (FCFA)" : "Prix / œuf (FCFA)")
                                    : "Prix unitaire (FCFA)",
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                                contentPadding: const EdgeInsets.all(10),
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (_category == "EGG_SALE") ...[
                        const SizedBox(height: 8),
                        Builder(
                          builder: (_) {
                            final rawQty = int.tryParse(_calcUnitsController.text.trim()) ?? 0;
                            final rawPrice = int.tryParse(_calcUnitPriceController.text.trim()) ?? 0;
                            if (rawQty <= 0) return const SizedBox.shrink();

                            final String equivText;
                            if (_eggSaleMode == "TRAYS") {
                              final totalEggs = rawQty * 30;
                              equivText = "🥚 Soit exactement $totalEggs œufs vendus";
                            } else {
                              final tr = rawQty ~/ 30;
                              final rm = rawQty % 30;
                              equivText = "🥚 Soit $tr plateau(x) et $rm œuf(s)";
                            }

                            final totalFcfa = rawQty * rawPrice;
                            return Container(
                              width: double.infinity,
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: isDark ? AppColors.surfaceDark : Colors.white,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: AppColors.accent.withValues(alpha: 0.3)),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    equivText,
                                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.accent),
                                  ),
                                  if (rawPrice > 0)
                                    Text(
                                      CurrencyFormatter.formatFcfa(totalFcfa),
                                      style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w900, fontFamily: 'monospace'),
                                    ),
                                ],
                              ),
                            );
                          },
                        ),
                      ],
                      const SizedBox(height: 8),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: _applyCalculation,
                          icon: const Icon(Icons.check, size: 16),
                          label: const Text("Appliquer au montant"),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.accent,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),
              ],
            ],

            // Montant Total
            TextField(
              controller: _amountController,
              keyboardType: TextInputType.number,
              onChanged: (_) => setState(() {}),
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w900,
                color: _type == "INCOME" ? AppColors.success : AppColors.danger,
                fontFamily: 'monospace',
              ),
              decoration: InputDecoration(
                labelText: "Montant total (FCFA) *",
                hintText: "Ex : 25 000",
                suffixText: "FCFA",
                prefixIcon: const Icon(Icons.monetization_on_outlined),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                contentPadding: const EdgeInsets.all(12),
              ),
            ),
            const SizedBox(height: 14),

            // Raccourcis de montants
            Row(
              children: [
                _AmountTag(
                  label: "+5 000",
                  onTap: () {
                    final cur = int.tryParse(_amountController.text.replaceAll(' ', '')) ?? 0;
                    setState(() => _amountController.text = "${cur + 5000}");
                  },
                ),
                const SizedBox(width: 6),
                _AmountTag(
                  label: "+10 000",
                  onTap: () {
                    final cur = int.tryParse(_amountController.text.replaceAll(' ', '')) ?? 0;
                    setState(() => _amountController.text = "${cur + 10000}");
                  },
                ),
                const SizedBox(width: 6),
                _AmountTag(
                  label: "+25 000",
                  onTap: () {
                    final cur = int.tryParse(_amountController.text.replaceAll(' ', '')) ?? 0;
                    setState(() => _amountController.text = "${cur + 25000}");
                  },
                ),
                const SizedBox(width: 6),
                _AmountTag(
                  label: "+50 000",
                  onTap: () {
                    final cur = int.tryParse(_amountController.text.replaceAll(' ', '')) ?? 0;
                    setState(() => _amountController.text = "${cur + 50000}");
                  },
                ),
              ],
            ),
            const SizedBox(height: 14),

            // Mode d'encaissement / Crédit client (Uniquement pour les recettes)
            if (_type == "INCOME") ...[
              const Text("Statut d'encaissement (Comptant vs Crédit) *",
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              Row(
                children: [
                  _StatusChip(
                    label: "Comptant",
                    isSelected: _paymentStatus == "PAID",
                    color: AppColors.success,
                    onTap: () => setState(() => _paymentStatus = "PAID"),
                  ),
                  const SizedBox(width: 6),
                  _StatusChip(
                    label: "Acompte",
                    isSelected: _paymentStatus == "PARTIAL",
                    color: AppColors.accent,
                    onTap: () {
                      setState(() {
                        _paymentStatus = "PARTIAL";
                        if (_paidAmountController.text.isEmpty && rawAmount > 0) {
                          _paidAmountController.text = "${(rawAmount / 2).round()}";
                        }
                      });
                    },
                  ),
                  const SizedBox(width: 6),
                  _StatusChip(
                    label: "À crédit",
                    isSelected: _paymentStatus == "UNPAID",
                    color: AppColors.danger,
                    onTap: () => setState(() => _paymentStatus = "UNPAID"),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              if (_paymentStatus == "PARTIAL") ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.accent.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.accent.withValues(alpha: 0.3)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      TextField(
                        controller: _paidAmountController,
                        keyboardType: TextInputType.number,
                        onChanged: (_) => setState(() {}),
                        decoration: InputDecoration(
                          labelText: "Acompte encaissé immédiatement (FCFA) *",
                          hintText: "Ex : 10 000",
                          suffixText: "FCFA",
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          contentPadding: const EdgeInsets.all(10),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        "Reliquat restant dû par le client : ${CurrencyFormatter.formatFcfa(remainingDebt)}",
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.danger),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
              ],

              if (_paymentStatus != "PAID") ...[
                InkWell(
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: _dueDate ?? DateTime.now().add(const Duration(days: 7)),
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 365)),
                    );
                    if (picked != null) {
                      setState(() => _dueDate = picked);
                    }
                  },
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    decoration: BoxDecoration(
                      color: isDark ? Colors.grey.shade900 : Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: borderColor),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.event_outlined, size: 20, color: AppColors.accent),
                        const SizedBox(width: 10),
                        Text(
                          _dueDate == null
                              ? "Date d'échéance de règlement (optionnel)"
                              : "Échéance : ${_dueDate!.day.toString().padLeft(2, '0')}/${_dueDate!.month.toString().padLeft(2, '0')}/${_dueDate!.year}",
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: _dueDate != null ? FontWeight.bold : FontWeight.normal,
                          ),
                        ),
                        const Spacer(),
                        const Text("Choisir", style: TextStyle(fontSize: 12, color: AppColors.primary)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 14),
              ],
            ],

            // Mode de règlement
            const Text("Moyen de paiement *", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
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

            // Contact rattaché (Client ou Fournisseur)
            if (contactsState.contacts.isNotEmpty) ...[
              Text(
                _type == "INCOME" ? "Client acheteur (optionnel)" : "Fournisseur (optionnel)",
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
              ),
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
                    value: _selectedContactId,
                    isExpanded: true,
                    hint: Text(
                      _type == "INCOME" ? "Sélectionner un client..." : "Sélectionner un fournisseur...",
                      style: const TextStyle(fontSize: 13),
                    ),
                    items: [
                      const DropdownMenuItem<String?>(
                        value: null,
                        child: Text("Aucun contact rattaché", style: TextStyle(fontSize: 13)),
                      ),
                      ...contactsState.contacts.map((c) {
                        return DropdownMenuItem<String?>(
                          value: c.id,
                          child: Text(
                            "${c.name} (${c.type.label})",
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                          ),
                        );
                      }),
                    ],
                    onChanged: (val) => setState(() => _selectedContactId = val),
                  ),
                ),
              ),
              const SizedBox(height: 14),
            ],

            // Référence / Reçu
            TextField(
              controller: _refController,
              decoration: InputDecoration(
                labelText: "N° Reçu / Facture (optionnel)",
                hintText: "Ex : REC-0042, BDL-12",
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              ),
            ),
            const SizedBox(height: 12),

            // Description / Client
            TextField(
              controller: _descController,
              decoration: InputDecoration(
                labelText: "Client / Fournisseur / Notes (optionnel)",
                hintText: "Ex : Client Restaurant Étoile, 20 plateaux...",
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
                            if (rawAmount <= 0) {
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
                              paymentStatus: _type == "INCOME" ? _paymentStatus : "PAID",
                              paidAmount: _type == "INCOME" && _paymentStatus == "PARTIAL" ? rawPaid : null,
                              dueDate: _type == "INCOME" && _paymentStatus != "PAID" ? _dueDate : null,
                              reference: _refController.text.trim().isNotEmpty ? _refController.text.trim() : null,
                              description: _descController.text.trim().isNotEmpty
                                  ? _descController.text.trim()
                                  : null,
                              flockId: _selectedFlockId,
                              contactId: _selectedContactId,
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
                        ? const BrandLoader.button()
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

class _AmountTag extends StatelessWidget {
  final String label;
  final VoidCallback onTap;

  const _AmountTag({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 6),
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary),
          ),
        ),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final Color color;
  final VoidCallback onTap;

  const _StatusChip({
    required this.label,
    required this.isSelected,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? color : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSelected ? color : AppColors.borderLight,
            ),
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: isSelected ? Colors.white : AppColors.textMutedLight,
            ),
          ),
        ),
      ),
    );
  }
}
