const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * Wrapper around fetch that prepends the Railway backend URL in production.
 * Usage: apiFetch('/api/auth/login', { method: 'POST', ... })
 */
export const apiFetch = (path, options = {}) => {
    return fetch(`${API_URL}${path}`, {
        credentials: 'include',
        ...options
    });
};
