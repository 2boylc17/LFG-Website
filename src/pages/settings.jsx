import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api.js';

const platforms = ['PC', 'PlayStation', 'Xbox', 'Nintendo Switch', 'Mobile'];
const playStyles = ['Casual', 'Competitive', 'Mixed'];
const emptyNotice = { text: '', error: false };

const requestJson = async (url, options = {}) => {
    const res = await apiFetch(url, options);
    const data = await res.json();
    return { ok: res.ok, data };
};

const normalizeProfile = (profile) => ({
    bio: String(profile?.bio || '').trim(),
    platforms: [...(profile?.platforms || [])].sort(),
    playStyle: String(profile?.playStyle || '').trim()
});

export default function Settings({ isLoggedIn, onLogin }) {
    const navigate = useNavigate();
    const currentUsername = localStorage.getItem('username') || '';

    const [profile, setProfile] = useState({ bio: '', platforms: [], playStyle: '' });
    const [initialProfile, setInitialProfile] = useState({ bio: '', platforms: [], playStyle: '' });
    const [usernameForm, setUsernameForm] = useState({ newUsername: '', password: '' });
    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [profileMsg, setProfileMsg] = useState(emptyNotice);
    const [usernameMsg, setUsernameMsg] = useState(emptyNotice);
    const [passwordMsg, setPasswordMsg] = useState(emptyNotice);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isLoggedIn) {
            navigate('/login');
            return;
        }

        const loadSettings = async () => {
            try {
                const { data } = await requestJson('/api/settings', { credentials: 'include' });
                const nextProfile = {
                    bio: data.bio || '',
                    platforms: data.platforms || [],
                    playStyle: data.playStyle || ''
                };

                setProfile(nextProfile);
                setInitialProfile(nextProfile);
            } finally {
                setLoading(false);
            }
        };

        loadSettings();
    }, [isLoggedIn, navigate]);

    useEffect(() => {
        if (!isAccountModalOpen) {
            setUsernameMsg(emptyNotice);
            setPasswordMsg(emptyNotice);
            setUsernameForm({ newUsername: '', password: '' });
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        }
    }, [isAccountModalOpen]);

    const togglePlatform = (platform) => {
        setProfile((prev) => ({
            ...prev,
            platforms: prev.platforms.includes(platform)
                ? prev.platforms.filter((entry) => entry !== platform)
                : [...prev.platforms, platform]
        }));
    };

    const handleProfileSave = async (e) => {
        e.preventDefault();
        setProfileMsg(emptyNotice);

        const normalizedProfile = normalizeProfile(profile);
        const normalizedInitial = normalizeProfile(initialProfile);

        if (JSON.stringify(normalizedProfile) === JSON.stringify(normalizedInitial)) {
            setProfileMsg({ text: 'No profile changes to save.', error: false });
            return;
        }

        try {
            const { ok, data } = await requestJson('/api/settings/profile', {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bio: profile.bio,
                    platforms: profile.platforms,
                    playStyle: profile.playStyle
                })
            });

            setProfileMsg({ text: ok ? 'Profile saved.' : data.message, error: !ok });
            if (ok) {
                setInitialProfile({
                    bio: profile.bio || '',
                    platforms: profile.platforms || [],
                    playStyle: profile.playStyle || ''
                });
            }
        } catch {
            setProfileMsg({ text: 'Something went wrong.', error: true });
        }
    };

    const handleUsernameChange = async (e) => {
        e.preventDefault();
        setUsernameMsg(emptyNotice);

        const newUsername = String(usernameForm.newUsername || '').trim();
        const password = String(usernameForm.password || '').trim();

        if (!newUsername || !password) {
            setUsernameMsg({ text: 'New username and current password are required.', error: true });
            return;
        }

        if (newUsername === currentUsername) {
            setUsernameMsg({ text: 'New username must be different from current username.', error: true });
            return;
        }

        try {
            const { ok, data } = await requestJson('/api/settings/username', {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newUsername, password })
            });

            if (ok) {
                setUsernameMsg({ text: 'Username updated. Please log in again.', error: false });
                setUsernameForm({ newUsername: '', password: '' });
                if (onLogin) onLogin(data.username);
                localStorage.setItem('username', data.username);
            } else {
                setUsernameMsg({ text: data.message, error: true });
            }
        } catch {
            setUsernameMsg({ text: 'Something went wrong.', error: true });
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setPasswordMsg(emptyNotice);

        if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
            setPasswordMsg({ text: 'All password fields are required.', error: true });
            return;
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordMsg({ text: 'New passwords do not match.', error: true });
            return;
        }
        if (passwordForm.newPassword.length < 6) {
            setPasswordMsg({ text: 'New password must be at least 6 characters.', error: true });
            return;
        }
        if (passwordForm.currentPassword === passwordForm.newPassword) {
            setPasswordMsg({ text: 'New password must be different from current password.', error: true });
            return;
        }

        try {
            const { ok, data } = await requestJson('/api/settings/password', {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPassword: passwordForm.currentPassword,
                    newPassword: passwordForm.newPassword
                })
            });

            setPasswordMsg({ text: ok ? 'Password updated.' : data.message, error: !ok });
            if (ok) {
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            }
        } catch {
            setPasswordMsg({ text: 'Something went wrong.', error: true });
        }
    };

    // WCAG 4.1.3 Status Messages: announce settings-page loading progress without changing focus.
    if (loading) return <div className="page"><p role="status" aria-live="polite">Loading settings...</p></div>;

    return (
        <div className="page settings-page">
            <h1 className="settings-title">Settings</h1>

            <section className="settings-section">
                <h2>Profile</h2>
                <form onSubmit={handleProfileSave} className="settings-form">
                    <div className="settings-field">
                        <label htmlFor="bio">Bio</label>
                        <textarea
                            id="bio"
                            maxLength={300}
                            rows={3}
                            placeholder="Tell other players about yourself..."
                            value={profile.bio}
                            onChange={(e) => setProfile((prev) => ({ ...prev, bio: e.target.value }))}
                        />
                        <span className="char-count">{profile.bio.length} / 300</span>
                    </div>

                    <div className="settings-field">
                        <label>Gaming Platforms</label>
                        {/* WCAG 1.3.1 Info and Relationships plus 4.1.2 Name, Role, Value: expose the platform toggles as a named group with pressed-state buttons. */}
                        <div className="platform-grid" role="group" aria-label="Gaming platforms">
                            {platforms.map((platform) => (
                                <button
                                    type="button"
                                    key={platform}
                                    className={`platform-btn ${profile.platforms.includes(platform) ? 'active' : ''}`}
                                    onClick={() => togglePlatform(platform)}
                                    aria-pressed={profile.platforms.includes(platform)}
                                >
                                    {platform}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="settings-field">
                        <label htmlFor="playStyle">Play Style</label>
                        <select
                            id="playStyle"
                            value={profile.playStyle}
                            onChange={(e) => setProfile((prev) => ({ ...prev, playStyle: e.target.value }))}
                        >
                            <option value="">Select a play style</option>
                            {playStyles.map((playStyle) => (
                                <option key={playStyle} value={playStyle}>{playStyle}</option>
                            ))}
                        </select>
                    </div>

                    {profileMsg.text && (
                        /* WCAG 4.1.3 Status Messages: announce profile-save success and error feedback. */
                        <p className={profileMsg.error ? 'settings-error' : 'settings-success'} role={profileMsg.error ? 'alert' : 'status'} aria-live="polite">{profileMsg.text}</p>
                    )}
                    <button type="submit" className="settings-save-btn">Save Profile</button>
                </form>
            </section>

            <section className="settings-section">
                <h2>Account</h2>
                <p className="settings-copy">Manage username and password from a separate account panel.</p>
                <button
                    type="button"
                    className="settings-save-btn"
                    onClick={() => setIsAccountModalOpen(true)}
                >
                    Open Account Settings
                </button>
            </section>

            {isAccountModalOpen && (
                <div className="settings-modal-backdrop" onClick={() => setIsAccountModalOpen(false)}>
                    {/* WCAG 1.3.1 Info and Relationships and 4.1.2 Name, Role, Value: expose account settings as a modal dialog with a programmatic title. */}
                    <div className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="account-settings-title" onClick={(e) => e.stopPropagation()}>
                        <div className="settings-modal-header">
                            <h2 id="account-settings-title">Account Settings</h2>
                            <button
                                type="button"
                                className="settings-modal-close"
                                onClick={() => setIsAccountModalOpen(false)}
                                aria-label="Close account settings"
                            >
                                x
                            </button>
                        </div>

                        <h3>Change Username</h3>
                        <form onSubmit={handleUsernameChange} className="settings-form">
                            <div className="settings-field">
                                <label htmlFor="newUsername">New Username</label>
                                <input
                                    id="newUsername"
                                    type="text"
                                    value={usernameForm.newUsername}
                                    onChange={(e) => setUsernameForm((prev) => ({ ...prev, newUsername: e.target.value }))}
                                    placeholder="New username"
                                    autoComplete="username"
                                />
                            </div>
                            <div className="settings-field">
                                <label htmlFor="usernamePassword">Current Password</label>
                                <input
                                    id="usernamePassword"
                                    type="password"
                                    value={usernameForm.password}
                                    onChange={(e) => setUsernameForm((prev) => ({ ...prev, password: e.target.value }))}
                                    placeholder="Confirm with your password"
                                    autoComplete="current-password"
                                />
                            </div>
                            {usernameMsg.text && (
                                /* WCAG 4.1.3 Status Messages: announce username-change outcomes from within the modal form. */
                                <p className={usernameMsg.error ? 'settings-error' : 'settings-success'} role={usernameMsg.error ? 'alert' : 'status'} aria-live="polite">{usernameMsg.text}</p>
                            )}
                            <button type="submit" className="settings-save-btn">Update Username</button>
                        </form>

                        <h3>Change Password</h3>
                        <form onSubmit={handlePasswordChange} className="settings-form">
                            <div className="settings-field">
                                <label htmlFor="currentPassword">Current Password</label>
                                <input
                                    id="currentPassword"
                                    type="password"
                                    value={passwordForm.currentPassword}
                                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                                    placeholder="Current password"
                                    autoComplete="current-password"
                                />
                            </div>
                            <div className="settings-field">
                                <label htmlFor="newPassword">New Password</label>
                                <input
                                    id="newPassword"
                                    type="password"
                                    value={passwordForm.newPassword}
                                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                                    placeholder="New password (min 6 characters)"
                                    autoComplete="new-password"
                                />
                            </div>
                            <div className="settings-field">
                                <label htmlFor="confirmPassword">Confirm New Password</label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    value={passwordForm.confirmPassword}
                                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                                    placeholder="Repeat new password"
                                    autoComplete="new-password"
                                />
                            </div>
                            {passwordMsg.text && (
                                /* WCAG 4.1.3 Status Messages: announce password-change outcomes from within the modal form. */
                                <p className={passwordMsg.error ? 'settings-error' : 'settings-success'} role={passwordMsg.error ? 'alert' : 'status'} aria-live="polite">{passwordMsg.text}</p>
                            )}
                            <button type="submit" className="settings-save-btn">Update Password</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
