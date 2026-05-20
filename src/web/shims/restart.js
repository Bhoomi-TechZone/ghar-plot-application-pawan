/**
 * Web shim for react-native-restart
 * Reloads the browser page, mimicking a native app restart.
 */

const RNRestart = {
  restart: () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  },
  Restart: () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  },
};

export default RNRestart;
