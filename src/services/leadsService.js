import AsyncStorage from '@react-native-async-storage/async-storage';

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

// Check if current user is admin
const isAdmin = async () => {
  try {
    const adminToken = await AsyncStorage.getItem('adminToken');
    return !!adminToken;
  } catch (error) {
    console.error('Error checking user type:', error);
    return false;
  }
};

// Generic API call function
const apiCall = async (endpoint, options = {}) => {
  try {
    const token = await getAuthToken();
    if (!token) {
      console.log('No authentication token found, using fallback data');
      return null;
    }

    const url = `${BASE_URL}${endpoint}`;
    console.log('Making API call to:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      ...options,
    });

    if (!response.ok) {
      console.log(`API call failed: ${response.status} - ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.log('API call error:', error.message);
    return null;
  }
};

// Leads Service Functions
export const leadsService = {
  // Get enquiry leads
  getEnquiryLeads: async (params = {}) => {
    try {
      const isAdminUser = await isAdmin();
      const endpoint = isAdminUser ? '/admin/leads/all' : '/employee/leads/my-leads';

      const queryString = new URLSearchParams(params).toString();
      const fullEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint;

      const data = await apiCall(fullEndpoint);

      if (data && data.success) {
        return {
          success: true,
          leads: data.data.assignments || [],
          totalPages: data.data.totalPages || 1,
          total: data.data.totalAssignments || 0
        };
      }
    } catch (error) {
      console.log('Error fetching enquiry leads:', error.message);
    }

    // Return fallback data
    return {
      success: false,
      leads: [],
      totalPages: 1,
      total: 0
    };
  },

  // Get client leads
  getClientLeads: async (params = {}) => {
    try {
      const isAdminUser = await isAdmin();
      const endpoint = isAdminUser ? '/admin/user-leads/all' : '/employee/user-leads/my-client-leads';

      const queryString = new URLSearchParams(params).toString();
      const fullEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint;

      const data = await apiCall(fullEndpoint);

      if (data && data.success) {
        return {
          success: true,
          leads: data.data.assignments || [],
          totalPages: data.data.pagination?.totalPages || 1,
          total: data.data.pagination?.total || 0
        };
      }
    } catch (error) {
      console.log('Error fetching client leads:', error.message);
    }

    // Return fallback data
    return {
      success: false,
      leads: [],
      totalPages: 1,
      total: 0
    };
  },

  // Get all leads (combined)
  getAllLeads: async (params = {}) => {
    try {
      console.log('Fetching all leads...');

      // Fetch both types in parallel
      const [enquiryResponse, clientResponse] = await Promise.all([
        leadsService.getEnquiryLeads(params),
        leadsService.getClientLeads(params)
      ]);

      // Transform enquiry leads
      const transformedEnquiry = enquiryResponse.leads.map(lead => ({
        ...lead,
        leadType: 'enquiry',
        clientName: lead.enquiry?.buyerId?.fullName || 'Unknown',
        clientPhone: lead.enquiry?.buyerId?.phone || 'N/A',
        clientEmail: lead.enquiry?.buyerId?.email || 'N/A',
        budget: lead.enquiry?.budget || 'Not specified',
        propertyType: lead.enquiry?.propertyId?.propertyType || 'N/A',
        propertyLocation: lead.enquiry?.propertyId?.propertyLocation || 'N/A',
        price: lead.enquiry?.propertyId?.price || 0
      }));

      // Transform client leads
      const transformedClient = clientResponse.leads.map(lead => ({
        ...lead,
        leadType: 'client',
        clientName: lead.userId?.fullName || 'Unknown',
        clientPhone: lead.userId?.phone || 'N/A',
        clientEmail: lead.userId?.email || 'N/A',
        budget: 'Not specified',
        propertyType: 'General',
        propertyLocation: `${lead.userId?.city || ''}, ${lead.userId?.state || ''}`.trim() || 'N/A',
        price: 0
      }));

      const allLeads = [...transformedEnquiry, ...transformedClient];

      const totalEnquiry = enquiryResponse.total;
      const totalClient = clientResponse.total;

      console.log('All leads fetched successfully:', {
        totalEnquiry,
        totalClient,
        totalLeads: allLeads.length
      });

      return {
        success: enquiryResponse.success || clientResponse.success,
        data: {
          leads: allLeads,
          stats: {
            totalLeads: allLeads.length,
            enquiryLeads: totalEnquiry,
            clientLeads: totalClient
          }
        }
      };

    } catch (error) {
      console.log('Error fetching all leads:', error.message);

      // Return fallback data
      return {
        success: false,
        data: {
          leads: [],
          stats: {
            totalLeads: 0,
            enquiryLeads: 0,
            clientLeads: 0
          }
        }
      };
    }
  },

  // Update lead status
  updateLeadStatus: async (assignmentId, status, leadType = 'enquiry') => {
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const endpoint = leadType === 'enquiry'
        ? `/employee/leads/status/${assignmentId}`
        : `/employee/user-leads/status/${assignmentId}`;

      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        throw new Error(`Status update failed: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };

    } catch (error) {
      console.log('Error updating lead status:', error.message);
      return { success: false, error: error.message };
    }
  },

  // Search leads
  searchLeads: async (searchQuery, leads) => {
    if (!searchQuery.trim()) {
      return leads;
    }

    const query = searchQuery.toLowerCase();
    return leads.filter(lead =>
      lead.clientName.toLowerCase().includes(query) ||
      lead.clientPhone.includes(query) ||
      lead.clientEmail.toLowerCase().includes(query) ||
      lead.propertyLocation.toLowerCase().includes(query) ||
      lead.status.toLowerCase().includes(query)
    );
  }
};

export default leadsService;
