import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    SafeAreaView,
    ScrollView,
    Dimensions,
    ActivityIndicator,
    Alert,
    RefreshControl,
    StatusBar,
    Modal,
    TextInput,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import your existing utility functions
import {
    formatImageUrl,
    formatPrice,
    getFirstImageUrl
} from '../services/homeApi';
import { getRecentFeaturedProperties } from '../services/propertyapi';
import CrossPlatformAlert from '../utils/crossPlatformAlert';

// --- Theme & Layout Constants (Enhanced with modern design) ---
const { width, height } = Dimensions.get("window");

const theme = {
    COLORS: {
        primary: "#007BFF",
        primaryDark: "#0056D2",
        background: "#F8F9FB",
        white: "#FFFFFF",
        black: "#1A1A1A",
        greyLight: "#F5F6F8",
        greyMedium: "#6B7280",
        greyDark: "#374151",
        accent: "#FF6B6B",
        success: "#10B981",
        warning: "#F59E0B",
        star: "#FFC107",
        overlay: "rgba(0,0,0,0.4)",
        shadow: "rgba(0,0,0,0.1)",
    },
    SPACING: { xs: 4, s: 8, m: 16, l: 20, xl: 24, xxl: 32 },
    FONT_SIZES: {
        caption: 11,
        small: 12,
        body: 14,
        subheading: 16,
        heading: 18,
        title: 22,
        largeTitle: 26
    },
    RADIUS: { s: 8, m: 12, l: 16, xl: 20, full: 999 },
    FONT_WEIGHTS: {
        light: '300',
        regular: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        heavy: '800',
    }
};

// Calculate card width for 2 columns with proper spacing
const HORIZONTAL_MARGIN = theme.SPACING.l;
const CARD_MARGIN = theme.SPACING.m;
const CARD_WIDTH = (width - (HORIZONTAL_MARGIN * 2) - CARD_MARGIN) / 2;


const AllPropertiesScreen = ({ navigation, route }) => {
    // Route parameters
    const category = route.params?.category; // 'Featured', 'Recent', 'Nearby'
    const searchQuery = route.params?.query; // Search query from the home screen

    // State management
    const [allProperties, setAllProperties] = useState([]);
    const [filteredProperties, setFilteredProperties] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [favorites, setFavorites] = useState([]);

    // Filter state
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [filters, setFilters] = useState({
        propertyType: '',
        purpose: '',
        minPrice: '',
        maxPrice: '',
        location: '',
    });
    const [activeFiltersCount, setActiveFiltersCount] = useState(0);

    // Enhanced title calculation
    const screenTitle = useMemo(() => {
        if (category === 'Featured') return 'Featured Estates';
        if (category === 'Recent') return 'Recent Estates';
        if (category === 'Nearby') return 'Nearby Properties';
        if (category === 'All') return 'All Properties';
        if (category === 'Residential') return 'Residential Properties';
        if (category === 'Commercial') return 'Commercial Properties';
        if (category === 'Rent') return 'Properties for Rent';
        if (searchQuery) return `Search Results`;
        return 'All Properties';
    }, [category, searchQuery]);

    // Filter property types and purposes for dropdowns
    const propertyTypes = ['House', 'Apartment', 'Villa', 'Plot', 'Commercial', 'Office'];
    const purposes = ['Sale', 'Rent', 'Lease'];

    // Predefined price ranges for quick selection
    const priceRanges = [
        { label: 'Under ?10L', min: '0', max: '1000000' },
        { label: '?10L - ?25L', min: '1000000', max: '2500000' },
        { label: '?25L - ?50L', min: '2500000', max: '5000000' },
        { label: '?50L - ?1Cr', min: '5000000', max: '10000000' },
        { label: 'Above ?1Cr', min: '10000000', max: '' },
    ];

    // Apply filters to properties
    const applyFilters = useCallback((properties) => {
        let filtered = [...properties];

        if (filters.propertyType) {
            filtered = filtered.filter(item =>
                item.propertyType?.toLowerCase().includes(filters.propertyType.toLowerCase())
            );
        }

        if (filters.purpose) {
            filtered = filtered.filter(item =>
                item.purpose?.toLowerCase().includes(filters.purpose.toLowerCase())
            );
        }

        if (filters.location) {
            filtered = filtered.filter(item =>
                item.propertyLocation?.toLowerCase().includes(filters.location.toLowerCase())
            );
        }

        if (filters.minPrice) {
            const minPrice = parseFloat(filters.minPrice);
            filtered = filtered.filter(item => {
                const price = parseFloat(item.price) || 0;
                return price >= minPrice;
            });
        }

        if (filters.maxPrice) {
            const maxPrice = parseFloat(filters.maxPrice);
            filtered = filtered.filter(item => {
                const price = parseFloat(item.price) || 0;
                return price <= maxPrice;
            });
        }

        return filtered;
    }, [filters]);

    // Count active filters
    useEffect(() => {
        const count = Object.values(filters).filter(value => value && value.toString().trim() !== '').length;
        setActiveFiltersCount(count);
    }, [filters]);

    // Apply filters when data or filters change
    useEffect(() => {
        const filtered = applyFilters(allProperties);
        setFilteredProperties(filtered);
    }, [allProperties, applyFilters]);

    // Load favorites from storage (API removed)
    const loadFavorites = useCallback(async () => {
        try {
            setFavorites([]);
            console.log('?? Favorites API removed - no data loaded');
        } catch (e) {
            console.warn('Failed to load favorites:', e);
        }
    }, []);

    // Enhanced data loading with better error handling and performance
    const loadAllData = useCallback(async (isRefresh = false) => {
        if (!isRefresh) setIsLoading(true);
        setError(null);

        try {
            let propertyData = [];

            // Load properties based on category
            if (category === 'Featured') {
                console.log('?? Loading Featured Properties...');
                const response = await getRecentFeaturedProperties(15);
                propertyData = response || [];
            } else if (category === 'All') {
                console.log('?? Loading All Properties...');
                const response = await getRecentFeaturedProperties(50);
                propertyData = response || [];
            } else if (category === 'Residential') {
                console.log('?? Loading Residential Properties...');
                const response = await getRecentFeaturedProperties(50);
                propertyData = (response || []).filter(item =>
                    item.propertyType?.toLowerCase().includes('residential') ||
                    item.propertyType?.toLowerCase().includes('house') ||
                    item.propertyType?.toLowerCase().includes('apartment') ||
                    item.propertyType?.toLowerCase().includes('villa')
                );
            } else if (category === 'Commercial') {
                console.log('?? Loading Commercial Properties...');
                const response = await getRecentFeaturedProperties(50);
                propertyData = (response || []).filter(item =>
                    item.propertyType?.toLowerCase().includes('commercial') ||
                    item.propertyType?.toLowerCase().includes('office') ||
                    item.propertyType?.toLowerCase().includes('shop')
                );
            } else if (category === 'Rent') {
                console.log('?? Loading Rental Properties...');
                const response = await getRecentFeaturedProperties(50);
                propertyData = (response || []).filter(item =>
                    item.purpose?.toLowerCase().includes('rent') ||
                    item.purpose?.toLowerCase().includes('lease')
                );
            } else {
                console.log('?? Unknown category:', category);
                propertyData = [];
            }

            // Enhanced search filtering
            if (searchQuery && searchQuery.trim()) {
                const queryLower = searchQuery.toLowerCase().trim();
                propertyData = propertyData.filter(item => {
                    const description = (item.description || '').toLowerCase();
                    const location = (item.propertyLocation || '').toLowerCase();
                    const type = (item.propertyType || '').toLowerCase();
                    const purpose = (item.purpose || '').toLowerCase();

                    return description.includes(queryLower) ||
                        location.includes(queryLower) ||
                        type.includes(queryLower) ||
                        purpose.includes(queryLower);
                });
            }

            setAllProperties(Array.isArray(propertyData) ? propertyData : []);

        } catch (e) {
            console.error("Error loading properties:", e);
            setError(e.message || "Failed to load properties. Please try again.");
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [category, searchQuery]);

    // Clear all filters
    const clearFilters = useCallback(() => {
        setFilters({
            propertyType: '',
            purpose: '',
            minPrice: '',
            maxPrice: '',
            location: '',
        });
        setShowFilterModal(false);
    }, []);

    // Apply filters and close modal
    const applyAndCloseFilters = useCallback(() => {
        setShowFilterModal(false);
    }, []);

    // Select predefined price range
    const selectPriceRange = useCallback((range) => {
        setFilters(prev => ({
            ...prev,
            minPrice: range.min,
            maxPrice: range.max
        }));
    }, []);

    // Initialize data and favorites
    useEffect(() => {
        Promise.all([
            loadAllData(),
            loadFavorites()
        ]);
    }, [loadAllData, loadFavorites]);

    // Enhanced refresh handler
    const onRefresh = useCallback(() => {
        setIsRefreshing(true);
        Promise.all([
            loadAllData(true),
            loadFavorites()
        ]);
    }, [loadAllData, loadFavorites]);

    // Enhanced favorite toggle with proper API integration
    const toggleFavorite = useCallback(async (propertyId) => {
        const isCurrentlySaved = favorites.includes(propertyId);

        // Optimistic update
        setFavorites(prev =>
            isCurrentlySaved
                ? prev.filter(id => id !== propertyId)
                : [...prev, propertyId]
        );

        try {
            // API calls removed - favorites functionality disabled
            console.log('?? Favorite toggle API removed');
        } catch (error) {
            // Revert on error
            setFavorites(prev =>
                isCurrentlySaved
                    ? [...prev, propertyId]
                    : prev.filter(id => id !== propertyId)
            );

            CrossPlatformAlert.alert(
                'Error',
                isCurrentlySaved
                    ? 'Failed to remove from favorites'
                    : 'Failed to add to favorites'
            );
        }
    }, [favorites]);

    // Enhanced property navigation
    const openProperty = useCallback(async (item) => {
        try {
            const pid = item?._id || item?.id || item?.propertyId;
            if (!pid) {
                navigation.navigate('PropertyDetailsScreen', { property: item });
                return;
            }

            const flag = await AsyncStorage.getItem(`inquirySubmitted:${pid}`);
            if (flag) {
                navigation.navigate('PropertyDetailsScreen', { property: item });
            } else {
                navigation.navigate('PropertyInquiryFormScreen', { property: item });
            }
        } catch (e) {
            navigation.navigate('PropertyInquiryFormScreen', { property: item });
        }
    }, [navigation]);

    // Helper function to get correct image URL based on property source
    const getPropertyImageUrl = useCallback((imageData, isPostedByAdmin) => {
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
    }, []);

    // Enhanced property card with modern design
    const renderPropertyCard = useCallback((item, index) => {
        const firstImage = getFirstImageUrl(item.photosAndVideo);
        const propertyImageUrl = getPropertyImageUrl(firstImage, item.isPostedByAdmin);
        const imageUrl = propertyImageUrl || 'https://placehold.co/300x200/CCCCCC/888888?text=No+Image';
        const isFavorite = favorites.includes(item._id);

        return (
            <TouchableOpacity
                key={item._id || index}
                style={styles.propertyCard}
                onPress={() => openProperty(item)}
                activeOpacity={0.9}
            >
                {/* Enhanced Image with Gradient Overlay */}
                <View style={styles.imageContainer}>
                    <Image
                        source={{ uri: imageUrl }}
                        style={styles.propertyImage}
                        resizeMode="cover"
                    />
                    <LinearGradient
                        colors={['transparent', theme.COLORS.overlay]}
                        style={styles.imageOverlay}
                    />
                </View>

                {/* Enhanced Info Container */}
                <View style={styles.infoContainer}>
                    {/* Favorite Button + Property Type Badge Row */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        {/* Modern Favorite Button */}
                        <TouchableOpacity
                            onPress={() => toggleFavorite(item._id)}
                            activeOpacity={0.8}
                        >
                            <Icon
                                name={isFavorite ? "heart" : "heart-outline"}
                                size={20}
                                color={isFavorite ? theme.COLORS.accent : theme.COLORS.greyMedium}
                            />
                        </TouchableOpacity>

                        {/* Property Type Badge */}
                        {item.propertyType && (
                            <View style={{ backgroundColor: theme.COLORS.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                                <Text style={{ color: theme.COLORS.white, fontSize: 12, fontWeight: '600' }}>
                                    {item.propertyType}
                                </Text>
                            </View>
                        )}
                    </View>

                    <Text style={styles.propertyTitle} numberOfLines={1}>
                        {item.description || item.propertyType || 'Property'}
                    </Text>

                    <View style={styles.locationRow}>
                        <Icon name="location-outline" size={14} color={theme.COLORS.greyMedium} />
                        <Text style={styles.propertyLocation} numberOfLines={1}>
                            {item.propertyLocation || 'Location not specified'}
                        </Text>
                    </View>

                    {/* Enhanced Details Row */}
                    {item.areaDetails && (
                        <View style={styles.detailsRow}>
                            <Icon name="resize-outline" size={12} color={theme.COLORS.greyMedium} />
                            <Text style={styles.areaText}>{item.areaDetails} sq ft</Text>
                        </View>
                    )}

                    <View style={styles.priceContainer}>
                        <Text style={styles.propertyPrice}>
                            {formatPrice(item.price)}
                            {(item.purpose === 'rent' || item.purpose === 'lease') && '/month'}
                        </Text>
                        {item.purpose && (
                            <Text style={styles.purposeText}>
                                for {item.purpose}
                            </Text>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    }, [favorites, openProperty, toggleFavorite]);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={theme.COLORS.white} />

            {/* Enhanced Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                    activeOpacity={0.7}
                >
                    <Icon name="chevron-back" size={24} color={theme.COLORS.black} />
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle} numberOfLines={1}>{screenTitle}</Text>
                    {searchQuery && (
                        <Text style={styles.headerSubtitle} numberOfLines={1}>
                            "{searchQuery}"
                        </Text>
                    )}
                </View>

                <View style={styles.headerRight}>
                    <TouchableOpacity
                        style={[styles.filterButton, activeFiltersCount > 0 && styles.filterButtonActive]}
                        activeOpacity={0.7}
                        onPress={() => setShowFilterModal(true)}
                    >
                        <Icon name="options-outline" size={20} color={activeFiltersCount > 0 ? theme.COLORS.white : theme.COLORS.greyDark} />
                        {activeFiltersCount > 0 && (
                            <View style={styles.filterBadge}>
                                <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Enhanced Loading State */}
            {isLoading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.COLORS.primary} />
                    <Text style={styles.loadingText}>Loading properties...</Text>
                </View>
            )}

            {/* Enhanced Error State */}
            {!isLoading && error && (
                <View style={styles.centerMessage}>
                    <Icon name="warning-outline" size={48} color={theme.COLORS.warning} />
                    <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity onPress={() => loadAllData()} style={styles.retryButton}>
                        <LinearGradient
                            colors={[theme.COLORS.primary, theme.COLORS.primaryDark]}
                            style={styles.retryGradient}
                        >
                            <Text style={styles.retryButtonText}>Try Again</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            )}

            {/* Enhanced Empty State */}
            {!isLoading && !error && filteredProperties.length === 0 && allProperties.length > 0 && (
                <View style={styles.centerMessage}>
                    <Icon name="funnel-outline" size={64} color={theme.COLORS.greyMedium} />
                    <Text style={styles.emptyTitle}>No Matching Properties</Text>
                    <Text style={styles.emptyText}>
                        Try adjusting your filters to see more results
                    </Text>
                    <TouchableOpacity
                        onPress={clearFilters}
                        style={styles.clearFiltersButton}
                    >
                        <Text style={styles.clearFiltersText}>Clear Filters</Text>
                    </TouchableOpacity>
                </View>
            )}

            {!isLoading && !error && allProperties.length === 0 && (
                <View style={styles.centerMessage}>
                    <Icon name="home-outline" size={64} color={theme.COLORS.greyMedium} />
                    <Text style={styles.emptyTitle}>No Properties Found</Text>
                    <Text style={styles.emptyText}>
                        {searchQuery
                            ? `No properties match your search for "${searchQuery}"`
                            : "No properties available at the moment"
                        }
                    </Text>
                    {searchQuery && (
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.backToHomeButton}
                        >
                            <Text style={styles.backToHomeText}>Back to Home</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Enhanced Properties Grid */}
            {!isLoading && !error && filteredProperties.length > 0 && (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={onRefresh}
                            tintColor={theme.COLORS.primary}
                            colors={[theme.COLORS.primary]}
                        />
                    }
                >
                    {/* Results Header */}
                    <View style={styles.resultsHeader}>
                        <Text style={styles.resultsCount}>
                            {filteredProperties.length} {filteredProperties.length === 1 ? 'Property' : 'Properties'} Found
                        </Text>
                        {category === 'Recent' && (
                            <Text style={styles.resultsSubtext}>
                                Including your recent posts
                            </Text>
                        )}
                        {activeFiltersCount > 0 && (
                            <View style={styles.activeFiltersRow}>
                                <Text style={styles.activeFiltersText}>
                                    {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''} applied
                                </Text>
                                <TouchableOpacity onPress={clearFilters}>
                                    <Text style={styles.clearFiltersLink}>Clear All</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {/* Properties Grid */}
                    <View style={styles.gridContainer}>
                        {filteredProperties.map((item, index) => renderPropertyCard(item, index))}
                    </View>

                    {/* Enhanced Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            Showing {filteredProperties.length} of {allProperties.length} results
                        </Text>
                        <Text style={styles.footerSubtext}>
                            Pull down to refresh
                        </Text>
                    </View>
                </ScrollView>
            )}

            {/* Filter Modal */}
            <Modal
                visible={showFilterModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowFilterModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Filter Properties</Text>
                            <TouchableOpacity
                                onPress={() => setShowFilterModal(false)}
                                style={styles.modalCloseButton}
                            >
                                <Icon name="close" size={24} color={theme.COLORS.greyDark} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                            {/* Property Type Filter */}
                            <View style={styles.filterSection}>
                                <Text style={styles.filterLabel}>Property Type</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterOptions}>
                                    {propertyTypes.map((type) => (
                                        <TouchableOpacity
                                            key={type}
                                            style={[
                                                styles.filterChip,
                                                filters.propertyType === type && styles.filterChipActive
                                            ]}
                                            onPress={() => setFilters(prev => ({
                                                ...prev,
                                                propertyType: prev.propertyType === type ? '' : type
                                            }))}
                                        >
                                            <Text style={[
                                                styles.filterChipText,
                                                filters.propertyType === type && styles.filterChipTextActive
                                            ]}>
                                                {type}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            {/* Purpose Filter */}
                            <View style={styles.filterSection}>
                                <Text style={styles.filterLabel}>Purpose</Text>
                                <View style={styles.filterRow}>
                                    {purposes.map((purpose) => (
                                        <TouchableOpacity
                                            key={purpose}
                                            style={[
                                                styles.filterChip,
                                                filters.purpose === purpose && styles.filterChipActive
                                            ]}
                                            onPress={() => setFilters(prev => ({
                                                ...prev,
                                                purpose: prev.purpose === purpose ? '' : purpose
                                            }))}
                                        >
                                            <Text style={[
                                                styles.filterChipText,
                                                filters.purpose === purpose && styles.filterChipTextActive
                                            ]}>
                                                {purpose}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Price Range Filter */}
                            <View style={styles.filterSection}>
                                <Text style={styles.filterLabel}>Price Range (?)</Text>

                                {/* Quick Price Range Selection */}
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterOptions}>
                                    {priceRanges.map((range, index) => {
                                        const isSelected = filters.minPrice === range.min && filters.maxPrice === range.max;
                                        return (
                                            <TouchableOpacity
                                                key={index}
                                                style={[
                                                    styles.filterChip,
                                                    isSelected && styles.filterChipActive
                                                ]}
                                                onPress={() => selectPriceRange(range)}
                                            >
                                                <Text style={[
                                                    styles.filterChipText,
                                                    isSelected && styles.filterChipTextActive
                                                ]}>
                                                    {range.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>

                                {/* Custom Price Range Inputs */}
                                <Text style={styles.customPriceLabel}>Or set custom range:</Text>
                                <View style={styles.priceInputContainer}>
                                    <View style={styles.priceInputWrapper}>
                                        <Text style={styles.priceInputLabel}>Min Price</Text>
                                        <TextInput
                                            style={styles.priceInput}
                                            placeholder="0"
                                            value={filters.minPrice}
                                            onChangeText={(text) => setFilters(prev => ({ ...prev, minPrice: text }))}
                                            keyboardType="numeric"
                                            placeholderTextColor={theme.COLORS.greyMedium}
                                        />
                                    </View>
                                    <Text style={styles.priceInputSeparator}>to</Text>
                                    <View style={styles.priceInputWrapper}>
                                        <Text style={styles.priceInputLabel}>Max Price</Text>
                                        <TextInput
                                            style={styles.priceInput}
                                            placeholder="Any"
                                            value={filters.maxPrice}
                                            onChangeText={(text) => setFilters(prev => ({ ...prev, maxPrice: text }))}
                                            keyboardType="numeric"
                                            placeholderTextColor={theme.COLORS.greyMedium}
                                        />
                                    </View>
                                </View>
                            </View>

                            {/* Location Filter */}
                            <View style={styles.filterSection}>
                                <Text style={styles.filterLabel}>Location</Text>
                                <TextInput
                                    style={styles.locationInput}
                                    placeholder="Enter location..."
                                    value={filters.location}
                                    onChangeText={(text) => setFilters(prev => ({ ...prev, location: text }))}
                                    placeholderTextColor={theme.COLORS.greyMedium}
                                />
                            </View>
                        </ScrollView>

                        {/* Modal Footer */}
                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.clearButton}
                                onPress={clearFilters}
                            >
                                <Text style={styles.clearButtonText}>Clear All</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.applyButton}
                                onPress={applyAndCloseFilters}
                            >
                                <LinearGradient
                                    colors={[theme.COLORS.primary, theme.COLORS.primaryDark]}
                                    style={styles.applyGradient}
                                >
                                    <Text style={styles.applyButtonText}>Apply Filters</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

// --- Enhanced Modern Styles ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.COLORS.background,
    },

    // Enhanced Header Styles
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.SPACING.l,
        paddingVertical: theme.SPACING.m,
        backgroundColor: theme.COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: theme.COLORS.greyLight,
        elevation: 2,
        shadowColor: theme.COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    backButton: {
        padding: theme.SPACING.s,
        borderRadius: theme.RADIUS.full,
        backgroundColor: theme.COLORS.greyLight,
    },
    headerCenter: {
        flex: 1,
        marginHorizontal: theme.SPACING.m,
    },
    headerTitle: {
        fontSize: theme.FONT_SIZES.title,
        fontWeight: theme.FONT_WEIGHTS.bold,
        color: theme.COLORS.black,
        textAlign: 'center',
    },
    headerSubtitle: {
        fontSize: theme.FONT_SIZES.body,
        color: theme.COLORS.greyMedium,
        textAlign: 'center',
        marginTop: theme.SPACING.xs,
        fontStyle: 'italic',
    },
    headerRight: {
        width: 40,
        alignItems: 'flex-end',
    },
    filterButton: {
        padding: theme.SPACING.s,
        borderRadius: theme.RADIUS.s,
        backgroundColor: theme.COLORS.greyLight,
        position: 'relative',
    },
    filterButtonActive: {
        backgroundColor: theme.COLORS.primary,
    },
    filterBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: theme.COLORS.accent,
        borderRadius: theme.RADIUS.full,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    filterBadgeText: {
        color: theme.COLORS.white,
        fontSize: 10,
        fontWeight: theme.FONT_WEIGHTS.bold,
    },

    // Loading States
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: theme.SPACING.l,
    },
    loadingText: {
        marginTop: theme.SPACING.m,
        fontSize: theme.FONT_SIZES.body,
        color: theme.COLORS.greyMedium,
        fontWeight: theme.FONT_WEIGHTS.medium,
    },

    // Message States
    centerMessage: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: theme.SPACING.xxl,
    },
    errorTitle: {
        fontSize: theme.FONT_SIZES.heading,
        fontWeight: theme.FONT_WEIGHTS.bold,
        color: theme.COLORS.black,
        marginTop: theme.SPACING.m,
        marginBottom: theme.SPACING.s,
        textAlign: 'center',
    },
    errorText: {
        fontSize: theme.FONT_SIZES.body,
        color: theme.COLORS.greyMedium,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: theme.SPACING.l,
    },
    emptyTitle: {
        fontSize: theme.FONT_SIZES.heading,
        fontWeight: theme.FONT_WEIGHTS.bold,
        color: theme.COLORS.black,
        marginTop: theme.SPACING.m,
        marginBottom: theme.SPACING.s,
    },
    emptyText: {
        fontSize: theme.FONT_SIZES.body,
        color: theme.COLORS.greyMedium,
        textAlign: 'center',
        lineHeight: 22,
    },

    // Button Styles
    retryButton: {
        borderRadius: theme.RADIUS.m,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: theme.COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    retryGradient: {
        paddingHorizontal: theme.SPACING.xl,
        paddingVertical: theme.SPACING.m,
    },
    retryButtonText: {
        color: theme.COLORS.white,
        fontWeight: theme.FONT_WEIGHTS.bold,
        fontSize: theme.FONT_SIZES.body,
        textAlign: 'center',
    },
    backToHomeButton: {
        marginTop: theme.SPACING.l,
        paddingHorizontal: theme.SPACING.l,
        paddingVertical: theme.SPACING.s,
        borderRadius: theme.RADIUS.s,
        borderWidth: 1,
        borderColor: theme.COLORS.primary,
    },
    backToHomeText: {
        color: theme.COLORS.primary,
        fontWeight: theme.FONT_WEIGHTS.medium,
        fontSize: theme.FONT_SIZES.body,
    },
    clearFiltersButton: {
        marginTop: theme.SPACING.l,
        paddingHorizontal: theme.SPACING.l,
        paddingVertical: theme.SPACING.s,
        borderRadius: theme.RADIUS.s,
        borderWidth: 1,
        borderColor: theme.COLORS.primary,
    },
    clearFiltersText: {
        color: theme.COLORS.primary,
        fontWeight: theme.FONT_WEIGHTS.medium,
        fontSize: theme.FONT_SIZES.body,
    },

    // Scroll View Styles
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: theme.SPACING.xxl,
    },

    // Results Header
    resultsHeader: {
        paddingHorizontal: theme.SPACING.l,
        paddingVertical: theme.SPACING.m,
        backgroundColor: theme.COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: theme.COLORS.greyLight,
    },
    resultsCount: {
        fontSize: theme.FONT_SIZES.heading,
        fontWeight: theme.FONT_WEIGHTS.bold,
        color: theme.COLORS.black,
    },
    resultsSubtext: {
        fontSize: theme.FONT_SIZES.small,
        color: theme.COLORS.greyMedium,
        marginTop: theme.SPACING.xs,
    },
    activeFiltersRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: theme.SPACING.s,
        paddingTop: theme.SPACING.s,
        borderTopWidth: 1,
        borderTopColor: theme.COLORS.greyLight,
    },
    activeFiltersText: {
        fontSize: theme.FONT_SIZES.small,
        color: theme.COLORS.greyMedium,
        fontWeight: theme.FONT_WEIGHTS.medium,
    },
    clearFiltersLink: {
        fontSize: theme.FONT_SIZES.small,
        color: theme.COLORS.primary,
        fontWeight: theme.FONT_WEIGHTS.medium,
    },

    // Grid Container
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: HORIZONTAL_MARGIN,
        paddingTop: theme.SPACING.l,
    },

    // Enhanced Property Card
    propertyCard: {
        width: CARD_WIDTH,
        marginBottom: theme.SPACING.l,
        backgroundColor: theme.COLORS.white,
        borderRadius: theme.RADIUS.l,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: theme.COLORS.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },

    // Image Container
    imageContainer: {
        position: 'relative',
        height: 140,
    },
    propertyImage: {
        width: '100%',
        height: '100%',
        backgroundColor: theme.COLORS.greyLight,
    },
    imageOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '50%',
    },

    // Enhanced Favorite Button
    favoriteIconContainer: {
        position: 'absolute',
        top: theme.SPACING.s,
        right: theme.SPACING.s,
        borderRadius: theme.RADIUS.full,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: theme.COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    favoriteGradient: {
        padding: theme.SPACING.s,
        borderRadius: theme.RADIUS.full,
    },

    // Property Type Badge
    propertyTypeBadge: {
        position: 'absolute',
        top: theme.SPACING.s,
        left: theme.SPACING.s,
        backgroundColor: theme.COLORS.primary,
        paddingHorizontal: theme.SPACING.s,
        paddingVertical: theme.SPACING.xs,
        borderRadius: theme.RADIUS.s,
    },
    propertyTypeText: {
        color: theme.COLORS.white,
        fontSize: theme.FONT_SIZES.caption,
        fontWeight: theme.FONT_WEIGHTS.medium,
    },

    // Enhanced Info Container
    infoContainer: {
        padding: theme.SPACING.m,
    },
    propertyTitle: {
        fontSize: theme.FONT_SIZES.subheading,
        fontWeight: theme.FONT_WEIGHTS.bold,
        color: theme.COLORS.black,
        marginBottom: theme.SPACING.xs,
        lineHeight: 20,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.SPACING.s,
    },
    propertyLocation: {
        fontSize: theme.FONT_SIZES.small,
        color: theme.COLORS.greyMedium,
        marginLeft: theme.SPACING.xs,
        flex: 1,
        lineHeight: 16,
    },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.SPACING.s,
    },
    areaText: {
        fontSize: theme.FONT_SIZES.small,
        color: theme.COLORS.greyMedium,
        marginLeft: theme.SPACING.xs,
    },

    // Enhanced Price Row
    priceRatingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    priceContainer: {
        flex: 1,
    },
    propertyPrice: {
        fontSize: theme.FONT_SIZES.subheading,
        fontWeight: theme.FONT_WEIGHTS.bold,
        color: theme.COLORS.primary,
    },
    purposeText: {
        fontSize: theme.FONT_SIZES.caption,
        color: theme.COLORS.greyMedium,
        marginTop: theme.SPACING.xs / 2,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.COLORS.greyLight,
        paddingHorizontal: theme.SPACING.s,
        paddingVertical: theme.SPACING.xs,
        borderRadius: theme.RADIUS.s,
    },
    ratingText: {
        fontSize: theme.FONT_SIZES.small,
        fontWeight: theme.FONT_WEIGHTS.medium,
        color: theme.COLORS.greyDark,
        marginLeft: theme.SPACING.xs / 2,
    },

    // Footer
    footer: {
        paddingHorizontal: theme.SPACING.l,
        paddingVertical: theme.SPACING.xl,
        alignItems: 'center',
    },
    footerText: {
        fontSize: theme.FONT_SIZES.body,
        fontWeight: theme.FONT_WEIGHTS.medium,
        color: theme.COLORS.greyMedium,
        textAlign: 'center',
    },
    footerSubtext: {
        fontSize: theme.FONT_SIZES.small,
        color: theme.COLORS.greyMedium,
        textAlign: 'center',
        marginTop: theme.SPACING.xs,
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: theme.COLORS.white,
        borderTopLeftRadius: theme.RADIUS.xl,
        borderTopRightRadius: theme.RADIUS.xl,
        maxHeight: height * 0.8,
        minHeight: height * 0.6,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.SPACING.l,
        paddingVertical: theme.SPACING.l,
        borderBottomWidth: 1,
        borderBottomColor: theme.COLORS.greyLight,
    },
    modalTitle: {
        fontSize: theme.FONT_SIZES.title,
        fontWeight: theme.FONT_WEIGHTS.bold,
        color: theme.COLORS.black,
    },
    modalCloseButton: {
        padding: theme.SPACING.s,
        borderRadius: theme.RADIUS.full,
        backgroundColor: theme.COLORS.greyLight,
    },
    modalContent: {
        flex: 1,
        paddingHorizontal: theme.SPACING.l,
    },

    // Filter Section Styles
    filterSection: {
        marginVertical: theme.SPACING.l,
    },
    filterLabel: {
        fontSize: theme.FONT_SIZES.subheading,
        fontWeight: theme.FONT_WEIGHTS.semibold,
        color: theme.COLORS.black,
        marginBottom: theme.SPACING.m,
    },
    filterOptions: {
        marginVertical: theme.SPACING.s,
    },
    filterRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.SPACING.s,
    },
    filterChip: {
        paddingHorizontal: theme.SPACING.m,
        paddingVertical: theme.SPACING.s,
        borderRadius: theme.RADIUS.l,
        backgroundColor: theme.COLORS.greyLight,
        marginRight: theme.SPACING.s,
        marginBottom: theme.SPACING.s,
    },
    filterChipActive: {
        backgroundColor: theme.COLORS.primary,
    },
    filterChipText: {
        fontSize: theme.FONT_SIZES.body,
        fontWeight: theme.FONT_WEIGHTS.medium,
        color: theme.COLORS.greyDark,
    },
    filterChipTextActive: {
        color: theme.COLORS.white,
    },

    // Custom Price Label
    customPriceLabel: {
        fontSize: theme.FONT_SIZES.small,
        fontWeight: theme.FONT_WEIGHTS.medium,
        color: theme.COLORS.greyMedium,
        marginTop: theme.SPACING.m,
        marginBottom: theme.SPACING.s,
    },

    // Price Input Styles
    priceInputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: theme.SPACING.m,
    },
    priceInputWrapper: {
        flex: 1,
    },
    priceInputLabel: {
        fontSize: theme.FONT_SIZES.small,
        fontWeight: theme.FONT_WEIGHTS.medium,
        color: theme.COLORS.greyMedium,
        marginBottom: theme.SPACING.xs,
    },
    priceInput: {
        borderWidth: 1,
        borderColor: theme.COLORS.greyLight,
        borderRadius: theme.RADIUS.s,
        paddingHorizontal: theme.SPACING.m,
        paddingVertical: theme.SPACING.s,
        fontSize: theme.FONT_SIZES.body,
        color: theme.COLORS.black,
        backgroundColor: theme.COLORS.white,
    },
    priceInputSeparator: {
        fontSize: theme.FONT_SIZES.body,
        color: theme.COLORS.greyMedium,
        fontWeight: theme.FONT_WEIGHTS.medium,
        marginBottom: theme.SPACING.s,
    },

    // Location Input Styles
    locationInput: {
        borderWidth: 1,
        borderColor: theme.COLORS.greyLight,
        borderRadius: theme.RADIUS.s,
        paddingHorizontal: theme.SPACING.m,
        paddingVertical: theme.SPACING.m,
        fontSize: theme.FONT_SIZES.body,
        color: theme.COLORS.black,
        backgroundColor: theme.COLORS.white,
    },

    // Modal Footer Styles
    modalFooter: {
        flexDirection: 'row',
        paddingHorizontal: theme.SPACING.l,
        paddingVertical: theme.SPACING.l,
        borderTopWidth: 1,
        borderTopColor: theme.COLORS.greyLight,
        gap: theme.SPACING.m,
    },
    clearButton: {
        flex: 1,
        paddingVertical: theme.SPACING.m,
        borderRadius: theme.RADIUS.m,
        borderWidth: 1,
        borderColor: theme.COLORS.greyMedium,
        alignItems: 'center',
    },
    clearButtonText: {
        fontSize: theme.FONT_SIZES.body,
        fontWeight: theme.FONT_WEIGHTS.medium,
        color: theme.COLORS.greyMedium,
    },
    applyButton: {
        flex: 2,
        borderRadius: theme.RADIUS.m,
        overflow: 'hidden',
    },
    applyGradient: {
        paddingVertical: theme.SPACING.m,
        alignItems: 'center',
    },
    applyButtonText: {
        fontSize: theme.FONT_SIZES.body,
        fontWeight: theme.FONT_WEIGHTS.bold,
        color: theme.COLORS.white,
    },
});

export default AllPropertiesScreen;