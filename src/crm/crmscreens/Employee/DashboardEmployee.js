import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  StatusBar,
  RefreshControl,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";
import * as crmEmployeeDashboardApi from '../../services/crmEmployeeDashboardApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { startAdminNotificationPolling, stopAdminNotificationPolling } from '../../../services/AdminNotificationPollingService';
import CrossPlatformAlert from '../../../utils/crossPlatformAlert';

const { width } = Dimensions.get("window");

const DashboardEmployee = ({ navigation, openDrawer }) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [employeeName, setEmployeeName] = useState('Employee');
  const [dashboardData, setDashboardData] = useState({
    totalProperty: 0,
    boughtProperty: 0,
    residentialProperty: 0,
    commercialProperty: 0,
    rentProperty: 0,
    reminders: 0,
    pendingReminders: 0,
    leads: 0,
    enquiryLeads: 0,
    clientLeads: 0,
    followUps: 0,
    followUpsToday: 0,
    followUpsThisWeek: 0,
    followUpsThisMonth: 0,
  });

  // Get employee name from storage
  useEffect(() => {
    const getEmployeeName = async () => {
      try {
        const employeeData = await AsyncStorage.getItem('employee_user');
        if (employeeData) {
          const employee = JSON.parse(employeeData);
          setEmployeeName(employee.name || 'Employee');
          
          // Sub-admin: start same polling as admin (uses stored admin token)
          if (employee.giveAdminAccess === true) {
            console.log('🔔 Sub-admin detected, starting admin polling for:', employee.name);
            startAdminNotificationPolling();
          }
        }
      } catch (error) {
        console.log('Error getting employee name:', error);
      }
    };
    getEmployeeName();
    
    return () => {
      stopAdminNotificationPolling();
    };
  }, []);

  // Fetch dashboard data
  const fetchDashboardData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      
      console.log('🔄 Fetching employee dashboard data...');
      const data = await crmEmployeeDashboardApi.getCompleteDashboardData();
      console.log('✅ Employee dashboard data received:', JSON.stringify(data, null, 2));
      console.log('📊 Leads value:', data.leads, 'Reminders value:', data.reminders);
      setDashboardData(data);
    } catch (error) {
      console.error('❌ Error fetching employee dashboard data:', error);
      CrossPlatformAlert.alert('Error', 'Failed to load dashboard data. Please try again.');
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData(false);
    setRefreshing(false);
  };

  // Load data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    CrossPlatformAlert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Set logging out flag to stop any ongoing API calls
              setIsLoggingOut(true);
              
              // Clear all auth tokens and saved credentials
              await AsyncStorage.multiRemove([
                'crm_auth_token',
                'adminToken',
                'admin_token',
                'admin_email',
                'admin_password',
                'employee_auth_token',
                'employee_token',
                'employee_user',
                'employee_profile',
                'employee_permissions',
                'authToken',
                'userProfile',
                'userToken',
                'userId',
                'refreshToken',
                'fcmToken',
              ]);
              
              console.log('✅ Employee logged out - all tokens cleared');
              
              // Navigate to Employee login (reset stack to prevent back navigation)
              navigation.reset({
                index: 0,
                routes: [{ name: 'EmployeeLogin' }],
              });
            } catch (error) {
              console.error('Logout error:', error);
              setIsLoggingOut(false);
              CrossPlatformAlert.alert('Error', 'Failed to logout properly');
            }
          }
        }
      ]
    );
  };

  const statsCards = [
    { 
      title: "Total Property", 
      value: dashboardData.totalProperty.toString(), 
      color: "#3b82f6", 
      chart: "line" 
    },
    { 
      title: "Residential", 
      value: dashboardData.residentialProperty.toString(), 
      color: "#8b5cf6", 
      chart: "pie" 
    },
    { 
      title: "Commercial", 
      value: dashboardData.commercialProperty.toString(), 
      color: "#f59e0b", 
      chart: "donut" 
    },
    { 
      title: "Rent Property", 
      value: dashboardData.rentProperty.toString(), 
      color: "#ef4444", 
      chart: "bar" 
    },
  ];

  const renderCard = (item) => (
    <View style={[styles.card, { shadowColor: item.color }]} key={item.title}>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={[styles.cardValue, { color: item.color }]}>{item.value}</Text>

      {/* Mini Charts */}
      <View style={styles.chartBox}>
        {item.chart === "line" && (
          <View style={[styles.line, { borderColor: item.color }]} />
        )}

        {item.chart === "pie" && (
          <View style={[styles.pie, { backgroundColor: item.color }]} />
        )}

        {item.chart === "donut" && (
          <View style={[styles.donutOuter, { borderColor: item.color }]}>
            <View style={styles.donutInner} />
          </View>
        )}

        {item.chart === "bar" && (
          <View style={styles.barContainer}>
            {[10, 18, 14, 22].map((h, i) => (
              <View
                key={i}
                style={[
                  styles.bar,
                  { backgroundColor: item.color, height: h },
                ]}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );

  // Loading state with proper UI
  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar 
          barStyle="light-content" 
          backgroundColor="#3b82f6" 
          translucent={false}
        />
        <LinearGradient
          colors={["#3b82f6", "#1e40af"]}
          style={styles.headerWrapper}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={openDrawer} style={styles.menuButton}>
              <Icon name="menu" size={26} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Dashboard</Text>
            </View>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Icon name="log-out-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="#3b82f6" 
        translucent={false}
      />

      {/* HEADER */}
      <LinearGradient
        colors={["#3b82f6", "#1e40af"]}
        style={styles.headerWrapper}
      >
        <View style={styles.headerRow}>
          {/* Menu Button */}
          <TouchableOpacity onPress={openDrawer} style={styles.menuButton}>
            <Icon name="menu" size={26} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Dashboard</Text>
            <Text style={styles.headerSubtitle}>Welcome, {employeeName}</Text>
          </View>

          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Icon name="log-out-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* BODY */}
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom > 0 ? insets.bottom + 90 : 90 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3b82f6']}
            tintColor="#3b82f6"
          />
        }
      >
        {/* Stats Row */}
        <View style={styles.statsRow}>{statsCards.map(renderCard)}</View>

        {/* Analytics Section */}
        <Text style={styles.sectionTitleMain}>Your Personal Analytics</Text>

        {/* Reminders & Leads Row */}
        <View style={styles.analyticsGrid}>
          {/* Reminders Card */}
          <TouchableOpacity 
            style={[styles.analyticsCard, { backgroundColor: '#10b981' }]} 
            onPress={() => navigation.navigate('RemindersTab')}
          >
            <View style={styles.analyticsIconContainer}>
              <Icon name="notifications" color="#fff" size={24} />
            </View>
            <Text style={styles.analyticsValue}>{dashboardData.reminders}</Text>
            <Text style={styles.analyticsLabel}>Reminders</Text>
            {dashboardData.pendingReminders > 0 && (
              <View style={styles.analyticsBadge}>
                <Text style={styles.analyticsBadgeText}>{dashboardData.pendingReminders} pending</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Leads Card */}
          <TouchableOpacity 
            style={[styles.analyticsCard, { backgroundColor: '#8b5cf6' }]} 
            onPress={() => navigation.navigate('LeadsTab')}
          >
            <View style={styles.analyticsIconContainer}>
              <Icon name="people" color="#fff" size={24} />
            </View>
            <Text style={styles.analyticsValue}>{dashboardData.leads}</Text>
            <Text style={styles.analyticsLabel}>Leads</Text>
            <View style={styles.analyticsMini}>
              <Text style={styles.analyticsMiniText}>E: {dashboardData.enquiryLeads} | C: {dashboardData.clientLeads}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Follow-ups Card - Full Width */}
        <TouchableOpacity 
          style={styles.followUpCard} 
          onPress={() => navigation.navigate('FollowUpsTab')}
        >
          <LinearGradient
            colors={['#1e40af', '#3b82f6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.followUpGradient}
          >
            <View style={styles.followUpHeader}>
              <Icon name="calendar" color="#fff" size={22} />
              <Text style={styles.followUpTitle}>Follow-Ups</Text>
              <View style={styles.followUpBadge}>
                <Text style={styles.followUpBadgeText}>{dashboardData.followUps}</Text>
              </View>
            </View>

            <View style={styles.followUpStatsRow}>
              <View style={styles.followUpStat}>
                <View style={[styles.followUpDot, { backgroundColor: '#ef4444' }]} />
                <Text style={styles.followUpStatLabel}>Today</Text>
                <Text style={styles.followUpStatValue}>{dashboardData.followUpsToday}</Text>
              </View>
              <View style={styles.followUpStat}>
                <View style={[styles.followUpDot, { backgroundColor: '#f59e0b' }]} />
                <Text style={styles.followUpStatLabel}>This Week</Text>
                <Text style={styles.followUpStatValue}>{dashboardData.followUpsThisWeek}</Text>
              </View>
              <View style={styles.followUpStat}>
                <View style={[styles.followUpDot, { backgroundColor: '#10b981' }]} />
                <Text style={styles.followUpStatLabel}>This Month</Text>
                <Text style={styles.followUpStatValue}>{dashboardData.followUpsThisMonth}</Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Properties Section */}
        <View style={styles.whiteCard}>
          <View style={styles.sectionHeader}>
            <Icon name="home" size={20} color="#3b82f6" />
            <Text style={styles.sectionTitle}>Property Overview</Text>
          </View>

          <View style={styles.propertyStatsRow}>
            <View style={styles.propertyStat}>
              <View style={[styles.propertyIcon, { backgroundColor: '#3b82f6' }]}>
                <Icon name="pricetag" size={18} color="#fff" />
              </View>
              <Text style={styles.propertyStatValue}>{dashboardData.totalProperty - dashboardData.rentProperty}</Text>
              <Text style={styles.propertyStatLabel}>For Sale</Text>
            </View>

            <View style={styles.propertyStat}>
              <View style={[styles.propertyIcon, { backgroundColor: '#f59e0b' }]}>
                <Icon name="key" size={18} color="#fff" />
              </View>
              <Text style={styles.propertyStatValue}>{dashboardData.rentProperty}</Text>
              <Text style={styles.propertyStatLabel}>For Rent</Text>
            </View>

            <View style={styles.propertyStat}>
              <View style={[styles.propertyIcon, { backgroundColor: '#10b981' }]}>
                <Icon name="checkmark-circle" size={18} color="#fff" />
              </View>
              <Text style={styles.propertyStatValue}>{dashboardData.boughtProperty}</Text>
              <Text style={styles.propertyStatLabel}>Bought</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

export default DashboardEmployee;

/* --------------------------------------------------------- */
/* ----------------------- STYLES -------------------------- */
/* --------------------------------------------------------- */
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#f2f6ff",
  },

  /* Header */
  headerWrapper: {
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 0) + 12,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 8,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  menuButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  logoutButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginTop: 16,
  },
  quickActionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
    marginLeft: 6,
    letterSpacing: 0.5,
  },

  /* Stats Cards */
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 12,
    justifyContent: "space-between",
  },
  card: {
    width: width / 2.25,
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: { fontSize: 12, color: "#6b7280", fontWeight: "600" },
  cardValue: {
    fontSize: 28,
    marginVertical: 6,
    fontWeight: "900",
  },
  chartBox: { height: 24 },

  /* Mini Chart Styles */
  line: {
    borderWidth: 2,
    width: "70%",
    borderRadius: 6,
  },
  pie: { width: 20, height: 20, borderRadius: 10 },
  donutOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  donutInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" },
  barContainer: { flexDirection: "row", alignItems: "flex-end" },
  bar: { width: 4, borderRadius: 2, marginRight: 3 },

  /* Section Title */
  sectionTitleMain: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 8,
    marginLeft: 16,
    marginBottom: 4,
    color: "#1e40af",
  },

  /* Analytics Cards */
  analyticsGrid: {
    flexDirection: "row",
    marginTop: 8,
    paddingHorizontal: 12,
    gap: 12,
  },
  analyticsCard: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    alignItems: 'center',
  },
  analyticsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  analyticsValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
  },
  analyticsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  analyticsBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  analyticsBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  analyticsMini: {
    marginTop: 8,
  },
  analyticsMiniText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontWeight: '500',
  },

  /* Follow Up Card */
  followUpCard: {
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  followUpGradient: {
    padding: 18,
  },
  followUpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  followUpTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 10,
    flex: 1,
  },
  followUpBadge: {
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  followUpBadgeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e40af',
  },
  followUpStatsRow: {
    flexDirection: 'row',
    marginTop: 16,
    justifyContent: 'space-around',
  },
  followUpStat: {
    alignItems: 'center',
  },
  followUpDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 6,
  },
  followUpStatLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  followUpStatValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },

  /* White Cards */
  whiteCard: {
    backgroundColor: "#fff",
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 18,
    padding: 18,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionHeader: { 
    flexDirection: "row", 
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e3a8a",
    marginLeft: 8,
  },
  
  /* Property Stats */
  propertyStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  propertyStat: {
    alignItems: 'center',
  },
  propertyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  propertyStatValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
  },
  propertyStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },

  /* Loading */
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
  },
});
