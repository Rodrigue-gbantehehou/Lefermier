import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/models/farm.dart';
import '../../core/theme/app_theme.dart';
import '../auth/auth_provider.dart';
import '../dashboard/dashboard_screen.dart';
import '../dashboard/quick_action_sheet.dart';
import '../eggs/eggs_screen.dart';
import '../eggs/record_egg_modal.dart';
import '../finances/finances_screen.dart';
import '../finances/record_transaction_modal.dart';
import '../flocks/flocks_screen.dart';
import '../flocks/record_movement_modal.dart';
import '../health/health_screen.dart';
import '../inventory/inventory_screen.dart';
import '../inventory/record_feeding_modal.dart';
import '../reports/reports_screen.dart';
import 'app_drawer.dart';

class _NavDestination {
  final String key;
  final String label;
  final IconData icon;
  final IconData activeIcon;
  final Widget Function(VoidCallback onOpenMenu) screenBuilder;

  const _NavDestination({
    required this.key,
    required this.label,
    required this.icon,
    required this.activeIcon,
    required this.screenBuilder,
  });
}

class BottomNavScaffold extends ConsumerStatefulWidget {
  const BottomNavScaffold({super.key});

  @override
  ConsumerState<BottomNavScaffold> createState() => _BottomNavScaffoldState();
}

class _BottomNavScaffoldState extends ConsumerState<BottomNavScaffold> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  int _currentIndex = 0;

  void _openDrawer() {
    _scaffoldKey.currentState?.openDrawer();
  }

  void _onTabSelected(int index) {
    if (index != _currentIndex) {
      setState(() {
        _currentIndex = index;
      });
    }
  }

  void _openQuickActions() {
    QuickActionSheet.show(
      context,
      onRecordEgg: () => RecordEggModal.show(context),
      onRecordFeeding: () => RecordFeedingModal.show(context),
      onRecordMovement: () => RecordMovementModal.show(context),
      onRecordIncome: () => RecordTransactionModal.show(context, initialType: "INCOME"),
      onRecordExpense: () => RecordTransactionModal.show(context, initialType: "EXPENSE"),
    );
  }

  List<_NavDestination> _getRightDestinations(Farm? farm) {
    final role = (farm?.role ?? '').toUpperCase();
    final List<String> priorityOrder;
    if (role == 'ACCOUNTANT') {
      priorityOrder = ['finance', 'reports', 'inventory', 'health', 'eggs'];
    } else if (role == 'STOCK_KEEPER') {
      priorityOrder = ['inventory', 'health', 'reports', 'finance', 'eggs'];
    } else if (role == 'VET_CONSULTANT') {
      priorityOrder = ['health', 'inventory', 'reports', 'finance', 'eggs'];
    } else if (role == 'PRODUCTION_LEAD') {
      priorityOrder = ['inventory', 'eggs', 'health', 'reports', 'finance'];
    } else {
      // OWNER, ADMIN, MANAGER ou profil par défaut
      priorityOrder = ['finance', 'inventory', 'health', 'reports', 'eggs'];
    }

    final candidates = <String, _NavDestination>{
      if (farm == null || farm.canViewFinance)
        'finance': _NavDestination(
          key: 'finance',
          label: "Caisse",
          icon: Icons.account_balance_wallet_outlined,
          activeIcon: Icons.account_balance_wallet_rounded,
          screenBuilder: (openMenu) => FinancesScreen(onOpenMenu: openMenu),
        ),
      if (farm == null || farm.canViewInventory)
        'inventory': _NavDestination(
          key: 'inventory',
          label: "Stocks",
          icon: Icons.inventory_2_outlined,
          activeIcon: Icons.inventory_2_rounded,
          screenBuilder: (openMenu) => InventoryScreen(onOpenMenu: openMenu),
        ),
      if (farm == null || farm.canViewHealth)
        'health': _NavDestination(
          key: 'health',
          label: "Santé",
          icon: Icons.medical_services_outlined,
          activeIcon: Icons.medical_services_rounded,
          screenBuilder: (openMenu) => HealthScreen(onOpenMenu: openMenu),
        ),
      if (farm == null || farm.canViewReports)
        'reports': _NavDestination(
          key: 'reports',
          label: "Rapports",
          icon: Icons.bar_chart_outlined,
          activeIcon: Icons.bar_chart_rounded,
          screenBuilder: (openMenu) => ReportsScreen(onOpenMenu: openMenu),
        ),
      if (farm == null || farm.canViewEggs)
        'eggs': _NavDestination(
          key: 'eggs',
          label: "Ponte",
          icon: Icons.egg_outlined,
          activeIcon: Icons.egg_rounded,
          screenBuilder: (openMenu) => EggsScreen(onOpenMenu: openMenu),
        ),
    };

    final result = <_NavDestination>[];
    for (final key in priorityOrder) {
      if (candidates.containsKey(key)) {
        result.add(candidates[key]!);
        if (result.length == 2) break;
      }
    }
    // Compléter si moins de 2
    for (final entry in candidates.entries) {
      if (!result.any((d) => d.key == entry.key)) {
        result.add(entry.value);
        if (result.length == 2) break;
      }
    }
    return result;
  }

  void _navigateToModule(String key, List<_NavDestination> rightDestinations) {
    if (key == 'dashboard') {
      setState(() => _currentIndex = 0);
      return;
    }
    if (key == 'flocks') {
      setState(() => _currentIndex = 1);
      return;
    }

    final rightIdx = rightDestinations.indexWhere((d) => d.key == key);
    if (rightIdx != -1) {
      setState(() => _currentIndex = 2 + rightIdx);
      return;
    }

    // Le module n'est pas dans les 4 onglets de la barre du bas : l'ouvrir avec bouton retour
    Widget target;
    switch (key) {
      case 'eggs':
        target = const EggsScreen();
        break;
      case 'finance':
        target = const FinancesScreen();
        break;
      case 'inventory':
        target = const InventoryScreen();
        break;
      case 'health':
        target = const HealthScreen();
        break;
      case 'reports':
        target = const ReportsScreen();
        break;
      default:
        return;
    }
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => target));
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final farm = authState.activeFarm;

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final navBgColor = isDark ? AppColors.navBarDark : AppColors.navBarLight;

    // Détermination dynamique des 2 onglets de droite selon les droits et l'abonnement
    final rightDestinations = _getRightDestinations(farm);

    final screens = <Widget>[
      DashboardScreen(
        onOpenQuickActions: _openQuickActions,
        onNavigateToEggs: () => _navigateToModule('eggs', rightDestinations),
        onNavigateToFlocks: () => _navigateToModule('flocks', rightDestinations),
        onNavigateToFinances: () => _navigateToModule('finance', rightDestinations),
        onOpenMenu: _openDrawer,
      ),
      FlocksScreen(onOpenMenu: _openDrawer),
      ...rightDestinations.map((d) => d.screenBuilder(_openDrawer)),
    ];

    // Sécurité d'index
    final safeIndex = _currentIndex < screens.length ? _currentIndex : 0;

    return Scaffold(
      key: _scaffoldKey,
      drawer: AppDrawer(
        onSelectModule: (modKey) => _navigateToModule(modKey, rightDestinations),
        onSelectTab: (idx) {
          if (idx < screens.length) {
            setState(() => _currentIndex = idx);
          }
        },
      ),
      extendBody: false,
      body: IndexedStack(
        index: safeIndex,
        children: screens,
      ),
      floatingActionButton: (farm == null || farm.hasAnyQuickAction)
          ? FloatingActionButton(
              heroTag: 'fab_nav_center',
              onPressed: _openQuickActions,
              backgroundColor: AppColors.accentLight,
              foregroundColor: Colors.white,
              elevation: 6,
              shape: const CircleBorder(),
              tooltip: "Actions rapides",
              child: const Icon(Icons.add_rounded, size: 28),
            )
          : null,
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      bottomNavigationBar: BottomAppBar(
        elevation: 10,
        shadowColor: Colors.black.withValues(alpha: 0.35),
        color: navBgColor,
        notchMargin: 6,
        shape: const CircularNotchedRectangle(),
        clipBehavior: Clip.antiAlias,
        padding: const EdgeInsets.symmetric(horizontal: 4),
        height: 64,
        child: SafeArea(
          top: false,
          child: Row(
            children: [
              // Bloc gauche : 2 onglets fondamentaux (Accueil, Bandes)
              Expanded(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _buildNavItem(
                      index: 0,
                      icon: Icons.dashboard_outlined,
                      activeIcon: Icons.dashboard_rounded,
                      label: "Accueil",
                    ),
                    _buildNavItem(
                      index: 1,
                      icon: Icons.pets_outlined,
                      activeIcon: Icons.pets_rounded,
                      label: "Bandes",
                    ),
                  ],
                ),
              ),

              // Espace central pour le FAB encastré
              const SizedBox(width: 56),

              // Bloc droit : 2 modules personnalisés selon le rôle et les droits
              Expanded(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    if (rightDestinations.isNotEmpty)
                      _buildNavItem(
                        index: 2,
                        icon: rightDestinations[0].icon,
                        activeIcon: rightDestinations[0].activeIcon,
                        label: rightDestinations[0].label,
                      ),
                    if (rightDestinations.length > 1)
                      _buildNavItem(
                        index: 3,
                        icon: rightDestinations[1].icon,
                        activeIcon: rightDestinations[1].activeIcon,
                        label: rightDestinations[1].label,
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem({
    required int index,
    required IconData icon,
    required IconData activeIcon,
    required String label,
  }) {
    final isSelected = _currentIndex == index;
    final color = isSelected ? Colors.white : Colors.white.withValues(alpha: 0.70);
    const activeIndicatorColor = AppColors.accentGold;

    return InkWell(
      onTap: () => _onTabSelected(index),
      borderRadius: BorderRadius.circular(12),
      splashColor: Colors.white.withValues(alpha: 0.15),
      highlightColor: Colors.white.withValues(alpha: 0.1),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              isSelected ? activeIcon : icon,
              color: isSelected ? AppColors.accentWarm : color,
              size: 22,
            ),
            const SizedBox(height: 3),
            Text(
              label,
              style: TextStyle(
                fontSize: 10.5,
                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w500,
                color: isSelected ? Colors.white : color,
                letterSpacing: isSelected ? 0.2 : 0,
              ),
            ),
            const SizedBox(height: 2),
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: isSelected ? 16 : 0,
              height: 2.5,
              decoration: BoxDecoration(
                color: activeIndicatorColor,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
