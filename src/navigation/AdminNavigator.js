/**
 * Admin Navigator
 * Navigation for admin users with full access
 * Uses AdminBottomTabs for main admin navigation
 */

import React, { useEffect } from 'react';
import { View, Text, BackHandler } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import AdminBottomTabs from './AdminBottomTabsSimple';

// Additional Admin Screens that might be navigated to from the main tabs
import RoleManagementScreen from '../crm/crmscreens/Admin/RoleManagementScreen';
import Reminders from '../crm/crmscreens/Admin/Reminders';
import Alerts from '../crm/crmscreens/Admin/Alerts';
// Reuse employee CreateAlert screen for both roles
import CreateAlertScreen from '../crm/crmscreens/Employee/CreateAlertScreen';
import EmployeeManagementScreen from '../crm/crmscreens/Admin/EmployeeManagementScreen';
import CreateEmployeeScreen from '../crm/crmscreens/Admin/CreateEmployeeScreen';
import AdminReminderControlScreen from '../crm/crmscreens/Admin/AdminReminderControlScreen';
import AdminMyReminders from '../crm/crmscreens/Admin/AdminMyReminders';
import AdminFollowUps from '../crm/crmscreens/Admin/AdminFollow-up';
import AdminReminderMonitorScreen from '../crm/crmscreens/Admin/AdminReminderMonitorScreen';
import BadAttendantAlertsScreen from '../crm/crmscreens/Admin/BadAttendantAlertsScreen';
import AdminNotificationSettings from '../crm/crmscreens/Admin/AdminNotificationSettings';
import ReminderPermissionScreen from '../crm/crmscreens/Admin/ReminderPermissionScreen';
import AdminPopupSettings from '../crm/crmscreens/Admin/AdminPopupSettings';
import EnquiriesScreen from '../crm/crmscreens/Admin/EnquiriesScreen';
import EnquiryDetailScreen from '../crm/crmscreens/Admin/EnquiryDetailScreen';
import BoughtPropertyScreen from '../crm/crmscreens/Admin/BoughtPropertyScreen';
import ServiceManagementScreen from '../crm/crmscreens/Admin/ServiceManagementScreen';
import USPCategoriesScreen from '../crm/crmscreens/Admin/USPCategoriesScreen';
import USPEmployeesScreen from '../crm/crmscreens/Admin/USPEmployeesScreen';
import EmployeeRemindersScreen from '../crm/crmscreens/Employee/EmployeeReminders';
import EmployeeFollowUpsScreen from '../crm/crmscreens/Employee/EmployeeFollowUps';
// Edit Screens for Notifications
import EditReminderScreen from '../screens/EditReminderScreen';
import EditAlertScreen from '../screens/EditAlertScreen';
import AdminReminderDetailsScreen from '../crm/crmscreens/Admin/AdminReminderDetailsScreen';
import AdminNotificationsInbox from '../crm/crmscreens/Admin/AdminNotificationsInbox';
// Property Management Screens
import PropertyAnalytics from '../screens/CRM/PropertyManagement/PropertyAnalytics';
import AllPropertiesScreen from '../screens/AllPropertiesScreen';
import SitesManagementScreen from '../crm/crmscreens/Admin/SitesManagementScreen';

const Stack = createStackNavigator();

const AdminNavigator = ({ onLogout }) => {
  const navigation = useNavigation();

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Helper: recursively check if any nested navigator has screens to go back to
      const canGoBackInState = (state) => {
        if (!state) return false;
        // If this navigator's index > 0, there are screens to pop or tabs to switch
        if (state.index > 0) return true;
        // Check deeper nested state (e.g., tab's nested stack)
        const currentRoute = state.routes?.[state.index];
        if (currentRoute?.state) {
          return canGoBackInState(currentRoute.state);
        }
        return false;
      };

      const parentState = navigation.getState();
      const adminRoute = parentState.routes[parentState.index];

      // If admin stack or its nested navigators have screens to go back to,
      // let React Navigation handle the back press (pop screen / switch tab)
      if (canGoBackInState(adminRoute?.state)) {
        return false;
      }

      // Only when at absolute admin root (Dashboard tab, first screen),
      // navigate to user Home page
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
      return true;
    });
    return () => backHandler.remove();
  }, [navigation]);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      {/* Main Admin Bottom Tabs */}
      <Stack.Screen
        name="AdminMainTabs"
        component={AdminBottomTabs}
      />

      {/* Admin Notifications Inbox */}
      <Stack.Screen
        name="AdminNotificationsInbox"
        component={AdminNotificationsInbox}
        options={{ headerShown: false }}
      />

      {/* Additional Admin Screens accessible from tabs */}
      <Stack.Screen
        name="RoleManagement"
        component={RoleManagementScreen}
        options={{
          headerShown: true,
          title: 'Role Management',
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      <Stack.Screen
        name="EmployeeManagement"
        component={EmployeeManagementScreen}
        options={{
          headerShown: true,
          title: 'Employee Management',
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      <Stack.Screen
        name="CreateEmployee"
        component={CreateEmployeeScreen}
        options={{
          headerShown: true,
          title: 'Employee Details',
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      <Stack.Screen
        name="AdminReminders"
        component={Reminders}
        options={{
          headerShown: true,
          title: 'Admin Reminders',
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      <Stack.Screen
        name="ReminderControl"
        component={AdminReminderControlScreen}
        options={{
          headerShown: true,
          title: 'Reminder Control',
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      <Stack.Screen
        name="ReminderMonitor"
        component={AdminReminderMonitorScreen}
        options={{
          headerShown: true,
          title: 'Monitor Reminders',
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      <Stack.Screen
        name="AdminAlerts"
        component={Alerts}
        options={{
          headerShown: true,
          title: 'Admin Alerts',
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      <Stack.Screen
        name="CreateAlert"
        component={CreateAlertScreen}
        options={({ route }) => ({
          headerShown: true,
          title: route.params?.forceCategory === 'reminder' ? 'Create Reminder' : 'Create Alert',
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        })}
      />
      <Stack.Screen
        name="BadAttendantAlerts"
        component={BadAttendantAlertsScreen}
        options={{
          headerShown: true,
          title: 'Bad Attendant Alerts',
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      <Stack.Screen name="AdminNotificationSettings"
        component={AdminNotificationSettings}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ReminderPermission"
        component={ReminderPermissionScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminPopupSettings"
        component={AdminPopupSettings}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="AdminRemindersControl"
        component={AdminReminderControlScreen}
        options={{
          headerShown: true,
          title: 'Admin Reminders Control',
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      <Stack.Screen
        name="AdminMyReminders"
        component={AdminMyReminders}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminFollowUps"
        component={AdminFollowUps}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BoughtProperty"
        component={BoughtPropertyScreen}
        options={{
          headerShown: true,
          title: 'Bought Properties',
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      <Stack.Screen
        name="ServiceManagement"
        component={ServiceManagementScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Enquiries"
        component={EnquiriesScreen}
        options={{
          headerShown: true,
          title: 'All Leads',
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      <Stack.Screen
        name="EnquiryDetail"
        component={EnquiryDetailScreen}
        options={{
          headerShown: true,
          title: 'Enquiry Details',
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      <Stack.Screen
        name="USPCategories"
        component={USPCategoriesScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="USPEmployees"
        component={USPEmployeesScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="MyReminders"
        component={Alerts}
        initialParams={{ filterCategory: 'reminder' }}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="FollowUps"
        component={EmployeeFollowUpsScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Alerts"
        component={Alerts}
        options={{
          headerShown: true,
          title: 'Alerts',
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />

      {/* Property Management Screens */}
      <Stack.Screen
        name="PropertyAnalytics"
        component={PropertyAnalytics}
        options={{
          headerShown: true,
          title: 'Property Analytics',
          headerStyle: {
            backgroundColor: '#4F46E5',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      
      <Stack.Screen
        name="AllPropertiesScreen"
        component={AllPropertiesScreen}
        options={{
          headerShown: true,
          title: 'All Properties',
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />

      {/* Edit Screens for Notifications */}
      <Stack.Screen
        name="EditReminder"
        component={EditReminderScreen}
        options={{
          headerShown: true,
          title: 'Edit Reminder',
          headerStyle: {
            backgroundColor: '#3b82f6',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      <Stack.Screen
        name="EditAlert"
        component={EditAlertScreen}
        options={{
          headerShown: true,
          title: 'Edit Alert',
          headerStyle: {
            backgroundColor: '#ff9800',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      <Stack.Screen
        name="AdminReminderDetailsScreen"
        component={AdminReminderDetailsScreen}
        options={{
          headerShown: true,
          title: 'Reminder Details',
          headerStyle: {
            backgroundColor: '#1f2937',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      <Stack.Screen
        name="SitesManagement"
        component={SitesManagementScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

export default AdminNavigator;
