import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

const API_URL = String(import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

// Rewrite relative /api requests to the configured backend URL in production.
if (API_URL && typeof window !== "undefined" && typeof window.fetch === "function") {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    if (typeof input === "string" && input.startsWith("/api/")) {
      return originalFetch(`${API_URL}${input}`, {
        credentials: "include",
        ...init,
      });
    }

    return originalFetch(input, init);
  };
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);