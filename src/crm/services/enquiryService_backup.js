/**
 * Enquiry Service
 * Handles all enquiry-related API calls - Integrated with Backend
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// Backend API configuration
const BASE_URL = 'http://192.168.1.5:4000'; // Update this with your actual backend IP

const getAuthHeaders = async () => {
  const adminToken = await AsyncStorage.getItem('adminToken');
  const employeeToken = await AsyncStorage.getItem('employeeToken');
  const token = await AsyncStorage.getItem('token');
  
  const authToken = adminToken || employeeToken || token;
  
  return {
    'Content-Type': 'application/json',
    ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
  };
};

/**
 * Fetch client enquiries from backend
 */
export const getClientEnquiries = async () => {
  try {
    const response = await fetch(`${BASE_URL}/inquiry/get-enquiries`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.warn('Client enquiries fetch failed:', data.message);
      return {
        success: false,
        data: [],
        message: data.message || 'Failed to fetch client enquiries'
      };
    }
    
    // Normalize client enquiries data
    const normalizedData = (data.data || []).map(item => ({
      _id: item._id,
      enquiryType: 'Inquiry',
      source: 'client',
      clientName: item.fullName || item.buyerId?.fullName || 'N/A',
      email: item.email || item.buyerId?.email || 'N/A',
      contactNumber: item.contactNumber || item.buyerId?.phone || 'N/A',
      propertyId: item.propertyId?._id || item.propertyId || 'N/A',
      propertyType: item.propertyId?.category || 'N/A',
      propertyLocation: item.propertyId?.location || item.propertyId?.address || 'N/A',
      price: item.propertyId?.price ? `₹${item.propertyId.price}` : 'N/A',
      status: item.status || 'pending',
      createdAt: item.createdAt,
      assignment: item.assignment || null,
      ownerInfo: {
        name: item.ownerId?.fullName || 'N/A',
        email: item.ownerId?.email || 'N/A',
        phone: item.ownerId?.phone || 'N/A'
      }
    }));
    
    return {
      success: true,
      data: normalizedData,
      count: normalizedData.length
    };
    
  } catch (error) {
    console.error('Error fetching client enquiries:', error);
    return {
      success: false,
      data: [],
      message: 'Network error while fetching client enquiries'
    };
  }
};
      enquiryType: 'Inquiry',
      source: 'client',
      message: item.message || '',
      // Additional client enquiry fields
      buyerId: item.buyerId || null,
      ownerId: item.ownerId || null,
    }));
    
    return {
      success: true,
      data: normalizedData,
    };
  } catch (error) {
    console.error('Error fetching client enquiries:', error);
    return {
      success: false,
      message: error.message,
      data: [],
    };
  }
};

/**
 * Fetch manual enquiries
 */
export const getManualEnquiries = async () => {
  try {
    const response = await fetch(`${BASE_URL}/api/inquiry/all`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch manual enquiries');
    }
    
    // Normalize response
    const normalizedData = (data.data || []).map(item => ({
      _id: item._id,
      clientName: item.clientName || 'N/A',
      email: item.email || 'N/A',
      contactNumber: item.contactNumber || 'N/A',
      propertyId: item.propertyId || 'N/A',
      propertyType: item.productType || 'N/A',
      propertyLocation: item.location || 'N/A',
      price: 'N/A',
      areaDetails: 'N/A',
      status: item.caseStatus || 'pending',
      createdAt: item.createdAt,
      assignment: item.assignment || null,
      enquiryType: 'ManualInquiry',
      source: 'manual',
      // Additional manual enquiry fields
      s_No: item.s_No,
      ClientCode: item.ClientCode,
      ProjectCode: item.ProjectCode,
      date: item.date,
      majorComments: item.majorComments,
      address: item.address,
      weekOrActionTaken: item.weekOrActionTaken,
      actionPlan: item.actionPlan,
      referenceBy: item.referenceBy,
      sourceType: item.source,
    }));
    
    return {
      success: true,
      data: normalizedData,
    };
  } catch (error) {
    console.error('Error fetching manual enquiries:', error);
    return {
      success: false,
      message: error.message,
      data: [],
    };
  }
};

/**
 * Fetch and merge all enquiries
 */
export const getAllEnquiriesMerged = async () => {
  try {
    // Fetch both types in parallel
    const [clientResult, manualResult] = await Promise.all([
      getClientEnquiries(),
      getManualEnquiries(),
    ]);
    
    const allEnquiries = [
      ...(clientResult.data || []),
      ...(manualResult.data || []),
    ];
    
    // Sort by createdAt DESC
    allEnquiries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return {
      success: true,
      data: allEnquiries,
      stats: {
        total: allEnquiries.length,
        client: clientResult.data?.length || 0,
        manual: manualResult.data?.length || 0,
      },
    };
  } catch (error) {
    console.error('Error fetching all enquiries:', error);
    return {
      success: false,
      message: error.message,
      data: [],
      stats: { total: 0, client: 0, manual: 0 },
    };
  }
};

/**
 * Create new manual enquiry
 */
export const createManualEnquiry = async (enquiryData) => {
  try {
    const response = await fetch(`${BASE_URL}/api/inquiry/create`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(enquiryData),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to create enquiry');
    }
    
    return {
      success: true,
      message: data.message || 'Enquiry created successfully',
      data: data.data,
    };
  } catch (error) {
    console.error('Error creating enquiry:', error);
    return {
      success: false,
      message: error.message,
    };
  }
};