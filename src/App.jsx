import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./pages/components/navbar.jsx";
import Sidebar from "./pages/components/sidebar.jsx";
import Home from "./pages/home.jsx";

export default function App() {
    return (
        <Router classname="app">
            <Navbar />
            <Sidebar />
            <main>
                <Routes>
                    <Route path="/" element={<Home />} />
                </Routes>
            </main>
        </Router>
    )
}