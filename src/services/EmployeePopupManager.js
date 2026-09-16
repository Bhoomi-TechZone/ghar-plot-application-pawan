/**
 * Global Employee Popup Manager
 * Shows beautiful popups from anywhere in the app
 */

let showPopupCallback = null;
const recentlyShown = new Set();

export const setShowPopupCallback = (callback) => {
  showPopupCallback = callback;
};

export const showEmployeeNotificationPopup = (data) => {
  if (showPopupCallback) {
    // 🔥 NEW: Extract a unique ID for the notification to be 100% sure we don't duplicate
    const notificationId = data.id || data._id || data.reminderId || data.alertId ||
      `${data.type || 'msg'}_${data.title || 'alert'}_${data.note || 'note'}`.replace(/\s/g, '');

    if (recentlyShown.has(notificationId)) {
      console.log('⏭️ Duplicate popup suppressed (by ID/Key):', notificationId);
      return;
    }

    // Mark as shown and set expiry
    recentlyShown.add(notificationId);
    setTimeout(() => recentlyShown.delete(notificationId), 30000); // 30 second dedup window

    console.log('🔔 Triggering popup callback for:', data.title);
    showPopupCallback(data);
  } else {
    console.warn('⚠️ Employee popup callback not set');
  }
};

export default {
  setShowPopupCallback,
  showEmployeeNotificationPopup,
};
