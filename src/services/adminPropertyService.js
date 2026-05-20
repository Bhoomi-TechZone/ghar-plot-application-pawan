/**
 * Admin Property Service
 * Handles all property management API calls for admin
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://gharplotbackend.gntechnology.de';

/**
 * Get authentication headers with token
 * Checks all possible token storage keys
 */
const getAuthHeaders = async () => {
  try {
    // Check all possible token keys (admin and employee)
    const crmAuthToken = await AsyncStorage.getItem('crm_auth_token');
    const adminToken = await AsyncStorage.getItem('adminToken');
    const adminTokenAlt = await AsyncStorage.getItem('admin_token');
    const crmAdminToken = await AsyncStorage.getItem('crm_admin_token');
    const employeeToken = await AsyncStorage.getItem('employee_auth_token');
    const authToken = await AsyncStorage.getItem('authToken');

    // Priority: admin tokens first, then employee tokens
    const token = crmAuthToken || adminToken || adminTokenAlt || crmAdminToken || employeeToken || authToken;

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

/**
 * Check if user is employee
 */
const isEmployee = async () => {
  try {
    const employeeToken = await AsyncStorage.getItem('employee_auth_token');
    const adminToken = await AsyncStorage.getItem('crm_auth_token');
    return employeeToken && !adminToken;
  } catch (error) {
    return false;
  }
};

/**
 * Handle API response
 */
const handleResponse = async (response) => {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `HTTP error! status: ${response.status}`);
  }

  return data;
};

/**
 * Get all properties (admin/employee view)
 */
export const getAllProperties = async (params = {}) => {
  try {
    const isEmp = await isEmployee();
    const endpoint = isEmp ? '/employee/dashboard/properties/all' : '/api/properties/all';
    const queryString = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}${endpoint}${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching properties:', error);
    throw error;
  }
};

/**
 * Get rent properties
 */
export const getRentProperties = async () => {
  try {
    const isEmp = await isEmployee();
    const endpoint = isEmp ? '/employee/dashboard/properties/rent' : '/api/properties/rent';

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching rent properties:', error);
    throw error;
  }
};

/**
 * Get bought properties
 */
export const getBoughtProperties = async () => {
  try {
    const isEmp = await isEmployee();
    const endpoint = isEmp ? '/employee/dashboard/properties/bought' : '/api/properties/bought';

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching bought properties:', error);
    throw error;
  }
};

/**
 * Get recent properties
 */
export const getRecentProperties = async () => {
  try {
    const isEmp = await isEmployee();
    const endpoint = isEmp ? '/employee/dashboard/properties/recent' : '/api/properties/recent';

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching recent properties:', error);
    throw error;
  }
};

/**
 * Get subcategory counts
 */
export const getSubcategoryCounts = async () => {
  try {
    const isEmp = await isEmployee();
    const endpoint = isEmp ? '/employee/dashboard/properties/subcategory-counts' : '/api/properties/subcategory-counts';

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching subcategory counts:', error);
    throw error;
  }
};

/**
 * Get property statistics (admin)
 */
export const getPropertyStats = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/crm/admin/properties/stats`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching property stats:', error);
    throw error;
  }
};

/**
 * Get all property counts
 */
export const getAllPropertyCounts = async () => {
  try {
    const isEmp = await isEmployee();

    const endpoints = {
      all: isEmp ? '/employee/dashboard/properties/all' : '/api/properties/all',
      rent: isEmp ? '/employee/dashboard/properties/rent' : '/api/properties/rent',
      bought: isEmp ? '/employee/dashboard/properties/bought' : '/api/properties/bought',
      recent: isEmp ? '/employee/dashboard/properties/recent' : '/api/properties/recent',
      subcategory: isEmp ? '/employee/dashboard/properties/subcategory-counts' : '/api/properties/subcategory-counts'
    };

    const headers = await getAuthHeaders();

    const [allRes, rentRes, boughtRes, recentRes, subcategoryRes] = await Promise.all([
      fetch(`${API_BASE_URL}${endpoints.all}`, { headers }),
      fetch(`${API_BASE_URL}${endpoints.rent}`, { headers }),
      fetch(`${API_BASE_URL}${endpoints.bought}`, { headers }),
      fetch(`${API_BASE_URL}${endpoints.recent}`, { headers }),
      fetch(`${API_BASE_URL}${endpoints.subcategory}`, { headers })
    ]);

    const [allData, rentData, boughtData, recentData, subcategoryData] = await Promise.all([
      allRes.json(),
      rentRes.json(),
      boughtRes.json(),
      recentRes.json(),
      subcategoryRes.json()
    ]);

    const residentialCount = subcategoryData.data?.Residential?.reduce((sum, item) => sum + item.count, 0) || 0;
    const commercialCount = subcategoryData.data?.Commercial?.reduce((sum, item) => sum + item.count, 0) || 0;

    return {
      totalProperties: allData.totalProperty || 0,
      rentProperties: rentData.totalProperty || 0,
      boughtProperties: boughtData.totalProperty || 0,
      recentProperties: recentData.recentCount || 0,
      residentialProperties: residentialCount,
      commercialProperties: commercialCount,
      breakdown: {
        residential: subcategoryData.data?.Residential || [],
        commercial: subcategoryData.data?.Commercial || []
      }
    };
  } catch (error) {
    console.error('Error fetching property counts:', error);
    return {
      totalProperties: 0,
      rentProperties: 0,
      boughtProperties: 0,
      recentProperties: 0,
      residentialProperties: 0,
      commercialProperties: 0,
      breakdown: { residential: [], commercial: [] }
    };
  }
};

/**
 * Update property status
 */
export const updatePropertyStatus = async (propId, status) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/crm/admin/properties/${propId}/status`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ status }),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error updating property status:', error);
    throw error;
  }
};

/**
 * Mark property as featured
 */
export const updatePropertyFeatured = async (propId, featured) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/crm/admin/properties/${propId}/feature`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ featured }),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error updating property featured status:', error);
    throw error;
  }
};

/**
 * Delete property (admin)
 */
export const deleteProperty = async (propId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/property/delete/${propId}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error deleting property:', error);
    throw error;
  }
};

/**
 * Get pending approval properties
 */
export const getPendingProperties = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/crm/admin/properties/pending`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching pending properties:', error);
    throw error;
  }
};

/**
 * Approve property
 */
export const approveProperty = async (propId, approved, notes = '') => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/crm/admin/properties/${propId}/approve`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ approved, notes }),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error approving property:', error);
    throw error;
  }
};

/**
 * Get property view analytics
 */
export const getPropertyViews = async (propId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/crm/admin/properties/${propId}/views`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching property views:', error);
    throw error;
  }
};

export default {
  getAllProperties,
  getRentProperties,
  getBoughtProperties,
  getRecentProperties,
  getSubcategoryCounts,
  getPropertyStats,
  getAllPropertyCounts,
  updatePropertyStatus,
  updatePropertyFeatured,
  deleteProperty,
  getPendingProperties,
  approveProperty,
  getPropertyViews,
};
