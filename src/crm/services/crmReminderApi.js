/**
 * CRM Reminder Management API
 * Handles all reminder management related API calls
 */
import { CRM_BASE_URL, getCRMAuthHeaders, handleCRMResponse, buildQueryString } from './crmAPI';

/**
 * Get all reminders (Admin View)
 */
export const getAllReminders = async (params = {}) => {
  try {
    const queryString = buildQueryString(params);
    const url = `${CRM_BASE_URL}/api/crm/admin/reminders${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error fetching reminders:', error);
    throw error;
  }
};

/**
 * Get reminder statistics
 */
export const getReminderStats = async () => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/reminder/stats`, {
      method: 'GET',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error fetching reminder stats:', error);
    throw error;
  }
};

/**
 * Create reminder
 */
export const createReminder = async (reminderData) => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/crm/reminders`, {
      method: 'POST',
      headers: await getCRMAuthHeaders(),
      body: JSON.stringify(reminderData),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error creating reminder:', error);
    throw error;
  }
};

/**
 * Create bulk reminders
 */
export const createBulkReminders = async (remindersData) => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/crm/admin/reminders/bulk`, {
      method: 'POST',
      headers: await getCRMAuthHeaders(),
      body: JSON.stringify(remindersData),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error creating bulk reminders:', error);
    throw error;
  }
};

/**
 * Update reminder
 */
export const updateReminder = async (reminderId, reminderData) => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/crm/reminders/${reminderId}`, {
      method: 'PUT',
      headers: await getCRMAuthHeaders(),
      body: JSON.stringify(reminderData),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error updating reminder:', error);
    throw error;
  }
};

/**
 * Reassign reminder
 */
export const reassignReminder = async (reminderId, reassignData) => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/crm/admin/reminders/${reminderId}/reassign`, {
      method: 'PUT',
      headers: await getCRMAuthHeaders(),
      body: JSON.stringify(reassignData),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error reassigning reminder:', error);
    throw error;
  }
};

/**
 * Delete reminder
 */
export const deleteReminder = async (reminderId) => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/crm/reminders/${reminderId}`, {
      method: 'DELETE',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error deleting reminder:', error);
    throw error;
  }
};

/**
 * Delete bulk reminders
 */
export const deleteBulkReminders = async (reminderIds) => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/crm/admin/reminders/bulk`, {
      method: 'DELETE',
      headers: await getCRMAuthHeaders(),
      body: JSON.stringify({ reminderIds }),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error deleting bulk reminders:', error);
    throw error;
  }
};

/**
 * Get reminder analytics
 */
export const getReminderAnalytics = async () => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/crm/admin/reminders/analytics`, {
      method: 'GET',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error fetching reminder analytics:', error);
    throw error;
  }
};

/**
 * Create reminder template
 */
export const createReminderTemplate = async (templateData) => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/crm/admin/reminders/template`, {
      method: 'POST',
      headers: await getCRMAuthHeaders(),
      body: JSON.stringify(templateData),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error creating reminder template:', error);
    throw error;
  }
};

/**
 * Monitor all reminders
 */
export const monitorAllReminders = async () => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/crm/admin/reminders/monitor`, {
      method: 'GET',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error monitoring reminders:', error);
    throw error;
  }
};

/**
 * Get reminder compliance stats
 */
export const getReminderComplianceStats = async () => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/crm/admin/reminders/compliance`, {
      method: 'GET',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error fetching compliance stats:', error);
    throw error;
  }
};

/**
 * Get per-employee reminder stats
 */
export const getPerEmployeeReminderStats = async () => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/crm/admin/employees/reminder-stats`, {
      method: 'GET',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error fetching employee reminder stats:', error);
    throw error;
  }
};

/**
 * Get overdue reminders
 */
export const getOverdueReminders = async () => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/crm/admin/reminders/overdue`, {
      method: 'GET',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error fetching overdue reminders:', error);
    throw error;
  }
};

/**
 * Get reminder trends
 */
export const getReminderTrends = async (params = {}) => {
  try {
    const queryString = buildQueryString(params);
    const url = `${CRM_BASE_URL}/api/crm/admin/reminders/trends${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error fetching reminder trends:', error);
    throw error;
  }
};

/**
 * Toggle employee reminder popup
 */
export const toggleEmployeeReminderPopup = async (employeeId, popupData) => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/admin/reminders/employee/${employeeId}/toggle-popup`, {
      method: 'POST',
      headers: await getCRMAuthHeaders(),
      body: JSON.stringify(popupData),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error toggling reminder popup:', error);
    throw error;
  }
};

/**
 * Get employees reminder status
 */
export const getEmployeesReminderStatus = async () => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/admin/reminders/employees-status`, {
      method: 'GET',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error fetching employees reminder status:', error);
    throw error;
  }
};

/**
 * Get all due reminders
 */
export const getAllDueReminders = async () => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/admin/reminders/due-all`, {
      method: 'GET',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error fetching due reminders:', error);
    throw error;
  }
};

export default {
  getAllReminders,
  getReminderStats,
  createReminder,
  createBulkReminders,
  updateReminder,
  reassignReminder,
  deleteReminder,
  deleteBulkReminders,
  getReminderAnalytics,
  createReminderTemplate,
  monitorAllReminders,
  getReminderComplianceStats,
  getPerEmployeeReminderStats,
  getOverdueReminders,
  getReminderTrends,
  toggleEmployeeReminderPopup,
  getEmployeesReminderStatus,
  getAllDueReminders,
};
