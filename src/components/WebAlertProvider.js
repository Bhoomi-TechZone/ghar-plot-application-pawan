import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
  Dimensions,
} from 'react-native';
import { registerWebAlertHandler, unregisterWebAlertHandler } from '../utils/crossPlatformAlert';

/**
 * WebAlertProvider - Renders a custom modal dialog for Alert.alert on web.
 * Wrap your app root with this component.
 * On non-web platforms, it simply renders children with no overhead.
 */
const WebAlertProvider = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [alertData, setAlertData] = useState({
    title: '',
    message: '',
    buttons: [],
  });

  const handleAlert = useCallback((title, message, buttons, options) => {
    const defaultButtons = buttons && buttons.length > 0
      ? buttons
      : [{ text: 'OK', onPress: () => {} }];

    setAlertData({ title: title || '', message: message || '', buttons: defaultButtons });
    setVisible(true);
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      registerWebAlertHandler(handleAlert);
      return () => unregisterWebAlertHandler();
    }
  }, [handleAlert]);

  const handleButtonPress = useCallback((button) => {
    setVisible(false);
    // Delay callback to allow modal to close
    setTimeout(() => {
      button?.onPress?.();
    }, 100);
  }, []);

  const handleOverlayPress = useCallback(() => {
    // Find cancel button or dismiss
    const cancelBtn = alertData.buttons.find(b => b.style === 'cancel');
    if (cancelBtn) {
      handleButtonPress(cancelBtn);
    } else {
      setVisible(false);
    }
  }, [alertData.buttons, handleButtonPress]);

  // On non-web platforms, just render children
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <Modal
        transparent
        visible={visible}
        animationType="fade"
        onRequestClose={() => handleOverlayPress()}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={handleOverlayPress}
        >
          <TouchableOpacity
            style={styles.dialogContainer}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation?.()}
          >
            {alertData.title ? (
              <Text style={styles.title}>{alertData.title}</Text>
            ) : null}
            {alertData.message ? (
              <Text style={styles.message}>{alertData.message}</Text>
            ) : null}
            <View style={styles.buttonRow}>
              {alertData.buttons.map((button, index) => {
                const isCancel = button.style === 'cancel';
                const isDestructive = button.style === 'destructive';
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.button,
                      alertData.buttons.length === 1 && styles.singleButton,
                      isCancel && styles.cancelButton,
                      isDestructive && styles.destructiveButton,
                    ]}
                    onPress={() => handleButtonPress(button)}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        isCancel && styles.cancelButtonText,
                        isDestructive && styles.destructiveButtonText,
                      ]}
                    >
                      {button.text || 'OK'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 10,
    minWidth: 280,
    maxWidth: 400,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E1E1E',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    color: '#555555',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 10,
    gap: 10,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#1E90FF',
    minWidth: 80,
    alignItems: 'center',
  },
  singleButton: {
    flex: 1,
  },
  cancelButton: {
    backgroundColor: '#E9ECEF',
  },
  destructiveButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButtonText: {
    color: '#333333',
  },
  destructiveButtonText: {
    color: '#FFFFFF',
  },
});

export default WebAlertProvider;
