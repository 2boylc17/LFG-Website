import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Sidebar() {
    const navigate = useNavigate();

    return (
        <aside className="sidebar">
            <div className="sideBox" id="gamesBox" onClick={() => navigate('/games')}>Games</div>
            <div className="sideBox" id="friendsBox">Friends</div>
            <div className="sideBox" id="recommendedBox">Recommended</div>
            <div className="sideBox" id="messagesBox">Messages</div>
            <div className="sideBox" id="calendarBox" onClick={() => navigate('/calendar')}>Calendar</div>
        </aside>
    );
}