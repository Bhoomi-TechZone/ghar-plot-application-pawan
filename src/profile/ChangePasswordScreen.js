import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput, // Added for input fields
    ScrollView,
    SafeAreaView,
    Alert, // Using Alert for placeholder messaging as it's standard in RN
} from 'react-native';
import Icon from "react-native-vector-icons/Ionicons";
import CrossPlatformAlert from '../utils/crossPlatformAlert';

// --- Theme Colors (Copied for consistency) ---
const COLORS = {
    primary: "#FF7A00",
    secondary: "#4CAF50", // Green
    background: "#F4F7F9",
    white: "#FFFFFF",
    black: "#333333",
    greyText: "#757575",
    greyLight: "#E0E0E0",
    redAccent: "#D32F2F",
    toggleActive: "#4CAF50",
};

const ChangePasswordScreen = ({ navigation }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    const handleChangePassword = () => {
        setError(''); // Clear previous errors

        if (!currentPassword || !newPassword || !confirmPassword) {
            setError('All fields are required.');
            return;
        }

        if (newPassword.length < 6) {
            setError('New password must be at least 6 characters long.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('New password and confirmation do not match.');
            return;
        }
        
        // --- REAL WORLD LOGIC PLACEHOLDER ---
        // In a real application, you would perform these steps:
        // 1. Verify currentPassword with the backend (re-authentication).
        // 2. If valid, update the password with the newPassword.
        
        console.log("Password change initiated with new password length:", newPassword.length);
        
        // Simulating a successful update
        CrossPlatformAlert.alert(
            "Success",
            "Your password has been updated!",
            [{ text: "OK", onPress: () => navigation.goBack() }]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="arrow-back-outline" size={26} color={COLORS.black} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Change Password</Text>
            </View>

            {/* Content */}
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
                
                <Text style={styles.instructionText}>
                    Please enter your current password, then choose a strong new password.
                </Text>

                {/* Current Password Input */}
                <Text style={styles.inputLabel}>Current Password</Text>
                <TextInput
                    style={styles.input}
                    secureTextEntry={true}
                    placeholder="Enter current password"
                    placeholderTextColor={COLORS.greyText}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                />

                {/* New Password Input */}
                <Text style={styles.inputLabel}>New Password</Text>
                <TextInput
                    style={styles.input}
                    secureTextEntry={true}
                    placeholder="Enter new password (min 6 characters)"
                    placeholderTextColor={COLORS.greyText}
                    value={newPassword}
                    onChangeText={setNewPassword}
                />

                {/* Confirm New Password Input */}
                <Text style={styles.inputLabel}>Confirm New Password</Text>
                <TextInput
                    style={styles.input}
                    secureTextEntry={true}
                    placeholder="Confirm new password"
                    placeholderTextColor={COLORS.greyText}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                />

                {/* Error Message */}
                {error ? (
                    <Text style={styles.errorText}>
                        <Icon name="alert-circle-outline" size={14} color={COLORS.redAccent} /> {error}
                    </Text>
                ) : null}

                {/* Save Button */}
                <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleChangePassword}
                    activeOpacity={0.8}
                >
                    <Text style={styles.saveButtonText}>Save Changes</Text>
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
    },
    instructionText: {
        fontSize: 15,
        color: COLORS.greyText,
        marginBottom: 25,
        lineHeight: 22,
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
    saveButtonText: {
        color: COLORS.white,
        fontSize: 18,
        fontWeight: '700',
    },
});

export default ChangePasswordScreen;
