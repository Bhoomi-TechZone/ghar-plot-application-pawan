/**
 * AdminNotificationPollingService.js
 * 
 * Frontend-only fix: Polls backend for new EMPLOYEE reminders and shows popup on admin device.
 * 
 * NOTE: Alerts are handled via FCM push notifications, NOT polling.
 * 
 * HOW IT WORKS:
 * 1. On first run: records all existing reminder IDs as "already seen" (no spam)
 * 2. Every 30 seconds: fetches reminders from /admin/reminders/due-all
 * 3. Compares with known IDs - any NEW employee reminders trigger popup on admin device
 * 4. Admin's own reminders are filtered out (they get FCM directly)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { showEmployeeNotificationPopup } from './EmployeePopupManager';

const CRM_BASE_URL = 'https://ghar-plot-backend1.onrender.com';
const POLL_INTERVAL = 30000; // 30 seconds
const KNOWN_IDS_KEY = 'admin_poll_known_ids';
const FIRST_RUN_KEY = 'admin_poll_initialized';

let pollingTimer = null;
let isPolling = false;

/**
 * Get auth headers using admin token
 */
const getAdminHeaders = async () => {
  const token = await AsyncStorage.getItem('adminToken') ||
    await AsyncStorage.getItem('admin_token');
  if (!token) return null;
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

/**
 * Check if current user is admin or sub-admin
 */
const isAdminLoggedIn = async () => {
  const userType = await AsyncStorage.getItem('userType');
  const adminToken = await AsyncStorage.getItem('adminToken') ||
    await AsyncStorage.getItem('admin_token');

  // Super admin
  if (userType === 'admin' && !!adminToken) return true;

  // Sub-admin: employee with giveAdminAccess who has admin delegate token
  if (userType === 'employee' && !!adminToken) {
    try {
      const employeeDataStr = await AsyncStorage.getItem('employee_user');
      if (employeeDataStr) {
        const employeeData = JSON.parse(employeeDataStr);
        if (employeeData.giveAdminAccess === true) return true;
      }
    } catch (e) { }
  }

  return false;
};

/**
 * Fetch all current reminder IDs from backend
 */
const fetchAllReminderIds = async (headers) => {
  const allItems = [];

  // 1. Try /admin/reminders/due-all
  // API returns GROUPED data: { data: [{ employee: {...}, reminders: [...] }] }
  try {
    const response = await fetch(`${CRM_BASE_URL}/admin/reminders/due-all`, {
      method: 'GET',
      headers,
    });

    if (response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          // Data is GROUPED by employee: [{ employee: {...}, reminders: [...] }]
          data.data.forEach(group => {
            const empName = group.employee?.name || 'Employee';
            const reminders = group.reminders || [];

            reminders.forEach(r => {
              if (r._id) {
                allItems.push({
                  id: r._id,
                  type: 'reminder',
                  employeeId: r.employeeId?._id || r.employeeId || r.createdById,
                  employeeName: r.employeeId?.name || empName,
                  title: r.title || 'Reminder',
                  clientName: r.clientName || 'Client',
                  note: r.comment || r.note || '',
                  createdAt: r.createdAt,
                });
              }
            });
          });

          // Also handle flat array format (in case API returns flat)
          if (data.data.length > 0 && data.data[0]._id && !data.data[0].reminders) {
            data.data.forEach(r => {
              if (r._id && !allItems.find(item => item.id === r._id)) {
                allItems.push({
                  id: r._id,
                  type: 'reminder',
                  employeeName: r.employeeId?.name || r.createdByName || 'Employee',
                  title: r.title || r.note || r.comment || 'Reminder',
                  clientName: r.clientName || 'Client',
                  createdAt: r.createdAt,
                });
              }
            });
          }
        }
      }
    }
  } catch (err) {
    console.log('⚠️ Poll: /admin/reminders/due-all failed:', err.message);
  }

  // 2. Try /employee/reminders (may return 401 for admin token - that's OK)
  try {
    const response = await fetch(`${CRM_BASE_URL}/employee/reminders`, {
      method: 'GET',
      headers,
    });

    if (response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          // Handle grouped format: [{ employee: {...}, reminders: [...] }]
          data.data.forEach(group => {
            if (group.reminders && Array.isArray(group.reminders)) {
              const empName = group.employee?.name || 'Employee';
              group.reminders.forEach(r => {
                if (r._id && !allItems.find(item => item.id === r._id)) {
                  allItems.push({
                    id: r._id,
                    type: 'reminder',
                    employeeId: r.employeeId?._id || r.employeeId || r.createdById,
                    employeeName: r.employeeId?.name || empName,
                    title: r.title || r.note || r.comment || 'Reminder',
                    clientName: r.clientName || 'Client',
                    createdAt: r.createdAt,
                  });
                }
              });
            } else if (group._id) {
              // Handle flat format
              if (!allItems.find(item => item.id === group._id)) {
                allItems.push({
                  id: group._id,
                  type: 'reminder',
                  employeeId: group.employeeId?._id || group.employeeId || group.createdById,
                  employeeName: group.employeeId?.name || group.createdByName || 'Employee',
                  title: group.title || group.note || group.comment || 'Reminder',
                  clientName: group.clientName || 'Client',
                  createdAt: group.createdAt,
                });
              }
            }
          });
        }
      }
    }
  } catch (err) {
    // Silently fail - admin token may not have access
  }

  // NOTE: /api/alerts endpoint is intentionally NOT polled here.
  // Alerts come via FCM push notifications directly. Polling /api/alerts causes
  // admin's own created alerts to boomerang back as "Employee Alert" popups.

  return allItems;
};

/**
 * Core polling function - checks for new notifications
 */
const checkForNewNotifications = async () => {
  try {
    // Only check if admin is logged in
    const adminLoggedIn = await isAdminLoggedIn();
    if (!adminLoggedIn) {
      console.log('⏭️ Not admin, skipping notification poll');
      return;
    }

    const headers = await getAdminHeaders();
    if (!headers) {
      console.log('⏭️ No admin token, skipping poll');
      return;
    }

    // Get known IDs from storage
    const knownIdsStr = await AsyncStorage.getItem(KNOWN_IDS_KEY);
    const knownIds = knownIdsStr ? JSON.parse(knownIdsStr) : [];

    // Check if this is first run
    const isInitialized = await AsyncStorage.getItem(FIRST_RUN_KEY);

    // Fetch all current items
    const allItems = await fetchAllReminderIds(headers);
    const currentIds = allItems.map(item => item.id);

    console.log(`🔔 Admin Poll: Fetched ${allItems.length} total items (reminders+alerts), known: ${knownIds.length}`);

    if (!isInitialized) {
      // FIRST RUN: Just record all existing IDs, don't show popups
      // This prevents showing 50 old reminders as popup when admin first opens the app
      console.log(`🔔 Admin Poll: First run - recording ${currentIds.length} existing items as baseline`);
      await AsyncStorage.setItem(KNOWN_IDS_KEY, JSON.stringify(currentIds));
      await AsyncStorage.setItem(FIRST_RUN_KEY, 'true');
      return;
    }

    // Find truly NEW items
    // 🔥 Check ALL possible AsyncStorage keys to reliably get the current user's ID
    const currentUserIdStr =
      await AsyncStorage.getItem('adminId') ||
      await AsyncStorage.getItem('userId') ||
      await AsyncStorage.getItem('employeeId') ||
      await (async () => {
        try {
          const adminUser = await AsyncStorage.getItem('admin_user');
          if (adminUser) return JSON.parse(adminUser)?._id || null;
        } catch (e) { }
        return null;
      })();

    console.log(`🔍 Admin Poll: Current user ID for self-filter: ${currentUserIdStr}`);

    const newItems = allItems.filter(item => {
      // 2. 🚫 Filter out truly known IDs
      if (knownIds.includes(item.id)) return false;

      // 3. 🔥 CRITICAL FIX: If employeeId matches current user → it's admin's OWN item → skip
      if (currentUserIdStr && item.employeeId &&
        String(item.employeeId) === String(currentUserIdStr)) {
        console.log(`⏭️ Admin Poll: Skipping OWN ${item.type} (by ID match) for: ${item.id}`);
        return false;
      }

      // 4. 🔥 NEW: If alert has NO employeeId at all → admin created it for themselves → skip
      // Real employee-created alerts always have an employeeId populated by backend
      if (item.type === 'alert' && !item.employeeId) {
        console.log(`⏭️ Admin Poll: Skipping self-alert (no employeeId) for: ${item.id}`);
        return false;
      }

      // 5. 🔥 NEW: If employeeName is the default fallback "Employee" → couldn't identify owner
      // This usually means it's the admin's own item with no proper name → skip
      if (item.employeeName === 'Employee' && !item.employeeId) {
        console.log(`⏭️ Admin Poll: Skipping unidentified owner item for: ${item.id}`);
        return false;
      }

      return true;
    });

    if (newItems.length > 0) {
      console.log(`🔔 Admin Poll: Found ${newItems.length} NEW notifications!`);

      // Show popups (max 3 to avoid overwhelming)
      const toShow = newItems.slice(0, 3);

      for (const notif of toShow) {
        console.log(`🔔 Showing popup: ${notif.type} - ${notif.title} from ${notif.employeeName}`);
        showEmployeeNotificationPopup({
          id: notif.id, // 🔥 IMPORTANT: This ID is used for de-duplication!
          type: notif.type,
          employeeName: notif.employeeName,
          title: notif.title,
          clientName: notif.clientName,
          reason: notif.reason,
          note: notif.note || '',
        });

        // Small delay between multiple popups
        if (toShow.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    } else {
      console.log(`🔔 Admin Poll: No new notifications (tracking ${currentIds.length} items)`);
    }

    // Update known IDs (keep max 500 to prevent memory issues)
    const updatedIds = [...new Set([...knownIds, ...currentIds])].slice(-500);
    await AsyncStorage.setItem(KNOWN_IDS_KEY, JSON.stringify(updatedIds));

  } catch (error) {
    console.warn('⚠️ Notification poll error:', error.message);
  }
};

/**
 * Start polling for new notifications
 * Call this when admin dashboard loads
 */
export const startAdminNotificationPolling = () => {
  if (isPolling) {
    console.log('ℹ️ Admin notification polling already running');
    return;
  }

  console.log('🔔 Starting admin notification polling (every 30s)...');
  isPolling = true;

  // Check immediately on start
  checkForNewNotifications();

  // Then check every POLL_INTERVAL
  pollingTimer = setInterval(checkForNewNotifications, POLL_INTERVAL);
};

/**
 * Stop polling
 * Call this when admin logs out or navigates away
 */
export const stopAdminNotificationPolling = () => {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
  isPolling = false;
  console.log('🔕 Stopped admin notification polling');
};

/**
 * Reset polling state - call after admin login
 * This ensures a fresh baseline is set on next poll
 */
export const resetAdminNotificationState = async () => {
  await AsyncStorage.removeItem(KNOWN_IDS_KEY);
  await AsyncStorage.removeItem(FIRST_RUN_KEY);
  console.log('🔄 Reset admin notification polling state');
};

export default {
  startAdminNotificationPolling,
  stopAdminNotificationPolling,
  resetAdminNotificationState,
};
