import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login({ onLogin }) {
	const [isRegistering, setIsRegistering] = useState(false);
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const navigate = useNavigate();

	const handleSubmit = async (e) => {
		e.preventDefault();
		const u = username.trim(), p = password.trim();
		if (!u || !p) { setError("Enter a username and password"); return; }
		setError("");
		try {
			const res = await fetch(isRegistering ? '/api/auth/register' : '/api/auth/login', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username: u, password: p })
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.message || (isRegistering ? 'Registration failed' : 'Login failed'));
			onLogin(data.username || u);
			navigate('/');
		} catch (err) {
			setError(err.message);
		}
	};

	return (
		<div className="login-container">
			<h2>{isRegistering ? "Register" : "Login"}</h2>
			<form onSubmit={handleSubmit}>
				<input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
				<input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
				<button type="submit">{isRegistering ? "Register" : "Login"}</button>
			</form>
			<p style={{ cursor: "pointer" }} onClick={() => { setIsRegistering((r) => !r); setError(""); }}>
				{isRegistering ? "Already have an account? Login here." : "Don't have an account? Register here."}
			</p>
			{error && <p className="error">{error}</p>}
		</div>
	);
}

