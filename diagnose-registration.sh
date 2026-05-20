#!/bin/bash
# This script diagnoses the "gharplot has not been registered" error

echo "========================================"
echo "Gharplot Registration Diagnostics"
echo "========================================"
echo ""

# Check 1: Verify MainActivity.kt component name
echo "[1] Checking MainActivity.kt..."
MAIN_COMPONENT=$(grep -o 'getMainComponentName.*"[^"]*"' android/app/src/main/java/com/bhoomitechzone/gharplot/MainActivity.kt | cut -d'"' -f2)
echo "    MainActivity component name: $MAIN_COMPONENT"

# Check 2: Verify index.js registration
echo "[2] Checking index.js registration..."
INDEX_COMPONENT=$(grep -o "const appName = '[^']*'" index.js | cut -d"'" -f2)
echo "    index.js app name: $INDEX_COMPONENT"

# Check 3: Verify App.js export
echo "[3] Checking App.js export..."
if grep -q "export default App" App.js; then
    echo "    ✓ App.js exports correctly"
else
    echo "    ✗ App.js does NOT export correctly"
fi

# Check 4: Verify app.json
echo "[4] Checking app.json..."
APP_NAME=$(grep '"name"' app.json | head -1 | cut -d'"' -f4)
echo "    app.json name: $APP_NAME"

echo ""
echo "========================================"
if [ "$MAIN_COMPONENT" = "$INDEX_COMPONENT" ]; then
    echo "✓ All components match!"
else
    echo "✗ MISMATCH DETECTED!"
    echo "   MainActivity: $MAIN_COMPONENT"
    echo "   index.js:     $INDEX_COMPONENT"
fi
echo "========================================"
