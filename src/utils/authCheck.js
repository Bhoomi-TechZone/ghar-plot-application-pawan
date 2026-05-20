import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>} True if user is logged in, false otherwise
 */
export const isUserAuthenticated = async () => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    const userId = await AsyncStorage.getItem('userId');
    
    // User is authenticated if both token and userId exist
    return !!(token && userId);
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
};

/**
 * Get current user ID
 * @returns {Promise<string|null>} User ID or null if not authenticated
 */
export const getCurrentUserId = async () => {
  try {
    return await AsyncStorage.getItem('userId');
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
};

/**
 * Get current user token
 * @returns {Promise<string|null>} User token or null if not authenticated
 */
export const getUserToken = async () => {
  try {
    return await AsyncStorage.getItem('userToken');
  } catch (error) {
    console.error('Error getting user token:', error);
    return null;
  }
};
