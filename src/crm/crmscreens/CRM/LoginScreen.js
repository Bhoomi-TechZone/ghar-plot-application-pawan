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
import { useNavigation, useRoute } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import api from "../services/api"; // your API
import authApi from "../services/authApi"; // your custom API functions
import { getStoredFCMToken } from "../utils/fcmService";
import { sendFCMTokenToBackend } from "../services/api";

const LoginScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success"); // success, error

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(40)).current;
  const toastAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();

    // Check if coming from signup with phone number
    if (route.params?.phoneNumber && route.params?.fromSignup) {
      setPhone(route.params.phoneNumber);
      // Show toast notification
      setTimeout(() => {
        showToast("Signup Successful! 🎉 Please login to continue", "success");
      }, 500);
    }
  }, [route.params]);

  // Toast notification function
  const showToast = (message, type = "success") => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);

    Animated.sequence([
      Animated.timing(toastAnim, {
        toValue: 50,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.delay(3000),
      Animated.timing(toastAnim, {
        toValue: -100,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToastVisible(false);
    });
  };

  const handleLogin = async () => {
    // Validation
    if (!phone.trim()) {
      alert("Please enter your phone number");
      return;
    }
    if (phone.length < 10) {
      alert("Please enter a valid 10-digit phone number");
      return;
    }

    try {
      setLoading(true);

      // Phone OTP login - Send OTP via backend
      const res = await authApi.sendPhoneOtp(phone.trim());
      
      setLoading(false);
      
      if (res.success) {
        // Check if development mode with OTP
        if (res.isDevelopmentMode && res.otp) {
          showToast(`${res.message || "OTP sent successfully!"} - Your OTP: ${res.otp}`, "success");
        } else {
          showToast(res.message || "OTP sent successfully! ✅", "success");
        }
        
        setTimeout(() => {
          navigation.navigate("OtpScreen", { 
            phone: phone.trim(), 
            mode: "phone",
            developmentOTP: res.otp || null // Pass OTP to OTP screen
          });
        }, 1000);
      } else {
        showToast(res.message || "Failed to send OTP. Please try again.", "error");
      }
    } catch (error) {
      setLoading(false);
      
      let errorMessage = "Something went wrong. Please try again!";
      
      if (error.message) {
        if (error.message.includes('network') || 
            error.message.includes('Network') ||
            error.message.includes('timeout')) {
          errorMessage = "Network error. Please check your internet connection.";
        } else if (error.message.includes('500')) {
          errorMessage = "Server error. Please try again later.";
        } else {
          errorMessage = error.message;
        }
      }
      
      showToast(errorMessage, "error");
    }
  };

  const LogoImage = require("../assets/New_logo.png");

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />

      {/* Toast Notification */}
      {toastVisible && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              backgroundColor: toastType === "success" ? "#4CAF50" : "#F44336",
              transform: [{ translateY: toastAnim }],
            },
          ]}
        >
          <Icon
            name={toastType === "success" ? "checkmark-circle" : "close-circle"}
            size={24}
            color="#fff"
            style={styles.toastIcon}
          />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.contentContainer,
              { opacity: fadeAnim, transform: [{ translateY }] },
            ]}
          >
              {/* Logo Section */}
              <View style={styles.logoContainer}>
                <View style={styles.logoCircle}>
                  <Image source={LogoImage} style={styles.logoImage} />
                </View>
                <Text style={styles.logoText}>Gharplot.in</Text>
                <Text style={styles.tagline}>Your Dream Home Awaits</Text>
              </View>

              {/* Main Card */}
              <View style={styles.card}>
            <Text style={styles.title}>Welcome Back 👋</Text>
            <Text style={styles.subtitle}>Login with your phone number</Text>

            <View style={styles.inputContainer}>
              <Icon name="call-outline" size={20} color="#1E90FF" style={styles.inputIcon} />
              <TextInput
                placeholder="Enter phone number"
                placeholderTextColor="#999"
                style={styles.input}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                maxLength={10}
              />
            </View>

            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              style={[
                styles.loginButton,
                loading && { opacity: 0.7 }
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.loginText}>Send OTP</Text>
                  <Icon name="arrow-forward-outline" size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              onPress={() => navigation.navigate("SignupScreen")}
              style={styles.signupButton}
            >
              <Text style={styles.signupText}>
                Don't have an account?{" "}
                <Text style={styles.signupBold}>Sign up</Text>
              </Text>
            </TouchableOpacity>
              </View>
            </Animated.View>
          </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  logoContainer: { 
    alignItems: "center", 
    marginBottom: 40,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#f0f8ff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#1E90FF",
    marginBottom: 16,
    shadowColor: "#1E90FF",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  logoImage: {
    width: 80,
    height: 80,
    resizeMode: "contain",
  },
  logoText: {
    color: "#1E90FF",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  tagline: { 
    color: "#666", 
    fontSize: 15, 
    marginTop: 8,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1a1a1a",
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    marginBottom: 24,
    textAlign: "center",
    fontWeight: "500",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fafafa",
    borderRadius: 14,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    height: 56,
    minHeight: 56,
  },
  focused: {
    borderColor: "#1E90FF",
    backgroundColor: "#ffffff",
    shadowColor: "#1E90FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
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
  loginText: { 
    color: "#fff", 
    fontSize: 17, 
    fontWeight: "700", 
    marginRight: 8,
    letterSpacing: 0.5,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 28,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e0e0e0",
  },
  dividerText: {
    color: "#999",
    marginHorizontal: 16,
    fontSize: 13,
    fontWeight: "600",
  },
  signupButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  signupText: { 
    textAlign: "center", 
    color: "#666", 
    fontSize: 15,
    fontWeight: "500",
  },
  signupBold: { 
    color: "#1E90FF", 
    fontWeight: "700",
  },
  toastContainer: {
    position: "absolute",
    top: 40,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 9999,
  },
  toastIcon: {
    marginRight: 12,
  },
  toastText: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
