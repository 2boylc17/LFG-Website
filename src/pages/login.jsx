import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login({ onLogin}) {

    const [formData, setFormData] = useState({ username: "", password: "" });
    const [message, setMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const navigate = useNavigate();

    const handleSubmitPlaceholder = async (e) => {
        e.preventDefault();
        alert('Login functionality is not implemented yet!');
    }

    const handleSubmit = async (e) => {
        e.preventDefault();

        formData.username = document.getElementById("username").value;
        formData.username = formData.username.trim();
        formData.password = document.getElementById("password").value;
        formData.password = formData.password.trim();

        if (formData.username === "" || formData.password === "") {
            setErrorMessage("Enter a Username and Password");
            return;
        } else {
            fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
            .then(response => {
                if (!response.ok) throw new Error('Login failed');
                return response.json();
            })
            .then(userData => {
                onLogin(userData.username);
                navigate('/home');
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
            .then(userData => {
                onLogin(userData.username);
                navigate('/home');
            })
            .catch(error => {
                setErrorMessage("Username already exists or password is empty");
                console.error("Registration error:", error);
            });
        };
    };

    const [newButton, setNewButton] = useState(
        <button onClick={handleSubmitPlaceholder}>Login</button>
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
            <form onSubmit={handleSubmitPlaceholder}>
                <input type="text" id="username" placeholder="Username" value={formData.username.value} />
                <input type="password" id="password" placeholder="Password" value={formData.password.value} />
                {newButton}
            </form>
            {changeMessage}
            {errorMessage && <p className="error">{errorMessage}</p>}
        </div>
    );
}
