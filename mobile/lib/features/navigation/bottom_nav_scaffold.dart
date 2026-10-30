import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../dashboard/dashboard_screen.dart';
import '../dashboard/quick_action_sheet.dart';
import '../flocks/flocks_screen.dart';
import '../eggs/eggs_screen.dart';
import '../finances/finances_screen.dart';

class BottomNavScaffold extends StatefulWidget {
  const BottomNavScaffold({super.key});

  @override
  State<BottomNavScaffold> createState() => _BottomNavScaffoldState();
}

class _BottomNavScaffoldState extends State<BottomNavScaffold> {
  int _currentIndex = 0;

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
      onRecordEgg: () {
        Navigator.of(context).pop();
        setState(() => _currentIndex = 2); // Switch to Eggs tab
      },
      onRecordFeeding: () {
        Navigator.of(context).pop();
        setState(() => _currentIndex = 1); // Switch to Flocks
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("Enregistrement de la distribution d'aliment..."),
            backgroundColor: AppColors.primary,
          ),
        );
      },
      onRecordMovement: () {
        Navigator.of(context).pop();
        setState(() => _currentIndex = 1);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("Enregistrement mortalité / pesée..."),
            backgroundColor: AppColors.error,
          ),
        );
      },
      onRecordIncome: () {
        Navigator.of(context).pop();
        setState(() => _currentIndex = 3); // Switch to Finances
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("Nouvelle recette de vente enregistrée"),
            backgroundColor: AppColors.primary,
          ),
        );
      },
      onRecordExpense: () {
        Navigator.of(context).pop();
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
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final navBgColor = isDark ? AppColors.surfaceDark : Colors.white;
    final borderColor = isDark ? AppColors.borderDark : AppColors.borderLight;

    final screens = [
      DashboardScreen(
        onOpenQuickActions: _openQuickActions,
        onNavigateToEggs: () => setState(() => _currentIndex = 2),
        onNavigateToFlocks: () => setState(() => _currentIndex = 1),
        onNavigateToFinances: () => setState(() => _currentIndex = 3),
      ),
      const FlocksScreen(),
      const EggsScreen(),
      const FinancesScreen(),
    ];

    return Scaffold(
      extendBody: false, // Ensures bottom content does not bleed under the bottom nav bar
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _openQuickActions,
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 4,
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
            notchMargin: 8,
            shape: const CircularNotchedRectangle(),
            padding: const EdgeInsets.symmetric(horizontal: 8),
            height: 64,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildNavItem(
                  index: 0,
                  icon: Icons.dashboard_outlined,
                  activeIcon: Icons.dashboard_rounded,
                  label: "Accueil",
                ),
                _buildNavItem(
                  index: 1,
                  icon: Icons.grid_view_outlined,
                  activeIcon: Icons.grid_view_rounded,
                  label: "Bandes",
                ),
                const SizedBox(width: 48), // Gap for docked center FAB
                _buildNavItem(
                  index: 2,
                  icon: Icons.egg_outlined,
                  activeIcon: Icons.egg_rounded,
                  label: "Ponte",
                ),
                _buildNavItem(
                  index: 3,
                  icon: Icons.account_balance_wallet_outlined,
                  activeIcon: Icons.account_balance_wallet_rounded,
                  label: "Caisse",
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
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
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
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
