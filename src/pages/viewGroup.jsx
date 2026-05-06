import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api.js";
import { connectSocket, getSocket } from "../lib/socket.js";

const getGroupSocket = () => {
    // Use test socket if available, otherwise get live socket
    if (typeof window !== 'undefined' && window.__groupTestSocket) {
        return window.__groupTestSocket;
    }
    return connectSocket();
};

// Validate MongoDB ObjectId format
const isValidObjectId = (value) => /^[a-f\d]{24}$/i.test(String(value || ""));

// Convert image to base64 data URI
const getImageUrl = (image) => {
    if (!image?.data || !image?.contentType) return null;

    if (image.data.type === "Buffer" && Array.isArray(image.data.data)) {
        const bytes = new Uint8Array(image.data.data);
        let binary = "";
        for (let i = 0; i < bytes.length; i += 8192) {
            binary += String.fromCharCode(...bytes.slice(i, i + 8192));
        }
        return `data:${image.contentType};base64,${btoa(binary)}`;
    }

    if (typeof image.data === "string") {
        return `data:${image.contentType};base64,${image.data}`;
    }

    return null;
};

export default function ViewGroup() {
    const { groupId } = useParams();
    const navigate = useNavigate();
    // Group data & state
    const [group, setGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    // Chat state
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState("");
    const [sending, setSending] = useState(false);
    // Group action state
    const [joining, setJoining] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const [joinPassword, setJoinPassword] = useState("");
    const [removingMemberId, setRemovingMemberId] = useState("");
    const [reviewingMemberId, setReviewingMemberId] = useState("");
    // Auto-scroll refs
    const chatLogRef = useRef(null);
    const shouldAutoScrollRef = useRef(true);
    const currentUsername = localStorage.getItem("username") || "";

    // Fetch group details
    useEffect(() => {
        const fetchGroup = async () => {
            try {
                setLoading(true);
                const response = await apiFetch(`/api/groups/id/${encodeURIComponent(groupId || "")}`);
                if (!response.ok) {
                    let message = "Failed to load group";
                    try {
                        const data = await response.json();
                        message = data?.message || data?.error || message;
                    } catch {
                        // Keep fallback message when response body is not JSON.
                    }
                    throw new Error(message);
                }

                const data = await response.json();
                setGroup(data || null);
                setError("");
            } catch (err) {
                setError(err.message || "Failed to load group");
            } finally {
                setLoading(false);
            }
        };

        if (!groupId) {
            setError("Invalid group id");
            setLoading(false);
            return;
        }

        fetchGroup();
    }, [groupId]);

    // Auto-scroll chat when messages arrive
    useEffect(() => {
        const chatElement = chatLogRef.current;
        if (!chatElement) return;

        if (shouldAutoScrollRef.current) {
            chatElement.scrollTop = chatElement.scrollHeight;
        }
    }, [messages]);

    // Track manual scroll position
    const handleChatScroll = () => {
        const chatElement = chatLogRef.current;
        if (!chatElement) return;

        const distanceFromBottom = chatElement.scrollHeight - (chatElement.scrollTop + chatElement.clientHeight);
        shouldAutoScrollRef.current = distanceFromBottom <= 24;
    };

    const isCurrentUserMember = Boolean(
        Array.isArray(group?.members) && group.members.some((member) => member?.username === currentUsername)
    );

    // Connect to group chat room
    useEffect(() => {
        if (!groupId || !isCurrentUserMember) return undefined;

        const groupIdStr = String(groupId);

        const socket = getGroupSocket();

        const onIncomingMessage = (payload) => {
            if (!payload || String(payload.groupId) !== groupIdStr) return;

            setMessages((prev) => {
                if (prev.some((existing) => existing.id === payload.id)) return prev;
                return [...prev, payload];
            });
        };

        const onMembersUpdated = (payload) => {
            if (!payload || String(payload.groupId) !== groupIdStr || !payload.group) return;
            setGroup(payload.group);
        };

        const onGroupDeleted = (payload) => {
            if (!payload || String(payload.groupId) !== groupIdStr) return;

            setGroup(null);
            setMessages([]);
            setError(payload.message || "Group is no longer available");
        };

        socket.emit("group:join", { groupId }, (ack) => {
            if (!ack?.ok) {
                setError(ack?.message || "Failed to join group chat");
                return;
            }

            if (ack.group) {
                setGroup(ack.group);
            }

            setMessages(Array.isArray(ack.history) ? ack.history : []);
        });

        socket.on("group:message:new", onIncomingMessage);
        socket.on("group:members:updated", onMembersUpdated);
        socket.on("group:deleted", onGroupDeleted);

        return () => {
            socket.emit("group:leave", { groupId });
            socket.off("group:message:new", onIncomingMessage);
            socket.off("group:members:updated", onMembersUpdated);
            socket.off("group:deleted", onGroupDeleted);
        };
    }, [groupId, isCurrentUserMember]);

    // Listen for join request reviews
    useEffect(() => {
        if (!groupId) return undefined;

        const socket = getGroupSocket();
        const groupIdStr = String(groupId);

        const onJoinRequestReviewed = (payload) => {
            if (!payload || String(payload.groupId) !== groupIdStr) return;
            if (payload.group) {
                setGroup(payload.group);
            }
        };

        socket.on("group:request:reviewed", onJoinRequestReviewed);

        return () => {
            socket.off("group:request:reviewed", onJoinRequestReviewed);
        };
    }, [groupId]);

    // Join group (auto, password, or request)
    const handleJoinGroup = async () => {
        if (!groupId || !isValidObjectId(groupId)) {
            setError("Invalid group id");
            return;
        }

        if (isCurrentUserMember) {
            setError("You are already a member of this group");
            return;
        }

        if (group?.joinRequirement === "request" && isCurrentUserPending) {
            setError("Join request already sent");
            return;
        }

        if (group?.joinRequirement === "password" && !joinPassword.trim()) {
            setError("Enter the group password to join");
            return;
        }

        try {
            setJoining(true);
            setError("");

            const response = await apiFetch(`/api/groups/join/${encodeURIComponent(groupId || "")}`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: joinPassword.trim() })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data?.message || data?.error || "Failed to join group");

            if (data?.group) {
                setGroup(data.group);
            }

            setJoinPassword("");
        } catch (err) {
            setError(err.message || "Failed to join group");
        } finally {
            setJoining(false);
        }
    };

    // Send message to group chat
    const handleSendMessage = (e) => {
        e.preventDefault();

        const text = messageInput.trim();
        if (!text) return;

        const socket = getSocket();
        if (!socket || !socket.connected) {
            setError("Socket not connected. Please make sure you are logged in.");
            return;
        }

        setSending(true);
        setError("");

        socket.emit("group:message:send", { groupId, text }, (ack) => {
            setSending(false);
            if (!ack?.ok) {
                setError(ack?.message || "Failed to send message");
                return;
            }

            setMessageInput("");
        });
    };

    // Remove member from group (owner only)
    const handleRemoveMember = async (memberId) => {
        if (!memberId || !groupId) return;

        if (!isCurrentUserOwner) {
            setError("Only the group owner can remove members");
            return;
        }

        if (!isValidObjectId(groupId) || !isValidObjectId(memberId)) {
            setError("Invalid group or member id");
            return;
        }

        try {
            setRemovingMemberId(memberId);
            setError("");

            const response = await apiFetch(`/api/groups/remove-member/${encodeURIComponent(groupId)}/${encodeURIComponent(memberId)}`, {
                method: "POST",
                credentials: "include"
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data?.message || data?.error || "Failed to remove member");

            if (data?.group) setGroup(data.group);
        } catch (err) {
            setError(err.message || "Failed to remove member");
        } finally {
            setRemovingMemberId("");
        }
    };

    // Leave group or cancel request
    const handleLeaveGroup = async () => {
        if (!groupId) return;

        if (!isValidObjectId(groupId)) {
            setError("Invalid group id");
            return;
        }

        if (!isCurrentUserMember && !isCurrentUserPending) {
            setError("You are not in this group");
            return;
        }

        try {
            setLeaving(true);
            setError("");

            const response = await apiFetch(`/api/groups/leave/${encodeURIComponent(groupId)}`, {
                method: "POST",
                credentials: "include"
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data?.message || data?.error || "Failed to leave group");

            const socket = getSocket();
            if (socket) {
                socket.emit("group:leave", { groupId });
            }

            if (data?.group) {
                setGroup(data.group);
            } else {
                setGroup(null);
                setMessages([]);
            }

            navigate("/games");
        } catch (err) {
            setError(err.message || "Failed to leave group");
        } finally {
            setLeaving(false);
        }
    };

    // Approve/reject join request (owner only)
    const handleReviewRequest = async (memberId, action) => {
        if (!groupId || !memberId) return;
        if (!isCurrentUserOwner) {
            setError("Only the group owner can review requests");
            return;
        }

        try {
            setReviewingMemberId(memberId);
            setError("");

            const response = await apiFetch(`/api/groups/review-request/${encodeURIComponent(groupId)}/${encodeURIComponent(memberId)}`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data?.message || data?.error || "Failed to review request");

            if (data?.group) setGroup(data.group);
        } catch (err) {
            setError(err.message || "Failed to review request");
        } finally {
            setReviewingMemberId("");
        }
    };

    // Navigate to user's profile
    const handleOpenProfile = (username) => {
        const trimmedUsername = String(username || "").trim();
        if (!trimmedUsername) {
            setError("Invalid username");
            return;
        }
        const returnTo = `/group/${encodeURIComponent(groupId || "")}`;
        navigate(`/profile/${encodeURIComponent(trimmedUsername)}?returnTo=${encodeURIComponent(returnTo)}`);
    };

    const ownerId = String(group?.owner?._id || "");
    const requiredTags = [group?.platform, group?.experience, group?.microphone, group?.region].filter(Boolean);
    const optionalTags = Array.isArray(group?.tags) ? group.tags.filter(Boolean) : [];
    const pendingMembers = Array.isArray(group?.pendingMembers) ? group.pendingMembers : [];
    const gameImageSrc = getImageUrl(group?.game?.image);
    const isCurrentUserPending = Boolean(
        pendingMembers.some((member) => member?.username === currentUsername)
    );
    const isCurrentUserOwner = Boolean(
        group?.owner?.username && currentUsername && group.owner.username === currentUsername
    );

    return (
        <div className="page view-group-page">
            {/* WCAG 4.1.3 Status Messages: announce group loading progress without moving focus. */}
            {loading ? <p role="status" aria-live="polite">Loading group...</p> : null}
            {/* WCAG 3.3.1 Error Identification: announce group-load failures as alerts. */}
            {!loading && error ? <p className="error" role="alert">{error}</p> : null}

            {!loading && !error && group ? (
                <>
                    <section className="view-group-card">
                        <div className="view-group-header-row">
                            <h1>{group?.name || "Group"}</h1>
                            <span className="view-group-created-inline">
                                {group.createdAt ? new Date(group.createdAt).toLocaleString() : "Unknown"}
                            </span>
                            <span className="view-group-id-inline">{group._id}</span>
                        </div>
                        <p>{group.description || "No description provided"}</p>
                        <div className="view-group-game-row">
                            {gameImageSrc ? (
                                <img src={gameImageSrc} alt={`${group.game?.name || "Game"} cover`} className="view-group-game-image" />
                            ) : (
                                <div className="view-group-game-image-fallback">No image</div>
                            )}
                            <p className="view-group-game-name">{group.game?.name || "Unknown"}</p>
                        </div>
                        <div className="view-group-required-tags">
                            {requiredTags.map((value) => (
                                <span key={value} className="view-group-required-tag-chip">{value}</span>
                            ))}
                        </div>
                        <div className="view-group-tags">
                            {optionalTags.length > 0 ? (
                                <div className="view-group-tag-list">
                                    {optionalTags.map((value) => (
                                        <span key={value} className="view-group-tag-chip view-group-tag-chip-optional">{value}</span>
                                    ))}
                                </div>
                            ) : (
                                <p className="view-group-tag-empty">No optional tags.</p>
                            )}
                        </div>
                        {!isCurrentUserMember ? (
                            <div className="view-group-join-panel">
                                {group?.joinRequirement === "password" ? (
                                    <>
                                        {/* WCAG 3.3.2 Labels or Instructions: give the password-protected join field a programmatic label. */}
                                        <input
                                            type="password"
                                            name="group-join-password"
                                            autoComplete="new-password"
                                            value={joinPassword}
                                            onChange={(e) => setJoinPassword(e.target.value)}
                                            placeholder="Enter group password"
                                            className="view-group-join-password-input"
                                            aria-label="Group password"
                                        />
                                        <button className="group-join-button" onClick={handleJoinGroup} disabled={joining}>
                                            {joining ? "Joining..." : "Join Group"}
                                        </button>
                                    </>
                                ) : null}
                                {group?.joinRequirement === "auto" ? (
                                    <button className="group-join-button" onClick={handleJoinGroup} disabled={joining}>
                                        {joining ? "Joining..." : "Join Group"}
                                    </button>
                                ) : null}
                                {group?.joinRequirement === "request" ? (
                                    <button className="group-join-button" onClick={handleJoinGroup} disabled={joining || isCurrentUserPending}>
                                        {isCurrentUserPending ? "Request Sent" : (joining ? "Submitting..." : "Request to Join")}
                                    </button>
                                ) : null}
                            </div>
                        ) : null}
                        <p>Members: {Array.isArray(group.members) ? group.members.length : 0}</p>
                        {Array.isArray(group.members) && group.members.length > 0 ? (
                            <div className="view-group-members-list">
                                {group.members.map((member) => {
                                    const memberId = String(member?._id || "");
                                    const canRemove = isCurrentUserOwner && memberId && memberId !== ownerId;

                                    return (
                                        <div className="view-group-member-row" key={memberId || member?.username}>
                                            <span>
                                                {member?.username || "Unknown"}
                                                {memberId === ownerId ? (
                                                    <span className="view-group-owner-badge"> (Group Owner)</span>
                                                ) : null}
                                            </span>
                                            <div className="view-group-member-actions">
                                                <button
                                                    type="button"
                                                    className="view-group-profile-btn"
                                                    onClick={() => handleOpenProfile(member?.username)}
                                                    disabled={!member?.username}
                                                >
                                                    View Profile
                                                </button>
                                                {canRemove ? (
                                                    <button
                                                        type="button"
                                                        className="view-group-remove-member-btn"
                                                        onClick={() => handleRemoveMember(memberId)}
                                                        disabled={removingMemberId === memberId}
                                                    >
                                                        {removingMemberId === memberId ? "Removing..." : "Remove"}
                                                    </button>
                                                ) : null}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : null}
                        {pendingMembers.length > 0 ? (
                            <div className="view-group-members-list">
                                {pendingMembers.map((member) => {
                                    const memberId = String(member?._id || "");

                                    return (
                                        <div className="view-group-member-row pending" key={`pending-${memberId || member?.username}`}>
                                            <span>
                                                {member?.username || "Unknown"}
                                                <span className="view-group-owner-badge"> (Pending)</span>
                                            </span>
                                            <div className="view-group-member-actions">
                                                <button
                                                    type="button"
                                                    className="view-group-profile-btn"
                                                    onClick={() => handleOpenProfile(member?.username)}
                                                    disabled={!member?.username}
                                                >
                                                    View Profile
                                                </button>
                                                {isCurrentUserOwner ? (
                                                    <div className="view-group-pending-actions">
                                                    <button
                                                        type="button"
                                                        className="view-group-approve-member-btn"
                                                        onClick={() => handleReviewRequest(memberId, "approve")}
                                                        disabled={reviewingMemberId === memberId}
                                                    >
                                                        {reviewingMemberId === memberId ? "Working..." : "Approve"}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="view-group-remove-member-btn"
                                                        onClick={() => handleReviewRequest(memberId, "reject")}
                                                        disabled={reviewingMemberId === memberId}
                                                    >
                                                        {reviewingMemberId === memberId ? "Working..." : "Remove"}
                                                    </button>
                                                </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : null}
                        {(isCurrentUserMember || isCurrentUserPending) ? (
                            <button className="group-leave-button" onClick={handleLeaveGroup} disabled={leaving}>
                                {leaving ? "Leaving..." : (isCurrentUserPending ? "Cancel Request" : "Leave Group")}
                            </button>
                        ) : null}
                    </section>

                    <section className="view-group-info-card">
                        <p className="view-group-info-text">
                            You stay in the group for 20 seconds after leaving this page. Reopen it before the timer ends to remain a member.
                        </p>
                    </section>

                    {isCurrentUserMember ? (
                        <section className="view-group-card">
                            <h2>Group Chat</h2>

                            {/* WCAG 4.1.3 Status Messages and WAI-ARIA log pattern: expose incoming group chat messages as additions to a live conversation log. */}
                            <div className="group-chat-log" ref={chatLogRef} onScroll={handleChatScroll} role="log" aria-live="polite" aria-relevant="additions text">
                                {messages.length === 0 ? <p>No messages yet.</p> : null}
                                {messages.map((msg) => (
                                    <div key={msg.id} className="group-chat-message">
                                        <p className="group-chat-meta">
                                            {msg.senderUsername || "Unknown"} - {new Date(msg.createdAt).toLocaleTimeString()}
                                        </p>
                                        <p>{msg.text}</p>
                                    </div>
                                ))}
                            </div>

                            <form className="group-chat-form" onSubmit={handleSendMessage}>
                                {/* WCAG 3.3.2 Labels or Instructions: give the group chat composer a persistent programmatic label. */}
                                <input
                                    type="text"
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    placeholder="Send a message"
                                    maxLength={500}
                                    aria-label="Group chat message"
                                />
                                <button type="submit" disabled={sending}>
                                    {sending ? "Sending..." : "Send"}
                                </button>
                            </form>
                        </section>
                    ) : null}

                </>
            ) : null}
        </div>
    );
}
