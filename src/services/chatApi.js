// src/services/chatApi.js

import AsyncStorage from '@react-native-async-storage/async-storage';
// 🚨 IMPORTANT: You may need to install '@react-native-async-storage/async-storage'

// --- CRITICAL FIX ZONE: Implement REAL Token Retrieval ---
// This must return the JWT token of the currently logged-in user.
const getAuthToken = async () => {
    try {
        // 🚨 REPLACE 'userToken' with the actual key you use to store the JWT after login
        const token = await AsyncStorage.getItem('userToken');
        if (!token) {
            console.warn("Auth token is missing from storage!");
        }
        return token;
    } catch (e) {
        console.error("Failed to retrieve token:", e);
        return null; // Return null on failure
    }
};

const getCurrentUserId = async () => {
    try {
        const userId = await AsyncStorage.getItem('userId');
        if (!userId) {
            console.warn("User ID is missing from storage!");
        }
        return userId;
    } catch (e) {
        console.error("Failed to retrieve userId:", e);
        return null;
    }
};
// --------------------------------------------------------

const BASE_URL = 'https://ghar-plot-backend1.onrender.com/api/chat';

/**
 * Initiates or retrieves an existing chat between the current user and a receiver.
 */
export const getOrCreateChat = async (receiverId) => {
    // NOTE: getAuthToken is now asynchronous
    const token = await getAuthToken();
    if (!token) {
        throw new Error("Authentication Failed: Token not found.");
    }

    try {
        const response = await fetch(`${BASE_URL}/get-or-create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Sending the token in the Authorization header
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ receiverId }),
        });

        if (!response.ok) {
            // This catches the 403 Forbidden error
            const errorData = await response.json().catch(() => ({ message: 'No response body' }));
            throw new Error(`HTTP error! Status: ${response.status}. Message: ${errorData.message || 'Unknown server error'}`);
        }

        const data = await response.json();
        return data.chat;
    } catch (error) {
        console.error("Error in getOrCreateChat:", error);
        throw error;
    }
};

/**
 * Sends a message via the REST API (used as a fallback).
 */
export const sendMessageApi = async (chatId, text) => {
    const token = await getAuthToken();
    if (!token) {
        throw new Error("Authentication Failed: Token not found.");
    }

    try {
        const response = await fetch(`${BASE_URL}/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ chatId, text }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'No response body' }));
            throw new Error(`HTTP error! Status: ${response.status}. Message: ${errorData.message || 'Unknown error'}`);
        }

        const data = await response.json();
        return data.message;
    } catch (error) {
        console.error('Error in sendMessageApi:', error);
        throw error;
    }
};

/**
 * Retrieve the list of chats/conversations for the current user.
 * Expected server response: { chats: [ { _id, participants, lastMessage, updatedAt, unreadCount, meta... } ] }
 * Fallbacks are applied if the server returns a different shape.
 */
export const getChats = async () => {
    const token = await getAuthToken();
    if (!token) throw new Error('Authentication Failed: Token not found.');
    // Primary endpoint based on backend controller: /api/chat/history
    const primary = `${BASE_URL}/history`;
    try {
        const res = await fetch(primary, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: 'No response' }));
            throw new Error(`HTTP error! Status: ${res.status}. Message: ${err.message || 'Unknown'}`);
        }

        const data = await res.json();
        if (Array.isArray(data.chats)) return data.chats;
        if (Array.isArray(data.data)) return data.data;
        if (Array.isArray(data)) return data;
        if (data.success && Array.isArray(data.chats)) return data.chats;
        if (data.payload && Array.isArray(data.payload)) return data.payload;
        return [];
    } catch (err) {
        console.warn('getChats primary endpoint failed:', err && err.message ? err.message : err);
        // Last-resort: try different endpoint paths
        try {
            const fallback = `${BASE_URL}/history/list`;
            const res2 = await fetch(fallback, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            });
            if (!res2.ok) {
                const err2 = await res2.json().catch(() => ({ message: 'No response' }));
                console.warn(`getChats fallback ${fallback} returned ${res2.status}`, err2);
                return [];
            }
            const data2 = await res2.json().catch(() => null);
            if (!data2) return [];
            if (Array.isArray(data2.chats)) return data2.chats;
            if (Array.isArray(data2.data)) return data2.data;
            if (Array.isArray(data2)) return data2;
            return [];
        } catch (err2) {
            console.error('getChats failed both primary and fallback:', err2);
            return [];
        }
    }
};

/**
 * Delete a chat by id. Endpoint: DELETE /api/chat/:chatId
 */
export const deleteChat = async (chatId) => {
    const token = await getAuthToken();
    if (!token) throw new Error('Authentication Failed: Token not found.');

    try {
        const res = await fetch(`${BASE_URL}/${chatId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: 'No response' }));
            throw new Error(`HTTP error! Status: ${res.status}. Message: ${err.message || 'Unknown'}`);
        }

        const data = await res.json().catch(() => ({}));
        return data;
    } catch (err) {
        console.error('deleteChat failed:', err);
        throw err;
    }
};

/**
 * Get a single chat by its id. Uses GET /api/chat/:chatId
 */
export const getChatById = async (chatId) => {
    const token = await getAuthToken();
    if (!token) throw new Error('Authentication Failed: Token not found.');

    try {
        const res = await fetch(`${BASE_URL}/${chatId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });

        if (res.ok) {
            const data = await res.json().catch(() => null);
            if (!data) return null;
            if (data.chat) return data.chat;
            return data;
        }

        // If the server returns 404 or other non-ok, try a safe fallback: fetch chat list and find the chat there.
        console.warn(`getChatById: server returned ${res.status}, attempting fallback to chat list`);
        try {
            const list = await getChats();
            if (Array.isArray(list) && list.length) {
                const found = list.find(c => (c.chatId && String(c.chatId) === String(chatId)) || (c._id && String(c._id) === String(chatId)) || (c.id && String(c.id) === String(chatId)));
                if (found) return found;
            }
        } catch (fallbackErr) {
            console.warn('getChatById fallback getChats() failed:', fallbackErr && fallbackErr.message ? fallbackErr.message : fallbackErr);
        }

        // If fallback didn't find it, surface an informative error
        const errBody = await res.json().catch(() => ({ message: 'No response' }));
        throw new Error(`HTTP error! Status: ${res.status}. Message: ${errBody.message || 'Unknown'}`);
    } catch (err) {
        console.error('getChatById failed:', err && err.message ? err.message : err);
        throw err;
    }
};

/**
 * Mark a chat as read for the current user.
 * Tries a few common endpoint shapes to be resilient to backend differences.
 */
export const markChatAsRead = async (chatId) => {
    const token = await getAuthToken();
    if (!token) return null;

    const attempts = [
        { method: 'POST', url: `${BASE_URL}/mark-read`, body: { chatId } },
        { method: 'POST', url: `${BASE_URL}/read`, body: { chatId } },
        { method: 'PATCH', url: `${BASE_URL}/${chatId}/read`, body: null },
        { method: 'PATCH', url: `${BASE_URL}/${chatId}`, body: { unreadCount: 0 } },
    ];

    for (const a of attempts) {
        try {
            const opts = { method: a.method, headers: { 'Authorization': `Bearer ${token}` } };
            if (a.body) {
                opts.headers['Content-Type'] = 'application/json';
                opts.body = JSON.stringify(a.body);
            }
            const res = await fetch(a.url, opts);
            if (res.ok) {
                const data = await res.json().catch(() => ({}));
                return data;
            }
        } catch (e) {
            // ignore and try next
            console.warn('markChatAsRead attempt failed:', e && e.message ? e.message : e);
        }
    }

    return null;
};

export { getAuthToken, getCurrentUserId };
