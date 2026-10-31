import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../auth/auth_provider.dart';
import '../dashboard/dashboard_screen.dart';
import '../dashboard/quick_action_sheet.dart';
import '../flocks/flocks_screen.dart';
import '../eggs/eggs_screen.dart';
import '../finances/finances_screen.dart';
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
    if (index == 4) {
      // 5e onglet : Ouvrir le Menu Drawer
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
      onRecordEgg: () {
        setState(() => _currentIndex = 2);
      },
      onRecordFeeding: () {
        setState(() => _currentIndex = 1);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("Enregistrement de la distribution d'aliment..."),
            backgroundColor: AppColors.primary,
          ),
        );
      },
      onRecordMovement: () {
        setState(() => _currentIndex = 1);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("Enregistrement mortalité / pesée..."),
            backgroundColor: AppColors.danger,
          ),
        );
      },
      onRecordIncome: () {
        setState(() => _currentIndex = 3);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("Nouvelle recette de vente enregistrée"),
            backgroundColor: AppColors.primary,
          ),
        );
      },
      onRecordExpense: () {
        setState(() => _currentIndex = 3);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("Nouvelle dépense enregistrée"),
            backgroundColor: AppColors.accent,
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final farm = authState.activeFarm;

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final navBgColor = isDark ? AppColors.surfaceDark : Colors.white;
    final borderColor = isDark ? AppColors.borderDark : AppColors.borderLight;

    // Détermination adaptative des onglets selon l'offre et les droits
    final bool canEgg = farm == null || farm.canViewEggs;

    final screens = [
      DashboardScreen(
        onOpenQuickActions: _openQuickActions,
        onNavigateToEggs: () => setState(() => _currentIndex = 2),
        onNavigateToFlocks: () => setState(() => _currentIndex = 1),
        onNavigateToFinances: () => setState(() => _currentIndex = 3),
        onOpenMenu: _openDrawer,
      ),
      FlocksScreen(onOpenMenu: _openDrawer),
      EggsScreen(onOpenMenu: _openDrawer),
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
        onPressed: _openQuickActions,
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 6,
        shape: const CircleBorder(),
        child: const Icon(Icons.add_rounded, size: 28),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: navBgColor,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 16,
              offset: const Offset(0, -4),
            ),
          ],
          border: Border(
            top: BorderSide(color: borderColor, width: 1),
          ),
        ),
        child: SafeArea(
          top: false,
          child: BottomAppBar(
            elevation: 0,
            color: Colors.transparent,
            notchMargin: 6,
            shape: const CircularNotchedRectangle(),
            padding: const EdgeInsets.symmetric(horizontal: 4),
            height: 64,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                // 1. Accueil
                _buildNavItem(
                  index: 0,
                  icon: Icons.dashboard_outlined,
                  activeIcon: Icons.dashboard_rounded,
                  label: "Accueil",
                ),
                // 2. Bandes
                _buildNavItem(
                  index: 1,
                  icon: Icons.pets_outlined,
                  activeIcon: Icons.pets_rounded,
                  label: "Bandes",
                ),

                // Espace pour le FAB central
                const SizedBox(width: 48),

                // 3. Ponte
                _buildNavItem(
                  index: 2,
                  icon: Icons.egg_outlined,
                  activeIcon: Icons.egg_rounded,
                  label: canEgg ? "Ponte" : "Soins",
                ),

                // 4. Caisse & Ventes
                _buildNavItem(
                  index: 3,
                  icon: Icons.account_balance_wallet_outlined,
                  activeIcon: Icons.account_balance_wallet_rounded,
                  label: "Caisse",
                ),

                // 5. Menu
                _buildNavItem(
                  index: 4,
                  icon: Icons.menu_rounded,
                  activeIcon: Icons.menu_rounded,
                  label: "Menu",
                ),
              ],
            ),
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
    final color = isSelected ? AppColors.primary : AppColors.textMutedLight;

    return InkWell(
      onTap: () => _onTabSelected(index),
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isSelected ? activeIcon : icon,
              color: color,
              size: 22,
            ),
            const SizedBox(height: 3),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                color: color,
              ),
            ),
            if (isSelected)
              Container(
                margin: const EdgeInsets.only(top: 2),
                width: 4,
                height: 4,
                decoration: const BoxDecoration(
                  color: AppColors.primary,
                  shape: BoxShape.circle,
                ),
              ),
          ],
        ),
      ),
    );
  }
}
