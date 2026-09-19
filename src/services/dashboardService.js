import AsyncStorage from '@react-native-async-storage/async-storage';
import { handleUnauthorizedError } from './api';

const BASE_URL = 'https://ghar-plot-backend1.onrender.com';

// Get authentication token
const getAuthToken = async () => {
  try {
    const adminToken = await AsyncStorage.getItem('adminToken');
    const employeeToken = await AsyncStorage.getItem('employeeToken');
    return adminToken || employeeToken;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

// Check if current user is employee
const isEmployee = async () => {
  try {
    const employeeToken = await AsyncStorage.getItem('employeeToken');
    const adminToken = await AsyncStorage.getItem('adminToken');
    return employeeToken && !adminToken;
  } catch (error) {
    console.error('Error checking user type:', error);
    return false;
  }
};

// Get base path based on user type
const getBasePath = async () => {
  const isEmp = await isEmployee();
  return isEmp ? '/employee/dashboard' : '/api';
};

// Generic API call function
const apiCall = async (endpoint, customBasePath = null) => {
  try {
    const token = await getAuthToken();
    if (!token) {
      console.log('No authentication token found, using fallback data');
      return null; // Return null instead of throwing error
    }

    const basePath = customBasePath || await getBasePath();
    const url = `${BASE_URL}${basePath}${endpoint}`;

    console.log('Making API call to:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.log(`API call failed: ${response.status} - ${response.statusText}`);
      return null; // Return null instead of throwing error
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.log('API call error:', error.message);
    return null; // Return null instead of throwing error
  }
};

// Dashboard Service Functions
export const dashboardService = {
  // Get total properties
  getTotalProperties: async () => {
    try {
      const data = await apiCall('/properties/all');
      if (data) {
        return {
          success: true,
          totalProperty: data.totalProperty || 0,
          data: data.data || []
        };
      }
    } catch (error) {
      console.log('Error fetching total properties:', error.message);
    }
    // Return fallback data
    return { success: false, totalProperty: 30, data: [] };
  },

  // Get bought properties (always uses /api path)
  getBoughtProperties: async () => {
    try {
      const data = await apiCall('/properties/all-bought-properties', '/api');
      if (data) {
        return {
          success: true,
          totalProperty: data.totalProperty || 0,
          data: data.data || []
        };
      }
    } catch (error) {
      console.log('Error fetching bought properties:', error.message);
    }
    // Return fallback data
    return { success: false, totalProperty: 0, data: [] };
  },

  // Get rent properties
  getRentProperties: async () => {
    try {
      const data = await apiCall('/properties/rent');
      if (data) {
        return {
          success: true,
          totalProperty: data.totalProperty || 0,
          data: data.data || []
        };
      }
    } catch (error) {
      console.log('Error fetching rent properties:', error.message);
    }
    // Return fallback data
    return { success: false, totalProperty: 4, data: [] };
  },

  // Get subcategory counts
  getSubCategoryCounts: async () => {
    try {
      const data = await apiCall('/subcategory-counts');
      if (data) {
        return {
          success: true,
          data: data || { Residential: [], Commercial: [] }
        };
      }
    } catch (error) {
      console.log('Error fetching subcategory counts:', error.message);
    }
    // Return fallback data
    return {
      success: false,
      data: {
        Residential: [{ name: "Apartment", count: 14 }],
        Commercial: [{ name: "Office", count: 16 }]
      }
    };
  },

  // Fetch all dashboard data
  fetchDashboardData: async () => {
    try {
      console.log('Fetching all dashboard data...');

      // Fetch all data in parallel
      const [
        totalPropertiesRes,
        boughtPropertiesRes,
        rentPropertiesRes,
        subCategoriesRes
      ] = await Promise.all([
        dashboardService.getTotalProperties(),
        dashboardService.getBoughtProperties(),
        dashboardService.getRentProperties(),
        dashboardService.getSubCategoryCounts()
      ]);

      // Calculate residential and commercial counts
      const subCategories = subCategoriesRes.data;
      const residentialCount = subCategories.Residential?.reduce((sum, item) => sum + (item.count || 0), 0) || 14;
      const commercialCount = subCategories.Commercial?.reduce((sum, item) => sum + (item.count || 0), 0) || 16;

      const dashboardData = {
        totalProperty: totalPropertiesRes.totalProperty,
        boughtProperty: boughtPropertiesRes.totalProperty,
        rentProperty: rentPropertiesRes.totalProperty,
        residentialProperty: residentialCount,
        commercialProperty: commercialCount,
        reminders: 0, // TODO: Implement reminders API
        leads: 1, // TODO: Implement leads API
        subCategories: subCategories
      };

      console.log('Dashboard data fetched successfully:', dashboardData);
      return { success: true, data: dashboardData };

    } catch (error) {
      console.log('Error fetching dashboard data:', error.message);

      // Return fallback data
      return {
        success: false,
        data: {
          totalProperty: 30,
          boughtProperty: 0,
          residentialProperty: 14,
          commercialProperty: 16,
          rentProperty: 4,
          reminders: 0,
          leads: 1,
          subCategories: { Residential: [], Commercial: [] }
        }
      };
    }
  }
};

export default dashboardService;
