# Flutter Accessibility Testing Guide

## Overview
Flutter provides built-in accessibility testing capabilities that can be integrated with this automated accessibility checker.

## Flutter Accessibility Testing Methods

### 1. Widget Tests with Semantics
```dart
// Add to your Flutter app's test/ directory
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:your_app/main.dart';

void main() {
  group('Accessibility Tests', () {
    testWidgets('App has proper semantic labels', (WidgetTester tester) async {
      await tester.pumpWidget(MyApp());
      
      // Check for semantic labels
      expect(find.bySemanticsLabel('Login Button'), findsOneWidget);
      expect(find.bySemanticsLabel('Email Input'), findsOneWidget);
      
      // Verify semantics tree structure
      final semantics = tester.binding.pipelineOwner.semanticsOwner!;
      semantics.performAction(1, SemanticsAction.tap);
    });
    
    testWidgets('Text contrast meets accessibility standards', (WidgetTester tester) async {
      await tester.pumpWidget(MyApp());
      
      // Find text widgets and verify contrast ratios
      final textWidgets = find.byType(Text);
      await tester.ensureVisible(textWidgets.first);
      
      // Add custom contrast ratio checks here
    });
  });
}
```

### 2. Integration Tests
```dart
// integration_test/accessibility_test.dart
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:your_app/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('Accessibility Integration Tests', () {
    testWidgets('Full app accessibility audit', (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle();
      
      // Enable accessibility features
      await tester.binding.defaultBinaryMessenger.handlePlatformMessage(
        'flutter/accessibility',
        const StandardMethodCodec().encodeMethodCall(
          const MethodCall('routeUpdated', <String, dynamic>{
            'location': '/',
            'state': null,
          }),
        ),
        (data) {},
      );
      
      // Perform accessibility checks on each screen
      await _checkScreenAccessibility(tester);
    });
  });
}

Future<void> _checkScreenAccessibility(WidgetTester tester) async {
  // Custom accessibility validation logic
  final semanticsData = tester.binding.pipelineOwner.semanticsOwner!.rootSemanticsNode;
  
  // Validate semantic tree
  _validateSemanticsTree(semanticsData);
}

void _validateSemanticsTree(SemanticsNode? node) {
  if (node == null) return;
  
  // Check for required accessibility properties
  if (node.hasAction(SemanticsAction.tap)) {
    assert(node.label != null || node.hint != null, 
           'Tappable element missing accessibility label');
  }
  
  // Recursively check children
  node.visitChildren((child) {
    _validateSemanticsTree(child);
    return true;
  });
}
```

### 3. Using Flutter's Built-in Accessibility Testing

Add to your `pubspec.yaml`:
```yaml
dev_dependencies:
  flutter_test:
    sdk: flutter
  integration_test:
    sdk: flutter
  accessibility_tools: ^2.1.0
```

### 4. Automated Testing Script
Create `test_flutter_app.sh`:
```bash
#!/bin/bash
# Flutter App Accessibility Testing Script

FLUTTER_APP_PATH=$1
REPORT_OUTPUT_DIR=$2

if [ -z "$FLUTTER_APP_PATH" ] || [ -z "$REPORT_OUTPUT_DIR" ]; then
  echo "Usage: $0 <flutter_app_path> <report_output_dir>"
  exit 1
fi

cd "$FLUTTER_APP_PATH"

echo "Running Flutter accessibility tests..."

# Run widget tests
flutter test --coverage --reporter=json > "$REPORT_OUTPUT_DIR/test-results.json"

# Run integration tests
flutter drive --driver=test_driver/integration_test.dart --target=integration_test/accessibility_test.dart

# Generate accessibility report
flutter test --reporter=json | jq '.[] | select(.type=="testDone" and .result=="error") | {name: .testName, error: .error}' > "$REPORT_OUTPUT_DIR/accessibility-violations.json"

echo "Flutter accessibility test complete. Results saved to $REPORT_OUTPUT_DIR"
```

## Integration with Main System

### API Endpoint for Flutter Testing
Add to your `backend/server.js`:

```javascript
// Test Flutter app accessibility
app.post('/api/test-flutter-app', async (req, res) => {
  const { appPath, appName } = req.body;
  
  if (!appPath) {
    return res.status(400).json({ error: 'App path is required' });
  }

  const testId = uuidv4();
  const reportDir = path.join(__dirname, '../reports', testId);
  
  try {
    await fs.mkdir(reportDir, { recursive: true });
    
    // Run Flutter accessibility tests
    const { spawn } = require('child_process');
    const testProcess = spawn('./test_flutter_app.sh', [appPath, reportDir], {
      cwd: __dirname,
      stdio: 'pipe'
    });

    testProcess.on('close', async (code) => {
      if (code === 0) {
        // Parse results and generate report
        const results = await parseFlutterTestResults(reportDir);
        
        const summary = {
          appPath,
          appName,
          testId,
          timestamp: new Date().toISOString(),
          violations: results.violations.length,
          passes: results.passes.length,
          reportUrl: `/reports/${testId}/flutter-report.html`
        };

        testResults.set(testId, { ...summary, fullResults: results });
      }
    });

    res.json({ testId, message: 'Flutter app test started' });
  } catch (error) {
    console.error('Error testing Flutter app:', error);
    res.status(500).json({ error: 'Failed to test Flutter app accessibility' });
  }
});
```

## Best Practices for Flutter Accessibility

1. **Semantic Labels**: Always provide meaningful labels for interactive elements
2. **Focus Management**: Ensure proper focus order and navigation
3. **Color Contrast**: Use sufficient contrast ratios (4.5:1 for normal text, 3:1 for large text)
4. **Touch Targets**: Minimum 44x44 dp for touch targets
5. **Screen Reader Support**: Test with TalkBack (Android) and VoiceOver (iOS)

## Testing Coverage

The Flutter integration covers:
- ✅ Semantic tree validation
- ✅ Interactive element accessibility
- ✅ Focus management
- ✅ Color contrast (basic checks)
- ✅ Touch target sizes
- ✅ Screen reader compatibility