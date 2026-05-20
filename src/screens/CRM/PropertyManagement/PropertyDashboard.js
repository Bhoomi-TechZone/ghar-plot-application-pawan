import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import {
  getAllProperties,
  getRentProperties,
  getBoughtProperties,
  getRecentProperties,
  getSubCategoryCounts,
  checkUserRole,
} from '../../../services/propertyService';

const PropertyDashboard = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    residential: 0,
    commercial: 0,
    rent: 0,
    bought: 0,
    recent: 0,
  });

  useEffect(() => {
    loadDashboardData();
    checkRole();
  }, []);

  const checkRole = async () => {
    try {
      const { isAdmin: adminStatus } = await checkUserRole();
      setIsAdmin(adminStatus);
    } catch (error) {
      console.error('Error checking role:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      setError(null);
      
      // Load all data in parallel
      const [
        allProperties,
        rentProperties,
        boughtProperties,
        recentProperties,
        subCategoryCounts
      ] = await Promise.allSettled([
        getAllProperties(),
        getRentProperties(),
        getBoughtProperties(),
        getRecentProperties(),
        getSubCategoryCounts(),
      ]);

      // Process all properties
      const totalProperties = allProperties.status === 'fulfilled' ? allProperties.value : [];
      
      // Calculate residential and commercial from all properties
      let residential = 0;
      let commercial = 0;
      
      if (Array.isArray(totalProperties)) {
        totalProperties.forEach(property => {
          const type = (property.propertyType || property.type || '').toLowerCase();
          if (type.includes('residential') || type.includes('apartment') || type.includes('house')) {
            residential++;
          } else if (type.includes('commercial') || type.includes('office') || type.includes('shop')) {
            commercial++;
          }
        });
      }

      // Use subcategory counts if available, otherwise use calculated values
      let finalStats = {
        total: Array.isArray(totalProperties) ? totalProperties.length : 0,
        residential,
        commercial,
        rent: rentProperties.status === 'fulfilled' ? (Array.isArray(rentProperties.value) ? rentProperties.value.length : 0) : 0,
        bought: boughtProperties.status === 'fulfilled' ? (Array.isArray(boughtProperties.value) ? boughtProperties.value.length : 0) : 0,
        recent: recentProperties.status === 'fulfilled' ? (Array.isArray(recentProperties.value) ? recentProperties.value.length : 0) : 0,
      };

      // Override with API counts if available
      if (subCategoryCounts.status === 'fulfilled' && subCategoryCounts.value) {
        const apiCounts = subCategoryCounts.value;
        finalStats = {
          ...finalStats,
          total: apiCounts.total || finalStats.total,
          residential: apiCounts.residential || finalStats.residential,
          commercial: apiCounts.commercial || finalStats.commercial,
          rent: apiCounts.rent || finalStats.rent,
          bought: apiCounts.bought || finalStats.bought,
          recent: apiCounts.recent || finalStats.recent,
        };
      }

      setStats(finalStats);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError(error.message || 'Failed to load property data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
  };

  const navigateToPropertyList = (category = 'all') => {
    navigation.navigate('PropertyList', { category });
  };

  const navigateToAnalytics = () => {
    navigation.navigate('PropertyAnalytics');
  };

  const StatCard = ({ title, count, icon, color, onPress, gradient = false }) => (
    <TouchableOpacity style={styles.statCard} onPress={onPress} activeOpacity={0.7}>
      {gradient ? (
        <LinearGradient
          colors={color}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statCardGradient}
        >
          <View style={styles.statCardContent}>
            <MaterialIcons name={icon} size={32} color="#FFFFFF" />
            <Text style={styles.statCountGradient}>{count}</Text>
            <Text style={styles.statTitleGradient}>{title}</Text>
          </View>
        </LinearGradient>
      ) : (
        <View style={styles.statCardContent}>
          <View style={[styles.statIconContainer, { backgroundColor: color }]}>
            <MaterialIcons name={icon} size={28} color="#FFFFFF" />
          </View>
          <Text style={styles.statCount}>{count}</Text>
          <Text style={styles.statTitle}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const LoadingSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <View key={item} style={styles.skeletonCard}>
          <View style={styles.skeletonIcon} />
          <View style={styles.skeletonText} />
          <View style={styles.skeletonTitle} />
        </View>
      ))}
    </View>
  );

  const ErrorState = () => (
    <View style={styles.errorContainer}>
      <MaterialIcons name="error-outline" size={64} color="#ef4444" />
      <Text style={styles.errorTitle}>Failed to Load Data</Text>
      <Text style={styles.errorMessage}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={loadDashboardData}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#3B82F6" />
        <LinearGradient
          colors={['#3B82F6', '#8B5CF6']}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Property Management</Text>
          <Text style={styles.headerSubtitle}>Real Estate Dashboard</Text>
        </LinearGradient>
        <LoadingSkeleton />
      </SafeAreaView>
    );
  }

  if (error && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#3B82F6" />
        <LinearGradient
          colors={['#3B82F6', '#8B5CF6']}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Property Management</Text>
          <Text style={styles.headerSubtitle}>Real Estate Dashboard</Text>
        </LinearGradient>
        <ErrorState />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3B82F6" />
      
      {/* Header */}
      <LinearGradient
        colors={['#3B82F6', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Property Management</Text>
            <Text style={styles.headerSubtitle}>
              {isAdmin ? 'Admin Dashboard' : 'Employee Dashboard'}
            </Text>
          </View>
          {/* Analytics button temporarily hidden */}
          {/* <TouchableOpacity 
            style={styles.analyticsButton}
            onPress={navigateToAnalytics}
          >
            <MaterialIcons name="analytics" size={20} color="#FFFFFF" />
          </TouchableOpacity> */}
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
          />
        }
      >
        {/* Main Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard
              title="Total Properties"
              count={stats.total}
              icon="home"
              color={['#3B82F6', '#8B5CF6']}
              onPress={() => navigateToPropertyList('all')}
              gradient={true}
            />
            <StatCard
              title="Residential"
              count={stats.residential}
              icon="apartment"
              color="#10B981"
              onPress={() => navigateToPropertyList('residential')}
            />
          </View>
        </View>

        {/* Property Types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property Categories</Text>
          <View style={styles.statsGrid}>
            <StatCard
              title="Commercial"
              count={stats.commercial}
              icon="business"
              color="#F59E0B"
              onPress={() => navigateToPropertyList('commercial')}
            />
            <StatCard
              title="For Rent"
              count={stats.rent}
              icon="key"
              color="#8B5CF6"
              onPress={() => navigateToPropertyList('rent')}
            />
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity</Text>
          <View style={styles.statsGrid}>
            <StatCard
              title="Sold Properties"
              count={stats.bought}
              icon="check-circle"
              color="#EF4444"
              onPress={() => navigateToPropertyList('bought')}
            />
            <StatCard
              title="Recent Listings"
              count={stats.recent}
              icon="schedule"
              color="#06B6D4"
              onPress={() => navigateToPropertyList('recent')}
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigateToPropertyList('all')}
          >
            <MaterialIcons name="list" size={24} color="#3B82F6" />
            <View style={styles.actionButtonContent}>
              <Text style={styles.actionButtonTitle}>View All Properties</Text>
              <Text style={styles.actionButtonSubtitle}>Browse complete property listings</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Property Analytics button temporarily hidden */}
          {/* <TouchableOpacity
            style={styles.actionButton}
            onPress={navigateToAnalytics}
          >
            <MaterialIcons name="analytics" size={24} color="#10B981" />
            <View style={styles.actionButtonContent}>
              <Text style={styles.actionButtonTitle}>Property Analytics</Text>
              <Text style={styles.actionButtonSubtitle}>View detailed reports and insights</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
          </TouchableOpacity> */}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E0E7FF',
  },
  analyticsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    marginTop: -20,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statCardGradient: {
    borderRadius: 16,
    padding: 20,
  },
  statCardContent: {
    padding: 20,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statCount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  statCountGradient: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
  },
  statTitleGradient: {
    fontSize: 13,
    fontWeight: '500',
    color: '#E0E7FF',
    textAlign: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionButtonContent: {
    flex: 1,
    marginLeft: 16,
  },
  actionButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  actionButtonSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  skeletonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    gap: 12,
  },
  skeletonCard: {
    width: '48%',
    backgroundColor: '#E5E7EB',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  skeletonIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#D1D5DB',
    marginBottom: 12,
  },
  skeletonText: {
    width: 40,
    height: 20,
    backgroundColor: '#D1D5DB',
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonTitle: {
    width: 80,
    height: 12,
    backgroundColor: '#D1D5DB',
    borderRadius: 4,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default PropertyDashboard;