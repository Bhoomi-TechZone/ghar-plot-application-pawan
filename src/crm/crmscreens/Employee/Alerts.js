import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CrossPlatformAlert from '../../../utils/crossPlatformAlert';

const API_BASE_URL = 'https://gharplotbackend.gntechnology.de';

const EmployeeAlertsScreen = ({ navigation }) => {
  const [alerts, setAlerts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredAlerts, setFilteredAlerts] = useState([]);

  useEffect(() => {
    fetchAlerts();
  }, []);

  // Refresh when coming back from CreateAlert screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchAlerts();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchAlerts = async () => {
    try {
      const token = await AsyncStorage.getItem('employee_token');
      const response = await fetch(`${API_BASE_URL}/api/alerts/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      const result = await response.json();
      console.log('🔔 Alerts Response:', result);

      if (result.success) {
        const alertsData = result.alerts || result.data || [];
        setAlerts(alertsData);
        setFilteredAlerts(alertsData);
      } else {
        setAlerts([]);
        setFilteredAlerts([]);
      }
    } catch (error) {
      console.error('❌ Alerts fetch error:', error);
      CrossPlatformAlert.alert('Error', 'Failed to load alerts');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAlerts();
    setRefreshing(false);
  };

  const applyFilter = () => {
    let filtered = alerts;

    // Apply search filter by title
    if (searchQuery.trim()) {
      filtered = filtered.filter(alert =>
        alert.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.reason?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply date range filter
    if (startDate && endDate) {
      filtered = filtered.filter(alert => alert.date >= startDate && alert.date <= endDate);
    }

    setFilteredAlerts(filtered);
  };

  const clearFilter = () => {
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    setFilteredAlerts(alerts);
  };

  const deleteAlert = async (alertId) => {
    try {
      const token = await AsyncStorage.getItem('crm_token') ||
        await AsyncStorage.getItem('employee_token') ||
        await AsyncStorage.getItem('authToken');

      const response = await fetch(`${API_BASE_URL}/api/alerts/${alertId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      const result = await response.json();

      if (result.success) {
        CrossPlatformAlert.alert('Success', 'Alert deleted successfully');
        fetchAlerts(); // Refresh list
      } else {
        CrossPlatformAlert.alert('Error', result.message || 'Failed to delete alert');
      }
    } catch (error) {
      console.error('❌ Delete alert error:', error);
      CrossPlatformAlert.alert('Error', 'Failed to delete alert');
    }
  };

  const createAlert = () => {
    console.log('🔔 Navigating to CreateAlert screen');
    navigation.navigate('CreateAlert');
  };

  const renderAlertRow = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.dateText}>{item.date}</Text>
        <Text style={styles.timeText}>{item.time}</Text>
      </View>

      <Text style={styles.reasonText}>{item.title || item.reason}</Text>
      {item.title && <Text style={styles.descriptionText}>{item.reason}</Text>}

      <View style={styles.rowBetween}>
        <Text style={styles.repeatText}>
          Repeat: {(() => {
            if (item.repeatFrequency && item.repeatFrequency !== 'none') {
              const freq = item.repeatFrequency.charAt(0).toUpperCase() + item.repeatFrequency.slice(1);
              if (item.repeatFrequency === 'custom' && item.customRepeatMinutes) {
                return `${item.customRepeatMinutes} mins`;
              }
              return freq;
            }
            return item.repeatDaily ? 'Daily' : 'Once';
          })()}
        </Text>

        <Text
          style={[
            styles.statusBadge,
            item.isActive ? styles.activeBadge : styles.pendingBadge,
          ]}
        >
          {item.isActive ? 'Active' : 'Inactive'}
        </Text>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => {
            console.log('📝 Editing alert:', item._id);
            navigation.navigate('EditAlert', {
              alertId: item._id,
              originalTitle: item.title,
              originalReason: item.reason,
              originalDate: item.date,
              originalTime: item.time,
              repeatDaily: item.repeatDaily
            });
          }}
        >
          <Icon name="create-outline" size={18} color="#3b82f6" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => {
            CrossPlatformAlert.alert(
              'Delete Alert',
              'Are you sure you want to delete this alert?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => deleteAlert(item._id)
                }
              ]
            );
          }}
        >
          <Icon name="trash-outline" size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Alert Management</Text>

          <TouchableOpacity style={styles.createButton} onPress={createAlert}>
            <Icon name="add" size={20} color="#fff" />
            <Text style={styles.createButtonText}>Create</Text>
          </TouchableOpacity>
        </View>

        {/* Search Box */}
        <View style={styles.searchBox}>
          <Icon name="search-outline" size={20} color="#6b7280" style={styles.searchIcon} />
          <TextInput
            placeholder="Search by title or reason..."
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              // Real-time search
              let filtered = alerts;
              if (text.trim()) {
                filtered = filtered.filter(alert =>
                  alert.title?.toLowerCase().includes(text.toLowerCase()) ||
                  alert.reason?.toLowerCase().includes(text.toLowerCase())
                );
              }
              // Apply date filter if exists
              if (startDate && endDate) {
                filtered = filtered.filter(alert => alert.date >= startDate && alert.date <= endDate);
              }
              setFilteredAlerts(filtered);
            }}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => {
              setSearchQuery('');
              setFilteredAlerts(alerts);
            }}>
              <Icon name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filters Box */}
        <View style={styles.filterBox}>
          <Text style={styles.filterTitle}>Filter by Date</Text>

          <View style={styles.dateRow}>
            <View style={styles.inputBox}>
              <Icon name="calendar-outline" size={18} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                placeholder="Start Date"
                style={styles.input}
                value={startDate}
                onChangeText={setStartDate}
              />
            </View>

            <View style={styles.inputBox}>
              <Icon name="calendar-outline" size={18} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                placeholder="End Date"
                style={styles.input}
                value={endDate}
                onChangeText={setEndDate}
              />
            </View>
          </View>

          <View style={styles.filterBtnRow}>
            <TouchableOpacity style={styles.applyFilterBtn} onPress={applyFilter}>
              <Text style={styles.applyFilterText}>Apply</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.clearFilterBtn} onPress={clearFilter}>
              <Text style={styles.clearFilterText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Alerts List */}
        <FlatList
          data={filteredAlerts}
          renderItem={renderAlertRow}
          keyExtractor={item => item._id || item.id || Math.random().toString()}
          scrollEnabled={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.emptyText}>No alerts found</Text>}
        />
      </ScrollView>
    </View>
  );
};

export default EmployeeAlertsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f6ff' },
  scrollContainer: { flex: 1 },

  header: {
    padding: 20,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
  },

  headerTitle: { fontSize: 22, fontWeight: '700', color: '#1e3a8a' },

  createButton: {
    flexDirection: 'row',
    backgroundColor: '#1e40af',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    gap: 4,
  },

  createButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  searchBox: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },

  searchIcon: {
    marginRight: 10,
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1f2937',
    padding: 0,
  },

  filterBox: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },

  filterTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10, color: '#1e40af' },

  dateRow: { flexDirection: 'row', gap: 10 },

  inputBox: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  input: { flex: 1, fontSize: 14, color: '#374151', paddingVertical: 10 },

  inputIcon: { marginRight: 6 },

  filterBtnRow: { flexDirection: 'row', marginTop: 12, gap: 10 },

  applyFilterBtn: {
    flex: 1,
    backgroundColor: '#1e40af',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },

  applyFilterText: { color: '#fff', fontWeight: '600' },

  clearFilterBtn: {
    flex: 1,
    backgroundColor: '#ef4444',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },

  clearFilterText: { color: '#fff', fontWeight: '600' },

  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },

  rowBetween: { flexDirection: 'row', justifyContent: 'space-between' },

  dateText: { fontSize: 14, fontWeight: '600', color: '#1f2937' },

  timeText: { fontSize: 14, color: '#6b7280' },

  reasonText: {
    marginVertical: 10,
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },

  descriptionText: {
    marginTop: -5,
    marginBottom: 10,
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },

  repeatText: { color: '#6b7280', fontSize: 13 },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '700',
  },

  activeBadge: { backgroundColor: '#dcfce7', color: '#16a34a' },

  pendingBadge: { backgroundColor: '#fef3c7', color: '#d97706' },

  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 14,
  },

  iconBtn: { padding: 4 },

  emptyText: {
    textAlign: 'center',
    padding: 30,
    color: '#9ca3af',
    fontSize: 14,
  },
});
