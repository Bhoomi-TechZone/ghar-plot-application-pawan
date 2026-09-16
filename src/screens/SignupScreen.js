import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  FlatList,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as authApi from "../services/authApi";
import { storeUserCredentials } from '../utils/authManager';

const SignupScreen = ({ navigation, route }) => {
  // Get phone number from route params if coming from OTP screen
  const phoneNumber = route?.params?.phoneNumber || "";
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedYear, setSelectedYear] = useState(1995);
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [selectedDay, setSelectedDay] = useState(1);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: phoneNumber, // Auto-fill phone number
    dob: "", // Date of Birth in YYYY-MM-DD format
  });

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(40)).current;
  const toastAnim = useRef(new Animated.Value(-100)).current;
  const animationStarted = useRef(false); // Prevent animation from running multiple times

  useEffect(() => {
    // Only run animation once when component mounts
    if (!animationStarted.current) {
      animationStarted.current = true;
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
    }
  }, []); // Empty dependency array - run only once

  // Update phone number when route params change
  useEffect(() => {
    if (phoneNumber && phoneNumber !== form.phone) {
      console.log('📱 Auto-filling phone number:', phoneNumber);
      setForm(prevForm => ({
        ...prevForm,
        phone: phoneNumber
      }));
    }
  }, [phoneNumber]);

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

  const handleNext = () => {
    const isValid = validateForm();
    if (!isValid) return;
    
    handleSignup();
  };

  const handlePrevious = () => {
    navigation.goBack();
  };

  // Generate year, month, day arrays
  const years = Array.from({ length: 76 }, (_, i) => 2025 - i); // 1950 to 2025
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];
  
  // Get days in selected month
  const getDaysInMonth = (year, month) => {
    return new Date(year, month, 0).getDate();
  };
  
  const days = Array.from({ length: getDaysInMonth(selectedYear, selectedMonth) }, (_, i) => i + 1);

  // Date picker handlers
  const openDatePicker = () => {
    setShowDatePicker(true);
  };

  const closeDatePicker = () => {
    setShowDatePicker(false);
  };

  const confirmDate = () => {
    const year = selectedYear;
    const month = String(selectedMonth).padStart(2, '0');
    const day = String(selectedDay).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    
    setForm({ ...form, dob: formattedDate });
    closeDatePicker();
  };

  const getLocationFromAddress = async (address, city, state) => {
    try {
      const fullAddress = `${address}, ${city}, ${state}, India`;
      console.log('Getting coordinates for address:', fullAddress);
      
      // Using free Nominatim geocoding service (OpenStreetMap)
      const encodedAddress = encodeURIComponent(fullAddress);
      const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1&countrycodes=in`;
      
      const response = await fetch(geocodeUrl, {
        headers: {
          'User-Agent': 'GharPlotApp/1.0' // Required by Nominatim
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const { lat, lon } = data[0];
          
          const locationData = {
            latitude: parseFloat(lat), 
            longitude: parseFloat(lon),
            address: fullAddress,
            city: city,
            state: state
          };
          
          await AsyncStorage.setItem("userLocation", JSON.stringify(locationData));
          
          console.log('Location saved from address:', locationData);
          return locationData;
        }
      }
      
      // Fallback: Use city-based coordinates for major Indian cities
      const cityCoordinates = {
        'delhi': { latitude: 28.6139, longitude: 77.2090 },
        'mumbai': { latitude: 19.0760, longitude: 72.8777 },
        'bangalore': { latitude: 12.9716, longitude: 77.5946 },
        'chennai': { latitude: 13.0827, longitude: 80.2707 },
        'kolkata': { latitude: 22.5726, longitude: 88.3639 },
        'hyderabad': { latitude: 17.3850, longitude: 78.4867 },
        'pune': { latitude: 18.5204, longitude: 73.8567 },
        'ahmedabad': { latitude: 23.0225, longitude: 72.5714 },
        'jaipur': { latitude: 26.9124, longitude: 75.7873 },
        'lucknow': { latitude: 26.8467, longitude: 80.9462 }
      };
      
      const cityKey = city.toLowerCase().trim();
      const cityLocation = cityCoordinates[cityKey] || cityCoordinates['delhi'];
      
      const locationData = {
        ...cityLocation,
        address: fullAddress,
        city: city,
        state: state
      };
      
      await AsyncStorage.setItem("userLocation", JSON.stringify(locationData));
      
      console.log('Using city-based location for:', city, locationData);
      return locationData;
      
    } catch (error) {
      console.error('Error getting location from address:', error);
      
      // Final fallback: Delhi coordinates
      const defaultLocation = {
        latitude: 28.6139, 
        longitude: 77.2090,
        address: `${address}, ${city}, ${state}`,
        city: city,
        state: state
      };
      
      await AsyncStorage.setItem("userLocation", JSON.stringify(defaultLocation));
      
      return defaultLocation;
    }
  };

  // Add email validation
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Add phone validation  
  const validatePhone = (phone) => {
    const phoneRegex = /^[6-9]\d{9}$/; // Indian phone number format
    return phoneRegex.test(phone);
  };

  // Check if email already exists (simple version - you can implement this endpoint later)
  const checkEmailExists = async (email) => {
    try {
      // For now, just return false to skip email checking
      // You can implement this API endpoint later: /auth/check-email
      return false;
    } catch (error) {
      console.log('Email check failed:', error);
      return false; // If check fails, continue with signup
    }
  };

  // Add validation for the form
  const validateForm = () => {
    if (!form.fullName.trim()) {
      showToast("Please enter your full name.", "error");
      return false;
    }
    if (!form.email.trim()) {
      showToast("Please enter your email address.", "error");
      return false;
    }
    if (!validateEmail(form.email)) {
      showToast("Please enter a valid email address.", "error");
      return false;
    }
    
    if (!form.phone.trim()) {
      showToast("Please enter your phone number.", "error");
      return false;
    }
    if (!validatePhone(form.phone)) {
      showToast("Please enter a valid 10-digit phone number.", "error");
      return false;
    }
    
    if (!form.dob.trim()) {
      showToast("Please enter your date of birth.", "error");
      return false;
    }
    
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(form.dob)) {
      showToast("Please enter date in YYYY-MM-DD format (e.g., 1995-08-14).", "error");
      return false;
    }
    
    return true;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      console.log('Starting registration...');

      // Prepare user data for complete-registration API
      const userData = {
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        dob: form.dob.trim(), // YYYY-MM-DD format
      };

      console.log('Completing registration with data:', userData);

      // Call the complete-registration API (returns token directly)
      const result = await authApi.completeRegistration(userData);
      
      console.log('Registration completed:', result);
      
      if (result.success && result.token) {
        // Token already saved by completeRegistration function
        // Store userId if available
        if (result.user?.id) {
          await storeUserCredentials(result.token, result.user.id);
        }
        
        // Update the userProfile in AsyncStorage with complete data
        const updatedProfile = {
          id: result.user?.id || Date.now().toString(),
          phone: userData.phone,
          fullName: userData.fullName,
          email: userData.email,
          dob: userData.dob
        };
        await AsyncStorage.setItem('userProfile', JSON.stringify(updatedProfile));
        
        // Show success toast
        showToast("Account created successfully! 🎉", "success");
        
        // Check if coming from AddProperty or Profile flow
        const fromAddProperty = route?.params?.fromAddProperty;
        const fromProfile = route?.params?.fromProfile;
        
        setTimeout(() => {
          if (fromAddProperty) {
            // Navigate back to Home with AddSell tab
            navigation.reset({
              index: 0,
              routes: [{ name: 'Home' }],
            });
            // Then navigate to AddSell
            setTimeout(() => {
              navigation.navigate('AddSell');
            }, 500);
          } else if (fromProfile) {
            // Navigate back to Home (which will automatically refresh Profile)
            navigation.reset({
              index: 0,
              routes: [{ name: 'Home' }],
            });
            // Then navigate to Profile tab
            setTimeout(() => {
              navigation.navigate('Profile');
            }, 500);
          } else {
            // Navigate directly to Home screen
            navigation.reset({
              index: 0,
              routes: [{ name: 'Home' }],
            });
          }
        }, 1500);
      } else {
        throw new Error(result.message || 'Registration failed');
      }

    } catch (error) {
      console.error("Registration error:", error);
      
      let errorMessage = "Failed to complete registration. Please try again.";
      
      // Handle specific error messages
      if (error.message) {
        if (error.message.includes('email already exists') || 
            error.message.includes('User with this email already exists') ||
            error.message.includes('already registered') ||
            error.message.includes('Phone number already') ||
            error.message.includes('User already exists') ||
            error.message.includes('already exist')) {
          
          console.log('⚠️ User already exists - Checking for existing token...');
          
          // User already registered - Check if we have token in AsyncStorage
          try {
            const existingToken = await AsyncStorage.getItem('userToken');
            const existingUserId = await AsyncStorage.getItem('userId');
            
            if (existingToken && existingUserId) {
              console.log('✅ Found existing credentials - Logging in...');
              showToast("Welcome back! Logging you in... 🎉", "success");
              
              setTimeout(() => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Home' }],
                });
              }, 1500);
              return;
            } else {
              console.log('⚠️ No existing token found - Redirecting to login...');
              showToast("Account already exists. Please login.", "info");
              
              setTimeout(() => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'LoginScreen' }],
                });
              }, 1500);
              return;
            }
          } catch (storageError) {
            console.error('Error checking AsyncStorage:', storageError);
          }
          
          return;
        } else if (error.message.includes('validation')) {
          errorMessage = "Please check your details and try again.";
        } else if (error.message.includes('network') || error.message.includes('timeout')) {
          errorMessage = "Network error. Please check your internet connection.";
        } else {
          errorMessage = error.message;
        }
      }
      
      showToast(errorMessage, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const renderInput = (
    icon,
    placeholder,
    key,
    secure = false,
    keyboard = "default"
  ) => {
    const isPasswordField = key === 'password';
    const isConfirmPasswordField = key === 'confirmPassword';
    const shouldShowPassword = isPasswordField ? showPassword : (isConfirmPasswordField ? showConfirmPassword : false);
    const isPhoneField = key === 'phone';
    const isPhoneFromOTP = isPhoneField && phoneNumber; // Phone came from OTP screen
    const isDOBField = key === 'dob';
    
    // Special rendering for DOB field with date picker
    if (isDOBField) {
      return (
        <TouchableOpacity
          style={styles.inputContainer}
          onPress={openDatePicker}
          activeOpacity={0.7}
        >
          <Icon name={icon} size={20} color="#1E90FF" style={styles.inputIcon} />
          <Text style={[styles.input, !form.dob && styles.placeholderText]}>
            {form.dob || placeholder}
          </Text>
          <Icon name="chevron-down-outline" size={20} color="#999" />
        </TouchableOpacity>
      );
    }
    
    return (
      <View style={[
        styles.inputContainer,
        isPhoneFromOTP && styles.disabledInput,
      ]}>
        <Icon name={icon} size={20} color="#1E90FF" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#999"
          keyboardType={keyboard}
          secureTextEntry={secure && !shouldShowPassword}
          value={form[key]}
          onChangeText={(text) => setForm({ ...form, [key]: text })}
          autoCapitalize={key === 'email' ? 'none' : 'sentences'}
          editable={!isPhoneFromOTP}
        />
        {isPhoneFromOTP && (
          <Icon name="checkmark-circle" size={20} color="#4CAF50" />
        )}
        {secure && (
          <TouchableOpacity 
            onPress={() => {
              if (isPasswordField) {
                setShowPassword(!showPassword);
              } else if (isConfirmPasswordField) {
                setShowConfirmPassword(!showConfirmPassword);
              }
            }}
          >
            <Icon
              name={shouldShowPassword ? "eye-off-outline" : "eye-outline"}
              size={20}
              color="#999"
            />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderStep = useMemo(() => {
    // Single step registration with 4 fields
    return (
      <>
        {renderInput("person-outline", "Full Name", "fullName")}
        {renderInput(
          "mail-outline",
          "Email Address",
          "email",
          false,
          "email-address"
        )}
        {renderInput(
          "call-outline",
          "Phone Number",
          "phone",
          false,
          "phone-pad"
        )}
        {renderInput(
          "calendar-outline",
          "Date of Birth (YYYY-MM-DD)",
          "dob",
          false,
          "default"
        )}
      </>
    );
  }, [form, showPassword, showConfirmPassword, phoneNumber]);

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
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <Animated.View
            style={[
              styles.container,
              { opacity: fadeAnim, transform: [{ translateY }] },
            ]}
          >
            {/* Signup Card */}
            <View style={styles.card}>
              <Text style={styles.title}>Complete Registration ✨</Text>
              <Text style={styles.subtitle}>Fill in your details to get started</Text>

              {renderStep}

              {/* Submit Button */}
              <TouchableOpacity 
                onPress={handleNext} 
                activeOpacity={0.85}
                disabled={isLoading}
                style={[
                  styles.nextButton,
                  styles.fullWidthButton,
                  isLoading && { opacity: 0.6 }
                ]}
              >
                <Text style={styles.nextText}>
                  {isLoading ? "Creating Account..." : "Complete Registration"}
                </Text>
                <Icon name="checkmark-circle" size={18} color="#fff" />
              </TouchableOpacity>

              {/* Continue as Guest Button */}
              <TouchableOpacity
                onPress={() => navigation.navigate("Home")}
                style={styles.guestButton}
              >
                <Icon name="person-outline" size={20} color="#6B7280" style={{ marginRight: 8 }} />
                <Text style={styles.guestButtonText}>Continue as Guest</Text>
              </TouchableOpacity>

              {/* Redirect */}
              <TouchableOpacity onPress={() => navigation.navigate("LoginScreen")}>
                <Text style={styles.signupText}>
                  Already have an account?{" "}
                  <Text style={styles.signupBold}>Login</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Custom Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={closeDatePicker}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerContainer}>
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>Select Date of Birth</Text>
              <TouchableOpacity onPress={closeDatePicker}>
                <Icon name="close-circle" size={28} color="#999" />
              </TouchableOpacity>
            </View>

            <View style={styles.datePickerBody}>
              {/* Day Picker */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Day</Text>
                <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                  {days.map((day) => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.pickerItem,
                        selectedDay === day && styles.pickerItemSelected,
                      ]}
                      onPress={() => setSelectedDay(day)}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          selectedDay === day && styles.pickerItemTextSelected,
                        ]}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Month Picker */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Month</Text>
                <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                  {months.map((month) => (
                    <TouchableOpacity
                      key={month.value}
                      style={[
                        styles.pickerItem,
                        selectedMonth === month.value && styles.pickerItemSelected,
                      ]}
                      onPress={() => setSelectedMonth(month.value)}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          selectedMonth === month.value && styles.pickerItemTextSelected,
                        ]}
                      >
                        {month.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Year Picker */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Year</Text>
                <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                  {years.map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.pickerItem,
                        selectedYear === year && styles.pickerItemSelected,
                      ]}
                      onPress={() => setSelectedYear(year)}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          selectedYear === year && styles.pickerItemTextSelected,
                        ]}
                      >
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <TouchableOpacity style={styles.confirmButton} onPress={confirmDate}>
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 20,
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
    letterSpacing: 0.3,
  },
  subtitle: { 
    fontSize: 14, 
    color: "#1E90FF", 
    marginBottom: 24,
    fontWeight: "600",
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
  disabledInput: {
    backgroundColor: "#e8f5e9",
    borderColor: "#4CAF50",
  },
  inputIcon: { 
    marginRight: 12,
  },
  input: { 
    flex: 1, 
    color: "#1a1a1a", 
    fontSize: 16,
    fontWeight: "500",
  },
  placeholderText: {
    color: "#999",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 16,
    gap: 12,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
  },
  backButton: {
    flex: 1,
  },
  backText: { 
    color: "#666", 
    fontWeight: "600", 
    marginLeft: 8,
    fontSize: 15,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1E90FF",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    shadowColor: "#1E90FF",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  fullWidthButton: {
    marginTop: 20,
    marginBottom: 16,
  },
  nextText: { 
    color: "#fff", 
    fontSize: 16, 
    fontWeight: "700", 
    marginRight: 8,
    letterSpacing: 0.5,
  },
  signupText: { 
    textAlign: "center", 
    color: "#666", 
    fontSize: 15,
    fontWeight: "500",
    marginTop: 8,
  },
  signupBold: { 
    color: "#1E90FF", 
    fontWeight: "700",
  },
  guestButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  guestButtonText: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  
  // Toast Notification Styles
  toastContainer: {
    position: "absolute",
    top: 0,
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
  
  // Date Picker Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  datePickerContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
    maxHeight: '70%',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  datePickerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  datePickerBody: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
  },
  pickerColumn: {
    flex: 1,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E90FF',
    marginBottom: 12,
    textAlign: 'center',
  },
  pickerScroll: {
    maxHeight: 200,
  },
  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 4,
  },
  pickerItemSelected: {
    backgroundColor: '#1E90FF',
  },
  pickerItemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  pickerItemTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  confirmButton: {
    backgroundColor: '#1E90FF',
    marginHorizontal: 20,
    marginTop: 10,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: "#1E90FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default SignupScreen;
