import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../lib/api.js';

export default function Sidebar({ isLoggedIn, sidebarOpen, onToggleSidebar }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [pendingRequestCount, setPendingRequestCount] = useState(0);

    const openProtectedPage = (targetPath) => {
        if (!isLoggedIn) {
            navigate('/login');
            return;
        }

        if (targetPath) {
            navigate(targetPath);
        }
    };

    useEffect(() => {
        if (!isLoggedIn) {
            setPendingRequestCount(0);
            return;
        }

        let isDisposed = false;

        const loadRequestCount = async () => {
            try {
                const response = await apiFetch('/api/settings/friends/request-count', { credentials: 'include' });
                if (!response.ok) {
                    return;
                }

                const data = await response.json();
                if (!isDisposed) {
                    setPendingRequestCount(Number(data?.count || 0));
                }
            } catch {
                // Ignore badge refresh failures.
            }
        };

        loadRequestCount();

        return () => {
            isDisposed = true;
        };
    }, [isLoggedIn, location.pathname]);

    useEffect(() => {
        const onIncomingCountChanged = (event) => {
            const nextCount = Number(event?.detail?.count || 0);
            setPendingRequestCount(nextCount);
        };

        window.addEventListener('friends:incoming-count', onIncomingCountChanged);
        return () => {
            window.removeEventListener('friends:incoming-count', onIncomingCountChanged);
        };
    }, []);

    return (
        <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
            <button className="sidebar-toggle-btn" onClick={onToggleSidebar} title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}>
                {sidebarOpen ? '◀' : '▶'}
            </button>
            {sidebarOpen && (
                <div className="sidebar-items-container">
                    <div className="sideBox" id="gamesBox" onClick={() => navigate('/games')}>Games</div>
                    <div className="sideBox sideBox-with-badge" id="friendsBox" onClick={() => openProtectedPage('/friends')}>
                        Friends
                        {pendingRequestCount > 0 ? <span className="sideBox-request-badge">{pendingRequestCount}</span> : null}
                    </div>
                    <div className="sideBox" id="calendarBox" onClick={() => openProtectedPage('/calendar')}>Calendar</div>
                </div>
            )}
        </aside>
    );
}