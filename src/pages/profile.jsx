import React, { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api.js";

export default function Profile() {
    const { username } = useParams();
    const location = useLocation();
    // Profile data & loading state
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    // Friend request UI state
    const [friendMessage, setFriendMessage] = useState({ text: "", error: false });
    const [isSendingRequest, setIsSendingRequest] = useState(false);
    const [friendStatus, setFriendStatus] = useState("none");

    // Fetch profile data by username
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

                const response = await apiFetch(`/api/settings/public/${encodeURIComponent(trimmedUsername)}`);
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
    const canSendFriendRequest = Boolean(signedInUsername) && !isOwnProfile && Boolean(profile?.username);
    const getUsernameList = (list) => Array.isArray(list)
        ? list.map((entry) => entry?.username).filter(Boolean)
        : [];

    // Load friend request status on mount
    useEffect(() => {
        setFriendStatus("none");
        setFriendMessage({ text: "", error: false });

        if (!canSendFriendRequest) {
            return;
        }

        let isDisposed = false;

        const loadFriends = async () => {
            try {
                const response = await apiFetch('/api/settings/friends', { credentials: 'include' });
                if (!response.ok) {
                    return;
                }

                const data = await response.json();
                const friendUsernames = getUsernameList(data?.friends);
                const incomingUsernames = getUsernameList(data?.incomingRequests);
                const outgoingUsernames = getUsernameList(data?.outgoingRequests);

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
    }, [canSendFriendRequest, profile?.username]);

    const handleSendRequest = async () => {
        if (!profile?.username || !canSendFriendRequest || friendStatus !== "none") {
            return;
        }

        try {
            setIsSendingRequest(true);
            setFriendMessage({ text: "", error: false });

            const response = await apiFetch(`/api/settings/friends/request/${encodeURIComponent(profile.username)}`, {
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
                        {canSendFriendRequest ? (
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

                {/* WCAG 4.1.3 Status Messages: announce profile loading progress without forcing focus changes. */}
                {loading ? <p className="profile-loading" role="status" aria-live="polite">Loading profile...</p> : null}
                {/* WCAG 3.3.1 Error Identification: announce profile-load failures as alerts. */}
                {!loading && error ? <p className="error" role="alert">{error}</p> : null}
                {!loading && !error && friendMessage.text ? (
                    /* WCAG 4.1.3 Status Messages: expose friend-request outcomes as live feedback for assistive-tech users. */
                    <p className={friendMessage.error ? 'error' : 'profile-success'} role={friendMessage.error ? 'alert' : 'status'} aria-live="polite">{friendMessage.text}</p>
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
