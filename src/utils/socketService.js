import io from 'socket.io-client';
import { getAuthToken } from '../services/chatApi';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOCKET_URL = 'https://gharplotbackend.gntechnology.de';
let socket = null;

export const getSocket = () => {
    return socket;
};

export const initializeSocket = async () => {
    try {
        if (socket && socket.connected) {
            return socket;
        }

        let token = await AsyncStorage.getItem('crm_auth_token');
        if (!token) token = await AsyncStorage.getItem('employee_auth_token');
        if (!token) token = await AsyncStorage.getItem('userToken');

        if (!token) {
            console.warn('⚠️ No auth token for global socket, attempting connection without auth.');
        }

        socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            timeout: 10000,
            auth: { token },
            query: { token }
        });

        socket.on('connect', () => {
            console.log('✅ Global socket connected');
        });

        socket.on('connect_error', (error) => {
            console.warn('❌ Global socket error:', error.message);
        });

        return socket;
    } catch (error) {
        console.error('❌ Global socket init failed:', error);
        return null;
    }
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

export default { getSocket, initializeSocket, disconnectSocket };
