import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { LineChart, BarChart, PieChart, ProgressChart } from 'react-native-chart-kit';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDashboardAnalytics, getDashboardStats } from '../../services/crmDashboardApi';
import { getRevenueAnalytics } from '../../services/crmRevenueApi';
import { getLeadStats, getLeadConversionData } from '../../services/crmLeadsApi';
import CrossPlatformAlert from '../../../utils/crossPlatformAlert';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const chartWidth = screenWidth - 32;

const AdvancedDashboardScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('30days');
  const [userRole, setUserRole] = useState('admin');
  
  // Data states
  const [dashboardData, setDashboardData] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [leadsData, setLeadsData] = useState(null);
  const [conversionData, setConversionData] = useState(null);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const chartFadeAnim = useRef(new Animated.Value(0)).current;

  const periods = [
    { label: '7 Days', value: '7days' },
    { label: '30 Days', value: '30days' },
    { label: '90 Days', value: '90days' },
    { label: '1 Year', value: '1year' },
  ];

  useEffect(() => {
    loadInitialData();
    checkUserRole();
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [selectedPeriod]);

  const checkUserRole = async () => {
    try {
      const role = await AsyncStorage.getItem('userRole') || 'admin';
      setUserRole(role);
    } catch (error) {
      console.error('Error getting user role:', error);
    }
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await loadDashboardData();
      
      // Start animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Animate charts with delay
      setTimeout(() => {
        Animated.timing(chartFadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }).start();
      }, 400);
    } catch (error) {
      console.error('Error loading initial data:', error);
      CrossPlatformAlert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      const [dashboard, revenue, leads, conversion] = await Promise.all([
        getDashboardStats(selectedPeriod),
        getRevenueAnalytics(selectedPeriod),
        getLeadStats(),
        getLeadConversionData(selectedPeriod),
      ]);

      setDashboardData(dashboard);
      setRevenueData(revenue);
      setLeadsData(leads);
      setConversionData(conversion);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadInitialData();
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    return `₹${Number(amount).toLocaleString()}`;
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getGrowthColor = (growth) => {
    if (growth > 0) return '#10B981';
    if (growth < 0) return '#EF4444';
    return '#64748B';
  };

  const renderQuickStats = () => {
    if (!dashboardData) return null;

    const stats = [
      {
        title: 'Total Revenue',
        value: formatCurrency(dashboardData.totalRevenue),
        change: dashboardData.revenueGrowth,
        icon: 'currency-inr',
        color: '#2563EB',
      },
      {
        title: 'Active Leads',
        value: formatNumber(dashboardData.activeLeads),
        change: dashboardData.leadsGrowth,
        icon: 'account-multiple',
        color: '#F59E0B',
      },
      {
        title: 'Properties Sold',
        value: formatNumber(dashboardData.propertiesSold),
        change: dashboardData.salesGrowth,
        icon: 'home-variant',
        color: '#10B981',
      },
      {
        title: 'Conversion Rate',
        value: `${dashboardData.conversionRate || 0}%`,
        change: dashboardData.conversionGrowth,
        icon: 'trending-up',
        color: '#8B5CF6',
      },
    ];

    return (
      <Animated.View 
        style={[
          styles.quickStatsContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text style={styles.sectionTitle}>Quick Stats</Text>
        <View style={styles.statsGrid}>
          {stats.map((stat, index) => (
            <Animated.View
              key={index}
              style={[
                styles.statCard,
                {
                  opacity: fadeAnim,
                  transform: [
                    {
                      translateY: slideAnim.interpolate({
                        inputRange: [0, 30],
                        outputRange: [0, 30 * (index + 1)],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={[styles.statIconContainer, { backgroundColor: stat.color + '20' }]}>
                <MaterialCommunityIcons 
                  name={stat.icon} 
                  size={24} 
                  color={stat.color} 
                />
              </View>
              
              <View style={styles.statContent}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statTitle}>{stat.title}</Text>
                
                <View style={styles.statChange}>
                  <MaterialCommunityIcons 
                    name={stat.change >= 0 ? 'trending-up' : 'trending-down'} 
                    size={16} 
                    color={getGrowthColor(stat.change)} 
                  />
                  <Text style={[styles.changeText, { color: getGrowthColor(stat.change) }]}>
                    {Math.abs(stat.change)}%
                  </Text>
                </View>
              </View>
            </Animated.View>
          ))}
        </View>
      </Animated.View>
    );
  };

  const renderRevenueChart = () => {
    if (!revenueData || !revenueData.chartData) return null;

    const chartData = {
      labels: revenueData.chartData.labels || [],
      datasets: [{
        data: revenueData.chartData.data || [],
        color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
        strokeWidth: 3,
      }],
    };

    return (
      <Animated.View 
        style={[
          styles.chartContainer,
          { opacity: chartFadeAnim },
        ]}
      >
        <Text style={styles.chartTitle}>Revenue Trend</Text>
        <Text style={styles.chartSubtitle}>
          Total: {formatCurrency(revenueData.totalRevenue)} 
          {revenueData.growth && (
            <Text style={{ color: getGrowthColor(revenueData.growth) }}>
              {' '}({revenueData.growth > 0 ? '+' : ''}{revenueData.growth}%)
            </Text>
          )}
        </Text>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <LineChart
            data={chartData}
            width={Math.max(chartWidth, chartData.labels.length * 60)}
            height={220}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#f8fafc',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(30, 41, 59, ${opacity})`,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: '6',
                strokeWidth: '2',
                stroke: '#2563EB',
              },
            }}
            bezier
            style={styles.chart}
          />
        </ScrollView>
      </Animated.View>
    );
  };

  const renderLeadsChart = () => {
    if (!leadsData || !leadsData.statusDistribution) return null;

    const chartData = leadsData.statusDistribution.map((item, index) => ({
      name: item.status,
      population: item.count,
      color: [
        '#3B82F6', '#F59E0B', '#10B981', 
        '#8B5CF6', '#EF4444', '#06B6D4', '#64748B'
      ][index % 7],
      legendFontColor: '#1E293B',
      legendFontSize: 12,
    }));

    return (
      <Animated.View 
        style={[
          styles.chartContainer,
          { opacity: chartFadeAnim },
        ]}
      >
        <Text style={styles.chartTitle}>Leads Distribution</Text>
        <Text style={styles.chartSubtitle}>
          Total Leads: {leadsData.totalLeads} | 
          Conversion Rate: {leadsData.conversionRate}%
        </Text>
        
        <PieChart
          data={chartData}
          width={chartWidth}
          height={220}
          chartConfig={{
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          }}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          style={styles.chart}
        />
      </Animated.View>
    );
  };

  const renderConversionChart = () => {
    if (!conversionData || !conversionData.dailyData) return null;

    const chartData = {
      labels: conversionData.dailyData.slice(-7).map(item => {
        const date = new Date(item.date);
        return date.toLocaleDateString('en', { weekday: 'short' });
      }),
      datasets: [
        {
          data: conversionData.dailyData.slice(-7).map(item => item.newLeads),
          color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
          strokeWidth: 2,
        },
        {
          data: conversionData.dailyData.slice(-7).map(item => item.convertedLeads),
          color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
          strokeWidth: 2,
        },
      ],
      legend: ['New Leads', 'Converted'],
    };

    return (
      <Animated.View 
        style={[
          styles.chartContainer,
          { opacity: chartFadeAnim },
        ]}
      >
        <Text style={styles.chartTitle}>Lead Conversion</Text>
        <Text style={styles.chartSubtitle}>
          Avg Conversion Rate: {conversionData.averageConversionRate}%
        </Text>
        
        <BarChart
          data={chartData}
          width={chartWidth}
          height={220}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#f8fafc',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(30, 41, 59, ${opacity})`,
            style: {
              borderRadius: 16,
            },
          }}
          style={styles.chart}
        />
      </Animated.View>
    );
  };

  const renderPerformanceIndicators = () => {
    if (!dashboardData) return null;

    const indicators = [
      {
        label: 'Revenue Target',
        progress: dashboardData.revenueTargetProgress || 0.75,
        color: '#2563EB',
      },
      {
        label: 'Lead Target',
        progress: dashboardData.leadTargetProgress || 0.60,
        color: '#F59E0B',
      },
      {
        label: 'Sales Target',
        progress: dashboardData.salesTargetProgress || 0.85,
        color: '#10B981',
      },
      {
        label: 'Customer Satisfaction',
        progress: dashboardData.satisfactionScore || 0.92,
        color: '#8B5CF6',
      },
    ];

    const progressData = {
      labels: indicators.map(item => item.label),
      data: indicators.map(item => item.progress),
    };

    return (
      <Animated.View 
        style={[
          styles.chartContainer,
          { opacity: chartFadeAnim },
        ]}
      >
        <Text style={styles.chartTitle}>Performance Indicators</Text>
        <Text style={styles.chartSubtitle}>Current period progress</Text>
        
        <ProgressChart
          data={progressData}
          width={chartWidth}
          height={220}
          strokeWidth={16}
          radius={32}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#f8fafc',
            color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(30, 41, 59, ${opacity})`,
          }}
          style={styles.chart}
        />

        <View style={styles.indicatorsList}>
          {indicators.map((item, index) => (
            <View key={index} style={styles.indicatorItem}>
              <View style={[styles.indicatorDot, { backgroundColor: item.color }]} />
              <Text style={styles.indicatorLabel}>{item.label}</Text>
              <Text style={styles.indicatorValue}>{(item.progress * 100).toFixed(1)}%</Text>
            </View>
          ))}
        </View>
      </Animated.View>
    );
  };

  const renderPeriodSelector = () => (
    <View style={styles.periodSelector}>
      {periods.map((period) => (
        <TouchableOpacity
          key={period.value}
          style={[
            styles.periodButton,
            selectedPeriod === period.value && styles.activePeriodButton,
          ]}
          onPress={() => setSelectedPeriod(period.value)}
        >
          <Text
            style={[
              styles.periodButtonText,
              selectedPeriod === period.value && styles.activePeriodButtonText,
            ]}
          >
            {period.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderQuickActions = () => (
    <Animated.View 
      style={[
        styles.quickActionsContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        {[
          {
            title: 'Add Lead',
            icon: 'account-plus',
            color: '#2563EB',
            onPress: () => navigation.navigate('EnhancedLeadManagement'),
          },
          {
            title: 'Properties',
            icon: 'home-variant',
            color: '#10B981',
            onPress: () => navigation.navigate('PropertyManagement'),
          },
          {
            title: 'Reports',
            icon: 'chart-bar',
            color: '#F59E0B',
            onPress: () => navigation.navigate('RevenueAnalytics'),
          },
          {
            title: 'Settings',
            icon: 'cog',
            color: '#8B5CF6',
            onPress: () => navigation.navigate('CRMSettings'),
          },
        ].map((action, index) => (
          <TouchableOpacity
            key={index}
            style={styles.actionCard}
            onPress={action.onPress}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: action.color + '20' }]}>
              <MaterialCommunityIcons 
                name={action.icon} 
                size={24} 
                color={action.color} 
              />
            </View>
            <Text style={styles.actionTitle}>{action.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Advanced Dashboard</Text>
        
        <TouchableOpacity onPress={handleRefresh}>
          <MaterialCommunityIcons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#2563EB']}
          />
        }
      >
        {/* Period Selector */}
        {renderPeriodSelector()}

        {/* Quick Stats */}
        {renderQuickStats()}

        {/* Revenue Chart */}
        {renderRevenueChart()}

        {/* Leads Chart */}
        {renderLeadsChart()}

        {/* Conversion Chart */}
        {renderConversionChart()}

        {/* Performance Indicators */}
        {renderPerformanceIndicators()}

        {/* Quick Actions */}
        {renderQuickActions()}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

export default AdvancedDashboardScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  
  // Header
  header: {
    backgroundColor: '#1E293B',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },

  // Content
  content: {
    flex: 1,
  },
  
  // Period Selector
  periodSelector: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  activePeriodButton: {
    backgroundColor: '#2563EB',
  },
  periodButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  activePeriodButtonText: {
    color: '#fff',
  },

  // Sections
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
  },

  // Quick Stats
  quickStatsContainer: {
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  statTitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  statChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Charts
  chartContainer: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 16,
  },

  // Performance Indicators
  indicatorsList: {
    marginTop: 16,
    gap: 8,
  },
  indicatorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  indicatorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  indicatorLabel: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
  },
  indicatorValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },

  // Quick Actions
  quickActionsContainer: {
    padding: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },

  // Bottom padding
  bottomPadding: {
    height: 20,
  },
});