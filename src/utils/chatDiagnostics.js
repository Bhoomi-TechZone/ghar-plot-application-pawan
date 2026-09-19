/**
 * Chat API Diagnostics
 * Test file to debug chat connectivity issues
 */

import { getAuthToken, getCurrentUserId } from '../services/chatApi';

/**
 * Test authentication and basic connectivity
 */
export const testChatAuth = async () => {
  console.log('🧪 Testing Chat Authentication...');

  try {
    const token = await getAuthToken();
    const userId = await getCurrentUserId();

    console.log('🔑 Auth Token:', token ? `${token.substring(0, 20)}...` : 'NULL');
    console.log('👤 User ID:', userId || 'NULL');

    if (!token) {
      console.error('❌ No auth token - user needs to login first');
      return { success: false, error: 'No auth token' };
    }

    if (!userId) {
      console.error('❌ No user ID - user data incomplete');
      return { success: false, error: 'No user ID' };
    }

    console.log('✅ Authentication data looks good');
    return { success: true, token, userId };

  } catch (error) {
    console.error('❌ Auth test failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Test backend endpoints
 */
export const testChatEndpoints = async () => {
  console.log('🧪 Testing Chat API Endpoints...');

  const authResult = await testChatAuth();
  if (!authResult.success) {
    return { success: false, error: 'Authentication failed' };
  }

  const { token } = authResult;
  const BASE_URL = 'https://ghar-plot-backend1.onrender.com/api/chat';

  const endpoints = [
    { name: 'Chat History', url: `${BASE_URL}/history`, method: 'GET' },
    { name: 'Chat History List', url: `${BASE_URL}/history/list`, method: 'GET' },
    { name: 'Get Chats', url: `${BASE_URL}/list`, method: 'GET' },
  ];

  const results = [];

  for (const endpoint of endpoints) {
    try {
      console.log(`🔍 Testing: ${endpoint.name} - ${endpoint.method} ${endpoint.url}`);

      const response = await fetch(endpoint.url, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const status = response.status;
      const statusText = response.statusText;

      let data = null;
      try {
        data = await response.json();
      } catch (e) {
        data = await response.text();
      }

      console.log(`📊 ${endpoint.name}: ${status} ${statusText}`);

      results.push({
        name: endpoint.name,
        url: endpoint.url,
        status,
        statusText,
        success: response.ok,
        data: response.ok ? data : `Error: ${data}`
      });

    } catch (error) {
      console.error(`❌ ${endpoint.name} failed:`, error);
      results.push({
        name: endpoint.name,
        url: endpoint.url,
        status: 0,
        success: false,
        error: error.message
      });
    }
  }

  console.log('📋 Endpoint Test Results:');
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.name}: ${result.status} ${result.statusText || result.error}`);
  });

  return { success: true, results };
};

/**
 * Test creating a chat
 */
export const testCreateChat = async (receiverId = '673d1234567890abcdef1234') => {
  console.log('🧪 Testing Chat Creation...');

  const authResult = await testChatAuth();
  if (!authResult.success) {
    return { success: false, error: 'Authentication failed' };
  }

  const { token } = authResult;
  const BASE_URL = 'https://ghar-plot-backend1.onrender.com/api/chat';

  try {
    console.log(`🔍 Creating chat with receiver: ${receiverId}`);

    const response = await fetch(`${BASE_URL}/get-or-create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ receiverId }),
    });

    const status = response.status;
    const data = await response.json();

    console.log(`📊 Create Chat: ${status} ${response.statusText}`);
    console.log('📄 Response:', JSON.stringify(data, null, 2));

    if (response.ok && data.chat) {
      console.log('✅ Chat creation successful');
      return { success: true, chat: data.chat };
    } else {
      console.error('❌ Chat creation failed');
      return { success: false, error: data.message || 'Unknown error' };
    }

  } catch (error) {
    console.error('❌ Chat creation request failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Test socket connection
 */
export const testSocketConnection = async () => {
  console.log('🧪 Testing Socket Connection...');

  const authResult = await testChatAuth();
  if (!authResult.success) {
    return { success: false, error: 'Authentication failed' };
  }

  try {
    // Dynamically import socket.io-client
    const io = (await import('socket.io-client')).default;
    const SOCKET_URL = 'https://ghar-plot-backend1.onrender.com';

    console.log(`🔌 Connecting to socket: ${SOCKET_URL}`);

    return new Promise((resolve) => {
      const socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        timeout: 5000,
        forceNew: true,
        auth: {
          token: authResult.token
        }
      });

      const timeout = setTimeout(() => {
        socket.disconnect();
        console.error('❌ Socket connection timeout');
        resolve({ success: false, error: 'Connection timeout' });
      }, 10000);

      socket.on('connect', () => {
        clearTimeout(timeout);
        console.log('✅ Socket connected successfully');
        socket.disconnect();
        resolve({ success: true });
      });

      socket.on('connect_error', (error) => {
        clearTimeout(timeout);
        console.error('❌ Socket connection error:', error.message);
        socket.disconnect();
        resolve({ success: false, error: error.message });
      });
    });

  } catch (error) {
    console.error('❌ Socket test failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Run all chat diagnostics
 */
export const runChatDiagnostics = async () => {
  console.log('🚀 Running Complete Chat Diagnostics...\n');

  const results = {
    auth: await testChatAuth(),
    endpoints: await testChatEndpoints(),
    socket: await testSocketConnection()
  };

  console.log('\n📊 Diagnostic Results Summary:');
  console.log(`Authentication: ${results.auth.success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`API Endpoints: ${results.endpoints.success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Socket Connection: ${results.socket.success ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = results.auth.success && results.endpoints.success && results.socket.success;
  console.log(`\n🎯 Overall Status: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

  if (!allPassed) {
    console.log('\n🔧 Troubleshooting Tips:');
    if (!results.auth.success) {
      console.log('- Check if user is logged in');
      console.log('- Verify token storage keys');
    }
    if (!results.endpoints.success) {
      console.log('- Check backend API routes');
      console.log('- Verify server is running');
      console.log('- Check network connectivity');
    }
    if (!results.socket.success) {
      console.log('- Check if Socket.IO is enabled on backend');
      console.log('- Verify socket authentication middleware');
    }
  }

  return results;
};

/**
 * Quick test function for HomeScreen
 */
export const quickChatTest = async () => {
  console.log('⚡ Quick Chat Test...');
  const authResult = await testChatAuth();

  if (authResult.success) {
    console.log('✅ Chat system ready');
    return true;
  } else {
    console.error('❌ Chat system not ready:', authResult.error);
    return false;
  }
};