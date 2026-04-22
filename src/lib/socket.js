import { io } from 'socket.io-client';

// Singleton socket instance shared across the app.
let socketInstance = null;

// Creates a new Socket.IO client with credentials and reconnection settings.
// autoConnect is false so the connection is established explicitly via connectSocket().
const createSocketInstance = () => io({
    withCredentials: true,
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 3000
});

// Returns the existing socket instance, creating one if it doesn't exist yet.
export const ensureSocket = () => {
    if (!socketInstance) {
        socketInstance = createSocketInstance();
    }

    return socketInstance;
};

// Connects the socket if it is not already connected or active.
// Returns the socket instance.
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

// Disconnects the socket if an instance exists.
export const disconnectSocket = () => {
    if (socketInstance) {
        socketInstance.disconnect();
    }
};

// Returns the current socket instance, or null if none has been created.
export const getSocket = () => socketInstance;
