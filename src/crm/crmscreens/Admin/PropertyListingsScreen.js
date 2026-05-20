import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ScrollView,
  Image,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const PROPERTIES_DATA = [
  {
    id: '1',
    title: 'Luxury 3BHK Apartment',
    location: 'Sector 62, Noida',
    price: '₹85 Lacs',
    type: 'Apartment',
    area: '1850 sq.ft',
    bedrooms: 3,
    bathrooms: 2,
    status: 'Active',
    featured: true,
    views: 234,
    inquiries: 12,
    postedBy: 'Rahul Kumar',
    postedDate: '2024-12-10',
    image: 'https://via.placeholder.com/300x200',
  },
  {
    id: '2',
    title: '2BHK Modern Flat',
    location: 'Noida Extension',
    price: '₹45 Lacs',
    type: 'Flat',
    area: '1200 sq.ft',
    bedrooms: 2,
    bathrooms: 2,
    status: 'Active',
    featured: false,
    views: 156,
    inquiries: 8,
    postedBy: 'Priya Patel',
    postedDate: '2024-12-12',
    image: 'https://via.placeholder.com/300x200',
  },
  {
    id: '3',
    title: 'Premium Villa with Garden',
    location: 'Greater Noida West',
    price: '₹1.2 Cr',
    type: 'Villa',
    area: '3500 sq.ft',
    bedrooms: 4,
    bathrooms: 4,
    status: 'Sold',
    featured: true,
    views: 512,
    inquiries: 28,
    postedBy: 'Amit Singh',
    postedDate: '2024-11-25',
    image: 'https://via.placeholder.com/300x200',
  },
  {
    id: '4',
    title: 'Studio Apartment',
    location: 'DLF Cyber City, Gurgaon',
    price: '₹35 Lacs',
    type: 'Studio',
    area: '650 sq.ft',
    bedrooms: 1,
    bathrooms: 1,
    status: 'Pending',
    featured: false,
    views: 89,
    inquiries: 5,
    postedBy: 'Neha Gupta',
    postedDate: '2024-12-14',
    image: 'https://via.placeholder.com/300x200',
  },
  {
    id: '5',
    title: 'Spacious 4BHK Penthouse',
    location: 'South Delhi',
    price: '₹2.5 Cr',
    type: 'Penthouse',
    area: '4200 sq.ft',
    bedrooms: 4,
    bathrooms: 5,
    status: 'Active',
    featured: true,
    views: 678,
    inquiries: 35,
    postedBy: 'Rahul Kumar',
    postedDate: '2024-12-08',
    image: 'https://via.placeholder.com/300x200',
  },
  {
    id: '6',
    title: 'Affordable 1BHK',
    location: 'Faridabad',
    price: '₹28 Lacs',
    type: 'Apartment',
    area: '750 sq.ft',
    bedrooms: 1,
    bathrooms: 1,
    status: 'Active',
    featured: false,
    views: 145,
    inquiries: 9,
    postedBy: 'Priya Patel',
    postedDate: '2024-12-11',
    image: 'https://via.placeholder.com/300x200',
  },
  {
    id: '7',
    title: 'Commercial Office Space',
    location: 'Sector 18, Noida',
    price: '₹75 Lacs',
    type: 'Commercial',
    area: '2000 sq.ft',
    bedrooms: 0,
    bathrooms: 2,
    status: 'Active',
    featured: false,
    views: 298,
    inquiries: 18,
    postedBy: 'Amit Singh',
    postedDate: '2024-12-09',
    image: 'https://via.placeholder.com/300x200',
  },
  {
    id: '8',
    title: '3BHK Independent House',
    location: 'Ghaziabad',
    price: '₹95 Lacs',
    type: 'House',
    area: '2400 sq.ft',
    bedrooms: 3,
    bathrooms: 3,
    status: 'Inactive',
    featured: false,
    views: 67,
    inquiries: 3,
    postedBy: 'Neha Gupta',
    postedDate: '2024-12-01',
    image: 'https://via.placeholder.com/300x200',
  },
];

const PropertyListingsScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [properties] = useState(PROPERTIES_DATA);

  // Helper function to get correct image URL based on property source
  const getPropertyImageUrl = (imageData, isPostedByAdmin) => {
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
  };

  const filteredProperties = properties.filter(property => {
    const matchesSearch = property.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'All' || property.status === filterStatus;
    const matchesType = filterType === 'All' || property.type === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const totalProperties = properties.length;
  const activeProperties = properties.filter(p => p.status === 'Active').length;
  const soldProperties = properties.filter(p => p.status === 'Sold').length;
  const featuredProperties = properties.filter(p => p.featured).length;

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return '#10B981';
      case 'Pending': return '#F59E0B';
      case 'Sold': return '#3B82F6';
      case 'Inactive': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const renderPropertyCard = ({ item }) => (
    <View style={styles.propertyCard}>
      {item.featured && (
        <View style={styles.featuredBadge}>
          <MaterialCommunityIcons name="star" size={14} color="#fff" />
          <Text style={styles.featuredText}>FEATURED</Text>
        </View>
      )}

      <View style={styles.imageContainer}>
        {item.image && getPropertyImageUrl(item.image, item.isPostedByAdmin) ? (
          <Image
            source={{ uri: getPropertyImageUrl(item.image, item.isPostedByAdmin) }}
            style={styles.propertyImage}
            onError={() => console.warn('Failed to load image:', item.image)}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <MaterialCommunityIcons name="home-city" size={48} color="#9CA3AF" />
          </View>
        )}
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.propertyTitle}>{item.title}</Text>
        <View style={styles.locationRow}>
          <MaterialCommunityIcons name="map-marker" size={16} color="#6B7280" />
          <Text style={styles.locationText}>{item.location}</Text>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Price:</Text>
          <Text style={styles.priceValue}>{item.price}</Text>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="bed" size={18} color="#6B7280" />
            <Text style={styles.detailText}>{item.bedrooms} BHK</Text>
          </View>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="shower" size={18} color="#6B7280" />
            <Text style={styles.detailText}>{item.bathrooms} Bath</Text>
          </View>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="arrow-expand-all" size={18} color="#6B7280" />
            <Text style={styles.detailText}>{item.area}</Text>
          </View>
        </View>

        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{item.type}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="eye" size={16} color="#3B82F6" />
            <Text style={styles.statText}>{item.views} views</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="message-alert" size={16} color="#10B981" />
            <Text style={styles.statText}>{item.inquiries} inquiries</Text>
          </View>
        </View>

        <View style={styles.metaInfo}>
          <Text style={styles.metaText}>Posted by: {item.postedBy}</Text>
          <Text style={styles.metaText}>Date: {item.postedDate}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <TouchableOpacity style={styles.editBtn}>
          <MaterialCommunityIcons name="pencil" size={18} color="#3B82F6" />
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.viewBtn}>
          <MaterialCommunityIcons name="eye" size={18} color="#10B981" />
          <Text style={styles.viewBtnText}>View</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn}>
          <MaterialCommunityIcons name="delete" size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Property Listings</Text>
        <TouchableOpacity>
          <MaterialCommunityIcons name="filter-variant" size={24} color="#6366F1" />
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: '#EEF2FF' }]}>
            <MaterialCommunityIcons name="home-group" size={28} color="#6366F1" />
            <Text style={styles.statNumber}>{totalProperties}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#D1FAE5' }]}>
            <MaterialCommunityIcons name="check-circle" size={28} color="#10B981" />
            <Text style={styles.statNumber}>{activeProperties}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#DBEAFE' }]}>
            <MaterialCommunityIcons name="home-variant" size={28} color="#3B82F6" />
            <Text style={styles.statNumber}>{soldProperties}</Text>
            <Text style={styles.statLabel}>Sold</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
            <MaterialCommunityIcons name="star" size={28} color="#F59E0B" />
            <Text style={styles.statNumber}>{featuredProperties}</Text>
            <Text style={styles.statLabel}>Featured</Text>
          </View>
        </View>
      </ScrollView>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by title or location..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {/* Filters */}
      <View style={styles.filtersSection}>
        <Text style={styles.filterTitle}>Status:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterContainer}>
            {['All', 'Active', 'Pending', 'Sold', 'Inactive'].map(filter => (
              <TouchableOpacity
                key={filter}
                style={[styles.filterTab, filterStatus === filter && styles.filterTabActive]}
                onPress={() => setFilterStatus(filter)}
              >
                <Text style={[styles.filterText, filterStatus === filter && styles.filterTextActive]}>
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.filtersSection}>
        <Text style={styles.filterTitle}>Type:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterContainer}>
            {['All', 'Apartment', 'Flat', 'Villa', 'House', 'Penthouse', 'Studio', 'Commercial'].map(filter => (
              <TouchableOpacity
                key={filter}
                style={[styles.filterTab, filterType === filter && styles.filterTabActive]}
                onPress={() => setFilterType(filter)}
              >
                <Text style={[styles.filterText, filterType === filter && styles.filterTextActive]}>
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Property List */}
      <FlatList
        data={filteredProperties}
        keyExtractor={(item) => item.id}
        renderItem={renderPropertyCard}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        numColumns={1}
      />

      {/* Floating Add Button */}
      <TouchableOpacity style={styles.fabButton}>
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </TouchableOpacity>
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
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  statsScroll: {
    maxHeight: 120,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    width: 110,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#111827',
  },
  filtersSection: {
    paddingLeft: 16,
    marginBottom: 8,
  },
  filterTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterTabActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  filterText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  propertyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  featuredBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    zIndex: 10,
    gap: 4,
  },
  featuredText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  imageContainer: {
    position: 'relative',
  },
  propertyImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  cardContent: {
    padding: 16,
  },
  propertyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 13,
    color: '#6B7280',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
  },
  priceValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10B981',
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 13,
    color: '#374151',
  },
  typeBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  typeText: {
    color: '#6366F1',
    fontSize: 12,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#6B7280',
  },
  metaInfo: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: '#F3F4F6',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  cardFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: '#F3F4F6',
    padding: 12,
    gap: 8,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  editBtnText: {
    color: '#3B82F6',
    fontSize: 13,
    fontWeight: '600',
  },
  viewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D1FAE5',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  viewBtnText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '600',
  },
  deleteBtn: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  fabButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
});

export default PropertyListingsScreen;
