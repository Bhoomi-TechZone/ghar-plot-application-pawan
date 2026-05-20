import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Linking,
  Alert,
  FlatList,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { getPropertyAnalytics, getAllProperties } from '../../../services/propertyService';
import CrossPlatformAlert from '../../../utils/crossPlatformAlert';

const { width } = Dimensions.get('window');

const PropertyAnalytics = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPropertyList, setShowPropertyList] = useState(false);
  const [properties, setProperties] = useState([]);
  const [analytics, setAnalytics] = useState({
    total: 0,
    residential: 0,
    commercial: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    rent: 0,
    bought: 0,
    priceRanges: {
      low: 0,
      medium: 0,
      high: 0
    }
  });

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setError(null);
      const [analyticsData, propertiesData] = await Promise.all([
        getPropertyAnalytics(),
        getAllProperties()
      ]);
      setAnalytics(analyticsData);
      setProperties(propertiesData);
    } catch (error) {
      console.error('Error loading analytics:', error);
      setError(error.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const makeCall = (phoneNumber) => {
    if (!phoneNumber) {
      CrossPlatformAlert.alert('Error', 'Phone number not available');
      return;
    }
    
    const url = `tel:${phoneNumber}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          CrossPlatformAlert.alert('Error', 'Unable to make phone calls on this device');
        }
      })
      .catch((err) => {
        console.error('Error making call:', err);
        CrossPlatformAlert.alert('Error', 'Failed to make call');
      });
  };

  const calculatePercentage = (value, total) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  const AnalyticsCard = ({ title, children }) => (
    <View style={styles.analyticsCard}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );

  const StatBar = ({ label, value, total, color, icon }) => {
    const percentage = calculatePercentage(value, total);
    const barWidth = total > 0 ? (value / total) * 100 : 0;
    
    return (
      <View style={styles.statBar}>
        <View style={styles.statBarHeader}>
          <View style={styles.statBarLabel}>
            <MaterialIcons name={icon} size={16} color={color} />
            <Text style={styles.statBarText}>{label}</Text>
          </View>
          <View style={styles.statBarValue}>
            <Text style={styles.statBarNumber}>{value}</Text>
            <Text style={styles.statBarPercentage}>({percentage}%)</Text>
          </View>
        </View>
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${barWidth}%`,
                backgroundColor: color,
              }
            ]}
          />
        </View>
      </View>
    );
  };

  const MetricCard = ({ title, value, subtitle, icon, color }) => (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: color }]}>
        <MaterialIcons name={icon} size={24} color="#FFFFFF" />
      </View>
      <View style={styles.metricContent}>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricTitle}>{title}</Text>
        {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorContainer}>
      <MaterialIcons name="error-outline" size={64} color="#EF4444" />
      <Text style={styles.errorTitle}>Failed to Load Analytics</Text>
      <Text style={styles.errorMessage}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={loadAnalytics}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#3B82F6" />
      <Text style={styles.loadingText}>Loading analytics...</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Property Analytics</Text>
          <View style={styles.placeholder} />
        </View>
        {renderLoading()}
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Property Analytics</Text>
          <View style={styles.placeholder} />
        </View>
        {renderError()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Property Analytics</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadAnalytics}
        >
          <MaterialIcons name="refresh" size={24} color="#1F2937" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Overview Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.metricsGrid}>
            <MetricCard
              title="Total Properties"
              value={analytics.total}
              icon="home"
              color="#3B82F6"
            />
            <MetricCard
              title="Active Listings"
              value={analytics.approved}
              subtitle={`${calculatePercentage(analytics.approved, analytics.total)}% approved`}
              icon="check-circle"
              color="#10B981"
            />
          </View>
        </View>

        {/* Property Type Breakdown */}
        <AnalyticsCard title="Property Types">
          <StatBar
            label="Residential"
            value={analytics.residential}
            total={analytics.total}
            color="#10B981"
            icon="apartment"
          />
          <StatBar
            label="Commercial"
            value={analytics.commercial}
            total={analytics.total}
            color="#F59E0B"
            icon="business"
          />
          <StatBar
            label="Other Types"
            value={analytics.total - analytics.residential - analytics.commercial}
            total={analytics.total}
            color="#6B7280"
            icon="home"
          />
        </AnalyticsCard>

        {/* Status Breakdown */}
        <AnalyticsCard title="Approval Status">
          <StatBar
            label="Approved"
            value={analytics.approved}
            total={analytics.total}
            color="#10B981"
            icon="check-circle"
          />
          <StatBar
            label="Pending"
            value={analytics.pending}
            total={analytics.total}
            color="#F59E0B"
            icon="schedule"
          />
          <StatBar
            label="Rejected"
            value={analytics.rejected}
            total={analytics.total}
            color="#EF4444"
            icon="cancel"
          />
        </AnalyticsCard>

        {/* Purpose Distribution */}
        <AnalyticsCard title="Property Purpose">
          <StatBar
            label="For Rent"
            value={analytics.rent}
            total={analytics.total}
            color="#8B5CF6"
            icon="key"
          />
          <StatBar
            label="For Sale"
            value={analytics.bought}
            total={analytics.total}
            color="#3B82F6"
            icon="monetization-on"
          />
          <StatBar
            label="Other Purpose"
            value={analytics.total - analytics.rent - analytics.bought}
            total={analytics.total}
            color="#6B7280"
            icon="more-horiz"
          />
        </AnalyticsCard>

        {/* Price Range Distribution */}
        <AnalyticsCard title="Price Range Distribution">
          <StatBar
            label="Budget (< ₹10L)"
            value={analytics.priceRanges.low}
            total={analytics.total}
            color="#22C55E"
            icon="trending-down"
          />
          <StatBar
            label="Mid-range (₹10L - ₹50L)"
            value={analytics.priceRanges.medium}
            total={analytics.total}
            color="#F59E0B"
            icon="trending-flat"
          />
          <StatBar
            label="Premium (> ₹50L)"
            value={analytics.priceRanges.high}
            total={analytics.total}
            color="#EF4444"
            icon="trending-up"
          />
        </AnalyticsCard>

        {/* Summary Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Insights</Text>
          <View style={styles.insightsList}>
            <View style={styles.insightItem}>
              <MaterialIcons name="insights" size={20} color="#3B82F6" />
              <Text style={styles.insightText}>
                <Text style={styles.insightHighlight}>
                  {calculatePercentage(analytics.residential, analytics.total)}%
                </Text>
                {' '}of properties are residential
              </Text>
            </View>
            
            <View style={styles.insightItem}>
              <MaterialIcons name="approval" size={20} color="#10B981" />
              <Text style={styles.insightText}>
                <Text style={styles.insightHighlight}>
                  {calculatePercentage(analytics.approved, analytics.total)}%
                </Text>
                {' '}approval rate
              </Text>
            </View>
            
            <View style={styles.insightItem}>
              <MaterialIcons name="home-work" size={20} color="#F59E0B" />
              <Text style={styles.insightText}>
                <Text style={styles.insightHighlight}>
                  {calculatePercentage(analytics.rent, analytics.total)}%
                </Text>
                {' '}are rental properties
              </Text>
            </View>
            
            <View style={styles.insightItem}>
              <MaterialIcons name="trending-up" size={20} color="#8B5CF6" />
              <Text style={styles.insightText}>
                <Text style={styles.insightHighlight}>
                  {calculatePercentage(analytics.priceRanges.high, analytics.total)}%
                </Text>
                {' '}are premium properties
              </Text>
            </View>
          </View>
        </View>

        {/* Property List Button */}
        <TouchableOpacity 
          style={styles.viewPropertiesButton}
          onPress={() => setShowPropertyList(!showPropertyList)}
        >
          <MaterialIcons name={showPropertyList ? "expand-less" : "expand-more"} size={24} color="#FFFFFF" />
          <Text style={styles.viewPropertiesText}>
            {showPropertyList ? 'Hide' : 'View'} All Properties ({properties.length})
          </Text>
        </TouchableOpacity>

        {/* Property List */}
        {showPropertyList && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Property List with Sellers</Text>
            {properties.length > 0 ? (
              properties.map((property, index) => (
                <View key={property._id || index} style={styles.propertyCard}>
                  {/* Property Header */}
                  <View style={styles.propertyHeader}>
                    <View style={styles.propertyTitleSection}>
                      <Text style={styles.propertyTitle} numberOfLines={2}>
                        {property.title || property.name || property.propertyName || 'Untitled Property'}
                      </Text>
                      <Text style={styles.propertyType}>
                        {property.type || property.propertyType || 'N/A'} • {property.purpose || 'Sale'}
                      </Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: property.status?.toLowerCase() === 'approved' ? '#10B981' : 
                                        property.status?.toLowerCase() === 'pending' ? '#F59E0B' : '#EF4444' }
                    ]}>
                      <Text style={styles.statusBadgeText}>
                        {property.status || 'Pending'}
                      </Text>
                    </View>
                  </View>

                  {/* Property Details */}
                  <View style={styles.propertyDetails}>
                    <View style={styles.detailRow}>
                      <MaterialIcons name="location-on" size={16} color="#6B7280" />
                      <Text style={styles.detailText} numberOfLines={1}>
                        {property.location || property.address || property.city || 'Location not specified'}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <MaterialIcons name="currency-rupee" size={16} color="#6B7280" />
                      <Text style={styles.detailText}>
                        {property.price ? `₹${parseInt(property.price).toLocaleString('en-IN')}` : 'Price not available'}
                      </Text>
                    </View>
                    {property.area && (
                      <View style={styles.detailRow}>
                        <MaterialIcons name="square-foot" size={16} color="#6B7280" />
                        <Text style={styles.detailText}>
                          {property.area}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Seller Information */}
                  <View style={styles.sellerSection}>
                    <View style={styles.sellerHeader}>
                      <MaterialIcons name="person" size={20} color="#3B82F6" />
                      <Text style={styles.sellerTitle}>Seller/Owner Details</Text>
                    </View>
                    
                    <View style={styles.sellerInfo}>
                      <View style={styles.sellerDetailRow}>
                        <Text style={styles.sellerLabel}>Name:</Text>
                        <Text style={styles.sellerValue}>
                          {property.postedBy?.fullName || property.ownerName || property.userName || 'N/A'}
                        </Text>
                      </View>
                      
                      {(property.postedBy?.email || property.email) && (
                        <View style={styles.sellerDetailRow}>
                          <Text style={styles.sellerLabel}>Email:</Text>
                          <Text style={styles.sellerValue} numberOfLines={1}>
                            {property.postedBy?.email || property.email}
                          </Text>
                        </View>
                      )}
                      
                      {(property.postedBy?.phone || property.phone || property.contactNumber) && (
                        <View style={styles.sellerDetailRow}>
                          <Text style={styles.sellerLabel}>Phone:</Text>
                          <Text style={styles.sellerValue}>
                            {property.postedBy?.phone || property.phone || property.contactNumber}
                          </Text>
                        </View>
                      )}

                      {property.createdAt && (
                        <View style={styles.sellerDetailRow}>
                          <Text style={styles.sellerLabel}>Posted:</Text>
                          <Text style={styles.sellerValue}>
                            {new Date(property.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Call Button */}
                    {(property.postedBy?.phone || property.phone || property.contactNumber) && (
                      <TouchableOpacity 
                        style={styles.callButton}
                        onPress={() => makeCall(property.postedBy?.phone || property.phone || property.contactNumber)}
                      >
                        <MaterialIcons name="phone" size={20} color="#FFFFFF" />
                        <Text style={styles.callButtonText}>Call Seller</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons name="inventory-2" size={48} color="#D1D5DB" />
                <Text style={styles.emptyStateText}>No properties found</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: 40,
    height: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  metricContent: {
    flex: 1,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  metricTitle: {
    fontSize: 14,
    fontWeight: '500',
  viewPropertiesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  viewPropertiesText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  propertyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  propertyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  propertyTitleSection: {
    flex: 1,
    marginRight: 12,
  },
  propertyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  propertyType: {
    fontSize: 13,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  propertyDetails: {
    gap: 8,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  sellerSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
  },
  sellerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sellerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  sellerInfo: {
    gap: 8,
    marginBottom: 12,
  },
  sellerDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sellerLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  sellerValue: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  callButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 12,
  },
    color: '#6B7280',
    marginBottom: 2,
  },
  metricSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  analyticsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  statBar: {
    marginBottom: 16,
  },
  statBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statBarLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statBarText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
  },
  statBarValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statBarNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginRight: 4,
  },
  statBarPercentage: {
    fontSize: 12,
    color: '#6B7280',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  insightsList: {
    gap: 16,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  insightText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 12,
    flex: 1,
  },
  insightHighlight: {
    fontWeight: '700',
    color: '#1F2937',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
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
    backgroundColor: '#EF4444',
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

export default PropertyAnalytics;