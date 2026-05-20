import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AuthService from '../../services/authService';
import CrossPlatformAlert from '../../utils/crossPlatformAlert';

const { width } = Dimensions.get('window');

const AdminDashboardScreen = ({ navigation, user }) => {
  const insets = useSafeAreaInsets();
  
  const [dashboardData] = useState({
    totalProperty: 30,
    boughtProperty: 12,
    residentialProperty: 26,
    commercialProperty: 10,
    rentProperty: 8,
    enquiries: {
      client: 28,
      manual: 20,
      total: 48,
    },
    leads: {
      hot: 4,
      warm: 6,
      cold: 2,
      total: 12,
    },
    properties: {
      sale: 22,
      rent: 8,
    },
    recentProperties: [
      { title: "3 BHK Villa in Gurgaon", propertyType: "Residential" },
      { title: "Office Space for Rent", propertyType: "Commercial" }
    ]
  });

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleLogout = () => {
    CrossPlatformAlert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AuthService.logout();
              // Reset navigation stack with Home as base and LoginScreen on top
              // This allows user to go back to Home from LoginScreen
              navigation.reset({
                index: 1,
                routes: [
                  { name: 'Home' },
                  { name: 'LoginScreen' }
                ],
              });
            } catch (error) {
              console.error('Logout error:', error);
              CrossPlatformAlert.alert('Error', 'Failed to logout properly');
            }
          }
        }
      ]
    );
  };

  const handleStatsCardPress = (filterType) => {
    console.log(`📊 Admin clicked ${filterType} card`);
    console.log('Navigation object:', navigation);
    console.log('Attempting to navigate to AllPropertiesScreen...');
    
    try {
      // Navigate to AllPropertiesScreen with filter
      navigation.navigate('AllPropertiesScreen', {
        category: filterType,
        adminView: true
      });
      console.log('✅ Navigation successful');
    } catch (error) {
      console.error('❌ Navigation failed:', error);
      CrossPlatformAlert.alert('Error', 'Failed to navigate to properties screen');
    }
  };

  const renderStatsCard = (title, value, icon, color = '#007AFF', filterType = 'All') => {
    console.log(`🎨 Rendering card: ${title} with filter: ${filterType}`);
    
    return (
      <TouchableOpacity 
        style={[styles.statsCard, { borderLeftColor: color }]}
        onPress={() => {
          console.log(`🔥 CARD PRESSED: ${title}`);
          handleStatsCardPress(filterType);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.statsContent}>
          <View style={styles.statsTextContainer}>
            <Text style={styles.statsTitle}>{title}</Text>
            <Text style={styles.statsValue}>{value}</Text>
          </View>
          <MaterialIcons name={icon} size={24} color={color} />
        </View>
        
        {/* View All Button */}
        <View style={[styles.viewAllButton, { backgroundColor: color }]}>
          <Text style={styles.viewAllText}>View All</Text>
          <MaterialIcons name="arrow-forward" size={14} color="#fff" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar backgroundColor="#007AFF" barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSubtitle}>Welcome back, {user?.name || 'Admin'}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <MaterialIcons name="logout" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}>

        {/* Stats Grid */}
        <View style={styles.statsContainer}>
          {renderStatsCard('Total Properties', dashboardData.totalProperty, 'home', '#007AFF', 'All')}
          {renderStatsCard('Residential', dashboardData.residentialProperty, 'apartment', '#28a745', 'Residential')}
          {renderStatsCard('Commercial', dashboardData.commercialProperty, 'business', '#ffc107', 'Commercial')}
          {renderStatsCard('For Rent', dashboardData.rentProperty, 'key', '#17a2b8', 'Rent')}
        </View>
        
        {/* Debug Test Button */}
        <TouchableOpacity 
          style={{
            backgroundColor: '#FF0000',
            padding: 16,
            margin: 16,
            borderRadius: 8,
            alignItems: 'center'
          }}
          onPress={() => {
            console.log('🔴 TEST BUTTON PRESSED');
            handleStatsCardPress('All');
          }}
        >
          <Text style={{ color: '#FFF', fontWeight: 'bold' }}>
            TEST NAVIGATION - Click Me!
          </Text>
        </TouchableOpacity>

        {/* All Leads Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Leads</Text>
          <View style={styles.enquiryContainer}>
            <View style={styles.enquiryItem}>
              <Text style={styles.enquiryValue}>{dashboardData.enquiries.total}</Text>
              <Text style={styles.enquiryLabel}>Total Leads</Text>
            </View>
            <View style={styles.enquiryItem}>
              <Text style={styles.enquiryValue}>{dashboardData.enquiries.client}</Text>
              <Text style={styles.enquiryLabel}>Client Leads</Text>
            </View>
            <View style={styles.enquiryItem}>
              <Text style={styles.enquiryValue}>{dashboardData.enquiries.manual}</Text>
              <Text style={styles.enquiryLabel}>Manual Leads</Text>
            </View>
          </View>
        </View>

        {/* Leads Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Leads Status</Text>
          <View style={styles.leadsContainer}>
            <View style={[styles.leadItem, { backgroundColor: '#ffe6e6' }]}>
              <MaterialIcons name="whatshot" size={20} color="#dc3545" />
              <Text style={styles.leadValue}>{dashboardData.leads.hot}</Text>
              <Text style={styles.leadLabel}>Hot Leads</Text>
            </View>
            <View style={[styles.leadItem, { backgroundColor: '#fff3cd' }]}>
              <MaterialIcons name="trending-up" size={20} color="#ffc107" />
              <Text style={styles.leadValue}>{dashboardData.leads.warm}</Text>
              <Text style={styles.leadLabel}>Warm Leads</Text>
            </View>
            <View style={[styles.leadItem, { backgroundColor: '#d1ecf1' }]}>
              <MaterialIcons name="trending-down" size={20} color="#17a2b8" />
              <Text style={styles.leadValue}>{dashboardData.leads.cold}</Text>
              <Text style={styles.leadLabel}>Cold Leads</Text>
            </View>
          </View>
        </View>

        {/* Recent Properties */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Properties</Text>
          {dashboardData.recentProperties.map((property, index) => (
            <View key={index} style={styles.propertyItem}>
              <View style={styles.propertyIcon}>
                <MaterialIcons
                  name={property.propertyType === 'Residential' ? 'home' : 'business'}
                  size={20}
                  color="#007AFF"
                />
              </View>
              <View style={styles.propertyDetails}>
                <Text style={styles.propertyTitle}>{property.title}</Text>
                <Text style={styles.propertyType}>{property.propertyType}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionButton}>
              <MaterialIcons name="add" size={24} color="#007AFF" />
              <Text style={styles.actionText}>Add Property</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <MaterialIcons name="people" size={24} color="#007AFF" />
              <Text style={styles.actionText}>Manage Users</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <MaterialIcons name="assessment" size={24} color="#007AFF" />
              <Text style={styles.actionText}>Reports</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  logoutButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: (width - 48) / 2,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsTextContainer: {
    flex: 1,
  },
  statsTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  enquiryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  enquiryItem: {
    alignItems: 'center',
  },
  enquiryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  enquiryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  leadsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  leadItem: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    minWidth: 80,
  },
  leadValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
  },
  leadLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  propertyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  propertyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  propertyDetails: {
    flex: 1,
  },
  propertyTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  propertyType: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#f0f8ff',
    minWidth: 80,
  },
  actionText: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
    textAlign: 'center',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 4,
  },
  viewAllText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default AdminDashboardScreen;