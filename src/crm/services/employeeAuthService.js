/**
 * Employee Authentication Service
 * Handles employee login, logout and authentication state
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage Keys
const EMPLOYEE_TOKEN_KEY = 'employee_auth_token';
const EMPLOYEE_PROFILE_KEY = 'employee_profile';
const EMPLOYEE_PERMISSIONS_KEY = 'employee_permissions';

// All auth keys to clear on logout
const AUTH_KEYS = [
  'crm_auth_token',
  'adminToken',
  'admin_token',
  'admin_email',
  'admin_password',
  'employee_auth_token',
  'employee_token',
  'employee_user',
  'employee_profile',
  'employee_permissions',
  'authToken',
  'userProfile',
  'userToken',
  'userId',
  'refreshToken',
  'fcmToken',
];

/**
 * Get stored employee token
 */
export const getEmployeeToken = async () => {
  try {
    const token = await AsyncStorage.getItem(EMPLOYEE_TOKEN_KEY);
    return token;
  } catch (error) {
    console.error('Error getting employee token:', error);
    return null;
  }
};

/**
 * Store employee token
 */
export const setEmployeeToken = async (token) => {
  try {
    await AsyncStorage.setItem(EMPLOYEE_TOKEN_KEY, token);
    return { success: true };
  } catch (error) {
    console.error('Error setting employee token:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Get stored employee profile
 */
export const getEmployeeProfile = async () => {
  try {
    const profile = await AsyncStorage.getItem(EMPLOYEE_PROFILE_KEY);
    return profile ? JSON.parse(profile) : null;
  } catch (error) {
    console.error('Error getting employee profile:', error);
    return null;
  }
};

/**
 * Store employee profile
 */
export const setEmployeeProfile = async (profile) => {
  try {
    await AsyncStorage.setItem(EMPLOYEE_PROFILE_KEY, JSON.stringify(profile));
    return { success: true };
  } catch (error) {
    console.error('Error setting employee profile:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Get stored employee permissions
 */
export const getEmployeePermissions = async () => {
  try {
    const permissions = await AsyncStorage.getItem(EMPLOYEE_PERMISSIONS_KEY);
    return permissions ? JSON.parse(permissions) : null;
  } catch (error) {
    console.error('Error getting employee permissions:', error);
    return null;
  }
};

/**
 * Store employee permissions
 */
export const setEmployeePermissions = async (permissions) => {
  try {
    await AsyncStorage.setItem(EMPLOYEE_PERMISSIONS_KEY, JSON.stringify(permissions));
    return { success: true };
  } catch (error) {
    console.error('Error setting employee permissions:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Check if employee is authenticated
 */
export const isEmployeeAuthenticated = async () => {
  try {
    const token = await getEmployeeToken();
    return !!token;
  } catch (error) {
    console.error('Error checking employee authentication:', error);
    return false;
  }
};

/**
 * Employee Logout - Clears all stored credentials
 */
export const employeeLogout = async () => {
  try {
    console.log('🔄 Employee logout initiated...');
    
    await AsyncStorage.multiRemove(AUTH_KEYS);
    
    // Verification
    const token = await AsyncStorage.getItem(EMPLOYEE_TOKEN_KEY);
    const crmToken = await AsyncStorage.getItem('crm_auth_token');
    
    console.log('🔍 Verification after logout:', {
      employeeToken: token ? 'Still exists!' : 'Cleared ✅',
      crmToken: crmToken ? 'Still exists!' : 'Cleared ✅',
    });
    
    console.log('✅ Employee logged out successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Error during employee logout:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Admin Logout - Clears all stored credentials
 */
export const adminLogout = async () => {
  try {
    console.log('🔄 Admin logout initiated...');
    
    await AsyncStorage.multiRemove(AUTH_KEYS);
    
    // Verification
    const adminToken = await AsyncStorage.getItem('adminToken');
    const crmToken = await AsyncStorage.getItem('crm_auth_token');
    
    console.log('🔍 Verification after logout:', {
      adminToken: adminToken ? 'Still exists!' : 'Cleared ✅',
      crmToken: crmToken ? 'Still exists!' : 'Cleared ✅',
    });
    
    console.log('✅ Admin logged out successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Error during admin logout:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Force logout - Set flag to trigger logout from anywhere
 */
export const triggerForceLogout = async () => {
  try {
    await AsyncStorage.setItem('forceLogout', 'true');
    console.log('🚨 Force logout flag set');
    return { success: true };
  } catch (error) {
    console.error('Error setting force logout flag:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Check and clear force logout flag
 */
export const checkForceLogout = async () => {
  try {
    const forceLogout = await AsyncStorage.getItem('forceLogout');
    if (forceLogout === 'true') {
      await AsyncStorage.removeItem('forceLogout');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error checking force logout:', error);
    return false;
  }
};

export default {
  getEmployeeToken,
  setEmployeeToken,
  getEmployeeProfile,
  setEmployeeProfile,
  getEmployeePermissions,
  setEmployeePermissions,
  isEmployeeAuthenticated,
  employeeLogout,
  adminLogout,
  triggerForceLogout,
  checkForceLogout,
};
