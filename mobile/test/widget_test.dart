import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lefermier/features/welcome/welcome_screen.dart';
import 'package:lefermier/features/auth/login_screen.dart';
import 'package:lefermier/features/auth/register_screen.dart';
import 'package:lefermier/features/auth/farm_onboarding_screen.dart';
import 'package:lefermier/features/navigation/bottom_nav_scaffold.dart';

void main() {
  testWidgets('WelcomeScreen smoke test - renders hero and action buttons', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: WelcomeScreen(),
        ),
      ),
    );

    expect(find.text('LE FERMIER'), findsOneWidget);
    expect(find.text('Créer mon exploitation'), findsOneWidget);
    expect(find.text("J'ai déjà un compte"), findsOneWidget);
  });

  testWidgets('LoginScreen smoke test - renders login form', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: LoginScreen(),
        ),
      ),
    );

    expect(find.text('Le Fermier'), findsOneWidget);
    expect(find.text('Connexion'), findsOneWidget);
    expect(find.text('Se connecter'), findsOneWidget);
  });

  testWidgets('RegisterScreen smoke test - renders step 1 account form', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: RegisterScreen(),
        ),
      ),
    );

    expect(find.text('Compte Éleveur'), findsOneWidget);
    expect(find.text('Continuer vers mon exploitation'), findsOneWidget);
    expect(find.text('Se connecter'), findsOneWidget);
  });

  testWidgets('FarmOnboardingScreen smoke test - renders step 2 farm onboarding', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: FarmOnboardingScreen(),
        ),
      ),
    );

    expect(find.text('Donnez vie à votre exploitation'), findsOneWidget);
    expect(find.text('Démarrer mon exploitation'), findsOneWidget);
  });

  testWidgets('BottomNavScaffold smoke test - displays main navigation tabs', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: BottomNavScaffold(),
        ),
      ),
    );

    expect(find.text('Accueil'), findsOneWidget);
    expect(find.text('Bandes'), findsOneWidget);
    expect(find.text('Ponte'), findsOneWidget);
    expect(find.text('Caisse'), findsOneWidget);
    expect(find.text('Menu'), findsOneWidget);
  });
}

