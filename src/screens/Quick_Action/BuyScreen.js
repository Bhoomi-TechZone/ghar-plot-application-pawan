import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  Dimensions,
  ScrollView,
  SafeAreaView,
  Platform,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";
import { getAllOtherProperties, toggleSaveProperty, removeSavedProperty } from "../../services/propertyapi";
import { formatImageUrl, formatPrice, getSavedPropertiesIds } from "../../services/homeApi";
import { DeviceEventEmitter } from 'react-native';
import MediaCard from "../../components/MediaCard";

const { width } = Dimensions.get("window");

// --- Color Palette ---
const COLORS = {
  primary: "#1E90FF",
  secondary: "#5DA9F6",
  background: "#F8F9FA",
  card: "#FFFFFF",
  textPrimary: "#1E1E1E",
  textSecondary: "#6C757D",
  shadow: "rgba(0, 0, 0, 0.1)",
};

const BuyScreen = ({ navigation }) => {
  const [propertiesList, setPropertiesList] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("All");
  const [favorites, setFavorites] = useState([]);

  const propertyTypes = [
    "All",
    "Apartment",
    "Studio",
    "Condo",
    "Villa",
    "House",
    "PG",
    "Shop",
    "Office",
  ];

  // --- Fetch properties from API ---
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await getAllOtherProperties();
        console.log('🏠 BuyScreen - API Response:', {
          dataType: typeof res,
          isArray: Array.isArray(res),
          length: res?.length,
          firstItem: res?.[0]
        });

        if (mounted && Array.isArray(res) && res.length > 0) {
          const mapped = res.map((p, idx) => {
            // Log the raw property data to see all available fields
            console.log(`Property ${idx}:`, {
              description: p.description,
              title: p.title,
              propertyLocation: p.propertyLocation,
              location: p.location,
              price: p.price,
              beds: p.beds,
              bedrooms: p.bedrooms,
              baths: p.baths,
              bathrooms: p.bathrooms,
              areaDetails: p.areaDetails,
              area: p.area,
              photosAndVideo: p.photosAndVideo?.length,
              isPostedByAdmin: p.isPostedByAdmin,
              residentialType: p.residentialType,
              commercialType: p.commercialType,
            });

            return {
              id: p._id || p.id || String(idx),
              name: p.description || p.title || "Property",
              location: p.propertyLocation || p.location || "Unknown",
              price: typeof p.price === "number" ? p.price : Number(p.price) || null,
              priceText: p.priceText || null,
              beds: p.beds || p.bedrooms || "-",
              baths: p.baths || p.bathrooms || "-",
              sqft: p.areaDetails || p.area || "-",
              image: formatImageUrl(p.photosAndVideo?.[0] || null),
              raw: p,
            };
          });
          console.log('✅ BuyScreen - Mapped Properties:', mapped.length, 'items');
          console.log('📊 First mapped property:', mapped[0]);
          setPropertiesList(mapped);
          setFilteredProperties(mapped);
        } else {
          console.log('⚠️ BuyScreen - No properties received or empty array');
          setPropertiesList([]);
          setFilteredProperties([]);
        }
      } catch (e) {
        console.error('❌ Failed to load buy properties:', e.message || e);
        setPropertiesList([]);
        setFilteredProperties([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    // load saved ids
    (async () => {
      try {
        const saved = await getSavedPropertiesIds();
        setFavorites(saved || []);
      } catch (e) {
        console.warn('Failed to load saved ids in BuyScreen', e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Listen for saved list updates from other screens
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('savedListUpdated', () => {
      (async () => {
        try {
          const saved = await getSavedPropertiesIds();
          setFavorites(saved || []);
        } catch (e) {
          console.warn('Failed to refresh saved ids', e);
        }
      })();
    });
    return () => sub.remove();
  }, []);

  // Apply filters and search
  const applyFilters = () => {
    let filtered = propertiesList;

    // Filter by type
    if (selectedType !== "All") {
      filtered = filtered.filter(
        (item) => item.raw?.propertyType?.toLowerCase() === selectedType.toLowerCase()
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (item) =>
          item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.raw?.propertyId?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredProperties(filtered);
  };

  // Apply filters when search or type changes
  useEffect(() => {
    applyFilters();
  }, [searchQuery, selectedType, propertiesList]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await getAllOtherProperties();
      if (Array.isArray(res) && res.length > 0) {
        const mapped = res.map((p, idx) => ({
          id: p._id || p.id || String(idx),
          name: p.description || p.title || "Property",
          location: p.propertyLocation || "Unknown",
          price: typeof p.price === "number" ? p.price : Number(p.price) || null,
          priceText: p.priceText || null,
          beds: p.beds || "-",
          baths: p.baths || "-",
          sqft: p.areaDetails || p.area || "-",
          image: formatImageUrl(p.photosAndVideo?.[0] || null),
          raw: p,
        }));
        setPropertiesList(mapped);
        setFilteredProperties(mapped);
      }
    } catch (e) {
      console.warn("Refresh failed:", e.message || e);
    } finally {
      setRefreshing(false);
    }
  };

  // Helper function to get correct image URL based on property source
  const getPropertyImageUrl = (imageData, isPostedByAdmin) => {
    if (!imageData || typeof imageData !== 'string') return null;

    // If it's already a complete URL, return it
    if (imageData.startsWith('http://') || imageData.startsWith('https://')) return imageData;

    // Handle uploads path
    if (imageData.startsWith('uploads/') || imageData.startsWith('/uploads/')) {
      if (isPostedByAdmin) {
        const baseUrl = 'https://gharplotbackend.gntechnology.de';
        const cleanPath = imageData.replace(/^\/+/, '');
        return `${baseUrl}/${cleanPath}`;
      } else {
        const baseUrl = 'https://gharplotbackend.gntechnology.de';
        const cleanPath = imageData.replace(/^\/+/, '');
        return `${baseUrl}/${cleanPath}`;
      }
    }

    return null;
  };

  // --- Property Card ---
  const renderProperty = ({ item }) => {
    // Get correct image URL based on property source
    const firstImagePath = item.raw?.photosAndVideo?.[0];
    const propertyImageUrl = getPropertyImageUrl(firstImagePath, item.raw?.isPostedByAdmin);

    // Prepare media items for MediaCard with correct domain routing
    const mediaItems = item.raw?.photosAndVideo && item.raw.photosAndVideo.length > 0
      ? item.raw.photosAndVideo.map(media => {
        // Try custom URL routing first, then formatImageUrl, then use as-is
        const imageUrl = getPropertyImageUrl(media.uri || media, item.raw?.isPostedByAdmin) ||
          formatImageUrl(media.uri || media) ||
          (typeof media === 'string' ? media : media.uri);
        return {
          uri: imageUrl,
          type: media.type || (typeof media === 'string' && (media.includes('.mp4') || media.includes('.mov') || media.includes('.avi')) ? 'video' : 'image')
        };
      })
      : item.image ? [{ uri: item.image, type: 'image' }] : [];

    console.log('📱 BuyScreen - Rendering property:', {
      name: item.name,
      location: item.location,
      mediaItemsCount: mediaItems.length,
      mediaItems: mediaItems,
      itemImage: item.image,
      rawPhotos: item.raw?.photosAndVideo?.length,
      firstImagePath: firstImagePath,
      propertyImageUrl: propertyImageUrl
    });

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => navigation.navigate("PropertyDetailsScreen", { property: item.raw || item })}
      >
        <View style={styles.imageContainer}>
          <MediaCard
            mediaItems={mediaItems}
            fallbackImage="https://placehold.co/600x400/CCCCCC/888888?text=No+Image"
            imageStyle={styles.propertyImage}
            showControls={true}
            autoPlay={false}
            style={styles.mediaCard}
          />
          <View style={styles.priceTag}>
            <Text style={styles.priceTagText}>
              {item.price ? formatPrice(item.price) : item.priceText || "-"}
            </Text>
          </View>
          <TouchableOpacity style={styles.favoriteButton} onPress={async () => {
            const propId = item.raw && (item.raw._id || item.raw.id) ? (item.raw._id || item.raw.id) : item.id;
            const isSaved = favorites.includes(propId);
            // optimistic UI update
            setFavorites(prev => isSaved ? prev.filter(f => f !== propId) : [...prev, propId]);
            try {
              if (isSaved) {
                await removeSavedProperty(propId);
                DeviceEventEmitter.emit('savedListUpdated', { propertyId: propId, action: 'removed' });
              } else {
                await toggleSaveProperty(propId);
                DeviceEventEmitter.emit('savedListUpdated', { propertyId: propId, action: 'added' });
              }
            } catch (e) {
              console.error('Failed to toggle save from BuyScreen', e);
              // rollback optimistic update
              setFavorites(prev => isSaved ? [...prev, propId] : prev.filter(f => f !== propId));
            }
          }}>
            <Icon name={favorites.includes(item.raw && (item.raw._id || item.raw.id) ? (item.raw._id || item.raw.id) : item.id) ? "heart" : "heart-outline"} size={22} color={favorites.includes(item.raw && (item.raw._id || item.raw.id) ? (item.raw._id || item.raw.id) : item.id) ? COLORS.secondary : COLORS.card} />
          </TouchableOpacity>
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.propertyName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.locationRow}>
            <Icon name="location-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.propertyLocation} numberOfLines={1}>
              {item.location}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Icon name="bed-outline" size={16} color={COLORS.primary} />
              <Text style={styles.infoText}>{item.beds} Beds</Text>
            </View>
            <View style={styles.infoItem}>
              <Icon name="bathtub-outline" size={16} color={COLORS.primary} />
              <Text style={styles.infoText}>{item.baths} Baths</Text>
            </View>
            <View style={styles.infoItem}>
              <Icon name="expand-outline" size={16} color={COLORS.primary} />
              <Text style={styles.infoText}>{item.sqft} sqft</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // --- Main Render ---
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Buy Properties</Text>
          <TouchableOpacity
            style={styles.postBtn}
            onPress={() => navigation.navigate('AddSell')}
          >
            <Icon name="add-circle-outline" size={26} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <View style={Platform.OS === 'web' ? { flex: 1, overflowY: 'auto' } : { flex: 1 }}>
        <ScrollView 
          showsVerticalScrollIndicator={Platform.OS === 'web' ? true : false}
        >
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Icon name="search-outline" size={22} color={COLORS.textSecondary} />
            <TextInput
              placeholder="Search by city, project, or ID..."
              placeholderTextColor="#AAA"
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Icon name="close-circle" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Filter Buttons */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {propertyTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterBtn,
                  selectedType === type && { backgroundColor: COLORS.primary },
                ]}
                onPress={() => setSelectedType(type)}
              >
                <Text
                  style={[
                    styles.filterText,
                    selectedType === type && { color: COLORS.card },
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Property List */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Properties</Text>
          </View>

          <FlatList
            data={filteredProperties}
            renderItem={renderProperty}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.propertiesListContainer}
            refreshing={refreshing}
            onRefresh={onRefresh}
            key={Platform.OS === 'web' ? 'web-grid-2' : 'mobile-list-1'}
            numColumns={Platform.OS === 'web' ? 2 : 1}
            columnWrapperStyle={Platform.OS === 'web' ? styles.gridRow : undefined}
            ListEmptyComponent={
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: COLORS.textSecondary, fontSize: 16 }}>No properties found</Text>
              </View>
            }
          />
          <View style={{ height: 50 }} />
        </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1 },
  header: {
    width: "100%",
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  backBtn: { padding: 5 },
  postBtn: { padding: 5 },
  headerTitle: { fontSize: 20, color: COLORS.textPrimary, fontWeight: "700" },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
    elevation: 8,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.textPrimary, marginLeft: 10 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 25,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: COLORS.textPrimary },
  seeAll: { color: COLORS.primary, fontWeight: "600", fontSize: 14 },
  filterScroll: { marginTop: 15, marginHorizontal: 10 },
  filterBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#E9ECEF",
    marginHorizontal: 5,
  },
  filterText: { fontSize: 14, color: COLORS.textPrimary },
  propertiesListContainer: { paddingHorizontal: 20 },
  gridRow: {
    justifyContent: 'space-between',
    gap: 16,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 15,
    marginBottom: 25,
    overflow: "hidden",
    elevation: 8,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    ...(Platform.OS === 'web' ? { flex: 1, maxWidth: '48%' } : {}),
  },
  imageContainer: { position: "relative" },
  propertyImage: { width: "100%", height: 200 },
  priceTag: {
    position: "absolute",
    top: 15,
    left: 0,
    backgroundColor: COLORS.secondary,
    paddingVertical: 6,
    paddingHorizontal: 15,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  priceTagText: { fontSize: 16, fontWeight: "bold", color: COLORS.card },
  favoriteButton: {
    position: "absolute",
    top: 15,
    right: 15,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 25,
    padding: 8,
  },
  cardContent: { padding: 15 },
  propertyName: { fontSize: 18, fontWeight: "700", color: COLORS.textPrimary },
  locationRow: { flexDirection: "row", alignItems: "center", marginVertical: 4 },
  propertyLocation: { fontSize: 13, color: COLORS.textSecondary, marginLeft: 5 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#EBEBEB",
  },
  infoItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 5 },
  infoText: { marginLeft: 5, fontSize: 13, color: COLORS.textPrimary, fontWeight: "600" },
  mediaCard: {
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
});

export default BuyScreen;
