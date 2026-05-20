/**
 * CRM User Management API
 * Handles all user management related API calls
 */
import { CRM_BASE_URL, getCRMAuthHeaders, handleCRMResponse, buildQueryString } from './crmAPI';

/**
 * Get all users with pagination and filters
 */
export const getAllUsers = async (params = {}) => {
  try {
    const queryString = buildQueryString(params);
    const url = `${CRM_BASE_URL}/api/users${queryString ? `?${queryString}` : ''}`;
    
    console.log('📡 API Request URL:', url);
    
    const headers = await getCRMAuthHeaders();
    console.log('🔐 Auth Headers:', headers.Authorization ? 'Token present' : 'No token');
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });
    
    console.log('📥 Response Status:', response.status);
    
    return await handleCRMResponse(response);
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
    const response = await fetch(`${CRM_BASE_URL}/api/users/${userId}`, {
      method: 'GET',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
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
    const response = await fetch(`${CRM_BASE_URL}/api/users`, {
      method: 'POST',
      headers: await getCRMAuthHeaders(),
      body: JSON.stringify(userData),
    });
    
    return await handleCRMResponse(response);
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
    const response = await fetch(`${CRM_BASE_URL}/api/users/${userId}`, {
      method: 'PUT',
      headers: await getCRMAuthHeaders(),
      body: JSON.stringify(userData),
    });
    
    return await handleCRMResponse(response);
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
    const response = await fetch(`${CRM_BASE_URL}/api/users/${userId}`, {
      method: 'DELETE',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
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
    // Note: Backend doesn't have deactivate endpoint, using delete instead
    const response = await fetch(`${CRM_BASE_URL}/api/users/${userId}`, {
      method: 'DELETE',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
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
    // Note: Backend doesn't have activate endpoint, this is a placeholder
    const response = await fetch(`${CRM_BASE_URL}/api/users/${userId}`, {
      method: 'PUT',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
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
    // Note: Backend doesn't have user stats endpoint
    // Return mock data or fetch from getAllUsers
    const response = await fetch(`${CRM_BASE_URL}/api/users`, {
      method: 'GET',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    throw error;
  }
};

/**
 * Get all users (Alternative endpoint)
 */
export const getAllUsersAlternative = async () => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/users`, {
      method: 'GET',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error fetching users (alternative):', error);
    throw error;
  }
};

/**
 * Get users with pagination (alias for getAllUsers)
 */
export const getUsersWithPagination = getAllUsers;

/**
 * Search users by query
 */
export const searchUsers = async (query) => {
  try {
    console.log('🔍 searchUsers - Query:', query);
    
    const url = `${CRM_BASE_URL}/api/users/search?q=${encodeURIComponent(query)}`;
    
    const headers = await getCRMAuthHeaders();
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    const data = await handleCRMResponse(response);
    console.log('✅ searchUsers Response:', JSON.stringify(data, null, 2));

    return {
      users: data.users || [],
      totalFound: data.totalFound || 0,
    };
  } catch (error) {
    console.error('❌ searchUsers Error:', error);
    throw error;
  }
};

/**
 * Bulk delete multiple users
 */
export const bulkDeleteUsers = async ({ userIds }) => {
  try {
    console.log('🗑️ bulkDeleteUsers - User IDs:', userIds);
    
    const url = `${CRM_BASE_URL}/api/users/bulk-delete`;
    
    const headers = await getCRMAuthHeaders();
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ userIds }),
    });

    const data = await handleCRMResponse(response);
    console.log('✅ bulkDeleteUsers Response:', JSON.stringify(data, null, 2));

    return data;
  } catch (error) {
    console.error('❌ bulkDeleteUsers Error:', error);
    throw error;
  }
};

/**
 * Assign users to an employee
 */
export const assignUsersToEmployee = async ({ userIds, employeeId, priority = 'medium', notes = '' }) => {
  try {
    console.log('👥 assignUsersToEmployee - User IDs:', userIds, 'Employee ID:', employeeId);
    
    const url = `${CRM_BASE_URL}/admin/user-leads/assign`;
    
    const headers = await getCRMAuthHeaders();
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userIds,
        employeeId,
        priority,
        notes,
      }),
    });

    const data = await handleCRMResponse(response);
    console.log('✅ assignUsersToEmployee Response:', JSON.stringify(data, null, 2));

    return data;
  } catch (error) {
    console.error('❌ assignUsersToEmployee Error:', error);
    throw error;
  }
};

/**
 * Enable auto assignment
 */
export const enableAutoAssignment = async ({ employeeId }) => {
  try {
    console.log('🤖 enableAutoAssignment - Employee ID:', employeeId);
    
    const url = `${CRM_BASE_URL}/api/users/auto-assignment/enable`;
    
    const headers = await getCRMAuthHeaders();
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ employeeId }),
    });

    const data = await handleCRMResponse(response);
    console.log('✅ enableAutoAssignment Response:', JSON.stringify(data, null, 2));

    return data;
  } catch (error) {
    console.error('❌ enableAutoAssignment Error:', error);
    throw error;
  }
};

/**
 * Disable auto assignment
 */
export const disableAutoAssignment = async () => {
  try {
    console.log('🚫 disableAutoAssignment');
    
    const url = `${CRM_BASE_URL}/api/users/auto-assignment/disable`;
    
    const headers = await getCRMAuthHeaders();
    const response = await fetch(url, {
      method: 'POST',
      headers,
    });

    const data = await handleCRMResponse(response);
    console.log('✅ disableAutoAssignment Response:', JSON.stringify(data, null, 2));

    return data;
  } catch (error) {
    console.error('❌ disableAutoAssignment Error:', error);
    throw error;
  }
};

/**
 * Get auto assignment status
 */
export const getAutoAssignmentStatus = async () => {
  try {
    console.log('🔍 getAutoAssignmentStatus');
    
    const url = `${CRM_BASE_URL}/api/users/auto-assignment/status`;
    
    const headers = await getCRMAuthHeaders();
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    const data = await handleCRMResponse(response);
    console.log('✅ getAutoAssignmentStatus Response:', JSON.stringify(data, null, 2));

    return {
      enabled: data.enabled || false,
      employeeId: data.employeeId || null,
      employeeName: data.employeeName || null,
    };
  } catch (error) {
    console.error('❌ getAutoAssignmentStatus Error:', error);
    throw error;
  }
};

/**
 * Get user activity data for charts
 */
export const getUserActivity = async () => {
  try {
    console.log('📊 getUserActivity');
    
    const url = `${CRM_BASE_URL}/api/users/activity`;
    
    const headers = await getCRMAuthHeaders();
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    const data = await handleCRMResponse(response);
    console.log('✅ getUserActivity Response:', JSON.stringify(data, null, 2));

    return data.activity || [];
  } catch (error) {
    console.error('❌ getUserActivity Error:', error);
    throw error;
  }
};

export default {
  getAllUsers,
  getAllUsersAlternative,
  getUsersWithPagination,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  deactivateUser,
  activateUser,
  getUserStats,
  searchUsers,
  bulkDeleteUsers,
  assignUsersToEmployee,
  enableAutoAssignment,
  disableAutoAssignment,
  getAutoAssignmentStatus,
  getUserActivity,
};
