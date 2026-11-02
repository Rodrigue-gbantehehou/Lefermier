import 'package:flutter/material.dart';

class AppColors {
  // Brand Emerald
  static const Color primary = Color(0xFF059669);
  static const Color primaryHover = Color(0xFF047857);
  static const Color primaryLight = Color(0xFF10B981);
  static const Color primarySoft = Color(0xFFECFDF5);
  static const Color primaryDark = Color(0xFF064E3B);

  // Amber / Egg Accent
  static const Color accent = Color(0xFFD97706);
  static const Color accentLight = Color(0xFFF59E0B);
  static const Color accentSoft = Color(0xFFFFFBEB);
  static const Color accentGold = Color(0xFFFBBF24);
  static const Color accentWarm = Color(0xFFFDE68A);

  // Bottom Navigation Bar Brand Colors
  static const Color navBarLight = Color(0xFF047857);
  static const Color navBarDark = Color(0xFF064E3B);

  // Status & Utility
  static const Color success = Color(0xFF16A34A);
  static const Color danger = Color(0xFFDC2626);
  static const Color error = Color(0xFFDC2626);
  static const Color warning = Color(0xFFEAB308);

  // Light Theme Neutrals - Warm, organic agricultural linen tone (not clinical white)
  static const Color backgroundLight = Color(0xFFF6F5EE);
  static const Color surfaceLight = Color(0xFFFFFFFF);
  static const Color borderLight = Color(0xFFE6E3D7);
  static const Color textMainLight = Color(0xFF0F172A);
  static const Color textMutedLight = Color(0xFF64748B);

  // Dark Theme Neutrals
  static const Color backgroundDark = Color(0xFF0F172A);
  static const Color surfaceDark = Color(0xFF1E293B);
  static const Color borderDark = Color(0xFF334155);
  static const Color textMainDark = Color(0xFFF8FAFC);
  static const Color textMutedDark = Color(0xFF94A3B8);

  // Brand Dark & Ambient Gradients
  static const Color brandDarkBackground = Color(0xFF03140E);
  static const Color brandDeepGreen = Color(0xFF062319);
  static const Color brandEmeraldLight = Color(0xFF34D399);
  static const Color brandBlueLight = Color(0xFF60A5FA);
  static const Color dangerRose = Color(0xFFE11D48);

  // Input Fill Colors
  static const Color inputFillLight = Color(0xFFF1F5F9);

  // KPI Dashboard Cards
  static const Color kpiEggBgDark = Color(0xFF282115);
  static const Color kpiEggBorderDark = Color(0xFF78350F);
  static const Color kpiEggBgLight = Color(0xFFFFFBEB);
  static const Color kpiEggBorderLight = Color(0xFFFDE68A);

  static const Color kpiFlockBgDark = Color(0xFF132A1F);
  static const Color kpiFlockBorderDark = Color(0xFF065F46);
  static const Color kpiFlockBgLight = Color(0xFFF0FDF4);
  static const Color kpiFlockBorderLight = Color(0xFFBBF7D0);

  static const Color kpiFinanceBgDark = Color(0xFF172D24);
  static const Color kpiFinanceLossBgLight = Color(0xFFFEF2F2);
  static const Color kpiFinanceBorderLight = Color(0xFFA7F3D0);
  static const Color kpiFinanceLossBorderLight = Color(0xFFFECACA);

  static const Color kpiRateBadge = Color(0xFF0284C7);
  static const Color kpiRateBgDark = Color(0xFF172535);
  static const Color kpiRateBgLight = Color(0xFFF0F9FF);
  static const Color kpiRateBorderDark = Color(0xFF0369A1);
  static const Color kpiRateBorderLight = Color(0xFFBAE6FD);
}

class AppTheme {
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      primaryColor: AppColors.primary,
      scaffoldBackgroundColor: AppColors.backgroundLight,
      colorScheme: const ColorScheme.light(
        primary: AppColors.primary,
        secondary: AppColors.accent,
        surface: AppColors.surfaceLight,
        error: AppColors.danger,
        onPrimary: Colors.white,
        onSecondary: Colors.white,
        onSurface: AppColors.textMainLight,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 2,
        centerTitle: false,
        iconTheme: IconThemeData(color: Colors.white),
        titleTextStyle: TextStyle(
          color: Colors.white,
          fontSize: 18,
          fontWeight: FontWeight.w800,
          letterSpacing: -0.3,
        ),
      ),
      cardTheme: CardThemeData(
        color: AppColors.surfaceLight,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: AppColors.borderLight, width: 1),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.inputFillLight,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.borderLight),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.borderLight),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
        ),
      ),
      bottomAppBarTheme: const BottomAppBarThemeData(
        color: AppColors.navBarLight,
        elevation: 8,
      ),
    );
  }

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      primaryColor: AppColors.primary,
      scaffoldBackgroundColor: AppColors.backgroundDark,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.primary,
        secondary: AppColors.accent,
        surface: AppColors.surfaceDark,
        error: AppColors.danger,
        onPrimary: Colors.white,
        onSecondary: Colors.white,
        onSurface: AppColors.textMainDark,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.surfaceDark,
        elevation: 0,
        scrolledUnderElevation: 1,
        centerTitle: false,
        iconTheme: IconThemeData(color: AppColors.textMainDark),
        titleTextStyle: TextStyle(
          color: AppColors.textMainDark,
          fontSize: 18,
          fontWeight: FontWeight.bold,
        ),
      ),
      cardTheme: CardThemeData(
        color: AppColors.surfaceDark,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: AppColors.borderDark, width: 1),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surfaceDark,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.borderDark),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.borderDark),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.primaryLight, width: 1.5),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
        ),
      ),
      bottomAppBarTheme: const BottomAppBarThemeData(
        color: AppColors.navBarDark,
        elevation: 8,
      ),
    );
  }
}
