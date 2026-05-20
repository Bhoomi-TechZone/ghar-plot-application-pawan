/**
 * CRM Employee Management API
 * Handles all employee management related API calls
 */
import { CRM_BASE_URL, getCRMAuthHeaders, handleCRMResponse, buildQueryString } from './crmAPI';

/**
 * Get all employees with pagination and filters
 */
export const getAllEmployees = async (params = {}) => {
  try {
    const queryString = buildQueryString(params);
    const url = `${CRM_BASE_URL}/admin/employees${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error fetching employees:', error);
    throw error;
  }
};

/**
 * Get single employee details
 */
export const getEmployeeById = async (employeeId) => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/admin/employees/${employeeId}`, {
      method: 'GET',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
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
    const response = await fetch(`${CRM_BASE_URL}/admin/employees`, {
      method: 'POST',
      headers: await getCRMAuthHeaders(),
      body: JSON.stringify(employeeData),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error creating employee:', error);
    throw error;
  }
};

/**
 * Update employee details
 */
export const updateEmployee = async (employeeId, employeeData) => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/admin/employees/${employeeId}`, {
      method: 'PUT',
      headers: await getCRMAuthHeaders(),
      body: JSON.stringify(employeeData),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error updating employee:', error);
    throw error;
  }
};

/**
 * Delete employee
 */
export const deleteEmployee = async (employeeId) => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/admin/employees/${employeeId}`, {
      method: 'DELETE',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error deleting employee:', error);
    throw error;
  }
};

/**
 * Activate employee
 */
export const activateEmployee = async (employeeId) => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/admin/employees/${employeeId}`, {
      method: 'PUT',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error activating employee:', error);
    throw error;
  }
};

/**
 * Deactivate employee
 */
export const deactivateEmployee = async (employeeId) => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/admin/employees/${employeeId}`, {
      method: 'PUT',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error deactivating employee:', error);
    throw error;
  }
};

/**
 * Get employee statistics
 */
export const getEmployeeStats = async () => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/admin/employees/dashboard-stats`, {
      method: 'GET',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error fetching employee stats:', error);
    throw error;
  }
};

/**
 * Get employee performance
 */
export const getEmployeePerformance = async (employeeId, params = {}) => {
  try {
    const queryString = buildQueryString(params);
    const url = `${CRM_BASE_URL}/api/crm/employees/${employeeId}/performance${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error fetching employee performance:', error);
    throw error;
  }
};

/**
 * Update employee status
 */
export const updateEmployeeStatus = async (employeeId, statusData) => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/crm/employees/${employeeId}/status`, {
      method: 'POST',
      headers: await getCRMAuthHeaders(),
      body: JSON.stringify(statusData),
    });
    
    return await handleCRMResponse(response);
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
  activateEmployee,
  deactivateEmployee,
  updateEmployeeStatus,
  getEmployeeStats,
  getEmployeePerformance,
};
