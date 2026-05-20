/**
 * CRM API Configuration
 * Base URL and common utilities for all CRM APIs
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// Production server URL - Updated to use localhost:8866
export const CRM_BASE_URL = 'https://gharplotbackend.gntechnology.de';
export const OTP_BASE_URL = 'https://gharplotbackend.gntechnology.de';

/**
 * Get authentication headers with CRM token
 */
export const getCRMAuthHeaders = async () => {
  try {
    // Try multiple token keys - ADMIN TOKENS FIRST for priority
    const adminToken = await AsyncStorage.getItem('adminToken');
    const adminToken2 = await AsyncStorage.getItem('admin_token');
    const crmAdminToken = await AsyncStorage.getItem('crm_admin_token');
    const employeeToken = await AsyncStorage.getItem('employee_auth_token');
    const employeeToken2 = await AsyncStorage.getItem('employee_token');
    const employeeToken3 = await AsyncStorage.getItem('employeeToken');
    const crmToken = await AsyncStorage.getItem('crm_auth_token');

    // adminToken has highest priority (set by admin login)
    const token = adminToken || adminToken2 || crmAdminToken || employeeToken || employeeToken2 || employeeToken3 || crmToken;

    if (token) {
      console.log('🔐 Token found, using:', adminToken ? 'adminToken' : adminToken2 ? 'admin_token' : 'other');
    } else {
      console.warn('⚠️ No authentication token found');
    }

    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  } catch (error) {
    console.error('Error getting CRM auth headers:', error);
    return {
      'Content-Type': 'application/json',
    };
  }
};

/**
 * Handle API response - Safely parse JSON and detect HTML responses
 */
export const handleCRMResponse = async (response) => {
  try {
    // Get response as text first
    const textResponse = await response.text();

    // Check if response is HTML (error page)
    if (textResponse.trim().startsWith('<')) {
      console.error('❌ Received HTML instead of JSON');

      if (response.status === 401 || response.status === 403) {
        throw new Error('Session expired. Please login again.');
      } else if (response.status === 404) {
        throw new Error('API endpoint not found. Backend may not be ready.');
      } else {
        throw new Error('Invalid response from server. Please try again.');
      }
    }

    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(textResponse);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      throw new Error('Invalid server response format.');
    }

    // Check HTTP status
    if (!response.ok) {
      throw new Error(data.message || data.error || `HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (error) {
    // Re-throw with better error message
    if (error.message) {
      throw error;
    }
    throw new Error('Network request failed. Please check your connection.');
  }
};

/**
 * Build query string from params object
 */
export const buildQueryString = (params = {}) => {
  const queryParts = [];
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null) {
      queryParts.push(`${key}=${encodeURIComponent(params[key])}`);
    }
  });
  return queryParts.join('&');
};


