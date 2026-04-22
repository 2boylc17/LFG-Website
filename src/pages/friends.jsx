import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Friends({ isLoggedIn }) {
    const navigate = useNavigate();
    const [friends, setFriends] = useState([]);
    const [incomingRequests, setIncomingRequests] = useState([]);
    const [outgoingRequests, setOutgoingRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [requestActionMessage, setRequestActionMessage] = useState({ text: "", error: false });
    const [processingRequestUsername, setProcessingRequestUsername] = useState("");

    const emitIncomingRequestCount = (count) => {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('friends:incoming-count', { detail: { count } }));
        }
    };

    const loadFriendsData = async () => {
        const response = await fetch('/api/settings/friends', { credentials: 'include' });
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

    const reviewFriendRequest = async (requestUsername, action) => {
        if (!requestUsername) return;

        try {
            setProcessingRequestUsername(requestUsername);
            setRequestActionMessage({ text: "", error: false });

            const endpoint = action === 'accept'
                ? `/api/settings/friends/request/${encodeURIComponent(requestUsername)}/accept`
                : `/api/settings/friends/request/${encodeURIComponent(requestUsername)}/reject`;

            const response = await fetch(endpoint, {
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

    return (
        <div className="page friends-page">
            <section className="friends-shell">
                <div className="friends-header-row">
                    <h1>Friends</h1>
                    <span className="friends-count">{friends.length} total</span>
                </div>

                {loading ? <p>Loading friends...</p> : null}
                {!loading && error ? <p className="error">{error}</p> : null}
                {!loading && !error && requestActionMessage.text ? (
                    <p className={requestActionMessage.error ? 'error' : 'profile-success'}>{requestActionMessage.text}</p>
                ) : null}

                {!loading && !error ? (
                    <section className="friends-requests-section">
                        <div className="friends-subheader-row">
                            <h2>Friend Requests</h2>
                            <span className="friends-count">{incomingRequests.length} pending</span>
                        </div>

                        {incomingRequests.length === 0 ? (
                            <p className="friends-empty">No pending friend requests.</p>
                        ) : (
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
                        )}
                    </section>
                ) : null}

                {!loading && !error && friends.length === 0 ? (
                    <p className="friends-empty">No friends yet. Visit player profiles to add friends.</p>
                ) : null}

                {!loading && !error && outgoingRequests.length > 0 ? (
                    <p className="friends-empty">Pending sent requests: {outgoingRequests.map((entry) => entry?.username).filter(Boolean).join(', ')}</p>
                ) : null}

                {!loading && !error && friends.length > 0 ? (
                    <div className="friends-list">
                        {friends.map((friend) => {
                            const friendName = String(friend?.username || "Unknown");
                            const friendPlatforms = Array.isArray(friend?.platforms) ? friend.platforms.filter(Boolean) : [];

                            return (
                                <article className="friend-card" key={String(friend?._id || friendName)}>
                                    <div className="friend-card-top">
                                        <p className="friend-name">{friendName}</p>
                                        <Link className="friend-profile-link" to={`/profile/${encodeURIComponent(friendName)}?returnTo=${encodeURIComponent('/friends')}`}>
                                            View Profile
                                        </Link>
                                    </div>
                                    <p className="friend-bio">{friend?.bio || 'No bio set'}</p>
                                    <p className="friend-meta"><strong>Play Style:</strong> {friend?.playStyle || 'Not set'}</p>
                                    <p className="friend-meta">
                                        <strong>Platforms:</strong>{" "}
                                        {friendPlatforms.length > 0 ? friendPlatforms.join(', ') : 'None selected'}
                                    </p>
                                </article>
                            );
                        })}
                    </div>
                ) : null}
            </section>
        </div>
    );
}
