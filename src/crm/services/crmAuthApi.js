/**
 * CRM Authentication API
 * Handles all CRM authentication related API calls
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CRM_BASE_URL, OTP_BASE_URL, handleCRMResponse } from './crmAPI';

const TOKEN_KEY = 'crm_auth_token';

/**
 * Admin Login
 */
export const adminLogin = async (email, password) => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await handleCRMResponse(response);
    
    if (data.token) {
      await AsyncStorage.setItem(TOKEN_KEY, data.token);
      await AsyncStorage.setItem('adminToken', data.token);
    }
    
    return data;
  } catch (error) {
    console.error('Error in admin login:', error);
    throw error;
  }
};

/**
 * Admin Send OTP
 */
export const adminSendOTP = async (mobileNumber) => {
  try {
    const response = await fetch(`${OTP_BASE_URL}/admin/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mobileNumber }),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error sending admin OTP:', error);
    throw error;
  }
};

/**
 * Admin Verify OTP
 */
export const adminVerifyOTP = async (mobileNumber, otp) => {
  try {
    const response = await fetch(`${OTP_BASE_URL}/admin/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mobileNumber, otp }),
    });
    
    const data = await handleCRMResponse(response);
    
    if (data.token) {
      await AsyncStorage.setItem(TOKEN_KEY, data.token);
      await AsyncStorage.setItem('adminToken', data.token);
    }
    
    return data;
  } catch (error) {
    console.error('Error verifying admin OTP:', error);
    throw error;
  }
};

/**
 * Employee Login
 */
export const employeeLogin = async (email, password) => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/crm/auth/employee/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await handleCRMResponse(response);
    
    if (data.token) {
      await AsyncStorage.setItem('employee_auth_token', data.token);
      await AsyncStorage.setItem('accessToken', data.token);
    }
    
    // 🔥 Store employee ID for FCM token sync
    let employeeId = null;
    if (data.employee && data.employee._id) {
      employeeId = data.employee._id;
      await AsyncStorage.setItem('userId', data.employee._id);
      await AsyncStorage.setItem('employeeId', data.employee._id);
      console.log('✅ Employee ID stored from crmAuthApi:', data.employee._id);
    } else if (data.user && data.user._id) {
      employeeId = data.user._id;
      await AsyncStorage.setItem('userId', data.user._id);
      await AsyncStorage.setItem('employeeId', data.user._id);
      console.log('✅ User ID stored from crmAuthApi:', data.user._id);
    }
    
    // 🔥 Sync FCM token to Employee model for notifications
    if (employeeId) {
      try {
        const { getFCMToken, sendTokenToBackend } = await import('../../utils/fcmService');
        const fcmToken = await getFCMToken();
        if (fcmToken) {
          await sendTokenToBackend(employeeId, fcmToken);
          console.log('✅ FCM token synced after employee login');
        }
      } catch (fcmError) {
        console.warn('⚠️ FCM sync failed:', fcmError.message);
      }
    }
    
    return data;
  } catch (error) {
    console.error('Error in employee login:', error);
    throw error;
  }
};

/**
 * Get current token
 */
export const getCRMToken = async () => {
  try {
    const adminToken = await AsyncStorage.getItem(TOKEN_KEY);
    const employeeToken = await AsyncStorage.getItem('employee_auth_token');
    return adminToken || employeeToken;
  } catch (error) {
    console.error('Error getting CRM token:', error);
    return null;
  }
};

/**
 * Logout
 */
export const crmLogout = async () => {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem('employee_auth_token');
    return true;
  } catch (error) {
    console.error('Error in CRM logout:', error);
    throw error;
  }
};

/**
 * Verify token validity
 */
export const verifyToken = async () => {
  try {
    const token = await getCRMToken();
    
    if (!token) {
      return false;
    }
    
    const response = await fetch(`${CRM_BASE_URL}/api/crm/auth/verify`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error verifying token:', error);
    return false;
  }
};

/**
 * Refresh token
 */
export const refreshCRMToken = async (refreshToken) => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/crm/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });
    
    const data = await handleCRMResponse(response);
    
    if (data.token) {
      await AsyncStorage.setItem(TOKEN_KEY, data.token);
    }
    
    return data;
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
};

export default {
  adminLogin,
  employeeLogin,
  getCRMToken,
  crmLogout,
  verifyToken,
  refreshCRMToken,
};
