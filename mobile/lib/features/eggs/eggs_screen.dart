import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/theme_provider.dart';
import '../../core/utils/egg_calculator.dart';
import '../../core/models/egg_production.dart';

class EggsScreen extends StatefulWidget {
  const EggsScreen({super.key});

  @override
  State<EggsScreen> createState() => _EggsScreenState();
}

class _EggsScreenState extends State<EggsScreen> {
  // Demonstration sample collections
  final List<EggProduction> _productions = [
    const EggProduction(
      id: "1",
      flockId: "flock-1",
      flockName: "Pondeuses Bâtiment A",
      date: "Aujourd'hui",
      session: "MORNING",
      totalQuantity: 420,
      damagedQuantity: 6,
      abnormalQuantity: 2,
    ),
    const EggProduction(
      id: "2",
      flockId: "flock-1",
      flockName: "Pondeuses Bâtiment A",
      date: "Hier",
      session: "MORNING",
      totalQuantity: 410,
      damagedQuantity: 4,
      abnormalQuantity: 1,
    ),
  ];

  void _openRecordEggDialog() {
    int goodEggs = 0;
    int brokenEggs = 0;
    String session = "MORNING";

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          final isDark = Theme.of(ctx).brightness == Brightness.dark;
          final surfaceColor = isDark ? AppColors.surfaceDark : AppColors.surfaceLight;
          final trayInfo = EggCalculator.calculate(goodEggs);

          return Container(
            decoration: BoxDecoration(
              color: surfaceColor,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
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
                      width: 36,
                      height: 4,
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.borderDark : AppColors.borderLight,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    "Collecte d'œufs",
                    style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                  ),
                  const Text(
                    "Pondeuses Bâtiment A",
                    style: TextStyle(fontSize: 12, color: AppColors.textMutedLight),
                  ),
                  const SizedBox(height: 16),

                  // Session Toggles (Matin, Midi, Soir)
                  Row(
                    children: [
                      _SessionChip(
                        label: "Matin",
                        icon: Icons.wb_sunny_outlined,
                        isSelected: session == "MORNING",
                        onTap: () => setModalState(() => session = "MORNING"),
                      ),
                      const SizedBox(width: 8),
                      _SessionChip(
                        label: "Midi",
                        icon: Icons.wb_sunny,
                        isSelected: session == "NOON",
                        onTap: () => setModalState(() => session = "NOON"),
                      ),
                      const SizedBox(width: 8),
                      _SessionChip(
                        label: "Soir",
                        icon: Icons.nightlight_round_outlined,
                        isSelected: session == "EVENING",
                        onTap: () => setModalState(() => session = "EVENING"),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Bons Œufs counter box
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
                            if (goodEggs > 0)
                              InkWell(
                                onTap: () => setModalState(() => goodEggs = 0),
                                child: const Text(
                                  "Remise à 0",
                                  style: TextStyle(fontSize: 11, color: AppColors.textMutedLight),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          "$goodEggs œufs",
                          style: const TextStyle(
                            fontSize: 26,
                            fontWeight: FontWeight.w800,
                            fontFamily: 'monospace',
                            color: AppColors.primary,
                          ),
                        ),
                        Text(
                          trayInfo.text,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: AppColors.accent,
                          ),
                        ),
                        const SizedBox(height: 12),
                        const Text(
                          "Ajout rapide par plateaux (30 œufs) :",
                          style: TextStyle(fontSize: 10, color: AppColors.textMutedLight),
                        ),
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            _TrayBtn(
                              label: "+1 pl. (30)",
                              onTap: () => setModalState(() => goodEggs += 30),
                            ),
                            const SizedBox(width: 6),
                            _TrayBtn(
                              label: "+2 pl. (60)",
                              onTap: () => setModalState(() => goodEggs += 60),
                            ),
                            const SizedBox(width: 6),
                            _TrayBtn(
                              label: "+5 pl. (150)",
                              onTap: () => setModalState(() => goodEggs += 150),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Cassés
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        "Œufs fêlés ou cassés :",
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                      ),
                      Row(
                        children: [
                          IconButton(
                            onPressed: brokenEggs > 0 ? () => setModalState(() => brokenEggs--) : null,
                            icon: const Icon(Icons.remove_circle_outline, size: 20),
                          ),
                          Text(
                            "$brokenEggs",
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                          ),
                          IconButton(
                            onPressed: () => setModalState(() => brokenEggs++),
                            icon: const Icon(Icons.add_circle_outline, size: 20, color: AppColors.danger),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Action Buttons
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
                          onPressed: goodEggs > 0
                              ? () {
                                  setState(() {
                                    _productions.insert(
                                      0,
                                      EggProduction(
                                        id: DateTime.now().millisecondsSinceEpoch.toString(),
                                        flockId: "flock-1",
                                        flockName: "Pondeuses Bâtiment A",
                                        date: "Aujourd'hui",
                                        session: session,
                                        totalQuantity: goodEggs,
                                        damagedQuantity: brokenEggs,
                                      ),
                                    );
                                  });
                                  Navigator.pop(ctx);
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text("Collecte enregistrée")),
                                  );
                                }
                              : null,
                          child: const Text("Enregistrer"),
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
    return Scaffold(
      appBar: AppBar(
        title: const Text("Ramassage d'œufs"),
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
          IconButton(
            icon: const Icon(Icons.add_rounded),
            onPressed: _openRecordEggDialog,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openRecordEggDialog,
        backgroundColor: AppColors.accent,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text("Collecte", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
        itemCount: _productions.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (context, index) {
          final prod = _productions[index];
          final tray = prod.trayInfo;

          return Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        prod.flockName ?? "Bande",
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppColors.accentSoft,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          prod.date,
                          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.accent),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Text(
                        "${prod.totalQuantity} œufs",
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          fontFamily: 'monospace',
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        "(${tray.text})",
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.primary),
                      ),
                    ],
                  ),
                  if (prod.damagedQuantity > 0)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        "${prod.damagedQuantity} cassé(s)",
                        style: const TextStyle(fontSize: 11, color: AppColors.danger),
                      ),
                    ),
                ],
              ),
            ),
          );
        },
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
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 14, color: isSelected ? Colors.white : AppColors.textMutedLight),
              const SizedBox(width: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
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
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
          ),
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: AppColors.primary,
            ),
          ),
        ),
      ),
    );
  }
}
