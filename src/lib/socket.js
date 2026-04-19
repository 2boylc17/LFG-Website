import { io } from 'socket.io-client';

let socketInstance = null;

const createSocketInstance = () => io({
    withCredentials: true,
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 3000
});

export const ensureSocket = () => {
    if (!socketInstance) {
        socketInstance = createSocketInstance();
    }

    return socketInstance;
};

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

export const disconnectSocket = () => {
    if (socketInstance) {
        socketInstance.disconnect();
    }
};

export const getSocket = () => socketInstance;
