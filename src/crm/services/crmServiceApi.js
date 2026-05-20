/**
 * CRM Service Management API
 * Handles service CRUD operations
 */
import { CRM_BASE_URL, getCRMAuthHeaders, handleCRMResponse } from './crmAPI';

/**
 * Get all services
 */
export const getAllServices = async () => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/services`, {
      method: 'GET',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error fetching services:', error);
    throw error;
  }
};

/**
 * Add new service
 */
export const addService = async (serviceData) => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/services`, {
      method: 'POST',
      headers: await getCRMAuthHeaders(),
      body: JSON.stringify(serviceData),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error adding service:', error);
    throw error;
  }
};

/**
 * Update service
 */
export const updateService = async (serviceId, serviceData) => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/services/${serviceId}`, {
      method: 'PUT',
      headers: await getCRMAuthHeaders(),
      body: JSON.stringify(serviceData),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error updating service:', error);
    throw error;
  }
};

/**
 * Delete service
 */
export const deleteService = async (serviceId) => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/services/${serviceId}`, {
      method: 'DELETE',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error deleting service:', error);
    throw error;
  }
};

export default {
  getAllServices,
  addService,
  updateService,
  deleteService,
};
