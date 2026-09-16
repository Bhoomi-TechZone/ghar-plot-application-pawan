import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { isUserAuthenticated } from '../utils/authCheck';

const { width } = Dimensions.get('window');

/**
 * GuestBlockerScreen - Shows when guest users try to access Profile or Saved screens
 * Redirects to Login/Signup or allows going back to Home
 */
const GuestBlockerScreen = ({ navigation, route }) => {
  const screenName = route?.params?.screenName || 'this feature';
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    const isAuthenticated = await isUserAuthenticated();
    
    if (isAuthenticated) {
      // User is logged in, navigate to actual screen
      const targetScreen = route?.params?.targetScreen;
      if (targetScreen) {
        navigation.replace(targetScreen);
      } else {
        navigation.goBack();
      }
    } else {
      // User is guest, show blocker
      setIsChecking(false);
    }
  };

  const handleLogin = () => {
    navigation.navigate('LoginScreen');
  };

  const handleSignup = () => {
    navigation.navigate('SignupScreen');
  };

  const handleGoHome = () => {
    navigation.navigate('Home');
  };

  if (isChecking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Icon name="lock-closed-outline" size={60} color="#1E90FF" />
          <Text style={styles.checkingText}>Checking authentication...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
      
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={['#1E90FF', '#4BA3FF']}
            style={styles.iconGradient}
          >
            <Icon name="lock-closed-outline" size={60} color="#FFFFFF" />
          </LinearGradient>
        </View>

        {/* Title */}
        <Text style={styles.title}>Login Required</Text>

        {/* Message */}
        <Text style={styles.message}>
          Please login or signup to access {screenName}
        </Text>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          {/* Login Button */}
          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#1E90FF', '#4BA3FF']}
              style={styles.buttonGradient}
            >
              <Text style={styles.loginButtonText}>Login</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Signup Button */}
          <TouchableOpacity
            style={styles.signupButton}
            onPress={handleSignup}
            activeOpacity={0.8}
          >
            <Text style={styles.signupButtonText}>Signup</Text>
          </TouchableOpacity>

          {/* Continue as Guest / Go to Home */}
          <TouchableOpacity
            style={styles.guestButton}
            onPress={handleGoHome}
            activeOpacity={0.8}
          >
            <Icon name="home-outline" size={20} color="#6B7280" style={{ marginRight: 8 }} />
            <Text style={styles.guestButtonText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  iconContainer: {
    marginBottom: 30,
  },
  iconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1E90FF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 400,
    gap: 12,
  },
  loginButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  signupButton: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#1E90FF',
    alignItems: 'center',
  },
  signupButtonText: {
    color: '#1E90FF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  guestButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

export default GuestBlockerScreen;
