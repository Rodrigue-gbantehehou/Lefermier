import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'core/api/api_client.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/theme_provider.dart';
import 'features/auth/auth_provider.dart';
import 'features/auth/farm_onboarding_screen.dart';
import 'features/auth/login_screen.dart';
import 'features/navigation/bottom_nav_scaffold.dart';
import 'features/welcome/splash_screen.dart';
import 'features/welcome/welcome_screen.dart';

final GlobalKey<NavigatorState> appNavigatorKey = GlobalKey<NavigatorState>();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('fr_FR', null);
  await ApiClient().init();
  runApp(
    const ProviderScope(
      child: LeFermierApp(),
    ),
  );
}

class LeFermierApp extends ConsumerWidget {
  const LeFermierApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final currentThemeMode = ref.watch(themeModeProvider);

    // Écoute les déconnexions globales ou expirations de session
    ref.listen<AuthState>(authProvider, (previous, next) {
      if (previous?.isAuthenticated == true && !next.isAuthenticated) {
        appNavigatorKey.currentState?.pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const LoginScreen()),
          (route) => false,
        );
      }
    });

    Widget homeWidget;
    if (authState.isLoading) {
      homeWidget = const SplashScreen();
    } else if (authState.isAuthenticated) {
      if (authState.farms.isEmpty) {
        homeWidget = const FarmOnboardingScreen();
      } else {
        homeWidget = const BottomNavScaffold();
      }
    } else if (!ApiClient().hasSeenWelcome) {
      homeWidget = const WelcomeScreen();
    } else {
      homeWidget = const LoginScreen();
    }

    return MaterialApp(
      navigatorKey: appNavigatorKey,
      title: 'Le Fermier',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: currentThemeMode,
      home: homeWidget,
    );
  }
}
