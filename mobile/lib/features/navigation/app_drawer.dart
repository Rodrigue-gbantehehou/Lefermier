import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/theme_provider.dart';
import '../auth/auth_provider.dart';
import '../auth/login_screen.dart';
import '../eggs/eggs_screen.dart';
import '../health/health_screen.dart';
import '../inventory/inventory_screen.dart';
import '../buildings/buildings_screen.dart';
import '../members/members_screen.dart';
import '../sync/sync_provider.dart';
import '../sync/sync_screen.dart';
import '../subscriptions/subscription_screen.dart';
import '../finances/finances_screen.dart';
import '../contacts/contacts_screen.dart';
import '../settings/farm_settings_screen.dart';

class AppDrawer extends ConsumerWidget {
  final Function(String moduleKey)? onSelectModule;
  final Function(int tabIndex)? onSelectTab;

  const AppDrawer({super.key, this.onSelectModule, this.onSelectTab});

  void _navigateTo(BuildContext context, String key, Widget screen) {
    HapticFeedback.lightImpact();
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
            // En-tête compact et épuré avec rappel de la ferme active
            Container(
              padding: const EdgeInsets.fromLTRB(16, 12, 8, 12),
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(
                    color: isDark ? AppColors.borderDark : AppColors.borderLight,
                  ),
                ),
              ),
              child: Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: isDark ? AppColors.borderDark : AppColors.borderLight,
                      ),
                    ),
                    child: Image.asset(
                      'assets/images/logo.png',
                      fit: BoxFit.contain,
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, size: 20),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                  const SizedBox(width: 6),
                ],
              ),
            ),

            // Liste continue, compacte et bien ordonnée (sans en-têtes de section)
            Expanded(
              child: ListView(
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                children: [
                  // 1. Tableau de bord
                  _DrawerItem(
                    icon: Icons.dashboard_rounded,
                    label: "Tableau de bord",
                    onTap: () {
                      HapticFeedback.lightImpact();
                      Navigator.of(context).pop();
                      if (onSelectModule != null) {
                        onSelectModule!('dashboard');
                      } else {
                        onSelectTab?.call(0);
                      }
                    },
                  ),

                  // 2. Bandes de volailles
                  if (farm == null || farm.canViewFlocks)
                    _DrawerItem(
                      icon: Icons.grid_view_rounded,
                      label: "Bandes de volailles",
                      badge: farm?.productionType,
                      onTap: () {
                        HapticFeedback.lightImpact();
                        Navigator.of(context).pop();
                        if (onSelectModule != null) {
                          onSelectModule!('flocks');
                        } else {
                          onSelectTab?.call(1);
                        }
                      },
                    ),

                  // 3. Pontes d'œufs
                  if (farm?.canViewEggs == true)
                    _DrawerItem(
                      icon: Icons.egg_rounded,
                      label: "Pontes d'œufs",
                      onTap: () => _navigateTo(context, 'eggs', const EggsScreen()),
                    ),

                  // 4. Trésorerie & Ventes
                  if (farm?.canViewFinance == true)
                    _DrawerItem(
                      icon: Icons.account_balance_wallet_rounded,
                      label: "Trésorerie & Ventes",
                      onTap: () => _navigateTo(context, 'finance', const FinancesScreen()),
                    ),

                  // 5. Stocks & Intrants
                  if (farm?.canViewInventory == true)
                    _DrawerItem(
                      icon: Icons.inventory_2_rounded,
                      label: "Stocks & Intrants",
                      onTap: () => _navigateTo(context, 'inventory', const InventoryScreen()),
                    ),

                  // 6. Santé & Traitements
                  if (farm?.canViewHealth == true)
                    _DrawerItem(
                      icon: Icons.medical_services_rounded,
                      label: "Santé & Traitements",
                      onTap: () => _navigateTo(context, 'health', const HealthScreen()),
                    ),

                  // 7. Bâtiments & Poulaillers
                  if (farm?.canManageBuildings == true)
                    _DrawerItem(
                      icon: Icons.home_work_rounded,
                      label: "Bâtiments & Poulaillers",
                      onTap: () => _navigateTo(context, 'buildings', const BuildingsScreen()),
                    ),

                  // 8. Équipe & Collaborateurs
                  if (farm?.canManageMembers == true)
                    _DrawerItem(
                      icon: Icons.people_alt_rounded,
                      label: "Équipe & Collaborateurs",
                      onTap: () => _navigateTo(context, 'members', const MembersScreen()),
                    ),

                  // 9. Répertoire & Contacts
                  _DrawerItem(
                    icon: Icons.contacts_rounded,
                    label: "Répertoire & Contacts",
                    onTap: () => _navigateTo(context, 'contacts', const ContactsScreen()),
                  ),

                  // 10. Synchronisation
                  _DrawerItem(
                    icon: Icons.sync_rounded,
                    label: "Synchronisation",
                    badge: ref.watch(syncProvider).pendingCount > 0
                        ? "${ref.watch(syncProvider).pendingCount} en attente"
                        : null,
                    badgeIsAlert: ref.watch(syncProvider).pendingCount > 0,
                    onTap: () => _navigateTo(context, 'sync', const SyncScreen()),
                  ),

                  // 11. Abonnement & Formules
                  if (farm?.canManageSubscription == true)
                    _DrawerItem(
                      icon: Icons.workspace_premium_rounded,
                      label: "Abonnement & Formules",
                      onTap: () => _navigateTo(context, 'subscription', const SubscriptionScreen()),
                    ),

                  // 12. Paramètres de la ferme
                  if (farm?.isOwner == true)
                    _DrawerItem(
                      icon: Icons.settings_rounded,
                      label: "Paramètres de la ferme",
                      onTap: () => _navigateTo(context, 'farm_settings', const FarmSettingsScreen()),
                    ),
                ],
              ),
            ),

            // Pied de page : Mode sombre compact & Déconnexion
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                border: Border(
                  top: BorderSide(
                    color: isDark ? AppColors.borderDark : AppColors.borderLight,
                  ),
                ),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Mode clair / sombre compact
                  Row(
                    children: [
                      Icon(
                        isDark ? Icons.dark_mode_rounded : Icons.light_mode_rounded,
                        color: isDark ? AppColors.brandEmeraldLight : AppColors.primary,
                        size: 18,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          isDark ? "Mode sombre" : "Mode clair",
                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12.5),
                        ),
                      ),
                      Transform.scale(
                        scale: 0.75,
                        child: Switch(
                          value: isDark,
                          activeThumbColor: AppColors.primary,
                          onChanged: (_) {
                            ref.read(themeModeProvider.notifier).toggleTheme(context);
                          },
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  // Déconnexion sobre
                  InkWell(
                    onTap: () async {
                      HapticFeedback.lightImpact();
                      Navigator.of(context).pop();
                      await ref.read(authProvider.notifier).logout();
                      if (context.mounted) {
                        Navigator.of(context).pushAndRemoveUntil(
                          MaterialPageRoute(builder: (_) => const LoginScreen()),
                          (route) => false,
                        );
                      }
                    },
                    borderRadius: BorderRadius.circular(8),
                    child: const Padding(
                      padding: EdgeInsets.symmetric(vertical: 6, horizontal: 4),
                      child: Row(
                        children: [
                          Icon(Icons.logout_rounded, color: AppColors.danger, size: 18),
                          SizedBox(width: 10),
                          Text(
                            "Déconnexion",
                            style: TextStyle(
                              color: AppColors.danger,
                              fontWeight: FontWeight.bold,
                              fontSize: 12.5,
                            ),
                          ),
                        ],
                      ),
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

class _DrawerItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String? badge;
  final bool badgeIsAlert;
  final VoidCallback onTap;

  const _DrawerItem({
    required this.icon,
    required this.label,
    this.badge,
    this.badgeIsAlert = false,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryColor = isDark ? AppColors.brandEmeraldLight : AppColors.primary;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 1.5),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5.5),
          child: Row(
            children: [
              Container(
                width: 30,
                height: 30,
                decoration: BoxDecoration(
                  color: isDark
                      ? AppColors.brandEmeraldLight.withValues(alpha: 0.15)
                      : AppColors.primary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  icon,
                  color: primaryColor,
                  size: 17,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
              ),
              if (badge != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  margin: const EdgeInsets.only(right: 4),
                  decoration: BoxDecoration(
                    color: badgeIsAlert
                        ? AppColors.accent.withValues(alpha: 0.15)
                        : primaryColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    badge!,
                    style: TextStyle(
                      fontSize: 9.5,
                      fontWeight: FontWeight.bold,
                      color: badgeIsAlert ? AppColors.accent : primaryColor,
                    ),
                  ),
                ),
              Icon(
                Icons.chevron_right_rounded,
                size: 15,
                color: AppColors.textMutedLight.withValues(alpha: 0.35),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
