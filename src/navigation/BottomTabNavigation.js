import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Text,
  Platform,
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS as THEME_COLORS, FONTS } from '../constants/theme';
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from "react-native-vector-icons/Ionicons";
import { isUserAuthenticated } from '../utils/authCheck';
import AuthModal from '../components/AuthModal';

import HomeScreen from "../screens/HomeScreen";
import ServicesScreen from "../screens/ServicesScreen";
import SavedScreen from "../screens/SavedScreen";
import ProfileScreen from "../screens/ProfileScreen";
import AddSellScreen from "../screens/AddSellScreen";

const Tab = createBottomTabNavigator();
const { width } = Dimensions.get("window");
const tabs = ["Home", "Services", "AddSell", "Saved", "Profile"];

// Custom Tab Bar
const CustomTabBar = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMessage, setAuthModalMessage] = useState('');
  const tabWidth = width / state.routes.length;
  
  // Calculate dynamic bottom padding and height
  const bottomPadding = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 20 : 0);
  const tabHeight = 70 + bottomPadding;

  // Function to check if user is fully registered
  const checkUserRegistration = async () => {
    try {
      const userProfileString = await AsyncStorage.getItem('userProfile');
      
      if (!userProfileString) {
        return { isRegistered: false, userProfile: null };
      }

      const userProfile = JSON.parse(userProfileString);
      
      // Check if user has completed full registration
      const isFullyRegistered = 
        userProfile.email && 
        userProfile.email.trim() !== '' && 
        userProfile.fullName && 
        userProfile.fullName !== 'User' &&
        userProfile.fullName.trim() !== '';

      return { isRegistered: isFullyRegistered, userProfile };
    } catch (error) {
      console.error('Error checking user registration:', error);
      return { isRegistered: false, userProfile: null };
    }
  };

  return (
    <View style={[styles.tabBarContainer, { height: tabHeight, paddingBottom: bottomPadding }]} pointerEvents="box-none">
      <View style={styles.tabItemsContainer}>
        {/* simple bar: no active indicator */}
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const iconName = isFocused
            ? options.tabBarIconName.replace("-outline", "")
            : options.tabBarIconName;

          const onPress = async () => {
            // Authentication check for Profile and Saved tabs
            if (route.name === "Profile" || route.name === "Saved") {
              const isAuthenticated = await isUserAuthenticated();
              
              if (!isAuthenticated) {
                // Guest user trying to access Profile or Saved - show auth modal
                console.log(`🚫 Guest user trying to access ${route.name} - Showing auth modal`);
                const message = route.name === "Profile" 
                  ? "Login to access your profile and settings"
                  : "Login to view your saved properties";
                setAuthModalMessage(message);
                setShowAuthModal(true);
                return;
              }
            }
            
            // Special handling for AddSell tab - check registration first
            if (route.name === "AddSell") {
              const { isRegistered, userProfile } = await checkUserRegistration();
              
              if (!isRegistered) {
                // Show auth modal for guest users
                console.log('🚫 Guest user trying to add property - Showing auth modal');
                setAuthModalMessage("Login to post your property");
                setShowAuthModal(true);
                return;
              }
            }

            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          // No animations: static sizes and opacities

          if (route.name === "AddSell") {
            return (
              <TouchableOpacity
                key={route.key}
                style={styles.fabButtonContainer}
                onPress={onPress}
                activeOpacity={0.85}
              >
                <View style={styles.fabWrapper}>
                  <View style={styles.fabCircle}>
                    <Icon name="add" size={26} color="#fff" />
                  </View>
                </View>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tabItem}
            >
              <View style={{ alignItems: "center" }}>
                <Icon
                  name={iconName}
                  size={isFocused ? 26 : 22} // slightly larger when active to feel bolder
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
      
      {/* Authentication Modal */}
      <AuthModal
        visible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={() => {
          setShowAuthModal(false);
          navigation.navigate('LoginScreen');
        }}
        message={authModalMessage}
      />
    </View>
  );
};

// Main Navigator
const BottomTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false, // hide default labels
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarIconName: "home-outline" }}
      />
      <Tab.Screen
        name="Services"
        component={ServicesScreen}
        options={{ tabBarIconName: "construct-outline" }}
      />
      <Tab.Screen
        name="AddSell"
        component={AddSellScreen}
        options={{ tabBarIconName: "add-circle-outline" }}
      />
      <Tab.Screen
        name="Saved"
        component={SavedScreen}
        options={{ tabBarIconName: "bookmark-outline" }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIconName: "person-outline" }}
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
    // Base height + inset will be calculated dynamically in component
    backgroundColor: "transparent",
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
  fabButtonContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  fabWrapper: {
    position: 'absolute',
    top: -6,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    // use app primary blue as fallback instead of orange
    backgroundColor: THEME_COLORS.primary || '#1E90FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  // no active indicator for a simpler look
});

export default BottomTabNavigator;
