import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CrossPlatformAlert from '../../../utils/crossPlatformAlert';

const API_BASE_URL = 'https://gharplotbackend.gntechnology.de';

const USPEmployeesScreen = ({ navigation }) => {
  // Main Data States
  const [employees, setEmployees] = useState([]);
  const [categories, setCategories] = useState([]);
  const [systemEmployees, setSystemEmployees] = useState([]);
  const [enquiries, setEnquiries] = useState([]); // All enquiries from enquiry screen
  const [allUsers, setAllUsers] = useState([]); // All registered users
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('system'); // 'system' or 'manual'
  const [editingEmployee, setEditingEmployee] = useState(null);

  // Filter State
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Form States
  const [formData, setFormData] = useState({
    employeeId: '',
    categoryId: '',
    name: '',
    phone: '',
    expertise: '',
    experienceYears: '',
    description: '',
  });

  // Feedback States
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search States for Users/Clients
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // Category creation states
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // Statistics
  const [statistics, setStatistics] = useState({
    total: 0,
    systemEmployees: 0,
    manualEmployees: 0,
  });

  // Fetch data on mount
  useEffect(() => {
    fetchAllData();
  }, []);

  // Calculate statistics when employees change
  useEffect(() => {
    calculateStatistics();
  }, [employees]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchCategories(),
        fetchEmployees(),
        fetchSystemEmployees(),
        fetchEnquiries(), // Fetch all enquiries
        fetchAllUsers(), // Fetch all registered users
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  }, []);

  // Get auth headers
  const getAuthHeaders = async () => {
    const adminToken = await AsyncStorage.getItem('adminToken');
    const employeeToken = await AsyncStorage.getItem('employeeToken');
    const token = adminToken || employeeToken;

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  // Fetch Categories
  const fetchCategories = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get(
        `${API_BASE_URL}/api/usp-categories`,
        { headers }
      );
      if (response.data.success) {
        setCategories(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      CrossPlatformAlert.alert('Error', 'Failed to fetch categories');
    }
  };

  // Create New Category
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      CrossPlatformAlert.alert('Error', 'Please enter a category name');
      return;
    }

    setIsCreatingCategory(true);
    try {
      const headers = await getAuthHeaders();
      const response = await axios.post(
        `${API_BASE_URL}/api/usp-categories`,
        { name: newCategoryName.trim() },
        { headers }
      );

      if (response.data.success) {
        CrossPlatformAlert.alert('Success', 'Category created successfully!');
        setNewCategoryName('');
        // Refresh categories and auto-select the new one
        await fetchCategories();
        if (response.data.data && response.data.data._id) {
          handleInputChange('categoryId', response.data.data._id);
        }
      }
    } catch (error) {
      console.error('Error creating category:', error);
      CrossPlatformAlert.alert('Error', error.response?.data?.message || 'Failed to create category');
    } finally {
      setIsCreatingCategory(false);
    }
  };

  // Fetch USP Employees
  const fetchEmployees = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get(
        `${API_BASE_URL}/api/usp-employees`,
        { headers }
      );
      if (response.data.success) {
        setEmployees(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      CrossPlatformAlert.alert('Error', 'Failed to fetch employees');
    }
  };

  // Fetch System Employees
  const fetchSystemEmployees = async () => {
    try {
      const adminToken = await AsyncStorage.getItem('adminToken');
      const employeeToken = await AsyncStorage.getItem('employeeToken');
      const token = adminToken || employeeToken;
      const endpoint = adminToken
        ? `${API_BASE_URL}/admin/employees`
        : `${API_BASE_URL}/api/employees`;

      const response = await axios.get(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        setSystemEmployees(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching system employees:', error);
    }
  };

  // Fetch All Enquiries
  const fetchEnquiries = async () => {
    try {
      const headers = await getAuthHeaders();

      // Fetch manual enquiries
      const manualResponse = await axios.get(
        `${API_BASE_URL}/api/inquiry/all`,
        { headers }
      );

      // Fetch client enquiries
      const clientResponse = await axios.get(
        `${API_BASE_URL}/api/inquiry/get-enquiries`,
        { headers }
      );

      const manualEnquiries = manualResponse.data?.data || manualResponse.data || [];
      const clientEnquiries = clientResponse.data?.data || clientResponse.data || [];

      // Merge all enquiries and remove duplicates
      const allEnquiries = [...manualEnquiries, ...clientEnquiries];
      const uniqueEnquiries = allEnquiries.reduce((acc, curr) => {
        const key = curr.contactNumber || curr.phone || curr.clientName;
        if (key && !acc.find(e => (e.contactNumber || e.phone) === key)) {
          acc.push(curr);
        }
        return acc;
      }, []);

      setEnquiries(uniqueEnquiries);
      console.log('✅ Loaded', uniqueEnquiries.length, 'enquiries for USP search');
    } catch (error) {
      console.error('Error fetching enquiries:', error);
      // Don't show alert, just log
    }
  };

  // Fetch All Users
  const fetchAllUsers = async () => {
    try {
      const headers = await getAuthHeaders();

      // Fetch all users from the backend
      const response = await axios.get(
        `${API_BASE_URL}/api/users`,
        { headers }
      );

      const users = response.data?.data || response.data?.users || response.data || [];

      // Format users for search
      const formattedUsers = users.map(user => ({
        _id: user._id || user.id,
        fullName: user.fullName || user.name || user.username,
        name: user.fullName || user.name || user.username,
        phone: user.phone || user.mobile || user.contactNumber,
        mobile: user.phone || user.mobile || user.contactNumber,
        contactNumber: user.phone || user.mobile || user.contactNumber,
        email: user.email,
        type: 'user',
        source: 'users-api'
      })).filter(user => user.phone); // Only include users with phone numbers

      setAllUsers(formattedUsers);
      console.log('✅ Loaded', formattedUsers.length, 'users for USP search');
    } catch (error) {
      console.error('Error fetching all users:', error);
      // Don't show alert, just log
    }
  };

  // Search Users/Clients (All Users/Buyers/Sellers/Enquiries)
  const searchUsers = async (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    setSearchLoading(true);
    try {
      const lowerQuery = query.toLowerCase().trim();

      // Search in all users
      const userMatches = allUsers.filter(user => {
        const name = (user.fullName || user.name || '').toLowerCase();
        const phone = (user.phone || user.mobile || '').toString();
        return name.includes(lowerQuery) || phone.includes(lowerQuery);
      });

      // Search in local enquiries
      const enquiryMatches = enquiries.filter(enquiry => {
        const name = (enquiry.clientName || enquiry.name || '').toLowerCase();
        const phone = (enquiry.contactNumber || enquiry.phone || '').toString();
        return name.includes(lowerQuery) || phone.includes(lowerQuery);
      }).map(enquiry => ({
        _id: enquiry._id || enquiry.id,
        fullName: enquiry.clientName || enquiry.name,
        name: enquiry.clientName || enquiry.name,
        phone: enquiry.contactNumber || enquiry.phone,
        mobile: enquiry.contactNumber || enquiry.phone,
        contactNumber: enquiry.contactNumber || enquiry.phone,
        type: 'enquiry',
        source: 'enquiries'
      }));

      // Merge results and remove duplicates by phone
      const combinedResults = [...userMatches, ...enquiryMatches];
      const uniqueResults = combinedResults.reduce((acc, curr) => {
        const phone = curr.phone || curr.mobile || curr.contactNumber;
        if (phone && !acc.find(r => (r.phone || r.mobile || r.contactNumber) === phone)) {
          acc.push(curr);
        }
        return acc;
      }, []);

      setSearchResults(uniqueResults);
      setShowSearchDropdown(uniqueResults.length > 0);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
      setShowSearchDropdown(false);
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle user selection from search
  const handleUserSelect = (user) => {
    setFormData(prev => ({
      ...prev,
      name: user.fullName || user.name || '',
      phone: user.phone || user.mobile || user.contactNumber || '',
    }));
    setSearchQuery(user.fullName || user.name || user.phone || '');
    setShowSearchDropdown(false);
    setSearchResults([]);
  };

  // Debounce search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery && modalType === 'manual' && showModal) {
        searchUsers(searchQuery);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, modalType, showModal]);

  // Calculate Statistics
  const calculateStatistics = () => {
    const total = employees.length;
    const systemCount = employees.filter(emp => emp.employeeType === 'system').length;
    const manualCount = employees.filter(emp => emp.employeeType === 'manual').length;

    setStatistics({
      total,
      systemEmployees: systemCount,
      manualEmployees: manualCount,
    });
  };

  // Filtered Employees
  const filteredEmployees = selectedCategory === 'all'
    ? employees
    : employees.filter(emp => emp.category?._id === selectedCategory);

  // Handle Show Modal
  const handleShowModal = (type = 'system', employee = null) => {
    setModalType(type);

    if (employee) {
      // Edit mode
      setEditingEmployee(employee);
      setFormData({
        employeeId: employee.employee?._id || '',
        categoryId: employee.category?._id || '',
        name: employee.manualName || '',
        phone: employee.manualPhone || '',
        expertise: employee.expertise || '',
        experienceYears: employee.experienceYears?.toString() || '',
        description: employee.description || '',
      });
    } else {
      // Add mode
      setEditingEmployee(null);
      setFormData({
        employeeId: '',
        categoryId: '',
        name: '',
        phone: '',
        expertise: '',
        experienceYears: '',
        description: '',
      });
    }

    // Reset search state
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchDropdown(false);

    setShowModal(true);
    setError('');
    setSuccess('');
  };

  // Handle Close Modal
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingEmployee(null);
    setModalType('system');
    setError('');
    setSuccess('');

    // Reset search state
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchDropdown(false);
  };

  // Handle Input Change
  const handleInputChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Validate Form
  const validateForm = () => {
    // Category is required for both system and manual
    if (!formData.categoryId) {
      setError('Please select a category');
      return false;
    }

    if (modalType === 'system') {
      if (!formData.employeeId) {
        setError('Please select an employee');
        return false;
      }
    } else {
      if (!formData.name.trim()) {
        setError('Employee name is required');
        return false;
      }
      if (!formData.phone.trim()) {
        setError('Phone number is required');
        return false;
      }
    }

    return true;
  };

  // Handle Submit
  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (!validateForm()) return;

    try {
      const headers = await getAuthHeaders();

      if (editingEmployee) {
        // Update mode
        const updateData = {
          categoryId: formData.categoryId,
          expertise: formData.expertise,
          experienceYears: formData.experienceYears ? parseInt(formData.experienceYears) : undefined,
          description: formData.description,
        };

        if (editingEmployee.employeeType === 'manual') {
          updateData.manualName = formData.name;
          updateData.manualPhone = formData.phone;
        }

        await axios.put(
          `${API_BASE_URL}/api/usp-employees/${editingEmployee._id}`,
          updateData,
          { headers }
        );
        setSuccess('Employee updated successfully!');
      } else {
        // Add mode
        if (modalType === 'system') {
          const data = {
            employeeId: formData.employeeId,
            categoryId: formData.categoryId,
            expertise: formData.expertise,
            experienceYears: formData.experienceYears ? parseInt(formData.experienceYears) : undefined,
            description: formData.description,
          };
          await axios.post(
            `${API_BASE_URL}/api/usp-employees/add-by-id`,
            data,
            { headers }
          );
        } else {
          const data = {
            categoryId: formData.categoryId,
            name: formData.name,
            phone: formData.phone,
            expertise: formData.expertise,
            experienceYears: formData.experienceYears ? parseInt(formData.experienceYears) : undefined,
            description: formData.description,
          };
          await axios.post(
            `${API_BASE_URL}/api/usp-employees/add-manually`,
            data,
            { headers }
          );
        }
        setSuccess('Employee added to USP successfully!');
      }

      await fetchEmployees();
      setTimeout(() => {
        handleCloseModal();
      }, 1500);
    } catch (error) {
      setError(error.response?.data?.message || error.message || 'An error occurred');
    }
  };

  // Handle Delete
  const handleDelete = async (employeeId) => {
    CrossPlatformAlert.alert(
      'Confirm Delete',
      'Are you sure you want to remove this employee from USP?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              await axios.delete(
                `${API_BASE_URL}/api/usp-employees/${employeeId}`,
                { headers }
              );
              CrossPlatformAlert.alert('Success', 'Employee removed from USP successfully!');
              await fetchEmployees();
            } catch (error) {
              CrossPlatformAlert.alert('Error', error.response?.data?.message || 'Error removing employee');
            }
          },
        },
      ]
    );
  };

  // Render Statistics Card
  const renderStatisticsCard = (title, value, icon, color) => (
    <View style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <Icon name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  // Render Employee Card
  const renderEmployeeCard = (employee) => {
    const employeeName = employee.employeeType === 'system'
      ? employee.employee?.name
      : employee.manualName;
    const employeePhone = employee.employeeType === 'system'
      ? employee.employee?.phone
      : employee.manualPhone;

    return (
      <View key={employee._id} style={styles.employeeCard}>
        <View style={styles.employeeHeader}>
          <View style={styles.employeeInfo}>
            <View style={styles.employeeNameRow}>
              <Icon name="person" size={20} color="#10b981" />
              <Text style={styles.employeeName}>{employeeName}</Text>
              <View style={[
                styles.typeBadge,
                { backgroundColor: employee.employeeType === 'system' ? '#3b82f6' : '#f59e0b' }
              ]}>
                <Text style={styles.typeBadgeText}>
                  {employee.employeeType === 'system' ? 'System' : 'Manual'}
                </Text>
              </View>
            </View>
            <View style={styles.employeeContactRow}>
              <Icon name="phone" size={14} color="#6b7280" />
              <Text style={styles.employeeContact}>{employeePhone}</Text>
            </View>
          </View>
          <View style={styles.employeeActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => handleShowModal(employee.employeeType, employee)}
            >
              <Icon name="edit" size={18} color="#3b82f6" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDelete(employee._id)}
            >
              <Icon name="delete" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.employeeDetails}>
          <View style={styles.detailRow}>
            <Icon name="category" size={16} color="#10b981" />
            <Text style={styles.detailLabel}>Category:</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{employee.category?.name}</Text>
            </View>
          </View>

          {employee.expertise && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="briefcase" size={16} color="#10b981" />
              <Text style={styles.detailLabel}>Expertise:</Text>
              <Text style={styles.detailValue}>{employee.expertise}</Text>
            </View>
          )}

          {employee.experienceYears > 0 && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="clock-outline" size={16} color="#10b981" />
              <Text style={styles.detailLabel}>Experience:</Text>
              <Text style={styles.detailValue}>{employee.experienceYears} years</Text>
            </View>
          )}

          {employee.description && (
            <View style={styles.descriptionContainer}>
              <Icon name="description" size={16} color="#10b981" />
              <Text style={styles.descriptionText}>{employee.description}</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Icon name="info" size={16} color="#10b981" />
            <Text style={styles.detailLabel}>Status:</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: employee.isActive ? '#10b981' : '#6b7280' }
            ]}>
              <Text style={styles.statusBadgeText}>
                {employee.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Loading Team's USP...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#10b981', '#059669']}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Team's USP</Text>
          <Text style={styles.headerSubtitle}>
            Manage employees featured in USP categories
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          {renderStatisticsCard('Total Employees', statistics.total, 'people', '#10b981')}
          {renderStatisticsCard('Manual', statistics.manualEmployees, 'person-add', '#f59e0b')}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.addManualButton}
            onPress={() => handleShowModal('manual')}
          >
            <LinearGradient
              colors={['#10b981', '#059669']}
              style={styles.gradientButton}
            >
              <Icon name="person-add" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Add Manually</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Filter Section */}
        <View style={styles.filterContainer}>
          <View style={styles.filterHeader}>
            <Icon name="filter-list" size={20} color="#10b981" />
            <Text style={styles.filterTitle}>Filter by Category</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{filteredEmployees.length} Employees</Text>
            </View>
          </View>
          <View style={styles.categoryFilterContainer}>
            <TouchableOpacity
              style={[
                styles.categoryFilterItem,
                selectedCategory === 'all' && styles.categoryFilterItemActive
              ]}
              onPress={() => setSelectedCategory('all')}
            >
              <Text style={[
                styles.categoryFilterText,
                selectedCategory === 'all' && styles.categoryFilterTextActive
              ]}>
                All Categories
              </Text>
            </TouchableOpacity>
            {categories.map(category => (
              <TouchableOpacity
                key={category._id}
                style={[
                  styles.categoryFilterItem,
                  selectedCategory === category._id && styles.categoryFilterItemActive
                ]}
                onPress={() => setSelectedCategory(category._id)}
              >
                <Text style={[
                  styles.categoryFilterText,
                  selectedCategory === category._id && styles.categoryFilterTextActive
                ]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Employees List */}
        <View style={styles.employeesContainer}>
          {filteredEmployees.length > 0 ? (
            filteredEmployees.map(employee => renderEmployeeCard(employee))
          ) : (
            <View style={styles.emptyState}>
              <Icon name="person-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyStateTitle}>No employees found</Text>
              <Text style={styles.emptyStateText}>
                Add employees to get started
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingEmployee ? 'Edit Team\'s USP' :
                  modalType === 'system' ? 'Add from System' : 'Add Manually'}
              </Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Icon name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Error/Success Messages */}
              {error ? (
                <View style={styles.errorAlert}>
                  <Icon name="error" size={20} color="#ef4444" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {success ? (
                <View style={styles.successAlert}>
                  <Icon name="check-circle" size={20} color="#10b981" />
                  <Text style={styles.successText}>{success}</Text>
                </View>
              ) : null}

              {/* Category Dropdown */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Category *</Text>

                {/* Add New Category */}
                <View style={styles.addCategoryContainer}>
                  <TextInput
                    style={styles.addCategoryInput}
                    placeholder="Add new category"
                    value={newCategoryName}
                    onChangeText={setNewCategoryName}
                  />
                  <TouchableOpacity
                    style={styles.addCategoryButton}
                    onPress={handleCreateCategory}
                    disabled={isCreatingCategory}
                  >
                    <Icon name="add" size={18} color="#fff" />
                    <Text style={styles.addCategoryButtonText}>
                      {isCreatingCategory ? 'Adding...' : 'Add'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Existing Categories */}
                <View style={styles.pickerContainer}>
                  <Icon name="category" size={20} color="#10b981" />
                  <ScrollView style={styles.picker} nestedScrollEnabled>
                    {categories.length === 0 ? (
                      <Text style={styles.pickerItemText}>No categories available</Text>
                    ) : (
                      categories.map(category => (
                        <TouchableOpacity
                          key={category._id}
                          style={[
                            styles.pickerItem,
                            formData.categoryId === category._id && styles.pickerItemSelected
                          ]}
                          onPress={() => handleInputChange('categoryId', category._id)}
                        >
                          <Text style={[
                            styles.pickerItemText,
                            formData.categoryId === category._id && styles.pickerItemTextSelected
                          ]}>
                            {category.name}
                          </Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </ScrollView>
                </View>
              </View>

              {/* System Employee Selection */}
              {modalType === 'system' && !editingEmployee && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Select Employee *</Text>
                  <View style={styles.pickerContainer}>
                    <Icon name="person" size={20} color="#10b981" />
                    <View style={styles.picker}>
                      {systemEmployees.map(emp => (
                        <TouchableOpacity
                          key={emp._id}
                          style={[
                            styles.pickerItem,
                            formData.employeeId === emp._id && styles.pickerItemSelected
                          ]}
                          onPress={() => handleInputChange('employeeId', emp._id)}
                        >
                          <Text style={[
                            styles.pickerItemText,
                            formData.employeeId === emp._id && styles.pickerItemTextSelected
                          ]}>
                            {emp.name} - {emp.email}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              )}

              {/* Manual Employee Fields */}
              {(modalType === 'manual' || (editingEmployee && editingEmployee.employeeType === 'manual')) && (
                <>
                  {/* Search User/Client */}
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>
                      Search User/Client 🔍
                    </Text>
                    <Text style={styles.helperText}>
                      Search by name or phone - includes all registered users and enquiries
                    </Text>
                    <View style={styles.inputContainer}>
                      <Icon name="search" size={20} color="#10b981" />
                      <TextInput
                        style={styles.input}
                        placeholder="Type name or phone number..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onFocus={() => {
                          if (searchResults.length > 0) {
                            setShowSearchDropdown(true);
                          }
                        }}
                      />
                      {searchLoading && (
                        <ActivityIndicator size="small" color="#10b981" style={styles.searchLoader} />
                      )}
                    </View>

                    {/* Search Results Dropdown */}
                    {showSearchDropdown && searchResults.length > 0 && (
                      <View style={styles.searchDropdown}>
                        <ScrollView style={styles.searchResultsList} nestedScrollEnabled>
                          {searchResults.map((user, index) => (
                            <TouchableOpacity
                              key={user._id || index}
                              style={styles.searchResultItem}
                              onPress={() => handleUserSelect(user)}
                            >
                              <View style={styles.searchResultContent}>
                                <View style={styles.searchResultIcon}>
                                  <Icon
                                    name={
                                      user.type === 'user' || user.source === 'users-api'
                                        ? "person"
                                        : user.type === 'enquiry' || user.source === 'enquiries'
                                          ? "person-outline"
                                          : user.type === 'buyer' || user.isBuyer
                                            ? "shopping-cart"
                                            : "store"
                                    }
                                    size={20}
                                    color="#10b981"
                                  />
                                </View>
                                <View style={styles.searchResultInfo}>
                                  <Text style={styles.searchResultName}>
                                    {user.fullName || user.name || 'Unknown'}
                                  </Text>
                                  <Text style={styles.searchResultPhone}>
                                    📞 {user.phone || user.mobile || user.contactNumber || 'No phone'}
                                  </Text>
                                  <Text style={styles.searchResultType}>
                                    {user.type === 'user' || user.source === 'users-api'
                                      ? '👤 User'
                                      : user.type === 'enquiry' || user.source === 'enquiries'
                                        ? '📋 Enquiry'
                                        : user.type === 'buyer' || user.isBuyer
                                          ? '🛒 Buyer'
                                          : '🏪 Seller'}
                                  </Text>
                                </View>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    {showSearchDropdown && searchResults.length === 0 && !searchLoading && searchQuery.length >= 2 && (
                      <View style={styles.searchDropdown}>
                        <View style={styles.noResultsContainer}>
                          <Icon name="person-off" size={32} color="#9ca3af" />
                          <Text style={styles.noResultsText}>No users found</Text>
                        </View>
                      </View>
                    )}
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Name *</Text>
                    <View style={styles.inputContainer}>
                      <Icon name="person" size={20} color="#10b981" />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter full name"
                        value={formData.name}
                        onChangeText={(value) => handleInputChange('name', value)}
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Phone *</Text>
                    <View style={styles.inputContainer}>
                      <Icon name="phone" size={20} color="#10b981" />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter phone number"
                        value={formData.phone}
                        onChangeText={(value) => handleInputChange('phone', value)}
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>
                </>
              )}

              {/* Expertise */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Expertise</Text>
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons name="briefcase" size={20} color="#10b981" />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Commercial Real Estate"
                    value={formData.expertise}
                    onChangeText={(value) => handleInputChange('expertise', value)}
                  />
                </View>
              </View>

              {/* Experience Years */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Years of Experience</Text>
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons name="clock-outline" size={20} color="#10b981" />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 5"
                    value={formData.experienceYears}
                    onChangeText={(value) => handleInputChange('experienceYears', value)}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Description */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <View style={styles.textAreaContainer}>
                  <Icon name="description" size={20} color="#10b981" />
                  <TextInput
                    style={styles.textArea}
                    placeholder="Brief description of expertise and achievements"
                    value={formData.description}
                    onChangeText={(value) => handleInputChange('description', value)}
                    multiline
                    numberOfLines={4}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCloseModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
              >
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  style={styles.submitGradient}
                >
                  <Text style={styles.submitButtonText}>
                    {editingEmployee ? 'Update Employee' : 'Add to USP'}
                  </Text>
                </LinearGradient>
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
    backgroundColor: '#f3f4f6',
  },
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    marginBottom: 12,
  },
  headerContent: {
    marginTop: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  addSystemButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  addManualButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  filterContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  countBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  categoryFilterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryFilterItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  categoryFilterItemActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  categoryFilterText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  categoryFilterTextActive: {
    color: '#fff',
  },
  employeesContainer: {
    marginBottom: 16,
  },
  employeeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  employeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  employeeContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  employeeContact: {
    fontSize: 13,
    color: '#6b7280',
  },
  employeeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  editButton: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
  },
  employeeDetails: {
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#1f2937',
    flex: 1,
  },
  categoryBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  descriptionContainer: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#f9fafb',
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  descriptionText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 4,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '92%',
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalBody: {
    padding: 20,
    flex: 1,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    flex: 1,
  },
  successAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  successText: {
    fontSize: 14,
    color: '#10b981',
    flex: 1,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1f2937',
  },
  textAreaContainer: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingTop: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
    alignItems: 'flex-start',
  },
  textArea: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  addCategoryContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  addCategoryInput: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1f2937',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  addCategoryButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addCategoryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  pickerContainer: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  picker: {
    flex: 1,
    maxHeight: 200,
  },
  pickerItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  pickerItemSelected: {
    backgroundColor: '#10b981',
  },
  pickerItemText: {
    fontSize: 14,
    color: '#1f2937',
  },
  pickerItemTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  submitButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  submitGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  searchLoader: {
    marginLeft: 8,
  },
  searchDropdown: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    maxHeight: 200,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchResultsList: {
    maxHeight: 200,
  },
  searchResultItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  searchResultContent: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
    gap: 12,
  },
  searchResultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  searchResultPhone: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 2,
  },
  searchResultType: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  noResultsContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
});

export default USPEmployeesScreen;
