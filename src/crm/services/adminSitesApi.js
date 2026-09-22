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

const fetchWithTimeout = async (url, options = {}, timeout = 30000) => {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Network timeout (${timeout}ms)`)), timeout)
  );
  return Promise.race([
    fetch(url, options),
    timeoutPromise,
  ]);
};

const handleResponse = async (response) => {
  if (!response || !response.ok) {
    const errorData = response ? await response.json().catch(() => ({})) : {};
    throw new Error(errorData.message || (response ? 'HTTP error! status: ' + response.status : 'Request failed'));
  }
  return response.json();
};

/**
 * GET /admin/clients - Fetch all clients
 */
export const getClients = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetchWithTimeout(`${BASE_URL}/admin/clients`, {
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
    const response = await fetchWithTimeout(`${BASE_URL}/admin/clients`, {
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
    const response = await fetchWithTimeout(`${BASE_URL}/admin/cashflows`, {
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
    const response = await fetchWithTimeout(`${BASE_URL}/admin/cashflows`, {
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
    const response = await fetchWithTimeout(`${BASE_URL}/admin/projects`, {
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
    const response = await fetchWithTimeout(`${BASE_URL}/admin/projects`, {
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
 * PUT /admin/projects/:id - Update a project
 */
export const updateProject = async (id, projectData) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetchWithTimeout(`${BASE_URL}/admin/projects/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(projectData),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error updating project:', error);
    throw error;
  }
};

/**
 * DELETE /admin/projects/:id - Delete a project
 */
export const deleteProject = async (id) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetchWithTimeout(`${BASE_URL}/admin/projects/${id}`, {
      method: 'DELETE',
      headers,
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error deleting project:', error);
    throw error;
  }
};

/**
 * GET /admin/cashflows/opening-balance/:associateId?date=YYYY-MM-DD
 */
export const getPreviousClosingBalance = async (associateId, date) => {
  try {
    const headers = await getAuthHeaders();
    const query = date ? `?date=${encodeURIComponent(date)}` : '';
    const response = await fetchWithTimeout(`${BASE_URL}/admin/cashflows/opening-balance/${associateId}${query}`, {
      method: 'GET',
      headers,
    });
    const data = await handleResponse(response);
    return data.openingBalance || 0;
  } catch (error) {
    console.error('Error fetching opening balance:', error);
    return 0;
  }
};

/**
 * PUT /admin/cashflows/:id - Update a cash flow
 */
export const updateCashFlow = async (id, cashFlowData) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetchWithTimeout(`${BASE_URL}/admin/cashflows/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(cashFlowData),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error updating cash flow:', error);
    throw error;
  }
};

/**
 * DELETE /admin/cashflows/:id - Delete a cash flow
 */
export const deleteCashFlow = async (id) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetchWithTimeout(`${BASE_URL}/admin/cashflows/${id}`, {
      method: 'DELETE',
      headers,
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error deleting cash flow:', error);
    throw error;
  }
};

/**
 * GET /admin/expenses - Fetch expenses with filters
 */
export const getExpenses = async (params = {}) => {
  try {
    const headers = await getAuthHeaders();
    const query = new URLSearchParams(params).toString();
    const url = query ? `${BASE_URL}/admin/expenses?${query}` : `${BASE_URL}/admin/expenses`;
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers,
    });
    const data = await handleResponse(response);
    return data.data || [];
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return [];
  }
};

/**
 * POST /admin/expenses - Create new expense
 */
export const createExpense = async (expenseData) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetchWithTimeout(`${BASE_URL}/admin/expenses`, {
      method: 'POST',
      headers,
      body: JSON.stringify(expenseData),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error creating expense:', error);
    throw error;
  }
};

/**
 * PUT /admin/expenses/:id - Update expense
 */
export const updateExpense = async (id, expenseData) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetchWithTimeout(`${BASE_URL}/admin/expenses/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(expenseData),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error updating expense:', error);
    throw error;
  }
};

/**
 * DELETE /admin/expenses/:id - Delete expense
 */
export const deleteExpense = async (id) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetchWithTimeout(`${BASE_URL}/admin/expenses/${id}`, {
      method: 'DELETE',
      headers,
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error deleting expense:', error);
    throw error;
  }
};

/**
 * GET /admin/expenses/categories - Fetch categories
 */
export const getExpenseCategories = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetchWithTimeout(`${BASE_URL}/admin/expenses/categories`, {
      method: 'GET',
      headers,
    });
    const data = await handleResponse(response);
    return data.data || [];
  } catch (error) {
    console.error('Error fetching expense categories:', error);
    return [
      'Keele',
      'Eat',
      'Sariya',
      'Kulhadi',
      'Fabda',
      'Materials',
      'Labor',
      'Equipment',
      'Utility',
      'Others',
    ];
  }
};

/**
 * POST /admin/expenses/categories - Add new custom category
 */
export const addExpenseCategory = async (name) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetchWithTimeout(`${BASE_URL}/admin/expenses/categories`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name }),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error adding category:', error);
    throw error;
  }
};

/**
 * GET /admin/expenses/date-summary?businessAssociate=...&date=...
 */
export const getDateExpensesSummary = async (businessAssociate, date) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetchWithTimeout(
      `${BASE_URL}/admin/expenses/date-summary?businessAssociate=${businessAssociate}&date=${encodeURIComponent(date)}`,
      {
        method: 'GET',
        headers,
      }
    );
    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching date expenses summary:', error);
    return { data: [], totalExpenseAmount: 0 };
  }
};

/**
 * GET /admin/expenses/daily-sheet?date=...&businessAssociate=...&project=...
 * Single sheet view grouped by Project
 */
export const getDailyProjectExpenseSheet = async (params = {}) => {
  try {
    const headers = await getAuthHeaders();
    const query = new URLSearchParams(params).toString();
    const url = query
      ? `${BASE_URL}/admin/expenses/daily-sheet?${query}`
      : `${BASE_URL}/admin/expenses/daily-sheet`;
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers,
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching daily project expense sheet:', error);
    return { success: false, data: [], totalDayExpense: 0, totalProjectsCount: 0, totalExpensesCount: 0 };
  }
};

/**
 * POST /admin/expenses/batch - Batch create multiple expenses
 */
export const createBatchExpenses = async (expenses) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetchWithTimeout(`${BASE_URL}/admin/expenses/batch`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ expenses }),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error creating batch expenses:', error);
    throw error;
  }
};

/**
 * GET /admin/employees - Fetch all employees (used for Business Associate dropdowns)
 */
export const getEmployees = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetchWithTimeout(`${BASE_URL}/admin/employees`, {
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

/**
 * GET /admin/work-status - Fetch work statuses with filters
 */
export const getWorkStatuses = async (params = {}) => {
  try {
    const headers = await getAuthHeaders();
    const query = new URLSearchParams(params).toString();
    const url = query ? `${BASE_URL}/admin/work-status?${query}` : `${BASE_URL}/admin/work-status`;
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers,
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching work statuses:', error);
    return { success: false, data: [], total: 0 };
  }
};

/**
 * POST /admin/work-status - Create or Upsert work status
 */
export const createWorkStatus = async (statusData) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetchWithTimeout(`${BASE_URL}/admin/work-status`, {
      method: 'POST',
      headers,
      body: JSON.stringify(statusData),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error creating work status:', error);
    throw error;
  }
};

/**
 * PUT /admin/work-status/:id - Update work status
 */
export const updateWorkStatus = async (id, statusData) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetchWithTimeout(`${BASE_URL}/admin/work-status/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(statusData),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error updating work status:', error);
    throw error;
  }
};

/**
 * DELETE /admin/work-status/:id - Delete work status
 */
export const deleteWorkStatus = async (id) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetchWithTimeout(`${BASE_URL}/admin/work-status/${id}`, {
      method: 'DELETE',
      headers,
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error deleting work status:', error);
    throw error;
  }
};

/**
 * POST /admin/export/generate - Generate downloadable file link
 */
export const generateExportFile = async (filename, headersList, rowsList) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetchWithTimeout(
      `${BASE_URL}/admin/export/generate`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ filename, headers: headersList, rows: rowsList }),
      },
      60000 // 60s timeout for large export payloads
    );
    return await handleResponse(response);
  } catch (error) {
    console.error('Error generating export file:', error);
    throw error;
  }
};

/**
 * Get direct download URL for entity export
 */
export const getDirectExportUrl = (type, params = {}) => {
  const query = new URLSearchParams({ type, ...params }).toString();
  return `${BASE_URL}/admin/export/csv?${query}`;
};

export { BASE_URL };


export default {
  getClients,
  createClient,
  getCashFlows,
  createCashFlow,
  updateCashFlow,
  deleteCashFlow,
  getPreviousClosingBalance,
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  getExpenses,
  createExpense,
  createBatchExpenses,
  updateExpense,
  deleteExpense,
  getExpenseCategories,
  addExpenseCategory,
  getDateExpensesSummary,
  getDailyProjectExpenseSheet,
  getEmployees,
  getWorkStatuses,
  createWorkStatus,
  updateWorkStatus,
  deleteWorkStatus,
  generateExportFile,
  getDirectExportUrl,
};