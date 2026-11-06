import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:poulvia/features/welcome/welcome_screen.dart';
import 'package:poulvia/features/auth/login_screen.dart';
import 'package:poulvia/features/auth/register_screen.dart';
import 'package:poulvia/features/auth/farm_onboarding_screen.dart';
import 'package:poulvia/features/navigation/bottom_nav_scaffold.dart';
import 'package:poulvia/core/models/stock_movement.dart';

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
    expect(find.text('Caisse'), findsOneWidget);
    expect(find.text('Stocks'), findsOneWidget);
    expect(find.text('Menu'), findsNothing);
    expect(find.text('Ponte'), findsNothing);
  });

  test('StockMovement.fromJson parses feeding correctly', () {
    final json = {
      "id": "01M6E0XGA49BJJSFX8XTJ1F8GF",
      "itemId": "01M6CWWNZ660BAFF2FZ23A8Y8M",
      "itemName": "Provende",
      "itemCategory": "FEED",
      "type": "FEEDING",
      "quantity": 3,
      "unit": "BAG_50KG",
      "unitLabel": "Sac",
      "unitShortLabel": "sac",
      "unitPrice": null,
      "totalCost": null,
      "movementDate": "2026-11-02",
      "reason": "Ration Matin (3 sac(s))",
      "flock": {
        "id": "01M67DP350SV4ZCFYCQZXW3PK7",
        "code": "LOT-1",
        "name": "SD"
      },
      "recordedBy": {
        "id": "01M55525XERRNC2RD5KQVH1G4K",
        "name": "Rodrigue Gbantehehou"
      },
      "createdAt": "2026-11-02T11:39:35+00:00"
    };

    final m = StockMovement.fromJson(json);
    expect(m.isFeeding, true);
    expect(m.quantity, 3.0);
    expect(m.flockName, "SD");
    expect(m.reason, "Ration Matin (3 sac(s))");
  });
}

