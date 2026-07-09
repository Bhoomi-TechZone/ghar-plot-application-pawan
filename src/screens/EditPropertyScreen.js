import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  SafeAreaView,
  Alert,
  FlatList,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import LinearGradient from 'react-native-linear-gradient';
import { formatImageUrl, formatPrice } from '../services/homeApi';
import { launchImageLibrary } from 'react-native-image-picker';
import { updateProperty } from '../services/propertyapi';
import CrossPlatformAlert from '../utils/crossPlatformAlert';

// --- Color Palette (Consistent) ---
const COLORS = {
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  accent: '#EC4899',
  danger: '#EF4444',
  success: '#10B981',
  background: '#FAFAFA',
  card: '#FFFFFF',
  textPrimary: '#111827',
  textSecondary: '#9CA3AF',
  lightGray: '#F3F4F6',
  border: '#E5E7EB',
};

// Mock data structure (as received from "My Listings" card)
const mockProperty = {
  id: "1",
  title: "Luxury Beachfront Villa",
  type: "Sale",
  status: "Active",
  location: "Miami, FL",
  price: "18000000", // Using raw number for editing
  beds: 5,
  baths: 4,
  sqft: 4500,
  description: "Stunning, modern beachfront villa with panoramic ocean views. Located in an exclusive, secure community, perfect for a luxury lifestyle. Includes a heated pool and private beach access.",
  images: [
    "https://images.unsplash.com/photo-1560184897-dfc0cf40b29c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    "https://images.unsplash.com/photo-1572120360610-d971b9c5c57d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  ],
};

const EditPropertyScreen = ({ navigation, route }) => {
  // Use property passed via route params, or mock data for testing
  const initialProperty = route?.params?.listing || route?.params?.property || mockProperty;

  // Normalize incoming property keys from server: propertyLocation -> location, areaDetails -> sqft, photosAndVideo -> images
  const normalizedProperty = {
    ...initialProperty,
    location: initialProperty.propertyLocation || initialProperty.location || initialProperty.property_location || '',
    sqft: initialProperty.areaDetails != null ? String(initialProperty.areaDetails) : (initialProperty.sqft != null ? String(initialProperty.sqft) : (initialProperty.area || initialProperty.size || '')),
    // normalize price to string for the input
    price: initialProperty.price != null ? String(initialProperty.price) : (initialProperty.amount != null ? String(initialProperty.amount) : ''),
    images: (() => {
      const raw = initialProperty.photosAndVideo || initialProperty.images || (initialProperty.image ? [initialProperty.image] : []) || [];
      // Normalize each entry to either a string path (server) or an object { uri }
      return (raw || []).map((it) => {
        if (!it) return null;
        if (typeof it === 'string') return it;
        // server may return { url: 'uploads/..' } or { uri: 'http..' }
        if (it.url) return it.url;
        if (it.uri) return { uri: it.uri, fileName: it.fileName };
        // some servers return nested object { path } or { file: { url } }
        if (it.path) return it.path;
        if (it.file && it.file.url) return it.file.url;
        // fallback: try to stringify
        return typeof it === 'object' ? (it.uri || it.url || JSON.stringify(it)) : String(it);
      }).filter(Boolean);
    })(),
    description: initialProperty.description || 'No description available',
  };

  const [property, setProperty] = useState(normalizedProperty);
  const [removedImages, setRemovedImages] = useState([]);
  const [loading, setLoading] = useState(false);

  // Derived display values for preview (use safe formatting helpers)
  const firstImage = (property.images && property.images.length > 0)
    ? (() => {
        const imageData = typeof property.images[0] === 'string' ? property.images[0] : property.images[0]?.uri;
        // Use local file URIs directly, format server URIs
        return (typeof imageData === 'string' && imageData.startsWith('file://')) 
          ? imageData 
          : formatImageUrl(imageData);
      })()
    : (property.image ? (() => {
        // Handle property.image field similarly
        return (typeof property.image === 'string' && property.image.startsWith('file://')) 
          ? property.image 
          : formatImageUrl(property.image);
      })() : formatImageUrl(null));

  const displayPrice = (() => {
    const p = property.price;
    const n = Number(p);
    if (!isNaN(n)) return formatPrice(n);
    return p || '';
  })();

  const handleChange = (key, value) => {
    setProperty(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    (async () => {
      setLoading(true);
      try {
        // Basic validation
        if (!property.price) {
          CrossPlatformAlert.alert('Error', 'Please fill in the Price field.');
          setLoading(false);
          return;
        }

        const propId = property._id || property.id;
        // Validate Mongo ObjectId (24 hex chars). If it's missing or clearly a mock id like '1', bail out.
        const isValidObjectId = (id) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
        if (!propId || !isValidObjectId(propId)) {
          setLoading(false);
          CrossPlatformAlert.alert('Invalid property id', 'This property appears to be a local/mock item (id: ' + String(propId) + ").\n\nTo update a real property, open Edit from My Listings or ensure the route provides the server _id.");
          return;
        }

        // Map local property fields to API expected keys
        const payload = {
          propertyLocation: property.location || property.propertyLocation || property.propertyLocation,
          description: property.description,
          // convert price back to number for backend
          price: property.price ? Number(property.price) : undefined,
          areaDetails: property.sqft ? Number(property.sqft) : undefined,
          purpose: property.type || property.purpose,
          // include removed image paths so backend can delete them if supported
          removedFiles: removedImages.length ? JSON.stringify(removedImages) : undefined,
          removePhotos: removedImages.length ? JSON.stringify(removedImages) : undefined,
        };

        // Collect only local file objects for upload (don't include server-side paths like 'uploads/..' or http URLs)
        const files = (property.images || []).filter(img => {
          if (!img) return false;
          if (typeof img === 'object' && img.uri) return true;
          if (typeof img === 'string') {
            // treat only file:// or content:// URIs as local files
            return img.startsWith('file:') || img.startsWith('content:');
          }
          return false;
        }).map(img => (typeof img === 'string' ? { uri: img, fileName: `file-${Date.now()}` } : img));

        const resp = await updateProperty(propId, payload, files);

        // Server typically returns { message, property }
        const updated = resp && (resp.property || resp.data || resp);
        setLoading(false);
        CrossPlatformAlert.alert('Success', 'Property updated successfully', [
          { text: 'OK', onPress: () => {
              // Go back to previous screen (SellScreen will refresh on focus)
              navigation.goBack();
            }}
        ]);
      } catch (err) {
        console.error('Failed to update property:', err);
        setLoading(false);
        // Normalize server XHR rejection shape { status, body }
        let message = 'Failed to update property';
        try {
          if (err && err.body) {
            const body = err.body;
            if (typeof body === 'string') message = body;
            else if (body && body.message) message = body.message;
            else message = JSON.stringify(body);
          } else if (err && err.message) {
            message = String(err.message);
          }
        } catch (e) {
          // fallback
          message = String(err);
        }
        CrossPlatformAlert.alert('Error', message);
      }
    })();
  };

  const handleDelete = () => {
    CrossPlatformAlert.alert(
      "Confirm Delete",
      `Are you sure you want to delete the listing for "${property.title}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: () => {
            // Simulated Delete API Call
            setLoading(true);
            setTimeout(() => {
              setLoading(false);
              CrossPlatformAlert.alert(
                "Deleted", 
                "Listing removed.",
                [{ text: "OK", onPress: () => navigation.goBack() }]
              );
            }, 1000);
          }
        },
      ]
    );
  };

  const removeImage = (index) => {
    const removed = (property.images || [])[index];
    const updatedImages = (property.images || []).filter((_, i) => i !== index);
    // If removed item is a server path (string) or an object without a local uri, track it for deletion
    if (removed) {
      if (typeof removed === 'string' || (typeof removed === 'object' && !removed.uri)) {
        setRemovedImages(prev => [...prev, removed]);
      }
      // If it's an object with uri but that uri is not a remote URL, consider it local and just remove
      if (typeof removed === 'object' && removed.uri && (removed.uri.startsWith('http') || removed.uri.startsWith('uploads') || removed.uri.includes('/uploads/'))) {
        // treat as server-stored path in some cases (string path inside object)
        setRemovedImages(prev => [...prev, removed.uri]);
      }
    }
    setProperty(prev => ({ ...prev, images: updatedImages }));
  };

  const handleImagePicker = () => {
    const options = { mediaType: 'photo', selectionLimit: 10 };
    launchImageLibrary(options, (response) => {
      if (response.didCancel || response.errorCode) {
        if (response.errorCode) {
          console.warn('ImagePicker Error: ', response.errorMessage || response.errorCode);
          CrossPlatformAlert.alert('Error', response.errorMessage || 'Failed to pick media');
        }
        return;
      }

      const assets = response.assets || [];
      const normalized = assets.map((a) => ({ uri: a.uri, type: a.type, fileName: a.fileName || `file-${Date.now()}` }));
      setProperty(prev => ({ ...prev, images: [...(prev.images || []), ...normalized] }));
    });
  };

  // --- Utility Components ---

  const renderImageUpload = ({ item, index }) => {
    const uri = typeof item === 'string' ? formatImageUrl(item) : item?.uri;
    return (
      <View style={styles.imageThumbContainer}>
        <Image source={{ uri }} style={styles.imageThumb} />
        <TouchableOpacity 
          style={styles.deleteImageBtn} 
          onPress={() => removeImage(index)}
        >
          <Icon name="close-circle" size={24} color={COLORS.danger} />
        </TouchableOpacity>
      </View>
    );
  };

  // eslint-disable-next-line react/no-unstable-nested-components
  const InputField = ({ label, value, onChangeText, keyboardType = 'default', multiline = false }) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value ?? ''}
        onChangeText={(text) => onChangeText(text)}
        keyboardType={keyboardType}
        multiline={multiline}
        placeholder={`Enter ${label.toLowerCase()}`}
        placeholderTextColor={COLORS.textSecondary}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Property</Text>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
          <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.saveGradient}>
            <Text style={[styles.saveText, loading && styles.saveTextLoading]}>{loading ? 'Saving...' : 'Save'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        
      {/* Preview Card (matches SellScreen visual language) */}
      <View style={styles.previewCard}>
        <Image source={{ uri: firstImage }} style={styles.previewImage} resizeMode="cover" />
        <View style={styles.previewOverlay} />
        <View style={styles.previewTopRow}>
          <View style={[styles.typeChipPreview, { backgroundColor: COLORS.primary }]}>
            <Text style={styles.typeChipTextPreview}>{property.type}</Text>
          </View>
          <View style={[styles.statusChipPreview, { backgroundColor: property.status === 'Active' ? COLORS.success : COLORS.accent }]}>
            <Text style={styles.statusChipTextPreview}>{property.status}</Text>
          </View>
        </View>
        <View style={styles.previewPricePill}>
          <Text style={styles.previewPriceText}>{displayPrice}</Text>
        </View>
      </View>

      {/* Section 1: Photos & Media */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="images" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Photos ({(property.images || []).length}/10)</Text>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.imageScrollContent}
          >
            {(property.images || []).map((item, index) => (
              <View key={index} style={styles.imageThumbContainer}>
                <Image source={{ uri: typeof item === 'string' ? formatImageUrl(item) : item.uri }} style={styles.imageThumb} />
                <TouchableOpacity 
                  style={styles.deleteImageBtn} 
                  onPress={() => removeImage(index)}
                >
                  <Icon name="close-circle" size={24} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            ))}
            
            <TouchableOpacity style={styles.addMediaBtn} onPress={handleImagePicker}>
              <Icon name="add-circle" size={32} color={COLORS.primary} />
              <Text style={styles.addMediaText}>Add Photo</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Section 2: Core Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="information-circle" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Property Details</Text>
          </View>
          
          {/* <InputField 
            label="Listing Title" 
            value={property.title} 
            onChangeText={(text) => handleChange('title', text)} 
          /> */}
          <InputField 
            label="Location/Address" 
            value={property.location} 
            onChangeText={(text) => handleChange('location', text)} 
          />
          <InputField 
            label="Description" 
            value={property.description} 
            onChangeText={(text) => handleChange('description', text)} 
            multiline
          />
        </View>

        {/* Section 3: Financials & Size */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="cash" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Pricing & Measurements</Text>
          </View>
          
          <InputField 
            label={property.type === 'Sale' ? "Sale Price ($)" : "Monthly Rent ($)"} 
            value={property.price} 
            onChangeText={(text) => handleChange('price', text)} 
            keyboardType="numeric"
          />
          
          <View style={styles.rowWrapper}>
            <View style={styles.rowItem}>
              <InputField 
                label="Area (sqft)" 
                value={property.sqft} 
                onChangeText={(text) => handleChange('sqft', text)} 
                keyboardType="numeric"
              />
            </View>
            <View style={styles.rowItem}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Type</Text>
                <View style={styles.typeDisplay}>
                  <Text style={styles.typeText}>{property.type}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Section 4: Status Management */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="toggle" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Listing Status</Text>
          </View>
          
          <View style={styles.statusGroup}>
            <View>
              <Text style={styles.statusLabel}>Current Status</Text>
              <Text style={[
                styles.statusValue,
                { color: property.status === 'Active' ? COLORS.success : COLORS.accent }
              ]}>
                {property.status}
              </Text>
            </View>
            <TouchableOpacity 
              style={[
                styles.statusButton,
                { backgroundColor: property.status === 'Active' ? COLORS.accent : COLORS.success }
              ]}
              onPress={() => handleChange('status', property.status === 'Active' ? 'Pending' : 'Active')}
            >
              <Text style={styles.statusButtonText}>
                {property.status === 'Active' ? 'Mark Pending' : 'Mark Active'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Delete Button */}
        <TouchableOpacity 
          style={styles.deleteButton} 
          onPress={handleDelete}
        >
          <Icon name="trash" size={20} color={COLORS.card} />
          <Text style={styles.deleteText}>Delete Listing</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// --- Stylesheet ---
const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  scrollContent: { 
    padding: 20 
  },

  // --- Header ---
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.card,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: "700", 
    color: COLORS.textPrimary,
    flex: 1,
    textAlign: "center",
    marginHorizontal: 16,
  },
  saveBtn: { 
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  saveText: { 
    fontSize: 15, 
    fontWeight: "700", 
    color: COLORS.card,
  },
  saveTextLoading: { 
    opacity: 0.6,
  },

  // --- Sections ---
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },

  // --- Image Gallery ---
  imageScrollContent: {
    gap: 12,
  },
  imageThumbContainer: {
    position: 'relative',
    height: 120,
    width: 120,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.lightGray,
  },
  imageThumb: {
    height: '100%',
    width: '100%',
  },
  deleteImageBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 10,
    backgroundColor: COLORS.card,
    borderRadius: 12,
  },
  addMediaBtn: {
    height: 120,
    width: 120,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMediaText: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 6,
    fontWeight: '600'
  },

  // --- Input Fields ---
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  inputMultiline: {
    height: 120,
    textAlignVertical: 'top',
    paddingVertical: 14,
  },

  // --- Layout Wrappers ---
  rowWrapper: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 0,
  },
  rowItem: {
    flex: 1,
  },
  typeDisplay: {
    backgroundColor: COLORS.lightGray,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  typeText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  // --- Status Management ---
  statusGroup: {
    backgroundColor: COLORS.card,
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statusButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  statusButtonText: {
    color: COLORS.card,
    fontWeight: '700',
    fontSize: 14,
  },

  // --- Delete Button ---
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.danger,
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  deleteText: {
    color: COLORS.card,
    fontSize: 16,
    fontWeight: '700',
  },
  // --- Preview Card (SellScreen-like) ---
  previewCard: {
    height: 220,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: COLORS.lightGray,
    elevation: 3,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.12)'
  },
  previewTopRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  typeChipPreview: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  typeChipTextPreview: { color: COLORS.card, fontWeight: '700' },
  statusChipPreview: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  statusChipTextPreview: { color: COLORS.card, fontWeight: '700' },
  previewPricePill: { position: 'absolute', bottom: 12, left: 12, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12 },
  previewPriceText: { color: COLORS.card, fontWeight: '800', fontSize: 18 },
  saveGradient: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});

export default EditPropertyScreen;