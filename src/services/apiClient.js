import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://gharplotbackend.gntechnology.de';

class ApiClient {
  constructor() {
    this.baseURL = BASE_URL;
    this.timeout = 10000;
  }

  /**
   * Get authentication token from AsyncStorage
   * Checks multiple token keys for compatibility
   */
  async getAuthToken() {
    try {
      const crmToken = await AsyncStorage.getItem('crm_auth_token');
      const adminToken = await AsyncStorage.getItem('adminToken');
      const adminTokenAlt = await AsyncStorage.getItem('admin_token');
      const crmAdminToken = await AsyncStorage.getItem('crm_admin_token');
      const employeeToken = await AsyncStorage.getItem('employee_auth_token');
      const authToken = await AsyncStorage.getItem('authToken');

      return crmToken || adminToken || adminTokenAlt || crmAdminToken || employeeToken || authToken;
    } catch (error) {
      console.warn('Failed to get auth token:', error);
      return null;
    }
  }

  /**
   * Build headers for requests
   */
  async buildHeaders(customHeaders = {}) {
    const token = await this.getAuthToken();

    const headers = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Handle API response - Safely parse JSON and detect HTML responses
   */
  async handleResponse(response) {
    try {
      // Get response as text first
      const textResponse = await response.text();

      // Check if response is HTML (error page)
      if (textResponse.trim().startsWith('<')) {
        console.error('❌ Received HTML instead of JSON');

        if (response.status === 401 || response.status === 403) {
          // Clear all auth tokens
          await AsyncStorage.multiRemove([
            'crm_auth_token',
            'adminToken',
            'employee_auth_token',
            'authToken',
            'userProfile'
          ]);
          throw new Error('Session expired. Please login again.');
        } else if (response.status === 404) {
          throw new Error('API endpoint not found. Backend may not be ready.');
        } else {
          throw new Error('Invalid response from server. Please try again.');
        }
      }

      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(textResponse);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        throw new Error('Invalid server response format.');
      }

      // Check HTTP status
      if (!response.ok) {
        // Handle 401 Unauthorized
        if (response.status === 401) {
          await AsyncStorage.multiRemove([
            'crm_auth_token',
            'adminToken',
            'employee_auth_token',
            'authToken',
            'userProfile'
          ]);
          throw new Error('Session expired. Please login again.');
        }

        throw new Error(data.message || data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      // Re-throw with better error message
      if (error.message) {
        throw error;
      }
      throw new Error('Network request failed. Please check your connection.');
    }
  }

  /**
   * Make fetch request with timeout
   */
  async fetchWithTimeout(url, options) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  // GET request
  async get(endpoint, config = {}) {
    try {
      const headers = await this.buildHeaders(config.headers);
      const url = `${this.baseURL}${endpoint}`;

      const response = await this.fetchWithTimeout(url, {
        method: 'GET',
        headers,
      });

      return await this.handleResponse(response);
    } catch (error) {
      throw error;
    }
  }

  // POST request
  async post(endpoint, data = {}, config = {}) {
    try {
      const headers = await this.buildHeaders(config.headers);
      const url = `${this.baseURL}${endpoint}`;

      const response = await this.fetchWithTimeout(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });

      return await this.handleResponse(response);
    } catch (error) {
      throw error;
    }
  }

  // PUT request
  async put(endpoint, data = {}, config = {}) {
    try {
      const headers = await this.buildHeaders(config.headers);
      const url = `${this.baseURL}${endpoint}`;

      const response = await this.fetchWithTimeout(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
      });

      return await this.handleResponse(response);
    } catch (error) {
      throw error;
    }
  }

  // DELETE request
  async delete(endpoint, config = {}) {
    try {
      const headers = await this.buildHeaders(config.headers);
      const url = `${this.baseURL}${endpoint}`;

      const response = await this.fetchWithTimeout(url, {
        method: 'DELETE',
        headers,
      });

      return await this.handleResponse(response);
    } catch (error) {
      throw error;
    }
  }
}

// Export a singleton instance
export default new ApiClient();
