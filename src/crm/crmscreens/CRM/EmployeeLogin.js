import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Animated,
  Image,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFCMToken } from '../../../utils/fcmService';
import { usePermissions } from '../../../context/PermissionContext';
import { resetAdminNotificationState } from '../../../services/AdminNotificationPollingService';
import CrossPlatformAlert from '../../../utils/crossPlatformAlert';

const EmployeeLogin = () => {
  const navigation = useNavigation();
  const { refreshPermissions } = usePermissions();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("employee"); // admin or employee

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleEmployeeLogin = async () => {
    if (!email.trim() || !password.trim()) {
      CrossPlatformAlert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      // Get FCM token BEFORE login so we can send it with login request
      console.log('📱 Getting FCM token for employee login...');
      const fcmToken = await getFCMToken();
      console.log('🔑 FCM Token:', fcmToken ? fcmToken.substring(0, 30) + '...' : 'NULL');

      const response = await fetch('https://gharplotbackend.gntechnology.de/api/employees/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
          fcmToken: fcmToken || '', // Send FCM token with login request
        }),
      });

      const data = await response.json();

      if (data.success) {
        // ✅ IMPORTANT: Clear any old admin tokens to avoid conflicts
        await AsyncStorage.multiRemove([
          'adminToken',
          'admin_token',
          'crm_admin_token',
          'admin_user',
          'adminData',
          'crm_auth_token'
        ]);
        console.log('🧹 Cleared old admin tokens');

        // 🔑 Sub-admin: if employee has giveAdminAccess + adminDelegateToken, 
        // store admin token so same polling flow works (same as admin)
        if (data.data.employee?.giveAdminAccess === true && data.data.employee?.adminDelegateToken) {
          await AsyncStorage.setItem('adminToken', data.data.employee.adminDelegateToken);
          await AsyncStorage.setItem('admin_token', data.data.employee.adminDelegateToken);
          console.log('🔑 Sub-admin: admin token stored - same admin flow will work');
        }

        // Store token and user data
        await AsyncStorage.setItem('employee_token', data.data.token);
        await AsyncStorage.setItem('employeeToken', data.data.token); // Consistent key
        await AsyncStorage.setItem('employee_auth_token', data.data.token); // For API calls
        await AsyncStorage.setItem('employee_user', JSON.stringify(data.data.employee));
        await AsyncStorage.setItem('userType', 'employee');

        // Store employee permissions separately for quick access
        if (data.data.employee?.role?.permissions) {
          await AsyncStorage.setItem('employee_permissions', JSON.stringify(data.data.employee.role.permissions));
          console.log('📋 Employee permissions stored:', data.data.employee.role.permissions);
        }

        // Store FCM token locally
        if (fcmToken) {
          await AsyncStorage.setItem('fcmToken', fcmToken);
          await AsyncStorage.setItem('fcmTokenRegistered', 'true');
          console.log('✅ FCM token sent with login and stored locally');
        }

        console.log('✅ Employee login successful:', {
          name: data.data.employee?.name,
          role: data.data.employee?.role?.name,
          permissions: data.data.employee?.role?.permissions?.length || 0
        });

        // Sub-admin: reset notification state so polling gets fresh baseline
        if (data.data.employee?.giveAdminAccess === true) {
          await resetAdminNotificationState();
          console.log('🔄 Sub-admin: reset notification state for fresh polling');
        }

        // Refresh permissions in context BEFORE navigation
        await refreshPermissions();
        console.log('🔄 Permissions refreshed in context');

        setLoading(false);
        // Navigate to Employee App with permission-based bottom tabs
        navigation.navigate("EmployeeApp");
      } else {
        setLoading(false);
        CrossPlatformAlert.alert("Login Failed", data.message || "Invalid credentials");
      }
    } catch (error) {
      setLoading(false);
      console.error('Employee login error:', error);
      CrossPlatformAlert.alert("Error", "Network error. Please check your connection and try again.");
    }
  };

  const switchToAdminLogin = () => {
    navigation.navigate("AdminLogin");
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY }],
              },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.loginDetailsText}>Login Details</Text>
              <Text style={styles.welcomeText}>Welcome Back!</Text>
              <Text style={styles.subtitleText}>
                Login to continue accessing your Employee dashboard.
              </Text>
            </View>

            {/* Tab Switcher */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === "admin" && styles.activeTab]}
                onPress={switchToAdminLogin}
              >
                <Icon name="shield-checkmark" size={20} color={activeTab === "admin" ? "#fff" : "#666"} />
                <Text style={[styles.tabText, activeTab === "admin" && styles.activeTabText]}>
                  Admin Login
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === "employee" && styles.activeTab]}
                onPress={() => setActiveTab("employee")}
              >
                <Icon name="person" size={20} color={activeTab === "employee" ? "#fff" : "#1E90FF"} />
                <Text style={[styles.tabText, activeTab === "employee" && styles.activeTabText]}>
                  Employee Login
                </Text>
              </TouchableOpacity>
            </View>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Icon name="mail-outline" size={24} color="#1E90FF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCompleteType="email"
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Icon name="lock-closed-outline" size={24} color="#1E90FF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Icon
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={24}
                  color="#666"
                />
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleEmployeeLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.loginText}>LOGIN AS EMPLOYEE</Text>
                  <Icon name="arrow-forward" size={20} color="#fff" />
                </>
              )}
            </TouchableOpacity>

            {/* Forgot Password */}
            <TouchableOpacity style={styles.forgotPasswordButton}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  header: {
    marginBottom: 32,
  },
  loginDetailsText: {
    fontSize: 16,
    color: "#FF6B6B",
    fontWeight: "600",
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1a1a1a",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 16,
    color: "#666",
    lineHeight: 24,
    fontWeight: "400",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    borderRadius: 16,
    padding: 4,
    marginBottom: 32,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: "#1E90FF",
    shadowColor: "#1E90FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  tabText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginLeft: 8,
  },
  activeTabText: {
    color: "#fff",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: "#1a1a1a",
    fontSize: 16,
    fontWeight: "500",
    paddingVertical: 0,
    includeFontPadding: false,
    height: Platform.OS === 'android' ? 40 : 'auto',
  },
  eyeIcon: {
    padding: 4,
  },
  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1E90FF",
    borderRadius: 16,
    paddingVertical: 18,
    marginTop: 16,
    shadowColor: "#1E90FF",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    marginRight: 8,
    letterSpacing: 0.5,
  },
  forgotPasswordButton: {
    alignItems: "center",
    marginTop: 16,
  },
  forgotPasswordText: {
    color: "#1E90FF",
    fontSize: 15,
    fontWeight: "600",
  },
});

export default EmployeeLogin;
