import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
    const handleLogout = () => {      // Clear user session or token here
        // For example, if using localStorage:
        //localStorage.removeItem('userToken');
        // Redirect to login page
        //navigate('/login');
        alert('Logged out!');
    };

  return (
    <nav className="navbar">
        <h1>LFG Website</h1>
        <ul>
            <li><Link to="/login">Login</Link></li>
        </ul>
    </nav>
  );
}