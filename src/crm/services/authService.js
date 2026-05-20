import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';

const TOKEN_KEY = 'crm_auth_token';
const USER_KEY = 'crm_user_data';

class AuthService {
  // Admin Login
  async adminLogin(credentials) {
    try {
      const response = await api.post('/admin/login', credentials);
      
      if (response.data.success) {
        const { token, user } = response.data.data;
        await this.storeToken(token);
        await this.storeUser(user);
        return { success: true, user, token };
      } else {
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      console.error('Admin login error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed. Please try again.' 
      };
    }
  }

  // Employee Login
  async employeeLogin(credentials) {
    try {
      const response = await api.post('/employee/login', credentials);
      
      if (response.data.success) {
        const { token, user } = response.data.data;
        await this.storeToken(token);
        await this.storeUser(user);
        return { success: true, user, token };
      } else {
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      console.error('Employee login error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed. Please try again.' 
      };
    }
  }

  // Store token in AsyncStorage
  async storeToken(token) {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
      // Set authorization header for future requests
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } catch (error) {
      console.error('Error storing token:', error);
    }
  }

  // Store user data in AsyncStorage
  async storeUser(user) {
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
      // 🔥 Store user ID for FCM token sync
      if (user && user._id) {
        await AsyncStorage.setItem('userId', user._id);
        await AsyncStorage.setItem('employeeId', user._id);
        console.log('✅ User/Employee ID stored:', user._id);
        
        // 🔥 Sync FCM token to Employee model for notifications
        try {
          const { getFCMToken, sendTokenToBackend } = require('../../../utils/fcmService');
          const fcmToken = await getFCMToken();
          if (fcmToken) {
            await sendTokenToBackend(user._id, fcmToken);
            console.log('✅ FCM token synced to Employee model');
          }
        } catch (fcmError) {
          console.warn('⚠️ FCM sync failed:', fcmError.message);
        }
      }
    } catch (error) {
      console.error('Error storing user data:', error);
    }
  }

  // Get stored token
  async getToken() {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  // Get stored user data
  async getUser() {
    try {
      const userData = await AsyncStorage.getItem(USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

  // Check if user is authenticated
  async isAuthenticated() {
    try {
      const token = await this.getToken();
      const user = await this.getUser();
      
      if (token && user) {
        // Set authorization header
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        return { isAuthenticated: true, user, token };
      }
      
      return { isAuthenticated: false, user: null, token: null };
    } catch (error) {
      console.error('Error checking authentication:', error);
      return { isAuthenticated: false, user: null, token: null };
    }
  }

  // Logout
  async logout() {
    try {
      // Call logout API if needed
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Clear local storage
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
      delete api.defaults.headers.common['Authorization'];
    }
  }

  // Refresh token
  async refreshToken() {
    try {
      const response = await api.post('/auth/refresh-token');
      
      if (response.data.success) {
        const { token } = response.data.data;
        await this.storeToken(token);
        return { success: true, token };
      } else {
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Token refresh failed.' 
      };
    }
  }

  // Forgot password
  async forgotPassword(email) {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return {
        success: response.data.success,
        message: response.data.message
      };
    } catch (error) {
      console.error('Forgot password error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to send password reset email.'
      };
    }
  }

  // Reset password
  async resetPassword(token, password) {
    try {
      const response = await api.post('/auth/reset-password', {
        token,
        password
      });
      return {
        success: response.data.success,
        message: response.data.message
      };
    } catch (error) {
      console.error('Reset password error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to reset password.'
      };
    }
  }
}

export default new AuthService();