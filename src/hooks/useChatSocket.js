// src/hooks/useChatSocket.js

import { useEffect, useState, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import { getAuthToken } from '../services/chatApi';

// 🚨 IMPORTANT: Use 'http' or 'https' for the base URL 
const SOCKET_URL = 'https://gharplotbackend.gntechnology.de';

/**
 * Custom hook to manage WebSocket connection and real-time chat messages.
 */
const useChatSocket = (chatId, onNewMessage, onRawEvent) => {
  const socketRef = useRef(null);
  const onNewMessageRef = useRef(onNewMessage);
  const onRawEventRef = useRef(onRawEvent);
  const [isConnected, setIsConnected] = useState(false);

  // keep the latest handler in a ref so event listeners always call the latest
  useEffect(() => { onNewMessageRef.current = onNewMessage; }, [onNewMessage]);
  useEffect(() => { onRawEventRef.current = onRawEvent; }, [onRawEvent]);

  useEffect(() => {
    let mounted = true;

    // Initialize socket connection
    const initSocket = async () => {
      try {
        console.log('🔌 Attempting socket connection to:', SOCKET_URL);

        const token = await getAuthToken();
        if (!token) {
          console.warn('⚠️ No auth token available for socket connection');
          return;
        }

        const socketInstance = io(SOCKET_URL, {
          transports: ['websocket', 'polling'],
          timeout: 10000,
          forceNew: true,
          auth: {
            token: token
          },
          query: {
            token: token
          }
        });

        socketRef.current = socketInstance;

        // Connection event handlers
        socketInstance.on('connect', () => {
          if (!mounted) return;
          console.log('✅ Socket connected successfully');
          setIsConnected(true);

          // Join the specific chat room if chatId is provided
          if (chatId) {
            console.log('🔔 Auto-joining chat room:', chatId);
            try {
              socketInstance.emit('joinChat', { chatId });
              socketInstance.emit('join', { chatId });
            } catch (e) {
              console.warn('Failed to join chat room:', e);
            }
          }
        });

        socketInstance.on('disconnect', (reason) => {
          if (!mounted) return;
          console.log('🔌 Socket disconnected:', reason);
          setIsConnected(false);
        });

        socketInstance.on('connect_error', (error) => {
          if (!mounted) return;
          console.warn('❌ Socket connection error:', error.message);
          setIsConnected(false);
        });

        // Message event handlers
        socketInstance.on('newMessage', (data) => {
          if (!mounted) return;
          console.log('📨 Received newMessage via socket:', data);
          if (onNewMessageRef.current) {
            onNewMessageRef.current(data);
          }
          if (onRawEventRef.current) {
            onRawEventRef.current(`newMessage: ${JSON.stringify(data)}`);
          }
        });

        socketInstance.on('message', (data) => {
          if (!mounted) return;
          console.log('📨 Received message via socket:', data);
          if (onNewMessageRef.current) {
            onNewMessageRef.current(data);
          }
          if (onRawEventRef.current) {
            onRawEventRef.current(`message: ${JSON.stringify(data)}`);
          }
        });

        socketInstance.on('chatMessage', (data) => {
          if (!mounted) return;
          console.log('📨 Received chatMessage via socket:', data);
          if (onNewMessageRef.current) {
            onNewMessageRef.current(data);
          }
          if (onRawEventRef.current) {
            onRawEventRef.current(`chatMessage: ${JSON.stringify(data)}`);
          }
        });

      } catch (error) {
        console.error('❌ Failed to initialize socket:', error);
        setIsConnected(false);
      }
    };

    initSocket();

    // Cleanup function
    return () => {
      mounted = false;
      if (socketRef.current) {
        console.log('🧹 Cleaning up socket connection');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
    };
  }, [chatId]);

  // 4. Function to send a message via the socket
  const sendSocketMessage = useCallback((text) => {
    if (!socketRef.current || !isConnected || !chatId) {
      console.log('📨 Socket not connected, cannot send real-time message');
      return false;
    }

    try {
      const messageData = {
        chatId: chatId,
        text: text,
        timestamp: new Date().toISOString()
      };

      console.log('📤 Sending message via socket:', messageData);

      // Try multiple event names as different servers might use different ones
      socketRef.current.emit('sendMessage', messageData);
      socketRef.current.emit('message', messageData);
      socketRef.current.emit('chatMessage', messageData);

      return true;
    } catch (error) {
      console.error('❌ Failed to send socket message:', error);
      return false;
    }
  }, [chatId, isConnected]);

  // Explicitly join a chat room (some servers require an explicit join after connection)
  const joinRoom = useCallback((roomId) => {
    try {
      if (socketRef.current && roomId) {
        try { socketRef.current.emit('joinChat', { chatId: roomId }); } catch (e) { }
        try { socketRef.current.emit('join', { chatId: roomId }); } catch (e) { }
        try { socketRef.current.emit('subscribe', { chatId: roomId }); } catch (e) { }
        console.log('🔔 joinRoom emitted for', roomId);
        return true;
      }
    } catch (e) {
      console.warn('joinRoom failed', e && e.message ? e.message : e);
    }
    return false;
  }, []);

  const leaveRoom = useCallback((roomId) => {
    try {
      if (socketRef.current && roomId) {
        try { socketRef.current.emit('leaveChat', { chatId: roomId }); } catch (e) { }
        try { socketRef.current.emit('leave', { chatId: roomId }); } catch (e) { }
        console.log('🔕 leaveRoom emitted for', roomId);
        return true;
      }
    } catch (e) {
      console.warn('leaveRoom failed', e && e.message ? e.message : e);
    }
    return false;
  }, []);

  return { isConnected, sendSocketMessage, joinRoom, leaveRoom };
};

export default useChatSocket;