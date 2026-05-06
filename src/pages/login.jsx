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
		const trimmedUsername = username.trim();
		const trimmedPassword = password.trim();
		if (!trimmedUsername || !trimmedPassword) { setError("Enter a username and password"); return; }
		if (isRegistering && trimmedPassword.length < 6) {
			setError("Password must be at least 6 characters");
			return;
		}
		setError("");
		try {
			const res = await apiFetch(isRegistering ? '/api/auth/register' : '/api/auth/login', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username: trimmedUsername, password: trimmedPassword })
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.message || (isRegistering ? 'Registration failed' : 'Login failed'));
			onLogin(data.username || trimmedUsername);
			navigate('/');
		} catch (err) {
			setError(err.message);
		}
	};

	return (
		<div className="login-page">
			<div className="login-container">
				<h2>{isRegistering ? "Create Account" : "Welcome Back"}</h2>
				<p className="login-copy">{isRegistering ? "Create an account." : "Sign in."}</p>
				{/* WCAG 3.3.1 Error Identification and 4.1.3 Status Messages: connect any auth error to the form so assistive tech announces it in context. */}
				<form className="login-form" onSubmit={handleSubmit} aria-describedby={error ? "login-error" : undefined}>
					{/* WCAG 3.3.2 Labels or Instructions and 1.3.1 Info and Relationships: give the username field a programmatic name and appropriate autocomplete token. */}
					<input
						id="login-username"
						className="login-input"
						type="text"
						placeholder="Username"
						aria-label="Username"
						autoComplete="username"
						value={username}
						onChange={(e) => setUsername(e.target.value)}
					/>
					{/* WCAG 3.3.2 Labels or Instructions and 1.3.5 Identify Input Purpose: give the password field a programmatic label and correct autocomplete purpose. */}
					<input
						id="login-password"
						className="login-input"
						type="password"
						placeholder="Password"
						aria-label="Password"
						autoComplete={isRegistering ? "new-password" : "current-password"}
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
				{/* WCAG 3.3.1 Error Identification and 4.1.3 Status Messages: expose login errors as an assertive message so failed authentication is announced immediately. */}
				{error && <p id="login-error" className="error login-error" role="alert">{error}</p>}
			</div>
		</div>
	);
}

