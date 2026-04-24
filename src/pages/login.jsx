import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../lib/api.js';

export default function Login({ onLogin }) {
	const [isRegistering, setIsRegistering] = useState(false);
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();

	useEffect(() => {
		const mode = (searchParams.get("mode") || "").toLowerCase();
		setIsRegistering(mode === "register");
		setError("");
	}, [searchParams]);

	const handleSubmit = async (e) => {
		e.preventDefault();
		const u = username.trim(), p = password.trim();
		if (!u || !p) { setError("Enter a username and password"); return; }
		if (isRegistering && p.length < 6) {
			setError("Password must be at least 6 characters");
			return;
		}
		setError("");
		try {
			const res = await apiFetch(isRegistering ? '/api/auth/register' : '/api/auth/login', {
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
		<div className="login-page">
			<div className="login-container">
				<h2>{isRegistering ? "Create Account" : "Welcome Back"}</h2>
				<p className="login-copy">{isRegistering ? "Join and start creating groups." : "Sign in to create and manage your groups."}</p>
				<form className="login-form" onSubmit={handleSubmit}>
					<input
						className="login-input"
						type="text"
						placeholder="Username"
						value={username}
						onChange={(e) => setUsername(e.target.value)}
					/>
					<input
						className="login-input"
						type="password"
						placeholder="Password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
					/>
					<button className="login-submit" type="submit">{isRegistering ? "Register" : "Login"}</button>
				</form>
				<button
					type="button"
					className="login-toggle"
					onClick={() => { setIsRegistering((r) => !r); setError(""); }}
				>
					{isRegistering ? "Already have an account? Login here." : "Don't have an account? Register here."}
				</button>
				{error && <p className="error login-error">{error}</p>}
			</div>
		</div>
	);
}

