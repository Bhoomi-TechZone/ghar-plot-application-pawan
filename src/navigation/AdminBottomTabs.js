import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Text,
  Platform,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// Admin Screens
import DashboardAdmin from '../crm/crmscreens/Admin/DashboardAdmin';
import PropertyManagementScreen from '../crm/crmscreens/Admin/PropertyManagementScreen';
import UserManagementScreen from '../crm/crmscreens/Admin/UserManagementScreen';
import SettingsScreen from '../profile/SettingsScreen';

// Placeholder screens for missing ones
const ReportsScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Reports Screen - Coming Soon</Text>
  </View>
);

const AddPropertyScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Add Property Screen - Coming Soon</Text>
  </View>
);

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const { width } = Dimensions.get('window');

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
        backgroundColor: '#007AFF',
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
      name="AddProperty"
      component={AddPropertyScreen}
      options={{ title: 'Add Property' }}
    />
  </Stack.Navigator>
);

// Users Stack Navigator
const UsersStack = () => (
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
      name="UserManagement"
      component={UserManagementScreen}
      options={{ title: 'User Management' }}
    />
  </Stack.Navigator>
);

// Reports Stack Navigator
const ReportsStack = () => (
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
      name="ReportsMain"
      component={ReportsScreen}
      options={{ title: 'Reports & Analytics' }}
    />
  </Stack.Navigator>
);

// Settings Stack Navigator
const SettingsStack = () => (
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
      name="SettingsMain"
      component={SettingsScreen}
      options={{ title: 'Admin Settings' }}
    />
  </Stack.Navigator>
);

// Custom Tab Bar Component
const CustomAdminTabBar = ({ state, descriptors, navigation }) => {
  const tabWidth = width / state.routes.length;

  const getTabIcon = (routeName, isFocused) => {
    let iconName;
    let IconComponent = MaterialIcons;

    switch (routeName) {
      case 'Dashboard':
        iconName = isFocused ? 'dashboard' : 'dashboard';
        break;
      case 'Properties':
        iconName = isFocused ? 'home' : 'home-outline';
        IconComponent = MaterialCommunityIcons;
        break;
      case 'Users':
        iconName = isFocused ? 'people' : 'people';
        break;
      case 'Reports':
        iconName = isFocused ? 'assessment' : 'assessment';
        break;
      case 'Settings':
        iconName = isFocused ? 'settings' : 'settings';
        break;
      default:
        iconName = 'circle';
    }

    return (
      <IconComponent
        name={iconName}
        size={isFocused ? 26 : 22}
        color={isFocused ? '#007AFF' : '#666'}
      />
    );
  };

  return (
    <View style={styles.tabBarContainer}>
      <View style={styles.tabItemsContainer}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

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

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              style={[styles.tabItem, { width: tabWidth }]}>
              <View style={styles.tabContent}>
                {getTabIcon(route.name, isFocused)}
                <Text
                  style={[
                    styles.tabLabel,
                    { color: isFocused ? '#007AFF' : '#666' },
                    { fontWeight: isFocused ? '700' : '600' }
                  ]}>
                  {route.name}
                </Text>
              </View>
              {isFocused && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// Admin Bottom Tabs Navigator
const AdminBottomTabs = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomAdminTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardStack}
        options={{
          tabBarLabel: 'Dashboard',
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
        name="Users"
        component={UsersStack}
        options={{
          tabBarLabel: 'Users',
        }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsStack}
        options={{
          tabBarLabel: 'Reports',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStack}
        options={{
          tabBarLabel: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tabItemsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    position: 'relative',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    top: -8,
    width: '60%',
    height: 3,
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
});

export default AdminBottomTabs;