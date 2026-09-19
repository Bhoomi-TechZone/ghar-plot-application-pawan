/**
 * Admin Bought Properties Screen
 * Comprehensive management screen for tracking all purchased properties
 * Features: Statistics Dashboard, Property Listing, Search/Filter, Pagination, Image Gallery
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  FlatList,
  Image,
  ActivityIndicator,
  Dimensions,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import CrossPlatformAlert from '../../../utils/crossPlatformAlert';

const { width, height } = Dimensions.get('window');

const BoughtPropertyScreen = () => {
  const navigation = useNavigation();

  // Main Data States
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // Modal States
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Constants
  const API_BASE_URL = 'https://ghar-plot-backend1.onrender.com';

  // Authentication Helper
  const getAuthHeaders = async () => {
    const adminToken = await AsyncStorage.getItem('adminToken');
    if (!adminToken) {
      CrossPlatformAlert.alert('Error', 'Admin authentication required');
      navigation.goBack();
      return null;
    }
    return {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    };
  };

  // Fetch Bought Properties
  const fetchBoughtProperties = async () => {
    try {
      setLoading(true);
      setError(null);
      const headers = await getAuthHeaders();
      if (!headers) return;

      console.log('🏠 Fetching all bought properties...');

      const response = await fetch(
        `${API_BASE_URL}/api/properties/all-bought-properties`,
        {
          method: 'GET',
          headers
        }
      );

      const data = await response.json();
      console.log('✅ Bought Properties Response:', data);

      if (data.success && data.data) {
        setProperties(data.data);
        console.log(`📊 Loaded ${data.data.length} bought properties`);
      } else {
        setError('Failed to fetch bought properties');
      }
    } catch (err) {
      console.error('❌ Error fetching bought properties:', err);
      setError(err.message || 'Failed to load properties');
      CrossPlatformAlert.alert('Error', 'Failed to fetch bought properties: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter Logic
  const filteredProperties = properties.filter((item) => {
    const property = item.propertyId;
    if (!property) return false;

    // Search filter
    const matchesSearch =
      property.propertyLocation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.residentialType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.commercialType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.propertyType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.userId?.fullName?.toLowerCase().includes(searchTerm.toLowerCase());

    // Category filter
    const matchesType = filterType === 'All' || property.propertyType === filterType;

    return matchesSearch && matchesType;
  });

  // Pagination Calculations
  const totalPages = Math.ceil(filteredProperties.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentProperties = filteredProperties.slice(startIndex, startIndex + itemsPerPage);

  // Statistics Calculations
  const totalBought = properties.length;
  const totalRevenue = properties.reduce((sum, item) =>
    sum + (item.propertyId?.price || 0), 0
  );
  const residentialCount = properties.filter(item =>
    item.propertyId?.propertyType === 'Residential'
  ).length;
  const commercialCount = properties.filter(item =>
    item.propertyId?.propertyType === 'Commercial'
  ).length;
  const soldCount = properties.filter(item =>
    item.propertyId?.isSold === true
  ).length;

  // Utility Functions
  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
    return `${API_BASE_URL}/${cleanPath}`;
  };

  const openDetailsModal = (property) => {
    setSelectedProperty(property);
    setCurrentImageIndex(0);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedProperty(null);
    setCurrentImageIndex(0);
  };

  const nextImage = () => {
    if (selectedProperty?.propertyId?.photosAndVideo) {
      setCurrentImageIndex((prev) =>
        prev === selectedProperty.propertyId.photosAndVideo.length - 1
          ? 0
          : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (selectedProperty?.propertyId?.photosAndVideo) {
      setCurrentImageIndex((prev) =>
        prev === 0
          ? selectedProperty.propertyId.photosAndVideo.length - 1
          : prev - 1
      );
    }
  };

  // Effects
  useEffect(() => {
    fetchBoughtProperties();
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType]);

  // Refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBoughtProperties();
    setRefreshing(false);
  }, []);

  // Component Renders
  const renderStatCard = ({ title, value, subtitle, icon, iconFamily, color, gradient }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statCardHeader}>
        {iconFamily === 'MaterialCommunityIcons' ? (
          <MaterialCommunityIcons name={icon} size={28} color={color} />
        ) : (
          <Icon name={icon} size={28} color={color} />
        )}
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  const renderPropertyCard = ({ item }) => {
    const property = item.propertyId;
    const buyer = item.userId;

    if (!property) return null;

    const propertyType = property.propertyType || 'Unknown';
    const isResidential = propertyType === 'Residential';
    const cardColor = isResidential ? '#4299e1' : '#ed8936';

    return (
      <TouchableOpacity
        style={styles.propertyCard}
        onPress={() => openDetailsModal(item)}
        activeOpacity={0.7}
      >
        {/* Property Image */}
        <View style={[styles.propertyImageContainer, { backgroundColor: cardColor }]}>
          {property.photosAndVideo && property.photosAndVideo.length > 0 ? (
            <Image
              source={{ uri: getImageUrl(property.photosAndVideo[0]) }}
              style={styles.propertyImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.noImageContainer}>
              <Icon name="image" size={48} color="#fff" />
              <Text style={styles.noImageText}>No Image</Text>
            </View>
          )}

          {/* Property Type Badge */}
          <View style={[styles.propertyTypeBadge, { backgroundColor: cardColor }]}>
            <Text style={styles.propertyTypeText}>{propertyType}</Text>
          </View>

          {/* Sold Badge */}
          {property.isSold && (
            <View style={styles.soldBadge}>
              <Text style={styles.soldBadgeText}>✅ SOLD</Text>
            </View>
          )}
        </View>

        {/* Property Details */}
        <View style={styles.propertyDetails}>
          {/* Price */}
          <Text style={styles.propertyPrice}>{formatCurrency(property.price)}</Text>

          {/* Location */}
          <View style={styles.propertyInfoRow}>
            <Icon name="location-on" size={16} color="#e53e3e" />
            <Text style={styles.propertyInfoText} numberOfLines={1}>
              {property.propertyLocation || 'Location N/A'}
            </Text>
          </View>

          {/* Type */}
          <View style={styles.propertyInfoRow}>
            <Icon name="business" size={16} color="#667eea" />
            <Text style={styles.propertyInfoText} numberOfLines={1}>
              {property.residentialType || property.commercialType || 'Type N/A'}
            </Text>
          </View>

          {/* Purchase Date */}
          <View style={styles.propertyInfoRow}>
            <Icon name="event" size={16} color="#805ad5" />
            <Text style={styles.propertyInfoText}>
              {formatDate(item.createdAt)}
            </Text>
          </View>

          {/* Area */}
          <View style={styles.propertyInfoRow}>
            <Icon name="square-foot" size={16} color="#38a169" />
            <Text style={styles.propertyInfoText}>
              {property.areaDetails ? `${property.areaDetails} sqft` : 'Area N/A'}
            </Text>
          </View>

          {/* Buyer Name */}
          <View style={styles.propertyInfoRow}>
            <Icon name="person" size={16} color="#4299e1" />
            <Text style={styles.propertyInfoText} numberOfLines={1}>
              Buyer: {buyer?.fullName || 'N/A'}
            </Text>
          </View>

          {/* View Details Button */}
          <TouchableOpacity
            style={styles.viewDetailsButton}
            onPress={() => openDetailsModal(item)}
          >
            <Text style={styles.viewDetailsText}>View Details</Text>
            <Icon name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPropertyDetailsModal = () => {
    if (!selectedProperty) return null;

    const property = selectedProperty.propertyId;
    const buyer = selectedProperty.userId;
    const seller = property?.userId;
    const images = property?.photosAndVideo || [];

    return (
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>🏠 Property Details</Text>
              <Text style={styles.modalSubtitle}>
                {property?.propertyLocation || 'Location N/A'}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
              <Icon name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Image Gallery */}
            {images.length > 0 && (
              <View style={styles.imageGallerySection}>
                <Text style={styles.sectionTitle}>
                  📷 Property Gallery ({currentImageIndex + 1} / {images.length})
                </Text>

                {/* Main Image */}
                <View style={styles.mainImageContainer}>
                  <Image
                    source={{ uri: getImageUrl(images[currentImageIndex]) }}
                    style={styles.mainImage}
                    resizeMode="cover"
                  />

                  {/* Navigation Arrows */}
                  {images.length > 1 && (
                    <>
                      <TouchableOpacity
                        style={[styles.imageNavButton, styles.prevButton]}
                        onPress={prevImage}
                      >
                        <Icon name="chevron-left" size={32} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.imageNavButton, styles.nextButton]}
                        onPress={nextImage}
                      >
                        <Icon name="chevron-right" size={32} color="#fff" />
                      </TouchableOpacity>
                    </>
                  )}
                </View>

                {/* Thumbnails */}
                {images.length > 1 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.thumbnailScroll}
                  >
                    {images.map((img, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => setCurrentImageIndex(index)}
                      >
                        <Image
                          source={{ uri: getImageUrl(img) }}
                          style={[
                            styles.thumbnail,
                            currentImageIndex === index && styles.activeThumbnail
                          ]}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            )}

            {/* Property Information */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>🏢 Property Information</Text>
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Icon name="location-on" size={20} color="#e53e3e" />
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>Location</Text>
                    <Text style={styles.infoValue}>{property?.propertyLocation || 'N/A'}</Text>
                  </View>
                </View>

                <View style={styles.infoItem}>
                  <Icon name="business" size={20} color="#667eea" />
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>Type</Text>
                    <Text style={styles.infoValue}>{property?.propertyType || 'N/A'}</Text>
                  </View>
                </View>

                <View style={styles.infoItem}>
                  <Icon name="home" size={20} color="#38a169" />
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>Category</Text>
                    <Text style={styles.infoValue}>
                      {property?.residentialType || property?.commercialType || 'N/A'}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoItem}>
                  <MaterialCommunityIcons name="currency-inr" size={20} color="#d69e2e" />
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>Price</Text>
                    <Text style={styles.infoValue}>{formatCurrency(property?.price)}</Text>
                  </View>
                </View>

                <View style={styles.infoItem}>
                  <Icon name="square-foot" size={20} color="#805ad5" />
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>Area</Text>
                    <Text style={styles.infoValue}>
                      {property?.areaDetails ? `${property.areaDetails} sqft` : 'N/A'}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoItem}>
                  <Icon name="check-circle" size={20} color="#319795" />
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>Availability</Text>
                    <Text style={styles.infoValue}>{property?.availability || 'N/A'}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Seller Information */}
            {seller && (
              <View style={[styles.infoSection, styles.sellerSection]}>
                <Text style={styles.sectionTitle}>👤 Seller Details</Text>
                <View style={styles.infoGrid}>
                  <View style={styles.infoItem}>
                    <Icon name="person" size={20} color="#4299e1" />
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Name</Text>
                      <Text style={styles.infoValue}>{seller.fullName || 'N/A'}</Text>
                    </View>
                  </View>

                  <View style={styles.infoItem}>
                    <Icon name="email" size={20} color="#38a169" />
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Email</Text>
                      <Text style={styles.infoValue}>{seller.email || 'N/A'}</Text>
                    </View>
                  </View>

                  <View style={styles.infoItem}>
                    <Icon name="phone" size={20} color="#d69e2e" />
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Phone</Text>
                      <Text style={styles.infoValue}>{seller.phone || 'N/A'}</Text>
                    </View>
                  </View>

                  <View style={styles.infoItem}>
                    <Icon name="location-city" size={20} color="#805ad5" />
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Location</Text>
                      <Text style={styles.infoValue}>
                        {seller.city && seller.state ? `${seller.city}, ${seller.state}` : 'N/A'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.infoItem}>
                    <Icon name="event" size={20} color="#805ad5" />
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Posted Date</Text>
                      <Text style={styles.infoValue}>{formatDate(property?.postedDate)}</Text>
                    </View>
                  </View>

                  <View style={styles.infoItem}>
                    <Icon name="visibility" size={20} color="#4299e1" />
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Visit Count</Text>
                      <Text style={styles.infoValue}>{property?.visitCount || 0}</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Buyer Information */}
            {buyer && (
              <View style={[styles.infoSection, styles.buyerSection]}>
                <Text style={styles.sectionTitle}>👤 Buyer Details</Text>
                <View style={styles.infoGrid}>
                  <View style={styles.infoItem}>
                    <Icon name="person" size={20} color="#4299e1" />
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Name</Text>
                      <Text style={styles.infoValue}>{buyer.fullName || 'N/A'}</Text>
                    </View>
                  </View>

                  <View style={styles.infoItem}>
                    <Icon name="email" size={20} color="#38a169" />
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Email</Text>
                      <Text style={styles.infoValue}>{buyer.email || 'N/A'}</Text>
                    </View>
                  </View>

                  <View style={styles.infoItem}>
                    <Icon name="phone" size={20} color="#d69e2e" />
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Phone</Text>
                      <Text style={styles.infoValue}>{buyer.phone || 'N/A'}</Text>
                    </View>
                  </View>

                  <View style={styles.infoItem}>
                    <Icon name="location-city" size={20} color="#805ad5" />
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Location</Text>
                      <Text style={styles.infoValue}>
                        {buyer.city && buyer.state ? `${buyer.city}, ${buyer.state}` : 'N/A'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.infoItem}>
                    <Icon name="event" size={20} color="#805ad5" />
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Purchase Date</Text>
                      <Text style={styles.infoValue}>{formatDate(selectedProperty?.createdAt)}</Text>
                    </View>
                  </View>
                </View>

                {/* Description */}
                {property?.description && (
                  <View style={styles.descriptionContainer}>
                    <Text style={styles.descriptionLabel}>ℹ️ Description:</Text>
                    <Text style={styles.descriptionText}>{property.description}</Text>
                  </View>
                )}

                {/* Sold Status */}
                {property?.isSold && (
                  <View style={styles.soldStatusContainer}>
                    <View style={styles.soldStatusBadge}>
                      <Icon name="check-circle" size={24} color="#38a169" />
                      <Text style={styles.soldStatusText}>✅ PROPERTY SOLD</Text>
                    </View>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>🏠 Bought Properties</Text>
            <Text style={styles.headerSubtitle}>
              Track all purchased properties with analytics
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Statistics Cards */}
        {!loading && !error && (
          <View style={styles.statsContainer}>
            <View style={styles.statsRow}>
              {renderStatCard({
                title: 'Total Bought',
                value: totalBought.toString(),
                subtitle: 'Properties',
                icon: 'people',
                color: '#667eea'
              })}
              {renderStatCard({
                title: 'Total Revenue',
                value: formatCurrency(totalRevenue),
                subtitle: 'Sales Value',
                icon: 'currency-inr',
                iconFamily: 'MaterialCommunityIcons',
                color: '#48bb78'
              })}
            </View>

            <View style={styles.statsRow}>
              {renderStatCard({
                title: 'Residential',
                value: residentialCount.toString(),
                subtitle: 'Properties',
                icon: 'home',
                color: '#4299e1'
              })}
              {renderStatCard({
                title: 'Commercial',
                value: commercialCount.toString(),
                subtitle: 'Properties',
                icon: 'business',
                color: '#ed8936'
              })}
            </View>

            <View style={styles.statsRow}>
              {renderStatCard({
                title: 'Sold',
                value: soldCount.toString(),
                subtitle: 'Properties Resold',
                icon: 'check-circle',
                color: '#9f7aea'
              })}
            </View>
          </View>
        )}

        {/* Filters Section */}
        {!loading && !error && (
          <View style={styles.filtersContainer}>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Icon name="search" size={20} color="#6b7280" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by location, buyer name, or type..."
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
              {searchTerm.length > 0 && (
                <TouchableOpacity onPress={() => setSearchTerm('')}>
                  <Icon name="close" size={20} color="#6b7280" />
                </TouchableOpacity>
              )}
            </View>

            {/* Category Filter */}
            <View style={styles.filterButtonsContainer}>
              {['All', 'Residential', 'Commercial'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.filterButton,
                    filterType === type && styles.filterButtonActive
                  ]}
                  onPress={() => setFilterType(type)}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      filterType === type && styles.filterButtonTextActive
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Loading State */}
        {loading && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.loadingText}>Loading bought properties...</Text>
          </View>
        )}

        {/* Error State */}
        {error && !loading && (
          <View style={styles.centerContainer}>
            <Icon name="error-outline" size={64} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={fetchBoughtProperties}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Properties Grid */}
        {!loading && !error && currentProperties.length > 0 && (
          <View style={styles.propertiesGrid}>
            {currentProperties.map((item) => (
              <View key={item._id} style={styles.propertyCardWrapper}>
                {renderPropertyCard({ item })}
              </View>
            ))}
          </View>
        )}

        {/* Empty State */}
        {!loading && !error && filteredProperties.length === 0 && (
          <View style={styles.centerContainer}>
            <Icon name="home" size={64} color="#9ca3af" />
            <Text style={styles.emptyTitle}>No Bought Properties Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchTerm || filterType !== 'All'
                ? 'No properties match your current filters.'
                : 'No properties have been purchased yet.'}
            </Text>
            {(searchTerm || filterType !== 'All') && (
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={() => {
                  setSearchTerm('');
                  setFilterType('All');
                }}
              >
                <Text style={styles.clearFiltersText}>Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <View style={styles.paginationContainer}>
            <TouchableOpacity
              style={[
                styles.paginationButton,
                currentPage === 1 && styles.paginationButtonDisabled
              ]}
              onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <Icon
                name="chevron-left"
                size={24}
                color={currentPage === 1 ? '#d1d5db' : '#667eea'}
              />
              <Text
                style={[
                  styles.paginationButtonText,
                  currentPage === 1 && styles.paginationButtonTextDisabled
                ]}
              >
                Previous
              </Text>
            </TouchableOpacity>

            <Text style={styles.paginationInfo}>
              Page {currentPage} of {totalPages}
            </Text>

            <TouchableOpacity
              style={[
                styles.paginationButton,
                currentPage === totalPages && styles.paginationButtonDisabled
              ]}
              onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              <Text
                style={[
                  styles.paginationButtonText,
                  currentPage === totalPages && styles.paginationButtonTextDisabled
                ]}
              >
                Next
              </Text>
              <Icon
                name="chevron-right"
                size={24}
                color={currentPage === totalPages ? '#d1d5db' : '#667eea'}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom Padding */}
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Property Details Modal */}
      {renderPropertyDetailsModal()}
    </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: 11,
    color: '#9ca3af',
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#111827',
  },
  filterButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#667eea',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  propertiesGrid: {
    paddingHorizontal: 16,
  },
  propertyCardWrapper: {
    marginBottom: 16,
  },
  propertyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  propertyImageContainer: {
    height: 200,
    position: 'relative',
  },
  propertyImage: {
    width: '100%',
    height: '100%',
  },
  noImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 8,
  },
  propertyTypeBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  propertyTypeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  soldBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#38a169',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  soldBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  propertyDetails: {
    padding: 16,
  },
  propertyPrice: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  propertyInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  propertyInfoText: {
    fontSize: 13,
    color: '#374151',
    marginLeft: 8,
    flex: 1,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#667eea',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  viewDetailsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 6,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 300,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#667eea',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
  clearFiltersButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#667eea',
    borderRadius: 8,
  },
  clearFiltersText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationButtonText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
  paginationButtonTextDisabled: {
    color: '#d1d5db',
  },
  paginationInfo: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    backgroundColor: '#667eea',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#e0e7ff',
    marginTop: 4,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
  },
  imageGallerySection: {
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  mainImageContainer: {
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
    position: 'relative',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  imageNavButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -20 }],
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prevButton: {
    left: 10,
  },
  nextButton: {
    right: 10,
  },
  thumbnailScroll: {
    marginTop: 12,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeThumbnail: {
    borderColor: '#667eea',
  },
  infoSection: {
    padding: 16,
    backgroundColor: '#f8fafc',
    marginTop: 8,
  },
  sellerSection: {
    backgroundColor: '#f0f8ff',
  },
  buyerSection: {
    backgroundColor: '#f0fff4',
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  descriptionContainer: {
    marginTop: 16,
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 20,
  },
  soldStatusContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  soldStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#38a169',
  },
  soldStatusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#38a169',
    marginLeft: 8,
  },
});

export default BoughtPropertyScreen;
