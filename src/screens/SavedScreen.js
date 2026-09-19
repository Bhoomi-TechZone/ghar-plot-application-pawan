import React, { useState, useCallback } from "react";
import { useFocusEffect } from '@react-navigation/native';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    TouchableOpacity,
    TextInput,
    Alert,
    Modal,
    ScrollView,
    ActivityIndicator,
    Platform,
    StatusBar,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { DeviceEventEmitter } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
// NOTE: Make sure formatImageUrl correctly prepends your base URL (e.g., https://ghar-plot-backend1.onrender.com/)
import { formatImageUrl, formatPrice } from '../services/homeApi';

// --- Import the API function from the new service file ---
import { toggleSaveProperty, getSavedProperties, removeSavedProperty } from '../services/propertyapi';
import CrossPlatformAlert from '../utils/crossPlatformAlert';
// ---------------------------------------------------------

// Fallback image URL when a property has no photo link
const DEFAULT_IMAGE_URL = 'https://via.placeholder.com/180x180.png?text=No+Image';

// Helper function to get correct image URL based on property source
const getPropertyImageUrl = (imageData, isPostedByAdmin) => {
    if (!imageData) return DEFAULT_IMAGE_URL;

    // Extract the image path
    const imagePath = typeof imageData === 'string' ? imageData : (imageData.uri || imageData);

    if (!imagePath) return DEFAULT_IMAGE_URL;

    // If it's already a full URL, use it directly
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
    }

    // Route to correct domain based on property source
    const domain = isPostedByAdmin
        ? 'https://ghar-plot-backend1.onrender.com'
        : 'https://ghar-plot-backend1.onrender.com';

    // Remove leading slash if present
    const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;

    return `${domain}/${cleanPath}`;
};

const SavedScreen = ({ navigation }) => {
    const [search, setSearch] = useState("");
    // removed comparison feature state (not needed anymore)
    const [properties, setProperties] = useState([]);
    const [loadingId, setLoadingId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const loadSaved = useCallback(async () => {
        setLoading(true);
        try {
            const responseData = await getSavedProperties();
            console.log('[SavedScreen] getSavedProperties responseData:', responseData);
            let data = [];

            // 1. **CRITICAL FIX: Extract data from savedProperties array**
            if (responseData && responseData.savedProperties && Array.isArray(responseData.savedProperties)) {
                data = responseData.savedProperties;
            } else if (Array.isArray(responseData.data)) {
                data = responseData.data;
            } else if (Array.isArray(responseData)) {
                data = responseData;
            }

            if (Array.isArray(data)) {
                // 2. **FIX: Filter out null entries from the array**
                data = data.filter(Boolean);

                const mapped = data.map(p => {
                    // 3. **FIXED: Use exact API field names**
                    const primaryLocation = p.propertyLocation || p.location || p.address || 'Unknown Location';
                    const primaryType = p.propertyType || p.type || p.tag || '';

                    let imageUrl = DEFAULT_IMAGE_URL;

                    // 4. **FIXED: Handle image path and format it with base URL**
                    if (p.photosAndVideo && p.photosAndVideo[0]) {
                        const rawPath = typeof p.photosAndVideo[0] === 'string'
                            ? p.photosAndVideo[0]
                            : (p.photosAndVideo[0].url || p.photosAndVideo[0]);

                        if (rawPath) {
                            // Use domain routing helper based on isPostedByAdmin flag
                            imageUrl = getPropertyImageUrl(rawPath, p.isPostedByAdmin);
                        }
                    } else if (p.images && p.images[0]) {
                        // Fallback for an 'images' array if it exists
                        const rawPath = typeof p.images[0] === 'string'
                            ? p.images[0]
                            : (p.images[0].url || p.images[0]);
                        if (rawPath) {
                            imageUrl = getPropertyImageUrl(rawPath, p.isPostedByAdmin);
                        }
                    }

                    return {
                        // Use _id as the primary unique identifier
                        id: p._id || p.id || p.propertyId || String(p._id || Date.now()),
                        title: p.description || p.title || p.name || 'Untitled Property',
                        price: p.price || p.listPrice || p.sellingPrice || 'N/A',
                        location: primaryLocation,
                        image: { uri: imageUrl },
                        tag: primaryType,
                        isSaved: true,
                        raw: p, // Keep raw property for later use
                        isPostedByAdmin: p.isPostedByAdmin || false, // Check if posted by admin/user
                    };
                });
                setProperties(mapped);
            } else {
                setProperties([]);
            }
        } catch (err) {
            console.error('Error loading saved properties:', err);
            CrossPlatformAlert.alert("Error", err.message || "Failed to load shortlisted properties. Please check your network or API status.");
            setProperties([]);
        } finally {
            setLoading(false);
        };

    }, []);

    React.useEffect(() => {
        loadSaved();
    }, [loadSaved]);

    // Listen for save/remove events from other screens so we can refresh immediately
    React.useEffect(() => {
        const sub = DeviceEventEmitter.addListener('savedListUpdated', (payload) => {
            loadSaved();
        });
        return () => sub.remove();
    }, [loadSaved]);

    useFocusEffect(
        useCallback(() => {
            if (!loading) {
                loadSaved();
            }
            return () => { };
        }, [loadSaved, loading])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await loadSaved();
        } catch (e) {
            console.error('Refresh failed', e);
        } finally {
            setRefreshing(false);
        }
    };

    const handleRemoveProperty = useCallback((propertyId) => {
        CrossPlatformAlert.alert(
            "Remove Property",
            "Are you sure you want to remove this property from your shortlist?",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        setLoadingId(propertyId);
                        try {
                            // Using the dedicated DELETE function as it is clearer for removal
                            await removeSavedProperty(propertyId);
                            await loadSaved();

                        } catch (error) {
                            console.error("Remove Property failed:", error);
                            CrossPlatformAlert.alert("Error", error.message || "Failed to remove property. Please retry.");
                        } finally {
                            setLoadingId(null);
                        }
                    }
                }
            ],
            { cancelable: true }
        );
    }, [loadSaved]);

    // Handle property card click
    const handlePropertyPress = (item) => {
        // Check if property is posted by user (not admin)
        if (item.isPostedByAdmin) {
            // If posted by admin or other users, navigate to inquiry form first
            navigation.navigate('PropertyInquiryFormScreen', { property: item.raw || item });
        } else {
            // If posted by user themselves, show property details directly
            navigation.navigate('PropertyDetailsScreen', { property: item.raw || item });
        }
    };

    // comparison handlers removed

    const filteredProperties = properties.filter(item =>
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.location.toLowerCase().includes(search.toLowerCase()) ||
        item.tag.toLowerCase().includes(search.toLowerCase())
    );

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.cardRow}
            onPress={() => handlePropertyPress(item)}
            activeOpacity={0.7}
        >
            <Image
                source={item.image}
                style={styles.imageRow}
                resizeMode="cover"
            />

            <View style={styles.infoRow}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                        <Text style={styles.location} numberOfLines={1}><Icon name="location-outline" size={12} color="#777" /> {item.location}</Text>
                        <View style={styles.tagRow}><Text style={styles.tagText}>{item.tag}</Text></View>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.priceTextRow}>{typeof item.price === 'number' ? formatPrice(item.price) : item.price}</Text>
                        <TouchableOpacity
                            style={styles.deleteCircle}
                            onPress={(e) => {
                                e.stopPropagation();
                                handleRemoveProperty(item.id);
                            }}
                            disabled={loadingId === item.id}
                        >
                            {loadingId === item.id ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="trash-outline" size={16} color="#fff" />}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Icon name="heart-outline" size={80} color="#EF4444" />
            <Text style={styles.emptyTextTitle}>No property shortlisted</Text>
            <Text style={styles.emptyTextSubtitle}>You haven't shortlisted any properties yet. Tap the heart on a listing to save it here.</Text>
            <TouchableOpacity style={styles.browseBtn} onPress={() => navigation.navigate('AllPropertiesScreen')}>
                <Text style={styles.browseBtnText}>Browse Properties</Text>
            </TouchableOpacity>
        </View>
    );

    const insets = useSafeAreaInsets();
    const statusBarTop = insets.top > 0 ? insets.top : (Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0);

    return (
        <View style={[styles.container, { paddingTop: statusBarTop }]}>
            {/* Header */}
            <View style={styles.headerRowTop}>
                <Text style={styles.header}>Shortlisted Properties</Text>
                <Text style={styles.countText}>{properties.length} saved</Text>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Icon name="search-outline" size={20} color="#555" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search shortlisted properties..."
                    value={search}
                    onChangeText={setSearch}
                />
            </View>

            {/* List */}
            <FlatList
                data={filteredProperties}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: 120 }}
                refreshing={refreshing}
                onRefresh={onRefresh}
                ListEmptyComponent={renderEmpty}
            />

            {/* Comparison feature removed */}
        </View>
    );
};

// ----------------------------------------------------------------
// ## Stylesheet
// ----------------------------------------------------------------
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f9f9f9", paddingHorizontal: 15 },
    header: {
        fontSize: 22,
        fontWeight: "bold",
        marginBottom: 10,
        color: "#222",
        paddingTop: 0,
    },

    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        paddingHorizontal: 12,
        borderRadius: 10,
        elevation: 2,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    searchInput: { flex: 1, marginLeft: 8, fontSize: 14, paddingVertical: 10 },

    card: {
        backgroundColor: "#fff",
        borderRadius: 12,
        marginBottom: 15,
        overflow: "hidden",
        elevation: 3,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
    },
    image: { width: "100%", height: 180, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
    priceTag: {
        position: "absolute",
        bottom: 10,
        left: 10,
        backgroundColor: "rgba(30, 136, 229,0.9)",
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 8,
    },
    priceText: { color: "#fff", fontWeight: "bold", fontSize: 14 },

    deleteBtn: {
        position: "absolute",
        top: 10,
        right: 10,
        backgroundColor: "rgba(211, 47, 47, 0.8)", // Reddish background for delete
        borderRadius: 20,
        padding: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },

    checkbox: {
        position: "absolute",
        top: 10,
        left: 10,
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: "#fff",
        backgroundColor: "rgba(0,0,0,0.3)",
        justifyContent: "center",
        alignItems: "center",
    },
    checkboxSelected: { backgroundColor: "#1E90FF", borderColor: "#1E90FF" },

    info: { padding: 12 },
    title: { fontSize: 16, fontWeight: "bold", color: "#333" },
    location: { fontSize: 13, color: "#777", marginTop: 2 },
    tag: {
        marginTop: 6,
        alignSelf: "flex-start",
        backgroundColor: "#E3F2FD",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    tagText: { fontSize: 12, color: "#1E90FF", fontWeight: '500' },

    /* comparison styles removed */
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 50,
        padding: 20,
    },
    emptyTextTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#888',
        marginTop: 10,
    },
    emptyTextSubtitle: {
        fontSize: 14,
        color: '#aaa',
        marginTop: 5,
        textAlign: 'center',
    }
    ,
    // --- New/Updated styles for improved SavedScreen UI ---
    headerRowTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 15,
        marginBottom: 8,
    },
    countText: {
        fontSize: 13,
        color: '#666',
        fontWeight: '600',
    },
    cardRow: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 14,
        padding: 10,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
    },
    imageRow: {
        width: 110,
        height: 90,
        borderRadius: 8,
        backgroundColor: '#eee'
    },
    infoRow: {
        flex: 1,
        paddingLeft: 12,
    },
    priceTextRow: {
        fontSize: 14,
        color: '#1E90FF',
        fontWeight: '700'
    },
    deleteCircle: {
        marginTop: 10,
        backgroundColor: '#d32f2f',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center'
    },
    tagRow: {
        marginTop: 8,
        alignSelf: 'flex-start',
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    browseBtn: {
        marginTop: 16,
        backgroundColor: '#1E90FF',
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 10,
    },
    browseBtnText: {
        color: '#fff',
        fontWeight: '700'
    }
});

export default SavedScreen;