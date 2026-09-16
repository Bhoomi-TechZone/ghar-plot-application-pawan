import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
  RefreshControl,
  Animated,
  Platform,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { getRevenueAnalytics, getRevenueStats, getMonthlyRevenue } from '../../services/crmRevenueApi';
import CrossPlatformAlert from '../../../utils/crossPlatformAlert';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const chartWidth = screenWidth - 32;

const RevenueAnalyticsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('monthly'); // monthly, daily, yearly
  const [revenueData, setRevenueData] = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [chartData, setChartData] = useState(null);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    loadRevenueData();
    
    // Animate on load
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
  }, [selectedPeriod]);

  const loadRevenueData = async () => {
    try {
      setLoading(true);
      
      // Load all revenue data in parallel
      const [analytics, stats, monthly] = await Promise.all([
        getRevenueAnalytics(selectedPeriod),
        getRevenueStats(),
        getMonthlyRevenue(),
      ]);

      setRevenueData(analytics);
      setStatsData(stats);
      
      // Process chart data
      processChartData(analytics, monthly);
      
    } catch (error) {
      console.error('Error loading revenue data:', error);
      CrossPlatformAlert.alert('Error', 'Failed to load revenue analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const processChartData = (analytics, monthlyData) => {
    if (!analytics || !monthlyData) return;

    // Line chart data for revenue trends
    const lineChartData = {
      labels: monthlyData.map(item => item.month || 'N/A'),
      datasets: [
        {
          data: monthlyData.map(item => (item.totalRevenue || 0) / 100000), // Convert to lakhs
          color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`, // Blue
          strokeWidth: 3,
        },
        {
          data: monthlyData.map(item => (item.residentialRevenue || 0) / 100000),
          color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, // Green
          strokeWidth: 2,
        },
        {
          data: monthlyData.map(item => (item.commercialRevenue || 0) / 100000),
          color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`, // Orange
          strokeWidth: 2,
        },
      ],
    };

    // Pie chart data for property type distribution
    const pieChartData = [
      {
        name: 'Residential',
        population: analytics.residentialRevenue || 0,
        color: '#10B981',
        legendFontColor: '#1F2937',
        legendFontSize: 12,
      },
      {
        name: 'Commercial', 
        population: analytics.commercialRevenue || 0,
        color: '#F59E0B',
        legendFontColor: '#1F2937',
        legendFontSize: 12,
      },
    ];

    // Bar chart data for monthly comparison
    const barChartData = {
      labels: monthlyData.slice(-6).map(item => item.month || 'N/A'), // Last 6 months
      datasets: [
        {
          data: monthlyData.slice(-6).map(item => (item.totalRevenue || 0) / 100000),
          color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
        },
      ],
    };

    setChartData({
      lineChart: lineChartData,
      pieChart: pieChartData,
      barChart: barChartData,
    });
  };

  const formatCurrency = (amount) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(1)}Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    } else if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return `₹${amount}`;
  };

  const renderStatsCard = (title, value, change, icon, color) => (
    <Animated.View 
      style={[
        styles.statsCard,
        { 
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={[styles.statsIcon, { backgroundColor: color + '20' }]}>
        <MaterialCommunityIcons name={icon} size={24} color={color} />
      </View>
      <View style={styles.statsContent}>
        <Text style={styles.statsTitle}>{title}</Text>
        <Text style={styles.statsValue}>{formatCurrency(value || 0)}</Text>
        {change !== undefined && (
          <View style={styles.changeContainer}>
            <MaterialCommunityIcons 
              name={change >= 0 ? "trending-up" : "trending-down"}
              size={14} 
              color={change >= 0 ? "#10B981" : "#EF4444"} 
            />
            <Text style={[
              styles.changeText,
              { color: change >= 0 ? "#10B981" : "#EF4444" }
            ]}>
              {Math.abs(change).toFixed(1)}%
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );

  const renderPeriodSelector = () => (
    <View style={styles.periodSelector}>
      {['daily', 'monthly', 'yearly'].map((period) => (
        <TouchableOpacity
          key={period}
          style={[
            styles.periodButton,
            selectedPeriod === period && styles.periodButtonActive,
          ]}
          onPress={() => setSelectedPeriod(period)}
        >
          <Text
            style={[
              styles.periodButtonText,
              selectedPeriod === period && styles.periodButtonTextActive,
            ]}
          >
            {period.charAt(0).toUpperCase() + period.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderLineChart = () => {
    if (!chartData?.lineChart) return null;

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Revenue Trends</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <LineChart
            data={chartData.lineChart}
            width={Math.max(chartWidth, chartData.lineChart.labels.length * 60)}
            height={220}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(75, 85, 99, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: {
                r: "4",
                strokeWidth: "2",
                stroke: "#2563EB"
              },
              formatYLabel: (value) => `₹${value}L`,
            }}
            bezier
            style={styles.chart}
            withInnerLines={false}
            withOuterLines={true}
            withVerticalLines={false}
            withHorizontalLines={true}
          />
        </ScrollView>
        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#2563EB' }]} />
            <Text style={styles.legendText}>Total Revenue</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#10B981' }]} />
            <Text style={styles.legendText}>Residential</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.legendText}>Commercial</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderPieChart = () => {
    if (!chartData?.pieChart) return null;

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Revenue by Property Type</Text>
        <PieChart
          data={chartData.pieChart}
          width={chartWidth}
          height={200}
          chartConfig={{
            color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
          }}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
          hasLegend={true}
        />
      </View>
    );
  };

  const renderBarChart = () => {
    if (!chartData?.barChart) return null;

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Monthly Comparison (Last 6 Months)</Text>
        <BarChart
          data={chartData.barChart}
          width={chartWidth}
          height={220}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(75, 85, 99, ${opacity})`,
            style: { borderRadius: 16 },
            formatYLabel: (value) => `₹${value}L`,
          }}
          style={styles.chart}
          withInnerLines={false}
          fromZero={true}
          showValuesOnTopOfBars={true}
        />
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading revenue analytics...</Text>
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
        
        <Text style={styles.headerTitle}>Revenue Analytics</Text>
        
        <TouchableOpacity onPress={loadRevenueData}>
          <MaterialCommunityIcons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadRevenueData();
            }}
            colors={['#2563EB']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Period Selector */}
        {renderPeriodSelector()}

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          {renderStatsCard(
            'Total Revenue',
            statsData?.totalRevenue,
            statsData?.totalGrowth,
            'chart-line',
            '#2563EB'
          )}
          {renderStatsCard(
            'Residential',
            statsData?.residentialRevenue,
            statsData?.residentialGrowth,
            'home',
            '#10B981'
          )}
          {renderStatsCard(
            'Commercial',
            statsData?.commercialRevenue,
            statsData?.commercialGrowth,
            'office-building',
            '#F59E0B'
          )}
          {renderStatsCard(
            'Average Deal',
            statsData?.averageDealSize,
            statsData?.averageGrowth,
            'calculator',
            '#8B5CF6'
          )}
        </View>

        {/* Charts */}
        {renderLineChart()}
        {renderPieChart()}
        {renderBarChart()}

        {/* Additional Insights */}
        <View style={styles.insightsContainer}>
          <Text style={styles.sectionTitle}>Key Insights</Text>
          
          <View style={styles.insightCard}>
            <MaterialCommunityIcons name="lightbulb" size={20} color="#F59E0B" />
            <Text style={styles.insightText}>
              {statsData?.insights?.topPerformingType || 'Residential properties'} are driving most revenue this period.
            </Text>
          </View>
          
          <View style={styles.insightCard}>
            <MaterialCommunityIcons name="trending-up" size={20} color="#10B981" />
            <Text style={styles.insightText}>
              Revenue growth of {statsData?.totalGrowth?.toFixed(1) || '0'}% compared to last period.
            </Text>
          </View>
          
          <View style={styles.insightCard}>
            <MaterialCommunityIcons name="target" size={20} color="#2563EB" />
            <Text style={styles.insightText}>
              Average deal size is {formatCurrency(statsData?.averageDealSize || 0)}.
            </Text>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

export default RevenueAnalyticsScreen;

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
  
  // Content
  content: {
    flex: 1,
  },
  
  // Period Selector
  periodSelector: {
    flexDirection: 'row',
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: '#2563EB',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  
  // Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  statsCard: {
    width: (screenWidth - 44) / 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statsContent: {
    flex: 1,
  },
  statsTitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 4,
  },
  statsValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  changeContainer: {
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
    marginTop: 8,
    borderRadius: 16,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
    textAlign: 'center',
  },
  chart: {
    borderRadius: 16,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  
  // Insights
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  insightsContainer: {
    marginTop: 8,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    gap: 12,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  
  bottomSpacing: {
    height: 20,
  },
});