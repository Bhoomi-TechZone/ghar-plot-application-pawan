import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL, del } from '../../../services/api';
import CrossPlatformAlert from '../../../utils/crossPlatformAlert';

const AdminNotificationsInbox = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const getToken = async () => {
    return (
      (await AsyncStorage.getItem('adminToken')) ||
      (await AsyncStorage.getItem('admin_token')) ||
      (await AsyncStorage.getItem('employee_auth_token'))
    );
  };

  const fetchNotifications = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`${BASE_URL}/admin/notifications/admin-reminders?limit=50`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNotifications(data.data?.notifications || []);
          setUnreadCount(data.data?.unreadCount || 0);
        }
      }
    } catch (err) {
      console.log('Error fetching admin notifications:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (notificationId) => {
    try {
      const token = await getToken();
      await fetch(`${BASE_URL}/admin/notifications/admin-reminders/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      setNotifications(prev =>
        prev.map(n => (n._id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.log('Error marking notification as read:', err.message);
    }
  };

  const markAllAsRead = async () => {
    try {
      console.log('📬 FRONTEND: Attempting to mark all as read...');
      const token = await getToken();
      const response = await fetch(`${BASE_URL}/admin/notifications/admin-reminders/mark-all-read`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      console.log('📩 FRONTEND: Response from server:', data);

      if (response.ok && data.success) {
        console.log('✅ FRONTEND: Mark all read SUCCESS');
        // Update local state immediately
        setNotifications(prev => prev.map(n => ({ ...n, read: true, isRead: true })));
        setUnreadCount(0);

        // Optional: Re-fetch to be absolutely sync (with small delay)
        setTimeout(() => fetchNotifications(), 500);

        CrossPlatformAlert.alert('Success', data.message || 'All notifications marked as read');
      } else {
        console.warn('⚠️ FRONTEND: Mark all read FAILED', data);
        CrossPlatformAlert.alert('Error', data.message || 'Failed to mark all as read server-side');
      }
    } catch (err) {
      console.error('❌ FRONTEND: Network Error:', err.message);
      CrossPlatformAlert.alert('Error', 'Network error. Failed to mark all as read.');
    }
  };

  const deleteNotification = async (notificationId) => {
    CrossPlatformAlert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const result = await del(`/admin/notifications/admin-reminders/${notificationId}`);

              if (result && (result.success || result.deletedCount > 0)) {
                setNotifications(prev => prev.filter(n => n._id !== notificationId));
                setUnreadCount(prev => Math.max(0, prev - 1));
              } else {
                CrossPlatformAlert.alert('Error', 'Failed to delete notification');
              }
            } catch (err) {
              console.log('Error deleting notification:', err.message);
              CrossPlatformAlert.alert('Error', 'Network error while deleting notification');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const clearAllNotifications = async () => {
    CrossPlatformAlert.alert(
      'Clear All Notifications',
      'Are you sure you want to permanently delete ALL notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const result = await del('/admin/notifications/admin-reminders/delete-all');

              if (result && (result.success || result.deletedCount !== undefined)) {
                setNotifications([]);
                setUnreadCount(0);
                CrossPlatformAlert.alert('Success', 'All notifications cleared');
              } else {
                CrossPlatformAlert.alert('Error', 'Failed to clear notifications');
              }
            } catch (err) {
              console.log('Error clearing notifications:', err.message);
              CrossPlatformAlert.alert('Error', 'Network error while clearing notifications');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays}d ago`;
  };

  const handlePressNotification = (item) => {
    if (!item.read) {
      markAsRead(item._id);
    }

    // Extract metadata carefully from the database schema
    const meta = item.metadata || {};

    navigation.navigate('AdminReminderDetailsScreen', {
      employeeName: meta.employeeName || item.employeeName || 'Employee',
      employeeEmail: meta.employeeEmail || item.employeeEmail || '',
      reminderTitle: meta.reminderTitle || item.title || '',
      clientName: meta.clientName || item.reminderData?.name || item.clientName || '',
      phone: meta.phone || item.reminderData?.phone || item.phone || '',
      location: meta.location || item.reminderData?.location || item.location || '',
      note: item.reminderData?.note || meta.note || '',   // ✅ actual reminder comment
      reminderTime: meta.reminderTime || item.reminderData?.reminderTime || item.createdAt,
      reminderId: meta.reminderId || item.reminderId || item._id,
      enquiryId: meta.enquiryId || meta.leadId || item.enquiryId,
    });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.notifCard, !item.read && styles.unreadCard]}
      onPress={() => handlePressNotification(item)}
      activeOpacity={0.7}
    >
      <View style={styles.notifIconWrap}>
        <Icon
          name={item.read ? 'notifications-outline' : 'notifications'}
          size={22}
          color={item.read ? '#9ca3af' : '#3b82f6'}
        />
        {!item.read && <View style={styles.unreadDot} />}
      </View>
      <View style={styles.notifContent}>
        <Text style={[styles.notifTitle, !item.read && styles.unreadTitle]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.notifMessage} numberOfLines={2}>
          {item.message}
        </Text>
        {(item.metadata?.clientName || item.clientName) && (
          <Text style={styles.notifMeta}>
            <Icon name="person-outline" size={11} color="#6b7280" /> {item.metadata?.clientName || item.clientName}
          </Text>
        )}
        <Text style={styles.notifTime}>{formatTime(item.createdAt)}</Text>
      </View>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => deleteNotification(item._id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Icon name="trash-outline" size={20} color="#ef4444" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3b82f6" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Notifications {unreadCount > 0 ? `(${unreadCount} unread)` : ''}
        </Text>
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllAsRead} style={styles.markAllBtn}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}
          {notifications.length > 0 && (
            <TouchableOpacity onPress={clearAllNotifications} style={styles.clearAllBtn}>
              <Icon name="trash-outline" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centered}>
          <Icon name="notifications-off-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyText}>No notifications yet</Text>
          <Text style={styles.emptySubText}>
            Admin reminder notifications from employees will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          extraData={unreadCount}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchNotifications();
              }}
              colors={['#3b82f6']}
            />
          }
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    elevation: 4,
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#fff' },
  markAllBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginRight: 8,
  },
  markAllText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  clearAllBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.8)', // Red transparent
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingText: { marginTop: 12, color: '#6b7280', fontSize: 14 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 16 },
  emptySubText: { fontSize: 13, color: '#9ca3af', textAlign: 'center', marginTop: 8 },

  notifCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 12,
    padding: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  unreadCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  notifIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 3 },
  unreadTitle: { color: '#1e40af', fontWeight: '700' },
  notifMessage: { fontSize: 12, color: '#6b7280', lineHeight: 17, marginBottom: 4 },
  notifMeta: { fontSize: 11, color: '#6b7280', marginBottom: 2 },
  notifTime: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  deleteBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 10,
  },
});

export default AdminNotificationsInbox;
