import React, { useState, useEffect, useCallback } from 'react';
import moment from 'moment';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  AppState,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { getChats, deleteChat } from '../services/chatApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserProfile } from '../services/userapi';
import { formatImageUrl } from '../services/homeApi';
import useChatSocket from '../hooks/useChatSocket';
import eventBus from '../utils/eventBus';
import CrossPlatformAlert from '../utils/crossPlatformAlert';

// --- COLORS ---
const colors = {
  primary: '#0D47A1',
  darkBlue: '#0B3D91',
  accent: '#FFC107',
  background: '#F0F3F7',
  cardBackground: '#FFFFFF',
  text: '#1E293B',
  lightText: '#64748B',
  white: '#FFFFFF',
  unread: '#C62828',
};

// Local state will hold chats loaded from backend

const ChatListScreen = ({ navigation }) => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [appState, setAppState] = useState(AppState.currentState);
  const [notifee, setNotifee] = useState(null);
  const [messaging, setMessaging] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const id = await AsyncStorage.getItem('userId');
        if (mounted && id) setCurrentUserId(id);
      } catch (e) {
        console.warn('Failed to read userId from storage', e && e.message ? e.message : e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Setup Notifications (only for mobile platforms)
  useEffect(() => {
    if (Platform.OS === 'web') return;

    let mounted = true;

    const setupNotifications = async () => {
      try {
        // Dynamically import notifee for mobile platforms (temporarily disabled)
        // const notifeeModule = await import('@notifee/react-native').catch(() => null);
        const notifeeModule = null;
        const messagingModule = await import('@react-native-firebase/messaging').catch(() => null);
        
        if (!mounted) return;

        // Only set if modules loaded successfully
        if (notifeeModule) setNotifee(notifeeModule.default);
        if (messagingModule) setMessaging(messagingModule.default);

        // Only proceed with notifications if notifee is available
        if (!notifeeModule) {
          console.log('ℹ️ Notifee not available - notifications disabled');
          return;
        }

        // Create notification channel for Android
        if (Platform.OS === 'android') {
          await notifeeModule.default.createChannel({
            id: 'chat-messages',
            name: 'Chat Messages',
            description: 'Notifications for new chat messages',
            sound: 'default',
            importance: notifeeModule.AndroidImportance.HIGH,
            vibration: true,
          });
          console.log('📱 Chat notification channel created');
        }

        // 🛑 REDUNDANT: Removed screen-specific Notifee listener. 
        // Global NotificationHandler now manages foreground events/clicks
        // to ensure they work from any screen, not just ChatList.
        console.log('✅ Chat notification system initialized (delegated to global handler)');
      } catch (error) {
        console.warn('⚠️ Notification setup failed (non-critical):', error?.message || error);
      }
    };

    setupNotifications();

    return () => {
      mounted = false;
    };
  }, [navigation]);

  const loadChats = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getChats();
      // Normalize server chat objects to UI items
      const normalized = (list || []).map((c) => {
        const id = c._id || c.id || (c.chatId || '') + '';
        // determine other participant
        let other = null;
        // server may return a `user` object for the other participant
        if (Array.isArray(c.participants)) {
          other = c.participants.find(p => p._id !== currentUserId) || c.participants[0];
        } else if (c.participant) {
          other = c.participant;
        } else if (c.user) {
          other = c.user;
        }
        // Helper: mask email local-part or phone if no name available
        const maskEmail = (email) => {
          if (!email) return null;
          const parts = String(email).split('@');
          if (parts.length === 2) return parts[0];
          return email;
        };

        const maskPhone = (phone) => {
          if (!phone) return null;
          const s = String(phone).replace(/\D/g, '');
          if (s.length <= 4) return s;
          return s.slice(-4).padStart(s.length, '*');
        };

        // Try many likely name fields from various server shapes
        const nameCandidates = [
          other?.fullName,
          other?.full_name,
          other?.name,
          (other?.firstName && other?.lastName) ? `${other.firstName} ${other.lastName}` : null,
          (other?.first_name && other?.last_name) ? `${other.first_name} ${other.last_name}` : null,
          other?.displayName,
          other?.username,
          c.name,
          c.chatName,
          c.title,
          c.otherUser?.name,
          c.user?.name,
          c.sender?.name,
          c.receiver?.name,
        ].filter(Boolean);

        let name = nameCandidates.length ? nameCandidates[0] : null;
        if (!name) {
          // fallback to masked email or phone from participant
          name = maskEmail(other?.email) || maskEmail(c.email) || maskPhone(other?.phone) || maskPhone(other?.mobile) || 'User';
        }

  // Normalize avatar URL so relative server paths show correctly in RN <Image>
  const rawAvatar = other?.avatar || other?.profilePic || other?.photo || other?.image || other?.profile_pic || null;
  const avatar = rawAvatar ? formatImageUrl(rawAvatar) : 'https://placehold.co/100x100/CCCCCC/888888?text=User';
  const lastMessage = c.lastMessage?.text || c.lastMessage || c.last_message || (c.messages && c.messages[c.messages.length-1]?.text) || '';
  const time = c.lastMessageTime || c.last_message_time || c.updatedAt || (c.lastMessage && c.lastMessage.createdAt) || c.updated_at || '';
        const property = c.meta?.propertyTitle || c.propertyName || c.property || '';

    return { id, name, avatar, lastMessage, time, property, raw: c, other };
      });

      setChats(normalized);

      // Enrich items that lack a friendly display name by fetching the user's profile
      const needProfile = normalized.filter(n => {
        // if name is the generic fallback or looks masked, try to fetch full profile
        return (!n.name || n.name === 'User' || /\*|@/.test(n.name)) && n.other && (n.other._id || n.other.id);
      });
      if (needProfile.length > 0) {
        try {
          const profiles = await Promise.all(
            needProfile.map(async (item) => {
              const id = item.other._id || item.other.id;
              try {
                const profile = await getUserProfile(id);
                return { id: item.id, profile };
              } catch (e) {
                console.warn('Failed to fetch profile for', id, e && e.message);
                return null;
              }
            })
          );
          const mapById = {};
          profiles.forEach(p => { if (p && p.id) mapById[p.id] = p.profile; });
          if (Object.keys(mapById).length) {
            setChats(prev => prev.map(ch => {
              const prof = mapById[ch.id];
              if (!prof) return ch;
              const newName = prof.fullName || prof.full_name || prof.name || prof.displayName || prof.firstName || prof.first_name || prof.email || ch.name;
              const newAvatarRaw = prof.avatar || prof.profilePic || prof.photo || ch.avatar;
              const newAvatar = newAvatarRaw ? formatImageUrl(newAvatarRaw) : ch.avatar;
              return { ...ch, name: newName, avatar: newAvatar };
            }));
          }
        } catch (e) {
          console.warn('Profile enrichment failed:', e && e.message);
        }
      }
    } catch (err) {
      console.error('Failed to load chats:', err);
      setChats([]);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  // Real-time updates: subscribe to global socket and update unread counts / last message
  const onNewMessage = useCallback((message) => {
    try {
      console.log('📨 New message received in ChatListScreen:', message);
      // Try many shapes to find chatId
      const incomingChatId = message.chatId || message.chat?._id || message.chat?.id || message.chat_id || message.chatId || (message.room || null);
      const text = message.text || message.message || message.body || '';
      const time = message.timestamp || message.createdAt || new Date().toISOString();
      const senderId = message.senderId || message.sender?._id || message.from;
      const senderName = message.senderName || message.sender?.fullName || message.sender?.name || 'Someone';

      if (!incomingChatId) {
        // Unknown chat id, refresh whole list
        console.log('🔄 Unknown chat ID, refreshing chat list');
        loadChats();
        return;
      }

      // Show notification if app is in background or message is from another user
      if (appState !== 'active' && senderId !== currentUserId) {
        showLocalNotification({
          chatId: incomingChatId,
          senderName,
          senderId,
          message: text,
        });
      }

      setChats(prev => {
        let found = false;
        const updated = prev.map(ch => {
          // match against normalized id AND raw server ids
          const rawId = ch.raw && (ch.raw._id || ch.raw.id || ch.raw.chatId || ch.raw._chatId);
          if (String(ch.id) === String(incomingChatId) || String(rawId) === String(incomingChatId)) {
            found = true;
            const newLast = text || ch.lastMessage;
            console.log('✅ Updated existing chat:', ch.name);
            // Update last message/time and move to top
            return { ...ch, lastMessage: newLast, time };
          }
          return ch;
        });

        if (!found) {
          // If this chat is not present in local state, trigger full reload
          console.log('🔄 Chat not found in list, refreshing...');
          loadChats();
        }

        // Sort by time - most recent first
        return updated.sort((a, b) => new Date(b.time) - new Date(a.time));
      });
    } catch (e) {
      console.warn('onNewMessage handler failed:', e && e.message ? e.message : e);
    }
  }, [loadChats, appState, currentUserId]);

  // Function to show local notification
  const showLocalNotification = useCallback(async (data) => {
    if (!notifee || Platform.OS === 'web') return;

    const { senderName, message, chatId, senderId } = data;
    
    try {
      await notifee.displayNotification({
        title: `💬 ${senderName}`,
        body: message.substring(0, 100),
        android: {
          channelId: 'chat-messages',
          importance: 4, // HIGH
          sound: 'default',
          pressAction: {
            id: 'default',
          },
          vibrationPattern: [300, 500, 300],
        },
        ios: {
          sound: 'default',
        },
        data: { chatId, senderId, senderName },
      });
      
      console.log('🔔 Local notification shown for:', senderName);
    } catch (error) {
      console.warn('⚠️ Failed to show notification:', error?.message || error);
    }
  }, [notifee]);

  // Connect to global socket for real-time updates
  useChatSocket(null, onNewMessage);

  // Monitor app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      console.log('📱 App state changed:', appState, '->', nextAppState);
      setAppState(nextAppState);
      
      // Refresh chats when app comes to foreground
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        console.log('🔄 App became active, refreshing chats...');
        loadChats();
      }
    });

    return () => {
      subscription?.remove();
    };
  }, [appState, loadChats]);

  // Setup FCM for background notifications
  useEffect(() => {
    if (Platform.OS === 'web' || !messaging) return;

    let mounted = true;

    const setupFCM = async () => {
      try {
        // Verify messaging is properly initialized
        if (!messaging || typeof messaging.onNotificationOpenedApp !== 'function') {
          console.log('ℹ️ Firebase messaging not properly initialized - skipping FCM setup');
          return;
        }

        // Handle notification when app is in background
        const unsubscribeBackground = messaging.onNotificationOpenedApp(remoteMessage => {
          console.log('🔔 Notification opened app from background:', remoteMessage);
          
          const { chatId, senderId, senderName } = remoteMessage.data || {};
          if (chatId && mounted) {
            navigation.navigate('ChatDetailScreen', {
              chatId,
              user: { _id: senderId, fullName: senderName },
            });
          }
        });

        // Handle notification when app was completely closed
        messaging
          .getInitialNotification()
          .then(remoteMessage => {
            if (remoteMessage && mounted) {
              console.log('🔔 Notification opened app from quit state:', remoteMessage);
              
              const { chatId, senderId, senderName } = remoteMessage.data || {};
              if (chatId) {
                setTimeout(() => {
                  navigation.navigate('ChatDetailScreen', {
                    chatId,
                    user: { _id: senderId, fullName: senderName },
                  });
                }, 1000);
              }
            }
          });

        // 🛑 REDUNDANT: Removed screen-specific FCM listener. 
        // Global fcmService.js handles foreground chat notifications.
        const unsubscribeForeground = () => {}; 

        return () => {
          unsubscribeBackground();
          unsubscribeForeground();
        };
      } catch (error) {
        console.warn('⚠️ FCM setup failed (non-critical):', error?.message || error);
      }
    };

    const cleanup = setupFCM();

    return () => {
      mounted = false;
      if (cleanup && typeof cleanup.then === 'function') {
        cleanup.then(fn => fn && typeof fn === 'function' && fn());
      }
    };
  }, [navigation, currentUserId, loadChats, showLocalNotification, messaging]);

  // Add polling mechanism for chat list updates
  useEffect(() => {
    let intervalId;
    let mounted = true;

    const pollChats = async () => {
      if (!mounted) return;
      try {
        console.log('🔄 Polling for chat list updates...');
        const list = await getChats();
        if (!mounted) return;
        
        const normalized = (list || []).map((c) => {
          const id = c._id || c.id || (c.chatId || '') + '';
          // determine other participant
          let other = null;
          // server may return a `user` object for the other participant
          if (Array.isArray(c.participants)) {
            other = c.participants.find(p => p._id !== currentUserId) || c.participants[0];
          } else if (c.participant) {
            other = c.participant;
          } else if (c.user) {
            other = c.user;
          }

          // Helper: mask email local-part or phone if no name available
          const maskEmail = (email) => {
            if (!email) return null;
            const parts = String(email).split('@');
            if (parts.length === 2) return parts[0];
            return email;
          };

          const maskPhone = (phone) => {
            if (!phone) return null;
            const s = String(phone).replace(/\D/g, '');
            if (s.length <= 4) return s;
            return s.slice(-4).padStart(s.length, '*');
          };

          // Try many likely name fields from various server shapes
          const nameCandidates = [
            other?.fullName,
            other?.full_name,
            other?.name,
            (other?.firstName && other?.lastName) ? `${other.firstName} ${other.lastName}` : null,
            (other?.first_name && other?.last_name) ? `${other.first_name} ${other.last_name}` : null,
            other?.displayName,
            other?.username,
            c.name,
            c.chatName,
            c.title,
            c.otherUser?.name,
            c.user?.name,
            c.sender?.name,
            c.receiver?.name,
          ].filter(Boolean);

          let name = nameCandidates.length ? nameCandidates[0] : null;
          if (!name) {
            // fallback to masked email or phone from participant
            name = maskEmail(other?.email) || maskEmail(c.email) || maskPhone(other?.phone) || maskPhone(other?.mobile) || 'User';
          }

          // Normalize avatar URL so relative server paths show correctly in RN <Image>
          const rawAvatar = other?.avatar || other?.profilePic || other?.photo || other?.image || other?.profile_pic || null;
          const avatar = rawAvatar ? formatImageUrl(rawAvatar) : 'https://placehold.co/100x100/CCCCCC/888888?text=User';
          const lastMessage = c.lastMessage?.text || c.lastMessage || c.last_message || (c.messages && c.messages[c.messages.length-1]?.text) || '';
          const time = c.lastMessageTime || c.last_message_time || c.updatedAt || (c.lastMessage && c.lastMessage.createdAt) || c.updated_at || '';
          const property = c.meta?.propertyTitle || c.propertyName || c.property || '';

          return { id, name, avatar, lastMessage, time, property, raw: c, other };
        });

        setChats(prev => {
          // Only update if there are actual changes
          if (JSON.stringify(prev.map(p => ({ id: p.id, lastMessage: p.lastMessage, time: p.time }))) !== 
              JSON.stringify(normalized.map(n => ({ id: n.id, lastMessage: n.lastMessage, time: n.time })))) {
            console.log('📨 Chat list updated via polling');
            return normalized;
          }
          return prev;
        });
      } catch (err) {
        console.warn('Polling error (non-critical):', err?.message || err);
      }
    };

    // Start polling every 3 seconds for chat list updates
    if (currentUserId) {
      intervalId = setInterval(pollChats, 3000);
    }

    return () => {
      mounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [currentUserId]);

  // Previously we cleared unread counts on 'chatOpened'. Message counting was removed,
  // so we no longer track/clear unread counts here.

  // load when screen focused
  useFocusEffect(
    useCallback(() => {
      console.log('📺 ChatListScreen focused, loading chats...');
      loadChats();
    }, [loadChats])
  );

  // Additional effect to refresh on app state changes
  useEffect(() => {
    const handleChatOpened = () => {
      console.log('📺 Chat opened event received, refreshing list...');
      setTimeout(() => loadChats(), 1000); // Small delay to allow server to process
    };

    try {
      eventBus.on && eventBus.on('chatOpened', handleChatOpened);
    } catch (e) {
      console.warn('EventBus not available:', e);
    }

    return () => {
      try {
        eventBus.off && eventBus.off('chatOpened', handleChatOpened);
      } catch (e) {
        // ignore
      }
    };
  }, [loadChats]);
  const renderChatItem = ({ item }) => {
    // format time nicely
    const timeStr = item.time ? moment(item.time).format('DD MMM, hh:mm A') : '';
    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() =>
          navigation.navigate('ChatDetailScreen', {
            chatId: item.id,
            user: item.other?._id ? item.other : item.other || item.raw?.otherUser || item.id,
            propertyTitle: item.property,
          })
        }
        onLongPress={() => {
          CrossPlatformAlert.alert(
            'Delete conversation',
            'Are you sure you want to delete this conversation? This cannot be undone.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  try {
                    setChats(prev => prev.filter(it => it.id !== item.id));
                    const res = await deleteChat(item.id);
                    if (!res || (res && res.success === false)) {
                      console.warn('deleteChat failed, reloading list', res);
                      loadChats();
                    }
                  } catch (err) {
                    console.error('Failed to delete chat', err);
                    loadChats();
                  }
                },
              },
            ],
            { cancelable: true }
          );
        }}
      >
        <Image source={{ uri: item.avatar }} style={styles.avatar} />

        <View style={styles.chatContent}>
          <View style={styles.nameRow}>
            <Text style={styles.chatName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.chatTime}>{timeStr}</Text>
          </View>

          <View style={styles.messageRow}>
            <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };


  return (
    <View style={styles.container}>
      {/* Gradient Header */}
      <LinearGradient
        colors={[colors.primary, colors.darkBlue]}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back-outline" size={26} color={colors.white} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Messages</Text>

        <TouchableOpacity 
          style={styles.newChatButton}
          onPress={async () => {
            console.log('🔄 Manual refresh triggered');
            try {
              await loadChats();
            } catch (error) {
              console.error('Manual refresh failed:', error);
              CrossPlatformAlert.alert('Error', 'Failed to refresh chats. Please try again.');
            }
          }}
        >
          <Icon name="refresh-outline" size={24} color={colors.white} />
        </TouchableOpacity>
      </LinearGradient>

      {/* Chat List */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={chats}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={() => (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: '#64748B' }}>No conversations yet</Text>
            </View>
          )}
        />
      )}
    </View>
  );
};

export default ChatListScreen;

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 6,
    backgroundColor: colors.primary,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.white,
  },
  newChatButton: {
    padding: 8,
    borderRadius: 20,
  },

  listContent: {
    paddingTop: 10,
    paddingHorizontal: 10,
    paddingBottom: 20,
  },

  chatItem: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    padding: 15,
    marginVertical: 6,
    marginHorizontal: 8,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  avatar: {
    width: 55,
    height: 55,
    borderRadius: 28,
    marginRight: 15,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  chatContent: { flex: 1 },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    maxWidth: '70%',
  },
  chatTime: { fontSize: 12, color: colors.lightText },
  chatProperty: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 3,
  },
  lastMessageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: { fontSize: 14, color: colors.lightText, flex: 1 },
  unreadMessage: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: colors.unread,
    borderRadius: 15,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 24,
    alignItems: 'center',
    marginLeft: 10,
  },
  unreadText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  separator: { height: 8, backgroundColor: 'transparent' },
  deleteButton: {
    position: 'absolute',
    right: 18,
    top: 18,
    padding: 6,
    borderRadius: 18,
  },
});
