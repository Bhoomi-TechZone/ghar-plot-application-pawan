import React, { useState } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    ScrollView,
    SafeAreaView, // Added for correct screen display
    Switch, // Added for the example toggle setting
} from 'react-native';
import Icon from "react-native-vector-icons/Ionicons";
import { Alert } from 'react-native';
import { logoutUser } from '../utils/authManager';
import CrossPlatformAlert from '../utils/crossPlatformAlert';

// --- Theme Colors ---
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

// --- Settings Data Structure ---
const sections = [
    {
        title: "Account Settings",
        data: [
            { icon: "person-outline", label: "Edit Profile", screen: "EditProfileScreen", type: "navigate" },
            { icon: "lock-closed-outline", label: "Change Password", screen: "ChangePasswordScreen", type: "navigate" },
            { icon: "eye-off-outline", label: "Privacy Policy", screen: "PrivacySecurity", type: "navigate" },
        ],
    },
    {
        title: "App Preferences",
        data: [
            // Removed: { icon: "notifications-outline", label: "Notifications", screen: "NotificationSettings", type: "navigate" },
            { icon: "earth-outline", label: "Language", screen: "LanguageScreen", type: "navigate" },
            { icon: "moon-outline", label: "Dark Mode", type: "toggle", state: false }, // Example toggle
        ],
    },
    {
        title: "Support",
        data: [
            { icon: "help-circle-outline", label: "Help Center", screen: "HelpScreen", type: "navigate" },
            { icon: "mail-outline", label: "Contact Us", screen: "ContactScreen", type: "navigate" },
            { icon: "information-circle-outline", label: "About App", screen: "AboutScreen", type: "navigate" },
        ],
    },
    {
        title: "Account Actions",
        data: [
            { icon: "log-out-outline", label: "Logout", type: "logout", style: "danger" },
        ],
    },
];

const SettingsScreen = ({ navigation }) => {
    // State for example toggle (Dark Mode)
    const [isDarkMode, setIsDarkMode] = useState(false);

    /**
     * Handles the logout action.
     */
    const handleLogout = async () => {
        CrossPlatformAlert.alert(
            "Logout",
            "Are you sure you want to logout?",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Logout",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await logoutUser(navigation);
                        } catch (error) {
                            console.error('Logout error:', error);
                            CrossPlatformAlert.alert('Error', 'Failed to logout. Please try again.');
                        }
                    }
                }
            ]
        );
    };

    /**
     * Renders an individual setting row item.
     * @param {object} item - The setting data object.
     */
    const renderSettingItem = (item) => {
        const handlePress = () => {
            if (item.type === "navigate" && item.screen) {
                // Navigate to the linked screen
                navigation.navigate(item.screen);
            } else if (item.type === "toggle") {
                // Handle the toggle state change
                setIsDarkMode(prev => !prev);
            } else if (item.type === "logout") {
                // Handle logout action
                handleLogout();
            }
        };

        return (
            <TouchableOpacity 
                key={item.label} 
                style={[styles.settingItem, item.style === "danger" && styles.dangerItem]} 
                onPress={handlePress}
                activeOpacity={0.8}
            >
                <View style={styles.leftContent}>
                    <Icon 
                        name={item.icon} 
                        size={22} 
                        color={item.style === "danger" ? COLORS.redAccent : COLORS.primary} 
                        style={styles.itemIcon} 
                    />
                    <Text style={[styles.itemLabel, item.style === "danger" && styles.dangerLabel]}>
                        {item.label}
                    </Text>
                </View>
                
                {item.type === "toggle" ? (
                    <Switch
                        trackColor={{ false: COLORS.greyLight, true: COLORS.toggleActive }}
                        thumbColor={isDarkMode ? COLORS.white : COLORS.white}
                        ios_backgroundColor={COLORS.greyLight}
                        onValueChange={() => setIsDarkMode(prev => !prev)}
                        value={isDarkMode}
                    />
                ) : (
                    <Icon name="chevron-forward-outline" size={20} color={COLORS.greyLight} />
                )}
            </TouchableOpacity>
        );
    };

    /**
     * Handles the Delete Account action.
     */
    const handleDeleteAccount = () => {
        // In a real app, this would prompt confirmation, delete user data, and navigate to login.
        console.log("User initiating account deletion...");
        navigation.navigate("LoginScreen"); // Assuming navigation to login/onboarding after deletion
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                    <Icon name="arrow-back-outline" size={26} color={COLORS.black} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
            </View>

            {/* Content */}
            <ScrollView style={styles.scrollView}>
                {sections.map((section, index) => (
                    <View key={index} style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>{section.title}</Text>
                        <View style={styles.sectionList}>
                            {section.data.map(renderSettingItem)}
                        </View>
                    </View>
                ))}

                {/* Delete Account Button */}
                <TouchableOpacity
                    style={styles.deleteAccountButton}
                    onPress={handleDeleteAccount}
                    activeOpacity={0.8}
                >
                    <Icon name="trash-outline" size={20} color={COLORS.white} />
                    <Text style={styles.deleteAccountText}>Delete Account</Text>
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
    // --- ScrollView & Sections ---
    scrollView: {
        paddingTop: 10,
    },
    sectionContainer: {
        marginBottom: 20,
        paddingHorizontal: 15,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.greyText,
        textTransform: 'uppercase',
        marginBottom: 8,
        marginLeft: 5,
    },
    sectionList: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.greyLight,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.background, 
    },
    leftContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    itemIcon: {
        marginRight: 15,
    },
    itemLabel: {
        fontSize: 16,
        color: COLORS.black,
        fontWeight: '500',
    },
    dangerLabel: {
        color: COLORS.redAccent,
        fontWeight: '600',
    },
    // --- Delete Account Button (Replaced Logout) ---
    deleteAccountButton: {
        flexDirection: 'row',
        backgroundColor: COLORS.redAccent, // Retains the red for a destructive action
        paddingVertical: 15,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 15,
        marginTop: 10,
        marginBottom: 50,
        shadowColor: COLORS.redAccent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 6,
    },
    deleteAccountText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 10,
    },
});

export default SettingsScreen;
