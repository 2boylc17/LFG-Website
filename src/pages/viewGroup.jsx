import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { connectSocket, getSocket } from "../lib/socket.js";

const TAG_SECTIONS = [
    { key: "experience", label: "Experience" },
    { key: "microphone", label: "Microphone" },
    { key: "region", label: "Region" }
];

const getMessageFromResponse = async (response, fallbackMessage) => {
    let message = fallbackMessage;
    try {
        const data = await response.json();
        message = data?.message || data?.error || message;
    } catch {
        // Keep fallback message when response body is not JSON.
    }
    return message;
};

const isValidObjectId = (value) => /^[a-f\d]{24}$/i.test(String(value || ""));

export default function ViewGroup() {
    const { groupId } = useParams();
    const [group, setGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState("");
    const [sending, setSending] = useState(false);
    const [joining, setJoining] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const [removingMemberId, setRemovingMemberId] = useState("");
    const chatLogRef = useRef(null);
    const shouldAutoScrollRef = useRef(true);
    const currentUsername = localStorage.getItem("username") || "";

    const groupTitle = group?.name || "Group";

    useEffect(() => {
        const fetchGroup = async () => {
            try {
                setLoading(true);
                const response = await fetch(`/api/groups/id/${encodeURIComponent(groupId || "")}`);
                if (!response.ok) {
                    throw new Error(await getMessageFromResponse(response, "Failed to load group"));
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

    useEffect(() => {
        const chatElement = chatLogRef.current;
        if (!chatElement) return;

        if (shouldAutoScrollRef.current) {
            chatElement.scrollTop = chatElement.scrollHeight;
        }
    }, [messages]);

    const handleChatScroll = () => {
        const chatElement = chatLogRef.current;
        if (!chatElement) return;

        const distanceFromBottom = chatElement.scrollHeight - (chatElement.scrollTop + chatElement.clientHeight);
        shouldAutoScrollRef.current = distanceFromBottom <= 24;
    };

    useEffect(() => {
        if (!groupId) return undefined;

        const groupIdStr = String(groupId);

        const socket = connectSocket();

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
    }, [groupId]);

    const handleJoinGroup = async () => {
        if (!groupId || !isValidObjectId(groupId)) {
            setError("Invalid group id");
            return;
        }

        if (isCurrentUserMember) {
            setError("You are already in this group");
            return;
        }

        try {
            setJoining(true);
            setError("");

            const response = await fetch(`/api/groups/join/${encodeURIComponent(groupId || "")}`, {
                method: "POST",
                credentials: "include"
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data?.message || data?.error || "Failed to join group");

            if (data?.group) setGroup(data.group);
        } catch (err) {
            setError(err.message || "Failed to join group");
        } finally {
            setJoining(false);
        }
    };

    const handleSendMessage = async (e) => {
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

            const response = await fetch(`/api/groups/remove-member/${encodeURIComponent(groupId)}/${encodeURIComponent(memberId)}`, {
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

    const handleLeaveGroup = async () => {
        if (!groupId) return;

        if (!isValidObjectId(groupId)) {
            setError("Invalid group id");
            return;
        }

        if (!isCurrentUserMember) {
            setError("You are not a member of this group");
            return;
        }

        try {
            setLeaving(true);
            setError("");

            const response = await fetch(`/api/groups/leave/${encodeURIComponent(groupId)}`, {
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
                setError("You left the group.");
            }
        } catch (err) {
            setError(err.message || "Failed to leave group");
        } finally {
            setLeaving(false);
        }
    };

    const ownerId = String(group?.owner?._id || "");
    const isCurrentUserMember = Boolean(
        Array.isArray(group?.members) && group.members.some((member) => member?.username === currentUsername)
    );
    const isCurrentUserOwner = Boolean(
        group?.owner?.username && currentUsername && group.owner.username === currentUsername
    );

    return (
        <div className="page view-group-page">
            {loading ? <p>Loading group...</p> : null}
            {!loading && error ? <p className="error">{error}</p> : null}

            {!loading && !error && group ? (
                <>
                    <section className="view-group-card">
                        <h1>{groupTitle}</h1>
                        <p>{group.description || "No description provided"}</p>
                        <p>You stay in the group for 20 seconds after leaving this page. Reopen it before the timer ends to remain a member.</p>
                        <p>Group ID: {group._id}</p>
                        <p>Created: {group.createdAt ? new Date(group.createdAt).toLocaleString() : "Unknown"}</p>
                        <p>Game: {group.game?.name || "Unknown"}</p>
                        <p>Platform: {group.platform || "Not specified"}</p>
                        <div className="view-group-tags">
                            {TAG_SECTIONS.map((section) => {
                                const value = group[section.key];

                                return (
                                    <div className="view-group-tag-section" key={section.key}>
                                        <p className="view-group-tag-label">{section.label}:</p>
                                        {value ? (
                                            <span className="view-group-tag-chip">{value}</span>
                                        ) : (
                                            <p className="view-group-tag-empty">No {section.label.toLowerCase()} set</p>
                                        )}
                                    </div>
                                );
                            })}
                            {Array.isArray(group.tags) && group.tags.length > 0 ? (
                                <div className="view-group-tag-section">
                                    <p className="view-group-tag-label">Tags:</p>
                                    <div className="view-group-tag-list">
                                        {group.tags.map((value) => (
                                            <span key={value} className="view-group-tag-chip">{value}</span>
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                        </div>
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
                                    );
                                })}
                            </div>
                        ) : null}
                        <button className="group-join-button" onClick={handleJoinGroup} disabled={joining}>
                            {joining ? "Joining..." : "Join Group"}
                        </button>
                        {isCurrentUserMember ? (
                            <button className="group-leave-button" onClick={handleLeaveGroup} disabled={leaving}>
                                {leaving ? "Leaving..." : "Leave Group"}
                            </button>
                        ) : null}
                    </section>

                    <section className="view-group-card">
                        <h2>Group Chat</h2>

                        <div className="group-chat-log" ref={chatLogRef} onScroll={handleChatScroll}>
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
                            <input
                                type="text"
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                placeholder="Send a message"
                                maxLength={500}
                            />
                            <button type="submit" disabled={sending}>
                                {sending ? "Sending..." : "Send"}
                            </button>
                        </form>
                    </section>
                </>
            ) : null}
        </div>
    );
}
