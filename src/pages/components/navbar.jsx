import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Navbar({
  isLoggedIn,
  onLogout,
  username
}) {
  const navigate = useNavigate();
  
  
  const handleLogout = async() => {
        await onLogout();
        navigate('/');
    };

  return (
    <nav className="navbar">
        <h1 className="navbar-title">LFG Website</h1>
        <div className="navbar-right">
            {isLoggedIn ? (
                <>
                    <span className="username-label">{username}</span>
                    <Link className="log-link" onClick={handleLogout}>Logout</Link>
                </>
            ) : (
              <div className="auth-link-row">
                <Link className="nav-auth-link" to="/login">Login</Link>
                <Link className="nav-auth-link" to="/login?mode=register">Register</Link>
              </div>
            )}
            <Link to="/settings" title="Settings" className="settings-link">
                ⚙️
            </Link>
        </div>
    </nav>
  );
}