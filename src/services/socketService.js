import io from 'socket.io-client';

// Socket.IO service for test session tracking
class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.sessionId = null;
    this.userId = null;
  }

  // Connect to socket server
  connect() {
    if (this.socket?.connected) return;

    const serverUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:8000';

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
    });

    this.socket.on('connect', () => {
      console.log('🔌 Connected to socket server');
      this.isConnected = true;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from socket server:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      this.isConnected = false;
    });

    // Listen for admin alerts
    this.socket.on('suspicious_behavior', (data) => {
      console.warn('🚨 Suspicious behavior detected:', data);
      // You can dispatch to Redux or show notification here
    });

    this.socket.on('gps_alert', (data) => {
      console.warn('🚨 GPS alert:', data);
      // You can dispatch to Redux or show notification here
    });

    this.socket.on('session_flagged', (data) => {
      console.warn('🚨 Session flagged:', data);
      // You can dispatch to Redux or show notification here
    });
  }

  // Disconnect from socket server
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.sessionId = null;
      this.userId = null;
    }
  }

  // Join test session
  joinTestSession(sessionId, userId) {
    if (!this.socket || !this.isConnected) {
      throw new Error('Socket not connected');
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('join_test_session', { session_id: sessionId, user_id: userId });

      this.socket.once('session_joined', (data) => {
        this.sessionId = sessionId;
        this.userId = userId;
        console.log('✅ Joined test session:', data);
        resolve(data);
      });

      this.socket.once('error', (error) => {
        console.error('❌ Failed to join session:', error);
        reject(new Error(error.message));
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        reject(new Error('Join session timeout'));
      }, 10000);
    });
  }

  // Record behavior event
  recordBehavior(eventType, eventData) {
    if (!this.socket || !this.isConnected || !this.sessionId) {
      console.warn('Socket not ready for behavior tracking');
      return;
    }

    this.socket.emit('behavior_event', {
      session_id: this.sessionId,
      event_type: eventType,
      event_data: eventData
    });

    this.socket.once('behavior_recorded', (data) => {
      console.log('✅ Behavior recorded:', data);
    });
  }

  // Update location
  updateLocation(locationData) {
    if (!this.socket || !this.isConnected || !this.sessionId) {
      console.warn('Socket not ready for location tracking');
      return;
    }

    this.socket.emit('location_update', {
      session_id: this.sessionId,
      location_data: locationData
    });

    this.socket.once('location_updated', (data) => {
      console.log('✅ Location updated:', data);
    });
  }

  // Update session status
  updateSessionStatus(status) {
    if (!this.socket || !this.isConnected || !this.sessionId) {
      console.warn('Socket not ready for status update');
      return;
    }

    this.socket.emit('session_status', {
      session_id: this.sessionId,
      status: status
    });

    this.socket.once('status_updated', (data) => {
      console.log('✅ Status updated:', data);
    });
  }

  // End session
  endSession() {
    if (!this.socket || !this.isConnected || !this.sessionId) {
      console.warn('Socket not ready for session end');
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('end_session', { session_id: this.sessionId });

      this.socket.once('session_ended', (data) => {
        console.log('✅ Session ended:', data);
        this.sessionId = null;
        this.userId = null;
        resolve(data);
      });

      this.socket.once('error', (error) => {
        console.error('❌ Failed to end session:', error);
        reject(new Error(error.message));
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error('End session timeout'));
      }, 5000);
    });
  }

  // Flag session
  flagSession(flagType, reason = '') {
    if (!this.socket || !this.isConnected || !this.sessionId) {
      console.warn('Socket not ready for flagging');
      return;
    }

    this.socket.emit('flag_session', {
      session_id: this.sessionId,
      flag_type: flagType,
      reason: reason
    });

    this.socket.once('session_flagged', (data) => {
      console.log('✅ Session flagged:', data);
    });
  }

  // Update permissions
  updatePermissions(permissions) {
    if (!this.socket || !this.isConnected || !this.sessionId) {
      console.warn('Socket not ready for permissions update');
      return;
    }

    this.socket.emit('permissions_update', {
      session_id: this.sessionId,
      permissions: permissions
    });

    this.socket.once('permissions_updated', (data) => {
      console.log('✅ Permissions updated:', data);
    });
  }

  // Get connection status
  getStatus() {
    return {
      isConnected: this.isConnected,
      sessionId: this.sessionId,
      userId: this.userId,
      socketId: this.socket?.id
    };
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
