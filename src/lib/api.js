const API_URL = String(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

// Ensure path starts with slash
const normalizePath = (path) => {
    const rawPath = String(path || '');
    return rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
};

// Fetch with API base URL and credentials
export const apiFetch = (path, options = {}) => {
    const requestPath = normalizePath(path);

    return fetch(`${API_URL}${requestPath}`, {
        credentials: 'include',
        ...options
    });
};
