/**
 * Performance Alerts Service
 * Handles all performance alerts API calls
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
 * Get performance alerts
 */
export const getPerformanceAlerts = async (params = {}) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/api/crm/alerts/performance${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching performance alerts:', error);
    throw error;
  }
};

/**
 * Get alert statistics
 */
export const getAlertStats = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/crm/alerts/performance/stats`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching alert stats:', error);
    throw error;
  }
};

/**
 * Update alert status
 */
export const updateAlertStatus = async (alertId, status) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/crm/alerts/${alertId}/status`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ status }),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error updating alert status:', error);
    throw error;
  }
};

/**
 * Take action on alert
 */
export const takeActionOnAlert = async (alertId, action, notes = '') => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/crm/alerts/${alertId}/action`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ action, notes }),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error taking action on alert:', error);
    throw error;
  }
};

/**
 * Escalate alert to manager
 */
export const escalateAlert = async (alertId, managerId, reason = '') => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/crm/alerts/${alertId}/escalate`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ managerId, reason }),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error escalating alert:', error);
    throw error;
  }
};

/**
 * Mark alert as resolved
 */
export const resolveAlert = async (alertId, resolution, notes = '') => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/crm/alerts/${alertId}/resolve`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ resolution, notes }),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error resolving alert:', error);
    throw error;
  }
};

/**
 * Get alerts for specific employee
 */
export const getEmployeeAlerts = async (empId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/crm/employees/${empId}/alerts`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching employee alerts:', error);
    throw error;
  }
};

export default {
  getPerformanceAlerts,
  getAlertStats,
  updateAlertStatus,
  takeActionOnAlert,
  escalateAlert,
  resolveAlert,
  getEmployeeAlerts,
};
