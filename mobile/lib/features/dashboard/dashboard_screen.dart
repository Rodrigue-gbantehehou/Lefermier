import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/theme_provider.dart';
import '../../core/utils/currency_formatter.dart';
import '../auth/auth_provider.dart';
import '../auth/farm_selection_sheet.dart';
import '../auth/user_profile_sheet.dart';
import '../sync/sync_status_badge.dart';
import '../eggs/record_egg_modal.dart';
import '../inventory/record_feeding_modal.dart';
import '../flocks/record_movement_modal.dart';
import '../../core/design_system/app_shimmer.dart';
import 'dashboard_provider.dart';

class DashboardScreen extends ConsumerWidget {
  final VoidCallback onOpenQuickActions;
  final VoidCallback onNavigateToEggs;
  final VoidCallback onNavigateToFlocks;
  final VoidCallback onNavigateToFinances;
  final VoidCallback? onNavigateToSync;
  final VoidCallback? onOpenMenu;

  const DashboardScreen({
    super.key,
    required this.onOpenQuickActions,
    required this.onNavigateToEggs,
    required this.onNavigateToFlocks,
    required this.onNavigateToFinances,
    this.onNavigateToSync,
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

    final farm = authState.activeFarm;
    final canViewEggs = farm == null || farm.canViewEggs;
    final canViewFlocks = farm == null || farm.canViewFlocks;
    final canViewFinance = farm == null || farm.canViewFinance;

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
          // Bouton Profil "Mon Compte"
          InkWell(
            onTap: () => UserProfileSheet.show(context),
            borderRadius: BorderRadius.circular(20),
            child: Container(
              margin: const EdgeInsets.only(right: 14, left: 4),
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white.withValues(alpha: 0.7), width: 1.5),
              ),
              child: CircleAvatar(
                radius: 15,
                backgroundColor: AppColors.accent,
                child: Text(
                  authState.user?.initials ??
                      (authState.activeFarm?.name.isNotEmpty == true
                          ? authState.activeFarm!.name[0].toUpperCase()
                          : "U"),
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(dashboardProvider.notifier).loadDashboard(showLoading: false),
        child: dashState.isLoading
            ? SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    AppShimmer.block(width: 140, height: 20),
                    const SizedBox(height: 14),
                    GridView.count(
                      crossAxisCount: 2,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisSpacing: 10,
                      mainAxisSpacing: 10,
                      childAspectRatio: 1.35,
                      children: List.generate(4, (_) => AppShimmer.kpiCard()),
                    ),
                    const SizedBox(height: 18),
                    AppShimmer.block(width: 180, height: 20),
                    const SizedBox(height: 12),
                    AppShimmer.block(width: double.infinity, height: 110, borderRadius: AppRadius.lg),
                  ],
                ),
              )
            : SingleChildScrollView(
                physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // En-tête sobre et épuré : Date du jour et synchronisation
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(6),
                              decoration: BoxDecoration(
                                color: AppColors.primary.withValues(alpha: 0.12),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.today_rounded, size: 16, color: AppColors.primary),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              _formatCurrentDate(),
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                letterSpacing: -0.2,
                              ),
                            ),
                          ],
                        ),
                        SyncStatusBadge(onTap: onNavigateToSync),
                      ],
                    ),
                    const SizedBox(height: 12),

                    if (canViewEggs || canViewFlocks || canViewFinance) ...[
                      GridView.count(
                        crossAxisCount: 2,
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        crossAxisSpacing: 10,
                        mainAxisSpacing: 10,
                        childAspectRatio: 1.35,
                        children: [
                          if (canViewEggs)
                            _KpiCard(
                              title: "Ponte du jour",
                              value: "${kpi.todayGoodEggs}",
                              unit: "œufs",
                              badgeText: "${kpi.todayTraysCount} plateaux",
                              badgeColor: AppColors.accent,
                              icon: Icons.egg_rounded,
                              customBgColor: isDark ? AppColors.kpiEggBgDark : AppColors.kpiEggBgLight,
                              customBorderColor: isDark ? AppColors.kpiEggBorderDark : AppColors.kpiEggBorderLight,
                              onTap: onNavigateToEggs,
                            ),
                          if (canViewFlocks)
                            _KpiCard(
                              title: "Cheptel vivant",
                              value: "${kpi.totalBirds}",
                              unit: "sujets",
                              badgeText: "${kpi.activeFlocksCount} lot(s) actif(s)",
                              badgeColor: AppColors.primary,
                              icon: Icons.pets_rounded,
                              customBgColor: isDark ? AppColors.kpiFlockBgDark : AppColors.kpiFlockBgLight,
                              customBorderColor: isDark ? AppColors.kpiFlockBorderDark : AppColors.kpiFlockBorderLight,
                              onTap: onNavigateToFlocks,
                            ),
                          if (canViewFinance)
                            _KpiCard(
                              title: "Caisse du mois",
                              value: CurrencyFormatter.formatFcfa(kpi.currentMonthNetBalance),
                              unit: "FCFA",
                              badgeText: kpi.currentMonthNetBalance >= 0 ? "Solde positif" : "Solde négatif",
                              badgeColor: kpi.currentMonthNetBalance >= 0 ? AppColors.success : AppColors.danger,
                              icon: Icons.account_balance_wallet_rounded,
                              customBgColor: isDark
                                  ? AppColors.kpiFinanceBgDark
                                  : (kpi.currentMonthNetBalance >= 0 ? AppColors.primarySoft : AppColors.kpiFinanceLossBgLight),
                              customBorderColor: isDark
                                  ? AppColors.primaryHover
                                  : (kpi.currentMonthNetBalance >= 0 ? AppColors.kpiFinanceBorderLight : AppColors.kpiFinanceLossBorderLight),
                              onTap: onNavigateToFinances,
                            ),
                          if (canViewEggs)
                            _KpiCard(
                              title: "Taux de ponte",
                              value: "${kpi.todayLayingRate.toStringAsFixed(1)}%",
                              unit: "journalier",
                              badgeText: kpi.todayLayingRate >= 70 ? "Bon rendement" : "Démarrage / fin",
                              badgeColor: AppColors.kpiRateBadge,
                              icon: Icons.show_chart_rounded,
                              customBgColor: isDark ? AppColors.kpiRateBgDark : AppColors.kpiRateBgLight,
                              customBorderColor: isDark ? AppColors.kpiRateBorderDark : AppColors.kpiRateBorderLight,
                              onTap: onNavigateToEggs,
                            ),
                        ],
                      ),
                      const SizedBox(height: 20),
                    ],

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
                        if (canViewFlocks)
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
                                  Expanded(
                                    child: Text(
                                      "Mortalité : ${flock.calculatedMortalityRate.toStringAsFixed(1)}% (${flock.deathsCount} perte)",
                                      style: const TextStyle(fontSize: 11, color: AppColors.textMutedLight),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      if (flock.isLayer && (farm == null || farm.canCreateEggs)) ...[
                                        // Bouton Collecter (ouvre directement la modale de ponte)
                                        OutlinedButton.icon(
                                          onPressed: () => RecordEggModal.show(context, defaultFlockId: flock.id),
                                          icon: const Icon(Icons.egg_rounded, size: 14, color: AppColors.accent),
                                          label: const Text("Collecte"),
                                          style: OutlinedButton.styleFrom(
                                            foregroundColor: AppColors.accent,
                                            side: BorderSide(color: AppColors.accent.withValues(alpha: 0.5)),
                                            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                                            visualDensity: VisualDensity.compact,
                                            textStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                                          ),
                                        ),
                                        const SizedBox(width: 6),
                                      ],
                                      if (farm == null || farm.canFeed) ...[
                                        // Bouton Nourrir (ouvre directement la modale de distribution d'aliment)
                                        ElevatedButton.icon(
                                          onPressed: () => RecordFeedingModal.show(context, defaultFlockId: flock.id),
                                          icon: const Icon(Icons.restaurant_rounded, size: 14, color: Colors.white),
                                          label: const Text("Nourrir"),
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: AppColors.primary,
                                            foregroundColor: Colors.white,
                                            elevation: 1,
                                            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                                            visualDensity: VisualDensity.compact,
                                            textStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                                          ),
                                        ),
                                      ],
                                      if (!flock.isLayer && (farm == null || farm.canRecordFlockMovement)) ...[
                                        const SizedBox(width: 6),
                                        OutlinedButton.icon(
                                          onPressed: () => RecordMovementModal.show(context, defaultFlockId: flock.id),
                                          icon: const Icon(Icons.heart_broken_rounded, size: 14, color: AppColors.danger),
                                          label: const Text("Mortalité"),
                                          style: OutlinedButton.styleFrom(
                                            foregroundColor: AppColors.danger,
                                            side: BorderSide(color: AppColors.danger.withValues(alpha: 0.5)),
                                            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                                            visualDensity: VisualDensity.compact,
                                            textStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                                          ),
                                        ),
                                      ],
                                    ],
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

  String _formatCurrentDate() {
    final now = DateTime.now();
    const months = [
      "janvier", "février", "mars", "avril", "mai", "juin",
      "juillet", "août", "septembre", "octobre", "novembre", "décembre"
    ];
    const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
    final dayName = days[now.weekday - 1];
    return "$dayName ${now.day} ${months[now.month - 1]} ${now.year}";
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
      onTap: () {
        HapticFeedback.lightImpact();
        onTap();
      },
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
                    color: isDark ? AppColors.textMutedDark : AppColors.borderDark,
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
