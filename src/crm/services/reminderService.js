/**
 * Reminder Service
 * Handles reminder creation and management
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
 * Create reminder for enquiry
 */
export const createReminder = async (reminderData) => {
  try {
    const response = await fetch(`${BASE_URL}/employee/reminders/create`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(reminderData),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to create reminder');
    }
    
    return {
      success: true,
      message: data.message || 'Reminder created successfully',
      data: data.data,
    };
  } catch (error) {
    console.error('Error creating reminder:', error);
    return {
      success: false,
      message: error.message,
    };
  }
};

/**
 * Convert 12-hour time to 24-hour format
 */
export const convertTo24Hour = (hour, minute, period) => {
  let hour24 = parseInt(hour);
  
  if (period === 'AM' && hour24 === 12) {
    hour24 = 0;
  } else if (period === 'PM' && hour24 !== 12) {
    hour24 += 12;
  }
  
  return { hour: hour24, minute: parseInt(minute) };
};

/**
 * Create ISO datetime string from date and time components
 */
export const createReminderDateTime = (date, hour, minute, period) => {
  try {
    const { hour: hour24, minute: min } = convertTo24Hour(hour, minute, period);
    
    // Split DD-MM-YYYY format
    const [day, month, year] = date.split('-').map(Number);
    
    // JS Date month is 0-indexed (Jan = 0)
    const reminderDate = new Date(year, month - 1, day);
    reminderDate.setHours(hour24, min, 0, 0);
    
    return reminderDate.toISOString();
  } catch (error) {
    console.error('Error creating reminder datetime:', error);
    throw new Error('Invalid date or time format. Use DD-MM-YYYY');
  }
};

/**
 * Extract client info from enquiry for reminder
 */
export const extractClientInfo = (enquiry) => {
  console.log('Extracting client info for enquiry:', enquiry);
  
  // Handle existing customers (client enquiries)
  if (enquiry.source === 'client' || enquiry.enquiryType === 'Inquiry') {
    return {
      name: enquiry.clientName || enquiry.fullName || 'Unknown Client',
      email: enquiry.email || '',
      phone: enquiry.contactNumber || enquiry.phone || '',
      location: enquiry.propertyLocation || enquiry.location || '',
    };
  }
  
  // Handle manual enquiries
  return {
    name: enquiry.clientName || 'Unknown Client',
    email: enquiry.email || '',
    phone: enquiry.contactNumber || '',
    location: enquiry.propertyLocation || enquiry.location || enquiry.address || '',
  };
};