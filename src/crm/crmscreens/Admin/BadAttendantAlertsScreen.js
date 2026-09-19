import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CrossPlatformAlert from '../../../utils/crossPlatformAlert';

const API_BASE = 'https://ghar-plot-backend1.onrender.com';
const { width, height } = Dimensions.get('window');

const BadAttendantAlertsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const statusBarTop = insets.top > 0 ? insets.top : (Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0);

  // Main States
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    last7Days: 0,
    byEmployee: []
  });
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' or 'unread'
  const [isAdmin, setIsAdmin] = useState(false);

  // Modal States
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Refs
  const autoRefreshInterval = useRef(null);

  // Initialize - Check admin access and load data
  useEffect(() => {
    checkAdminAccess();
  }, []);

  // Setup auto-refresh when admin verified
  useEffect(() => {
    if (!isAdmin) return;

    // Initial load
    loadData();

    // Setup auto-refresh every 5 minutes (300,000 ms)
    autoRefreshInterval.current = setInterval(() => {
      loadData();
    }, 300000);

    return () => {
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current);
      }
    };
  }, [isAdmin, filter]);

  // Check admin authentication
  const checkAdminAccess = async () => {
    try {
      const adminToken = await AsyncStorage.getItem('crm_admin_token') ||
        await AsyncStorage.getItem('adminToken') ||
        await AsyncStorage.getItem('crm_auth_token');

      if (!adminToken) {
        CrossPlatformAlert.alert(
          'Access Denied',
          'This feature is only available for admin users.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigation.goBack();
    }
  };

  // Load all data
  const loadData = async () => {
    if (!isAdmin) return;

    try {
      await Promise.all([
        fetchNotifications(),
        fetchStats()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  // Create auth config for API calls
  const createAuthConfig = async () => {
    const token = await AsyncStorage.getItem('crm_admin_token') ||
      await AsyncStorage.getItem('adminToken') ||
      await AsyncStorage.getItem('crm_auth_token');

    return {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  };

  // API 1: Fetch notifications
  const fetchNotifications = async () => {
    if (!isAdmin) return;

    try {
      setLoading(true);
      const config = await createAuthConfig();
      const unreadOnly = filter === 'unread';

      const response = await fetch(
        `${API_BASE}/admin/notifications/bad-attendant/list?unreadOnly=${unreadOnly}`,
        {
          method: 'GET',
          headers: config.headers
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setNotifications(data.data?.notifications || []);
      } else {
        throw new Error(data.message || 'Failed to fetch notifications');
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      CrossPlatformAlert.alert('Error', 'Failed to fetch notifications');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  // API 2: Fetch statistics
  const fetchStats = async () => {
    if (!isAdmin) return;

    try {
      const config = await createAuthConfig();

      const response = await fetch(
        `${API_BASE}/admin/notifications/bad-attendant/stats`,
        {
          method: 'GET',
          headers: config.headers
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setStats(data.data || {
          total: 0,
          unread: 0,
          last7Days: 0,
          byEmployee: []
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Set default stats on error
      setStats({
        total: 0,
        unread: 0,
        last7Days: 0,
        byEmployee: []
      });
    }
  };

  // API 3: Mark notification as read
  const markAsRead = async (notificationId) => {
    if (!notificationId) return;

    try {
      const config = await createAuthConfig();

      const response = await fetch(
        `${API_BASE}/admin/notifications/read/${notificationId}`,
        {
          method: 'PUT',
          headers: config.headers,
          body: JSON.stringify({})
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        // Update local state
        setNotifications(prev =>
          prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
        );

        if (selectedNotification?._id === notificationId) {
          setSelectedNotification(prev => ({ ...prev, read: true }));
        }

        // Update stats
        setStats(prev => ({
          ...prev,
          unread: Math.max(0, prev.unread - 1)
        }));
      }
    } catch (error) {
      console.error('Error marking as read:', error);
      CrossPlatformAlert.alert('Error', 'Failed to mark notification as read');
    }
  };

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Handle filter change
  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
  };

  // Handle view details
  const handleViewDetails = (notification) => {
    setSelectedNotification(notification);
    setShowDetailModal(true);

    // Mark as read if unread
    if (!notification.read) {
      markAsRead(notification._id);
    }
  };

  // Handle mark as read and close
  const handleMarkAsReadAndClose = () => {
    if (selectedNotification && !selectedNotification.read) {
      markAsRead(selectedNotification._id);
    }
    setShowDetailModal(false);
    setSelectedNotification(null);
  };

  // Format date
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return dateString;
    }
  };

  // Get filtered notifications count
  const getFilteredCount = (filterType) => {
    if (filterType === 'unread') {
      return stats.unread || 0;
    }
    return stats.total || notifications.length;
  };

  // Render Statistics Cards
  const renderStatsCards = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <MaterialIcons name="notifications" size={24} color="#2563EB" />
        <Text style={styles.statNumber}>{stats.last7Days || 0}</Text>
        <Text style={styles.statLabel}>Total Alerts</Text>
        <Text style={styles.statSubLabel}>(7 Days)</Text>
      </View>

      <View style={styles.statCard}>
        <MaterialIcons name="warning" size={24} color="#F59E0B" />
        <Text style={styles.statNumber}>{stats.unread || 0}</Text>
        <Text style={styles.statLabel}>Unread</Text>
        <Text style={styles.statSubLabel}>Alerts</Text>
      </View>

      <View style={styles.statCard}>
        <MaterialIcons name="people" size={24} color="#8B5CF6" />
        <Text style={styles.statNumber}>{stats.byEmployee?.length || 0}</Text>
        <Text style={styles.statLabel}>Employees</Text>
        <Text style={styles.statSubLabel}>Flagged</Text>
      </View>
    </View>
  );

  // Render Top Offenders
  const renderTopOffenders = () => {
    if (!stats.byEmployee || stats.byEmployee.length === 0) {
      return null;
    }

    const topOffenders = stats.byEmployee.slice(0, 5);

    return (
      <View style={styles.topOffendersSection}>
        <Text style={styles.sectionTitle}>🚨 Top Offenders (Last 7 Days)</Text>
        {topOffenders.map((employee, index) => (
          <View key={employee._id || index} style={styles.offenderCard}>
            <View style={styles.offenderRank}>
              <Text style={styles.rankNumber}>{index + 1}</Text>
            </View>
            <View style={styles.offenderInfo}>
              <Text style={styles.offenderName}>
                {employee.employeeName || 'Unknown Employee'}
              </Text>
              <Text style={styles.offenderStats}>
                {employee.count || 0} violations | Avg: {Math.round(employee.avgWordCount || 0)} words
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  // Render Notification Card
  const renderNotificationCard = ({ item }) => {
    const isUnread = !item.read;
    const metadata = item.metadata || {};

    return (
      <TouchableOpacity
        style={[styles.notificationCard, isUnread && styles.unreadCard]}
        onPress={() => handleViewDetails(item)}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <MaterialIcons name="warning" size={20} color="#DC2626" />
            <View style={styles.redZoneBadge}>
              <Text style={styles.redZoneText}>RED ZONE</Text>
            </View>
          </View>
          {isUnread && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={styles.notificationTitle}>
          BAD ATTENDANT - Response Too Short
        </Text>

        {/* Employee Info */}
        <View style={styles.employeeSection}>
          <View style={styles.employeeAvatar}>
            <Text style={styles.avatarText}>
              {metadata.employeeName?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.employeeInfo}>
            <Text style={styles.employeeName}>
              {metadata.employeeName || 'Unknown Employee'}
            </Text>
            <Text style={styles.employeeEmail}>
              {metadata.employeeDetails?.email || 'No email'}
            </Text>
          </View>
        </View>

        {/* Metrics */}
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <MaterialIcons name="chat" size={16} color="#7C3AED" />
            <Text style={styles.metricText}>
              {metadata.wordCount || 0} words (Required: 10)
            </Text>
          </View>
          <View style={styles.metric}>
            <MaterialIcons name="access-time" size={16} color="#6B7280" />
            <Text style={styles.metricText}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>

        {/* Details */}
        <View style={styles.detailsSection}>
          <Text style={styles.detailLabel}>Reminder:</Text>
          <Text style={styles.detailText}>{metadata.reminderTitle || 'Unknown'}</Text>
          <Text style={styles.detailLabel}>Client:</Text>
          <Text style={styles.detailText}>{metadata.clientName || 'Unknown'}</Text>
        </View>

        {/* Response Preview */}
        <View style={styles.responsePreview}>
          <Text style={styles.responseLabel}>Response:</Text>
          <Text style={styles.responseText}>
            "{metadata.response || 'No response'}"
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleViewDetails(item)}
          >
            <MaterialIcons name="visibility" size={16} color="#2563EB" />
            <Text style={styles.actionText}>View Details</Text>
          </TouchableOpacity>

          {isUnread && (
            <TouchableOpacity
              style={styles.markReadButton}
              onPress={() => markAsRead(item._id)}
            >
              <MaterialIcons name="check" size={16} color="#059669" />
              <Text style={styles.markReadText}>Mark as Read</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Render Detail Modal
  const renderDetailModal = () => {
    if (!selectedNotification) return null;

    const metadata = selectedNotification.metadata || {};
    const employeeDetails = metadata.employeeDetails || {};

    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleRow}>
                  <MaterialIcons name="warning" size={24} color="#DC2626" />
                  <Text style={styles.modalTitle}>Bad Attendant Alert Details</Text>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowDetailModal(false)}
                >
                  <MaterialIcons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Severity Badges */}
              <View style={styles.severitySection}>
                <View style={styles.severityBadge}>
                  <Text style={styles.severityText}>HIGH SEVERITY</Text>
                </View>
                <View style={styles.redZoneBadgeLarge}>
                  <Text style={styles.redZoneTextLarge}>RED ZONE</Text>
                </View>
              </View>

              {/* Employee Information */}
              <View style={styles.modalSection}>
                <Text style={styles.sectionHeaderText}>👤 Employee Information</Text>
                <View style={styles.infoGrid}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Name:</Text>
                    <Text style={styles.infoValue}>{metadata.employeeName || 'Unknown'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Email:</Text>
                    <Text style={styles.infoValue}>{employeeDetails.email || 'No email'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Phone:</Text>
                    <Text style={styles.infoValue}>{employeeDetails.phone || 'No phone'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Employee ID:</Text>
                    <Text style={styles.infoValue}>{metadata.employeeId || 'Unknown'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Designation:</Text>
                    <Text style={styles.infoValue}>{employeeDetails.designation || 'Unknown'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Department:</Text>
                    <Text style={styles.infoValue}>{employeeDetails.department || 'Unknown'}</Text>
                  </View>
                </View>
              </View>

              {/* Violation Details */}
              <View style={styles.modalSection}>
                <Text style={styles.sectionHeaderText}>⚠️ Violation Details</Text>
                <View style={styles.infoGrid}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Reminder:</Text>
                    <Text style={styles.infoValue}>{metadata.reminderTitle || 'Unknown'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Client:</Text>
                    <Text style={styles.infoValue}>{metadata.clientName || 'Unknown'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Word Count:</Text>
                    <Text style={[styles.infoValue, styles.errorText]}>
                      {metadata.wordCount || 0} words (Required: 10)
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Timestamp:</Text>
                    <Text style={styles.infoValue}>{formatDate(selectedNotification.createdAt)}</Text>
                  </View>
                </View>
              </View>

              {/* Employee Response */}
              <View style={styles.modalSection}>
                <Text style={styles.sectionHeaderText}>💬 Employee Response</Text>
                <View style={styles.responseContainer}>
                  <Text style={styles.responseFullText}>
                    "{metadata.response || 'No response provided'}"
                  </Text>
                </View>
              </View>

              {/* Violation Message */}
              <View style={styles.modalSection}>
                <Text style={styles.sectionHeaderText}>📋 Violation Message</Text>
                <View style={styles.violationContainer}>
                  <Text style={styles.violationMessage}>
                    {selectedNotification.message ||
                      `BAD ATTENDANT - Employee provided only ${metadata.wordCount || 0} words in reminder response (minimum 10 required)`}
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                {!selectedNotification.read && (
                  <TouchableOpacity
                    style={styles.markReadButtonLarge}
                    onPress={handleMarkAsReadAndClose}
                  >
                    <MaterialIcons name="check" size={20} color="#fff" />
                    <Text style={styles.markReadButtonText}>Mark as Read & Close</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.closeButtonLarge}
                  onPress={() => setShowDetailModal(false)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // Loading state
  if (!isAdmin) {
    return (
      <View style={[styles.container, { paddingTop: statusBarTop }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#DC2626" />
          <Text style={styles.loadingText}>Checking admin access...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: statusBarTop }]}>
      {/* Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>🚨 Bad Attendant Alerts</Text>
          <Text style={styles.headerSubtitle}>[RED ZONE]</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Icon name="refresh" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Statistics Cards */}
        {renderStatsCards()}

        {/* Top Offenders */}
        {renderTopOffenders()}

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'all' && styles.activeFilterTab]}
            onPress={() => handleFilterChange('all')}
          >
            <Text
              style={[
                styles.filterTabText,
                filter === 'all' && styles.activeFilterTabText,
              ]}
            >
              All ({getFilteredCount('all')})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, filter === 'unread' && styles.activeFilterTab]}
            onPress={() => handleFilterChange('unread')}
          >
            <Text
              style={[
                styles.filterTabText,
                filter === 'unread' && styles.activeFilterTabText,
              ]}
            >
              Unread ({getFilteredCount('unread')})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Notifications List */}
        <View style={styles.notificationsContainer}>
          {loading && notifications.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#DC2626" />
              <Text style={styles.loadingText}>Loading notifications...</Text>
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="notifications-off" size={64} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No Bad Attendant Alerts</Text>
              <Text style={styles.emptyText}>
                {filter === 'unread'
                  ? 'All notifications have been read'
                  : 'No employee violations found'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(item) => item._id || item.id || Math.random().toString()}
              renderItem={renderNotificationCard}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </ScrollView>

      {/* Detail Modal */}
      {renderDetailModal()}
    </View>
  );
};

export default BadAttendantAlertsScreen;

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  /* Loading States */
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },

  /* Header */
  topHeader: {
    backgroundColor: '#DC2626', // Red for BAD ATTENDANT theme
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    color: '#FECACA',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },

  /* Scroll Container */
  scrollContainer: {
    flex: 1,
  },

  /* Statistics Cards */
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginTop: 4,
  },
  statSubLabel: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 2,
  },

  /* Top Offenders Section */
  topOffendersSection: {
    margin: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  offenderCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    borderLeftWidth: 3,
    borderLeftColor: '#DC2626',
  },
  offenderRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankNumber: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  offenderInfo: {
    flex: 1,
  },
  offenderName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  offenderStats: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },

  /* Filter Tabs */
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  filterTab: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    marginRight: 10,
  },
  activeFilterTab: {
    backgroundColor: '#DC2626',
  },
  filterTabText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  activeFilterTabText: {
    color: '#fff',
  },

  /* Notifications Container */
  notificationsContainer: {
    paddingHorizontal: 16,
  },

  /* Empty State */
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },

  /* Notification Card */
  notificationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  unreadCard: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },

  /* Card Header */
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  redZoneBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  redZoneText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  newBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },

  /* Notification Title */
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },

  /* Employee Section */
  employeeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  employeeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  employeeEmail: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },

  /* Metrics Row */
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  metricText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },

  /* Details Section */
  detailsSection: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginTop: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#6B7280',
  },

  /* Response Preview */
  responsePreview: {
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  responseLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#991B1B',
    marginBottom: 4,
  },
  responseText: {
    fontSize: 12,
    color: '#7F1D1D',
    fontStyle: 'italic',
  },

  /* Card Actions */
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    marginLeft: 6,
    color: '#2563EB',
    fontWeight: '500',
    fontSize: 13,
  },
  markReadButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  markReadText: {
    marginLeft: 6,
    color: '#059669',
    fontWeight: '500',
    fontSize: 13,
  },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 20,
    maxHeight: height * 0.9,
    width: width * 0.95,
    maxWidth: 500,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  closeButton: {
    padding: 4,
  },

  /* Severity Section */
  severitySection: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 16,
  },
  severityBadge: {
    backgroundColor: '#991B1B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 12,
  },
  severityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  redZoneBadgeLarge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  redZoneTextLarge: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  /* Modal Sections */
  modalSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  infoGrid: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    width: 100,
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
  },
  errorText: {
    color: '#DC2626',
    fontWeight: '600',
  },
  responseContainer: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
  },
  responseFullText: {
    fontSize: 14,
    color: '#7F1D1D',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  violationContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  violationMessage: {
    fontSize: 14,
    color: '#991B1B',
    lineHeight: 20,
  },

  /* Modal Actions */
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  markReadButtonLarge: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 12,
    justifyContent: 'center',
  },
  markReadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  closeButtonLarge: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 0.4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
