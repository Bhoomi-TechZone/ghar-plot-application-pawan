import React, { useState } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    SafeAreaView, 
    FlatList, 
    TouchableOpacity, 
    Image, 
    Platform,
    StatusBar
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

// --- MOCK DATA: Comprehensive List including Location/Category Logic ---
const MOCK_CATEGORY_SERVICES = [
    // PLUMBING Services (applies to Apartment, Villa/Bungalow, Office)
    {
        id: "101",
        category: "Plumbing",
        locationTypes: ['apartment', 'villa', 'office'],
        title: "Drain Cleaning & Repair",
        image: require("../assets/plumber.png"), 
        type: "Standard",
        price: "₹999",
        vipPrice: "₹850",
        rating: 4.7,
        reviews: 980,
        details: ["Unclog sinks and tubs", "Hydro-jetting option available", "90-day service guarantee"],
        vendor: "HydroFix Plumbers",
    },
    {
        id: "102",
        category: "Plumbing",
        locationTypes: ['apartment', 'villa', 'office', 'pg'],
        title: "New Faucet/Fixture Installation",
        image: require("../assets/onboard2.webp"), 
        type: "Premium",
        price: "₹1,500",
        vipPrice: "₹1,350",
        rating: 4.9,
        reviews: 245,
        details: ["Installation of customer-supplied fixtures", "Pressure check included", "2-year installation warranty"],
        vendor: "Local Plumbers Co.",
    },
    
    // CLEANING Services for APARTMENT/VILLA/PG
    {
        id: "201",
        category: "Cleaning",
        locationTypes: ['apartment', 'villa', 'pg'],
        title: "Home Deep Cleaning Package (Full House)",
        image: require("../assets/cloth_cln.png"), 
        type: "Essential",
        price: "₹2,500",
        vipPrice: "₹2,200",
        rating: 4.8,
        reviews: 1500,
        details: ["Floor scrubbing", "Cabinet exterior cleaning", "Appliance wipe down"],
        vendor: "Sparkle Clean Services",
    },

    // CLEANING Services for OFFICE (Based on your detailed requirements)
    {
        id: "202",
        category: "Cleaning",
        locationTypes: ['office'],
        title: "Routine Office Maintenance (Daily/Weekly)",
        image: require("../assets/cleaning.png"), 
        type: "Basic",
        price: "Contact for Quote",
        vipPrice: "Contact for Quote",
        rating: 4.9,
        reviews: 320,
        details: ["Empty trash, vacuum/mop floors", "Restroom sanitation", "High-touch surface wiping"],
        vendor: "Corporate Cleaners Inc.",
    },
    {
        id: "203",
        category: "Cleaning",
        locationTypes: ['office'],
        title: "Quarterly Office Deep Cleaning",
        image: require("../assets/onboard1.webp"), 
        type: "Deep",
        price: "₹8,500",
        vipPrice: "₹7,900",
        rating: 4.7,
        reviews: 95,
        details: ["Carpet/Upholstery shampoo", "Appliance deep clean", "Behind furniture vacuuming"],
        vendor: "Pro-Brite Commercial",
    },
    {
        id: "204",
        category: "Cleaning",
        locationTypes: ['office'],
        title: "Office Disinfection & Sanitization",
        image: require("../assets/cloth_cln.png"), 
        type: "Disinfection",
        price: "₹3,500",
        vipPrice: "₹3,200",
        rating: 4.8,
        reviews: 120,
        details: ["Hospital-grade disinfectants", "Full office fogging", "Air quality check"],
        vendor: "Health First Services",
    },

    // PEST CONTROL Services 
    {
        id: "301",
        category: "Pest Control",
        locationTypes: ['apartment', 'villa', 'pg'],
        title: "General Pest Extermination",
        image: require("../assets/pest_control.png"), 
        type: "Safety",
        price: "₹1,800",
        vipPrice: "₹1,650",
        rating: 4.6,
        reviews: 670,
        details: ["Cockroach and spider treatment", "One follow-up visit included", "Child-safe chemicals"],
        vendor: "Pest Busters India",
    },
    
    // REPAIRS Services 
    {
        id: "401",
        category: "Repairs",
        locationTypes: ['apartment', 'villa', 'office', 'pg'],
        title: "AC Gas Filling & Service",
        image: require("../assets/repair_tool.png"), 
        type: "Essential",
        price: "₹1,200",
        vipPrice: "₹1,000",
        rating: 4.7,
        reviews: 400,
        details: ["Gas level check and refill", "Outer unit cleaning", "5-point health check"],
        vendor: "CoolFix Services",
    },
];

// --- HELPER FUNCTION: Maps location ID to display name ---
const getLocationDisplayName = (locationId) => {
    switch (locationId) {
        case 'office':
            return 'Office';
        case 'apartment':
            return 'Apartment';
        case 'pg':
            return 'PG / Hostel';
        case 'villa':
            return 'Villa / Bungalow';
        default:
            return 'General Location';
    }
};

// --- SERVICE CARD COMPONENT ---
const CategoryServiceCard = ({ item, onCardPress }) => {
    const [pressed, setPressed] = useState(false);
    
    return (
        <TouchableOpacity 
            style={[styles.serviceCard, pressed && styles.serviceCardPressed]}
            activeOpacity={0.98}
            onPressIn={() => setPressed(true)}
            onPressOut={() => setPressed(false)}
            onPress={() => onCardPress(item)}
        >
            <View style={styles.cardContent}>
                <View style={styles.imageWrapper}>
                    <Image source={item.image} style={styles.serviceImage} />
                    <View style={styles.typeBadge}>
                        <Text style={styles.typeBadgeText}>{item.type}</Text>
                    </View>
                </View>
                
                <View style={styles.contentSection}>
                    <View style={styles.titleRow}>
                        <Text style={styles.serviceTitle} numberOfLines={2}>{item.title}</Text>
                        <View style={styles.ratingBadge}>
                             <Icon name="star" size={12} color="#FFB800" />
                             <Text style={styles.ratingBadgeText}>{item.rating}</Text>
                        </View>
                    </View>
                    <Text style={styles.reviewCount}>{item.reviews} reviews</Text>

                    <View style={styles.detailsList}>
                        {item.details.slice(0, 2).map((detail, i) => (
                            <View key={i} style={styles.detailItem}>
                                <Icon name="checkmark-circle" size={14} color="#10B981" />
                                <Text style={styles.detailText} numberOfLines={1}>{detail}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.vendorRow}>
                        <Icon name="business-outline" size={14} color="#6B7280" />
                        <Text style={styles.vendorText}>{item.vendor}</Text>
                    </View>

                    <View style={styles.footer}>
                        <View style={styles.priceSection}>
                            <Text style={styles.price}>{item.price}</Text>
                            <View style={styles.vipPriceTag}>
                                <Icon name="diamond" size={10} color="#F59E0B" />
                                <Text style={styles.vipPrice}>VIP {item.vipPrice}</Text>
                            </View>
                        </View>
                        
                        <TouchableOpacity 
                            style={styles.viewButton} 
                            onPress={() => onCardPress(item)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.viewButtonText}>View Details</Text>
                            <Icon name="arrow-forward" size={16} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
};

// --- EMPTY LIST COMPONENT ---
const EmptyList = ({ categoryTitle, locationName }) => (
    <View style={styles.emptyContainer}>
        <Icon name="sad-outline" size={60} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>No services found</Text>
        <Text style={styles.emptySubtitle}>
            We currently don't have any **{categoryTitle}** services listed for **{locationName}**.
        </Text>
        <TouchableOpacity style={styles.notifyButton}>
            <Text style={styles.notifyButtonText}>Notify Me When Available</Text>
        </TouchableOpacity>
    </View>
);


// ----------------------------------------------------------------------
// --- MAIN SCREEN COMPONENT ---
// ----------------------------------------------------------------------

const CategoryServicesScreen = ({ navigation, route }) => {
    // Extract parameters from the route
    const { categoryTitle, locationType } = route.params || {};

    const locationName = getLocationDisplayName(locationType);
    
    // FILTERING LOGIC: Filter by Category AND selected Location Type
    const filteredServices = MOCK_CATEGORY_SERVICES.filter(service => 
        service.category === categoryTitle && 
        service.locationTypes.includes(locationType)
    );

    const handleServiceCardPress = (service) => {
        // Navigate to a Service Details screen
        navigation.navigate("ServiceDetailsScreen", { 
            serviceId: service.id, 
            serviceTitle: service.title,
            locationType: locationType 
        });
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.screenTitle} numberOfLines={1}>{categoryTitle || "Category Services"}</Text>
                    {/* Display Selected Location */}
                    <View style={styles.locationContainer}>
                        <Icon name="pin" size={14} color="#FF7A00" />
                        <Text style={styles.screenSubtitle}>
                            Location: {locationName}
                        </Text>
                    </View>
                </View>
            </View>
            
            <FlatList
                data={filteredServices} 
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <CategoryServiceCard 
                        item={item} 
                        onCardPress={handleServiceCardPress} 
                    />
                )}
                contentContainerStyle={styles.listContainer}
                ListHeaderComponent={() => (
                    <View style={styles.headerInfo}>
                        <Text style={styles.resultCount}>
                            {filteredServices.length} Professional Services Found
                        </Text>
                    </View>
                )}
                ListEmptyComponent={() => (
                    <EmptyList 
                        categoryTitle={categoryTitle}
                        locationName={locationName}
                    />
                )}
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
};

// --- STYLES ---
const styles = StyleSheet.create({
    safeArea: { 
        flex: 1, 
        backgroundColor: '#F9FAFB' 
    },

    // Header
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: "#fff",
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
    },
    headerContent: {
        flex: 1,
        marginLeft: 12,
    },
    screenTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1F2937",
        letterSpacing: -0.3,
    },
    // Location Display Styles
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    screenSubtitle: {
        fontSize: 13,
        color: "#6B7280",
        marginLeft: 4,
    },

    // List
    listContainer: { 
        padding: 16,
        paddingTop: 8,
    },
    headerInfo: {
        marginBottom: 16,
    },
    resultCount: {
        fontSize: 15,
        fontWeight: "600",
        color: "#1F2937",
    },
    
    // Service Card
    serviceCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        marginBottom: 16,
        overflow: "hidden",
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    serviceCardPressed: {
        transform: [{ scale: 0.98 }],
    },
    cardContent: {
        flexDirection: "row",
    },
    imageWrapper: {
        width: 140,
        height: 200, 
        position: "relative",
    },
    serviceImage: {
        width: "100%",
        height: "100%",
        resizeMode: "cover",
        borderTopLeftRadius: 16,
        borderBottomLeftRadius: 16,
    },
    typeBadge: {
        position: "absolute",
        top: 10,
        left: 10,
        backgroundColor: "rgba(59, 130, 246, 0.95)",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    typeBadgeText: {
        fontSize: 10,
        fontWeight: "700",
        color: "#fff",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    ratingBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 2,
    },
    ratingBadgeText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#1F2937",
        marginLeft: 4,
    },
    contentSection: {
        flex: 1,
        padding: 12,
        justifyContent: 'space-between' 
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    serviceTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1F2937",
        flex: 1,
        marginRight: 8,
    },
    reviewCount: {
        fontSize: 12,
        color: "#6B7280",
        fontWeight: "500",
        marginBottom: 8,
    },
    detailsList: {
        marginBottom: 8,
    },
    detailItem: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 6,
    },
    detailText: {
        fontSize: 12,
        color: "#4B5563",
        marginLeft: 6,
        flex: 1,
        lineHeight: 16,
    },
    vendorRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
    },
    vendorText: {
        fontSize: 12,
        color: "#6B7280",
        fontWeight: "500",
        marginLeft: 6,
    },
    footer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 8,
    },
    priceSection: {
        flex: 1,
    },
    price: {
        fontSize: 20,
        fontWeight: "800",
        color: "#1F2937",
        marginBottom: 4,
    },
    vipPriceTag: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FEF3C7",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        alignSelf: "flex-start",
    },
    vipPrice: {
        fontSize: 11,
        fontWeight: "700",
        color: "#F59E0B",
        marginLeft: 4,
    },
    viewButton: {
        flexDirection: "row",
        alignItems: "center",
    backgroundColor: "#FF7A00", 
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        ...Platform.select({
            ios: {
                shadowColor: "#FF7A00",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 6,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    viewButtonText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#fff",
        marginRight: 4,
    },

    // Empty List Styles
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
        marginTop: 40,
        backgroundColor: '#fff',
        borderRadius: 16,
        minHeight: 300,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20,
    },
    notifyButton: {
    backgroundColor: '#FF7A00',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 10,
    },
    notifyButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
});

export default CategoryServicesScreen;