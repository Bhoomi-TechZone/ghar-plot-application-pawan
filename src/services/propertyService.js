import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://gharplotbackend.gntechnology.de';

// Helper function to get auth token and determine role
const getAuthConfig = async () => {
  try {
    const adminToken = await AsyncStorage.getItem('adminToken');
    const employeeToken = await AsyncStorage.getItem('employeeToken');

    let token = null;
    let isAdmin = false;

    if (adminToken && adminToken !== 'null' && adminToken !== 'undefined') {
      token = adminToken;
      isAdmin = true;
    } else if (employeeToken && employeeToken !== 'null' && employeeToken !== 'undefined') {
      token = employeeToken;
      isAdmin = false;
    }

    return {
      token,
      isAdmin,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      }
    };
  } catch (error) {
    console.error('Error getting auth config:', error);
    throw new Error('Authentication required');
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

// Get all properties
export const getAllProperties = async () => {
  try {
    const { headers, isAdmin } = await getAuthConfig();
    const endpoint = isAdmin ? '/api/properties/all' : '/employee/dashboard/properties/all';

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers,
    });

    const data = await handleResponse(response);
    return data.properties || data.data || data || [];
  } catch (error) {
    console.error('Error fetching all properties:', error);
    throw error;
  }
};

// Get rent properties
export const getRentProperties = async () => {
  try {
    const { headers, isAdmin } = await getAuthConfig();
    const endpoint = isAdmin ? '/api/properties/rent' : '/employee/properties/rent';

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers,
    });

    const data = await handleResponse(response);
    return data.properties || data.data || data || [];
  } catch (error) {
    console.error('Error fetching rent properties:', error);
    throw error;
  }
};

// Get bought properties
export const getBoughtProperties = async () => {
  try {
    const { headers, isAdmin } = await getAuthConfig();
    const endpoint = isAdmin ? '/api/properties/bought' : '/employee/properties/bought';

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers,
    });

    const data = await handleResponse(response);
    return data.properties || data.data || data || [];
  } catch (error) {
    console.error('Error fetching bought properties:', error);
    throw error;
  }
};

// Get recent properties
export const getRecentProperties = async () => {
  try {
    const { headers, isAdmin } = await getAuthConfig();
    const endpoint = isAdmin ? '/api/properties/recent' : '/employee/properties/recent';

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers,
    });

    const data = await handleResponse(response);
    return data.properties || data.data || data || [];
  } catch (error) {
    console.error('Error fetching recent properties:', error);
    throw error;
  }
};

// Get property analytics
export const getPropertyAnalytics = async () => {
  try {
    const { headers, isAdmin } = await getAuthConfig();
    const endpoint = isAdmin ? '/api/properties/analytics' : '/employee/properties/analytics';

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers,
    });

    const data = await handleResponse(response);
    return data;
  } catch (error) {
    console.error('Error fetching property analytics:', error);
    // Fallback: calculate analytics from all properties
    try {
      const properties = await getAllProperties();
      return calculateAnalytics(properties);
    } catch (fallbackError) {
      console.error('Error in analytics fallback:', fallbackError);
      throw error;
    }
  }
};

// Delete property (Admin only)
export const deleteProperty = async (propertyId) => {
  try {
    const { headers, isAdmin } = await getAuthConfig();

    if (!isAdmin) {
      throw new Error('Only administrators can delete properties');
    }

    const response = await fetch(`${API_BASE_URL}/property/delete/${propertyId}`, {
      method: 'DELETE',
      headers,
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error deleting property:', error);
    throw error;
  }
};

// Get properties by category
export const getPropertiesByCategory = async (category) => {
  try {
    const { headers, isAdmin } = await getAuthConfig();
    let endpoint;

    switch (category.toLowerCase()) {
      case 'residential':
        endpoint = isAdmin ? '/api/properties/residential' : '/employee/properties/residential';
        break;
      case 'commercial':
        endpoint = isAdmin ? '/api/properties/commercial' : '/employee/properties/commercial';
        break;
      case 'rent':
        return await getRentProperties();
      case 'bought':
        return await getBoughtProperties();
      case 'recent':
        return await getRecentProperties();
      default:
        return await getAllProperties();
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers,
    });

    const data = await handleResponse(response);
    return data.properties || data.data || data || [];
  } catch (error) {
    console.error(`Error fetching ${category} properties:`, error);
    // Fallback: filter from all properties
    try {
      const allProperties = await getAllProperties();
      return filterPropertiesByCategory(allProperties, category);
    } catch (fallbackError) {
      console.error('Error in category fallback:', fallbackError);
      throw error;
    }
  }
};

// Helper function to calculate analytics from properties array
const calculateAnalytics = (properties) => {
  if (!Array.isArray(properties) || properties.length === 0) {
    return {
      total: 0,
      residential: 0,
      commercial: 0,
      approved: 0,
      pending: 0,
      rejected: 0,
      rent: 0,
      bought: 0,
      priceRanges: {
        low: 0,
        medium: 0,
        high: 0
      }
    };
  }

  const analytics = {
    total: properties.length,
    residential: 0,
    commercial: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    rent: 0,
    bought: 0,
    priceRanges: {
      low: 0,
      medium: 0,
      high: 0
    }
  };

  properties.forEach(property => {
    // Property type analysis
    const type = (property.propertyType || property.type || '').toLowerCase();
    if (type.includes('residential') || type.includes('apartment') || type.includes('house')) {
      analytics.residential++;
    } else if (type.includes('commercial') || type.includes('office') || type.includes('shop')) {
      analytics.commercial++;
    }

    // Status analysis
    const status = (property.status || '').toLowerCase();
    if (status === 'approved') {
      analytics.approved++;
    } else if (status === 'pending') {
      analytics.pending++;
    } else if (status === 'rejected') {
      analytics.rejected++;
    }

    // Purpose analysis
    const purpose = (property.purpose || '').toLowerCase();
    if (purpose === 'rent') {
      analytics.rent++;
    } else if (purpose === 'sell' || property.isSold) {
      analytics.bought++;
    }

    // Price range analysis
    const price = parseInt(property.price || property.cost || 0);
    if (price < 1000000) { // Less than 10 lakhs
      analytics.priceRanges.low++;
    } else if (price < 5000000) { // 10-50 lakhs
      analytics.priceRanges.medium++;
    } else { // Above 50 lakhs
      analytics.priceRanges.high++;
    }
  });

  return analytics;
};

// Helper function to filter properties by category
const filterPropertiesByCategory = (properties, category) => {
  if (!Array.isArray(properties)) return [];

  switch (category.toLowerCase()) {
    case 'residential':
      return properties.filter(property => {
        const type = (property.propertyType || property.type || '').toLowerCase();
        return type.includes('residential') || type.includes('apartment') || type.includes('house');
      });
    case 'commercial':
      return properties.filter(property => {
        const type = (property.propertyType || property.type || '').toLowerCase();
        return type.includes('commercial') || type.includes('office') || type.includes('shop');
      });
    case 'rent':
      return properties.filter(property => {
        const purpose = (property.purpose || '').toLowerCase();
        return purpose === 'rent';
      });
    case 'bought':
      return properties.filter(property => {
        const purpose = (property.purpose || '').toLowerCase();
        return purpose === 'sell' || property.isSold;
      });
    case 'recent':
      return properties
        .sort((a, b) => new Date(b.createdAt || b.dateAdded || 0) - new Date(a.createdAt || a.dateAdded || 0))
        .slice(0, 10);
    default:
      return properties;
  }
};

// Check if user is admin
export const checkUserRole = async () => {
  try {
    const { isAdmin } = await getAuthConfig();
    return { isAdmin };
  } catch (error) {
    console.error('Error checking user role:', error);
    return { isAdmin: false };
  }
};

export default {
  getAllProperties,
  getRentProperties,
  getBoughtProperties,
  getRecentProperties,
  getPropertyAnalytics,
  deleteProperty,
  getPropertiesByCategory,
  checkUserRole,
};
