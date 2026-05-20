/**
 * Chat Notification Service
 * Handles sending push notifications for chat messages
 * when the app is in background or closed
 */

import { post } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Send push notification for new chat message
 * This will trigger a notification on the receiver's device
 * even if the app is closed
 */
export const sendChatMessageNotification = async (messageData) => {
  try {
    const {
      receiverId,
      senderId,
      senderName,
      message,
      chatId,
      propertyId,
    } = messageData;

    // Validation
    if (!receiverId || !chatId || !message) {
      console.warn('⚠️ Missing required notification data:', { receiverId, chatId, message: !!message });
      return { success: false, error: 'Missing required data' };
    }

    // Get sender's info from storage if not provided
    let finalSenderName = senderName;
    if (!finalSenderName) {
      const userFullName = await AsyncStorage.getItem('userFullName');
      finalSenderName = userFullName || 'Someone';
    }

    const payload = {
      receiverId,
      notification: {
        title: `💬 ${finalSenderName}`,
        body: message.substring(0, 100),
      },
      data: {
        type: 'new_chat_message',
        chatId,
        senderId,
        senderName: finalSenderName,
        message,
        propertyId: propertyId || '',
        action: 'open_chat',
        timestamp: new Date().toISOString(),
      },
    };

    console.log('📤 Sending chat notification to backend:', payload);

    // Send to your backend API that will forward to FCM
    const response = await post('/api/notifications/chat', payload).catch(err => {
      console.warn('⚠️ Notification API not available:', err.message);
      return { success: false, error: 'API not available' };
    });
    
    if (response && response.success) {
      console.log('✅ Chat notification sent successfully');
    } else {
      console.warn('⚠️ Chat notification response:', response);
    }

    return response;
  } catch (error) {
    console.error('❌ Failed to send chat notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send notification for typing indicator (optional)
 */
export const sendTypingNotification = async (chatId, userId, isTyping) => {
  try {
    const payload = {
      chatId,
      userId,
      isTyping,
      timestamp: new Date().toISOString(),
    };

    // This can be handled via WebSocket or API
    console.log('⌨️ Typing status:', payload);
    
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to send typing notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Mark chat as read and update notification status
 */
export const markChatAsRead = async (chatId, userId) => {
  try {
    const payload = {
      chatId,
      userId,
      readAt: new Date().toISOString(),
    };

    const response = await post('/api/chat/mark-read', payload);
    console.log('✅ Chat marked as read');
    
    return response;
  } catch (error) {
    console.error('❌ Failed to mark chat as read:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get unread message count for badge
 */
export const getUnreadCount = async (userId) => {
  try {
    // This should be implemented in your backend
    // For now, return 0
    return 0;
  } catch (error) {
    console.error('❌ Failed to get unread count:', error);
    return 0;
  }
};

/**
 * Clear all chat notifications for a specific chat
 */
export const clearChatNotifications = async (chatId) => {
  try {
    console.log('🔕 Clearing notifications for chat:', chatId);
    
    // You can implement this based on your notification system
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to clear notifications:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Handle notification actions based on notification data
 */
export const handleChatNotificationAction = (notificationData, navigation) => {
  const { chatId, senderId, senderName, propertyId } = notificationData;

  console.log('🔔 Handling chat notification action:', { chatId, senderId, senderName });

  if (chatId) {
    // Navigate to chat detail screen
    navigation.navigate('ChatDetailScreen', {
      chatId,
      user: {
        _id: senderId,
        fullName: senderName || 'User',
      },
      propertyTitle: propertyId || '',
    });
  } else {
    // Navigate to chat list if no specific chat
    navigation.navigate('ChatListScreen');
  }
};

/**
 * Request notification permissions
 */
export const requestNotificationPermissions = async () => {
  try {
    const { Platform, PermissionsAndroid } = require('react-native');
    
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    
    return true; // iOS handles this automatically
  } catch (error) {
    console.error('❌ Failed to request notification permissions:', error);
    return false;
  }
};

export default {
  sendChatMessageNotification,
  sendTypingNotification,
  markChatAsRead,
  getUnreadCount,
  clearChatNotifications,
  handleChatNotificationAction,
  requestNotificationPermissions,
};
