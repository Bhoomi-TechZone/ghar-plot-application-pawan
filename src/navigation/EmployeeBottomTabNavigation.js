import React from "react";
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

// CRM Employee Screens
import DashboardEmployee from "../crm/crmscreens/Employee/DashboardEmployee";
import EmployeeLeads from "../crm/crmscreens/Employee/EmployeeLeads";
import EmployeeReminders from "../crm/crmscreens/Employee/EmployeeReminders";
import EmployeeFollowUps from "../crm/crmscreens/Employee/EmployeeFollowUps";
import Alerts from "../crm/crmscreens/Employee/Alerts";
import CreateAlertScreen from "../crm/crmscreens/Employee/CreateAlertScreen";
import EmployeeProfile from "../crm/crmscreens/Employee/EmployeeProfile";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const { width } = Dimensions.get("window");

// Dashboard Stack Navigator
const DashboardStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DashboardMain" component={DashboardEmployee} />
    <Stack.Screen name="EmployeeProfile" component={EmployeeProfile} />
  </Stack.Navigator>
);

// Alerts Stack Navigator
const AlertsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="AlertsList" component={Alerts} />
    <Stack.Screen name="CreateAlert" component={CreateAlertScreen} />
  </Stack.Navigator>
);

// Custom Tab Bar
const CustomTabBar = ({ state, descriptors, navigation }) => {
  return (
    <View style={styles.tabBarContainer} pointerEvents="box-none">
      <View style={styles.tabItemsContainer}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const iconName = isFocused
            ? options.tabBarIconName.replace("-outline", "")
            : options.tabBarIconName;

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
                  }}
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

// Employee Bottom Tab Navigator
const EmployeeBottomTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardStack}
        options={{ tabBarIconName: "speedometer-outline" }}
      />
      <Tab.Screen
        name="Leads"
        component={EmployeeLeads}
        options={{ tabBarIconName: "people-outline" }}
      />
      <Tab.Screen
        name="Reminders"
        component={EmployeeReminders}
        options={{ tabBarIconName: "notifications-outline" }}
      />
      <Tab.Screen
        name="FollowUps"
        component={EmployeeFollowUps}
        options={{ tabBarIconName: "calendar-outline" }}
      />
      <Tab.Screen
        name="Alerts"
        component={AlertsStack}
        options={{ tabBarIconName: "warning-outline" }}
      />
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

export default EmployeeBottomTabNavigator;