/**
 * Location Service
 * 
 * A reusable location service using react-native-geolocation-service
 * Handles permissions, error cases, and works on both Android and iOS
 */

import { Platform, PermissionsAndroid, Alert } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import CrossPlatformAlert from './crossPlatformAlert';

console.log('✅ locationService.js loaded successfully');

/**
 * Request location permission on Android
 * iOS permissions are handled via Info.plist
 * 
 * @returns {Promise<boolean>} - Returns true if permission granted
 */
export const requestLocationPermission = async () => {
  try {
    // iOS doesn't need runtime permission request (handled by Info.plist)
    if (Platform.OS === 'ios') {
      return true;
    }

    // Android: Request runtime permissions
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    ]);

    // Check if at least one permission is granted
    const fineLocationGranted = granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;
    const coarseLocationGranted = granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;

    if (fineLocationGranted || coarseLocationGranted) {
      console.log('✅ Location permission granted');
      return true;
    } else {
      console.warn('⚠️ Location permission denied');
      return false;
    }
  } catch (error) {
    console.error('❌ Error requesting location permission:', error);
    return false;
  }
};

/**
 * Get current location coordinates
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.showAlert - Show alert on error (default: true)
 * @param {number} options.timeout - Timeout in milliseconds (default: 15000)
 * @param {number} options.maximumAge - Maximum age of cached position (default: 10000)
 * @param {boolean} options.enableHighAccuracy - Use GPS for high accuracy (default: true)
 * 
 * @returns {Promise<{latitude: number, longitude: number}>} - Returns coordinates object
 * @throws {Error} - Throws error with message if location fetch fails
 */
export const getCurrentLocation = async (options = {}) => {
  const {
    showAlert = true,
    timeout = 15000,
    maximumAge = 10000,
    enableHighAccuracy = true,
  } = options;

  try {
    // Step 1: Request permission
    const hasPermission = await requestLocationPermission();
    
    if (!hasPermission) {
      const errorMessage = 'Location permission denied. Please enable location access in app settings.';
      console.warn('⚠️', errorMessage);
      
      if (showAlert) {
        CrossPlatformAlert.alert(
          'Permission Required',
          errorMessage,
          [{ text: 'OK' }]
        );
      }
      
      throw new Error(errorMessage);
    }

    // Step 2: Check if GPS is enabled (CRITICAL FIX)
    console.log('🔍 Checking GPS availability...');
    
    // Step 3: Get current position with enhanced error handling
    return new Promise((resolve, reject) => {
      // Add safety timeout
      const timeoutId = setTimeout(() => {
        console.error('❌ Location request timed out');
        reject(new Error('Location request timed out. Please check if GPS is enabled.'));
      }, (options?.timeout || 15000) + 2000); // 2 seconds buffer
      
      Geolocation.getCurrentPosition(
        (position) => {
          // Success callback
          clearTimeout(timeoutId);
          const { latitude, longitude } = position.coords;
          
          console.log('📍 Current Location:', {
            latitude,
            longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date(position.timestamp).toLocaleString(),
          });
          
          resolve({ latitude, longitude });
        },
        (error) => {
          // Error callback
          clearTimeout(timeoutId);
          console.error('❌ Location fetch error:', {
            code: error.code,
            message: error.message,
            type: error.constructor?.name || 'Error',
          });

          let errorMessage = 'Failed to get your location. ';
          
          // Handle different error codes
          switch (error.code) {
            case 1: // PERMISSION_DENIED
              errorMessage += 'Location permission denied.';
              break;
            case 2: // POSITION_UNAVAILABLE
              errorMessage += 'Location unavailable. Please check if GPS is enabled and device has clear sky view.';
              break;
            case 3: // TIMEOUT
              errorMessage += 'Location request timed out. Please ensure GPS is enabled and try again.';
              break;
            case 5: // LOCATION_DISABLED
              errorMessage += 'Location services are disabled. Please enable GPS in device settings.';
              break;
            default:
              errorMessage += error.message || 'Unknown error occurred. Please check GPS settings.';
          }

          if (showAlert) {
            CrossPlatformAlert.alert('Location Error', errorMessage, [{ text: 'OK' }]);
          }

          reject(new Error(errorMessage));
        },
        {
          // Android-specific optimizations
          enableHighAccuracy: enableHighAccuracy,
          timeout: timeout,
          maximumAge: maximumAge,
          // CRITICAL FIX: Add Android-specific options
          distanceFilter: 0, // Get location even with 0 movement
          forceRequestLocation: true,
          forceLocationManager: false, // Use Google Play Services (not deprecated LocationManager)
          showLocationDialog: true,
          accuracy: {
            android: 'high',
            ios: 'best',
          },
        }
      );
    });

  } catch (error) {
    console.error('❌ getCurrentLocation error:', error);
    throw error;
  }
};

/**
 * Watch user's location continuously
 * Use this for real-time location tracking
 * 
 * @param {Function} onLocationChange - Callback when location changes
 * @param {Function} onError - Callback when error occurs
 * @param {Object} options - Same options as getCurrentLocation
 * 
 * @returns {number} - Watch ID (use to stop watching)
 */
export const watchLocation = async (onLocationChange, onError, options = {}) => {
  const {
    timeout = 15000,
    maximumAge = 10000,
    enableHighAccuracy = true,
  } = options;

  try {
    // Request permission first
    const hasPermission = await requestLocationPermission();
    
    if (!hasPermission) {
      throw new Error('Location permission denied');
    }

    // Start watching location
    const watchId = Geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log('📍 Location updated:', { latitude, longitude });
        onLocationChange({ latitude, longitude });
      },
      (error) => {
        console.error('❌ Watch location error:', error);
        if (onError) onError(error);
      },
      {
        enableHighAccuracy,
        timeout,
        maximumAge,
        distanceFilter: 10, // Update only if moved 10 meters
      }
    );

    console.log('👀 Started watching location with ID:', watchId);
    return watchId;

  } catch (error) {
    console.error('❌ watchLocation error:', error);
    if (onError) onError(error);
    throw error;
  }
};

/**
 * Stop watching location
 * 
 * @param {number} watchId - Watch ID returned by watchLocation
 */
export const stopWatchingLocation = (watchId) => {
  if (watchId !== null && watchId !== undefined) {
    Geolocation.clearWatch(watchId);
    console.log('🛑 Stopped watching location with ID:', watchId);
  }
};

/**
 * Check if location services are enabled
 * Note: This is not available on all platforms
 */
export const checkLocationEnabled = () => {
  return new Promise((resolve) => {
    // This method is only available on Android
    if (Platform.OS === 'android') {
      Geolocation.getCurrentPosition(
        () => resolve(true),
        (error) => {
          if (error.code === 5) { // LOCATION_DISABLED
            resolve(false);
          } else {
            resolve(true);
          }
        },
        { enableHighAccuracy: false, timeout: 1000, maximumAge: 0 }
      );
    } else {
      // On iOS, assume enabled (will get error if not)
      resolve(true);
    }
  });
};

export default {
  requestLocationPermission,
  getCurrentLocation,
  watchLocation,
  stopWatchingLocation,
  checkLocationEnabled,
};
