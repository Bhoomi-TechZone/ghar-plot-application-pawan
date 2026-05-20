/**
 * CRM Dashboard & Analytics API
 * Handles dashboard statistics and analytics
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { BASE_URL } from '../../services/api';

// Helper function to get auth headers
const getAuthHeaders = async () => {
  try {
    // Check all possible token storage keys
    // Priority: Admin tokens first for admin dashboard, then employee tokens
    const adminToken = await AsyncStorage.getItem('adminToken');
    const adminToken2 = await AsyncStorage.getItem('admin_token');
    const employeeToken = await AsyncStorage.getItem('employee_auth_token');
    const employeeToken2 = await AsyncStorage.getItem('employee_token');
    const employeeToken3 = await AsyncStorage.getItem('employeeToken');
    const authToken = await AsyncStorage.getItem('authToken');

    // Priority: adminToken > admin_token > employee tokens
    const token = adminToken || adminToken2 || employeeToken || employeeToken2 || employeeToken3 || authToken;

    console.log('🔐 Auth token check:', {
      adminToken: adminToken ? 'exists' : 'null',
      admin_token: adminToken2 ? 'exists' : 'null',
      employee_auth_token: employeeToken ? 'exists' : 'null',
      employee_token: employeeToken2 ? 'exists' : 'null',
      employeeToken: employeeToken3 ? 'exists' : 'null',
      authToken: authToken ? 'exists' : 'null',
      selectedToken: token ? 'found' : 'NOT FOUND'
    });

    if (!token) {
      console.warn('⚠️ No auth token found in any storage key!');
    }

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

// Handle API response
const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

/**
 * Get dashboard statistics
 */
export const getDashboardStats = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/api/crm/dashboard/stats`, {
      method: 'GET',
      headers,
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw error;
  }
};

/**
 * Get revenue data
 */
export const getRevenueData = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/api/revenue/all`, {
      method: 'GET',
      headers,
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching revenue data:', error);
    throw error;
  }
};

/**
 * Get total revenue
 */
export const getTotalRevenue = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/api/totalrevenue`, {
      method: 'GET',
      headers,
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching total revenue:', error);
    throw error;
  }
};

/**
 * Get admin dashboard statistics
 */
export const getAdminDashboardStats = async () => {
  try {
    const headers = await getAuthHeaders();

    // Check if admin token exists to use correct endpoint
    const adminToken = await AsyncStorage.getItem('adminToken');
    const adminTokenAlt = await AsyncStorage.getItem('admin_token');
    const crmAdminToken = await AsyncStorage.getItem('crm_admin_token');

    const apiPath = (adminToken || adminTokenAlt || crmAdminToken)
      ? '/admin/employees/dashboard-stats'
      : '/api/employees/dashboard-stats';

    const response = await fetch(`${BASE_URL}${apiPath}`, {
      method: 'GET',
      headers,
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching admin dashboard stats:', error);
    throw error;
  }
};

/**
 * Get all properties count
 */
export const getAllPropertiesCount = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/api/properties/all`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log('ℹ️ No properties found');
        return [];
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('📊 Properties fetched:', data);
    return data.properties || data.data || data || [];
  } catch (error) {
    console.error('❌ Error fetching properties:', error.message);
    return [];
  }
};

/**
 * Get bought properties count
 */
export const getBoughtPropertiesCount = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/api/properties/all-bought-properties`, {
      method: 'GET',
      headers,
    });

    // Check if response is ok
    if (!response.ok) {
      if (response.status === 404) {
        console.log('ℹ️ No bought properties found');
        return [];
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('🏠 Bought properties response:', data);
    return data.data || [];
  } catch (error) {
    console.error('❌ Error fetching bought properties:', error.message);
    return [];
  }
};

/**
 * Get rent properties count
 */
export const getRentPropertiesCount = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/api/properties/rent`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log('ℹ️ No rent properties found');
        return [];
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('🏘️ Rent properties fetched:', data);
    return data.rentProperties || data.data || data || [];
  } catch (error) {
    console.error('❌ Error fetching rent properties:', error.message);
    return [];
  }
};

/**
 * Get enquiries count (combines client + manual enquiries)
 */
export const getEnquiriesCount = async () => {
  try {
    const headers = await getAuthHeaders();
    const [clientResponse, manualResponse] = await Promise.all([
      fetch(`${BASE_URL}/api/inquiry/get-enquiries`, {
        method: 'GET',
        headers,
      }),
      fetch(`${BASE_URL}/api/inquiry/all`, {
        method: 'GET',
        headers,
      })
    ]);

    const clientData = await handleResponse(clientResponse);
    const manualData = await handleResponse(manualResponse);

    console.log('📧 Client enquiries:', clientData);
    console.log('📝 Manual enquiries:', manualData);

    const clientCount = clientData?.enquiries?.length || clientData?.data?.length || 0;
    const manualCount = manualData?.manualInquiries?.length || manualData?.data?.length || 0;

    return {
      client: clientCount,
      manual: manualCount,
      total: clientCount + manualCount,
    };
  } catch (error) {
    console.error('❌ Error fetching enquiries:', error);
    return { client: 0, manual: 0, total: 0 };
  }
};

/**
 * Get leads statistics (hot, warm, cold counts)
 */
export const getLeadsStats = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/admin/leads/all`, {
      method: 'GET',
      headers,
    });

    const data = await handleResponse(response);
    console.log('🎯 Leads response:', data);

    // Backend returns data.data.assignments
    const leads = data?.data?.assignments || data?.assignments || data?.data || [];

    // Count leads by priority (not status)
    const hot = leads.filter(lead => lead.priority?.toLowerCase() === 'high').length;
    const warm = leads.filter(lead => lead.priority?.toLowerCase() === 'medium').length;
    const cold = leads.filter(lead => lead.priority?.toLowerCase() === 'low').length;

    console.log('📊 Leads stats:', { hot, warm, cold, total: leads.length });

    return {
      hot,
      warm,
      cold,
      total: leads.length,
    };
  } catch (error) {
    console.error('❌ Error fetching leads stats:', error);
    return { hot: 0, warm: 0, cold: 0, total: 0 };
  }
};

/**
 * Get users count
 */
export const getUsersCount = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/api/users/`, {
      method: 'GET',
      headers,
    });

    const data = await handleResponse(response);
    console.log('👥 Users fetched:', data);
    return data?.users?.length || data?.data?.length || 0;
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    return 0;
  }
};

/**
 * Get employees count
 */
export const getEmployeesCount = async () => {
  try {
    const headers = await getAuthHeaders();

    // Check if admin token exists to use correct endpoint
    const adminToken = await AsyncStorage.getItem('adminToken');
    const adminTokenAlt = await AsyncStorage.getItem('admin_token');
    const crmAdminToken = await AsyncStorage.getItem('crm_admin_token');

    // Use /admin/employees for admin, /api/employees for employees
    const apiPath = (adminToken || adminTokenAlt || crmAdminToken)
      ? '/admin/employees'
      : '/api/employees';

    const response = await fetch(`${BASE_URL}${apiPath}?page=1&limit=100`, {
      method: 'GET',
      headers,
    });

    // Handle non-OK responses gracefully
    if (!response.ok) {
      console.log('⚠️ Employees API returned:', response.status);
      return 0;
    }

    const data = await response.json();
    console.log('👨‍💼 Employees fetched:', data);
    return data?.employees?.length || data?.data?.length || 0;
  } catch (error) {
    console.error('❌ Error fetching employees:', error);
    return 0;
  }
};

/**
 * Get complete admin dashboard data
 * Fetches all dashboard statistics in parallel
 */
export const getCompleteDashboardData = async () => {
  try {
    console.log('🔄 Starting dashboard data fetch...');

    const [
      properties,
      boughtProperties,
      rentProperties,
      enquiries,
      leads,
      usersCount,
      employeesCount
    ] = await Promise.all([
      getAllPropertiesCount(),
      getBoughtPropertiesCount(),
      getRentPropertiesCount(),
      getEnquiriesCount(),
      getLeadsStats(),
      getUsersCount(),
      getEmployeesCount()
    ]);

    console.log('✅ Dashboard data fetched:', {
      propertiesCount: properties.length,
      boughtCount: boughtProperties.length,
      rentCount: rentProperties.length,
      enquiries,
      leads,
      usersCount,
      employeesCount
    });

    const residential = properties.filter(p => p.propertyType?.toLowerCase() === 'residential').length;
    const commercial = properties.filter(p => p.propertyType?.toLowerCase() === 'commercial').length;

    return {
      totalProperty: properties.length,
      boughtProperty: boughtProperties.length,
      residentialProperty: residential,
      commercialProperty: commercial,
      rentProperty: rentProperties.length,
      enquiries: enquiries,
      leads: leads,
      properties: {
        sale: properties.length - rentProperties.length,
        rent: rentProperties.length,
      },
      recentProperties: properties.slice(0, 5),
      totalUsers: usersCount,
      activeEmployees: employeesCount,
      pendingApprovals: 0,
    };
  } catch (error) {
    console.error('❌ Error fetching complete dashboard data:', error);
    throw error;
  }
};

export default {
  getDashboardStats,
  getRevenueData,
  getTotalRevenue,
  getAdminDashboardStats,
  getAllPropertiesCount,
  getBoughtPropertiesCount,
  getRentPropertiesCount,
  getEnquiriesCount,
  getLeadsStats,
  getUsersCount,
  getEmployeesCount,
  getCompleteDashboardData,
};

