// =========================
// 📘 src/services/userService.js (final, khớp user.controller)
// =========================
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// -- Helpers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

const handleResponse = async (response) => {
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      try { window.location.href = '/login'; } catch { }
    }
    const text = await response.text();
    let message = text || `HTTP ${response.status}`;
    try {
      const json = text ? JSON.parse(text) : null;
      if (json?.message) message = json.message;
    } catch { }
    throw new Error(message);
  }

  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return { data: text }; }
};

const toQuery = (obj = {}) => {
  const qs = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined && v !== null && `${v}` !== '') qs.append(k, v);
  });
  const s = qs.toString();
  return s ? `?${s}` : '';
};

const userService = {
  // Admin only
  async getAllUsers(filters = {}) {
    const res = await fetch(`${API_BASE_URL}/users${toQuery(filters)}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const data = await handleResponse(res);
    return data.users || (Array.isArray(data) ? data : []);
  },

  // Admin only
  async createUser(userData) {
    const res = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData),
    });
    const data = await handleResponse(res);
    return data.user || data;
  },

  // Admin only
  async searchUsers(q) {
    const res = await fetch(`${API_BASE_URL}/users/search?q=${encodeURIComponent(q)}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const data = await handleResponse(res);
    return data.users || (Array.isArray(data) ? data : []);
  },

  // Admin only
  async getUserById(id) {
    const res = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const data = await handleResponse(res);
    return data.user || data; // controller trả user trực tiếp
  },

  // Me
  async getMyProfile() {
    const res = await fetch(`${API_BASE_URL}/users/profile`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const data = await handleResponse(res);
    return data.user || data;
  },

  // Me
  async updateProfile(updateData) {
    const res = await fetch(`${API_BASE_URL}/users/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updateData),
    });
    const data = await handleResponse(res);
    const user = data.user || data;
    
    // Update localStorage
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
      // Dispatch custom event to notify AuthContext to update
      window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { user } }));
    }
    
    return user;
  },

  // Me
  async updatePassword(oldPassword, newPassword) {
    const res = await fetch(`${API_BASE_URL}/users/password`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    return handleResponse(res); // { message: '...' }
  },

  // Admin only
  async updateUser(userId, updateData) {
    const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updateData),
    });
    const data = await handleResponse(res);
    return data.user || data;
  },

  // Admin only: soft delete (alias deleteUser ở controller)
  async softDeleteUser(userId) {
    const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res); // { message: 'User deleted successfully' }
  },

  // Admin only: delete user only (giữ lại tests - SAFE)
  async hardDeleteUser(userId) {
    const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res); // { message: 'User deleted successfully (tests preserved)' }
  },

  // Admin only: update user password
  async adminUpdatePassword(userId, newPassword) {
    const res = await fetch(`${API_BASE_URL}/users/${userId}/password`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ newPassword }),
    });
    return handleResponse(res); // { message: 'Password updated successfully' }
  },

  // Public: Get system overview statistics
  async getSystemOverview() {
    const res = await fetch(`${API_BASE_URL}/users/stats/overview`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const data = await handleResponse(res);
    return data.stats || data;
  },

  // Public: Get top performers
  async getTopPerformers(limit = 5) {
    const res = await fetch(`${API_BASE_URL}/test-results/top-performers?limit=${limit}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const data = await handleResponse(res);
    return data.performers || (Array.isArray(data) ? data : []);
  },

  // Public: Get latest users
  async getLatestUsers(limit = 5) {
    const res = await fetch(`${API_BASE_URL}/users/latest?limit=${limit}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const data = await handleResponse(res);
    return data.users || (Array.isArray(data) ? data : []);
  },

  // Public: Get top contributors
  async getTopContributors(limit = 5) {
    const res = await fetch(`${API_BASE_URL}/users/top-contributors?limit=${limit}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const data = await handleResponse(res);
    return data.contributors || (Array.isArray(data) ? data : []);
  },
};

export default userService;
// Schema của user mẫu
/*
{
  "_id": {
    "$oid": "68f13f93807377aa09d03b2c"
  },
  "username": "admin",
  "full_name": "Nguyen Thanh Nhan",
  "email": "npthanhnhan2003@gmail.com",
  "password_hash": "$2b$10$R3l6Z2X9H1xGfEw9O9j6KORn6hYyGBFxnhBPKl1Rsvx5PCH/Hh2Q6",
  "role": "admin",
  "avatar_url": "https://lh3.googleusercontent.com/a/ACg8ocKBT3Dv2Ct3wV6Us_p4QGsKzp11wMV__P8Detqn7T9ltEGEM-D8RA=s96-c",
  "bio": "System administrator account.",
  "status": "active",
  "created_at": {
    "$date": "2025-10-16T18:55:15.591Z"
  },
  "updated_at": {
    "$date": "2025-10-23T10:36:10.161Z"
  },
  "authProvider": "google",
  "email_verified": true,
  "googleId": "108865730670002154759"
}
*/