/**
 * User Assignment Service
 * Handles user-employee assignment API calls
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
 * Get all user-employee assignments
 */
export const getAllAssignments = async (params = {}) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/api/crm/assignments${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    throw error;
  }
};

/**
 * Assign user to employee
 */
export const assignUser = async (userId, employeeId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/crm/assignments/assign`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ userId, employeeId }),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error assigning user:', error);
    throw error;
  }
};

/**
 * Unassign user from employee
 */
export const unassignUser = async (userId, employeeId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/crm/assignments/unassign`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ userId, employeeId }),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error unassigning user:', error);
    throw error;
  }
};

/**
 * Get employees with capacity info
 */
export const getEmployeesCapacity = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/crm/employees/capacity`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching employees capacity:', error);
    throw error;
  }
};

/**
 * Get assignment statistics
 */
export const getAssignmentStats = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/crm/assignments/stats`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching assignment stats:', error);
    throw error;
  }
};

export default {
  getAllAssignments,
  assignUser,
  unassignUser,
  getEmployeesCapacity,
  getAssignmentStats,
};
