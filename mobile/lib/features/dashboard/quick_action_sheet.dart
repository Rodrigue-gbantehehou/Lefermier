import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../auth/auth_provider.dart';

class QuickActionSheet extends ConsumerWidget {
  final VoidCallback onRecordEgg;
  final VoidCallback onRecordFeeding;
  final VoidCallback onRecordMovement;
  final VoidCallback? onRecordPoultrySale;
  final VoidCallback? onRecordEggSale;
  final VoidCallback onRecordIncome;
  final VoidCallback onRecordExpense;
  final VoidCallback? onRecordHealth;

  const QuickActionSheet({
    super.key,
    required this.onRecordEgg,
    required this.onRecordFeeding,
    required this.onRecordMovement,
    this.onRecordPoultrySale,
    this.onRecordEggSale,
    required this.onRecordIncome,
    required this.onRecordExpense,
    this.onRecordHealth,
  });

  static void show(
    BuildContext context, {
    required VoidCallback onRecordEgg,
    required VoidCallback onRecordFeeding,
    required VoidCallback onRecordMovement,
    VoidCallback? onRecordPoultrySale,
    VoidCallback? onRecordEggSale,
    required VoidCallback onRecordIncome,
    required VoidCallback onRecordExpense,
    VoidCallback? onRecordHealth,
  }) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => QuickActionSheet(
        onRecordEgg: onRecordEgg,
        onRecordFeeding: onRecordFeeding,
        onRecordMovement: onRecordMovement,
        onRecordPoultrySale: onRecordPoultrySale,
        onRecordEggSale: onRecordEggSale,
        onRecordIncome: onRecordIncome,
        onRecordExpense: onRecordExpense,
        onRecordHealth: onRecordHealth,
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final farm = authState.activeFarm;

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surfaceColor = isDark ? AppColors.surfaceDark : AppColors.surfaceLight;

    // Filtres d'actions selon l'abonnement de la ferme et le rôle utilisateur
    final canEgg = farm != null && farm.canCreateEggs;
    final canFeed = farm != null && farm.canFeed;
    final canFinance = farm != null && farm.canCreateFinance;
    final canHealth = farm != null && farm.canManageHealth;
    final canMovement = farm != null && farm.canRecordFlockMovement;

    final hasAnyAction = canEgg || canFeed || canFinance || canHealth || canMovement;

    return Material(
      color: surfaceColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      clipBehavior: Clip.antiAlias,
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          20,
          12,
          20,
          MediaQuery.of(context).padding.bottom + 20,
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
            // Poignée de glissement
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

            // En-tête
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "Actions rapides",
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      "Opérations autorisées pour votre compte",
                      style: TextStyle(fontSize: 11, color: AppColors.textMutedLight),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded, size: 20),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 16),

            if (!hasAnyAction)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(
                  child: Text(
                    "Aucune action de saisie autorisée pour ce profil.",
                    style: TextStyle(fontSize: 13, color: AppColors.textMutedLight),
                  ),
                ),
              )
            else ...[
              // Grille d'actions filtrées
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 2.2,
                children: [
                  // 1. Vente de volailles (Conditionné par gestion de lot ET droit financier)
                  if (canFinance && canMovement && onRecordPoultrySale != null)
                    _ActionButton(
                      icon: Icons.shopping_bag_outlined,
                      label: "Vente volailles",
                      subtitle: "Poulets ou réforme",
                      color: AppColors.success,
                      onTap: () {
                        Navigator.pop(context);
                        onRecordPoultrySale!();
                      },
                    ),

                  // 2. Vente d'œufs (Conditionné par ponte ET droit financier)
                  if (canFinance && canEgg && onRecordEggSale != null)
                    _ActionButton(
                      icon: Icons.point_of_sale_rounded,
                      label: "Vente d'œufs",
                      subtitle: "Plateaux de table",
                      color: AppColors.success,
                      onTap: () {
                        Navigator.pop(context);
                        onRecordEggSale!();
                      },
                    ),

                  // 3. Ramassage d'œufs (Uniquement si ponte autorisée & non-chair)
                  if (canEgg)
                    _ActionButton(
                      icon: Icons.egg_outlined,
                      label: "Ponte d'œufs",
                      subtitle: "Ramassage du lot",
                      color: AppColors.accent,
                      onTap: () {
                        Navigator.pop(context);
                        onRecordEgg();
                      },
                    ),

                  // 4. Nourrir / Distribution d'aliment (Conditionné par gestion de stock/ration)
                  if (canFeed)
                    _ActionButton(
                      icon: Icons.restaurant_outlined,
                      label: "Nourrir",
                      subtitle: "Aliment distribué",
                      color: AppColors.primary,
                      onTap: () {
                        Navigator.pop(context);
                        onRecordFeeding();
                      },
                    ),

                  // 5. Autre Recette / Encaissement divers
                  if (canFinance)
                    _ActionButton(
                      icon: Icons.trending_up,
                      label: "Autre Recette",
                      subtitle: "Fumier, sacs, divers",
                      color: AppColors.success,
                      onTap: () {
                        Navigator.pop(context);
                        onRecordIncome();
                      },
                    ),

                  // 6. Dépense / Achat (Conditionné par rôle financier)
                  if (canFinance)
                    _ActionButton(
                      icon: Icons.trending_down,
                      label: "Dépense",
                      subtitle: "Achat ou charge",
                      color: AppColors.danger,
                      onTap: () {
                        Navigator.pop(context);
                        onRecordExpense();
                      },
                    ),

                  // 7. Soin / Traitement sanitaire (Conditionné par rôle sanitaire)
                  if (canHealth)
                    _ActionButton(
                      icon: Icons.medical_services_outlined,
                      label: "Soin / Vaccin",
                      subtitle: "Suivi vétérinaire",
                      color: AppColors.primary,
                      onTap: () {
                        Navigator.pop(context);
                        if (onRecordHealth != null) {
                          onRecordHealth!();
                        } else {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text("Enregistrement soin / vaccin sanitaire...")),
                          );
                        }
                      },
                    ),

                  // 8. Déclaration de mortalité
                  if (canMovement)
                    _ActionButton(
                      icon: Icons.heart_broken_rounded,
                      label: "Mortalité",
                      subtitle: "Pertes de sujets",
                      color: AppColors.danger,
                      onTap: () {
                        Navigator.pop(context);
                        onRecordMovement();
                      },
                    ),
                ],
              ),
            ],
          ],
        ),
      ),
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
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                      color: Theme.of(context).textTheme.bodyMedium?.color,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      fontSize: 10,
                      color: AppColors.textMutedLight,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
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
