/**
 * Role Management Service
 * Handles all role and permission management API calls
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

    // Priority: adminToken FIRST, then others
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
const getRolesApiPath = async () => {
  const adminToken = await AsyncStorage.getItem('adminToken');
  const adminTokenAlt = await AsyncStorage.getItem('admin_token');
  const crmAdminToken = await AsyncStorage.getItem('crm_admin_token');

  // If admin token exists, use admin endpoint
  if (adminToken || adminTokenAlt || crmAdminToken) {
    return '/admin/roles';
  }
  // Otherwise use api endpoint
  return '/api/roles';
};

/**
 * Get all roles
 */
export const getAllRoles = async () => {
  try {
    const apiPath = await getRolesApiPath();
    const response = await fetch(`${API_BASE_URL}${apiPath}`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching roles:', error);
    throw error;
  }
};

/**
 * Get role details with permissions
 */
export const getRoleById = async (roleId) => {
  try {
    const apiPath = await getRolesApiPath();
    const response = await fetch(`${API_BASE_URL}${apiPath}/${roleId}`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching role details:', error);
    throw error;
  }
};

/**
 * Create new role
 */
export const createRole = async (roleData) => {
  try {
    const apiPath = await getRolesApiPath();
    const response = await fetch(`${API_BASE_URL}${apiPath}`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(roleData),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error creating role:', error);
    throw error;
  }
};

/**
 * Update role
 */
export const updateRole = async (roleId, roleData) => {
  try {
    const apiPath = await getRolesApiPath();
    const response = await fetch(`${API_BASE_URL}${apiPath}/${roleId}`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify(roleData),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error updating role:', error);
    throw error;
  }
};

/**
 * Delete role
 */
export const deleteRole = async (roleId) => {
  try {
    const apiPath = await getRolesApiPath();
    const response = await fetch(`${API_BASE_URL}${apiPath}/${roleId}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error deleting role:', error);
    throw error;
  }
};

/**
 * Get all available permissions
 */
export const getAllPermissions = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/permissions`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching permissions:', error);
    throw error;
  }
};

/**
 * Assign permissions to role
 */
export const assignPermissions = async (roleId, permissions) => {
  try {
    const apiPath = await getRolesApiPath();
    const response = await fetch(`${API_BASE_URL}${apiPath}/${roleId}/permissions`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ permissions }),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error assigning permissions:', error);
    throw error;
  }
};

/**
 * Get role usage statistics
 */
export const getRoleStats = async () => {
  try {
    const apiPath = await getRolesApiPath();
    const response = await fetch(`${API_BASE_URL}${apiPath}/stats`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching role stats:', error);
    throw error;
  }
};

export default {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getAllPermissions,
  assignPermissions,
  getRoleStats,
};
