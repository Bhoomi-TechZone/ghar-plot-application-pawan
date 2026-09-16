/**
 * EnquiriesScreen Debug Helper
 * Quick debugging utilities for enquiries screen
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CRM_BASE_URL } from '../../services/crmAPI';

// Test API connectivity
export const testAPIConnectivity = async () => {
  try {
    console.log('🌐 Testing API connectivity...');
    
    // Check tokens
    const adminToken = await AsyncStorage.getItem('adminToken');
    const employeeToken = await AsyncStorage.getItem('employeeToken');
    
    console.log('🔐 Available tokens:', {
      admin: !!adminToken,
      employee: !!employeeToken
    });
    
    // Test API endpoints
    const endpoints = [
      `${CRM_BASE_URL}/api/inquiry/all`,
      `${CRM_BASE_URL}/api/inquiry/get-enquiries`
    ];
    
    for (const url of endpoints) {
      try {
        const token = adminToken || employeeToken;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        });
        
        console.log(`📡 ${url}:`, {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Data preview:`, {
            type: typeof data,
            length: Array.isArray(data) ? data.length : 'N/A',
            keys: typeof data === 'object' ? Object.keys(data) : 'N/A'
          });
        } else {
          const errorText = await response.text();
          console.log(`❌ Error:`, errorText.substring(0, 200));
        }
        
      } catch (fetchError) {
        console.log(`❌ Fetch error for ${url}:`, fetchError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ API connectivity test failed:', error);
  }
};

// Debug current app state
export const debugAppState = async () => {
  try {
    console.log('🔍 App Debug State:');
    
    // Check all tokens
    const tokens = {
      adminToken: await AsyncStorage.getItem('adminToken'),
      employeeToken: await AsyncStorage.getItem('employeeToken'),
      crmToken: await AsyncStorage.getItem('crm_auth_token'),
      genericToken: await AsyncStorage.getItem('token')
    };
    
    console.log('🔐 Tokens:', Object.fromEntries(
      Object.entries(tokens).map(([key, value]) => [key, !!value])
    ));
    
    // Check network
    console.log('🌐 Base URL:', CRM_BASE_URL);
    
    return tokens;
    
  } catch (error) {
    console.error('❌ Debug state failed:', error);
    return {};
  }
};

// Manual enquiries test
export const testEnquiriesAPI = async () => {
  console.log('🧪 Testing Enquiries API manually...');
  await debugAppState();
  await testAPIConnectivity();
};

// Make available globally for debugging
if (__DEV__) {
  global.debugEnquiries = {
    testAPI: testEnquiriesAPI,
    testConnectivity: testAPIConnectivity,
    debugState: debugAppState
  };
  
  console.log('🛠️ Enquiries debug tools available:');
  console.log('  debugEnquiries.testAPI()');
  console.log('  debugEnquiries.testConnectivity()');
  console.log('  debugEnquiries.debugState()');
}