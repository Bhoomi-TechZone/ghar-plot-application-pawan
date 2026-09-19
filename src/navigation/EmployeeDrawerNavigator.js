/**
 * EmployeeDrawerNavigator.js
 * 
 * Drawer-based navigation for employee users with permission-based menu items.
 * Shows only the screens employee has permission to access.
 */

import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  StatusBar,
  Modal,
  SafeAreaView,
  Image,
  Animated,
} from "react-native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Icon from "react-native-vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Permission Components
import { usePermissions, MODULES, ACTIONS } from '../context/PermissionContext';
import PermissionProtectedScreen from '../components/PermissionProtectedScreen';

// CRM Employee Screens
import DashboardEmployee from "../crm/crmscreens/Employee/DashboardEmployee";
import EmployeeLeads from "../crm/crmscreens/Employee/EmployeeLeads";
import EmployeeReminders from "../crm/crmscreens/Employee/EmployeeReminders";
import EmployeeFollowUps from "../crm/crmscreens/Employee/EmployeeFollowUps";
import Alerts from "../crm/crmscreens/Employee/Alerts";
import CreateAlertScreen from "../crm/crmscreens/Employee/CreateAlertScreen";
import EmployeeProfile from "../crm/crmscreens/Employee/EmployeeProfile";
import EmployeeExpensesScreen from "../crm/crmscreens/Employee/EmployeeExpensesScreen";

// Admin Screens that employees might have access to based on permissions
import EnquiriesScreen from "../crm/crmscreens/Admin/EnquiriesScreen";
import EnquiryDetailScreen from "../crm/crmscreens/Admin/EnquiryDetailScreen";
import RoleManagementScreen from "../crm/crmscreens/Admin/RoleManagementScreen";
import EmployeeManagementScreen from "../crm/crmscreens/Admin/EmployeeManagementScreen";
import CreateEmployeeScreen from "../crm/crmscreens/Admin/CreateEmployeeScreen";
import PropertyManagementScreen from "../crm/crmscreens/Admin/PropertyManagementScreen";
import PropertyListingsScreen from "../crm/crmscreens/Admin/PropertyListingsScreen";
import BoughtPropertyScreen from "../crm/crmscreens/Admin/BoughtPropertyScreen";
import ServiceManagementScreen from "../crm/crmscreens/Admin/ServiceManagementScreen";
import UserManagementScreen from "../crm/crmscreens/Admin/UserManagementScreen";
import AdminMyReminders from "../crm/crmscreens/Admin/AdminMyReminders";
import BadAttendantAlertsScreen from "../crm/crmscreens/Admin/BadAttendantAlertsScreen";
import EmployeeReportsScreen from "../crm/crmscreens/Admin/EmployeeReportsScreen";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const { width, height } = Dimensions.get("window");

// Bottom Tab items - Main screens (max 4-5)
const BOTTOM_TAB_ITEMS = [
  {
    name: 'Home',
    route: 'DashboardTab',
    icon: 'home',
    iconOutline: 'home-outline',
    module: MODULES.DASHBOARD,
    action: ACTIONS.READ,
    color: '#3b82f6',
  },
  {
    name: 'Leads',
    route: 'LeadsTab',
    icon: 'people',
    iconOutline: 'people-outline',
    module: MODULES.LEADS,
    action: ACTIONS.READ,
    color: '#10b981',
  },
  {
    name: 'Reminders',
    route: 'RemindersTab',
    icon: 'notifications',
    iconOutline: 'notifications-outline',
    module: MODULES.REMINDERS,
    action: ACTIONS.READ,
    color: '#f59e0b',
  },
  {
    name: 'Follow Ups',
    route: 'FollowUpsTab',
    icon: 'calendar',
    iconOutline: 'calendar-outline',
    module: MODULES.FOLLOW_UPS,
    action: ACTIONS.READ,
    color: '#8b5cf6',
  },
];

// Drawer Menu items - Only screens NOT in bottom tabs
const DRAWER_MENU_ITEMS = [
  {
    name: 'Site Expenses',
    route: 'EmployeeExpenses',
    icon: 'receipt-outline',
    color: '#0f766e',
  },
  {
    name: 'Alerts',
    route: 'EmployeeAlerts',
    icon: 'warning-outline',
    module: MODULES.REMINDERS,
    action: ACTIONS.READ,
    color: '#ef4444',
  },
  {
    name: 'Enquiries',
    route: 'EmployeeEnquiries',
    icon: 'mail-outline',
    module: MODULES.ENQUIRIES,
    action: ACTIONS.READ,
    color: '#06b6d4',
  },
  {
    name: 'Properties',
    route: 'EmployeeProperties',
    icon: 'home-outline',
    module: MODULES.PROPERTIES,
    action: ACTIONS.READ,
    color: '#84cc16',
  },
  {
    name: 'Bought Properties',
    route: 'EmployeeBoughtProperties',
    icon: 'business-outline',
    module: MODULES.BOUGHT_PROPERTY,
    action: ACTIONS.READ,
    color: '#14b8a6',
  },
  {
    name: 'Employees',
    route: 'EmployeeManagement',
    icon: 'briefcase-outline',
    module: MODULES.EMPLOYEES,
    action: ACTIONS.READ,
    color: '#f97316',
  },
  {
    name: 'Roles',
    route: 'RoleManagement',
    icon: 'key-outline',
    module: MODULES.ROLES,
    action: ACTIONS.READ,
    color: '#ec4899',
  },
  {
    name: 'Users',
    route: 'UserManagement',
    icon: 'person-outline',
    module: MODULES.USERS,
    action: ACTIONS.READ,
    color: '#6366f1',
  },
  {
    name: 'Services',
    route: 'ServiceManagement',
    icon: 'construct-outline',
    module: MODULES.SERVICE_MANAGEMENT,
    action: ACTIONS.READ,
    color: '#0ea5e9',
  },
  {
    name: 'Reports',
    route: 'EmployeeReports',
    icon: 'bar-chart-outline',
    module: MODULES.EMPLOYEE_REPORTS,
    action: ACTIONS.READ,
    color: '#a855f7',
  },
];

// Drawer Menu Component
const DrawerMenu = ({ visible, onClose, navigation, accessibleMenuItems, employee }) => {
  const slideAnim = useRef(new Animated.Value(-width * 0.8)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Slide in from left
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Slide out to left
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -width * 0.8,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleNavigation = (route) => {
    onClose();
    navigation.navigate(route);
  };

  const handleLogout = async () => {
    onClose();
    try {
      await AsyncStorage.multiRemove([
        'crm_auth_token',
        'adminToken',
        'admin_token',
        'employee_auth_token',
        'employee_token',
        'employee_user',
        'employee_profile',
        'employee_permissions',
        'userType',
        'fcmToken',
      ]);
      navigation.reset({
        index: 0,
        routes: [{ name: 'EmployeeLogin' }],
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        {/* Animated Overlay */}
        <Animated.View 
          style={[styles.overlayBackground, { opacity: fadeAnim }]}
        >
          <TouchableOpacity style={styles.overlayTouchable} onPress={onClose} />
        </Animated.View>
        
        {/* Animated Drawer from Left */}
        <Animated.View 
          style={[
            styles.drawerContainer,
            { transform: [{ translateX: slideAnim }] }
          ]}
        >
          {/* Header */}
          <LinearGradient
            colors={["#3b82f6", "#1e40af"]}
            style={styles.drawerHeader}
          >
            <View style={styles.profileSection}>
              <View style={styles.avatarContainer}>
                <Icon name="person" size={40} color="#fff" />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{employee?.name || 'Employee'}</Text>
                <Text style={styles.profileRole}>{employee?.role?.name || 'Staff'}</Text>
                <Text style={styles.profileEmail}>{employee?.email || ''}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Icon name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>

          {/* Menu Items */}
          <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.menuSectionTitle}>MENU</Text>
            
            {accessibleMenuItems.map((item, index) => (
              <TouchableOpacity
                key={item.route}
                style={styles.menuItem}
                onPress={() => handleNavigation(item.route)}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: item.color + '20' }]}>
                  <Icon name={item.icon} size={22} color={item.color} />
                </View>
                <Text style={styles.menuItemText}>{item.name}</Text>
                <Icon name="chevron-forward" size={20} color="#94a3b8" />
              </TouchableOpacity>
            ))}

            {/* Divider */}
            <View style={styles.menuDivider} />

            {/* Profile & Settings */}
            <Text style={styles.menuSectionTitle}>ACCOUNT</Text>
            
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleNavigation('EmployeeProfile')}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: '#6366f120' }]}>
                <Icon name="person-circle-outline" size={22} color="#6366f1" />
              </View>
              <Text style={styles.menuItemText}>My Profile</Text>
              <Icon name="chevron-forward" size={20} color="#94a3b8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, styles.logoutItem]}
              onPress={handleLogout}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: '#ef444420' }]}>
                <Icon name="log-out-outline" size={22} color="#ef4444" />
              </View>
              <Text style={[styles.menuItemText, { color: '#ef4444' }]}>Logout</Text>
              <Icon name="chevron-forward" size={20} color="#ef4444" />
            </TouchableOpacity>
          </ScrollView>

          {/* Footer */}
          <View style={styles.drawerFooter}>
            <Text style={styles.footerText}>Gharplot CRM v1.0</Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// Dashboard with Menu Button
const DashboardWithMenu = ({ navigation }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const { canAccess, isAdmin, permissions, employee } = usePermissions();

  // Filter menu items based on permissions
  const accessibleMenuItems = useMemo(() => {
    console.log('🔍 Filtering menu items...');
    console.log('  - isAdmin:', isAdmin);
    console.log('  - permissions:', JSON.stringify(permissions));
    
    if (isAdmin) {
      console.log('  👑 Admin - showing all menu items');
      return MENU_ITEMS;
    }

    const filtered = DRAWER_MENU_ITEMS.filter(item => {
      if (!item.module) return true;
      const hasAccess = canAccess(item.module, item.action);
      console.log(`  📋 Menu "${item.name}" (${item.module}:${item.action}): ${hasAccess ? '✅' : '❌'}`);
      return hasAccess;
    });

    console.log(`  📊 Total accessible menu items: ${filtered.length}`);
    return filtered;
  }, [canAccess, isAdmin, permissions]);

  return (
    <View style={{ flex: 1 }}>
      {/* Floating Menu Button */}
      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => setDrawerVisible(true)}
      >
        <Icon name="menu" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Dashboard Screen */}
      <DashboardEmployee navigation={navigation} />

      {/* Drawer Menu */}
      <DrawerMenu
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        navigation={navigation}
        accessibleMenuItems={accessibleMenuItems}
        employee={employee}
      />
    </View>
  );
};

// Screen wrapper with menu button for non-dashboard screens
const ScreenWithMenuWrapper = ({ children, navigation }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const { canAccess, isAdmin, permissions, employee } = usePermissions();

  const accessibleMenuItems = useMemo(() => {
    if (isAdmin) return DRAWER_MENU_ITEMS;
    return DRAWER_MENU_ITEMS.filter(item => canAccess(item.module, item.action));
  }, [canAccess, isAdmin, permissions]);

  return (
    <View style={{ flex: 1 }}>
      {children}
      <DrawerMenu
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        navigation={navigation}
        accessibleMenuItems={accessibleMenuItems}
        employee={employee}
      />
    </View>
  );
};

// Custom Bottom Tab Bar (without Menu Button - menu is in header now)
const CustomTabBar = ({ state, descriptors, navigation }) => {
  // All employees see all 4 bottom tabs - no permission filtering
  const accessibleTabs = BOTTOM_TAB_ITEMS;

  return (
    <View style={styles.tabBarContainer}>
      {/* Tab Items */}
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        
        const tabConfig = accessibleTabs.find(t => t.route === route.name);
        if (!tabConfig) return null;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            style={styles.tabItem}
            onPress={onPress}
          >
            <Icon 
              name={isFocused ? tabConfig.icon : tabConfig.iconOutline} 
              size={24} 
              color={isFocused ? tabConfig.color : '#94a3b8'} 
            />
            <Text style={[
              styles.tabLabel, 
              { color: isFocused ? tabConfig.color : '#94a3b8' }
            ]}>
              {tabConfig.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// Bottom Tab Navigator with permission-based tabs
const EmployeeBottomTabs = ({ navigation: parentNavigation, route }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const { canAccess, isAdmin, permissions, employee, loading } = usePermissions();

  // Listen for openDrawer param from child screens
  useEffect(() => {
    if (route.params?.openDrawer) {
      setDrawerVisible(true);
      // Reset the param
      parentNavigation.setParams({ openDrawer: false });
    }
  }, [route.params?.openDrawer]);

  // Debug: Log permissions when they change
  useEffect(() => {
    console.log('🔄 EmployeeBottomTabs - Permissions updated:');
    console.log('   loading:', loading);
    console.log('   isAdmin:', isAdmin);
    console.log('   permissions:', JSON.stringify(permissions));
    console.log('   employee:', employee?.name);
  }, [loading, isAdmin, permissions, employee]);

  // Bottom tabs are ALWAYS shown to all employees - no permission filtering needed
  const accessibleTabs = useMemo(() => {
    console.log('🔍 Bottom tabs - showing all 4 tabs to all employees');
    // Always return all bottom tabs - no loading wait, no permission check
    return BOTTOM_TAB_ITEMS;
  }, []);

  // Filter accessible menu items for drawer
  const accessibleMenuItems = useMemo(() => {
    console.log('🔍 Filtering drawer menu items...');
    if (loading) {
      console.log('   ⏳ Still loading...');
      return [];
    }
    if (isAdmin) {
      console.log('   👑 Admin - showing all menu items');
      return DRAWER_MENU_ITEMS;
    }
    
    const filtered = DRAWER_MENU_ITEMS.filter(item => {
      if (!item.module) return true;
      const hasAccess = canAccess(item.module, item.action);
      console.log(`   📋 Menu "${item.name}" (${item.module}:${item.action}): ${hasAccess ? '✅' : '❌'}`);
      return hasAccess;
    });
    console.log(`   📊 Accessible menu items: ${filtered.length}`);
    return filtered;
  }, [canAccess, isAdmin, permissions, loading]);

  // If no tabs accessible, show at least dashboard (always accessible)
  const tabsToShow = accessibleTabs.length > 0 ? accessibleTabs : [BOTTOM_TAB_ITEMS[0]];
  
  console.log('📊 tabsToShow:', tabsToShow.map(t => t.name).join(', '));
  console.log('📊 accessibleTabs length:', accessibleTabs.length);

  // Create screen components with openDrawer callback
  const createScreenWithDrawer = (ScreenComponent) => {
    return (props) => (
      <ScreenComponent 
        {...props} 
        openDrawer={() => setDrawerVisible(true)} 
      />
    );
  };

  // Show loading screen while permissions are loading
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <Icon name="shield-checkmark" size={50} color="#3b82f6" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#64748b' }}>Loading permissions...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' }, // Hide default tab bar
        }}
        tabBar={(props) => (
          <CustomTabBar {...props} />
        )}
      >
        {tabsToShow.map(tab => (
          <Tab.Screen 
            key={tab.route}
            name={tab.route} 
          >
            {(props) => {
              const ScreenComponent = 
                tab.route === 'DashboardTab' ? DashboardEmployee :
                tab.route === 'LeadsTab' ? EmployeeLeads :
                tab.route === 'RemindersTab' ? EmployeeReminders :
                tab.route === 'FollowUpsTab' ? EmployeeFollowUps :
                DashboardEmployee;
              return <ScreenComponent {...props} openDrawer={() => setDrawerVisible(true)} />;
            }}
          </Tab.Screen>
        ))}
      </Tab.Navigator>

      {/* Drawer Menu */}
      <DrawerMenu
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        navigation={parentNavigation}
        accessibleMenuItems={accessibleMenuItems}
        employee={employee}
      />
    </View>
  );
};

// Main Navigator
const EmployeeDrawerNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* Main Bottom Tabs with Dashboard */}
      <Stack.Screen name="EmployeeHome" component={EmployeeBottomTabs} />
      
      {/* Additional Screens from Drawer */}
      <Stack.Screen name="EmployeeExpenses" component={EmployeeExpensesScreen} />
      <Stack.Screen name="EmployeeAlerts" component={Alerts} />
      <Stack.Screen name="CreateAlert" component={CreateAlertScreen} />
      <Stack.Screen name="EmployeeProfile" component={EmployeeProfile} />
      
      {/* Admin Screens accessible by permission */}
      <Stack.Screen name="EmployeeEnquiries" component={EnquiriesScreen} />
      <Stack.Screen name="EnquiryDetail" component={EnquiryDetailScreen} />
      <Stack.Screen name="EmployeeProperties" component={PropertyManagementScreen} />
      <Stack.Screen name="PropertyListings" component={PropertyListingsScreen} />
      <Stack.Screen name="EmployeeBoughtProperties" component={BoughtPropertyScreen} />
      <Stack.Screen name="EmployeeManagement" component={EmployeeManagementScreen} />
      <Stack.Screen name="CreateEmployee" component={CreateEmployeeScreen} />
      <Stack.Screen name="RoleManagement" component={RoleManagementScreen} />
      <Stack.Screen name="UserManagement" component={UserManagementScreen} />
      <Stack.Screen name="ServiceManagement" component={ServiceManagementScreen} />
      <Stack.Screen name="EmployeeReports" component={EmployeeReportsScreen} />
      <Stack.Screen name="BadAttendantAlerts" component={BadAttendantAlertsScreen} />
      <Stack.Screen name="AdminMyReminders" component={AdminMyReminders} />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  // Floating Menu Button
  menuButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 15,
    left: 15,
    zIndex: 1000,
    backgroundColor: '#3b82f6',
    width: 45,
    height: 45,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },

  // Modal Overlay
  modalOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  overlayBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayTouchable: {
    flex: 1,
  },

  // Drawer Container
  drawerContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: width * 0.8,
    maxWidth: 320,
    backgroundColor: '#fff',
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },

  // Drawer Header
  drawerHeader: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  profileSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    marginLeft: 12,
    flex: 1,
  },
  profileName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  profileRole: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  profileEmail: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    padding: 5,
  },

  // Menu Scroll
  menuScroll: {
    flex: 1,
    paddingHorizontal: 15,
  },
  menuSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 20,
    marginBottom: 10,
    paddingLeft: 5,
    letterSpacing: 1,
  },

  // Menu Item
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 5,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#1e293b',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 10,
  },
  logoutItem: {
    marginTop: 5,
  },

  // Drawer Footer
  drawerFooter: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#94a3b8',
  },

  // Bottom Tab Bar Styles
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 5,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingBottom: Platform.OS === 'ios' ? 25 : 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  menuIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default EmployeeDrawerNavigator;
