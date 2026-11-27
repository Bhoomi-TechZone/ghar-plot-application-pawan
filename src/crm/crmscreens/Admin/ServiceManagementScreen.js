import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  StyleSheet,
  RefreshControl,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import CrossPlatformAlert from '../../../utils/crossPlatformAlert';

const API_BASE_URL = 'https://gharplotbackend.gntechnology.de';

const ServiceManagementScreen = ({ navigation }) => {
  // Main Data States
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'add'
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [showDeleteMainModal, setShowDeleteMainModal] = useState(false);
  const [showDeleteTypeModal, setShowDeleteTypeModal] = useState(false);
  const [showEditTypeModal, setShowEditTypeModal] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  const [serviceTypeToDelete, setServiceTypeToDelete] = useState(null);
  const [serviceTypeToEdit, setServiceTypeToEdit] = useState(null);

  // Form States (Add Service)
  const [mainService, setMainService] = useState('');
  const [typeName, setTypeName] = useState('');
  const [adminConfig, setAdminConfig] = useState({
    baseCharges: {
      '1 BHK': 0,
      '2 BHK': 0,
      '3 BHK': 0,
      '4+ BHK': 0,
      'Small (<1000 sq ft)': 0,
      'Medium (1000-3000 sq ft)': 0,
      'Large (>3000 sq ft)': 0,
      'Single Room': 0,
      'Shared Room': 0,
      'Entire Floor': 0,
    },
    distanceRatePerKm: 10,
  });

  // Editing States
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [editingTypeId, setEditingTypeId] = useState(null);

  // Statistics Calculation
  const totalServicesCount = services.length;
  const totalServiceTypesCount = services.reduce(
    (total, service) => total + (service.serviceTypes ? service.serviceTypes.length : 0),
    0
  );

  // Sample Data for Fallback
  const sampleServices = [
    {
      _id: 'sample1',
      mainService: 'Cleaning',
      serviceTypes: [
        {
          _id: 'type1',
          typeName: 'Office',
          adminConfig: {
            baseCharges: {
              '1 BHK': 500,
              '2 BHK': 800,
              '3 BHK': 1200,
              '4+ BHK': 1500,
              'Small (<1000 sq ft)': 600,
              'Medium (1000-3000 sq ft)': 1000,
              'Large (>3000 sq ft)': 1500,
              'Single Room': 400,
              'Shared Room': 300,
              'Entire Floor': 2000,
            },
            distanceRatePerKm: 10,
          },
        },
        {
          _id: 'type2',
          typeName: 'Apartment',
          adminConfig: {
            baseCharges: {
              '1 BHK': 400,
              '2 BHK': 700,
              '3 BHK': 1000,
              '4+ BHK': 1300,
              'Small (<1000 sq ft)': 500,
              'Medium (1000-3000 sq ft)': 800,
              'Large (>3000 sq ft)': 1200,
              'Single Room': 300,
              'Shared Room': 250,
              'Entire Floor': 1800,
            },
            distanceRatePerKm: 8,
          },
        },
      ],
    },
    {
      _id: 'sample2',
      mainService: 'Plumbing',
      serviceTypes: [
        {
          _id: 'type3',
          typeName: 'Residential',
          adminConfig: {
            baseCharges: {
              '1 BHK': 600,
              '2 BHK': 900,
              '3 BHK': 1300,
              '4+ BHK': 1600,
              'Small (<1000 sq ft)': 700,
              'Medium (1000-3000 sq ft)': 1100,
              'Large (>3000 sq ft)': 1600,
              'Single Room': 500,
              'Shared Room': 400,
              'Entire Floor': 2200,
            },
            distanceRatePerKm: 12,
          },
        },
      ],
    },
  ];

  // Utility Functions
  const capitalizeFirstLetter = (string) => {
    if (!string) return string;
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
  };

  const loadSampleData = () => {
    setServices(sampleServices);
  };

  // Fetch Services
  const fetchServices = async () => {
    setLoading(true);
    setError(null);
    try {
      const keys = ['crm_auth_token', 'adminToken', 'admin_token', 'crm_admin_token'];
      let token = null;
      for (const k of keys) {
        const t = await AsyncStorage.getItem(k);
        if (t) { token = t; break; }
      }
      const response = await fetch(`${API_BASE_URL}/api/services`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('API endpoint not found or not returning JSON');
      }

      const data = await response.json();
      if (data.success) {
        setServices(data.data);
      } else {
        setServices([]);
      }
    } catch (err) {
      console.error('Error fetching services:', err);
      loadSampleData();
    } finally {
      setLoading(false);
    }
  };

  // Pull to Refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchServices();
    setRefreshing(false);
  }, []);

  // Add Service
  const addService = async () => {
    if (!mainService.trim() || !typeName.trim()) {
      CrossPlatformAlert.alert('Error', 'Main Service and Service Type are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await AsyncStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/services/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mainService: capitalizeFirstLetter(mainService.trim()),
          typeName: capitalizeFirstLetter(typeName.trim()),
          adminConfig,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Reset form
        setMainService('');
        setTypeName('');
        setAdminConfig({
          baseCharges: {
            '1 BHK': 0,
            '2 BHK': 0,
            '3 BHK': 0,
            '4+ BHK': 0,
            'Small (<1000 sq ft)': 0,
            'Medium (1000-3000 sq ft)': 0,
            'Large (>3000 sq ft)': 0,
            'Single Room': 0,
            'Shared Room': 0,
            'Entire Floor': 0,
          },
          distanceRatePerKm: 10,
        });

        CrossPlatformAlert.alert('Success', 'Service added successfully');
        await fetchServices();
      } else {
        setError(data.message || 'Failed to add service');
        CrossPlatformAlert.alert('Error', data.message || 'Failed to add service');
      }
    } catch (err) {
      console.error('Error adding service:', err);
      setError('Error adding service: ' + err.message);
      CrossPlatformAlert.alert('Error', 'Error adding service: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete Main Service
  const openDeleteMainModal = (service) => {
    setServiceToDelete(service);
    setShowDeleteMainModal(true);
  };

  const closeDeleteMainModal = () => {
    setShowDeleteMainModal(false);
    setServiceToDelete(null);
  };

  const confirmDeleteMainService = async () => {
    if (!serviceToDelete) return;

    setLoading(true);
    setError(null);
    closeDeleteMainModal();

    try {
      const token = await AsyncStorage.getItem('adminToken');
      const response = await fetch(
        `${API_BASE_URL}/api/services/delete-main/${serviceToDelete._id}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        CrossPlatformAlert.alert('Success', 'Main service deleted successfully');
        await fetchServices();
      } else {
        setError(data.message || 'Failed to delete service');
        CrossPlatformAlert.alert('Error', data.message || 'Failed to delete service');
      }
    } catch (err) {
      console.error('Error deleting service:', err);
      setError('Error deleting service: ' + err.message);
      CrossPlatformAlert.alert('Error', 'Error deleting service: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete Service Type
  const openDeleteTypeModal = (service, type) => {
    setServiceToDelete(service);
    setServiceTypeToDelete(type);
    setShowDeleteTypeModal(true);
  };

  const closeDeleteTypeModal = () => {
    setShowDeleteTypeModal(false);
    setServiceToDelete(null);
    setServiceTypeToDelete(null);
  };

  const confirmDeleteServiceType = async () => {
    if (!serviceToDelete || !serviceTypeToDelete) return;

    setLoading(true);
    setError(null);
    closeDeleteTypeModal();

    try {
      const token = await AsyncStorage.getItem('adminToken');
      const response = await fetch(
        `${API_BASE_URL}/api/services/delete-type/${serviceToDelete._id}/${serviceTypeToDelete._id}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        CrossPlatformAlert.alert('Success', 'Service type deleted successfully');
        await fetchServices();
      } else {
        setError(data.message || 'Failed to delete service type');
        CrossPlatformAlert.alert('Error', data.message || 'Failed to delete service type');
      }
    } catch (err) {
      console.error('Error deleting service type:', err);
      setError('Error deleting service type: ' + err.message);
      CrossPlatformAlert.alert('Error', 'Error deleting service type: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Edit Service Type
  const openEditTypeModal = (service, type) => {
    setServiceTypeToEdit({ ...type });
    setEditingServiceId(service._id);
    setEditingTypeId(type._id);
    setTypeName(type.typeName);
    setAdminConfig({ ...type.adminConfig });
    setShowEditTypeModal(true);
  };

  const closeEditTypeModal = () => {
    setShowEditTypeModal(false);
    setServiceTypeToEdit(null);
    setEditingServiceId(null);
    setEditingTypeId(null);
    setTypeName('');
    setAdminConfig({
      baseCharges: {
        '1 BHK': 0,
        '2 BHK': 0,
        '3 BHK': 0,
        '4+ BHK': 0,
        'Small (<1000 sq ft)': 0,
        'Medium (1000-3000 sq ft)': 0,
        'Large (>3000 sq ft)': 0,
        'Single Room': 0,
        'Shared Room': 0,
        'Entire Floor': 0,
      },
      distanceRatePerKm: 10,
    });
  };

  const updateServiceType = async () => {
    if (!typeName.trim()) {
      CrossPlatformAlert.alert('Error', 'Service Type name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await AsyncStorage.getItem('adminToken');
      const response = await fetch(
        `${API_BASE_URL}/api/services/update/${editingServiceId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            typeId: editingTypeId,
            typeName: capitalizeFirstLetter(typeName.trim()),
            baseCharges: adminConfig.baseCharges,
            distanceRatePerKm: adminConfig.distanceRatePerKm,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        CrossPlatformAlert.alert('Success', 'Service type updated successfully');
        await fetchServices();
        closeEditTypeModal();
      } else {
        setError(data.message || 'Failed to update service type');
        CrossPlatformAlert.alert('Error', data.message || 'Failed to update service type');
      }
    } catch (err) {
      console.error('Error updating service type:', err);
      setError('Error updating service type: ' + err.message);
      CrossPlatformAlert.alert('Error', 'Error updating service type: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Input Handlers
  const handleBaseChargeChange = (propertyType, value) => {
    const numValue = value === '' ? 0 : parseInt(value) || 0;
    setAdminConfig((prev) => ({
      ...prev,
      baseCharges: {
        ...prev.baseCharges,
        [propertyType]: numValue,
      },
    }));
  };

  const handleDistanceRateChange = (value) => {
    const numValue = value === '' ? 0 : parseInt(value) || 0;
    setAdminConfig((prev) => ({
      ...prev,
      distanceRatePerKm: numValue,
    }));
  };

  // useEffect
  useEffect(() => {
    fetchServices();
  }, []);

  // Property Types Array for Grid
  const propertyTypes = [
    '1 BHK',
    '2 BHK',
    '3 BHK',
    '4+ BHK',
    'Small (<1000 sq ft)',
    'Medium (1000-3000 sq ft)',
    'Large (>3000 sq ft)',
    'Single Room',
    'Shared Room',
    'Entire Floor',
  ];

  const filteredServices = services.filter((service) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const mainMatch = (service.mainService || '').toLowerCase().includes(q);
    const typeMatch = (service.serviceTypes || []).some((t) =>
      (t.typeName || '').toLowerCase().includes(q)
    );
    return mainMatch || typeMatch;
  });

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#0f172a" barStyle="light-content" />

      {/* Premium Header */}
      <LinearGradient colors={['#0f172a', '#1e3a8a']} style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Service Management</Text>
            <Text style={styles.headerSubtitle}>Manage categories, types & pricing</Text>
          </View>
          <TouchableOpacity
            style={styles.headerAddBtn}
            onPress={() => setActiveTab(activeTab === 'add' ? 'list' : 'add')}
          >
            <Icon name={activeTab === 'add' ? 'format-list-bulleted' : 'plus'} size={18} color="#fff" />
            <Text style={styles.headerAddTxt}>{activeTab === 'add' ? 'List' : 'Add'}</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Clean KPI Stat Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={[styles.statIconCircle, { backgroundColor: '#eef2ff' }]}>
            <Icon name="briefcase-outline" size={22} color="#4f46e5" />
          </View>
          <View style={styles.statTextWrap}>
            <Text style={styles.statValue}>{totalServicesCount}</Text>
            <Text style={styles.statLabel}>Total Services</Text>
          </View>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIconCircle, { backgroundColor: '#ecfdf5' }]}>
            <Icon name="format-list-bulleted" size={22} color="#059669" />
          </View>
          <View style={styles.statTextWrap}>
            <Text style={styles.statValue}>{totalServiceTypesCount}</Text>
            <Text style={styles.statLabel}>Service Types</Text>
          </View>
        </View>
      </View>

      {/* Segmented Tab Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabPill, activeTab === 'list' && styles.tabPillActive]}
          onPress={() => setActiveTab('list')}
        >
          <Icon name="view-grid-outline" size={16} color={activeTab === 'list' ? '#fff' : '#64748b'} />
          <Text style={[styles.tabPillTxt, activeTab === 'list' && styles.tabPillTxtActive]}>
            All Services ({totalServicesCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabPill, activeTab === 'add' && styles.tabPillActive]}
          onPress={() => setActiveTab('add')}
        >
          <Icon name="plus-circle-outline" size={16} color={activeTab === 'add' ? '#fff' : '#64748b'} />
          <Text style={[styles.tabPillTxt, activeTab === 'add' && styles.tabPillTxtActive]}>
            Add Service
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Error Alert */}
        {error && (
          <View style={styles.errorAlert}>
            <Icon name="alert-circle" size={20} color="#dc2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {activeTab === 'add' ? (
          /* Add New Service Form */
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.sectionIconBadge, { backgroundColor: '#eef2ff' }]}>
                <Icon name="plus-circle" size={20} color="#4f46e5" />
              </View>
              <View>
                <Text style={styles.cardTitle}>Add New Service</Text>
                <Text style={styles.cardSub}>Configure service type & base rates</Text>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Main Service *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Cleaning, Plumbing, Shifting"
                placeholderTextColor="#94a3b8"
                value={mainService}
                onChangeText={setMainService}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Service Type *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Office, Apartment, Villa"
                placeholderTextColor="#94a3b8"
                value={typeName}
                onChangeText={setTypeName}
              />
            </View>

            <Text style={styles.sectionTitle}>Base Charges Configuration (₹)</Text>
            <View style={styles.chargesGrid}>
              {propertyTypes.map((type, index) => (
                <View key={index} style={styles.chargeItem}>
                  <Text style={styles.chargeLabel} numberOfLines={1}>{type}</Text>
                  <TextInput
                    style={styles.chargeInput}
                    placeholder="0"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={adminConfig.baseCharges[type]?.toString()}
                    onChangeText={(value) => handleBaseChargeChange(type, value)}
                  />
                </View>
              ))}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Distance Rate Per Km (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="10"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={adminConfig.distanceRatePerKm?.toString()}
                onChangeText={handleDistanceRateChange}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={addService}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Icon name="check-circle-outline" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Save Service</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          /* Existing Services List */
          <View>
            {/* Search Box */}
            <View style={styles.searchBox}>
              <MaterialIcons name="search" size={20} color="#94a3b8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search service or type..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <MaterialIcons name="close" size={18} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            {loading && services.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1e3a8a" />
                <Text style={styles.loadingText}>Loading services...</Text>
              </View>
            ) : filteredServices.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconBox}>
                  <Icon name="wrench-outline" size={38} color="#64748b" />
                </View>
                <Text style={styles.emptyTitle}>No services found</Text>
                <Text style={styles.emptyText}>
                  {searchQuery ? 'Try a different search keyword.' : 'Tap "Add Service" to create your first service.'}
                </Text>
              </View>
            ) : (
              filteredServices.map((service) => (
                <View key={service._id} style={styles.serviceCard}>
                  <View style={styles.serviceHeader}>
                    <View style={styles.serviceHeaderLeft}>
                      <View style={styles.serviceAvatar}>
                        <Icon name="wrench" size={18} color="#1e3a8a" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.serviceName}>{service.mainService}</Text>
                        <Text style={styles.serviceCountSub}>
                          {service.serviceTypes?.length || 0} {(service.serviceTypes?.length || 0) === 1 ? 'Type' : 'Types'} configured
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => openDeleteMainModal(service)}
                      style={styles.deleteMainBtn}
                    >
                      <Icon name="delete-outline" size={20} color="#dc2626" />
                    </TouchableOpacity>
                  </View>

                  {/* Service Types + Charges */}
                  {(service.serviceTypes || []).map((type) => {
                    const baseEntries = Object.entries(type.adminConfig?.baseCharges || {}).filter(
                      ([_, value]) => Number(value) > 0
                    );
                    return (
                      <View key={type._id} style={styles.typeSubCard}>
                        <View style={styles.typeSubHeader}>
                          <View style={styles.typeTitlePill}>
                            <View style={styles.typeDot} />
                            <Text style={styles.typeName}>{type.typeName}</Text>
                          </View>
                          <View style={styles.typeActions}>
                            <TouchableOpacity
                              onPress={() => openEditTypeModal(service, type)}
                              style={[styles.typeActionButton, { backgroundColor: '#fff7ed' }]}
                            >
                              <Icon name="pencil" size={15} color="#ea580c" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => openDeleteTypeModal(service, type)}
                              style={[styles.typeActionButton, { backgroundColor: '#fef2f2' }]}
                            >
                              <Icon name="delete-outline" size={15} color="#dc2626" />
                            </TouchableOpacity>
                          </View>
                        </View>

                        <View style={styles.chargesChipsWrap}>
                          {baseEntries.map(([key, value]) => (
                            <View key={key} style={styles.priceChip}>
                              <Text style={styles.priceChipKey}>{key}</Text>
                              <Text style={styles.priceChipVal}>₹{value}</Text>
                            </View>
                          ))}
                          <View style={[styles.priceChip, styles.distanceChip]}>
                            <Text style={[styles.priceChipKey, { color: '#1d4ed8' }]}>Per Km</Text>
                            <Text style={[styles.priceChipVal, { color: '#1e3a8a' }]}>
                              ₹{type.adminConfig?.distanceRatePerKm ?? 0}/km
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

        {/* Delete Main Service Modal */}
        <Modal
          visible={showDeleteMainModal}
          transparent
          animationType="fade"
          onRequestClose={closeDeleteMainModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Confirm Deletion</Text>
                <TouchableOpacity onPress={closeDeleteMainModal}>
                  <Icon name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <Icon name="alert-circle-outline" size={60} color="#e53e3e" />
                <Text style={styles.modalText}>
                  Are you sure you want to delete the main service "{serviceToDelete?.mainService}" and
                  all its service types?
                </Text>
                <View style={styles.warningBox}>
                  <Icon name="alert" size={20} color="#e53e3e" />
                  <Text style={styles.warningText}>This action cannot be undone.</Text>
                </View>
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={closeDeleteMainModal}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.dangerButton]}
                  onPress={confirmDeleteMainService}
                >
                  <Text style={styles.buttonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Delete Service Type Modal */}
        <Modal
          visible={showDeleteTypeModal}
          transparent
          animationType="fade"
          onRequestClose={closeDeleteTypeModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Confirm Deletion</Text>
                <TouchableOpacity onPress={closeDeleteTypeModal}>
                  <Icon name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <Icon name="alert-circle-outline" size={60} color="#e53e3e" />
                <Text style={styles.modalText}>
                  Are you sure you want to delete the service type "{serviceTypeToDelete?.typeName}"?
                </Text>
                <View style={styles.warningBox}>
                  <Icon name="alert" size={20} color="#e53e3e" />
                  <Text style={styles.warningText}>This action cannot be undone.</Text>
                </View>
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={closeDeleteTypeModal}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.dangerButton]}
                  onPress={confirmDeleteServiceType}
                >
                  <Text style={styles.buttonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Edit Service Type Modal */}
        <Modal
          visible={showEditTypeModal}
          transparent
          animationType="slide"
          onRequestClose={closeEditTypeModal}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, styles.editModalContent]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Service Type</Text>
                <TouchableOpacity onPress={closeEditTypeModal}>
                  <Icon name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.editModalBody}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Service Type Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Service Type Name"
                    value={typeName}
                    onChangeText={setTypeName}
                  />
                </View>

                <Text style={styles.sectionTitle}>Base Charges Configuration</Text>
                <View style={styles.chargesGrid}>
                  {propertyTypes.map((type, index) => (
                    <View key={index} style={styles.chargeItem}>
                      <Text style={styles.chargeLabel}>{type}</Text>
                      <TextInput
                        style={styles.chargeInput}
                        placeholder="0"
                        keyboardType="numeric"
                        value={adminConfig.baseCharges[type]?.toString()}
                        onChangeText={(value) => handleBaseChargeChange(type, value)}
                      />
                    </View>
                  ))}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Distance Rate Per Km (₹)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="10"
                    keyboardType="numeric"
                    value={adminConfig.distanceRatePerKm?.toString()}
                    onChangeText={handleDistanceRateChange}
                  />
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={closeEditTypeModal}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton]}
                  onPress={updateServiceType}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Update</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  header: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 52,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#cbd5e1',
    marginTop: 2,
  },
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  headerAddTxt: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingTop: 14,
    gap: 10,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  statIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statTextWrap: {
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 9,
    gap: 6,
  },
  tabPillActive: {
    backgroundColor: '#1e3a8a',
  },
  tabPillTxt: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  tabPillTxtActive: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 90,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    padding: 0,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 12,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    color: '#dc2626',
    marginLeft: 8,
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 10,
  },
  sectionIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  formGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 10,
    marginTop: 4,
  },
  chargesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  chargeItem: {
    width: '48.5%',
    marginBottom: 10,
  },
  chargeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  chargeInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0f172a',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    flex: 1,
  },
  primaryButton: {
    backgroundColor: '#1e3a8a',
  },
  secondaryButton: {
    backgroundColor: '#f1f5f9',
    marginRight: 10,
  },
  dangerButton: {
    backgroundColor: '#dc2626',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '700',
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748b',
  },
  emptyContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 36,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyIconBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  serviceHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  serviceAvatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  serviceCountSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  deleteMainBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeSubCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  typeSubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  typeTitlePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  typeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
  },
  typeName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  typeActions: {
    flexDirection: 'row',
    gap: 6,
  },
  typeActionButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chargesChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  priceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 6,
  },
  distanceChip: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  priceChipKey: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  priceChipVal: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 18,
    width: '90%',
    maxWidth: 500,
    maxHeight: '85%',
  },
  editModalContent: {
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalBody: {
    padding: 20,
    alignItems: 'center',
  },
  editModalBody: {
    padding: 18,
    maxHeight: 420,
  },
  modalText: {
    fontSize: 15,
    color: '#334155',
    textAlign: 'center',
    marginTop: 14,
    marginBottom: 16,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  warningText: {
    color: '#dc2626',
    marginLeft: 8,
    fontWeight: '600',
    fontSize: 13,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
});

export default ServiceManagementScreen;
