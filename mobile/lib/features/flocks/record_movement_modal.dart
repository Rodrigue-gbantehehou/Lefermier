import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../dashboard/dashboard_provider.dart';
import 'flock_provider.dart';

class RecordMovementModal extends ConsumerStatefulWidget {
  final String? defaultFlockId;
  final String initialType;
  final VoidCallback? onSaved;

  const RecordMovementModal({
    super.key,
    this.defaultFlockId,
    this.initialType = "MORTALITY",
    this.onSaved,
  });

  static Future<bool?> show(
    BuildContext context, {
    String? defaultFlockId,
    String initialType = "MORTALITY",
    VoidCallback? onSaved,
  }) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => RecordMovementModal(
        defaultFlockId: defaultFlockId,
        initialType: initialType,
        onSaved: onSaved,
      ),
    );
  }

  @override
  ConsumerState<RecordMovementModal> createState() => _RecordMovementModalState();
}

class _RecordMovementModalState extends ConsumerState<RecordMovementModal> {
  String? _selectedFlockId;
  late String _movementType;
  int _quantity = 1;
  final _reasonController = TextEditingController();
  final DateTime _movementDate = DateTime.now();

  @override
  void initState() {
    super.initState();
    _selectedFlockId = widget.defaultFlockId;
    _movementType = widget.initialType;
  }

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surfaceColor = isDark ? AppColors.surfaceDark : AppColors.surfaceLight;
    final borderColor = isDark ? AppColors.borderDark : AppColors.borderLight;
    final flockState = ref.watch(flockProvider);
    final flocks = flockState.flocks;

    if (_selectedFlockId == null && flocks.isNotEmpty) {
      _selectedFlockId = flocks.first.id;
    }

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
                      _movementType == "MORTALITY" ? Icons.heart_broken_rounded : Icons.sync_alt_rounded,
                      color: _movementType == "MORTALITY" ? AppColors.danger : AppColors.primary,
                      size: 22,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      _movementType == "MORTALITY" ? "Enregistrer une Mortalité" : "Mouvement de Bande",
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

            if (flocks.isEmpty) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.danger.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Text(
                  "Aucun lot actif trouvé.",
                  style: TextStyle(color: AppColors.danger, fontSize: 12, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(height: 12),
            ] else ...[
              // 1. Sélection de la bande
              const Text("Bande concernée *", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
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
                          "${f.name} (${f.currentQuantity} sujets vivants)",
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

              // 2. Type de mouvement
              const Text("Type d'événement *", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              Row(
                children: [
                  _TypeChip(
                    label: "Mortalité",
                    icon: Icons.heart_broken_rounded,
                    color: AppColors.danger,
                    isSelected: _movementType == "MORTALITY",
                    onTap: () => setState(() => _movementType = "MORTALITY"),
                  ),
                  const SizedBox(width: 8),
                  _TypeChip(
                    label: "Réforme",
                    icon: Icons.remove_circle_outline,
                    color: AppColors.accent,
                    isSelected: _movementType == "CULLING",
                    onTap: () => setState(() => _movementType = "CULLING"),
                  ),
                  const SizedBox(width: 8),
                  _TypeChip(
                    label: "Vente vifs",
                    icon: Icons.shopping_bag_outlined,
                    color: AppColors.success,
                    isSelected: _movementType == "SALE",
                    onTap: () => setState(() => _movementType = "SALE"),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // 3. Nombre de sujets
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Theme.of(context).brightness == Brightness.dark
                      ? Colors.grey.shade900
                      : Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: borderColor),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text("Nombre de sujets :", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    Row(
                      children: [
                        IconButton(
                          onPressed: _quantity > 1 ? () => setState(() => _quantity--) : null,
                          icon: const Icon(Icons.remove_circle_outline, size: 24, color: AppColors.danger),
                        ),
                        Container(
                          constraints: const BoxConstraints(minWidth: 40),
                          alignment: Alignment.center,
                          child: Text(
                            "$_quantity",
                            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, fontFamily: 'monospace'),
                          ),
                        ),
                        IconButton(
                          onPressed: () => setState(() => _quantity++),
                          icon: const Icon(Icons.add_circle_outline, size: 24, color: AppColors.primary),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // 4. Motif / Cause
              TextField(
                controller: _reasonController,
                decoration: InputDecoration(
                  labelText: "Cause ou observation (optionnel)",
                  hintText: _movementType == "MORTALITY"
                      ? "Ex : Coup de chaleur, asphyxie, picage..."
                      : "Ex : Vente aux restaurateurs...",
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
                      onPressed: (!flockState.isSubmitting && _selectedFlockId != null)
                          ? () async {
                              final scaffoldMessenger = ScaffoldMessenger.of(context);
                              final navigator = Navigator.of(context);

                              final success = await ref.read(flockProvider.notifier).recordMovement(
                                flockId: _selectedFlockId!,
                                type: _movementType,
                                quantity: _quantity,
                                date: _movementDate,
                                reason: _reasonController.text.trim().isNotEmpty
                                    ? _reasonController.text.trim()
                                    : null,
                              );

                              if (mounted) {
                                if (success) {
                                  ref.read(dashboardProvider.notifier).loadDashboard(showLoading: false);
                                  widget.onSaved?.call();

                                  navigator.pop(true);
                                  scaffoldMessenger.showSnackBar(
                                    SnackBar(
                                      content: Text("$_quantity sujet(s) enregistré(s) avec succès"),
                                      backgroundColor: AppColors.success,
                                    ),
                                  );
                                } else {
                                  final err = ref.read(flockProvider).error ?? "Une erreur est survenue.";
                                  scaffoldMessenger.showSnackBar(
                                    SnackBar(content: Text(err), backgroundColor: AppColors.danger),
                                  );
                                }
                              }
                            }
                          : null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _movementType == "MORTALITY" ? AppColors.danger : AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: flockState.isSubmitting
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
          ],
        ),
      ),
    );
  }
}

class _TypeChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final bool isSelected;
  final VoidCallback onTap;

  const _TypeChip({
    required this.label,
    required this.icon,
    required this.color,
    required this.isSelected,
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
            border: Border.all(color: isSelected ? color : AppColors.borderLight),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 16, color: isSelected ? Colors.white : color),
              const SizedBox(height: 2),
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: isSelected ? Colors.white : AppColors.textMutedLight,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
