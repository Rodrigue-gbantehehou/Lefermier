import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/models/flock.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/egg_calculator.dart';
import '../dashboard/dashboard_provider.dart';
import '../flocks/flock_provider.dart';
import 'egg_provider.dart';

class RecordEggModal extends ConsumerStatefulWidget {
  final String? defaultFlockId;
  final VoidCallback? onSaved;

  const RecordEggModal({
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
      builder: (_) => RecordEggModal(
        defaultFlockId: defaultFlockId,
        onSaved: onSaved,
      ),
    );
  }

  @override
  ConsumerState<RecordEggModal> createState() => _RecordEggModalState();
}

class _RecordEggModalState extends ConsumerState<RecordEggModal> {
  String? _selectedFlockId;
  final DateTime _selectedDate = DateTime.now();
  String _session = "MORNING";
  int _goodEggs = 0;
  int _crackedEggs = 0;
  int _dirtyEggs = 0;
  int _deformedEggs = 0;
  final _notesController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _selectedFlockId = widget.defaultFlockId;
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surfaceColor = isDark ? AppColors.surfaceDark : AppColors.surfaceLight;
    final borderColor = isDark ? AppColors.borderDark : AppColors.borderLight;
    final eggState = ref.watch(eggProvider);
    final flockState = ref.watch(flockProvider);

    // Récupération des bandes de pondeuses disponibles
    List<Flock> layerFlocks = eggState.layerFlocks;
    if (layerFlocks.isEmpty) {
      layerFlocks = flockState.flocks.where((f) => f.isLayer).toList();
    }

    if (layerFlocks.isNotEmpty) {
      if (_selectedFlockId == null || !layerFlocks.any((f) => f.id == _selectedFlockId)) {
        _selectedFlockId = layerFlocks.first.id;
      }
    }

    final trayInfo = EggCalculator.calculate(_goodEggs);

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
                    Icon(Icons.egg_rounded, color: AppColors.accent, size: 22),
                    SizedBox(width: 8),
                    Text(
                      "Collecte d'Œufs",
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

            if (layerFlocks.isEmpty) ...[
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.danger.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.info_outline, color: AppColors.danger, size: 20),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        "Aucun lot de pondeuses actif trouvé dans votre exploitation.",
                        style: TextStyle(fontSize: 12, color: AppColors.danger, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ] else ...[
              // Sélection du Lot / Bande
              if (layerFlocks.length > 1) ...[
                const Text(
                  "Bande de pondeuses *",
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
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
                    child: DropdownButton<String>(
                      value: _selectedFlockId,
                      isExpanded: true,
                      items: layerFlocks.map((flock) {
                        return DropdownMenuItem<String>(
                          value: flock.id,
                          child: Text(
                            "${flock.name} (${flock.currentQuantity} sujets)",
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
              ] else ...[
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.accent.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.pets, size: 16, color: AppColors.accent),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          "Bande : ${layerFlocks.first.name} (${layerFlocks.first.currentQuantity} sujets)",
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.accent),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
              ],

              // Session de ramassage
              const Text(
                "Session de collecte *",
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  _SessionChip(
                    label: "Matin",
                    icon: Icons.wb_sunny_outlined,
                    isSelected: _session == "MORNING",
                    onTap: () => setState(() => _session = "MORNING"),
                  ),
                  const SizedBox(width: 6),
                  _SessionChip(
                    label: "Midi",
                    icon: Icons.wb_sunny,
                    isSelected: _session == "AFTERNOON",
                    onTap: () => setState(() => _session = "AFTERNOON"),
                  ),
                  const SizedBox(width: 6),
                  _SessionChip(
                    label: "Soir",
                    icon: Icons.nightlight_round_outlined,
                    isSelected: _session == "EVENING",
                    onTap: () => setState(() => _session = "EVENING"),
                  ),
                  const SizedBox(width: 6),
                  _SessionChip(
                    label: "Jour",
                    icon: Icons.all_inclusive,
                    isSelected: _session == "ALL_DAY",
                    onTap: () => setState(() => _session = "ALL_DAY"),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Bons Œufs counter box avec calcul automatique des alvéoles de 30
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.primarySoft,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          "Bons œufs récoltés *",
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                          ),
                        ),
                        if (_goodEggs > 0)
                          InkWell(
                            onTap: () => setState(() => _goodEggs = 0),
                            child: const Padding(
                              padding: EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                              child: Text(
                                "Remettre à 0",
                                style: TextStyle(fontSize: 11, color: AppColors.danger, fontWeight: FontWeight.w600),
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.baseline,
                      textBaseline: TextBaseline.alphabetic,
                      children: [
                        Text(
                          "$_goodEggs",
                          style: const TextStyle(
                            fontSize: 32,
                            fontWeight: FontWeight.w900,
                            fontFamily: 'monospace',
                            color: AppColors.primary,
                          ),
                        ),
                        const SizedBox(width: 6),
                        const Text(
                          "œufs",
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.primary),
                        ),
                        const Spacer(),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.accent.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            trayInfo.text,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: AppColors.accent,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      "Ajout rapide par alvéoles / plateaux de 30 :",
                      style: TextStyle(fontSize: 11, color: AppColors.textMutedLight, fontWeight: FontWeight.w500),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        _TrayBtn(
                          label: "+1 pl. (30)",
                          onTap: () => setState(() => _goodEggs += 30),
                        ),
                        const SizedBox(width: 6),
                        _TrayBtn(
                          label: "+2 pl. (60)",
                          onTap: () => setState(() => _goodEggs += 60),
                        ),
                        const SizedBox(width: 6),
                        _TrayBtn(
                          label: "+5 pl. (150)",
                          onTap: () => setState(() => _goodEggs += 150),
                        ),
                        const SizedBox(width: 6),
                        _TrayBtn(
                          label: "+10 pl. (300)",
                          onTap: () => setState(() => _goodEggs += 300),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        IconButton(
                          onPressed: _goodEggs > 0 ? () => setState(() => _goodEggs = (_goodEggs - 1).clamp(0, 99999)) : null,
                          icon: const Icon(Icons.remove_circle_outline, size: 22, color: AppColors.primary),
                        ),
                        const Text("Unité (+/-)", style: TextStyle(fontSize: 11, color: AppColors.primary, fontWeight: FontWeight.w600)),
                        IconButton(
                          onPressed: () => setState(() => _goodEggs++),
                          icon: const Icon(Icons.add_circle_outline, size: 22, color: AppColors.primary),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Déclassement & Anomalies
              const Text(
                "Déclassement & Anomalies",
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              _EggQualityRow(
                label: "Œufs fêlés / cassés",
                count: _crackedEggs,
                color: AppColors.danger,
                onDecrement: _crackedEggs > 0 ? () => setState(() => _crackedEggs--) : null,
                onIncrement: () => setState(() => _crackedEggs++),
              ),
              const SizedBox(height: 6),
              _EggQualityRow(
                label: "Œufs sales",
                count: _dirtyEggs,
                color: AppColors.textMutedLight,
                onDecrement: _dirtyEggs > 0 ? () => setState(() => _dirtyEggs--) : null,
                onIncrement: () => setState(() => _dirtyEggs++),
              ),
              const SizedBox(height: 6),
              _EggQualityRow(
                label: "Œufs déformés / anormaux",
                count: _deformedEggs,
                color: AppColors.accent,
                onDecrement: _deformedEggs > 0 ? () => setState(() => _deformedEggs--) : null,
                onIncrement: () => setState(() => _deformedEggs++),
              ),
              const SizedBox(height: 14),

              // Observations optionnelles
              TextField(
                controller: _notesController,
                maxLines: 2,
                decoration: InputDecoration(
                  labelText: "Observations (optionnel)",
                  hintText: "Ex: Ramassage retardé, bonne couleur de coquille...",
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
                      onPressed: (_goodEggs > 0 && !eggState.isSubmitting && _selectedFlockId != null)
                          ? () async {
                              final scaffoldMessenger = ScaffoldMessenger.of(context);
                              final navigator = Navigator.of(context);

                              final success = await ref.read(eggProvider.notifier).recordProduction(
                                flockId: _selectedFlockId!,
                                date: _selectedDate,
                                session: _session,
                                goodEggs: _goodEggs,
                                crackedEggs: _crackedEggs,
                                dirtyEggs: _dirtyEggs,
                                deformedEggs: _deformedEggs,
                                notes: _notesController.text,
                              );

                              if (mounted) {
                                if (success) {
                                  // Rechargement immédiat du Dashboard et des données de ponte
                                  ref.read(dashboardProvider.notifier).loadDashboard(showLoading: false);
                                  widget.onSaved?.call();

                                  navigator.pop(true);
                                  scaffoldMessenger.showSnackBar(
                                    SnackBar(
                                      content: Text("Collecte de $_goodEggs œufs (${trayInfo.text}) enregistrée avec succès"),
                                      backgroundColor: AppColors.success,
                                    ),
                                  );
                                } else {
                                  final err = ref.read(eggProvider).error ?? "Une erreur est survenue.";
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
                      child: eggState.isSubmitting
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

class _SessionChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;

  const _SessionChip({
    required this.label,
    required this.icon,
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
            color: isSelected ? AppColors.accent : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSelected ? AppColors.accent : AppColors.borderLight,
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 16, color: isSelected ? Colors.white : AppColors.textMutedLight),
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

class _TrayBtn extends StatelessWidget {
  final String label;
  final VoidCallback onTap;

  const _TrayBtn({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 6),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
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

class _EggQualityRow extends StatelessWidget {
  final String label;
  final int count;
  final Color color;
  final VoidCallback? onDecrement;
  final VoidCallback onIncrement;

  const _EggQualityRow({
    required this.label,
    required this.count,
    required this.color,
    required this.onDecrement,
    required this.onIncrement,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Theme.of(context).brightness == Brightness.dark ? Colors.grey.shade900 : Colors.grey.shade100,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
          Row(
            children: [
              IconButton(
                visualDensity: VisualDensity.compact,
                padding: EdgeInsets.zero,
                icon: const Icon(Icons.remove_circle_outline, size: 20),
                onPressed: onDecrement,
              ),
              Container(
                constraints: const BoxConstraints(minWidth: 26),
                alignment: Alignment.center,
                child: Text(
                  "$count",
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: color),
                ),
              ),
              IconButton(
                visualDensity: VisualDensity.compact,
                padding: EdgeInsets.zero,
                icon: const Icon(Icons.add_circle_outline, size: 20),
                onPressed: onIncrement,
              ),
            ],
          ),
        ],
      ),
    );
  }
}
