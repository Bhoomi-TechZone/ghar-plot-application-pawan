/**
 * CRM Leads Management API
 * Handles all leads management related API calls
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://gharplotbackend.gntechnology.de';

// Helper function to get auth headers
const getAuthHeaders = async () => {
  try {
    const crmToken = await AsyncStorage.getItem('crm_auth_token');
    const adminToken = await AsyncStorage.getItem('adminToken');
    const adminToken2 = await AsyncStorage.getItem('admin_token');
    const employeeToken = await AsyncStorage.getItem('employee_auth_token');
    const employeeToken2 = await AsyncStorage.getItem('employee_token');
    const authToken = await AsyncStorage.getItem('authToken');

    const token = crmToken || adminToken || adminToken2 || employeeToken || employeeToken2 || authToken;

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

// Handle API response
const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

import { buildQueryString } from './crmAPI';

/**
 * Get all leads with pagination and filters (Admin View)
 */
export const getAllLeads = async (params = {}) => {
  try {
    const headers = await getAuthHeaders();
    const queryString = buildQueryString(params);
    const url = `${API_BASE_URL}/admin/leads/all${queryString ? `?${queryString}` : ''}`;

    console.log('🔄 Fetching leads from:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    const data = await handleResponse(response);
    console.log('📦 Leads API response:', data);

    return data;
  } catch (error) {
    console.error('❌ Error fetching leads:', error);
    throw error;
  }
};

/**
 * Get all leads (Alternative endpoint - same as getAllLeads)
 */
export const getAllLeadsAlternative = async (params = {}) => {
  return getAllLeads(params);
};

/**
 * Get single lead details
 */
export const getLeadById = async (leadId) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/admin/leads/assignment/${leadId}`, {
      method: 'GET',
      headers,
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching lead details:', error);
    throw error;
  }
};

/**
 * Assign leads to employee (Admin)
 */
export const assignLeadsToEmployee = async (assignmentData) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/admin/leads/assign`, {
      method: 'POST',
      headers,
      body: JSON.stringify(assignmentData),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error assigning leads:', error);
    throw error;
  }
};

/**
 * Update lead assignment status
 */
export const updateLeadStatus = async (assignmentId, statusData) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/admin/leads/status/${assignmentId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(statusData),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error updating lead status:', error);
    throw error;
  }
};

/**
 * Unassign leads from employee
 */
export const unassignLeads = async (unassignData) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/admin/leads/unassign`, {
      method: 'POST',
      headers,
      body: JSON.stringify(unassignData),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error unassigning leads:', error);
    throw error;
  }
};

/**
 * Get available employees for assignment
 */
export const getAvailableEmployees = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/admin/leads/available-employees`, {
      method: 'GET',
      headers,
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching available employees:', error);
    throw error;
  }
};

/**
 * Get leads for specific employee
 */
export const getEmployeeLeads = async (employeeId, params = {}) => {
  try {
    const headers = await getAuthHeaders();
    const queryString = buildQueryString(params);
    const url = `${API_BASE_URL}/admin/leads/employee/${employeeId}${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching employee leads:', error);
    throw error;
  }
};

export default {
  getAllLeads,
  getAllLeadsAlternative,
  getLeadById,
  assignLeadsToEmployee,
  updateLeadStatus,
  unassignLeads,
  getAvailableEmployees,
  getEmployeeLeads,
};
