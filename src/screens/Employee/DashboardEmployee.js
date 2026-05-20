import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const { width } = Dimensions.get('window');

const EmployeeReportsScreen = ({ navigation }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('This Month');
  const [selectedEmployee, setSelectedEmployee] = useState('All');

  const periods = ['Today', 'This Week', 'This Month', 'Last Month', 'This Year'];
  const employees = ['All', 'Rajesh Kumar', 'Priya Sharma', 'Amit Singh'];

  const reportData = {
    totalSales: 45,
    totalRevenue: '₹12,45,000',
    avgPerformance: 87,
    topPerformer: 'Priya Sharma',
    totalLeads: 156,
    convertedLeads: 45,
    conversionRate: 28.8,
    activeTasks: 24,
    completedTasks: 78,
    pendingTasks: 12,
  };

  const employeePerformance = [
    { name: 'Priya Sharma', sales: 18, revenue: '₹4,80,000', performance: 92 },
    { name: 'Rajesh Kumar', sales: 15, revenue: '₹3,90,000', performance: 85 },
    { name: 'Amit Singh', sales: 12, revenue: '₹3,75,000', performance: 78 },
  ];

  const renderMetricCard = (title, value, subtitle, color = '#3b82f6', icon) => (
    <View style={[styles.metricCard, { borderLeftColor: color }]}>
      <View style={styles.metricHeader}>
        <Text style={styles.metricTitle}>{title}</Text>
        {icon && <Icon name={icon} size={20} color={color} />}
      </View>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
    </View>
  );

  const renderPerformanceCard = (employee, index) => (
    <View key={index} style={styles.performanceCard}>
      <View style={styles.performanceHeader}>
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>#{index + 1}</Text>
        </View>
        <View style={styles.employeeInfo}>
          <Text style={styles.employeeName}>{employee.name}</Text>
          <Text style={styles.employeeStats}>
            {employee.sales} sales • {employee.revenue}
          </Text>
        </View>
        <View style={styles.performanceScore}>
          <Text style={[styles.scoreText, { color: getPerformanceColor(employee.performance) }]}>
            {employee.performance}%
          </Text>
        </View>
      </View>
      
      <View style={styles.performanceBar}>
        <View style={[
          styles.performanceFill,
          {
            width: `${employee.performance}%`,
            backgroundColor: getPerformanceColor(employee.performance)
          }
        ]} />
      </View>
    </View>
  );

  const getPerformanceColor = (performance) => {
    if (performance >= 90) return '#10b981';
    if (performance >= 80) return '#3b82f6';
    if (performance >= 70) return '#f59e0b';
    return '#ef4444';
  };

  const renderFilterButton = (items, selected, onSelect, title) => (
    <View style={styles.filterSection}>
      <Text style={styles.filterTitle}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {items.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.filterButton,
              selected === item && styles.activeFilterButton
            ]}
            onPress={() => onSelect(item)}
          >
            <Text style={[
              styles.filterButtonText,
              selected === item && styles.activeFilterButtonText
            ]}>
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Employee Reports</Text>
        <TouchableOpacity style={styles.exportButton}>
          <Icon name="download" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Filters */}
        {renderFilterButton(periods, selectedPeriod, setSelectedPeriod, 'Time Period')}
        {renderFilterButton(employees, selectedEmployee, setSelectedEmployee, 'Employee')}

        {/* Key Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Metrics</Text>
          <View style={styles.metricsGrid}>
            {renderMetricCard(
              'Total Sales',
              reportData.totalSales,
              'properties sold',
              '#10b981',
              'trophy'
            )}
            {renderMetricCard(
              'Revenue Generated',
              reportData.totalRevenue,
              'this period',
              '#3b82f6',
              'cash'
            )}
            {renderMetricCard(
              'Avg Performance',
              `${reportData.avgPerformance}%`,
              'team average',
              '#f59e0b',
              'trending-up'
            )}
            {renderMetricCard(
              'Top Performer',
              reportData.topPerformer,
              'highest sales',
              '#8b5cf6',
              'medal'
            )}
          </View>
        </View>

        {/* Lead Analytics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lead Analytics</Text>
          <View style={styles.analyticsContainer}>
            <View style={styles.analyticsRow}>
              <View style={styles.analyticsItem}>
                <Text style={styles.analyticsNumber}>{reportData.totalLeads}</Text>
                <Text style={styles.analyticsLabel}>Total Leads</Text>
              </View>
              <View style={styles.analyticsItem}>
                <Text style={[styles.analyticsNumber, { color: '#10b981' }]}>{reportData.convertedLeads}</Text>
                <Text style={styles.analyticsLabel}>Converted</Text>
              </View>
              <View style={styles.analyticsItem}>
                <Text style={[styles.analyticsNumber, { color: '#3b82f6' }]}>{reportData.conversionRate}%</Text>
                <Text style={styles.analyticsLabel}>Conversion Rate</Text>
              </View>
            </View>
            
            <View style={styles.conversionChart}>
              <Text style={styles.chartTitle}>Conversion Overview</Text>
              <View style={styles.chartBar}>
                <View style={[
                  styles.chartFill,
                  {
                    width: `${reportData.conversionRate}%`,
                    backgroundColor: '#10b981'
                  }
                ]} />
              </View>
              <View style={styles.chartLabels}>
                <Text style={styles.chartLabel}>0%</Text>
                <Text style={styles.chartLabel}>50%</Text>
                <Text style={styles.chartLabel}>100%</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Task Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Task Management</Text>
          <View style={styles.taskStats}>
            <View style={[styles.taskCard, { borderLeftColor: '#10b981' }]}>
              <Text style={[styles.taskNumber, { color: '#10b981' }]}>{reportData.completedTasks}</Text>
              <Text style={styles.taskLabel}>Completed</Text>
            </View>
            <View style={[styles.taskCard, { borderLeftColor: '#3b82f6' }]}>
              <Text style={[styles.taskNumber, { color: '#3b82f6' }]}>{reportData.activeTasks}</Text>
              <Text style={styles.taskLabel}>Active</Text>
            </View>
            <View style={[styles.taskCard, { borderLeftColor: '#f59e0b' }]}>
              <Text style={[styles.taskNumber, { color: '#f59e0b' }]}>{reportData.pendingTasks}</Text>
              <Text style={styles.taskLabel}>Pending</Text>
            </View>
          </View>
        </View>

        {/* Employee Performance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Employee Performance Ranking</Text>
          {employeePerformance.map(renderPerformanceCard)}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="document-text" size={20} color="#3b82f6" />
            <Text style={styles.actionButtonText}>Generate Report</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="share" size={20} color="#10b981" />
            <Text style={styles.actionButtonText}>Share Report</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#1e293b',
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  exportButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    marginRight: 8,
  },
  activeFilterButton: {
    backgroundColor: '#3b82f6',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#374151',
  },
  activeFilterButtonText: {
    color: '#ffffff',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    width: (width - 56) / 2,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricTitle: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
  },
  analyticsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  analyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  analyticsItem: {
    alignItems: 'center',
  },
  analyticsNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  analyticsLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  conversionChart: {
    marginTop: 8,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  chartBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  chartFill: {
    height: '100%',
    borderRadius: 4,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  chartLabel: {
    fontSize: 12,
    color: '#9ca3af',
  },
  taskStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  taskCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  taskNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  taskLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  performanceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  performanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rankBadge: {
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  employeeStats: {
    fontSize: 14,
    color: '#6b7280',
  },
  performanceScore: {
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  performanceBar: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  performanceFill: {
    height: '100%',
    borderRadius: 3,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 0.48,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 8,
  },
});

export default EmployeeReportsScreen;
