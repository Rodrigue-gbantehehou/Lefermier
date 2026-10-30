import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lefermier/main.dart';
import 'package:lefermier/features/navigation/bottom_nav_scaffold.dart';

void main() {
  testWidgets('LeFermierApp smoke test - shows LoginScreen when unauthenticated', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: LeFermierApp(),
      ),
    );

    // Verify LoginScreen renders
    expect(find.text('Le Fermier'), findsOneWidget);
    expect(find.text('Connexion'), findsOneWidget);
  });

  testWidgets('BottomNavScaffold smoke test - displays main navigation tabs', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: LeFermierApp(),
      ),
    );

    // Verify navigation tabs in BottomNavScaffold directly
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
