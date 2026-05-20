/**
 * NOTIFICATION NAVIGATION - CODE REFERENCE & SNIPPETS
 * 
 * Copy-paste ready code for common tasks
 */

// ============================================================
// 1. SCHEDULING NOTIFICATION WITH ENQUIRY ID
// ============================================================

// Location: EnquiryCard.js or ReminderModal.js
// Usage: Call this when user creates a reminder

const scheduleEnquiryReminder = async (enquiry, reminderDate) => {
  const reminderData = {
    id: `reminder_${enquiry._id}_${Date.now()}`,  // Unique ID
    clientName: enquiry.clientName,                // For notification title
    message: `Follow up with ${enquiry.clientName} regarding property inquiry`,
    scheduledDate: reminderDate,                   // Date object for when to notify
    enquiryId: enquiry._id,                        // 🔑 KEY: ID for navigation
    enquiry: enquiry,                              // Full data if needed
  };

  const result = await ReminderNotificationService.scheduleReminder(reminderData);
  
  if (result.success) {
    console.log('✅ Reminder scheduled:', result.notificationId);
  } else {
    console.error('❌ Failed:', result.message);
  }
  
  return result;
};

// ============================================================
// 2. HANDLING NOTIFICATION CLICK (Automatic - NotificationHandler)
// ============================================================

// Location: src/services/NotificationHandler.js
// This code runs automatically when user clicks notification

async function handleNotificationPress(notification, navigationRef) {
  try {
    const notificationData = notification?.data;
    const { type, enquiryId, reminderId, clientName } = notificationData;

    if (type === 'enquiry_reminder' && enquiryId) {
      // Wait for navigation to be ready
      await new Promise(resolve => setTimeout(resolve, 500));

      // Navigate to enquiry detail
      if (navigationRef?.current?.isReady?.()) {
        navigationRef.current.navigate('EnquiryDetail', {
          enquiryId: enquiryId,           // Required: ID to fetch
          clientName: clientName,         // Optional: for display
          fromNotification: true,         // Flag: came from notification
          reminderId: reminderId,         // Optional: for reminder management
        });
      } else {
        // Store for later processing
        if (typeof storeNotificationData === 'function') {
          await storeNotificationData(notification);
        }
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// ============================================================
// 3. SETUP IN APP.JS
// ============================================================

// Import
import NotificationHandler from './src/services/NotificationHandler';

// In useEffect
useEffect(() => {
  // Initialize notification listeners
  const unsubscribe = NotificationHandler.setupNotificationListeners(
    navigationRef,
    (notification) => {
      console.log('Notification received');
    }
  );

  return () => {
    if (unsubscribe) unsubscribe();
  };
}, []);

// When navigation ready (add to AppNavigator)
const onNavigationReadyBasic = async () => {
  console.log('Navigation ready');
  // Process any pending notification from killed state
  await NotificationHandler.processPendingNotification(navigationRef);
};

// Pass to navigator
<AppNavigator ref={navigationRef} onReady={onNavigationReadyBasic} />

// ============================================================
// 4. ENQUIRY DETAIL SCREEN - LOADING DATA
// ============================================================

// Location: EnquiryDetailScreen.js
// This fetches and displays enquiry data

const fetchEnquiryDetails = async () => {
  try {
    setLoading(true);
    const { enquiryId } = route.params;

    // Fetch all enquiries from API
    const response = await getAllEnquiriesMerged();

    if (response.success) {
      // Find the specific enquiry
      const foundEnquiry = response.data.find(e => e._id === enquiryId);
      
      if (foundEnquiry) {
        setEnquiry(foundEnquiry);
        setEditedData(foundEnquiry);
      } else {
        Alert.alert('Not Found', 'Enquiry not found');
        navigation.goBack();
      }
    }
  } catch (error) {
    console.error('Error:', error);
    Alert.alert('Error', 'Failed to load enquiry');
  } finally {
    setLoading(false);
  }
};

// ============================================================
// 5. EDIT ENQUIRY DATA
// ============================================================

// Handle field changes during edit
const handleEditChange = (field, value) => {
  setEditedData(prev => ({
    ...prev,
    [field]: value
  }));
};

// Save changes (connect to API)
const handleSaveChanges = async () => {
  try {
    // 🔄 TODO: Replace with actual API call
    // const response = await updateEnquiry(enquiry._id, editedData);
    
    Alert.alert('Success', 'Changes saved!');
    setIsEditing(false);
    setEnquiry(editedData);
  } catch (error) {
    Alert.alert('Error', 'Failed to save');
  }
};

// ============================================================
// 6. SET REMINDER FROM DETAIL SCREEN
// ============================================================

// In EnquiryDetailScreen.js
const handleSetReminder = async () => {
  try {
    const reminderDate = new Date();
    reminderDate.setHours(reminderDate.getHours() + 1); // 1 hour from now

    const result = await ReminderNotificationService.scheduleReminder({
      id: `reminder_${enquiry._id}_${Date.now()}`,
      clientName: enquiry.clientName,
      message: `Follow up with ${enquiry.clientName}`,
      scheduledDate: reminderDate,
      enquiryId: enquiry._id,
      enquiry: enquiry,
    });

    if (result.success) {
      Alert.alert(
        '✅ Reminder Set!',
        `Scheduled for ${reminderDate.toLocaleString()}`
      );
    } else {
      Alert.alert('Error', result.message);
    }
  } catch (error) {
    Alert.alert('Error', 'Failed to set reminder');
  }
};

// ============================================================
// 7. QUICK REMINDER (1 HOUR) - ENQUIRY CARD
// ============================================================

// Location: EnquiryCard.js
// User taps ⏰ button for quick 1-hour reminder

const handleQuickReminder = async () => {
  try {
    const reminderDate = new Date();
    reminderDate.setHours(reminderDate.getHours() + 1); // 1 hour

    const reminderData = {
      id: `reminder_${enquiry._id}_${Date.now()}`,
      clientName: enquiry.clientName,
      message: `Follow up with ${enquiry.clientName}`,
      scheduledDate: reminderDate,
      enquiryId: enquiry._id,
      enquiry: enquiry,
    };

    const result = await ReminderNotificationService.scheduleReminder(reminderData);
    
    if (result.success) {
      Alert.alert(
        'Reminder Set!',
        `Notification scheduled for ${reminderDate.toLocaleString()}\n\n` +
        `You'll be notified even if the app is closed.`
      );
    }
  } catch (error) {
    Alert.alert('Error', 'Failed to set reminder');
  }
};

// ============================================================
// 8. NAVIGATION ROUTE CONFIGURATION
// ============================================================

// In AdminNavigator.js
import EnquiryDetailScreen from '../crm/crmscreens/Admin/EnquiryDetailScreen';

// In Stack.Navigator
<Stack.Screen
  name="EnquiryDetail"
  component={EnquiryDetailScreen}
  options={{
    headerShown: true,
    title: 'Enquiry Details',
    headerStyle: {
      backgroundColor: '#007AFF',
    },
    headerTintColor: '#fff',
    headerTitleStyle: {
      fontWeight: 'bold',
    },
  }}
/>

// Usage from notification:
navigationRef.current.navigate('EnquiryDetail', {
  enquiryId: 'enquiry_123',
  clientName: 'John Doe',
  fromNotification: true,
});

// ============================================================
// 9. CUSTOM REMINDER - FULL FORM
// ============================================================

// Location: ReminderModal.js
// User selects custom date and time

const handleSubmit = async () => {
  try {
    // Create reminder date from form inputs
    const reminderDateTime = createReminderDateTime(
      formData.date,
      formData.hour,
      formData.minute,
      formData.period
    );

    const reminderDate = new Date(reminderDateTime);
    const now = new Date();
    
    // Validate future date
    if (reminderDate <= now) {
      Alert.alert('Invalid', 'Please select a future date');
      return;
    }

    // Schedule notification
    const result = await ReminderNotificationService.scheduleReminder({
      id: `reminder_${enquiry._id}_${Date.now()}`,
      clientName: formData.name,
      message: formData.note || `Follow up with ${formData.name}`,
      scheduledDate: reminderDate,
      enquiryId: enquiry._id,
      enquiry: enquiry,
    });

    if (result.success) {
      Alert.alert(
        '✅ Reminder Set!',
        `${reminderDate.toLocaleString()}\n\n` +
        `Notification even if app is closed!`
      );
      onSuccess?.();
    } else {
      Alert.alert('Error', result.message);
    }
  } catch (error) {
    Alert.alert('Error', 'Failed to create reminder');
  }
};

// ============================================================
// 10. CANCEL REMINDER (From Detail Screen)
// ============================================================

// Location: EnquiryDetailScreen.js
// Allow user to cancel scheduled reminder

const handleCancelReminder = async (reminderId) => {
  try {
    const result = await ReminderNotificationService.cancelReminder(reminderId);
    
    if (result.success) {
      Alert.alert('Success', 'Reminder cancelled');
      // Reload or update UI
    } else {
      Alert.alert('Error', 'Failed to cancel reminder');
    }
  } catch (error) {
    Alert.alert('Error', error.message);
  }
};

// ============================================================
// 11. HANDLE INITIAL NOTIFICATION (App Killed)
// ============================================================

// Location: NotificationHandler.js
// Automatically called when app launches from notification

function checkInitialNotification(navigationRef) {
  notifee
    .getInitialNotification()
    .then((initialNotification) => {
      if (initialNotification) {
        console.log('App opened from notification');
        
        // Wait for navigation to be ready
        setTimeout(() => {
          handleNotificationPress(
            initialNotification.notification,
            navigationRef
          );
        }, 1000);
      }
    });
}

// ============================================================
// 12. PROCESS PENDING NOTIFICATION (When App Ready)
// ============================================================

// Location: App.js (onNavigationReady callback)
// Process notification that was stored while app was killed

const onNavigationReady = async () => {
  console.log('✅ Navigation ready');
  
  // Check if there's a pending notification stored
  const pendingData = await AsyncStorage.getItem('pendingNotificationData');
  
  if (pendingData && navigationRef?.current?.isReady?.()) {
    const { data } = JSON.parse(pendingData);
    const fakeNotification = { data };
    
    // Navigate to enquiry detail
    NotificationHandler.handleNotificationPress(fakeNotification, navigationRef);
    
    // Clear pending data
    await AsyncStorage.removeItem('pendingNotificationData');
  }
};

// ============================================================
// 13. NOTIFICATION PERMISSIONS CHECK
// ============================================================

// Location: ReminderNotificationService.js
// Check if user has granted notification permissions

async function getNotificationPermissionStatus() {
  try {
    if (Platform.OS === 'android') {
      const settings = await notifee.getNotificationSettings();
      return {
        granted: settings.authorizationStatus === 1,
        canScheduleExactAlarms: await notifee.canScheduleExactAlarms(),
      };
    }
    return { granted: true };
  } catch (error) {
    return { granted: false };
  }
}

// ============================================================
// 14. CREATE NOTIFICATION CHANNEL
// ============================================================

// Location: ReminderNotificationService.js
// Called once during app initialization

async function createNotificationChannel() {
  await notifee.createChannel({
    id: 'enquiry_reminders',
    name: 'Enquiry Reminders',
    description: 'Notifications for enquiry reminders',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
    vibrationPattern: [300, 500, 300, 500],
    lights: true,
    visibility: AndroidVisibility.PUBLIC,
    badge: true,
  });
}

// ============================================================
// 15. NAVIGATION PARAMETERS REFERENCE
// ============================================================

/**
 * Parameters passed to EnquiryDetail:
 * 
 * navigation.navigate('EnquiryDetail', {
 *   enquiryId: string,              // Required: Unique enquiry ID
 *   clientName: string,             // Optional: Client name for display
 *   fromNotification: boolean,      // Optional: Flag for notification badge
 *   reminderId: string,             // Optional: Associated reminder ID
 * });
 * 
 * How to access in EnquiryDetailScreen:
 * const { enquiryId, clientName, fromNotification, reminderId } = route.params;
 */

// ============================================================
// COMMON ERRORS & FIXES
// ============================================================

/**
 * ERROR: "Cannot read property 'navigate' of undefined"
 * FIX: navigationRef.current is not set
 * SOLUTION: Check ref is passed to AppNavigator
 * 
 * ERROR: "Enquiry not found in list"
 * FIX: API response doesn't include enquiry
 * SOLUTION: Verify enquiryId matches database
 * 
 * ERROR: "Navigation fired but screen didn't change"
 * FIX: Navigation ref not ready
 * SOLUTION: Add delay or use onReady callback
 * 
 * ERROR: "Notification doesn't open app when killed"
 * FIX: Missing getInitialNotification() check
 * SOLUTION: Ensure checkInitialNotification() is called
 * 
 * ERROR: "Edits not saved"
 * FIX: No backend API connected
 * SOLUTION: Replace Alert with actual updateEnquiry() call
 */

export default {
  scheduleEnquiryReminder,
  handleQuickReminder,
  handleSetReminder,
  handleSaveChanges,
  handleCancelReminder,
  handleNotificationPress,
};
