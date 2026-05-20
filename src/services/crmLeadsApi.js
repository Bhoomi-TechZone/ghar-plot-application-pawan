import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const API_BASE_URL = 'https://your-backend-url.com/api/v1';

// Helper function to get authentication headers
const getCRMAuthHeaders = async () => {
  try {
    const token = await AsyncStorage.getItem('jwtToken');
    const userType = await AsyncStorage.getItem('userType');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-User-Type': userType || 'admin',
    };
  } catch (error) {
    console.error('Error getting auth headers:', error);
    throw new Error('Authentication failed');
  }
};

// Helper function to handle API responses
const handleCRMResponse = async (response) => {
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || `HTTP error! status: ${response.status}`);
  }
  
  return data;
};

// Generate dummy leads data for fallback
const generateDummyLeads = () => {
  const names = ['Rajesh Kumar', 'Priya Sharma', 'Amit Patel', 'Sunita Singh', 'Vijay Gupta', 'Kavya Reddy', 'Rohit Jain', 'Neha Agarwal', 'Sanjay Mehta', 'Pooja Chopra'];
  const sources = ['website', 'phone', 'referral', 'social', 'advertisement', 'walkin'];
  const statuses = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'converted', 'lost'];
  const priorities = ['high', 'medium', 'low'];
  const requirements = [
    '2BHK apartment in Baner',
    '3BHK house with parking',
    'Commercial space for office',
    'Plot for construction',
    '1BHK for investment',
    'Luxury villa with garden',
    'Studio apartment near IT hub',
    'Duplex with terrace',
    'Shop in market area',
    'Warehouse facility'
  ];

  return Array.from({ length: 50 }, (_, index) => ({
    id: index + 1,
    name: names[index % names.length],
    email: `lead${index + 1}@example.com`,
    phone: `+91${Math.floor(Math.random() * 9000000000) + 1000000000}`,
    source: sources[Math.floor(Math.random() * sources.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    priority: priorities[Math.floor(Math.random() * priorities.length)],
    budget: Math.floor(Math.random() * 10000000) + 1000000,
    requirements: requirements[index % requirements.length],
    notes: `Follow-up notes for ${names[index % names.length]}. Interested in ${requirements[index % requirements.length]}.`,
    assignedEmployee: index % 3 === 0 ? null : `Employee ${(index % 5) + 1}`,
    assignedEmployeeId: index % 3 === 0 ? null : (index % 5) + 1,
    createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    lastContactDate: index % 2 === 0 ? new Date(Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000).toISOString() : null,
    nextFollowUp: new Date(Date.now() + Math.floor(Math.random() * 14) * 24 * 60 * 60 * 1000).toISOString(),
  }));
};

/**
 * Get paginated leads with optional filters
 */
export const getLeadsWithPagination = async (params = {}) => {
  try {
    const { page = 1, limit = 15, status, priority, source, search } = params;
    
    // For demo purposes, return dummy data
    const allLeads = generateDummyLeads();
    let filteredLeads = [...allLeads];
    
    // Apply filters
    if (status && status !== 'all') {
      filteredLeads = filteredLeads.filter(lead => lead.status === status);
    }
    
    if (priority && priority !== 'all') {
      filteredLeads = filteredLeads.filter(lead => lead.priority === priority);
    }
    
    if (source && source !== 'all') {
      filteredLeads = filteredLeads.filter(lead => lead.source === source);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredLeads = filteredLeads.filter(lead =>
        lead.name.toLowerCase().includes(searchLower) ||
        lead.email.toLowerCase().includes(searchLower) ||
        lead.phone.includes(search) ||
        (lead.notes && lead.notes.toLowerCase().includes(searchLower))
      );
    }
    
    // Pagination
    const totalLeads = filteredLeads.length;
    const totalPages = Math.ceil(totalLeads / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedLeads = filteredLeads.slice(startIndex, endIndex);
    
    /*
    // Actual API call (uncomment when backend is ready)
    const headers = await getCRMAuthHeaders();
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(status && { status }),
      ...(priority && { priority }),
      ...(source && { source }),
      ...(search && { search }),
    });
    
    const response = await fetch(`${API_BASE_URL}/leads?${queryParams}`, {
      method: 'GET',
      headers,
    });
    
    return await handleCRMResponse(response);
    */
    
    return {
      leads: paginatedLeads,
      totalLeads,
      totalPages,
      currentPage: page,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  } catch (error) {
    console.error('Error fetching leads:', error);
    // Return dummy data as fallback
    const allLeads = generateDummyLeads();
    return {
      leads: allLeads.slice(0, params.limit || 15),
      totalLeads: allLeads.length,
      totalPages: Math.ceil(allLeads.length / (params.limit || 15)),
      currentPage: 1,
      limit: params.limit || 15,
      hasNextPage: false,
      hasPrevPage: false,
    };
  }
};

/**
 * Get lead by ID
 */
export const getLeadById = async (leadId) => {
  try {
    /*
    // Actual API call (uncomment when backend is ready)
    const headers = await getCRMAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/leads/${leadId}`, {
      method: 'GET',
      headers,
    });
    
    return await handleCRMResponse(response);
    */
    
    // For demo purposes, return dummy data
    const allLeads = generateDummyLeads();
    const lead = allLeads.find(l => l.id === parseInt(leadId));
    
    if (!lead) {
      throw new Error('Lead not found');
    }
    
    return { lead };
  } catch (error) {
    console.error('Error fetching lead:', error);
    throw error;
  }
};

/**
 * Create new lead
 */
export const createLead = async (leadData) => {
  try {
    /*
    // Actual API call (uncomment when backend is ready)
    const headers = await getCRMAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/leads`, {
      method: 'POST',
      headers,
      body: JSON.stringify(leadData),
    });
    
    return await handleCRMResponse(response);
    */
    
    // For demo purposes, return success response
    const newLead = {
      id: Date.now(),
      ...leadData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    return { lead: newLead, message: 'Lead created successfully' };
  } catch (error) {
    console.error('Error creating lead:', error);
    throw error;
  }
};

/**
 * Update lead
 */
export const updateLead = async (leadId, updateData) => {
  try {
    /*
    // Actual API call (uncomment when backend is ready)
    const headers = await getCRMAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/leads/${leadId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updateData),
    });
    
    return await handleCRMResponse(response);
    */
    
    // For demo purposes, return success response
    const updatedLead = {
      id: leadId,
      ...updateData,
      updatedAt: new Date().toISOString(),
    };
    
    return { lead: updatedLead, message: 'Lead updated successfully' };
  } catch (error) {
    console.error('Error updating lead:', error);
    throw error;
  }
};

/**
 * Delete lead
 */
export const deleteLead = async (leadId) => {
  try {
    /*
    // Actual API call (uncomment when backend is ready)
    const headers = await getCRMAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/leads/${leadId}`, {
      method: 'DELETE',
      headers,
    });
    
    return await handleCRMResponse(response);
    */
    
    // For demo purposes, return success response
    return { message: 'Lead deleted successfully' };
  } catch (error) {
    console.error('Error deleting lead:', error);
    throw error;
  }
};

/**
 * Assign lead to employee
 */
export const assignLeadToEmployee = async (leadId, employeeId) => {
  try {
    /*
    // Actual API call (uncomment when backend is ready)
    const headers = await getCRMAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/leads/${leadId}/assign`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ employeeId }),
    });
    
    return await handleCRMResponse(response);
    */
    
    // For demo purposes, return success response
    return { 
      message: 'Lead assigned successfully',
      leadId,
      employeeId
    };
  } catch (error) {
    console.error('Error assigning lead:', error);
    throw error;
  }
};

/**
 * Update lead status
 */
export const updateLeadStatus = async (leadId, status, notes = '') => {
  try {
    /*
    // Actual API call (uncomment when backend is ready)
    const headers = await getCRMAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/leads/${leadId}/status`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ status, notes }),
    });
    
    return await handleCRMResponse(response);
    */
    
    // For demo purposes, return success response
    return { 
      message: 'Lead status updated successfully',
      leadId,
      status,
      updatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error updating lead status:', error);
    throw error;
  }
};

/**
 * Get lead statistics
 */
export const getLeadStats = async () => {
  try {
    /*
    // Actual API call (uncomment when backend is ready)
    const headers = await getCRMAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/leads/stats`, {
      method: 'GET',
      headers,
    });
    
    return await handleCRMResponse(response);
    */
    
    // For demo purposes, return dummy stats
    return {
      totalLeads: 150,
      newLeads: 25,
      qualifiedLeads: 45,
      convertedLeads: 30,
      lostLeads: 15,
      conversionRate: 20.0,
      avgResponseTime: 2.5,
      leadsThisMonth: 40,
      leadsLastMonth: 35,
      monthlyGrowth: 14.3,
      topSources: [
        { source: 'Website', count: 50, percentage: 33.3 },
        { source: 'Referral', count: 35, percentage: 23.3 },
        { source: 'Social Media', count: 30, percentage: 20.0 },
        { source: 'Advertisement', count: 20, percentage: 13.3 },
        { source: 'Phone', count: 15, percentage: 10.0 },
      ],
      statusDistribution: [
        { status: 'New', count: 25, percentage: 16.7 },
        { status: 'Contacted', count: 35, percentage: 23.3 },
        { status: 'Qualified', count: 45, percentage: 30.0 },
        { status: 'Proposal', count: 20, percentage: 13.3 },
        { status: 'Negotiation', count: 10, percentage: 6.7 },
        { status: 'Converted', count: 30, percentage: 20.0 },
        { status: 'Lost', count: 15, percentage: 10.0 },
      ],
      priorityDistribution: [
        { priority: 'High', count: 45, percentage: 30.0 },
        { priority: 'Medium', count: 75, percentage: 50.0 },
        { priority: 'Low', count: 30, percentage: 20.0 },
      ],
    };
  } catch (error) {
    console.error('Error fetching lead stats:', error);
    // Return dummy data as fallback
    return {
      totalLeads: 0,
      newLeads: 0,
      qualifiedLeads: 0,
      convertedLeads: 0,
      lostLeads: 0,
      conversionRate: 0,
      avgResponseTime: 0,
      leadsThisMonth: 0,
      leadsLastMonth: 0,
      monthlyGrowth: 0,
      topSources: [],
      statusDistribution: [],
      priorityDistribution: [],
    };
  }
};

/**
 * Search leads
 */
export const searchLeads = async (query, filters = {}) => {
  try {
    /*
    // Actual API call (uncomment when backend is ready)
    const headers = await getCRMAuthHeaders();
    const queryParams = new URLSearchParams({
      q: query,
      ...filters,
    });
    
    const response = await fetch(`${API_BASE_URL}/leads/search?${queryParams}`, {
      method: 'GET',
      headers,
    });
    
    return await handleCRMResponse(response);
    */
    
    // For demo purposes, filter dummy data
    const allLeads = generateDummyLeads();
    const searchLower = query.toLowerCase();
    
    const filteredLeads = allLeads.filter(lead =>
      lead.name.toLowerCase().includes(searchLower) ||
      lead.email.toLowerCase().includes(searchLower) ||
      lead.phone.includes(query) ||
      (lead.notes && lead.notes.toLowerCase().includes(searchLower)) ||
      (lead.requirements && lead.requirements.toLowerCase().includes(searchLower))
    );
    
    return {
      leads: filteredLeads,
      totalResults: filteredLeads.length,
      query,
    };
  } catch (error) {
    console.error('Error searching leads:', error);
    throw error;
  }
};

/**
 * Bulk assign leads to employee
 */
export const bulkAssignLeads = async ({ leadIds, employeeId }) => {
  try {
    /*
    // Actual API call (uncomment when backend is ready)
    const headers = await getCRMAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/leads/bulk-assign`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ leadIds, employeeId }),
    });
    
    return await handleCRMResponse(response);
    */
    
    // For demo purposes, return success response
    return { 
      message: `${leadIds.length} leads assigned successfully`,
      assignedLeads: leadIds.length,
      employeeId,
    };
  } catch (error) {
    console.error('Error bulk assigning leads:', error);
    throw error;
  }
};

/**
 * Get lead conversion data for analytics
 */
export const getLeadConversionData = async (period = '30days') => {
  try {
    /*
    // Actual API call (uncomment when backend is ready)
    const headers = await getCRMAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/leads/conversion-data?period=${period}`, {
      method: 'GET',
      headers,
    });
    
    return await handleCRMResponse(response);
    */
    
    // For demo purposes, return dummy conversion data
    const dailyData = Array.from({ length: 30 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - index));
      
      return {
        date: date.toISOString().split('T')[0],
        newLeads: Math.floor(Math.random() * 10) + 1,
        convertedLeads: Math.floor(Math.random() * 3),
        conversionRate: ((Math.floor(Math.random() * 3) / (Math.floor(Math.random() * 10) + 1)) * 100).toFixed(2),
      };
    });
    
    return {
      period,
      dailyData,
      totalNewLeads: dailyData.reduce((sum, day) => sum + day.newLeads, 0),
      totalConvertedLeads: dailyData.reduce((sum, day) => sum + day.convertedLeads, 0),
      averageConversionRate: (
        dailyData.reduce((sum, day) => sum + parseFloat(day.conversionRate), 0) / dailyData.length
      ).toFixed(2),
    };
  } catch (error) {
    console.error('Error fetching conversion data:', error);
    // Return dummy data as fallback
    return {
      period,
      dailyData: [],
      totalNewLeads: 0,
      totalConvertedLeads: 0,
      averageConversionRate: '0.00',
    };
  }
};

/**
 * Export leads data
 */
export const exportLeadsData = async (format = 'csv', filters = {}) => {
  try {
    /*
    // Actual API call (uncomment when backend is ready)
    const headers = await getCRMAuthHeaders();
    const queryParams = new URLSearchParams({
      format,
      ...filters,
    });
    
    const response = await fetch(`${API_BASE_URL}/leads/export?${queryParams}`, {
      method: 'GET',
      headers,
    });
    
    if (response.ok) {
      const blob = await response.blob();
      return { blob, filename: `leads_export_${new Date().getTime()}.${format}` };
    }
    
    throw new Error('Export failed');
    */
    
    // For demo purposes, return success message
    return { 
      message: `Leads data exported successfully as ${format.toUpperCase()}`,
      exportFormat: format,
      recordCount: 150,
    };
  } catch (error) {
    console.error('Error exporting leads:', error);
    throw error;
  }
};

/**
 * Get leads requiring follow-up
 */
export const getFollowUpLeads = async () => {
  try {
    /*
    // Actual API call (uncomment when backend is ready)
    const headers = await getCRMAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/leads/follow-up`, {
      method: 'GET',
      headers,
    });
    
    return await handleCRMResponse(response);
    */
    
    // For demo purposes, return dummy follow-up leads
    const allLeads = generateDummyLeads();
    const followUpLeads = allLeads
      .filter(lead => lead.nextFollowUp && new Date(lead.nextFollowUp) <= new Date())
      .slice(0, 10);
    
    return {
      leads: followUpLeads,
      totalFollowUps: followUpLeads.length,
      overdueFollowUps: followUpLeads.filter(lead => 
        new Date(lead.nextFollowUp) < new Date()
      ).length,
    };
  } catch (error) {
    console.error('Error fetching follow-up leads:', error);
    throw error;
  }
};

export default {
  getLeadsWithPagination,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  assignLeadToEmployee,
  updateLeadStatus,
  getLeadStats,
  searchLeads,
  bulkAssignLeads,
  getLeadConversionData,
  exportLeadsData,
  getFollowUpLeads,
};
