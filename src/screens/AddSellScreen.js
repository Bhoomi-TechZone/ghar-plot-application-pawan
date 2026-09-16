import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  SafeAreaView,
  Platform,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";
import { launchImageLibrary } from "react-native-image-picker";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions, useFocusEffect } from '@react-navigation/native';
// Import the regular property API
import { addProperty } from "../services/propertyapi";
import { simulatePropertyAddedNotification } from "../utils/testNotifications";
import CrossPlatformAlert from '../utils/crossPlatformAlert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// --- Reusable Components ---
const FormInput = ({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType = "default",
  multiline = false,
}) => (
  <View style={styles.card}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={[styles.input, multiline && styles.textArea]}
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      multiline={multiline}
      placeholderTextColor="#9CA3AF"
    />
  </View>
);

const Selector = ({ label, options, selectedValue, onSelect }) => (
  <View style={styles.card}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.selectorRow}>
      {options.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.selectorOption,
            selectedValue === option.value && styles.selectorSelected,
            option.disabled && styles.selectorDisabled,
          ]}
          onPress={() => !option.disabled && onSelect(option.value)}
          disabled={option.disabled}
        >
          <Text
            style={[
              styles.selectorText,
              selectedValue === option.value && styles.selectorTextSelected,
              option.disabled && styles.selectorTextDisabled,
            ]}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

// --- Main Component ---
const AddSellScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 20 : 0);
  const tabBarHeight = 70 + bottomInset;
  const buttonBottom = Platform.OS === 'web' ? 90 : tabBarHeight + 16;
  const submitButtonHeight = 56;
  const scrollPaddingBottom = tabBarHeight + submitButtonHeight + 40;

  const [propertyLocation, setPropertyLocation] = useState("");
  const [areaDetails, setAreaDetails] = useState("");
  const [availability, setAvailability] = useState("Ready to Move");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [photosAndVideo, setPhotosAndVideo] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [furnishingStatus, setFurnishingStatus] = useState("Furnished");
  const [parking, setParking] = useState("Available");
  const [purpose, setPurpose] = useState("Sell");
  const [propertyType, setPropertyType] = useState("Residential");
  const [commercialType, setCommercialType] = useState("Office");
  const [residentialType, setResidentialType] = useState("Apartment");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [balconies, setBalconies] = useState("");
  const [floorNumber, setFloorNumber] = useState("");
  const [totalFloors, setTotalFloors] = useState("");
  const [facingDirection, setFacingDirection] = useState("North");
  const [contactNumber, setContactNumber] = useState("");

  // Check if user is fully registered on screen mount
  useEffect(() => {
    checkUserRegistration();
  }, []);

  // Clear form data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Clear all form fields
      setPropertyLocation("");
      setAreaDetails("");
      setAvailability("Ready to Move");
      setPrice("");
      setDescription("");
      setPhotosAndVideo([]);
      setFurnishingStatus("Furnished");
      setParking("Available");
      setPurpose("Sell");
      setPropertyType("Residential");
      setCommercialType("Office");
      setResidentialType("Apartment");
      setBedrooms("");
      setBathrooms("");
      setBalconies("");
      setFloorNumber("");
      setTotalFloors("");
      setFacingDirection("North");
      setContactNumber("");

      return () => {
        // Cleanup if needed
      };
    }, [])
  );

  const checkUserRegistration = async () => {
    try {
      const userProfileString = await AsyncStorage.getItem('userProfile');

      if (!userProfileString) {
        // No user profile at all - redirect to login
        CrossPlatformAlert.alert(
          "Login Required",
          "Please login to post properties.",
          [
            {
              text: "OK",
              onPress: () => navigation.replace('LoginScreen')
            }
          ]
        );
        return;
      }

      const userProfile = JSON.parse(userProfileString);

      // Check if user has completed full registration
      // A fully registered user should have: email, fullName (not 'User'), and preferably dob
      const isFullyRegistered =
        userProfile.email &&
        userProfile.email.trim() !== '' &&
        userProfile.fullName &&
        userProfile.fullName !== 'User' &&
        userProfile.fullName.trim() !== '';

      if (!isFullyRegistered) {
        console.log('⚠️ User not fully registered. Redirecting to SignupScreen...');

        // Directly navigate to SignupScreen without alert
        navigation.replace('SignupScreen', {
          phoneNumber: userProfile.phone || '',
          fromAddProperty: true
        });
      }
    } catch (error) {
      console.error('Error checking user registration:', error);
    }
  };

  // Handle purpose change with property type logic
  const handlePurposeChange = (newPurpose) => {
    setPurpose(newPurpose);
    // If Paying Guest is selected, automatically set to Residential
    if (newPurpose === "Paying Guest") {
      setPropertyType("Residential");
    }
  };

  // Handle property type change with purpose logic
  const handlePropertyTypeChange = (newPropertyType) => {
    setPropertyType(newPropertyType);
    // If Commercial is selected and current purpose is Paying Guest, change to Sell
    if (newPropertyType === "Commercial" && purpose === "Paying Guest") {
      setPurpose("Sell");
    }
  };

  // --- Image Picker ---
  const handleImagePicker = useCallback(() => {
    const options = {
      mediaType: "mixed",
      selectionLimit: 5,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel || response.errorCode) {
        if (response.errorCode) {
          CrossPlatformAlert.alert("Error", response.errorMessage || "Failed to pick media");
        }
        return;
      }

      const assets = response.assets || [];
      const normalized = assets.map((a) => ({
        uri: a.uri,
        type: a.type,
        fileName: a.fileName || `file-${Date.now()}`,
        fileSize: a.fileSize,
      }));

      setPhotosAndVideo((prev) => [...prev, ...normalized]);
    });
  }, []);

  // --- Submit Property ---
  // Add a function to sync local properties when connection is restored
  const syncLocalProperties = useCallback(async () => {
    try {
      const localPropertiesString = await AsyncStorage.getItem('local_properties');
      if (!localPropertiesString) return;

      const localProperties = JSON.parse(localPropertiesString);
      const pendingProperties = localProperties.filter(prop => prop.status === 'pending_sync');

      if (pendingProperties.length > 0) {
        console.log(`🔄 Found ${pendingProperties.length} local properties to sync`);

        for (const localProp of pendingProperties) {
          try {
            await addProperty(localProp);
            console.log('✅ Synced local property:', localProp.id);

            // Remove synced property from local storage
            const updatedProperties = localProperties.filter(p => p.id !== localProp.id);
            await AsyncStorage.setItem('local_properties', JSON.stringify(updatedProperties));
          } catch (syncError) {
            console.warn('Failed to sync property:', localProp.id, syncError.message);
          }
        }
      }
    } catch (error) {
      console.warn('Error syncing local properties:', error.message);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    // Validation
    if (!propertyLocation || !price || !areaDetails || !description) {
      CrossPlatformAlert.alert("Error", "Please fill all required fields.");
      return;
    }

    if (isNaN(Number(areaDetails)) || isNaN(Number(price))) {
      CrossPlatformAlert.alert("Error", "Area Details and Price must be valid numbers.");
      return;
    }

    if (contactNumber && contactNumber.length !== 10) {
      CrossPlatformAlert.alert("Error", "Contact number must be 10 digits.");
      return;
    }

    try {
      setSubmitting(true);

      // Get auth token
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        CrossPlatformAlert.alert("Error", "Please login to add property.");
        navigation.replace('LoginScreen');
        return;
      }

      console.log('🔑 Using token:', userToken.substring(0, 20) + '...');

      // Create FormData
      const formData = new FormData();

      // Required fields
      formData.append('propertyLocation', propertyLocation);
      formData.append('areaDetails', areaDetails);
      formData.append('availability', availability);
      formData.append('price', price);
      formData.append('description', description);
      formData.append('furnishingStatus', furnishingStatus);
      formData.append('parking', parking);
      formData.append('purpose', purpose);
      formData.append('propertyType', propertyType);

      // Conditional fields
      if (propertyType === "Residential") {
        formData.append('residentialType', residentialType);
      } else if (propertyType === "Commercial") {
        formData.append('commercialType', commercialType);
      }

      // Additional fields (if filled)
      if (bedrooms) formData.append('bedrooms', bedrooms);
      if (bathrooms) formData.append('bathrooms', bathrooms);
      if (balconies) formData.append('balconies', balconies);
      if (floorNumber) formData.append('floorNumber', floorNumber);
      if (totalFloors) formData.append('totalFloors', totalFloors);
      if (facingDirection) formData.append('facingDirection', facingDirection);
      if (contactNumber) formData.append('contactNumber', contactNumber);

      // Add photos and videos with proper file type handling
      console.log('📸 Processing files:', photosAndVideo.length);

      if (photosAndVideo.length > 0) {
        photosAndVideo.forEach((file, index) => {
          // Get proper MIME type
          let mimeType = file.type || 'image/jpeg';
          let fileName = file.fileName;

          // Clean up filename - remove spaces and special characters
          if (fileName) {
            // Remove extra extensions and clean filename
            fileName = fileName.replace(/\.[^/.]+$/, ''); // Remove existing extension
            fileName = fileName.replace(/[^a-zA-Z0-9_-]/g, '_'); // Replace special chars
          }

          // Generate proper filename with correct extension
          if (!fileName || fileName === `file-${Date.now()}` || fileName.length < 3) {
            fileName = `property_${Date.now()}_${index}`;
          }

          // Add proper extension based on MIME type
          if (mimeType.startsWith('video/')) {
            const ext = mimeType.split('/')[1] || 'mp4';
            fileName = `${fileName}.${ext}`;
          } else {
            // Convert webp to jpeg for better backend compatibility
            if (mimeType === 'image/webp') {
              mimeType = 'image/jpeg';
              fileName = `${fileName}.jpg`;
            } else {
              const ext = mimeType.split('/')[1] || 'jpeg';
              fileName = `${fileName}.${ext}`;
            }
          }

          // Fix URI format for Android/iOS
          let fileUri = file.uri;
          if (Platform.OS === 'android' && !fileUri.startsWith('file://')) {
            fileUri = 'file://' + fileUri;
          }

          console.log(`📎 File ${index}:`, { uri: fileUri, type: mimeType, name: fileName });

          formData.append('photosAndVideo', {
            uri: fileUri,
            type: mimeType,
            name: fileName,
          });
        });
      } else {
        console.log('⚠️ No files selected - submitting without photos');
      }

      console.log('🚀 Submitting property to new API...', {
        propertyLocation,
        price,
        areaDetails,
        purpose,
        propertyType,
        filesCount: photosAndVideo.length,
        fileTypes: photosAndVideo.map(f => f.type).join(', ')
      });

      // Make API call
      // Note: Don't set Content-Type for multipart/form-data - fetch will set it automatically with boundary
      const response = await fetch('https://gharplotbackend.gntechnology.de/property/add', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
        body: formData,
      });

      // Check content type before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('❌ Non-JSON response:', textResponse);
        console.error('❌ Response Status:', response.status);
        console.error('❌ Response URL:', response.url);
        throw new Error(`Server error (${response.status}): Backend is returning HTML instead of JSON. The API endpoint might be down or incorrect.`);
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `Server error: ${response.status}`);
      }

      console.log('✅ Property added successfully:', result);

      CrossPlatformAlert.alert(
        "Success",
        result.message || "Property added successfully!",
        [
          {
            text: "OK",
            onPress: () => {
              // Navigate back or to home screen
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('HomeScreen');
              }
            }
          }
        ]
      );

    } catch (err) {
      console.error('❌ Property submission error:', err);
      CrossPlatformAlert.alert("Error", err.message || "Failed to add property. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [
    propertyLocation,
    areaDetails,
    availability,
    price,
    description,
    furnishingStatus,
    parking,
    purpose,
    propertyType,
    commercialType,
    residentialType,
    bedrooms,
    bathrooms,
    balconies,
    floorNumber,
    totalFloors,
    facingDirection,
    contactNumber,
    photosAndVideo,
    navigation,
  ]);

  const statusBarTop = insets.top > 0 ? insets.top : (Platform.OS === 'android' ? 24 : 0); // fallback 24 for android status bar if currentHeight is undefined without import

  // --- Render ---
  return (
    <View style={styles.safeArea}>
      {/* Header */}
      <LinearGradient
        colors={["#007BFF", "#0056D2"]}
        style={[styles.header, { height: Math.max(statusBarTop + 80, 120) }]}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={1}>Add Property</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>Enter property details below</Text>
        </View>
      </LinearGradient>

      {/* Scrollable Form */}
      <ScrollView 
        contentContainerStyle={[styles.container, { paddingBottom: scrollPaddingBottom }]}
        style={Platform.OS === 'web' ? { flex: 1, overflow: 'auto', zIndex: 0 } : { zIndex: 0 }}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
        <Selector
          label="Purpose"
          options={[
            { label: "Sell", value: "Sell" },
            { label: "Rent/Lease", value: "Rent/Lease" },
            {
              label: "Paying Guest",
              value: "Paying Guest",
              disabled: propertyType === "Commercial" // Disable PG when Commercial is selected
            },
          ]}
          selectedValue={purpose}
          onSelect={handlePurposeChange}
        />

        <Selector
          label="Property Type"
          options={[
            { label: "Residential", value: "Residential" },
            {
              label: "Commercial",
              value: "Commercial",
              disabled: purpose === "Paying Guest" // Disable Commercial when PG is selected
            },
          ]}
          selectedValue={propertyType}
          onSelect={handlePropertyTypeChange}
        />

        {propertyType === "Residential" ? (
          <Selector
            label="Residential Type"
            options={[
              { label: "Apartment", value: "Apartment" },
              { label: "Villa", value: "Villa" },
              { label: "Plot", value: "Plot" },
            ]}
            selectedValue={residentialType}
            onSelect={setResidentialType}
          />
        ) : (
          <Selector
            label="Commercial Type"
            options={[
              { label: "Office", value: "Office" },
              { label: "Shop", value: "Shop" },
              { label: "Warehouse", value: "Warehouse" },
            ]}
            selectedValue={commercialType}
            onSelect={setCommercialType}
          />
        )}

        <FormInput
          label="📍 Property Location"
          placeholder="Enter property address"
          value={propertyLocation}
          onChangeText={setPropertyLocation}
        />

        <FormInput
          label="📏 Area Details (in Sq.Ft)"
          placeholder="e.g., 1200"
          value={areaDetails}
          onChangeText={setAreaDetails}
          keyboardType="numeric"
        />

        <Selector
          label="🏗️ Availability"
          options={[
            { label: "Ready to Move", value: "Ready to Move" },
            { label: "Under Construction", value: "Under Construction" },
          ]}
          selectedValue={availability}
          onSelect={setAvailability}
        />

        <Selector
          label="🪑 Furnishing Status"
          options={[
            { label: "Furnished", value: "Furnished" },
            { label: "Semi-Furnished", value: "Semi-Furnished" },
            { label: "Unfurnished", value: "Unfurnished" },
          ]}
          selectedValue={furnishingStatus}
          onSelect={setFurnishingStatus}
        />

        <Selector
          label="🚗 Parking"
          options={[
            { label: "Available", value: "Available" },
            { label: "Not Available", value: "Not Available" },
          ]}
          selectedValue={parking}
          onSelect={setParking}
        />

        <FormInput
          label="💰 Price (₹)"
          placeholder="e.g., 5000000"
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
        />

        <FormInput
          label="📝 Description"
          placeholder="Add detailed description..."
          value={description}
          onChangeText={setDescription}
          multiline
        />

        {propertyType === "Residential" && (
          <>
            <FormInput
              label="🛏️ Bedrooms"
              placeholder="e.g., 2"
              value={bedrooms}
              onChangeText={setBedrooms}
              keyboardType="numeric"
            />

            <FormInput
              label="🚿 Bathrooms"
              placeholder="e.g., 2"
              value={bathrooms}
              onChangeText={setBathrooms}
              keyboardType="numeric"
            />

            <FormInput
              label="🌅 Balconies"
              placeholder="e.g., 1"
              value={balconies}
              onChangeText={setBalconies}
              keyboardType="numeric"
            />

            <FormInput
              label="🏢 Floor Number"
              placeholder="e.g., 3"
              value={floorNumber}
              onChangeText={setFloorNumber}
              keyboardType="numeric"
            />

            <FormInput
              label="🏗️ Total Floors"
              placeholder="e.g., 10"
              value={totalFloors}
              onChangeText={setTotalFloors}
              keyboardType="numeric"
            />

            <Selector
              label="🧭 Facing Direction"
              options={[
                { label: "North", value: "North" },
                { label: "South", value: "South" },
                { label: "East", value: "East" },
                { label: "West", value: "West" },
              ]}
              selectedValue={facingDirection}
              onSelect={setFacingDirection}
            />
          </>
        )}

        <FormInput
          label="📞 Contact Number"
          placeholder="Enter 10-digit mobile number"
          value={contactNumber}
          onChangeText={setContactNumber}
          keyboardType="phone-pad"
        />

        {/* Upload Media */}
        <View style={styles.card}>
          <Text style={styles.label}>📸 Upload Photos / Videos</Text>
          <TouchableOpacity style={styles.imageUploadButton} onPress={handleImagePicker}>
            <Icon name="cloud-upload-outline" size={22} color="#007BFF" />
            <Text style={styles.imageUploadText}> Add Media</Text>
          </TouchableOpacity>
          <Text style={styles.imageCountText}>
            {photosAndVideo.length} media files added
          </Text>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={[styles.fixedBottom, { bottom: buttonBottom, height: submitButtonHeight }]}>
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <LinearGradient colors={["#007BFF", "#0056D2"]} style={styles.gradientButton}>
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Property</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default AddSellScreen;

// --- Styles ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    position: 'relative',
    width: '100%',
    alignSelf: 'stretch',
    marginHorizontal: 0,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
    zIndex: 2,
    overflow: 'visible',
  },
  headerContent: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  headerTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
    color: "#fff",
    textAlign: 'center',
    includeFontPadding: false,
  },
  headerSubtitle: {
    color: "#E0E7FF",
    marginTop: 4,
    fontSize: 14,
    lineHeight: 18,
    textAlign: 'center',
  },
  container: {
    padding: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#007BFF20",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E3A8A",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    backgroundColor: "#F9FAFB",
    fontSize: 15,
    color: "#111827",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  selectorRow: {
    flexDirection: "row",
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    padding: 4,
  },
  selectorOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  selectorSelected: {
    backgroundColor: "#007BFF",
  },
  selectorText: {
    color: "#1E3A8A",
    fontWeight: "600",
  },
  selectorTextSelected: {
    color: "#fff",
  },
  selectorDisabled: {
    backgroundColor: "#F3F4F6",
    opacity: 0.6,
  },
  selectorTextDisabled: {
    color: "#9CA3AF",
  },
  imageUploadButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#93C5FD",
    borderStyle: "dashed",
    borderRadius: 10,
    paddingVertical: 14,
    backgroundColor: "#EFF6FF",
  },
  imageUploadText: {
    color: "#007BFF",
    fontWeight: "600",
    fontSize: 16,
  },
  imageCountText: {
    textAlign: "center",
    color: "#6B7280",
    fontSize: 13,
    marginTop: 4,
  },
  fixedBottom: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    left: 16,
    right: 16,
    elevation: 8,
    shadowColor: "#007BFF",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    zIndex: 999,
    overflow: "visible",
  },
  submitButton: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  gradientButton: {
    flex: 1,
    minHeight: 56,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 18,
    lineHeight: 22,
    flexShrink: 1,
    includeFontPadding: false,
  },
});
