import React, { useEffect, useState } from 'react';
import { connectSocket, disconnectSocket, ensureSocket, getSocket } from '../lib/socket.js';

export default function SocketTest() {
    const [toUserId, setToUserId] = useState('');
    const [isTyping, setIsTyping] = useState(true);
    const [isConnected, setIsConnected] = useState(Boolean(getSocket()?.connected));
    const [socketId, setSocketId] = useState(getSocket()?.id || '');
    const [logs, setLogs] = useState([]);

    const appendLog = (message) => {
        setLogs((prev) => {
            const next = [`${new Date().toLocaleTimeString()} - ${message}`, ...prev];
            return next.slice(0, 100);
        });
    };

    useEffect(() => {
        const socket = ensureSocket();

        const onConnect = () => {
            setIsConnected(true);
            setSocketId(socket.id || '');
            appendLog(`Connected (${socket.id || 'no id'})`);
        };

        const onDisconnect = (reason) => {
            setIsConnected(false);
            setSocketId('');
            appendLog(`Disconnected: ${reason}`);
        };

        const onReady = (payload) => {
            appendLog(`socket:ready received for ${payload?.username || payload?.userId || 'unknown user'}`);
        };

        const onTyping = (payload) => {
            appendLog(`dm:typing from ${payload?.fromUserId || 'unknown'} => ${payload?.isTyping ? 'typing' : 'not typing'}`);
        };

        const onConnectError = (error) => {
            const message = error?.message || 'unknown error';
            appendLog(`connect_error: ${message}`);

            if (error?.data?.code) {
                appendLog(`error_code: ${error.data.code}`);
            }

            if (error?.data?.details) {
                appendLog(`error_details: ${error.data.details}`);
            }

            if (error?.description) {
                appendLog(`error_description: ${String(error.description)}`);
            }

            if (error?.context?.status) {
                appendLog(`error_http_status: ${error.context.status}`);
            }

            if (message === 'Authentication required' || message === 'Invalid auth token') {
                appendLog('Authentication failed. Please log in first, then reconnect.');
                socket.disconnect();
            }
        };

        const onReconnectAttempt = (attemptNumber) => {
            appendLog(`Reconnect attempt ${attemptNumber}`);
        };

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('socket:ready', onReady);
        socket.on('dm:typing', onTyping);
        socket.on('connect_error', onConnectError);
        socket.io.on('reconnect_attempt', onReconnectAttempt);

        setIsConnected(Boolean(socket.connected));
        setSocketId(socket.id || '');
        appendLog('Socket test listeners initialized. Click Connect to begin.');

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('socket:ready', onReady);
            socket.off('dm:typing', onTyping);
            socket.off('connect_error', onConnectError);
            socket.io.off('reconnect_attempt', onReconnectAttempt);
        };
    }, []);

    const statusClassName = isConnected ? 'socket-status connected' : 'socket-status disconnected';

    const handleConnect = () => {
        const socket = connectSocket();

        if (socket.active && !socket.connected) {
            appendLog('Connection request sent. Waiting for server response...');
        }

        appendLog('Connect requested');
        setIsConnected(Boolean(socket.connected));
        setSocketId(socket.id || '');
    };

    const handleDisconnect = () => {
        disconnectSocket();
        appendLog('Disconnect requested');
        setIsConnected(false);
        setSocketId('');
    };

    const handleEmitTyping = () => {
        const socket = getSocket();
        if (!socket || !socket.connected) {
            appendLog('Cannot emit dm:typing while disconnected');
            return;
        }

        if (!toUserId.trim()) {
            appendLog('Enter a target user id before emitting dm:typing');
            return;
        }

        socket.emit('dm:typing', {
            toUserId: toUserId.trim(),
            isTyping
        });

        appendLog(`Emitted dm:typing to ${toUserId.trim()} as ${isTyping ? 'typing' : 'not typing'}`);
    };

    return (
        <div className="page socket-test-page">
            <h1>Socket.IO Test</h1>

            <section className="socket-card">
                <div className="socket-status-row">
                    <span className={statusClassName}>{isConnected ? 'Connected' : 'Disconnected'}</span>
                    <span className="socket-id">Socket ID: {socketId || 'N/A'}</span>
                </div>

                <div className="socket-actions">
                    <button onClick={handleConnect}>Connect</button>
                    <button onClick={handleDisconnect}>Disconnect</button>
                </div>
            </section>

            <section className="socket-card">
                <h2>Emit dm:typing</h2>
                <div className="socket-form-row">
                    <label htmlFor="targetUserId">Target user id</label>
                    <input
                        id="targetUserId"
                        value={toUserId}
                        onChange={(e) => setToUserId(e.target.value)}
                        placeholder="Mongo user id"
                    />
                </div>

                <div className="socket-form-row">
                    <label htmlFor="typingSelect">Typing state</label>
                    <select
                        id="typingSelect"
                        value={isTyping ? 'true' : 'false'}
                        onChange={(e) => setIsTyping(e.target.value === 'true')}
                    >
                        <option value="true">typing</option>
                        <option value="false">not typing</option>
                    </select>
                </div>

                <button onClick={handleEmitTyping}>Emit Event</button>
            </section>

            <section className="socket-card">
                <h2>Event Log</h2>
                <div className="socket-log">
                    {logs.length === 0 ? <p>No socket activity yet.</p> : null}
                    {logs.map((entry, index) => (
                        <p key={`${entry}-${index}`}>{entry}</p>
                    ))}
                </div>
            </section>
        </div>
    );
}