import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import 'auth_provider.dart';

class FarmSelectionSheet extends ConsumerWidget {
  const FarmSelectionSheet({super.key});

  static void show(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => const FarmSelectionSheet(),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surfaceColor = isDark ? AppColors.surfaceDark : AppColors.surfaceLight;
    final borderColor = isDark ? AppColors.borderDark : AppColors.borderLight;

    return Container(
      decoration: BoxDecoration(
        color: surfaceColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        top: 16,
        left: 20,
        right: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 44,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.borderLight,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            "Changer d'exploitation",
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            "Sélectionnez la ferme active pour les opérations et la synchronisation.",
            style: TextStyle(fontSize: 13, color: AppColors.textMutedLight),
          ),
          const SizedBox(height: 18),
          if (authState.farms.isEmpty)
            Container(
              padding: const EdgeInsets.all(16),
              alignment: Alignment.center,
              child: const Text(
                "Aucune exploitation trouvée pour votre compte.",
                style: TextStyle(color: AppColors.textMutedLight),
              ),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: authState.farms.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final farm = authState.farms[index];
                final isSelected = authState.activeFarm?.id == farm.id;

                return InkWell(
                  onTap: () {
                    ref.read(authProvider.notifier).selectFarm(farm);
                    Navigator.of(context).pop();
                  },
                  borderRadius: BorderRadius.circular(14),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? AppColors.primarySoft
                          : (isDark ? AppColors.backgroundDark : AppColors.backgroundLight),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: isSelected ? AppColors.primary : borderColor,
                        width: isSelected ? 1.5 : 1,
                      ),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? AppColors.primary
                                : AppColors.textMutedLight.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(
                            Icons.agriculture_rounded,
                            size: 20,
                            color: isSelected ? Colors.white : AppColors.textMutedLight,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                farm.name,
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                  color: isSelected ? AppColors.primary : null,
                                ),
                              ),
                              if (farm.city != null || farm.productionType != null)
                                Text(
                                  [
                                    if (farm.city != null) farm.city,
                                    if (farm.productionType != null) _formatProductionType(farm.productionType!),
                                  ].join(" • "),
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: AppColors.textMutedLight,
                                  ),
                                ),
                            ],
                          ),
                        ),
                        if (isSelected)
                          const Icon(
                            Icons.check_circle_rounded,
                            color: AppColors.primary,
                            size: 22,
                          ),
                      ],
                    ),
                  ),
                );
              },
            ),
        ],
      ),
    );
  }

  String _formatProductionType(String type) {
    switch (type.toUpperCase()) {
      case 'LAYERS':
      case 'LAYER':
        return 'Pondeuses';
      case 'BROILERS':
      case 'BROILER':
        return 'Poulets de chair';
      case 'MIXED':
        return 'Élevage mixte';
      default:
        return type;
    }
  }
}
