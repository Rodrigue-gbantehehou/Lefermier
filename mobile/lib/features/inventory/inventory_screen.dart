import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/theme_provider.dart';
import '../../core/utils/currency_formatter.dart';
import '../../core/models/inventory_item.dart';
import '../../core/widgets/brand_loader.dart';
import 'inventory_provider.dart';
import 'inventory_detail_screen.dart';

class InventoryScreen extends ConsumerStatefulWidget {
  final VoidCallback? onBack;
  final VoidCallback? onOpenMenu;
  const InventoryScreen({super.key, this.onBack, this.onOpenMenu});

  @override
  ConsumerState<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends ConsumerState<InventoryScreen> {
  int _activeTabIndex = 0; // 0 = Stocks en réserve, 1 = Journal des mouvements
  String _searchQuery = "";

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _refreshAll();
    });
  }

  Future<void> _refreshAll() async {
    await Future.wait([
      ref.read(inventoryProvider.notifier).loadItems(showLoading: false),
      ref.read(inventoryProvider.notifier).loadMovements(showLoading: false),
    ]);
  }

  /// Dialogue d'approvisionnement en stock (Entrée de marchandises / intrants)
  void _openProcurementDialog(List<InventoryItem> items, {String? preselectedItemId}) {
    if (items.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Veuillez d'abord créer un produit avant d'enregistrer un approvisionnement."),
          backgroundColor: AppColors.danger,
        ),
      );
      return;
    }

    String selectedItemId = preselectedItemId ?? items.first.id;
    if (!items.any((i) => i.id == selectedItemId)) {
      selectedItemId = items.first.id;
    }

    final initialItem = items.firstWhere((i) => i.id == selectedItemId, orElse: () => items.first);

    final qtyController = TextEditingController(text: "10");
    final reasonController = TextEditingController();
    final priceController = TextEditingController(
      text: initialItem.unitPrice != null ? initialItem.unitPrice.toString() : "",
    );
    DateTime movementDate = DateTime.now();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          final isDark = Theme.of(ctx).brightness == Brightness.dark;
          final surfaceColor = isDark ? AppColors.surfaceDark : AppColors.surfaceLight;
          final borderColor = isDark ? AppColors.borderDark : AppColors.borderLight;
          final invState = ref.watch(inventoryProvider);
          final currentItem = items.firstWhere((i) => i.id == selectedItemId, orElse: () => items.first);

          final qtyVal = double.tryParse(qtyController.text.trim()) ?? 0.0;
          final priceVal = int.tryParse(priceController.text.trim()) ?? 0;
          final totalCostVal = (qtyVal * priceVal).toInt();

          final isBag = currentItem.unit == "BAG" ||
              currentItem.unit == "BAG_50KG" ||
              currentItem.unit == "BAG_25KG";
          final bagWeight = currentItem.packageWeightKg ?? 50.0;

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
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: AppColors.success.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(Icons.add_shopping_cart_rounded, color: AppColors.success, size: 20),
                          ),
                          const SizedBox(width: 10),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                "Approvisionner en stock",
                                style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                              ),
                              Text(
                                "Enregistrer une entrée de marchandise",
                                style: TextStyle(
                                  fontSize: 11,
                                  color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Sélection du produit
                  const Text("Produit à approvisionner *", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.backgroundDark : AppColors.inputFillLight,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: borderColor),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: selectedItemId,
                        isExpanded: true,
                        items: items.map((item) {
                          final stockText = "${item.currentStock % 1 == 0 ? item.currentStock.toInt() : item.currentStock} ${item.unitShortLabel}";
                          return DropdownMenuItem<String>(
                            value: item.id,
                            child: Text(
                              "${item.name} (En stock: $stockText)",
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                            ),
                          );
                        }).toList(),
                        onChanged: (val) {
                          if (val != null) {
                            setModalState(() {
                              selectedItemId = val;
                              final it = items.firstWhere((i) => i.id == val);
                              if (it.unitPrice != null) {
                                priceController.text = it.unitPrice.toString();
                              }
                            });
                          }
                        },
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Quantité reçue
                  Text(
                    "Quantité reçue (${currentItem.unitShortLabel}) *",
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 6),
                  TextField(
                    controller: qtyController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    onChanged: (_) => setModalState(() {}),
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                    decoration: InputDecoration(
                      hintText: "Ex: 20",
                      suffixText: currentItem.unitShortLabel,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      contentPadding: const EdgeInsets.all(12),
                    ),
                  ),

                  // Mesure totale calculée si sac (ex: 20 sacs = 1000 kg)
                  if (isBag && qtyVal > 0) ...[
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppColors.primarySoft,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.scale_rounded, size: 14, color: AppColors.primary),
                          const SizedBox(width: 6),
                          Text(
                            "Mesure totale : ${qtyVal % 1 == 0 ? qtyVal.toInt() : qtyVal} sacs × ${bagWeight.toStringAsFixed(bagWeight % 1 == 0 ? 0 : 1)} kg = ${(qtyVal * bagWeight).toStringAsFixed(0)} kg",
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary),
                          ),
                        ],
                      ),
                    ),
                  ],

                  const SizedBox(height: 8),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _QuickQtyBtn(
                          label: "+5",
                          onTap: () {
                            final cur = double.tryParse(qtyController.text) ?? 0.0;
                            setModalState(() => qtyController.text = (cur + 5).toStringAsFixed(0));
                          },
                        ),
                        const SizedBox(width: 6),
                        _QuickQtyBtn(
                          label: "+10",
                          onTap: () {
                            final cur = double.tryParse(qtyController.text) ?? 0.0;
                            setModalState(() => qtyController.text = (cur + 10).toStringAsFixed(0));
                          },
                        ),
                        const SizedBox(width: 6),
                        _QuickQtyBtn(
                          label: "+20",
                          onTap: () {
                            final cur = double.tryParse(qtyController.text) ?? 0.0;
                            setModalState(() => qtyController.text = (cur + 20).toStringAsFixed(0));
                          },
                        ),
                        const SizedBox(width: 6),
                        _QuickQtyBtn(
                          label: "+50",
                          onTap: () {
                            final cur = double.tryParse(qtyController.text) ?? 0.0;
                            setModalState(() => qtyController.text = (cur + 50).toStringAsFixed(0));
                          },
                        ),
                        const SizedBox(width: 6),
                        _QuickQtyBtn(
                          label: "+100",
                          onTap: () {
                            final cur = double.tryParse(qtyController.text) ?? 0.0;
                            setModalState(() => qtyController.text = (cur + 100).toStringAsFixed(0));
                          },
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Prix unitaire d'achat
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: priceController,
                          keyboardType: TextInputType.number,
                          onChanged: (_) => setModalState(() {}),
                          decoration: InputDecoration(
                            labelText: "Prix d'achat unitaire (FCFA)",
                            hintText: "Ex: 18500",
                            suffixText: "FCFA / ${currentItem.unitShortLabel}",
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            contentPadding: const EdgeInsets.all(12),
                          ),
                        ),
                      ),
                    ],
                  ),

                  // Résumé financier de l'approvisionnement en temps réel
                  if (totalCostVal > 0) ...[
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors.success.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppColors.success.withValues(alpha: 0.2)),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            "Coût total de l'arrivage :",
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                          ),
                          Text(
                            "${CurrencyFormatter.formatFcfa(totalCostVal)} FCFA",
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w900,
                              fontFamily: 'monospace',
                              color: AppColors.success,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],

                  const SizedBox(height: 14),

                  // Fournisseur / Bon de livraison
                  TextField(
                    controller: reasonController,
                    decoration: InputDecoration(
                      labelText: "Fournisseur / Réf. Facture / Bon de livraison",
                      hintText: "Ex: Provenderie SANIA, Facture N° 458...",
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      contentPadding: const EdgeInsets.all(12),
                    ),
                  ),
                  const SizedBox(height: 20),

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
                          onPressed: !invState.isSubmitting
                              ? () async {
                                  if (qtyVal <= 0.0) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(
                                        content: Text("Veuillez saisir une quantité positive valide."),
                                        backgroundColor: AppColors.danger,
                                      ),
                                    );
                                    return;
                                  }

                                  final unitPriceVal = priceController.text.trim().isNotEmpty
                                      ? int.tryParse(priceController.text.trim())
                                      : null;

                                  final messenger = ScaffoldMessenger.of(context);
                                  final navigator = Navigator.of(ctx);

                                  final success = await ref.read(inventoryProvider.notifier).recordMovement(
                                    itemId: selectedItemId,
                                    type: "INCOMING",
                                    quantity: qtyVal,
                                    date: movementDate,
                                    unitPrice: unitPriceVal,
                                    reason: reasonController.text,
                                  );

                                  if (ctx.mounted) {
                                    if (success) {
                                      navigator.pop();
                                      messenger.showSnackBar(
                                        SnackBar(
                                          content: Text("Approvisionnement de $qtyVal ${currentItem.unitShortLabel} enregistré (+${CurrencyFormatter.formatFcfa(totalCostVal)} FCFA)"),
                                          backgroundColor: AppColors.success,
                                        ),
                                      );
                                    } else {
                                      final err = ref.read(inventoryProvider).error ?? "Une erreur est survenue.";
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
                            backgroundColor: AppColors.success,
                            foregroundColor: Colors.white,
                          ),
                          child: invState.isSubmitting
                              ? const BrandLoader.button()
                              : const Text("Valider l'entrée"),
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

  /// Dialogue de création d'article avec gestion précise du conditionnement et du poids par sac
  void _openCreateItemDialog() {
    final nameController = TextEditingController();
    final stockController = TextEditingController(text: "0");
    final alertController = TextEditingController(text: "5");
    final priceController = TextEditingController();
    final packageWeightController = TextEditingController(text: "50");
    final customCategoryController = TextEditingController();
    final notesController = TextEditingController();

    String category = "FEED";
    String unit = "BAG_50KG";

    final categories = [
      {"code": "FEED", "label": "Aliments complets (Provende)"},
      {"code": "RAW_MATERIAL", "label": "Matières premières (Maïs, Soja...)"},
      {"code": "MEDICINE", "label": "Santé & Vétérinaire (Vaccins, Soins)"},
      {"code": "EQUIPMENT", "label": "Matériel d'élevage"},
      {"code": "LITTER", "label": "Litière / Copeaux"},
      {"code": "OTHER", "label": "Autre intrant"},
    ];

    final units = [
      {"code": "BAG_50KG", "label": "Sac de provende (Poids au choix en kg)", "isBag": true, "defaultWeight": 50.0},
      {"code": "BAG_25KG", "label": "Sac de 25 kg (Demi-sac / concentré)", "isBag": true, "defaultWeight": 25.0},
      {"code": "KG", "label": "Kilogramme (kg - Pesée balance)", "isBag": false, "defaultWeight": null},
      {"code": "G", "label": "Gramme (g - Poudre fine / Vitamines)", "isBag": false, "defaultWeight": null},
      {"code": "TON", "label": "Tonne (t - Vrac)", "isBag": false, "defaultWeight": null},
      {"code": "LITER", "label": "Litre (L - Désinfectants / Bidons)", "isBag": false, "defaultWeight": null},
      {"code": "ML", "label": "Millilitre (mL - Solution buvable)", "isBag": false, "defaultWeight": null},
      {"code": "DOSE", "label": "Dose vaccinale", "isBag": false, "defaultWeight": null},
      {"code": "VIAL", "label": "Flacon / Ampoule", "isBag": false, "defaultWeight": null},
      {"code": "SACHET", "label": "Sachet poudre", "isBag": false, "defaultWeight": null},
      {"code": "UNIT", "label": "Unité / Pièce (Abreuvoir, mangeoire...)", "isBag": false, "defaultWeight": null},
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
          final invState = ref.watch(inventoryProvider);

          final selectedUnitConfig = units.firstWhere((u) => u['code'] == unit, orElse: () => units.first);
          final isBagUnit = selectedUnitConfig['isBag'] == true;

          final stockVal = double.tryParse(stockController.text.trim()) ?? 0.0;
          final bagWeightVal = double.tryParse(packageWeightController.text.trim()) ?? 50.0;

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
                      const Text(
                        "Créer un nouveau produit",
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Désignation de l'article
                  TextField(
                    controller: nameController,
                    decoration: InputDecoration(
                      labelText: "Nom ou désignation du produit *",
                      hintText: "Ex: Aliment Démarrage Provenderie SANIA",
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      contentPadding: const EdgeInsets.all(12),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Catégorie
                  const Text("Catégorie *", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.backgroundDark : AppColors.inputFillLight,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: borderColor),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: category,
                        isExpanded: true,
                        items: categories.map((cat) {
                          return DropdownMenuItem<String>(
                            value: cat['code'],
                            child: Text(cat['label']!, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                          );
                        }).toList(),
                        onChanged: (val) {
                          if (val != null) setModalState(() => category = val);
                        },
                      ),
                    ),
                  ),

                  // Précision si Autre
                  if (category == "OTHER") ...[
                    const SizedBox(height: 10),
                    TextField(
                      controller: customCategoryController,
                      decoration: InputDecoration(
                        labelText: "Précisez la nature de l'intrant *",
                        hintText: "Ex: Alvéoles d'œufs, litière copeaux...",
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        contentPadding: const EdgeInsets.all(12),
                      ),
                    ),
                  ],
                  const SizedBox(height: 12),

                  // Conditionnement & Unité
                  const Text("Conditionnement / Unité de gestion *", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.backgroundDark : AppColors.inputFillLight,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: borderColor),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: unit,
                        isExpanded: true,
                        items: units.map((u) {
                          return DropdownMenuItem<String>(
                            value: u['code'] as String,
                            child: Text(u['label'] as String, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                          );
                        }).toList(),
                        onChanged: (val) {
                          if (val != null) {
                            setModalState(() {
                              unit = val;
                              if (val == "BAG_25KG") {
                                packageWeightController.text = "25";
                              } else if (val == "BAG_50KG") {
                                packageWeightController.text = "50";
                              }
                            });
                          }
                        },
                      ),
                    ),
                  ),

                  // CHAMP INTELLIGENT DE MESURE : Poids net par sac (si conditionnement en sacs)
                  if (isBagUnit) ...[
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.primarySoft,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.primary.withValues(alpha: 0.25)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                "Mesure : Poids net par sac *",
                                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primary),
                              ),
                              Text(
                                "Poids réel d'un sac",
                                style: TextStyle(fontSize: 10, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              Expanded(
                                child: TextField(
                                  controller: packageWeightController,
                                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                  onChanged: (_) => setModalState(() {}),
                                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                                  decoration: InputDecoration(
                                    hintText: "50",
                                    suffixText: "kg / sac",
                                    fillColor: surfaceColor,
                                    filled: true,
                                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              _QuickQtyBtn(
                                label: "50 kg",
                                onTap: () => setModalState(() => packageWeightController.text = "50"),
                              ),
                              const SizedBox(width: 4),
                              _QuickQtyBtn(
                                label: "25 kg",
                                onTap: () => setModalState(() => packageWeightController.text = "25"),
                              ),
                            ],
                          ),
                          if (stockVal > 0 && bagWeightVal > 0) ...[
                            const SizedBox(height: 6),
                            Text(
                              "Capacité initiale en magasin : ${stockVal.toStringAsFixed(0)} sacs × ${bagWeightVal.toStringAsFixed(0)} kg = ${(stockVal * bagWeightVal).toStringAsFixed(0)} kg de provende",
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.primary),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],

                  const SizedBox(height: 12),

                  // Stock initial & Seuil d'alerte
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: stockController,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          onChanged: (_) => setModalState(() {}),
                          decoration: InputDecoration(
                            labelText: isBagUnit ? "Stock initial (Sacs)" : "Stock initial",
                            hintText: "0",
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            contentPadding: const EdgeInsets.all(12),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextField(
                          controller: alertController,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          decoration: InputDecoration(
                            labelText: isBagUnit ? "Seuil d'alerte (Sacs)" : "Seuil d'alerte",
                            hintText: "Ex: 5",
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            contentPadding: const EdgeInsets.all(12),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Prix d'achat unitaire
                  TextField(
                    controller: priceController,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      labelText: isBagUnit ? "Prix d'achat habituel par sac (FCFA)" : "Prix d'achat unitaire (FCFA)",
                      hintText: "Ex: 18500",
                      suffixText: "FCFA",
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      contentPadding: const EdgeInsets.all(12),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Notes / Réf fournisseur
                  TextField(
                    controller: notesController,
                    decoration: InputDecoration(
                      labelText: "Notes / Référence fournisseur (optionnel)",
                      hintText: "Ex: Provenderie du Centre, contact...",
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      contentPadding: const EdgeInsets.all(12),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Boutons
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
                          onPressed: !invState.isSubmitting
                              ? () async {
                                  final name = nameController.text.trim();
                                  if (name.isEmpty) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(
                                        content: Text("Veuillez renseigner un nom pour l'article."),
                                        backgroundColor: AppColors.danger,
                                      ),
                                    );
                                    return;
                                  }

                                  final initialStock = double.tryParse(stockController.text.trim()) ?? 0.0;
                                  final alertThreshold = alertController.text.trim().isNotEmpty
                                      ? double.tryParse(alertController.text.trim())
                                      : null;
                                  final unitPrice = priceController.text.trim().isNotEmpty
                                      ? int.tryParse(priceController.text.trim())
                                      : null;
                                  final packageWeight = isBagUnit
                                      ? (double.tryParse(packageWeightController.text.trim()) ?? 50.0)
                                      : null;

                                  final messenger = ScaffoldMessenger.of(context);
                                  final navigator = Navigator.of(ctx);

                                  final success = await ref.read(inventoryProvider.notifier).createItem(
                                    name: name,
                                    category: category,
                                    customCategory: category == "OTHER" ? customCategoryController.text : null,
                                    unit: unit,
                                    initialStock: initialStock,
                                    alertThreshold: alertThreshold,
                                    unitPrice: unitPrice,
                                    packageWeightKg: packageWeight,
                                    notes: notesController.text,
                                  );

                                  if (ctx.mounted) {
                                    if (success) {
                                      navigator.pop();
                                      messenger.showSnackBar(
                                        SnackBar(
                                          content: Text("Produit $name créé avec succès !"),
                                          backgroundColor: AppColors.success,
                                        ),
                                      );
                                    } else {
                                      final err = ref.read(inventoryProvider).error ?? "Une erreur est survenue.";
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
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                          ),
                          child: invState.isSubmitting
                              ? const BrandLoader.button()
                              : const Text("Créer le produit"),
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
    final invState = ref.watch(inventoryProvider);
    final summary = invState.summary;

    final filteredItems = invState.items.where((i) {
      if (invState.selectedCategory != null && i.category != invState.selectedCategory) {
        return false;
      }
      if (_searchQuery.trim().isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        final matchName = i.name.toLowerCase().contains(q);
        final matchCat = i.categoryLabel.toLowerCase().contains(q);
        return matchName || matchCat;
      }
      return true;
    }).toList();

    final filteredMovements = invState.filteredMovements;

    return Scaffold(
      appBar: AppBar(
        leading: widget.onBack != null
            ? IconButton(
                icon: const Icon(Icons.arrow_back_rounded),
                tooltip: "Retour",
                onPressed: widget.onBack,
              )
            : (Navigator.of(context).canPop()
                ? IconButton(
                    icon: const Icon(Icons.arrow_back_rounded),
                    tooltip: "Retour",
                    onPressed: () => Navigator.of(context).pop(),
                  )
                : IconButton(
                    icon: const Icon(Icons.menu_rounded),
                    tooltip: "Menu",
                    onPressed: widget.onOpenMenu ?? () => Scaffold.of(context).openDrawer(),
                  )),
        title: const Text("Stocks & Intrants"),
        actions: [
          IconButton(
            icon: Icon(
              isDark ? Icons.light_mode_rounded : Icons.dark_mode_rounded,
              color: isDark ? AppColors.accent : null,
              size: 20,
            ),
            tooltip: isDark ? "Activer le mode clair" : "Activer le mode sombre",
            onPressed: () => ref.read(themeModeProvider.notifier).toggleTheme(context),
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: "Actualiser",
            onPressed: _refreshAll,
          ),
        ],
      ),
      // UN SEUL BOUTON PRINCIPAL D'ACTION FLOTTANT : APPROVISIONNER (+)
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'fab_procurement',
        onPressed: () => _openProcurementDialog(invState.items),
        backgroundColor: AppColors.success,
        icon: const Icon(Icons.add_shopping_cart_rounded, color: Colors.white, size: 19),
        label: const Text(
          "Approvisionner (+)",
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _refreshAll,
        child: Column(
          children: [
            // Onglets principaux : Stocks en magasin vs Journal des approvisionnements
            Container(
              decoration: BoxDecoration(
                color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                border: Border(
                  bottom: BorderSide(
                    color: isDark ? AppColors.borderDark : AppColors.borderLight,
                  ),
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () {
                        setState(() => _activeTabIndex = 0);
                        ref.read(inventoryProvider.notifier).loadItems(showLoading: false);
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 13),
                        decoration: BoxDecoration(
                          border: Border(
                            bottom: BorderSide(
                              color: _activeTabIndex == 0 ? AppColors.primary : Colors.transparent,
                              width: 3,
                            ),
                          ),
                        ),
                        alignment: Alignment.center,
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.warehouse_rounded,
                              size: 17,
                              color: _activeTabIndex == 0
                                  ? AppColors.primary
                                  : (isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              "Stocks en magasin (${invState.items.length})",
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: _activeTabIndex == 0 ? FontWeight.bold : FontWeight.w600,
                                color: _activeTabIndex == 0
                                    ? AppColors.primary
                                    : (isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: InkWell(
                      onTap: () {
                        setState(() => _activeTabIndex = 1);
                        ref.read(inventoryProvider.notifier).loadMovements(showLoading: false);
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 13),
                        decoration: BoxDecoration(
                          border: Border(
                            bottom: BorderSide(
                              color: _activeTabIndex == 1 ? AppColors.primary : Colors.transparent,
                              width: 3,
                            ),
                          ),
                        ),
                        alignment: Alignment.center,
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.history_edu_rounded,
                              size: 17,
                              color: _activeTabIndex == 1
                                  ? AppColors.primary
                                  : (isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              "Journal des flux (${invState.movements.length})",
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: _activeTabIndex == 1 ? FontWeight.bold : FontWeight.w600,
                                color: _activeTabIndex == 1
                                    ? AppColors.primary
                                    : (isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Contenu
            Expanded(
              child: invState.isLoading
                  ? const Center(child: BrandLoader(message: "Chargement des stocks..."))
                  : (_activeTabIndex == 0
                      // ==========================================
                      // ONGLET 0 : ÉTAT DES STOCKS EN MAGASIN
                      // ==========================================
                      ? SingleChildScrollView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          padding: const EdgeInsets.fromLTRB(16, 12, 16, 95),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // En-tête KPI de valorisation marchande
                              Padding(
                                padding: const EdgeInsets.only(bottom: 12, top: 2),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Text(
                                              CurrencyFormatter.formatFcfa(summary.estimatedTotalValue),
                                              style: const TextStyle(
                                                fontSize: 22,
                                                fontWeight: FontWeight.w900,
                                                fontFamily: 'monospace',
                                                color: AppColors.primary,
                                              ),
                                            ),
                                            const SizedBox(width: 4),
                                            const Text(
                                              "FCFA",
                                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                                            ),
                                          ],
                                        ),
                                        Text(
                                          "${summary.totalItems} références • ${summary.lowStockCount} alerte(s) réappro",
                                          style: TextStyle(
                                            fontSize: 11,
                                            color: summary.lowStockCount > 0 ? AppColors.danger : AppColors.textMutedLight,
                                            fontWeight: summary.lowStockCount > 0 ? FontWeight.bold : FontWeight.normal,
                                          ),
                                        ),
                                      ],
                                    ),
                                    ElevatedButton.icon(
                                      onPressed: _openCreateItemDialog,
                                      icon: const Icon(Icons.add_rounded, size: 16),
                                      label: const Text("Nouveau produit", style: TextStyle(fontSize: 12)),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: AppColors.primary,
                                        foregroundColor: Colors.white,
                                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                      ),
                                    ),
                                  ],
                                ),
                              ),

                              // Barre de recherche rapide
                              TextField(
                                onChanged: (val) => setState(() => _searchQuery = val),
                                decoration: InputDecoration(
                                  hintText: "Rechercher un aliment, vaccin, intrant...",
                                  prefixIcon: const Icon(Icons.search_rounded, size: 18),
                                  filled: true,
                                  fillColor: isDark ? AppColors.surfaceDark : AppColors.inputFillLight,
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(12),
                                    borderSide: BorderSide.none,
                                  ),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                ),
                              ),
                              const SizedBox(height: 10),

                              // Filtres par catégorie
                              SingleChildScrollView(
                                scrollDirection: Axis.horizontal,
                                child: Row(
                                  children: [
                                    _buildCategoryTab(null, "Tous", isDark, invState.selectedCategory),
                                    const SizedBox(width: 6),
                                    _buildCategoryTab("FEED", "Aliments complets", isDark, invState.selectedCategory),
                                    const SizedBox(width: 6),
                                    _buildCategoryTab("RAW_MATERIAL", "Matières premières", isDark, invState.selectedCategory),
                                    const SizedBox(width: 6),
                                    _buildCategoryTab("MEDICINE", "Santé / Soins", isDark, invState.selectedCategory),
                                    const SizedBox(width: 6),
                                    _buildCategoryTab("EQUIPMENT", "Matériel", isDark, invState.selectedCategory),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 14),

                              // Liste des produits en stock
                              if (filteredItems.isEmpty)
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
                                      Icon(Icons.inventory_2_outlined, size: 48, color: AppColors.primary.withValues(alpha: 0.6)),
                                      const SizedBox(height: 12),
                                      const Text(
                                        "Aucun article trouvé",
                                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                                      ),
                                      const SizedBox(height: 6),
                                      const Text(
                                        "Créez vos aliments et intrants pour suivre vos stocks et recevoir des alertes de réapprovisionnement.",
                                        textAlign: TextAlign.center,
                                        style: TextStyle(fontSize: 12, color: AppColors.textMutedLight),
                                      ),
                                      const SizedBox(height: 16),
                                      ElevatedButton.icon(
                                        onPressed: _openCreateItemDialog,
                                        icon: const Icon(Icons.add, size: 18),
                                        label: const Text("Créer un produit"),
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: AppColors.primary,
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
                                  itemCount: filteredItems.length,
                                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                                  itemBuilder: (context, index) {
                                    final item = filteredItems[index];

                                    final isBag = item.unit == "BAG" ||
                                        item.unit == "BAG_50KG" ||
                                        item.unit == "BAG_25KG";
                                    final bagWeight = item.packageWeightKg ?? 50.0;
                                    final totalKg = (item.currentStock * bagWeight).toStringAsFixed(0);
                                    final stockCount = item.currentStock % 1 == 0
                                        ? item.currentStock.toInt().toString()
                                        : item.currentStock.toStringAsFixed(1);

                                    return Card(
                                      clipBehavior: Clip.antiAlias,
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                      child: InkWell(
                                        onTap: () {
                                          Navigator.of(context).push(
                                            MaterialPageRoute(
                                              builder: (_) => InventoryDetailScreen(
                                                item: item,
                                                onOpenProcurement: (items, {preselectedItemId}) {
                                                  _openProcurementDialog(items, preselectedItemId: preselectedItemId);
                                                },
                                              ),
                                            ),
                                          ).then((_) => _refreshAll());
                                        },
                                        child: Padding(
                                          padding: const EdgeInsets.all(14),
                                          child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            // Ligne 1 : Nom du produit + Badge alerte
                                            Row(
                                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                              children: [
                                                Expanded(
                                                  child: Text(
                                                    item.name,
                                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                                  ),
                                                ),
                                                if (item.isLowStock)
                                                  Container(
                                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                                    decoration: BoxDecoration(
                                                      color: AppColors.danger.withValues(alpha: 0.12),
                                                      borderRadius: BorderRadius.circular(6),
                                                      border: Border.all(color: AppColors.danger.withValues(alpha: 0.3)),
                                                    ),
                                                    child: const Row(
                                                      mainAxisSize: MainAxisSize.min,
                                                      children: [
                                                        Icon(Icons.warning_amber_rounded, size: 12, color: AppColors.danger),
                                                        SizedBox(width: 3),
                                                        Text(
                                                          "Alerte réappro",
                                                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.danger),
                                                        ),
                                                      ],
                                                    ),
                                                  ),
                                              ],
                                            ),
                                            const SizedBox(height: 4),

                                            // Ligne 2 : Catégorie
                                            Text(
                                              item.categoryLabel,
                                              style: TextStyle(
                                                fontSize: 11,
                                                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                              ),
                                            ),
                                            const SizedBox(height: 12),

                                            // Ligne 3 : Affichage Intelligent de la Quantité et de la Mesure réelle
                                            Row(
                                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                              crossAxisAlignment: CrossAxisAlignment.end,
                                              children: [
                                                Column(
                                                  crossAxisAlignment: CrossAxisAlignment.start,
                                                  children: [
                                                    Text(
                                                      "Disponible en magasin",
                                                      style: TextStyle(
                                                        fontSize: 10,
                                                        color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                                      ),
                                                    ),
                                                    const SizedBox(height: 2),
                                                    Row(
                                                      crossAxisAlignment: CrossAxisAlignment.baseline,
                                                      textBaseline: TextBaseline.alphabetic,
                                                      children: [
                                                        Text(
                                                          stockCount,
                                                          style: TextStyle(
                                                            fontSize: 22,
                                                            fontWeight: FontWeight.w900,
                                                            fontFamily: 'monospace',
                                                            color: item.isLowStock ? AppColors.danger : AppColors.primary,
                                                          ),
                                                        ),
                                                        const SizedBox(width: 4),
                                                        Text(
                                                          item.unitShortLabel,
                                                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                                                        ),
                                                      ],
                                                    ),
                                                    // Indication du poids réel en kg pour les sacs
                                                    if (isBag && item.currentStock > 0)
                                                      Text(
                                                        "Soit ~ $totalKg kg (sac de ${bagWeight.toStringAsFixed(bagWeight % 1 == 0 ? 0 : 1)} kg)",
                                                        style: const TextStyle(
                                                          fontSize: 11,
                                                          fontWeight: FontWeight.w600,
                                                          color: AppColors.primary,
                                                        ),
                                                      ),
                                                  ],
                                                ),

                                                // BOUTON UNIQUE ET CLAIR D'ACTION : APPROVISIONNER (+)
                                                ElevatedButton.icon(
                                                  onPressed: () => _openProcurementDialog(
                                                    invState.items,
                                                    preselectedItemId: item.id,
                                                  ),
                                                  icon: const Icon(Icons.add_shopping_cart_rounded, size: 14),
                                                  label: const Text(
                                                    "Approvisionner (+)",
                                                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                                                  ),
                                                  style: ElevatedButton.styleFrom(
                                                    backgroundColor: AppColors.success,
                                                    foregroundColor: Colors.white,
                                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                                    elevation: 0,
                                                  ),
                                                ),
                                              ],
                                            ),

                                            const SizedBox(height: 10),
                                            Divider(height: 1, color: isDark ? AppColors.borderDark : AppColors.borderLight),
                                            const SizedBox(height: 8),

                                            // Ligne 4 : Prix unitaire, Seuil d'alerte, Valeur
                                            Row(
                                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                              children: [
                                                if (item.unitPrice != null)
                                                  Text(
                                                    "Prix : ${CurrencyFormatter.formatFcfa(item.unitPrice!)} FCFA / ${item.unitShortLabel}",
                                                    style: TextStyle(
                                                      fontSize: 11,
                                                      fontFamily: 'monospace',
                                                      color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                                    ),
                                                  ),
                                                if (item.alertThreshold != null)
                                                  Text(
                                                    "Seuil alerte : ${item.alertThreshold!.toStringAsFixed(item.alertThreshold! % 1 == 0 ? 0 : 1)} ${item.unitShortLabel}",
                                                    style: TextStyle(
                                                      fontSize: 11,
                                                      color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                                    ),
                                                  ),
                                              ],
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
                        )
                      // ==========================================
                      // ONGLET 1 : JOURNAL DES APPROVISIONNEMENTS & FLUX
                      // ==========================================
                      : SingleChildScrollView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          padding: const EdgeInsets.fromLTRB(16, 12, 16, 95),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // En-tête : Titre & Tri par date
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text(
                                    "Historique des flux",
                                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                                  ),
                                  Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      IconButton(
                                        icon: const Icon(Icons.refresh_rounded, size: 20),
                                        tooltip: "Actualiser les flux",
                                        visualDensity: VisualDensity.compact,
                                        onPressed: () => ref.read(inventoryProvider.notifier).loadMovements(showLoading: true),
                                      ),
                                      const SizedBox(width: 4),
                                      InkWell(
                                        onTap: () => ref.read(inventoryProvider.notifier).toggleDateSortOrder(),
                                        borderRadius: BorderRadius.circular(8),
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                          decoration: BoxDecoration(
                                            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                                            borderRadius: BorderRadius.circular(8),
                                            border: Border.all(
                                              color: isDark ? AppColors.borderDark : AppColors.borderLight,
                                            ),
                                          ),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              Icon(
                                                invState.isDateDesc ? Icons.arrow_downward_rounded : Icons.arrow_upward_rounded,
                                                size: 14,
                                                color: AppColors.primary,
                                              ),
                                              const SizedBox(width: 4),
                                              Text(
                                                invState.isDateDesc ? "Plus récents d'abord" : "Plus anciens d'abord",
                                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                              const SizedBox(height: 10),

                              // Filtres par type de flux (Tous, Approvisionnements (+), Consommations (-), Pertes)
                              SingleChildScrollView(
                                scrollDirection: Axis.horizontal,
                                child: Row(
                                  children: [
                                    _buildMovementTypeFilterChip(
                                      null,
                                      "Tous (${invState.movements.length})",
                                      isDark,
                                      invState.movementTypeFilter,
                                    ),
                                    const SizedBox(width: 6),
                                    _buildMovementTypeFilterChip(
                                      "INCOMING",
                                      "Approvisionnements (+) (${invState.movements.where((m) => m.isIncoming).length})",
                                      isDark,
                                      invState.movementTypeFilter,
                                      activeColor: AppColors.success,
                                    ),
                                    const SizedBox(width: 6),
                                    _buildMovementTypeFilterChip(
                                      "FEEDING",
                                      "Consommations (-) (${invState.movements.where((m) => m.isFeeding).length})",
                                      isDark,
                                      invState.movementTypeFilter,
                                      activeColor: AppColors.accent,
                                    ),
                                    const SizedBox(width: 6),
                                    _buildMovementTypeFilterChip(
                                      "LOSS",
                                      "Pertes & Avaries (${invState.movements.where((m) => m.isLoss).length})",
                                      isDark,
                                      invState.movementTypeFilter,
                                      activeColor: AppColors.danger,
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 14),

                              // Liste des mouvements (Tableau mobile sous forme de cartes structurées)
                              if (invState.error != null && filteredMovements.isEmpty)
                                Container(
                                  padding: const EdgeInsets.all(24),
                                  alignment: Alignment.center,
                                  decoration: BoxDecoration(
                                    color: AppColors.danger.withValues(alpha: 0.08),
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(color: AppColors.danger.withValues(alpha: 0.3)),
                                  ),
                                  child: Column(
                                    children: [
                                      const Icon(Icons.error_outline_rounded, size: 44, color: AppColors.danger),
                                      const SizedBox(height: 10),
                                      Text(
                                        "Impossible de charger les flux",
                                        style: TextStyle(
                                          fontSize: 15,
                                          fontWeight: FontWeight.bold,
                                          color: isDark ? Colors.white : AppColors.textMainLight,
                                        ),
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        invState.error!,
                                        textAlign: TextAlign.center,
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                        ),
                                      ),
                                      const SizedBox(height: 14),
                                      ElevatedButton.icon(
                                        onPressed: () => ref.read(inventoryProvider.notifier).loadMovements(showLoading: true),
                                        icon: const Icon(Icons.refresh_rounded, size: 16),
                                        label: const Text("Réessayer"),
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: AppColors.primary,
                                          foregroundColor: Colors.white,
                                        ),
                                      ),
                                    ],
                                  ),
                                )
                              else if (filteredMovements.isEmpty)
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
                                      Icon(Icons.history_rounded, size: 48, color: AppColors.primary.withValues(alpha: 0.6)),
                                      const SizedBox(height: 12),
                                      const Text(
                                        "Aucun mouvement dans cette vue",
                                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                                      ),
                                      const SizedBox(height: 6),
                                      const Text(
                                        "Vos approvisionnements et consommations d'aliments s'afficheront ici avec le détail des quantités et montants.",
                                        textAlign: TextAlign.center,
                                        style: TextStyle(fontSize: 12, color: AppColors.textMutedLight),
                                      ),
                                      const SizedBox(height: 14),
                                      OutlinedButton.icon(
                                        onPressed: () => ref.read(inventoryProvider.notifier).loadMovements(showLoading: true),
                                        icon: const Icon(Icons.refresh_rounded, size: 16),
                                        label: const Text("Actualiser les flux"),
                                      ),
                                    ],
                                  ),
                                )
                              else
                                ListView.separated(
                                  shrinkWrap: true,
                                  physics: const NeverScrollableScrollPhysics(),
                                  itemCount: filteredMovements.length,
                                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                                  itemBuilder: (context, index) {
                                    final m = filteredMovements[index];
                                    final isInc = m.isIncoming;
                                    final isLoss = m.isLoss;

                                    Color badgeBg;
                                    Color badgeText;
                                    String badgeLabel;
                                    IconData badgeIcon;

                                    if (isInc) {
                                      badgeBg = AppColors.success.withValues(alpha: 0.12);
                                      badgeText = AppColors.success;
                                      badgeLabel = "+ Approvisionnement";
                                      badgeIcon = Icons.add_shopping_cart_rounded;
                                    } else if (isLoss) {
                                      badgeBg = AppColors.danger.withValues(alpha: 0.12);
                                      badgeText = AppColors.danger;
                                      badgeLabel = "! Perte";
                                      badgeIcon = Icons.warning_amber_rounded;
                                    } else {
                                      badgeBg = AppColors.accent.withValues(alpha: 0.12);
                                      badgeText = AppColors.accent;
                                      badgeLabel = "- Consommation";
                                      badgeIcon = Icons.remove_circle_outline_rounded;
                                    }

                                    return Container(
                                      decoration: BoxDecoration(
                                        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                                        borderRadius: BorderRadius.circular(14),
                                        border: Border.all(
                                          color: isDark ? AppColors.borderDark : AppColors.borderLight,
                                        ),
                                      ),
                                      padding: const EdgeInsets.all(12),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          // Badge flux & Date
                                          Row(
                                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                            children: [
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                                decoration: BoxDecoration(
                                                  color: badgeBg,
                                                  borderRadius: BorderRadius.circular(6),
                                                ),
                                                child: Row(
                                                  mainAxisSize: MainAxisSize.min,
                                                  children: [
                                                    Icon(badgeIcon, size: 12, color: badgeText),
                                                    const SizedBox(width: 4),
                                                    Text(
                                                      badgeLabel,
                                                      style: TextStyle(
                                                        fontSize: 11,
                                                        fontWeight: FontWeight.bold,
                                                        color: badgeText,
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              ),
                                              Text(
                                                m.movementDate,
                                                style: TextStyle(
                                                  fontSize: 11,
                                                  fontWeight: FontWeight.w600,
                                                  color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                                ),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 8),

                                          // Produit & Quantité
                                          Row(
                                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                            children: [
                                              Expanded(
                                                child: Text(
                                                  m.itemName,
                                                  style: const TextStyle(
                                                    fontSize: 14,
                                                    fontWeight: FontWeight.bold,
                                                  ),
                                                ),
                                              ),
                                              Text(
                                                "${isInc ? '+' : '-'}${m.quantity % 1 == 0 ? m.quantity.toInt() : m.quantity} ${m.unitShortLabel}",
                                                style: TextStyle(
                                                  fontSize: 16,
                                                  fontWeight: FontWeight.w900,
                                                  fontFamily: 'monospace',
                                                  color: badgeText,
                                                ),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 6),

                                          // Détails : Coût total d'achat ou bande liée
                                          Wrap(
                                            spacing: 8,
                                            runSpacing: 4,
                                            crossAxisAlignment: WrapCrossAlignment.center,
                                            children: [
                                              if (isInc && m.totalCost != null && m.totalCost! > 0)
                                                Container(
                                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                  decoration: BoxDecoration(
                                                    color: AppColors.success.withValues(alpha: 0.08),
                                                    borderRadius: BorderRadius.circular(4),
                                                  ),
                                                  child: Text(
                                                    "Coût : ${CurrencyFormatter.formatFcfa(m.totalCost!)} FCFA${m.unitPrice != null ? ' (${CurrencyFormatter.formatFcfa(m.unitPrice!)} FCFA/u)' : ''}",
                                                    style: const TextStyle(
                                                      fontSize: 11,
                                                      fontWeight: FontWeight.w600,
                                                      color: AppColors.success,
                                                    ),
                                                  ),
                                                ),
                                              if (m.flockName != null && m.flockName!.isNotEmpty)
                                                Container(
                                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                  decoration: BoxDecoration(
                                                    color: AppColors.primarySoft,
                                                    borderRadius: BorderRadius.circular(4),
                                                  ),
                                                  child: Text(
                                                    "Lot : ${m.flockName}",
                                                    style: const TextStyle(
                                                      fontSize: 11,
                                                      fontWeight: FontWeight.w600,
                                                      color: AppColors.primary,
                                                    ),
                                                  ),
                                                ),
                                              if (m.reason != null && m.reason!.trim().isNotEmpty)
                                                Text(
                                                  m.reason!,
                                                  style: TextStyle(
                                                    fontSize: 11,
                                                    fontStyle: FontStyle.italic,
                                                    color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                                  ),
                                                ),
                                            ],
                                          ),
                                        ],
                                      ),
                                    );
                                  },
                                ),
                            ],
                          ),
                        )),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoryTab(String? code, String label, bool isDark, String? currentSelected) {
    final isSelected = currentSelected == code;
    return InkWell(
      onTap: () => ref.read(inventoryProvider.notifier).setCategoryFilter(code),
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.primary
              : (isDark ? AppColors.surfaceDark : AppColors.inputFillLight),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? AppColors.primary : (isDark ? AppColors.borderDark : AppColors.borderLight),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
            color: isSelected ? Colors.white : (isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
          ),
        ),
      ),
    );
  }

  Widget _buildMovementTypeFilterChip(
    String? type,
    String label,
    bool isDark,
    String? currentFilter, {
    Color activeColor = AppColors.primary,
  }) {
    final isSelected = currentFilter == type;
    return InkWell(
      onTap: () => ref.read(inventoryProvider.notifier).setMovementTypeFilter(type),
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? activeColor : (isDark ? AppColors.surfaceDark : AppColors.surfaceLight),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? activeColor : (isDark ? AppColors.borderDark : AppColors.borderLight),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
            color: isSelected ? Colors.white : (isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
          ),
        ),
      ),
    );
  }
}

class _QuickQtyBtn extends StatelessWidget {
  final String label;
  final VoidCallback onTap;

  const _QuickQtyBtn({
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: AppColors.primarySoft,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AppColors.primary.withValues(alpha: 0.25)),
        ),
        child: Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            color: AppColors.primary,
          ),
        ),
      ),
    );
  }
}
