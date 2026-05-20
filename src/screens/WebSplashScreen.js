import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { checkAutoLogin } from '../utils/authManager';

const { width } = Dimensions.get("window");

const WebSplashScreen = ({ navigation }) => {
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
        duration: 2000,
        useNativeDriver: false,
      }),
    ]).start();

    // Check login status after animations complete
    const timer = setTimeout(() => {
      console.log('🚀 SplashScreen: Starting auto-login check...');
      checkAutoLogin(navigation);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.centerContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          },
        ]}
      >
        {/* Logo without SVG for web compatibility */}
        <View style={styles.logoWrapper}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>G</Text>
            {Platform.OS !== 'web' && (
              <Image
                source={require("../assets/Blue_logo.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            )}
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
    backgroundColor: "#ffffff",
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
  logoCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "#007bff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#e3f2fd",
  },
  logoText: {
    fontSize: 60,
    color: "white",
    fontWeight: "bold",
  },
  logo: {
    width: 90,
    height: 90,
    position: 'absolute',
  },
  title: {
    fontSize: 36,
    color: "#007bff",
    fontWeight: "800",
    letterSpacing: 1.2,
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#343a40",
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

export default WebSplashScreen;