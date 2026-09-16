/**
 * Web shim for react-native-push-notification
 * Uses the browser Notification API on web.
 */

const PushNotification = {
  configure: (options) => {
    if (options?.onRegister) options.onRegister({ token: 'web-token' });
  },

  localNotification: (notification) => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(notification?.title || 'Gharplot', {
          body: notification?.message || '',
          icon: '/icon-192.png',
        });
      }
    }
  },

  localNotificationSchedule: (notification) => {
    const delay = notification?.date
      ? new Date(notification.date) - Date.now()
      : 0;
    if (delay > 0) {
      setTimeout(() => PushNotification.localNotification(notification), delay);
    }
  },

  cancelLocalNotification: () => {},
  cancelAllLocalNotifications: () => {},
  getApplicationIconBadgeNumber: (callback) => callback(0),
  setApplicationIconBadgeNumber: () => {},
  requestPermissions: async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const p = await Notification.requestPermission();
      return { alert: p === 'granted', badge: false, sound: false };
    }
    return { alert: false, badge: false, sound: false };
  },
  abandonPermissions: () => {},
  checkPermissions: (callback) => {
    const granted =
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted';
    callback({ alert: granted, badge: false, sound: false });
  },
  createChannel: (channel, callback) => callback && callback(true),
  channelExists: (channelId, callback) => callback && callback(false),
  getChannels: (callback) => callback && callback([]),
  deleteChannel: () => {},
  removeAllDeliveredNotifications: () => {},
  getDeliveredNotifications: (callback) => callback([]),
  getScheduledLocalNotifications: (callback) => callback([]),
  setInstanceID: () => {},
  subscribeToTopic: () => {},
  unsubscribeFromTopic: () => {},
  invokeApp: () => {},
  onAction: () => {},
};

export default PushNotification;
