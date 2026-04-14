import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login({ onLogin, onLogout, isLoggedIn }) {

    const [formData, setFormData] = useState({ username: "", password: "" });
    const [message, setMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        if (isLoggedIn && onLogout) {
            onLogout();
        }
    }, [isLoggedIn, onLogout]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        formData.username = document.getElementById("username").value;
        formData.password = document.getElementById("password").value;

        const trimmed = {
            username: formData.username.trim(),
            password: formData.password.trim()
        }

        alert(trimmed + "gap" + JSON.stringify(trimmed));

        if (trimmed.username === "" || trimmed.password === "") {
            setErrorMessage("Enter a Username and Password");
            return;
        } else {
            fetch('/api/auth/login', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(trimmed)
            })
            .then(response => {
                if (!response.ok) throw new Error('Login failed');
                return response.json();
            })
            .then((data) => {
                onLogin(trimmed.username);
                navigate('/');
            })
            .catch(error => {
                setErrorMessage("Invalid username or password");
                console.error("Login error:", error);
            });
        };
    };

    const handleRegister = (e) => {
        e.preventDefault();

        formData.username = document.getElementById("username").value;
        formData.username = formData.username.trim();
        formData.password = document.getElementById("password").value;
        formData.password = formData.password.trim();
        
        if (formData.username === "" || formData.password === "") {
            setErrorMessage("Enter a Username and Password");
            return;
        } else {
            alert(JSON.stringify(formData));
            fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
            .then(response => {
                if (!response.ok) throw new Error('Registration failed');
                return response.json();
            })
            .then((data) => {
                onLogin(data.username);
                navigate('/home');
            })
            .catch(error => {
                setErrorMessage("Username already exists or password is empty");
                console.error("Registration error:", error);
            });
        };
    };

    const [newButton, setNewButton] = useState(
        <button onClick={handleSubmit}>Login</button>
    );

    function buttonChangeRegister() {
        setMessage("")
        changeMessageLogin();
        setNewButton(
            <button onClick={handleRegister}>Register</button>
        );
    }

    function buttonChangeLogin() {
        setMessage("")
        changeMessageRegister();
        setNewButton(
            <button onClick={handleSubmit}>Login</button>
        );
    }

    const [changeMessage, setChangeMessage] = useState(
        <p onClick={buttonChangeRegister}>Don't have an account? Register here.</p>
    );

    function changeMessageRegister() {
        setChangeMessage(
            <p onClick={buttonChangeRegister}>Don't have an account? Register here.</p>
        );
    }

    function changeMessageLogin() {
        setChangeMessage(
            <p onClick={buttonChangeLogin}>Already have an account? Login here.</p>
        );
    }

    return (
        <div className="login-container">
            <h2>Login</h2>
            <form onSubmit={handleSubmit}>
                <input type="text" id="username" placeholder="Username" value={formData.username.value} />
                <input type="password" id="password" placeholder="Password" value={formData.password.value} />
                {newButton}
            </form>
            {changeMessage}
            {errorMessage && <p className="error">{errorMessage}</p>}
        </div>
    );
}
