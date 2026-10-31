import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/theme_provider.dart';
import '../auth/auth_provider.dart';
import '../auth/farm_selection_sheet.dart';
import '../auth/login_screen.dart';
import '../eggs/eggs_screen.dart';
import '../health/health_screen.dart';
import '../inventory/inventory_screen.dart';
import '../buildings/buildings_screen.dart';
import '../members/members_screen.dart';
import '../sync/sync_provider.dart';
import '../sync/sync_screen.dart';
import '../subscriptions/subscription_screen.dart';
import '../reports/reports_screen.dart';
import '../finances/finances_screen.dart';

class AppDrawer extends ConsumerWidget {
  final Function(String moduleKey)? onSelectModule;
  final Function(int tabIndex)? onSelectTab;

  const AppDrawer({super.key, this.onSelectModule, this.onSelectTab});

  void _navigateTo(BuildContext context, String key, Widget screen) {
    Navigator.of(context).pop();
    if (onSelectModule != null) {
      onSelectModule!(key);
    } else {
      Navigator.of(context).push(MaterialPageRoute(builder: (_) => screen));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final farm = authState.activeFarm;

    return Drawer(
      backgroundColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
      child: SafeArea(
        child: Column(
          children: [
            // En-tête profil & exploitation active
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(
                    color: isDark ? AppColors.borderDark : AppColors.borderLight,
                  ),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppColors.primarySoft,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                        ),
                        child: const Icon(Icons.egg_alt_rounded, color: AppColors.primary, size: 24),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              "Le Fermier",
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w900,
                                color: AppColors.primary,
                              ),
                            ),
                            Text(
                              "Gestion avicole Ouest-Africaine",
                              style: TextStyle(
                                fontSize: 11,
                                color: AppColors.textMutedLight,
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded),
                        onPressed: () => Navigator.of(context).pop(),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Carte Exploitation Active
                  InkWell(
                    onTap: () {
                      Navigator.of(context).pop();
                      FarmSelectionSheet.show(context);
                    },
                    borderRadius: BorderRadius.circular(14),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.backgroundDark : AppColors.backgroundLight,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: isDark ? AppColors.borderDark : AppColors.borderLight,
                        ),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.agriculture_rounded, color: AppColors.primary, size: 22),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  farm?.name ?? "Sélectionner une ferme",
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                  overflow: TextOverflow.ellipsis,
                                ),
                                Text(
                                  _formatRole(farm?.role),
                                  style: const TextStyle(fontSize: 11, color: AppColors.textMutedLight),
                                ),
                              ],
                            ),
                          ),
                          const Icon(Icons.unfold_more_rounded, size: 18, color: AppColors.textMutedLight),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Liste des modules disponibles selon l'abonnement et le rôle
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
                children: [
                  _DrawerItem(
                    icon: Icons.dashboard_rounded,
                    label: "Tableau de bord",
                    onTap: () {
                      Navigator.of(context).pop();
                      if (onSelectModule != null) {
                        onSelectModule!('dashboard');
                      } else {
                        onSelectTab?.call(0);
                      }
                    },
                  ),

                  // Module Bandes de volailles
                  if (farm == null || farm.canViewFlocks)
                    _DrawerItem(
                      icon: Icons.grid_view_rounded,
                      label: "Bandes de volailles",
                      badge: farm?.productionType,
                      onTap: () {
                        Navigator.of(context).pop();
                        if (onSelectModule != null) {
                          onSelectModule!('flocks');
                        } else {
                          onSelectTab?.call(1);
                        }
                      },
                    ),

                  // Module Ponte (Conditionné par le type d'élevage et le rôle)
                  if (farm == null || farm.canViewEggs)
                    _DrawerItem(
                      icon: Icons.egg_rounded,
                      label: "Pontes d'œufs",
                      color: AppColors.accent,
                      onTap: () => _navigateTo(context, 'eggs', const EggsScreen()),
                    ),

                  // Module Caisse (Conditionné par le rôle : Propriétaire, Gérant, Comptable)
                  if (farm == null || farm.canViewFinance)
                    _DrawerItem(
                      icon: Icons.account_balance_wallet_rounded,
                      label: "Trésorerie & Ventes",
                      color: AppColors.primary,
                      onTap: () => _navigateTo(context, 'finance', const FinancesScreen()),
                    ),

                  // Module Santé & Traitements (Vétérinaire / Gérant)
                  if (farm == null || farm.canViewHealth)
                    _DrawerItem(
                      icon: Icons.medical_services_rounded,
                      label: "Santé & Traitements",
                      onTap: () => _navigateTo(context, 'health', const HealthScreen()),
                    ),

                  // Module Stocks & Alimentation (Magasinier / Gérant)
                  if (farm == null || farm.canViewInventory)
                    _DrawerItem(
                      icon: Icons.inventory_2_rounded,
                      label: "Stocks & Intrants",
                      onTap: () => _navigateTo(context, 'inventory', const InventoryScreen()),
                    ),

                  // Module Bâtiments & Poulaillers (Gérant / Propriétaire)
                  if (farm == null || farm.canManageBuildings)
                    _DrawerItem(
                      icon: Icons.home_work_rounded,
                      label: "Bâtiments & Poulaillers",
                      onTap: () {
                        Navigator.of(context).pop();
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const BuildingsScreen()),
                        );
                      },
                    ),

                  // Module Équipe & Collaborateurs (Propriétaire / Gérant)
                  if (farm == null || farm.canManageMembers)
                    _DrawerItem(
                      icon: Icons.people_alt_rounded,
                      label: "Équipe & Collaborateurs",
                      onTap: () {
                        Navigator.of(context).pop();
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const MembersScreen()),
                        );
                      },
                    ),

                  // Module Synchronisation & Hors-ligne (Toujours accessible à toute l'équipe)
                  _DrawerItem(
                    icon: Icons.sync_rounded,
                    label: "Synchronisation",
                    badge: ref.watch(syncProvider).pendingCount > 0
                        ? "${ref.watch(syncProvider).pendingCount} en attente"
                        : null,
                    color: ref.watch(syncProvider).pendingCount > 0
                        ? AppColors.accent
                        : null,
                    onTap: () {
                      Navigator.of(context).pop();
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const SyncScreen()),
                      );
                    },
                  ),

                  // Module Abonnement & Licences (Propriétaire / Admin uniquement)
                  if (farm == null || farm.canManageSubscription)
                    _DrawerItem(
                      icon: Icons.workspace_premium_rounded,
                      label: "Abonnement & Formules",
                      color: AppColors.accent,
                      onTap: () {
                        Navigator.of(context).pop();
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const SubscriptionScreen()),
                        );
                      },
                    ),

                  // Module Rapports & Partage WhatsApp / SMS
                  if (farm == null || farm.canViewReports)
                    _DrawerItem(
                      icon: Icons.share_rounded,
                      label: "Rapports & Partage",
                      onTap: () => _navigateTo(context, 'reports', const ReportsScreen()),
                    ),

                  const Divider(height: 24),

                  // Bouton du Mode (Light / Dark mode toggle direct)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    child: Row(
                      children: [
                        Icon(
                          isDark ? Icons.dark_mode_rounded : Icons.light_mode_rounded,
                          color: isDark ? AppColors.accent : AppColors.primary,
                          size: 22,
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                isDark ? "Mode sombre" : "Mode clair",
                                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                              ),
                              Text(
                                isDark ? "Actif pour reposer les yeux" : "Thème lumineux de jour",
                                style: const TextStyle(fontSize: 10, color: AppColors.textMutedLight),
                              ),
                            ],
                          ),
                        ),
                        Switch(
                          value: isDark,
                          activeThumbColor: AppColors.primary,
                          onChanged: (_) {
                            ref.read(themeModeProvider.notifier).toggleTheme(context);
                          },
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Pied de page : Déconnexion
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: BoxDecoration(
                border: Border(
                  top: BorderSide(
                    color: isDark ? AppColors.borderDark : AppColors.borderLight,
                  ),
                ),
              ),
              child: ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.danger.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.logout_rounded, color: AppColors.danger, size: 20),
                ),
                title: const Text(
                  "Déconnexion",
                  style: TextStyle(color: AppColors.danger, fontWeight: FontWeight.bold, fontSize: 13),
                ),
                subtitle: const Text("Fermer la session sur cet appareil", style: TextStyle(fontSize: 11)),
                onTap: () async {
                  Navigator.of(context).pop();
                  await ref.read(authProvider.notifier).logout();
                  if (context.mounted) {
                    Navigator.of(context).pushAndRemoveUntil(
                      MaterialPageRoute(builder: (_) => const LoginScreen()),
                      (route) => false,
                    );
                  }
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatRole(String? role) {
    switch (role?.toUpperCase()) {
      case 'OWNER':
        return 'Propriétaire • Plein accès';
      case 'ADMIN':
        return 'Administrateur';
      case 'MANAGER':
        return 'Gérant d\'exploitation';
      case 'PRODUCTION_LEAD':
        return 'Responsable Ponte / Élevage';
      case 'ACCOUNTANT':
        return 'Comptable • Trésorerie';
      case 'VET_CONSULTANT':
        return 'Vétérinaire conseil';
      case 'STOCK_KEEPER':
        return 'Gestionnaire des stocks';
      default:
        return 'Membre de l\'équipe';
    }
  }
}

class _DrawerItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String? badge;
  final Color? color;
  final VoidCallback onTap;

  const _DrawerItem({
    required this.icon,
    required this.label,
    this.badge,
    this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final itemColor = color ?? Theme.of(context).textTheme.bodyMedium?.color;

    return ListTile(
      dense: true,
      leading: Icon(icon, color: itemColor, size: 22),
      title: Text(
        label,
        style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: itemColor),
      ),
      trailing: badge != null
          ? Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: AppColors.primarySoft,
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                badge!,
                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.primary),
              ),
            )
          : null,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      onTap: onTap,
    );
  }
}
