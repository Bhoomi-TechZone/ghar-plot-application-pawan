import React, { useState } from "react";
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
  React.useEffect(() => {
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

  // Resolve image URL: support property.image, or photosAndVideo array (may be relative path from backend)
  const resolveImage = () => {
    // Photos array from backend may be in property.photosAndVideo or property.photos
    const photos = property.photosAndVideo || property.photos || [];
    let img = null;
    if (Array.isArray(photos) && photos.length > 0) {
      img = photos[0];
    } else if (property.image) {
      img = property.image;
    }

    if (!img) return null;

    // If backend returned a relative path like 'uploads/xyz.jpg', prefix BASE_URL
    try {
      if (typeof img === 'string' && !img.startsWith('http')) {
        // ensure no duplicate slashes
        return `${BASE_URL.replace(/\/+$/, '')}/${img.replace(/^\/+/, '')}`;
      }
    } catch (e) {
      // fallback
    }
    return img;
  };
  const imageUri = resolveImage();

  const [form, setForm] = useState({
    clientName: "",
    email: "",
    contactNumber: "",
  });
  const [loading, setLoading] = useState(false);
  
  // Auth Modal States
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Check authentication first
    const isAuthenticated = await isUserAuthenticated();
    
    if (!isAuthenticated) {
      // Guest user trying to submit inquiry - show auth modal
      console.log('🚫 Guest user trying to submit inquiry - Showing auth modal');
      setShowAuthModal(true);
      return;
    }
    
    if (!form.clientName || !form.email || !form.contactNumber) {
      CrossPlatformAlert.alert("Missing Info", "Please fill all mandatory fields (*)");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      CrossPlatformAlert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    if (form.contactNumber.length < 8) {
      CrossPlatformAlert.alert("Invalid Number", "Contact number seems too short.");
      return;
    }

    // Prepare payload for the inquiry endpoint
    const payload = {
      propertyId: normalizedPropertyId || property._id || property.id,
      fullName: form.clientName,
      email: form.email,
      contactNumber: form.contactNumber,
    };

    // Attempt to attach ownerId if present on the property object
    const ownerCandidate = property.postedBy || property.userId || property.owner || property.ownerId;
    if (ownerCandidate) {
      // postedBy might be an object or just an id string
      payload.ownerId = ownerCandidate._id || ownerCandidate.id || ownerCandidate;
    }

    // Try to attach buyerId from storage if available
    setLoading(true);
    AsyncStorage.getItem('userId')
      .then((uid) => {
        if (uid) payload.buyerId = uid;
      })
      .catch(() => {})
      .finally(async () => {
        try {
          const res = await post('/api/inquiry/add', payload);
          // Backend returns { message, inquiry }
          const msg = (res && res.message) || 'Inquiry submitted successfully';
          CrossPlatformAlert.alert('Success', msg);

          // Mark this property as having an inquiry so the app can skip the form next time
          try {
            const pid = normalizedPropertyId || payload.propertyId;
            if (pid) await AsyncStorage.setItem(`inquirySubmitted:${pid}`, '1');
          } catch (setErr) {
            console.warn('Failed to persist inquiry flag', setErr);
          }

          // Navigate back to PropertyDetailsScreen
          navigation.goBack();
        } catch (err) {
          console.error('Inquiry submit failed', err);
          const message = err && err.message ? String(err.message) : 'Failed to submit inquiry. Please try again.';
          
          // Check if error is about duplicate inquiry
          if (message.includes('already submitted') || message.includes('duplicate')) {
            // Mark as submitted and navigate back
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
            CrossPlatformAlert.alert('Submission failed', message);
          }
        } finally {
          setLoading(false);
        }
      });
  };

  const textInputFields = [
    { label: "Full Name*", field: "clientName", icon: "person-outline" },
    { label: "Email*", field: "email", icon: "mail-outline", keyboardType: "email-address" },
    { label: "Contact Number*", field: "contactNumber", icon: "call-outline", keyboardType: "phone-pad" },
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
              />
            </View>
          ))}

          <TouchableOpacity
            style={[styles.submitButton, loading ? { opacity: 0.7 } : null]}
            onPress={handleSubmit}
            activeOpacity={0.8}
            disabled={loading}
          >
            <Text style={styles.submitText}>{loading ? 'Submitting...' : 'Submit Inquiry'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
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
});

export default PropertyInquiryFormScreen;
