/**
 * index.web.js — Web / PWA entry point for Gharplot
 *
 * This file is loaded by webpack for the web build only.
 * The native entry point (index.js) is used by React Native for Android/iOS.
 *
 * What this does:
 *  1. Sets up react-native-gesture-handler (must be first)
 *  2. Injects @expo/vector-icons font faces so icons render correctly
 *  3. Bootstraps the React app via AppRegistry
 */

// ── 1. Gesture handler (MUST come before any other import) ────────────────────
import 'react-native-gesture-handler';

// ── 2. React / React Native web deps ─────────────────────────────────────────
import { AppRegistry } from 'react-native';

// ── 3. Root App component ─────────────────────────────────────────────────────
import App from './App';

// ── 4. Inject vector-icon fonts so icons don't appear as empty boxes ──────────
const injectFontFace = (family, url) => {
  const style = document.createElement('style');
  style.type = 'text/css';
  style.textContent = `@font-face { font-family: '${family}'; src: url('${url}') format('truetype'); }`;
  document.head.appendChild(style);
};

// Resolve font URLs via webpack's asset pipeline (requires the font loader in webpack.config.js)
try {
  injectFontFace('MaterialIcons', require('react-native-vector-icons/Fonts/MaterialIcons.ttf'));
  injectFontFace('Ionicons', require('react-native-vector-icons/Fonts/Ionicons.ttf'));
  injectFontFace('FontAwesome', require('react-native-vector-icons/Fonts/FontAwesome.ttf'));
  injectFontFace('MaterialCommunityIcons', require('react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf'));
  injectFontFace('Feather', require('react-native-vector-icons/Fonts/Feather.ttf'));
  injectFontFace('Entypo', require('react-native-vector-icons/Fonts/Entypo.ttf'));
  injectFontFace('AntDesign', require('react-native-vector-icons/Fonts/AntDesign.ttf'));
  injectFontFace('EvilIcons', require('react-native-vector-icons/Fonts/EvilIcons.ttf'));
  injectFontFace('Foundation', require('react-native-vector-icons/Fonts/Foundation.ttf'));
  injectFontFace('Octicons', require('react-native-vector-icons/Fonts/Octicons.ttf'));
  injectFontFace('SimpleLineIcons', require('react-native-vector-icons/Fonts/SimpleLineIcons.ttf'));
  injectFontFace('Zocial', require('react-native-vector-icons/Fonts/Zocial.ttf'));
} catch (fontError) {
  // Non-critical — icons will fall back to emoji or missing glyph boxes
  console.warn('⚠️ One or more icon fonts failed to load:', fontError.message);
}

// ── 5. Fix TextInput black border on web ──────────────────────────────────────
// React Native Web renders TextInput as <input>/<textarea> which gets browser
// default outline and border on focus. This global CSS removes it.
const fixInputStyle = document.createElement('style');
fixInputStyle.type = 'text/css';
fixInputStyle.textContent = `
  input, textarea, [data-testid] input, [data-testid] textarea {
    outline: none !important;
    outline-style: none !important;
    box-shadow: none !important;
  }
  input:focus, textarea:focus {
    outline: none !important;
    outline-style: none !important;
    box-shadow: none !important;
  }
`;
document.head.appendChild(fixInputStyle);

// ── 6. Register and run the app ───────────────────────────────────────────────
AppRegistry.registerComponent('Gharplot', () => App);

AppRegistry.runApplication('Gharplot', {
  initialProps: {},
  rootTag: document.getElementById('root'),
});
