import { io } from 'socket.io-client';

// Singleton Socket.IO instance
let socketInstance = null;

const API_URL = import.meta.env.VITE_API_URL || '';

// Create Socket.IO instance with reconnection config
const createSocketInstance = () => io(API_URL, {
    withCredentials: true,
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 3000
});

// Get or create socket instance
export const ensureSocket = () => {
    if (!socketInstance) {
        socketInstance = createSocketInstance();
    }

    return socketInstance;
};

// Connect to socket if not already connected
export const connectSocket = () => {
    if (socketInstance?.connected) {
        return socketInstance;
    }

    const socket = ensureSocket();

    if (!socket.active) {
        socket.connect();
    }

    return socket;
};

// Disconnect from socket
export const disconnectSocket = () => {
    if (socketInstance) {
        socketInstance.disconnect();
    }
};

// Return current socket instance
export const getSocket = () => socketInstance;
