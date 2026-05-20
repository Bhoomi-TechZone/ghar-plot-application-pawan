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
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import CrossPlatformAlert from '../../../utils/crossPlatformAlert';

const API_BASE_URL = 'https://gharplotbackend.gntechnology.de';

const USPCategoriesScreen = ({ navigation }) => {
  // Main Data States
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Form States
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Statistics
  const totalCategories = categories.length;
  const activeCategories = categories.filter(cat => cat.isActive !== false).length;
  const inactiveCategories = totalCategories - activeCategories;

  // Sample Data for Fallback
  const sampleCategories = [
    {
      _id: 'sample1',
      name: 'Plumbing',
      description: 'Plumbing services and repairs',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      _id: 'sample2',
      name: 'Electrical',
      description: 'Electrical work and maintenance',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      _id: 'sample3',
      name: 'Cleaning',
      description: 'House and office cleaning services',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      _id: 'sample4',
      name: 'Carpentry',
      description: 'Furniture and woodwork services',
      isActive: false,
      createdAt: new Date().toISOString(),
    },
  ];

  // Utility Functions
  const capitalizeFirstLetter = (string) => {
    if (!string) return string;
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
  };

  const loadSampleData = () => {
    setCategories(sampleCategories);
  };

  // Fetch Categories
  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const adminToken = await AsyncStorage.getItem('adminToken');
      const employeeToken = await AsyncStorage.getItem('employeeToken');
      const token = adminToken || employeeToken;

      const response = await fetch(`${API_BASE_URL}/api/usp-categories`, {
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
        setCategories(data.data || []);
      } else {
        setCategories([]);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
      loadSampleData();
    } finally {
      setLoading(false);
    }
  };

  // Pull to Refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCategories();
    setRefreshing(false);
  }, []);

  // Add Category
  const openAddModal = () => {
    setCategoryName('');
    setCategoryDescription('');
    setIsActive(true);
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setCategoryName('');
    setCategoryDescription('');
    setIsActive(true);
  };

  const addCategory = async () => {
    if (!categoryName.trim()) {
      CrossPlatformAlert.alert('Error', 'Category name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const adminToken = await AsyncStorage.getItem('adminToken');
      const employeeToken = await AsyncStorage.getItem('employeeToken');
      const token = adminToken || employeeToken;

      const response = await fetch(`${API_BASE_URL}/api/usp-categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: categoryName.trim(),
          description: categoryDescription.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        CrossPlatformAlert.alert('Success', 'Category created successfully');
        closeAddModal();
        await fetchCategories();
      } else {
        setError(data.message || 'Failed to add category');
        CrossPlatformAlert.alert('Error', data.message || 'Failed to add category');
      }
    } catch (err) {
      console.error('Error adding category:', err);
      setError('Error adding category: ' + err.message);
      CrossPlatformAlert.alert('Error', 'Error adding category: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Edit Category
  const openEditModal = (category) => {
    setSelectedCategory(category);
    setCategoryName(category.name);
    setCategoryDescription(category.description || '');
    setIsActive(category.isActive !== false);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedCategory(null);
    setCategoryName('');
    setCategoryDescription('');
    setIsActive(true);
  };

  const updateCategory = async () => {
    if (!categoryName.trim()) {
      CrossPlatformAlert.alert('Error', 'Category name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const adminToken = await AsyncStorage.getItem('adminToken');
      const employeeToken = await AsyncStorage.getItem('employeeToken');
      const token = adminToken || employeeToken;

      const response = await fetch(
        `${API_BASE_URL}/api/usp-categories/${selectedCategory._id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: categoryName.trim(),
            description: categoryDescription.trim(),
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        CrossPlatformAlert.alert('Success', 'Category updated successfully');
        closeEditModal();
        await fetchCategories();
      } else {
        setError(data.message || 'Failed to update category');
        CrossPlatformAlert.alert('Error', data.message || 'Failed to update category');
      }
    } catch (err) {
      console.error('Error updating category:', err);
      setError('Error updating category: ' + err.message);
      CrossPlatformAlert.alert('Error', 'Error updating category: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete Category
  const openDeleteModal = (category) => {
    setSelectedCategory(category);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedCategory(null);
  };

  const deleteCategory = async () => {
    if (!selectedCategory) return;

    setLoading(true);
    setError(null);
    closeDeleteModal();

    try {
      const adminToken = await AsyncStorage.getItem('adminToken');
      const employeeToken = await AsyncStorage.getItem('employeeToken');
      const token = adminToken || employeeToken;

      const response = await fetch(
        `${API_BASE_URL}/api/usp-categories/${selectedCategory._id}`,
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
        CrossPlatformAlert.alert('Success', 'Category deleted successfully');
        await fetchCategories();
      } else {
        setError(data.message || 'Failed to delete category');
        CrossPlatformAlert.alert('Error', data.message || 'Failed to delete category');
      }
    } catch (err) {
      console.error('Error deleting category:', err);
      setError('Error deleting category: ' + err.message);
      CrossPlatformAlert.alert('Error', 'Error deleting category: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Toggle Active Status
  const toggleActiveStatus = async (category) => {
    try {
      const adminToken = await AsyncStorage.getItem('adminToken');
      const employeeToken = await AsyncStorage.getItem('employeeToken');
      const token = adminToken || employeeToken;

      const response = await fetch(
        `${API_BASE_URL}/api/usp-categories/${category._id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: category.name,
            description: category.description,
            isActive: !category.isActive,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        await fetchCategories();
      } else {
        CrossPlatformAlert.alert('Error', data.message || 'Failed to update status');
      }
    } catch (err) {
      console.error('Error toggling status:', err);
      CrossPlatformAlert.alert('Error', 'Error toggling status: ' + err.message);
    }
  };

  // useEffect
  useEffect(() => {
    fetchCategories();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Icon name="tag-multiple" size={30} color="#fff" />
          <Text style={styles.headerTitle}>USP Categories</Text>
        </View>
        <Text style={styles.headerSubtitle}>Manage USP service categories</Text>
      </LinearGradient>

      {/* Statistics Cards */}
      <View style={styles.statsContainer}>
        <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.statCard}>
          <Icon name="tag-multiple" size={28} color="#fff" />
          <Text style={styles.statValue}>{totalCategories}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </LinearGradient>

        <LinearGradient colors={['#10b981', '#059669']} style={styles.statCard}>
          <Icon name="check-circle" size={28} color="#fff" />
          <Text style={styles.statValue}>{activeCategories}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </LinearGradient>

        <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.statCard}>
          <Icon name="close-circle" size={28} color="#fff" />
          <Text style={styles.statValue}>{inactiveCategories}</Text>
          <Text style={styles.statLabel}>Inactive</Text>
        </LinearGradient>
      </View>

      {/* Add Button */}
      <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
        <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.addButtonGradient}>
          <Icon name="plus" size={24} color="#fff" />
          <Text style={styles.addButtonText}>Add Category</Text>
        </LinearGradient>
      </TouchableOpacity>

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

        {/* Categories List */}
        <View style={styles.card}>
          {loading && categories.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#f59e0b" />
              <Text style={styles.loadingText}>Loading categories...</Text>
            </View>
          ) : categories.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="tag-off" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No categories found</Text>
              <Text style={styles.emptySubtext}>Add a new category to get started</Text>
            </View>
          ) : (
            categories.map((category) => (
              <View key={category._id} style={styles.categoryCard}>
                <View style={styles.categoryHeader}>
                  <View style={styles.categoryHeaderLeft}>
                    <Icon
                      name="tag"
                      size={24}
                      color={category.isActive !== false ? '#f59e0b' : '#9ca3af'}
                    />
                    <View style={styles.categoryInfo}>
                      <Text style={styles.categoryName}>{category.name}</Text>
                      {category.description && (
                        <Text style={styles.categoryDescription}>{category.description}</Text>
                      )}
                      <View style={styles.categoryMeta}>
                        <View style={styles.employeeCount}>
                          <Icon name="account-group" size={14} color="#6b7280" />
                          <Text style={styles.employeeCountText}>
                            {category.employeeCount || 0} Employees
                          </Text>
                        </View>
                        <Text style={styles.categoryDate}>Created: {formatDate(category.createdAt)}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.categoryActions}>
                    <TouchableOpacity
                      style={[
                        styles.statusBadge,
                        category.isActive !== false ? styles.activeBadge : styles.inactiveBadge,
                      ]}
                      onPress={() => toggleActiveStatus(category)}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          category.isActive !== false ? styles.activeText : styles.inactiveText,
                        ]}
                      >
                        {category.isActive !== false ? 'Active' : 'Inactive'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => openEditModal(category)}
                  >
                    <Icon name="pencil" size={18} color="#fff" />
                    <Text style={styles.actionButtonText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => openDeleteModal(category)}
                  >
                    <Icon name="delete" size={18} color="#fff" />
                    <Text style={styles.actionButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Category Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={closeAddModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Category</Text>
              <TouchableOpacity onPress={closeAddModal}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Category Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Plumbing"
                  value={categoryName}
                  onChangeText={setCategoryName}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Enter category description"
                  value={categoryDescription}
                  onChangeText={setCategoryDescription}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.formGroup}>
                <View style={styles.checkboxContainer}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => setIsActive(!isActive)}
                  >
                    <Icon
                      name={isActive ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      size={24}
                      color={isActive ? '#f59e0b' : '#9ca3af'}
                    />
                  </TouchableOpacity>
                  <Text style={styles.checkboxLabel}>Active</Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={closeAddModal}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={addCategory}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Add Category</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Category Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Category</Text>
              <TouchableOpacity onPress={closeEditModal}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Category Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Plumbing"
                  value={categoryName}
                  onChangeText={setCategoryName}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Enter category description"
                  value={categoryDescription}
                  onChangeText={setCategoryDescription}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.formGroup}>
                <View style={styles.checkboxContainer}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => setIsActive(!isActive)}
                  >
                    <Icon
                      name={isActive ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      size={24}
                      color={isActive ? '#f59e0b' : '#9ca3af'}
                    />
                  </TouchableOpacity>
                  <Text style={styles.checkboxLabel}>Active</Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={closeEditModal}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={updateCategory}
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

      {/* Delete Category Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={closeDeleteModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Deletion</Text>
              <TouchableOpacity onPress={closeDeleteModal}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Icon name="alert-circle-outline" size={60} color="#e53e3e" />
              <Text style={styles.modalText}>
                Are you sure you want to delete the category "{selectedCategory?.name}"?
              </Text>
              <View style={styles.warningBox}>
                <Icon name="alert" size={20} color="#e53e3e" />
                <Text style={styles.warningText}>This action cannot be undone.</Text>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={closeDeleteModal}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.dangerButton]}
                onPress={deleteCategory}
              >
                <Text style={styles.buttonText}>Delete</Text>
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
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
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#fff',
    marginTop: 4,
    textAlign: 'center',
  },
  addButton: {
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
    padding: 15,
    borderRadius: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
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
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
  },
  emptySubtext: {
    marginTop: 5,
    fontSize: 14,
    color: '#bbb',
  },
  categoryCard: {
    backgroundColor: '#f9fafb',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  categoryInfo: {
    marginLeft: 12,
    flex: 1,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 6,
    lineHeight: 20,
  },
  categoryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  employeeCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  employeeCountText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  categoryDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  categoryActions: {
    marginLeft: 10,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  activeBadge: {
    backgroundColor: '#d1fae5',
    borderColor: '#10b981',
  },
  inactiveBadge: {
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeText: {
    color: '#065f46',
  },
  inactiveText: {
    color: '#991b1b',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  editButton: {
    backgroundColor: '#f59e0b',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
    maxHeight: 400,
  },
  modalText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 20,
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
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    marginRight: 10,
  },
  checkboxLabel: {
    fontSize: 15,
    color: '#333',
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
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
  },
  primaryButton: {
    backgroundColor: '#f59e0b',
    marginLeft: 5,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 5,
  },
  dangerButton: {
    backgroundColor: '#e53e3e',
    marginLeft: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default USPCategoriesScreen;
