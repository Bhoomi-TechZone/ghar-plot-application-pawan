/**
 * api.js
 * Base file for handling API requests with Authorization token.
 * Includes generic GET, POST, and PUT utilities.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from 'react-native-geolocation-service';
import { PermissionsAndroid, Platform } from 'react-native';

// Store navigation reference for auto-logout
let navigationRef = null;

/**
 * Set navigation reference to enable auto-logout on token expiry
 * Call this from App.js after navigation is ready
 */
export function setNavigationRef(ref) {
    navigationRef = ref;
    console.log('[API] Navigation reference set for auto-logout');
}

/**
 * Handle token expiry by clearing storage and redirecting to login
 */
async function handleTokenExpiry() {
    console.log('[API] 🔒 Token expired - Auto logout initiated');

    try {
        // Clear all auth data
        await AsyncStorage.multiRemove([
            'userToken',
            'userId',
            'userProfile',
            'refreshToken',
            'fcmToken'
        ]);

        console.log('[API] ✅ Auth data cleared');

        // Navigate to login if navigation is available
        if (navigationRef) {
            navigationRef.reset({
                index: 0,
                routes: [{ name: 'LoginScreen' }],
            });
            console.log('[API] ✅ Redirected to login screen');
        }
    } catch (error) {
        console.error('[API] ❌ Error during auto-logout:', error);
    }
}

// Backend Server URL
export const BASE_URL = 'https://gharplotbackend.gntechnology.de';

// --- HELPER FUNCTION TO CONSTRUCT QUERY STRING ---
const buildQuery = (params) => {
    return Object.keys(params).length
        ? '?' + Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
        : '';
};
// --------------------------------------------------

// --- URL CLEANUP UTILITY ---
/**
 * Ensures the final URL is correctly formatted with one slash between base and endpoint.
 */
const cleanUrl = (baseUrl, endpoint) => {
    // Remove trailing slash from base and leading slash from endpoint, then combine with a single slash
    const cleanBase = baseUrl.replace(/\/+$/, '');
    const cleanEndpoint = endpoint.replace(/^\/+/, '');
    return `${cleanBase}/${cleanEndpoint}`;
};
// ----------------------------------

/**
 * Fetch with timeout and debug logging.
 */
async function fetchWithTimeout(url, options = {}, timeout = 15000) {
    // Log request info and token presence for debugging
    try {
        const token = await AsyncStorage.getItem('userToken');
        console.log('[API] Request:', options.method || 'GET', url);
        console.log('[API] Token present:', !!token);
    } catch (e) {
        console.warn('[API] Failed to read token for debug logging', e);
    }

    const controller = new AbortController();
    const signal = controller.signal;
    const fetchPromise = fetch(url, { ...options, signal });

    const timeoutId = setTimeout(() => {
        controller.abort();
    }, timeout);

    try {
        const res = await fetchPromise;
        clearTimeout(timeoutId);

        // Check for token expiry (401 Unauthorized or 403 Forbidden)
        if (res.status === 401 || res.status === 403) {
            console.log('[API] ⚠️ Received status', res.status, '- checking for token expiry');

            // Try to parse response to check for token expiry message
            try {
                const clonedRes = res.clone(); // Clone to read body without consuming it
                const errorData = await clonedRes.json();

                // Check for token expiry indicators
                const isTokenExpired =
                    errorData.message?.toLowerCase().includes('token') ||
                    errorData.message?.toLowerCase().includes('expired') ||
                    errorData.message?.toLowerCase().includes('unauthorized') ||
                    errorData.message?.toLowerCase().includes('invalid');

                if (isTokenExpired) {
                    console.log('[API] 🔒 Token expiry detected:', errorData.message);
                    await handleTokenExpiry();
                }
            } catch (parseError) {
                // If we can't parse the response, assume token expiry for 401/403
                console.log('[API] 🔒 Token expiry assumed for status', res.status);
                await handleTokenExpiry();
            }
        }

        return res;
    } catch (err) {
        clearTimeout(timeoutId);
        // Normalize abort error to a clearer message
        if (err.name === 'AbortError') throw new Error('Network timeout');
        throw err;
    }
}

/**
 * Parse an error response: try JSON first, otherwise return raw text.
 */
async function parseErrorResponse(response) {
    const status = response.status;
    try {
        const json = await response.json();
        const message = json && (json.message || JSON.stringify(json));
        return { status, message, body: json };
    } catch (jsonErr) {
        // Couldn't parse JSON, fall back to text (may be HTML error page)
        try {
            const text = await response.text();
            return { status, message: text, body: text };
        } catch (textErr) {
            return { status, message: `Failed to parse error response (status ${status})`, body: null };
        }
    }
}

/**
 * Refresh the token if expired.
 */
async function refreshToken() {
    try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (!refreshToken) {
            console.warn('[API] No refresh token found. Triggering auto-logout.');
            await handleTokenExpiry();
            throw new Error('No refresh token found.');
        }

        const response = await fetchWithTimeout(`${BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
            const parsed = await parseErrorResponse(response);

            // Handle 404 specifically - endpoint doesn't exist
            if (parsed.status === 404) {
                console.warn('[API] Token refresh endpoint not available (404). Proceeding without refresh.');
                // Return null to indicate refresh not available
                return null;
            }

            // For other errors, trigger auto-logout
            console.warn('[API] Token refresh failed. Triggering auto-logout.');
            await handleTokenExpiry();
            throw new Error(`Token refresh failed: ${parsed.message}`);
        }

        const { token, refreshToken: newRefreshToken } = await response.json();
        await AsyncStorage.setItem('userToken', token);
        await AsyncStorage.setItem('refreshToken', newRefreshToken);
        return token;
    } catch (error) {
        console.error('[API] Token refresh error:', error);

        // Don't throw for 404 - just return null
        if (error.message && error.message.includes('404')) {
            return null;
        }

        throw error;
    }
}

/**
 * Wrapper to handle token expiry and retry requests.
 */
async function fetchWithTokenRetry(url, options = {}, timeout = 15000) {
    try {
        return await fetchWithTimeout(url, options, timeout);
    } catch (error) {
        if (error.response && error.response.status === 403 && error.response.data.message === 'Invalid or expired token') {
            console.warn('[API] Token expired, attempting refresh...');
            try {
                const newToken = await refreshToken();

                // If refresh token endpoint doesn't exist (returns null), just proceed with old token
                if (newToken === null) {
                    console.warn('[API] Token refresh not available. Continuing with existing token.');
                    return await fetchWithTimeout(url, options, timeout);
                }

                // If we got a new token, retry with it
                if (newToken && options.headers) {
                    options.headers['Authorization'] = `Bearer ${newToken}`;
                    return await fetchWithTimeout(url, options, timeout);
                }
            } catch (refreshError) {
                console.error('[API] Token refresh failed:', refreshError);
                // Don't throw session expired error if refresh endpoint doesn't exist
                if (refreshError.message && refreshError.message.includes('404')) {
                    console.warn('[API] Proceeding without token refresh (endpoint not available)');
                    return await fetchWithTimeout(url, options, timeout);
                }
                throw new Error('Session expired. Please log in again.');
            }
        }
        throw error;
    }
}

/**
 * Generic POST request utility with token handling.
 */
export async function post(endpoint, data) {
    const url = cleanUrl(BASE_URL, endpoint); // Use cleanup helper
    const token = await AsyncStorage.getItem('userToken');

    const headers = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`; // Add token
    }

    try {
        const response = await fetchWithTimeout(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const parsed = await parseErrorResponse(response);

            // For phone OTP endpoint, return the error response body instead of throwing
            // This allows the UI to show a clean alert without console errors
            if (endpoint.includes('/send-phone-otp') && parsed.body && typeof parsed.body === 'object') {
                return parsed.body;
            }

            throw new Error(`HTTP error! Status: ${parsed.status}. Message: ${parsed.message}`);
        }
        return response.json();

    } catch (error) {
        // For save-token endpoint (non-critical), only log as warning not error
        if (endpoint.includes('/save-token')) {
            console.warn(`API POST request failed for endpoint ${endpoint}:`, error.message);
        }
        // For schedule-notification endpoints (404 expected if not implemented yet), log as warning
        else if (endpoint.includes('/schedule-notification') && error.message && error.message.includes('404')) {
            console.warn(`⚠️ Notification endpoint not available yet (${endpoint}):`, error.message);
        }
        else {
            console.error(`API POST request failed for endpoint ${endpoint}:`, error);
        }
        throw error;
    }
}

/**
 * Generic POST request utility that appends parameters to the URL query string.
 */
export async function postWithQuery(endpoint, params = {}, data = {}) {
    const query = buildQuery(params);

    // Build URL with cleanup helper, then append query
    const baseUrlWithEndpoint = cleanUrl(BASE_URL, endpoint);
    const url = `${baseUrlWithEndpoint}${query}`;

    const token = await AsyncStorage.getItem('userToken');

    const headers = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`; // Add token
    }

    try {
        const response = await fetchWithTimeout(url, {
            method: 'POST',
            headers: headers,
            // Only include body if data is provided, otherwise pass undefined
            body: Object.keys(data).length > 0 ? JSON.stringify(data) : undefined,
        });

        if (!response.ok) {
            const parsed = await parseErrorResponse(response);
            throw new Error(`HTTP error! Status: ${parsed.status}. Message: ${parsed.message}`);
        }
        return response.json();

    } catch (error) {
        console.error(`API POST (Query) request failed for endpoint ${endpoint}:`, error);
        throw error;
    }
}

/**
 * Generic PUT request utility with token handling. Used for updates.
 */
export async function put(endpoint, data) {
    const url = cleanUrl(BASE_URL, endpoint); // Use cleanup helper
    const token = await AsyncStorage.getItem('userToken');

    const headers = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`; // Add token
    }

    try {
        const response = await fetchWithTimeout(url, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const parsed = await parseErrorResponse(response);
            throw new Error(`HTTP error! Status: ${parsed.status}. Message: ${parsed.message}`);
        }
        return response.json();

    } catch (error) {
        console.error(`API PUT request failed for endpoint ${endpoint}:`, error);
        throw error;
    }
}

/**
 * Generic GET request utility with optional query params and token.
 */
export async function get(endpoint, params = {}) {
    const query = buildQuery(params);

    // Build URL with cleanup helper, then append query
    const baseUrlWithEndpoint = cleanUrl(BASE_URL, endpoint);
    const url = `${baseUrlWithEndpoint}${query}`;

    const token = await AsyncStorage.getItem('userToken');

    const headers = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`; // Add token
    }

    try {
        const response = await fetchWithTokenRetry(url, {
            method: 'GET',
            headers: headers,
        });

        if (!response.ok) {
            const parsed = await parseErrorResponse(response);

            // Special handling for saved properties endpoint - don't crash app
            if (endpoint.includes('saved/all') && parsed.status === 400) {
                console.log(`ℹ️ Saved properties endpoint: ${parsed.message} - returning empty response`);
                return { savedProperties: [], data: [] }; // Return empty but valid response
            }

            throw new Error(`HTTP error! Status: ${parsed.status}. Message: ${parsed.message}`);
        }
        return response.json();
    } catch (error) {
        // Special handling for non-critical endpoints
        if (endpoint.includes('saved/all')) {
            console.log(`ℹ️ Saved properties error (non-critical): ${error.message}`);
            return { savedProperties: [], data: [] }; // Return empty but valid response
        }

        if (endpoint.includes('/api/services')) {
            console.log(`ℹ️ Services endpoint error (non-critical): ${error.message}`);
            return []; // Return empty array for services
        }

        console.error(`API GET request failed for endpoint ${endpoint}:`, error);
        throw error;
    }
}

/**
 * Generic DELETE request utility that appends parameters to the URL query string.
 */
export async function deleteWithQuery(endpoint, params = {}) {
    const query = buildQuery(params);
    const baseUrlWithEndpoint = cleanUrl(BASE_URL, endpoint);
    const url = `${baseUrlWithEndpoint}${query}`;

    const token = await AsyncStorage.getItem('userToken');

    const headers = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetchWithTimeout(url, {
            method: 'DELETE',
            headers,
        });

        if (!response.ok) {
            const parsed = await parseErrorResponse(response);
            throw new Error(`HTTP error! Status: ${parsed.status}. Message: ${parsed.message}`);
        }
        // Some DELETE endpoints may return empty body
        try {
            return await response.json();
        } catch (e) {
            return {};
        }

    } catch (error) {
        console.error(`API DELETE (Query) request failed for endpoint ${endpoint}:`, error);
        throw error;
    }
}

/**
 * Generic DELETE request utility.
 */
export async function del(endpoint) {
    const url = cleanUrl(BASE_URL, endpoint);
    const token = await AsyncStorage.getItem('userToken') ||
        await AsyncStorage.getItem('adminToken') ||
        await AsyncStorage.getItem('admin_token') ||
        await AsyncStorage.getItem('employee_auth_token');

    const headers = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetchWithTimeout(url, {
            method: 'DELETE',
            headers: headers,
        });

        if (!response.ok) {
            const parsed = await parseErrorResponse(response);
            throw new Error(`HTTP error! Status: ${parsed.status}. Message: ${parsed.message}`);
        }

        try {
            return await response.json();
        } catch (e) {
            return { success: true };
        }
    } catch (error) {
        console.error(`API DELETE request failed for endpoint ${endpoint}:`, error);
        throw error;
    }
}

/**
 * Get the current location of the device.
 * Requests fine location permission on Android if not already granted.
 */
export async function getCurrentLocation() {
    try {
        if (Platform.OS === 'android') {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
            );

            if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                throw new Error('Location permission denied');
            }
        }

        return new Promise((resolve, reject) => {
            Geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    console.log('User location:', latitude, longitude);
                    resolve({ latitude, longitude });
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    reject(error);
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
            );
        });
    } catch (error) {
        console.error('Error fetching location:', error);
        throw error;
    }
}

/**
 * Send FCM token to backend for push notifications
 * @param {string} userId - User ID from authentication
 * @param {string} fcmToken - Firebase Cloud Messaging token
 * @returns {Promise<Object>} Response from backend
 */
export async function sendFCMTokenToBackend(userId, fcmToken) {
    try {
        // Validate inputs
        if (!userId) {
            console.warn('⚠️ userId is missing. Cannot send FCM token.');
            return { success: false, message: 'userId missing' };
        }

        if (!fcmToken || typeof fcmToken !== 'string') {
            console.warn('⚠️ fcmToken is missing or invalid. Cannot send FCM token.');
            return { success: false, message: 'fcmToken missing or invalid' };
        }

        console.log('📤 Sending FCM token to backend...', {
            userId,
            fcmToken: fcmToken.substring(0, 20) + '...',
            tokenLength: fcmToken.length
        });

        const payload = {
            userId: String(userId).trim(),
            fcmToken: String(fcmToken).trim(),
        };

        console.log('📦 FCM Payload:', {
            userId: payload.userId,
            fcmToken: payload.fcmToken.substring(0, 20) + '...'
        });

        const response = await post('/api/save-token', payload);

        console.log('✅ FCM token sent to backend successfully:', response);
        return response;
    } catch (error) {
        // Don't throw error - FCM token is optional, shouldn't block login
        const errorMessage = error.message || 'Unknown error';

        if (errorMessage.includes('404')) {
            console.warn('⚠️ FCM token endpoint not available (404). Skipping token save.');
        } else if (errorMessage.includes('500')) {
            console.warn('⚠️ Backend error (500) while saving FCM token. Server may have an issue.');
            console.error('📋 Error details:', errorMessage);
        } else {
            console.warn('⚠️ Failed to send FCM token to backend:', errorMessage);
        }

        return { success: false, message: 'FCM token save failed but login continued' };
    }
}

/**
 * Update reminder via API
 * @param {string} reminderId - Reminder ID
 * @param {Object} data - Reminder data (title, comment, reminderDateTime)
 */
export async function updateReminder(reminderId, data) {
    try {
        const url = cleanUrl(BASE_URL, `/api/reminder/update/${reminderId}`);

        // Get proper auth token (employee/admin)
        const token = await AsyncStorage.getItem('accessToken') ||
            await AsyncStorage.getItem('employeeToken') ||
            await AsyncStorage.getItem('adminToken') ||
            await AsyncStorage.getItem('employee_auth_token') ||
            await AsyncStorage.getItem('userToken');

        if (!token) {
            throw new Error('No authentication token found. Please login again.');
        }

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        };

        console.log('📤 Updating reminder:', reminderId);
        console.log('📝 Data:', data);

        const response = await fetchWithTimeout(url, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const parsed = await parseErrorResponse(response);
            throw new Error(`HTTP error! Status: ${parsed.status}. Message: ${parsed.message}`);
        }

        const result = await response.json();
        console.log('✅ Reminder updated via API:', result);
        return result;
    } catch (error) {
        console.error('❌ Failed to update reminder:', error);
        throw error;
    }
}

/**
 * Create new alert via API
 * POST /api/alerts
 * @param {Object} data - Alert data containing:
 *   - title: string (required)
 *   - date: string in YYYY-MM-DD format (required)
 *   - time: string in HH:MM format (required)
 *   - reason: string (required)
 *   - repeatDaily: boolean (optional, default false)
 *   - isActive: boolean (optional, default true)
 */
export async function createAlert(data) {
    try {
        const url = cleanUrl(BASE_URL, '/api/alerts');

        // ⚠️ CRITICAL: Use CRM auth headers for alert APIs
        // Token keys priority: adminToken > crm_auth_token > employee_auth_token > employee_token
        const crmToken = await AsyncStorage.getItem('adminToken') ||
            await AsyncStorage.getItem('crm_auth_token') ||
            await AsyncStorage.getItem('employee_auth_token') ||
            await AsyncStorage.getItem('employee_token') ||
            await AsyncStorage.getItem('admin_token') ||
            await AsyncStorage.getItem('userToken');

        if (!crmToken) {
            throw new Error('No authentication token found. Please login to CRM.');
        }

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${crmToken}`,
        };

        console.log('🆕 Creating new alert');
        console.log('📡 URL:', url);
        console.log('📝 Data:', data);
        console.log('🔑 Token available:', !!crmToken);

        const response = await fetchWithTimeout(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const parsed = await parseErrorResponse(response);
            console.error('❌ Create alert failed:', parsed.status, parsed.message);
            throw new Error(`HTTP error! Status: ${parsed.status}. Message: ${parsed.message}`);
        }

        const result = await response.json();
        console.log('✅ Alert created via API:', result);
        return result;
    } catch (error) {
        console.error('❌ Failed to create alert:', error);
        throw error;
    }
}

/**
 * Update alert via API
 * PUT /api/alerts/{alertId}
 * ⚠️ CRITICAL: Backend MUST automatically reschedule FCM notification when this is called
 * Backend should:
 * 1. Cancel old scheduled FCM notification
 * 2. Schedule new FCM notification with updated time
 * 3. Use data-only FCM format for kill mode support
 * @param {string} alertId - Alert ID
 * @param {Object} data - Alert data containing:
 *   - title: string (optional)
 *   - date: string in YYYY-MM-DD format (optional)
 *   - time: string in HH:MM format (optional)
 *   - reason: string (optional)
 *   - repeatDaily: boolean (optional)
 *   - isActive: boolean (optional)
 */
export async function updateAlert(alertId, data) {
    try {
        const url = cleanUrl(BASE_URL, `/api/alerts/${alertId}`);

        // ⚠️ CRITICAL: Use CRM auth headers for alert APIs
        // Token keys priority: adminToken > crm_auth_token > employee_auth_token > employee_token
        const crmToken = await AsyncStorage.getItem('adminToken') ||
            await AsyncStorage.getItem('crm_auth_token') ||
            await AsyncStorage.getItem('employee_auth_token') ||
            await AsyncStorage.getItem('employee_token') ||
            await AsyncStorage.getItem('admin_token') ||
            await AsyncStorage.getItem('userToken');

        if (!crmToken) {
            throw new Error('No authentication token found. Please login to CRM.');
        }

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${crmToken}`,
        };

        console.log('🔄 Updating alert:', alertId);
        console.log('📡 URL:', url);
        console.log('🔑 Token available:', !!crmToken);

        const response = await fetchWithTimeout(url, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const parsed = await parseErrorResponse(response);
            console.error('❌ Update alert failed:', parsed.status, parsed.message);
            throw new Error(`HTTP error! Status: ${parsed.status}. Message: ${parsed.message}`);
        }

        const result = await response.json();
        console.log('✅ Alert updated via API:', result);
        console.log('⚠️ Backend should automatically reschedule FCM notification now');
        return result;
    } catch (error) {
        console.error('❌ Failed to update alert:', error);
        throw error;
    }
}
