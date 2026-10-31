import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lefermier/features/welcome/welcome_screen.dart';
import 'package:lefermier/features/auth/login_screen.dart';
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

  testWidgets('LoginScreen smoke test - renders directly with auth tabs', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: LoginScreen(),
        ),
      ),
    );

    expect(find.text('Le Fermier'), findsOneWidget);
    expect(find.text('Connexion'), findsOneWidget);
    expect(find.text('Créer un compte'), findsOneWidget);
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
  });
}
