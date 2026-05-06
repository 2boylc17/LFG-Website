import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../lib/api.js';

export default function Sidebar({ isLoggedIn, sidebarOpen, onToggleSidebar }) {
    const navigate = useNavigate();
    const location = useLocation();
    // Incoming friend request badge count
    const [pendingRequestCount, setPendingRequestCount] = useState(0);

    // Navigate to page or prompt login
    const openProtectedPage = (targetPath) => {
        if (!isLoggedIn) {
            navigate('/login');
            return;
        }

        if (targetPath) {
            navigate(targetPath);
        }
    };

    // Load pending request count & refresh on navigation
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

    // Listen for badge update event from friends page
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
        /* WCAG 1.3.1 Info and Relationships, WAI landmarks: identify the sidebar as a labeled complementary navigation region. */
        <aside id="sidebar-navigation" className={`sidebar ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`} aria-label="Sidebar">
            {/* WCAG 4.1.2 Name, Role, Value: keep the sidebar toggle keyboard-operable and expose its expanded state and controlled container. */}
            <button
                type="button"
                className="sidebar-toggle-btn"
                onClick={onToggleSidebar}
                title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                aria-expanded={sidebarOpen}
                aria-controls="sidebar-items"
            >
                {sidebarOpen ? '◀' : '▶'}
            </button>
            {sidebarOpen && (
                <div id="sidebar-items" className="sidebar-items-container">
                    {/* WCAG 2.1.1 Keyboard and 4.1.2 Name, Role, Value: use real buttons for navigation actions so they are reachable and operable from the keyboard. */}
                    <button type="button" className="sideBox" id="gamesBox" onClick={() => navigate('/games')}>Games</button>
                    {/* WCAG 2.1.1 Keyboard, 4.1.2 Name, Role, Value, and 1.3.1 Info and Relationships: keep the Friends action semantic and expose the request badge meaning to assistive tech. */}
                    <button type="button" className="sideBox sideBox-with-badge" id="friendsBox" onClick={() => openProtectedPage('/friends')}>
                        Friends
                        {pendingRequestCount > 0 ? <span className="sideBox-request-badge" aria-label={`${pendingRequestCount} pending friend requests`}>{pendingRequestCount}</span> : null}
                    </button>
                    {/* WCAG 2.1.1 Keyboard and 4.1.2 Name, Role, Value: use a semantic button for the Calendar action instead of a click-only container. */}
                    <button type="button" className="sideBox" id="calendarBox" onClick={() => openProtectedPage('/calendar')}>Calendar</button>
                </div>
            )}
        </aside>
    );
}