/**
 * EmployeePermissionNavigator.js
 * 
 * Permission-based navigation for employee users.
 * Shows/hides tabs based on the employee's role permissions.
 * 
 * This navigator:
 * 1. Uses PermissionContext to check what screens employee can access
 * 2. Dynamically renders only the tabs employee has permission for
 * 3. Provides consistent permission checking across the app
 */

import React, { useMemo } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Text,
  Platform,
} from "react-native";
import { COLORS as THEME_COLORS, FONTS } from '../constants/theme';
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import Icon from "react-native-vector-icons/Ionicons";

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

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const { width } = Dimensions.get("window");

// Protected Screen Wrappers
const ProtectedDashboard = (props) => (
  <PermissionProtectedScreen requiredPermission={{ module: MODULES.DASHBOARD, action: ACTIONS.READ }}>
    <DashboardEmployee {...props} />
  </PermissionProtectedScreen>
);

const ProtectedLeads = (props) => (
  <PermissionProtectedScreen requiredPermission={{ module: MODULES.LEADS, action: ACTIONS.READ }}>
    <EmployeeLeads {...props} />
  </PermissionProtectedScreen>
);

const ProtectedReminders = (props) => (
  <PermissionProtectedScreen requiredPermission={{ module: MODULES.REMINDERS, action: ACTIONS.READ }}>
    <EmployeeReminders {...props} />
  </PermissionProtectedScreen>
);

const ProtectedFollowUps = (props) => (
  <PermissionProtectedScreen requiredPermission={{ module: MODULES.FOLLOW_UPS, action: ACTIONS.READ }}>
    <EmployeeFollowUps {...props} />
  </PermissionProtectedScreen>
);

const ProtectedAlerts = (props) => (
  <PermissionProtectedScreen requiredPermission={{ module: MODULES.REMINDERS, action: ACTIONS.READ }}>
    <Alerts {...props} />
  </PermissionProtectedScreen>
);

const ProtectedEnquiries = (props) => (
  <PermissionProtectedScreen requiredPermission={{ module: MODULES.ENQUIRIES, action: ACTIONS.READ }}>
    <EnquiriesScreen {...props} />
  </PermissionProtectedScreen>
);

const ProtectedProperties = (props) => (
  <PermissionProtectedScreen requiredPermission={{ module: MODULES.PROPERTIES, action: ACTIONS.READ }}>
    <PropertyManagementScreen {...props} />
  </PermissionProtectedScreen>
);

const ProtectedEmployeeManagement = (props) => (
  <PermissionProtectedScreen requiredPermission={{ module: MODULES.EMPLOYEES, action: ACTIONS.READ }}>
    <EmployeeManagementScreen {...props} />
  </PermissionProtectedScreen>
);

const ProtectedRoleManagement = (props) => (
  <PermissionProtectedScreen requiredPermission={{ module: MODULES.ROLES, action: ACTIONS.READ }}>
    <RoleManagementScreen {...props} />
  </PermissionProtectedScreen>
);

const ProtectedUserManagement = (props) => (
  <PermissionProtectedScreen requiredPermission={{ module: MODULES.USERS, action: ACTIONS.READ }}>
    <UserManagementScreen {...props} />
  </PermissionProtectedScreen>
);

const ProtectedBoughtProperty = (props) => (
  <PermissionProtectedScreen requiredPermission={{ module: MODULES.BOUGHT_PROPERTY, action: ACTIONS.READ }}>
    <BoughtPropertyScreen {...props} />
  </PermissionProtectedScreen>
);

const ProtectedServiceManagement = (props) => (
  <PermissionProtectedScreen requiredPermission={{ module: MODULES.SERVICE_MANAGEMENT, action: ACTIONS.READ }}>
    <ServiceManagementScreen {...props} />
  </PermissionProtectedScreen>
);

const ProtectedEmployeeReports = (props) => (
  <PermissionProtectedScreen requiredPermission={{ module: MODULES.EMPLOYEE_REPORTS, action: ACTIONS.READ }}>
    <EmployeeReportsScreen {...props} />
  </PermissionProtectedScreen>
);

// Dashboard Stack Navigator
const DashboardStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DashboardMain" component={ProtectedDashboard} />
    <Stack.Screen name="EmployeeProfile" component={EmployeeProfile} />
    <Stack.Screen name="CreateAlert" component={CreateAlertScreen} />
  </Stack.Navigator>
);

// Leads Stack Navigator
const LeadsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="LeadsMain" component={ProtectedLeads} />
  </Stack.Navigator>
);

// Reminders Stack Navigator
const RemindersStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="RemindersMain" component={ProtectedReminders} />
    <Stack.Screen name="CreateAlert" component={CreateAlertScreen} />
  </Stack.Navigator>
);

// FollowUps Stack Navigator
const FollowUpsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="FollowUpsMain" component={ProtectedFollowUps} />
  </Stack.Navigator>
);

// Alerts Stack Navigator
const AlertsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="AlertsList" component={ProtectedAlerts} />
    <Stack.Screen name="CreateAlert" component={CreateAlertScreen} />
  </Stack.Navigator>
);

// Enquiries Stack Navigator
const EnquiriesStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="EnquiriesMain" component={ProtectedEnquiries} />
    <Stack.Screen name="EnquiryDetail" component={EnquiryDetailScreen} />
  </Stack.Navigator>
);

// Properties Stack Navigator
const PropertiesStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="PropertiesMain" component={ProtectedProperties} />
    <Stack.Screen name="PropertyListings" component={PropertyListingsScreen} />
    <Stack.Screen name="BoughtProperty" component={ProtectedBoughtProperty} />
  </Stack.Navigator>
);

// Employees Stack Navigator
const EmployeesStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="EmployeesMain" component={ProtectedEmployeeManagement} />
    <Stack.Screen name="CreateEmployee" component={CreateEmployeeScreen} />
    <Stack.Screen name="EmployeeReports" component={ProtectedEmployeeReports} />
  </Stack.Navigator>
);

// Roles Stack Navigator
const RolesStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="RolesMain" component={ProtectedRoleManagement} />
  </Stack.Navigator>
);

// Users Stack Navigator
const UsersStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="UsersMain" component={ProtectedUserManagement} />
  </Stack.Navigator>
);

// Services Stack Navigator
const ServicesStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ServicesMain" component={ProtectedServiceManagement} />
  </Stack.Navigator>
);

// Tab configuration with permissions
const TAB_CONFIG = [
  {
    name: "Dashboard",
    component: DashboardStack,
    icon: "speedometer-outline",
    module: MODULES.DASHBOARD,
    action: ACTIONS.READ,
    priority: 1,
  },
  {
    name: "Leads",
    component: LeadsStack,
    icon: "people-outline",
    module: MODULES.LEADS,
    action: ACTIONS.READ,
    priority: 2,
  },
  {
    name: "Reminders",
    component: RemindersStack,
    icon: "notifications-outline",
    module: MODULES.REMINDERS,
    action: ACTIONS.READ,
    priority: 3,
  },
  {
    name: "FollowUps",
    component: FollowUpsStack,
    icon: "calendar-outline",
    module: MODULES.FOLLOW_UPS,
    action: ACTIONS.READ,
    priority: 4,
  },
  {
    name: "Alerts",
    component: AlertsStack,
    icon: "warning-outline",
    module: MODULES.REMINDERS,
    action: ACTIONS.READ,
    priority: 5,
  },
  {
    name: "Enquiries",
    component: EnquiriesStack,
    icon: "mail-outline",
    module: MODULES.ENQUIRIES,
    action: ACTIONS.READ,
    priority: 6,
  },
  {
    name: "Properties",
    component: PropertiesStack,
    icon: "home-outline",
    module: MODULES.PROPERTIES,
    action: ACTIONS.READ,
    priority: 7,
  },
  {
    name: "Employees",
    component: EmployeesStack,
    icon: "briefcase-outline",
    module: MODULES.EMPLOYEES,
    action: ACTIONS.READ,
    priority: 8,
  },
  {
    name: "Roles",
    component: RolesStack,
    icon: "key-outline",
    module: MODULES.ROLES,
    action: ACTIONS.READ,
    priority: 9,
  },
  {
    name: "Users",
    component: UsersStack,
    icon: "people-circle-outline",
    module: MODULES.USERS,
    action: ACTIONS.READ,
    priority: 10,
  },
  {
    name: "Services",
    component: ServicesStack,
    icon: "construct-outline",
    module: MODULES.SERVICE_MANAGEMENT,
    action: ACTIONS.READ,
    priority: 11,
  },
];

// Custom Tab Bar that respects permissions
const PermissionAwareTabBar = ({ state, descriptors, navigation, accessibleTabs }) => {
  return (
    <View style={styles.tabBarContainer} pointerEvents="box-none">
      <View style={styles.tabItemsContainer}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const tabConfig = accessibleTabs.find(t => t.name === route.name);
          
          if (!tabConfig) return null;

          const iconName = isFocused
            ? tabConfig.icon.replace("-outline", "")
            : tabConfig.icon;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
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
              onPress={onPress}
              style={styles.tabItem}
            >
              <View style={{ alignItems: "center" }}>
                <Icon
                  name={iconName}
                  size={isFocused ? 26 : 22}
                  color={isFocused ? THEME_COLORS.primary : "#5c6067ff"}
                />
                <Text
                  style={{
                    ...FONTS.caption,
                    fontWeight: isFocused ? '700' : '600',
                    color: isFocused ? THEME_COLORS.primary : "#7d8187ff",
                    marginTop: 3,
                    fontSize: 10,
                  }}
                  numberOfLines={1}
                >
                  {route.name}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// Employee Permission Navigator
const EmployeePermissionNavigator = () => {
  const { canAccess, isAdmin, loading, permissions } = usePermissions();

  // Filter tabs based on permissions
  const accessibleTabs = useMemo(() => {
    console.log('🔍 EmployeePermissionNavigator - Filtering tabs...');
    console.log('  - loading:', loading);
    console.log('  - isAdmin:', isAdmin);
    console.log('  - permissions:', permissions);
    
    if (loading) {
      console.log('  ⏳ Still loading, returning empty tabs');
      return [];
    }
    
    // Admin sees all tabs
    if (isAdmin) {
      console.log('  👑 Admin user - showing all tabs');
      return TAB_CONFIG.sort((a, b) => a.priority - b.priority);
    }

    // Filter by permission
    const filtered = TAB_CONFIG.filter(tab => {
      const hasAccess = canAccess(tab.module, tab.action);
      console.log(`  📋 Tab "${tab.name}" (${tab.module}:${tab.action}): ${hasAccess ? '✅' : '❌'}`);
      return hasAccess;
    });

    console.log(`  📊 Total accessible tabs: ${filtered.length}`);
    
    // Sort by priority and limit to max 5 tabs (bottom tab bar limitation)
    return filtered.sort((a, b) => a.priority - b.priority).slice(0, 5);
  }, [canAccess, isAdmin, loading, permissions]);

  // Show at least Dashboard if no tabs accessible
  const tabsToShow = accessibleTabs.length > 0 
    ? accessibleTabs 
    : [TAB_CONFIG[0]]; // Dashboard as fallback

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
      }}
      tabBar={(props) => (
        <PermissionAwareTabBar {...props} accessibleTabs={tabsToShow} />
      )}
    >
      {tabsToShow.map(tab => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{ tabBarIconName: tab.icon }}
        />
      ))}
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 90 : 70,
    backgroundColor: "transparent",
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  tabItemsContainer: {
    flexDirection: "row",
    width: "100%",
    height: "100%",
    backgroundColor: THEME_COLORS.white || '#fff',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    paddingHorizontal: 6,
    paddingTop: 6,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  tabItem: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 4,
  },
});

export default EmployeePermissionNavigator;
