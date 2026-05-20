import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

// Simple test component for web
const WebTestApp = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🌐 Gharplot Web Test</Text>
      <Text style={styles.subtitle}>Running on: {Platform.OS}</Text>
      <Text style={styles.info}>
        {Platform.OS === 'web' 
          ? '✅ Web platform detected successfully!' 
          : '📱 Mobile platform detected'
        }
      </Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🏠 Property Management</Text>
        <Text style={styles.cardText}>
          Your React Native app is now running on the web!
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#6c757d',
    marginBottom: 20,
  },
  info: {
    fontSize: 16,
    color: '#28a745',
    marginBottom: 30,
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxWidth: 400,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#343a40',
    marginBottom: 10,
  },
  cardText: {
    fontSize: 16,
    color: '#6c757d',
    lineHeight: 24,
  },
});

export default WebTestApp;