const fs = require('fs');
const path = require('path');
const dir = 'f:/ghar-plot-application/src/profile';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // 1. Add useSafeAreaInsets import if missing
  if (!content.includes('useSafeAreaInsets')) {
    if (content.includes('react-native-safe-area-context')) {
      content = content.replace(/import\s*\{\s*([^}]*)\s*\}\s*from\s*['"]react-native-safe-area-context['"]/, 'import { $1, useSafeAreaInsets } from \'react-native-safe-area-context\'');
    } else {
      content = content.replace(/(import\s+[^;]+from\s*['"]react-native['"];?)/, "$1\nimport { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';");
    }
    changed = true;
  }

  // 2. Remove SafeAreaView from react-native
  if (content.match(/SafeAreaView,?\s*/g)) {
     const rnImportMatch = content.match(/import\s*\{[^}]*SafeAreaView[^}]*\}\s*from\s*['"]react-native['"]/);
     if (rnImportMatch) {
         let newRnImport = rnImportMatch[0].replace(/SafeAreaView,?\s*/g, '');
         content = content.replace(rnImportMatch[0], newRnImport);
         changed = true;
     }
  }

  // 3. Add StatusBar to react-native if missing
  const rnImportMatch = content.match(/import\s*\{([^}]*)\}\s*from\s*['"]react-native['"]/);
  if (rnImportMatch && !rnImportMatch[1].includes('StatusBar')) {
     const newRnImport = rnImportMatch[0].replace(/import\s*\{/, 'import {\n  StatusBar,');
     content = content.replace(rnImportMatch[0], newRnImport);
     changed = true;
  }

  // 4. Inject safe area calculation
  const componentMatch = content.match(/const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\{/);
  if (componentMatch && !content.includes('const statusBarTop')) {
     const insertPos = content.indexOf(componentMatch[0]) + componentMatch[0].length;
     const injection = "\n    const insets = useSafeAreaInsets();\n    const statusBarTop = insets.top > 0 ? insets.top : (Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0);\n";
     content = content.slice(0, insertPos) + injection + content.slice(insertPos);
     changed = true;
  }

  // 5. Replace top-level SafeAreaView with View + paddingTop
  if (content.includes('<SafeAreaView style={styles.container}>')) {
     content = content.replace('<SafeAreaView style={styles.container}>', '<View style={[styles.container, { paddingTop: statusBarTop }]}>');
     content = content.replace(/<\/SafeAreaView>/, '</View>');
     changed = true;
  } else if (content.includes('<SafeAreaView style={styles.safeArea}>')) {
     content = content.replace('<SafeAreaView style={styles.safeArea}>', '<View style={[styles.safeArea, { paddingTop: statusBarTop }]}>');
     content = content.replace(/<\/SafeAreaView>/, '</View>');
     changed = true;
  } else if (content.includes('<SafeAreaView>')) {
     content = content.replace('<SafeAreaView>', '<View style={{ paddingTop: statusBarTop }}>');
     content = content.replace(/<\/SafeAreaView>/, '</View>');
     changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log('Fixed', file);
  }
}
