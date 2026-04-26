import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Navbar({
  isLoggedIn,
  onLogout,
  username,
  sidebarOpen,
  onToggleSidebar
}) {
  const navigate = useNavigate();
  const logout = async () => {
    await onLogout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <button
          className="navbar-toggle-btn"
          onClick={onToggleSidebar}
          title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>
      </div>
      <h1 className="navbar-title">LFG Website</h1>
      <div className="navbar-right">
        {isLoggedIn ? (
          <>
            <span className="username-label">{username}</span>
            <button className="navbar-btn navbar-logout-btn" onClick={logout}>Logout</button>
          </>
        ) : (
          <div className="auth-btn-row">
            <button className="navbar-btn navbar-auth-btn" onClick={() => navigate('/login')}>Login</button>
            <button className="navbar-btn navbar-auth-btn" onClick={() => navigate('/login?mode=register')}>Register</button>
          </div>
        )}
        <Link to="/settings" title="Settings" className="navbar-btn navbar-settings-btn">
          ⚙️
        </Link>
      </div>
    </nav>
  );
}