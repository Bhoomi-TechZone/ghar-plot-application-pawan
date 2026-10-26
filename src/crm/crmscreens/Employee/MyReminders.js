import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  TextInput,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import CrossPlatformAlert from '../../../utils/crossPlatformAlert';

const API_BASE_URL = 'https://gharplotbackend.gntechnology.de';

const MyReminders = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [reminders, setReminders] = useState([]);
  const [filteredReminders, setFilteredReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [statsData, setStatsData] = useState({
    totalReminders: 0,
    pending: 0,
    dueNow: 0,
    completed: 0,
  });

  const statusOptions = ['All Status', 'pending', 'completed', 'snoozed', 'dismissed'];

  // Fetch reminders data from backend
  const fetchReminders = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);

      // Check for multiple token types (matching web version)
      let token = await AsyncStorage.getItem('adminToken');
      if (!token) {
        token = await AsyncStorage.getItem('employeeToken');
      }
      if (!token) {
        token = await AsyncStorage.getItem('token');
      }
      if (!token) {
        token = await AsyncStorage.getItem('employee_token');
      }

      if (!token) {
        console.error('❌ No authentication token found');
        CrossPlatformAlert.alert('Authentication Error', 'Please login again.');
        return;
      }

      console.log('🔑 Using token for reminders fetch');
      console.log('📱 Token preview:', token.substring(0, 30) + '...');

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      console.log('📡 Fetching employee reminders...');

      let finalRemindersList = [];
      let finalStatsData = { ...statsData };

      // Try employee endpoint first (exactly matching web version)
      try {
        console.log('🔗 Trying employee endpoints (matching web version)...');

        // Build params like web version
        const params = {
          page: 1,
          limit: 100,
          populate: 'history,modifications', // Fetch history data
        };

        const [remindersResponse, statsResponse] = await Promise.all([
          axios.get(`${API_BASE_URL}/employee/reminders/list`, {
            headers,
            params,
            timeout: 15000
          }),
          axios.get(`${API_BASE_URL}/employee/reminders/stats`, {
            headers,
            timeout: 15000
          })
        ]);

        if (remindersResponse.data.success) {
          finalRemindersList = remindersResponse.data.data?.reminders || [];
          console.log('✅ Loaded', finalRemindersList.length, 'reminders from employee endpoint');
        }

        if (statsResponse.data.success) {
          const stats = statsResponse.data.data;
          finalStatsData = {
            totalReminders: stats?.total || 0,
            pending: stats?.pending || 0,
            dueNow: stats?.due || 0,
            completed: stats?.completed || 0,
          };
        }

      } catch (employeeError) {
        console.log('⚠️ Employee endpoint failed, trying fallback:', employeeError.message);

        // Fallback to older API endpoints
        try {
          const [remindersResponse, statsResponse] = await Promise.all([
            axios.get(`${API_BASE_URL}/api/reminder/list`, {
              headers,
              timeout: 15000
            }),
            axios.get(`${API_BASE_URL}/api/reminder/stats`, {
              headers,
              timeout: 15000
            })
          ]);

          if (remindersResponse.data.success) {
            finalRemindersList = remindersResponse.data.data?.reminders || remindersResponse.data.reminders || [];
            console.log('✅ Loaded', finalRemindersList.length, 'reminders from fallback');
          }

          if (statsResponse.data.success) {
            finalStatsData = {
              totalReminders: statsResponse.data.stats?.total || 0,
              pending: statsResponse.data.stats?.pending || 0,
              dueNow: statsResponse.data.stats?.due || 0,
              completed: statsResponse.data.stats?.completed || 0,
            };
          }
        } catch (fallbackErr) {
          console.error('❌ Fallback endpoints also failed:', fallbackErr.message);
        }
      }

      // 🚀 NEW: Load local reminders from AsyncStorage (synced with ReminderModal.js)
      let localRemindersList = [];
      try {
        const localData = await AsyncStorage.getItem('localReminders');
        if (localData) {
          localRemindersList = JSON.parse(localData);
          console.log('📱 Loaded', localRemindersList.length, 'reminders from local storage');
        }
      } catch (localError) {
        console.error('❌ Error loading local reminders:', localError);
      }

      // Merge API reminders with local reminders
      const allRemindersMap = new Map();

      // Add local ones first
      localRemindersList.forEach(r => {
        allRemindersMap.set(r.id || r._id, {
          ...r,
          source: 'local',
          status: r.status || 'pending'
        });
      });

      // Add API ones (overwrite local if ID matches)
      finalRemindersList.forEach(r => {
        allRemindersMap.set(r._id || r.id, {
          ...r,
          source: 'api'
        });
      });

      const mergedList = Array.from(allRemindersMap.values());

      // Sort by date (descending)
      mergedList.sort((a, b) => {
        const dateA = new Date(a.reminderDateTime || a.dateTime || a.scheduledDate);
        const dateB = new Date(b.reminderDateTime || b.dateTime || b.scheduledDate);
        return dateB - dateA;
      });

      setReminders(mergedList);
      setStatsData(finalStatsData);

    } catch (error) {
      console.error('❌ Reminders fetch error:', error);
      console.error('📛 Error details:', error.response?.data || error.message);

      // Provide more specific error messages
      let errorMessage = 'Failed to load reminders data. Please try again.';

      if (error.message?.includes('Network request failed')) {
        errorMessage = 'Network connection failed. Please check your internet connection and try again.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication failed. Please login again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Access denied. You may not have permission to view reminders.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Please check your connection and try again.';
      }

      CrossPlatformAlert.alert('Error', errorMessage);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Apply filters
  useEffect(() => {
    console.log('🔍 Applying filters...');
    console.log('📋 Total reminders:', reminders.length);
    console.log('🎯 Status filter:', statusFilter);
    console.log('🔍 Search query:', searchQuery);

    let filtered = reminders;

    // Apply status filter
    if (statusFilter !== 'All Status') {
      filtered = filtered.filter(r => r.status === statusFilter);
      console.log('📊 After status filter:', filtered.length);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => {
        const title = r.title?.toLowerCase() || '';
        const description = r.description?.toLowerCase() || '';
        const clientName = r.clientName?.toLowerCase() || '';

        return title.includes(query) || description.includes(query) || clientName.includes(query);
      });
      console.log('📊 After search filter:', filtered.length);
    }

    console.log('✅ Final filtered reminders:', filtered.length);
    setFilteredReminders(filtered);

    // Calculate stats from actual reminders data
    if (reminders.length > 0) {
      const now = new Date();
      const calculatedStats = {
        totalReminders: reminders.length,
        pending: reminders.filter(r => r.status === 'pending' || r.status === 'snoozed').length,
        dueNow: reminders.filter(r => {
          if (r.status !== 'pending') return false;
          const reminderDate = new Date(r.reminderDateTime || r.dateTime);
          return reminderDate <= now;
        }).length,
        completed: reminders.filter(r => r.status === 'completed').length,
      };

      console.log('📊 Calculated stats from reminders:', calculatedStats);
      setStatsData(calculatedStats);
    }
  }, [reminders, statusFilter, searchQuery]);

  // Handle pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReminders(false);
    setRefreshing(false);
  };

  // Refresh when coming back to this screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('🔄 MyReminders focused - refreshing...');
      fetchReminders(false);
    });
    return unsubscribe;
  }, [navigation]);

  // Load data on component mount
  useEffect(() => {
    console.log('🚀 MyReminders component mounted, starting data fetch...');
    fetchReminders();
  }, []);

  // Handle reminder completion
  const handleCompleteReminder = async (reminder) => {
    Alert.prompt(
      'Complete Reminder',
      'Add a response for this reminder:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async (response) => {
            try {
              const token = await AsyncStorage.getItem('employee_token');
              const result = await fetch(`${API_BASE_URL}/api/reminder/complete/${reminder._id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': token ? `Bearer ${token}` : '',
                },
                body: JSON.stringify({ comment: response || '' }),
              });

              const data = await result.json();
              if (data.success) {
                CrossPlatformAlert.alert('Success', 'Reminder marked as completed');
                fetchReminders(false);
              } else {
                CrossPlatformAlert.alert('Error', data.message || 'Failed to complete reminder');
              }
            } catch (error) {
              console.error('❌ Complete reminder error:', error);
              CrossPlatformAlert.alert('Error', 'Failed to complete reminder');
            }
          }
        }
      ],
      'plain-text',
      reminder.comment
    );
  };

  // Handle reminder snooze
  const handleSnoozeReminder = async (reminder) => {
    CrossPlatformAlert.alert(
      'Snooze Reminder',
      'How long would you like to snooze this reminder?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: '15 minutes', onPress: () => snoozeReminder(reminder._id, 15) },
        { text: '30 minutes', onPress: () => snoozeReminder(reminder._id, 30) },
        { text: '1 hour', onPress: () => snoozeReminder(reminder._id, 60) },
        { text: '2 hours', onPress: () => snoozeReminder(reminder._id, 120) },
      ]
    );
  };

  const snoozeReminder = async (reminderId, minutes) => {
    try {
      const token = await AsyncStorage.getItem('employee_token');
      const response = await fetch(`${API_BASE_URL}/api/reminder/snooze/${reminderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ snoozeMinutes: minutes }),
      });

      const result = await response.json();
      if (result.success) {
        CrossPlatformAlert.alert('Success', `Reminder snoozed for ${minutes} minutes`);
        fetchReminders(false);
      } else {
        CrossPlatformAlert.alert('Error', result.message || 'Failed to snooze reminder');
      }
    } catch (error) {
      console.error('❌ Snooze reminder error:', error);
      CrossPlatformAlert.alert('Error', 'Failed to snooze reminder');
    }
  };

  // Handle reminder dismiss
  const handleDismissReminder = async (reminder) => {
    CrossPlatformAlert.alert(
      'Dismiss Reminder',
      'Are you sure you want to dismiss this reminder?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dismiss',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('employee_token');
              const response = await fetch(`${API_BASE_URL}/api/reminder/dismiss/${reminder._id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': token ? `Bearer ${token}` : '',
                },
              });

              const result = await response.json();
              if (result.success) {
                CrossPlatformAlert.alert('Success', 'Reminder dismissed');
                fetchReminders(false);
              } else {
                CrossPlatformAlert.alert('Error', result.message || 'Failed to dismiss reminder');
              }
            } catch (error) {
              console.error('❌ Dismiss reminder error:', error);
              CrossPlatformAlert.alert('Error', 'Failed to dismiss reminder');
            }
          }
        }
      ]
    );
  };

  // Render reminder action menu
  const renderActionMenu = (reminder) => {
    return (
      <View style={styles.actionMenu}>
        <TouchableOpacity
          style={[styles.actionButton, styles.completeButton]}
          onPress={() => handleCompleteReminder(reminder)}
        >
          <Text style={styles.actionButtonText}>Complete</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.snoozeButton]}
          onPress={() => handleSnoozeReminder(reminder)}
        >
          <Text style={styles.actionButtonText}>Snooze</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.dismissButton]}
          onPress={() => handleDismissReminder(reminder)}
        >
          <Text style={styles.actionButtonText}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Render individual reminder item
  const renderReminderItem = ({ item: reminder }) => {
    // Use correct field name from backend - reminderDateTime not dateTime
    const dateTimeValue = reminder.reminderDateTime || reminder.dateTime;
    const isOverdue = dateTimeValue && new Date(dateTimeValue) < new Date() && reminder.status === 'pending';

    // Format date properly
    let formattedDate = 'No Date';
    let formattedTime = '';
    if (dateTimeValue) {
      try {
        const date = new Date(dateTimeValue);
        if (!isNaN(date.getTime())) {
          formattedDate = date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          });
          formattedTime = date.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });
        }
      } catch (error) {
        console.error('Date formatting error:', error);
      }
    }

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          setSelectedReminder(reminder);
          setShowDetailModal(true);
        }}
      >
        <View style={[
          styles.reminderCard,
          isOverdue && styles.overdueCard
        ]}>
          {/* Status Badge - Top Right */}
          <View style={[
            styles.statusBadge,
            reminder.status === 'completed' && styles.completedBadge,
            reminder.status === 'snoozed' && styles.snoozedBadge,
            reminder.status === 'dismissed' && styles.dismissedBadge,
            isOverdue && styles.overdueBadge
          ]}>
            <Text style={styles.statusText}>
              {isOverdue ? 'OVERDUE' : reminder.status?.toUpperCase() || 'PENDING'}
            </Text>
          </View>

          {/* Title */}
          <Text style={styles.reminderTitle}>
            {reminder.title || reminder.note || 'Follow-up Reminder'}
          </Text>

          {/* Date & Time */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            <Icon name="calendar-outline" size={16} color="#6366f1" />
            <Text style={styles.reminderDate}> {formattedDate} at {formattedTime}</Text>
          </View>

          {/* Comment/Note */}
          {(reminder.comment || reminder.note) && (
            <View style={styles.commentBox}>
              <Icon name="chatbox-outline" size={14} color="#6366f1" />
              <Text style={styles.commentText}>{reminder.comment || reminder.note}</Text>
            </View>
          )}

          {/* Client Info - Use correct field names */}
          {(reminder.clientName || reminder.clientInfo?.name) && (
            <View style={styles.clientInfoRow}>
              <Icon name="person-outline" size={14} color="#6b7280" />
              <Text style={styles.clientInfoText}>
                {reminder.clientName || reminder.clientInfo?.name}
                {(reminder.phone || reminder.clientInfo?.phone) && ` • ${reminder.phone || reminder.clientInfo.phone}`}
              </Text>
            </View>
          )}

          {/* Location */}
          {reminder.location && (
            <View style={styles.clientInfoRow}>
              <Icon name="location-outline" size={14} color="#6b7280" />
              <Text style={styles.clientInfoText}>{reminder.location}</Text>
            </View>
          )}

          {/* Property Type */}
          {reminder.propertyType && (
            <View style={styles.clientInfoRow}>
              <Icon name="home-outline" size={14} color="#6b7280" />
              <Text style={styles.clientInfoText}>{reminder.propertyType}</Text>
            </View>
          )}

          {/* Assignment Type */}
          {reminder.assignmentType && (
            <View style={styles.metaInfo}>
              <Text style={styles.metaText}>
                Type: {reminder.assignmentType}
                {reminder.createdAt && ` • Created: ${new Date(reminder.createdAt).toLocaleDateString('en-IN')}`}
              </Text>
            </View>
          )}

          {/* Response */}
          {reminder.response && (
            <View style={styles.responseContainer}>
              <Text style={styles.responseLabel}>Response:</Text>
              <Text style={styles.responseText}>{reminder.response}</Text>
            </View>
          )}

          {/* Actions (only for pending reminders) */}
          {reminder.status === 'pending' && renderActionMenu(reminder)}
        </View>
      </TouchableOpacity>
    );
  };

  const renderStatsCard = (title, count, iconName, bgColor) => (
    <View style={styles.statsCard}>
      <View style={[styles.iconBox, { backgroundColor: bgColor }]}>
        <Icon name={iconName} size={20} color="#fff" />
      </View>
      <Text style={styles.statsCount}>{count}</Text>
      <Text style={styles.statsTitle}>{title}</Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="notifications-outline" size={70} color="#1e40af" />
      <Text style={styles.emptyTitle}>No Reminders</Text>
      <Text style={styles.emptySubtitle}>
        Your follow-up reminders will appear here.
      </Text>
    </View>
  );

  // Render Detail Modal
  const renderDetailModal = () => {
    if (!selectedReminder) return null;

    const dateTimeValue = selectedReminder.reminderDateTime || selectedReminder.dateTime;
    let formattedDateTime = 'No Date';
    if (dateTimeValue) {
      try {
        const date = new Date(dateTimeValue);
        if (!isNaN(date.getTime())) {
          formattedDateTime = date.toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });
        }
      } catch (error) {
        formattedDateTime = 'Invalid Date';
      }
    }

    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailModalContent}>
            {/* Modal Header */}
            <View style={styles.detailModalHeader}>
              <Text style={styles.detailModalTitle}>Reminder Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Icon name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <ScrollView style={styles.detailModalBody}>
              {/* Status Badge */}
              <View style={[
                styles.detailStatusBadge,
                selectedReminder.status === 'completed' && styles.completedBadge,
                selectedReminder.status === 'snoozed' && styles.snoozedBadge,
                selectedReminder.status === 'dismissed' && styles.dismissedBadge,
              ]}>
                <Text style={styles.detailStatusText}>
                  {selectedReminder.status?.toUpperCase() || 'PENDING'}
                </Text>
              </View>

              {/* Title */}
              <Text style={styles.detailTitle}>
                {selectedReminder.title || selectedReminder.note || 'Follow-up Reminder'}
              </Text>

              {/* Date & Time */}
              <View style={styles.detailRow}>
                <Icon name="calendar-outline" size={20} color="#6366f1" />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.detailLabel}>Scheduled Date & Time</Text>
                  <Text style={styles.detailValue}>{formattedDateTime}</Text>
                </View>
              </View>

              {/* Action Plan / Comment */}
              {(selectedReminder.comment || selectedReminder.note) && (
                <View style={styles.detailSection}>
                  <View style={styles.detailSectionHeader}>
                    <Icon name="document-text-outline" size={20} color="#6366f1" />
                    <Text style={styles.detailSectionTitle}>Action Plan / Note</Text>
                  </View>
                  <Text style={styles.detailSectionContent}>
                    {selectedReminder.comment || selectedReminder.note}
                  </Text>
                </View>
              )}

              {/* Client Information */}
              {(selectedReminder.clientName || selectedReminder.clientInfo?.name) && (
                <View style={styles.detailSection}>
                  <View style={styles.detailSectionHeader}>
                    <Icon name="person-outline" size={20} color="#6366f1" />
                    <Text style={styles.detailSectionTitle}>Client Information</Text>
                  </View>
                  <Text style={styles.detailSectionContent}>
                    👤 {selectedReminder.clientName || selectedReminder.clientInfo?.name}
                  </Text>
                  {(selectedReminder.phone || selectedReminder.clientInfo?.phone) && (
                    <Text style={styles.detailSectionContent}>
                      📞 {selectedReminder.phone || selectedReminder.clientInfo.phone}
                    </Text>
                  )}
                  {selectedReminder.location && (
                    <Text style={styles.detailSectionContent}>
                      📍 {selectedReminder.location}
                    </Text>
                  )}
                  {selectedReminder.propertyType && (
                    <Text style={styles.detailSectionContent}>
                      🏠 {selectedReminder.propertyType}
                    </Text>
                  )}
                </View>
              )}

              {/* Reminder History / Edit History */}
              <View style={styles.detailSection}>
                <View style={styles.detailSectionHeader}>
                  <Icon name="time-outline" size={20} color="#6366f1" />
                  <Text style={styles.detailSectionTitle}>
                    Reminder History ({(selectedReminder.history?.length || 0) + 1})
                  </Text>
                </View>

                {/* Current/Latest Reminder */}
                <View style={[styles.historyItem, styles.currentHistoryItem]}>
                  <Text style={styles.historyDate}>
                    {formattedDateTime}
                  </Text>
                  {(selectedReminder.comment || selectedReminder.note) && (
                    <View style={{ marginTop: 8 }}>
                      <Text style={styles.historyLabel}>Note:</Text>
                      <Text style={styles.historyComment}>
                        {selectedReminder.comment || selectedReminder.note}
                      </Text>
                    </View>
                  )}
                  {selectedReminder.createdBy && (
                    <Text style={styles.historyBy}>
                      Set by: {selectedReminder.createdBy.fullName || selectedReminder.createdBy.name}
                    </Text>
                  )}
                </View>

                {/* Previous Modifications */}
                {selectedReminder.history && selectedReminder.history.length > 0 && (
                  <>
                    <Text style={styles.previousLabel}>Previous Modifications:</Text>
                    {selectedReminder.history.map((historyItem, index) => (
                      <View key={index} style={styles.historyItem}>
                        <Text style={styles.historyDate}>
                          {historyItem.scheduledDateTime
                            ? new Date(historyItem.scheduledDateTime).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })
                            : new Date(historyItem.modifiedAt || historyItem.createdAt).toLocaleString('en-IN')}
                        </Text>
                        <Text style={styles.historyAction}>
                          {historyItem.action || 'Rescheduled'}
                        </Text>
                        {(historyItem.comment || historyItem.note) && (
                          <View style={{ marginTop: 8 }}>
                            <Text style={styles.historyLabel}>Note:</Text>
                            <Text style={styles.historyComment}>
                              {historyItem.comment || historyItem.note}
                            </Text>
                          </View>
                        )}
                        {historyItem.modifiedBy && (
                          <Text style={styles.historyBy}>
                            Modified by: {historyItem.modifiedBy.name || historyItem.modifiedBy.fullName}
                          </Text>
                        )}
                      </View>
                    ))}
                  </>
                )}
              </View>

              {/* Response */}
              {selectedReminder.response && (
                <View style={styles.detailSection}>
                  <View style={styles.detailSectionHeader}>
                    <Icon name="checkmark-circle-outline" size={20} color="#10b981" />
                    <Text style={styles.detailSectionTitle}>Response</Text>
                  </View>
                  <Text style={styles.detailSectionContent}>
                    {selectedReminder.response}
                  </Text>
                </View>
              )}

              {/* Created By & Date */}
              <View style={styles.detailFooter}>
                {selectedReminder.createdBy && (
                  <Text style={styles.detailFooterText}>
                    Created by: {selectedReminder.createdBy.fullName || selectedReminder.createdBy.name}
                  </Text>
                )}
                {selectedReminder.createdAt && (
                  <Text style={styles.detailFooterText}>
                    Created: {new Date(selectedReminder.createdAt).toLocaleString('en-IN')}
                  </Text>
                )}
                {selectedReminder.assignmentType && (
                  <Text style={styles.detailFooterText}>
                    Type: {selectedReminder.assignmentType}
                  </Text>
                )}
              </View>
            </ScrollView>

            {/* Modal Footer with Actions */}
            <View style={styles.detailModalFooter}>
              <TouchableOpacity
                style={styles.detailModalButton}
                onPress={() => setShowDetailModal(false)}
              >
                <Text style={styles.detailModalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1e40af" barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Reminders</Text>
        <Text style={styles.headerSubtitle}>Track your reminder updates</Text>
      </View>

      {/* STATS */}
      <View style={styles.statsRow}>
        {renderStatsCard('Total', statsData.totalReminders, 'calendar', '#6366F1')}
        {renderStatsCard('Pending', statsData.pending, 'time', '#EC4899')}
        {renderStatsCard('Due Now', statsData.dueNow, 'alert', '#F59E0B')}
        {renderStatsCard('Done', statsData.completed, 'checkmark', '#10B981')}
      </View>

      {/* SEARCH + FILTERS */}
      <View style={styles.filtersSection}>
        <View style={styles.searchBar}>
          <Icon name="search" size={18} color="#9CA3AF" />
          <TextInput
            style={styles.input}
            placeholder="Search reminders..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Notification Test Button (Hidden but usable in dev) */}
        <TouchableOpacity
          style={[styles.testButton, { bottom: 20 + (insets.bottom > 0 ? insets.bottom + 60 : 70) }]}
          onPress={() => { }}
        >
          <Text style={styles.testButtonText}>Test</Text>
        </TouchableOpacity>

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={styles.dropdownBox}
            onPress={() => setShowStatusModal(true)}
          >
            <Text style={styles.dropdownText}>{statusFilter}</Text>
            <Icon name="chevron-down" size={18} color="#6B7280" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.dropdownBox}>
            <Text style={styles.dropdownText}>{typeFilter}</Text>
            <Icon name="chevron-down" size={18} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>

      {/* LIST */}
      <View style={styles.cardListArea}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading reminders...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredReminders}
            keyExtractor={(item) => item._id || item.id || String(Math.random())}
            renderItem={renderReminderItem}
            ListEmptyComponent={renderEmptyState}
            contentContainerStyle={{ flexGrow: 1, padding: 18 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#1e40af']}
                tintColor="#1e40af"
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Status Filter Modal */}
      <Modal
        visible={showStatusModal}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Status</Text>
              <TouchableOpacity onPress={() => setShowStatusModal(false)}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {statusOptions.map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.modalOption,
                  statusFilter === status && styles.selectedOption
                ]}
                onPress={() => {
                  setStatusFilter(status);
                  setShowStatusModal(false);
                }}
              >
                <Text style={[
                  styles.modalOptionText,
                  statusFilter === status && styles.selectedOptionText
                ]}>
                  {status}
                </Text>
                {statusFilter === status && (
                  <Icon name="checkmark" size={20} color="#1e40af" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Detail Modal */}
      {renderDetailModal()}
    </SafeAreaView>
  );
};

export default MyReminders;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f6ff' },

  header: {
    backgroundColor: '#1e40af',
    padding: 20,
    paddingBottom: 28,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  headerTitle: {
    fontSize: 22,
    color: '#fff',
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#E9D5FF',
    marginTop: 4,
    fontSize: 13,
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingHorizontal: 20,
  },
  statsCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    marginHorizontal: 4,
    alignItems: 'center',
    elevation: 2,
  },

  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statsCount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
  },
  statsTitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },

  filtersSection: {
    marginTop: 18,
    paddingHorizontal: 20,
  },
  searchBar: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    paddingHorizontal: 10,
    borderRadius: 10,
    height: 42,
    alignItems: 'center',
    elevation: 2,
  },
  input: {
    marginLeft: 8,
    flex: 1,
    fontSize: 15,
    color: '#374151',
  },

  filterRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  dropdownBox: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    elevation: 2,
  },
  dropdownText: {
    color: '#374151',
    fontSize: 14,
  },

  cardListArea: {
    flex: 1,
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 18,
    borderRadius: 12,
    elevation: 2,
    paddingBottom: 8,
  },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: '600',
    color: '#4B5563',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },

  testButton: {
    position: 'absolute',
    right: 20,
    backgroundColor: '#F97316',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    elevation: 3,
  },
  testButtonText: {
    color: '#fff',
    fontWeight: '600',
  },

  // Loading styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 16,
    marginTop: 10,
  },

  // Reminder card styles
  reminderCard: {
    backgroundColor: '#fff',
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
    position: 'relative',
  },
  overdueCard: {
    borderLeftColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    paddingRight: 90,
  },
  reminderDate: {
    fontSize: 13,
    color: '#6366f1',
    fontWeight: '600',
  },
  reminderDescription: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 12,
    lineHeight: 20,
  },

  // Status badge styles
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#1e40af',
    elevation: 1,
  },
  completedBadge: {
    backgroundColor: '#10B981',
  },
  snoozedBadge: {
    backgroundColor: '#F59E0B',
  },
  dismissedBadge: {
    backgroundColor: '#6B7280',
  },
  overdueBadge: {
    backgroundColor: '#EF4444',
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },

  // Comment box
  commentBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 8,
    gap: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#6366f1',
  },
  commentText: {
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 19,
    flex: 1,
    fontStyle: 'italic',
  },

  // Client info row
  clientInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    marginBottom: 4,
  },
  clientInfoText: {
    fontSize: 12,
    color: '#4b5563',
    fontWeight: '500',
  },

  // Meta info
  metaInfo: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  metaText: {
    fontSize: 11,
    color: '#9ca3af',
  },

  // Client info styles (old)
  clientInfo: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  clientName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  clientContact: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },

  // Response styles
  responseContainer: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  responseLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 4,
  },
  responseText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 18,
  },

  // Action menu styles
  actionMenu: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeButton: {
    backgroundColor: '#10B981',
  },
  snoozeButton: {
    backgroundColor: '#F59E0B',
  },
  dismissButton: {
    backgroundColor: '#6B7280',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectedOption: {
    backgroundColor: '#EFF6FF',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  selectedOptionText: {
    color: '#1e40af',
    fontWeight: '600',
  },

  // Detail Modal Styles
  detailModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  detailModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  detailModalBody: {
    padding: 20,
    maxHeight: 600,
  },
  detailStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#1e40af',
  },
  detailStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
    lineHeight: 28,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
  },
  detailSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
  },
  detailSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  detailSectionContent: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 8,
  },
  currentHistoryItem: {
    backgroundColor: '#eff6ff',
    borderLeftColor: '#3b82f6',
    borderLeftWidth: 4,
  },
  currentBadge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  currentBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  previousLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  historyLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 4,
  },
  historyItem: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  historyDate: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 4,
  },
  historyAction: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
    marginBottom: 4,
  },
  historyComment: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  historyBy: {
    fontSize: 11,
    color: '#9ca3af',
  },
  detailFooter: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 8,
  },
  detailFooterText: {
    fontSize: 12,
    color: '#6b7280',
  },
  detailModalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  detailModalButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  detailModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
