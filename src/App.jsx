import React, { useEffect, useRef, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";

import Navbar from "./pages/components/navbar.jsx";
import Sidebar from "./pages/components/sidebar.jsx";
import Login from "./pages/login.jsx";
import Games from "./pages/games.jsx";
import ViewGroups from "./pages/viewGroups.jsx";
import ViewGroup from "./pages/viewGroup.jsx";
import CreateGame from "./pages/createGame.jsx";
import CreateGroup from "./pages/createGroup.jsx";
import Settings from "./pages/settings.jsx";
import Calendar from "./pages/calendar.jsx";
import Profile from "./pages/profile.jsx";
import Friends from "./pages/friends.jsx";
import { apiFetch } from "./lib/api.js";
import { connectSocket, disconnectSocket } from "./lib/socket.js";

function AppLayout({
    isLoggedIn,
    username,
    sidebarOpen,
    setSidebarOpen,
    handleLogout,
    handleLogin
}) {
    const location = useLocation();
    const hasLoadedRouteRef = useRef(false);
    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

    useEffect(() => {
        if (!hasLoadedRouteRef.current) {
            hasLoadedRouteRef.current = true;
            return;
        }

        if (window.innerWidth <= 768) {
            setSidebarOpen(false);
        }
    }, [location.pathname, location.search, location.hash, setSidebarOpen]);

    return (
        <>
            <Navbar
                isLoggedIn={isLoggedIn}
                onLogout={handleLogout}
                username={username}
                sidebarOpen={sidebarOpen}
                onToggleSidebar={toggleSidebar}
            />
            <Sidebar
                isLoggedIn={isLoggedIn}
                sidebarOpen={sidebarOpen}
                onToggleSidebar={toggleSidebar}
            />
            {/* WCAG 2.4.1 Bypass Blocks, WAI page landmarks: expose a stable main-content target so keyboard and assistive-tech users can jump directly to routed content. */}
            <main id="main-content" className={sidebarOpen ? '' : 'sidebar-collapsed'} tabIndex="-1">
                <Routes>
                    <Route path="/" element={<Games />} />
                    <Route path="/login" element={<Login onLogin={handleLogin} />} />
                    <Route
                        path="/createGame"
                        element={import.meta.env.PROD ? <Navigate to="/games" replace /> : <CreateGame />}
                    />
                    <Route path="/createGroup" element={<CreateGroup />} />
                    <Route path="/createGroup/:gameSlug" element={<CreateGroup />} />
                    <Route path="/games" element={<Games />} />
                    <Route path="/games/:gameSlug" element={<ViewGroups />} />
                    <Route path="/group" element={<ViewGroup />} />
                    <Route path="/group/:groupId" element={<ViewGroup />} />
                    <Route path="/calendar" element={<Calendar />} />
                    <Route path="/friends" element={<Friends isLoggedIn={isLoggedIn} />} />
                    <Route path="/settings" element={<Settings isLoggedIn={isLoggedIn} onLogin={handleLogin} />} />
                    <Route path="/profile/:username" element={<Profile />} />
                </Routes>
            </main>
        </>
    );
}

export default function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [username, setUsername] = useState("");
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 768);

    const syncUsernameStorage = (value = "") => {
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
                if (!ok) syncUsernameStorage("");
            } catch (error) {
                console.error("Validation error:", error);
                setIsLoggedIn(false);
                setUsername("");
                syncUsernameStorage("");
            }
            setCheckingAuth(false);
        };
        initAuth();
    }, []);

    useEffect(() => {
        if (isLoggedIn) {
            connectSocket();
            return undefined;
        }

        disconnectSocket();
        return undefined;
    }, [isLoggedIn]);

    const handleLogin = (newUsername) => {
        const finalUsername = newUsername || "";
        setIsLoggedIn(true);
        setUsername(finalUsername);
        syncUsernameStorage(finalUsername);
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
            syncUsernameStorage("");
            window.location.reload();
        }
    };

    if (checkingAuth) {
        // WCAG 4.1.3 Status Messages, WAI-ARIA live regions: announce auth-check progress without forcing focus to move.
        return <div role="status" aria-live="polite">Loading...</div>;
    }

    return (
        <Router>
            <AppLayout
                isLoggedIn={isLoggedIn}
                username={username}
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                handleLogout={handleLogout}
                handleLogin={handleLogin}
            />
        </Router>
    )
}