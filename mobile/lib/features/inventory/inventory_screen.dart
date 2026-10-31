import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/theme_provider.dart';
import '../../core/utils/currency_formatter.dart';
import '../../core/models/inventory_item.dart';
import '../flocks/flock_provider.dart';
import '../../core/widgets/brand_loader.dart';
import 'inventory_provider.dart';

class InventoryScreen extends ConsumerStatefulWidget {
  const InventoryScreen({super.key});

  @override
  ConsumerState<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends ConsumerState<InventoryScreen> {
  void _openStockMovementDialog(List<InventoryItem> items, [String? preselectedItemId]) {
    if (items.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Aucun article en stock pour enregistrer un mouvement."),
          backgroundColor: AppColors.danger,
        ),
      );
      return;
    }

    String selectedItemId = preselectedItemId ?? items.first.id;
    if (!items.any((i) => i.id == selectedItemId)) {
      selectedItemId = items.first.id;
    }

    String movementType = "FEEDING"; // 'FEEDING' = distribution / sortie, 'INCOMING' = entrée, 'LOSS' = perte
    final qtyController = TextEditingController(text: "1");
    final reasonController = TextEditingController();
    DateTime movementDate = DateTime.now();
    String? selectedFlockId;

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
          final flockState = ref.watch(flockProvider);
          final currentItem = items.firstWhere((i) => i.id == selectedItemId, orElse: () => items.first);

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
                        movementType == "FEEDING" ? "Distribution / Déstockage" : "Entrée de Stock",
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Bascule Distribution (Sortie) / Entrée
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
                            onTap: () => setModalState(() => movementType = "FEEDING"),
                            borderRadius: BorderRadius.circular(10),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              decoration: BoxDecoration(
                                color: movementType == "FEEDING" ? AppColors.primary : Colors.transparent,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                "Sortie / Nourrir",
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                  color: movementType == "FEEDING" ? Colors.white : AppColors.textMutedLight,
                                ),
                              ),
                            ),
                          ),
                        ),
                        Expanded(
                          child: InkWell(
                            onTap: () => setModalState(() => movementType = "INCOMING"),
                            borderRadius: BorderRadius.circular(10),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              decoration: BoxDecoration(
                                color: movementType == "INCOMING" ? AppColors.success : Colors.transparent,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                "Entrée / Réappro (+)",
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                  color: movementType == "INCOMING" ? Colors.white : AppColors.textMutedLight,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Article concerné
                  const Text("Article en stock *", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
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
                        value: selectedItemId,
                        isExpanded: true,
                        items: items.map((item) {
                          return DropdownMenuItem<String>(
                            value: item.id,
                            child: Text(
                              "${item.name} (${item.currentStock} ${item.unitShortLabel})",
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                            ),
                          );
                        }).toList(),
                        onChanged: (val) {
                          if (val != null) {
                            setModalState(() => selectedItemId = val);
                          }
                        },
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Si distribution d'aliment : Bande destinataire optionnelle
                  if (movementType == "FEEDING" && flockState.flocks.isNotEmpty) ...[
                    const Text("Bande destinataire (optionnel)", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
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
                          value: selectedFlockId,
                          isExpanded: true,
                          hint: const Text("Toutes les bandes / Non assigné", style: TextStyle(fontSize: 13)),
                          items: [
                            const DropdownMenuItem<String?>(
                              value: null,
                              child: Text("Non assigné / Global", style: TextStyle(fontSize: 13)),
                            ),
                            ...flockState.flocks.map((flock) {
                              return DropdownMenuItem<String?>(
                                value: flock.id,
                                child: Text(flock.name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                              );
                            }),
                          ],
                          onChanged: (val) => setModalState(() => selectedFlockId = val),
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),
                  ],

                  // Quantité
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: qtyController,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                          decoration: InputDecoration(
                            labelText: "Quantité (${currentItem.unitShortLabel}) *",
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            contentPadding: const EdgeInsets.all(12),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _QuickQtyBtn(
                          label: "+1",
                          onTap: () {
                            final cur = double.tryParse(qtyController.text) ?? 0.0;
                            setModalState(() => qtyController.text = (cur + 1).toStringAsFixed(0));
                          },
                        ),
                        const SizedBox(width: 6),
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
                          label: "+25",
                          onTap: () {
                            final cur = double.tryParse(qtyController.text) ?? 0.0;
                            setModalState(() => qtyController.text = (cur + 25).toStringAsFixed(0));
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
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Motif
                  TextField(
                    controller: reasonController,
                    decoration: InputDecoration(
                      labelText: "Motif / Observation (optionnel)",
                      hintText: "Ex: Distribution repas du matin, arrivage fournisseur...",
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
                          onPressed: !invState.isSubmitting
                              ? () async {
                                  final qty = double.tryParse(qtyController.text.trim()) ?? 0.0;
                                  if (qty <= 0.0) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(
                                        content: Text("Veuillez saisir une quantité positive valide."),
                                        backgroundColor: AppColors.danger,
                                      ),
                                    );
                                    return;
                                  }

                                  final messenger = ScaffoldMessenger.of(context);
                                  final navigator = Navigator.of(ctx);

                                  final success = await ref.read(inventoryProvider.notifier).recordMovement(
                                    itemId: selectedItemId,
                                    type: movementType,
                                    quantity: qty,
                                    date: movementDate,
                                    flockId: selectedFlockId,
                                    reason: reasonController.text,
                                  );

                                  if (ctx.mounted) {
                                    if (success) {
                                      navigator.pop();
                                      messenger.showSnackBar(
                                        SnackBar(
                                          content: Text("Mouvement de $qty ${currentItem.unitShortLabel} enregistré"),
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
                            backgroundColor: movementType == "FEEDING" ? AppColors.primary : AppColors.success,
                            foregroundColor: Colors.white,
                          ),
                          child: invState.isSubmitting
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
        },
      ),
    );
  }

  void _openCreateItemDialog() {
    final nameController = TextEditingController();
    final stockController = TextEditingController(text: "0");
    final alertController = TextEditingController();
    final priceController = TextEditingController();
    String category = "FEED";
    String unit = "BAG_50KG";

    final categories = [
      {"code": "FEED", "label": "Aliments complets"},
      {"code": "RAW_MATERIAL", "label": "Matières premières (maïs...)"},
      {"code": "MEDICINE", "label": "Vétérinaire & Vaccins"},
      {"code": "LITTER", "label": "Litière / Copeaux"},
      {"code": "EQUIPMENT", "label": "Matériel d'élevage"},
      {"code": "OTHER", "label": "Autre intrant"},
    ];

    final units = [
      {"code": "BAG_50KG", "label": "Sacs de 50 kg"},
      {"code": "BAG_25KG", "label": "Sacs de 25 kg"},
      {"code": "KG", "label": "Kilogrammes (kg)"},
      {"code": "LITER", "label": "Litres (L)"},
      {"code": "DOSE", "label": "Doses"},
      {"code": "UNIT", "label": "Unités"},
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
                        "Nouvel Article en Stock",
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Nom
                  TextField(
                    controller: nameController,
                    decoration: InputDecoration(
                      labelText: "Désignation de l'article *",
                      hintText: "Ex: Aliment Ponte 50kg, Maïs grain...",
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
                      color: isDark ? Colors.grey.shade900 : Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: borderColor),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: category,
                        isExpanded: true,
                        items: categories.map((c) {
                          return DropdownMenuItem<String>(
                            value: c['code'],
                            child: Text(c['label']!, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                          );
                        }).toList(),
                        onChanged: (val) {
                          if (val != null) setModalState(() => category = val);
                        },
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Unité
                  const Text("Unité de gestion *", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
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
                        value: unit,
                        isExpanded: true,
                        items: units.map((u) {
                          return DropdownMenuItem<String>(
                            value: u['code'],
                            child: Text(u['label']!, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                          );
                        }).toList(),
                        onChanged: (val) {
                          if (val != null) setModalState(() => unit = val);
                        },
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Stock initial & Seuil alerte
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: stockController,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          decoration: InputDecoration(
                            labelText: "Stock initial",
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
                            labelText: "Seuil d'alerte",
                            hintText: "Ex: 5",
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            contentPadding: const EdgeInsets.all(12),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Prix unitaire
                  TextField(
                    controller: priceController,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      labelText: "Prix unitaire (FCFA)",
                      hintText: "Ex: 18500",
                      suffixText: "FCFA",
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      contentPadding: const EdgeInsets.all(12),
                    ),
                  ),
                  const SizedBox(height: 18),

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
                                  final alertThreshold = double.tryParse(alertController.text.trim());
                                  final unitPrice = int.tryParse(priceController.text.trim());

                                  final messenger = ScaffoldMessenger.of(context);
                                  final navigator = Navigator.of(ctx);

                                  final success = await ref.read(inventoryProvider.notifier).createItem(
                                    name: name,
                                    category: category,
                                    unit: unit,
                                    initialStock: initialStock,
                                    alertThreshold: alertThreshold,
                                    unitPrice: unitPrice,
                                  );

                                  if (ctx.mounted) {
                                    if (success) {
                                      navigator.pop();
                                      messenger.showSnackBar(
                                        SnackBar(
                                          content: Text("Article $name créé avec succès !"),
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
                          ),
                          child: invState.isSubmitting
                              ? const BrandLoader.button()
                              : const Text("Créer l'article"),
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
      if (invState.selectedCategory == null) return true;
      return i.category == invState.selectedCategory;
    }).toList();

    return Scaffold(
      appBar: AppBar(
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
            onPressed: () => ref.read(inventoryProvider.notifier).loadItems(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openStockMovementDialog(invState.items),
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.swap_horiz_rounded, color: Colors.white),
        label: const Text("Nourrir / Mouvement", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(inventoryProvider.notifier).loadItems(showLoading: false),
        child: invState.isLoading
            ? const Center(child: BrandLoader(message: "Chargement des stocks..."))
            : SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 90),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // En-tête simple et aéré (sans carte encombrante)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12, top: 4),
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
                                "${summary.totalItems} références • ${summary.lowStockCount} alerte(s)",
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
                            label: const Text("Nouvel article", style: TextStyle(fontSize: 12)),
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
                              onTap: () => ref.read(inventoryProvider.notifier).setCategoryFilter(null),
                              borderRadius: BorderRadius.circular(10),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 8),
                                decoration: BoxDecoration(
                                  color: invState.selectedCategory == null
                                      ? (isDark ? AppColors.surfaceDark : Colors.white)
                                      : Colors.transparent,
                                  borderRadius: BorderRadius.circular(10),
                                  boxShadow: invState.selectedCategory == null
                                      ? [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4)]
                                      : null,
                                ),
                                alignment: Alignment.center,
                                child: Text(
                                  "Tous",
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: invState.selectedCategory == null ? FontWeight.bold : FontWeight.w500,
                                    color: invState.selectedCategory == null
                                        ? AppColors.primary
                                        : AppColors.textMutedLight,
                                  ),
                                ),
                              ),
                            ),
                          ),
                          Expanded(
                            child: InkWell(
                              onTap: () => ref.read(inventoryProvider.notifier).setCategoryFilter("FEED"),
                              borderRadius: BorderRadius.circular(10),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 8),
                                decoration: BoxDecoration(
                                  color: invState.selectedCategory == "FEED"
                                      ? (isDark ? AppColors.surfaceDark : Colors.white)
                                      : Colors.transparent,
                                  borderRadius: BorderRadius.circular(10),
                                  boxShadow: invState.selectedCategory == "FEED"
                                      ? [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4)]
                                      : null,
                                ),
                                alignment: Alignment.center,
                                child: Text(
                                  "Aliments",
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: invState.selectedCategory == "FEED" ? FontWeight.bold : FontWeight.w500,
                                    color: invState.selectedCategory == "FEED"
                                        ? AppColors.primary
                                        : AppColors.textMutedLight,
                                  ),
                                ),
                              ),
                            ),
                          ),
                          Expanded(
                            child: InkWell(
                              onTap: () => ref.read(inventoryProvider.notifier).setCategoryFilter("MEDICINE"),
                              borderRadius: BorderRadius.circular(10),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 8),
                                decoration: BoxDecoration(
                                  color: invState.selectedCategory == "MEDICINE"
                                      ? (isDark ? AppColors.surfaceDark : Colors.white)
                                      : Colors.transparent,
                                  borderRadius: BorderRadius.circular(10),
                                  boxShadow: invState.selectedCategory == "MEDICINE"
                                      ? [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4)]
                                      : null,
                                ),
                                alignment: Alignment.center,
                                child: Text(
                                  "Santé & Intrants",
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: invState.selectedCategory == "MEDICINE" ? FontWeight.bold : FontWeight.w500,
                                    color: invState.selectedCategory == "MEDICINE"
                                        ? AppColors.primary
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
                          "Articles en réserve",
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        Text(
                          "${filteredItems.length} référence(s)",
                          style: const TextStyle(fontSize: 12, color: AppColors.textMutedLight),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),

                    // Liste ou état vide
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
                              "Aucun article dans cette catégorie",
                              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 6),
                            const Text(
                              "Ajoutez vos sacs d'aliments et matières premières pour contrôler vos stocks et être alerté avant rupture.",
                              textAlign: TextAlign.center,
                              style: TextStyle(fontSize: 12, color: AppColors.textMutedLight),
                            ),
                            const SizedBox(height: 16),
                            ElevatedButton.icon(
                              onPressed: _openCreateItemDialog,
                              icon: const Icon(Icons.add, size: 18),
                              label: const Text("Ajouter un article"),
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

                          return Card(
                            child: Padding(
                              padding: const EdgeInsets.all(14),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
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
                                          child: const Text(
                                            "Alerte stock bas",
                                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.danger),
                                          ),
                                        ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    item.categoryLabel,
                                    style: const TextStyle(fontSize: 11, color: AppColors.textMutedLight),
                                  ),
                                  const SizedBox(height: 10),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          const Text("En réserve", style: TextStyle(fontSize: 10, color: AppColors.textMutedLight)),
                                          Text(
                                            "${item.currentStock.toStringAsFixed(item.currentStock % 1 == 0 ? 0 : 1)} ${item.unitShortLabel}",
                                            style: TextStyle(
                                              fontSize: 18,
                                              fontWeight: FontWeight.w900,
                                              fontFamily: 'monospace',
                                              color: item.isLowStock ? AppColors.danger : AppColors.primary,
                                            ),
                                          ),
                                        ],
                                      ),
                                      if (item.unitPrice != null)
                                        Column(
                                          crossAxisAlignment: CrossAxisAlignment.end,
                                          children: [
                                            const Text("Prix unitaire", style: TextStyle(fontSize: 10, color: AppColors.textMutedLight)),
                                            Text(
                                              CurrencyFormatter.formatFcfa(item.unitPrice!),
                                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                                            ),
                                          ],
                                        ),
                                      InkWell(
                                        onTap: () => _openStockMovementDialog(invState.items, item.id),
                                        borderRadius: BorderRadius.circular(8),
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                          decoration: BoxDecoration(
                                            color: AppColors.primarySoft,
                                            borderRadius: BorderRadius.circular(8),
                                            border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                                          ),
                                          child: const Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              Icon(Icons.swap_horiz, size: 14, color: AppColors.primary),
                                              SizedBox(width: 4),
                                              Text(
                                                "Mouvement",
                                                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary),
                                              ),
                                            ],
                                          ),
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
                  ],
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

