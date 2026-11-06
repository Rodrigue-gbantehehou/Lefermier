import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppColors {
  // Brand Official Colors (Tirés fidèlement du logo poulvia)
  // Vert Forêt Principal (Corps du coq & feuille)
  static const Color primary = Color(0xFF154632);
  static const Color primaryHover = Color(0xFF113828);
  static const Color primaryLight = Color(0xFF1E5D43);
  static const Color primarySoft = Color(0xFFEBF5F0);
  static const Color primaryDark = Color(0xFF0C291D);

  // Ambre Doré Officiel (Crête du coq & dynamisme)
  static const Color accent = Color(0xFFF39200);
  static const Color accentLight = Color(0xFFFFA726);
  static const Color accentSoft = Color(0xFFFFF7ED);
  static const Color accentGold = Color(0xFFF59E0B);
  static const Color accentWarm = Color(0xFFFED7AA);

  // Barre de navigation
  static const Color navBarLight = Color(0xFF154632);
  static const Color navBarDark = Color(0xFF0C291D);

  // Statuts & Utilitaires
  static const Color success = Color(0xFF16A34A);
  static const Color danger = Color(0xFFDC2626);
  static const Color error = Color(0xFFDC2626);
  static const Color warning = Color(0xFFD97706);
  static const Color info = Color(0xFF0284C7);

  // Neutres Thème Clair (Nuance agricole naturelle, non agressive sous le soleil)
  static const Color backgroundLight = Color(0xFFF8FAF7);
  static const Color surfaceLight = Color(0xFFFFFFFF);
  static const Color borderLight = Color(0xFFE5E9E4);
  static const Color textMainLight = Color(0xFF0F172A);
  static const Color textMutedLight = Color(0xFF64748B);

  // Neutres Thème Sombre (Vert-nuit profond luxueux)
  static const Color backgroundDark = Color(0xFF0B1712);
  static const Color surfaceDark = Color(0xFF13241C);
  static const Color borderDark = Color(0xFF1E362A);
  static const Color textMainDark = Color(0xFFF8FAFC);
  static const Color textMutedDark = Color(0xFF94A3B8);

  // Dégradés et fonds de prestige
  static const Color brandDarkBackground = Color(0xFF07120E);
  static const Color brandDeepGreen = Color(0xFF0C291D);
  static const Color brandEmeraldLight = Color(0xFF34D399);
  static const Color brandBlueLight = Color(0xFF60A5FA);
  static const Color dangerRose = Color(0xFFE11D48);

  // Champs de saisie
  static const Color inputFillLight = Color(0xFFF3F5F3);

  // KPIs du Tableau de bord
  static const Color kpiEggBgDark = Color(0xFF261D10);
  static const Color kpiEggBorderDark = Color(0xFF663B08);
  static const Color kpiEggBgLight = Color(0xFFFFF7ED);
  static const Color kpiEggBorderLight = Color(0xFFFED7AA);

  static const Color kpiFlockBgDark = Color(0xFF0F261C);
  static const Color kpiFlockBorderDark = Color(0xFF1B4D38);
  static const Color kpiFlockBgLight = Color(0xFFEBF5F0);
  static const Color kpiFlockBorderLight = Color(0xFFBCE3CE);

  static const Color kpiFinanceBgDark = Color(0xFF11281E);
  static const Color kpiFinanceLossBgLight = Color(0xFFFEF2F2);
  static const Color kpiFinanceBorderLight = Color(0xFFA7F3D0);
  static const Color kpiFinanceLossBorderLight = Color(0xFFFECACA);

  static const Color kpiRateBadge = Color(0xFF0284C7);
  static const Color kpiRateBgDark = Color(0xFF112333);
  static const Color kpiRateBgLight = Color(0xFFF0F9FF);
  static const Color kpiRateBorderDark = Color(0xFF0369A1);
  static const Color kpiRateBorderLight = Color(0xFFBAE6FD);
}

class AppSpacing {
  static const double xs = 4.0;
  static const double sm = 8.0;
  static const double md = 12.0;
  static const double lg = 16.0;
  static const double xl = 20.0;
  static const double xxl = 24.0;
  static const double xxxl = 32.0;
}

class AppRadius {
  static const double xs = 4.0;
  static const double sm = 8.0;
  static const double md = 12.0;
  static const double lg = 16.0;
  static const double xl = 20.0;
  static const double xxl = 24.0;
  static const double full = 999.0;
}

class AppTheme {
  static ThemeData get lightTheme {
    final baseTextTheme = GoogleFonts.plusJakartaSansTextTheme(ThemeData.light().textTheme);

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      primaryColor: AppColors.primary,
      scaffoldBackgroundColor: AppColors.backgroundLight,
      textTheme: baseTextTheme.copyWith(
        displayLarge: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w900, color: AppColors.textMainLight, letterSpacing: -0.8),
        displayMedium: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w800, color: AppColors.textMainLight, letterSpacing: -0.6),
        titleLarge: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w800, color: AppColors.textMainLight, letterSpacing: -0.3),
        titleMedium: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w700, color: AppColors.textMainLight, letterSpacing: -0.2),
        bodyLarge: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w500, color: AppColors.textMainLight),
        bodyMedium: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w400, color: AppColors.textMainLight),
        labelLarge: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w700, letterSpacing: 0.2),
      ),
      colorScheme: const ColorScheme.light(
        primary: AppColors.primary,
        secondary: AppColors.accent,
        surface: AppColors.surfaceLight,
        error: AppColors.danger,
        onPrimary: Colors.white,
        onSecondary: Colors.white,
        onSurface: AppColors.textMainLight,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 1.5,
        centerTitle: false,
        iconTheme: const IconThemeData(color: Colors.white),
        titleTextStyle: GoogleFonts.plusJakartaSans(
          color: Colors.white,
          fontSize: 17,
          fontWeight: FontWeight.w800,
          letterSpacing: -0.3,
        ),
      ),
      cardTheme: CardThemeData(
        color: AppColors.surfaceLight,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.lg),
          side: const BorderSide(color: AppColors.borderLight, width: 1),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.inputFillLight,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: const BorderSide(color: AppColors.borderLight),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: const BorderSide(color: AppColors.borderLight),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.6),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: const BorderSide(color: AppColors.danger),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 13),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
          textStyle: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w700, fontSize: 14),
        ),
      ),
      bottomAppBarTheme: const BottomAppBarThemeData(
        color: AppColors.navBarLight,
        elevation: 8,
      ),
    );
  }

  static ThemeData get darkTheme {
    final baseTextTheme = GoogleFonts.plusJakartaSansTextTheme(ThemeData.dark().textTheme);

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      primaryColor: AppColors.primary,
      scaffoldBackgroundColor: AppColors.backgroundDark,
      textTheme: baseTextTheme.copyWith(
        displayLarge: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w900, color: AppColors.textMainDark, letterSpacing: -0.8),
        displayMedium: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w800, color: AppColors.textMainDark, letterSpacing: -0.6),
        titleLarge: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w800, color: AppColors.textMainDark, letterSpacing: -0.3),
        titleMedium: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w700, color: AppColors.textMainDark, letterSpacing: -0.2),
        bodyLarge: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w500, color: AppColors.textMainDark),
        bodyMedium: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w400, color: AppColors.textMainDark),
        labelLarge: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w700, letterSpacing: 0.2),
      ),
      colorScheme: const ColorScheme.dark(
        primary: AppColors.primary,
        secondary: AppColors.accent,
        surface: AppColors.surfaceDark,
        error: AppColors.danger,
        onPrimary: Colors.white,
        onSecondary: Colors.white,
        onSurface: AppColors.textMainDark,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.surfaceDark,
        foregroundColor: AppColors.textMainDark,
        elevation: 0,
        scrolledUnderElevation: 1,
        centerTitle: false,
        iconTheme: const IconThemeData(color: AppColors.textMainDark),
        titleTextStyle: GoogleFonts.plusJakartaSans(
          color: AppColors.textMainDark,
          fontSize: 17,
          fontWeight: FontWeight.w800,
          letterSpacing: -0.3,
        ),
      ),
      cardTheme: CardThemeData(
        color: AppColors.surfaceDark,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.lg),
          side: const BorderSide(color: AppColors.borderDark, width: 1),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surfaceDark,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: const BorderSide(color: AppColors.borderDark),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: const BorderSide(color: AppColors.borderDark),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: const BorderSide(color: AppColors.primaryLight, width: 1.6),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: const BorderSide(color: AppColors.danger),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 13),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
          textStyle: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w700, fontSize: 14),
        ),
      ),
      bottomAppBarTheme: const BottomAppBarThemeData(
        color: AppColors.navBarDark,
        elevation: 8,
      ),
    );
  }
}

