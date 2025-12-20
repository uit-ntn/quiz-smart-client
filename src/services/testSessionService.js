import { apiCall } from './apiHelper';

// Test session service for frontend API calls
class TestSessionService {
  // Create a new test session
  async createTestSession(sessionData) {
    try {
      // Validate required fields
      if (!sessionData.test_result_id) {
        throw new Error('test_result_id is required');
      }

      // Ensure required fields are present and properly formatted
      const payload = {
        test_result_id: sessionData.test_result_id, // ✅ Required - draft TestResult ID
        device: sessionData.device, // ✅ Required - device info object
        locale: sessionData.locale, // ✅ Required - locale info object
        permissions: sessionData.permissions || {}, // Optional but recommended
        location: sessionData.location || { enabled: false }, // Optional
        socket_id: sessionData.socket_id || null, // Optional
        session_token: sessionData.session_token || crypto.randomUUID(), // Generated if not provided
      };

      // Note: user_id, ip, user_agent, started_at will be set by backend automatically from auth token

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
      
      console.log('✅ EndTestSession API response:', response);
      
      // ✅ FIX: Check response structure
      if (!response) {
        throw new Error('Empty response from server');
      }
      
      if (response.error || !response.success) {
        throw new Error(response.message || 'Server returned error');
      }
      
      // ✅ FIX: Normalize response structure
      // Backend may return: { success: true, message: '...', data: { session: {...} } }
      // or { success: true, session: {...} }
      const sessionResponseData = response.data?.session || response.session || response.data || response;
      
      if (!sessionResponseData || (!sessionResponseData._id && !sessionResponseData.id)) {
        console.error('Invalid session response:', response);
        throw new Error('Invalid session data from server');
      }
      
      console.log('✅ Validated ended session data:', sessionResponseData);
      return sessionResponseData;
    } catch (error) {
      console.error('❌ Failed to end test session:', error);
      
      // ✅ FIX: Better error handling
      if (error.message?.includes('HTML')) {
        throw new Error('Server returned HTML instead of JSON - check authentication');
      }
      
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

    // Enhanced platform detection
    let platform = 'desktop';
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
      if (/iPad/.test(ua)) platform = 'tablet';
      else if (/iPhone|iPod/.test(ua)) platform = 'mobile';
      else platform = 'mobile';
    } else if (/Windows/.test(ua)) {
      platform = 'desktop';
    } else if (/Mac/.test(ua)) {
      platform = 'desktop';
    } else if (/Linux/.test(ua)) {
      platform = 'desktop';
    }

    // Enhanced OS detection
    let os = 'Unknown';
    if (/Windows NT 10.0/.test(ua)) os = 'Windows 10';
    else if (/Windows NT 6.3/.test(ua)) os = 'Windows 8.1';
    else if (/Windows NT 6.2/.test(ua)) os = 'Windows 8';
    else if (/Windows NT 6.1/.test(ua)) os = 'Windows 7';
    else if (/Windows/.test(ua)) os = 'Windows';
    else if (/Mac OS X ([0-9_]+)/.test(ua)) {
      const version = ua.match(/Mac OS X ([0-9_]+)/)[1].replace(/_/g, '.');
      os = `macOS ${version}`;
    } else if (/Linux/.test(ua)) os = 'Linux';
    else if (/Android ([0-9.]+)/.test(ua)) {
      const version = ua.match(/Android ([0-9.]+)/)[1];
      os = `Android ${version}`;
    } else if (/iPhone OS ([0-9_]+)/.test(ua)) {
      const version = ua.match(/iPhone OS ([0-9_]+)/)[1].replace(/_/g, '.');
      os = `iOS ${version}`;
    } else if (/iPad; OS ([0-9_]+)/.test(ua)) {
      const version = ua.match(/OS ([0-9_]+)/)[1].replace(/_/g, '.');
      os = `iPadOS ${version}`;
    }

    // Enhanced browser detection
    let browser = 'Unknown';
    let browserVersion = 'Unknown';

    if (/Chrome/.test(ua) && !/Edge/.test(ua)) {
      browser = 'Chrome';
      const match = ua.match(/Chrome\/(\d+\.\d+)/);
      browserVersion = match ? match[1] : 'Unknown';
    } else if (/Firefox/.test(ua)) {
      browser = 'Firefox';
      const match = ua.match(/Firefox\/(\d+\.\d+)/);
      browserVersion = match ? match[1] : 'Unknown';
    } else if (/Safari/.test(ua) && !/Chrome/.test(ua)) {
      browser = 'Safari';
      const match = ua.match(/Version\/(\d+\.\d+)/);
      browserVersion = match ? match[1] : 'Unknown';
    } else if (/Edg/.test(ua)) {
      browser = 'Edge';
      const match = ua.match(/Edg\/(\d+\.\d+)/);
      browserVersion = match ? match[1] : 'Unknown';
    } else if (/MSIE|Trident/.test(ua)) {
      browser = 'Internet Explorer';
      const match = ua.match(/(MSIE\s|rv:)(\d+\.\d+)/);
      browserVersion = match ? match[2] : 'Unknown';
    }

    // GPU detection attempt
    let gpu = 'Unknown';
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          gpu = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'Unknown';
        } else {
          gpu = gl.getParameter(gl.RENDERER) || 'Unknown';
        }
      }
    } catch (e) {
      console.warn('GPU detection failed:', e);
    }

    return {
      platform,
      os,
      browser,
      browser_version: browserVersion,
      screen,
      pixel_ratio: window.devicePixelRatio || 1,
      touch_support: 'ontouchstart' in window,
      cpu: navigator.hardwareConcurrency || null,
      ram: navigator.deviceMemory || null,
      gpu
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
        permissions.location = locationPermission.state === 'granted' ? 'granted' 
          : locationPermission.state === 'denied' ? 'denied' 
          : 'prompt';
      } else {
        permissions.location = 'prompt';
      }
    } catch (e) {
      permissions.location = 'prompt';
    }

    try {
      // Check camera permission
      if (navigator.permissions) {
        const cameraPermission = await navigator.permissions.query({ name: 'camera' });
        permissions.camera = cameraPermission.state === 'granted' ? 'granted'
          : cameraPermission.state === 'denied' ? 'denied'
          : 'prompt';
      } else {
        permissions.camera = 'prompt';
      }
    } catch (e) {
      permissions.camera = 'prompt';
    }

    try {
      // Check microphone permission
      if (navigator.permissions) {
        const micPermission = await navigator.permissions.query({ name: 'microphone' });
        permissions.microphone = micPermission.state === 'granted' ? 'granted'
          : micPermission.state === 'denied' ? 'denied'
          : 'prompt';
      } else {
        permissions.microphone = 'prompt';
      }
    } catch (e) {
      permissions.microphone = 'prompt';
    }

    // Screen sharing is typically handled by application, default to prompt
    permissions.screen = 'prompt';

    // Clipboard - check if we can read
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        // Try to read clipboard to test permission
        await navigator.clipboard.readText();
        permissions.clipboard = 'granted';
      } else {
        permissions.clipboard = 'prompt';
      }
    } catch (e) {
      // If read fails, it's either denied or prompt
      permissions.clipboard = 'prompt';
    }

    return permissions;
  }

  // Helper: Update permissions when they change
  async updatePermissions() {
    return await this.getPermissionsInfo();
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
              heading: position.coords.heading || null,
              altitude: position.coords.altitude || null,
              altitudeAccuracy: position.coords.altitudeAccuracy || null,
              timestamp: new Date(position.timestamp || Date.now())
            }]
          });
        },
        (error) => {
          console.warn('Geolocation error:', error);
          resolve({ 
            enabled: false, 
            error: {
              code: error.code,
              message: error.message
            }
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }

  // Helper: Start location watching
  startLocationWatching(callback, options = {}) {
    if (!navigator.geolocation) {
      console.warn('Geolocation not available');
      return null;
    }

    const watchOptions = {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 60000, // 1 minute
      ...options
    };

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const locationData = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed || 0,
          heading: position.coords.heading || null,
          altitude: position.coords.altitude || null,
          altitudeAccuracy: position.coords.altitudeAccuracy || null,
          timestamp: new Date(position.timestamp || Date.now())
        };
        
        if (callback) {
          callback(locationData);
        }
      },
      (error) => {
        console.warn('Location watch error:', error);
        if (callback) {
          callback(null, {
            code: error.code,
            message: error.message
          });
        }
      },
      watchOptions
    );

    return watchId;
  }

  // Helper: Stop location watching
  stopLocationWatching(watchId) {
    if (watchId && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
    }
  }

  // Send heartbeat to keep session alive
  async heartbeat(sessionId) {
    try {
      const response = await apiCall('POST', `/test-sessions/${sessionId}/heartbeat`, {
        timestamp: new Date().toISOString()
      });
      return response.data;
    } catch (error) {
      console.warn('❌ Failed to send heartbeat:', error);
      // Don't throw - heartbeat failures shouldn't break the app
      return null;
    }
  }
}

// Create singleton instance
const testSessionService = new TestSessionService();

export default testSessionService;
