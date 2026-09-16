/**
 * Simple Notification Service
 * Integrates with existing backend APIs for sending notifications
 */

import { post } from './api';
import { getFCMToken } from '../utils/fcmService';

/**
 * Send notification when new property is added
 * NOTE: Backend automatically sends notifications when property is added
 * This function is for manual testing or special cases
 */
export const sendNewPropertyNotification = async (propertyData) => {
    try {
        console.log('📢 New property notification would be sent for:', propertyData);
        console.log('ℹ️  Backend automatically sends notifications when properties are added via addProperty API');

        // For testing purposes, we can simulate the backend notification format
        const testNotification = {
            title: "🏠 New Property Added!",
            body: "A new property has just been listed.",
            data: {
                propertyId: propertyData.propertyId || propertyData.id
            }
        };

        console.log('🧪 Test notification format:', testNotification);
        return { success: true, message: 'Backend handles this automatically' };
    } catch (error) {
        console.error('❌ Failed to process new property notification:', error);
    }
};

/**
 * Send notification for new inquiry
 * Uses existing 'inquiry' API
 */
export const sendInquiryNotification = async (inquiryData) => {
    try {
        const payload = {
            title: "📋 New Property Inquiry",
            body: `${inquiryData.buyerName} is interested in your property`,
            data: {
                type: 'new_inquiry',
                propertyId: inquiryData.propertyId,
                inquiryId: inquiryData.id,
                action: 'view_inquiry'
            },
            ownerId: inquiryData.ownerId
        };

        const response = await post('/api/notifications/inquiry', payload);
        console.log('✅ Inquiry notification sent:', response);
        return response;
    } catch (error) {
        console.error('❌ Failed to send inquiry notification:', error);
    }
};

/**
 * Send chat message notification
 * Uses existing 'chat' API
 */
export const sendChatNotification = async (messageData) => {
    try {
        const payload = {
            title: "💬 New Message",
            body: messageData.message.substring(0, 50) + "...",
            data: {
                type: 'new_message',
                chatId: messageData.chatId,
                senderId: messageData.senderId,
                propertyId: messageData.propertyId,
                action: 'open_chat'
            },
            receiverId: messageData.receiverId
        };

        const response = await post('/api/notifications/chat', payload);
        console.log('✅ Chat notification sent:', response);
        return response;
    } catch (error) {
        console.error('❌ Failed to send chat notification:', error);
    }
};

/**
 * Send reminder notification
 * Uses FCM to send reminder notifications from backend
 */
export const sendReminderNotification = async (reminderData) => {
    try {
        const payload = {
            title: "⏰ रिमाइंडर",
            body: `${reminderData.clientName} को कॉल करने का समय - ${reminderData.note}`,
            data: {
                type: 'reminder',
                reminderId: reminderData.id || reminderData.reminderId,
                enquiryId: reminderData.enquiryId,
                clientName: reminderData.clientName,
                phoneNumber: reminderData.phoneNumber || reminderData.contactNumber,
                action: 'view_reminder'
            },
            userId: reminderData.assignedTo || reminderData.employeeId
        };

        // Send to backend FCM endpoint
        const response = await post('/api/notifications/reminder', payload);
        console.log('✅ Reminder notification sent:', response);
        return response;
    } catch (error) {
        console.error('❌ Failed to send reminder notification:', error);
        throw error;
    }
};

/**
 * Send batch reminder notifications
 * For sending multiple reminders at once
 */
export const sendBatchReminderNotifications = async (reminders) => {
    try {
        const results = await Promise.allSettled(
            reminders.map(reminder => sendReminderNotification(reminder))
        );

        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        console.log(`✅ Batch reminder notifications: ${successful} sent, ${failed} failed`);
        return { successful, failed, results };
    } catch (error) {
        console.error('❌ Failed to send batch reminder notifications:', error);
        throw error;
    }
};

/**
 * Send service cancellation notification
 * Uses existing 'service cancel' API
 */
export const sendServiceCancelNotification = async (serviceData) => {
    try {
        const payload = {
            title: "❌ Service Cancelled",
            body: `Your ${serviceData.serviceName} appointment has been cancelled`,
            data: {
                type: 'service_cancelled',
                serviceId: serviceData.id,
                reason: serviceData.reason,
                action: 'view_services'
            },
            userId: serviceData.userId
        };

        const response = await post('/api/notifications/service-cancel', payload);
        console.log('✅ Service cancel notification sent:', response);
        return response;
    } catch (error) {
        console.error('❌ Failed to send service cancel notification:', error);
    }
};

/**
 * Send service completion notification
 * Uses existing 'service complete' API
 */
export const sendServiceCompleteNotification = async (serviceData) => {
    try {
        const payload = {
            title: "✅ Service Completed",
            body: `Your ${serviceData.serviceName} has been completed successfully`,
            data: {
                type: 'service_completed',
                serviceId: serviceData.id,
                rating: serviceData.rating,
                action: 'rate_service'
            },
            userId: serviceData.userId
        };

        const response = await post('/api/notifications/service-complete', payload);
        console.log('✅ Service complete notification sent:', response);
        return response;
    } catch (error) {
        console.error('❌ Failed to send service complete notification:', error);
    }
};

/**
 * Send system update notification using the real backend API
 * POST https://gharplotbackend.gntechnology.de/application/notify-update
 */
export const sendSystemUpdateNotification = async (updateData) => {
    try {
        // Use the actual backend endpoint
        const apiUrl = 'https://gharplotbackend.gntechnology.de/application/notify-update';

        const payload = {
            title: updateData.title || "New App Update Available!",
            message: updateData.message || updateData.description || "A new version of the Real Estate app is now available. Update to enjoy the latest features and improvements."
        };

        console.log('📤 Sending app update notification:', payload);

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success) {
            console.log('✅ App update notification sent successfully:', result);
            console.log(`📊 Sent to: ${result.sentCount} users, Failed: ${result.failedCount} users`);
        } else {
            console.error('❌ App update notification failed:', result);
        }

        return result;
    } catch (error) {
        console.error('❌ Failed to send app update notification:', error);
        throw error;
    }
};

/**
 * Broadcast app update notification to all users
 * This is a convenience function for sending app updates
 */
export const broadcastAppUpdate = async (version, customMessage) => {
    try {
        const updateData = {
            title: `🚀 GharPlot v${version} Available!`,
            message: customMessage || `New version ${version} is now available with exciting new features and improvements. Update now for the best experience!`
        };

        const result = await sendSystemUpdateNotification(updateData);
        return result;
    } catch (error) {
        console.error('❌ Failed to broadcast app update:', error);
        throw error;
    }
};

/**
 * Handle notification tap/open actions
 */
export const handleNotificationAction = (notificationData, navigation) => {
    const { type, action, propertyId } = notificationData;

    console.log('🔔 Handling notification action - Full Data:', JSON.stringify(notificationData, null, 2));
    console.log('🔔 Type:', type, 'Action:', action, 'PropertyId:', propertyId);

    // 1. Priority: Handle alerts and Admin-created reminders (which are technically alerts)
    if (type === 'alert' || type === 'admin_reminder' || type === 'system_alert' || notificationData.alertId) {
        console.log(`✅ MATCHED ALERT/ADMIN_REMINDER - Triggering popup dialog`);

        const popupData = {
            ...notificationData,
            fromTap: true,
            type: notificationData.alertId ? 'admin_reminder' : (type || 'alert'),
            title: notificationData.alertTitle || notificationData.title || notificationData.reminderTitle || (type === 'alert' ? 'Alert' : 'Reminder'),
            note: notificationData.reason || notificationData.message || notificationData.body || notificationData.note || '',
        };

        if (global.triggerProfessionalReminder) {
            console.log('🚀 Triggering popup from handleNotificationAction');
            global.triggerProfessionalReminder(popupData);
            return;
        }

        // Fallback: Queue for AppState/onNavigationReady
        try {
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            AsyncStorage.setItem('pendingNotificationData', JSON.stringify({
                triggerReminderPopup: true,
                data: popupData,
                timestamp: Date.now()
            }));
            return;
        } catch (_) {}

        // Ultimate fallback if popup cannot be shown
        if (navigation && navigation.navigate) {
            navigation.navigate('EditAlert', {
                alertId: notificationData.alertId?.replace('alert_', '') || notificationData.id?.replace('alert_', '') || notificationData.reminderId?.replace('alert_', ''),
                originalTitle: notificationData.alertTitle || notificationData.title || notificationData.reminderTitle || '',
                originalReason: notificationData.reason || notificationData.message || notificationData.body || notificationData.note || '',
                originalDate: notificationData.date || notificationData.scheduledDate || notificationData.reminderTime || '',
                originalTime: notificationData.time || notificationData.scheduledTime || '',
                repeatDaily: (notificationData.repeatDaily === 'true' || notificationData.repeatDaily === true || notificationData.repeatDaily === 'daily' || notificationData.repeatFrequency === 'daily'),
            });
        }
        return;
    }

    // 2. Handle employee reminder to admin - navigate to detailed read-only admin screen
    if (type === 'employee_reminder_to_admin') {
        console.log('✅ MATCHED EMPLOYEE-TO-ADMIN REMINDER - Navigating to AdminReminderDetailsScreen');
        navigation.navigate('AdminReminderDetailsScreen', {
            employeeName: notificationData.employeeName,
            employeeEmail: notificationData.employeeEmail,
            reminderTitle: notificationData.reminderTitle || notificationData.title,
            clientName: notificationData.clientName,
            phone: notificationData.phone,
            location: notificationData.location,
            note: notificationData.note || notificationData.body,
            reminderTime: notificationData.reminderTime || notificationData.timestamp,
            reminderId: notificationData.reminderId || notificationData.id,
            enquiryId: notificationData.enquiryId,
        });
        return;
    }

    // 3. Handle normal employee reminders - navigate to detailed screen
    if (type === 'reminder' || type === 'enquiry_reminder') {
        console.log('✅ MATCHED REMINDER TYPE - Navigating to EmployeeReminderDetailsScreen');
        const params = {
            reminderId: notificationData.reminderId || notificationData.id,
            clientName: notificationData.clientName || 'Client',
            originalMessage: notificationData.message || notificationData.body || notificationData.note || '',
            enquiryId: notificationData.enquiryId,
            fromNotification: true,
            phone: notificationData.phone || notificationData.phoneNumber || '',
            email: notificationData.email || '',
            location: notificationData.location || '',
            reminderTime: notificationData.reminderTime || notificationData.scheduledDate || notificationData.scheduledTime || '',
            isRepeating: notificationData.isRepeating === 'true' || notificationData.isRepeating === true,
            repeatType: notificationData.repeatType || 'none',
        };

        console.log('📤 Navigation params:', params);

        // Navigate directly to EmployeeReminderDetailsScreen
        navigation.navigate('EmployeeReminderDetailsScreen', params);
        return;
    }

    // Handle backend's new property notification format
    if (propertyId && !action) {
        console.log('🏠 Opening property details for:', propertyId);
        navigation.navigate('PropertyDetailsScreen', {
            itemId: propertyId
        });
        return;
    }

    switch (action) {
        case 'view_property':
            navigation.navigate('PropertyDetailsScreen', {
                itemId: notificationData.propertyId
            });
            break;

        case 'view_inquiry':
            navigation.navigate('MyBookingsScreen', {
                tab: 'inquiries',
                inquiryId: notificationData.inquiryId
            });
            break;

        case 'view_reminder':
        case 'call_reminder':
            // Handle reminder actions
            if (notificationData.enquiryId) {
                navigation.navigate('EnquiriesScreen', {
                    enquiryId: notificationData.enquiryId,
                    showReminder: true,
                    autoCall: action === 'call_reminder' ? notificationData.phoneNumber : null
                });
            } else {
                navigation.navigate('EnquiriesScreen');
            }
            break;

        case 'open_chat':
            // Enhanced chat navigation with sender info
            const chatParams = {
                chatId: notificationData.chatId,
                propertyId: notificationData.propertyId,
            };

            // Add user info if available
            if (notificationData.senderName) {
                chatParams.user = {
                    fullName: notificationData.senderName,
                    _id: notificationData.senderId
                };
            }

            navigation.navigate('ChatDetailScreen', chatParams);
            break;

        case 'view_services':
            navigation.navigate('ServicesScreen');
            break;

        case 'rate_service':
            navigation.navigate('ServicesScreen', {
                serviceId: notificationData.serviceId,
                showRating: true
            });
            break;

        case 'update_app':
            // Open app store or show update dialog
            console.log('📱 Redirect to app update:', notificationData.updateUrl);
            break;

        default:
            // Default action - go to home
            navigation.navigate('Home');
            break;
    }
};

/**
 * Setup notification handlers for the app
 * Call this in App.js after FCM initialization
 */
export const setupNotificationHandlers = (navigation) => {
    // This function will be called when notification is tapped
    return (remoteMessage) => {
        if (remoteMessage && remoteMessage.data) {
            handleNotificationAction(remoteMessage.data, navigation);
        }
    };
};

/**
 * Test notification sending (for debugging)
 */
export const sendTestNotification = async () => {
    try {
        const token = await getFCMToken();

        const payload = {
            title: "🧪 Test Notification",
            body: "This is a test notification from Gharplot app!",
            data: {
                type: 'test',
                action: 'view_home'
            },
            fcmToken: token
        };

        console.log('🧪 Sending test notification...');
        // You can create a test endpoint in backend or use any existing one
        return payload;
    } catch (error) {
        console.error('❌ Test notification failed:', error);
    }
};
