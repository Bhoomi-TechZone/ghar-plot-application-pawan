import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Image,
  Alert,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import CrossPlatformAlert from '../../../utils/crossPlatformAlert';
import {
  getAllProperties,
  getPropertiesByCategory,
  deleteProperty,
  checkUserRole,
} from '../../../services/propertyService';

const PropertyList = ({ navigation, route }) => {
  const [properties, setProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const initialCategory = route?.params?.category || 'all';

  useEffect(() => {
    setActiveTab(initialCategory);
    checkRole();
  }, [initialCategory]);

  useEffect(() => {
    loadProperties(activeTab);
  }, [activeTab]);

  useEffect(() => {
    filterProperties();
  }, [properties, searchQuery]);

  const checkRole = async () => {
    try {
      const { isAdmin: adminStatus } = await checkUserRole();
      setIsAdmin(adminStatus);
    } catch (error) {
      console.error('Error checking role:', error);
    }
  };

  const loadProperties = async (category = 'all') => {
    try {
      setError(null);
      let propertyData;
      
      if (category === 'all') {
        propertyData = await getAllProperties();
      } else {
        propertyData = await getPropertiesByCategory(category);
      }
      
      setProperties(Array.isArray(propertyData) ? propertyData : []);
    } catch (error) {
      console.error('Error loading properties:', error);
      setError(error.message || 'Failed to load properties');
      setProperties([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterProperties = () => {
    if (!searchQuery.trim()) {
      setFilteredProperties(properties);
      return;
    }

    const filtered = properties.filter(property => {
      const searchText = searchQuery.toLowerCase();
      const title = (property.title || property.propertyName || '').toLowerCase();
      const location = (property.location || property.address || '').toLowerCase();
      const type = (property.propertyType || property.type || '').toLowerCase();
      
      return title.includes(searchText) || 
             location.includes(searchText) || 
             type.includes(searchText);
    });
    
    setFilteredProperties(filtered);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProperties(activeTab);
  }, [activeTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchQuery('');
    setLoading(true);
  };

  const handleDeleteProperty = async (propertyId, propertyTitle) => {
    if (!isAdmin) {
      CrossPlatformAlert.alert('Access Denied', 'Only administrators can delete properties');
      return;
    }

    CrossPlatformAlert.alert(
      'Delete Property',
      `Are you sure you want to delete "${propertyTitle}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProperty(propertyId);
              CrossPlatformAlert.alert('Success', 'Property deleted successfully');
              loadProperties(activeTab);
            } catch (error) {
              CrossPlatformAlert.alert('Error', error.message || 'Failed to delete property');
            }
          },
        },
      ]
    );
  };

  const formatPrice = (price) => {
    if (!price) return 'Price not available';
    
    const numPrice = parseInt(price.toString().replace(/[^0-9]/g, ''));
    if (isNaN(numPrice)) return price;
    
    if (numPrice >= 10000000) { // 1 crore
      return `₹${(numPrice / 10000000).toFixed(1)} Cr`;
    } else if (numPrice >= 100000) { // 1 lakh
      return `₹${(numPrice / 100000).toFixed(1)} L`;
    } else {
      return `₹${numPrice.toLocaleString()}`;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      case 'rejected':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const renderProperty = ({ item }) => (
    <TouchableOpacity 
      style={styles.propertyCard}
      onPress={() => {
        // Navigate to property details if needed
        // navigation.navigate('PropertyDetails', { propertyId: item.id || item._id });
      }}
      activeOpacity={0.7}
    >
      <View style={styles.propertyImageContainer}>
        {item.image || item.images?.[0] || item.photo ? (
          <Image
            source={{ 
              uri: item.image || item.images?.[0] || item.photo || 'https://via.placeholder.com/300x200'
            }}
            style={styles.propertyImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <MaterialIcons name="home" size={32} color="#9CA3AF" />
          </View>
        )}
        
        {item.status && (
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        )}
        
        {isAdmin && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteProperty(
              item.id || item._id, 
              item.title || item.propertyName
            )}
          >
            <MaterialIcons name="delete" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.propertyInfo}>
        <Text style={styles.propertyTitle} numberOfLines={2}>
          {item.title || item.propertyName || 'Property Name'}
        </Text>
        
        <View style={styles.propertyMeta}>
          <MaterialIcons name="location-on" size={14} color="#6B7280" />
          <Text style={styles.propertyLocation} numberOfLines={1}>
            {item.location || item.address || 'Location not available'}
          </Text>
        </View>
        
        <View style={styles.propertyDetails}>
          <View style={styles.propertyType}>
            <MaterialIcons name="home" size={14} color="#6B7280" />
            <Text style={styles.propertyTypeText}>
              {item.propertyType || item.type || 'Property Type'}
            </Text>
          </View>
        </View>
        
        <View style={styles.propertyFooter}>
          <Text style={styles.propertyPrice}>
            {formatPrice(item.price || item.cost || item.rent)}
          </Text>
          
          {item.purpose && (
            <View style={[
              styles.purposeBadge,
              { backgroundColor: item.purpose.toLowerCase() === 'rent' ? '#8B5CF6' : '#3B82F6' }
            ]}>
              <Text style={styles.purposeText}>
                {item.purpose.toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        
        {item.createdAt || item.dateAdded && (
          <Text style={styles.propertyDate}>
            Added: {new Date(item.createdAt || item.dateAdded).toLocaleDateString()}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="home" size={64} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>No Properties Found</Text>
      <Text style={styles.emptyMessage}>
        {searchQuery 
          ? `No properties match your search "${searchQuery}"`
          : activeTab === 'all' 
            ? 'No properties available at the moment'
            : `No ${activeTab} properties found`
        }
      </Text>
      {searchQuery && (
        <TouchableOpacity
          style={styles.clearSearchButton}
          onPress={() => setSearchQuery('')}
        >
          <Text style={styles.clearSearchText}>Clear Search</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderError = () => (
    <View style={styles.errorContainer}>
      <MaterialIcons name="error-outline" size={64} color="#EF4444" />
      <Text style={styles.errorTitle}>Failed to Load Properties</Text>
      <Text style={styles.errorMessage}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={() => loadProperties(activeTab)}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  const tabs = [
    { key: 'all', title: 'All', icon: 'home' },
    { key: 'residential', title: 'Residential', icon: 'apartment' },
    { key: 'commercial', title: 'Commercial', icon: 'business' },
    { key: 'rent', title: 'Rent', icon: 'key' },
    { key: 'bought', title: 'Sold', icon: 'check-circle' },
    { key: 'recent', title: 'Recent', icon: 'schedule' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Properties</Text>
          
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => setShowSearch(!showSearch)}
          >
            <MaterialIcons name="search" size={24} color="#1F2937" />
          </TouchableOpacity>
        </View>
        
        {showSearch && (
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search properties..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9CA3AF"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialIcons name="clear" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <FlatList
          data={tabs}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsList}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === item.key && styles.activeTab
              ]}
              onPress={() => handleTabChange(item.key)}
            >
              <MaterialIcons
                name={item.icon}
                size={16}
                color={activeTab === item.key ? '#FFFFFF' : '#6B7280'}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === item.key && styles.activeTabText
                ]}
              >
                {item.title}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading properties...</Text>
        </View>
      ) : error ? (
        renderError()
      ) : (
        <FlatList
          data={filteredProperties}
          renderItem={renderProperty}
          keyExtractor={(item) => (item.id || item._id || Math.random()).toString()}
          contentContainerStyle={styles.propertyList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#3B82F6']}
              tintColor="#3B82F6"
            />
          }
          ListEmptyComponent={renderEmptyState}
          numColumns={2}
          columnWrapperStyle={styles.propertyRow}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
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
    flex: 1,
    textAlign: 'center',
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  tabsContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabsList: {
    paddingHorizontal: 20,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 12,
  },
  activeTab: {
    backgroundColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 6,
  },
  activeTabText: {
    color: '#FFFFFF',
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
  propertyList: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  propertyRow: {
    justifyContent: 'space-between',
  },
  propertyCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  propertyImageContainer: {
    height: 120,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  propertyImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  propertyInfo: {
    padding: 16,
  },
  propertyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    lineHeight: 18,
  },
  propertyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  propertyLocation: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
    flex: 1,
  },
  propertyDetails: {
    marginBottom: 12,
  },
  propertyType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  propertyTypeText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  propertyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  propertyPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  purposeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  purposeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  propertyDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  clearSearchButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  clearSearchText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
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

export default PropertyList;