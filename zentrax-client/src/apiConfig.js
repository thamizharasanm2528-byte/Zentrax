// Centralized API Configuration
// Works for localhost and online/ngrok

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
export const SOCKET_URL = API_BASE_URL;

export default {
    API_BASE_URL,
    SOCKET_URL
};