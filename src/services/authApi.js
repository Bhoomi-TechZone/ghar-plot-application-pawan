/**
 * authapi.js
 * Centralized service for user authentication (Login, Register, Logout).
 * This file handles session management (saving/removing the auth token).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { post } from './api.js'; // Import generic POST helper
import { BASE_URL } from './api.js'; // Import BASE_URL from main API

// Use same BASE_URL as rest of the app for authentication
const AUTH_BASE_URL = BASE_URL;

// Define endpoint paths relative to BASE_URL (backend has auth under /auth)
const LOGIN_ENDPOINT = `/auth/login`;
const SIGNUP_ENDPOINT = `/auth/signup`;
const COMPLETE_REGISTRATION_ENDPOINT = `/auth/complete-registration`;
const LOGOUT_ENDPOINT = `/auth/logout`;
const SEND_OTP_ENDPOINT = `/auth/send-email-otp`;
const VERIFY_OTP_ENDPOINT = `/auth/verify-email-otp`;
const SEND_PHONE_OTP_ENDPOINT = `/auth/send-phone-otp`;
const VERIFY_PHONE_OTP_ENDPOINT = `/auth/verify-phone-otp`;

/**
 * Helper function to make POST request to OTP service
 * Uses AUTH_BASE_URL for OTP operations
 */
async function postToOtpService(endpoint, body) {
    const url = `${AUTH_BASE_URL}${endpoint}`;
    const token = await AsyncStorage.getItem('userToken');
    
    console.log(`[OTP Service] ${endpoint}`, body);
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(body),
        });

        // Check if response is ok first
        if (!response.ok) {
            console.error(`[OTP Service] HTTP Error: ${response.status} ${response.statusText}`);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Check content-type to ensure it's JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.error(`[OTP Service] Invalid content-type: ${contentType}`);
            const text = await response.text();
            console.error(`[OTP Service] Response text:`, text);
            throw new Error('Server returned non-JSON response. Please check if the OTP service is running correctly.');
        }

        const data = await response.json();
        return data;
        
    } catch (error) {
        if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
            console.error(`[OTP Service] JSON Parse Error at ${url}`);
            throw new Error('Server returned invalid response. Please check if the OTP service is running correctly.');
        }
        
        console.error(`[OTP Service] Request failed:`, error.message);
        throw error;
    }
}

/**
 * Utility to retrieve the current user's JWT token from storage.
 * This is needed by userApi.js and other authenticated API calls.
 * @returns {Promise<string|null>} The stored JWT token.
 */
export async function getToken() {
    try {
        const token = await AsyncStorage.getItem('userToken');
        console.log('Retrieved token:', token); // Debug log
        return token;
    } catch (error) {
        console.error('Error retrieving token from AsyncStorage:', error);
        return null;
    }
}


/**
 * Performs the user signup request (equivalent to previous 'register').
 * @param {object} userData - User details (e.g., email, password, name).
 * @returns {Promise<{success: boolean, message: string}>} Registration result without auto-login.
 */
export async function signup(userData) {
    try {
        // Use the generic 'post' function
        const data = await post(SIGNUP_ENDPOINT, userData);
        
        // Don't save token - user should login manually after signup
        console.log('Signup successful, user needs to login:', data.message || 'Account created');
        
        return { 
            success: true, 
            message: data.message || 'Account created successfully',
            data: data 
        };

    } catch (error) {
        console.error("Signup Error:", error.message);
        throw error;
    }
}


/**
 * Handles user login by sending credentials to the server.
 * @param {string} email - User's email address.
 * @param {string} password - User's password.
 * @returns {Promise<{token: string, userId: string}>} Authentication token and user ID.
 */
export async function login(email, password) {
    try {
        // Use the generic 'post' function with the corrected endpoint
        const data = await post(LOGIN_ENDPOINT, { email, password });
        
        // --- FIX: Extract userId correctly from data.user.id ---
        const userId = data.user?.id;
        
        // CRITICAL: Save the token securely upon successful login
        if (data.token) {
            await AsyncStorage.setItem('userToken', data.token);
            console.log('Token saved successfully:', data.token); // Debug log
            
            // Save the user ID if it exists
            if (userId) {
                await AsyncStorage.setItem('userId', String(userId));
                console.log('User ID saved successfully:', userId); // Debug log
            } else {
                console.warn("Login successful but user ID was not found at data.user.id");
            }
        }
        
        // Return the token and the correctly extracted userId
        return { token: data.token, userId: userId };

    } catch (error) {
        console.error("Login Error:", error.message);
        throw error;
    }
}


/**
 * Send email OTP
 * @param {string} email
 * @returns {Promise<Object>} The API response.
 */
export async function sendEmailOtp(email) {
    try {
        console.log('Sending email OTP to:', email);
        const response = await postToOtpService(SEND_OTP_ENDPOINT, { email });
        
        console.log('Send Email OTP Response:', response);
        
        // Check if response indicates success
        if (response && response.success === true) {
            return {
                success: true,
                message: response.message || 'OTP sent successfully to your email',
                data: response.data
            };
        }
        
        // Handle error response
        return {
            success: false,
            message: response.message || 'Failed to send OTP. Please try again.',
            error: response.error || 'OTP service error'
        };
    } catch (error) {
        console.error("Send Email OTP Error:", error.message);
        
        // Provide specific error messages based on error type
        let userMessage = 'Unable to send OTP. Please check your internet connection and try again.';
        
        if (error.message.includes('Server returned non-JSON response') || 
            error.message.includes('Server returned invalid response')) {
            userMessage = 'OTP service is temporarily unavailable. Please try again later.';
        } else if (error.message.includes('HTTP 404')) {
            userMessage = 'OTP service not found. Please contact support.';
        } else if (error.message.includes('HTTP 500')) {
            userMessage = 'Server error. Please try again later.';
        } else if (error.message.includes('Network request failed')) {
            userMessage = 'Network error. Please check your internet connection.';
        }
        
        return {
            success: false,
            message: userMessage,
            error: error.message
        };
    }
}

/**
 * Verify email OTP
 * @param {string} email
 * @param {string|number} otp
 * @returns {Promise<Object>} The API response.
 */
export async function verifyEmailOtp(email, otp) {
    try {
        console.log('Verifying email OTP for:', email);
        const response = await postToOtpService(VERIFY_OTP_ENDPOINT, { email, otp });
        
        console.log('Verify Email OTP Response:', response);
        
        // Check if response indicates success
        if (response && response.success === true) {
            return {
                success: true,
                message: response.message || 'OTP verified successfully',
                data: response.data
            };
        }
        
        // Handle error response
        return {
            success: false,
            message: response.message || 'Invalid OTP. Please try again.',
            error: response.error || 'OTP verification failed'
        };
    } catch (error) {
        console.error("Verify Email OTP Error:", error.message);
        
        // Provide specific error messages based on error type
        let userMessage = 'Unable to verify OTP. Please check your internet connection and try again.';
        
        if (error.message.includes('Server returned non-JSON response') || 
            error.message.includes('Server returned invalid response')) {
            userMessage = 'OTP service is temporarily unavailable. Please try again later.';
        } else if (error.message.includes('HTTP 404')) {
            userMessage = 'OTP service not found. Please contact support.';
        } else if (error.message.includes('HTTP 500')) {
            userMessage = 'Server error. Please try again later.';
        } else if (error.message.includes('Network request failed')) {
            userMessage = 'Network error. Please check your internet connection.';
        }
        
        return {
            success: false,
            message: userMessage,
            error: error.message
        };
    }
}

/**
 * Send phone OTP
 * @param {string} phone - Phone number
 * @returns {Promise<Object>} The API response containing OTP or error.
 */
export async function sendPhoneOtp(phone) {
    try {
        console.log('Sending phone OTP to:', phone);
        const response = await postToOtpService(SEND_PHONE_OTP_ENDPOINT, { phone });
        
        console.log('Send Phone OTP Response:', response);
        
        // Check if response indicates success
        if (response && response.success === true) {
            return {
                success: true,
                message: response.message || 'OTP sent successfully to your phone',
                data: response.data
            };
        }
        
        // Handle error response
        return {
            success: false,
            message: response.message || 'Failed to send OTP. Please try again.',
            error: response.error || 'OTP service error'
        };
    } catch (error) {
        console.error("Send Phone OTP Error:", error.message);
        
        // Provide specific error messages based on error type
        let userMessage = 'Unable to send OTP. Please check your internet connection and try again.';
        
        if (error.message.includes('Server returned non-JSON response') || 
            error.message.includes('Server returned invalid response')) {
            userMessage = 'OTP service is temporarily unavailable. Please try again later.';
        } else if (error.message.includes('HTTP 404')) {
            userMessage = 'OTP service not found. Please contact support.';
        } else if (error.message.includes('HTTP 500')) {
            userMessage = 'Server error. Please try again later.';
        } else if (error.message.includes('Network request failed')) {
            userMessage = 'Network error. Please check your internet connection.';
        }
        
        return {
            success: false,
            message: userMessage,
            error: error.message
        };
    }
}

/**
 * Verify phone OTP and check if user is registered
 * @param {string} phone - Phone number
 * @param {string|number} otp - OTP code
 * @returns {Promise<Object>} The API response with token if user exists, or success flag if new user.
 */
export async function verifyPhoneOtp(phone, otp) {
    try {
        console.log('📞 Verifying phone OTP for:', phone, 'OTP:', otp);
        const response = await postToOtpService(VERIFY_PHONE_OTP_ENDPOINT, { phone, otp });
        
        console.log('📥 Verify Phone OTP Raw Response:', JSON.stringify(response, null, 2));
        
        // Check if verification was successful
        if (response && response.success === true) {
            // If token exists, user is already registered - save token
            if (response.token) {
                console.log('✅ EXISTING USER DETECTED - Token found in response');
                
                await AsyncStorage.setItem('userToken', response.token);
                console.log('💾 Token saved for existing user:', response.token.substring(0, 20) + '...');
                
                if (response.user?.id) {
                    await AsyncStorage.setItem('userId', String(response.user.id));
                    console.log('💾 User ID saved:', response.user.id);
                }
                
                return {
                    success: true,
                    message: response.message || 'Login successful',
                    token: response.token,
                    user: response.user,
                    isNewUser: false
                };
            } else {
                // No token means new user needs to complete registration
                console.log('🆕 NEW USER DETECTED - No token in response');
                
                return {
                    success: true,
                    message: response.message || 'OTP verified successfully',
                    isNewUser: true,
                    user: response.user || { phone: phone }
                };
            }
        }
        
        // Handle error response
        console.log('❌ OTP verification failed:', response.message);
        return {
            success: false,
            message: response.message || 'Invalid OTP. Please try again.',
            error: response.error || 'OTP verification failed'
        };
    } catch (error) {
        console.error("Verify Phone OTP Error:", error.message);
        
        // Provide specific error messages based on error type
        let userMessage = 'Unable to verify OTP. Please check your internet connection and try again.';
        
        if (error.message.includes('Server returned non-JSON response') || 
            error.message.includes('Server returned invalid response')) {
            userMessage = 'OTP service is temporarily unavailable. Please try again later.';
        } else if (error.message.includes('HTTP 404')) {
            userMessage = 'OTP service not found. Please contact support.';
        } else if (error.message.includes('HTTP 500')) {
            userMessage = 'Server error. Please try again later.';
        } else if (error.message.includes('Network request failed')) {
            userMessage = 'Network error. Please check your internet connection.';
        }
        
        return {
            success: false,
            message: userMessage,
            error: error.message
        };
    }
}

/**
 * Complete registration for new user after OTP verification
 * @param {object} userData - User details (fullName, email, phone, dob)
 * @returns {Promise<Object>} The API response with token.
 */
export async function completeRegistration(userData) {
    try {
        console.log('Completing registration for user:', userData);
        
        // Use AUTH_BASE_URL for complete-registration endpoint
        const url = `${AUTH_BASE_URL}${COMPLETE_REGISTRATION_ENDPOINT}`;
        const token = await AsyncStorage.getItem('userToken');
        
        const headers = {
            'Content-Type': 'application/json',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const fetchResponse = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(userData),
        });
        
        if (!fetchResponse.ok) {
            const errorText = await fetchResponse.text();
            console.error('Complete Registration Error Response:', errorText);
            throw new Error(`HTTP ${fetchResponse.status}: ${errorText || 'Registration failed'}`);
        }
        
        const response = await fetchResponse.json();
        
        console.log('Complete Registration Response:', response);
        
        // If response has token directly (successful registration)
        if (response && response.token) {
            // Save token after successful registration
            await AsyncStorage.setItem('userToken', response.token);
            console.log('Token saved after registration:', response.token);
            
            if (response.user?.id) {
                await AsyncStorage.setItem('userId', String(response.user.id));
                console.log('User ID saved:', response.user.id);
            }
            
            return {
                success: true,
                message: response.message || 'Registration completed successfully',
                token: response.token,
                user: response.user
            };
        }
        
        // Check if response indicates success (alternative format)
        if (response && response.success === true) {
            // Save token if present
            if (response.token) {
                await AsyncStorage.setItem('userToken', response.token);
                console.log('Token saved after registration:', response.token);
                
                if (response.user?.id) {
                    await AsyncStorage.setItem('userId', String(response.user.id));
                    console.log('User ID saved:', response.user.id);
                }
            }
            
            return {
                success: true,
                message: response.message || 'Registration completed successfully',
                token: response.token,
                user: response.user
            };
        }
        
        // Handle error response
        return {
            success: false,
            message: response.message || 'Registration failed. Please try again.',
            error: response.error || 'Registration error'
        };
    } catch (error) {
        console.error("Complete Registration Error:", error);
        
        // Provide specific error messages
        let userMessage = 'Unable to complete registration. Please try again.';
        
        if (error.message) {
            if (error.message.includes('404')) {
                userMessage = 'Registration endpoint not found. Please contact support.';
            } else if (error.message.includes('500')) {
                userMessage = 'Server error. Please try again later.';
            } else if (error.message.includes('network') || error.message.includes('timeout')) {
                userMessage = 'Network error. Please check your internet connection.';
            } else {
                userMessage = error.message;
            }
        }
        
        throw new Error(userMessage);
    }
}


/**
 * Handles user logout. 
 * Clears local storage and attempts server-side token revocation.
 */
export async function logout() {
    console.log('🔄 Starting logout - Clearing all user data...');
    
    // 1. Attempt server-side token revocation (token handled by generic post)
    try {
        // Note: No data is sent, token is retrieved from AsyncStorage by 'post'
        await post(LOGOUT_ENDPOINT, {}); 
        console.log('✅ Server-side logout successful');
    } catch (error) {
        // Non-critical error if network fails during logout, as local session is the priority
        console.warn("⚠️ Server side token revocation failed, proceeding with local clear:", error.message);
    }
    
    // 2. CRITICAL: Clear ALL user-related data from local storage
    try {
        await AsyncStorage.multiRemove([
            'userToken',
            'userId',
            'userProfile',
            'fcmToken',
            'avatarUpdatedAt',
            'avatarLocalUri',
            'userLocation',
            'refreshToken'
        ]);
        
        console.log('✅ All user data cleared from AsyncStorage');
        
        // Verify removal
        const remainingToken = await AsyncStorage.getItem('userToken');
        const remainingUserId = await AsyncStorage.getItem('userId');
        console.log('🔍 Verification - Token:', remainingToken, 'UserId:', remainingUserId);
        
    } catch (error) {
        console.error('❌ Error clearing AsyncStorage:', error);
    }
}

/**
 * Utility to retrieve the current user's ID from storage.
 * @returns {Promise<string|null>} The stored user ID.
 */
export async function getUserId() {
    return AsyncStorage.getItem('userId');
}

// Default export combining all functions, including the new getToken()
export default {
    getToken, // <-- ADDED this helper
    signup,
    login,
    logout,
    sendEmailOtp,
    verifyEmailOtp,
    sendPhoneOtp,
    verifyPhoneOtp,
    completeRegistration,
    getUserId, // <-- This is what the referring file needs to access
};
