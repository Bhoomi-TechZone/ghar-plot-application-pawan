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
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFCMToken } from '../../../utils/fcmService';
import { resetAdminNotificationState } from '../../../services/AdminNotificationPollingService';
import CrossPlatformAlert from '../../../utils/crossPlatformAlert';

const AdminLogin = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("admin"); // admin or employee
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(40)).current;

  // Check for saved credentials and auto-login
  useEffect(() => {
    checkSavedCredentials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkSavedCredentials = async () => {
    try {
      const savedEmail = await AsyncStorage.getItem('admin_email');
      const savedPassword = await AsyncStorage.getItem('admin_password');
      const adminToken = await AsyncStorage.getItem('admin_token');

      console.log('🔍 Checking saved credentials:', {
        hasEmail: !!savedEmail,
        hasPassword: !!savedPassword,
        hasToken: !!adminToken
      });

      // If we have valid token, navigate directly
      if (adminToken) {
        console.log('✅ Valid token found, navigating to AdminApp');
        navigation.reset({
          index: 0,
          routes: [{ name: 'AdminApp' }],
        });
        return;
      }

      // If we have saved credentials, auto-login
      if (savedEmail && savedPassword) {
        console.log('🔄 Auto-logging in with saved credentials');
        setEmail(savedEmail);
        setPassword(savedPassword);
        // Small delay to show UI before auto-login
        setTimeout(() => {
          handleAdminLogin(true);
        }, 500);
      }
      setCheckingAuth(false);
    } catch (error) {
      console.error('Error checking saved credentials:', error);
      setCheckingAuth(false);
    }
  };

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
  }, [fadeAnim, translateY]);

  const handleAdminLogin = async (isAutoLogin = false) => {
    if (!email.trim() || !password.trim()) {
      CrossPlatformAlert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      // Get FCM token BEFORE login so we can send it with login request
      console.log('📱 Getting FCM token for login...');
      const fcmToken = await getFCMToken();
      console.log('🔑 FCM Token:', fcmToken ? fcmToken.substring(0, 30) + '...' : 'NULL');

      const response = await fetch('https://gharplotbackend.gntechnology.de/admin/login', {
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

      // Debug logging to track the actual response
      console.log('🔍 Admin Login Debug Info:');
      console.log('   Response Status:', response.status, response.statusText);
      console.log('   Response OK:', response.ok);
      console.log('   Response Data:', JSON.stringify(data, null, 2));
      console.log('   Data.success:', data.success);
      console.log('   Data.message:', data.message);
      console.log('   Data.token:', data.token ? 'EXISTS' : 'NULL');

      // Check for successful login based on actual API response structure
      // The API returns success either when:
      // 1. response.ok is true AND data.message === 'Login successful'
      // 2. OR response.ok is true AND data.token exists
      // 3. OR data.success is explicitly true
      if (response.ok && data && (data.success || data.message === 'Login successful' || data.token)) {
        // ✅ IMPORTANT: Clear any old employee tokens to avoid conflicts
        await AsyncStorage.multiRemove([
          'employee_auth_token',
          'employee_token',
          'employeeToken',
          'crm_auth_token',
          'employee_user',
          'employee_permissions'
        ]);
        console.log('🧹 Cleared old employee tokens');

        // Store token and user data
        const token = data.token;
        const user = data.user || data.admin;

        if (token) {
          await AsyncStorage.setItem('admin_token', token);
          await AsyncStorage.setItem('adminToken', token); // Also store with consistent key
          await AsyncStorage.setItem('userType', 'admin');
          await AsyncStorage.setItem('isAuthenticated', 'true');
        }

        if (user) {
          await AsyncStorage.setItem('admin_user', JSON.stringify(user));
          await AsyncStorage.setItem('adminData', JSON.stringify(user)); // Also store with consistent key
          // Store admin ID for FCM token registration
          if (user.id || user._id) {
            await AsyncStorage.setItem('adminId', user.id || user._id);
          }
        }

        // Save credentials for auto-login
        await AsyncStorage.setItem('admin_email', email.trim());
        await AsyncStorage.setItem('admin_password', password.trim());
        console.log('✅ Admin credentials saved for auto-login');

        // Reset notification polling state so admin gets fresh baseline
        try {
          await resetAdminNotificationState();
          console.log('🔄 Reset admin notification polling state for fresh start');
        } catch (err) {
          console.warn('⚠️ Could not reset notification state:', err);
        }

        // FCM token is already sent with login request above
        // Store FCM token locally for reference
        if (fcmToken) {
          await AsyncStorage.setItem('fcmToken', fcmToken);
          await AsyncStorage.setItem('fcmTokenRegistered', 'true');
          console.log('✅ FCM token sent with login and stored locally');
        }

        setLoading(false);
        // Navigate directly without showing alert
        navigation.replace("AdminApp");
      } else {
        setLoading(false);
        const errorMessage = response.status === 401
          ? 'Invalid credentials. Please check your email and password.'
          : response.status === 404
            ? 'Login service not found. Please contact support.'
            : response.status >= 500
              ? 'Server error. Please try again later.'
              : data?.message || data?.error || 'Login failed. Please try again.';

        CrossPlatformAlert.alert("Login Failed", errorMessage);
      }
    } catch (error) {
      setLoading(false);
      console.error('Admin login error:', error);
      CrossPlatformAlert.alert("Error", "Network error. Please check your connection and try again.");
    }
  };

  const switchToEmployeeLogin = () => {
    navigation.navigate("EmployeeLogin");
  };

  if (checkingAuth) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
        <ActivityIndicator size="large" color="#1E90FF" />
      </View>
    );
  }

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
                Login to continue accessing your Admin dashboard.
              </Text>
            </View>

            {/* Tab Switcher */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === "admin" && styles.activeTab]}
                onPress={() => setActiveTab("admin")}
              >
                <Icon name="shield-checkmark" size={20} color={activeTab === "admin" ? "#fff" : "#1E90FF"} />
                <Text style={[styles.tabText, activeTab === "admin" && styles.activeTabText]}>
                  Admin Login
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === "employee" && styles.activeTab]}
                onPress={switchToEmployeeLogin}
              >
                <Icon name="person" size={20} color={activeTab === "employee" ? "#fff" : "#666"} />
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
              onPress={handleAdminLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.loginText}>LOGIN AS ADMIN</Text>
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

export default AdminLogin;
