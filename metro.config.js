const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

/**
 * Metro configuration for React Native + Web (via Expo Metro Web)
 * Android build is NOT affected — Metro picks platform-specific files automatically.
 */
const config = getDefaultConfig(__dirname);

// ── Platform support ──────────────────────────────────────────────────────────
config.resolver.platforms = ['ios', 'android', 'web'];

// ── Module resolution order ───────────────────────────────────────────────────
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// ── Native-only module → web shim aliases ─────────────────────────────────────
// On Android/iOS these resolve normally. On web, Metro loads the shim instead.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Only apply shims on web platform
  if (platform === 'web') {
    const shimMap = {
      '@notifee/react-native': './src/web/shims/notifee.js',
      '@react-native-firebase/messaging': './src/web/shims/firebase-messaging.js',
      '@react-native-firebase/app': './src/web/shims/firebase-app.js',
      'react-native-geolocation-service': './src/web/shims/geolocation.js',
      'react-native-image-picker': './src/web/shims/image-picker.js',
      'react-native-video': './src/web/shims/video.js',
      'react-native-push-notification': './src/web/shims/push-notification.js',
      'react-native-maps': './src/web/shims/maps.js',
      'react-native-permissions': './src/web/shims/permissions.js',
      'react-native-sound': './src/web/shims/sound.js',
      'react-native-razorpay': './src/web/shims/razorpay.js',
      'react-native-restart': './src/web/shims/restart.js',
      '@react-native-community/blur': './src/web/shims/blur.js',
      '@react-native-community/datetimepicker': './src/web/shims/datetimepicker.js',
      'react-native-image-colors': './src/web/shims/image-colors.js',
      'react-native-linear-gradient': './src/web/shims/linear-gradient.js',
    };

    if (shimMap[moduleName]) {
      return {
        filePath: path.resolve(__dirname, shimMap[moduleName]),
        type: 'sourceFile',
      };
    }
  }

  // Default resolution for everything else
  return context.resolveRequest(context, moduleName, platform);
};

// ── Transformer ───────────────────────────────────────────────────────────────
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;
