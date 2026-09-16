import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Base URL for CRM API
const BASE_URL = 'https://gharplotbackend.gntechnology.de/api/crm';

// Create axios instance
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('crm_auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token for request:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 unauthorized errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token
        const refreshResponse = await apiClient.post('/auth/refresh-token');
        const newToken = refreshResponse.data.data.token;

        // Store new token
        await AsyncStorage.setItem('crm_auth_token', newToken);

        // Update authorization header and retry request
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        await AsyncStorage.removeItem('crm_auth_token');
        await AsyncStorage.removeItem('crm_user_data');
        // You can dispatch a logout action here if using Redux
        console.error('Token refresh failed:', refreshError);
        return Promise.reject(refreshError);
      }
    }

    // Handle network errors
    if (!error.response) {
      error.message = 'Network error. Please check your internet connection.';
    }

    return Promise.reject(error);
  }
);

class ApiClient {
  // User Management APIs
  async getUsers(params = {}) {
    try {
      const response = await apiClient.get('/users', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createUser(userData) {
    try {
      const response = await apiClient.post('/users', userData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateUser(userId, userData) {
    try {
      const response = await apiClient.put(`/users/${userId}`, userData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteUser(userId) {
    try {
      const response = await apiClient.delete(`/users/${userId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Employee Management APIs
  async getEmployees(params = {}) {
    try {
      const response = await apiClient.get('/employees', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createEmployee(employeeData) {
    try {
      const response = await apiClient.post('/employees', employeeData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateEmployee(employeeId, employeeData) {
    try {
      const response = await apiClient.put(`/employees/${employeeId}`, employeeData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteEmployee(employeeId) {
    try {
      const response = await apiClient.delete(`/employees/${employeeId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Property Management APIs
  async getProperties(params = {}) {
    try {
      const response = await apiClient.get('/properties', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createProperty(propertyData) {
    try {
      const response = await apiClient.post('/properties', propertyData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateProperty(propertyId, propertyData) {
    try {
      const response = await apiClient.put(`/properties/${propertyId}`, propertyData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteProperty(propertyId) {
    try {
      const response = await apiClient.delete(`/properties/${propertyId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Leads Management APIs
  async getLeads(params = {}) {
    try {
      const response = await apiClient.get('/leads', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createLead(leadData) {
    try {
      const response = await apiClient.post('/leads', leadData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateLead(leadId, leadData) {
    try {
      const response = await apiClient.put(`/leads/${leadId}`, leadData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteLead(leadId) {
    try {
      const response = await apiClient.delete(`/leads/${leadId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Reminders APIs
  async getReminders(params = {}) {
    try {
      const response = await apiClient.get('/reminders', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createReminder(reminderData) {
    try {
      const response = await apiClient.post('/reminders', reminderData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateReminder(reminderId, reminderData) {
    try {
      const response = await apiClient.put(`/reminders/${reminderId}`, reminderData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteReminder(reminderId) {
    try {
      const response = await apiClient.delete(`/reminders/${reminderId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Dashboard APIs
  async getAdminDashboardData() {
    try {
      const response = await apiClient.get('/dashboard/admin');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getEmployeeDashboardData() {
    try {
      const response = await apiClient.get('/dashboard/employee');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Alerts APIs
  async getAlerts(params = {}) {
    try {
      const response = await apiClient.get('/alerts', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async markAlertAsRead(alertId) {
    try {
      const response = await apiClient.put(`/alerts/${alertId}/read`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Follow-ups APIs
  async getFollowUps(params = {}) {
    try {
      const response = await apiClient.get('/follow-ups', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createFollowUp(followUpData) {
    try {
      const response = await apiClient.post('/follow-ups', followUpData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateFollowUp(followUpId, followUpData) {
    try {
      const response = await apiClient.put(`/follow-ups/${followUpId}`, followUpData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteFollowUp(followUpId) {
    try {
      const response = await apiClient.delete(`/follow-ups/${followUpId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Generic API methods
  async get(endpoint, params = {}) {
    try {
      const response = await apiClient.get(endpoint, { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async post(endpoint, data = {}) {
    try {
      const response = await apiClient.post(endpoint, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async put(endpoint, data = {}) {
    try {
      const response = await apiClient.put(endpoint, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async delete(endpoint) {
    try {
      const response = await apiClient.delete(endpoint);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Error handler
  handleError(error) {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.message || 'Server error occurred';
      return new Error(message);
    } else if (error.request) {
      // Network error
      return new Error('Network error. Please check your internet connection.');
    } else {
      // Something else happened
      return new Error(error.message || 'An unexpected error occurred');
    }
  }
}

export default new ApiClient();
