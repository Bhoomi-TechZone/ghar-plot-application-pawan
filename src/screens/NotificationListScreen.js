import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatImageUrl } from '../services/homeApi';
import { runCompleteFCMTest, showFCMTestResults, sendTestFCMNotification } from '../utils/fcmTestService';
import CrossPlatformAlert from '../utils/crossPlatformAlert';

const NotificationListScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load notifications from AsyncStorage
  const loadNotifications = async () => {
    try {
      const stored = await AsyncStorage.getItem('app_notifications');
      if (stored) {
        const notificationsList = JSON.parse(stored);
        // Sort by timestamp (newest first)
        const sortedNotifications = notificationsList.sort((a, b) => 
          new Date(b.timestamp) - new Date(a.timestamp)
        );
        setNotifications(sortedNotifications);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Clear all notifications
  const clearAllNotifications = async () => {
    CrossPlatformAlert.alert(
      'Clear All Notifications',
      'Are you sure you want to clear all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('app_notifications');
              await AsyncStorage.setItem('notification_count', '0');
              setNotifications([]);
              // Notify HomeScreen to update count
              navigation.navigate('Home');
            } catch (error) {
              console.error('Error clearing notifications:', error);
            }
          },
        },
      ]
    );
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      const updatedNotifications = notifications.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      );
      
      setNotifications(updatedNotifications);
      await AsyncStorage.setItem('app_notifications', JSON.stringify(updatedNotifications));
      
      // Update unread count
      const unreadCount = updatedNotifications.filter(n => !n.read).length;
      await AsyncStorage.setItem('notification_count', unreadCount.toString());
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Handle notification tap
  const handleNotificationTap = async (notification) => {
    // Mark as read
    await markAsRead(notification.id);
    
    // Navigate based on notification type
    if (notification.type === 'new_property' && notification.propertyId) {
      navigation.navigate('PropertyDetailsScreen', { itemId: notification.propertyId });
    } else if (notification.type === 'inquiry' && notification.inquiryId) {
      navigation.navigate('MyBookingsScreen', { tab: 'inquiries' });
    } else if (notification.type === 'chat' && notification.chatId) {
      navigation.navigate('ChatDetailScreen', { chatId: notification.chatId });
    }
  };

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'new_property': return 'home-outline';
      case 'inquiry': return 'mail-outline';
      case 'chat': return 'chatbubble-outline';
      case 'service': return 'construct-outline';
      case 'system': return 'notifications-outline';
      default: return 'information-circle-outline';
    }
  };

  // Get notification color based on type
  const getNotificationColor = (type) => {
    switch (type) {
      case 'new_property': return '#4CAF50';
      case 'inquiry': return '#2196F3';
      case 'chat': return '#FF9800';
      case 'service': return '#9C27B0';
      case 'system': return '#F44336';
      default: return '#666';
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
    
    return date.toLocaleDateString();
  };

  // Refresh notifications
  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  // Render notification item
  const renderNotificationItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !item.read && styles.unreadNotification
      ]}
      onPress={() => handleNotificationTap(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: getNotificationColor(item.type) + '20' }]}>
        <Icon 
          name={getNotificationIcon(item.type)} 
          size={24} 
          color={getNotificationColor(item.type)} 
        />
      </View>
      
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, !item.read && styles.unreadTitle]}>
            {item.title}
          </Text>
          {!item.read && <View style={styles.unreadDot} />}
        </View>
        
        <Text style={styles.message} numberOfLines={2}>
          {item.message}
        </Text>
        
        <Text style={styles.timestamp}>
          {formatTimestamp(item.timestamp)}
        </Text>
      </View>
      
      {item.image && (
        <Image
          source={{ uri: formatImageUrl(item.image) }}
          style={styles.notificationImage}
          resizeMode="cover"
        />
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#1E90FF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E90FF" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#1E90FF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        
        {/* FCM Test Button - for debugging */}
        {__DEV__ && (
          <TouchableOpacity 
            onPress={async () => {
              CrossPlatformAlert.alert(
                'FCM Test Options',
                'Test Firebase Cloud Messaging functionality',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Quick Test',
                    onPress: async () => {
                      const result = await sendTestFCMNotification();
                      CrossPlatformAlert.alert(
                        result.success ? '✅ Test Sent' : '❌ Test Failed',
                        result.success 
                          ? `Test notification sent via ${result.method}` 
                          : result.error
                      );
                      // Refresh notifications list
                      await loadNotifications();
                    }
                  },
                  {
                    text: 'Full Diagnostics',
                    onPress: async () => {
                      const results = await runCompleteFCMTest();
                      showFCMTestResults(results);
                      // Refresh notifications list
                      await loadNotifications();
                    }
                  }
                ]
              );
            }}
            style={[styles.clearButton, { backgroundColor: '#4CAF50', marginRight: 8 }]}
          >
            <Text style={styles.clearButtonText}>FCM</Text>
          </TouchableOpacity>
        )}
        
        {notifications.length > 0 && (
          <TouchableOpacity onPress={clearAllNotifications} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="notifications-outline" size={80} color="#ccc" />
          <Text style={styles.emptyTitle}>No Notifications</Text>
          <Text style={styles.emptyMessage}>
            You'll see notifications about new properties, inquiries, and messages here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
    marginLeft: 8,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FF4444',
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  listContainer: {
    padding: 16,
  },
  notificationItem: {
    flexDirection: 'row',
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
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: '#1E90FF',
    backgroundColor: '#f0f8ff',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  unreadTitle: {
    fontWeight: '700',
    color: '#1E90FF',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1E90FF',
    marginLeft: 8,
  },
  message: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  notificationImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginLeft: 12,
  },
});

export default NotificationListScreen;