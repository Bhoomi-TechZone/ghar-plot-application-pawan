/**
 * Follow-up Service
 * Handles follow-up creation and management
 */
import { BASE_URL } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getAuthHeaders = async () => {
  const adminToken = await AsyncStorage.getItem('adminToken');
  const adminToken2 = await AsyncStorage.getItem('admin_token');
  const employeeToken = await AsyncStorage.getItem('employeeToken');
  const employeeToken2 = await AsyncStorage.getItem('employee_token');
  const employeeAuthToken = await AsyncStorage.getItem('employee_auth_token');
  const crmToken = await AsyncStorage.getItem('crm_auth_token');
  const token = await AsyncStorage.getItem('token');
  
  const authToken = adminToken || adminToken2 || employeeToken || employeeToken2 || employeeAuthToken || crmToken || token;
  
  return {
    'Content-Type': 'application/json',
    ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
  };
};

/**
 * Create follow-up for enquiry
 */
export const createFollowUp = async (followUpData) => {
  try {
    const response = await fetch(`${BASE_URL}/api/crm/followups`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(followUpData),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to create follow-up');
    }
    
    return {
      success: true,
      message: data.message || 'Follow-up created successfully',
      data: data.data,
    };
  } catch (error) {
    console.error('Error creating follow-up:', error);
    return {
      success: false,
      message: error.message,
    };
  }
};

/**
 * Prepare follow-up data from enquiry
 */
export const prepareFollowUpData = (enquiry, followUpDetails) => {
  return {
    leadId: enquiry._id,
    leadType: enquiry.enquiryType, // "Inquiry" or "ManualInquiry"
    followUpType: followUpDetails.type || 'Call',
    followUpDate: followUpDetails.date,
    priority: followUpDetails.priority || 'medium',
    notes: followUpDetails.notes || '',
    status: 'pending',
    // Additional context
    clientName: enquiry.clientName,
    clientPhone: enquiry.contactNumber,
    clientEmail: enquiry.email,
    propertyType: enquiry.propertyType,
    propertyLocation: enquiry.propertyLocation,
  };
};

/**
 * Get follow-up types
 */
export const getFollowUpTypes = () => [
  { value: 'Call', label: 'Phone Call', icon: 'phone' },
  { value: 'Meeting', label: 'Meeting', icon: 'people' },
  { value: 'Site Visit', label: 'Site Visit', icon: 'location-on' },
  { value: 'Email', label: 'Email', icon: 'email' },
  { value: 'WhatsApp', label: 'WhatsApp', icon: 'chat' },
];

/**
 * Get priority levels
 */
export const getPriorityLevels = () => [
  { value: 'low', label: 'Low', color: '#10b981' },
  { value: 'medium', label: 'Medium', color: '#f59e0b' },
  { value: 'high', label: 'High', color: '#ef4444' },
];