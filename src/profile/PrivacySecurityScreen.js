/**
 * PrivacySecurityScreen.js
 * Comprehensive Privacy & Security settings with modern UI
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import FeatherIcon from 'react-native-vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CrossPlatformAlert from '../utils/crossPlatformAlert';

// Enhanced Color Scheme
const COLORS = {
  primary: '#1E90FF',
  primaryDark: '#0B5ED7',
  background: '#F9FAFB',
  white: '#FFFFFF',
  black: '#1F2937',
  greyText: '#6B7280',
  greyLight: '#E5E7EB',
  redAccent: '#EF4444',
  greenAccent: '#10B981',
  orangeAccent: '#F59E0B',
  blueLight: '#EFF6FF',
  redLight: '#FEF2F2',
  greenLight: '#F0FDF4',
};

const KEYS = {
  twoFactor: 'privacy_two_factor',
  dataSharing: 'privacy_data_sharing',
  profileVisibility: 'privacy_profile_visibility',
  activityStatus: 'privacy_activity_status',
  locationSharing: 'privacy_location_sharing',
  analyticsTracking: 'privacy_analytics_tracking',
  marketingEmails: 'privacy_marketing_emails',
  pushNotifications: 'privacy_push_notifications',
};

const PrivacySecurityScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const statusBarTop = insets.top > 0 ? insets.top : (Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0);

  // Security States
  const [twoFA, setTwoFA] = useState(false);
  const [dataSharing, setDataSharing] = useState(true);
  
  // Privacy States
  const [profileVisibility, setProfileVisibility] = useState(true);
  const [activityStatus, setActivityStatus] = useState(true);
  const [locationSharing, setLocationSharing] = useState(true);
  const [analyticsTracking, setAnalyticsTracking] = useState(true);
  
  // Communication States
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await AsyncStorage.multiGet([
        KEYS.twoFactor,
        KEYS.dataSharing,
        KEYS.profileVisibility,
        KEYS.activityStatus,
        KEYS.locationSharing,
        KEYS.analyticsTracking,
        KEYS.marketingEmails,
        KEYS.pushNotifications,
      ]);

      settings.forEach(([key, value]) => {
        if (value !== null) {
          const boolValue = value === '1';
          switch (key) {
            case KEYS.twoFactor:
              setTwoFA(boolValue);
              break;
            case KEYS.dataSharing:
              setDataSharing(boolValue);
              break;
            case KEYS.profileVisibility:
              setProfileVisibility(boolValue);
              break;
            case KEYS.activityStatus:
              setActivityStatus(boolValue);
              break;
            case KEYS.locationSharing:
              setLocationSharing(boolValue);
              break;
            case KEYS.analyticsTracking:
              setAnalyticsTracking(boolValue);
              break;
            case KEYS.marketingEmails:
              setMarketingEmails(boolValue);
              break;
            case KEYS.pushNotifications:
              setPushNotifications(boolValue);
              break;
          }
        }
      });
    } catch (e) {
      console.error('Error loading privacy settings:', e);
    }
  };

  const persist = async (key, value) => {
    try {
      await AsyncStorage.setItem(key, value ? '1' : '0');
    } catch (e) {
      console.error('Error saving setting:', e);
    }
  };

  const toggleTwoFA = (v) => {
    setTwoFA(v);
    persist(KEYS.twoFactor, v);
    if (v) {
      CrossPlatformAlert.alert(
        'Two-Factor Authentication',
        'You will receive a code via SMS/Email when logging in from a new device.',
        [{ text: 'OK' }]
      );
    }
  };

  const toggleDataSharing = (v) => {
    setDataSharing(v);
    persist(KEYS.dataSharing, v);
  };

  const toggleProfileVisibility = (v) => {
    setProfileVisibility(v);
    persist(KEYS.profileVisibility, v);
  };

  const toggleActivityStatus = (v) => {
    setActivityStatus(v);
    persist(KEYS.activityStatus, v);
  };

  const toggleLocationSharing = (v) => {
    setLocationSharing(v);
    persist(KEYS.locationSharing, v);
  };

  const toggleAnalyticsTracking = (v) => {
    setAnalyticsTracking(v);
    persist(KEYS.analyticsTracking, v);
  };

  const toggleMarketingEmails = (v) => {
    setMarketingEmails(v);
    persist(KEYS.marketingEmails, v);
  };

  const togglePushNotifications = (v) => {
    setPushNotifications(v);
    persist(KEYS.pushNotifications, v);
  };

  const handleDownloadData = () => {
    CrossPlatformAlert.alert(
      'Download Your Data',
      'We will prepare a complete export of your data and email it to you within 24-48 hours. This includes your profile information, property listings, and activity history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Export',
          onPress: () => {
            CrossPlatformAlert.alert('Request Submitted', 'You will receive an email when your data is ready.');
          },
        },
      ]
    );
  };

  const confirmDelete = () => {
    CrossPlatformAlert.alert(
      'Delete Account',
      'This action is permanent and cannot be undone. All your data, listings, and messages will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            CrossPlatformAlert.alert(
              'Final Confirmation',
              'Are you absolutely sure? Type DELETE to confirm.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete Forever',
                  style: 'destructive',
                  onPress: () => {
                    // TODO: Implement backend delete endpoint
                    CrossPlatformAlert.alert('Account Deletion', 'Your account deletion request has been submitted. You will receive a confirmation email shortly.');
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleBlockedAccounts = () => {
    CrossPlatformAlert.alert('Blocked Accounts', 'This feature allows you to view and manage blocked users.');
  };

  const handleLoginActivity = () => {
    CrossPlatformAlert.alert('Login Activity', 'View recent login attempts and active sessions on your account.');
  };

  const handleConnectedDevices = () => {
    CrossPlatformAlert.alert('Connected Devices', 'Manage devices that have access to your account.');
  };

  const SectionHeader = ({ title, icon }) => (
    <View style={styles.sectionHeader}>
      <Icon name={icon} size={20} color={COLORS.primary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  const ToggleItem = ({ title, subtitle, value, onToggle, iconName, iconColor }) => (
    <View style={styles.toggleItem}>
      <View style={styles.toggleIconContainer}>
        <Icon name={iconName} size={20} color={iconColor || COLORS.primary} />
      </View>
      <View style={styles.toggleContent}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: COLORS.greyLight, true: COLORS.primary + '40' }}
        thumbColor={value ? COLORS.primary : '#f4f3f4'}
        ios_backgroundColor={COLORS.greyLight}
      />
    </View>
  );

  const NavigationItem = ({ title, subtitle, onPress, iconName, iconColor }) => (
    <TouchableOpacity style={styles.navigationItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.toggleIconContainer}>
        <Icon name={iconName} size={20} color={iconColor || COLORS.primary} />
      </View>
      <View style={styles.toggleContent}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleSubtitle}>{subtitle}</Text>
      </View>
      <Icon name="chevron-forward" size={20} color={COLORS.greyText} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: statusBarTop }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
          <Icon name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy & Security</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Security Section */}
        <SectionHeader title="Security" icon="shield-checkmark" />
        <View style={styles.card}>
          <ToggleItem
            title="Two-Factor Authentication"
            subtitle="Extra security for your account"
            value={twoFA}
            onToggle={toggleTwoFA}
            iconName="lock-closed"
            iconColor={COLORS.greenAccent}
          />
          <View style={styles.divider} />
          <NavigationItem
            title="Login Activity"
            subtitle="View recent login sessions"
            onPress={handleLoginActivity}
            iconName="time-outline"
            iconColor={COLORS.orangeAccent}
          />
          <View style={styles.divider} />
          <NavigationItem
            title="Connected Devices"
            subtitle="Manage active sessions"
            onPress={handleConnectedDevices}
            iconName="phone-portrait-outline"
            iconColor={COLORS.primary}
          />
        </View>

        {/* Privacy Section */}
        <SectionHeader title="Privacy Controls" icon="eye-off" />
        <View style={styles.card}>
          <ToggleItem
            title="Profile Visibility"
            subtitle="Make your profile visible to others"
            value={profileVisibility}
            onToggle={toggleProfileVisibility}
            iconName="person-circle-outline"
            iconColor={COLORS.primary}
          />
          <View style={styles.divider} />
          <ToggleItem
            title="Activity Status"
            subtitle="Show when you're active"
            value={activityStatus}
            onToggle={toggleActivityStatus}
            iconName="pulse-outline"
            iconColor={COLORS.greenAccent}
          />
          <View style={styles.divider} />
          <ToggleItem
            title="Location Sharing"
            subtitle="Share your location for property searches"
            value={locationSharing}
            onToggle={toggleLocationSharing}
            iconName="location-outline"
            iconColor={COLORS.redAccent}
          />
          <View style={styles.divider} />
          <NavigationItem
            title="Blocked Accounts"
            subtitle="Manage blocked users"
            onPress={handleBlockedAccounts}
            iconName="ban-outline"
            iconColor={COLORS.redAccent}
          />
        </View>

        {/* Data & Permissions Section */}
        <SectionHeader title="Data & Permissions" icon="document-text" />
        <View style={styles.card}>
          <ToggleItem
            title="Analytics & Tracking"
            subtitle="Help us improve with usage data"
            value={analyticsTracking}
            onToggle={toggleAnalyticsTracking}
            iconName="analytics-outline"
            iconColor={COLORS.primary}
          />
          <View style={styles.divider} />
          <ToggleItem
            title="Data Sharing"
            subtitle="Share anonymized data with partners"
            value={dataSharing}
            onToggle={toggleDataSharing}
            iconName="share-social-outline"
            iconColor={COLORS.orangeAccent}
          />
        </View>

        {/* Communication Preferences */}
        <SectionHeader title="Communication" icon="mail" />
        <View style={styles.card}>
          <ToggleItem
            title="Push Notifications"
            subtitle="Receive app notifications"
            value={pushNotifications}
            onToggle={togglePushNotifications}
            iconName="notifications-outline"
            iconColor={COLORS.primary}
          />
          <View style={styles.divider} />
          <ToggleItem
            title="Marketing Emails"
            subtitle="Receive promotional offers"
            value={marketingEmails}
            onToggle={toggleMarketingEmails}
            iconName="mail-outline"
            iconColor={COLORS.orangeAccent}
          />
        </View>

        {/* Data Management */}
        <SectionHeader title="Data Management" icon="archive" />
        <TouchableOpacity style={styles.actionButton} onPress={handleDownloadData} activeOpacity={0.8}>
          <View style={styles.actionButtonContent}>
            <Icon name="download-outline" size={20} color={COLORS.primary} />
            <Text style={[styles.actionButtonText, { color: COLORS.primary }]}>Download My Data</Text>
          </View>
          <Text style={styles.actionButtonSubtitle}>Export all your data</Text>
        </TouchableOpacity>

        {/* Danger Zone */}
        <SectionHeader title="Danger Zone" icon="warning" />
        <TouchableOpacity style={styles.dangerButton} onPress={confirmDelete} activeOpacity={0.8}>
          <View style={styles.actionButtonContent}>
            <Icon name="trash-outline" size={20} color={COLORS.redAccent} />
            <Text style={[styles.actionButtonText, { color: COLORS.redAccent }]}>Delete My Account</Text>
          </View>
          <Text style={[styles.actionButtonSubtitle, { color: COLORS.redAccent }]}>
            Permanently delete your account and data
          </Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.greyLight,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.black,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.black,
    marginLeft: 8,
  },

  // Card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },

  // Toggle Item
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  toggleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.blueLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  toggleContent: {
    flex: 1,
    marginRight: 12,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 2,
  },
  toggleSubtitle: {
    fontSize: 13,
    color: COLORS.greyText,
    lineHeight: 18,
  },

  // Navigation Item
  navigationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: COLORS.greyLight,
    marginLeft: 52,
  },

  // Action Buttons
  actionButton: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.greyLight,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  dangerButton: {
    backgroundColor: COLORS.redLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  actionButtonSubtitle: {
    fontSize: 13,
    color: COLORS.greyText,
    marginLeft: 28,
  },
});

export default PrivacySecurityScreen;
