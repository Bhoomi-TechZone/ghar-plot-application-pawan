const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// Customize the config before returning it
config.resolver.alias = {
  // Add any aliases you need
  '@': './src',
};

// Add support for additional file extensions
config.resolver.sourceExts = [...config.resolver.sourceExts, 'tsx', 'ts', 'jsx', 'js'];

// Enable CSS support for web
if (process.env.EXPO_PLATFORM === 'web') {
  config.resolver.sourceExts.push('css');
}

module.exports = config;