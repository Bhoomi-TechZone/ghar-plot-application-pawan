/**
 * Employee API Service
 * Handles all employee-related API calls including follow-ups, reminders, leads
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://ghar-plot-backend1.onrender.com';

// Get auth token with fallback options
const getToken = async () => {
  let token = await AsyncStorage.getItem('employee_auth_token');
  if (!token) token = await AsyncStorage.getItem('employee_token');
  if (!token) token = await AsyncStorage.getItem('employeeToken');
  if (!token) token = await AsyncStorage.getItem('crm_auth_token');
  if (!token) token = await AsyncStorage.getItem('authToken');

  console.log('🔑 Employee API Token:', token ? 'Found' : 'Not found');
  return token;
};

// Base GET request helper
const get = async (endpoint, params = {}) => {
  const token = await getToken();

  // Build query string
  const queryString = Object.keys(params).length > 0
    ? '?' + new URLSearchParams(params).toString()
    : '';
  const url = `${API_BASE_URL}${endpoint}${queryString}`;

  console.log('📡 GET Request:', url);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();
  console.log('📥 GET Response:', JSON.stringify(data, null, 2).substring(0, 500));
  return data;
};

// Base POST request helper
const post = async (endpoint, body) => {
  const token = await getToken();
  const url = `${API_BASE_URL}${endpoint}`;

  console.log('📡 POST Request:', url);
  console.log('📤 POST Body:', JSON.stringify(body, null, 2));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  console.log('📥 POST Response:', JSON.stringify(data, null, 2).substring(0, 500));
  return data;
};

// Base PUT request helper
const put = async (endpoint, body) => {
  const token = await getToken();
  const url = `${API_BASE_URL}${endpoint}`;

  console.log('📡 PUT Request:', url);
  console.log('📤 PUT Body:', JSON.stringify(body, null, 2));

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  console.log('📥 PUT Response:', JSON.stringify(data, null, 2).substring(0, 500));
  return data;
};

// Base DELETE request helper
const del = async (endpoint) => {
  const token = await getToken();
  const url = `${API_BASE_URL}${endpoint}`;

  console.log('📡 DELETE Request:', url);

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();
  console.log('📥 DELETE Response:', JSON.stringify(data, null, 2));
  return data;
};

// ============================================
// FOLLOW-UP MANAGEMENT APIS
// ============================================

/**
 * Create new follow-up
 * @param {Object} followUpData - { leadType, leadId, comment, priority, nextFollowUpDate }
 */
export const createFollowUp = async (followUpData) => {
  return await post('/api/follow-ups/create', followUpData);
};

/**
 * Create follow-up from lead
 * @param {Object} followUpData - { leadType, leadId, comment, priority, nextFollowUpDate }
 */
export const createFollowUpFromLead = async (followUpData) => {
  return await post('/employee/follow-ups/create-from-lead', followUpData);
};

/**
 * Get my follow-ups (employee view)
 * @param {Object} params - { limit, caseStatus }
 */
export const getMyFollowUps = async (params = {}) => {
  return await get('/api/follow-ups/my-followups', params);
};

/**
 * Get existing follow-ups for a lead
 * @param {string} leadType - 'enquiry' or 'client'
 * @param {string} leadId - The lead/assignment ID
 */
export const getLeadFollowUps = async (leadType, leadId) => {
  return await get(`/api/follow-ups/lead/${leadType}/${leadId}`);
};

/**
 * Update follow-up status
 * @param {string} followUpId - Follow-up ID
 * @param {Object} statusData - { caseStatus, result, wordCount }
 */
export const updateFollowUpStatus = async (followUpId, statusData) => {
  return await put(`/api/follow-ups/${followUpId}/status`, statusData);
};

/**
 * Add comment to follow-up
 * @param {string} followUpId - Follow-up ID
 * @param {Object} commentData - { comment, nextFollowUpDate }
 */
export const addFollowUpComment = async (followUpId, commentData) => {
  return await post(`/api/follow-ups/${followUpId}/comment`, commentData);
};

/**
 * Update follow-up (legacy)
 * @param {string} followUpId - Follow-up ID
 * @param {Object} updates - { comment, priority, nextFollowUpDate }
 */
export const updateFollowUp = async (followUpId, updates) => {
  return await put(`/api/follow-ups/${followUpId}`, updates);
};

/**
 * Delete follow-up
 * @param {string} followUpId - Follow-up ID
 */
export const deleteFollowUp = async (followUpId) => {
  return await del(`/api/follow-ups/${followUpId}`);
};

// ============================================
// REMINDER MANAGEMENT APIS
// ============================================

/**
 * Get my reminders
 * @param {Object} params - { limit, status }
 */
export const getMyReminders = async (params = {}) => {
  return await get('/employee/reminders/my-reminders', params);
};

/**
 * Create reminder
 * @param {Object} reminderData - { title, message, reminderTime, priority }
 */
export const createReminder = async (reminderData) => {
  return await post('/employee/reminders/create', reminderData);
};

/**
 * Update reminder status
 * @param {string} reminderId - Reminder ID
 * @param {Object} statusData - { status }
 */
export const updateReminderStatus = async (reminderId, statusData) => {
  return await put(`/employee/reminders/${reminderId}/status`, statusData);
};

/**
 * Delete reminder
 * @param {string} reminderId - Reminder ID
 */
export const deleteReminder = async (reminderId) => {
  return await del(`/employee/reminders/${reminderId}`);
};

// ============================================
// LEADS MANAGEMENT APIS
// ============================================

/**
 * Get my enquiry leads
 * GET /employee/leads/my-leads
 * @param {Object} params - { limit, status }
 */
export const getMyLeads = async (params = {}) => {
  return await get('/employee/leads/my-leads', params);
};

/**
 * Get my client leads
 * GET /employee/user-leads/my-client-leads
 * @param {Object} params - { limit, status }
 */
export const getMyClientLeads = async (params = {}) => {
  return await get('/employee/user-leads/my-client-leads', params);
};

/**
 * Get all assigned leads (generic)
 * GET /employee/leads
 * @param {Object} params - { page, limit, status }
 */
export const getAllLeads = async (params = {}) => {
  return await get('/employee/leads', params);
};

/**
 * Get single lead assignment details
 * GET /employee/leads/:assignmentId
 * @param {string} assignmentId - Assignment ID
 */
export const getSingleLeadAssignment = async (assignmentId) => {
  return await get(`/employee/leads/${assignmentId}`);
};

/**
 * Get lead details (alias)
 * @param {string} leadId - Lead ID
 */
export const getLeadDetails = async (leadId) => {
  return await get(`/employee/leads/${leadId}`);
};

/**
 * Update enquiry lead status
 * PUT /employee/leads/status/:assignmentId
 * @param {string} assignmentId - Assignment ID
 * @param {Object} updates - { status }
 */
export const updateLeadStatus = async (assignmentId, updates) => {
  return await put(`/employee/leads/status/${assignmentId}`, updates);
};

/**
 * Update client/user lead status
 * PUT /employee/user-leads/status/:assignmentId
 * @param {string} assignmentId - Assignment ID
 * @param {Object} updates - { status, notes }
 */
export const updateUserLeadStatus = async (assignmentId, updates) => {
  return await put(`/employee/user-leads/status/${assignmentId}`, updates);
};

/**
 * Get assigned user leads
 * GET /employee/user-leads
 * @param {Object} params - { limit, status }
 */
export const getAssignedUserLeads = async (params = {}) => {
  return await get('/employee/user-leads', params);
};

/**
 * Update user lead (generic)
 * PUT /employee/user-leads/:assignmentId
 * @param {string} assignmentId - Assignment ID
 * @param {Object} updates - { status, notes }
 */
export const updateUserLead = async (assignmentId, updates) => {
  return await put(`/employee/user-leads/${assignmentId}`, updates);
};

// Export default object with all functions
export default {
  // Follow-ups
  createFollowUp,
  createFollowUpFromLead,
  getMyFollowUps,
  getLeadFollowUps,
  updateFollowUpStatus,
  addFollowUpComment,
  updateFollowUp,
  deleteFollowUp,
  // Reminders
  getMyReminders,
  createReminder,
  updateReminderStatus,
  deleteReminder,
  // Leads
  getMyLeads,
  getMyClientLeads,
  getAllLeads,
  getSingleLeadAssignment,
  getLeadDetails,
  updateLeadStatus,
  updateUserLeadStatus,
  getAssignedUserLeads,
  updateUserLead,
};
