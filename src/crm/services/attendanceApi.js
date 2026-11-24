import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../services/api';

const getAuthHeaders = async () => {
  try {
    const adminToken = await AsyncStorage.getItem('adminToken');
    const adminToken2 = await AsyncStorage.getItem('admin_token');
    const employeeToken = await AsyncStorage.getItem('employee_token');
    const employeeAuthToken = await AsyncStorage.getItem('employee_auth_token');
    const crmToken = await AsyncStorage.getItem('crm_auth_token');
    const authToken = await AsyncStorage.getItem('authToken');

    const token = employeeAuthToken || employeeToken || adminToken || adminToken2 || crmToken || authToken;

    return {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    };
  } catch (error) {
    console.error('Error getting auth headers:', error);
    return { 'Content-Type': 'application/json' };
  }
};

const handleResponse = async (response) => {
  if (!response || !response.ok) {
    const errorData = response ? await response.json().catch(() => ({})) : {};
    throw new Error(errorData.message || (response ? `HTTP error! status: ${response.status}` : 'Request failed'));
  }
  return response.json();
};

// ==========================================
// EMPLOYEE APIS
// ==========================================

export const checkIn = async (data = {}) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/employee/attendance/check-in`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Attendance check-in error:', error);
    throw error;
  }
};

export const checkOut = async (data = {}) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/employee/attendance/check-out`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Attendance check-out error:', error);
    throw error;
  }
};

export const getTodayAttendance = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/employee/attendance/today`, {
      method: 'GET',
      headers,
    });
    const result = await handleResponse(response);
    return result.data || null;
  } catch (error) {
    console.error('Get today attendance error:', error);
    return null;
  }
};

export const getEmployeeMonthlyAttendance = async (month, year, employeeId) => {
  try {
    const headers = await getAuthHeaders();
    const endpoint = employeeId
      ? `${BASE_URL}/employee/attendance/employee/${employeeId}/monthly?month=${month}&year=${year}`
      : `${BASE_URL}/employee/attendance/my-monthly?month=${month}&year=${year}`;
    const response = await fetch(endpoint, {
      method: 'GET',
      headers,
    });
    const result = await handleResponse(response);
    return result.data || null;
  } catch (error) {
    console.error('Get monthly attendance error:', error);
    throw error;
  }
};

// ==========================================
// ADMIN APIS
// ==========================================

export const getAdminMonthlyMatrix = async ({ month, year, department, search } = {}) => {
  try {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (year) params.append('year', year);
    if (department) params.append('department', department);
    if (search) params.append('search', search);

    const response = await fetch(`${BASE_URL}/admin/attendance/monthly-matrix?${params.toString()}`, {
      method: 'GET',
      headers,
    });
    const result = await handleResponse(response);
    return result.data || null;
  } catch (error) {
    console.error('Get admin monthly matrix error:', error);
    throw error;
  }
};

export const regularizeAttendance = async (data) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/admin/attendance/regularize`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Regularize attendance error:', error);
    throw error;
  }
};

export const getShifts = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/admin/attendance/shifts`, {
      method: 'GET',
      headers,
    });
    const result = await handleResponse(response);
    return result.data || [];
  } catch (error) {
    console.error('Get shifts error:', error);
    return [];
  }
};

export const createShift = async (shiftData) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/admin/attendance/shifts`, {
      method: 'POST',
      headers,
      body: JSON.stringify(shiftData),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Create shift error:', error);
    throw error;
  }
};

export const updateShift = async (id, shiftData) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/admin/attendance/shifts/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(shiftData),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Update shift error:', error);
    throw error;
  }
};

export const assignShiftToEmployee = async (employeeId, shiftId, customShift) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/admin/attendance/assign-shift`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ employeeId, shiftId, customShift }),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Assign shift error:', error);
    throw error;
  }
};

export default {
  checkIn,
  checkOut,
  getTodayAttendance,
  getEmployeeMonthlyAttendance,
  getAdminMonthlyMatrix,
  regularizeAttendance,
  getShifts,
  createShift,
  updateShift,
  assignShiftToEmployee,
};
