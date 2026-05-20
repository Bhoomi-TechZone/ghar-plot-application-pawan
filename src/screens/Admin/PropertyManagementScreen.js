import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TextInput, 
  FlatList,
  Dimensions 
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');

const PropertyManagementScreen = ({ navigation }) => {
  const [searchText, setSearchText] = useState('');
  const [propertyType, setPropertyType] = useState('All Types');
  const [category, setCategory] = useState('All Categories');

  // Sample property data
  const properties = [
    {
      id: 1,
      title: 'Sector 62, Noida, Uttar Pradesh',
      type: 'Commercial • office • Ready to Move',
      area: '2000 sqft',
      price: '₹15,00,000',
      posted: '2 weeks ago',
    },
    {
      id: 2,
      title: 'Sector 59, Noida, Uttar Pradesh',
      type: 'Commercial • office • Ready to Move',
      area: '2000 sqft',
      price: '₹15,00,000',
      posted: '2 weeks ago',
    },
    {
      id: 3,
      title: 'delhi, Uttar Pradesh',
      type: 'Commercial • office • Ready to Move',
      area: '2000 sqft',
      price: '₹15,00,000',
      posted: '2 weeks ago',
    },
    {
      id: 4,
      title: 'greater noida, Uttar Pradesh',
      type: 'Commercial • office • Ready to Move',
      area: '2000 sqft',
      price: '₹15,00,000',
      posted: '2 weeks ago',
    },
    {
      id: 5,
      title: 'faridabad, Uttar Pradesh',
      type: 'Commercial • office • Ready to Move',
      area: '2000 sqft',
      price: '₹15,00,000',
      posted: '2 weeks ago',
    },
    {
      id: 6,
      title: 'gjewd',
      type: 'Commercial • office • Ready to Move',
      area: '314 sqft',
      price: '₹13',
      posted: '1 week ago',
    },
  ];

  const renderProperty = ({ item, index }) => (
    <View style={styles.propertyCard}>
      <View style={styles.propertyImageContainer}>
        <View style={styles.placeholderImage}>
          <MaterialIcons name="home" size={40} color="#9CA3AF" />
        </View>
      </View>
      <View style={styles.propertyInfo}>
        <Text style={styles.propertyTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.propertyType} numberOfLines={1}>{item.type}</Text>
        <Text style={styles.propertyDetails}>Area: {item.area} • Price: {item.price}</Text>
        <View style={styles.propertyFooter}>
          <Text style={styles.postedTime}>Posted: {item.posted}</Text>
          <TouchableOpacity style={styles.sellButton}>
            <Text style={styles.sellButtonText}>Sell</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Gradient Header */}
      <LinearGradient
        colors={['#8B5CF6', '#3B82F6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradientHeader}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>Property Management</Text>
              <Text style={styles.headerSubtitle}>Manage and oversee all property listings</Text>
            </View>
            <TouchableOpacity style={styles.postButton}>
              <MaterialIcons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.postButtonText}>Post Property</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>30</Text>
              <Text style={styles.statLabel}>TOTAL PROPERTIES</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>14</Text>
              <Text style={styles.statLabel}>RESIDENTIAL</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>16</Text>
              <Text style={styles.statLabel}>COMMERCIAL</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Filter Section */}
      <View style={styles.filterSection}>
        <View style={styles.filterHeader}>
          <View style={styles.filterTitleContainer}>
            <MaterialIcons name="filter-list" size={20} color="#374151" />
            <Text style={styles.filterTitle}>Filter Properties</Text>
          </View>
          <Text style={styles.showingText}>Showing 30 of 30 properties</Text>
        </View>
        
        <View style={styles.filterContent}>
          <View style={styles.searchContainer}>
            <Text style={styles.filterLabel}>Search</Text>
            <View style={styles.searchInputContainer}>
              <MaterialIcons name="search" size={20} color="#9CA3AF" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by location or purpose..."
                value={searchText}
                onChangeText={setSearchText}
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          <View style={styles.filterRow}>
            <View style={styles.filterDropdownContainer}>
              <Text style={styles.filterLabel}>Property Type</Text>
              <TouchableOpacity style={styles.filterDropdown}>
                <Text style={styles.filterDropdownText}>{propertyType}</Text>
                <MaterialIcons name="keyboard-arrow-down" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.filterDropdownContainer}>
              <Text style={styles.filterLabel}>Category</Text>
              <TouchableOpacity style={styles.filterDropdown}>
                <Text style={styles.filterDropdownText}>{category}</Text>
                <MaterialIcons name="keyboard-arrow-down" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Properties List */}
      <View style={styles.propertiesSection}>
        <View style={styles.propertiesHeader}>
          <Text style={styles.propertiesStatus}>Showing 1 to 12 of 30 properties</Text>
          <Text style={styles.pageInfo}>Page 1 of 3</Text>
        </View>
        
        <FlatList
          data={properties}
          renderItem={renderProperty}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={styles.propertyRow}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  
  // Gradient Header Styles
  gradientHeader: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
  headerContent: {
    flex: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
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
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  postButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#E0E7FF',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  
  // Filter Section Styles
  filterSection: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  showingText: {
    fontSize: 12,
    color: '#6B7280',
  },
  filterContent: {
    gap: 16,
  },
  searchContainer: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#374151',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
  },
  filterDropdownContainer: {
    flex: 1,
    gap: 8,
  },
  filterDropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterDropdownText: {
    fontSize: 14,
    color: '#374151',
  },
  
  // Properties Section Styles
  propertiesSection: {
    flex: 1,
    paddingHorizontal: 16,
  },
  propertiesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  propertiesStatus: {
    fontSize: 12,
    color: '#6B7280',
  },
  pageInfo: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  propertiesGrid: {
    paddingBottom: 20,
  },
  propertyRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  
  // Property Card Styles
  propertyCard: {
    width: (width - 48) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  propertyImageContainer: {
    height: 120,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  placeholderImage: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  propertyInfo: {
    padding: 12,
  },
  propertyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
    lineHeight: 16,
  },
  propertyType: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 14,
  },
  propertyDetails: {
    fontSize: 11,
    color: '#374151',
    marginBottom: 8,
    fontWeight: '500',
  },
  propertyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postedTime: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  sellButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sellButtonText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default PropertyManagementScreen;