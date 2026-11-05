import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/currency_formatter.dart';
import '../dashboard/dashboard_provider.dart';
import '../finances/finance_provider.dart';
import '../contacts/contacts_provider.dart';
import '../finances/sales_receipt_modal.dart';
import 'flock_provider.dart';

class RecordPoultrySaleModal extends ConsumerStatefulWidget {
  final String? defaultFlockId;
  final VoidCallback? onSaved;

  const RecordPoultrySaleModal({
    super.key,
    this.defaultFlockId,
    this.onSaved,
  });

  static Future<bool?> show(
    BuildContext context, {
    String? defaultFlockId,
    VoidCallback? onSaved,
  }) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => RecordPoultrySaleModal(
        defaultFlockId: defaultFlockId,
        onSaved: onSaved,
      ),
    );
  }

  @override
  ConsumerState<RecordPoultrySaleModal> createState() => _RecordPoultrySaleModalState();
}

class _RecordPoultrySaleModalState extends ConsumerState<RecordPoultrySaleModal> {
  String? _selectedFlockId;
  String _category = "MEAT_POULTRY_SALE"; // MEAT_POULTRY_SALE or LAYER_CULL_SALE
  int _quantity = 10;
  final _unitPriceController = TextEditingController(text: "2500");
  final _notesController = TextEditingController();
  String? _selectedContactId;
  String _paymentMethod = "CASH";
  String _paymentStatus = "PAID"; // PAID or UNPAID (Crédit)
  final DateTime _saleDate = DateTime.now();

  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _selectedFlockId = widget.defaultFlockId;
  }

  @override
  void dispose() {
    _unitPriceController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  int get _unitPrice {
    final clean = _unitPriceController.text.replaceAll(RegExp(r'[^0-9]'), '');
    return int.tryParse(clean) ?? 0;
  }

  int get _totalAmount => _quantity * _unitPrice;

  final List<Map<String, String>> _paymentMethods = [
    {"code": "CASH", "label": "Espèces (Main à main)"},
    {"code": "MTN_MOMO", "label": "MTN Mobile Money"},
    {"code": "MOOV_MONEY", "label": "Moov Money"},
    {"code": "CELTIIS_CASH", "label": "Celtiis Cash"},
    {"code": "BANK_TRANSFER", "label": "Virement bancaire"},
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surfaceColor = isDark ? AppColors.surfaceDark : AppColors.surfaceLight;
    final borderColor = isDark ? AppColors.borderDark : AppColors.borderLight;

    final flockState = ref.watch(flockProvider);
    final flocks = flockState.flocks;
    final contactsState = ref.watch(contactsProvider);
    final clients = contactsState.contacts.where((c) => c.isCustomer).toList();

    if (_selectedFlockId == null && flocks.isNotEmpty) {
      _selectedFlockId = flocks.first.id;
    }

    final selectedFlock = flocks.where((f) => f.id == _selectedFlockId).firstOrNull;
    final availableQuantity = selectedFlock?.currentQuantity ?? 0;

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
                const Row(
                  children: [
                    Icon(Icons.shopping_bag_outlined, color: AppColors.success, size: 24),
                    SizedBox(width: 8),
                    Text(
                      "Vente de Volailles",
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
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

            if (flocks.isEmpty) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.danger.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Text(
                  "Aucun lot actif trouvé pour la vente.",
                  style: TextStyle(color: AppColors.danger, fontSize: 12, fontWeight: FontWeight.bold),
                ),
              ),
            ] else ...[
              // 1. Bande concernée
              const Text("Bande / Lot à vendre *", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
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
                    value: _selectedFlockId,
                    isExpanded: true,
                    items: flocks.map((f) {
                      return DropdownMenuItem<String>(
                        value: f.id,
                        child: Text(
                          "${f.name} • ${f.currentQuantity} sujets vivants disponibles",
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                        ),
                      );
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) setState(() => _selectedFlockId = val);
                    },
                  ),
                ),
              ),
              const SizedBox(height: 14),

              // 2. Catégorie de volailles
              const Text("Catégorie *", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () => setState(() {
                        _category = "MEAT_POULTRY_SALE";
                        if (_unitPriceController.text.isEmpty || _unitPriceController.text == "1800") {
                          _unitPriceController.text = "2500";
                        }
                      }),
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        decoration: BoxDecoration(
                          color: _category == "MEAT_POULTRY_SALE"
                              ? AppColors.success.withValues(alpha: 0.15)
                              : (isDark ? Colors.grey.shade900 : Colors.grey.shade100),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: _category == "MEAT_POULTRY_SALE" ? AppColors.success : borderColor,
                          ),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          "Poulets de chair / Vifs",
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: _category == "MEAT_POULTRY_SALE" ? AppColors.success : null,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: InkWell(
                      onTap: () => setState(() {
                        _category = "LAYER_CULL_SALE";
                        if (_unitPriceController.text.isEmpty || _unitPriceController.text == "2500") {
                          _unitPriceController.text = "1800";
                        }
                      }),
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        decoration: BoxDecoration(
                          color: _category == "LAYER_CULL_SALE"
                              ? AppColors.accent.withValues(alpha: 0.15)
                              : (isDark ? Colors.grey.shade900 : Colors.grey.shade100),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: _category == "LAYER_CULL_SALE" ? AppColors.accent : borderColor,
                          ),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          "Poules Réformées",
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: _category == "LAYER_CULL_SALE" ? AppColors.accent : null,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // 3. Quantité et Prix unitaire
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Nombre de têtes vendues
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text("Nombre de têtes *", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
                          decoration: BoxDecoration(
                            color: isDark ? Colors.grey.shade900 : Colors.grey.shade100,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: borderColor),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              IconButton(
                                visualDensity: VisualDensity.compact,
                                onPressed: _quantity > 1 ? () => setState(() => _quantity--) : null,
                                icon: const Icon(Icons.remove, size: 18),
                              ),
                              Text(
                                "$_quantity",
                                style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                              ),
                              IconButton(
                                visualDensity: VisualDensity.compact,
                                onPressed: (_quantity < availableQuantity)
                                    ? () => setState(() => _quantity++)
                                    : null,
                                icon: const Icon(Icons.add, size: 18),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),

                  // Prix unitaire FCFA
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text("Prix unitaire (FCFA) *", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                        const SizedBox(height: 6),
                        TextField(
                          controller: _unitPriceController,
                          keyboardType: TextInputType.number,
                          onChanged: (_) => setState(() {}),
                          decoration: InputDecoration(
                            hintText: "2500",
                            suffixText: "FCFA",
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Total calculé
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.success.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.success.withValues(alpha: 0.3)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      "Recette Totale à encaisser :",
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                    ),
                    Text(
                      "${CurrencyFormatter.formatFcfa(_totalAmount)} FCFA",
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                        color: AppColors.success,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // 4. Mode de règlement & Client
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text("Règlement *", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10),
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
                                return DropdownMenuItem(
                                  value: m['code'],
                                  child: Text(m['label']!, style: const TextStyle(fontSize: 12)),
                                );
                              }).toList(),
                              onChanged: (val) {
                                if (val != null) setState(() => _paymentMethod = val);
                              },
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text("Statut d'encaissement", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10),
                          decoration: BoxDecoration(
                            color: isDark ? Colors.grey.shade900 : Colors.grey.shade100,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: borderColor),
                          ),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              value: _paymentStatus,
                              isExpanded: true,
                              items: const [
                                DropdownMenuItem(value: "PAID", child: Text("Payé comptant", style: TextStyle(fontSize: 12, color: AppColors.success, fontWeight: FontWeight.bold))),
                                DropdownMenuItem(value: "UNPAID", child: Text("À crédit (Dû)", style: TextStyle(fontSize: 12, color: AppColors.danger, fontWeight: FontWeight.bold))),
                              ],
                              onChanged: (val) {
                                if (val != null) setState(() => _paymentStatus = val);
                              },
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Client (Optionnel)
              if (clients.isNotEmpty) ...[
                const Text("Client acheteur (optionnel)", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
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
                      hint: const Text("Sélectionner un client...", style: TextStyle(fontSize: 12)),
                      items: [
                        const DropdownMenuItem<String?>(
                          value: null,
                          child: Text("Client occasionnel (Comptoir)", style: TextStyle(fontSize: 12)),
                        ),
                        ...clients.map((c) => DropdownMenuItem<String?>(
                              value: c.id,
                              child: Text(c.name, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                            )),
                      ],
                      onChanged: (val) => setState(() => _selectedContactId = val),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
              ],

              // Notes / Observations
              TextField(
                controller: _notesController,
                decoration: InputDecoration(
                  labelText: "Observations (optionnel)",
                  hintText: "Ex : Vente restaurateur, poids moyen 1.8 kg...",
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
                        padding: const EdgeInsets.symmetric(vertical: 13),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text("Annuler"),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    flex: 2,
                    child: ElevatedButton.icon(
                      icon: _isSubmitting
                          ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Icon(Icons.check_circle_rounded, color: Colors.white, size: 18),
                      label: Text(
                        _isSubmitting ? "Enregistrement..." : "Valider la vente (${CurrencyFormatter.formatFcfa(_totalAmount)} F)",
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.success,
                        padding: const EdgeInsets.symmetric(vertical: 13),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: (_isSubmitting || _selectedFlockId == null || _totalAmount <= 0)
                          ? null
                          : () async {
                              if (_quantity > availableQuantity) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text("Quantité impossible : le lot ne compte que $availableQuantity sujets."),
                                    backgroundColor: AppColors.danger,
                                  ),
                                );
                                return;
                              }

                              final scaffold = ScaffoldMessenger.of(context);
                              final navigator = Navigator.of(context);

                              setState(() => _isSubmitting = true);

                              final flockName = selectedFlock?.name ?? "Bande";
                              final clientLabel = _selectedContactId != null
                                  ? (clients.where((c) => c.id == _selectedContactId).firstOrNull?.name ?? "Client")
                                  : "Vente comptoir";

                              final noteSuffix = _notesController.text.trim().isNotEmpty ? " - ${_notesController.text.trim()}" : "";
                              final desc = "Vente de $_quantity sujets ($flockName) - $clientLabel$noteSuffix";

                              // 1. Sortie de bande (déduction de cheptel)
                              final movementSuccess = await ref.read(flockProvider.notifier).recordMovement(
                                flockId: _selectedFlockId!,
                                type: "SALE",
                                quantity: _quantity,
                                date: _saleDate,
                                reason: desc,
                              );

                              // 2. Encaissement dans la Caisse (Recette financière)
                              final transactionSuccess = await ref.read(financeProvider.notifier).recordTransaction(
                                type: "INCOME",
                                category: _category,
                                amount: _totalAmount,
                                date: _saleDate,
                                paymentMethod: _paymentMethod,
                                paymentStatus: _paymentStatus,
                                flockId: _selectedFlockId,
                                contactId: _selectedContactId,
                                description: desc,
                              );

                              if (!mounted) return;

                              setState(() => _isSubmitting = false);

                              if (movementSuccess && transactionSuccess) {
                                ref.read(dashboardProvider.notifier).loadDashboard(showLoading: false);
                                widget.onSaved?.call();
                                navigator.pop(true);

                                scaffold.showSnackBar(
                                  SnackBar(
                                    content: Text("Vente de $_quantity sujets enregistrée (+${CurrencyFormatter.formatFcfa(_totalAmount)} en Caisse)"),
                                    backgroundColor: AppColors.success,
                                    duration: const Duration(seconds: 6),
                                    action: SnackBarAction(
                                      label: "Reçu",
                                      textColor: Colors.white,
                                      onPressed: () {
                                        final txs = ref.read(financeProvider).transactions;
                                        final latestTx = txs.where((t) => t.isIncome).firstOrNull;
                                        if (latestTx != null) {
                                          SalesReceiptModal.show(context, transaction: latestTx);
                                        }
                                      },
                                    ),
                                  ),
                                );
                              } else {
                                scaffold.showSnackBar(
                                  const SnackBar(
                                    content: Text("Une erreur est survenue lors de l'enregistrement."),
                                    backgroundColor: AppColors.danger,
                                  ),
                                );
                              }
                            },
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
