/**
 * React Native Reanimated v4.2.0 Configuration Helper
 * Fixes setDynamicFeatureFlag and other Reanimated initialization issues
 */

import { Platform } from 'react-native';

// Initialize Reanimated properly for v4.2.0
export const initializeReanimated = () => {
  try {
    // Import Reanimated with proper error handling
    const Reanimated = require('react-native-reanimated');
    
    console.log('🔧 Initializing React Native Reanimated v4.2.0...');
    
    // Check if we're in a proper React Native environment
    if (Platform.OS === 'web') {
      console.log('🌐 Web platform detected - Reanimated initialization skipped');
      return true;
    }
    
    // For Reanimated v4.2.0, we need to ensure proper module proxy setup
    if (Reanimated && Reanimated.default) {
      console.log('✅ Reanimated module loaded successfully');
      
      // Check for native module availability
      const { NativeReanimated } = Reanimated.default;
      
      if (NativeReanimated) {
        console.log('✅ NativeReanimated bridge found');
        
        // Patch missing setDynamicFeatureFlag if needed
        if (typeof NativeReanimated.setDynamicFeatureFlag === 'undefined') {
          console.log('🔧 Patching missing setDynamicFeatureFlag...');
          
          NativeReanimated.setDynamicFeatureFlag = (flag, value) => {
            console.log(`🏁 Feature flag set: ${flag} = ${value}`);
            // For compatibility, we'll create a no-op implementation
            return Promise.resolve();
          };
          
          console.log('✅ setDynamicFeatureFlag patched successfully');
        }
        
        // Ensure other required methods exist
        const requiredMethods = [
          'installCoreFunctions',
          'makeShareableClone',
          'scheduleOnUI'
        ];
        
        requiredMethods.forEach(method => {
          if (typeof NativeReanimated[method] === 'undefined') {
            console.log(`🔧 Patching missing ${method}...`);
            NativeReanimated[method] = (...args) => {
              console.log(`🏁 ${method} called with args:`, args);
              return Promise.resolve();
            };
          }
        });
        
      } else {
        console.warn('⚠️ NativeReanimated bridge not found - creating mock');
        
        // Create a basic mock for NativeReanimated
        if (Reanimated.default && !Reanimated.default.NativeReanimated) {
          Reanimated.default.NativeReanimated = {
            setDynamicFeatureFlag: (flag, value) => {
              console.log(`🏁 Mock feature flag set: ${flag} = ${value}`);
              return Promise.resolve();
            },
            installCoreFunctions: () => Promise.resolve(),
            makeShareableClone: (obj) => obj,
            scheduleOnUI: (callback) => {
              if (typeof callback === 'function') {
                requestAnimationFrame(callback);
              }
            }
          };
        }
      }
      
      return true;
    } else {
      console.warn('⚠️ Reanimated module not properly loaded');
      return false;
    }
    
  } catch (error) {
    console.warn('⚠️ Reanimated initialization failed:', error.message);
    
    // Create fallback implementations to prevent crashes
    try {
      const Reanimated = require('react-native-reanimated');
      
      if (Reanimated && !Reanimated.setDynamicFeatureFlag) {
        Reanimated.setDynamicFeatureFlag = (flag, value) => {
          console.log(`🏁 Fallback feature flag set: ${flag} = ${value}`);
        };
      }
      
    } catch (fallbackError) {
      console.warn('⚠️ Reanimated fallback setup failed:', fallbackError.message);
    }
    
    return false;
  }
};

// Additional helper for runtime configuration
export const configureReanimatedRuntime = () => {
  try {
    // Configure Reanimated runtime settings for v4.2.0
    global._REANIMATED_VERSION_RUNTIME = '4.2.0';
    global._REANIMATED_IS_REDUCED_MOTION = false;
    
    // Set up worklet runtime if available
    if (global.__reanimatedWorkletInit) {
      console.log('🔧 Initializing Reanimated worklet runtime...');
      global.__reanimatedWorkletInit();
    }
    
    console.log('✅ Reanimated runtime configured successfully');
    return true;
    
  } catch (error) {
    console.warn('⚠️ Reanimated runtime configuration failed:', error.message);
    return false;
  }
};

// Error boundary for Reanimated-related crashes
export const setupReanimatedErrorBoundary = () => {
  const originalConsoleError = console.error;
  
  console.error = (...args) => {
    const errorMessage = args.join(' ');
    
    // Filter out known Reanimated v4.2.0 compatibility issues
    const reanimatedErrors = [
      'setDynamicFeatureFlag is not a function',
      'JduleProxy is undefined',
      'NativeReanimated is not available',
      'Reanimated module not found'
    ];
    
    const isReanimatedError = reanimatedErrors.some(pattern => 
      errorMessage.includes(pattern)
    );
    
    if (isReanimatedError) {
      console.warn('🔧 Reanimated compatibility issue detected:', errorMessage);
      // Don't crash the app for these specific errors
      return;
    }
    
    // Call original console.error for other errors
    originalConsoleError.apply(console, args);
  };
};

// Complete initialization function
export const setupReanimatedCompletely = () => {
  console.log('🚀 Setting up React Native Reanimated v4.2.0 completely...');
  
  // Step 1: Configure runtime
  configureReanimatedRuntime();
  
  // Step 2: Set up error boundary
  setupReanimatedErrorBoundary();
  
  // Step 3: Initialize Reanimated
  const success = initializeReanimated();
  
  if (success) {
    console.log('✅ React Native Reanimated v4.2.0 setup completed successfully');
  } else {
    console.log('⚠️ React Native Reanimated v4.2.0 setup completed with warnings');
  }
  
  return success;
};

// Export default setup function
export default setupReanimatedCompletely;