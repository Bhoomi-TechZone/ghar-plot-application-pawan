/**
 * CRM Assignment API
 * Handles all user assignment related API calls
 */
import { CRM_BASE_URL, getCRMAuthHeaders, handleCRMResponse, buildQueryString } from './crmAPI';

/**
 * Get All Assignments
 */
export const getAllAssignments = async (params = {}) => {
  try {
    const queryString = buildQueryString(params);
    const url = `${CRM_BASE_URL}/api/crm/assignments${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    throw error;
  }
};

/**
 * Assign User to Employee
 */
export const assignUserToEmployee = async (assignmentData) => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/crm/assignments/assign`, {
      method: 'POST',
      headers: await getCRMAuthHeaders(),
      body: JSON.stringify(assignmentData),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error assigning user:', error);
    throw error;
  }
};

/**
 * Assign User to Employee (Alternative endpoint)
 */
export const assignUserLeadToEmployee = async (assignmentData) => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/admin/user-leads/assign`, {
      method: 'POST',
      headers: await getCRMAuthHeaders(),
      body: JSON.stringify(assignmentData),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error assigning user lead:', error);
    throw error;
  }
};

/**
 * Unassign User from Employee
 */
export const unassignUserFromEmployee = async (assignmentData) => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/crm/assignments/unassign`, {
      method: 'POST',
      headers: await getCRMAuthHeaders(),
      body: JSON.stringify(assignmentData),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error unassigning user:', error);
    throw error;
  }
};

/**
 * Get Employees Capacity
 */
export const getEmployeesCapacity = async () => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/crm/employees/capacity`, {
      method: 'GET',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error fetching employees capacity:', error);
    throw error;
  }
};

/**
 * Get Available Employees
 */
export const getAvailableEmployees = async () => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/admin/user-leads/available-employees`, {
      method: 'GET',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error fetching available employees:', error);
    throw error;
  }
};

/**
 * Get Assignment Statistics
 */
export const getAssignmentStats = async () => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/crm/assignments/stats`, {
      method: 'GET',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error fetching assignment stats:', error);
    throw error;
  }
};

export default {
  getAllAssignments,
  assignUserToEmployee,
  assignUserLeadToEmployee,
  unassignUserFromEmployee,
  getEmployeesCapacity,
  getAvailableEmployees,
  getAssignmentStats,
};
