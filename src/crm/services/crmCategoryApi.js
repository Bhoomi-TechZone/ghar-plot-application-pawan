/**
 * CRM Category Management API
 * Handles category CRUD operations
 */
import { CRM_BASE_URL, getCRMAuthHeaders, handleCRMResponse } from './crmAPI';

/**
 * Get all categories
 */
export const getAllCategories = async () => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/categories`, {
      method: 'GET',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
};

/**
 * Add new category
 */
export const addCategory = async (categoryData) => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/categories`, {
      method: 'POST',
      headers: await getCRMAuthHeaders(),
      body: JSON.stringify(categoryData),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error adding category:', error);
    throw error;
  }
};

/**
 * Update category
 */
export const updateCategory = async (categoryId, categoryData) => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/categories/${categoryId}`, {
      method: 'PUT',
      headers: await getCRMAuthHeaders(),
      body: JSON.stringify(categoryData),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
};

/**
 * Delete category
 */
export const deleteCategory = async (categoryId) => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/categories/${categoryId}`, {
      method: 'DELETE',
      headers: await getCRMAuthHeaders(),
    });
    
    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};

export default {
  getAllCategories,
  addCategory,
  updateCategory,
  deleteCategory,
};
