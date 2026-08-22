import React from 'react';
import { View, Text, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// Admin Screens
import DashboardAdmin from '../crm/crmscreens/Admin/DashboardAdmin';
import PropertyManagementScreen from '../crm/crmscreens/Admin/PropertyManagementScreen';
import UserManagementScreen from '../crm/crmscreens/Admin/UserManagementScreen';
import UserLeadAssignmentsScreen from '../crm/crmscreens/Admin/UserLeadAssignmentsScreen';
import UserAssignmentsScreenReal from '../crm/crmscreens/Admin/UserAssignmentsScreen';
import LeadAssignmentsScreen from '../crm/crmscreens/Admin/LeadAssignmentsScreen';
import EmployeeManagementScreen from '../crm/crmscreens/Admin/EmployeeManagementScreen';
import EmployeeReportsScreen from '../crm/crmscreens/Admin/EmployeeReportsScreen';
import SettingsScreen from '../profile/SettingsScreen';
import AllLeadsScreen from '../crm/crmscreens/Admin/AllLeadsScreen';
import RoleManagementScreen from '../crm/crmscreens/Admin/RoleManagementScreen';
import BadAttendantAlertsScreen from '../crm/crmscreens/Admin/BadAttendantAlertsScreen';
import AdminReminderControlScreen from '../crm/crmscreens/Admin/AdminReminderControlScreen';
import EnquiriesScreen from '../crm/crmscreens/Admin/EnquiriesScreen';
import ServiceManagementScreenActual from '../crm/crmscreens/Admin/ServiceManagementScreen';
import USPCategoriesScreenActual from '../crm/crmscreens/Admin/USPCategoriesScreen';
import USPEmployeesScreenActual from '../crm/crmscreens/Admin/USPEmployeesScreen';
import AlertsScreen from '../crm/crmscreens/Admin/Alerts';
import AdminMyRemindersScreen from '../crm/crmscreens/Admin/AdminMyReminders';
import AdminFollowUpsScreen from '../crm/crmscreens/Admin/AdminFollow-up';
import AllReportsScreen from '../crm/crmscreens/Admin/AllReportsScreen';
import DailyReminderReport from '../crm/crmscreens/Admin/DailyReminderReport';
import EnquiryDetailScreen from '../crm/crmscreens/Admin/EnquiryDetailScreen';


// Placeholder screens for all admin features

const EmployeeManagementListScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
    <MaterialIcons name="badge" size={64} color="#007AFF" />
    <Text style={{ fontSize: 18, color: '#333', marginTop: 16 }}>Employee Management</Text>
    <Text style={{ fontSize: 14, color: '#666', marginTop: 8 }}>Manage employee records</Text>
  </View>
);

const AdminRemindersControlScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
    <MaterialIcons name="schedule" size={64} color="#007AFF" />
    <Text style={{ fontSize: 18, color: '#333', marginTop: 16 }}>Admin Reminders Control</Text>
    <Text style={{ fontSize: 14, color: '#666', marginTop: 8 }}>Control reminder system</Text>
  </View>
);

const PropertyListingsScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
    <MaterialIcons name="list" size={64} color="#007AFF" />
    <Text style={{ fontSize: 18, color: '#333', marginTop: 16 }}>Property Listings</Text>
    <Text style={{ fontSize: 14, color: '#666', marginTop: 8 }}>All property listings</Text>
  </View>
);

const BoughtPropertyScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
    <MaterialIcons name="home-work" size={64} color="#28a745" />
    <Text style={{ fontSize: 18, color: '#333', marginTop: 16 }}>Bought Property</Text>
    <Text style={{ fontSize: 14, color: '#666', marginTop: 8 }}>Sold properties record</Text>
  </View>
);

const ServiceManagementScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
    <MaterialIcons name="room-service" size={64} color="#007AFF" />
    <Text style={{ fontSize: 18, color: '#333', marginTop: 16 }}>Service Management</Text>
    <Text style={{ fontSize: 14, color: '#666', marginTop: 8 }}>Manage services offered</Text>
  </View>
);

const USPCategoriesScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
    <MaterialIcons name="category" size={64} color="#007AFF" />
    <Text style={{ fontSize: 18, color: '#333', marginTop: 16 }}>USP Categories</Text>
    <Text style={{ fontSize: 14, color: '#666', marginTop: 8 }}>Unique selling point categories</Text>
  </View>
);

const USPEmployeesScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
    <MaterialIcons name="person-pin" size={64} color="#007AFF" />
    <Text style={{ fontSize: 18, color: '#333', marginTop: 16 }}>Team's USP</Text>
    <Text style={{ fontSize: 14, color: '#666', marginTop: 8 }}>Employee USP management</Text>
  </View>
);

const MyRemindersScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
    <MaterialIcons name="notifications" size={64} color="#007AFF" />
    <Text style={{ fontSize: 18, color: '#333', marginTop: 16 }}>My Reminders</Text>
    <Text style={{ fontSize: 14, color: '#666', marginTop: 8 }}>Personal reminders</Text>
  </View>
);

const FollowUpsScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
    <MaterialIcons name="follow-the-signs" size={64} color="#007AFF" />
    <Text style={{ fontSize: 18, color: '#333', marginTop: 16 }}>Follow Ups</Text>
    <Text style={{ fontSize: 14, color: '#666', marginTop: 8 }}>Track follow-ups</Text>
  </View>
);

const AlertsListScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
    <MaterialIcons name="notification-important" size={64} color="#ef4444" />
    <Text style={{ fontSize: 18, color: '#333', marginTop: 16 }}>Alerts</Text>
    <Text style={{ fontSize: 14, color: '#666', marginTop: 8 }}>System alerts</Text>
  </View>
);

const ReportsComplaintsScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
    <MaterialIcons name="report-problem" size={64} color="#ef4444" />
    <Text style={{ fontSize: 18, color: '#333', marginTop: 16 }}>Reports & Complaints</Text>
    <Text style={{ fontSize: 14, color: '#666', marginTop: 8 }}>Handle reports and complaints</Text>
  </View>
);

const SystemSettingsScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
    <MaterialIcons name="settings" size={64} color="#007AFF" />
    <Text style={{ fontSize: 18, color: '#333', marginTop: 16 }}>System Settings</Text>
    <Text style={{ fontSize: 14, color: '#666', marginTop: 8 }}>Configure system settings</Text>
  </View>
);

const SecurityScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
    <MaterialIcons name="security" size={64} color="#007AFF" />
    <Text style={{ fontSize: 18, color: '#333', marginTop: 16 }}>Security</Text>
    <Text style={{ fontSize: 14, color: '#666', marginTop: 8 }}>Security settings</Text>
  </View>
);

const AddPropertyScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
    <MaterialIcons name="add-home" size={64} color="#007AFF" />
    <Text style={{ fontSize: 18, color: '#333', marginTop: 16 }}>Add Property</Text>
    <Text style={{ fontSize: 14, color: '#666', marginTop: 8 }}>Add new property to system</Text>
  </View>
);

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Dashboard Stack Navigator
const DashboardStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: '#007AFF',
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }}>
    <Stack.Screen
      name="DashboardMain"
      component={DashboardAdmin}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

// Properties Stack Navigator
const PropertiesStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: '#1e293b',
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }}>
    <Stack.Screen
      name="PropertyManagement"
      component={PropertyManagementScreen}
      options={{ title: 'Property Management' }}
    />
    <Stack.Screen
      name="PropertyListings"
      component={PropertyListingsScreen}
      options={{ title: 'Property Listings' }}
    />
    <Stack.Screen
      name="AddProperty"
      component={AddPropertyScreen}
      options={{ title: 'Add Property' }}
    />
    <Stack.Screen
      name="BoughtProperty"
      component={BoughtPropertyScreen}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

// Management Stack Navigator
const ManagementStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      headerStyle: {
        backgroundColor: '#007AFF',
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }}>
    <Stack.Screen
      name="UserManagement"
      component={UserManagementScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="UserAssignments"
      component={UserAssignmentsScreenReal}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="LeadAssignments"
      component={LeadAssignmentsScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="RoleManagement"
      component={RoleManagementScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="EmployeeManagement"
      component={EmployeeManagementScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="EmployeeReports"
      component={EmployeeReportsScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="BadAttendantAlerts"
      component={BadAttendantAlertsScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="AdminRemindersControl"
      component={AdminReminderControlScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="ServiceManagement"
      component={ServiceManagementScreenActual}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="Enquiries"
      component={EnquiriesScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="USPCategories"
      component={USPCategoriesScreenActual}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="USPEmployees"
      component={USPEmployeesScreenActual}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

// Employee Management Stack Navigator
const EmployeeManagementStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}>
    <Stack.Screen
      name="EmployeeManagementList"
      component={EmployeeManagementScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="EmployeeReports"
      component={EmployeeReportsScreen}
      options={{ title: 'Employee Reports' }}
    />
  </Stack.Navigator>
);

// Operations Stack Navigator
const OperationsStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}>
    <Stack.Screen
      name="AllLeads"
      component={AllLeadsScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="MyReminders"
      component={AlertsScreen}
      initialParams={{ filterCategory: 'reminder' }}
      options={{ title: 'My Reminders', headerShown: false }}
    />
    <Stack.Screen
      name="FollowUps"
      component={AdminFollowUpsScreen}
      options={{ title: 'Follow Ups', headerShown: false }}
    />
    <Stack.Screen
      name="Alerts"
      component={AlertsScreen}
      options={{ title: 'Alerts', headerShown: false }}
    />
    <Stack.Screen
      name="ReportsComplaints"
      component={ReportsComplaintsScreen}
      options={{ title: 'Reports & Complaints' }}
    />
  </Stack.Navigator>
);

// ✅ All Reports – Home (two tabs: Daily Summary | Date Range List)
const AllReportsHome = () => {
  const [activeTab, setActiveTab] = React.useState('daily');
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: '#0f2545' }}>

      {/* ── Unified Header (with safe area) ── */}
      <View style={{
        backgroundColor: '#0f2545',
        paddingTop: insets.top + 10,
        paddingBottom: 0,
        paddingHorizontal: 20,
      }}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: 0.3 }}>
          📊 All Reports
        </Text>
        <Text style={{ fontSize: 12, color: '#7dd3fc', marginTop: 2, marginBottom: 12 }}>
          Reminder analytics &amp; insights
        </Text>

        {/* ── Pill Tab Switcher ── */}
        <View style={{
          flexDirection: 'row',
          backgroundColor: 'rgba(255,255,255,0.10)',
          borderRadius: 12,
          padding: 4,
          marginBottom: 4,
        }}>
          {[
            { key: 'daily', label: '📈  Daily Report' },
            { key: 'range', label: '📋  Date Range' },
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.85}
              style={{
                flex: 1,
                paddingVertical: 9,
                borderRadius: 9,
                alignItems: 'center',
                backgroundColor: activeTab === tab.key ? '#1d4ed8' : 'transparent',
              }}>
              <Text style={{
                fontSize: 13,
                fontWeight: '700',
                color: activeTab === tab.key ? '#fff' : '#93c5fd',
                letterSpacing: 0.2,
              }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Content ── */}
      <View style={{ flex: 1, backgroundColor: '#f0f4f8' }}>
        {activeTab === 'daily'
          ? <DailyReminderReport hideHeader />
          : <AllReportsScreen navigation={null} hideHeader />
        }
      </View>
    </View>
  );
};

// ✅ All Reports Stack Navigator
const AllReportsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen
      name="AllReportsMain"
      component={AllReportsHome}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="EnquiryDetail"
      component={EnquiryDetailScreen}
      options={{
        headerShown: true,
        title: 'Client Profile',
        headerStyle: { backgroundColor: '#1e3a5f' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    />
  </Stack.Navigator>
);


// Admin Bottom Tabs Navigator with All Features
const AdminBottomTabs = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = 'dashboard';
          } else if (route.name === 'Management') {
            iconName = 'settings';
          } else if (route.name === 'Operations') {
            iconName = 'analytics';
          } else if (route.name === 'Properties') {
            iconName = 'home';
          } else if (route.name === 'Employees') {
            iconName = 'badge';
          } else if (route.name === 'AllReports') {
            iconName = 'bar-chart';
          }

          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#666',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e1e1e1',
          paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 8) : Math.max(insets.bottom, 8),
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 60 + Math.max(insets.bottom, 0) : 60 + Math.max(insets.bottom, 0),
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
      })}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardStack}
        options={{
          tabBarLabel: 'Dashboard',
        }}
      />
      <Tab.Screen
        name="Management"
        component={ManagementStack}
        options={{
          tabBarLabel: 'Management',
        }}
      />
      <Tab.Screen
        name="Employees"
        component={EmployeeManagementStack}
        options={{
          tabBarLabel: 'Employees',
        }}
      />
      <Tab.Screen
        name="Properties"
        component={PropertiesStack}
        options={{
          tabBarLabel: 'Properties',
        }}
      />
      <Tab.Screen
        name="Operations"
        component={OperationsStack}
        options={{
          tabBarLabel: 'Operations',
        }}
      />
      <Tab.Screen
        name="AllReports"
        component={AllReportsStack}
        options={{
          tabBarLabel: 'All Reports',
        }}
      />
    </Tab.Navigator>
  );
};

export default AdminBottomTabs;