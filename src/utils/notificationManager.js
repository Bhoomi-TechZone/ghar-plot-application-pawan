import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';

/**
 * Notification Manager Service
 * Handles local notification storage and management
 */

// Add a new notification to the list
export const addNotification = async (notification) => {
  try {
    const newNotification = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      read: false,
      ...notification
    };

    // Get existing notifications
    const existingNotifications = await getNotifications();
    const updatedNotifications = [newNotification, ...existingNotifications];

    // Keep only last 50 notifications
    const trimmedNotifications = updatedNotifications.slice(0, 50);

    // Save updated notifications
    await AsyncStorage.setItem('app_notifications', JSON.stringify(trimmedNotifications));

    // Update notification count
    const unreadCount = trimmedNotifications.filter(n => !n.read).length;
    await AsyncStorage.setItem('notification_count', unreadCount.toString());

    // Emit event to update UI
    DeviceEventEmitter.emit('notificationAdded', {
      notification: newNotification,
      count: unreadCount
    });

    console.log('✅ Notification added:', newNotification.title);
    return newNotification;
  } catch (error) {
    console.error('❌ Error adding notification:', error);
    return null;
  }
};

// Get all notifications
export const getNotifications = async () => {
  try {
    const stored = await AsyncStorage.getItem('app_notifications');
    if (!stored) return [];

    let notifications = JSON.parse(stored);

    // 🔥 Remove old generic "Reminder Alert" notifications automatically
    notifications = notifications.filter(n => !String(n.title).includes('Reminder Alert'));

    return notifications;
  } catch (error) {
    console.error('❌ Error getting notifications:', error);
    return [];
  }
};

// Get unread notification count
export const getNotificationCount = async () => {
  try {
    const count = await AsyncStorage.getItem('notification_count');
    return count ? parseInt(count, 10) : 0;
  } catch (error) {
    console.error('❌ Error getting notification count:', error);
    return 0;
  }
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId) => {
  try {
    const notifications = await getNotifications();
    const updatedNotifications = notifications.map(notification =>
      notification.id === notificationId
        ? { ...notification, read: true }
        : notification
    );

    await AsyncStorage.setItem('app_notifications', JSON.stringify(updatedNotifications));

    // Update count
    const unreadCount = updatedNotifications.filter(n => !n.read).length;
    await AsyncStorage.setItem('notification_count', unreadCount.toString());

    // Emit event to update UI
    DeviceEventEmitter.emit('notificationCountUpdated', unreadCount);

    return true;
  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    return false;
  }
};

// Clear all notifications
export const clearAllNotifications = async () => {
  try {
    await AsyncStorage.removeItem('app_notifications');
    await AsyncStorage.setItem('notification_count', '0');

    // Emit event to update UI
    DeviceEventEmitter.emit('notificationCountUpdated', 0);

    return true;
  } catch (error) {
    console.error('❌ Error clearing notifications:', error);
    return false;
  }
};

// Add property notification (for testing)
export const addPropertyNotification = async (propertyData) => {
  const notification = {
    type: 'new_property',
    title: '🏠 New Property Added!',
    message: `A new property has been listed: ${propertyData.description || 'Property'} in ${propertyData.propertyLocation || 'Unknown Location'}`,
    propertyId: propertyData._id || propertyData.id,
    image: propertyData.photosAndVideo && propertyData.photosAndVideo.length > 0
      ? propertyData.photosAndVideo[0] : null
  };

  return await addNotification(notification);
};

// Add inquiry notification
export const addInquiryNotification = async (inquiryData) => {
  const notification = {
    type: 'inquiry',
    title: '📋 New Property Inquiry',
    message: `${inquiryData.inquirerName} is interested in your property`,
    inquiryId: inquiryData.inquiryId,
    propertyId: inquiryData.propertyId
  };

  return await addNotification(notification);
};

// Add chat notification (enhanced for backend compatibility)
export const addChatNotification = async (chatData) => {
  const notification = {
    type: 'chat',
    title: chatData.title || `💬 ${chatData.senderName || 'New Message'}`,
    message: chatData.message || chatData.text || 'You have a new message',
    chatId: chatData.chatId,
    senderId: chatData.senderId,
    senderName: chatData.senderName,
    propertyId: chatData.propertyId, // If chat is property-related
    action: 'open_chat' // For navigation
  };

  return await addNotification(notification);
};

// Add system notification
export const addSystemNotification = async (title, message) => {
  const notification = {
    type: 'system',
    title: title || '🔔 System Update',
    message: message || 'System notification'
  };

  return await addNotification(notification);
};

// Test function to add sample notifications
export const addTestNotifications = async () => {
  const testNotifications = [
    {
      type: 'new_property',
      title: '🏠 New Property Added!',
      message: 'A beautiful 3BHK apartment in Bandra West, Mumbai has been listed for ₹2.5 Crore',
      propertyId: 'test_prop_1'
    },
    {
      type: 'inquiry',
      title: '📋 New Property Inquiry',
      message: 'John Doe is interested in your property listing',
      inquiryId: 'test_inq_1',
      propertyId: 'test_prop_1'
    },
    {
      type: 'chat',
      title: '💬 New Message',
      message: 'Sarah: Hi, is this property still available?',
      chatId: 'test_chat_1',
      senderId: 'user_sarah'
    },
    {
      type: 'system',
      title: '🚀 App Update Available',
      message: 'Version 2.1.0 is now available with new features and improvements!'
    }
  ];

  for (const notificationData of testNotifications) {
    await addNotification(notificationData);
    // Add delay between notifications for better testing
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('✅ Test notifications added successfully!');
};