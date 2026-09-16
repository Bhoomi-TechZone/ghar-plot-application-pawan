import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, FlatList, Alert, Platform, StatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from "react-native-vector-icons/Ionicons";
import CrossPlatformAlert from '../utils/crossPlatformAlert';

const FAQS = [
  { id: '1', q: 'How do I list a property?', a: 'Go to Add Property from the home screen and fill in the details. Include good photos and a clear description.' },
  { id: '2', q: 'How are leads delivered?', a: 'Leads are delivered via in-app messages and email. You can control delivery from Notifications settings.' },
  { id: '3', q: 'How do I contact support?', a: 'Use the Contact Support button below or email support@gharplot.example.' },
];

const HelpScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const statusBarTop = insets.top > 0 ? insets.top : (Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0);
  const [expanded, setExpanded] = useState(null);

  const toggle = (id) => setExpanded(prev => (prev === id ? null : id));

  const contactSupport = () => {
  const email = 'support@gharplot.example';
    const subject = encodeURIComponent('Support request');
    const body = encodeURIComponent('Describe your issue here...');
    const url = `mailto:${email}?subject=${subject}&body=${body}`;
    Linking.openURL(url).catch(() => {
  CrossPlatformAlert.alert('Unable to open mail client', 'Please email support@gharplot.example');
    });
  };

  const openChat = () => {
    // If your app has a chat screen, you can navigate to it. Fallback to contact support.
    if (navigation && navigation.navigate) {
      try {
        navigation.navigate('AppointmentChatScreen');
        return;
      } catch (e) {}
    }
    contactSupport();
  };

  return (
    <View style={[styles.container, { paddingTop: statusBarTop }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
          <Icon name="arrow-back" size={24} color="#FF7A00" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
      </View>

      <FlatList
        data={FAQS}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity activeOpacity={0.8} style={styles.faqItem} onPress={() => toggle(item.id)}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="help-circle" size={20} color="#FF7A00" style={{ marginRight: 10 }} />
              <Text style={styles.faqQuestion}>{item.q}</Text>
            </View>
            {expanded === item.id && <Text style={styles.faqAnswer}>{item.a}</Text>}
          </TouchableOpacity>
        )}
      />

      <View style={styles.actions}>
        <TouchableOpacity style={styles.contactButton} onPress={openChat} activeOpacity={0.8}>
          <Text style={styles.contactText}>Chat with Support</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.contactButton, styles.secondary]} onPress={contactSupport} activeOpacity={0.8}>
          <Text style={[styles.contactText, { color: '#111827' }]}>Email Support</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
  list: {
    padding: 16,
  },
  faqItem: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  faqAnswer: {
    marginTop: 8,
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    padding: 16,
    paddingBottom: 30,
  },
  contactButton: {
    backgroundColor: '#FF7A00',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  contactText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  secondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
});

export default HelpScreen;
