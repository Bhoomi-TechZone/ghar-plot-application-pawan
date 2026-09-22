import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import * as crmDashboardApi from '../../services/crmDashboardApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { startAdminNotificationPolling, stopAdminNotificationPolling } from '../../../services/AdminNotificationPollingService';

import { BASE_URL } from '../../../services/api';
import CrossPlatformAlert from '../../../utils/crossPlatformAlert';

const { width, height } = Dimensions.get('window');

const AdminDashboardScreen = ({ navigation, user }) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    totalProperty: 0,
    boughtProperty: 0,
    residentialProperty: 0,
    commercialProperty: 0,
    rentProperty: 0,
    enquiries: {
      client: 0,
      manual: 0,
      total: 0,
    },
    leads: {
      hot: 0,
      warm: 0,
      cold: 0,
      total: 0,
    },
    properties: {
      sale: 0,
      rent: 0,
    },
    recentProperties: [],
    totalUsers: 0,
    activeEmployees: 0,
    pendingApprovals: 0,
  });

  const [refreshing, setRefreshing] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [sitesMenuExpanded, setSitesMenuExpanded] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const fetchUnreadNotifCount = async () => {
    try {
      const token =
        (await AsyncStorage.getItem('adminToken')) ||
        (await AsyncStorage.getItem('admin_token')) ||
        (await AsyncStorage.getItem('employee_auth_token'));
      if (!token) return;
      const res = await fetch(`${BASE_URL}/admin/notifications/admin-reminders?limit=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadNotifCount(data.data?.unreadCount || 0);
      }
    } catch (e) { }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchUnreadNotifCount();

    // 🔑 TEMP: Print admin token for curl testing (remove after use)
    (async () => {
      const token = await AsyncStorage.getItem('adminToken') || await AsyncStorage.getItem('admin_token');
      console.log('🔑 ADMIN TOKEN FOR CURL:', token);
    })();

    // Create notification channels and check channel importance on Android only.
    if (Platform.OS === 'android') {
      (async () => {
        try {
          const notifee = require('@notifee/react-native').default;
        // Ensure notification channels exist (idempotent — preserves displayed notifications)
        await notifee.createChannel({ id: 'default_notification_channel', name: 'Notifications', importance: 4, sound: 'default', vibration: true, vibrationPattern: [300, 500] });
        await notifee.createChannel({ id: 'enquiry_reminders', name: 'Reminders', importance: 4, sound: 'default', vibration: true, vibrationPattern: [300, 500] });
        await notifee.createChannel({ id: 'gharplot_alerts', name: 'Gharplot Alerts', importance: 4, sound: 'default', vibration: true, vibrationPattern: [300, 500] });
        await notifee.createChannel({ id: 'admin_reminders', name: 'Admin Reminders', importance: 4, sound: 'default', vibration: true, vibrationPattern: [300, 500] }); // ✅ required for background reminder delivery
        console.log('✅ Admin notification channels ensured with sound');

        // 🔔 Check if Android notification importance is HIGH — if not, guide admin to fix it
        // Android permanently stores app-level importance. channelId delete+recreate doesn't reset it.
        // The only fix: user must manually set importance in Android Settings.
        // Show alert on EVERY dashboard open until they fix it (ch.importance will become 4 once fixed).
        const ch = await notifee.getChannel('default_notification_channel').catch(() => null);
        const needsFix = !ch || (ch.importance !== undefined && ch.importance < 4);
        if (needsFix) {
          CrossPlatformAlert.alert(
            '🔔 Enable Full Notifications',
            'Due-time reminder pop-ups require HIGH priority notifications.\n\nTap "Fix Now" → then set Gharplot notifications to "High" or "Alert" to receive reminder pop-ups with sound.',
            [
              { text: 'Later', style: 'cancel' },
              {
                text: 'Fix Now ✅',
                onPress: () => notifee.openNotificationSettings(),
              },
            ],
            { cancelable: false }
          );
        } else {
          // Even if channel looks fine, check permission once on first launch
          const permPrompted = await AsyncStorage.getItem('notif_perm_prompted_v1');
          if (!permPrompted) {
            await AsyncStorage.setItem('notif_perm_prompted_v1', '1');
            await notifee.requestPermission();
          }
        }
        } catch (e) { console.log('⚠️ Channel creation:', e.message); }
      })();
    } else if (Platform.OS === 'ios') {
      (async () => {
        try {
          const notifee = require('@notifee/react-native').default;
          const settings = await notifee.requestPermission({ alert: true, badge: true, sound: true });
          const notificationsEnabled = settings.authorizationStatus > 0;

          if (!notificationsEnabled) {
            CrossPlatformAlert.alert(
              '🔔 Enable Notifications',
              'Enable Gharplot notifications in iPhone Settings to receive reminder pop-ups and sound.',
              [
                { text: 'Later', style: 'cancel' },
                {
                  text: 'Fix Now ✅',
                  onPress: () => notifee.openNotificationSettings(),
                },
              ],
              { cancelable: false }
            );
          }
        } catch (e) { console.log('⚠️ iOS notification permission:', e.message); }
      })();
    }
    // 🔔 Start polling for employee reminder/alert notifications
    startAdminNotificationPolling();
    return () => {
      // Stop polling when dashboard unmounts
      stopAdminNotificationPolling();
    };
  }, []);

  // 🔔 Refresh unread count whenever this screen gains focus (e.g. after coming back from Inbox)
  useFocusEffect(
    useCallback(() => {
      fetchUnreadNotifCount();
    }, [])
  );

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await crmDashboardApi.getCompleteDashboardData();
      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      CrossPlatformAlert.alert('Error', 'Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
  };

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const goToUserHome = () => {
    // Reset the stack so the user cannot go back to Admin Dashboard
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };

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

              console.log('✅ Admin logged out - all tokens cleared');

              // Navigate to Admin login (reset stack to prevent back navigation)
              navigation.reset({
                index: 0,
                routes: [{ name: 'AdminLogin' }],
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
      title: "Total Properties",
      value: dashboardData.totalProperty.toString(),
      color: "#3b82f6",
      chart: "line",
      filterType: "All"
    },
    {
      title: "Residential",
      value: dashboardData.residentialProperty.toString(),
      color: "#8b5cf6",
      chart: "pie",
      filterType: "Residential"
    },
    {
      title: "Commercial",
      value: dashboardData.commercialProperty.toString(),
      color: "#f59e0b",
      chart: "donut",
      filterType: "Commercial"
    },
    {
      title: "For Rent",
      value: dashboardData.rentProperty.toString(),
      color: "#ef4444",
      chart: "bar",
      filterType: "Rent"
    },
  ];

  const handleStatsCardPress = (filterType) => {
    console.log(`📊 Admin clicked ${filterType} card`);
    
    try {
      // Navigate to AllPropertiesScreen with filter
      navigation.navigate('AllPropertiesScreen', {
        category: filterType,
        adminView: true
      });
      console.log('✅ Navigation successful to AllPropertiesScreen with filter:', filterType);
    } catch (error) {
      console.error('❌ Navigation failed:', error);
      CrossPlatformAlert.alert('Error', 'Failed to navigate to properties screen');
    }
  };

  const renderCard = (item) => (
    <TouchableOpacity 
      style={[styles.card, { shadowColor: item.color }]} 
      key={item.title}
      onPress={() => handleStatsCardPress(item.filterType)}
      activeOpacity={0.7}
    >
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

      {/* View All Button */}
      <View style={[styles.viewAllButton, { backgroundColor: item.color }]}>
        <Text style={styles.viewAllText}>View All</Text>
        <Icon name="arrow-forward" size={12} color="#fff" />
      </View>
    </TouchableOpacity>
  );

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
          <View style={[styles.headerRow, { paddingTop: insets.top + 12 }]}>
            <TouchableOpacity onPress={() => setDrawerVisible(true)}>
              <Icon name="menu" size={26} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Admin Dashboard</Text>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Icon name="log-out-outline" size={26} color="#fff" />
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
        <View style={[styles.headerRow, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => setDrawerVisible(true)} style={styles.menuButton}>
            <Icon name="menu" size={26} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>Admin Dashboard</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>Welcome, {user?.name || 'Admin'}</Text>
          </View>

          <View style={styles.headerActions}>
            {/* Back to User Home */}
            <TouchableOpacity style={styles.backToHomeButton} onPress={goToUserHome}>
              <Icon name="home-outline" size={22} color="#fff" />
            </TouchableOpacity>

            {/* Notification Bell */}
            <TouchableOpacity
              onPress={() => navigation.navigate('AdminNotificationsInbox')}
              style={styles.bellButton}
            >
              <Icon name="notifications-outline" size={24} color="#fff" />
              {unreadNotifCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>
                    {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Icon name="log-out-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate('CreateAlert')}
          style={styles.createAlertButton}
        >
          <Icon name="alarm-outline" size={16} color="#fff" />
          <Text style={styles.createAlertText}>PLACE A REMINDER</Text>
        </TouchableOpacity>

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
        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading dashboard data...</Text>
          </View>
        )}

        {/* Stats Row */}
        <View style={styles.statsRow}>{statsCards.map(renderCard)}</View>

        {/* Enquiry Section */}
        <View style={styles.whiteCard}>
          <View style={styles.sectionHeader}>
            <Icon name="analytics" size={20} color="#3b82f6" />
            <Text style={styles.sectionTitle}>All Leads</Text>
          </View>

          <View style={styles.enquiryRow}>
            <View style={styles.circleBox}>
              <Text style={styles.circleValue}>
                {dashboardData.enquiries.total}
              </Text>
              <Text style={styles.circleLabel}>Total</Text>
            </View>

            <View style={styles.enquiryList}>
              <View style={styles.enquiryItem}>
                <View style={[styles.dot, { backgroundColor: "#3b82f6" }]} />
                <Text style={styles.enquiryText}>Client</Text>
                <Text style={styles.enquiryValue}>{dashboardData.enquiries.client}</Text>
              </View>

              <View style={styles.enquiryItem}>
                <View style={[styles.dot, { backgroundColor: "#f59e0b" }]} />
                <Text style={styles.enquiryText}>Manual</Text>
                <Text style={styles.enquiryValue}>{dashboardData.enquiries.manual}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Property Overview Section */}
        <View style={styles.whiteCard}>
          <View style={styles.sectionHeader}>
            <Icon name="home" size={20} color="#28a745" />
            <Text style={styles.sectionTitle}>Property Overview</Text>
          </View>

          <View style={styles.enquiryRow}>
            <View style={styles.circleBox}>
              <Text style={styles.circleValue}>
                {(dashboardData.totalProperty + dashboardData.boughtProperty).toString()}
              </Text>
              <Text style={styles.circleLabel}>Total</Text>
            </View>

            <View style={styles.enquiryList}>
              <View style={styles.enquiryItem}>
                <View style={[styles.dot, { backgroundColor: "#3b82f6" }]} />
                <Text style={styles.enquiryText}>Available</Text>
                <Text style={styles.enquiryValue}>{dashboardData.totalProperty}</Text>
              </View>

              <TouchableOpacity
                style={styles.enquiryItem}
                onPress={() => {
                  setDrawerVisible(false);
                  navigation.navigate('BoughtProperty');
                }}
              >
                <View style={[styles.dot, { backgroundColor: "#28a745" }]} />
                <Text style={styles.enquiryText}>Bought</Text>
                <Text style={styles.enquiryValue}>{dashboardData.boughtProperty}</Text>
                <Icon name="chevron-forward" size={16} color="#9ca3af" style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Leads Section */}
        {/* <Text style={styles.sectionTitleMain}>Lead Analytics</Text> */}

        <View style={styles.analyticsGrid}>
          {/* Hot Leads */}
          {/* <TouchableOpacity style={[styles.blueCard, {backgroundColor: '#ef4444'}]} onPress={() => navigation.navigate('Operations', { screen: 'AllLeads' })}>
            <View style={styles.blueHeader}>
              <Icon name="flame" color="#fff" size={18} />
              <Text style={styles.blueTitle}>Hot Leads ({dashboardData.leads.hot})</Text>
            </View>

            <Text style={styles.blueMiniText}>
              {dashboardData.leads.hot > 0 ? `${dashboardData.leads.hot} active` : 'No hot leads'}
            </Text>
          </TouchableOpacity> */}

          {/* Warm Leads */}
          {/* <TouchableOpacity style={[styles.blueCard, {backgroundColor: '#f59e0b'}]} onPress={() => navigation.navigate('Operations', { screen: 'AllLeads' })}>
            <View style={styles.blueHeader}>
              <Icon name="trending-up" color="#fff" size={18} />
              <Text style={styles.blueTitle}>Warm ({dashboardData.leads.warm})</Text>
            </View>

            <View style={styles.leadRow}>
              <Text style={styles.leadLabel}>Warm Leads</Text>
              <View style={[styles.leadBarFill, { width: dashboardData.leads.warm > 0 ? "60%" : "0%" }]} />
            </View>

            <Text style={styles.blueMiniText}>Active: {dashboardData.leads.warm}</Text>
          </TouchableOpacity> */}
        </View>

        {/* Management Section */}
        <View style={styles.whiteCard}>
          <View style={styles.sectionHeader}>
            <Icon name="people" size={20} color="#3b82f6" />
            <Text style={styles.sectionTitle}>User Management</Text>
          </View>

          <View style={styles.propRow}>
            <View style={styles.pieCircle} />
            <View>
              <Text style={styles.propText}>
                Total Users: {dashboardData.totalUsers}
              </Text>
              <Text style={styles.propText}>Active Employees: {dashboardData.activeEmployees}</Text>
              <Text style={styles.propText}>Pending Approvals: {dashboardData.pendingApprovals}</Text>
            </View>
          </View>

          {/* Assignment Quick Links */}
          <View style={{ marginTop: 12, gap: 8 }}>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', padding: 10, borderRadius: 10, gap: 8 }}
              onPress={() => navigation.navigate('Management', { screen: 'UserAssignments' })}
            >
              <Icon name="person-add" size={18} color="#10b981" />
              <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: '#374151' }}>User Assignments</Text>
              <Icon name="chevron-forward" size={16} color="#9ca3af" />
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f0ff', padding: 10, borderRadius: 10, gap: 8 }}
              onPress={() => navigation.navigate('Management', { screen: 'LeadAssignments' })}
            >
              <Icon name="clipboard-outline" size={18} color="#7c3aed" />
              <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: '#374151' }}>Lead Assignments</Text>
              <Icon name="chevron-forward" size={16} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions
        <TouchableOpacity style={styles.followCard}>
          <View style={styles.blueHeader}>
            <Icon name="flash" color="#fff" size={18} />
            <Text style={styles.blueTitle}>Quick Actions</Text>
          </View>

          <TouchableOpacity 
            style={styles.followRow}
            onPress={() => {
              // Navigate to Properties tab and then to AddProperty screen
              navigation.navigate('Properties', { 
                screen: 'AddProperty' 
              });
            }}
          >
            <Text style={styles.followText}>Add Property</Text>
            <View style={styles.badgeBlue}>
              <Icon name="add" size={14} color="#fff" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.followRow}
            onPress={() => {
              // Navigate to Management tab
              navigation.navigate('Management', { 
                screen: 'UserManagement' 
              });
            }}
          >
            <Text style={styles.followText}>Manage Users</Text>
            <View style={styles.badgeYellow}>
              <Icon name="people" size={14} color="#fff" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.followRow}
            onPress={() => {
              // Navigate to Operations tab
              navigation.navigate('Operations', { 
                screen: 'ReportsComplaints' 
              });
            }}
          >
            <Text style={styles.followText}>View Reports</Text>
            <View style={styles.badgeRed}>
              <Icon name="analytics" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
        </TouchableOpacity> */}

        <View style={{ height: 50 }} />
      </ScrollView>

      {/* Admin Drawer Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={drawerVisible}
        onRequestClose={() => setDrawerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.drawerContainer}>
            <View style={[styles.drawerHeader, { paddingTop: insets.top + 24 }]}>
              <Text style={styles.drawerHeaderTitle}>Admin Menu</Text>
              <TouchableOpacity onPress={() => setDrawerVisible(false)}>
                <Icon name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.drawerContent} showsVerticalScrollIndicator={false}>
              {/* MANAGEMENT Section */}
              <View style={styles.drawerSection}>
                <Text style={styles.drawerSectionTitle}>MANAGEMENT</Text>

                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => {
                    setDrawerVisible(false);
                    navigation.navigate('RoleManagement');
                  }}
                >
                  <Icon name="people-circle" size={20} color="#3b82f6" />
                  <Text style={styles.drawerItemText}>Role Management</Text>
                  <Icon name="chevron-forward" size={16} color="#9ca3af" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => {
                    setDrawerVisible(false);
                    navigation.navigate('Management', { screen: 'UserAssignments' });
                  }}
                >
                  <Icon name="person-add" size={20} color="#10b981" />
                  <Text style={styles.drawerItemText}>User Assignments</Text>
                  <Icon name="chevron-forward" size={16} color="#9ca3af" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => {
                    setDrawerVisible(false);
                    navigation.navigate('Management', { screen: 'LeadAssignments' });
                  }}
                >
                  <Icon name="clipboard-outline" size={20} color="#7c3aed" />
                  <Text style={styles.drawerItemText}>Lead Assignments</Text>
                  <Icon name="chevron-forward" size={16} color="#9ca3af" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => {
                    setDrawerVisible(false);
                    navigation.navigate('BadAttendantAlerts');
                  }}
                >
                  <Icon name="warning" size={20} color="#ef4444" />
                  <Text style={styles.drawerItemText}>Bad Attendance Alerts</Text>
                  <Icon name="chevron-forward" size={16} color="#9ca3af" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => {
                    setDrawerVisible(false);
                    navigation.navigate('AdminRemindersControl');
                  }}
                >
                  <Icon name="notifications" size={20} color="#f59e0b" />
                  <Text style={styles.drawerItemText}>Admin Reminders Control</Text>
                  <Icon name="chevron-forward" size={16} color="#9ca3af" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => {
                    setDrawerVisible(false);
                    navigation.navigate('BoughtProperty');
                  }}
                >
                  <Icon name="home" size={20} color="#10b981" />
                  <Text style={styles.drawerItemText}>Bought Property</Text>
                  <Icon name="chevron-forward" size={16} color="#9ca3af" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => {
                    setDrawerVisible(false);
                    navigation.navigate('ServiceManagement');
                  }}
                >
                  <Icon name="construct" size={20} color="#8b5cf6" />
                  <Text style={styles.drawerItemText}>Service Management</Text>
                  <Icon name="chevron-forward" size={16} color="#9ca3af" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => {
                    setDrawerVisible(false);
                    navigation.navigate('Enquiries');
                  }}
                >
                  <Icon name="help-circle" size={20} color="#06b6d4" />
                  <Text style={styles.drawerItemText}>All Leads</Text>
                  <Icon name="chevron-forward" size={16} color="#9ca3af" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => setSitesMenuExpanded(!sitesMenuExpanded)}
                >
                  <Icon name="settings-outline" size={20} color="#0d9488" />
                  <Text style={styles.drawerItemText}>Sites Management</Text>
                  <Icon name={sitesMenuExpanded ? "chevron-down" : "chevron-forward"} size={16} color="#9ca3af" />
                </TouchableOpacity>

                {sitesMenuExpanded && (
                  <View style={styles.subItemContainer}>
                    {[
                      { name: 'All Projects', viewType: 'all_projects' },
                      { name: "Tomorrow's Action Plan Clients", viewType: 'tomorrow_clients' },
                      { name: "Tomorrow's Action Plan Leads", viewType: 'tomorrow_leads' },
                      { name: 'Add Cash Flow', viewType: 'add_cash_flow' },
                      { name: 'Cash Flow', viewType: 'cash_flow' },
                      { name: 'All Expenses', viewType: 'all_expenses' },
                      { name: 'Daily Project Sheet', viewType: 'daily_project_sheet' },
                      { name: 'Add Expenses', viewType: 'add_expenses' },
                      { name: 'Work Status', viewType: 'work_status' },
                      { name: 'Add Work Status', viewType: 'add_work_status' },
                      { name: 'Client Payments', viewType: 'client_payments' },
                      { name: 'Add Client Payment', viewType: 'add_client_payment' },
                    ].map((subItem) => (
                      <TouchableOpacity
                        key={subItem.viewType}
                        style={styles.drawerSubItem}
                        onPress={() => {
                          setDrawerVisible(false);
                          navigation.navigate('SitesManagement', { viewType: subItem.viewType });
                        }}
                      >
                        <View style={styles.bulletDot} />
                        <Text style={styles.drawerSubItemText}>{subItem.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* USP MANAGEMENT Section */}
              <View style={styles.drawerSection}>
                <Text style={styles.drawerSectionTitle}>USP MANAGEMENT</Text>

                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => {
                    setDrawerVisible(false);
                    navigation.navigate('USPEmployees');
                  }}
                >
                  <Icon name="person" size={20} color="#3b82f6" />
                  <Text style={styles.drawerItemText}>Team's USP</Text>
                  <Icon name="chevron-forward" size={16} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              {/* MY ASSIGNMENTS Section */}
              <View style={styles.drawerSection}>
                <Text style={styles.drawerSectionTitle}>MY ASSIGNMENTS</Text>

                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => {
                    setDrawerVisible(false);
                    navigation.navigate('MyReminders');
                  }}
                >
                  <Icon name="alarm" size={20} color="#f59e0b" />
                  <Text style={styles.drawerItemText}>My Reminders</Text>
                  <Icon name="chevron-forward" size={16} color="#9ca3af" />
                </TouchableOpacity>

                {/* <TouchableOpacity 
                  style={styles.drawerItem}
                  onPress={() => {
                    setDrawerVisible(false);
                    navigation.navigate('FollowUps');
                  }}
                >
                  <Icon name="call" size={20} color="#10b981" />
                  <Text style={styles.drawerItemText}>Follow-ups</Text>
                  <Icon name="chevron-forward" size={16} color="#9ca3af" />
                </TouchableOpacity> */}

                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => {
                    setDrawerVisible(false);
                    navigation.navigate('Alerts');
                  }}
                >
                  <Icon name="alert-circle" size={20} color="#ef4444" />
                  <Text style={styles.drawerItemText}>Alerts</Text>
                  <Icon name="chevron-forward" size={16} color="#9ca3af" />
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>

          <TouchableOpacity
            style={styles.closeArea}
            activeOpacity={1}
            onPress={() => setDrawerVisible(false)}
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f6ff",
  },

  /* Header */
  headerWrapper: {
    width: 'auto',
    alignSelf: 'stretch',
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingBottom: 22,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: 'stretch',
    paddingLeft: 6,
    marginRight: 16,
    marginBottom: 14,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 5,
    marginRight: 8,
  },
  menuButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginLeft: 14,
  },
  backToHomeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  headerCenter: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    marginHorizontal: 10,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  logoutButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  bellButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#3b82f6',
  },
  bellBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  createAlertButton: {
    alignSelf: 'stretch',
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 75,
    marginBottom: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#7c3aed',
    elevation: 3,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  createAlertText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.6,
    marginLeft: 7,
    flexShrink: 1,
    textAlign: 'center',
  },

  /* Stats Cards */
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    justifyContent: "space-between",
    marginTop: -30,
  },
  card: {
    width: width / 2.25,
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 14,
    borderRadius: 16,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  cardTitle: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardValue: {
    fontSize: 28,
    marginVertical: 10,
    fontWeight: "900",
  },
  chartBox: {
    height: 30,
    marginTop: 4,
  },

  /* Mini Chart Styles */
  line: {
    borderWidth: 2,
    width: "70%",
    borderRadius: 6,
  },
  pie: { width: 22, height: 22, borderRadius: 11 },
  donutOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  donutInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" },
  barContainer: { flexDirection: "row", alignItems: "flex-end" },
  bar: { width: 4, borderRadius: 2, marginRight: 4 },
  
  /* View All Button */
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    gap: 4,
  },
  viewAllText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },

  /* White Cards */
  whiteCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e3a8a",
    marginLeft: 8,
  },
  sectionTitleMain: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 20,
    marginLeft: 20,
    color: "#1e40af",
    marginBottom: 4,
  },

  /* Enquiry */
  enquiryRow: {
    flexDirection: "row",
    marginTop: 20,
    alignItems: 'center',
  },
  circleBox: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 6,
    borderColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: '#eff6ff',
  },
  circleValue: {
    fontSize: 28,
    fontWeight: "900",
    color: "#1e40af",
  },
  circleLabel: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 2,
    fontWeight: '600',
  },

  enquiryList: {
    flex: 1,
    marginLeft: 24,
  },
  enquiryItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 10,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  enquiryText: {
    flex: 1,
    fontSize: 14,
    color: "#1f2937",
    fontWeight: '500',
  },
  enquiryValue: {
    fontSize: 18,
    fontWeight: "700",
    color: '#1e40af',
  },

  /* Analytics */
  analyticsGrid: {
    flexDirection: "row",
    marginTop: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  blueCard: {
    flex: 1,
    backgroundColor: "#1e40af",
    padding: 18,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  blueHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  blueTitle: {
    color: "#fff",
    fontWeight: "700",
    marginLeft: 8,
    fontSize: 14,
  },
  blueMiniText: {
    color: "#e0e7ff",
    marginTop: 10,
    fontSize: 13,
  },

  /* Leads */
  leadRow: { marginTop: 12 },
  leadLabel: { color: "#fff", marginBottom: 6 },
  leadBarFill: {
    height: 6,
    borderRadius: 4,
    backgroundColor: "#f59e0b",
  },

  /* Property Card */
  propRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
  },
  pieCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#10b981",
    marginRight: 24,
    elevation: 3,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  propText: {
    marginBottom: 8,
    fontSize: 14,
    color: "#1f2937",
    fontWeight: '500',
  },

  /* Follow-up / Quick Actions */
  followCard: {
    backgroundColor: "#1e40af",
    margin: 12,
    padding: 18,
    borderRadius: 18,
    elevation: 5,
  },
  followRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  followText: { color: "#fff", fontSize: 14 },
  badgeRed: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeYellow: {
    backgroundColor: "#f59e0b",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeBlue: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: { color: "#fff", fontWeight: "700" },

  /* Loading */
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    fontStyle: 'italic',
  },

  /* Drawer Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  drawerContainer: {
    width: width * 0.78,
    backgroundColor: '#ffffff',
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  closeArea: {
    flex: 1,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 24,
    elevation: 4,
  },
  drawerHeaderTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  drawerContent: {
    flex: 1,
    paddingHorizontal: 0,
  },
  drawerSection: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  drawerSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6b7280',
    marginBottom: 12,
    paddingHorizontal: 20,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
  },
  drawerItemText: {
    fontSize: 15,
    color: '#374151',
    marginLeft: 16,
    flex: 1,
    fontWeight: '500',
  },
  subItemContainer: {
    paddingLeft: 16,
    backgroundColor: '#f8fafc',
    borderLeftWidth: 3,
    borderLeftColor: '#0d9488',
    marginLeft: 28,
    marginVertical: 4,
    borderRadius: 4,
  },
  drawerSubItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingRight: 12,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0d9488',
    marginRight: 12,
  },
  drawerSubItemText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
    flex: 1,
  },
});

export default AdminDashboardScreen;