import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from "react-native";
import { checkAutoLogin } from '../utils/authManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get("window");

const SplashScreen = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;



  useEffect(() => {
    // Start animations
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 2000, // Reduced duration for faster loading
        useNativeDriver: false,
      }),
    ]).start();

    // 🎯 CRITICAL: Check for initial notification FIRST before auto-login
    const handleInitialNavigation = async () => {
      console.log('🚀 SplashScreen: Checking for initial notification...');
      
      let shouldDoAutoLogin = true; 
      let isTimedOut = false;

      // 🛡️ SAFETY FALLBACK: If notification check takes > 5s, force auto-login
      const safetyTimeout = setTimeout(() => {
        if (shouldDoAutoLogin) {
          console.log('🛡️ SplashScreen: Safety timeout reached, forcing auto-login');
          isTimedOut = true;
          checkAutoLogin(navigation);
        }
      }, 5000);
      
      try {
        const messaging = require('@react-native-firebase/messaging').default;
        const remoteMessage = await messaging().getInitialNotification();
        
        if (isTimedOut) return; // Stop if already proceeded via timeout

        if (remoteMessage) {
          console.log('📬 App opened from notification (killed state):', JSON.stringify(remoteMessage.data, null, 2));
          
          const notificationData = remoteMessage.data || {};
          const notificationType = String(
            notificationData.type || notificationData.notificationType || ''
          ).toLowerCase();

          // These notifications show the in-app reminder dialog when tapped
          // from the background.  Queue the exact same dialog for a cold start
          // as well, because onNotificationOpenedApp is not called when the
          // app was fully closed.
          const opensReminderPopup = [
            'reminder',
            'enquiry_reminder',
            'admin_reminder',
            'employee_reminder_to_admin',
            'employee_due_reminder',
          ].includes(notificationType) || !!notificationData.alertId;
          
          // Check if user is logged in
          const adminToken = await AsyncStorage.getItem('adminToken');
          const userToken = await AsyncStorage.getItem('userToken');
          const crmToken = await AsyncStorage.getItem('crm_token');
          
          if (adminToken || userToken || crmToken) {
            if (notificationType === 'alert' || notificationType === 'system_alert') {
              const params = {
                alertId: notificationData.alertId?.replace('alert_', '') || notificationData.id?.replace('alert_', '') || Date.now().toString(),
                originalReason: notificationData.reason || notificationData.body || notificationData.message || '',
                originalDate: notificationData.date,
                originalTime: notificationData.time,
                repeatDaily: notificationData.repeatDaily === 'true' || notificationData.repeatDaily === true,
              };
              
              clearTimeout(safetyTimeout);
              navigation.replace('EditAlert', params);
              shouldDoAutoLogin = false;
            } else if (opensReminderPopup) {
              // Store for App.js to show the dialog after navigation and popup
              // callbacks are ready. This also covers an app opened from a
              // fully closed state by an admin FCM notification.
              await AsyncStorage.setItem('pendingNotificationData', JSON.stringify({
                triggerReminderPopup: true,
                data: {
                  ...notificationData,
                  title: notificationData.title || remoteMessage.notification?.title,
                  note: notificationData.note || notificationData.body || notificationData.message || remoteMessage.notification?.body,
                },
                timestamp: Date.now()
              }));
              shouldDoAutoLogin = true; 
            }
          }
        }
      } catch (error) {
        console.error('❌ SplashScreen Error:', error);
      }
      
      if (shouldDoAutoLogin && !isTimedOut) {
        clearTimeout(safetyTimeout);
        checkAutoLogin(navigation);
      }
    };

    const timer = setTimeout(handleInitialNavigation, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />

      <Animated.View
        style={[
          styles.centerContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          },
        ]}
      >
        {/* Logo with Simple Animated Circle */}
        <View style={styles.logoWrapper}>
          <View style={styles.circularProgress}>
            <Animated.View
              style={[
                styles.progressCircle,
                {
                  opacity: progressAnim,
                  transform: [{ 
                    rotate: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg']
                    })
                  }]
                }
              ]}
            />
          </View>

          <View style={styles.logoCircle}>
            <Image
              source={require("../assets/Blue_logo.png")} // your blue logo
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </View>

        <Text style={styles.title}>Gharplot.in</Text>
        <Text style={styles.subtitle}>Your Dream Home Awaits</Text>
      </Animated.View>

      {/* Progress Bar */}
      <View style={styles.bottomContainer}>
        <View style={styles.progressBackground}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          />
        </View>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff", // White background
    alignItems: "center",
    justifyContent: "center",
  },
  centerContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 25,
  },
  circularProgress: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 8,
    borderColor: "rgba(0,0,0,0.05)",
  },
  progressCircle: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 8,
    borderColor: "transparent",
    borderTopColor: "#007bff",
    borderRightColor: "#00b4d8",
  },
  logoCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "#f8f9fa",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#e3f2fd",
  },
  logo: {
    width: 90,
    height: 90,
  },
  title: {
    fontSize: 36,
    color: "#007bff", // Primary blue
    fontWeight: "800",
    letterSpacing: 1.2,
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#343a40", // Dark gray
    marginTop: 5,
  },
  bottomContainer: {
    position: "absolute",
    bottom: 70,
    alignItems: "center",
    width: width * 0.65,
  },
  progressBackground: {
    width: "100%",
    height: 8,
    borderRadius: 20,
    backgroundColor: "#e9ecef",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#007bff",
    borderRadius: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: "#495057",
    letterSpacing: 1,
    fontWeight: "600",
  },
});

export default SplashScreen;
