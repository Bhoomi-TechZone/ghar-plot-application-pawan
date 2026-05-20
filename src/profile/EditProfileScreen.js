/**
 * EditProfileScreen.js
 * Screen for editing user name, email, and phone, integrated with API service.
 */
import React, { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    SafeAreaView,
    Alert,
    ActivityIndicator,
    Image,
    Platform,
} from 'react-native';
import Icon from "react-native-vector-icons/Ionicons";
import { useFocusEffect } from '@react-navigation/native'; // Used to trigger data fetch when screen is active

// Import API services
// FIX: Changed relative path from './' to '../' assuming API files are one level up from the screens directory
import { getUserId } from '../services/authApi';
import { getUserProfile, getCurrentUserProfile, updateUserProfile } from '../services/userapi'; 
import CrossPlatformAlert from '../utils/crossPlatformAlert';

// Try to require react-native-image-picker if available; show instructions otherwise
let ImagePicker = null;
try {
    ImagePicker = require('react-native-image-picker');
} catch (e) {
    ImagePicker = null;
}

// --- Theme Colors (Copied for consistency from SettingsScreen) ---
const COLORS = {
    primary: "#FF7A00",
    background: "#F4F7F9",
    white: "#FFFFFF",
    black: "#333333",
    greyText: "#757575",
    greyLight: "#E0E0E0",
    redAccent: "#D32F2F",
    secondary: "#4CAF50",
};

const EditProfileScreen = ({ navigation }) => {
    // State for user inputs
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [selectedImage, setSelectedImage] = useState(null); // { uri, type, fileName }
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [avatarVersion, setAvatarVersion] = useState(Date.now());
    
    // API Call States
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    // Function to load profile data from API
    const loadProfileData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            // Use authenticated current-user endpoint to avoid 404 for /users/:id
            const data = await getCurrentUserProfile();

            // Populate state with fetched data
            setName(data.fullName || data.name || '');
            setEmail(data.email || '');
            setPhone(data.phone || '');
            // Prefer photosAndVideo[0] for avatar
            const firstMedia = (Array.isArray(data.photosAndVideo) && data.photosAndVideo.length > 0)
                ? data.photosAndVideo[0]
                : (data.avatar || null);
            setAvatarUrl(firstMedia);
            // bump version to force image reload when profile data changes
            setAvatarVersion(Date.now());

        } catch (err) {
            console.error("Failed to load profile data:", err);
            setError('Failed to load profile data. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    // Load data when the screen is focused
    useFocusEffect(
        useCallback(() => {
            loadProfileData();
            return () => {}; // Cleanup function
        }, [loadProfileData])
    );


    const handleSave = async () => {
        setError('');
        
        // Basic local validation
        if (!name || !email || !phone) {
            setError('Please fill out all required fields.');
            return;
        }

        if (!email.includes('@')) {
            setError('Please enter a valid email address.');
            return;
        }

        setIsSaving(true);

        try {
            // Prepare update payload matching backend ('fullName' per provided curl)
            const updates = { 
                fullName: name, 
                email: email, 
                phone: phone 
            };

            // If user selected an image, attach it as photoAndVideo (server expects this field)
            if (selectedImage) {
                updates.photoAndVideo = [selectedImage];
            }

            // Call the no-userId endpoint: PUT /api/users/edit-profile
            const updated = await updateUserProfile(updates);
            // If API returns updated user, prefer photosAndVideo[0] to update avatarUrl so this screen shows the new image immediately
            if (updated) {
                const updatedFirst = (Array.isArray(updated.photosAndVideo) && updated.photosAndVideo.length > 0)
                    ? updated.photosAndVideo[0]
                    : (updated.avatar || null);
                if (updatedFirst) {
                    setAvatarUrl(updatedFirst);
                    setAvatarVersion(Date.now());
                }
            }
            // clear selected image (we uploaded it)
            setSelectedImage(null);
            // If we uploaded an image, store a short-lived flag and the local URI so ProfileScreen can show it optimistically
            try {
                if (selectedImage && selectedImage.uri) {
                    await AsyncStorage.setItem('avatarUpdatedAt', Date.now().toString());
                    await AsyncStorage.setItem('avatarLocalUri', selectedImage.uri);
                }
            } catch (e) {
                // ignore storage errors
            }

            CrossPlatformAlert.alert(
                "Success",
                "Your profile details have been updated successfully!",
                [{ text: "OK", onPress: () => navigation.goBack() }]
            );

        } catch (err) {
            console.error("Profile update failed:", err);
            // Attempt to extract friendly message from error
            const errorMessage = err.message.includes("HTTP error") 
                                ? "Update failed: " + err.message.split('Message:')[1]?.trim() 
                                : "Failed to save changes. Please check your connection.";
            setError(errorMessage);
            CrossPlatformAlert.alert("Error", "Failed to save profile changes.");

        } finally {
            setIsSaving(false);
        }
    };

    // --- Conditional Rendering: Loading State ---
    if (loading) {
        return (
            <SafeAreaView style={[styles.container, styles.centerContent]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading profile data...</Text>
            </SafeAreaView>
        );
    }
    
    // --- Conditional Rendering: Main Form ---
    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="arrow-back-outline" size={26} color={COLORS.black} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Profile</Text>
            </View>

            {/* Content */}
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
                
                {/* Profile Image/Avatar Section */}
                <View style={styles.avatarContainer}>
                    {selectedImage ? (
                        <Image source={{ uri: selectedImage.uri }} style={{ width: 100, height: 100, borderRadius: 50 }} />
                    ) : avatarUrl ? (
                        (() => {
                            let uri = avatarUrl;
                            try {
                                const low = (avatarUrl || '').toLowerCase();
                                if (low.startsWith('http://') || low.startsWith('https://')) {
                                    const sep = avatarUrl.includes('?') ? '&' : '?';
                                    uri = avatarUrl + sep + 'v=' + avatarVersion;
                                }
                            } catch (e) {
                                uri = avatarUrl;
                            }
                            return <Image source={{ uri }} style={{ width: 100, height: 100, borderRadius: 50 }} />;
                        })()
                    ) : (
                        <Icon name="person-circle-outline" size={100} color={COLORS.primary} />
                    )}

                    <TouchableOpacity style={styles.changeAvatarButton} onPress={async () => {
                        // Launch image picker (if available)
                        if (!ImagePicker) {
                            CrossPlatformAlert.alert(
                                'Image Picker Missing',
                                'Please install react-native-image-picker to select images. Run: npm install react-native-image-picker and follow linking instructions.'
                            );
                            return;
                        }

                        const options = { mediaType: 'photo', quality: 0.8 };
                        ImagePicker.launchImageLibrary(options, (response) => {
                            if (response.didCancel) return;
                            if (response.errorCode) {
                                CrossPlatformAlert.alert('ImagePicker Error', response.errorMessage || response.error || 'Unknown error');
                                return;
                            }
                            const asset = (response.assets && response.assets[0]) || null;
                            if (!asset) return;
                            const uri = asset.uri;
                            setSelectedImage({ uri, type: asset.type, fileName: asset.fileName });
                        });
                    }}>
                        <Text style={styles.changeAvatarText}>Change Photo</Text>
                    </TouchableOpacity>
                </View>

                {/* Name Input */}
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter your full name"
                    placeholderTextColor={COLORS.greyText}
                    value={name}
                    onChangeText={setName}
                    editable={!isSaving}
                />

                {/* Email Input - Generally read-only for security */}
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor={COLORS.greyText}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                    editable={!isSaving}
                />

                {/* Phone Input */}
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter your phone number"
                    placeholderTextColor={COLORS.greyText}
                    keyboardType="phone-pad"
                    maxLength={15} 
                    value={phone}
                    onChangeText={setPhone}
                    editable={!isSaving}
                />
                
                {/* Error Message */}
                {error ? (
                    <Text style={styles.errorText}>
                        <Icon name="alert-circle-outline" size={14} color={COLORS.redAccent} /> {error}
                    </Text>
                ) : null}

                {/* Save Button */}
                <TouchableOpacity
                    style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    activeOpacity={0.8}
                    disabled={isSaving}
                >
                    {isSaving ? (
                        <ActivityIndicator color={COLORS.white} />
                    ) : (
                        <Text style={styles.saveButtonText}>Save Changes</Text>
                    )}
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
};

// ----------------------------------------------------------------
// ## Stylesheet
// ----------------------------------------------------------------
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: COLORS.greyText,
    },
    // --- Header Styles ---
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 15,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.greyLight,
        elevation: 2,
    },
    backButton: {
        paddingRight: 15,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.black,
    },
    // --- Content & ScrollView ---
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
        paddingBottom: 50, // Ensure space below the button
    },
    // --- Avatar Section ---
    avatarContainer: {
        alignItems: 'center',
        marginBottom: 30,
        marginTop: 10,
    },
    changeAvatarButton: {
        marginTop: 10,
        paddingVertical: 5,
        paddingHorizontal: 15,
        borderRadius: 20,
        backgroundColor: COLORS.greyLight,
    },
    changeAvatarText: {
        color: COLORS.black,
        fontSize: 14,
        fontWeight: '600',
    },
    // --- Input Styles ---
    inputLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.black,
        marginBottom: 8,
        marginTop: 15,
    },
    input: {
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.greyLight,
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 16,
        color: COLORS.black,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 1,
        elevation: 1,
    },
    errorText: {
        marginTop: 15,
        fontSize: 14,
        color: COLORS.redAccent,
        fontWeight: '500',
    },
    // --- Button Styles ---
    saveButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: 15,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 30,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 6,
    },
    saveButtonDisabled: {
        backgroundColor: COLORS.greyText, // Style for disabled state
    },
    saveButtonText: {
        color: COLORS.white,
        fontSize: 18,
        fontWeight: '700',
    },
});

export default EditProfileScreen;
