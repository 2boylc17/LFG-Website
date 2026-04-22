import React, { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

export default function Profile() {
    const { username } = useParams();
    const location = useLocation();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [friendMessage, setFriendMessage] = useState({ text: "", error: false });
    const [isSendingRequest, setIsSendingRequest] = useState(false);
    const [friendStatus, setFriendStatus] = useState("none");

    useEffect(() => {
        const fetchProfile = async () => {
            const trimmedUsername = String(username || "").trim();
            if (!trimmedUsername) {
                setError("Invalid username");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError("");

                const response = await fetch(`/api/settings/public/${encodeURIComponent(trimmedUsername)}`);
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data?.message || data?.error || "Failed to load profile");
                }

                setProfile(data || null);
            } catch (err) {
                setError(err.message || "Failed to load profile");
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [username]);

    const displayUsername = profile?.username || "Unknown";
    const initial = displayUsername ? displayUsername.charAt(0).toUpperCase() : "?";
    const platformList = Array.isArray(profile?.platforms) ? profile.platforms.filter(Boolean) : [];
    const requestedReturnPath = new URLSearchParams(location.search).get("returnTo") || "";
    const isAllowedReturnPath = requestedReturnPath.startsWith("/group/") || requestedReturnPath === "/friends";
    const backHref = isAllowedReturnPath ? requestedReturnPath : "/games";
    const signedInUsername = localStorage.getItem("username") || "";
    const isOwnProfile = Boolean(signedInUsername && displayUsername && signedInUsername === displayUsername);
    const canSendRequest = Boolean(signedInUsername) && !isOwnProfile && Boolean(profile?.username);

    useEffect(() => {
        setFriendStatus("none");
        setFriendMessage({ text: "", error: false });

        if (!canSendRequest) {
            return;
        }

        let isDisposed = false;

        const loadFriends = async () => {
            try {
                const response = await fetch('/api/settings/friends', { credentials: 'include' });
                if (!response.ok) {
                    return;
                }

                const data = await response.json();
                const friendUsernames = Array.isArray(data?.friends)
                    ? data.friends.map((friend) => friend?.username).filter(Boolean)
                    : [];
                const incomingUsernames = Array.isArray(data?.incomingRequests)
                    ? data.incomingRequests.map((entry) => entry?.username).filter(Boolean)
                    : [];
                const outgoingUsernames = Array.isArray(data?.outgoingRequests)
                    ? data.outgoingRequests.map((entry) => entry?.username).filter(Boolean)
                    : [];

                if (!isDisposed && profile?.username) {
                    if (friendUsernames.includes(profile.username)) {
                        setFriendStatus("friends");
                    } else if (outgoingUsernames.includes(profile.username)) {
                        setFriendStatus("outgoing");
                    } else if (incomingUsernames.includes(profile.username)) {
                        setFriendStatus("incoming");
                    } else {
                        setFriendStatus("none");
                    }
                }
            } catch {
                // Ignore request prefetch failures; send action handles explicit errors.
            }
        };

        loadFriends();

        return () => {
            isDisposed = true;
        };
    }, [canSendRequest, profile?.username]);

    const handleSendRequest = async () => {
        if (!profile?.username || !canSendRequest || friendStatus !== "none") {
            return;
        }

        try {
            setIsSendingRequest(true);
            setFriendMessage({ text: "", error: false });

            const response = await fetch(`/api/settings/friends/request/${encodeURIComponent(profile.username)}`, {
                method: 'POST',
                credentials: 'include'
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.message || data?.error || 'Failed to send friend request');
            }

            const relationStatus = String(data?.relationStatus || 'outgoing');
            setFriendStatus(relationStatus === 'friends' ? 'friends' : relationStatus === 'incoming' ? 'incoming' : 'outgoing');
            setFriendMessage({ text: data?.message || 'Friend request sent', error: false });
        } catch (err) {
            setFriendMessage({ text: err.message || 'Failed to send friend request', error: true });
        } finally {
            setIsSendingRequest(false);
        }
    };

    return (
        <div className="page profile-page">
            <section className="profile-card">
                <div className="profile-header-row">
                    <h1>Player Profile</h1>
                    <div className="profile-header-actions">
                        {canSendRequest ? (
                            <button
                                type="button"
                                className="profile-add-friend-btn"
                                onClick={handleSendRequest}
                                disabled={isSendingRequest || friendStatus !== 'none'}
                            >
                                {isSendingRequest
                                    ? 'Sending...'
                                    : friendStatus === 'friends'
                                        ? 'Friends'
                                        : friendStatus === 'outgoing'
                                            ? 'Request Sent'
                                            : friendStatus === 'incoming'
                                                ? 'Respond in Friends'
                                                : 'Send Friend Request'}
                            </button>
                        ) : null}
                        <Link className="profile-back-link" to={backHref}>
                            {backHref.startsWith("/group/")
                                ? "Back to Group"
                                : backHref === "/friends"
                                    ? "Back to Friends"
                                    : "Back to Games"}
                        </Link>
                    </div>
                </div>

                {loading ? <p className="profile-loading">Loading profile...</p> : null}
                {!loading && error ? <p className="error">{error}</p> : null}
                {!loading && !error && friendMessage.text ? (
                    <p className={friendMessage.error ? 'error' : 'profile-success'}>{friendMessage.text}</p>
                ) : null}

                {!loading && !error && profile ? (
                    <div className="profile-content">
                        <div className="profile-hero">
                            <div className="profile-avatar" aria-hidden="true">{initial}</div>
                            <div className="profile-hero-copy">
                                <p className="profile-label">Username</p>
                                <p className="profile-username">{displayUsername}</p>
                            </div>
                        </div>

                        <div className="profile-grid">
                            <article className="profile-field-card profile-field-card-bio">
                                <p className="profile-label">Bio</p>
                                <p className="profile-value">{profile.bio || "No bio set"}</p>
                            </article>

                            <article className="profile-field-card">
                                <p className="profile-label">Play Style</p>
                                <p className="profile-value">{profile.playStyle || "Not set"}</p>
                            </article>

                            <article className="profile-field-card">
                                <p className="profile-label">Platforms</p>
                                {platformList.length > 0 ? (
                                    <div className="profile-platform-list">
                                        {platformList.map((platform) => (
                                            <span className="profile-platform-chip" key={platform}>{platform}</span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="profile-value">None selected</p>
                                )}
                            </article>
                        </div>
                    </div>
                ) : null}
            </section>
        </div>
    );
}
