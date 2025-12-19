import { apiCall } from './apiHelper';

// Test session service for frontend API calls
class TestSessionService {
  // Create a new test session
  async createTestSession(sessionData) {
    try {
      // Validate required fields
      if (!sessionData.user_id) {
        throw new Error('user_id is required');
      }
      if (!sessionData.test_result_id) {
        throw new Error('test_result_id is required');
      }

      // Ensure required fields are present and properly formatted
      const payload = {
        user_id: sessionData.user_id, // ✅ Required - from auth user
        test_result_id: sessionData.test_result_id, // ✅ Required - draft TestResult ID
        device: sessionData.device, // ✅ Required - device info object
        locale: sessionData.locale, // ✅ Required - locale info object
        permissions: sessionData.permissions || {}, // Optional but recommended
        location: sessionData.location || { enabled: false }, // Optional
        socket_id: sessionData.socket_id || null, // Optional
        session_token: sessionData.session_token || `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`, // Generated if not provided
      };

      // Note: ip, user_agent, started_at will be set by backend automatically

      console.log('📤 Sending POST /test-sessions with payload:', payload);

      // ✅ FIX: Đảm bảo apiCall có Authorization header
      const response = await apiCall('POST', '/test-sessions', payload);
      
      console.log('✅ TestSession API response:', response);
      
      // ✅ FIX: Kiểm tra response structure
      if (!response) {
        throw new Error('Empty response from server');
      }
      
      if (response.error || !response.success) {
        throw new Error(response.message || 'Server returned error');
      }
      
      // ✅ FIX: Normalize response structure
      // Backend returns: { success: true, message: '...', data: { session: {...} } }
      const sessionResponseData = response.data?.session || response.session || response.data || response;
      
      if (!sessionResponseData || (!sessionResponseData._id && !sessionResponseData.id)) {
        console.error('Invalid session response:', response);
        throw new Error('Invalid session data from server');
      }
      
      console.log('✅ Validated session data:', sessionResponseData);
      return response; // Return full response for consistency with other methods
    } catch (error) {
      console.error('❌ Failed to create test session:', error);
      
      // ✅ FIX: Better error handling
      if (error.message?.includes('HTML')) {
        throw new Error('Server returned HTML instead of JSON - check authentication');
      }
      
      throw error;
    }
  }

  // Update test session
  async updateTestSession(sessionId, updateData) {
    try {
      const response = await apiCall('PUT', `/test-sessions/${sessionId}`, updateData);
      return response.data.session;
    } catch (error) {
      console.error('❌ Failed to update test session:', error);
      throw error;
    }
  }

  // Add behavior event
  async addBehaviorEvent(sessionId, eventType, eventData) {
    try {
      const response = await apiCall('POST', `/test-sessions/${sessionId}/behavior`, {
        event_type: eventType,
        event_data: eventData
      });
      return response.data;
    } catch (error) {
      console.error('❌ Failed to add behavior event:', error);
      throw error;
    }
  }

  // Update location
  async updateLocation(sessionId, locationData) {
    try {
      const response = await apiCall('PUT', `/test-sessions/${sessionId}/location`, locationData);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to update location:', error);
      throw error;
    }
  }

  // End test session
  async endTestSession(sessionId) {
    try {
      const payload = {
        ended_at: new Date(),
        status: 'completed'
      };
      const response = await apiCall('POST', `/test-sessions/${sessionId}/end`, payload);
      return response.data.session;
    } catch (error) {
      console.error('❌ Failed to end test session:', error);
      throw error;
    }
  }

  // Flag session
  async flagSession(sessionId, flagType, reason = '') {
    try {
      const response = await apiCall('POST', `/test-sessions/${sessionId}/flag`, {
        flag_type: flagType,
        reason: reason
      });
      return response.data.session;
    } catch (error) {
      console.error('❌ Failed to flag session:', error);
      throw error;
    }
  }

  // Get session by ID
  async getTestSessionById(sessionId) {
    try {
      const response = await apiCall('GET', `/test-sessions/${sessionId}`);
      return response.data.session;
    } catch (error) {
      console.error('❌ Failed to get test session:', error);
      throw error;
    }
  }

  // Get my sessions
  async getMySessions(filters = {}) {
    try {
      const queryParams = new URLSearchParams();

      if (filters.status) queryParams.append('status', filters.status);
      if (filters.from_date) queryParams.append('from_date', filters.from_date);
      if (filters.to_date) queryParams.append('to_date', filters.to_date);

      const queryString = queryParams.toString();
      const url = `/test-sessions/my-sessions${queryString ? `?${queryString}` : ''}`;

      const response = await apiCall('GET', url);
      return response.data.sessions;
    } catch (error) {
      console.error('❌ Failed to get my sessions:', error);
      throw error;
    }
  }

  // Get user sessions (admin only)
  async getUserSessions(userId, filters = {}) {
    try {
      const queryParams = new URLSearchParams();

      if (filters.status) queryParams.append('status', filters.status);
      if (filters.from_date) queryParams.append('from_date', filters.from_date);
      if (filters.to_date) queryParams.append('to_date', filters.to_date);

      const queryString = queryParams.toString();
      const url = `/test-sessions/user/${userId}${queryString ? `?${queryString}` : ''}`;

      const response = await apiCall('GET', url);
      console.log('📊 getUserSessions response:', response);
      
      // Backend returns { success, message, count, sessions }
      const sessions = response.sessions || response.data?.sessions || response.data || [];
      return Array.isArray(sessions) ? sessions : [];
    } catch (error) {
      console.error('❌ Failed to get user sessions:', error);
      throw error;
    }
  }

  // Get suspicious sessions (admin only)
  async getSuspiciousSessions(timeRange = 24, limit = 50) {
    try {
      const response = await apiCall('GET', `/test-sessions/suspicious?time_range=${timeRange}&limit=${limit}`);
      console.log('🚨 getSuspiciousSessions response:', response);
      
      // Backend returns { success, message, count, time_range_hours, sessions }
      const sessions = response.sessions || response.data?.sessions || response.data || [];
      console.log('🚨 Parsed suspicious sessions:', sessions.length);
      
      return Array.isArray(sessions) ? sessions : [];
    } catch (error) {
      console.error('❌ Failed to get suspicious sessions:', error);
      throw error;
    }
  }

  // Get all sessions (admin only)
  async getAllSessions(filters = {}) {
    try {
      console.log('🔍 Getting all sessions with filters:', filters);
      
      const queryParams = new URLSearchParams();

      if (filters.status && filters.status !== 'all') queryParams.append('status', filters.status);
      if (filters.timeRange) {
        const fromDate = new Date(Date.now() - parseInt(filters.timeRange) * 60 * 60 * 1000).toISOString();
        queryParams.append('from_date', fromDate);
      }
      if (filters.limit) queryParams.append('limit', filters.limit.toString());
      if (filters.page) queryParams.append('page', filters.page.toString());

      const queryString = queryParams.toString();
      const url = `/test-sessions${queryString ? `?${queryString}` : ''}`;

      const response = await apiCall('GET', url);
      console.log('✅ All sessions response:', response);
      
      // Backend returns { success, message, count, total, page, sessions }
      return response.data?.sessions || response.sessions || [];
    } catch (error) {
      console.error('❌ Failed to get all sessions:', error);
      // Fallback to suspicious sessions if main endpoint fails
      try {
        console.warn('⚠️ Falling back to suspicious sessions...');
        return await this.getSuspiciousSessions(filters.timeRange || 24, filters.limit || 100);
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        return [];
      }
    }
  }

  // Get session analytics (admin only)
  async getSessionAnalytics(filters = {}) {
    try {
      const queryParams = new URLSearchParams();

      if (filters.from_date) queryParams.append('from_date', filters.from_date);
      if (filters.to_date) queryParams.append('to_date', filters.to_date);

      const queryString = queryParams.toString();
      const url = `/test-sessions/analytics${queryString ? `?${queryString}` : ''}`;

      const response = await apiCall('GET', url);
      console.log('📊 getSessionAnalytics response:', response);
      
      // Backend returns { success, message, analytics }
      const analytics = response.analytics || response.data?.analytics || response.data || {};
      
      // Map backend fields to frontend expected fields
      return {
        total_sessions: analytics.total_sessions || 0,
        active_sessions: 0, // Backend doesn't provide this, calculate if needed
        completed_sessions: analytics.completed_sessions || 0,
        flagged_sessions: analytics.flagged_sessions || 0,
        suspicious_behaviors: analytics.suspicious_behavior_count || 0,
        abandoned_sessions: analytics.abandoned_sessions || 0,
        completion_rate: analytics.completion_rate || 0,
        avg_duration_sec: analytics.avg_duration_sec || 0,
        cheating_detected: analytics.cheating_detected_count || 0,
        vpn_suspected: analytics.vpn_suspected_count || 0,
        unique_ips: analytics.unique_ip_count || 0
      };
    } catch (error) {
      console.error('❌ Failed to get session analytics:', error);
      throw error;
    }
  }

  // Helper: Get device info
  getDeviceInfo() {
    const ua = navigator.userAgent;
    const screen = `${window.screen.width}x${window.screen.height}`;

    // Simple device detection
    let platform = 'desktop';
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
      platform = /iPad|iPhone|iPod/.test(ua) ? 'tablet' : 'mobile';
    }

    // Browser detection
    let browser = 'Unknown';
    let browserVersion = 'Unknown';

    if (ua.includes('Chrome')) {
      browser = 'Chrome';
      const match = ua.match(/Chrome\/(\d+)/);
      browserVersion = match ? match[1] : 'Unknown';
    } else if (ua.includes('Firefox')) {
      browser = 'Firefox';
      const match = ua.match(/Firefox\/(\d+)/);
      browserVersion = match ? match[1] : 'Unknown';
    } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
      browser = 'Safari';
      const match = ua.match(/Version\/(\d+)/);
      browserVersion = match ? match[1] : 'Unknown';
    } else if (ua.includes('Edge')) {
      browser = 'Edge';
      const match = ua.match(/Edge\/(\d+)/);
      browserVersion = match ? match[1] : 'Unknown';
    }

    return {
      platform,
      os: navigator.platform || 'Unknown',
      browser,
      browser_version: browserVersion,
      screen,
      pixel_ratio: window.devicePixelRatio || 1,
      touch_support: 'ontouchstart' in window,
      cpu: navigator.hardwareConcurrency || null,
      ram: navigator.deviceMemory || null,
      gpu: null // Can't easily detect GPU from frontend
    };
  }

  // Helper: Get locale info
  getLocaleInfo() {
    return {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      languages: navigator.languages || [navigator.language]
    };
  }

  // Helper: Get permissions status
  async getPermissionsInfo() {
    const permissions = {};

    try {
      // Check location permission
      if (navigator.permissions) {
        const locationPermission = await navigator.permissions.query({ name: 'geolocation' });
        // Ensure valid enum: 'granted', 'denied', 'prompt'
        permissions.location = locationPermission.state === 'granted' ? 'granted' 
          : locationPermission.state === 'denied' ? 'denied' 
          : 'prompt';
      } else {
        permissions.location = 'prompt'; // ✅ Changed from 'unknown' to 'prompt'
      }
    } catch (e) {
      permissions.location = 'prompt'; // ✅ Changed from 'unknown' to 'prompt'
    }

    // Other permissions default to prompt
    permissions.camera = 'prompt';
    permissions.microphone = 'prompt';
    permissions.screen = 'prompt';
    permissions.clipboard = 'prompt';

    return permissions;
  }

  // Helper: Get location info
  async getLocationInfo() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ enabled: false });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            enabled: true,
            address: null, // Will be resolved by backend
            history: [{
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
              speed: position.coords.speed || 0,
              timestamp: new Date()
            }]
          });
        },
        (error) => {
          console.warn('Geolocation error:', error);
          resolve({ enabled: false });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }
}

// Create singleton instance
const testSessionService = new TestSessionService();

export default testSessionService;
