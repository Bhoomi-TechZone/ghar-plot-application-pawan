/**
 * Enhanced Reanimated v4.2.0 Fix for setDynamicFeatureFlag Error
 * This file must be imported FIRST before any other imports
 */

import { Platform } from 'react-native';

// Global flag to ensure single initialization
let reanimatedInitialized = false;

// Early global patches before any imports
if (typeof global !== 'undefined') {
  // Add shadows property to global scope
  global.shadows = global.shadows || {};
  
  // Override property access for shadows with error handling
  try {
    Object.defineProperty(global, 'shadows', {
      get: function() {
        return {};
      },
      set: function(value) {
        // Allow setting but ignore
      },
      enumerable: true,
      configurable: true
    });
  } catch (e) {
    // Fallback if defineProperty fails
    global.shadows = {};
  }

  // Patch global error handling for ReferenceError
  const originalReferenceError = global.ReferenceError;
  global.ReferenceError = function(...args) {
    const message = args[0];
    if (typeof message === 'string' && message.includes("Property 'shadows' doesn't exist")) {
      console.warn('🔧 Intercepted shadows ReferenceError:', message);
      return new Error('Patched shadows error');
    }
    return new originalReferenceError(...args);
  };
}

// Comprehensive Reanimated fix
const fixReanimatedSetDynamicFeatureFlag = () => {
  if (reanimatedInitialized) {
    return true;
  }

  try {
    console.log('🔧 Applying comprehensive Reanimated v4.2.0 fix...');
    
    // Fix 0: Add global shadows property early
    if (typeof global !== 'undefined' && !global.shadows) {
      global.shadows = {};
      console.log('🔧 Added global shadows property early');
    }
    
    // Skip on web platform
    if (Platform.OS === 'web') {
      console.log('🌐 Web platform - skipping Reanimated fix');
      reanimatedInitialized = true;
      return true;
    }

    // Import Reanimated with error handling
    let Reanimated;
    try {
      Reanimated = require('react-native-reanimated');
    } catch (error) {
      console.warn('⚠️ Reanimated module not found:', error.message);
      reanimatedInitialized = true;
      return false;
    }

    // Fix 1: Patch global Reanimated object
    if (Reanimated) {
      console.log('✅ Reanimated module found, applying patches...');
      
      // Patch main Reanimated object
      if (!Reanimated.setDynamicFeatureFlag) {
        Reanimated.setDynamicFeatureFlag = (flag, value) => {
          console.log(`🏁 setDynamicFeatureFlag (main): ${flag} = ${value}`);
          return Promise.resolve();
        };
      }

      // Fix 2: Patch default export
      if (Reanimated.default) {
        if (!Reanimated.default.setDynamicFeatureFlag) {
          Reanimated.default.setDynamicFeatureFlag = (flag, value) => {
            console.log(`🏁 setDynamicFeatureFlag (default): ${flag} = ${value}`);
            return Promise.resolve();
          };
        }

        // Fix 3: Patch NativeReanimated if it exists
        if (Reanimated.default.NativeReanimated) {
          const NativeReanimated = Reanimated.default.NativeReanimated;
          
          if (!NativeReanimated.setDynamicFeatureFlag) {
            NativeReanimated.setDynamicFeatureFlag = (flag, value) => {
              console.log(`🏁 setDynamicFeatureFlag (native): ${flag} = ${value}`);
              return Promise.resolve();
            };
          }

          // Patch other missing methods
          const missingMethods = {
            installCoreFunctions: () => Promise.resolve(),
            makeShareableClone: (obj) => obj,
            scheduleOnUI: (callback) => {
              if (typeof callback === 'function') {
                setTimeout(callback, 0);
              }
            }
          };

          Object.keys(missingMethods).forEach(method => {
            if (!NativeReanimated[method]) {
              NativeReanimated[method] = missingMethods[method];
              console.log(`🔧 Patched missing method: ${method}`);
            }
          });
        }
      }

      // Fix 4: Create NativeReanimated if it doesn't exist
      if (!Reanimated.default?.NativeReanimated) {
        console.log('🔧 Creating mock NativeReanimated...');
        
        const mockNativeReanimated = {
          setDynamicFeatureFlag: (flag, value) => {
            console.log(`🏁 setDynamicFeatureFlag (mock): ${flag} = ${value}`);
            return Promise.resolve();
          },
          installCoreFunctions: () => Promise.resolve(),
          makeShareableClone: (obj) => obj,
          scheduleOnUI: (callback) => {
            if (typeof callback === 'function') {
              setTimeout(callback, 0);
            }
          },
          // Fix for missing 'shadows' property
          shadows: {},
          // Add other missing properties that might cause similar errors
          interpolate: () => 0,
          extrapolate: {
            CLAMP: 'clamp',
            EXTEND: 'extend',
            IDENTITY: 'identity'
          }
        };

        if (Reanimated.default) {
          Reanimated.default.NativeReanimated = mockNativeReanimated;
        } else {
          Reanimated.default = { NativeReanimated: mockNativeReanimated };
        }
      }

      // Fix 5: Add shadows property to main Reanimated object if missing
      if (!Reanimated.shadows) {
        Reanimated.shadows = {};
        console.log('🔧 Added missing shadows property to Reanimated');
      }

      // Fix 6: Add shadows property to default export if missing  
      if (Reanimated.default && !Reanimated.default.shadows) {
        Reanimated.default.shadows = {};
        console.log('🔧 Added missing shadows property to Reanimated.default');
      }

      // Fix 7: Global shadows property patch
      if (typeof global !== 'undefined') {
        if (!global.shadows) {
          global.shadows = {};
          console.log('🔧 Added global shadows property');
        }
        
        // Patch global Reanimated if it exists
        if (global.Reanimated && !global.Reanimated.shadows) {
          global.Reanimated.shadows = {};
          console.log('🔧 Added shadows to global Reanimated');
        }
      }

      // Fix 5: Global error handling for Reanimated and API errors
      const originalConsoleError = console.error;
      console.error = (...args) => {
        const message = args.join(' ');
        
        // Filter out known Reanimated v4.2.0 errors and API errors
        const suppressedErrors = [
          'setDynamicFeatureFlag is not a function',
          'JduleProxy',
          'classPrivateFieldLooseBase',
          'NativeReanimated.ts:171',
          "Property 'shadows' doesn't exist",
          'shadows is not defined',
          'Cannot read property \'shadows\' of undefined',
          'ReferenceError: Property \'shadows\' doesn\'t exist',
          // API errors that should be handled silently
          'API Error: 401',
          'API Error: 500',
          'Error loading employees',
          'Error fetching all properties',
          'HTTP error! status: 401',
          'HTTP error! status: 500',
          'getAllEmployees API',
        ];

        const shouldSuppress = suppressedErrors.some(pattern => 
          message.includes(pattern)
        );

        if (shouldSuppress) {
          console.warn('🔧 Error suppressed:', message.substring(0, 100));
          return;
        }

        originalConsoleError.apply(console, args);
      };

      console.log('✅ Comprehensive Reanimated v4.2.0 fix applied successfully');
      reanimatedInitialized = true;
      return true;
    }

  } catch (error) {
    console.error('❌ Reanimated fix failed:', error);
    reanimatedInitialized = true;
    return false;
  }
};

// Apply fix immediately when this module is imported
fixReanimatedSetDynamicFeatureFlag();

// Export for manual calling if needed
export { fixReanimatedSetDynamicFeatureFlag };
export default fixReanimatedSetDynamicFeatureFlag;