import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

class QuickActionSheet extends StatelessWidget {
  final VoidCallback onRecordEgg;
  final VoidCallback onRecordFeeding;
  final VoidCallback onRecordMovement;
  final VoidCallback onRecordIncome;
  final VoidCallback onRecordExpense;

  const QuickActionSheet({
    super.key,
    required this.onRecordEgg,
    required this.onRecordFeeding,
    required this.onRecordMovement,
    required this.onRecordIncome,
    required this.onRecordExpense,
  });

  static void show(
    BuildContext context, {
    required VoidCallback onRecordEgg,
    required VoidCallback onRecordFeeding,
    required VoidCallback onRecordMovement,
    required VoidCallback onRecordIncome,
    required VoidCallback onRecordExpense,
  }) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => QuickActionSheet(
        onRecordEgg: onRecordEgg,
        onRecordFeeding: onRecordFeeding,
        onRecordMovement: onRecordMovement,
        onRecordIncome: onRecordIncome,
        onRecordExpense: onRecordExpense,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surfaceColor = isDark ? AppColors.surfaceDark : AppColors.surfaceLight;

    return Container(
      decoration: BoxDecoration(
        color: surfaceColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.fromLTRB(
        20,
        12,
        20,
        MediaQuery.of(context).padding.bottom + 20,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag handle
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
          // Title
          const Row(
            children: [
              Text(
                "Actions rapides",
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Grid of quick actions
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 2.2,
            children: [
              _ActionButton(
                icon: Icons.egg_outlined,
                label: "Ramassage",
                subtitle: "Collecte d'œufs",
                color: AppColors.accent,
                onTap: () {
                  Navigator.pop(context);
                  onRecordEgg();
                },
              ),
              _ActionButton(
                icon: Icons.restaurant_outlined,
                label: "Nourrir",
                subtitle: "Aliment & Eau",
                color: Colors.blue.shade600,
                onTap: () {
                  Navigator.pop(context);
                  onRecordFeeding();
                },
              ),
              _ActionButton(
                icon: Icons.trending_up,
                label: "Recette",
                subtitle: "Vente d'œufs / poules",
                color: AppColors.success,
                onTap: () {
                  Navigator.pop(context);
                  onRecordIncome();
                },
              ),
              _ActionButton(
                icon: Icons.trending_down,
                label: "Dépense",
                subtitle: "Achat d'aliment",
                color: AppColors.danger,
                onTap: () {
                  Navigator.pop(context);
                  onRecordExpense();
                },
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Perte / Mortalite row button
          InkWell(
            onTap: () {
              Navigator.pop(context);
              onRecordMovement();
            },
            borderRadius: BorderRadius.circular(14),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.red.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.red.withValues(alpha: 0.2)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.warning_amber_rounded, color: AppColors.danger, size: 20),
                  SizedBox(width: 10),
                  Text(
                    "Perte / Mortalité ou Réforme",
                    style: TextStyle(
                      color: AppColors.danger,
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                    ),
                  ),
                  Spacer(),
                  Icon(Icons.chevron_right, color: AppColors.danger, size: 18),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  const _ActionButton({
    required this.icon,
    required this.label,
    required this.subtitle,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withValues(alpha: 0.25)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(7),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.18),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: color, size: 18),
            ),
            const SizedBox(width: 9),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: color,
                    ),
                  ),
                  Text(
                    subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 10,
                      color: Theme.of(context).textTheme.bodySmall?.color,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
