/**
 * TEST ADMIN AUTHENTICATION
 * Temporary component to test admin authentication and API connection
 * Add this to your AdminMenuScreen temporarily to debug
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TestAdminAuth = () => {
  const [testResult, setTestResult] = useState('');

  const checkAuth = async () => {
    console.log('🔍 === TESTING ADMIN AUTH ===');

    try {
      // 1. Check if token exist
      const adminToken = await AsyncStorage.getItem('adminToken');
      const admin_token = await AsyncStorage.getItem('admin_token');

      console.log('✅ adminToken:', adminToken ? `EXISTS (${adminToken.length} chars)` : '❌ NULL');
      console.log('✅ admin_token:', admin_token ? `EXISTS (${admin_token.length} chars)` : '❌ NULL');

      if (!adminToken && !admin_token) {
        Alert.alert('❌ No Token', 'Admin token not found. Please login first.');
        return;
      }

      const token = adminToken || admin_token;
      console.log('🔑 Using token:', token.substring(0, 30) + '...');

      // 2. Test API connection
      console.log('📡 Testing API connection...');
      const API_BASE_URL = 'http://localhost:8866';

      const response = await fetch(`${API_BASE_URL}/admin/employees`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📊 Response Status:', response.status);
      console.log('📊 Response OK:', response.ok);

      const data = await response.json();
      console.log('📊 Response Data:', JSON.stringify(data).substring(0, 200));

      if (response.ok && data.success) {
        Alert.alert(
          '✅ Success!',
          `Authentication working!\nStatus: ${response.status}\nEmployees: ${data.data?.length || 0}`
        );
        setTestResult(`✅ Working! ${data.data?.length || 0} employees found`);
      } else if (response.status === 401) {
        Alert.alert(
          '❌ Auth Failed',
          'Token is invalid or expired. Please login again.'
        );
        setTestResult('❌ 401 - Invalid token');
      } else {
        Alert.alert(
          '⚠️ API Error',
          `Status: ${response.status}\nMessage: ${data.message || 'Unknown error'}`
        );
        setTestResult(`⚠️ ${response.status} - ${data.message}`);
      }

    } catch (error) {
      console.error('❌ Test Error:', error);
      Alert.alert(
        '❌ Network Error',
        `Error: ${error.message}\n\nPlease check:\n1. Internet connection\n2. Backend server is running\n3. URL is correct`
      );
      setTestResult(`❌ ${error.message}`);
    }

    console.log('🔍 === END TEST ===');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={checkAuth}>
        <Text style={styles.buttonText}>🧪 Test Admin Auth</Text>
      </TouchableOpacity>
      {testResult ? (
        <Text style={styles.result}>{testResult}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    margin: 16,
  },
  button: {
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  result: {
    marginTop: 12,
    fontSize: 14,
    color: '#374151',
  },
});

export default TestAdminAuth;

// USAGE:
// Add this to AdminMenuScreen.js:
//
// import TestAdminAuth from '../../TEST_ADMIN_AUTH';
//
// Then add before the ScrollView:
// <TestAdminAuth />
