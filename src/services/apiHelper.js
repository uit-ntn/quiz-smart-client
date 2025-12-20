// =========================
// 🔧 API Helper Functions
// =========================

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Helper function to get auth headers
export const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };
};

// Enhanced response handler with better error handling
export const handleApiResponse = async (response) => {
    if (!response.ok) {
        // Handle 401 - Token expired or invalid
        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
            return;
        }
        
        // Try to get error message from response
        const errorText = await response.text();
        let errorMessage;
        
        try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorData.error || errorText;
        } catch {
            errorMessage = errorText || `HTTP error! status: ${response.status}`;
        }
        
        console.error('API Error Response:', errorText);
        throw new Error(errorMessage);
    }
    
    // Handle empty responses
    const text = await response.text();
    if (!text) return {};
    
    try {
        return JSON.parse(text);
    } catch {
        return { data: text };
    }
};

// Generic API call function
export const apiCall = async (methodOrUrl, endpointOrOptions = {}, dataOrUndefined = null) => {
    try {
        let method, endpoint, data, options;
        
        // Support both old format: apiCall(url, options) and new format: apiCall(method, endpoint, data)
        if (typeof methodOrUrl === 'string' && (methodOrUrl.startsWith('http') || methodOrUrl.startsWith('/'))) {
            // Old format: apiCall(url, options)
            const url = methodOrUrl;
            options = endpointOrOptions || {};
            method = options.method || 'GET';
            endpoint = url;
            data = options.body ? JSON.parse(options.body) : null;
        } else {
            // New format: apiCall(method, endpoint, data)
            method = methodOrUrl;
            endpoint = endpointOrOptions;
            data = dataOrUndefined;
            options = {};
        }
        
        const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
        
        console.log('API Call:', method, url, data);
        
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        
        const config = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
                ...options.headers
            },
        };
        
        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            config.body = JSON.stringify(data);
        }
        
        const response = await fetch(url, config);
        
        // ✅ Check if response is HTML
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
            throw new Error('Server returned HTML instead of JSON - authentication may have failed');
        }
        
        const result = await handleApiResponse(response);
        
        console.log('API Response:', result);
        return result;
    } catch (error) {
        console.error('API Call Error:', error);
        throw error;
    }
};

// Helper to extract array data from different response formats
export const extractArrayData = (data, arrayKey) => {
    if (data[arrayKey] && Array.isArray(data[arrayKey])) {
        return data[arrayKey];
    } else if (Array.isArray(data)) {
        return data;
    } else if (data.success && data[arrayKey]) {
        return data[arrayKey];
    } else {
        console.warn('Unexpected response format:', data);
        return [];
    }
};

// Helper to extract single object data from different response formats
export const extractObjectData = (data, objectKey) => {
    if (data[objectKey] && typeof data[objectKey] === 'object') {
        return data[objectKey];
    } else if (data.success && data[objectKey]) {
        return data[objectKey];
    } else if (typeof data === 'object' && !data.success && !data[objectKey]) {
        return data; // Direct object response
    } else {
        console.warn('Unexpected response format:', data);
        return null;
    }
};

// Build query string from filters object
export const buildQueryString = (params = {}) => {
    const qs = new URLSearchParams();
    Object.keys(params).forEach((key) => {
        const val = params[key];
        if (val !== undefined && val !== null) {
            qs.append(key, val);
        }
    });
    const str = qs.toString();
    return str ? `?${str}` : '';
};

export { API_BASE_URL };