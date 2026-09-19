/**
 * Employee Management Service
 * Handles all employee management API calls for CRM
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://ghar-plot-backend1.onrender.com';

/**
 * Get authentication headers with token
 * Checks all possible token storage keys
 */
const getAuthHeaders = async () => {
  try {
    // Check all possible token keys - ADMIN TOKENS FIRST
    const adminToken = await AsyncStorage.getItem('adminToken');
    const adminTokenAlt = await AsyncStorage.getItem('admin_token');
    const crmAdminToken = await AsyncStorage.getItem('crm_admin_token');
    const employeeToken = await AsyncStorage.getItem('employee_auth_token');
    const employeeTokenAlt = await AsyncStorage.getItem('employeeToken');
    const crmAuthToken = await AsyncStorage.getItem('crm_auth_token');
    const authToken = await AsyncStorage.getItem('authToken');

    // Priority: adminToken FIRST (set by admin login), then others
    const token = adminToken || adminTokenAlt || crmAdminToken || employeeToken || employeeTokenAlt || crmAuthToken || authToken;

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
 * Get the correct API path based on user type (admin vs employee)
 */
const getEmployeesApiPath = async () => {
  const adminToken = await AsyncStorage.getItem('adminToken');
  const adminTokenAlt = await AsyncStorage.getItem('admin_token');
  const crmAdminToken = await AsyncStorage.getItem('crm_admin_token');

  // If admin token exists, use admin endpoint
  if (adminToken || adminTokenAlt || crmAdminToken) {
    return '/admin/employees';
  }
  // Otherwise use employee endpoint
  return '/api/employees';
};

/**
 * Get all employees with pagination and filters
 */
export const getAllEmployees = async (params = {}) => {
  try {
    const apiPath = await getEmployeesApiPath();
    const queryString = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}${apiPath}${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching employees:', error);
    throw error;
  }
};

/**
 * Get single employee details
 */
export const getEmployeeById = async (empId) => {
  try {
    const apiPath = await getEmployeesApiPath();
    const response = await fetch(`${API_BASE_URL}${apiPath}/${empId}`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching employee details:', error);
    throw error;
  }
};

/**
 * Create new employee
 */
export const createEmployee = async (employeeData) => {
  try {
    const apiPath = await getEmployeesApiPath();
    const response = await fetch(`${API_BASE_URL}${apiPath}`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(employeeData),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error creating employee:', error);
    throw error;
  }
};

/**
 * Update employee details
 */
export const updateEmployee = async (empId, employeeData) => {
  try {
    const apiPath = await getEmployeesApiPath();
    const response = await fetch(`${API_BASE_URL}${apiPath}/${empId}`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify(employeeData),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error updating employee:', error);
    throw error;
  }
};

/**
 * Delete employee
 */
export const deleteEmployee = async (empId) => {
  try {
    const apiPath = await getEmployeesApiPath();
    const response = await fetch(`${API_BASE_URL}${apiPath}/${empId}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error deleting employee:', error);
    throw error;
  }
};

/**
 * Get employee performance metrics
 */
export const getEmployeePerformance = async (empId) => {
  try {
    const apiPath = await getEmployeesApiPath();
    const response = await fetch(`${API_BASE_URL}${apiPath}/${empId}/performance`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching employee performance:', error);
    throw error;
  }
};

/**
 * Get employee statistics
 */
export const getEmployeeStats = async () => {
  try {
    const apiPath = await getEmployeesApiPath();
    const response = await fetch(`${API_BASE_URL}${apiPath}/stats`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching employee stats:', error);
    throw error;
  }
};

/**
 * Update employee status
 */
export const updateEmployeeStatus = async (empId, status) => {
  try {
    const apiPath = await getEmployeesApiPath();
    const response = await fetch(`${API_BASE_URL}${apiPath}/${empId}/status`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ status }),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error updating employee status:', error);
    throw error;
  }
};

export default {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeePerformance,
  getEmployeeStats,
  updateEmployeeStatus,
};
