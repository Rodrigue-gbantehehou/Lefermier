import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../dashboard/dashboard_screen.dart';
import '../dashboard/quick_action_sheet.dart';
import '../eggs/eggs_screen.dart';
import '../eggs/record_egg_modal.dart';
import '../finances/finances_screen.dart';
import '../finances/record_transaction_modal.dart';
import '../flocks/flocks_screen.dart';
import '../flocks/record_movement_modal.dart';
import '../inventory/record_feeding_modal.dart';
import 'app_drawer.dart';

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
    if (index == 3) {
      // 4e élément : Ouvrir le Menu Drawer
      _openDrawer();
      return;
    }

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

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final navBgColor = isDark ? AppColors.navBarDark : AppColors.navBarLight;

    final screens = [
      DashboardScreen(
        onOpenQuickActions: _openQuickActions,
        onNavigateToEggs: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => const EggsScreen(),
            ),
          );
        },
        onNavigateToFlocks: () => setState(() => _currentIndex = 1),
        onNavigateToFinances: () => setState(() => _currentIndex = 2),
        onOpenMenu: _openDrawer,
      ),
      FlocksScreen(onOpenMenu: _openDrawer),
      FinancesScreen(onOpenMenu: _openDrawer),
    ];

    // Sécurité d'index
    final safeIndex = _currentIndex < screens.length ? _currentIndex : 0;

    return Scaffold(
      key: _scaffoldKey,
      drawer: AppDrawer(
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
      floatingActionButton: FloatingActionButton(
        heroTag: 'fab_nav_center',
        onPressed: _openQuickActions,
        backgroundColor: AppColors.accentLight,
        foregroundColor: Colors.white,
        elevation: 6,
        shape: const CircleBorder(),
        tooltip: "Actions rapides",
        child: const Icon(Icons.add_rounded, size: 28),
      ),
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
              // Bloc gauche : 2 onglets parfaitement espacés
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

              // Bloc droit : 2 onglets parfaitement espacés
              Expanded(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _buildNavItem(
                      index: 2,
                      icon: Icons.account_balance_wallet_outlined,
                      activeIcon: Icons.account_balance_wallet_rounded,
                      label: "Caisse",
                    ),
                    _buildNavItem(
                      index: 3,
                      icon: Icons.menu_rounded,
                      activeIcon: Icons.menu_rounded,
                      label: "Menu",
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
