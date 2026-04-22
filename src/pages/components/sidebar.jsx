import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function Sidebar({ isLoggedIn }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [pendingRequestCount, setPendingRequestCount] = useState(0);

    const handleProtectedTabClick = (targetPath) => {
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
                const response = await fetch('/api/settings/friends/request-count', { credentials: 'include' });
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
        <aside className="sidebar">
            <div className="sideBox" id="gamesBox" onClick={() => navigate('/games')}>Games</div>
            <div className="sideBox sideBox-with-badge" id="friendsBox" onClick={() => handleProtectedTabClick('/friends')}>
                Friends
                {pendingRequestCount > 0 ? <span className="sideBox-request-badge">{pendingRequestCount}</span> : null}
            </div>
            <div className="sideBox" id="calendarBox" onClick={() => handleProtectedTabClick('/calendar')}>Calendar</div>
        </aside>
    );
}