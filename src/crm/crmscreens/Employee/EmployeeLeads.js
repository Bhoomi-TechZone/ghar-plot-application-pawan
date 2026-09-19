/**
 * Employee Leads Screen
 * Unified view for both Enquiry Leads and Client Leads
 * With permission-based action controls
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
  ScrollView,
  Platform,
  StatusBar,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReminderModal from '../../components/Enquiries/modals/ReminderModal';
import FollowUpModal from '../../components/Enquiries/modals/FollowUpModal';
import { createReminder } from '../../services/crmEnquiryApi';
import PermissionGate, { usePermissionCheck } from '../../../components/PermissionGate';
import { MODULES } from '../../../context/PermissionContext';
import CrossPlatformAlert from '../../../utils/crossPlatformAlert';

const API_BASE_URL = 'https://ghar-plot-backend1.onrender.com';

const EmployeeLeads = ({ navigation, openDrawer }) => {
  // ============================================
  // PERMISSION CHECK
  // ============================================
  const { canRead, canCreate, canUpdate, canDelete } = usePermissionCheck(MODULES.LEADS);

  // ============================================
  // STATE MANAGEMENT
  // ============================================
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [showFavorites, setShowFavorites] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [followUpModalVisible, setFollowUpModalVisible] = useState(false);
  const [overflowMenuVisible, setOverflowMenuVisible] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [statsData, setStatsData] = useState({
    total: 0,
    enquiry: 0,
    client: 0,
    active: 0,
    completed: 0,
  });
  const [viewedLeads, setViewedLeads] = useState([]);

  // Filter Options
  const STATUS_OPTIONS = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Completed', value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  const TYPE_OPTIONS = [
    { label: 'All Types', value: 'all' },
    { label: 'Enquiry Leads', value: 'enquiry' },
    { label: 'Client Leads', value: 'client' },
  ];

  // ============================================
  // LIFECYCLE
  // ============================================
  useEffect(() => {
    const initializeData = async () => {
      await loadViewedLeads();
      await loadFavorites();
      loadLeads();
    };
    initializeData();
  }, []);

  useEffect(() => {
    if (leads.length > 0) {
      filterLeads();
    }
  }, [searchQuery, leads, selectedStatus, selectedType, showFavorites, viewedLeads]);

  // ============================================
  // FAVORITES MANAGEMENT
  // ============================================
  const loadFavorites = async () => {
    try {
      const storedFavorites = await AsyncStorage.getItem('employeeLeadsFavorites');
      if (storedFavorites) {
        setFavorites(JSON.parse(storedFavorites));
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  // ============================================
  // VIEWED LEADS MANAGEMENT (For NEW tag)
  // ============================================
  const loadViewedLeads = async () => {
    try {
      const storedViewedLeads = await AsyncStorage.getItem('employeeViewedLeads');
      if (storedViewedLeads) {
        setViewedLeads(JSON.parse(storedViewedLeads));
      }
    } catch (error) {
      console.error('Error loading viewed leads:', error);
    }
  };

  const markLeadAsViewed = async (leadId) => {
    try {
      if (!viewedLeads.includes(leadId)) {
        const newViewedLeads = [...viewedLeads, leadId];
        setViewedLeads(newViewedLeads);
        await AsyncStorage.setItem('employeeViewedLeads', JSON.stringify(newViewedLeads));
        console.log('? Lead marked as viewed:', leadId);
      }
    } catch (error) {
      console.error('Error marking lead as viewed:', error);
    }
  };

  const isNewLead = (leadId) => {
    return !viewedLeads.includes(leadId);
  };

  const toggleFavorite = async (leadId) => {
    try {
      let newFavorites;
      if (favorites.includes(leadId)) {
        newFavorites = favorites.filter(id => id !== leadId);
      } else {
        newFavorites = [...favorites, leadId];
      }
      setFavorites(newFavorites);
      await AsyncStorage.setItem('employeeLeadsFavorites', JSON.stringify(newFavorites));
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  // ============================================
  // GET AUTH TOKEN
  // ============================================
  const getToken = async () => {
    let token = await AsyncStorage.getItem('employee_auth_token');
    if (!token) token = await AsyncStorage.getItem('employee_token');
    if (!token) token = await AsyncStorage.getItem('employeeToken');
    if (!token) token = await AsyncStorage.getItem('admin_token');
    if (!token) token = await AsyncStorage.getItem('adminToken');
    if (!token) token = await AsyncStorage.getItem('crm_auth_token');
    if (!token) token = await AsyncStorage.getItem('token');
    return token;
  };

  // ============================================
  // FETCH LEADS (Both Types in Parallel)
  // ============================================
  const loadLeads = async () => {
    try {
      setIsLoading(true);

      const token = await getToken();

      if (!token) {
        CrossPlatformAlert.alert('Error', 'No authentication token found. Please login again.');
        setIsLoading(false);
        return;
      }

      console.log('?? Fetching both enquiry and client leads...');

      // Fetch both lead types in parallel
      const [enquiryResponse, clientResponse] = await Promise.all([
        // Enquiry Leads
        fetch(`${API_BASE_URL}/employee/leads/my-leads`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }),
        // Client Leads
        fetch(`${API_BASE_URL}/employee/user-leads/my-client-leads`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }),
      ]);

      // Parse responses
      let enquiryData = { success: false, data: { assignments: [] } };
      let clientData = { success: false, data: { assignments: [] } };

      if (enquiryResponse.ok) {
        const enquiryText = await enquiryResponse.text();
        try {
          enquiryData = JSON.parse(enquiryText);
          console.log('? Enquiry leads fetched:', enquiryData?.data?.assignments?.length || 0);
        } catch (error) {
          console.error('Failed to parse enquiry JSON:', error);
        }
      } else {
        console.log('?? Enquiry leads endpoint returned:', enquiryResponse.status);
      }

      if (clientResponse.ok) {
        const clientText = await clientResponse.text();
        try {
          clientData = JSON.parse(clientText);
          console.log('? Client leads fetched:', clientData?.data?.assignments?.length || 0);
        } catch (error) {
          console.error('Failed to parse client JSON:', error);
        }
      } else {
        console.log('?? Client leads endpoint returned:', clientResponse.status);
      }

      // Transform and combine leads
      const transformedLeads = [];

      // Process Enquiry Leads
      if (enquiryData.success && enquiryData.data?.assignments) {
        const enquiryLeads = enquiryData.data.assignments.map(assignment => ({
          _id: assignment._id,
          leadType: 'enquiry',
          assignmentId: assignment._id,

          // Client Info - handle both automated (buyerId) and manual entries
          clientName: assignment.enquiry?.buyerId?.fullName || assignment.enquiry?.clientName || 'N/A',
          clientPhone: assignment.enquiry?.buyerId?.phone || assignment.enquiry?.contactNumber || 'N/A',
          clientEmail: assignment.enquiry?.buyerId?.email || assignment.enquiry?.email || 'N/A',
          
          // Property Info - handle both propertyId model and manual fields
          propertyType: assignment.enquiry?.propertyId?.propertyType || assignment.enquiry?.productType || 'N/A',
          propertyLocation: assignment.enquiry?.propertyId?.propertyLocation || assignment.enquiry?.location || assignment.enquiry?.address || 'N/A',
          propertyPrice: assignment.enquiry?.propertyId?.price || 0,

          // Assignment Info
          priority: assignment.priority || 'medium',
          status: assignment.status || 'active',
          assignedDate: assignment.assignedDate,
          notes: assignment.notes || '',
          message: assignment.enquiry?.message || assignment.enquiry?.majorComments || '',

          // Employee Info
          employeeName: assignment.employeeId?.name || '',
          employeeEmail: assignment.employeeId?.email || '',

          // Raw data for reference
          rawData: assignment,
        }));
        transformedLeads.push(...enquiryLeads);
      }

      // Process Client Leads
      if (clientData.success && clientData.data?.assignments) {
        const clientLeads = clientData.data.assignments.map(assignment => ({
          _id: assignment._id,
          leadType: 'client',
          assignmentId: assignment._id,

          // Client Info from userId
          clientName: assignment.userId?.fullName || 'N/A',
          clientPhone: assignment.userId?.phone || 'N/A',
          clientEmail: assignment.userId?.email || 'N/A',

          // Location Info
          city: assignment.userId?.city || '',
          state: assignment.userId?.state || '',
          propertyLocation: `${assignment.userId?.city || ''}, ${assignment.userId?.state || ''}`.trim().replace(/^,|,$/g, '') || 'N/A',

          // User Verification
          isEmailVerified: assignment.userId?.isEmailVerified || false,
          isPhoneVerified: assignment.userId?.isPhoneVerified || false,
          lastLogin: assignment.userId?.lastLogin,

          // Assignment Info
          priority: assignment.priority || 'medium',
          status: assignment.status || 'active',
          assignedDate: assignment.assignedDate,
          notes: assignment.notes || '',

          // Assignment By
          assignedBy: assignment.assignedBy?.fullName || 'Admin',

          // Employee Info
          employeeName: assignment.employeeId?.name || '',
          employeeEmail: assignment.employeeId?.email || '',

          // Raw data
          rawData: assignment,
        }));
        transformedLeads.push(...clientLeads);
      }

      // Sort by assigned date (newest first)
      transformedLeads.sort((a, b) =>
        new Date(b.assignedDate) - new Date(a.assignedDate)
      );

      setLeads(transformedLeads);

      // Calculate statistics
      setStatsData({
        total: transformedLeads.length,
        enquiry: transformedLeads.filter(l => l.leadType === 'enquiry').length,
        client: transformedLeads.filter(l => l.leadType === 'client').length,
        active: transformedLeads.filter(l => l.status === 'active').length,
        completed: transformedLeads.filter(l => l.status === 'completed').length,
      });

      console.log('?? Total leads loaded:', transformedLeads.length);

    } catch (error) {
      console.error('? Error loading leads:', error);
      CrossPlatformAlert.alert('Error', 'Failed to load leads. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // ============================================
  // FILTER LEADS
  // ============================================
  const filterLeads = () => {
    let filtered = [...leads];

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(lead => lead.status === selectedStatus);
    }

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(lead => lead.leadType === selectedType);
    }

    // Filter by favorites
    if (showFavorites) {
      filtered = filtered.filter(lead => favorites.includes(lead._id));
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(lead =>
        lead.clientName?.toLowerCase().includes(query) ||
        lead.clientPhone?.toLowerCase().includes(query) ||
        lead.clientEmail?.toLowerCase().includes(query) ||
        lead.propertyLocation?.toLowerCase().includes(query)
      );
    }

    // Sort: New leads (not viewed) first, then by date
    filtered.sort((a, b) => {
      const aIsNew = !viewedLeads.includes(a._id);
      const bIsNew = !viewedLeads.includes(b._id);

      if (aIsNew && !bIsNew) return -1;
      if (!aIsNew && bIsNew) return 1;

      // Both same status, sort by date (newest first)
      return new Date(b.assignedDate) - new Date(a.assignedDate);
    });

    setFilteredLeads(filtered);
  };

  // ============================================
  // UPDATE LEAD STATUS
  // ============================================
  const handleStatusChange = async (lead, newStatus) => {
    try {
      const token = await getToken();

      console.log(`?? Updating ${lead.leadType} lead status to:`, newStatus);
      console.log('?? Token present:', token ? 'Yes' : 'No');
      console.log('?? Assignment ID:', lead.assignmentId || lead._id);

      if (!token) {
        CrossPlatformAlert.alert('Error', 'Authentication token not found. Please login again.');
        return;
      }

      // Different endpoints for different lead types
      const endpoint = lead.leadType === 'enquiry'
        ? `${API_BASE_URL}/employee/leads/status/${lead.assignmentId}`
        : `${API_BASE_URL}/employee/user-leads/status/${lead.assignmentId}`;

      console.log('?? Request URL:', endpoint);
      console.log('?? Request Body:', { status: newStatus });

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      console.log('?? Response Status:', response.status);
      console.log('?? Response OK:', response.ok);

      let result;
      const responseText = await response.text();

      console.log('?? Raw Response Text:', responseText.substring(0, 300));

      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('?? Failed to parse JSON:', parseError.message);
        console.error('?? Raw text was:', responseText.substring(0, 500));
        result = { success: false, message: 'Invalid server response: ' + responseText.substring(0, 100) };
      }

      console.log('?? Parsed Response Data:', result);
      console.log('?? Response Success Field:', result.success);
      console.log('?? Response OK from HTTP:', response.ok);

      // Check both success flag and HTTP status
      const isSuccess = result.success === true || (response.ok && response.status < 300);

      if (isSuccess) {
        // Update local state
        setLeads(prev =>
          prev.map(l =>
            l._id === lead._id ? { ...l, status: newStatus } : l
          )
        );
        console.log('? Status updated successfully');
        CrossPlatformAlert.alert('Success', 'Lead status updated successfully');
        // Refresh the list to sync with backend
        setTimeout(() => loadLeads(), 500);
      } else {
        console.log('? Status update failed:', result.message);
        console.log('? Full error response:', result);
        CrossPlatformAlert.alert('Error', result.message || `Failed to update status (${response.status})`);
      }
    } catch (error) {
      console.error('? Status update error:', error);
      console.error('? Error details:', error.message);
      CrossPlatformAlert.alert('Error', 'Failed to update lead status: ' + error.message);
    }
  };

  // ============================================
  // SET REMINDER FOR LEAD
  // ============================================
  const handleSetReminder = (lead) => {
    // Convert lead data to enquiry format for ReminderModal
    const enquiryData = {
      _id: lead._id,
      leadId: lead._id,
      leadType: lead.leadType,
      clientName: lead.clientName,
      email: lead.clientEmail,  // ReminderModal expects 'email' not 'clientEmail'
      phone: lead.clientPhone,   // ReminderModal accepts both 'phone' and 'contactNumber'
      contactNumber: lead.clientPhone,  // Adding both for compatibility
      propertyLocation: lead.propertyLocation,
      location: lead.propertyLocation,  // Adding fallback for compatibility
      propertyType: lead.propertyType,
      message: lead.notes || lead.message || '',
      enquiryType: lead.leadType === 'enquiry' ? 'Inquiry' : 'ClientLead',
      source: lead.leadType,
    };

    console.log('?? Setting reminder for lead:', enquiryData);
    setSelectedLead(enquiryData);
    setReminderModalVisible(true);
  };

  const handleReminderSuccess = (lead) => {
    console.log('? Reminder set successfully for lead:', lead.clientName);
    // You can add additional logic here if needed
  };

  // ============================================
  // CREATE FOLLOW-UP FOR LEAD
  // ============================================
  const handleCreateFollowUp = (lead) => {
    // Convert lead data to enquiry format for FollowUpModal
    // For enquiry leads: propertyType and propertyLocation from property
    // For client leads: propertyLocation from city/state, propertyType from lead type
    const enquiryData = {
      _id: lead._id,
      id: lead._id,
      leadId: lead._id,
      assignmentId: lead._id,
      type: lead.leadType,
      leadType: lead.leadType === 'enquiry' ? 'LeadAssignment' : 'UserLeadAssignment',
      clientName: lead.clientName,
      contactNumber: lead.clientPhone,
      phone: lead.clientPhone,
      email: lead.clientEmail,
      propertyLocation: lead.propertyLocation && lead.propertyLocation !== 'N/A'
        ? lead.propertyLocation
        : (lead.city || '') + (lead.state ? (lead.city ? ', ' : '') + lead.state : '') || 'Not specified',
      propertyType: lead.propertyType && lead.propertyType !== 'N/A'
        ? lead.propertyType
        : (lead.leadType === 'enquiry' ? 'Property Enquiry' : 'Client Lead'),
      message: lead.notes || lead.message || '',
      enquiryType: lead.leadType === 'enquiry' ? 'Inquiry' : 'ManualInquiry',
      source: lead.leadType,
    };

    console.log('?? Creating follow-up for lead:', enquiryData);
    setSelectedLead(enquiryData);
    setFollowUpModalVisible(true);
  };

  const handleFollowUpSuccess = (lead) => {
    console.log('? Follow-up created successfully for lead:', lead.clientName);
    // You can add additional logic here if needed
  };

  // ============================================
  // OVERFLOW MENU FOR SECONDARY ACTIONS
  // ============================================
  const showLeadMenu = (lead) => {
    setSelectedLead(lead);
    setOverflowMenuVisible(true);
  };

  const handleMenuAction = (action) => {
    if (!selectedLead) return;

    setOverflowMenuVisible(false);

    if (action === 'reactivate') {
      if (selectedLead.status !== 'active') {
        handleStatusChange(selectedLead, 'active');
      }
    } else if (action === 'cancel') {
      CrossPlatformAlert.alert(
        'Cancel Lead',
        `Are you sure you want to cancel the lead for ${selectedLead.clientName}?`,
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes, Cancel',
            onPress: () => handleStatusChange(selectedLead, 'cancelled'),
            style: 'destructive',
          },
        ]
      );
    } else if (action === 'reminder') {
      handleSetReminder(selectedLead);
    }
  };

  // Render Overflow Menu Modal
  const renderOverflowMenu = () => (
    <Modal
      visible={overflowMenuVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setOverflowMenuVisible(false)}
    >
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.menuBackdrop}
        activeOpacity={1}
        onPress={() => setOverflowMenuVisible(false)}
      >
        {/* Menu Container */}
        <View style={styles.menuContainer}>
          {/* Menu Header */}
          <View style={styles.menuHeader}>
            <Text style={styles.menuTitle}>More Actions</Text>
            <Text style={styles.menuSubtitle}>{selectedLead?.clientName}</Text>
          </View>

          {/* Menu Items */}
          <View style={styles.menuItems}>
            {/* Reactivate */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuAction('reactivate')}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconBox, { backgroundColor: '#DBEAFE' }]}>
                <Icon name="restore" size={20} color="#3B82F6" />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemText}>Reactivate</Text>
                <Text style={styles.menuItemSubtext}>Mark as active again</Text>
              </View>
              <Icon name="chevron-right" size={20} color="#D1D5DB" />
            </TouchableOpacity>

            {/* Reminder */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuAction('reminder')}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconBox, { backgroundColor: '#FEF3C7' }]}>
                <Icon name="bell-outline" size={20} color="#F59E0B" />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemText}>Reminder</Text>
                <Text style={styles.menuItemSubtext}>Set a follow-up reminder</Text>
              </View>
              <Icon name="chevron-right" size={20} color="#D1D5DB" />
            </TouchableOpacity>

            {/* Cancel - Destructive */}
            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemDestructive]}
              onPress={() => handleMenuAction('cancel')}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconBox, { backgroundColor: '#FEE2E2' }]}>
                <Icon name="close-circle" size={20} color="#EF4444" />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={[styles.menuItemText, { color: '#EF4444' }]}>Cancel Lead</Text>
                <Text style={styles.menuItemSubtext}>Mark as cancelled</Text>
              </View>
              <Icon name="chevron-right" size={20} color="#FECACA" />
            </TouchableOpacity>
          </View>

          {/* Close Button */}
          <TouchableOpacity
            style={styles.menuCloseButton}
            onPress={() => setOverflowMenuVisible(false)}
            activeOpacity={0.7}
          >
            <Text style={styles.menuCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  const getStatusColor = (status) => {
    const colors = {
      active: '#3B82F6',
      completed: '#10B981',
      cancelled: '#EF4444',
    };
    return colors[status] || '#6B7280';
  };

  const getStatusIcon = (status) => {
    const icons = {
      active: 'clock-outline',
      completed: 'check-circle',
      cancelled: 'close-circle',
    };
    return icons[status] || 'help-circle';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      urgent: '#DC2626',
      high: '#F59E0B',
      medium: '#3B82F6',
      low: '#10B981',
    };
    return colors[priority] || '#6B7280';
  };

  const getLeadTypeColor = (type) => {
    return type === 'enquiry' ? '#8B5CF6' : '#06B6D4';
  };

  const getLeadTypeIcon = (type) => {
    return type === 'enquiry' ? 'home-search' : 'account-tie';
  };

  // ============================================
  // RENDER LEAD CARD
  // ============================================
  const renderLeadCard = ({ item }) => {
    const isFavorite = favorites.includes(item._id);
    const isNew = isNewLead(item._id);

    const handleLeadPress = () => {
      // Mark as viewed if new
      if (isNew) {
        markLeadAsViewed(item._id);
      }
      // Navigate to details screen
      navigation.navigate('LeadDetails', { lead: item });
    };

    return (
      <TouchableOpacity
        style={[styles.leadCard, isNew && styles.newLeadCard]}
        onPress={handleLeadPress}
        activeOpacity={0.9}
      >
        {/* NEW Tag */}
        {isNew && (
          <View style={styles.newTagContainer}>
            <View style={styles.newTag}>
              <Icon name="star" size={10} color="#fff" />
              <Text style={styles.newTagText}>NEW</Text>
            </View>
          </View>
        )}

        {/* Lead Header with Type Badge and Priority */}
        <View style={styles.leadHeader}>
          <View style={styles.headerLeft}>
            {/* Lead Type Badge */}
            <View style={[styles.typeBadge, { backgroundColor: `${getLeadTypeColor(item.leadType)}20` }]}>
              <Icon name={getLeadTypeIcon(item.leadType)} size={14} color={getLeadTypeColor(item.leadType)} />
              <Text style={[styles.typeText, { color: getLeadTypeColor(item.leadType) }]}>
                {item.leadType === 'enquiry' ? 'Enquiry' : 'Client'}
              </Text>
            </View>
            {/* Priority Badge */}
            <View style={[styles.priorityBadge, { backgroundColor: `${getPriorityColor(item.priority)}15` }]}>
              <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
                {item.priority?.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Favorite Button */}
          <TouchableOpacity onPress={() => toggleFavorite(item._id)}>
            <Icon
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={22}
              color={isFavorite ? '#EF4444' : '#9CA3AF'}
            />
          </TouchableOpacity>
        </View>

        {/* Client Info */}
        <View style={styles.clientInfo}>
          <Text style={styles.clientName}>{item.clientName}</Text>
          <View style={styles.contactRow}>
            <Icon name="phone" size={14} color="#6B7280" />
            <Text style={styles.contactText}>{item.clientPhone}</Text>
          </View>
          <View style={styles.contactRow}>
            <Icon name="email" size={14} color="#6B7280" />
            <Text style={styles.contactText}>{item.clientEmail}</Text>
          </View>
          {item.propertyLocation && item.propertyLocation !== 'N/A' && (
            <View style={styles.contactRow}>
              <Icon name="map-marker" size={14} color="#6B7280" />
              <Text style={styles.contactText}>{item.propertyLocation}</Text>
            </View>
          )}
        </View>

        {/* Property Details (Enquiry Leads) */}
        {item.leadType === 'enquiry' && (
          <View style={styles.propertyInfo}>
            <Text style={styles.propertyLabel}>Property Type:</Text>
            <Text style={styles.propertyValue}>{item.propertyType}</Text>
            {item.propertyPrice > 0 && (
              <>
                <Text style={styles.propertyLabel}>Price:</Text>
                <Text style={styles.propertyValue}>?{(item.propertyPrice / 100000).toFixed(2)}L</Text>
              </>
            )}
          </View>
        )}

        {/* Verification Badges (Client Leads) */}
        {item.leadType === 'client' && (
          <View style={styles.verificationInfo}>
            {item.isEmailVerified && (
              <View style={styles.verifiedBadge}>
                <Icon name="check-decagram" size={14} color="#10B981" />
                <Text style={styles.verifiedText}>Email Verified</Text>
              </View>
            )}
            {item.isPhoneVerified && (
              <View style={styles.verifiedBadge}>
                <Icon name="check-decagram" size={14} color="#10B981" />
                <Text style={styles.verifiedText}>Phone Verified</Text>
              </View>
            )}
          </View>
        )}

        {/* Status and Date */}
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
            <Icon name={getStatusIcon(item.status)} size={14} color={getStatusColor(item.status)} />
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status?.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.dateText}>
            {item.assignedDate ? new Date(item.assignedDate).toLocaleDateString() : 'N/A'}
          </Text>
        </View>

        {/* Notes/Message */}
        {(item.notes || item.message) && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Notes:</Text>
            <Text style={styles.notesText} numberOfLines={2}>
              {item.notes || item.message}
            </Text>
          </View>
        )}

        {/* Action Buttons - Modern CRM Style */}
        <View style={styles.actionBar}>
          {/* Primary Actions Row */}
          <View style={styles.primaryActionsRow}>
            {/* Complete Button */}
            <TouchableOpacity
              style={[
                styles.primaryButton,
                item.status === 'completed' && styles.buttonDisabled
              ]}
              onPress={() => handleStatusChange(item, 'completed')}
              disabled={item.status === 'completed'}
              activeOpacity={0.7}
            >
              <Icon name="check" size={16} color="#10B981" />
              <Text style={styles.primaryButtonText}>Complete</Text>
            </TouchableOpacity>

            {/* Follow-up Button */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => handleCreateFollowUp(item)}
              activeOpacity={0.7}
            >
              <Icon name="phone-callback" size={16} color="#3B82F6" />
              <Text style={styles.primaryButtonText}>Follow-up</Text>
            </TouchableOpacity>

            {/* Overflow Menu */}
            <TouchableOpacity
              style={styles.overflowButton}
              onPress={() => showLeadMenu(item)}
              activeOpacity={0.7}
            >
              <Icon name="dots-vertical" size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ============================================
  // RENDER EMPTY STATE
  // ============================================
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="briefcase-off-outline" size={64} color="#D1D5DB" />
      <Text style={styles.emptyText}>No leads found</Text>
      <Text style={styles.emptySubtext}>
        {searchQuery
          ? 'Try adjusting your search filters'
          : showFavorites
            ? 'No favorite leads yet'
            : 'Check back later for new assignments'}
      </Text>
    </View>
  );

  // ============================================
  // LOADING STATE
  // ============================================
  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading All Leads...</Text>
        <Text style={styles.loadingSubtext}>Fetching enquiry and client leads</Text>
      </View>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3730A3" />

      {/* Premium Header */}
      <View style={styles.header}>
        <View style={styles.headerGradient}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={openDrawer}
          >
            <Icon name="menu" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>My Leads</Text>
            <Text style={styles.headerSubtitle}>Manage all your assignments</Text>
          </View>
          <TouchableOpacity
            style={styles.headerAction}
            onPress={() => setFilterModalVisible(true)}
          >
            <Icon name="filter-variant" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, phone, email..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Leads</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Icon name="close" size={24} color="#1E293B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Type Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Lead Type</Text>
                <View style={styles.filterChipsContainer}>
                  {TYPE_OPTIONS.map(item => (
                    <TouchableOpacity
                      key={item.value}
                      style={[
                        styles.filterChip,
                        selectedType === item.value && styles.filterChipActive,
                      ]}
                      onPress={() => setSelectedType(item.value)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          selectedType === item.value && styles.filterChipTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Status Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Status</Text>
                <View style={styles.filterChipsContainer}>
                  {STATUS_OPTIONS.map(item => (
                    <TouchableOpacity
                      key={item.value}
                      style={[
                        styles.filterChip,
                        selectedStatus === item.value && styles.filterChipActive,
                      ]}
                      onPress={() => setSelectedStatus(item.value)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          selectedStatus === item.value && styles.filterChipTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Favorites Toggle */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Favorites</Text>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    showFavorites && styles.filterChipActive,
                  ]}
                  onPress={() => setShowFavorites(!showFavorites)}
                >
                  <Icon
                    name={showFavorites ? 'heart' : 'heart-outline'}
                    size={16}
                    color={showFavorites ? '#fff' : '#374151'}
                  />
                  <Text
                    style={[
                      styles.filterChipText,
                      showFavorites && styles.filterChipTextActive,
                      { marginLeft: 6 }
                    ]}
                  >
                    Show Favorites Only
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => {
                  setSelectedType('all');
                  setSelectedStatus('all');
                  setShowFavorites(false);
                }}
              >
                <Icon name="refresh" size={18} color="#6B7280" />
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setFilterModalVisible(false)}
              >
                <Icon name="check" size={20} color="#fff" />
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Leads List */}
      <FlatList
        data={filteredLeads}
        renderItem={renderLeadCard}
        keyExtractor={(item, index) => item._id || index.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              loadLeads();
            }}
            colors={['#4F46E5']}
          />
        }
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />

      {/* Reminder Modal */}
      <ReminderModal
        visible={reminderModalVisible}
        onClose={() => setReminderModalVisible(false)}
        enquiry={selectedLead}
        onSuccess={() => handleReminderSuccess(selectedLead)}
      />

      {/* Follow-up Modal */}
      <FollowUpModal
        visible={followUpModalVisible}
        onClose={() => setFollowUpModalVisible(false)}
        enquiry={selectedLead}
        onSuccess={() => handleFollowUpSuccess(selectedLead)}
      />

      {/* Overflow Menu Modal */}
      {renderOverflowMenu()}
    </View>
  );
};

export default EmployeeLeads;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },

  // ============================================
  // HEADER STYLES
  // ============================================
  header: {
    backgroundColor: '#3730A3',
    paddingTop: Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 0) + 10,
    paddingBottom: 12,
    elevation: 12,
    shadowColor: '#3730A3',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    marginLeft: 14,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    fontWeight: '500',
  },
  headerAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ============================================
  // LOADING STATE
  // ============================================
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 13,
    color: '#6B7280',
  },

  // ============================================
  // SEARCH CONTAINER
  // ============================================
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },

  // ============================================
  // LIST CONTENT
  // ============================================
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 80,
    flexGrow: 1,
  },

  // ============================================
  // LEAD CARD STYLES
  // ============================================
  leadCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    position: 'relative',
    overflow: 'hidden',
  },
  newLeadCard: {
    borderColor: '#10B981',
    borderWidth: 2,
    backgroundColor: '#F0FDF4',
    elevation: 5,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  newTagContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 10,
  },
  newTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderBottomLeftRadius: 10,
    borderTopRightRadius: 12,
    gap: 4,
  },
  newTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  leadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
    gap: 6,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 0,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 5,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
  },
  clientInfo: {
    marginBottom: 12,
  },
  clientName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
  },
  contactText: {
    fontSize: 13,
    color: '#4B5563',
    marginLeft: 8,
    fontWeight: '500',
  },
  propertyInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    gap: 12,
  },
  propertyLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '700',
  },
  propertyValue: {
    fontSize: 12,
    color: '#1F2937',
    fontWeight: '600',
  },
  verificationInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
    gap: 6,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  verifiedText: {
    fontSize: 11,
    color: '#047857',
    fontWeight: '700',
    marginLeft: 4,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 5,
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  notesContainer: {
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  notesLabel: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '700',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 18,
    fontWeight: '500',
  },

  // ============================================
  // ACTION BUTTONS - MODERN CRM STYLE
  // ============================================
  actionBar: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  primaryActionsRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  buttonDisabled: {
    backgroundColor: '#F3F4F6',
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    letterSpacing: 0.3,
  },
  overflowButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ============================================
  // EMPTY STATE
  // ============================================
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#374151',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },

  // ============================================
  // FILTER MODAL
  // ============================================
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  filterModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  filterSection: {
    marginBottom: 22,
  },
  filterSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 11,
  },
  filterChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#3730A3',
    borderColor: '#3730A3',
    elevation: 2,
    shadowColor: '#3730A3',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 10,
  },
  resetButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 9,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  resetButtonText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  applyButton: {
    flex: 1.8,
    backgroundColor: '#3730A3',
    paddingVertical: 12,
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#3730A3',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },

  // ============================================
  // OVERFLOW MENU STYLES
  // ============================================
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  menuHeader: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 16,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '500',
  },
  menuItems: {
    gap: 10,
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 12,
  },
  menuItemDestructive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  menuIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  menuItemSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 3,
    fontWeight: '500',
  },
  menuCloseButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  menuCloseText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6B7280',
  },
});
