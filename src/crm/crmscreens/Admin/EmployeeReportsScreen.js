import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { getEmployeeReports } from '../../services/crmEmployeeManagementApi';

const EmployeeReportsScreen = ({ navigation, route }) => {
  const { employeeId, employeeName } = route.params || {};
  
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterRole, setFilterRole] = useState('All Employees');
  const [sortBy, setSortBy] = useState('Name');
  
  const [dashboardStats, setDashboardStats] = useState({
    totalReminders: 0,
    totalFollowUps: 0,
    totalLeads: 0,
    totalInquiries: 0,
  });

  const [employeeReports, setEmployeeReports] = useState([]);

  useEffect(() => {
    loadEmployeeReports();
  }, []);

  const loadEmployeeReports = async () => {
    try {
      setLoading(true);
      console.log('📋 Loading employee reports...');
      
      const reportsData = await getEmployeeReports();
      
      if (reportsData.success && reportsData.data) {
        console.log('✅ Employee reports loaded:', reportsData.data.length);
        setEmployeeReports(reportsData.data);
        setDashboardStats(reportsData.stats);
      } else {
        console.log('⚠️ No reports data available');
      }
      
    } catch (error) {
      console.error('❌ Load reports error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCompletionColor = (rate) => {
    if (rate >= 60) return '#10b981';
    if (rate >= 30) return '#f59e0b';
    return '#ef4444';
  };

  const getConversionColor = (rate) => {
    if (rate >= 15) return '#3b82f6';
    if (rate >= 8) return '#8b5cf6';
    return '#6b7280';
  };

  const filteredReports = employeeReports.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchText.toLowerCase()) ||
                         emp.email.toLowerCase().includes(searchText.toLowerCase()) ||
                         emp.role.toLowerCase().includes(searchText.toLowerCase());
    const matchesRole = filterRole === 'All Employees' || emp.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const StatCard = ({ icon, title, value, color }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Icon name={icon} size={24} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={[styles.statNumber, { color }]}>{value}</Text>
        <Text style={styles.statLabel}>{title}</Text>
      </View>
    </View>
  );

  const ProgressBar = ({ value, color, width = 100 }) => (
    <View style={styles.progressContainer}>
      <View style={[styles.progressBar, { width }]}>
        <View 
          style={[
            styles.progressFill, 
            { width: `${value}%`, backgroundColor: color }
          ]} 
        />
      </View>
      <Text style={[styles.progressText, { color }]}>
        {value.toFixed(2)}%
      </Text>
    </View>
  );

  const renderEmployeeReport = ({ item }) => (
    <View style={styles.reportCard}>
      <View style={styles.reportHeader}>
        <View style={styles.employeeDetails}>
          <Text style={styles.employeeName}>{item.name}</Text>
          <Text style={styles.employeeEmail}>{item.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{item.role}</Text>
          </View>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Reminders</Text>
          <Text style={styles.metricValue}>{item.reminders}</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Follow-ups</Text>
          <Text style={styles.metricValue}>{item.followUps}</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Leads</Text>
          <Text style={styles.metricValue}>{item.leads}</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Inquiries</Text>
          <Text style={styles.metricValue}>{item.inquiries}</Text>
        </View>
      </View>

      <View style={styles.performanceSection}>
        <View style={styles.performanceItem}>
          <Text style={styles.performanceLabel}>Completion Rate</Text>
          <ProgressBar 
            value={item.completionRate} 
            color={getCompletionColor(item.completionRate)}
          />
        </View>
        
        <View style={styles.performanceItem}>
          <Text style={styles.performanceLabel}>Conversion Rate</Text>
          <ProgressBar 
            value={item.conversionRate} 
            color={getConversionColor(item.conversionRate)}
          />
        </View>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton}>
          <Icon name="eye" size={16} color="#3b82f6" />
          <Text style={styles.actionText}>View</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Icon name="download" size={16} color="#10b981" />
          <Text style={styles.actionText}>Export</Text>
        </TouchableOpacity>
      </View>
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
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Employee Reports</Text>
          {/* <Text style={styles.headerSubtitle}>Comprehensive performance and activity reports for all employees</Text> */}
        </View>
        {/* <TouchableOpacity style={styles.exportButton}>
          <Icon name="download" size={20} color="#ffffff" />
          <Text style={styles.exportText}>Export All</Text>
        </TouchableOpacity> */}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <StatCard 
            icon="alarm" 
            title="Total Reminders" 
            value={dashboardStats.totalReminders}
            color="#8b5cf6"
          />
          <StatCard 
            icon="call" 
            title="Total Follow-ups" 
            value={dashboardStats.totalFollowUps}
            color="#ec4899"
          />
          <StatCard 
            icon="people" 
            title="Total Leads" 
            value={dashboardStats.totalLeads}
            color="#06b6d4"
          />
          <StatCard 
            icon="help-circle" 
            title="Total Inquiries" 
            value={dashboardStats.totalInquiries}
            color="#10b981"
          />
        </View>

        {/* Filters and Search */}
        <View style={styles.filtersContainer}>
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color="#6b7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search employees..."
              value={searchText}
              onChangeText={setSearchText}
              placeholderTextColor="#9ca3af"
            />
          </View>
          
          <View style={styles.filterRow}>
            <TouchableOpacity style={styles.filterDropdown}>
              <Text style={styles.filterText}>{filterRole}</Text>
              <Icon name="chevron-down" size={16} color="#6b7280" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.filterDropdown}>
              <Text style={styles.filterText}>Sort by: {sortBy}</Text>
              <Icon name="chevron-down" size={16} color="#6b7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Employee Reports List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading employee reports...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredReports}
            renderItem={renderEmployeeReport}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
            scrollEnabled={false}
          />
        )}
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
    paddingVertical: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#cbd5e1',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  exportText: {
    color: '#ffffff',
    fontWeight: '600',
    marginLeft: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    width: '48%',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
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
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  filtersContainer: {
    marginBottom: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#374151',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterDropdown: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  reportCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reportHeader: {
    marginBottom: 16,
  },
  employeeDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  employeeEmail: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
    marginTop: 4,
  },
  roleBadge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  roleText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  performanceSection: {
    marginBottom: 16,
  },
  performanceItem: {
    marginBottom: 12,
  },
  performanceLabel: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 6,
    fontWeight: '500',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    flex: 1,
    marginRight: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 50,
    textAlign: 'right',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  actionText: {
    fontSize: 12,
    color: '#374151',
    marginLeft: 4,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  listContainer: {
    paddingBottom: 20,
  },
});

export default EmployeeReportsScreen;