import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    SafeAreaView,
    Platform,
    StatusBar,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

// --- Mock Data ---
const MOCK_UPCOMING_BOOKINGS = [
    {
        id: "U1",
        service: "Furnished Apartment Cleaning",
        date: "Sat, Nov 10",
        time: "10:00 AM - 1:00 PM",
        status: "Confirmed",
        price: "₹4,409",
        vendor: "ProClean Solutions",
    },
    {
        id: "U2",
        service: "Plumbing Fix (Faucet Leak)",
        date: "Wed, Nov 14",
        time: "4:00 PM - 5:30 PM",
        status: "Pending",
        price: "₹1,250",
        vendor: "Local Plumbers Co.",
    },
];

const MOCK_PAST_BOOKINGS = [
    {
        id: "P1",
        service: "Bathroom Deep Cleaning",
        date: "Fri, Oct 20",
        time: "9:00 AM - 12:00 PM",
        status: "Completed",
        price: "₹2,500",
        vendor: "Sparkle & Shine",
    },
    {
        id: "P2",
        service: "House Painting (Exterior)",
        date: "Mon, Sep 01",
        time: "9:00 AM - 5:00 PM",
        status: "Completed",
        price: "₹15,000",
        vendor: "Color Masters Inc.",
    },
];

// ----------------------------------------------------------------------
// --- COMPONENTS ---
// ----------------------------------------------------------------------

/**
 * Renders a single booking card.
 */
const BookingCard = ({ booking, onPress }) => {
    const isUpcoming = booking.status === "Confirmed" || booking.status === "Pending";
    let statusColor = "#9CA3AF";
    if (booking.status === "Confirmed") statusColor = "#FF7A00";
    if (booking.status === "Pending") statusColor = "#F59E0B";
    if (booking.status === "Completed") statusColor = "#10B981";

    return (
        <TouchableOpacity style={styles.bookingCard} onPress={() => onPress(booking)}>
            <View style={styles.cardHeader}>
                <Text style={styles.serviceTitle} numberOfLines={2}>
                    {booking.service}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                    <Text style={styles.statusText}>{booking.status}</Text>
                </View>
            </View>

            <View style={styles.detailRow}>
                <Icon name="calendar-outline" size={16} color="#6B7280" style={styles.detailIcon} />
                <Text style={styles.detailLabel}>Date:</Text>
                <Text style={styles.detailValue}>{booking.date}</Text>
            </View>
            <View style={styles.detailRow}>
                <Icon name="time-outline" size={16} color="#6B7280" style={styles.detailIcon} />
                <Text style={styles.detailLabel}>Time:</Text>
                <Text style={styles.detailValue}>{booking.time}</Text>
            </View>
            <View style={styles.detailRow}>
                <Icon name="business-outline" size={16} color="#6B7280" style={styles.detailIcon} />
                <Text style={styles.detailLabel}>Vendor:</Text>
                <Text style={styles.detailValue}>{booking.vendor}</Text>
            </View>

            <View style={styles.cardFooter}>
                <Text style={styles.priceText}>{booking.price}</Text>
                {isUpcoming ? (
                    <TouchableOpacity style={styles.actionButton}>
                        <Text style={styles.actionButtonText}>Manage Booking</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.rebookButton}>
                        <Icon name="refresh-outline" size={14} color="#FF7A00" style={{ marginRight: 4 }} />
                        <Text style={styles.rebookButtonText}>Rebook</Text>
                    </TouchableOpacity>
                )}
            </View>
        </TouchableOpacity>
    );
};

// ----------------------------------------------------------------------
// --- MAIN SCREEN COMPONENT ---
// ----------------------------------------------------------------------

const MyBookingsScreen = ({ navigation }) => {
    // State to toggle between Upcoming and Past
    const [activeTab, setActiveTab] = useState("upcoming");

    const data = activeTab === "upcoming" ? MOCK_UPCOMING_BOOKINGS : MOCK_PAST_BOOKINGS;

    const handleBookingPress = (booking) => {
        alert(`Viewing details for Booking ID: ${booking.id}`);
        // navigation.navigate('BookingDetails', { bookingId: booking.id });
    };

    const renderEmptyComponent = () => (
        <View style={styles.emptyContainer}>
            <Icon name="reader-outline" size={60} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No {activeTab} bookings found.</Text>
            {activeTab === 'upcoming' && (
                <Text style={styles.emptySubtitle}>Start by exploring our professional services.</Text>
            )}
            <TouchableOpacity style={styles.startBookingButton}>
                <Text style={styles.startBookingText}>Book a Service</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity 
                    onPress={() => navigation.goBack()} 
                    style={styles.backButton}
                >
                    <Icon name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.screenTitle}>My Bookings</Text>
            </View>

            {/* Segmented Control (Tabs) */}
            <View style={styles.segmentContainer}>
                <TouchableOpacity
                    style={[
                        styles.segmentButton,
                        activeTab === "upcoming" && styles.segmentActive,
                    ]}
                    onPress={() => setActiveTab("upcoming")}
                >
                    <Text
                        style={[
                            styles.segmentText,
                            activeTab === "upcoming" && styles.segmentTextActive,
                        ]}
                    >
                        Upcoming
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.segmentButton,
                        activeTab === "past" && styles.segmentActive,
                    ]}
                    onPress={() => setActiveTab("past")}
                >
                    <Text
                        style={[
                            styles.segmentText,
                            activeTab === "past" && styles.segmentTextActive,
                        ]}
                    >
                        Past
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Bookings List */}
            <FlatList
                data={data}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <BookingCard booking={item} onPress={handleBookingPress} />
                )}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={renderEmptyComponent}
            />
        </SafeAreaView>
    );
};

// ----------------------------------------------------------------------
// --- STYLES ---
// ----------------------------------------------------------------------

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    
    // --- Header Styles ---
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    screenTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1F2937",
    },

    // --- Segmented Control Styles ---
    segmentContainer: {
        flexDirection: "row",
        marginHorizontal: 16,
        marginTop: 16,
        backgroundColor: "#E5E7EB",
        borderRadius: 12,
        padding: 4,
    },
    segmentButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: "center",
    },
    segmentActive: {
        backgroundColor: "#fff",
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.08,
                shadowRadius: 2,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    segmentText: {
        fontSize: 15,
        fontWeight: "600",
        color: "#6B7280",
    },
    segmentTextActive: {
        color: "#1F2937",
        fontWeight: "700",
    },

    // --- List and Card Styles ---
    listContainer: {
        paddingTop: 16,
        paddingHorizontal: 16,
    },
    bookingCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 12,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    serviceTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
        marginRight: 10,
    },
    statusBadge: {
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
        alignSelf: 'center',
    },
    statusText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#fff",
        textTransform: 'uppercase',
    },
    detailRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    detailIcon: {
        marginRight: 8,
    },
    detailLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#4B5563",
        width: 60, // Fixed width for alignment
    },
    detailValue: {
        fontSize: 14,
        color: "#1F2937",
        flex: 1,
    },
    cardFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
    },
    priceText: {
        fontSize: 20,
        fontWeight: "700",
        color: "#10B981",
    },
    actionButton: {
        backgroundColor: "#FF7A00",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 10,
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#fff",
    },
    rebookButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#FF7A00',
    },
    rebookButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FF7A00',
    },

    // --- Empty State Styles ---
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 80,
        paddingHorizontal: 30,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#6B7280',
        marginTop: 15,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
        marginBottom: 20,
    },
    startBookingButton: {
        backgroundColor: '#FF7A00',
        paddingHorizontal: 25,
        paddingVertical: 12,
        borderRadius: 12,
    },
    startBookingText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    }
});

export default MyBookingsScreen;