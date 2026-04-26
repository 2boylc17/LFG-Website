import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api.js";
import { connectSocket, getSocket } from "../lib/socket.js";

const emptyMessage = { text: "", error: false };

const getThreadSocket = () => {
    if (typeof window !== 'undefined' && window.__friendsTestSocket) {
        return window.__friendsTestSocket;
    }
    return getSocket() || connectSocket();
};

const getLiveSocket = () => {
    if (typeof window !== 'undefined' && window.__friendsLiveSocket) {
        return window.__friendsLiveSocket;
    }
    return connectSocket();
};

export default function Friends({ isLoggedIn }) {
    const navigate = useNavigate();
    const [friends, setFriends] = useState([]);
    const [incomingRequests, setIncomingRequests] = useState([]);
    const [outgoingRequests, setOutgoingRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [requestActionMessage, setRequestActionMessage] = useState({ text: "", error: false });
    const [processingRequestUsername, setProcessingRequestUsername] = useState("");
    const [removingFriendUsername, setRemovingFriendUsername] = useState("");
    const [removeFriendConfirmUsername, setRemoveFriendConfirmUsername] = useState("");
    const [isRequestsOpen, setIsRequestsOpen] = useState(false);
    const [selectedFriendUsername, setSelectedFriendUsername] = useState("");
    const [threadMessages, setThreadMessages] = useState([]);
    const [loadingThread, setLoadingThread] = useState(false);
    const [messagesNotice, setMessagesNotice] = useState(emptyMessage);
    const [composer, setComposer] = useState("");
    const [sending, setSending] = useState(false);
    const [socketReady, setSocketReady] = useState(false);

    const currentUsername = localStorage.getItem("username") || "";
    const selectedFriend = friends.find((friend) => String(friend?.username || '') === selectedFriendUsername) || null;

    const emitIncomingRequestCount = (count) => {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('friends:incoming-count', { detail: { count } }));
        }
    };

    const loadFriendsData = async () => {
        const response = await apiFetch('/api/settings/friends', { credentials: 'include' });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data?.message || data?.error || 'Failed to load friends');
        }

        setFriends(Array.isArray(data?.friends) ? data.friends : []);
        const nextIncomingRequests = Array.isArray(data?.incomingRequests) ? data.incomingRequests : [];
        setIncomingRequests(nextIncomingRequests);
        setOutgoingRequests(Array.isArray(data?.outgoingRequests) ? data.outgoingRequests : []);
        emitIncomingRequestCount(nextIncomingRequests.length);
    };

    const loadThread = async (friendUsername) => {
        if (!friendUsername) {
            setThreadMessages([]);
            return;
        }

        try {
            setLoadingThread(true);
            setMessagesNotice(emptyMessage);

            const socket = getThreadSocket();
            const data = await new Promise((resolve) => {
                socket.emit('dm:thread:get', { withUsername: friendUsername }, (payload) => {
                    resolve(payload || { ok: false, message: 'No response from server' });
                });
            });

            if (!data?.ok) {
                throw new Error(data?.message || data?.error || 'Failed to load conversation');
            }

            setThreadMessages(Array.isArray(data?.messages) ? data.messages : []);
        } catch (err) {
            setMessagesNotice({ text: err.message || 'Failed to load conversation', error: true });
            setThreadMessages([]);
        } finally {
            setLoadingThread(false);
        }
    };

    useEffect(() => {
        if (!isLoggedIn) {
            navigate('/login');
            return;
        }

        const load = async () => {
            try {
                setLoading(true);
                setError("");
                setRequestActionMessage({ text: "", error: false });
                await loadFriendsData();
            } catch (err) {
                setError(err.message || 'Failed to load friends');
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [isLoggedIn, navigate]);

    useEffect(() => {
        const socket = getLiveSocket();

        const onReady = () => setSocketReady(true);
        const onConnect = () => setSocketReady(true);
        const onDisconnect = () => setSocketReady(false);
        const onIncomingMessage = (message) => {
            if (!message || !selectedFriendUsername) return;

            const sender = String(message?.senderUsername || '');
            const recipient = String(message?.recipientUsername || '');
            if (sender !== selectedFriendUsername && recipient !== selectedFriendUsername) {
                return;
            }

            setThreadMessages((previousMessages) => {
                const incomingId = String(message?._id || '');
                if (incomingId && previousMessages.some((existingMessage) => String(existingMessage?._id || '') === incomingId)) {
                    return previousMessages;
                }
                return [...previousMessages, message];
            });
        };

        socket.on('socket:ready', onReady);
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('dm:message:new', onIncomingMessage);
        setSocketReady(socket.connected);

        return () => {
            socket.off('socket:ready', onReady);
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('dm:message:new', onIncomingMessage);
        };
    }, [selectedFriendUsername]);

    useEffect(() => {
        if (friends.length === 0) {
            setSelectedFriendUsername('');
            setThreadMessages([]);
            return;
        }

        const friendUsernames = friends
            .map((friend) => String(friend?.username || ''))
            .filter(Boolean);

        const nextSelected = friendUsernames.includes(selectedFriendUsername)
            ? selectedFriendUsername
            : (friendUsernames[0] || '');

        if (!nextSelected) {
            setSelectedFriendUsername('');
            setThreadMessages([]);
            return;
        }

        if (nextSelected !== selectedFriendUsername) {
            setSelectedFriendUsername(nextSelected);
        }

        loadThread(nextSelected);
    }, [friends]);

    const reviewFriendRequest = async (requestUsername, action) => {
        if (!requestUsername) return;

        try {
            setProcessingRequestUsername(requestUsername);
            setRequestActionMessage({ text: "", error: false });

            const endpoint = action === 'accept'
                ? `/api/settings/friends/request/${encodeURIComponent(requestUsername)}/accept`
                : `/api/settings/friends/request/${encodeURIComponent(requestUsername)}/reject`;

            const response = await apiFetch(endpoint, {
                method: 'POST',
                credentials: 'include'
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.message || data?.error || 'Failed to process request');
            }

            setRequestActionMessage({ text: data?.message || 'Request updated', error: false });
            await loadFriendsData();
        } catch (err) {
            setRequestActionMessage({ text: err.message || 'Failed to process request', error: true });
        } finally {
            setProcessingRequestUsername("");
        }
    };

    const handleRemoveFriend = async (friendUsername) => {
        if (!friendUsername) return;

        try {
            setRemovingFriendUsername(friendUsername);
            setRequestActionMessage({ text: "", error: false });

            const response = await apiFetch(`/api/settings/friends/remove/${encodeURIComponent(friendUsername)}`, {
                method: 'POST',
                credentials: 'include'
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.message || data?.error || 'Failed to remove friend');
            }

            setRequestActionMessage({ text: data?.message || 'Friend removed', error: false });
            await loadFriendsData();
        } catch (err) {
            setRequestActionMessage({ text: err.message || 'Failed to remove friend', error: true });
        } finally {
            setRemovingFriendUsername("");
        }
    };

    const openRemoveFriendConfirm = (friendUsername) => {
        if (!friendUsername) return;
        setRemoveFriendConfirmUsername(friendUsername);
    };

    const closeRemoveFriendConfirm = () => {
        if (removingFriendUsername) return;
        setRemoveFriendConfirmUsername("");
    };

    const confirmRemoveFriend = async () => {
        if (!removeFriendConfirmUsername) return;
        await handleRemoveFriend(removeFriendConfirmUsername);
        setRemoveFriendConfirmUsername("");
    };

    const handleSelectFriendForChat = async (friendUsername) => {
        if (!friendUsername) return;
        setSelectedFriendUsername(friendUsername);
        await loadThread(friendUsername);

        const messagesSection = document.getElementById('friends-messages-section');
        if (messagesSection) {
            messagesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        const text = String(composer || '').trim();
        if (!selectedFriendUsername || !text) return;

        try {
            setSending(true);
            setMessagesNotice(emptyMessage);

            const socket = getSocket() || connectSocket();
            const data = await new Promise((resolve) => {
                socket.emit('dm:message:send', { toUsername: selectedFriendUsername, text }, (payload) => {
                    resolve(payload || { ok: false, message: 'No response from server' });
                });
            });

            if (!data?.ok) {
                throw new Error(data?.message || data?.error || 'Failed to send message');
            }

            setComposer('');
        } catch (err) {
            setMessagesNotice({ text: err.message || 'Failed to send message', error: true });
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="page friends-page">
            {!loading && !error && requestActionMessage.text ? (
                <p className={`friends-action-message ${requestActionMessage.error ? 'friends-action-message-error' : 'friends-action-message-success'}`}>
                    {requestActionMessage.text}
                </p>
            ) : null}

            <section className="friends-shell friend-requests-shell">
                <div className="friends-subheader-row">
                    <h2>Friend Requests</h2>
                    <div className="friend-requests-actions">
                        <span className="friends-count">{incomingRequests.length} pending</span>
                        <button
                            type="button"
                            className="friend-requests-toggle-btn"
                            onClick={() => setIsRequestsOpen((prev) => !prev)}
                        >
                            {isRequestsOpen ? 'Hide Requests' : 'Open Requests'}
                        </button>
                    </div>
                </div>

                {loading ? <p>Loading requests...</p> : null}
                {!loading && error ? <p className="error">{error}</p> : null}

                {!loading && !error && !isRequestsOpen ? (
                    <p className="friends-empty">Open requests to review incoming friend requests.</p>
                ) : null}

                {!loading && !error && isRequestsOpen && incomingRequests.length === 0 ? (
                    <p className="friends-empty">No pending friend requests.</p>
                ) : null}

                {!loading && !error && isRequestsOpen && incomingRequests.length > 0 ? (
                    <div className="friends-list">
                        {incomingRequests.map((requestUser) => {
                            const requestName = String(requestUser?.username || "Unknown");
                            const isWorking = processingRequestUsername === requestName;

                            return (
                                <article className="friend-card" key={`incoming-${String(requestUser?._id || requestName)}`}>
                                    <div className="friend-card-top">
                                        <p className="friend-name">{requestName}</p>
                                        <Link className="friend-profile-link" to={`/profile/${encodeURIComponent(requestName)}?returnTo=${encodeURIComponent('/friends')}`}>
                                            View Profile
                                        </Link>
                                    </div>
                                    <p className="friend-bio">{requestUser?.bio || 'No bio set'}</p>
                                    <div className="friend-request-actions">
                                        <button
                                            type="button"
                                            className="friend-request-accept-btn"
                                            onClick={() => reviewFriendRequest(requestName, 'accept')}
                                            disabled={isWorking}
                                        >
                                            {isWorking ? 'Working...' : 'Accept'}
                                        </button>
                                        <button
                                            type="button"
                                            className="friend-request-reject-btn"
                                            onClick={() => reviewFriendRequest(requestName, 'reject')}
                                            disabled={isWorking}
                                        >
                                            {isWorking ? 'Working...' : 'Reject'}
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                ) : null}

                {!loading && !error && outgoingRequests.length > 0 ? (
                    <p className="friends-empty">Pending sent requests: {outgoingRequests.map((entry) => entry?.username).filter(Boolean).join(', ')}</p>
                ) : null}
            </section>

            <section className="friends-shell" id="friends-messages-section">
                <div className="messages-header-row">
                    <h2>Messages</h2>
                    <p>{socketReady ? 'Live chat connected' : 'Connecting...'}</p>
                </div>

                {messagesNotice.text ? (
                    <p className={messagesNotice.error ? 'error' : 'profile-success'}>{messagesNotice.text}</p>
                ) : null}

                {!loading && !error && friends.length === 0 ? (
                    <p className="friends-empty">No friends available to message yet.</p>
                ) : null}

                {!loading && !error && friends.length > 0 ? (
                    <div className="messages-layout">
                        <aside className="messages-friends-list" aria-label="Friends">
                            {friends.map((friend) => {
                                const friendName = String(friend?.username || 'Unknown');
                                const isSelected = friendName === selectedFriendUsername;

                                return (
                                    <button
                                        key={String(friend?._id || friendName)}
                                        type="button"
                                        className={`messages-friend-item ${isSelected ? 'active' : ''}`}
                                        onClick={() => handleSelectFriendForChat(friendName)}
                                    >
                                        {friendName}
                                    </button>
                                );
                            })}
                        </aside>

                        <section className="messages-thread">
                            <h2>{selectedFriendUsername ? `Chat with ${selectedFriendUsername}` : 'Select a friend'}</h2>

                            {selectedFriend ? (
                                <article className="friend-card friend-chat-profile-card">
                                    <div className="friend-card-top">
                                        <p className="friend-name">{selectedFriend.username || 'Unknown'}</p>
                                        <div className="friend-card-actions">
                                            <Link
                                                className="friend-profile-link"
                                                to={`/profile/${encodeURIComponent(selectedFriend.username || '')}?returnTo=${encodeURIComponent('/friends')}`}
                                            >
                                                Full Profile
                                            </Link>
                                            <button
                                                type="button"
                                                className="friend-remove-btn"
                                                onClick={() => openRemoveFriendConfirm(String(selectedFriend.username || ''))}
                                                disabled={removingFriendUsername === String(selectedFriend.username || '')}
                                            >
                                                {removingFriendUsername === String(selectedFriend.username || '') ? 'Removing...' : 'Remove Friend'}
                                            </button>
                                        </div>
                                    </div>
                                    <p className="friend-bio">{selectedFriend?.bio || 'No bio set'}</p>
                                    <p className="friend-meta"><strong>Play Style:</strong> {selectedFriend?.playStyle || 'Not set'}</p>
                                    <p className="friend-meta">
                                        <strong>Platforms:</strong>{' '}
                                        {Array.isArray(selectedFriend?.platforms) && selectedFriend.platforms.filter(Boolean).length > 0
                                            ? selectedFriend.platforms.filter(Boolean).join(', ')
                                            : 'None selected'}
                                    </p>
                                </article>
                            ) : null}

                            {loadingThread ? <p>Loading messages...</p> : null}

                            {!loadingThread && threadMessages.length === 0 ? (
                                <p className="friends-empty">No messages yet. Start the conversation.</p>
                            ) : null}

                            {!loadingThread && threadMessages.length > 0 ? (
                                <div className="messages-log">
                                    {threadMessages.map((message) => {
                                        const isOwnMessage = message?.senderUsername === currentUsername;

                                        return (
                                            <div
                                                key={String(message?._id || `${message.senderUsername}-${message.createdAt}`)}
                                                className={`messages-bubble ${isOwnMessage ? 'messages-bubble-own' : 'messages-bubble-other'}`}
                                            >
                                                <p className="messages-bubble-meta">
                                                    {message?.senderUsername || 'Unknown'} - {new Date(message?.createdAt || Date.now()).toLocaleTimeString()}
                                                </p>
                                                <p className="messages-bubble-text">{message?.text || ''}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : null}

                            <form className="messages-form" onSubmit={handleSendMessage}>
                                <input
                                    type="text"
                                    value={composer}
                                    onChange={(e) => setComposer(e.target.value)}
                                    maxLength={500}
                                    placeholder={selectedFriendUsername ? 'Write a message' : 'Select a friend to chat'}
                                    disabled={!selectedFriendUsername || sending}
                                />
                                <button type="submit" disabled={!selectedFriendUsername || sending || !composer.trim()}>
                                    {sending ? 'Sending...' : 'Send'}
                                </button>
                            </form>
                        </section>
                    </div>
                ) : null}
            </section>

            {removeFriendConfirmUsername ? (
                <div className="friends-confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="remove-friend-title">
                    <div className="friends-confirm-card">
                        <h3 id="remove-friend-title">Remove Friend?</h3>
                        <p>
                            Remove <strong>{removeFriendConfirmUsername}</strong> from your friends list?
                        </p>
                        <div className="friends-confirm-actions">
                            <button
                                type="button"
                                className="friend-profile-link"
                                onClick={closeRemoveFriendConfirm}
                                disabled={Boolean(removingFriendUsername)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="friend-remove-btn"
                                onClick={confirmRemoveFriend}
                                disabled={Boolean(removingFriendUsername)}
                            >
                                {removingFriendUsername ? 'Removing...' : 'Yes, Remove'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
