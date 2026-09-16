import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import CrossPlatformAlert from '../../../utils/crossPlatformAlert';

const API_BASE_URL = 'https://gharplotbackend.gntechnology.de';

const AdminFollowUps = ({ navigation }) => {
  // Data States
  const [followUps, setFollowUps] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [statistics, setStatistics] = useState({
    total: 0,
    open: 0,
    close: 0,
    notInterested: 0,
  });

  // UI States
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Filter States
  const [filters, setFilters] = useState({
    search: '',
    caseStatus: 'all',
    priority: 'all',
    leadType: 'all',
    assignedAgent: 'all',
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 10,
  });

  // Modal States
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState(null);

  // Form States
  const [newComment, setNewComment] = useState('');
  const [actionTaken, setActionTaken] = useState('call');
  const [closeResult, setCloseResult] = useState('');
  const [closeResultError, setCloseResultError] = useState('');

  // Action Types Configuration
  const actionTypes = [
    { icon: '📞', label: 'Call', value: 'call', color: '#3b82f6' },
    { icon: '📧', label: 'Email', value: 'email', color: '#8b5cf6' },
    { icon: '👥', label: 'Meeting', value: 'meeting', color: '#10b981' },
    { icon: '🏠', label: 'Site Visit', value: 'site_visit', color: '#f59e0b' },
    { icon: '📄', label: 'Document', value: 'document_sent', color: '#6b7280' },
    { icon: '📅', label: 'Follow-up', value: 'follow_up_scheduled', color: '#ec4899' },
    { icon: '📝', label: 'Other', value: 'other', color: '#64748b' },
  ];

  // Filter Options
  const statusOptions = [
    { label: 'All Status', value: 'all', icon: '📋', color: '#3b82f6' },
    { label: 'Open', value: 'open', icon: '🟢', color: '#10b981' },
    { label: 'Closed', value: 'close', icon: '✅', color: '#6b7280' },
    { label: 'Not Interested', value: 'not-interested', icon: '❌', color: '#ef4444' },
  ];

  const priorityOptions = [
    { label: 'All Priority', value: 'all' },
    { label: 'Low', value: 'low', color: '#10b981' },
    { label: 'Medium', value: 'medium', color: '#f59e0b' },
    { label: 'High', value: 'high', color: '#ef4444' },
    { label: 'Urgent', value: 'urgent', color: '#dc2626' },
  ];

  const leadTypeOptions = [
    { label: 'All Types', value: 'all' },
    { label: 'Manual Enquiry', value: 'ManualInquiry' },
    { label: 'Client Enquiry', value: 'Inquiry' },
  ];

  // Check if user is admin
  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      const adminToken = await AsyncStorage.getItem('adminToken');
      const employeeToken = await AsyncStorage.getItem('employeeToken');
      const userRole = await AsyncStorage.getItem('userRole');

      console.log('Checking role - Admin Token:', !!adminToken, 'Employee Token:', !!employeeToken);

      const admin = !!adminToken || userRole === 'admin';
      setIsAdmin(admin);

      return admin;
    } catch (error) {
      console.error('Error checking role:', error);
      return false;
    }
  };

  // Fetch Follow-ups
  const fetchFollowUps = async (page = 1, appliedFilters = filters) => {
    try {
      setLoading(true);

      // Try both tokens
      let token = await AsyncStorage.getItem('adminToken');
      if (!token) {
        token = await AsyncStorage.getItem('employeeToken');
      }

      if (!token) {
        console.error('❌ No authentication token found');
        CrossPlatformAlert.alert('Error', 'Please login again');
        setLoading(false);
        return;
      }

      const useAdminEndpoint = !!await AsyncStorage.getItem('adminToken');
      console.log('🔄 Fetching follow-ups with admin endpoint:', useAdminEndpoint, 'token:', token.substring(0, 20) + '...');

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        populate: 'enquiryId.reminders',
        ...(appliedFilters.search && { search: appliedFilters.search }),
        ...(appliedFilters.caseStatus !== 'all' && { caseStatus: appliedFilters.caseStatus }),
        ...(appliedFilters.priority !== 'all' && { priority: appliedFilters.priority }),
        ...(appliedFilters.leadType !== 'all' && { leadType: appliedFilters.leadType }),
        ...(isAdmin && appliedFilters.assignedAgent !== 'all' && {
          assignedAgent: appliedFilters.assignedAgent,
        }),
      });

      const endpoint = useAdminEndpoint ? '/admin/follow-ups' : '/employee/follow-ups';

      console.log('🌐 Fetching from:', `${API_BASE_URL}${endpoint}?${params}`);

      const response = await axios.get(`${API_BASE_URL}${endpoint}?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('✅ Follow-ups response success:', response.data.success);
      console.log('📋 Count:', response.data.data?.followUps?.length || 0);

      if (response.data.success) {
        const followUpsData = response.data.data.followUps || [];
        console.log('✅ Follow-ups fetched successfully:', followUpsData.length);
        console.log('📋 Sample follow-up:', followUpsData[0] ? JSON.stringify(followUpsData[0], null, 2) : 'No data');

        setFollowUps(followUpsData);
        setPagination(response.data.data.pagination || { currentPage: 1, totalPages: 1, totalItems: 0, limit: 10 });
        setStatistics(response.data.data.statistics || { total: 0, open: 0, close: 0, notInterested: 0 });
      } else {
        console.error('❌ API returned success:false', response.data.message);
        CrossPlatformAlert.alert('Error', response.data.message || 'Failed to fetch follow-ups');
        setFollowUps([]);
      }
    } catch (error) {
      console.error('❌ Error fetching follow-ups:', error.message);
      console.error('Status:', error.response?.status);
      console.error('Response:', error.response?.data);
      CrossPlatformAlert.alert('Error', error.response?.data?.message || 'Failed to fetch follow-ups. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Employees (Admin only)
  const fetchEmployees = async () => {
    if (!isAdmin) return;

    try {
      let token = await AsyncStorage.getItem('adminToken');
      if (!token) {
        token = await AsyncStorage.getItem('employeeToken');
      }

      if (!token) {
        console.error('❌ No token found for employees fetch');
        return;
      }

      console.log('👥 Fetching employees for filter dropdown...');

      const response = await axios.get(`${API_BASE_URL}/admin/employees`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('✅ Employees response success:', response.data.success);
      console.log('Count:', response.data.data?.length || 0);

      if (response.data.success) {
        console.log('✅ Employees loaded for filter');
        setEmployees(response.data.data);
      }
    } catch (error) {
      console.error('❌ Error fetching employees:', error.message);
      console.error('Status:', error.response?.status);
    }
  };

  // Add Comment
  const handleAddComment = async () => {
    if (!newComment.trim()) {
      CrossPlatformAlert.alert('Error', 'Please enter comment text');
      return;
    }

    try {
      const token = await AsyncStorage.getItem(
        isAdmin ? 'adminToken' : 'employeeToken'
      );

      const response = await axios.post(
        `${API_BASE_URL}/api/follow-ups/${selectedFollowUp._id}/comment`,
        {
          text: newComment,
          actionTaken: actionTaken,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        CrossPlatformAlert.alert('Success', 'Comment added successfully');
        setNewComment('');
        setShowCommentModal(false);
        fetchFollowUps(currentPage);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      CrossPlatformAlert.alert('Error', 'Failed to add comment');
    }
  };

  // Close Follow-up
  const handleCloseFollowUp = async () => {
    if (!closeResult.trim()) {
      setCloseResultError('Result is required when closing');
      return;
    }

    try {
      const token = await AsyncStorage.getItem(
        isAdmin ? 'adminToken' : 'employeeToken'
      );

      const response = await axios.put(
        `${API_BASE_URL}/api/follow-ups/${selectedFollowUp._id}/status`,
        {
          caseStatus: 'close',
          result: closeResult,
          closedDate: new Date().toISOString(),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        CrossPlatformAlert.alert('Success', 'Follow-up closed successfully');
        setCloseResult('');
        setCloseResultError('');
        setShowCloseModal(false);
        fetchFollowUps(currentPage);
      }
    } catch (error) {
      console.error('Error closing follow-up:', error);
      CrossPlatformAlert.alert('Error', 'Failed to close follow-up');
    }
  };

  // Handle Filter Change
  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setCurrentPage(1);
    fetchFollowUps(1, newFilters);
  };

  // Initial Load
  useEffect(() => {
    const initializeData = async () => {
      console.log('🚀 AdminFollowUps initializing...');

      const role = await checkUserRole();
      console.log('✅ User role checked:', role ? 'Admin' : 'Employee');

      // Small delay to ensure state is updated
      setTimeout(() => {
        console.log('⏳ Starting follow-ups fetch...');
        fetchFollowUps();
      }, 100);
    };

    initializeData();
  }, []);

  // Fetch employees when admin role is confirmed
  useEffect(() => {
    if (isAdmin) {
      console.log('✅ Admin role confirmed, loading employees...');
      fetchEmployees();
    }
  }, [isAdmin]);

  // Pull to Refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchFollowUps(currentPage);
    setRefreshing(false);
  }, [currentPage]);

  // Format Date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Format Time
  const formatTime = (timeString) => {
    if (!timeString) return '';
    return timeString;
  };

  // Render Statistics
  const renderStatCard = (icon, label, count, color) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statCount}>{count}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  // Render Priority Badge
  const renderPriorityBadge = (priority) => {
    const config = {
      low: { color: '#10b981', label: 'Low', icon: '🟢' },
      medium: { color: '#f59e0b', label: 'Medium', icon: '🟡' },
      high: { color: '#ef4444', label: 'High', icon: '🔴' },
      urgent: { color: '#dc2626', label: 'Urgent', icon: '🚨' },
    };

    const style = config[priority] || config.medium;

    return (
      <View style={[styles.badge, { backgroundColor: style.color + '20' }]}>
        <Text style={[styles.badgeText, { color: style.color }]}>
          {style.icon} {style.label}
        </Text>
      </View>
    );
  };

  // Render Status Badge
  const renderStatusBadge = (status) => {
    const config = {
      open: { color: '#10b981', label: 'Open', icon: '🟢' },
      close: { color: '#6b7280', label: 'Closed', icon: '✅' },
      'not-interested': { color: '#ef4444', label: 'Not Interested', icon: '❌' },
    };

    const style = config[status] || config.open;

    return (
      <View style={[styles.badge, { backgroundColor: style.color + '20' }]}>
        <Text style={[styles.badgeText, { color: style.color }]}>
          {style.icon} {style.label}
        </Text>
      </View>
    );
  };

  // Render Follow-up Card
  const renderFollowUpCard = (followUp) => (
    <View key={followUp._id} style={styles.followUpCard}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.clientName}>👤 {followUp.clientName}</Text>
          {renderPriorityBadge(followUp.priority)}
        </View>
        {renderStatusBadge(followUp.caseStatus)}
      </View>

      {/* Contact Info */}
      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <Icon name="phone" size={16} color="#6b7280" />
          <Text style={styles.infoText}>{followUp.phone}</Text>
        </View>
        {followUp.email && (
          <View style={styles.infoRow}>
            <Icon name="email" size={16} color="#6b7280" />
            <Text style={styles.infoText}>{followUp.email}</Text>
          </View>
        )}
        <View style={styles.infoRow}>
          <Icon name="location-on" size={16} color="#6b7280" />
          <Text style={styles.infoText}>{followUp.location}</Text>
        </View>
        <View style={styles.infoRow}>
          <Icon name="home" size={16} color="#6b7280" />
          <Text style={styles.infoText}>{followUp.propertyType}</Text>
        </View>
      </View>

      {/* Follow-up Details */}
      <View style={styles.detailsSection}>
        <View style={styles.detailRow}>
          <Icon name="event" size={16} color="#6366f1" />
          <Text style={styles.detailText}>
            {formatDate(followUp.followUpDate)} at {formatTime(followUp.followUpTime)}
          </Text>
        </View>
        {followUp.notes && (
          <View style={styles.detailRow}>
            <Icon name="notes" size={16} color="#6366f1" />
            <Text style={styles.detailText}>{followUp.notes}</Text>
          </View>
        )}
      </View>

      {/* Assigned To (Admin View) */}
      {isAdmin && followUp.assignedTo && (
        <View style={styles.assignedSection}>
          <Icon name="person" size={16} color="#6366f1" />
          <Text style={styles.assignedText}>
            Assigned to: {followUp.assignedTo.name}
          </Text>
        </View>
      )}

      {/* Latest Comment */}
      {followUp.comments && followUp.comments.length > 0 && (
        <View style={styles.commentPreview}>
          <Text style={styles.commentLabel}>💬 Latest Comment:</Text>
          <Text style={styles.commentText} numberOfLines={2}>
            {followUp.comments[0].text}
          </Text>
          <Text style={styles.commentMeta}>
            By {followUp.comments[0].addedBy?.name} • {formatDate(followUp.comments[0].createdAt)}
          </Text>
        </View>
      )}

      {/* Reminder Count Badge */}
      {followUp.enquiryId?.reminders && followUp.enquiryId.reminders.length > 0 && (
        <View style={styles.reminderBadge}>
          <Icon name="notifications" size={14} color="#f59e0b" />
          <Text style={styles.reminderBadgeText}>
            {followUp.enquiryId.reminders.length} Reminder{followUp.enquiryId.reminders.length > 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* Result (Closed) */}
      {followUp.caseStatus === 'close' && followUp.result && (
        <View style={styles.resultSection}>
          <Text style={styles.resultLabel}>✅ Result:</Text>
          <Text style={styles.resultText}>{followUp.result}</Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => {
            setSelectedFollowUp(followUp);
            setShowCommentModal(true);
          }}
        >
          <Icon name="comment" size={18} color="#3b82f6" />
          <Text style={styles.actionBtnText}>Add Comment</Text>
        </TouchableOpacity>

        {followUp.caseStatus === 'open' && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.closeBtnStyle]}
            onPress={() => {
              setSelectedFollowUp(followUp);
              setShowCloseModal(true);
            }}
          >
            <Icon name="check-circle" size={18} color="#10b981" />
            <Text style={[styles.actionBtnText, { color: '#10b981' }]}>Close</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => {
            setSelectedFollowUp(followUp);
            setShowDetailsModal(true);
          }}
        >
          <Icon name="visibility" size={18} color="#6366f1" />
          <Text style={styles.actionBtnText}>View</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Follow-ups Management</Text>
      </LinearGradient>

      {/* Statistics */}
      <View style={styles.statsContainer}>
        {renderStatCard('📊', 'Total', statistics.total, '#3b82f6')}
        {renderStatCard('🟢', 'Open', statistics.open, '#10b981')}
        {renderStatCard('✅', 'Closed', statistics.close, '#6b7280')}
        {renderStatCard('❌', 'Not Interested', statistics.notInterested, '#ef4444')}
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
        {/* Search */}
        <View style={styles.searchBox}>
          <Icon name="search" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search client..."
            value={filters.search}
            onChangeText={(text) => handleFilterChange('search', text)}
          />
        </View>

        {/* Status Filter */}
        <View style={styles.filterBox}>
          <Picker
            selectedValue={filters.caseStatus}
            onValueChange={(value) => handleFilterChange('caseStatus', value)}
            style={styles.picker}
          >
            {statusOptions.map((option) => (
              <Picker.Item key={option.value} label={option.label} value={option.value} />
            ))}
          </Picker>
        </View>

        {/* Priority Filter */}
        <View style={styles.filterBox}>
          <Picker
            selectedValue={filters.priority}
            onValueChange={(value) => handleFilterChange('priority', value)}
            style={styles.picker}
          >
            {priorityOptions.map((option) => (
              <Picker.Item key={option.value} label={option.label} value={option.value} />
            ))}
          </Picker>
        </View>

        {/* Lead Type Filter */}
        <View style={styles.filterBox}>
          <Picker
            selectedValue={filters.leadType}
            onValueChange={(value) => handleFilterChange('leadType', value)}
            style={styles.picker}
          >
            {leadTypeOptions.map((option) => (
              <Picker.Item key={option.value} label={option.label} value={option.value} />
            ))}
          </Picker>
        </View>

        {/* Employee Filter (Admin Only) */}
        {isAdmin && employees.length > 0 && (
          <View style={styles.filterBox}>
            <Picker
              selectedValue={filters.assignedAgent}
              onValueChange={(value) => handleFilterChange('assignedAgent', value)}
              style={styles.picker}
            >
              <Picker.Item label="All Employees" value="all" />
              {employees.map((emp) => (
                <Picker.Item
                  key={emp._id}
                  label={`${emp.name} (${emp.assignedFollowUpsCount || 0})`}
                  value={emp._id}
                />
              ))}
            </Picker>
          </View>
        )}
      </ScrollView>

      {/* Follow-ups List */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Loading follow-ups...</Text>
          </View>
        ) : followUps.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="assignment" size={64} color="#d1d5db" />
            <Text style={styles.emptyStateTitle}>No Follow-ups Found</Text>
            <Text style={styles.emptyStateText}>
              {filters.search || filters.caseStatus !== 'all'
                ? 'Try adjusting your filters'
                : 'No follow-ups available'}
            </Text>
          </View>
        ) : (
          <>
            {followUps.map((followUp) => renderFollowUpCard(followUp))}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <View style={styles.pagination}>
                <TouchableOpacity
                  style={[styles.paginationBtn, currentPage === 1 && styles.paginationBtnDisabled]}
                  onPress={() => {
                    if (currentPage > 1) {
                      setCurrentPage(currentPage - 1);
                      fetchFollowUps(currentPage - 1);
                    }
                  }}
                  disabled={currentPage === 1}
                >
                  <Icon
                    name="chevron-left"
                    size={24}
                    color={currentPage === 1 ? '#d1d5db' : '#6366f1'}
                  />
                </TouchableOpacity>

                <Text style={styles.paginationText}>
                  Page {pagination.currentPage} of {pagination.totalPages}
                </Text>

                <TouchableOpacity
                  style={[
                    styles.paginationBtn,
                    currentPage === pagination.totalPages && styles.paginationBtnDisabled,
                  ]}
                  onPress={() => {
                    if (currentPage < pagination.totalPages) {
                      setCurrentPage(currentPage + 1);
                      fetchFollowUps(currentPage + 1);
                    }
                  }}
                  disabled={currentPage === pagination.totalPages}
                >
                  <Icon
                    name="chevron-right"
                    size={24}
                    color={currentPage === pagination.totalPages ? '#d1d5db' : '#6366f1'}
                  />
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Add Comment Modal */}
      <Modal visible={showCommentModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Comment</Text>
              <TouchableOpacity onPress={() => setShowCommentModal(false)}>
                <Icon name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Client Info */}
              {selectedFollowUp && (
                <View style={styles.clientInfoBox}>
                  <Text style={styles.modalLabel}>Client:</Text>
                  <Text style={styles.clientNameModal}>{selectedFollowUp.clientName}</Text>
                  <Text style={styles.clientPhoneModal}>{selectedFollowUp.phone}</Text>
                </View>
              )}

              {/* Action Type Selector */}
              <Text style={styles.modalLabel}>Action Taken:</Text>
              <View style={styles.actionTypeGrid}>
                {actionTypes.map((action) => (
                  <TouchableOpacity
                    key={action.value}
                    style={[
                      styles.actionTypeBtn,
                      actionTaken === action.value && styles.actionTypeSelected,
                    ]}
                    onPress={() => setActionTaken(action.value)}
                  >
                    <Text style={styles.actionTypeIcon}>{action.icon}</Text>
                    <Text style={styles.actionTypeLabel}>{action.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Comment Input */}
              <Text style={styles.modalLabel}>Comment:</Text>
              <TextInput
                style={styles.commentInput}
                placeholder="Enter your comment..."
                multiline
                numberOfLines={4}
                value={newComment}
                onChangeText={setNewComment}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowCommentModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleAddComment}>
                <Text style={styles.submitBtnText}>Add Comment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Close Follow-up Modal */}
      <Modal visible={showCloseModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Close Follow-up</Text>
              <TouchableOpacity onPress={() => setShowCloseModal(false)}>
                <Icon name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Client Info */}
              {selectedFollowUp && (
                <View style={styles.clientInfoBox}>
                  <Text style={styles.modalLabel}>Closing follow-up for:</Text>
                  <Text style={styles.clientNameModal}>{selectedFollowUp.clientName}</Text>
                  <Text style={styles.clientPhoneModal}>{selectedFollowUp.phone}</Text>
                </View>
              )}

              {/* Result Input */}
              <Text style={styles.modalLabel}>Result: *</Text>
              <TextInput
                style={styles.resultInput}
                placeholder="Enter final result (Required)"
                multiline
                numberOfLines={6}
                value={closeResult}
                onChangeText={(text) => {
                  setCloseResult(text);
                  setCloseResultError('');
                }}
              />
              {closeResultError ? (
                <Text style={styles.errorText}>{closeResultError}</Text>
              ) : null}

              <Text style={styles.helpText}>
                💡 Examples: "Deal closed", "Client purchased property", "Client not interested", etc.
              </Text>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowCloseModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleCloseFollowUp}>
                <Text style={styles.submitBtnText}>Close Follow-up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Details Modal */}
      <Modal visible={showDetailsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Follow-up Details</Text>
              <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                <Icon name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedFollowUp && (
                <>
                  {/* Client Details */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Client Information</Text>
                    <Text style={styles.detailItem}>Name: {selectedFollowUp.clientName}</Text>
                    <Text style={styles.detailItem}>Phone: {selectedFollowUp.phone}</Text>
                    {selectedFollowUp.email && (
                      <Text style={styles.detailItem}>Email: {selectedFollowUp.email}</Text>
                    )}
                    <Text style={styles.detailItem}>Location: {selectedFollowUp.location}</Text>
                    <Text style={styles.detailItem}>
                      Property: {selectedFollowUp.propertyType}
                    </Text>
                  </View>

                  {/* Follow-up Details */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Follow-up Details</Text>
                    <Text style={styles.detailItem}>
                      Date: {formatDate(selectedFollowUp.followUpDate)}
                    </Text>
                    <Text style={styles.detailItem}>
                      Time: {formatTime(selectedFollowUp.followUpTime)}
                    </Text>
                    <Text style={styles.detailItem}>Priority: {selectedFollowUp.priority}</Text>
                    <Text style={styles.detailItem}>Status: {selectedFollowUp.caseStatus}</Text>
                    {selectedFollowUp.notes && (
                      <Text style={styles.detailItem}>Notes: {selectedFollowUp.notes}</Text>
                    )}
                  </View>

                  {/* Comments History */}
                  {selectedFollowUp.comments && selectedFollowUp.comments.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>
                        Comments History ({selectedFollowUp.comments.length})
                      </Text>
                      {selectedFollowUp.comments.map((comment, index) => (
                        <View key={index} style={styles.commentHistoryItem}>
                          <View style={styles.commentHistoryHeader}>
                            <Text style={styles.commentAuthor}>{comment.addedBy?.name}</Text>
                            <Text style={styles.commentDate}>
                              {formatDate(comment.createdAt)}
                            </Text>
                          </View>
                          <Text style={styles.commentAction}>
                            Action: {comment.actionTaken || 'N/A'}
                          </Text>
                          <Text style={styles.commentHistoryText}>{comment.text}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Reminder Information */}
                  {selectedFollowUp.enquiryId && selectedFollowUp.enquiryId.reminders &&
                    selectedFollowUp.enquiryId.reminders.length > 0 && (
                      <View style={styles.detailSection}>
                        <Text style={styles.detailSectionTitle}>
                          📅 Reminder History ({selectedFollowUp.enquiryId.reminders.length})
                        </Text>
                        {selectedFollowUp.enquiryId.reminders.map((reminder, index) => (
                          <View key={reminder._id || index} style={styles.reminderHistoryItem}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text style={styles.reminderDateTime}>
                                📅 {new Date(reminder.reminderDateTime).toLocaleString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </Text>
                              <Text style={[styles.reminderStatus, {
                                color: reminder.status === 'completed' ? '#10b981' : '#f59e0b'
                              }]}>
                                {reminder.status?.toUpperCase() || 'PENDING'}
                              </Text>
                            </View>
                            {reminder.note && (
                              <Text style={styles.reminderNote}>💬 {reminder.note}</Text>
                            )}
                            <Text style={styles.reminderMeta}>
                              Set by: {reminder.createdBy?.fullName || reminder.createdBy?.name || 'Unknown'} • {new Date(reminder.createdAt).toLocaleDateString('en-IN')}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                  {/* Result (if closed) */}
                  {selectedFollowUp.result && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Final Result</Text>
                      <Text style={styles.resultDetailText}>{selectedFollowUp.result}</Text>
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.submitBtn, { flex: 1 }]}
                onPress={() => setShowDetailsModal(false)}
              >
                <Text style={styles.submitBtnText}>Close</Text>
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
    backgroundColor: '#f3f4f6',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
  },
  filtersContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    minWidth: 200,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    marginLeft: 8,
    fontSize: 14,
  },
  filterBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginRight: 8,
    minWidth: 150,
  },
  picker: {
    height: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
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
  followUpCard: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  infoSection: {
    marginBottom: 12,
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#6b7280',
  },
  detailsSection: {
    marginBottom: 12,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#1f2937',
    flex: 1,
  },
  assignedSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    marginBottom: 12,
  },
  assignedText: {
    fontSize: 13,
    color: '#6366f1',
    fontWeight: '500',
  },
  commentPreview: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  commentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  commentText: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 6,
  },
  commentMeta: {
    fontSize: 11,
    color: '#9ca3af',
  },
  reminderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  reminderBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
  },
  resultSection: {
    backgroundColor: '#d1fae5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065f46',
    marginBottom: 6,
  },
  resultText: {
    fontSize: 13,
    color: '#047857',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  closeBtnStyle: {
    backgroundColor: '#d1fae5',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3b82f6',
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 20,
  },
  paginationBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
  },
  paginationBtnDisabled: {
    backgroundColor: '#f3f4f6',
  },
  paginationText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
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
    maxHeight: '90%',
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
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalBody: {
    padding: 20,
    maxHeight: 500,
  },
  clientInfoBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  clientNameModal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  clientPhoneModal: {
    fontSize: 14,
    color: '#6b7280',
  },
  actionTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  actionTypeBtn: {
    flex: 1,
    minWidth: '30%',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  actionTypeSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#6366f1',
  },
  actionTypeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  actionTypeLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#374151',
  },
  commentInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1f2937',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  resultInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1f2937',
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#6366f1',
    alignItems: 'center',
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  detailItem: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  commentHistoryItem: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  reminderHistoryItem: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  reminderDateTime: {
    fontSize: 13,
    color: '#92400e',
    fontWeight: '600',
  },
  reminderNote: {
    fontSize: 12,
    color: '#78350f',
    marginBottom: 6,
    fontStyle: 'italic',
  },
  reminderMeta: {
    fontSize: 11,
    color: '#a16207',
  },
  reminderStatus: {
    fontSize: 11,
    fontWeight: '600',
  },
  commentHistoryItem: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  commentHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  commentDate: {
    fontSize: 11,
    color: '#9ca3af',
  },
  commentAction: {
    fontSize: 12,
    color: '#6366f1',
    marginBottom: 6,
  },
  commentHistoryText: {
    fontSize: 13,
    color: '#6b7280',
  },
  resultDetailText: {
    fontSize: 14,
    color: '#047857',
    backgroundColor: '#d1fae5',
    padding: 12,
    borderRadius: 8,
  },
});

export default AdminFollowUps;
