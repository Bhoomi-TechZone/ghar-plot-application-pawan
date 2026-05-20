/**
 * Test Screen for Login Persistence Testing
 * This screen can be used to test login states manually
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { isUserLoggedIn, clearUserCredentials, storeUserCredentials, getStoredCredentials } from '../utils/authManager';
import CrossPlatformAlert from '../utils/crossPlatformAlert';

const TestLoginScreen = ({ navigation }) => {

  const checkLoginStatus = async () => {
    const loggedIn = await isUserLoggedIn();
    const credentials = await getStoredCredentials();
    
    CrossPlatformAlert.alert(
      'Login Status',
      `Logged In: ${loggedIn}\nToken: ${credentials.token ? 'Present' : 'None'}\nUser ID: ${credentials.userId || 'None'}`
    );
  };

  const simulateLogin = async () => {
    // Store dummy credentials for testing
    await storeUserCredentials('dummy_token_123', '456');
    CrossPlatformAlert.alert('Success', 'Test credentials stored!');
  };

  const clearLogin = async () => {
    await clearUserCredentials();
    CrossPlatformAlert.alert('Success', 'Credentials cleared!');
  };

  const goToSplash = () => {
    navigation.navigate('Splash');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login Persistence Test</Text>
      
      <TouchableOpacity style={styles.button} onPress={checkLoginStatus}>
        <Text style={styles.buttonText}>Check Login Status</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={simulateLogin}>
        <Text style={styles.buttonText}>Simulate Login</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={clearLogin}>
        <Text style={styles.buttonText}>Clear Login</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={goToSplash}>
        <Text style={styles.buttonText}>Go to Splash (Test Auto-Login)</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#333',
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
    width: '80%',
    alignItems: 'center',
  },
  dangerButton: {
    backgroundColor: '#dc3545',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TestLoginScreen;