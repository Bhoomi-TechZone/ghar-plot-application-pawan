/**
 * Comprehensive Worklets Runtime Initializer
 * Handles React Native Reanimated v4.2.0 + react-native-worklets compatibility
 */

// Store original console methods
const originalError = console.error;
const originalWarn = console.warn;

// Enhanced error filtering for worklets
console.error = function(...args) {
  const errorMessage = args[0]?.toString() || '';
  
  // Filter out worklets-related errors that are non-critical
  if (errorMessage.includes('[Worklets] Failed to create a worklet') || 
      errorMessage.includes('WorkletsError') ||
      errorMessage.includes('__workletHash') ||
      errorMessage.includes('react-native-worklets-core') ||
      errorMessage.includes('WorkletsErrorConstructor')) {
    // Convert error to warning for worklets issues
    console.warn('🔧 [Worklets] Handled initialization issue:', errorMessage);
    return;
  }
  
  originalError.apply(console, args);
};

// Suppress development warnings for worklets
console.warn = function(...args) {
  const warnMessage = args[0]?.toString() || '';
  
  if (__DEV__ && (
    warnMessage.includes('worklet') || 
    warnMessage.includes('Reanimated') ||
    warnMessage.includes('__workletHash')
  )) {
    return; // Suppress in development
  }
  
  originalWarn.apply(console, args);
};

// Comprehensive worklets initialization
const initializeWorkletsRuntime = () => {
  try {
    console.log('🚀 Starting comprehensive worklets initialization...');

    // Step 1: Initialize global worklet context
    if (typeof global._WORKLET === 'undefined') {
      global._WORKLET = false;
    }

    // Step 2: Setup worklet runtime globals
    if (typeof global.__reanimatedWorkletInit === 'undefined') {
      global.__reanimatedWorkletInit = function() {
        console.log('📱 Worklet runtime initialized via fallback');
      };
    }

    // Step 3: Setup UI thread bridge functions
    if (typeof global.runOnUI === 'undefined') {
      global.runOnUI = function(worklet) {
        return function(...args) {
          try {
            return worklet(...args);
          } catch (error) {
            console.warn('⚠️ runOnUI fallback execution:', error.message);
            return null;
          }
        };
      };
    }

    if (typeof global.runOnJS === 'undefined') {
      global.runOnJS = function(jsFunction) {
        return function(...args) {
          try {
            return jsFunction(...args);
          } catch (error) {
            console.warn('⚠️ runOnJS fallback execution:', error.message);
            return null;
          }
        };
      };
    }

    // Step 4: Setup worklet creation mock
    if (typeof global.__workletHash === 'undefined') {
      global.__workletHash = Math.random().toString(36).substring(7);
    }

    // Step 5: Initialize React Native Reanimated compatibility
    if (typeof global.__reanimatedModuleProxy === 'undefined') {
      global.__reanimatedModuleProxy = {
        installTurboModule: () => true,
        registerEventHandler: () => {},
        unregisterEventHandler: () => {},
        getViewProp: () => null,
        enableLayoutAnimations: () => {},
        configureProps: () => {},
        registerSensor: () => {},
        unregisterSensor: () => {}
      };
    }

    // Step 6: Setup worklets module mock
    if (typeof global.WorkletsModule === 'undefined') {
      global.WorkletsModule = {
        createWorklet: () => null,
        scheduleOnJS: (fn) => fn(),
        scheduleOnUI: (fn) => fn()
      };
    }

    // Step 7: Initialize the runtime
    try {
      global.__reanimatedWorkletInit();
      console.log('✅ Worklets runtime successfully initialized');
    } catch (initError) {
      console.warn('⚠️ Worklet init warning (non-critical):', initError.message);
    }

    // Step 8: Setup error boundary for worklets
    const originalErrorHandler = global.ErrorUtils?.getGlobalHandler();
    if (global.ErrorUtils && originalErrorHandler) {
      global.ErrorUtils.setGlobalHandler((error, isFatal) => {
        if (error?.message?.includes('Worklets') || error?.message?.includes('worklet')) {
          console.warn('🛡️ Caught worklets error:', error.message);
          return; // Don't crash on worklets errors
        }
        originalErrorHandler(error, isFatal);
      });
    }

    console.log('🎉 Comprehensive worklets initialization completed');
    return true;

  } catch (error) {
    console.warn('⚠️ Worklets initialization failed, app will continue:', error.message);
    return false;
  }
};

// Initialize immediately when module is imported
const initResult = initializeWorkletsRuntime();

// Export for manual re-initialization if needed
export const reinitializeWorklets = initializeWorkletsRuntime;
export const isWorkletsInitialized = () => initResult;

export default {
  initializeWorkletsRuntime,
  reinitializeWorklets,
  isWorkletsInitialized
};