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

/**
 * Get dashboard analytics data
 */
export const getDashboardAnalytics = async (period = '30days') => {
  try {
    /*
    // Actual API call (uncomment when backend is ready)
    const headers = await getCRMAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/dashboard/analytics?period=${period}`, {
      method: 'GET',
      headers,
    });
    
    return await handleCRMResponse(response);
    */
    
    // For demo purposes, return dummy data
    const generateChartData = (days) => {
      const data = [];
      const labels = [];
      const currentDate = new Date();
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(currentDate);
        date.setDate(date.getDate() - i);
        
        labels.push(date.toLocaleDateString('en', { 
          month: 'short', 
          day: 'numeric' 
        }));
        
        // Generate realistic data patterns
        const baseValue = 50000;
        const variation = Math.random() * 20000 - 10000;
        const trend = (days - i) * 1000; // Slight upward trend
        data.push(Math.max(0, Math.floor(baseValue + variation + trend)));
      }
      
      return { labels, data };
    };

    const periodDays = {
      '7days': 7,
      '30days': 30,
      '90days': 90,
      '1year': 365,
    };

    const chartData = generateChartData(periodDays[period] || 30);

    return {
      totalRevenue: 2450000,
      revenueGrowth: 15.2,
      totalLeads: 348,
      leadsGrowth: 8.7,
      activeProperties: 125,
      propertiesGrowth: 5.3,
      conversionRate: 18.5,
      conversionGrowth: 2.1,
      chartData,
      period,
    };
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    throw error;
  }
};

/**
 * Get dashboard statistics
 */
export const getDashboardStats = async (period = '30days') => {
  try {
    /*
    // Actual API call (uncomment when backend is ready)
    const headers = await getCRMAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/dashboard/stats?period=${period}`, {
      method: 'GET',
      headers,
    });
    
    return await handleCRMResponse(response);
    */
    
    // For demo purposes, return dummy stats
    return {
      totalRevenue: 2450000,
      revenueGrowth: 15.2,
      activeLeads: 89,
      leadsGrowth: 12.3,
      propertiesSold: 23,
      salesGrowth: 8.7,
      conversionRate: 18.5,
      conversionGrowth: 2.1,
      
      // Performance targets
      revenueTargetProgress: 0.78, // 78% of target achieved
      leadTargetProgress: 0.65,    // 65% of target achieved
      salesTargetProgress: 0.82,   // 82% of target achieved
      satisfactionScore: 0.91,     // 91% customer satisfaction
      
      // Recent activities
      recentActivities: [
        {
          id: 1,
          type: 'lead_created',
          message: 'New lead from website: Rajesh Kumar',
          timestamp: new Date().toISOString(),
        },
        {
          id: 2,
          type: 'property_sold',
          message: 'Property sold: 2BHK in Baner',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 3,
          type: 'lead_converted',
          message: 'Lead converted: Priya Sharma',
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 4,
          type: 'employee_login',
          message: 'Sales Executive logged in',
          timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        },
      ],
      
      // Top performing metrics
      topPerformers: {
        employees: [
          { name: 'Amit Sharma', sales: 12, revenue: 580000 },
          { name: 'Priya Gupta', sales: 10, revenue: 520000 },
          { name: 'Raj Patel', sales: 8, revenue: 450000 },
        ],
        properties: [
          { name: '2BHK Baner', views: 245, inquiries: 23 },
          { name: '3BHK Wakad', views: 198, inquiries: 18 },
          { name: '1BHK Hinjewadi', views: 156, inquiries: 15 },
        ],
        sources: [
          { source: 'Website', leads: 45, percentage: 32.1 },
          { source: 'Referral', leads: 38, percentage: 27.1 },
          { source: 'Social Media', leads: 28, percentage: 20.0 },
        ],
      },
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    // Return minimal data as fallback
    return {
      totalRevenue: 0,
      revenueGrowth: 0,
      activeLeads: 0,
      leadsGrowth: 0,
      propertiesSold: 0,
      salesGrowth: 0,
      conversionRate: 0,
      conversionGrowth: 0,
      recentActivities: [],
      topPerformers: {
        employees: [],
        properties: [],
        sources: [],
      },
    };
  }
};

/**
 * Get real-time dashboard updates
 */
export const getDashboardUpdates = async () => {
  try {
    /*
    // Actual API call (uncomment when backend is ready)
    const headers = await getCRMAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/dashboard/updates`, {
      method: 'GET',
      headers,
    });
    
    return await handleCRMResponse(response);
    */
    
    // For demo purposes, return dummy updates
    return {
      notifications: [
        {
          id: 1,
          type: 'urgent',
          title: 'Follow-up Required',
          message: '5 leads need immediate follow-up',
          timestamp: new Date().toISOString(),
        },
        {
          id: 2,
          type: 'info',
          title: 'Monthly Target',
          message: 'Revenue target 78% achieved',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        },
      ],
      alerts: [
        {
          id: 1,
          severity: 'high',
          message: 'Low inventory in Baner area',
          action: 'Add more properties',
        },
        {
          id: 2,
          severity: 'medium',
          message: 'Lead response time increasing',
          action: 'Review assignment strategy',
        },
      ],
      systemStatus: {
        apiHealth: 'healthy',
        databaseStatus: 'operational',
        lastBackup: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        activeUsers: 12,
      },
    };
  } catch (error) {
    console.error('Error fetching dashboard updates:', error);
    return {
      notifications: [],
      alerts: [],
      systemStatus: {
        apiHealth: 'unknown',
        databaseStatus: 'unknown',
        lastBackup: null,
        activeUsers: 0,
      },
    };
  }
};

/**
 * Get sales funnel data
 */
export const getSalesFunnelData = async (period = '30days') => {
  try {
    /*
    // Actual API call (uncomment when backend is ready)
    const headers = await getCRMAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/dashboard/sales-funnel?period=${period}`, {
      method: 'GET',
      headers,
    });
    
    return await handleCRMResponse(response);
    */
    
    // For demo purposes, return dummy funnel data
    return {
      stages: [
        { name: 'Visitors', count: 2500, percentage: 100 },
        { name: 'Leads', count: 350, percentage: 14 },
        { name: 'Qualified', count: 175, percentage: 7 },
        { name: 'Proposals', count: 87, percentage: 3.5 },
        { name: 'Negotiations', count: 43, percentage: 1.7 },
        { name: 'Closed', count: 25, percentage: 1 },
      ],
      conversionRates: {
        visitorToLead: 14.0,
        leadToQualified: 50.0,
        qualifiedToProposal: 49.7,
        proposalToNegotiation: 49.4,
        negotiationToClosed: 58.1,
      },
      period,
      totalRevenue: 1250000,
      avgDealSize: 50000,
      salesCycle: 45, // days
    };
  } catch (error) {
    console.error('Error fetching sales funnel data:', error);
    return {
      stages: [],
      conversionRates: {},
      period,
      totalRevenue: 0,
      avgDealSize: 0,
      salesCycle: 0,
    };
  }
};

/**
 * Get team performance data
 */
export const getTeamPerformance = async (period = '30days') => {
  try {
    /*
    // Actual API call (uncomment when backend is ready)
    const headers = await getCRMAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/dashboard/team-performance?period=${period}`, {
      method: 'GET',
      headers,
    });
    
    return await handleCRMResponse(response);
    */
    
    // For demo purposes, return dummy team data
    return {
      teamStats: {
        totalEmployees: 15,
        activeEmployees: 12,
        topPerformers: 3,
        avgPerformance: 78.5,
      },
      employeeMetrics: [
        {
          id: 1,
          name: 'Amit Sharma',
          role: 'Sales Executive',
          leadsAssigned: 45,
          leadsConverted: 12,
          revenue: 580000,
          conversionRate: 26.7,
          performance: 92,
        },
        {
          id: 2,
          name: 'Priya Gupta',
          role: 'Sales Executive',
          leadsAssigned: 38,
          leadsConverted: 10,
          revenue: 520000,
          conversionRate: 26.3,
          performance: 89,
        },
        {
          id: 3,
          name: 'Raj Patel',
          role: 'Sales Manager',
          leadsAssigned: 32,
          leadsConverted: 8,
          revenue: 450000,
          conversionRate: 25.0,
          performance: 85,
        },
      ],
      departmentStats: [
        { department: 'Sales', target: 2000000, achieved: 1560000, percentage: 78 },
        { department: 'Marketing', target: 500, achieved: 425, percentage: 85 },
        { department: 'Support', target: 95, achieved: 92, percentage: 96.8 },
      ],
      period,
    };
  } catch (error) {
    console.error('Error fetching team performance:', error);
    return {
      teamStats: {
        totalEmployees: 0,
        activeEmployees: 0,
        topPerformers: 0,
        avgPerformance: 0,
      },
      employeeMetrics: [],
      departmentStats: [],
      period,
    };
  }
};

/**
 * Get property analytics
 */
export const getPropertyAnalytics = async (period = '30days') => {
  try {
    /*
    // Actual API call (uncomment when backend is ready)
    const headers = await getCRMAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/dashboard/property-analytics?period=${period}`, {
      method: 'GET',
      headers,
    });
    
    return await handleCRMResponse(response);
    */
    
    // For demo purposes, return dummy property data
    return {
      totalProperties: 245,
      availableProperties: 198,
      soldProperties: 47,
      avgPrice: 4500000,
      priceGrowth: 8.5,
      
      propertyTypes: [
        { type: '2BHK', count: 85, avgPrice: 3500000, demand: 'high' },
        { type: '3BHK', count: 72, avgPrice: 5200000, demand: 'medium' },
        { type: '1BHK', count: 45, avgPrice: 2800000, demand: 'high' },
        { type: '4BHK+', count: 25, avgPrice: 8500000, demand: 'low' },
        { type: 'Commercial', count: 18, avgPrice: 6200000, demand: 'medium' },
      ],
      
      locationStats: [
        { area: 'Baner', properties: 45, avgPrice: 4800000, sales: 12 },
        { area: 'Wakad', properties: 38, avgPrice: 4200000, sales: 10 },
        { area: 'Hinjewadi', properties: 32, avgPrice: 3900000, sales: 8 },
        { area: 'Kharadi', properties: 28, avgPrice: 5100000, sales: 7 },
        { area: 'Viman Nagar', properties: 25, avgPrice: 5800000, sales: 6 },
      ],
      
      monthlyTrends: Array.from({ length: 12 }, (_, index) => {
        const month = new Date();
        month.setMonth(month.getMonth() - (11 - index));
        
        return {
          month: month.toLocaleDateString('en', { month: 'short', year: '2-digit' }),
          listed: Math.floor(Math.random() * 20) + 10,
          sold: Math.floor(Math.random() * 15) + 5,
          avgPrice: Math.floor(Math.random() * 1000000) + 3500000,
        };
      }),
      
      period,
    };
  } catch (error) {
    console.error('Error fetching property analytics:', error);
    return {
      totalProperties: 0,
      availableProperties: 0,
      soldProperties: 0,
      avgPrice: 0,
      priceGrowth: 0,
      propertyTypes: [],
      locationStats: [],
      monthlyTrends: [],
      period,
    };
  }
};

/**
 * Export dashboard report
 */
export const exportDashboardReport = async (reportType = 'comprehensive', format = 'pdf') => {
  try {
    /*
    // Actual API call (uncomment when backend is ready)
    const headers = await getCRMAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/dashboard/export`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reportType, format }),
    });
    
    if (response.ok) {
      const blob = await response.blob();
      return { blob, filename: `dashboard_report_${new Date().getTime()}.${format}` };
    }
    
    throw new Error('Export failed');
    */
    
    // For demo purposes, return success message
    return {
      message: `Dashboard report exported successfully as ${format.toUpperCase()}`,
      reportType,
      format,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error exporting dashboard report:', error);
    throw error;
  }
};

export default {
  getDashboardAnalytics,
  getDashboardStats,
  getDashboardUpdates,
  getSalesFunnelData,
  getTeamPerformance,
  getPropertyAnalytics,
  exportDashboardReport,
};
