import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Sidebar({ isLoggedIn }) {
    const navigate = useNavigate();

    const handleProtectedTabClick = (targetPath) => {
        if (!isLoggedIn) {
            navigate('/login');
            return;
        }

        if (targetPath) {
            navigate(targetPath);
        }
    };

    return (
        <aside className="sidebar">
            <div className="sideBox" id="gamesBox" onClick={() => navigate('/games')}>Games</div>
            <div className="sideBox" id="friendsBox" onClick={() => handleProtectedTabClick()}>Friends</div>
            <div className="sideBox" id="recommendedBox" onClick={() => handleProtectedTabClick()}>Recommended</div>
            <div className="sideBox" id="messagesBox" onClick={() => handleProtectedTabClick()}>Messages</div>
            <div className="sideBox" id="calendarBox" onClick={() => handleProtectedTabClick('/calendar')}>Calendar</div>
        </aside>
    );
}