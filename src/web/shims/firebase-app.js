/**
 * Web shim for @react-native-firebase/app
 * Provides a no-op Firebase app instance so imports don't crash on web.
 */

const app = {
  name: '[DEFAULT]',
  options: {},
  app: () => app,
  apps: [],
  initializeApp: () => app,
  getApp: () => app,
};

export default app;
