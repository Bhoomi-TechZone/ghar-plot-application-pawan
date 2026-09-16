import { Alert, Platform } from 'react-native';

// Global reference for the web alert dialog handler
let _webAlertHandler = null;

/**
 * Register a web alert handler (called from WebAlertProvider)
 */
export const registerWebAlertHandler = (handler) => {
  _webAlertHandler = handler;
};

/**
 * Unregister the web alert handler
 */
export const unregisterWebAlertHandler = () => {
  _webAlertHandler = null;
};

/**
 * Cross-platform alert that works on both mobile and web.
 * On mobile (Android/iOS): uses native Alert.alert
 * On web: uses a custom modal dialog via WebAlertProvider
 *
 * API is identical to React Native's Alert.alert(title, message, buttons, options)
 */
const CrossPlatformAlert = {
  alert: (title, message, buttons, options) => {
    if (Platform.OS !== 'web') {
      // Use native Alert on mobile - no changes to Android/iOS behavior
      Alert.alert(title, message, buttons, options);
      return;
    }

    // Web platform: use custom dialog handler if available, fallback to window.alert
    if (_webAlertHandler) {
      _webAlertHandler(title, message, buttons, options);
    } else {
      // Fallback: use window.alert/confirm if provider not mounted
      if (buttons && buttons.length > 1) {
        const confirmed = window.confirm(`${title}\n\n${message || ''}`);
        if (confirmed) {
          // Press the last button (usually OK/confirm)
          const confirmBtn = buttons.find(b => b.style !== 'cancel') || buttons[buttons.length - 1];
          confirmBtn?.onPress?.();
        } else {
          // Press the cancel button
          const cancelBtn = buttons.find(b => b.style === 'cancel') || buttons[0];
          cancelBtn?.onPress?.();
        }
      } else {
        window.alert(`${title}\n\n${message || ''}`);
        if (buttons && buttons[0]?.onPress) {
          buttons[0].onPress();
        }
      }
    }
  },
};

export default CrossPlatformAlert;
