import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lefermier/main.dart';

void main() {
  testWidgets('LeFermierApp smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(
      const ProviderScope(
        child: LeFermierApp(),
      ),
    );

    // Verify app renders with navigation bar
    expect(find.text('Accueil'), findsOneWidget);
    expect(find.text('Bandes'), findsOneWidget);
  });
}
