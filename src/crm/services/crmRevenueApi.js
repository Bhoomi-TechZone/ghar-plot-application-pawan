import { CRM_BASE_URL, getCRMAuthHeaders, handleCRMResponse } from './crmAPI';

/**
 * Get comprehensive revenue analytics
 */
export const getRevenueAnalytics = async (period = 'monthly') => {
  try {
    console.log('📊 getRevenueAnalytics - Period:', period);
    
    const url = `${CRM_BASE_URL}/api/revenue/analytics?period=${period}`;
    
    const headers = await getCRMAuthHeaders();
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    const data = await handleCRMResponse(response);
    console.log('✅ Revenue Analytics Response:', JSON.stringify(data, null, 2));

    return {
      totalRevenue: data.totalRevenue || 0,
      residentialRevenue: data.residentialRevenue || 0,
      commercialRevenue: data.commercialRevenue || 0,
      averageDealSize: data.averageDealSize || 0,
      totalDeals: data.totalDeals || 0,
      growth: data.growth || {},
      trends: data.trends || [],
      insights: data.insights || {},
    };
  } catch (error) {
    console.error('❌ getRevenueAnalytics Error:', error);
    
    // Return dummy data for development
    return {
      totalRevenue: 15750000,
      residentialRevenue: 12500000,
      commercialRevenue: 3250000,
      averageDealSize: 2500000,
      totalDeals: 6,
      growth: {
        total: 12.5,
        residential: 15.2,
        commercial: 8.3,
        average: 5.7,
      },
      trends: [],
      insights: {
        topPerformingType: 'Residential',
        bestMonth: 'December',
        worstMonth: 'October',
      },
    };
  }
};

/**
 * Get revenue statistics summary
 */
export const getRevenueStats = async () => {
  try {
    console.log('📈 getRevenueStats');
    
    const url = `${CRM_BASE_URL}/api/revenue/stats`;
    
    const headers = await getCRMAuthHeaders();
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    const data = await handleCRMResponse(response);
    console.log('✅ Revenue Stats Response:', JSON.stringify(data, null, 2));

    return {
      totalRevenue: data.totalRevenue || 0,
      residentialRevenue: data.residentialRevenue || 0,
      commercialRevenue: data.commercialRevenue || 0,
      averageDealSize: data.averageDealSize || 0,
      totalGrowth: data.totalGrowth || 0,
      residentialGrowth: data.residentialGrowth || 0,
      commercialGrowth: data.commercialGrowth || 0,
      averageGrowth: data.averageGrowth || 0,
      insights: data.insights || {},
    };
  } catch (error) {
    console.error('❌ getRevenueStats Error:', error);
    
    // Return dummy data
    return {
      totalRevenue: 15750000,
      residentialRevenue: 12500000,
      commercialRevenue: 3250000,
      averageDealSize: 2500000,
      totalGrowth: 12.5,
      residentialGrowth: 15.2,
      commercialGrowth: 8.3,
      averageGrowth: 5.7,
      insights: {
        topPerformingType: 'Residential',
      },
    };
  }
};

/**
 * Get monthly revenue data for charts
 */
export const getMonthlyRevenue = async () => {
  try {
    console.log('📅 getMonthlyRevenue');
    
    const url = `${CRM_BASE_URL}/api/revenue/monthly`;
    
    const headers = await getCRMAuthHeaders();
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    const data = await handleCRMResponse(response);
    console.log('✅ Monthly Revenue Response:', JSON.stringify(data, null, 2));

    return data.monthlyRevenue || [];
  } catch (error) {
    console.error('❌ getMonthlyRevenue Error:', error);
    
    // Return dummy data for chart
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map((month, index) => ({
      month,
      totalRevenue: Math.random() * 5000000 + 1000000,
      residentialRevenue: Math.random() * 3000000 + 500000,
      commercialRevenue: Math.random() * 2000000 + 300000,
    }));
  }
};

/**
 * Get daily revenue data
 */
export const getDailyRevenue = async (days = 30) => {
  try {
    console.log('📊 getDailyRevenue - Days:', days);
    
    const url = `${CRM_BASE_URL}/api/revenue/daily?days=${days}`;
    
    const headers = await getCRMAuthHeaders();
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    const data = await handleCRMResponse(response);
    console.log('✅ Daily Revenue Response:', JSON.stringify(data, null, 2));

    return data.dailyRevenue || [];
  } catch (error) {
    console.error('❌ getDailyRevenue Error:', error);
    
    // Return dummy daily data
    const dailyData = [];
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dailyData.push({
        date: date.toISOString().split('T')[0],
        totalRevenue: Math.random() * 200000 + 50000,
        residentialRevenue: Math.random() * 120000 + 30000,
        commercialRevenue: Math.random() * 80000 + 20000,
      });
    }
    return dailyData;
  }
};

/**
 * Get revenue by property type
 */
export const getRevenueByType = async () => {
  try {
    console.log('🏠 getRevenueByType');
    
    const url = `${CRM_BASE_URL}/api/revenue/by-type`;
    
    const headers = await getCRMAuthHeaders();
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    const data = await handleCRMResponse(response);
    console.log('✅ Revenue By Type Response:', JSON.stringify(data, null, 2));

    return data.typeBreakdown || [];
  } catch (error) {
    console.error('❌ getRevenueByType Error:', error);
    
    // Return dummy type data
    return [
      {
        type: 'Residential',
        revenue: 12500000,
        percentage: 79.4,
        deals: 5,
      },
      {
        type: 'Commercial',
        revenue: 3250000,
        percentage: 20.6,
        deals: 1,
      },
    ];
  }
};

/**
 * Get revenue forecasting data
 */
export const getRevenueForecast = async (months = 6) => {
  try {
    console.log('🔮 getRevenueForecast - Months:', months);
    
    const url = `${CRM_BASE_URL}/api/revenue/forecast?months=${months}`;
    
    const headers = await getCRMAuthHeaders();
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    const data = await handleCRMResponse(response);
    console.log('✅ Revenue Forecast Response:', JSON.stringify(data, null, 2));

    return data.forecast || [];
  } catch (error) {
    console.error('❌ getRevenueForecast Error:', error);
    
    // Return dummy forecast data
    const forecast = [];
    const baseRevenue = 2500000;
    for (let i = 1; i <= months; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() + i);
      forecast.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        year: date.getFullYear(),
        predictedRevenue: baseRevenue * (1 + Math.random() * 0.4),
        confidence: 0.75 + Math.random() * 0.2,
      });
    }
    return forecast;
  }
};

/**
 * Export revenue report
 */
export const exportRevenueReport = async (format = 'pdf', period = 'monthly') => {
  try {
    console.log('📥 exportRevenueReport - Format:', format, 'Period:', period);
    
    const url = `${CRM_BASE_URL}/api/revenue/export?format=${format}&period=${period}`;
    
    const headers = await getCRMAuthHeaders();
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error('Failed to export revenue report');
    }

    const blob = await response.blob();
    console.log('✅ Revenue Report Exported');

    return {
      success: true,
      blob,
      filename: `revenue_report_${period}_${new Date().toISOString().split('T')[0]}.${format}`,
    };
  } catch (error) {
    console.error('❌ exportRevenueReport Error:', error);
    return {
      success: false,
      message: error.message || 'Failed to export revenue report',
    };
  }
};