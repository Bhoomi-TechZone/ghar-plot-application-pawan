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
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import CrossPlatformAlert from '../../../utils/crossPlatformAlert';

const API_BASE_URL = 'https://ghar-plot-backend1.onrender.com';

const EmployeeReminders = ({ navigation, openDrawer }) => {
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

      // Check for multiple token types
      let token = await AsyncStorage.getItem('adminToken');
      if (!token) token = await AsyncStorage.getItem('admin_token');
      if (!token) token = await AsyncStorage.getItem('employeeToken');
      if (!token) token = await AsyncStorage.getItem('employee_token');
      if (!token) token = await AsyncStorage.getItem('employee_auth_token');
      if (!token) token = await AsyncStorage.getItem('crm_auth_token');
      if (!token) token = await AsyncStorage.getItem('token');

      if (!token) {
        console.error('? No authentication token found');
        CrossPlatformAlert.alert('Authentication Error', 'Please login again.');
        return;
      }

      console.log('?? Using token for reminders fetch');

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      console.log('?? Fetching employee/admin reminders...');

      const isAdmin = !!(await AsyncStorage.getItem('adminToken') || await AsyncStorage.getItem('admin_token'));

      try {
        const params = {
          page: 1,
          limit: 50,
        };

        const listUrl = isAdmin ? `${API_BASE_URL}/api/reminder/list` : `${API_BASE_URL}/employee/reminders/list`;
        const statsUrl = isAdmin ? `${API_BASE_URL}/api/reminder/stats` : `${API_BASE_URL}/employee/reminders/stats`;

        console.log(`?? Fetching from: ${listUrl} (isAdmin: ${isAdmin})`);

        const [remindersResponse, statsResponse] = await Promise.all([
          axios.get(listUrl, {
            headers,
            params,
            timeout: 15000
          }),
          axios.get(statsUrl, {
            headers,
            timeout: 15000
          })
        ]);

        let finalRemindersList = [];
        let finalStatsData = { ...statsData };

        if (remindersResponse.data.success) {
          finalRemindersList = remindersResponse.data.data?.reminders || remindersResponse.data.reminders || [];
          console.log('? Loaded', finalRemindersList.length, 'reminders from API');
        }

        if (statsResponse.data.success) {
          const stats = statsResponse.data.data || statsResponse.data.stats;
          finalStatsData = {
            totalReminders: stats?.total || 0,
            pending: stats?.pending || 0,
            dueNow: stats?.due || 0,
            completed: stats?.completed || 0,
          };
        }

        // ?? NEW: Load local reminders from AsyncStorage (synced with ReminderModal.js)
        let localRemindersList = [];
        try {
          const localData = await AsyncStorage.getItem('localReminders');
          if (localData) {
            localRemindersList = JSON.parse(localData);
            console.log('?? Loaded', localRemindersList.length, 'reminders from local storage');
          }
        } catch (localError) {
          console.error('? Error loading local reminders:', localError);
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
        console.error('? Error fetching reminders list/stats:', error.message);
        throw error;
      }

    } catch (error) {
      console.error('? Reminders fetch error:', error);

      let errorMessage = 'Failed to load reminders data. Please try again.';
      if (error.message?.includes('Network request failed')) {
        errorMessage = 'Network connection failed. Please check your internet connection.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication failed. Please login again.';
      }

      CrossPlatformAlert.alert('Error', errorMessage);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = reminders;

    if (statusFilter !== 'All Status') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => {
        const title = r.title?.toLowerCase() || '';
        const description = r.description?.toLowerCase() || '';
        const clientName = r.clientName?.toLowerCase() || '';
        return title.includes(query) || description.includes(query) || clientName.includes(query);
      });
    }

    setFilteredReminders(filtered);

    // Calculate stats
    if (reminders.length > 0) {
      const now = new Date();
      setStatsData({
        totalReminders: reminders.length,
        pending: reminders.filter(r => r.status === 'pending' || r.status === 'snoozed').length,
        dueNow: reminders.filter(r => {
          if (r.status !== 'pending') return false;
          const reminderDate = new Date(r.reminderDateTime || r.dateTime);
          return reminderDate <= now;
        }).length,
        completed: reminders.filter(r => r.status === 'completed').length,
      });
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
      console.log('?? EmployeeReminders focused - refreshing...');
      fetchReminders(false);
    });
    return unsubscribe;
  }, [navigation]);

  // Load data on component mount
  useEffect(() => {
    console.log('?? EmployeeReminders component mounted');
    fetchReminders();
  }, []);

  // Handle reminder completion
  const handleCompleteReminder = async (reminder) => {
    CrossPlatformAlert.alert(
      'Complete Reminder',
      'Mark this reminder as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              const adminToken = await AsyncStorage.getItem('adminToken') || await AsyncStorage.getItem('admin_token');
              const employeeToken = await AsyncStorage.getItem('employeeToken') || await AsyncStorage.getItem('employee_auth_token') || await AsyncStorage.getItem('employee_token');
              const token = adminToken || employeeToken;
              const isAdmin = !!adminToken;

              if (!token) {
                CrossPlatformAlert.alert('Error', 'No authentication token found');
                return;
              }

              // Use correct route based on role
              const url = isAdmin
                ? `${API_BASE_URL}/api/reminder/${reminder._id}/complete`
                : `${API_BASE_URL}/employee/reminders/${reminder._id}/complete`;
              
              console.log('?? Complete reminder URL:', url, '| isAdmin:', isAdmin);

              const result = await fetch(url, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ status: 'completed' }),
              });

              if (!result.ok) {
                const errorText = await result.text();
                console.error('? Error response:', errorText);
                try {
                  const errorData = JSON.parse(errorText);
                  CrossPlatformAlert.alert('Error', errorData.message || 'Failed to complete reminder');
                } catch (e) {
                  CrossPlatformAlert.alert('Error', errorText || 'Failed to complete reminder');
                }
              } else {
                CrossPlatformAlert.alert('Success', 'Reminder marked as completed');
                fetchReminders(false);
              }
            } catch (error) {
              console.error('? Complete reminder error:', error);
              CrossPlatformAlert.alert('Error', error.message || 'Failed to complete reminder');
            }
          }
        }
      ]
    );
  };

  // Handle reminder snooze
  const handleSnoozeReminder = async (reminder) => {
    CrossPlatformAlert.alert(
      'Snooze Reminder',
      'How long would you like to snooze?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: '15 min', onPress: () => snoozeReminder(reminder._id, 15) },
        { text: '30 min', onPress: () => snoozeReminder(reminder._id, 30) },
        { text: '1 hour', onPress: () => snoozeReminder(reminder._id, 60) },
      ]
    );
  };

  const snoozeReminder = async (reminderId, minutes) => {
    try {
      const adminToken = await AsyncStorage.getItem('adminToken') || await AsyncStorage.getItem('admin_token');
      const employeeToken = await AsyncStorage.getItem('employeeToken') || await AsyncStorage.getItem('employee_auth_token') || await AsyncStorage.getItem('employee_token');
      const token = adminToken || employeeToken;
      const isAdmin = !!adminToken;

      if (!token) {
        CrossPlatformAlert.alert('Error', 'No authentication token found');
        return;
      }

      const url = isAdmin
        ? `${API_BASE_URL}/api/reminder/snooze/${reminderId}`
        : `${API_BASE_URL}/employee/reminders/snooze/${reminderId}`;
      
      console.log('?? Snooze URL:', url, '| isAdmin:', isAdmin);

      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ snoozeMinutes: minutes }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText);
          CrossPlatformAlert.alert('Error', errorData.message || 'Failed to snooze reminder');
        } catch (e) {
          CrossPlatformAlert.alert('Error', errorText || 'Failed to snooze reminder');
        }
      } else {
        CrossPlatformAlert.alert('Success', `Reminder snoozed for ${minutes} minutes`);
        fetchReminders(false);
      }
    } catch (error) {
      console.error('? Snooze reminder error:', error);
      CrossPlatformAlert.alert('Error', error.message || 'Failed to snooze reminder');
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
              const adminToken = await AsyncStorage.getItem('adminToken') || await AsyncStorage.getItem('admin_token');
              const employeeToken = await AsyncStorage.getItem('employeeToken') || await AsyncStorage.getItem('employee_auth_token') || await AsyncStorage.getItem('employee_token');
              const token = adminToken || employeeToken;
              const isAdmin = !!adminToken;

              if (!token) {
                CrossPlatformAlert.alert('Error', 'No authentication token found');
                return;
              }

              // Use correct route based on role — admin uses /api/reminder, employee uses /employee/reminders
              const url = isAdmin
                ? `${API_BASE_URL}/api/reminder/dismiss/${reminder._id}`
                : `${API_BASE_URL}/employee/reminders/dismiss/${reminder._id}`;
              
              console.log('?? Dismiss URL:', url, '| isAdmin:', isAdmin);

              const response = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              });

              if (!response.ok) {
                const errorText = await response.text();
                try {
                  const errorData = JSON.parse(errorText);
                  CrossPlatformAlert.alert('Error', errorData.message || 'Failed to dismiss reminder');
                } catch (e) {
                  CrossPlatformAlert.alert('Error', errorText || 'Failed to dismiss reminder');
                }
              } else {
                CrossPlatformAlert.alert('Success', 'Reminder dismissed');
                fetchReminders(false);
              }
            } catch (error) {
              console.error('? Dismiss reminder error:', error);
              CrossPlatformAlert.alert('Error', error.message || 'Failed to dismiss reminder');
            }
          }
        }
      ]
    );
  };


  // Render action buttons
  const renderActionButtons = (reminder) => (
    <View style={styles.actionRow}>
      <TouchableOpacity
        style={[styles.actionBtn, styles.completeBtn]}
        onPress={() => handleCompleteReminder(reminder)}
      >
        <Icon name="checkmark" size={16} color="#fff" />
        <Text style={styles.actionBtnText}>Complete</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.actionBtn, styles.snoozeBtn]}
        onPress={() => handleSnoozeReminder(reminder)}
      >
        <Icon name="time" size={16} color="#fff" />
        <Text style={styles.actionBtnText}>Snooze</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.actionBtn, styles.dismissBtn]}
        onPress={() => handleDismissReminder(reminder)}
      >
        <Icon name="close" size={16} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  // Render reminder item
  const renderReminderItem = ({ item: reminder }) => {
    const dateTimeValue = reminder.reminderDateTime || reminder.dateTime;
    const isOverdue = dateTimeValue && new Date(dateTimeValue) < new Date() && reminder.status === 'pending';

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
        <View style={[styles.reminderCard, isOverdue && styles.overdueCard]}>
          {/* Status Badge */}
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
          <View style={styles.dateRow}>
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

          {/* Client Info */}
          {(reminder.clientName || reminder.clientInfo?.name) && (
            <View style={styles.clientRow}>
              <Icon name="person-outline" size={14} color="#6b7280" />
              <Text style={styles.clientText}>
                {reminder.clientName || reminder.clientInfo?.name}
                {(reminder.phone || reminder.clientInfo?.phone) && ` • ${reminder.phone || reminder.clientInfo.phone}`}
              </Text>
            </View>
          )}

          {/* Actions (only for pending reminders) */}
          {reminder.status === 'pending' && renderActionButtons(reminder)}
        </View>
      </TouchableOpacity>
    );
  };

  const renderStatsCard = (title, count, iconName, bgColor) => (
    <View style={styles.statsCard}>
      <View style={[styles.iconBox, { backgroundColor: bgColor }]}>
        <Icon name={iconName} size={18} color="#fff" />
      </View>
      <Text style={styles.statsCount}>{count}</Text>
      <Text style={styles.statsTitle}>{title}</Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="notifications-off-outline" size={64} color="#9CA3AF" />
      <Text style={styles.emptyTitle}>No Reminders</Text>
      <Text style={styles.emptySubtitle}>
        {statusFilter !== 'All Status'
          ? `No ${statusFilter} reminders found`
          : 'Your reminders will appear here'}
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
            <View style={styles.detailModalHeader}>
              <Text style={styles.detailModalTitle}>Reminder Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Icon name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.detailModalBody}>
              {/* Status */}
              <View style={[
                styles.detailStatusBadge,
                selectedReminder.status === 'completed' && styles.completedBadge,
                selectedReminder.status === 'snoozed' && styles.snoozedBadge,
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
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.detailLabel}>Scheduled Date & Time</Text>
                  <Text style={styles.detailValue}>{formattedDateTime}</Text>
                </View>
              </View>

              {/* Note */}
              {(selectedReminder.comment || selectedReminder.note) && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Note</Text>
                  <Text style={styles.detailSectionContent}>
                    {selectedReminder.comment || selectedReminder.note}
                  </Text>
                </View>
              )}

              {/* Client Info */}
              {(selectedReminder.clientName || selectedReminder.clientInfo?.name) && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Client Information</Text>
                  <Text style={styles.detailSectionContent}>
                    ?? {selectedReminder.clientName || selectedReminder.clientInfo?.name}
                  </Text>
                  {(selectedReminder.phone || selectedReminder.clientInfo?.phone) && (
                    <Text style={styles.detailSectionContent}>
                      ?? {selectedReminder.phone || selectedReminder.clientInfo.phone}
                    </Text>
                  )}
                </View>
              )}
            </ScrollView>

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
      <StatusBar backgroundColor="#EF4444" barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuBtn} onPress={openDrawer}>
          <Icon name="menu" size={26} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>My Reminders</Text>
          <Text style={styles.headerSubtitle}>Track your reminder updates</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Icon name="refresh" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {renderStatsCard('Total', statsData.totalReminders, 'calendar', '#6366F1')}
        {renderStatsCard('Pending', statsData.pending, 'time', '#EC4899')}
        {renderStatsCard('Due Now', statsData.dueNow, 'alert', '#F59E0B')}
        {renderStatsCard('Done', statsData.completed, 'checkmark', '#10B981')}
      </View>

      {/* Search & Filters */}
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
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={styles.dropdownBox}
            onPress={() => setShowStatusModal(true)}
          >
            <Text style={styles.dropdownText}>{statusFilter}</Text>
            <Icon name="chevron-down" size={18} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
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
            contentContainerStyle={{ flexGrow: 1, padding: 16 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#EF4444']}
                tintColor="#EF4444"
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Status Filter Modal */}
      <Modal visible={showStatusModal} transparent animationType="slide">
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
                style={[styles.modalOption, statusFilter === status && styles.selectedOption]}
                onPress={() => {
                  setStatusFilter(status);
                  setShowStatusModal(false);
                }}
              >
                <Text style={[styles.modalOptionText, statusFilter === status && styles.selectedOptionText]}>
                  {status}
                </Text>
                {statusFilter === status && <Icon name="checkmark" size={20} color="#EF4444" />}
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

export default EmployeeReminders;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },

  header: {
    backgroundColor: '#EF4444',
    padding: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 16 : 50,
    paddingBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '700',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    fontSize: 14,
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -12,
    paddingHorizontal: 16,
  },
  statsCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    marginHorizontal: 4,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statsCount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  statsTitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },

  filtersSection: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  searchBar: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    paddingHorizontal: 12,
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  input: {
    marginLeft: 10,
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
  },

  filterRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  dropdownBox: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
  },
  dropdownText: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '500',
  },

  cardListArea: {
    flex: 1,
    marginTop: 16,
  },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#4B5563',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 16,
  },

  reminderCard: {
    backgroundColor: '#fff',
    marginBottom: 12,
    borderRadius: 14,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
  },
  overdueCard: {
    borderLeftColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    paddingRight: 80,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  reminderDate: {
    fontSize: 13,
    color: '#6366f1',
    fontWeight: '600',
  },

  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#6366f1',
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
    fontSize: 10,
    fontWeight: '700',
  },

  commentBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    gap: 8,
  },
  commentText: {
    fontSize: 13,
    color: '#4B5563',
    flex: 1,
    lineHeight: 18,
  },

  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  clientText: {
    fontSize: 13,
    color: '#6B7280',
  },

  actionRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  completeBtn: {
    backgroundColor: '#10B981',
    flex: 2,
  },
  snoozeBtn: {
    backgroundColor: '#F59E0B',
    flex: 2,
  },
  dismissBtn: {
    backgroundColor: '#6B7280',
    flex: 1,
    maxWidth: 50,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
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
    fontWeight: '700',
    color: '#1F2937',
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
    backgroundColor: '#FEF2F2',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  selectedOptionText: {
    color: '#EF4444',
    fontWeight: '600',
  },

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
    borderBottomColor: '#F3F4F6',
  },
  detailModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  detailModalBody: {
    padding: 20,
    maxHeight: 500,
  },
  detailStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#6366f1',
  },
  detailStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '600',
  },
  detailSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  detailSectionContent: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 4,
  },
  detailModalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  detailModalButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  detailModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
