import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  TextInput,
  Dimensions,
  SafeAreaView,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';
import CrossPlatformAlert from '../../../utils/crossPlatformAlert';
import {
  getAllProperties,
  getPropertiesByCategory,
  deleteProperty,
  checkUserRole,
} from '../../../services/propertyService';

const { width } = Dimensions.get('window');

const PropertyManagementScreen = ({ navigation }) => {
  const [searchText, setSearchText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [properties, setProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [imageErrors, setImageErrors] = useState({}); // Track image loading errors
  const [showPostModal, setShowPostModal] = useState(false);

  // Helper function to get correct image URL based on property source
  const getPropertyImageUrl = useCallback((imageData, isPostedByAdmin) => {
    if (!imageData || typeof imageData !== 'string') {
      return null; // Will use placeholder
    }

    // If already a complete URL, return as-is
    if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
      return imageData;
    }

    // For relative paths (uploads/...), use appropriate base URL
    if (imageData.startsWith('uploads/') || imageData.startsWith('/uploads/')) {
      // Admin properties use .us domain
      if (isPostedByAdmin) {
        const baseUrl = 'https://gharplotbackend.gntechnology.de';
        const cleanPath = imageData.replace(/^\/+/, '');
        return `${baseUrl}/${cleanPath}`;
      }
      // User properties use .com domain
      else {
        const baseUrl = 'https://gharplotbackend.gntechnology.de';
        const cleanPath = imageData.replace(/^\/+/, '');
        return `${baseUrl}/${cleanPath}`;
      }
    }

    return null;
  }, []);

  // Post Property Form States
  const [formData, setFormData] = useState({
    location: '',
    areaInSqFt: '',
    price: '',
    contactNumber: '',
    availability: 'Ready to Move',
    purpose: 'Sell',
    propertyType: 'Commercial',
    commercialType: 'office',
    bedrooms: '1',
    bathrooms: '2',
    floorNumber: '1',
    totalFloors: '5',
    furnishing: 'Furnished',
    parking: 'Available',
    facingDirection: 'East',
    photosAndVideo: [],
    description: '',
  });

  const [stats, setStats] = useState({
    total: 0,
    residential: 0,
    commercial: 0,
  });

  useEffect(() => {
    loadPropertyData();
    checkRole();
  }, []);

  useEffect(() => {
    filterProperties();
  }, [properties, searchText]);

  const checkRole = async () => {
    try {
      const { isAdmin: adminStatus } = await checkUserRole();
      setIsAdmin(adminStatus);
    } catch (error) {
      console.error('Error checking role:', error);
    }
  };

  const loadPropertyData = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      // Load only properties data
      const propertiesResult = await Promise.allSettled([
        getAllProperties(),
      ]);

      // Handle properties data
      const propertyData = propertiesResult[0];
      if (propertyData.status === 'fulfilled') {
        const rawData = propertyData.value;
        console.log('Raw API Response:', JSON.stringify(rawData, null, 2));

        const propertyList = rawData?.properties || rawData?.data || rawData || [];
        console.log('Property List:', JSON.stringify(propertyList, null, 2));
        setProperties(Array.isArray(propertyList) ? propertyList : []);

        // Calculate stats from properties data with improved logic
        const total = propertyList.length;
        let residential = 0;
        let commercial = 0;

        propertyList.forEach(property => {
          const type = (property.type || property.propertyType || property.category || '').toLowerCase();
          const category = (property.category || property.subcategory || '').toLowerCase();

          // More comprehensive matching for residential properties
          if (type.includes('residential') || type.includes('apartment') || type.includes('house') ||
            type.includes('villa') || type.includes('flat') || type.includes('home') ||
            category.includes('residential') || category.includes('apartment') || category.includes('house') ||
            type.includes('rent') && (type.includes('house') || type.includes('flat'))) {
            residential++;
          }
          // More comprehensive matching for commercial properties
          else if (type.includes('commercial') || type.includes('office') || type.includes('shop') ||
            type.includes('retail') || type.includes('warehouse') || type.includes('showroom') ||
            category.includes('commercial') || category.includes('office') || category.includes('shop')) {
            commercial++;
          }
        });


        setStats({ total, residential, commercial });
      } else {
        setProperties([]);
        setStats({ total: 0, residential: 0, commercial: 0 });
      }
    } catch (error) {
      console.error('Error loading property data:', error);
      setError(error.message || 'Failed to load property data');
      setProperties([]);
      setStats({ total: 0, residential: 0, commercial: 0 });
    } finally {
      setLoading(false);
    }
  }, []);



  const filterProperties = () => {
    if (!searchText?.trim()) {
      setFilteredProperties(properties);
      return;
    }

    const filtered = properties.filter(property => {
      if (!property) return false;

      const searchLower = searchText.toLowerCase();
      const title = (property.title || property.propertyName || property.name || property.property_name || '').toLowerCase();
      const location = (property.location || property.address || property.city || property.area || '').toLowerCase();
      const type = (property.propertyType || property.type || property.category || property.property_type || '').toLowerCase();

      return title.includes(searchLower) ||
        location.includes(searchLower) ||
        type.includes(searchLower);
    });

    setFilteredProperties(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadPropertyData();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleDeleteProperty = useCallback(async (propertyId, propertyTitle) => {
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
              loadPropertyData();
            } catch (error) {
              CrossPlatformAlert.alert('Error', error.message || 'Failed to delete property');
            }
          },
        },
      ]
    );
  }, [isAdmin, loadPropertyData]);

  const formatPrice = (price) => {
    if (!price) return 'Price not available';

    const numPrice = parseInt(price.toString().replace(/[^0-9]/g, ''));
    if (isNaN(numPrice)) return price;

    if (numPrice >= 10000000) {
      return `₹${(numPrice / 10000000).toFixed(1)} Cr`;
    } else if (numPrice >= 100000) {
      return `₹${(numPrice / 100000).toFixed(1)} L`;
    } else {
      return `₹${numPrice.toLocaleString()}`;
    }
  };

  const renderProperty = useCallback(({ item }) => {
    // Debug: Log property data to see what's available
    console.log('Property item:', JSON.stringify(item, null, 2));

    // Get property name with multiple fallback options
    const getPropertyName = () => {
      const nameFields = [
        item.name,
        item.title,
        item.propertyName,
        item.property_name,
        item.propertyTitle,
        item.heading,
        item.description
      ];

      for (const field of nameFields) {
        if (field && typeof field === 'string' && field.trim()) {
          return field.trim();
        }
      }
      return 'Property Name';
    };

    // Get property type with multiple fallback options
    const getPropertyType = () => {
      const typeFields = [
        item.type,
        item.propertyType,
        item.property_type,
        item.category,
        item.subcategory,
        item.kind
      ];

      for (const field of typeFields) {
        if (field && typeof field === 'string' && field.trim()) {
          return field.trim();
        }
      }
      return 'Property Type';
    };

    // Get image URL with multiple fallback options
    const getImageUrl = () => {
      // Backend returns photosAndVideo as array of strings (file paths)
      const imageFields = [
        item.photosAndVideo?.[0], // Backend primary field
        item.image,
        item.images?.[0],
        item.photo,
        item.propertyImages?.[0],
        item.thumbnail,
        item.cover_image,
        item.featured_image,
        item.picture,
        item.img,
        item.imageUrl,
        item.image_url
      ];

      for (const field of imageFields) {
        if (field && typeof field === 'string' && field.trim()) {
          let imageUrl = field.trim();

          // If it's already a complete URL, use it
          if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
            return imageUrl;
          }

          // Handle relative paths from backend (e.g., "uploads/...")
          // Use getPropertyImageUrl helper to determine correct domain
          if (imageUrl.startsWith('uploads/') || imageUrl.startsWith('/uploads/')) {
            const isPostedByAdmin = item?.isPostedByAdmin || false;
            const constructedUrl = getPropertyImageUrl(imageUrl, isPostedByAdmin);
            if (constructedUrl) {
              return constructedUrl;
            }
          }

          // Handle paths with leading slash
          if (imageUrl.startsWith('/')) {
            const isPostedByAdmin = item?.isPostedByAdmin || false;
            const cleanPath = imageUrl.replace(/^\/+/, '');
            if (isPostedByAdmin) {
              return `https://ghar-plot-backend1.onrender.com/${cleanPath}`;
            } else {
              return `https://ghar-plot-backend1.onrender.com/${cleanPath}`;
            }
          }

          // Handle relative paths without leading slash
          const isPostedByAdmin = item?.isPostedByAdmin || false;
          if (isPostedByAdmin) {
            return `https://ghar-plot-backend1.onrender.com/${imageUrl}`;
          } else {
            return `https://ghar-plot-backend1.onrender.com/${imageUrl}`;
          }
        }
      }

      // Return placeholder image
      return 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=300&h=200&fit=crop&crop=house';
    };

    const imageUrl = getImageUrl();

    console.log('Property image URL:', imageUrl, 'for property:', item.title || item.propertyName);

    return (
      <View style={styles.card}>
        {/* Always show an image - either real or placeholder */}
        <Image
          source={{ uri: imageUrl }}
          style={styles.cardImage}
          onError={(error) => {
            console.log('Image load error:', error.nativeEvent?.error || 'Unknown error', 'for URL:', imageUrl);
            // Don't set error state, keep trying to load
          }}
          onLoad={() => {
            console.log('Image loaded successfully:', imageUrl);
          }}
          resizeMode="cover"
        />

        {/* Delete button for admin */}
        {isAdmin && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteProperty(
              item.id || item._id,
              getPropertyName()
            )}
          >
            <MaterialIcons name="delete" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {/* View Details - Clickable card background */}
        <TouchableOpacity
          style={[StyleSheet.absoluteFill, { zIndex: 0 }]}
          onPress={() => {
            console.log('🔍 Navigating to property details:', item._id || item.id);
            navigation.navigate('PropertyDetailsScreen', { property: item });
          }}
          activeOpacity={0.7}
        />

        {/* Status badge */}
        {item.status && (
          <View style={[styles.statusBadge, {
            backgroundColor: item.status.toLowerCase() === 'approved' ? '#10B981' :
              item.status.toLowerCase() === 'pending' ? '#F59E0B' : '#EF4444'
          }]}>
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        )}

        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {getPropertyName()}
          </Text>
          <Text style={styles.cardType}>
            {getPropertyType()}
          </Text>

          <Text style={styles.cardMeta}>
            {item.area || item.size || item.sqft || item.square_feet || 'Area not specified'} • {formatPrice(item.price || item.cost || item.rent || item.amount)}
          </Text>

          <View style={styles.cardFooter}>
            <Text style={styles.postedText}>
              {item.posted || (item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recently')}
            </Text>
            <TouchableOpacity style={styles.sellBtn}>
              <Text style={styles.sellText}>
                {item.purpose === 'rent' ? 'Rent' : 'Sell'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }, [isAdmin, handleDeleteProperty]);

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="home" size={64} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>No Properties Found</Text>
      <Text style={styles.emptyMessage}>
        {searchText
          ? `No properties match your search "${searchText}"`
          : 'No properties available at the moment'
        }
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorContainer}>
      <MaterialIcons name="error-outline" size={64} color="#EF4444" />
      <Text style={styles.errorTitle}>Failed to Load Properties</Text>
      <Text style={styles.errorMessage}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={loadPropertyData}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  const navigateToFullList = () => {
    navigation.navigate('AllPropertiesScreen', {
      category: 'All',
      adminView: true
    });
  };

  const navigateToAnalytics = () => {
    navigation.navigate('PropertyAnalytics');
  };

  const navigateToAddProperty = () => {
    setShowPostModal(true);
  };

  const handlePickFiles = () => {
    const options = {
      mediaType: 'mixed', // 'photo', 'video', or 'mixed'
      selectionLimit: 10, // 0 for unlimited
      quality: 0.8,
      includeBase64: false,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        CrossPlatformAlert.alert('Error', response.errorMessage || 'Failed to pick files');
      } else if (response.assets && response.assets.length > 0) {
        const selectedFiles = response.assets.map(asset => ({
          uri: asset.uri,
          type: asset.type,
          name: asset.fileName || `file_${Date.now()}`,
          size: asset.fileSize,
        }));

        setFormData(prev => ({
          ...prev,
          photosAndVideo: [...prev.photosAndVideo, ...selectedFiles]
        }));

        CrossPlatformAlert.alert('Success', `${selectedFiles.length} file(s) selected`);
      }
    });
  };

  const handlePostProperty = async () => {
    if (!formData.location || !formData.price || !formData.contactNumber) {
      CrossPlatformAlert.alert('Error', 'Please fill required fields: Location, Price, Contact Number');
      return;
    }

    try {
      setLoading(true);

      // Get auth token - check multiple token keys
      let token = await AsyncStorage.getItem('authToken');
      if (!token) {
        token = await AsyncStorage.getItem('crm_auth_token');
      }
      if (!token) {
        token = await AsyncStorage.getItem('adminToken');
      }
      if (!token) {
        token = await AsyncStorage.getItem('employee_auth_token');
      }

      if (!token) {
        CrossPlatformAlert.alert('Error', 'Please login first. No authentication token found.');
        setLoading(false);
        return;
      }

      console.log('🔐 Using token for property post:', token.substring(0, 20) + '...');

      // Prepare FormData for file upload
      const apiFormData = new FormData();

      apiFormData.append('propertyLocation', formData.location);
      apiFormData.append('areaDetails', formData.areaInSqFt || '1000');
      apiFormData.append('availability', formData.availability);
      apiFormData.append('price', formData.price);
      apiFormData.append('description', formData.description || 'Property description');
      apiFormData.append('furnishingStatus', formData.furnishing);
      apiFormData.append('parking', formData.parking);
      apiFormData.append('purpose', formData.purpose);
      apiFormData.append('propertyType', formData.propertyType);

      if (formData.propertyType === 'Commercial') {
        apiFormData.append('commercialType', formData.commercialType);
      } else {
        apiFormData.append('residentialType', formData.commercialType);
      }

      apiFormData.append('contactNumber', formData.contactNumber);
      apiFormData.append('bedrooms', formData.bedrooms);
      apiFormData.append('bathrooms', formData.bathrooms);
      apiFormData.append('floorNumber', formData.floorNumber);
      apiFormData.append('totalFloors', formData.totalFloors);
      apiFormData.append('facingDirection', formData.facingDirection);

      // Add photos/videos
      formData.photosAndVideo.forEach((file, index) => {
        apiFormData.append('photosAndVideo', {
          uri: file.uri,
          type: file.type || 'image/jpeg',
          name: file.name || `photo_${index}.jpg`,
        });
      });

      console.log('Posting property with', formData.photosAndVideo.length, 'files');

      // Call backend API - Use admin endpoint
      const response = await fetch('https://ghar-plot-backend1.onrender.com/property/admin/add', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: apiFormData,
      });

      console.log('📥 Response status:', response.status);
      const result = await response.json();
      console.log('📥 Response data:', result);

      if (response.ok) {
        CrossPlatformAlert.alert('Success', result.message || 'Property posted successfully!');
        setShowPostModal(false);

        // Refresh property list
        loadPropertyData();

        // Reset form
        setFormData({
          location: '',
          areaInSqFt: '',
          price: '',
          contactNumber: '',
          availability: 'Ready to Move',
          purpose: 'Sell',
          propertyType: 'Commercial',
          commercialType: 'office',
          bedrooms: '1',
          bathrooms: '2',
          floorNumber: '1',
          totalFloors: '5',
          furnishing: 'Furnished',
          parking: 'Available',
          facingDirection: 'East',
          photosAndVideo: [],
          description: '',
        });
      } else {
        const errorMsg = result.message || result.error || 'Failed to post property';
        console.error('❌ API Error:', errorMsg);
        CrossPlatformAlert.alert('Error', errorMsg);
      }
    } catch (error) {
      console.error('❌ Exception posting property:', error);
      CrossPlatformAlert.alert('Error', error.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#ffffff"
          translucent={false}
        />
        <LinearGradient colors={['#fff', '#fff']} style={styles.header}>
          <TouchableOpacity style={styles.addBtn}>
            <Icon name="add" size={18} color="#000" />
            <Text style={styles.addText}>Post</Text>
          </TouchableOpacity>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <ActivityIndicator size="small" color="#000" />
              <Text style={styles.statLabel}>Loading...</Text>
            </View>
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading properties...</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#ffffff"
        translucent={false}
      />

      {/* HEADER */}
      <LinearGradient colors={['#fff', '#fff']} style={styles.header}>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={navigateToAddProperty}
        >
          <Icon name="add" size={18} color="#000" />
          <Text style={styles.addText}>Post Property</Text>
        </TouchableOpacity>

        {/* STATS */}
        <View style={styles.statsRow}>
          <TouchableOpacity 
            style={styles.statBox}
            onPress={() => navigation.navigate('AllPropertiesScreen', {
              category: 'All',
              adminView: true
            })}
            activeOpacity={0.7}
          >
            <Text style={styles.statNum}>{stats.total}</Text>
            <Text style={styles.statLabel}>TOTAL</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.statBox}
            onPress={() => navigation.navigate('AllPropertiesScreen', {
              category: 'Residential',
              adminView: true
            })}
            activeOpacity={0.7}
          >
            <Text style={styles.statNum}>{stats.residential}</Text>
            <Text style={styles.statLabel}>RESIDENTIAL</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.statBox}
            onPress={() => navigation.navigate('AllPropertiesScreen', {
              category: 'Commercial',
              adminView: true
            })}
            activeOpacity={0.7}
          >
            <Text style={styles.statNum}>{stats.commercial}</Text>
            <Text style={styles.statLabel}>COMMERCIAL</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionButton} onPress={navigateToFullList}>
            <MaterialIcons name="list" size={16} color="#4F46E5" />
            <Text style={styles.actionText}>View All</Text>
          </TouchableOpacity>
          {/* Analytics option temporarily hidden */}
          {/* <TouchableOpacity style={styles.actionButton} onPress={navigateToAnalytics}>
            <MaterialIcons name="analytics" size={16} color="#4F46E5" />
            <Text style={styles.actionText}>Analytics</Text>
          </TouchableOpacity> */}
        </View>
      </LinearGradient>

      {/* FILTERS */}
      <View style={styles.filterBox}>
        <TouchableOpacity
          style={styles.filterHeader}
          onPress={() => setShowFilters(!showFilters)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="filter" size={18} color="#4F46E5" />
            <Text style={styles.filterTitle}>Search & Filter</Text>
          </View>
          <Icon name={showFilters ? 'chevron-up' : 'chevron-down'} size={18} />
        </TouchableOpacity>

        {showFilters && (
          <View style={styles.searchBox}>
            <Icon name="search" size={18} color="#9CA3AF" />
            <TextInput
              placeholder="Search property..."
              value={searchText}
              onChangeText={setSearchText}
              style={styles.searchInput}
            />
          </View>
        )}
      </View>

      {/* CONTENT */}
      {error ? (
        renderError()
      ) : filteredProperties.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={filteredProperties}
          renderItem={renderProperty}
          keyExtractor={item => (item.id || item._id || Math.random()).toString()}
          numColumns={2}
          contentContainerStyle={{ padding: 8 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#4F46E5']}
              tintColor="#4F46E5"
            />
          }
        />
      )}

      {/* POST PROPERTY MODAL */}
      <Modal
        visible={showPostModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPostModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Post New Property</Text>
              <TouchableOpacity onPress={() => setShowPostModal(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Location */}
              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Location</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.location}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
                    placeholder="Enter location"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Area (sq ft)</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.areaInSqFt}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, areaInSqFt: text }))}
                    placeholder="Enter area"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Price and Contact */}
              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Price</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.price}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, price: text }))}
                    placeholder="Enter price"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Contact Number</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.contactNumber}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, contactNumber: text }))}
                    placeholder="Enter contact"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Availability and Purpose */}
              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Availability</Text>
                  <View style={styles.pickerContainer}>
                    <TextInput
                      style={styles.picker}
                      value={formData.availability}
                      editable={false}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Purpose</Text>
                  <View style={styles.pickerContainer}>
                    <TextInput
                      style={styles.picker}
                      value={formData.purpose}
                      editable={false}
                    />
                  </View>
                </View>
              </View>

              {/* Property Type and Commercial Type */}
              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Property Type</Text>
                  <View style={styles.pickerContainer}>
                    <TextInput
                      style={styles.picker}
                      value={formData.propertyType}
                      editable={false}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Commercial Type</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={formData.commercialType}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, commercialType: value }))}
                      style={styles.picker}
                    >
                      <Picker.Item label="Office" value="office" />
                      <Picker.Item label="Shop" value="shop" />
                      <Picker.Item label="Warehouse" value="warehouse" />
                    </Picker>
                  </View>
                </View>
              </View>

              {/* Bedrooms and Bathrooms */}
              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Bedrooms</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.bedrooms}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, bedrooms: text }))}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Bathrooms</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.bathrooms}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, bathrooms: text }))}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Floor Number and Total Floors */}
              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Floor Number</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.floorNumber}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, floorNumber: text }))}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Total Floors</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.totalFloors}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, totalFloors: text }))}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Furnishing and Parking */}
              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Furnishing</Text>
                  <View style={styles.pickerContainer}>
                    <TextInput
                      style={styles.picker}
                      value={formData.furnishing}
                      editable={false}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Parking</Text>
                  <View style={styles.pickerContainer}>
                    <TextInput
                      style={styles.picker}
                      value={formData.parking}
                      editable={false}
                    />
                  </View>
                </View>
              </View>

              {/* Facing Direction */}
              <View style={styles.formGroupFull}>
                <Text style={styles.label}>Facing Direction</Text>
                <View style={styles.pickerContainer}>
                  <TextInput
                    style={styles.picker}
                    value={formData.facingDirection}
                    editable={false}
                  />
                </View>
              </View>

              {/* Photo/Video Upload */}
              <View style={styles.formGroupFull}>
                <Text style={styles.label}>Photo/Video</Text>
                <TouchableOpacity style={styles.uploadButton} onPress={handlePickFiles}>
                  <Icon name="cloud-upload-outline" size={20} color="#6366F1" />
                  <Text style={styles.uploadButtonText}>
                    {formData.photosAndVideo.length > 0
                      ? `${formData.photosAndVideo.length} file(s) selected`
                      : 'Choose Photos/Videos'}
                  </Text>
                </TouchableOpacity>

                {/* Show Selected Files */}
                {formData.photosAndVideo.length > 0 && (
                  <ScrollView horizontal style={styles.selectedFilesContainer}>
                    {formData.photosAndVideo.map((file, index) => (
                      <View key={index} style={styles.selectedFile}>
                        <Image
                          source={{ uri: file.uri }}
                          style={styles.selectedFileImage}
                          resizeMode="cover"
                        />
                        <TouchableOpacity
                          style={styles.removeFileButton}
                          onPress={() => {
                            setFormData(prev => ({
                              ...prev,
                              photosAndVideo: prev.photosAndVideo.filter((_, i) => i !== index)
                            }));
                          }}
                        >
                          <Icon name="close-circle" size={20} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>

              {/* Description */}
              <View style={styles.formGroupFull}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={styles.textArea}
                  value={formData.description}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                  placeholder="Enter property description"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {/* Buttons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowPostModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.postButton}
                  onPress={handlePostProperty}
                >
                  <Text style={styles.postButtonText}>Post Property</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },

  header: {
    width: '100%',
    alignSelf: 'stretch',
    paddingHorizontal: 0,
    paddingTop: Platform.OS === 'ios' ? 10 : (StatusBar.currentHeight || 0) + 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },

  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },

  headerSub: {
    color: '#E0E7FF',
    fontSize: 12,
  },

  addBtn: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginTop: 8,
    marginHorizontal: 12,
    alignSelf: 'stretch',
  },

  addText: {
    color: '#000',
    marginLeft: 4,
    fontSize: 13,
  },

  statsRow: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 8,
    width: '100%',
    paddingHorizontal: 12,
  },

  statBox: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  statNum: {
    color: '#000',
    fontSize: 20,
    fontWeight: '700',
  },

  statLabel: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  filterBox: {
    backgroundColor: '#fff',
    margin: 12,
    borderRadius: 14,
    padding: 12,
    elevation: 2,
  },

  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  filterTitle: {
    marginLeft: 6,
    fontWeight: '600',
    color: '#4F46E5',
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  searchInput: {
    flex: 1,
    paddingVertical: 8,
    marginLeft: 6,
  },

  card: {
    width: (width - 32) / 2,
    backgroundColor: '#fff',
    borderRadius: 14,
    margin: 6,
    elevation: 3,
    overflow: 'hidden',
  },

  cardImage: {
    height: 110,
    width: '100%',
  },

  placeholderImage: {
    height: 110,
    width: '100%',
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  placeholderText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    fontWeight: '500',
  },

  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },

  statusBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 1,
  },

  statusText: {
    fontSize: 8,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  quickActions: {
    flexDirection: 'row',
    marginTop: 12,
    marginHorizontal: 12,
    alignSelf: 'stretch',
    gap: 8,
  },

  actionButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    borderRadius: 8,
  },

  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F46E5',
    marginLeft: 4,
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

  cardBody: {
    padding: 10,
  },

  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },

  cardType: {
    fontSize: 11,
    color: '#6B7280',
    marginVertical: 4,
  },

  cardMeta: {
    fontSize: 11,
    color: '#374151',
  },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },

  postedText: {
    fontSize: 10,
    color: '#9CA3AF',
  },

  sellBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },

  sellText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },

  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 12,
    padding: 12,
    borderRadius: 14,
    elevation: 2,
  },

  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  pageInfo: {
    fontSize: 12,
    color: '#6B7280',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '85%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  modalContent: {
    padding: 20,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  formGroup: {
    flex: 1,
  },
  formGroupFull: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fff',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  picker: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  fileButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
  },
  fileButtonText: {
    fontSize: 14,
    color: '#6B7280',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    height: 100,
    backgroundColor: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
    marginBottom: 10,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  postButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#6366F1',
  },
  postButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#6366F1',
    borderRadius: 8,
    borderStyle: 'dashed',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#F0F9FF',
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6366F1',
  },
  selectedFilesContainer: {
    marginTop: 12,
    maxHeight: 120,
  },
  selectedFile: {
    position: 'relative',
    marginRight: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  selectedFileImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  removeFileButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
});

export default PropertyManagementScreen;
