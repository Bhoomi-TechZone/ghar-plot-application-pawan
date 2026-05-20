/**
 * webpack.config.js — Web / PWA build for Gharplot (React Native Web)
 *
 * Supports:
 *   npm run web        → webpack dev server (port 8080)
 *   npm run build:web  → production bundle -> build-web/
 *
 * Android build is NOT affected by this file.
 */

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');

const appDirectory = __dirname;

// ─── Packages that ship untranspiled ES / JSX and MUST go through Babel ──────
const compileNodeModules = [
  'react-native',
  'react-native-web',
  'react-native-reanimated',
  'react-native-gesture-handler',
  'react-native-screens',
  'react-native-safe-area-context',
  'react-native-vector-icons',
  'react-native-svg',
  'react-native-animatable',
  'react-native-responsive-screen',
  'react-native-onboarding-swiper',
  'react-native-linear-gradient',
  'react-native-dotenv',
  'react-native-worklets',
  '@react-navigation',
  '@react-native-async-storage',
  '@react-native-picker',
  '@react-native-masked-view',
  '@react-native-community',
  '@expo/vector-icons',
  'lucide-react-native',
  'zustand',
  'formik',
  // Transitive deps that can be ESM-only
  'use-latest-callback',
  'color',
  'color-string',
  'color-convert',
  'color-name',
  'geolib',
  'simple-swizzle',
].map((m) => path.resolve(appDirectory, 'node_modules', m));

// ─── Babel loader ────────────────────────────────────────────────────────────
const babelLoaderConfig = {
  test: /\.(js|jsx|ts|tsx)$/,
  include: [
    path.resolve(appDirectory, 'index.web.js'),
    path.resolve(appDirectory, 'App.js'),
    path.resolve(appDirectory, 'src'),
    ...compileNodeModules,
  ],
  use: {
    loader: 'babel-loader',
    options: {
      cacheDirectory: true,
      // 'unambiguous' lets Babel detect CJS vs ESM per file → prevents
      // "require is not defined" when a CJS dep is loaded inside an ESM bundle
      sourceType: 'unambiguous',
      presets: [
        [
          '@babel/preset-env',
          {
            targets: { browsers: ['last 2 versions'] },
            // modules: false → let webpack handle ES modules (tree-shaking).
            // The 'require is not defined' issue is now solved at the resolve
            // level via conditionNames above, so we don't need Babel to force CJS.
            modules: false,
          },
        ],
        ['@babel/preset-react', { runtime: 'automatic' }],
        '@babel/preset-typescript',
      ],
      plugins: [
        ['@babel/plugin-transform-class-properties', { loose: true }],
        ['@babel/plugin-transform-private-methods', { loose: true }],
        ['@babel/plugin-transform-private-property-in-object', { loose: true }],
        '@babel/plugin-transform-runtime',
        'react-native-reanimated/plugin',
      ],
    },
  },
};

// ─── Asset loaders ────────────────────────────────────────────────────────────
const imageLoaderConfig = {
  test: /\.(gif|jpe?g|png|svg|webp|bmp|ico)$/,
  type: 'asset',
  parser: { dataUrlCondition: { maxSize: 10 * 1024 } }, // inline ≤10 kB
};

const fontLoaderConfig = {
  test: /\.(woff|woff2|eot|ttf|otf)$/,
  type: 'asset/resource',
};

// ─── Main config factory ──────────────────────────────────────────────────────
module.exports = (env, argv) => {
  const isProd = argv && argv.mode === 'production';

  return {
    // ── Entry / Output ────────────────────────────────────────────────────────
    entry: path.resolve(appDirectory, 'index.web.js'),

    output: {
      path: path.resolve(appDirectory, 'build-web'),
      filename: isProd
        ? 'static/js/[name].[contenthash:8].js'
        : 'static/js/bundle.js',
      chunkFilename: isProd
        ? 'static/js/[name].[contenthash:8].chunk.js'
        : 'static/js/[name].chunk.js',
      publicPath: '/',
      clean: true,
    },

    // ── Module resolution ─────────────────────────────────────────────────────
    resolve: {
      extensions: [
        '.web.js', '.web.jsx', '.web.ts', '.web.tsx',
        '.js', '.jsx', '.ts', '.tsx', '.json',
      ],

      // ── THE KEY FIX ──────────────────────────────────────────────────────
      // Webpack 5 default conditionNames: ['import','module','require','default']
      // @react-navigation/stack v7 exports field has a 'module' condition that
      // points to lib/module/index.js (ESM build). That ESM file still contains
      // inline require() calls → 'require is not defined' crash in browser.
      //
      // Forcing 'require' first makes webpack pick lib/commonjs/index.js
      // (the pure CJS build) for ALL packages that have a 'require' export
      // condition — eliminating the mixed ESM/CJS crash entirely.
      conditionNames: ['require', 'browser', 'default'],
      // ─────────────────────────────────────────────────────────────────────
      alias: {
        // Core: redirect react-native → react-native-web
        'react-native$': 'react-native-web',

        // ── Native-only module shims ─────────────────────────────────────────
        '@notifee/react-native': path.resolve(appDirectory, 'src/web/shims/notifee.js'),
        '@react-native-firebase/messaging': path.resolve(appDirectory, 'src/web/shims/firebase-messaging.js'),
        '@react-native-firebase/app': path.resolve(appDirectory, 'src/web/shims/firebase-app.js'),
        'react-native-geolocation-service': path.resolve(appDirectory, 'src/web/shims/geolocation.js'),
        'react-native-image-picker': path.resolve(appDirectory, 'src/web/shims/image-picker.js'),
        'react-native-video': path.resolve(appDirectory, 'src/web/shims/video.js'),
        'react-native-push-notification': path.resolve(appDirectory, 'src/web/shims/push-notification.js'),
        'react-native-maps': path.resolve(appDirectory, 'src/web/shims/maps.js'),
        'react-native-permissions': path.resolve(appDirectory, 'src/web/shims/permissions.js'),
        'react-native-sound': path.resolve(appDirectory, 'src/web/shims/sound.js'),
        'react-native-razorpay': path.resolve(appDirectory, 'src/web/shims/razorpay.js'),
        'react-native-restart': path.resolve(appDirectory, 'src/web/shims/restart.js'),
        '@react-native-community/blur': path.resolve(appDirectory, 'src/web/shims/blur.js'),
        '@react-native-community/datetimepicker': path.resolve(appDirectory, 'src/web/shims/datetimepicker.js'),
        'react-native-image-colors': path.resolve(appDirectory, 'src/web/shims/image-colors.js'),
        'react-native-linear-gradient': path.resolve(appDirectory, 'src/web/shims/linear-gradient.js'),

        // Utility alias
        '@': path.resolve(appDirectory, 'src'),
      },

      // Node polyfills — we don't need them on web
      fallback: {
        crypto: false,
        stream: false,
        buffer: false,
        fs: false,
        path: false,
      },
    },

    // ── Loaders ───────────────────────────────────────────────────────────────
    module: {
      rules: [
        babelLoaderConfig,
        imageLoaderConfig,
        fontLoaderConfig,
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },

    // ── Plugins ───────────────────────────────────────────────────────────────
    plugins: [
      // Inject bundle into HTML
      new HtmlWebpackPlugin({
        template: path.resolve(appDirectory, 'web/index.html'),
        filename: 'index.html',
        inject: true,
      }),

      // Copy static PWA assets
      new CopyWebpackPlugin({
        patterns: [
          { from: path.resolve(appDirectory, 'web/manifest.json'), to: 'manifest.json' },
          { from: path.resolve(appDirectory, 'web/service-worker.js'), to: 'service-worker.js' },
          {
            from: path.resolve(appDirectory, 'web'),
            to: '',
            globOptions: {
              ignore: ['**/index.html', '**/manifest.json', '**/service-worker.js'],
            },
            noErrorOnMissing: true,
          },
        ],
      }),

      // Globals expected by React Native Web
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(isProd ? 'production' : 'development'),
        __DEV__: JSON.stringify(!isProd),
        // Silence RN's __BUNDLE_START_TIME__ reference
        '__BUNDLE_START_TIME__': JSON.stringify(Date.now()),
      }),

      // 'process' global (needed by some RN packages)
      new webpack.ProvidePlugin({
        process: 'process/browser',
      }),
    ],

    // ── Dev server ────────────────────────────────────────────────────────────
    devServer: {
      static: { directory: path.resolve(appDirectory, 'web') },
      port: 8080,
      hot: true,
      historyApiFallback: true,  // Required for SPA routing
      open: true,
      compress: true,
      client: {
        overlay: { errors: true, warnings: false },
      },
    },

    // ── Source maps ───────────────────────────────────────────────────────────
    devtool: isProd ? 'source-map' : 'eval-cheap-module-source-map',

    // ── Production optimisation ───────────────────────────────────────────────
    optimization: isProd
      ? {
          splitChunks: {
            chunks: 'all',
            cacheGroups: {
              vendor: {
                test: /[\\/]node_modules[\\/]/,
                name: 'vendors',
                chunks: 'all',
              },
            },
          },
          runtimeChunk: 'single',
        }
      : {},

    // ── Performance hints ─────────────────────────────────────────────────────
    performance: {
      hints: isProd ? 'warning' : false,
      maxEntrypointSize: 5 * 1024 * 1024,
      maxAssetSize: 5 * 1024 * 1024,
    },
  };
};
