/**
 * Admin Sites Management API
 * Handles CRUD operations for clients, cashflows, projects, and employees
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../services/api';

// Helper function to get auth headers
const getAuthHeaders = async () => {
  try {
    const adminToken = await AsyncStorage.getItem('adminToken');
    const adminToken2 = await AsyncStorage.getItem('admin_token');
    const employeeToken = await AsyncStorage.getItem('employee_auth_token');
    const employeeToken2 = await AsyncStorage.getItem('employee_token');
    const employeeToken3 = await AsyncStorage.getItem('employeeToken');
    const authToken = await AsyncStorage.getItem('authToken');

    const token = adminToken || adminToken2 || employeeToken || employeeToken2 || employeeToken3 || authToken;

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

const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

/**
 * GET /admin/clients - Fetch all clients
 */
export const getClients = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/admin/clients`, {
      method: 'GET',
      headers,
    });
    const data = await handleResponse(response);
    return data.data || [];
  } catch (error) {
    console.error('Error fetching clients:', error);
    return [];
  }
};

/**
 * POST /admin/clients - Create a new client
 */
export const createClient = async (clientData) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/admin/clients`, {
      method: 'POST',
      headers,
      body: JSON.stringify(clientData),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error creating client:', error);
    throw error;
  }
};

/**
 * GET /admin/cashflows - Fetch all cashflows
 */
export const getCashFlows = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/admin/cashflows`, {
      method: 'GET',
      headers,
    });
    const data = await handleResponse(response);
    return data.data || [];
  } catch (error) {
    console.error('Error fetching cashflows:', error);
    return [];
  }
};

/**
 * POST /admin/cashflows - Create a new cashflow
 */
export const createCashFlow = async (cashFlowData) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/admin/cashflows`, {
      method: 'POST',
      headers,
      body: JSON.stringify(cashFlowData),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error creating cashflow:', error);
    throw error;
  }
};

/**
 * GET /admin/projects - Fetch all projects
 */
export const getProjects = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/admin/projects`, {
      method: 'GET',
      headers,
    });
    const data = await handleResponse(response);
    return data.data || [];
  } catch (error) {
    console.error('Error fetching projects:', error);
    return [];
  }
};

/**
 * POST /admin/projects - Create a new project
 */
export const createProject = async (projectData) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/admin/projects`, {
      method: 'POST',
      headers,
      body: JSON.stringify(projectData),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error creating project:', error);
    throw error;
  }
};

/**
 * GET /admin/employees - Fetch all employees (used for Business Associate dropdowns)
 */
export const getEmployees = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/admin/employees`, {
      method: 'GET',
      headers,
    });
    const data = await handleResponse(response);
    return data.data || [];
  } catch (error) {
    console.error('Error fetching employees:', error);
    return [];
  }
};

export default {
  getClients,
  createClient,
  getCashFlows,
  createCashFlow,
  getProjects,
  createProject,
  getEmployees,
};