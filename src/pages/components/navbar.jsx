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
        <h1>LFG Website</h1>
        <ul>
            {isLoggedIn ? (
                <li>
                    <span>Welcome, {username}!</span>
                    <button onClick={handleLogout}>Logout</button>
                </li>
            ) : (
                <li><Link to="/login">Login</Link></li>
            )}
        </ul>
    </nav>
  );
}