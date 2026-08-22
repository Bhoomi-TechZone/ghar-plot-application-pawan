import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, Platform, StatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from "react-native-vector-icons/Ionicons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import CrossPlatformAlert from '../utils/crossPlatformAlert';

const SETTINGS_KEYS = {
  push: 'notifications_push',
  email: 'notifications_email',
  sms: 'notifications_sms',
};

const NotificationsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const statusBarTop = insets.top > 0 ? insets.top : (Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const p = await AsyncStorage.getItem(SETTINGS_KEYS.push);
        const e = await AsyncStorage.getItem(SETTINGS_KEYS.email);
        const s = await AsyncStorage.getItem(SETTINGS_KEYS.sms);
        if (p !== null) setPushEnabled(p === '1');
        if (e !== null) setEmailEnabled(e === '1');
        if (s !== null) setSmsEnabled(s === '1');
      } catch (err) {
        // ignore
      }
    })();
  }, []);

  const persist = async (key, value) => {
    try {
      await AsyncStorage.setItem(key, value ? '1' : '0');
    } catch (err) {
      // ignore
    }
  };

  const togglePush = (val) => {
    setPushEnabled(val);
    persist(SETTINGS_KEYS.push, val);
  };
  const toggleEmail = (val) => {
    setEmailEnabled(val);
    persist(SETTINGS_KEYS.email, val);
  };
  const toggleSms = (val) => {
    setSmsEnabled(val);
    persist(SETTINGS_KEYS.sms, val);
  };

  const resetAll = () => {
    CrossPlatformAlert.alert('Reset notifications', 'Reset notification preferences to defaults?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: async () => {
        setPushEnabled(true);
        setEmailEnabled(true);
        setSmsEnabled(false);
        await persist(SETTINGS_KEYS.push, true);
        await persist(SETTINGS_KEYS.email, true);
        await persist(SETTINGS_KEYS.sms, false);
      } }
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: statusBarTop }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
          <Icon name="arrow-back" size={24} color="#FF7A00" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.row}>
          <View>
            <Text style={styles.rowTitle}>Push Notifications</Text>
            <Text style={styles.rowSubtitle}>Receive app alerts for messages and enquiries</Text>
          </View>
          <Switch value={pushEnabled} onValueChange={togglePush} thumbColor={pushEnabled ? '#FF7A00' : undefined} />
        </View>

        <View style={styles.row}>
          <View>
            <Text style={styles.rowTitle}>Email Notifications</Text>
            <Text style={styles.rowSubtitle}>Weekly summaries and important updates</Text>
          </View>
          <Switch value={emailEnabled} onValueChange={toggleEmail} thumbColor={emailEnabled ? '#FF7A00' : undefined} />
        </View>

        <View style={styles.row}>
          <View>
            <Text style={styles.rowTitle}>SMS Notifications</Text>
            <Text style={styles.rowSubtitle}>Time-critical alerts via SMS</Text>
          </View>
          <Switch value={smsEnabled} onValueChange={toggleSms} thumbColor={smsEnabled ? '#FF7A00' : undefined} />
        </View>

        <TouchableOpacity style={styles.resetButton} onPress={resetAll} activeOpacity={0.8}>
          <Text style={styles.resetButtonText}>Reset to defaults</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7F9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  content: {
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  rowSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  resetButton: {
    marginTop: 20,
    backgroundColor: '#FF7A00',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
});

export default NotificationsScreen;
