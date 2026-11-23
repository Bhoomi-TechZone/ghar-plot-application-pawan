import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
  Image,
  Modal,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { BASE_URL, post } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CrossPlatformAlert from '../utils/crossPlatformAlert';
import AuthModal from '../components/AuthModal';
import { isUserAuthenticated } from '../utils/authCheck';

const PropertyInquiryFormScreen = ({ route, navigation }) => {
  const property = route?.params?.property || {
    title: "Luxury 2BHK Apartment",
    price: "$240,000",
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=60",
  };

  // Normalize property id using common possible fields to avoid mismatches between screens
  const getPropertyId = (p) => {
    if (!p) return null;
    return p._id || p.id || p.propertyId || p.uuid || p.uid || null;
  };
  const normalizedPropertyId = getPropertyId(property);

  // Check if inquiry was already submitted when component mounts
  useEffect(() => {
    const checkInquiryStatus = async () => {
      try {
        const propertyId = normalizedPropertyId;
        if (propertyId) {
          const inquiryFlag = await AsyncStorage.getItem(`inquirySubmitted:${propertyId}`);
          if (inquiryFlag) {
            // Already submitted, show alert and navigate back
            CrossPlatformAlert.alert(
              'Already Submitted',
              'You have already submitted an inquiry for this property. The agent will contact you soon.',
              [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack()
                }
              ]
            );
          }
        }
      } catch (error) {
        console.warn('Failed to check inquiry status:', error);
      }
    };

    checkInquiryStatus();
  }, [normalizedPropertyId, navigation]);

  // Resolve image URL
  const resolveImage = () => {
    const photos = property.photosAndVideo || property.photos || [];
    let img = null;
    if (Array.isArray(photos) && photos.length > 0) {
      img = photos[0];
    } else if (property.image) {
      img = property.image;
    }

    if (!img) return null;

    try {
      if (typeof img === 'string' && !img.startsWith('http')) {
        return `${BASE_URL.replace(/\/+$/, '')}/${img.replace(/^\/+/, '')}`;
      }
    } catch (e) {
      // fallback
    }
    return img;
  };
  const imageUri = resolveImage();

  // Form State (Email field removed)
  const [form, setForm] = useState({
    clientName: "",
    contactNumber: "",
  });
  const [loading, setLoading] = useState(false);

  // OTP Verification States
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const otpInputs = useRef([]);

  // Auth Modal States
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Handle OTP digit entry
  const handleOtpChange = (text, index) => {
    setOtpError("");
    const cleaned = text.replace(/[^0-9]/g, '');

    if (cleaned.length > 0) {
      const newOtp = [...otp];
      newOtp[index] = cleaned[cleaned.length - 1]; // take last entered digit
      setOtp(newOtp);

      // Auto move to next input box
      if (index < 3) {
        otpInputs.current[index + 1]?.focus();
      }
    } else {
      const newOtp = [...otp];
      newOtp[index] = "";
      setOtp(newOtp);
    }
  };

  const handleOtpKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputs.current[index - 1]?.focus();
    }
  };

  // Initial Submit button press: validate and trigger OTP verification
  const handleSubmit = async () => {
    // Check authentication first
    const isAuthenticated = await isUserAuthenticated();

    if (!isAuthenticated) {
      console.log('🚫 Guest user trying to submit inquiry - Showing auth modal');
      setShowAuthModal(true);
      return;
    }

    if (!form.clientName || !form.clientName.trim()) {
      CrossPlatformAlert.alert("Missing Info", "Please enter your full name.");
      return;
    }

    if (!form.contactNumber || !form.contactNumber.trim()) {
      CrossPlatformAlert.alert("Missing Info", "Please enter your mobile number.");
      return;
    }

    const cleanPhone = form.contactNumber.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      CrossPlatformAlert.alert("Invalid Number", "Please enter a valid 10-digit mobile number.");
      return;
    }

    // Reset OTP and open OTP verification modal
    setOtp(["", "", "", ""]);
    setOtpError("");
    setShowOtpModal(true);
  };

  // Verify entered OTP (static OTP: 1234)
  const handleVerifyOtp = async () => {
    const enteredOtp = otp.join("");

    if (enteredOtp.length !== 4) {
      setOtpError("Please enter complete 4-digit OTP.");
      return;
    }

    // Static OTP validation
    if (enteredOtp !== "1234") {
      setOtpError("Invalid OTP. Please enter 1234.");
      return;
    }

    // OTP Verified! Close OTP modal and execute inquiry submission
    setShowOtpModal(false);
    const cleanPhone = form.contactNumber.replace(/[^0-9]/g, '');
    await executeInquirySubmission(cleanPhone);
  };

  // Execute submission to backend
  const executeInquirySubmission = async (contactNumber) => {
    const payload = {
      propertyId: normalizedPropertyId || property._id || property.id,
      fullName: form.clientName.trim(),
      contactNumber: contactNumber,
      email: "", // Email removed from inquiry form
    };

    const ownerCandidate = property.postedBy || property.userId || property.owner || property.ownerId;
    if (ownerCandidate) {
      payload.ownerId = ownerCandidate._id || ownerCandidate.id || ownerCandidate;
    }

    setLoading(true);

    try {
      const uid = await AsyncStorage.getItem('userId');
      if (uid) payload.buyerId = uid;

      const res = await post('/api/inquiry/add', payload);

      // Mark this property as having an inquiry so the app can remember it
      try {
        const pid = normalizedPropertyId || payload.propertyId;
        if (pid) await AsyncStorage.setItem(`inquirySubmitted:${pid}`, '1');
      } catch (setErr) {
        console.warn('Failed to persist inquiry flag', setErr);
      }

      // ONLY show the clean Success popup
      CrossPlatformAlert.alert(
        'Inquiry Submitted!',
        'Your inquiry has been submitted successfully! The owner/agent will contact you soon.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ],
        { cancelable: false }
      );
    } catch (err) {
      console.error('Inquiry submit failed', err);
      const message = err && err.message ? String(err.message) : 'Failed to submit inquiry. Please try again.';

      // Check if duplicate inquiry
      if (message.includes('already submitted') || message.includes('duplicate')) {
        try {
          const pid = normalizedPropertyId || payload.propertyId;
          if (pid) await AsyncStorage.setItem(`inquirySubmitted:${pid}`, '1');
        } catch (setErr) {
          console.warn('Failed to persist inquiry flag', setErr);
        }

        CrossPlatformAlert.alert(
          'Already Submitted',
          'You have already submitted an inquiry for this property.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        CrossPlatformAlert.alert('Submission Failed', message);
      }
    } finally {
      setLoading(false);
    }
  };

  const textInputFields = [
    { label: "Full Name*", field: "clientName", icon: "person-outline", keyboardType: "default" },
    { label: "Mobile Number*", field: "contactNumber", icon: "call-outline", keyboardType: "phone-pad" },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="chevron-back" size={26} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inquiry</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContainer}
      >
        {/* Property Card */}
        <View style={styles.propertyCard}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.propertyImage} />
          ) : (
            <View style={[styles.propertyImage, styles.noImage]}>
              <Text style={{ color: '#9CA3AF' }}>No image available</Text>
            </View>
          )}
          <View style={styles.propertyInfo}>
            <Text style={styles.propertyTitle}>{property.title}</Text>
            <Text style={styles.propertyPrice}>{property.price}</Text>
          </View>
        </View>

        {/* Form Section */}
        <View style={styles.formCard}>
          {textInputFields.map((item) => (
            <View key={item.field} style={styles.inputGroup}>
              <Icon name={item.icon} size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={form[item.field]}
                onChangeText={(value) => handleChange(item.field, value)}
                placeholder={item.label}
                keyboardType={item.keyboardType || "default"}
                placeholderTextColor="#9CA3AF"
                maxLength={item.field === 'contactNumber' ? 14 : 50}
              />
            </View>
          ))}

          <TouchableOpacity
            style={[styles.submitButton, loading ? { opacity: 0.7 } : null]}
            onPress={handleSubmit}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitText}>Submit Inquiry</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* OTP Verification Modal */}
      <Modal
        visible={showOtpModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowOtpModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.otpModalContainer}>
            <View style={styles.otpIconCircle}>
              <Icon name="shield-checkmark" size={32} color="#1E90FF" />
            </View>

            <Text style={styles.otpModalTitle}>Verify Mobile Number</Text>
            <Text style={styles.otpModalSubtitle}>
              Enter 4-digit OTP sent to{"\n"}
              <Text style={{ fontWeight: '700', color: '#1F2937' }}>
                +91 {form.contactNumber}
              </Text>
            </Text>

            {/* Static OTP Hint Pill */}
            <View style={styles.otpHintPill}>
              <Icon name="information-circle-outline" size={16} color="#D97706" style={{ marginRight: 4 }} />
              <Text style={styles.otpHintText}>Static Demo OTP: 1234</Text>
            </View>

            {/* 4 Digit OTP Inputs */}
            <View style={styles.otpBoxesRow}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (otpInputs.current[index] = ref)}
                  style={[
                    styles.otpBox,
                    digit ? styles.otpBoxFilled : null,
                    otpError ? styles.otpBoxError : null,
                  ]}
                  value={digit}
                  onChangeText={(text) => handleOtpChange(text, index)}
                  onKeyPress={(e) => handleOtpKeyPress(e, index)}
                  keyboardType="numeric"
                  maxLength={1}
                  textAlign="center"
                  selectTextOnFocus
                />
              ))}
            </View>

            {otpError ? (
              <Text style={styles.otpErrorText}>{otpError}</Text>
            ) : null}

            {/* Action Buttons */}
            <TouchableOpacity
              style={styles.verifyButton}
              onPress={handleVerifyOtp}
              activeOpacity={0.8}
            >
              <Text style={styles.verifyButtonText}>Verify & Submit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelOtpButton}
              onPress={() => setShowOtpModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelOtpText}>Change Mobile Number</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Authentication Modal */}
      <AuthModal
        visible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={() => {
          setShowAuthModal(false);
          navigation.navigate('LoginScreen');
        }}
        message="Login to submit property inquiries"
      />
    </View>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    paddingTop: Platform.OS === "ios" ? 60 : 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 50,
  },
  propertyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
    overflow: "hidden",
  },
  propertyImage: {
    width: "100%",
    height: 180,
  },
  noImage: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  propertyInfo: {
    padding: 15,
  },
  propertyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  propertyPrice: {
    marginTop: 4,
    fontSize: 16,
    color: "#1E90FF",
    fontWeight: "700",
  },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    marginBottom: 18,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
  },
  submitButton: {
    backgroundColor: "#1E90FF",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#1E90FF",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  submitText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.3,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  otpModalContainer: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  otpIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  otpModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  otpModalSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 12,
  },
  otpHintPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 20,
  },
  otpHintText: {
    color: "#92400E",
    fontSize: 12,
    fontWeight: "600",
  },
  otpBoxesRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  otpBox: {
    width: 52,
    height: 54,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  otpBoxFilled: {
    borderColor: "#1E90FF",
    backgroundColor: "#EFF6FF",
  },
  otpBoxError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  otpErrorText: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 12,
    textAlign: "center",
  },
  verifyButton: {
    width: "100%",
    backgroundColor: "#1E90FF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#1E90FF",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    marginTop: 4,
  },
  verifyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  cancelOtpButton: {
    marginTop: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  cancelOtpText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "500",
  },
});

export default PropertyInquiryFormScreen;
