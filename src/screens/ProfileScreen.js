/**
 * ProfileScreen.js
 * Enhanced UI with modern design patterns
 */
import React, { useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    ScrollView,
    StatusBar,
    Platform,
    Linking,
    Share,
    ToastAndroid,
} from 'react-native';
import Icon from "react-native-vector-icons/Ionicons";
import FeatherIcon from "react-native-vector-icons/Feather";
import FontAwesomeIcon from "react-native-vector-icons/FontAwesome";
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// NOTE: Ensure this path is correct for your project structure
import { getCurrentUserProfile } from '../services/userapi';
import { clearUserCredentials } from '../utils/authManager'; 

// --- Enhanced Color Scheme ---
const COLORS = {
    primary: "#1E90FF",
    primaryDark: "#0B5ED7",
    background: "#F9FAFB",
    white: "#FFFFFF",
    black: "#1F2937",
    greyText: "#6B7280",
    greyLight: "#E5E7EB",
    redAccent: "#EF4444",
    cardBackground: "#FFFFFF",
    blueHeader: "#1E90FF",
    premiumGold: "#F59E0B",
    premiumGoldLight: "#FEF3C7",
    secondaryText: "#6B7280",
    success: "#10B981",
};

const ProfileScreen = ({ navigation }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [shortlistedCount, setShortlistedCount] = useState(0);
    const [myListingsCount, setMyListingsCount] = useState(0);
    const [enquiriesCount, setEnquiriesCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [avatar, setAvatar] = useState(null);
    const [avatarVersion, setAvatarVersion] = useState(Date.now());

    const insets = useSafeAreaInsets();
    const statusBarTop = insets.top > 0 ? insets.top : (Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0);

    const loadProfileData = useCallback(async () => {
        setLoading(true);
        setError('');
        
        try {
            // First, check if user is fully registered
            const cachedProfile = await AsyncStorage.getItem('userProfile');
            
            if (cachedProfile) {
                const data = JSON.parse(cachedProfile);
                
                // Check if user is fully registered
                const isFullyRegistered = 
                    data.email && 
                    data.email.trim() !== '' && 
                    data.fullName && 
                    data.fullName !== 'User' &&
                    data.fullName.trim() !== '';
                
                if (!isFullyRegistered) {
                    // New user - Show default/placeholder data
                    console.log('ℹ️ New user detected - Showing default profile data');
                    setName('Guest User');
                    setEmail('Complete your registration');
                    setShortlistedCount(0);
                    setMyListingsCount(0);
                    setEnquiriesCount(0);
                    setAvatar(null);
                    setAvatarVersion(Date.now());
                    setLoading(false);
                    return; // Exit early - no API call needed
                }
                
                // Fully registered user - Try to fetch from API first
                console.log('✅ Fully registered user - Fetching from API...');
                try {
                    const apiData = await getCurrentUserProfile();
                    const fullName = apiData.fullName || apiData.name || apiData.full_name || data.fullName;

                    setName(fullName);
                    setEmail(apiData.email || data.email);
                    setShortlistedCount(apiData.shortlistedCount || 0);
                    setMyListingsCount(apiData.myListingsCount || 0);
                    setEnquiriesCount(apiData.enquiriesCount || 0);
                    
                    // Load avatar from API or cached data
                    const avatarUrl = (Array.isArray(apiData.photosAndVideo) && apiData.photosAndVideo.length > 0)
                        ? apiData.photosAndVideo[0]
                        : (apiData.avatar || apiData.profileImage || apiData.photo || apiData.image || null);
                    
                    // Check for local optimistic avatar
                    const updatedAt = await AsyncStorage.getItem('avatarUpdatedAt');
                    const localUri = await AsyncStorage.getItem('avatarLocalUri');

                    if (updatedAt && localUri) {
                        setAvatar(localUri);
                        setAvatarVersion(Date.now());
                        pollForServerAvatar(avatarUrl, /*maxAttempts=*/6, /*intervalMs=*/1000).catch(() => {});
                    } else {
                        setAvatar(avatarUrl);
                        setAvatarVersion(Date.now());
                    }
                    
                    setLoading(false);
                    console.log('✅ Profile loaded successfully from API');
                    return;
                } catch (apiError) {
                    // API failed - Fall back to cached data
                    console.log('⚠️ API failed, using cached profile data:', apiError.message);
                    const fullName = data.fullName || data.name || data.full_name || 'N/A';

                    setName(fullName);
                    setEmail(data.email || 'N/A');
                    setShortlistedCount(data.shortlistedCount || 0);
                    setMyListingsCount(data.myListingsCount || 0);
                    setEnquiriesCount(data.enquiriesCount || 0);
                    
                    const avatarUrl = (Array.isArray(data.photosAndVideo) && data.photosAndVideo.length > 0)
                        ? data.photosAndVideo[0]
                        : (data.avatar || data.profileImage || data.photo || data.image || null);
                    setAvatar(avatarUrl);
                    setAvatarVersion(Date.now());
                    
                    setLoading(false);
                    console.log('✅ Profile loaded from cache after API failure');
                    return;
                }
            }
            
            // If no cached profile at all, try API call
            console.log('ℹ️ No cached profile, fetching from API...');
            const data = await getCurrentUserProfile();
            const fullName = data.fullName || data.name || data.full_name || 'N/A';

            setName(fullName);
            setEmail(data.email || 'N/A');
            setShortlistedCount(data.shortlistedCount || 0);
            setMyListingsCount(data.myListingsCount || 0);
            setEnquiriesCount(data.enquiriesCount || 0);
            // Prefer photosAndVideo[0] as the source of truth for user media
            const avatarUrl = (Array.isArray(data.photosAndVideo) && data.photosAndVideo.length > 0)
                ? data.photosAndVideo[0]
                : (data.avatar || data.profileImage || data.photo || data.image || null);
            // if avatar updated recently (from EditProfile), prefer local optimistic uri first
            const updatedAt = await AsyncStorage.getItem('avatarUpdatedAt');
            const localUri = await AsyncStorage.getItem('avatarLocalUri');

            if (updatedAt && localUri) {
                // If localUri exists, use it optimistically and then poll server for final image
                setAvatar(localUri);
                setAvatarVersion(Date.now());
                // start background polling to replace with server avatar once available
                pollForServerAvatar(avatarUrl, /*maxAttempts=*/6, /*intervalMs=*/1000).catch(() => {});
            } else {
                setAvatar(avatarUrl);
                setAvatarVersion(Date.now());
            }
        } catch (err) {
            console.error("Profile API call failed:", err);
            
            // Check if error is due to invalid/expired token (403 or 401)
            if (err.message && (err.message.includes('403') || err.message.includes('401') || 
                err.message.includes('Invalid or expired token') || err.message.includes('Unauthorized'))) {
                console.warn('🚪 Token expired or invalid - Auto logout initiated');
                
                // Clear all user credentials
                await clearUserCredentials();
                
                // Navigate to login screen and reset navigation stack
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'LoginScreen' }],
                });
                
                return; // Exit early, don't show error
            }
            
            // Check if error is "User not found" - Load from AsyncStorage instead
            if (err.message && err.message.includes('User not found')) {
                console.warn('⚠️ User profile not found in backend - Loading from local storage');
                
                try {
                    // Load user data from AsyncStorage
                    const userId = await AsyncStorage.getItem('userId');
                    const userProfile = await AsyncStorage.getItem('userProfile');
                    
                    if (userProfile) {
                        const data = JSON.parse(userProfile);
                        setName(data.fullName || data.name || 'User');
                        setEmail(data.email || 'N/A');
                        setShortlistedCount(0);
                        setMyListingsCount(0);
                        setEnquiriesCount(0);
                        console.log('✅ Loaded profile from AsyncStorage');
                        setLoading(false);
                        return; // Successfully loaded from local
                    }
                    
                    // If no profile in storage, use default values
                    setName('User');
                    setEmail('N/A');
                    console.log('ℹ️ Using default profile values');
                    setLoading(false);
                    return;
                    
                } catch (storageError) {
                    console.error('Error loading from AsyncStorage:', storageError);
                }
            }
            
            let errorMessage = err.message.includes("HTTP error") ? err.message : 'Could not load profile. Please try again.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [navigation]);

    // Poll server until avatar changes from the given oldAvatar or until attempts exhausted
    const pollForServerAvatar = async (expectedServerAvatar, maxAttempts = 6, intervalMs = 1000) => {
        try {
            for (let i = 0; i < maxAttempts; i++) {
                await new Promise(r => setTimeout(r, intervalMs));
                const data = await getCurrentUserProfile();
                // Prefer server photosAndVideo[0] when available
                const serverAvatar = (Array.isArray(data.photosAndVideo) && data.photosAndVideo.length > 0)
                    ? data.photosAndVideo[0]
                    : data.avatar;
                // If server avatar is different and looks like an http url, use it
                if (serverAvatar && serverAvatar !== expectedServerAvatar) {
                    setAvatar(serverAvatar);
                    setAvatarVersion(Date.now());
                    // clear AsyncStorage flags
                    try {
                        await AsyncStorage.removeItem('avatarUpdatedAt');
                        await AsyncStorage.removeItem('avatarLocalUri');
                    } catch (e) {}
                    return;
                }
            }
            // attempts exhausted: clear local optimistic data after a timeout window
            try {
                await AsyncStorage.removeItem('avatarUpdatedAt');
                await AsyncStorage.removeItem('avatarLocalUri');
            } catch (e) {}
        } catch (e) {
            // swallow errors
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadProfileData();
            return () => {};
        }, [loadProfileData])
    );
    
    const StatCard = ({ count, label, iconName, iconType, color }) => (
        <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: color + '15' }]}>
                {iconType === 'Feather' ? (
                    <FeatherIcon name={iconName} size={22} color={color} />
                ) : (
                    <Icon name={iconName} size={22} color={color} />
                )}
            </View>
            <Text style={styles.statCount}>{count}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );

    const ProfileListItem = ({ label, iconName, onPress, badge }) => (
        <TouchableOpacity style={styles.listItem} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.listItemIconContainer}>
                <Icon name={iconName} size={22} color={COLORS.primary} />
            </View>
            <Text style={styles.listItemLabel}>{label}</Text>
            {badge && (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badge}</Text>
                </View>
            )}
            <Icon name="chevron-forward" size={20} color={COLORS.greyText} />
        </TouchableOpacity>
    );

    const getInitials = (fullName) => {
        if (!fullName || fullName === 'N/A') return 'SS';
        if (fullName === 'Guest User') return 'GU';
        const parts = fullName.split(' ').filter(p => p.length > 0);
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
        if (parts.length >= 2) return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
        return '';
    };

    const initials = getInitials(name);

    const handleShareApp = async () => {
        try {
            const result = await Share.share({
                message: 'Check out Gharplot! The best app for real estate.\n\nDownload now: https://play.google.com/store/apps/details?id=com.myapp',
                title: 'Share Gharplot',
            });
            if (result.action === Share.sharedAction) {
                if (Platform.OS === 'android') {
                    ToastAndroid.show('Thanks for sharing!', ToastAndroid.SHORT);
                }
            }
        } catch (error) {
            console.error('Error sharing app:', error);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, styles.centerContent]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading profile...</Text>
            </SafeAreaView>
        );
    }
    
    if (error) {
        return (
            <SafeAreaView style={[styles.container, styles.centerContent]}>
                <View style={styles.errorIconContainer}>
                    <Icon name="alert-circle" size={60} color={COLORS.redAccent} />
                </View>
                <Text style={styles.errorTextTitle}>Unable to Load Profile</Text>
                <Text style={styles.errorTextDetail}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadProfileData}>
                    <Icon name="refresh" size={18} color={COLORS.white} style={{ marginRight: 8 }} />
                    <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.blueHeader} />
            
            {/* Enhanced Header with Gradient Effect */}
            <View style={[styles.headerSection, { paddingTop: statusBarTop }]}>
                <View style={styles.headerBar}>
                    <TouchableOpacity 
                        style={styles.headerButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Icon name="arrow-back" size={24} color={COLORS.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Profile</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Avatar Section */}
                <View style={styles.avatarSection}>
                    <TouchableOpacity 
                        style={styles.avatarContainer} 
                        onPress={() => navigation.navigate('EditProfileScreen')} // Navigate to Edit Profile
                        activeOpacity={0.8}
                    >
                        {avatar ? (
                            (() => {
                                // avoid appending query params for non-http URIs (base64/file://)
                                let uri = avatar;
                                try {
                                    const low = (avatar || '').toLowerCase();
                                    if (low.startsWith('http://') || low.startsWith('https://')) {
                                        const sep = avatar.includes('?') ? '&' : '?';
                                        uri = avatar + sep + 'v=' + avatarVersion;
                                    }
                                } catch (e) {
                                    // fallback: use original avatar
                                    uri = avatar;
                                }

                                return (
                                    <Image
                                        source={{ uri }}
                                        style={styles.avatarImage}
                                        onError={() => setAvatar(null)}
                                        resizeMode="cover"
                                    />
                                );
                            })()
                        ) : (
                            <View style={styles.avatarCircle}>
                                <Text style={styles.avatarText}>{initials}</Text>
                            </View>
                        )}
                        <View style={styles.cameraButton}>
                            <FeatherIcon name="camera" size={14} color={COLORS.white} />
                        </View>
                    </TouchableOpacity>
                    
                    <Text style={styles.userName}>{name}</Text>
                    <Text style={styles.userEmail}>{email}</Text>
                    
                    {/* Show Complete Registration button for new users */}
                    {(name === 'Guest User' || email === 'Complete your registration') ? (
                        <TouchableOpacity 
                            style={[styles.editProfileButton, styles.completeRegistrationButton]}
                            onPress={async () => {
                                const userProfileString = await AsyncStorage.getItem('userProfile');
                                const userProfile = userProfileString ? JSON.parse(userProfileString) : {};
                                navigation.navigate('SignupScreen', {
                                    phoneNumber: userProfile.phone || '',
                                    fromProfile: true
                                });
                            }}
                            activeOpacity={0.8}
                        >
                            <Icon name="person-add-outline" size={16} color={COLORS.white} />
                            <Text style={[styles.editProfileText, styles.completeRegistrationText]}>Complete Registration</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity 
                            style={styles.editProfileButton}
                            onPress={() => navigation.navigate('EditProfileScreen')}
                            activeOpacity={0.8}
                        >
                            <Icon name="create-outline" size={16} color={COLORS.primary} />
                            <Text style={styles.editProfileText}>Edit Profile</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
            
            <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Stats Cards (Shortlisted, My Listings, Enquiries) */}
                <View style={styles.statsSection}>
                    <StatCard 
                        count={shortlistedCount} 
                        label="Shortlisted" 
                        iconName="bookmark" 
                        iconType="Feather"
                        color="#F59E0B"
                    />
                    <StatCard 
                        count={myListingsCount} 
                        label="My Listings" 
                        iconName="home-outline" 
                        iconType="Ionicons"
                        color="#1E90FF"
                    />
                    <StatCard 
                        count={enquiriesCount} 
                        label="Enquiries" 
                        iconName="chatbubble-ellipses-outline" 
                        iconType="Ionicons"
                        color="#10B981"
                    />
                </View>
                
                {/* Quick Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.listCard}>
                        <ProfileListItem 
                            label="My Properties" 
                            iconName="home-outline" 
                            onPress={() => navigation.navigate('SellScreen')}
                            badge={myListingsCount > 0 ? myListingsCount.toString() : null}
                        />
                        <View style={styles.divider} />
                        <ProfileListItem 
                            label="Shortlisted" 
                            iconName="heart-outline" 
                            onPress={() => navigation.navigate('Saved')}
                            badge={shortlistedCount > 0 ? shortlistedCount.toString() : null}
                        />
                        <View style={styles.divider} />
                        <ProfileListItem 
                            label="Notifications" 
                            iconName="notifications-outline" 
                            onPress={() => navigation.navigate('Notifications')}
                        />
                    </View>
                </View>

                {/* Premium CTA */}
                <TouchableOpacity 
                    style={styles.premiumCard} 
                    onPress={() => console.log('Go Premium')}
                    activeOpacity={0.9}
                >
                    <View style={styles.premiumContent}>
                        <View style={styles.premiumIconCircle}>
                            <FontAwesomeIcon name="star" size={22} color={COLORS.premiumGold} />
                        </View>
                        <View style={styles.premiumTextSection}>
                            <Text style={styles.premiumTitle}>Upgrade to Premium</Text>
                            <Text style={styles.premiumSubtitle}>Get exclusive features & priority support</Text>
                        </View>
                    </View>
                    <View style={styles.premiumArrow}>
                        <Icon name="arrow-forward" size={20} color={COLORS.premiumGold} />
                    </View>
                </TouchableOpacity>

                {/* Settings Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Settings</Text>
                    <View style={styles.listCard}>
                        <ProfileListItem 
                            label="CRM Portal" 
                            iconName="business-outline" 
                            onPress={() => Linking.openURL('http://crm.gharplot.in/login')}
                        />
                        <View style={styles.divider} />
                        <ProfileListItem 
                            label="Privacy & Security" 
                            iconName="shield-checkmark-outline" 
                            onPress={() => navigation.navigate('PrivacySecurity')}
                        />
                        <View style={styles.divider} />
                        <ProfileListItem 
                            label="Help & Support" 
                            iconName="help-circle-outline" 
                            onPress={() => navigation.navigate('Help')}
                        />
                        <View style={styles.divider} />
                        <ProfileListItem 
                            label="About" 
                            iconName="information-circle-outline" 
                            onPress={() => navigation.navigate('About')}
                        />
                        <View style={styles.divider} />
                        <ProfileListItem 
                            label="Share App" 
                            iconName="share-social-outline" 
                            onPress={handleShareApp}
                        />
                        <View style={styles.divider} />
                        <ProfileListItem 
                            label="Test FCM (Firebase)" 
                            iconName="notifications-outline" 
                            onPress={() => navigation.navigate('TestFCM')}
                        />
                    </View>
                </View>

                {/* Logout Button */}
                <TouchableOpacity 
                    style={styles.logoutButton}
                    onPress={async () => {
                        try {
                            console.log('🔄 Starting logout process...');
                            
                            // Clear all user credentials
                            await clearUserCredentials();
                            
                            // Verify credentials are cleared
                            const token = await AsyncStorage.getItem('userToken');
                            const userId = await AsyncStorage.getItem('userId');
                            console.log('🔍 After logout - Token:', token, 'UserId:', userId);
                            
                            // Reset navigation stack to login screen
                            navigation.reset({
                                index: 0,
                                routes: [{ name: 'LoginScreen' }],
                            });
                            
                            console.log('✅ Logout successful');
                        } catch (error) {
                            console.error('❌ Logout error:', error);
                        }
                    }}
                    activeOpacity={0.8}
                >
                    <Icon name="log-out-outline" size={20} color={COLORS.redAccent} />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>

                <View style={{ height: 80 }} />
            </ScrollView>
        </View>
    );
};

// --- Styles ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 35,
    },

    // Header Section
    headerSection: {
        backgroundColor: COLORS.blueHeader,
        // ⬆️ FIX: Slightly increased paddingBottom for better separation from stat cards
        paddingBottom: 40, 
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    headerBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 20,
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.white,
    },

    // Avatar Section
    avatarSection: {
        alignItems: 'center',
        paddingBottom: 20,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 5,
    },
    avatarCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: COLORS.white,
    },
    avatarImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
        borderColor: COLORS.white,
        backgroundColor: 'rgba(0,0,0,0.05)'
    },
    avatarText: {
        fontSize: 38,
        fontWeight: '700',
        color: COLORS.white,
    },
    cameraButton: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        backgroundColor: COLORS.premiumGold,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: COLORS.white,
    },
    userName: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.white,
        marginTop: 8,
    },
    userEmail: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.85)',
        marginTop: 4,
    },
    editProfileButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        marginTop: 16,
    },
    editProfileText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.primary,
        marginLeft: 6,
    },
    completeRegistrationButton: {
        backgroundColor: COLORS.primary,
        borderWidth: 0,
    },
    completeRegistrationText: {
        color: COLORS.white,
    },

    // Stats Section
    statsSection: {
        flexDirection: 'row',
        backgroundColor: 'transparent',
        borderRadius: 16,
        padding: 0,
        marginTop: 20,
        // ⬆️ FIX: Increased margin bottom for more space below the stat cards
        marginBottom: 35, 
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
            },
            android: {
                elevation: 6,
            },
        }),
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: COLORS.white,
        // ⬆️ FIX: Increased horizontal margin for more separation between cards
        marginHorizontal: 8, 
        paddingVertical: 16, // slightly more vertical padding inside the card
        borderRadius: 12,
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
    },
    statIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statCount: {
        fontSize: 22,
        fontWeight: '800',
        color: COLORS.black,
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.secondaryText,
        fontWeight: '500',
    },

    // Section
    section: {
        // ⬆️ FIX: Increased margin bottom for better vertical section separation
        marginBottom: 25, 
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: COLORS.black,
        marginBottom: 12,
    },

    // List Card
    listCard: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        paddingHorizontal: 16,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
    },
    listItemIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    listItemLabel: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.black,
    },
    badge: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        marginRight: 8,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.white,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.greyLight,
        marginLeft: 52,
    },

    // Premium Card
    premiumCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.premiumGoldLight,
        borderRadius: 16,
        padding: 16,
        // ⬆️ FIX: Increased margin bottom for separation
        marginBottom: 25, 
        borderWidth: 2,
        borderColor: COLORS.premiumGold + '40',
    },
    premiumContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    premiumIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    premiumTextSection: {
        flex: 1,
    },
    premiumTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.black,
        marginBottom: 2,
    },
    premiumSubtitle: {
        fontSize: 13,
        color: COLORS.secondaryText,
    },
    premiumArrow: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Logout Button
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.white,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.redAccent + '30',
        marginBottom: 20,
    },
    logoutText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.redAccent,
        marginLeft: 8,
    },

    // Loading & Error States
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: COLORS.greyText,
        fontWeight: '500',
    },
    errorIconContainer: {
        marginBottom: 16,
    },
    errorTextTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.black,
        marginBottom: 8,
    },
    errorTextDetail: {
        fontSize: 14,
        color: COLORS.greyText,
        textAlign: 'center',
        lineHeight: 20,
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        marginTop: 20,
    },
    retryButtonText: {
        color: COLORS.white,
        fontSize: 15,
        fontWeight: '600',
    },
});

export default ProfileScreen;