/**
 * userapi.js
 * Handles all API interactions related to user profile data.
 * FIX: Enhanced handleResponse to construct absolute URL for the 'avatar' field,
 * ensuring the image displays correctly in the React Native <Image> component.
 */
// NOTE: getToken is imported to access token retrieval function
import { getToken } from './authApi';

// CRITICAL: Define two separate URLs:
// 1. BASE_URL for API calls (includes /api)
// 2. SERVER_ROOT for static assets (images, uploads)
const API_BASE_URL = 'https://ghar-plot-backend1.onrender.com/api';
const SERVER_ROOT = 'https://gharplotbackend.gntechnology.de'; // Root URL for image assets

// Helper function to ensure URL is absolute using the SERVER_ROOT for assets
const makeAbsoluteUrl = (path) => {
    if (!path) return null;
    // 1. If it's already an absolute URL, return it
    if (path.startsWith('http')) {
        return path;
    }
    // 2. If it's a relative path (e.g., /uploads/image.jpg), prepend the SERVER_ROOT
    const cleanRoot = SERVER_ROOT.replace(/\/+$/, ''); // Remove trailing slash
    const cleanPath = path.replace(/^\/+/, '');    // Remove leading slash
    return `${cleanRoot}/${cleanPath}`;
};


// Helper function to handle fetch response and check for HTTP errors
const handleResponse = async (response) => {
    if (!response.ok) {
        let errorText = `HTTP error! Status: ${response.status}`;

        // Check for authentication errors (401 Unauthorized, 403 Forbidden)
        if (response.status === 401 || response.status === 403) {
            console.log('🔒 Authentication error detected:', response.status);
            try {
                const errorBody = await response.json();
                errorText = errorBody.message || 'Session expired. Please login again.';
            } catch (e) {
                errorText = 'Session expired. Please login again.';
            }
            throw new Error(errorText);
        }

        try {
            const errorBody = await response.json();
            // Try to extract a specific error message from the response body
            errorText = errorBody.message || errorBody.error || errorText;
        } catch (e) {
            // If response body is not JSON, use status text
            errorText = `HTTP error! Status: ${response.status} (${response.statusText})`;
        }
        throw new Error(errorText);
    }
    // Check if the response is empty (e.g., PUT request returning 204 No Content)
    if (response.status === 204 || response.headers.get('content-length') === '0') {
        return {};
    }

    const data = await response.json();

    // Extract the 'user' object
    const user = data.user || data;
    // Helper: normalize a media entry (string path or object with url)
    const normalizeMediaEntry = (entry) => {
        if (!entry) return null;
        if (typeof entry === 'string') return makeAbsoluteUrl(entry);
        if (entry && typeof entry === 'object') {
            // common shapes: { url: '/uploads/..' } or { uri: 'http...' }
            if (entry.url) return makeAbsoluteUrl(entry.url);
            if (entry.uri) return makeAbsoluteUrl(entry.uri);
        }
        return null;
    };

    // Normalize avatar field to absolute URL
    if (user.avatar) {
        user.avatar = normalizeMediaEntry(user.avatar);
    }

    // Normalize photosAndVideo array entries to absolute URLs (if present)
    if (Array.isArray(user.photosAndVideo) && user.photosAndVideo.length > 0) {
        user.photosAndVideo = user.photosAndVideo.map(p => normalizeMediaEntry(p)).filter(Boolean);
    }

    // Fallback: if avatar missing, try first photo; otherwise set default avatar
    const defaultAvatar = makeAbsoluteUrl('/uploads/1761387482206-property2.jpeg');
    if (!user.avatar) {
        if (Array.isArray(user.photosAndVideo) && user.photosAndVideo.length > 0 && user.photosAndVideo[0]) {
            user.avatar = user.photosAndVideo[0];
        } else {
            user.avatar = defaultAvatar;
        }
    }

    // Debug log to confirm the final avatar URL used by the frontend
    try {
        console.log('[userapi] resolved avatar URL:', user.avatar);
    } catch (e) {
        // ignore logging errors
    }

    return user;
};


/**
 * GET: Fetches the profile data for a specific user ID. (Standard legacy route)
 * @param {string} userId - The ID of the user to fetch.
 * @returns {Promise<object>} - The user profile data.
 */
export async function getUserProfile(userId) {
    if (!userId) throw new Error("User ID is required for fetching profile.");

    // Get the JWT token using the helper function from authapi
    const token = await getToken();
    if (!token) throw new Error("Authentication token missing. Please log in.");

    const url = `${API_BASE_URL}/users/${userId}`;
    console.log(`Fetching profile from: ${url}`);

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    return handleResponse(response);
}

/**
 * GET: Fetches the profile data for the currently authenticated user (New Route).
 * Endpoint: /users/user 
 * @returns {Promise<object>} - The user profile data (including counts).
 */
export async function getCurrentUserProfile() {
    const token = await getToken();
    if (!token) throw new Error("Authentication token missing. Please log in.");

    // This is the direct endpoint from your cURL command
    const url = `${API_BASE_URL}/users/user`;
    console.log(`Fetching current user profile from: ${url}`);

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    return handleResponse(response);
}


/**
 * PUT: Updates the user profile.
 * @param {string} userId - The ID of the user to update.
 * @param {object} profileData - Data to update (e.g., { fullName, email, phone, profilePicture }).
 * @returns {Promise<object>} - The updated user profile or an empty object on success.
 */
/**
 * PUT: Updates the user profile.
 * Supports two forms:
 *  - updateUserProfile(profileData) -> calls PUT /users/edit-profile (uses authenticated user)
 *  - updateUserProfile(userId, profileData) -> calls PUT /users/edit-profile/:userId (legacy)
 *
 * The backend expects multipart/form-data and the uploaded file field named `photoAndVideo`.
 * Accepts a single file (profileData.profilePicture) or an array (profileData.photoAndVideo).
 */
export async function updateUserProfile(userIdOrProfileData, maybeProfileData) {
    // Backwards-compatible signature handling
    let userId = null;
    let profileData = null;
    if (maybeProfileData === undefined) {
        // Called with (profileData)
        profileData = userIdOrProfileData || {};
    } else {
        // Called with (userId, profileData)
        userId = userIdOrProfileData;
        profileData = maybeProfileData || {};
    }

    const token = await getToken();
    if (!token) throw new Error("Authentication token missing. Please log in.");

    const url = userId ? `${API_BASE_URL}/users/edit-profile/${userId}` : `${API_BASE_URL}/users/edit-profile`;
    console.log(`Updating profile at: ${url}`);

    // Create the FormData object for multipart/form-data
    const formData = new FormData();

    // 1. Append text fields
    if (profileData.fullName) formData.append('fullName', profileData.fullName);
    if (profileData.email) formData.append('email', profileData.email);
    if (profileData.phone) formData.append('phone', profileData.phone);

    // 2. Append files using the field name expected by the backend: 'photoAndVideo'
    // Support multiple files (array) or a single file object
    const appendFile = (file, idx) => {
        if (!file) return;
        // Accept either an object with { uri, type, fileName } or a plain uri string
        if (typeof file === 'string') {
            // try to guess filename
            const guessedName = file.split('/').pop() || `photo_${Date.now()}.jpg`;
            formData.append('photoAndVideo', {
                uri: file,
                type: 'image/jpeg',
                name: guessedName,
            });
        } else if (file && typeof file === 'object') {
            formData.append('photoAndVideo', {
                uri: file.uri,
                type: file.type || file.mimeType || 'image/jpeg',
                name: file.fileName || file.name || `photo_${idx || Date.now()}.jpg`,
            });
        }
    };

    if (Array.isArray(profileData.photoAndVideo) && profileData.photoAndVideo.length > 0) {
        profileData.photoAndVideo.forEach((f, i) => appendFile(f, i));
    } else if (profileData.profilePicture) {
        // legacy key: profilePicture -> map to photoAndVideo
        appendFile(profileData.profilePicture, 0);
    }

    // When sending FormData, DO NOT manually set 'Content-Type'.
    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            // IMPORTANT: Do NOT set 'Content-Type': 'multipart/form-data' manually here!
        },
        body: formData,
    });

    return handleResponse(response);
}

// Export functions for use in screens
export default {
    getUserProfile,
    updateUserProfile,
    getCurrentUserProfile, // Export the new function
};
