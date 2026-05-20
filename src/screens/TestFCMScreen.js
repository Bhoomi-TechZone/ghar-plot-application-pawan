import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { getStoredFCMToken, getFCMToken, forceRefreshFCMToken } from '../utils/fcmService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CrossPlatformAlert from '../utils/crossPlatformAlert';
import {
  sendNewPropertyNotification,
  sendInquiryNotification,
  sendChatNotification,
  sendServiceCancelNotification,
  sendServiceCompleteNotification,
  sendSystemUpdateNotification,
  broadcastAppUpdate
} from '../services/notificationService';

const TestFCMScreen = () => {
  const [fcmToken, setFcmToken] = useState('Loading...');
  const [userId, setUserId] = useState('Not logged in');

  useEffect(() => {
    loadFCMInfo();
  }, []);

  const loadFCMInfo = async () => {
    try {
      // Get FCM token
      const token = await getStoredFCMToken();
      if (token) {
        setFcmToken(token);
      } else {
        setFcmToken('No token found');
      }

      // Get user ID
      const uid = await AsyncStorage.getItem('userId');
      if (uid) {
        setUserId(uid);
      }
    } catch (error) {
      console.error('Error loading FCM info:', error);
      setFcmToken('Error: ' + error.message);
    }
  };

  const refreshToken = async () => {
    try {
      const newToken = await getFCMToken();
      if (newToken) {
        setFcmToken(newToken);
        CrossPlatformAlert.alert('Success', 'FCM Token refreshed!');
      } else {
        CrossPlatformAlert.alert('Error', 'Failed to get FCM token');
      }
    } catch (error) {
      CrossPlatformAlert.alert('Error', error.message);
    }
  };

  // Force delete old token and get fresh one (for Firebase project change)
  const forceRefresh = async () => {
    try {
      CrossPlatformAlert.alert(
        '⚠️ Force Refresh Token',
        'This will delete old token and get a fresh one from new Firebase project. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Yes, Refresh',
            onPress: async () => {
              const newToken = await forceRefreshFCMToken();
              if (newToken) {
                setFcmToken(newToken);
                CrossPlatformAlert.alert('✅ Success', 'New FCM Token generated!\n\nToken: ' + newToken.substring(0, 50) + '...');
              } else {
                CrossPlatformAlert.alert('Error', 'Failed to get new FCM token');
              }
            }
          }
        ]
      );
    } catch (error) {
      CrossPlatformAlert.alert('Error', error.message);
    }
  };

  // Test FCM via backend API
  const testBackendFCM = async () => {
    try {
      if (fcmToken === 'Loading...' || fcmToken === 'No token found') {
        CrossPlatformAlert.alert('Error', 'FCM Token not available');
        return;
      }

      const authToken = await AsyncStorage.getItem('accessToken');

      const response = await fetch('https://gharplotbackend.gntechnology.de/api/alert/schedule-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: '🧪 FCM Test',
          reason: 'Testing FCM notification from app',
          date: new Date().toISOString().split('T')[0],
          time: new Date().toTimeString().substring(0, 5),
          repeatDaily: false,
          notificationType: 'test',
          fcmToken: fcmToken,
        }),
      });

      const data = await response.json();

      if (data.success) {
        CrossPlatformAlert.alert('✅ Success', 'FCM notification sent via backend!\n\nCheck if notification arrives.');
      } else {
        CrossPlatformAlert.alert('❌ Error', 'Backend response: ' + (data.message || JSON.stringify(data)));
      }
    } catch (error) {
      CrossPlatformAlert.alert('❌ Error', error.message);
      console.error('Backend FCM test error:', error);
    }
  };

  const copyToken = () => {
    CrossPlatformAlert.alert(
      'FCM Token',
      fcmToken,
      [
        {
          text: 'Copy',
          onPress: () => {
            // In production, use Clipboard API
            console.log('═══════════════════════════════════════');
            console.log('📋 COPY THIS FCM TOKEN:');
            console.log(fcmToken);
            console.log('═══════════════════════════════════════');
            CrossPlatformAlert.alert('Copied', 'Token logged to console. Check Metro bundler!');
          },
        },
        { text: 'OK' },
      ]
    );
  };

  // Test notification functions
  const testNewPropertyNotification = async () => {
    try {
      // Test the notification handler format
      await sendNewPropertyNotification({
        propertyId: '67890',
        title: 'Luxury Villa in Mumbai Test',
        location: 'Bandra West, Mumbai',
        price: '2.5 Crore'
      });

      CrossPlatformAlert.alert('Info', 'Backend automatically sends notifications when properties are added!\n\nCheck console for details.');
    } catch (error) {
      CrossPlatformAlert.alert('Error', error.message);
    }
  };

  const testInquiryNotification = async () => {
    try {
      if (fcmToken === 'Loading...' || fcmToken === 'No token found') {
        CrossPlatformAlert.alert('Error', 'FCM Token not available');
        return;
      }

      await sendInquiryNotification(fcmToken, {
        inquiryId: '456',
        propertyId: '123',
        inquirerName: 'Test User',
        inquirerPhone: '+91 9876543210',
        message: 'Test inquiry message'
      });

      CrossPlatformAlert.alert('Success', 'Inquiry notification sent!');
    } catch (error) {
      CrossPlatformAlert.alert('Error', error.message);
    }
  };

  const testChatNotification = async () => {
    try {
      if (fcmToken === 'Loading...' || fcmToken === 'No token found') {
        CrossPlatformAlert.alert('Error', 'FCM Token not available');
        return;
      }

      await sendChatNotification(fcmToken, {
        chatId: '789',
        senderId: 'test123',
        senderName: 'Test Sender',
        message: 'Hello! This is a test chat message.'
      });

      CrossPlatformAlert.alert('Success', 'Chat notification sent!');
    } catch (error) {
      CrossPlatformAlert.alert('Error', error.message);
    }
  };

  const testServiceCancelNotification = async () => {
    try {
      if (fcmToken === 'Loading...' || fcmToken === 'No token found') {
        CrossPlatformAlert.alert('Error', 'FCM Token not available');
        return;
      }

      await sendServiceCancelNotification(fcmToken, {
        serviceId: '101',
        serviceName: 'Property Inspection Test',
        appointmentDate: '2024-01-15',
        cancelReason: 'Test cancellation'
      });

      CrossPlatformAlert.alert('Success', 'Service Cancel notification sent!');
    } catch (error) {
      CrossPlatformAlert.alert('Error', error.message);
    }
  };

  const testServiceCompleteNotification = async () => {
    try {
      if (fcmToken === 'Loading...' || fcmToken === 'No token found') {
        CrossPlatformAlert.alert('Error', 'FCM Token not available');
        return;
      }

      await sendServiceCompleteNotification(fcmToken, {
        serviceId: '101',
        serviceName: 'Property Inspection Test',
        completedDate: '2024-01-15',
        rating: '4.5'
      });

      CrossPlatformAlert.alert('Success', 'Service Complete notification sent!');
    } catch (error) {
      CrossPlatformAlert.alert('Error', error.message);
    }
  };

  const testSystemUpdateNotification = async () => {
    try {
      // This API doesn't need FCM token, it sends to all users
      await sendSystemUpdateNotification({
        title: "New App Update Available!",
        message: "A new version of the Real Estate app is now available. Update to enjoy the latest features and improvements."
      });

      CrossPlatformAlert.alert('Success', 'System Update notification sent to all users!');
    } catch (error) {
      CrossPlatformAlert.alert('Error', error.message);
      console.error('System update test error:', error);
    }
  };

  const testBroadcastAppUpdate = async () => {
    try {
      // Test the broadcast function with version number
      await broadcastAppUpdate('2.1.0', 'Major update with new property search features and performance improvements!');

      CrossPlatformAlert.alert('Success', 'App Update broadcast sent to all users!');
    } catch (error) {
      CrossPlatformAlert.alert('Error', error.message);
      console.error('Broadcast update test error:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Firebase Cloud Messaging Test</Text>

      <View style={styles.section}>
        <Text style={styles.label}>User ID:</Text>
        <Text style={styles.value}>{userId}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>FCM Token:</Text>
        <ScrollView horizontal style={styles.tokenContainer}>
          <Text style={styles.token} selectable>{fcmToken}</Text>
        </ScrollView>
      </View>

      <TouchableOpacity style={styles.button} onPress={copyToken}>
        <Text style={styles.buttonText}>Show Full Token</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={refreshToken}>
        <Text style={styles.buttonText}>Refresh Token</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, { backgroundColor: '#e74c3c' }]} onPress={forceRefresh}>
        <Text style={styles.buttonText}>🔄 Force Refresh (New Firebase)</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, { backgroundColor: '#27ae60' }]} onPress={testBackendFCM}>
        <Text style={styles.buttonText}>🚀 Test FCM via Backend</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={loadFCMInfo}>
        <Text style={styles.buttonText}>Reload Info</Text>
      </TouchableOpacity>

      {/* Notification Test Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔔 Test Notifications</Text>

        <TouchableOpacity style={styles.testButton} onPress={testNewPropertyNotification}>
          <Text style={styles.testButtonText}>Test New Property</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.testButton} onPress={testInquiryNotification}>
          <Text style={styles.testButtonText}>Test Inquiry</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.testButton} onPress={testChatNotification}>
          <Text style={styles.testButtonText}>Test Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.testButton} onPress={testServiceCancelNotification}>
          <Text style={styles.testButtonText}>Test Service Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.testButton} onPress={testServiceCompleteNotification}>
          <Text style={styles.testButtonText}>Test Service Complete</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.testButton} onPress={testSystemUpdateNotification}>
          <Text style={styles.testButtonText}>Test System Update</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.testButton, { backgroundColor: '#ff6b35' }]} onPress={testBroadcastAppUpdate}>
          <Text style={styles.testButtonText}>🚀 Broadcast App Update</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>📋 How to Test:</Text>
        <Text style={styles.instructionsText}>
          • Use test buttons above to send notifications to your device{'\n'}
          • Each button tests different notification type{'\n'}
          • Tap notifications to see auto-navigation{'\n'}
          • Check console for detailed logs{'\n\n'}

          <Text style={styles.instructionsTitle}>Manual Testing:</Text>
          1. Copy the FCM token above{'\n'}
          2. Give token to backend developer{'\n'}
          3. Backend can send notifications using APIs{'\n'}
          4. Or use Firebase Console for testing
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  value: {
    fontSize: 16,
    color: '#333',
  },
  tokenContainer: {
    maxHeight: 100,
  },
  token: {
    fontSize: 12,
    color: '#007bff',
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  testButton: {
    backgroundColor: '#28a745',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1,
  },
  testButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  instructions: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1976d2',
  },
  instructionsText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
});

export default TestFCMScreen;
