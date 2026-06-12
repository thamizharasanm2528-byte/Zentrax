import { API_BASE_URL } from '../apiConfig';

/**
 * Common helper to get headers with a token.
 * NOTE: We no longer fallback to localStorage to prevent multi-tab clashing.
 * Always pass the fresh token from AuthContext/Firebase.
 */
const getAuthHeaders = (token) => {
    if (!token) {
        console.warn('mentorService: No token provided for request');
    }
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

export const mentorService = {
    // Mentor Requests
    sendRequest: async (mentorId, message, token, projectId = null) => {
        const response = await fetch(`${API_BASE_URL}/api/mentor-connection/request`, {
            method: 'POST',
            headers: getAuthHeaders(token),
            body: JSON.stringify({ mentorId, message, projectId })
        });
        return response.json();
    },
    getRequests: async (role, token) => {
        const response = await fetch(`${API_BASE_URL}/api/mentor-connection/requests?role=${role}`, {
            headers: getAuthHeaders(token)
        });
        return response.json();
    },
    updateRequestStatus: async (requestId, status, token) => {
        const response = await fetch(`${API_BASE_URL}/api/mentor-connection/request/${requestId}`, {
            method: 'PUT',
            headers: getAuthHeaders(token),
            body: JSON.stringify({ status })
        });
        return response.json();
    },

    // Chat
    getConversations: async (token) => {
        const response = await fetch(`${API_BASE_URL}/api/mentor-chat-v2/conversations`, {
            headers: getAuthHeaders(token)
        });
        return response.json();
    },
    getMessages: async (chatId, token) => {
        const response = await fetch(`${API_BASE_URL}/api/mentor-chat-v2/messages/${chatId}`, {
            headers: getAuthHeaders(token)
        });
        return response.json();
    },
    sendMessage: async (chatId, message, token) => {
        const response = await fetch(`${API_BASE_URL}/api/mentor-chat-v2/send`, {
            method: 'POST',
            headers: getAuthHeaders(token),
            body: JSON.stringify({ chatId, message })
        });
        return response.json();
    },

    // Progress
    submitProgress: async (description, projectId, token) => {
        const response = await fetch(`${API_BASE_URL}/api/mentor-progress/submit`, {
            method: 'POST',
            headers: getAuthHeaders(token),
            body: JSON.stringify({ description, projectId })
        });
        return response.json();
    },
    getStudentProgress: async (studentId, token) => {
        const response = await fetch(`${API_BASE_URL}/api/mentor-progress/${studentId}`, {
            headers: getAuthHeaders(token)
        });
        return response.json();
    },

    // Feedback
    giveFeedback: async (studentId, message, type, token) => {
        const response = await fetch(`${API_BASE_URL}/api/mentor-feedback/give`, {
            method: 'POST',
            headers: getAuthHeaders(token),
            body: JSON.stringify({ studentId, message, type })
        });
        return response.json();
    },
    getFeedback: async (token) => {
        const response = await fetch(`${API_BASE_URL}/api/mentor-feedback`, {
            headers: getAuthHeaders(token)
        });
        return response.json();
    },
    markTaskDone: async (feedbackId, token) => {
        const response = await fetch(`${API_BASE_URL}/api/mentor-feedback/task/${feedbackId}`, {
            method: 'PUT',
            headers: getAuthHeaders(token)
        });
        return response.json();
    }
};
