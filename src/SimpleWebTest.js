import React from 'react';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';

const SimpleWebTest = () => {
  const handlePress = () => {
    alert('Button clicked! Web app is working!');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🏠 Gharplot Web</Text>
        <Text style={styles.subtitle}>Property Management App</Text>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.platform}>Platform: {Platform.OS}</Text>
        <Text style={styles.info}>✅ React Native Web is working!</Text>
        
        <Pressable style={styles.button} onPress={handlePress}>
          <Text style={styles.buttonText}>Test Button</Text>
        </Pressable>
        
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🎉 Success!</Text>
          <Text style={styles.cardContent}>
            Your React Native app is now running on the web. 
            This means the basic setup is working correctly.
          </Text>
        </View>
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Next: Navigate to your app screens
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#007bff',
    padding: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#e3f2fd',
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platform: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 20,
  },
  info: {
    fontSize: 18,
    color: '#28a745',
    marginBottom: 30,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007bff',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    marginBottom: 30,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    maxWidth: 400,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#343a40',
    marginBottom: 10,
  },
  cardContent: {
    fontSize: 16,
    color: '#6c757d',
    lineHeight: 24,
  },
  footer: {
    backgroundColor: '#343a40',
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    color: 'white',
    fontSize: 14,
  },
});

export default SimpleWebTest;