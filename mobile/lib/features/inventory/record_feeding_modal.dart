import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/models/inventory_item.dart';
import '../../core/theme/app_theme.dart';
import '../dashboard/dashboard_provider.dart';
import '../flocks/flock_provider.dart';
import 'inventory_provider.dart';

class RecordFeedingModal extends ConsumerStatefulWidget {
  final String? defaultFlockId;
  final VoidCallback? onSaved;

  const RecordFeedingModal({
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
      builder: (_) => RecordFeedingModal(
        defaultFlockId: defaultFlockId,
        onSaved: onSaved,
      ),
    );
  }

  @override
  ConsumerState<RecordFeedingModal> createState() => _RecordFeedingModalState();
}

class _RecordFeedingModalState extends ConsumerState<RecordFeedingModal> {
  String? _selectedFlockId;
  String? _selectedItemId;
  final _qtyController = TextEditingController(text: "5");
  final _reasonController = TextEditingController();
  final DateTime _movementDate = DateTime.now();

  @override
  void initState() {
    super.initState();
    _selectedFlockId = widget.defaultFlockId;
  }

  @override
  void dispose() {
    _qtyController.dispose();
    _reasonController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surfaceColor = isDark ? AppColors.surfaceDark : AppColors.surfaceLight;
    final borderColor = isDark ? AppColors.borderDark : AppColors.borderLight;
    final invState = ref.watch(inventoryProvider);
    final flockState = ref.watch(flockProvider);

    final flocks = flockState.flocks;
    if (_selectedFlockId == null && flocks.isNotEmpty) {
      _selectedFlockId = flocks.first.id;
    }

    // Filtre les aliments (catégorie FEED en priorité, sinon tous les articles)
    List<InventoryItem> feedItems = invState.items.where((i) => i.category == 'FEED').toList();
    if (feedItems.isEmpty) {
      feedItems = invState.items;
    }

    if (feedItems.isNotEmpty) {
      if (_selectedItemId == null || !feedItems.any((i) => i.id == _selectedItemId)) {
        _selectedItemId = feedItems.first.id;
      }
    }

    final currentItem = feedItems.isNotEmpty
        ? feedItems.firstWhere((i) => i.id == _selectedItemId, orElse: () => feedItems.first)
        : null;

    final unitLabel = currentItem?.unitShortLabel ?? "kg";

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
                    Icon(Icons.restaurant_rounded, color: AppColors.primary, size: 22),
                    SizedBox(width: 8),
                    Text(
                      "Distribution d'Aliment",
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

            // 1. Bande destinataire
            if (flocks.isEmpty) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.danger.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Text(
                  "Aucun lot actif trouvé pour la distribution.",
                  style: TextStyle(color: AppColors.danger, fontSize: 12, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(height: 12),
            ] else ...[
              const Text("Bande de volailles *", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
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
                        child: Row(
                          children: [
                            Icon(
                              f.isLayer ? Icons.egg_rounded : Icons.pets_rounded,
                              size: 16,
                              color: f.isLayer ? AppColors.accent : AppColors.primary,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              "${f.name} (${f.currentQuantity} sujets)",
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                            ),
                          ],
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
            ],

            // 2. Type d'Aliment en Stock
            const Text("Aliment / Intrant distribué *", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
            const SizedBox(height: 6),

            if (feedItems.isEmpty) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.accent.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.accent.withValues(alpha: 0.3)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.info_outline, color: AppColors.accent, size: 20),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        "Aucun sac d'aliment n'a encore été créé en stock. Rendez-vous dans Stocks & Intrants pour enregistrer vos réceptions.",
                        style: TextStyle(fontSize: 12, color: AppColors.accent, height: 1.3),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
            ] else ...[
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color: isDark ? Colors.grey.shade900 : Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: borderColor),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedItemId,
                    isExpanded: true,
                    items: feedItems.map((item) {
                      return DropdownMenuItem<String>(
                        value: item.id,
                        child: Text(
                          "${item.name} (Stock: ${item.currentStock.toStringAsFixed(1)} ${item.unitShortLabel})",
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                        ),
                      );
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) setState(() => _selectedItemId = val);
                    },
                  ),
                ),
              ),
              const SizedBox(height: 14),
            ],

            // 3. Quantité distribuée
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _qtyController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                    decoration: InputDecoration(
                      labelText: "Quantité distribuée ($unitLabel) *",
                      hintText: "Ex : 25",
                      prefixIcon: const Icon(Icons.scale_rounded),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      contentPadding: const EdgeInsets.all(12),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Raccourcis de quantité (+1, +5, +10, +25, +50)
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _QuickQtyChip(
                    label: "+1 $unitLabel",
                    onTap: () {
                      final cur = double.tryParse(_qtyController.text) ?? 0.0;
                      setState(() => _qtyController.text = (cur + 1).toStringAsFixed(0));
                    },
                  ),
                  const SizedBox(width: 6),
                  _QuickQtyChip(
                    label: "+5 $unitLabel",
                    onTap: () {
                      final cur = double.tryParse(_qtyController.text) ?? 0.0;
                      setState(() => _qtyController.text = (cur + 5).toStringAsFixed(0));
                    },
                  ),
                  const SizedBox(width: 6),
                  _QuickQtyChip(
                    label: "+10 $unitLabel",
                    onTap: () {
                      final cur = double.tryParse(_qtyController.text) ?? 0.0;
                      setState(() => _qtyController.text = (cur + 10).toStringAsFixed(0));
                    },
                  ),
                  const SizedBox(width: 6),
                  _QuickQtyChip(
                    label: "+25 $unitLabel (1/2 sac)",
                    onTap: () {
                      final cur = double.tryParse(_qtyController.text) ?? 0.0;
                      setState(() => _qtyController.text = (cur + 25).toStringAsFixed(0));
                    },
                  ),
                  const SizedBox(width: 6),
                  _QuickQtyChip(
                    label: "+50 $unitLabel (1 sac)",
                    onTap: () {
                      final cur = double.tryParse(_qtyController.text) ?? 0.0;
                      setState(() => _qtyController.text = (cur + 50).toStringAsFixed(0));
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // 4. Observation / Notes
            TextField(
              controller: _reasonController,
              decoration: InputDecoration(
                labelText: "Observations (optionnel)",
                hintText: "Ex: Repas du matin, ajout de vitamines...",
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
                    onPressed: (!invState.isSubmitting && _selectedItemId != null)
                        ? () async {
                            final qty = double.tryParse(_qtyController.text);
                            if (qty == null || qty <= 0) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text("Veuillez saisir une quantité valide"),
                                  backgroundColor: AppColors.danger,
                                ),
                              );
                              return;
                            }

                            final scaffoldMessenger = ScaffoldMessenger.of(context);
                            final navigator = Navigator.of(context);

                            final success = await ref.read(inventoryProvider.notifier).recordMovement(
                              itemId: _selectedItemId!,
                              type: "FEEDING",
                              quantity: qty,
                              date: _movementDate,
                              flockId: _selectedFlockId,
                              reason: _reasonController.text.trim().isNotEmpty
                                  ? _reasonController.text.trim()
                                  : "Distribution d'aliment",
                            );

                            if (mounted) {
                              if (success) {
                                ref.read(dashboardProvider.notifier).loadDashboard(showLoading: false);
                                widget.onSaved?.call();

                                navigator.pop(true);
                                scaffoldMessenger.showSnackBar(
                                  SnackBar(
                                    content: Text("Distribution de $qty $unitLabel enregistrée avec succès !"),
                                    backgroundColor: AppColors.success,
                                  ),
                                );
                              } else {
                                final err = ref.read(inventoryProvider).error ?? "Échec de l'enregistrement";
                                scaffoldMessenger.showSnackBar(
                                  SnackBar(content: Text(err), backgroundColor: AppColors.danger),
                                );
                              }
                            }
                          }
                        : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: invState.isSubmitting
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

class _QuickQtyChip extends StatelessWidget {
  final String label;
  final VoidCallback onTap;

  const _QuickQtyChip({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: Theme.of(context).brightness == Brightness.dark ? Colors.grey.shade900 : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
        ),
        child: Text(
          label,
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary),
        ),
      ),
    );
  }
}
