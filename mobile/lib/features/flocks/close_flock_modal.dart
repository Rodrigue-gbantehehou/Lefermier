import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/models/flock.dart';
import '../../core/theme/app_theme.dart';
import 'flock_provider.dart';

class CloseFlockModal extends ConsumerStatefulWidget {
  final Flock flock;
  final VoidCallback? onClosed;

  const CloseFlockModal({
    super.key,
    required this.flock,
    this.onClosed,
  });

  static Future<bool?> show(
    BuildContext context, {
    required Flock flock,
    VoidCallback? onClosed,
  }) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => CloseFlockModal(flock: flock, onClosed: onClosed),
    );
  }

  @override
  ConsumerState<CloseFlockModal> createState() => _CloseFlockModalState();
}

class _CloseFlockModalState extends ConsumerState<CloseFlockModal> {
  late DateTime _closeDate;
  final _notesController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _closeDate = DateTime.now();
    _notesController.text = widget.flock.currentQuantity == 0
        ? "Vente intégrale du cheptel effectuée"
        : (widget.flock.isLayer ? "Réforme générale fin de cycle de ponte" : "Abattage et vente finale");
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _isSubmitting = true);
    final scaffold = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);

    try {
      final success = await ref.read(flockProvider.notifier).closeFlock(
            flockId: widget.flock.id,
            name: widget.flock.name,
            strain: widget.flock.breed,
            buildingId: widget.flock.buildingId,
            actualEndDate: _closeDate,
            notes: _notesController.text.trim().isNotEmpty
                ? _notesController.text.trim()
                : null,
          );

      if (!mounted) return;
      setState(() => _isSubmitting = false);

      if (success) {
        widget.onClosed?.call();
        navigator.pop(true);
        scaffold.showSnackBar(
          SnackBar(
            content: Text("Le lot \"${widget.flock.name}\" a été clôturé avec succès."),
            backgroundColor: AppColors.primary,
          ),
        );
      } else {
        scaffold.showSnackBar(
          const SnackBar(
            content: Text("Échec de la clôture du lot."),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _isSubmitting = false);
      scaffold.showSnackBar(
        SnackBar(
          content: Text("Erreur: $e"),
          backgroundColor: AppColors.danger,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surfaceColor = isDark ? AppColors.surfaceDark : AppColors.surfaceLight;
    final borderColor = isDark ? AppColors.borderDark : AppColors.borderLight;
    final dateFmt = DateFormat('dd/MM/yyyy');

    return Container(
      decoration: BoxDecoration(
        color: surfaceColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
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
            const SizedBox(height: 14),

            // En-tête
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.warning.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.archive_outlined, color: AppColors.warning, size: 22),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          "Clôturer le lot d'élevage",
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        Text(
                          widget.flock.name,
                          style: const TextStyle(fontSize: 12, color: AppColors.textMutedLight),
                        ),
                      ],
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded, size: 22),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Récapitulatif du lot
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: isDark ? AppColors.backgroundDark : const Color(0xFFF9FAFB),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: borderColor),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        "Effectif vivant restant",
                        style: TextStyle(fontSize: 12, color: AppColors.textMutedLight),
                      ),
                      Text(
                        "${widget.flock.currentQuantity} sujets",
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: widget.flock.currentQuantity > 0 ? AppColors.warning : AppColors.success,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        "Effectif de départ",
                        style: TextStyle(fontSize: 12, color: AppColors.textMutedLight),
                      ),
                      Text(
                        "${widget.flock.initialQuantity} sujets mis en place",
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        "Pertes enregistrées",
                        style: TextStyle(fontSize: 12, color: AppColors.textMutedLight),
                      ),
                      Text(
                        "${widget.flock.deathsCount} sujets (${widget.flock.calculatedMortalityRate.toStringAsFixed(1)}%)",
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.danger),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Avertissement explicatif
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.info_outline_rounded, color: AppColors.primary, size: 18),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      "La clôture passe le statut du lot à \"Terminé\" et libère le poulailler d'accueil. Toutes les données (pontes, aliments, dépenses, recettes) restent conservées et consultables dans le bilan final.",
                      style: TextStyle(fontSize: 11.5, color: isDark ? Colors.white70 : AppColors.textMainLight, height: 1.35),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Date de clôture effective
            const Text(
              "Date effective de fin de cycle *",
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 6),
            InkWell(
              onTap: () async {
                final picked = await showDatePicker(
                  context: context,
                  initialDate: _closeDate,
                  firstDate: DateTime(2020),
                  lastDate: DateTime.now().add(const Duration(days: 30)),
                );
                if (picked != null) {
                  setState(() => _closeDate = picked);
                }
              },
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: borderColor),
                  color: isDark ? Colors.grey.shade900 : Colors.grey.shade50,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      dateFmt.format(_closeDate),
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                    ),
                    const Icon(Icons.calendar_today_rounded, size: 18, color: AppColors.primary),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 14),

            // Remarques de clôture
            const Text(
              "Observation / Motif de clôture",
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 6),
            TextFormField(
              controller: _notesController,
              maxLines: 2,
              decoration: InputDecoration(
                hintText: "Ex : Vente totale des sujets, réforme fin de ponte...",
                filled: true,
                fillColor: isDark ? Colors.grey.shade900 : Colors.grey.shade50,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 20),

            // Boutons d'action
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 13),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text("Annuler"),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _isSubmitting ? null : _submit,
                    icon: _isSubmitting
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                          )
                        : const Icon(Icons.check_circle_rounded, size: 18, color: Colors.white),
                    label: const Text(
                      "Confirmer",
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.warning,
                      padding: const EdgeInsets.symmetric(vertical: 13),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                    ),
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
