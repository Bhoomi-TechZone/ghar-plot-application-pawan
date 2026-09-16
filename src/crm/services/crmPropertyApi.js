/**
 * CRM Property Management API
 * Handles all property management related API calls
 */
import { CRM_BASE_URL, getCRMAuthHeaders, handleCRMResponse, buildQueryString } from './crmAPI';

/**
 * Get all properties with pagination and filters
 */
export const getAllProperties = async (params = {}) => {
  try {
    const queryString = buildQueryString(params);
    const url = `${CRM_BASE_URL}/api/crm/properties${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.log('⚠️ Error fetching properties:', error.message);
    throw error;
  }
};

/**
 * Get single property details
 */
export const getPropertyById = async (propertyId) => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/crm/properties/${propertyId}`, {
      method: 'GET',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.log('⚠️ Error fetching property details:', error.message);
    throw error;
  }
};

/**
 * Create new property
 */
export const createProperty = async (propertyData) => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/crm/properties`, {
      method: 'POST',
      headers: await getCRMAuthHeaders(),
      body: JSON.stringify(propertyData),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.log('⚠️ Error creating property:', error.message);
    throw error;
  }
};

/**
 * Update property details
 */
export const updateProperty = async (propertyId, propertyData) => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/crm/properties/${propertyId}`, {
      method: 'PUT',
      headers: await getCRMAuthHeaders(),
      body: JSON.stringify(propertyData),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error updating property:', error);
    throw error;
  }
};

/**
 * Delete property
 */
export const deleteProperty = async (propertyId) => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/crm/properties/${propertyId}`, {
      method: 'DELETE',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.log('⚠️ Error deleting property:', error.message);
    throw error;
  }
};

/**
 * Approve property
 */
export const approveProperty = async (propertyId) => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/crm/properties/${propertyId}/approve`, {
      method: 'POST',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.log('⚠️ Error approving property:', error.message);
    throw error;
  }
};

/**
 * Reject property
 */
export const rejectProperty = async (propertyId, reason) => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/crm/properties/${propertyId}/reject`, {
      method: 'POST',
      headers: await getCRMAuthHeaders(),
      body: JSON.stringify({ reason }),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.log('⚠️ Error rejecting property:', error.message);
    throw error;
  }
};

/**
 * Get property statistics (Admin)
 */
export const getPropertyStats = async () => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/crm/admin/properties/stats`, {
      method: 'GET',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.log('⚠️ Error fetching property stats:', error.message);
    throw error;
  }
};

/**
 * Get all properties (Admin - alternative)
 */
export const getAllPropertiesAdmin = async () => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/properties/all`, {
      method: 'GET',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.log('⚠️ Error fetching all properties:', error.message);
    throw error;
  }
};

/**
 * Get all properties (Admin CRM View)
 */
export const getAllPropertiesCRM = async (params = {}) => {
  try {
    const queryString = buildQueryString(params);
    const url = `${CRM_BASE_URL}/api/crm/admin/properties${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.log('⚠️ Error fetching CRM properties:', error.message);
    throw error;
  }
};

/**
 * Add new property (Admin)
 */
export const addPropertyAdmin = async (propertyData) => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/property/admin/add`, {
      method: 'POST',
      headers: await getCRMAuthHeaders(),
      body: JSON.stringify(propertyData),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.log('⚠️ Error adding property:', error.message);
    throw error;
  }
};

/**
 * Update property (Admin)
 */
export const updatePropertyAdmin = async (propertyId, propertyData) => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/property/edit/${propertyId}`, {
      method: 'PUT',
      headers: await getCRMAuthHeaders(),
      body: JSON.stringify(propertyData),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error updating property:', error);
    throw error;
  }
};

/**
 * Delete property (Admin - alternative)
 */
export const deletePropertyAdmin = async (propertyId) => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/property/delete/${propertyId}`, {
      method: 'DELETE',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error deleting property:', error);
    throw error;
  }
};

/**
 * Delete property (CRM Admin)
 */
export const deletePropertyCRM = async (propertyId) => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/crm/admin/properties/${propertyId}`, {
      method: 'DELETE',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error deleting CRM property:', error);
    throw error;
  }
};

/**
 * Update property status
 */
export const updatePropertyStatus = async (propertyId, statusData) => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/crm/admin/properties/${propertyId}/status`, {
      method: 'PUT',
      headers: await getCRMAuthHeaders(),
      body: JSON.stringify(statusData),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error updating property status:', error);
    throw error;
  }
};

/**
 * Mark property as featured
 */
export const markPropertyAsFeatured = async (propertyId, featuredData) => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/crm/admin/properties/${propertyId}/feature`, {
      method: 'PUT',
      headers: await getCRMAuthHeaders(),
      body: JSON.stringify(featuredData),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error marking property as featured:', error);
    throw error;
  }
};

/**
 * Get pending approval properties
 */
export const getPendingApprovalProperties = async () => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/crm/admin/properties/pending`, {
      method: 'GET',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error fetching pending properties:', error);
    throw error;
  }
};

/**
 * Get recent properties (Admin)
 */
export const getRecentProperties = async () => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/properties/recent`, {
      method: 'GET',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error fetching recent properties:', error);
    throw error;
  }
};

/**
 * Get recent properties (All)
 */
export const getRecentPropertiesAll = async () => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/properties/recent/all`, {
      method: 'GET',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error fetching all recent properties:', error);
    throw error;
  }
};

/**
 * Approve property (Alternative)
 */
export const approvePropertyAlternative = async (propertyId, approvalData) => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/properties/${propertyId}/approve`, {
      method: 'POST',
      headers: await getCRMAuthHeaders(),
      body: JSON.stringify(approvalData),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error approving property:', error);
    throw error;
  }
};

/**
 * Approve property (CRM Admin)
 */
export const approvePropertyCRM = async (propertyId, approvalData) => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/crm/admin/properties/${propertyId}/approve`, {
      method: 'POST',
      headers: await getCRMAuthHeaders(),
      body: JSON.stringify(approvalData),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error approving CRM property:', error);
    throw error;
  }
};

/**
 * Reject property (Alternative)
 */
export const rejectPropertyAlternative = async (propertyId, rejectionData) => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/properties/${propertyId}/reject`, {
      method: 'POST',
      headers: await getCRMAuthHeaders(),
      body: JSON.stringify(rejectionData),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error rejecting property:', error);
    throw error;
  }
};

/**
 * Get property view analytics
 */
export const getPropertyViewAnalytics = async (propertyId) => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/crm/admin/properties/${propertyId}/views`, {
      method: 'GET',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error fetching property views:', error);
    throw error;
  }
};

/**
 * Get rent properties (Admin)
 */
export const getRentProperties = async () => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/properties/rent`, {
      method: 'GET',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error fetching rent properties:', error);
    throw error;
  }
};

/**
 * Get bought properties (Admin)
 */
export const getBoughtProperties = async () => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/properties/bought`, {
      method: 'GET',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error fetching bought properties:', error);
    throw error;
  }
};

/**
 * Get all bought properties
 */
export const getAllBoughtProperties = async () => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/properties/all-bought-properties`, {
      method: 'GET',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error fetching all bought properties:', error);
    throw error;
  }
};

/**
 * Get sub-category counts (Admin)
 */
export const getSubCategoryCounts = async () => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/properties/subcategory-counts`, {
      method: 'GET',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error fetching subcategory counts:', error);
    throw error;
  }
};

export default {
  getAllProperties,
  getAllPropertiesAdmin,
  getAllPropertiesCRM,
  getPropertyById,
  createProperty,
  addPropertyAdmin,
  updateProperty,
  updatePropertyAdmin,
  deleteProperty,
  deletePropertyAdmin,
  deletePropertyCRM,
  approveProperty,
  approvePropertyAlternative,
  approvePropertyCRM,
  rejectProperty,
  rejectPropertyAlternative,
  updatePropertyStatus,
  markPropertyAsFeatured,
  getPendingApprovalProperties,
  getRecentProperties,
  getRecentPropertiesAll,
  getPropertyViewAnalytics,
  getRentProperties,
  getBoughtProperties,
  getAllBoughtProperties,
  getSubCategoryCounts,
  getPropertyStats,
};
