// Centralized API Configuration
// Works for localhost and online/ngrok

const getApiBaseUrl = () => {
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        return 'http://localhost:5000';
    }
    return import.meta.env.VITE_API_URL || 'http://localhost:5000';
};

export const API_BASE_URL = getApiBaseUrl();
export const SOCKET_URL = API_BASE_URL;

export default {
    API_BASE_URL,
    SOCKET_URL
};