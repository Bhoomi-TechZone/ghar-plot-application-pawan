/**
 * Web shim for @react-native-firebase/messaging
 * FCM is not available on web via the native SDK.
 * Returns no-op functions so the app compiles and runs without errors.
 */

const messaging = () => ({
  getToken: async () => null,
  deleteToken: async () => {},
  onMessage: () => () => {},
  onNotificationOpenedApp: () => () => {},
  getInitialNotification: async () => null,
  setBackgroundMessageHandler: () => {},
  onTokenRefresh: () => () => {},
  requestPermission: async () => 1, // 1 = AUTHORIZED
  hasPermission: async () => 1,
  subscribeToTopic: async () => {},
  unsubscribeFromTopic: async () => {},
  isDeviceRegisteredForRemoteMessages: false,
  registerDeviceForRemoteMessages: async () => {},
  unregisterDeviceForRemoteMessages: async () => {},
  setAutoInitEnabled: async () => {},
  isAutoInitEnabled: false,
});

messaging.AuthorizationStatus = {
  NOT_DETERMINED: -1,
  DENIED: 0,
  AUTHORIZED: 1,
  PROVISIONAL: 2,
};

export default messaging;
