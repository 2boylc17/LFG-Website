import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Navbar from "./pages/components/navbar.jsx";
import Sidebar from "./pages/components/sidebar.jsx";
import Login from "./pages/login.jsx";
import Games from "./pages/games.jsx";
import ViewGroups from "./pages/viewGroups.jsx";
import ViewGroup from "./pages/viewGroup.jsx";
import CreateGame from "./pages/createGame.jsx";
import CreateGroup from "./pages/createGroup.jsx";
import SocketTest from "./pages/socketTest.jsx";
import Settings from "./pages/settings.jsx";
import Calendar from "./pages/calendar.jsx";
import Profile from "./pages/profile.jsx";
import Friends from "./pages/friends.jsx";
import { apiFetch } from "./lib/api.js";
import { connectSocket, disconnectSocket } from "./lib/socket.js";

export default function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [username, setUsername] = useState("");
    const [checkingAuth, setCheckingAuth] = useState(true);

    const syncStoredUsername = (value = "") => {
        if (value) localStorage.setItem('username', value);
        else localStorage.removeItem('username');
    };

    useEffect(() => {
        const initAuth = async () => {
            const storedUsername = localStorage.getItem('username') || "";

            // Avoid a network round trip for obvious anonymous sessions.
            if (!storedUsername) {
                setIsLoggedIn(false);
                setUsername("");
                setCheckingAuth(false);
                return;
            }

            try {
                const response = await apiFetch('/api/auth/validate', {
                    method: 'HEAD',
                    credentials: 'include'
                });
                const ok = response.ok;
                setIsLoggedIn(ok);
                setUsername(ok ? storedUsername : "");
                if (!ok) syncStoredUsername("");
            } catch (error) {
                console.error("Validation error:", error);
                setIsLoggedIn(false);
                setUsername("");
                syncStoredUsername("");
            }
            setCheckingAuth(false);
        };
        initAuth();
    }, []);

    useEffect(() => {
        if (isLoggedIn) {
            const socket = connectSocket();

            const onReady = (payload) => {
                console.log('Socket connected for user:', payload?.username || payload?.userId);
            };

            socket.on('socket:ready', onReady);

            return () => {
                socket.off('socket:ready', onReady);
            };
        }

        disconnectSocket();
        return undefined;
    }, [isLoggedIn]);

    const handleLogin = (usernameFromLogin) => {
        const finalUsername = usernameFromLogin || "";
        setIsLoggedIn(true);
        setUsername(finalUsername);
        syncStoredUsername(finalUsername);
    };

    const handleLogout = async () => {
        try {
            await apiFetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            disconnectSocket();
            setIsLoggedIn(false);
            setUsername("");
            syncStoredUsername("");
            window.location.reload();
        }
    };

    if (checkingAuth) {
        return <div>Loading...</div>;
    }

    return (
        <Router>
            <Navbar isLoggedIn={isLoggedIn} onLogout={handleLogout} username={username} />
            <Sidebar isLoggedIn={isLoggedIn} />
            <main>
                <Routes>
                    <Route path="/" element={<Games />} />
                    <Route path="/login" element={<Login onLogin={handleLogin} />} />
                    <Route path="/createGame" element={<CreateGame />} />
                    <Route path="/createGroup" element={<CreateGroup />} />
                    <Route path="/createGroup/:gameSlug" element={<CreateGroup />} />
                    <Route path="/games" element={<Games />} />
                    <Route path="/games/:gameSlug" element={<ViewGroups />} />
                    <Route path="/group/:groupId" element={<ViewGroup />} />
                    <Route path="/socket-test" element={<SocketTest />} />
                    <Route path="/calendar" element={<Calendar />} />
                    <Route path="/friends" element={<Friends isLoggedIn={isLoggedIn} />} />
                    <Route path="/settings" element={<Settings isLoggedIn={isLoggedIn} onLogin={handleLogin} />} />
                    <Route path="/profile/:username" element={<Profile />} />
                </Routes>
            </main>
        </Router>
    )
}