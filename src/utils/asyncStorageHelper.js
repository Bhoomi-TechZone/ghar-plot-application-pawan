/**
 * AsyncStorage Helper Utility
 * Safe wrapper for AsyncStorage operations to prevent null/undefined value errors
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

class AsyncStorageHelper {
  /**
   * Safely set an item in AsyncStorage
   * @param {string} key - Storage key
   * @param {any} value - Value to store (will be stringified if object)
   */
  static async safeSetItem(key, value) {
    try {
      // Check if value is null or undefined
      if (value === null || value === undefined) {
        console.warn(`[AsyncStorage] Attempting to store null/undefined value for key "${key}". Removing item instead.`);
        await AsyncStorage.removeItem(key);
        return;
      }

      // Handle string values
      if (typeof value === 'string') {
        if (value === 'null' || value === 'undefined' || value.trim() === '') {
          console.warn(`[AsyncStorage] Attempting to store invalid string value for key "${key}". Removing item instead.`);
          await AsyncStorage.removeItem(key);
          return;
        }
        await AsyncStorage.setItem(key, value);
        return;
      }

      // Handle objects by stringifying
      if (typeof value === 'object') {
        const stringified = JSON.stringify(value);
        if (stringified === 'null' || stringified === 'undefined') {
          console.warn(`[AsyncStorage] Attempting to store null object for key "${key}". Removing item instead.`);
          await AsyncStorage.removeItem(key);
          return;
        }
        await AsyncStorage.setItem(key, stringified);
        return;
      }

      // Handle other types (number, boolean, etc.)
      await AsyncStorage.setItem(key, String(value));

    } catch (error) {
      console.error(`[AsyncStorage] Error setting item "${key}":`, error);
      throw error;
    }
  }

  /**
   * Safely get an item from AsyncStorage
   * @param {string} key - Storage key
   * @param {any} defaultValue - Default value if key doesn't exist
   */
  static async safeGetItem(key, defaultValue = null) {
    try {
      const value = await AsyncStorage.getItem(key);
      
      // Return default if no value found
      if (value === null || value === undefined) {
        return defaultValue;
      }

      // Check for invalid string values
      if (value === 'null' || value === 'undefined') {
        console.warn(`[AsyncStorage] Found invalid value for key "${key}". Cleaning up.`);
        await AsyncStorage.removeItem(key);
        return defaultValue;
      }

      return value;
    } catch (error) {
      console.error(`[AsyncStorage] Error getting item "${key}":`, error);
      return defaultValue;
    }
  }

  /**
   * Safely get and parse JSON from AsyncStorage
   * @param {string} key - Storage key
   * @param {any} defaultValue - Default value if key doesn't exist or parsing fails
   */
  static async safeGetJSON(key, defaultValue = null) {
    try {
      const value = await this.safeGetItem(key);
      
      if (!value) {
        return defaultValue;
      }

      try {
        const parsed = JSON.parse(value);
        // Additional check for null objects
        if (parsed === null || parsed === undefined) {
          await AsyncStorage.removeItem(key);
          return defaultValue;
        }
        return parsed;
      } catch (parseError) {
        console.warn(`[AsyncStorage] Failed to parse JSON for key "${key}":`, parseError);
        await AsyncStorage.removeItem(key);
        return defaultValue;
      }
    } catch (error) {
      console.error(`[AsyncStorage] Error getting JSON for key "${key}":`, error);
      return defaultValue;
    }
  }

  /**
   * Safely set JSON object in AsyncStorage
   * @param {string} key - Storage key
   * @param {object} value - Object to store
   */
  static async safeSetJSON(key, value) {
    try {
      if (value === null || value === undefined) {
        console.warn(`[AsyncStorage] Attempting to store null/undefined JSON for key "${key}". Removing item instead.`);
        await AsyncStorage.removeItem(key);
        return;
      }

      await this.safeSetItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`[AsyncStorage] Error setting JSON for key "${key}":`, error);
      throw error;
    }
  }

  /**
   * Clear multiple items safely
   * @param {string[]} keys - Array of keys to remove
   */
  static async safeClearItems(keys) {
    try {
      const validKeys = keys.filter(key => typeof key === 'string' && key.length > 0);
      if (validKeys.length > 0) {
        await AsyncStorage.multiRemove(validKeys);
      }
    } catch (error) {
      console.error('[AsyncStorage] Error clearing items:', error);
      throw error;
    }
  }
}

export default AsyncStorageHelper;