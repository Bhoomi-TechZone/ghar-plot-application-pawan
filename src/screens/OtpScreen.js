import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Image,
  Alert,
  ActivityIndicator,
  Animated,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/Ionicons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStoredFCMToken } from "../utils/fcmService";
import { sendFCMTokenToBackend } from "../services/api";
import authApi from "../services/authApi";
import { storeUserCredentials } from '../utils/authManager';

const OtpScreen = ({ route, navigation }) => {
  const { phone, mode = "phone", developmentOTP = null } = route.params;
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");
  const inputs = useRef([]);
  const toastAnim = useRef(new Animated.Value(-100)).current;

  // Auto-fill OTP if in development mode
  React.useEffect(() => {
    if (developmentOTP) {
      const otpDigits = developmentOTP.toString().split('');
      if (otpDigits.length === 4) {
        setOtp(otpDigits);
        showToast(`Development Mode: OTP ${developmentOTP} auto-filled`, "success");
      }
    }
  }, [developmentOTP]);

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
      Animated.delay(2500),
      Animated.timing(toastAnim, {
        toValue: -100,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToastVisible(false);
    });
  };

  const handleChange = (text, index) => {
    if (/^\d$/.test(text)) {
      const newOtp = [...otp];
      newOtp[index] = text;
      setOtp(newOtp);

      // Auto move to next input
      if (index < 3 && text) {
        inputs.current[index + 1].focus();
      }
    } else if (text === "") {
      const newOtp = [...otp];
      newOtp[index] = "";
      setOtp(newOtp);
    }
  };

  const verifyOtp = async () => {
    const enteredOtp = otp.join("");
    
    // Validate OTP length
    if (enteredOtp.length !== 4) {
      showToast("Please enter a complete 4-digit OTP.", "error");
      return;
    }

    try {
      setLoading(true);
      
      // Call the verify phone OTP API
      const response = await authApi.verifyPhoneOtp(phone, enteredOtp);
      
      console.log('================================================');
      console.log('🔍 OTP VERIFICATION RESPONSE (Full):');
      console.log(JSON.stringify(response, null, 2));
      console.log('================================================');
      console.log('📊 Response Details:');
      console.log('  - success:', response.success);
      console.log('  - token:', response.token ? 'EXISTS ✅' : 'NOT FOUND ❌');
      console.log('  - user:', response.user ? 'EXISTS ✅' : 'NOT FOUND ❌');
      console.log('  - isNewUser:', response.isNewUser);
      console.log('================================================');
      
      // Check if OTP verification was successful
      if (response.success) {
        
        // ALL USERS (both old and new) - Direct to Home
        console.log('✅✅✅ USER VERIFIED - NAVIGATING TO HOME ✅✅✅');
        console.log('→ Response:', JSON.stringify(response, null, 2));
        
        // Save user profile to AsyncStorage (from OTP response or create default)
        const userProfile = response.user || {
          id: response.userId || Date.now().toString(),
          phone: phone,
          fullName: 'User',
          email: ''
        };
        
        try {
          await AsyncStorage.setItem('userProfile', JSON.stringify(userProfile));
          console.log('💾 User profile saved to AsyncStorage:', userProfile);
        } catch (profileError) {
          console.warn('Failed to save user profile:', profileError);
        }
        
        // Store credentials for persistent login
        const tokenToStore = response.token || `temp_token_${Date.now()}`;
        const userIdToStore = userProfile.id;
        
        await storeUserCredentials(tokenToStore, userIdToStore);
        console.log('💾 Credentials saved to AsyncStorage');
        
        // Send FCM token to backend after successful OTP verification
        try {
          const fcmToken = await getStoredFCMToken();
          
          if (fcmToken && userIdToStore) {
            await sendFCMTokenToBackend(userIdToStore, fcmToken);
          }
        } catch (fcmError) {
          console.log('FCM token error (non-critical):', fcmError);
        }
        
        setLoading(false);
        showToast("Welcome! 🎉", "success");
        
        setTimeout(() => {
          console.log('🏠 Navigating to Home...');
          navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }]
          });
        }, 1500);
        
      } else {
        // OTP verification failed
        console.log('❌ OTP Verification failed:', response.message);
        setLoading(false);
        showToast(response.message || "Invalid OTP. Please try again.", "error");
      }
      
    } catch (error) {
      console.error("❌ OTP Verification Error:", error);
      setLoading(false);
      
      // Check if error is "user already exists" type
      if (error.message && (
          error.message.includes('already exists') ||
          error.message.includes('already registered') ||
          error.message.includes('Phone number already')
      )) {
        console.log('⚠️ User already exists error during OTP verification');
        
        // Check if we have existing token in storage
        try {
          const existingToken = await AsyncStorage.getItem('userToken');
          const existingUserId = await AsyncStorage.getItem('userId');
          
          if (existingToken && existingUserId) {
            console.log('✅ Found existing credentials - Logging in...');
            showToast("Welcome back! 🎉", "success");
            
            setTimeout(() => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'Home' }]
              });
            }, 1500);
            return;
          }
        } catch (storageError) {
          console.error('Error checking AsyncStorage:', storageError);
        }
        
        // If no token found, redirect to login
        showToast("Account exists. Please login again.", "info");
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'LoginScreen' }]
          });
        }, 1500);
      } else {
        showToast(error.message || "Invalid OTP. Please try again.", "error");
      }
    }
  };

  const resendOtp = async () => {
    try {
      setResending(true);
      const response = await authApi.sendPhoneOtp(phone);
      
      if (response.success) {
        // Check if development mode with OTP
        if (response.isDevelopmentMode && response.otp) {
          showToast(`${response.message || "OTP sent successfully!"} - Your OTP: ${response.otp}`, "success");
          // Auto-fill the development OTP
          const otpDigits = response.otp.toString().split('');
          if (otpDigits.length === 4) {
            setOtp(otpDigits);
          }
        } else {
          showToast(response.message || "OTP sent successfully! ✅", "success");
        }
      } else {
        // Phone not registered
        showToast(response.message || "Phone number not registered. Please sign up first.", "error");
        
        // Navigate back to login after 2 seconds
        setTimeout(() => {
          navigation.goBack();
        }, 2000);
      }
      
      setResending(false);
    } catch (error) {
      console.error("Resend OTP Error:", error);
      setResending(false);
      showToast(error.message || "Failed to resend OTP", "error");
    }
  };

  return (
    <ImageBackground
      source={require("../assets/realestate-bg.png")}
      style={styles.background}
      blurRadius={4}
    >
      <View style={styles.overlay}>
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

        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require("../assets/New_logo.png")}
            style={styles.logo}
          />
          <Text style={styles.brandName}>Gharplot</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.title}>Enter OTP</Text>
          <Text style={styles.subtitle}>We sent an OTP to {phone}</Text>
          
          {/* Development Mode Notice */}
          {developmentOTP && (
            <View style={styles.devModeContainer}>
              <Text style={styles.devModeText}>
                🔧 Development Mode: OTP is {developmentOTP}
              </Text>
            </View>
          )}

          {/* OTP Boxes */}
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputs.current[index] = ref)}
                style={styles.otpBox}
                keyboardType="number-pad"
                maxLength={1}
                value={digit}
                onChangeText={(text) => handleChange(text, index)}
                onKeyPress={({ nativeEvent }) => {
                  if (
                    nativeEvent.key === "Backspace" &&
                    otp[index] === "" &&
                    index > 0
                  ) {
                    inputs.current[index - 1].focus();
                  }
                }}
              />
            ))}
          </View>

          {/* Verify Button */}
          <TouchableOpacity onPress={verifyOtp} disabled={loading}>
            <LinearGradient
              colors={loading ? ["#ccc", "#aaa"] : ["#1E90FF", "#5DA9F6"]}
              style={styles.loginBtn}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Verify OTP</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Resend OTP */}
          <TouchableOpacity
            onPress={resendOtp}
            disabled={resending}
          >
            <Text style={styles.resendText}>
              {resending ? "Sending..." : "Resend OTP"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  logoContainer: { alignItems: "center", marginBottom: 30 },
  logo: { width: 110, height: 110, resizeMode: "contain" },
  brandName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 5,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 20,
    padding: 25,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 8,
    alignItems: "center",
  },
  title: { fontSize: 26, fontWeight: "bold", color: "#111", marginBottom: 10 },
  subtitle: {
    fontSize: 14,
    color: "#444",
    marginBottom: 20,
    textAlign: "center",
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
    width: "80%",
  },
  otpBox: {
    width: 55,
    height: 55,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    textAlign: "center",
    fontSize: 20,
    backgroundColor: "#fff",
    elevation: 3,
    color: "#000",
  },
  loginBtn: {
    paddingVertical: 15,
    paddingHorizontal:15,
    borderRadius: 12,
    alignItems: "center",
    width: "100%",
    marginBottom: 15,
  },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  resendText: {
  color: "#1E90FF",
    fontSize: 14,
    marginTop: 10,
    textAlign: "center",
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
    lineHeight: 20,
  },
  devModeContainer: {
    backgroundColor: "#FFF3CD",
    borderColor: "#FFC107",
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    alignItems: "center",
  },
  devModeText: {
    color: "#856404",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});

export default OtpScreen;
