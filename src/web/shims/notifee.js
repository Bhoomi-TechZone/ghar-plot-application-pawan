/**
 * Web shim for @notifee/react-native
 * Provides no-op implementations so Android notification code compiles on web.
 * Web notifications are handled via the browser Notification API where possible.
 */

// Mirror the Android EventType constants
export const EventType = {
  DISMISSED: 0,
  PRESS: 1,
  ACTION_PRESS: 2,
  DELIVERED: 3,
  APP_BLOCKED: 4,
  CHANNEL_BLOCKED: 5,
  CHANNEL_GROUP_BLOCKED: 6,
  TRIGGER_NOTIFICATION_CREATED: 7,
  FG_ALREADY_EXIST: 8,
};

// Mirror Android AuthorizationStatus constants
export const AuthorizationStatus = {
  NOT_DETERMINED: -1,
  DENIED: 0,
  AUTHORIZED: 1,
  PROVISIONAL: 2,
};

// Mirror Android AndroidImportance constants
export const AndroidImportance = {
  DEFAULT: 3,
  HIGH: 4,
  LOW: 2,
  MIN: 1,
  NONE: 0,
};

// No-op notifee API surface used in the app
const notifee = {
  /** Request permission via browser Notification API */
  requestPermission: async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      return {
        authorizationStatus:
          permission === 'granted'
            ? AuthorizationStatus.AUTHORIZED
            : AuthorizationStatus.DENIED,
      };
    }
    return { authorizationStatus: AuthorizationStatus.DENIED };
  },

  createChannel: async () => 'web-channel',
  createChannelGroup: async () => {},
  deleteChannel: async () => {},
  getChannel: async () => null,
  getChannels: async () => [],

  displayNotification: async (notification) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(notification?.title || 'Gharplot', {
        body: notification?.body || '',
        icon: '/icon-192.png',
      });
    }
  },

  cancelNotification: async () => {},
  cancelAllNotifications: async () => {},

  onForegroundEvent: () => () => {},  // returns unsubscribe fn
  onBackgroundEvent: () => {},

  openNotificationSettings: async () => {},
  openAlarmPermissionSettings: async () => {},

  getNotificationSettings: async () => ({
    authorizationStatus: AuthorizationStatus.AUTHORIZED,
  }),

  setBadgeCount: async () => {},
  getBadgeCount: async () => 0,
  incrementBadgeCount: async () => {},
  decrementBadgeCount: async () => {},

  getTriggerNotifications: async () => [],
  createTriggerNotification: async () => {},
  cancelTriggerNotification: async () => {},
};

export default notifee;
