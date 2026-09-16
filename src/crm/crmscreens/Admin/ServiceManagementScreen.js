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
      const token = await AsyncStorage.getItem('adminToken');
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

  return (
    <SafeAreaView style={styles.safeArea}>
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Icon name="wrench" size={30} color="#fff" />
          <Text style={styles.headerTitle}>Service Management</Text>
        </View>
        <Text style={styles.headerSubtitle}>Manage service types and configurations</Text>
      </LinearGradient>

      {/* Statistics Cards */}
      <View style={styles.statsContainer}>
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.statCard}>
          <Icon name="briefcase-outline" size={32} color="#fff" />
          <Text style={styles.statValue}>{totalServicesCount}</Text>
          <Text style={styles.statLabel}>Total Services</Text>
        </LinearGradient>

        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.statCard}>
          <Icon name="format-list-bulleted" size={32} color="#fff" />
          <Text style={styles.statValue}>{totalServiceTypesCount}</Text>
          <Text style={styles.statLabel}>Total Types</Text>
        </LinearGradient>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Error Alert */}
        {error && (
          <View style={styles.errorAlert}>
            <Icon name="alert-circle" size={20} color="#e53e3e" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Add New Service Form */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="plus-circle" size={24} color="#667eea" />
            <Text style={styles.cardTitle}>Add New Service</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Main Service</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Cleaning, Plumbing"
              value={mainService}
              onChangeText={setMainService}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Service Type</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Office, Apartment"
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

          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={addService}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="plus" size={20} color="#fff" />
                <Text style={styles.buttonText}>Add Service</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Existing Services List */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="format-list-bulleted" size={24} color="#667eea" />
            <Text style={styles.cardTitle}>Existing Services</Text>
          </View>

          {loading && services.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#667eea" />
              <Text style={styles.loadingText}>Loading services...</Text>
            </View>
          ) : services.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="information-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No services found. Add a new service to get started.</Text>
            </View>
          ) : (
            services.map((service) => (
              <View key={service._id} style={styles.serviceCard}>
                <View style={styles.serviceHeader}>
                  <View style={styles.serviceHeaderLeft}>
                    <Icon name="wrench" size={24} color="#667eea" />
                    <Text style={styles.serviceName}>{service.mainService}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => openDeleteMainModal(service)}
                    style={styles.iconButton}
                  >
                    <Icon name="delete" size={24} color="#e53e3e" />
                  </TouchableOpacity>
                </View>

                {/* Service Types */}
                <View style={styles.typesContainer}>
                  {service.serviceTypes?.map((type) => (
                    <View key={type._id} style={styles.typeBadge}>
                      <Text style={styles.typeName}>{type.typeName}</Text>
                      <View style={styles.typeActions}>
                        <TouchableOpacity
                          onPress={() => openEditTypeModal(service, type)}
                          style={styles.typeActionButton}
                        >
                          <Icon name="pencil" size={16} color="#ed8936" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => openDeleteTypeModal(service, type)}
                          style={styles.typeActionButton}
                        >
                          <Icon name="delete" size={16} color="#e53e3e" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Charges Display */}
                {service.serviceTypes?.map((type) => (
                  <View key={type._id} style={styles.chargesDisplay}>
                    <Text style={styles.chargesTitle}>{type.typeName} Charges</Text>
                    <View style={styles.chargesList}>
                      {Object.entries(type.adminConfig?.baseCharges || {})
                        .filter(([_, value]) => value > 0)
                        .map(([key, value]) => (
                          <View key={key} style={styles.chargeRow}>
                            <Text style={styles.chargeKey}>{key}:</Text>
                            <Text style={styles.chargeValue}>₹{value}</Text>
                          </View>
                        ))}
                      <View style={styles.chargeRow}>
                        <Text style={styles.chargeKey}>Distance Rate:</Text>
                        <Text style={styles.chargeValue}>
                          ₹{type.adminConfig?.distanceRatePerKm}/km
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ))
          )}
        </View>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingBottom: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  backButton: {
    marginBottom: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 10,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginTop: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginTop: -30,
    marginBottom: 15,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 5,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 10,
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    marginTop: 5,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee',
    padding: 15,
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fcc',
  },
  errorText: {
    color: '#e53e3e',
    marginLeft: 10,
    flex: 1,
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 20,
    borderRadius: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 10,
  },
  formGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
    marginTop: 10,
  },
  chargesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  chargeItem: {
    width: '50%',
    paddingHorizontal: 5,
    marginBottom: 15,
  },
  chargeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  chargeInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  primaryButton: {
    backgroundColor: '#667eea',
    flex: 1,
    marginLeft: 5,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    flex: 1,
    marginRight: 5,
  },
  dangerButton: {
    backgroundColor: '#e53e3e',
    flex: 1,
    marginLeft: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 5,
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 10,
    color: '#999',
    textAlign: 'center',
  },
  serviceCard: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  serviceHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 10,
  },
  iconButton: {
    padding: 5,
  },
  typesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  typeBadge: {
    backgroundColor: '#667eea',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 10,
  },
  typeActions: {
    flexDirection: 'row',
    gap: 5,
  },
  typeActionButton: {
    padding: 4,
  },
  chargesDisplay: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  chargesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
    marginBottom: 10,
  },
  chargesList: {
    gap: 5,
  },
  chargeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  chargeKey: {
    fontSize: 13,
    color: '#666',
  },
  chargeValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  editModalContent: {
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalBody: {
    padding: 20,
    alignItems: 'center',
  },
  editModalBody: {
    padding: 20,
    maxHeight: 400,
  },
  modalText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 20,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fcc',
  },
  warningText: {
    color: '#e53e3e',
    marginLeft: 8,
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
});

export default ServiceManagementScreen;
