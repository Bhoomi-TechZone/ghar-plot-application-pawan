// src/screens/ChatDetailScreen.js

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Image,
    Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import moment from 'moment';
import { useFocusEffect } from '@react-navigation/native';

// --- IMPORTS ---
import { getOrCreateChat, getChatById, sendMessageApi, getAuthToken, markChatAsRead, getCurrentUserId } from '../services/chatApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserProfile } from '../services/userapi';
import { formatImageUrl } from '../services/homeApi';
import useChatSocket from '../hooks/useChatSocket';
import CrossPlatformAlert from '../utils/crossPlatformAlert';
// -------------------

// --- COLORS PALETTE (Placeholder, adjust to your theme) ---
const colors = {
    primary: '#0D47A1',
    accent: '#FFC107',
    background: '#F0F3F7',
    text: '#1E293B',
    lightText: '#64748B',
    white: '#FFFFFF',
    senderBubble: '#0D47A1',
    receiverBubble: '#FFFFFF',
};

const ChatDetailScreen = ({ navigation, route }) => {
    // route.params is where 'user' (the agent/owner), 'chatId' and 'propertyTitle' are passed
    const { user, propertyTitle, chatId: paramChatId } = route.params || {};

    const [currentUserId, setCurrentUserId] = useState(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                // Use the dedicated function from chatApi
                const id = await getCurrentUserId();
                console.log('🔍 User ID from getCurrentUserId:', JSON.stringify(id));

                if (mounted && id) {
                    const cleanId = String(id).trim();
                    setCurrentUserId(cleanId);
                    console.log('✅ CurrentUserId loaded via getCurrentUserId:', cleanId);
                } else if (mounted) {
                    console.error('❌ No userId found via getCurrentUserId - trying direct AsyncStorage');
                    // Fallback to direct AsyncStorage access
                    const fallbackId = await AsyncStorage.getItem('userId');
                    if (fallbackId) {
                        const cleanFallbackId = String(fallbackId).trim();
                        setCurrentUserId(cleanFallbackId);
                        console.log('✅ CurrentUserId loaded via fallback:', cleanFallbackId);
                    }
                }
            } catch (e) {
                console.error('❌ Failed to get current user ID:', e && e.message ? e.message : e);
            }
        })();
        return () => { mounted = false; };
    }, []);
    const [chatId, setChatId] = useState(paramChatId || null);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [editingMessageId, setEditingMessageId] = useState(null);
    const inputRef = useRef();
    const [loading, setLoading] = useState(true);
    const flatListRef = useRef();
    const [rawEvents, setRawEvents] = useState([]); // dev-only: recent raw socket events

    // Robustly determine receiverId
    const receiverId =
        user?._id || user?.userId || user?.postedBy?._id ||
        (typeof user === 'string' ? user : null);

    const initialAgentName = user?.fullName || user?.name || user?.username || 'Agent/Owner';
    const [agentName, setAgentName] = useState(initialAgentName);
    const initialAgentAvatar = user?.avatar || user?.profilePic || null;
    const [agentAvatar, setAgentAvatar] = useState(initialAgentAvatar ? formatImageUrl(initialAgentAvatar) : null);

    // If we only received an id (or a generic fallback name), try to enrich with profile
    useEffect(() => {
        let mounted = true;
        const shouldFetch = (!user || typeof user === 'string' || agentName === 'Agent/Owner' || /\*|@/.test(agentName));
        if (!shouldFetch) return;
        const idToFetch = receiverId;
        if (!idToFetch) return;
        (async () => {
            try {
                const profile = await getUserProfile(idToFetch);
                if (!mounted || !profile) return;
                const friendly = profile.fullName || profile.full_name || profile.name || profile.displayName || profile.email || agentName;
                setAgentName(friendly);
                // set avatar if available (normalize path)
                if (profile.avatar) {
                    setAgentAvatar(formatImageUrl(profile.avatar));
                }
            } catch (e) {
                // ignore
            }
        })();
        return () => { mounted = false; };
    }, [receiverId]);

    // Helper to format API messages to match the local message format
    const formatAPIMessage = (apiMessage) => {
        if (!apiMessage || typeof apiMessage !== 'object') {
            console.warn('Invalid message object:', apiMessage);
            return null;
        }

        const id = apiMessage._id || apiMessage.id || apiMessage.createdAt || Date.now().toString();
        const text = apiMessage.text || apiMessage.body || apiMessage.message || '';

        // Skip empty messages
        if (!text.trim()) {
            console.warn('Empty message text, skipping:', apiMessage);
            return null;
        }

        // Extract sender ID from various possible fields
        let senderId = null;

        // Try different field names that might contain sender ID
        const possibleSenderFields = [
            apiMessage.senderId,
            apiMessage.sender_id,
            apiMessage.user_id,
            apiMessage.userId,
            apiMessage.from,
            apiMessage.user,
            apiMessage.sender
        ];

        for (const field of possibleSenderFields) {
            if (field) {
                if (typeof field === 'string') {
                    senderId = field;
                    break;
                } else if (typeof field === 'object') {
                    senderId = field._id || field.id || field.userId || null;
                    if (senderId) break;
                }
            }
        }

        console.log(`🔍 Extracted senderId: "${senderId}" from API message`);

        // SIMPLE APPROACH: Determine if this message is from the current user
        let sender = 'agent'; // default for other person's messages

        console.log(`🔍 Analyzing message: "${text.substring(0, 30)}..."`);
        console.log(`🔍 Current User ID: "${currentUserId}"`);
        console.log(`🔍 Message Sender ID: "${senderId}"`);

        if (currentUserId && senderId) {
            // Convert both to strings and compare
            const currentUserStr = String(currentUserId).trim();
            const senderStr = String(senderId).trim();

            if (currentUserStr === senderStr) {
                sender = 'user'; // YOUR message - RIGHT side
                console.log(`✅ MATCH! This is YOUR message -> RIGHT side`);
            } else {
                sender = 'agent'; // OTHER person's message - LEFT side  
                console.log(`👤 NO MATCH! This is OTHER person's message -> LEFT side`);
            }
        } else {
            console.warn(`⚠️ Missing IDs - currentUserId: "${currentUserId}", senderId: "${senderId}"`);
            // Default to agent (left side) if we can't determine
            sender = 'agent';
        }

        console.log(`🎯 FINAL: sender="${sender}" -> ${sender === 'user' ? 'RIGHT SIDE ➡️' : 'LEFT SIDE ⬅️'}`);
        console.log(`─────────────────────────────────────────────────────`);

        const time = moment(apiMessage.timestamp || apiMessage.createdAt).format('hh:mm A');
        return {
            id,
            text,
            sender,
            time,
            status: 'sent',
            edited: apiMessage.edited || false,
            originalSenderId: senderId, // Store original sender ID for future reference
            createdAt: apiMessage.timestamp || apiMessage.createdAt || new Date()
        };
    };

    // 1. WebSocket Handler: Adds a new message received from the socket
    const onNewMessage = useCallback((newMessage) => {
        try {
            // Normalize incoming chat id if provided
            const incomingChatId = newMessage.chatId || newMessage.chat?._id || newMessage.chat?.id || newMessage.chat_id || newMessage.room || null;

            // If there's a chat id and it definitely doesn't match the open chat, ignore it.
            if (incomingChatId && chatId && String(incomingChatId) !== String(chatId)) {
                return;
            }

            // Heuristics: if chat id is missing or ambiguous, check sender/participants
            let likelyForThisChat = false;
            if (!incomingChatId) {
                // Derive sender and recipient ids from several possible fields
                const senderId = (newMessage.sender && (typeof newMessage.sender === 'string' ? newMessage.sender : (newMessage.sender._id || newMessage.sender.id || newMessage.sender.userId))) || newMessage.senderId || newMessage.from || newMessage.user || null;
                const toId = newMessage.to || newMessage.receiverId || newMessage.recipient || newMessage.toUser || null;

                // If receiverId (other participant) is known and matches sender of message, it's for this chat
                if (receiverId && senderId && String(senderId) === String(receiverId)) likelyForThisChat = true;
                // If receiverId matches 'to' field, it's also likely
                if (receiverId && toId && String(toId) === String(receiverId)) likelyForThisChat = true;
                // If participants array contains our receiverId, treat as likely
                if (Array.isArray(newMessage.participants) && receiverId) {
                    try {
                        if (newMessage.participants.some(p => String(p._id || p.id || p) === String(receiverId))) likelyForThisChat = true;
                    } catch (err) { }
                }
            } else {
                likelyForThisChat = true; // incomingChatId matches or is absent but we passed earlier
            }

            if (!likelyForThisChat) return; // Not for this chat

            setMessages(prev => {
                const formatted = formatAPIMessage(newMessage);
                if (!formatted) return prev; // Skip invalid messages

                if (formatted.sender === 'user') {
                    // Replace temporary 'sending' message if text matches
                    // This is for the case where the server DOES echo back
                    const index = prev.findIndex(msg => msg.text === formatted.text && msg.status === 'sending');
                    if (index !== -1) {
                        const newPrev = [...prev];
                        newPrev[index] = formatted;
                        return newPrev;
                    }
                }

                // Add new message if it doesn't already exist
                const existing = prev.some(msg => msg.id === formatted.id || (formatted.id && String(msg.id) === String(formatted.id)));
                if (existing) return prev;

                return [...prev, formatted];
            });
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        } catch (e) {
            console.warn('onNewMessage (chat detail) failed:', e && e.message ? e.message : e);
        }
    }, [currentUserId, chatId, receiverId]);

    // 2. Initialize Socket Connection
    const { isConnected, sendSocketMessage, joinRoom, leaveRoom } = useChatSocket(chatId, onNewMessage, (raw) => {
        if (!__DEV__) return; // only store in dev mode
        try {
            const text = typeof raw === 'string' ? raw : JSON.stringify(raw, null, 0);
            setRawEvents(prev => [text, ...prev].slice(0, 50));
        } catch (e) { /* ignore */ }
    });


    // 3. Data Fetching (Get/Create Chat) - MOVED TO useFocusEffect
    const initializeChat = useCallback(async () => {
        // Wait until we have currentUserId to avoid mis-classifying messages
        if (!currentUserId) {
            return;
        }

        if (!receiverId && !paramChatId) {
            setLoading(false);
            CrossPlatformAlert.alert("Error", "No user specified to chat with. Please try again from a property or service page.", [{ text: "OK", onPress: () => navigation.goBack() }]);
            return;
        }

        setLoading(true);
        // Clear messages only when a new chat load begins
        setMessages([]);

        try {
            let chat = null;

            // Always try getOrCreateChat first as it's more reliable for getting full chat history
            if (receiverId) {
                console.log('🔄 Getting full chat history via getOrCreateChat...');
                chat = await getOrCreateChat(receiverId);
            }

            // Fallback to getChatById only if getOrCreateChat failed and we have paramChatId
            if (!chat && paramChatId) {
                console.log('🔄 Fallback: Getting chat by ID...');
                chat = await getChatById(paramChatId);
            }

            if (chat) {
                const resolvedId = chat._id || chat.id || paramChatId;
                setChatId(resolvedId);
                const initialMessages = (chat.messages || [])
                    .map(formatAPIMessage)
                    .filter(msg => msg !== null);
                console.log(`📨 Loaded ${initialMessages.length} messages for chat ${resolvedId}`);
                setMessages(initialMessages);

                try { joinRoom && joinRoom(resolvedId); } catch (e) { }

                // Mark chat as read (best-effort)
                try {
                    route.params && typeof route.params.onOpen === 'function' && route.params.onOpen();
                    const { default: eventBus } = await import('../utils/eventBus');
                    eventBus && eventBus.emit && eventBus.emit('chatOpened', { chatId: resolvedId });
                    markChatAsRead(resolvedId).catch(e => console.warn('markChatAsRead failed:', e && e.message ? e.message : e));
                } catch (e) {
                    // ignore
                }
            }
        } catch (error) {
            console.error("Failed to initialize chat:", error);
            CrossPlatformAlert.alert("Error", "Could not load chat history. Check your network or permissions.");
        } finally {
            setLoading(false);
        }
    }, [receiverId, paramChatId, navigation, currentUserId]);


    // Run initializeChat ONLY when the screen is focused AND currentUserId is available
    useFocusEffect(
        useCallback(() => {
            // Don't initialize chat until we have currentUserId
            if (!currentUserId) {
                console.log('📺 ChatDetailScreen focused but currentUserId not ready, waiting...');
                return;
            }

            console.log('📺 ChatDetailScreen focused, initializing chat...');
            initializeChat();

            // Cleanup function for useFocusEffect (runs when the screen is blurred/unfocused)
            return () => {
                console.log('📺 ChatDetailScreen unfocused, leaving room...');
                // Ask the socket to leave the room when user leaves the screen
                try { leaveRoom && leaveRoom(chatId); } catch (e) { }
            };
        }, [initializeChat, currentUserId])
    );

    // Additional effect to refresh messages when screen becomes focused (with error handling)
    useFocusEffect(
        useCallback(() => {
            const refreshOnFocus = async () => {
                if (chatId && currentUserId && receiverId) {
                    console.log('🔄 Refreshing messages on screen focus...');
                    try {
                        const chat = await getOrCreateChat(receiverId);
                        if (chat && chat.messages && Array.isArray(chat.messages)) {
                            const refreshedMessages = chat.messages
                                .map(formatAPIMessage)
                                .filter(msg => msg !== null);
                            console.log(`📨 Focus refresh loaded ${refreshedMessages.length} messages`);
                            setMessages(refreshedMessages);
                            setTimeout(() => {
                                try {
                                    flatListRef.current?.scrollToEnd({ animated: true });
                                } catch (scrollError) {
                                    console.warn('Scroll error:', scrollError);
                                }
                            }, 100);
                        }
                    } catch (error) {
                        console.warn('Focus refresh failed:', error);
                    }
                }
            };

            // Small delay to allow screen to fully focus
            const timeoutId = setTimeout(refreshOnFocus, 500);

            return () => {
                clearTimeout(timeoutId);
            };
        }, [chatId, currentUserId, receiverId])
    );


    // 2a. Auto-fix message alignment when currentUserId becomes available
    useEffect(() => {
        if (!currentUserId || messages.length === 0) return;

        console.log('🔧 Auto-fixing message alignment for currentUserId:', currentUserId);

        // Re-classify messages based on originalSenderId
        setMessages(prev => prev.map(msg => {
            // Skip messages that are obviously correct (sending/failed are always user messages)
            if (msg.status === 'sending' || msg.status === 'failed') {
                return { ...msg, sender: 'user' }; // Ensure these are user messages
            }

            // Check if originalSenderId matches current user
            if (msg.originalSenderId && currentUserId) {
                const shouldBeUser = String(msg.originalSenderId).trim() === String(currentUserId).trim();
                const correctSender = shouldBeUser ? 'user' : 'agent';

                if (msg.sender !== correctSender) {
                    console.log(`🔄 Auto-fixing: "${msg.text?.substring(0, 30)}..." from ${msg.sender} to ${correctSender}`);
                    return { ...msg, sender: correctSender };
                }
            }

            return msg;
        }));
    }, [currentUserId, messages.length]);

    // 2b. Polling fallback: periodically refresh messages from server in case socket events are missed
    useEffect(() => {
        let intervalId;
        let mounted = true;

        const refresh = async () => {
            if (!chatId || !receiverId || !currentUserId) return;
            try {
                console.log('🔄 Polling for new messages...');
                // Use getOrCreateChat for more reliable message fetching
                const chat = await getOrCreateChat(receiverId);
                if (!mounted || !chat) return;
                const latest = (chat.messages || [])
                    .map(formatAPIMessage)
                    .filter(msg => msg !== null);
                console.log(`📨 Polling found ${latest.length} total messages`);

                // Smart merging logic (retains local 'sending' status until confirmed)
                setMessages(prev => {
                    if (prev.length === latest.length) {
                        // If count is the same, check if any 'sending' messages need to be marked 'sent'
                        const sendingMsg = prev.find(m => m.status === 'sending');
                        if (sendingMsg) {
                            // If we have a 'sending' message, but the server didn't provide a new count,
                            // we hold off on replacing it, waiting for the server to confirm it properly
                            // or waiting for the local handleSend fix to confirm it.
                            return prev;
                        }
                        return prev; // Avoid unnecessary re-render if count and status are final
                    }

                    const existingIds = new Set(latest.map(m => m.id));

                    // Filter out 'sending' messages that have been confirmed by the server (i.e., they appear in 'latest')
                    let newPrev = prev.filter(pm =>
                        pm.status !== 'sending' ||
                        !existingIds.has(pm.id) // keep the sending message if the server hasn't given it a final ID/time yet
                    );

                    // Add confirmed messages that are new
                    const prevIds = new Set(prev.map(m => m.id));
                    const toAdd = latest.filter(m => !prevIds.has(m.id));

                    if (toAdd.length > 0) {
                        console.log(`📨 Found ${toAdd.length} new messages from polling`);
                        newPrev = [...newPrev, ...toAdd];
                        // Auto-scroll to end when new messages are added via polling
                        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
                    }

                    // Sort by time just in case of out-of-order fetching
                    newPrev.sort((a, b) => moment(a.time, 'hh:mm A').valueOf() - moment(b.time, 'hh:mm A').valueOf());

                    return newPrev;
                });
            } catch (err) {
                // silently ignore polling errors but log them
                console.warn('Polling error (non-critical):', err?.message || err);
            }
        };

        // Start polling once chatId, receiverId and currentUserId are available
        if (chatId && receiverId && currentUserId) {
            // run once immediately
            refresh();
            // Poll moderately for real-time experience (every 2 seconds)
            intervalId = setInterval(refresh, 2000); // every 2s for balance between real-time and performance
        }

        return () => {
            mounted = false;
            if (intervalId) clearInterval(intervalId);
        };
    }, [chatId, receiverId, currentUserId]);


    // 4. Send Logic (Prioritizes Socket, falls back to REST API)
    const handleSend = async () => {
        if (!inputText.trim()) {
            return; // Don't show error for empty messages, just ignore
        }

        if (!chatId) {
            CrossPlatformAlert.alert("Chat Not Ready", "Please wait for the chat to initialize, or go back and try again.");
            return;
        }

        if (!currentUserId) {
            CrossPlatformAlert.alert("Authentication Error", "Please log in again to send messages.");
            return;
        }

        const text = inputText.trim();

        // If we're editing an existing message
        if (editingMessageId) {
            const msgId = editingMessageId;
            setEditingMessageId(null);
            setInputText('');
            // Optimistically update locally
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, text, edited: true } : m));
            // Best-effort API call to update message on server
            try {
                const token = await getAuthToken();
                if (token) {
                    await fetch(`https://gharplotbackend.gntechnology.de/api/chat/message/${msgId}`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                        },
                        body: JSON.stringify({ text }),
                    });
                }
            } catch (err) {
                console.warn('Edit message API failed (best-effort):', err && err.message ? err.message : err);
            }
            return;
        }

        setInputText('');
        setShowEmojiPicker(false);
        const tempMessageId = Date.now().toString();
        // Optimistic UI update - THIS MESSAGE SHOULD APPEAR ON RIGHT SIDE
        const tempMessage = {
            id: tempMessageId,
            text,
            sender: 'user', // IMPORTANT: This makes YOUR message appear on RIGHT side
            time: moment().format('hh:mm A'),
            status: 'sending',
            createdAt: new Date(),
            originalSenderId: currentUserId, // Store current user ID for reference
        };
        console.log(`📤 SENDING MESSAGE:`);
        console.log(`   📝 Text: "${text}"`);
        console.log(`   👤 Sender: "user" (YOUR message)`);
        console.log(`   ➡️ Should appear on RIGHT side`);
        setMessages((prev) => [...prev, tempMessage]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

        try {
            // Try socket first if connected, then fallback to REST API
            let sent = false;

            if (isConnected && sendSocketMessage) {
                console.log('📤 Attempting to send via WebSocket');
                sent = sendSocketMessage(text);
            }

            if (!sent) {
                console.log('📤 Sending via REST API (socket unavailable or failed)');
                const sentMessage = await sendMessageApi(chatId, text);

                // Replace the temporary message with the confirmed server message
                const formattedMessage = formatAPIMessage(sentMessage);
                if (formattedMessage) {
                    setMessages(prev => prev.map(msg =>
                        msg.id === tempMessageId ? formattedMessage : msg
                    ));
                }
            } else {
                console.log('✅ Message sent via WebSocket');
                // For socket messages, the server should echo back and we'll handle it in onNewMessage
            }

            // Ensure scroll to end after message is sent
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

        } catch (error) {
            console.error('Failed to send message:', error);
            // Revert/mark as failed
            setMessages(prev => prev.map(msg =>
                msg.id === tempMessageId ? { ...msg, text: `${msg.text} (Failed)`, status: 'failed' } : msg
            ));
            setInputText(text);
        }
    };

    // Add retry functionality for failed messages
    const handleRetry = async (failedMessage) => {
        if (!failedMessage || !failedMessage.text || !chatId) return;

        const text = failedMessage.text.replace(' (Failed)', '').trim();
        setMessages((prev) => prev.map((msg) => (msg.id === failedMessage.id ? { ...msg, status: 'sending' } : msg)));

        try {
            // Use REST API for retry since WebSocket is unreliable
            const sentMessage = await sendMessageApi(chatId, text);
            const formattedMessage = formatAPIMessage(sentMessage);
            if (formattedMessage) {
                setMessages((prev) => prev.map((msg) => (msg.id === failedMessage.id ? formattedMessage : msg)));
            }
        } catch (error) {
            console.error('Retry failed:', error);
            setMessages((prev) => prev.map((msg) => (msg.id === failedMessage.id ? { ...msg, status: 'failed' } : msg)));
        }
    };

    const handleGoBack = () => navigation.goBack();

    const onMessageLongPress = (item) => {
        // Only allow editing/deleting your own messages
        if (item.sender !== 'user') return;

        // options: Edit, Delete, Cancel
        CrossPlatformAlert.alert(
            '',
            'Choose action',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Edit', onPress: () => {
                        setEditingMessageId(item.id);
                        setInputText(item.text);
                        inputRef.current?.focus && inputRef.current.focus();
                    }
                },
                {
                    text: 'Delete', style: 'destructive', onPress: async () => {
                        try {
                            // optimistic removal
                            setMessages(prev => prev.filter(m => m.id !== item.id));

                            // best-effort API call to delete message
                            try {
                                const token = await getAuthToken();
                                if (token) {
                                    await fetch(`https://gharplotbackend.gntechnology.de/api/chat/message/${item.id}`, {
                                        method: 'DELETE',
                                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
                                    });
                                }
                            } catch (e) {
                                console.warn('delete message API failed (best-effort):', e && e.message ? e.message : e);
                            }
                        } catch (err) {
                            console.error('Failed to delete message locally', err);
                            CrossPlatformAlert.alert("Error", "Failed to delete message locally. History may be incorrect until reload.");
                        }
                    }
                },
            ],
            { cancelable: true }
        );
    };

    const renderMessage = ({ item }) => {
        // Debug logging for message rendering
        const isCurrentUser = item.sender === 'user';
        console.log(`🎨 Rendering message: "${item.text?.substring(0, 30)}..."`);
        console.log(`   📋 sender: "${item.sender}" | isCurrentUser: ${isCurrentUser} | alignment: ${isCurrentUser ? 'RIGHT ➡️' : 'LEFT ⬅️'}`);

        return (
            <TouchableOpacity
                activeOpacity={0.85}
                onLongPress={() => {
                    if (item.sender === 'user' && item.status === 'failed') {
                        handleRetry(item);
                    } else if (item.sender === 'user') {
                        onMessageLongPress(item);
                    }
                }}
                style={[
                    styles.messageContainer,
                    item.sender === 'user' ? styles.userContainer : styles.agentContainer,
                ]}
            >
                <View
                    style={[
                        styles.messageBubble,
                        item.sender === 'user' ? styles.userBubble : styles.agentBubble,
                        item.status === 'failed' && { backgroundColor: '#FCA5A5' }
                    ]}
                >
                    <Text style={item.sender === 'user' ? styles.userText : styles.agentText}>
                        {item.text} {item.edited ? ' (edited)' : ''}
                    </Text>
                    <Text style={item.sender === 'user' ? styles.userTime : styles.agentTime}>
                        {item.time} {item.status === 'sending' ? ' • Sending...' : null}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ marginTop: 10, color: colors.lightText }}>Starting chat...</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            // use padding behavior on both platforms to reliably lift the input
            behavior={'padding'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
            {/* Custom Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleGoBack} style={styles.headerButton}>
                    <Icon name="chevron-back" size={26} color={colors.text} />
                </TouchableOpacity>

                <View style={styles.headerTitleContainer}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {agentAvatar ? (
                            <Image source={{ uri: agentAvatar }} style={{ width: 36, height: 36, borderRadius: 18, marginRight: 8 }} />
                        ) : null}
                        <Text style={styles.headerTitle} numberOfLines={1}>
                            {agentName}
                        </Text>
                    </View>
                    {propertyTitle ? (
                        <Text style={styles.headerSubtitle} numberOfLines={1}>
                            Property: {propertyTitle}
                        </Text>
                    ) : null}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                        <View style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: isConnected ? '#10B981' : '#EF4444',
                            marginRight: 4
                        }} />
                        <Text style={{ fontSize: 10, color: colors.lightText }}>
                            {isConnected ? 'Connected' : 'Offline'}
                        </Text>
                    </View>
                </View>

                {/* Debug button - remove in production */}
                {__DEV__ && (
                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={async () => {
                            const storedUserId = await AsyncStorage.getItem('userId');
                            const storedUserToken = await AsyncStorage.getItem('userToken');

                            CrossPlatformAlert.alert(
                                'Debug Chat',
                                `Current User ID: ${currentUserId}\nStored User ID: ${storedUserId}\nReceiver ID: ${receiverId}`,
                                [
                                    { text: 'OK' },
                                    {
                                        text: 'Test Format Messages',
                                        onPress: () => {
                                            // Add messages in the exact format requested
                                            console.log('🧪 Adding formatted test messages...');
                                            setMessages([
                                                {
                                                    id: 'format-test-1',
                                                    text: 'मेरा message',
                                                    sender: 'user',
                                                    time: '03:32 PM',
                                                    status: 'sent',
                                                    createdAt: new Date()
                                                },
                                                {
                                                    id: 'format-test-2',
                                                    text: 'Other person message',
                                                    sender: 'agent',
                                                    time: '05:30 PM',
                                                    status: 'sent',
                                                    createdAt: new Date()
                                                },
                                                {
                                                    id: 'format-test-3',
                                                    text: 'Another my message',
                                                    sender: 'user',
                                                    time: '05:30 PM',
                                                    status: 'sent',
                                                    createdAt: new Date()
                                                }
                                            ]);
                                            console.log('✅ Formatted test messages added!');
                                        }
                                    },
                                    {
                                        text: 'Force Right Messages',
                                        onPress: () => {
                                            // This will force all messages to be on right side for testing
                                            console.log('🔧 Forcing all messages to RIGHT side...');
                                            setMessages(prev => prev.map(msg => ({
                                                ...msg,
                                                sender: 'user' // Force all to be user messages (right side)
                                            })));
                                        }
                                    },
                                    {
                                        text: 'Show Current State',
                                        onPress: () => {
                                            console.log('📊 Current messages state:');
                                            messages.forEach((msg, idx) => {
                                                console.log(`Message ${idx}: "${msg.text?.substring(0, 30)}..." | sender: "${msg.sender}" | should be: ${msg.sender === 'user' ? 'RIGHT' : 'LEFT'}`);
                                            });
                                        }
                                    },
                                    {
                                        text: 'Fix All My Messages',
                                        onPress: async () => {
                                            const storedUserId = await AsyncStorage.getItem('userId');
                                            const userId = currentUserId || storedUserId;

                                            console.log('🔧 Fixing all messages for userId:', userId);

                                            setMessages(prev => prev.map(msg => {
                                                // Check if this message should be from current user
                                                const shouldBeUserMessage = (
                                                    // Check if originalSenderId matches current user
                                                    (msg.originalSenderId && userId && String(msg.originalSenderId).trim() === String(userId).trim()) ||
                                                    // Check if this looks like a test message from user
                                                    (msg.text && (
                                                        msg.text.includes('Test message from ME') ||
                                                        msg.text.includes('This is MY message') ||
                                                        msg.text.includes('Another MY message') ||
                                                        msg.text.includes('should appear on RIGHT')
                                                    )) ||
                                                    // Messages with these statuses are definitely from current user
                                                    msg.status === 'sending' ||
                                                    msg.status === 'failed' ||
                                                    msg.id?.includes('temp-')
                                                );

                                                if (shouldBeUserMessage && msg.sender !== 'user') {
                                                    console.log(`🔄 Fixing message to RIGHT: "${msg.text?.substring(0, 30)}..."`);
                                                    return { ...msg, sender: 'user' };
                                                } else if (!shouldBeUserMessage && msg.sender === 'user' && !msg.text?.includes('MY message')) {
                                                    // Fix messages that shouldn't be user messages
                                                    console.log(`🔄 Fixing message to LEFT: "${msg.text?.substring(0, 30)}..."`);
                                                    return { ...msg, sender: 'agent' };
                                                }

                                                return msg;
                                            }));
                                        }
                                    },
                                    {
                                        text: 'Clear & Test',
                                        onPress: () => {
                                            // Clear all messages and add simple test
                                            console.log('🧹 Clearing all messages and adding simple test...');
                                            setMessages([
                                                {
                                                    id: 'clear-test-1',
                                                    text: '📱 यह मेरा message है - RIGHT side पर दिखना चाहिए',
                                                    sender: 'user',
                                                    time: moment().format('hh:mm A'),
                                                    status: 'sent',
                                                    createdAt: new Date()
                                                },
                                                {
                                                    id: 'clear-test-2',
                                                    text: '👋 यह दूसरे person का message है - LEFT side पर दिखना चाहिए',
                                                    sender: 'agent',
                                                    time: moment().format('hh:mm A'),
                                                    status: 'sent',
                                                    createdAt: new Date()
                                                }
                                            ]);
                                        }
                                    }
                                ]
                            );
                        }}
                    >
                        <Icon name="bug-outline" size={20} color={colors.primary} />
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={styles.headerButton}
                    onPress={async () => {
                        if (chatId && receiverId) {
                            console.log('🔄 Manual refresh triggered');
                            try {
                                // Use getOrCreateChat for more reliable data
                                const chat = await getOrCreateChat(receiverId);
                                if (chat && chat.messages && Array.isArray(chat.messages)) {
                                    const refreshedMessages = chat.messages
                                        .map(formatAPIMessage)
                                        .filter(msg => msg !== null);
                                    setMessages(refreshedMessages);
                                    setTimeout(() => {
                                        try {
                                            flatListRef.current?.scrollToEnd({ animated: true });
                                        } catch (scrollError) {
                                            console.warn('Scroll error on refresh:', scrollError);
                                        }
                                    }, 100);
                                    console.log(`✅ Manual refresh loaded ${refreshedMessages.length} messages`);
                                } else {
                                    console.warn('No chat data received on manual refresh');
                                }
                            } catch (error) {
                                console.error('Manual refresh failed:', error);
                                CrossPlatformAlert.alert('Refresh Failed', 'Could not refresh messages. Please check your connection and try again.');
                            }
                        } else {
                            CrossPlatformAlert.alert('Error', 'Chat not properly initialized. Please go back and try again.');
                        }
                    }}
                >
                    <Icon name="refresh-outline" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Message List */}
            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id.toString()} // Ensure key is a string
                contentContainerStyle={[styles.messageList, { paddingBottom: showEmojiPicker ? 260 : 120 }]}
                keyboardShouldPersistTaps={'handled'}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />
            {/* Emoji Picker (simple) */}
            {showEmojiPicker && (
                <View style={styles.emojiPicker}>
                    {['😀', '😁', '😂', '😉', '😍', '🤔', '😭', '😮', '👍', '🙏', '🔥', '🎉'].map(e => (
                        <TouchableOpacity key={e} onPress={() => { setInputText(prev => prev + e); }} style={styles.emojiButton}>
                            <Text style={{ fontSize: 20 }}>{e}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* Input Area */}
            <View style={styles.inputContainer}>
                <TouchableOpacity style={{ marginRight: 8 }} onPress={() => setShowEmojiPicker(prev => !prev)}>
                    <Icon name="happy-outline" size={26} color={colors.lightText} />
                </TouchableOpacity>
                <TextInput
                    ref={inputRef}
                    style={styles.input}
                    placeholder="Type a message..."
                    placeholderTextColor={colors.lightText}
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                    onFocus={() => {
                        setShowEmojiPicker(false); // Hide emoji picker on keyboard focus
                        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 120);
                    }}
                />
                <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                    <Icon name="send" size={22} color={colors.white} />
                </TouchableOpacity>
            </View>
            {/* Dev-only raw socket events overlay */}
            {__DEV__ && rawEvents.length > 0 && (
                <View style={{ position: 'absolute', left: 10, right: 10, top: 80, backgroundColor: 'rgba(0,0,0,0.7)', padding: 8, borderRadius: 8 }}>
                    <Text style={{ color: '#fff', fontWeight: '700', marginBottom: 6 }}>Raw socket events (dev)</Text>
                    {rawEvents.map((r, i) => (
                        <Text key={i} style={{ color: '#ddd', fontSize: 11 }} numberOfLines={2}>{r}</Text>
                    ))}
                </View>
            )}
        </KeyboardAvoidingView>
    );
};

// --- Styles (Unchanged) ---
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15,
        paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingBottom: 12,
        backgroundColor: colors.white, borderBottomWidth: 1, borderColor: '#E2E8F0',
        elevation: 2,
    },
    headerButton: { padding: 5, },
    headerTitleContainer: { flex: 1, alignItems: 'center', },
    headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text, },
    headerSubtitle: { fontSize: 12, color: colors.lightText, },

    // Messages
    messageList: { paddingHorizontal: 10, paddingVertical: 10, },
    messageContainer: { marginVertical: 5, maxWidth: '80%', },
    userContainer: { alignSelf: 'flex-end', },
    agentContainer: { alignSelf: 'flex-start', },
    messageBubble: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: 18, flexDirection: 'column', },
    userBubble: { backgroundColor: colors.senderBubble, borderBottomRightRadius: 2, },
    agentBubble: { backgroundColor: colors.receiverBubble, borderBottomLeftRadius: 2, borderWidth: 1, borderColor: '#E5E7EB', },
    userText: { color: colors.white, fontSize: 15, },
    agentText: { color: colors.text, fontSize: 15, },
    userTime: { color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 5, alignSelf: 'flex-end', },
    agentTime: { color: colors.lightText, fontSize: 10, marginTop: 5, alignSelf: 'flex-end', },

    // Input
    inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: colors.white, alignItems: 'center', borderTopWidth: 1, borderColor: '#E2E8F0', },
    input: { flex: 1, backgroundColor: '#E9EEF7', borderRadius: 25, paddingHorizontal: 15, paddingVertical: 10, marginRight: 10, fontSize: 16, maxHeight: 100, color: colors.text, },
    sendButton: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', },
    emojiPicker: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#fff', padding: 8, borderTopWidth: 1, borderColor: '#E2E8F0' },
    emojiButton: { padding: 6, margin: 4, borderRadius: 6 },
});

export default ChatDetailScreen;