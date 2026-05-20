import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const { width } = Dimensions.get('window');

// --- MOCK DATA (Should be passed via navigation params in a real app) ---
const MOCK_BOOKING_DETAILS = {
  serviceSummary: "Furnished Apt. Cleaning - 2BHK + Refrigerator Deep Clean",
  total: 5999,
  date: "Wednesday, May 22, 2025",
  timeSlot: "4:00 PM - 7:00 PM",
  address: "Flat 405, ABC Apartments, Sector 18, Gurugram",
  bookingId: "HQ-987654321",
};

// --- MAIN SCREEN COMPONENT ---
const BookingConfirmedScreen = ({ navigation, route }) => {
  // In a real app, you would use:
  // const bookingDetails = route.params?.bookingDetails || MOCK_BOOKING_DETAILS;
  const bookingDetails = MOCK_BOOKING_DETAILS; 

  const handleViewBookings = () => {
    // Navigate to a dedicated 'My Bookings' or 'History' screen
    // alert("Navigating to My Bookings screen...");
    navigation.navigate('MyBookingsScreen'); 
  };

  const handleGoHome = () => {
    // Navigate back to the home screen
    navigation.popToTop(); // Go back to the very first screen (Home)
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          
          {/* Header - Simple */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleGoHome}>
              <Icon name="close-outline" size={30} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Confirmation Icon and Message */}
          <View style={styles.confirmationContainer}>
            <Icon name="checkmark-circle-sharp" size={120} color="#27AE60" />
            <Text style={styles.successTitle}>Service Booked!</Text>
            <Text style={styles.successSubtitle}>
              Your request has been successfully placed. We've sent a confirmation email.
            </Text>
          </View>

          {/* Booking Summary Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Booking Details</Text>
            
            <View style={styles.detailRow}>
              <Icon name="ticket-outline" size={20} color="#777" style={styles.detailIcon} />
              <Text style={styles.detailLabel}>Booking ID:</Text>
              <Text style={styles.detailValueBold}>{bookingDetails.bookingId}</Text>
            </View>

            <View style={styles.detailRow}>
              <Icon name="briefcase-outline" size={20} color="#777" style={styles.detailIcon} />
              <Text style={styles.detailLabel}>Service:</Text>
              <Text style={styles.detailValue}>{bookingDetails.serviceSummary}</Text>
            </View>

            <View style={styles.detailRow}>
              <Icon name="calendar-outline" size={20} color="#777" style={styles.detailIcon} />
              <Text style={styles.detailLabel}>Date:</Text>
              <Text style={styles.detailValue}>{bookingDetails.date}</Text>
            </View>

            <View style={styles.detailRow}>
              <Icon name="time-outline" size={20} color="#777" style={styles.detailIcon} />
              <Text style={styles.detailLabel}>Time Slot:</Text>
              <Text style={styles.detailValue}>{bookingDetails.timeSlot}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Icon name="location-outline" size={20} color="#777" style={styles.detailIcon} />
              <Text style={styles.detailLabel}>Address:</Text>
              <Text style={styles.detailValue}>{bookingDetails.address}</Text>
            </View>
            
            <View style={[styles.detailRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total Payable:</Text>
              <Text style={styles.totalPrice}>₹{bookingDetails.total.toLocaleString('en-IN')}</Text>
            </View>
          </View>
          
          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleViewBookings}>
              <Text style={styles.secondaryButtonText}>View My Bookings</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.primaryButton} onPress={handleGoHome}>
              <Text style={styles.primaryButtonText}>Continue Browsing</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// --- STYLES ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: 10,
    marginBottom: 20,
  },
  
  // Confirmation Section
  confirmationContainer: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#333',
    marginTop: 15,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    marginTop: 8,
    maxWidth: width * 0.75,
  },

  // Summary Card
  card: {
    width: '100%',
    backgroundColor: '#F8F8F8',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#eee',
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
      android: { elevation: 3 },
    }),
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderColor: '#ddd',
    paddingBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailIcon: {
    width: 25,
    marginRight: 10,
  },
  detailLabel: {
    fontSize: 15,
    color: '#555',
    fontWeight: '500',
    width: 90,
  },
  detailValue: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  detailValueBold: {
    fontSize: 15,
    color: '#333',
    flex: 1,
    fontWeight: '700',
  },
  totalRow: {
    marginTop: 15,
    borderTopWidth: 1,
    borderColor: '#ddd',
    paddingTop: 15,
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: '800',
    color: '#D63031',
  },

  // Action Buttons
  actionButtonsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#3498DB', // A nice action color
    paddingVertical: 14,
    borderRadius: 10,
    width: '100%',
    marginTop: 10,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 14,
    borderRadius: 10,
    width: '100%',
    borderWidth: 1,
    borderColor: '#BDC3C7',
    marginBottom: 10,
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default BookingConfirmedScreen;