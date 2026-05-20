/**
 * Admin Popup Notification Settings Screen
 * Admin can enable/disable popup notifications for their own reminders
 * and globally enable popup notifications for all employee reminders
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CrossPlatformAlert from '../../../utils/crossPlatformAlert';

const API_BASE_URL = 'https://gharplotbackend.gntechnology.de';

const AdminPopupSettings = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [adminToken, setAdminToken] = useState('');
  const [settings, setSettings] = useState({
    adminOwnRemindersPopup: true,      // Admin's own reminders
    employeeRemindersPopup: true,       // All employee reminders
    dueRemindersPopup: true,            // Due reminders notifications
    overdueRemindersPopup: true,        // Overdue reminders alerts
  });

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('adminToken');
      if (!token) {
        CrossPlatformAlert.alert('Error', 'Admin authentication required');
        navigation.goBack();
        return;
      }

      setAdminToken(token);

      console.log('📡 Fetching admin popup settings from backend...');

      // Try to fetch from backend
      try {
        const response = await fetch(`${API_BASE_URL}/admin/popup-settings`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Backend settings:', data);

          if (data.success && data.settings) {
            setSettings(data.settings);
            // Also save to local storage for offline use
            await AsyncStorage.setItem('adminPopupSettings', JSON.stringify(data.settings));
            return;
          }
        }
      } catch (apiError) {
        console.log('⚠️ Backend fetch failed, using local storage:', apiError.message);
      }

      // Fallback to local storage
      const savedSettings = await AsyncStorage.getItem('adminPopupSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      CrossPlatformAlert.alert('Error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key, value) => {
    try {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);

      console.log(`🔄 Updating ${key} to ${value} on backend...`);

      // Save to backend
      try {
        const response = await fetch(`${API_BASE_URL}/admin/popup-settings`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            settings: newSettings,
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          console.log('✅ Backend updated successfully');
          // Save to local storage as backup
          await AsyncStorage.setItem('adminPopupSettings', JSON.stringify(newSettings));
        } else {
          console.log('⚠️ Backend update failed, saving locally only');
          await AsyncStorage.setItem('adminPopupSettings', JSON.stringify(newSettings));
        }
      } catch (apiError) {
        console.log('⚠️ Backend API error, saving locally:', apiError.message);
        await AsyncStorage.setItem('adminPopupSettings', JSON.stringify(newSettings));
      }
    } catch (error) {
      console.error('Error updating setting:', error);
      CrossPlatformAlert.alert('Error', 'Failed to update setting');
    }
  };

  const enableAllPopups = async () => {
    try {
      setLoading(true);

      const allEnabled = {
        adminOwnRemindersPopup: true,
        employeeRemindersPopup: true,
        dueRemindersPopup: true,
        overdueRemindersPopup: true,
      };

      const headers = {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      };

      console.log('🔄 Enabling all popups on backend...');

      // Save admin's own popup settings
      try {
        const adminResponse = await fetch(`${API_BASE_URL}/admin/popup-settings`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            settings: allEnabled,
          }),
        });

        if (adminResponse.ok) {
          console.log('✅ Admin settings enabled');
        }
      } catch (adminError) {
        console.log('⚠️ Admin settings save failed:', adminError.message);
      }

      // Enable all employee popups
      try {
        const employeeResponse = await fetch(`${API_BASE_URL}/admin/reminders/enable-all-popups`, {
          method: 'POST',
          headers,
        });

        const employeeData = await employeeResponse.json();

        if (employeeResponse.ok && employeeData.success) {
          console.log(`✅ Employee popups enabled for ${employeeData.updatedCount || 'all'} employees`);

          CrossPlatformAlert.alert(
            'Success',
            `All notifications enabled!\n• Admin settings: ✓\n• Employee popups: ${employeeData.updatedCount || 'all'} employees`
          );
        } else {
          throw new Error('Employee popup update failed');
        }
      } catch (employeeError) {
        console.log('⚠️ Employee popup enable failed:', employeeError.message);

        CrossPlatformAlert.alert(
          'Partial Success',
          'Your popup settings enabled successfully.\n\nNote: Employee popup update may require backend implementation.'
        );
      }

      // Update local state and storage
      setSettings(allEnabled);
      await AsyncStorage.setItem('adminPopupSettings', JSON.stringify(allEnabled));

    } catch (error) {
      console.error('Error enabling all popups:', error);
      CrossPlatformAlert.alert('Error', 'Failed to enable all notifications');
    } finally {
      setLoading(false);
    }
  };

  const renderSettingRow = (title, description, key, icon) => {
    const isEnabled = settings[key];

    return (
      <View style={styles.settingCard}>
        <View style={styles.settingLeft}>
          <View style={[styles.iconContainer, isEnabled && styles.iconContainerActive]}>
            <Icon
              name={icon}
              size={24}
              color={isEnabled ? '#10b981' : '#6b7280'}
            />
          </View>
          <View style={styles.settingText}>
            <Text style={styles.settingTitle}>{title}</Text>
            <Text style={styles.settingDescription}>{description}</Text>
          </View>
        </View>
        <Switch
          value={isEnabled}
          onValueChange={(value) => updateSetting(key, value)}
          thumbColor={isEnabled ? '#10b981' : '#f4f3f4'}
          trackColor={{ false: '#d1d5db', true: '#86efac' }}
        />
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#3b82f6" barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#3b82f6', '#1e40af']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Popup Notifications</Text>
          <Text style={styles.headerSubtitle}>
            Manage your notification preferences
          </Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Icon name="info-outline" size={20} color="#3b82f6" />
          <Text style={styles.infoText}>
            Your notification preferences are synced with the backend. Changes apply across all your devices.
          </Text>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NOTIFICATION PREFERENCES</Text>

          {renderSettingRow(
            'My Reminders',
            'Show popups for your own reminders',
            'adminOwnRemindersPopup',
            'notifications-active'
          )}

          {renderSettingRow(
            'Employee Reminders',
            'Show popups for all employee reminders',
            'employeeRemindersPopup',
            'people'
          )}

          {renderSettingRow(
            'Due Reminders',
            'Show popups for reminders that are due now',
            'dueRemindersPopup',
            'schedule'
          )}

          {renderSettingRow(
            'Overdue Alerts',
            'Show popups for overdue reminders',
            'overdueRemindersPopup',
            'warning'
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={enableAllPopups}
            disabled={loading}
          >
            <Icon name="check-circle" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>
              Enable All Notifications
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => navigation.navigate('ReminderControl')}
          >
            <Icon name="settings" size={20} color="#3b82f6" />
            <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
              Manage Employee Settings
            </Text>
          </TouchableOpacity>
        </View>

        {/* Status Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Current Status</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Icon
                name={settings.adminOwnRemindersPopup ? 'check-circle' : 'cancel'}
                size={20}
                color={settings.adminOwnRemindersPopup ? '#10b981' : '#ef4444'}
              />
              <Text style={styles.summaryText}>My Reminders</Text>
            </View>
            <View style={styles.summaryItem}>
              <Icon
                name={settings.employeeRemindersPopup ? 'check-circle' : 'cancel'}
                size={20}
                color={settings.employeeRemindersPopup ? '#10b981' : '#ef4444'}
              />
              <Text style={styles.summaryText}>Employee Reminders</Text>
            </View>
            <View style={styles.summaryItem}>
              <Icon
                name={settings.dueRemindersPopup ? 'check-circle' : 'cancel'}
                size={20}
                color={settings.dueRemindersPopup ? '#10b981' : '#ef4444'}
              />
              <Text style={styles.summaryText}>Due Reminders</Text>
            </View>
            <View style={styles.summaryItem}>
              <Icon
                name={settings.overdueRemindersPopup ? 'check-circle' : 'cancel'}
                size={20}
                color={settings.overdueRemindersPopup ? '#10b981' : '#ef4444'}
              />
              <Text style={styles.summaryText}>Overdue Alerts</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    elevation: 4,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#e0e7ff',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    marginLeft: 8,
    lineHeight: 18,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconContainerActive: {
    backgroundColor: '#d1fae5',
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#6b7280',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  secondaryButtonText: {
    color: '#3b82f6',
  },
  summaryCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 32,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  summaryItem: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 13,
    color: '#6b7280',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
});

export default AdminPopupSettings;

