/**
 * User Management Service
 * Handles all user management API calls for CRM
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://gharplotbackend.gntechnology.de';

/**
 * Get authentication headers with token
 * Checks all possible token storage keys
 */
const getAuthHeaders = async () => {
  try {
    // Check all possible token keys (admin and employee)
    const crmAuthToken = await AsyncStorage.getItem('crm_auth_token');
    const adminToken = await AsyncStorage.getItem('adminToken');
    const adminTokenAlt = await AsyncStorage.getItem('admin_token');
    const crmAdminToken = await AsyncStorage.getItem('crm_admin_token');
    const employeeToken = await AsyncStorage.getItem('employee_auth_token');
    const authToken = await AsyncStorage.getItem('authToken');

    // Priority: admin tokens first, then employee tokens
    const token = crmAuthToken || adminToken || adminTokenAlt || crmAdminToken || employeeToken || authToken;

    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  } catch (error) {
    console.error('Error getting auth headers:', error);
    return {
      'Content-Type': 'application/json',
    };
  }
};

/**
 * Handle API response
 */
const handleResponse = async (response) => {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `HTTP error! status: ${response.status}`);
  }

  return data;
};

/**
 * Get all users with pagination and filters
 */
export const getAllUsers = async (params = {}) => {
  try {
    // Build query string manually for React Native compatibility
    const queryParts = [];
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        queryParts.push(`${key}=${encodeURIComponent(params[key])}`);
      }
    });
    const queryString = queryParts.join('&');
    const url = `${API_BASE_URL}/api/crm/users${queryString ? `?${queryString}` : ''}`;

    console.log('📡 API Request URL:', url);

    const headers = await getAuthHeaders();
    console.log('🔐 Auth Headers:', headers.Authorization ? 'Token present' : 'No token');

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    console.log('📥 Response Status:', response.status);

    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

/**
 * Get single user details
 */
export const getUserById = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/crm/users/${userId}`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching user details:', error);
    throw error;
  }
};

/**
 * Create new user
 */
export const createUser = async (userData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/crm/users`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(userData),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

/**
 * Update user details
 */
export const updateUser = async (userId, userData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/crm/users/${userId}`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify(userData),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

/**
 * Delete user (soft delete)
 */
export const deleteUser = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/crm/users/${userId}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

/**
 * Deactivate user account
 */
export const deactivateUser = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/crm/users/${userId}/deactivate`, {
      method: 'POST',
      headers: await getAuthHeaders(),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error deactivating user:', error);
    throw error;
  }
};

/**
 * Activate user account
 */
export const activateUser = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/crm/users/${userId}/activate`, {
      method: 'POST',
      headers: await getAuthHeaders(),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error activating user:', error);
    throw error;
  }
};

/**
 * Get user statistics
 */
export const getUserStats = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/crm/users/stats`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    throw error;
  }
};

export default {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  deactivateUser,
  activateUser,
  getUserStats,
};
