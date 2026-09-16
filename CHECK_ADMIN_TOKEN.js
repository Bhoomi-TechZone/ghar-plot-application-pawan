/**
 * Quick Debug Script to Check Admin Token
 * Run this via React Native debugger console or add temporary button in app
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const checkAdminToken = async () => {
  console.log('=== CHECKING ADMIN TOKEN ===');
  
  try {
    const adminToken = await AsyncStorage.getItem('adminToken');
    const admin_token = await AsyncStorage.getItem('admin_token');
    const crmAuthToken = await AsyncStorage.getItem('crmAuthToken');
    const userType = await AsyncStorage.getItem('userType');
    const adminData = await AsyncStorage.getItem('adminData');
    
    console.log('✅ Token Check Results:');
    console.log('- adminToken:', adminToken ? `EXISTS (${adminToken.length} chars)` : '❌ NULL');
    console.log('- admin_token:', admin_token ? `EXISTS (${admin_token.length} chars)` : '❌ NULL');
    console.log('- crmAuthToken:', crmAuthToken ? `EXISTS (${crmAuthToken.length} chars)` : '❌ NULL');
    console.log('- userType:', userType || '❌ NULL');
    console.log('- adminData:', adminData ? 'EXISTS' : '❌ NULL');
    
    if (adminToken) {
      console.log('First 30 chars:', adminToken.substring(0, 30) + '...');
    }
    
    console.log('=== END TOKEN CHECK ===');
    
    return {
      adminToken,
      admin_token,
      crmAuthToken,
      userType,
      hasToken: !!(adminToken || admin_token || crmAuthToken)
    };
  } catch (error) {
    console.error('❌ Error checking token:', error);
    return null;
  }
};

// Clear all admin tokens (useful for debugging)
export const clearAllAdminTokens = async () => {
  try {
    await AsyncStorage.multiRemove([
      'adminToken',
      'admin_token',
      'crmAuthToken',
      'userType',
      'adminData',
      'admin_user',
      'isAuthenticated',
      'adminId'
    ]);
    console.log('✅ All admin tokens cleared');
  } catch (error) {
    console.error('❌ Error clearing tokens:', error);
  }
};

export default checkAdminToken;
