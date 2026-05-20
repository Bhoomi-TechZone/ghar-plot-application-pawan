/**
 * Customer List Screen
 * Main screen showing all customers with search and filters
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useCustomerStore } from '../store';
import { CustomerCard } from '../components';
import { CaseStatus, CustomerSource } from '../models/Customer';

const CustomerListScreen = ({ navigation }) => {
  const {
    customers,
    loading,
    pagination,
    searchQuery,
    filters,
    setSearchQuery,
    setFilters,
    fetchCustomers,
    toggleFavorite,
  } = useCustomerStore();

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [refreshing, setRefreshing] = useState(false);

  // Initial load
  useEffect(() => {
    console.log('🔄 CustomerListScreen mounted, fetching customers...');
    fetchCustomers();
  }, []);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 CustomerListScreen focused - refreshing customers');
      fetchCustomers(1);
    }, [])
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearch);
      fetchCustomers(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [localSearch]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCustomers(1);
    setRefreshing(false);
  }, []);

  const handleLoadMore = () => {
    if (!loading && pagination.page < pagination.totalPages) {
      fetchCustomers(pagination.page + 1);
    }
  };

  const handleCustomerPress = (customer) => {
    navigation.navigate('CustomerDetail', { customerId: customer.id });
  };

  const handleFavoritePress = async (customerId) => {
    try {
      await toggleFavorite(customerId);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Customers</Text>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('AddCustomer')}
      >
        <Text style={styles.addButtonText}>+ Add</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search by name, phone, email..."
        value={localSearch}
        onChangeText={setLocalSearch}
      />
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <TouchableOpacity
        style={[styles.filterChip, filters.status === CaseStatus.OPEN && styles.filterChipActive]}
        onPress={() => setFilters({ status: filters.status === CaseStatus.OPEN ? null : CaseStatus.OPEN })}
      >
        <Text style={[styles.filterText, filters.status === CaseStatus.OPEN && styles.filterTextActive]}>
          Open
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.filterChip, filters.status === CaseStatus.CLOSE && styles.filterChipActive]}
        onPress={() => setFilters({ status: filters.status === CaseStatus.CLOSE ? null : CaseStatus.CLOSE })}
      >
        <Text style={[styles.filterText, filters.status === CaseStatus.CLOSE && styles.filterTextActive]}>
          Closed
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.filterChip, filters.status === CaseStatus.NOT_INTERESTED && styles.filterChipActive]}
        onPress={() => setFilters({ status: filters.status === CaseStatus.NOT_INTERESTED ? null : CaseStatus.NOT_INTERESTED })}
      >
        <Text style={[styles.filterText, filters.status === CaseStatus.NOT_INTERESTED && styles.filterTextActive]}>
          Not Interested
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        {loading ? 'Loading customers...' : 'No customers found'}
      </Text>
      {!loading && (
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => navigation.navigate('AddCustomer')}
        >
          <Text style={styles.emptyButtonText}>Add First Customer</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#2196F3" />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {console.log('🎯 CustomerListScreen rendering - customers:', customers?.length, 'loading:', loading)}
      <FlatList
        data={customers || []}
        keyExtractor={(item) => (item?.id ? item.id.toString() : Math.random().toString())}
        renderItem={({ item }) => {
          if (!item) return null;
          return (
            <CustomerCard
              customer={item}
              onPress={() => handleCustomerPress(item)}
              onFavoritePress={() => handleFavoritePress(item.id)}
            />
          );
        }}
        ListHeaderComponent={() => (
          <>
            {renderHeader()}
            {renderSearchBar()}
            {renderFilters()}
          </>
        )}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  listContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  filtersContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterChipActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footerLoader: {
    paddingVertical: 20,
  },
});

export default CustomerListScreen;
