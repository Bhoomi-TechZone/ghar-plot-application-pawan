/**
 * Reminder Manager Service
 * Handles reminder scheduling, checking, and popup triggering
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const REMINDERS_KEY = 'app_reminders';
const CHECKED_REMINDERS_KEY = 'checked_reminders'; // Persist checked reminders
const CHECK_INTERVAL = 30000; // Check every 30 seconds (reduced from 5 to avoid spam)
const CRM_BASE_URL = 'https://ghar-plot-backend1.onrender.com';

class ReminderManager {
  constructor() {
    this.checkInterval = null;
    this.reminderCallback = null;
    this.checkedReminders = new Set(); // Track already triggered reminders
    this.isRunning = false;
  }

  /**
   * Initialize reminder manager
   * @param {Function} onReminderTrigger - Callback when reminder time matches
   */
  async initialize(onReminderTrigger) {
    this.reminderCallback = onReminderTrigger;
    this.isRunning = true;

    // Load previously checked reminders from storage
    await this.loadCheckedReminders();

    this.startChecking();
    console.log('✅ Reminder Manager initialized with 30-second check interval');
  }

  /**
   * Load checked reminders from AsyncStorage
   */
  async loadCheckedReminders() {
    try {
      const checked = await AsyncStorage.getItem(CHECKED_REMINDERS_KEY);
      if (checked) {
        const checkedArray = JSON.parse(checked);
        this.checkedReminders = new Set(checkedArray);
        console.log(`📋 Loaded ${this.checkedReminders.size} previously checked reminders`);
      }
    } catch (error) {
      console.error('Error loading checked reminders:', error);
    }
  }

  /**
   * Save checked reminders to AsyncStorage
   */
  async saveCheckedReminders() {
    try {
      const checkedArray = Array.from(this.checkedReminders);
      await AsyncStorage.setItem(CHECKED_REMINDERS_KEY, JSON.stringify(checkedArray));
    } catch (error) {
      console.error('Error saving checked reminders:', error);
    }
  }

  /**
   * Start checking reminders periodically
   */
  startChecking() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    // Check immediately
    this.checkReminders();

    // Then check every 30 seconds (reduced frequency)
    this.checkInterval = setInterval(() => {
      if (this.isRunning) {
        this.checkReminders();
      }
    }, CHECK_INTERVAL);

    console.log('🔄 Reminder checking started (30-second intervals)');
  }

  /**
   * Stop checking reminders
   */
  stopChecking() {
    this.isRunning = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('⏸️ Enhanced reminder checking stopped');
    }
  }

  /**
   * Add reminder to local storage AND backend for FCM notifications
   */
  async addReminder(reminderData) {
    try {
      const reminders = await this.getAllReminders();

      // Add unique ID if not present
      const reminder = {
        ...reminderData,
        id: reminderData.id || `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: reminderData.createdAt || new Date().toISOString(),
        status: reminderData.status || 'pending',
        triggered: false,
      };

      reminders.push(reminder);
      await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));

      console.log('✅ Reminder added to local storage:', reminder.id);

      // 🔥 Also save to backend for FCM notifications (background/killed mode)
      try {
        await this.saveReminderToBackend(reminder);
      } catch (backendError) {
        console.warn('⚠️ Backend save failed (local still works):', backendError.message);
      }

      return reminder;
    } catch (error) {
      console.error('❌ Error adding reminder:', error);
      throw error;
    }
  }

  /**
   * 🔥 Save reminder to backend for FCM push notifications
   * This enables notifications in background/killed mode via cron job
   */
  async saveReminderToBackend(reminderData) {
    try {
      const accessToken = await AsyncStorage.getItem('accessToken');

      if (!accessToken) {
        console.warn('⚠️ No auth token, skipping backend save');
        return { success: false, message: 'No auth token' };
      }

      // Map frontend reminder format to backend API format
      const backendPayload = {
        title: reminderData.title || 'Reminder',
        comment: reminderData.note || reminderData.comment || '',
        reminderDateTime: reminderData.reminderDateTime || reminderData.scheduledDate,
        isRepeating: reminderData.repeatType && reminderData.repeatType !== 'none',
        repeatType: reminderData.repeatType || 'daily',
        // Client info
        clientName: reminderData.clientName || reminderData.name || '',
        phone: reminderData.phone || '',
        email: reminderData.email || '',
        location: reminderData.location || '',
        // Optional IDs
        enquiryId: reminderData.enquiryId,
        manualInquiryId: reminderData.manualInquiryId,
      };

      console.log('📤 Saving reminder to backend for FCM:', backendPayload);

      const response = await fetch(`${CRM_BASE_URL}/api/reminder/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(backendPayload),
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Reminder saved to backend! FCM will send notification at scheduled time.');
        return { success: true, data };
      } else {
        console.warn('⚠️ Backend response:', data.message);
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('❌ Error saving reminder to backend:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get all reminders from local storage
   */
  async getAllReminders() {
    try {
      const data = await AsyncStorage.getItem(REMINDERS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('❌ Error getting reminders:', error);
      return [];
    }
  }

  /**
   * Get pending reminders
   */
  async getPendingReminders() {
    try {
      const reminders = await this.getAllReminders();
      return reminders.filter(r => r.status === 'pending' && !r.triggered);
    } catch (error) {
      console.error('❌ Error getting pending reminders:', error);
      return [];
    }
  }

  /**
   * ✅ FIXED: Check if any reminder time has arrived - Only trigger ONCE
   */
  async checkReminders() {
    try {
      const pendingReminders = await this.getPendingReminders();
      const now = new Date();

      if (pendingReminders.length === 0) {
        return; // No reminders to check
      }

      // Silent check - don't log every time
      for (const reminder of pendingReminders) {
        const reminderTime = new Date(reminder.reminderDateTime || reminder.reminderTime);

        // Skip if already triggered (check both memory and triggered flag)
        if (this.checkedReminders.has(reminder.id) || reminder.triggered === true) {
          continue;
        }

        // Check if reminder time has arrived (within 60 seconds window)
        const timeDiff = now.getTime() - reminderTime.getTime();
        const isDue = timeDiff >= 0 && timeDiff <= 60000; // Within 60 seconds

        if (isDue) {
          console.log('🔔 REMINDER DUE - Triggering popup!');
          console.log('  📋 Title:', reminder.title || reminder.name);
          console.log('  📅 Scheduled:', reminderTime.toLocaleString());

          // Mark as checked IMMEDIATELY to prevent duplicates
          this.checkedReminders.add(reminder.id);
          await this.saveCheckedReminders(); // Persist to storage

          await this.triggerReminder(reminder);

          // Only trigger one reminder at a time
          break;
        }
      }
    } catch (error) {
      console.error('❌ Error checking reminders:', error);
    }
  }

  /**
   * Trigger reminder popup
   */
  async triggerReminder(reminder) {
    try {
      // Mark as triggered
      await this.markAsTriggered(reminder.id);

      // Call callback to show popup
      if (this.reminderCallback) {
        this.reminderCallback(reminder);
      }

      console.log('✅ Reminder triggered successfully');
    } catch (error) {
      console.error('❌ Error triggering reminder:', error);
    }
  }

  /**
   * Mark reminder as triggered
   */
  async markAsTriggered(reminderId) {
    try {
      const reminders = await this.getAllReminders();
      const updated = reminders.map(r =>
        r.id === reminderId ? { ...r, triggered: true } : r
      );
      await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('❌ Error marking reminder as triggered:', error);
    }
  }

  /**
   * Mark reminder as completed
   */
  async markAsCompleted(reminderId, response) {
    try {
      const reminders = await this.getAllReminders();
      const updated = reminders.map(r =>
        r.id === reminderId ? {
          ...r,
          status: 'completed',
          completedAt: new Date().toISOString(),
          response: response
        } : r
      );
      await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(updated));
      console.log('✅ Reminder marked as completed');
    } catch (error) {
      console.error('❌ Error marking reminder as completed:', error);
    }
  }

  /**
   * Delete reminder
   */
  async deleteReminder(reminderId) {
    try {
      const reminders = await this.getAllReminders();
      const filtered = reminders.filter(r => r.id !== reminderId);
      await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(filtered));
      console.log('✅ Reminder deleted');
    } catch (error) {
      console.error('❌ Error deleting reminder:', error);
    }
  }

  /**
   * Clear all completed reminders
   */
  async clearCompletedReminders() {
    try {
      const reminders = await this.getAllReminders();
      const active = reminders.filter(r => r.status !== 'completed');
      await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(active));
      console.log('✅ Completed reminders cleared');
    } catch (error) {
      console.error('❌ Error clearing completed reminders:', error);
    }
  }

  /**
   * Get upcoming reminders (next 24 hours)
   */
  async getUpcomingReminders() {
    try {
      const reminders = await this.getPendingReminders();
      const now = new Date();
      const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      return reminders.filter(r => {
        const reminderTime = new Date(r.reminderDateTime || r.reminderTime);
        return reminderTime >= now && reminderTime <= next24Hours;
      }).sort((a, b) => {
        const timeA = new Date(a.reminderDateTime || a.reminderTime);
        const timeB = new Date(b.reminderDateTime || b.reminderTime);
        return timeA - timeB;
      });
    } catch (error) {
      console.error('❌ Error getting upcoming reminders:', error);
      return [];
    }
  }

  /**
   * ✅ ENHANCED: Force immediate check (for testing)
   */
  forceCheck() {
    console.log('🔄 Forcing immediate reminder check...');
    this.checkReminders();
  }

  /**
   * ✅ ENHANCED: Get service status for debugging
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      hasCallback: !!this.reminderCallback,
      checkedCount: this.checkedReminders.size,
      intervalActive: !!this.checkInterval
    };
  }

  /**
   * ✅ ENHANCED: Create test reminder for debugging
   */
  async createTestReminder(delaySeconds = 30) {
    const testTime = new Date(Date.now() + delaySeconds * 1000);
    const testReminder = {
      id: `test-${Date.now()}`,
      title: '🧪 Test Reminder',
      note: `This is a test reminder created for debugging (${delaySeconds}s delay)`,
      name: 'Test Client',
      phone: '9999999999',
      contactNumber: '9999999999',
      location: 'Test Location',
      reminderDateTime: testTime.toISOString(),
      status: 'pending',
      assignmentType: 'enquiry',
      isLocalReminder: true,
      createdAt: new Date().toISOString()
    };

    await this.addReminder(testReminder);
    console.log(`🧪 Test reminder created - will trigger at: ${testTime.toLocaleString()}`);
    return testReminder;
  }

  /**
   * ✅ ENHANCED: Clear checked reminders set (for testing or reset)
   */
  async resetCheckedReminders() {
    this.checkedReminders.clear();
    await AsyncStorage.removeItem(CHECKED_REMINDERS_KEY);
    console.log('🔄 Checked reminders cleared from memory and storage');
  }

  /**
   * ✅ NEW: Clear all reminders - useful for debugging
   */
  async clearAllReminders() {
    try {
      await AsyncStorage.removeItem(REMINDERS_KEY);
      await AsyncStorage.removeItem(CHECKED_REMINDERS_KEY);
      this.checkedReminders.clear();
      console.log('🧹 All reminders cleared from storage');
    } catch (error) {
      console.error('❌ Error clearing reminders:', error);
    }
  }
}

// Export singleton instance
const reminderManager = new ReminderManager();

// ✅ ENHANCED: Global debug commands for development
if (__DEV__) {
  global.debugReminders = {
    // Check service status
    status: () => {
      const status = reminderManager.getStatus();
      console.log('🔍 Reminder Manager Status:', status);
      return status;
    },

    // Create immediate test reminder (30 seconds)
    testNow: () => {
      return reminderManager.createTestReminder(30);
    },

    // Create test reminder for 2 minutes
    test2Min: () => {
      return reminderManager.createTestReminder(120);
    },

    // Force immediate check
    forceCheck: () => {
      reminderManager.forceCheck();
      return 'Force check triggered';
    },

    // Get all pending reminders
    pending: async () => {
      const pending = await reminderManager.getPendingReminders();
      console.log('📋 Pending reminders:', pending.length);
      pending.forEach((r, i) => {
        const time = new Date(r.reminderDateTime || r.reminderTime);
        console.log(`  ${i + 1}. ${r.title || r.name} at ${time.toLocaleString()}`);
      });
      return pending;
    },

    // Clear all reminders
    clearAll: async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.removeItem('app_reminders');
      reminderManager.resetCheckedReminders();
      console.log('🗑️ All reminders cleared');
      return 'All reminders cleared';
    },

    // Reset checked reminders
    reset: () => {
      reminderManager.resetCheckedReminders();
      return 'Checked reminders reset';
    }
  };

  // Auto-log debug commands
  setTimeout(() => {
    console.log('🛠️ Enhanced Debug Commands Available:');
    console.log('  • global.debugReminders.status() - Check service status');
    console.log('  • global.debugReminders.testNow() - Test popup in 30s');
    console.log('  • global.debugReminders.test2Min() - Test popup in 2min');
    console.log('  • global.debugReminders.forceCheck() - Force check now');
    console.log('  • global.debugReminders.pending() - List pending reminders');
    console.log('  • global.debugReminders.clearAll() - Clear all reminders');
    console.log('  • global.debugReminders.reset() - Reset checked reminders');
  }, 3000);
}

export default reminderManager;
