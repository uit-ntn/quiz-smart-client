// =========================
// 📘 src/services/authService.js (final, khớp auth.controller)
// =========================
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const logger = {
  info: (m, d = null) => console.log(`[AuthService] ${m}`, d || ''),
  error: (m, e = null) => console.error(`[AuthService ERROR] ${m}`, e || ''),
  debug: (m, d = null) => console.log(`[AuthService DEBUG] ${m}`, d || ''),
};

logger.info('Initialized', { API_BASE_URL, env: process.env.NODE_ENV });

class AuthService {
  constructor() {
    this.token = localStorage.getItem('token');
    this.user = JSON.parse(localStorage.getItem('user') || 'null');
  }

  // ---------- Helpers ----------
  getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
    };
  }

  async _handleResponse(response, { autoLogoutOn401 = true } = {}) {
    if (!response.ok) {
      if (response.status === 401 && autoLogoutOn401) {
        this._clearAuth();
      }
      const text = await response.text();
      let msg = text || `HTTP ${response.status}`;
      try {
        const json = text ? JSON.parse(text) : null;
        if (json?.message) msg = json.message;
      } catch {}
      throw new Error(msg);
    }
    const text = await response.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      return { data: text };
    }
  }

  _persistAuth({ token, user }) {
    if (token) {
      this.token = token;
      localStorage.setItem('token', token);
    }
    if (user) {
      this.user = user;
      localStorage.setItem('user', JSON.stringify(user));
    }
  }

  _clearAuth() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  // ---------- Auth flows ----------
  async register(userData) {
    logger.info('Register', { email: userData?.email });
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    const data = await this._handleResponse(res);
    // BE: gửi OTP, chưa trả token
    return data; // { message, email, userId, ... }
  }

  // Accepts: login({email, password}) OR login(email, password)
  async login(a, b) {
    const payload =
      typeof a === 'object' ? { email: a.email, password: a.password } : { email: a, password: b };

    logger.info('Login', { email: payload.email });
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await this._handleResponse(res);
    // BE: { user, token }
    this._persistAuth({ token: data.token, user: data.user });
    return data;
  }

  async logout() {
    try {
      if (this.token) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: this.getAuthHeaders(),
        });
      }
    } catch (e) {
      logger.error('Logout API failed (ignored)', e);
    } finally {
      this._clearAuth();
    }
  }

  async getCurrentUser() {
    if (!this.token) throw new Error('No token available');
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    const data = await this._handleResponse(res);
    // BE: trả document user trực tiếp (req.user)
    this._persistAuth({ user: data });
    return data;
  }

  // ---------- Google OAuth ----------
  async initiateGoogleLogin(returnUrl = null) {
    // Lưu đường dẫn để quay lại - ưu tiên returnUrl được truyền vào
    const targetPath = returnUrl || window.location.pathname;
    if (targetPath && !['/login', '/register'].includes(targetPath)) {
      localStorage.setItem('authReturnTo', targetPath);
    }

    // Bỏ qua việc kiểm tra health endpoint vì có thể bị CORS block
    // Trực tiếp redirect đến Google OAuth - nếu backend không hoạt động, 
    // user sẽ thấy lỗi 404 hoặc 500 từ API Gateway

    // Xây dựng URL với returnUrl nếu có
    let googleAuthUrl = `${API_BASE_URL}/auth/google`;
    if (returnUrl) {
      const encodedReturnUrl = encodeURIComponent(returnUrl);
      googleAuthUrl += `?returnUrl=${encodedReturnUrl}`;
    }

    // Redirect sang Google OAuth
    window.location.href = googleAuthUrl;
  }

  // Gọi ở trang /auth/success khi nhận ?token=...
  async handleGoogleCallback(token) {
    logger.info('Google callback', { token: token ? token.slice(0, 20) + '...' : 'missing' });
    if (!token) throw new Error('No token received from Google OAuth');

    // Lưu token, sau đó gọi /auth/me
    this._persistAuth({ token });
    try {
      const me = await this.getCurrentUser(); // sẽ persist user
      return { user: me, token };
    } catch (e) {
      this._clearAuth();
      throw e;
    }
  }

  // Utility method để redirect tới Google login từ bất kỳ đâu
  redirectToGoogleLogin(fromPage = null) {
    const returnUrl = fromPage || window.location.pathname + window.location.search;
    this.initiateGoogleLogin(returnUrl);
  }

  // ---------- OTP & Password flows ----------
  async verifyRegistrationOTP(email, otp) {
    const res = await fetch(`${API_BASE_URL}/auth/verify-registration-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });
    const data = await this._handleResponse(res);
    // Nếu BE trả kèm token/user sau verify -> lưu
    if (data?.token || data?.user) this._persistAuth({ token: data.token, user: data.user });
    return data;
  }

  async resendRegistrationOTP(email) {
    const res = await fetch(`${API_BASE_URL}/auth/resend-registration-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return this._handleResponse(res);
  }

  async forgotPassword(email) {
    const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return this._handleResponse(res);
  }

  async resetPasswordWithOTP(email, otp, newPassword) {
    const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, newPassword }),
    });
    return this._handleResponse(res);
  }

  // ---------- Profile & Password (liên quan user.controller) ----------
  async updateProfile(updateData) {
    const res = await fetch(`${API_BASE_URL}/users/profile`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(updateData),
    });
    const data = await this._handleResponse(res);
    // BE có thể trả user trực tiếp hoặc { user }
    const user = data.user || data;
    this._persistAuth({ user });
    
    // Dispatch custom event to notify AuthContext to update
    window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { user } }));
    
    return user;
  }

  async changePassword(oldPassword, newPassword) {
    // BE: PUT /users/password (khớp user.controller)
    const res = await fetch(`${API_BASE_URL}/users/password`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    return this._handleResponse(res);
  }

  // ---------- Utilities ----------
  isAuthenticated() {
    return !!(this.token && this.user);
  }

  getCurrentUserData() {
    return this.user;
  }

  getToken() {
    return this.token;
  }

  hasRole(role) {
    return this.user?.role === role;
  }

  isAdmin() {
    return this.hasRole('admin');
  }

  async verifyToken() {
    if (!this.token) return false;
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) {
        this._clearAuth();
        return false;
      }
      return true;
    } catch (e) {
      this._clearAuth();
      return false;
    }
  }
}

const authService = new AuthService();
export default authService;
