import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/theme_provider.dart';
import '../../core/utils/currency_formatter.dart';
import '../auth/auth_provider.dart';
import '../auth/farm_selection_sheet.dart';
import '../sync/sync_status_badge.dart';
import '../../core/widgets/brand_loader.dart';
import 'dashboard_provider.dart';

class DashboardScreen extends ConsumerWidget {
  final VoidCallback onOpenQuickActions;
  final VoidCallback onNavigateToEggs;
  final VoidCallback onNavigateToFlocks;
  final VoidCallback onNavigateToFinances;
  final VoidCallback? onOpenMenu;

  const DashboardScreen({
    super.key,
    required this.onOpenQuickActions,
    required this.onNavigateToEggs,
    required this.onNavigateToFlocks,
    required this.onNavigateToFinances,
    this.onOpenMenu,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final dashState = ref.watch(dashboardProvider);
    final kpi = dashState.kpi;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surfaceColor = isDark ? AppColors.surfaceDark : AppColors.surfaceLight;
    final borderColor = isDark ? AppColors.borderDark : AppColors.borderLight;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.menu_rounded, color: Colors.white),
          tooltip: "Menu",
          onPressed: onOpenMenu ?? () => Scaffold.of(context).openDrawer(),
        ),
        title: InkWell(
          onTap: () => FarmSelectionSheet.show(context),
          borderRadius: BorderRadius.circular(20),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.white.withValues(alpha: 0.35)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.agriculture_rounded, size: 16, color: AppColors.accentLight),
                const SizedBox(width: 6),
                ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 160),
                  child: Text(
                    authState.activeFarm?.name ?? "Ferme Avicole",
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ),
                const SizedBox(width: 4),
                const Icon(Icons.arrow_drop_down_rounded, size: 18, color: Colors.white),
              ],
            ),
          ),
        ),
        actions: [
          IconButton(
            icon: Icon(
              isDark ? Icons.light_mode_rounded : Icons.dark_mode_rounded,
              color: isDark ? AppColors.accent : Colors.white,
              size: 20,
            ),
            tooltip: isDark ? "Mode clair" : "Mode sombre",
            onPressed: () => ref.read(themeModeProvider.notifier).toggleTheme(context),
          ),
          IconButton(
            icon: const Icon(Icons.sync_rounded, color: Colors.white),
            tooltip: "Actualiser",
            onPressed: () async {
              await ref.read(dashboardProvider.notifier).loadDashboard();
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text("Données actualisées"),
                    backgroundColor: AppColors.primary,
                    duration: Duration(seconds: 1),
                  ),
                );
              }
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(dashboardProvider.notifier).loadDashboard(showLoading: false),
        child: dashState.isLoading
            ? const Center(child: BrandLoader(message: "Chargement du tableau de bord..."))
            : SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Bannière Hero de bienvenue chaleureuse
                    Container(
                      margin: const EdgeInsets.only(bottom: 16),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: isDark
                              ? [
                                  AppColors.surfaceDark,
                                  const Color(0xFF132A20),
                                ]
                              : [
                                  const Color(0xFF047857),
                                  const Color(0xFF059669),
                                  const Color(0xFF10B981),
                                ],
                        ),
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primary.withValues(alpha: isDark ? 0.2 : 0.25),
                            blurRadius: 16,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(8),
                                    decoration: BoxDecoration(
                                      color: Colors.white.withValues(alpha: 0.18),
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Icon(
                                      Icons.agriculture_rounded,
                                      size: 20,
                                      color: Colors.white,
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text(
                                        "Bonjour 👋",
                                        style: TextStyle(
                                          fontSize: 18,
                                          fontWeight: FontWeight.w900,
                                          color: Colors.white,
                                          letterSpacing: -0.3,
                                        ),
                                      ),
                                      Text(
                                        authState.activeFarm?.name ?? "Mon exploitation avicole",
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: Colors.white.withValues(alpha: 0.88),
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                              const SyncStatusBadge(),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: Colors.black.withValues(alpha: 0.18),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              children: [
                                const Icon(
                                  Icons.egg_alt_rounded,
                                  size: 16,
                                  color: AppColors.accentLight,
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    kpi.todayGoodEggs > 0
                                        ? "${kpi.todayGoodEggs} œufs ramassés aujourd'hui (${kpi.todayTraysCount} plateaux)"
                                        : "Prêt pour les enregistrements du jour",
                                    style: const TextStyle(
                                      fontSize: 11.5,
                                      color: Colors.white,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                    // KPI 2x2 Grid dynamique aux teintes chaleureuses
                    GridView.count(
                      crossAxisCount: 2,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisSpacing: 10,
                      mainAxisSpacing: 10,
                      childAspectRatio: 1.35,
                      children: [
                        _KpiCard(
                          title: "Ponte du jour",
                          value: "${kpi.todayGoodEggs}",
                          unit: "œufs",
                          badgeText: "${kpi.todayTraysCount} plateaux",
                          badgeColor: AppColors.accent,
                          icon: Icons.egg_rounded,
                          customBgColor: isDark ? const Color(0xFF282115) : const Color(0xFFFFFBEB),
                          customBorderColor: isDark ? const Color(0xFF78350F) : const Color(0xFFFDE68A),
                          onTap: onNavigateToEggs,
                        ),
                        _KpiCard(
                          title: "Cheptel vivant",
                          value: "${kpi.totalBirds}",
                          unit: "sujets",
                          badgeText: "${kpi.activeFlocksCount} lot(s) actif(s)",
                          badgeColor: AppColors.primary,
                          icon: Icons.pets_rounded,
                          customBgColor: isDark ? const Color(0xFF132A1F) : const Color(0xFFF0FDF4),
                          customBorderColor: isDark ? const Color(0xFF065F46) : const Color(0xFFBBF7D0),
                          onTap: onNavigateToFlocks,
                        ),
                        _KpiCard(
                          title: "Caisse du mois",
                          value: CurrencyFormatter.formatFcfa(kpi.currentMonthNetBalance),
                          unit: "FCFA",
                          badgeText: kpi.currentMonthNetBalance >= 0 ? "Solde positif" : "Solde négatif",
                          badgeColor: kpi.currentMonthNetBalance >= 0 ? AppColors.success : AppColors.danger,
                          icon: Icons.account_balance_wallet_rounded,
                          customBgColor: isDark
                              ? const Color(0xFF172D24)
                              : (kpi.currentMonthNetBalance >= 0 ? const Color(0xFFECFDF5) : const Color(0xFFFEF2F2)),
                          customBorderColor: isDark
                              ? const Color(0xFF047857)
                              : (kpi.currentMonthNetBalance >= 0 ? const Color(0xFFA7F3D0) : const Color(0xFFFECACA)),
                          onTap: onNavigateToFinances,
                        ),
                        _KpiCard(
                          title: "Taux de ponte",
                          value: "${kpi.todayLayingRate.toStringAsFixed(1)}%",
                          unit: "journalier",
                          badgeText: kpi.todayLayingRate >= 70 ? "Bon rendement" : "Démarrage / fin",
                          badgeColor: const Color(0xFF0284C7),
                          icon: Icons.show_chart_rounded,
                          customBgColor: isDark ? const Color(0xFF172535) : const Color(0xFFF0F9FF),
                          customBorderColor: isDark ? const Color(0xFF0369A1) : const Color(0xFFBAE6FD),
                          onTap: onNavigateToEggs,
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // Lots en élevage réels
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          "Lots en élevage",
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        TextButton(
                          onPressed: onNavigateToFlocks,
                          style: TextButton.styleFrom(
                            padding: EdgeInsets.zero,
                            minimumSize: const Size(50, 30),
                          ),
                          child: const Text(
                            "Gérer les bandes →",
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),

                    if (kpi.flocks.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: surfaceColor,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: borderColor),
                        ),
                        alignment: Alignment.center,
                        child: Column(
                          children: [
                            const Icon(Icons.pets_outlined, size: 36, color: AppColors.textMutedLight),
                            const SizedBox(height: 8),
                            const Text(
                              "Aucun lot actif en élevage",
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                            const SizedBox(height: 4),
                            TextButton(
                              onPressed: onNavigateToFlocks,
                              child: const Text("Créer une nouvelle bande"),
                            ),
                          ],
                        ),
                      )
                    else
                      ...kpi.flocks.take(2).map((flock) {
                        return Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          decoration: BoxDecoration(
                            color: surfaceColor,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: borderColor),
                          ),
                          padding: const EdgeInsets.all(14),
                          child: Column(
                            children: [
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(8),
                                    decoration: BoxDecoration(
                                      color: (flock.isLayer ? AppColors.accent : AppColors.primary).withValues(alpha: 0.12),
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: Icon(
                                      flock.isLayer ? Icons.egg_rounded : Icons.pets_rounded,
                                      color: flock.isLayer ? AppColors.accent : AppColors.primary,
                                      size: 20,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          flock.name,
                                          style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 14,
                                          ),
                                        ),
                                        Text(
                                          "${flock.breed} • ${flock.currentQuantity} sujets vivants",
                                          style: const TextStyle(fontSize: 11, color: AppColors.textMutedLight),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: AppColors.success.withValues(alpha: 0.12),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Text(
                                      flock.isLayer ? "Pondeuses" : "Chair",
                                      style: const TextStyle(
                                        color: AppColors.success,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 11,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 10),
                              const Divider(height: 1),
                              const SizedBox(height: 8),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    "Mortalité: ${flock.calculatedMortalityRate.toStringAsFixed(1)}% (${flock.deathsCount} perte(s))",
                                    style: const TextStyle(fontSize: 11, color: AppColors.textMutedLight),
                                  ),
                                  OutlinedButton.icon(
                                    onPressed: flock.isLayer ? onNavigateToEggs : onNavigateToFlocks,
                                    icon: Icon(flock.isLayer ? Icons.egg_outlined : Icons.remove_circle_outline, size: 14),
                                    label: Text(flock.isLayer ? "Collecte" : "Mouvement"),
                                    style: OutlinedButton.styleFrom(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                      textStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        );
                      }),

                    const SizedBox(height: 80), // Space for bottom navigation
                  ],
                ),
              ),
      ),
    );
  }
}

class _KpiCard extends StatelessWidget {
  final String title;
  final String value;
  final String unit;
  final String badgeText;
  final Color badgeColor;
  final IconData icon;
  final VoidCallback onTap;
  final Color? customBgColor;
  final Color? customBorderColor;

  const _KpiCard({
    required this.title,
    required this.value,
    required this.unit,
    required this.badgeText,
    required this.badgeColor,
    required this.icon,
    required this.onTap,
    this.customBgColor,
    this.customBorderColor,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surfaceColor = isDark ? AppColors.surfaceDark : AppColors.surfaceLight;
    final borderColor = isDark ? AppColors.borderDark : AppColors.borderLight;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        decoration: BoxDecoration(
          color: customBgColor ?? surfaceColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: customBorderColor ?? borderColor,
            width: 1.2,
          ),
          boxShadow: isDark
              ? []
              : [
                  BoxShadow(
                    color: (customBorderColor ?? Colors.black).withValues(alpha: 0.06),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
        ),
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: isDark ? AppColors.textMutedDark : const Color(0xFF334155),
                  ),
                ),
                Icon(icon, size: 16, color: badgeColor),
              ],
            ),
            Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Flexible(
                  child: Text(
                    value,
                    style: TextStyle(
                      fontSize: 19,
                      fontWeight: FontWeight.w800,
                      fontFamily: 'monospace',
                      color: isDark ? Colors.white : AppColors.textMainLight,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 4),
                Text(
                  unit,
                  style: TextStyle(
                    fontSize: 10,
                    color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                  ),
                ),
              ],
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: badgeColor.withValues(alpha: 0.14),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                badgeText,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  color: badgeColor,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
