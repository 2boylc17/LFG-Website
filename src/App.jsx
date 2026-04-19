import React, { use, useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./pages/components/navbar.jsx";
import Sidebar from "./pages/components/sidebar.jsx";
import Home from "./pages/home.jsx";
import Login from "./pages/login.jsx";
import Games from "./pages/games.jsx";
import GameDetails from "./pages/gameDetails.jsx";
import ViewGroup from "./pages/viewGroup.jsx";
import CreateGame from "./pages/createGame.jsx";
import CreateGroup from "./pages/createGroup.jsx";
import SocketTest from "./pages/socketTest.jsx";
import { connectSocket, disconnectSocket } from "./lib/socket.js";
import { set } from "mongoose";

export default function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [username, setUsername] = useState("");
    const [checkingAuth, setCheckingAuth] = useState(true);

    const validateUser = async () => {
        try {
            const response = await fetch('/api/auth/validate', {
                method: 'HEAD',
                credentials: 'include'
            });
            const ok = response.ok;
            setIsLoggedIn(ok);
            return ok;
        } catch (error) {
            console.error("Validation error:", error);
            setIsLoggedIn(false);
            return false;
        }
    };

    useEffect(() => {
        const initAuth = async () => {
            const ok = await validateUser();

            if (ok) {
                const storedUsername = localStorage.getItem('username');
                if (storedUsername) {
                    setUsername(storedUsername);
                }
            } else {
                localStorage.removeItem('username');
                setUsername("");
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
        setIsLoggedIn(true);
        const finalUsername = usernameFromLogin || "";
        setUsername(finalUsername);

        if (finalUsername) {
            localStorage.setItem('username', finalUsername);
        } else {
            localStorage.removeItem('username');
        }
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            disconnectSocket();
            setIsLoggedIn(false);
            setUsername("");
            localStorage.removeItem('username');
            window.location.reload();
        }
    };

    if (checkingAuth) {
        return <div>Loading...</div>;
    }

    return (
        <Router classname="app">
            <Navbar isLoggedIn={isLoggedIn} onLogout={handleLogout} username={username} />
            <Sidebar />
            <main>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" 
                        element={<Login 
                            isLoggedIn={isLoggedIn}
                            onLogin={handleLogin} 
                            onLogout={handleLogout}
                            username={username}
                        />
                        } 
                    />
                    <Route path="/createGame" element={<CreateGame />} />
                    <Route path="/createGroup" element={<CreateGroup />} />
                    <Route path="/createGroup/:gameSlug" element={<CreateGroup />} />
                    <Route path="/games" element={<Games />} />
                    <Route path="/games/:gameSlug" element={<GameDetails />} />
                    <Route path="/group/:groupId" element={<ViewGroup />} />
                    <Route path="/socket-test" element={<SocketTest />} />
                </Routes>
            </main>
        </Router>
    )
}