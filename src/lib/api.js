const API_URL = String(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

const normalizePath = (path) => {
    const rawPath = String(path || '');
    return rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
};

export const apiFetch = (path, options = {}) => {
    const requestPath = normalizePath(path);

    return fetch(`${API_URL}${requestPath}`, {
        credentials: 'include',
        ...options
    });
};
