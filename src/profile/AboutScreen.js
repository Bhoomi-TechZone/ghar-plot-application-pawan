import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

let pkg = {};
try { pkg = require('../../package.json'); } catch (e) { pkg = {}; }

const AboutScreen = ({ navigation }) => {
  const appName = pkg.name || 'Gharplot';
  const version = pkg.version || '1.0.0';

  const openLink = (url) => {
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#FF7A00" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.appName}>{appName}</Text>
        <Text style={styles.version}>Version {version}</Text>

  <Text style={styles.description}>Gharplot helps buyers, sellers and renters manage property listings and enquiries in one place.</Text>

        <TouchableOpacity style={styles.link} onPress={() => openLink('https://example.com/terms') }>
          <Text style={styles.linkText}>Terms of Service</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.link} onPress={() => openLink('https://example.com/privacy') }>
          <Text style={styles.linkText}>Privacy Policy</Text>
        </TouchableOpacity>

  <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#FF7A00' }]} onPress={() => openLink('mailto:support@gharplot.example') }>
          <Text style={[styles.actionText, { color: '#fff' }]}>Contact Support</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backButton: { marginRight: 10 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  content: { padding: 16, alignItems: 'center' },
  appName: { fontSize: 22, fontWeight: '800', color: '#111827' },
  version: { fontSize: 14, color: '#6B7280', marginTop: 6 },
  description: { marginTop: 16, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  link: { marginTop: 16 },
  linkText: { color: '#FF7A00', fontWeight: '700' },
  actionButton: { marginTop: 24, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 },
  actionText: { fontWeight: '700' },
});

export default AboutScreen;
