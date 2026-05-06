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
    /* WCAG 1.3.1 Info and Relationships, WAI landmarks: identify the global navigation region so assistive tech can find primary navigation quickly. */
    <nav className="navbar" aria-label="Primary">
      <div className="navbar-left">
        {/* WCAG 4.1.2 Name, Role, Value: expose the sidebar toggle as a named button with expanded/collapsed state and its controlled region. */}
        <button
          type="button"
          className="navbar-toggle-btn"
          onClick={onToggleSidebar}
          title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          aria-expanded={sidebarOpen}
          aria-controls="sidebar-navigation"
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>
      </div>
      <h1 className="navbar-title">LFG Website</h1>
      <div className="navbar-right">
        {isLoggedIn ? (
          <>
            {/* WCAG 4.1.2 Name, Role, Value: give the visible username an explicit spoken label so the signed-in state is clear to screen readers. */}
            <span className="username-label" aria-label={`Signed in as ${username}`}>{username}</span>
            <button type="button" className="navbar-btn navbar-logout-btn" onClick={logout}>Logout</button>
          </>
        ) : (
          <div className="auth-btn-row">
            <button type="button" className="navbar-btn navbar-auth-btn" onClick={() => navigate('/login')}>Login</button>
            <button type="button" className="navbar-btn navbar-auth-btn" onClick={() => navigate('/login?mode=register')}>Register</button>
          </div>
        )}
        {/* WCAG 2.4.4 Link Purpose and 4.1.2 Name, Role, Value: provide a clear accessible name for the icon-only settings link. */}
        <Link to="/settings" title="Settings" aria-label="Open settings" className="navbar-btn navbar-settings-btn">
          ⚙️
        </Link>
      </div>
    </nav>
  );
}