import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  FlatList,
  ActivityIndicator,
  Animated,
  Platform,
  SafeAreaView,
  Linking,
  Modal,
  StatusBar,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import MediaCard from "../components/MediaCard";
import CrossPlatformAlert from '../utils/crossPlatformAlert';
import AuthModal from '../components/AuthModal';
import { isUserAuthenticated } from '../utils/authCheck';
import {
  formatImageUrl,
  formatPrice,
  getRecentProperties,
  getNearbyProperties,
} from "../services/homeApi";

const { width, height } = Dimensions.get("window");
const GALLERY_HEIGHT = Math.round(height * 0.44);
const DOT_SIZE = 8;

// --- Colors ---
const colors = {
  // switch to blue primary/accent
  primary: "#1E90FF",
  accent: "#5DA9F6",
  white: "#FFFFFF",
  background: "#F5F8FF",
  text: "#222",
  muted: "#6B7280",
};

// --- Amenity Icons ---
const getAmenityIcon = (name) => {
  switch (name) {
    case "Gym": return "barbell-outline";
    case "Pool": return "water-outline";
    case "Balcony": return "sunny-outline";
    case "Security": return "shield-checkmark-outline";
    case "Parking": return "car-outline";
    case "Lift": return "business-outline";
    case "Park": return "leaf-outline";
    default: return "flash-outline";
  }
};

const PropertyDetailsScreen = ({ navigation, route }) => {
  const { property: routeProperty, itemId, user: routeUser, fromAddProperty } = route?.params || {};
  const [property, setProperty] = useState(routeProperty || null);
  const [loading, setLoading] = useState(!routeProperty);
  
  // Smart back navigation handler
  const handleBackPress = () => {
    if (fromAddProperty) {
      // If coming from AddSellScreen, navigate to Home
      navigation.navigate('Home');
    } else {
      // Otherwise, use normal back navigation
      navigation.goBack();
    }
  };
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showFullscreenMedia, setShowFullscreenMedia] = useState(false);
  const [fullscreenMediaIndex, setFullscreenMediaIndex] = useState(0);
  const [inquirySubmitted, setInquirySubmitted] = useState(false);
  const scrollX = useRef(new Animated.Value(0)).current;
  
  // Authentication modal state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMessage, setAuthModalMessage] = useState('');

  useEffect(() => {
    if (property) return;

    const fetchAndFind = async () => {
      setLoading(true);
      try {
        const [recent, nearby] = await Promise.all([
          getRecentProperties(20),
          getNearbyProperties(0, 0),
        ]);

        const all = [...(recent || []), ...(nearby || [])];
        const found = all.find((p) => p._id === itemId || p.id === itemId);
        if (found) setProperty(found);
      } catch (err) {
        console.warn("Property lookup failed", err);
      } finally {
        setLoading(false);
      }
    };

    if (itemId) fetchAndFind();
    else setLoading(false);
  }, [itemId]);

  // Check if inquiry was already submitted for this property
  useEffect(() => {
    const checkInquiryStatus = async () => {
      if (property) {
        try {
          const propertyId = property._id || property.id || property.propertyId;
          if (propertyId) {
            const inquiryFlag = await AsyncStorage.getItem(`inquirySubmitted:${propertyId}`);
            setInquirySubmitted(!!inquiryFlag);
          }
        } catch (error) {
          console.warn('Failed to check inquiry status:', error);
        }
      }
    };

    checkInquiryStatus();
  }, [property]);

  // Listen for navigation focus to update inquiry status
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Re-check inquiry status when screen is focused
      if (property) {
        const checkInquiryStatus = async () => {
          try {
            const propertyId = property._id || property.id || property.propertyId;
            if (propertyId) {
              const inquiryFlag = await AsyncStorage.getItem(`inquirySubmitted:${propertyId}`);
              setInquirySubmitted(!!inquiryFlag);
            }
          } catch (error) {
            console.warn('Failed to check inquiry status:', error);
          }
        };
        checkInquiryStatus();
      }
    });

    return unsubscribe;
  }, [navigation, property]);

  // Handle inquiry button press with authentication check
  const handleInquiryPress = async () => {
    // Check authentication first
    const isAuthenticated = await isUserAuthenticated();
    
    if (!isAuthenticated) {
      setAuthModalMessage('Please login or signup to submit an inquiry for this property');
      setShowAuthModal(true);
      return;
    }
    
    if (inquirySubmitted) {
      CrossPlatformAlert.alert(
        'Inquiry Already Submitted',
        'You have already submitted an inquiry for this property. The agent will contact you soon.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Navigate to inquiry form
    navigation.navigate('PropertyInquiryFormScreen', { property });
  };

  // Handle call button press with authentication check
  const handleCallPress = async () => {
    // Check authentication first
    const isAuthenticated = await isUserAuthenticated();
    
    if (!isAuthenticated) {
      setAuthModalMessage('Please login or signup to contact the property owner');
      setShowAuthModal(true);
      return;
    }
    
    // Get phone number from property owner
    const owner = property.postedBy || property.userId || property.owner;
    let phoneNumber = null;

    // Extract phone number from owner object or property
    if (owner && typeof owner === 'object') {
      phoneNumber = owner.phone || owner.phoneNumber || owner.contactNumber || owner.mobile;
    } else if (property.contactNumber) {
      phoneNumber = property.contactNumber;
    } else if (property.phone) {
      phoneNumber = property.phone;
    }

    if (!phoneNumber) {
      CrossPlatformAlert.alert(
        'Contact Not Available',
        'Phone number for this property is not available.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Clean phone number (remove spaces, dashes, etc.)
    const cleanPhone = phoneNumber.replace(/[^0-9+]/g, '');

    CrossPlatformAlert.alert(
      'Call Property Owner',
      `Would you like to call ${cleanPhone}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Call',
          onPress: () => {
            const phoneUrl = `tel:${cleanPhone}`;
            Linking.canOpenURL(phoneUrl)
              .then((supported) => {
                if (supported) {
                  return Linking.openURL(phoneUrl);
                } else {
                  CrossPlatformAlert.alert('Error', 'Unable to make phone calls on this device.');
                }
              })
              .catch((err) => {
                console.error('Error opening phone dialer:', err);
                CrossPlatformAlert.alert('Error', 'Failed to open phone dialer.');
              });
          }
        }
      ]
    );
  };
  
  // Handle chat button press with authentication check
  const handleChatPress = async () => {
    // Check authentication first
    const isAuthenticated = await isUserAuthenticated();
    
    if (!isAuthenticated) {
      setAuthModalMessage('Please login or signup to chat with the property owner');
      setShowAuthModal(true);
      return;
    }
    
    const chatUser = property.postedBy || property.userId || property.owner; 

    if (!chatUser) {
      CrossPlatformAlert.alert(
        'Contact Not Available',
        'Chat is not available for this property.',
        [{ text: 'OK' }]
      );
      return;
    }

    navigation.navigate("ChatDetailScreen", {
      user: chatUser,
      propertyId: property._id || property.id,
      propertyTitle: property.title || "Property",
    });
  };
  
  // Handle favorite/save button press with authentication check
  const handleFavoritePress = async () => {
    // Check authentication first
    const isAuthenticated = await isUserAuthenticated();
    
    if (!isAuthenticated) {
      setAuthModalMessage('Please login or signup to save properties to your favorites');
      setShowAuthModal(true);
      return;
    }
    
    // TODO: Implement favorite toggle logic here
    CrossPlatformAlert.alert('Coming Soon', 'Favorite feature will be available soon!');
  };
  
  // Handle auth modal actions
  const handleAuthModalLogin = () => {
    setShowAuthModal(false);
    navigation.navigate('LoginScreen');
  };
  
  const handleAuthModalClose = () => {
    setShowAuthModal(false);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!property) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={{ fontSize: 16, color: colors.text }}>
          Property details not available 😟
        </Text>
        <TouchableOpacity style={{ marginTop: 12 }} onPress={handleBackPress}>
          <Text style={{ color: colors.primary, fontWeight: "700" }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Prepare media items for MediaCard with better error handling
  const mediaItems = property.photosAndVideo?.length
    ? property.photosAndVideo.map(media => {
        // For local properties, bypass formatImageUrl for file:// URIs
        let uri;
        const rawUri = media.uri || media;
        
        if (typeof rawUri === 'string' && rawUri.startsWith('file://')) {
          // For local file URIs, use directly without formatting
          uri = rawUri;
          console.log('🔍 Using local file URI directly:', rawUri);
        } else {
          // For server URIs, use formatImageUrl
          uri = formatImageUrl(rawUri) || rawUri;
          console.log('🔍 Using formatted URI:', { original: rawUri, formatted: uri });
        }
        
        const isVideoFile = uri?.toLowerCase().includes('.mp4') || 
                           uri?.toLowerCase().includes('.mov') || 
                           uri?.toLowerCase().includes('.avi') ||
                           uri?.toLowerCase().includes('.mkv') ||
                           uri?.toLowerCase().includes('.webm') ||
                           media.type?.toLowerCase().includes('video');
        
        console.log('🔍 Processing media:', { 
          originalMedia: media, 
          rawUri,
          finalUri: uri, 
          isVideoFile, 
          type: media.type,
          isLocal: property.isLocal,
          extension: uri?.split('.').pop()?.toLowerCase()
        });
        
        return {
          uri: uri,
          type: isVideoFile ? 'video/mp4' : 'image/jpeg'
        };
      })
    : property.images?.length 
    ? property.images.map((imageData, index) => {
        // Handle both string URLs and object format for images
        let uri;
        const rawUri = typeof imageData === 'string' ? imageData : imageData.uri || imageData.url || imageData;
        
        if (typeof rawUri === 'string' && rawUri.startsWith('file://')) {
          // For local file URIs, use directly without formatting
          uri = rawUri;
          console.log('🖼️ Using local file URI directly:', rawUri);
        } else {
          // For server URIs, use formatImageUrl
          uri = formatImageUrl(rawUri) || rawUri;
          console.log('🖼️ Using formatted URI:', { original: rawUri, formatted: uri });
        }
        
        const isVideoFile = uri?.toLowerCase().includes('.mp4') || 
                           uri?.toLowerCase().includes('.mov') || 
                           uri?.toLowerCase().includes('.avi') ||
                           uri?.toLowerCase().includes('.mkv') ||
                           uri?.toLowerCase().includes('.webm');
        
        console.log('🖼️ Processing image as media:', { 
          rawUri, 
          finalUri: uri, 
          isVideoFile, 
          isLocal: property.isLocal 
        });
        
        return {
          uri: uri,
          type: isVideoFile ? 'video/mp4' : 'image/jpeg'
        };
      })
    : [{ uri: formatImageUrl(null), type: 'image/jpeg' }];

  // Enhanced debugging
  console.log('🏠 Property data:', {
    hasPhotosAndVideo: !!property.photosAndVideo,
    photosAndVideoLength: property.photosAndVideo?.length || 0,
    hasImages: !!property.images,
    imagesLength: property.images?.length || 0,
    sampleData: property.photosAndVideo?.[0] || property.images?.[0],
    propertyKeys: Object.keys(property || {})
  });

  const title = property.title || property.description || "Property";
  const price =
    typeof property.price === "number"
      ? formatPrice(property.price)
      : property.price || "N/A";

  const keyDetails = [
    { label: property.bedrooms || property.propertyType, icon: "bed-outline" },
    {
      label: property.areaDetails
        ? `${property.areaDetails} sq.ft`
        : property.size,
      icon: "resize-outline",
    },
    { label: property.furnishingStatus || property.status, icon: "cube-outline" },
  ].filter((d) => d.label);

  // --- Static Google Map URL ---
  const latitude = property.latitude || 37.78825;
  const longitude = property.longitude || -122.4324;
  // 🚨 REMINDER: Replace YOUR_API_KEY with an actual Google Maps API key
  // Use blue marker instead of orange
  const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=15&size=600x300&markers=color:blue%7C${latitude},${longitude}&key=YOUR_API_KEY`;

  const openInGoogleMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    Linking.openURL(url);
  };

  const handleMediaPress = (media, index) => {
    console.log('Media pressed:', media, 'Index:', index);
    console.log('All media items:', mediaItems);
    setFullscreenMediaIndex(index);
    setShowFullscreenMedia(true);
  };

  const closeFullscreenMedia = () => {
    setShowFullscreenMedia(false);
  };

  const renderAmenity = ({ item }) => (
    <View style={styles.amenityCard}>
      <View style={styles.amenityIconWrap}>
        <Icon name={getAmenityIcon(item)} size={18} color={colors.primary} />
      </View>
      <Text style={styles.amenityText} numberOfLines={1}>
        {item}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Enhanced Gallery with Video Support */}
      <View style={styles.galleryContainer}>
        <MediaCard
          mediaItems={mediaItems}
          fallbackImage="https://via.placeholder.com/400x300/5da9f6/FFFFFF?text=Property+Image"
          imageStyle={styles.galleryMediaImage}
          showControls={true}
          autoPlay={false}
          loop={false}
          onMediaPress={handleMediaPress}
          style={styles.galleryMediaCard}
        />

        {/* Header Buttons Overlay */}
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.glassButton} onPress={handleBackPress}>
            <Icon name="chevron-back" size={20} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.glassButton}>
            <Icon name="heart-outline" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>

        {/* Media Counter */}
        {mediaItems.length > 1 && (
          <View style={styles.mediaCounter}>
            <Text style={styles.mediaCounterText}>
              {mediaItems.length} media files
            </Text>
          </View>
        )}

        <View style={styles.curveBottom} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 160 }}>
        <View style={styles.infoCard}>
          {routeUser ? (
            <View style={styles.userBanner}>
              <Text style={styles.userBannerText}>Viewing as: {routeUser.name} • {routeUser.phone}</Text>
            </View>
          ) : null}
          
          <View style={styles.priceRow}>
            <Text style={styles.priceText}>{price}</Text>
            {property.propertyLocation && (
              <Text style={styles.locationText} numberOfLines={1}>
                📍 {property.propertyLocation}
              </Text>
            )}
          </View>
          
          <Text style={styles.titleText}>{title}</Text>

          {/* Enhanced Property Details */}
          <View style={styles.detailsRow}>
            {keyDetails.map((d, i) => (
              <View key={i} style={styles.detailPill}>
                <Icon name={d.icon} size={14} color={colors.primary} />
                <Text style={styles.detailPillText}>{d.label}</Text>
              </View>
            ))}
          </View>

          {/* Property Status and Type */}
          <View style={styles.propertyMetaRow}>
            {property.purpose && (
              <View style={[styles.metaPill, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
                <Text style={[styles.metaPillText, { color: '#22C55E' }]}>
                  {property.purpose}
                </Text>
              </View>
            )}
            {property.propertyType && (
              <View style={[styles.metaPill, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                <Text style={[styles.metaPillText, { color: '#3B82F6' }]}>
                  {property.propertyType}
                </Text>
              </View>
            )}
            {property.availability && (
              <View style={[styles.metaPill, { backgroundColor: 'rgba(251, 146, 60, 0.1)' }]}>
                <Text style={[styles.metaPillText, { color: '#FB923C' }]}>
                  {property.availability}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* About Section */}
        {property.description ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="document-text" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>About this property</Text>
            </View>
            <View style={styles.descriptionCard}>
              <Text style={styles.sectionText}>{property.description}</Text>
            </View>
          </View>
        ) : null}

        {/* Amenities */}
        {property.amenities?.length ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="checkmark-circle" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Amenities & Features</Text>
            </View>
            <FlatList
              data={property.amenities}
              renderItem={renderAmenity}
              keyExtractor={(item, i) => i.toString()}
              numColumns={3}
              columnWrapperStyle={styles.amenityRow}
              scrollEnabled={false}
            />
          </View>
        ) : null}

        {/* Location */}
        {property.propertyLocation && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="location" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Location</Text>
            </View>
            <TouchableOpacity 
              style={styles.locationCard}
              onPress={openInGoogleMaps}
              activeOpacity={0.7}
            >
              <View style={styles.locationIconContainer}>
                <Icon name="pin" size={24} color={colors.primary} />
              </View>
              <View style={styles.locationTextContainer}>
                <Text style={styles.locationAddress}>{property.propertyLocation}</Text>
                {/* <View style={styles.viewMapRow}>
                  <Icon name="navigate-circle-outline" size={14} color={colors.primary} />
                  <Text style={styles.viewMapText}>View on Google Maps</Text>
                </View> */}
              </View>
              <Icon name="chevron-forward" size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBarWrap}>
        <View style={styles.bottomBar}>
          {/* Inquiry Button */}
          <TouchableOpacity 
            style={[styles.actionBtn, styles.inquiryBtn]}
            onPress={handleInquiryPress}
          >
            <Icon 
              name={inquirySubmitted ? "checkmark-circle-outline" : "document-text-outline"} 
              size={17} 
              color={colors.white} 
            />
            <Text style={styles.actionText}>
              {inquirySubmitted ? "Sent" : "Inquiry"}
            </Text>
          </TouchableOpacity>

          {/* Call Button */}
          <TouchableOpacity
            style={[styles.actionBtn, styles.callBtn]}
            onPress={handleCallPress}
          >
            <Icon name="call" size={17} color={colors.white} />
            <Text style={styles.actionText}>Call</Text>
          </TouchableOpacity>

          {/* Chat Button */}
          <TouchableOpacity
            style={[styles.actionBtn, styles.chatBtn]}
            onPress={handleChatPress}
          >
            <Icon name="chatbubble-ellipses-outline" size={17} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.primary }]}>Chat</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Authentication Modal */}
      <AuthModal
        visible={showAuthModal}
        onClose={handleAuthModalClose}
        onLogin={handleAuthModalLogin}
        message={authModalMessage}
      />

      {/* Fullscreen Media Modal */}
      <Modal
        visible={showFullscreenMedia}
        transparent={true}
        animationType="fade"
        onRequestClose={closeFullscreenMedia}
      >
        <StatusBar hidden />
        <View style={styles.fullscreenModalContainer}>
          <MediaCard
            mediaItems={mediaItems}
            fallbackImage="https://via.placeholder.com/400x300/5da9f6/FFFFFF?text=Property+Image"
            imageStyle={styles.fullscreenMediaImage}
            showControls={true}
            autoPlay={true}
            loop={false}
            style={styles.fullscreenMediaCard}
          />
          
          {/* Close Button */}
          <TouchableOpacity 
            style={styles.fullscreenCloseButton} 
            onPress={closeFullscreenMedia}
          >
            <Icon name="close" size={24} color={colors.white} />
          </TouchableOpacity>
          
          {/* Media Info */}
          <View style={styles.fullscreenMediaInfo}>
            <Text style={styles.fullscreenMediaTitle}>{title}</Text>
            <Text style={styles.fullscreenMediaPrice}>{price}</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { justifyContent: "center", alignItems: "center" },
  galleryContainer: { 
    height: GALLERY_HEIGHT, 
    width,
    position: 'relative',
  },
  galleryMediaCard: {
    width: '100%',
    height: GALLERY_HEIGHT,
    borderRadius: 0,
  },
  galleryMediaImage: {
    width: '100%',
    height: GALLERY_HEIGHT,
    borderRadius: 0,
  },
  headerButtons: {
    position: "absolute",
    top: Platform.OS === "ios" ? 42 : 18,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 10,
  },
  glassButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  mediaCounter: {
    position: "absolute",
    top: Platform.OS === "ios" ? 90 : 66,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 10,
  },
  mediaCounterText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "600",
  },
  curveBottom: {
    position: "absolute",
    bottom: -1,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: colors.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  content: { flex: 1, marginTop: -20 },
  infoCard: {
    backgroundColor: colors.white,
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 8,
  },
  priceRow: { 
    flexDirection: "row", 
    justifyContent: "space-between",
    alignItems: 'flex-start',
  },
  priceText: { 
    fontSize: 26, 
    fontWeight: "900", 
    color: colors.primary,
    letterSpacing: -0.5,
  },
  locationText: { 
    color: colors.muted, 
    fontSize: 12, 
    flexShrink: 1,
    marginTop: 4,
  },
  titleText: { 
    fontSize: 22, 
    fontWeight: "800", 
    color: colors.text, 
    marginTop: 10,
    lineHeight: 28,
  },
  detailsRow: { 
    flexDirection: "row", 
    flexWrap: "wrap", 
    marginTop: 16,
    gap: 10,
  },
  detailPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(30,144,255,0.1)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  detailPillText: { 
    marginLeft: 8, 
    color: colors.primary, 
    fontWeight: "700",
    fontSize: 13,
  },
  propertyMetaRow: { 
    flexDirection: "row", 
    flexWrap: "wrap", 
    marginTop: 18,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: "rgba(30, 144, 255, 0.15)",
    gap: 8,
  },
  metaPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
  },
  metaPillText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  section: { marginTop: 20, marginHorizontal: 20 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { 
    fontSize: 17, 
    fontWeight: "800", 
    color: colors.text,
    marginLeft: 8,
  },
  sectionText: { 
    color: colors.text, 
    lineHeight: 24, 
    fontSize: 15,
  },
  descriptionCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  amenityRow: { justifyContent: "space-between" },
  amenityCard: {
    flex: 1,
    margin: 6,
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(30,144,255,0.08)',
  },
  amenityIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(30,144,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  amenityText: { 
    marginTop: 10, 
    fontSize: 12, 
    color: colors.text, 
    fontWeight: "600",
    textAlign: 'center',
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  locationIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: 'rgba(30,144,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationAddress: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 20,
  },
  viewMapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  viewMapText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
  userBanner: {
    backgroundColor: 'rgba(30,144,255,0.06)',
    padding: 8,
    borderRadius: 10,
    marginBottom: 10,
  },
  userBannerText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  mapOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
    backgroundColor: "rgba(30,144,255,0.95)",
    flexDirection: 'row',
    alignItems: "center",
    justifyContent: "center",
  },
  mapOverlayText: { 
    color: "#fff", 
    fontWeight: "700", 
    fontSize: 14,
    marginLeft: 8,
  },
  bottomBarWrap: { 
    position: "absolute", 
    left: 0, 
    right: 0, 
    bottom: Platform.OS === 'ios' ? 30 : 20, 
    alignItems: "center",
    paddingHorizontal: 20,
  },
  bottomBar: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: colors.white,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    justifyContent: "center",
    marginHorizontal: 4,
  },
  inquiryBtn: {
    backgroundColor: colors.primary,
  },
  callBtn: {
    backgroundColor: '#22C55E',
  },
  chatBtn: {
    backgroundColor: "rgba(30,144,255,0.08)",
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  actionText: { 
    color: colors.white, 
    fontWeight: "800", 
    fontSize: 14,
    marginLeft: 5,
    letterSpacing: 0.2,
  },
  
  // Fullscreen Modal Styles
  fullscreenModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenMediaCard: {
    width: width,
    height: height * 0.8,
    borderRadius: 0,
  },
  fullscreenMediaImage: {
    width: width,
    height: height * 0.8,
    borderRadius: 0,
  },
  fullscreenCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  fullscreenMediaInfo: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 12,
  },
  fullscreenMediaTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  fullscreenMediaPrice: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default PropertyDetailsScreen;