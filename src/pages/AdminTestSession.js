import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../layout/AdminLayout';
import testSessionService from '../services/testSessionService';
import socketService from '../services/socketService';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const AdminTestSession = () => {
  const [sessions, setSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [realTimeAlerts, setRealTimeAlerts] = useState([]);

  // Filters
  const [filters, setFilters] = useState({
    status: 'all',
    timeRange: '24',
    search: '',
    flaggedOnly: false
  });

  // Analytics
  const [analytics, setAnalytics] = useState({
    total_sessions: 0,
    active_sessions: 0,
    completed_sessions: 0,
    flagged_sessions: 0,
    suspicious_behaviors: 0
  });

  // Load sessions
  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let sessionsData;
      
      if (filters.flaggedOnly) {
        // Load suspicious sessions if flagged filter is on
        sessionsData = await testSessionService.getSuspiciousSessions(parseInt(filters.timeRange), 100);
      } else {
        // Load all sessions for admin (fallback to suspicious sessions)
        sessionsData = await testSessionService.getAllSessions({
          timeRange: parseInt(filters.timeRange),
          status: filters.status !== 'all' ? filters.status : undefined,
          limit: 100
        });
      }

      console.log('📋 Sessions data received:', sessionsData);
      
      // Đảm bảo sessionsData là array
      const safeSessions = Array.isArray(sessionsData) ? sessionsData : [];
      setSessions(safeSessions);
    } catch (err) {
      console.error('Failed to load sessions:', err);
      setError('Không thể tải dữ liệu phiên test. Backend có thể chưa hỗ trợ endpoint này hoặc cần quyền admin.');
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.timeRange, filters.flaggedOnly]);

  // Load analytics
  const loadAnalytics = useCallback(async () => {
    try {
      const analyticsData = await testSessionService.getSessionAnalytics({
        from_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      });
      console.log('📊 Analytics data received:', analyticsData);
      
      // Đảm bảo analytics data có đầy đủ các trường cần thiết
      const safeAnalytics = {
        total_sessions: analyticsData?.total_sessions || 0,
        active_sessions: analyticsData?.active_sessions || 0,
        completed_sessions: analyticsData?.completed_sessions || 0,
        flagged_sessions: analyticsData?.flagged_sessions || 0,
        suspicious_behaviors: analyticsData?.suspicious_behaviors || 0,
        ...analyticsData
      };
      
      setAnalytics(safeAnalytics);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      // Đặt analytics mặc định khi có lỗi
      setAnalytics({
        total_sessions: 0,
        active_sessions: 0,
        completed_sessions: 0,
        flagged_sessions: 0,
        suspicious_behaviors: 0
      });
    }
  }, []);

  // Filter sessions based on search
  useEffect(() => {
    if (!sessions) return;

    let filtered = sessions;

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = sessions.filter(session => 
        session.user_id?.full_name?.toLowerCase().includes(searchLower) ||
        session.user_id?.email?.toLowerCase().includes(searchLower) ||
        session.test_result_id?.test_snapshot?.test_title?.toLowerCase().includes(searchLower) ||
        (session._id || session.id)?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredSessions(filtered);
  }, [sessions, filters.search]);

  // Setup real-time monitoring
  useEffect(() => {
    // Connect to socket for real-time updates
    socketService.connect();

    const handleSuspiciousBehavior = (data) => {
      setRealTimeAlerts(prev => [...prev.slice(-9), {
        id: Date.now(),
        type: 'suspicious_behavior',
        message: `Hành vi đáng ngờ phát hiện: ${data.event_type}`,
        session_id: data.session_id,
        timestamp: new Date()
      }]);
    };

    const handleGpsAlert = (data) => {
      setRealTimeAlerts(prev => [...prev.slice(-9), {
        id: Date.now(),
        type: 'gps_alert',
        message: `Cảnh báo GPS: ${data.message}`,
        session_id: data.session_id,
        timestamp: new Date()
      }]);
    };

    const handleSessionFlagged = (data) => {
      setRealTimeAlerts(prev => [...prev.slice(-9), {
        id: Date.now(),
        type: 'session_flagged',
        message: `Phiên test bị đánh dấu: ${data.flag_type}`,
        session_id: data.session_id,
        timestamp: new Date()
      }]);
      // Reload sessions to update the list
      loadSessions();
    };

    // Listen to socket events
    if (socketService.socket) {
      socketService.socket.on('suspicious_behavior', handleSuspiciousBehavior);
      socketService.socket.on('gps_alert', handleGpsAlert);
      socketService.socket.on('session_flagged', handleSessionFlagged);
    }

    return () => {
      if (socketService.socket) {
        socketService.socket.off('suspicious_behavior', handleSuspiciousBehavior);
        socketService.socket.off('gps_alert', handleGpsAlert);
        socketService.socket.off('session_flagged', handleSessionFlagged);
      }
    };
  }, [loadSessions]);

  // Initial data load
  useEffect(() => {
    loadSessions();
    loadAnalytics();
  }, [loadSessions, loadAnalytics]);

  // Handle session actions
  const handleFlagSession = async (sessionId, flagType, reason) => {
    try {
      await testSessionService.flagSession(sessionId, flagType, reason);
      loadSessions(); // Reload to show updated status
    } catch (err) {
      console.error('Failed to flag session:', err);
    }
  };

  const handleViewSession = (session) => {
    setSelectedSession(session);
    setShowSessionModal(true);
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    try {
      // Handle different date formats
      let date;
      if (typeof dateValue === 'string') {
        date = new Date(dateValue);
      } else if (dateValue.$date) {
        date = new Date(dateValue.$date);
      } else if (dateValue instanceof Date) {
        date = dateValue;
      } else {
        date = new Date(dateValue);
      }
      
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      
      return date.toLocaleString('vi-VN');
    } catch (error) {
      console.error('Error formatting date:', error, dateValue);
      return 'N/A';
    }
  };

  const formatDuration = (durationMs) => {
    if (!durationMs) return '0 phút';
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes}p ${seconds}s`;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'active': { color: 'bg-green-100 text-green-800', label: 'Đang hoạt động' },
      'completed': { color: 'bg-blue-100 text-blue-800', label: 'Hoàn thành' },
      'abandoned': { color: 'bg-orange-100 text-orange-800', label: 'Bỏ dở' },
      'flagged': { color: 'bg-red-100 text-red-800', label: 'Bị đánh dấu' },
      'terminated': { color: 'bg-red-100 text-red-800', label: 'Kết thúc' }, // Legacy status
      'in_progress': { color: 'bg-indigo-100 text-indigo-800', label: 'Đang làm bài' } // Legacy status
    };

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', label: status || 'Không xác định' };
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center min-h-96">
          <LoadingSpinner />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Quản lý Phiên Test</h1>
          <div className="flex space-x-3">
            <button
              onClick={() => {
                loadSessions();
                loadAnalytics();
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              🔄 Làm mới
            </button>
          </div>
        </div>

        {error && <ErrorMessage message={error} />}

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tổng phiên</p>
                <p className="text-2xl font-semibold text-gray-900">{analytics?.total_sessions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Đang hoạt động</p>
                <p className="text-2xl font-semibold text-gray-900">{analytics?.active_sessions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Hoàn thành</p>
                <p className="text-2xl font-semibold text-gray-900">{analytics?.completed_sessions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Bị đánh dấu</p>
                <p className="text-2xl font-semibold text-gray-900">{analytics?.flagged_sessions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Hành vi đáng ngờ</p>
                <p className="text-2xl font-semibold text-gray-900">{analytics?.suspicious_behaviors}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Alerts */}
        {realTimeAlerts.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🚨 Cảnh báo Thời gian Thực</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {realTimeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg text-sm ${
                    alert.type === 'suspicious_behavior' ? 'bg-red-50 text-red-800' :
                    alert.type === 'gps_alert' ? 'bg-yellow-50 text-yellow-800' :
                    'bg-orange-50 text-orange-800'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span>{alert.message}</span>
                    <span className="text-xs opacity-75">
                      {alert.timestamp.toLocaleTimeString('vi-VN')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Trạng thái</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">Tất cả</option>
                <option value="active">Đang hoạt động</option>
                <option value="completed">Hoàn thành</option>
                <option value="abandoned">Bỏ dở</option>
                <option value="flagged">Bị đánh dấu</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Khoảng thời gian</label>
              <select
                value={filters.timeRange}
                onChange={(e) => setFilters(prev => ({ ...prev, timeRange: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="1">1 giờ qua</option>
                <option value="24">24 giờ qua</option>
                <option value="168">7 ngày qua</option>
                <option value="720">30 ngày qua</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tìm kiếm</label>
              <input
                type="text"
                placeholder="Tìm theo tên, email, test..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="flex items-end">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.flaggedOnly}
                  onChange={(e) => setFilters(prev => ({ ...prev, flaggedOnly: e.target.checked }))}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700">Chỉ phiên đáng ngờ</span>
              </label>
            </div>
          </div>
        </div>

        {/* Sessions Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Danh sách Phiên Test ({filteredSessions.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Người dùng
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bài Test
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thời gian bắt đầu
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thời lượng
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hành vi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSessions.map((session) => {
                  // Count behavior events
                  const behaviorCount = Object.values(session.behavior || {}).reduce((count, events) => {
                    return count + (Array.isArray(events) ? events.length : 0);
                  }, 0);
                  
                  // Count flags
                  const flagsCount = Object.values(session.flags || {}).filter(Boolean).length;
                  
                  return (
                    <tr key={session._id || session.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {session.user_id?.full_name?.[0]?.toUpperCase() || session.user_id?.email?.[0]?.toUpperCase() || session.user?.full_name?.[0]?.toUpperCase() || session.user?.email?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {session.user_id?.full_name || session.user?.full_name || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {session.user_id?.email || session.user?.email || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {session.test_result_id?.test_snapshot?.test_title || session.test_snapshot?.test_title || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {session.test_result_id?.test_snapshot?.test_type || session.test_snapshot?.test_type || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(session.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(session.started_at || session.start_time)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {session.duration_sec ? `${session.duration_sec}s` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {behaviorCount} sự kiện
                        </div>
                        {flagsCount > 0 && (
                          <div className="text-xs text-red-600">
                            {flagsCount} cảnh báo
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewSession(session)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Chi tiết
                          </button>
                          {session.status === 'active' && (
                            <button
                              onClick={() => handleFlagSession(session._id || session.id, 'suspicious_behavior', 'Đánh dấu để kiểm tra')}
                              className="text-yellow-600 hover:text-yellow-900"
                            >
                              Đánh dấu
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredSessions.length === 0 && (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Không có phiên test nào</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Không tìm thấy phiên test nào với bộ lọc hiện tại.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Session Detail Modal */}
        {showSessionModal && selectedSession && (
          <SessionDetailModal
            session={selectedSession}
            onClose={() => {
              setShowSessionModal(false);
              setSelectedSession(null);
            }}
            onFlag={handleFlagSession}
          />
        )}
      </div>
    </AdminLayout>
  );
};

// Session Detail Modal Component
const SessionDetailModal = ({ session, onClose, onFlag }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [flagReason, setFlagReason] = useState('');
  const [showFlagForm, setShowFlagForm] = useState(false);

  const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    try {
      // Handle different date formats
      let date;
      if (typeof dateValue === 'string') {
        date = new Date(dateValue);
      } else if (dateValue.$date) {
        date = new Date(dateValue.$date);
      } else if (dateValue instanceof Date) {
        date = dateValue;
      } else {
        date = new Date(dateValue);
      }

      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }

      return date.toLocaleString('vi-VN');
    } catch (error) {
      console.error('Error formatting date:', error, dateValue);
      return 'N/A';
    }
  };

  const handleFlag = (flagType) => {
    onFlag(session._id || session.id, flagType, flagReason);
    setShowFlagForm(false);
    setFlagReason('');
  };



  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b">
          <h3 className="text-xl font-semibold text-gray-900">
            Chi tiết Phiên Test
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b mt-4">
          {[
            { key: 'overview', label: 'Tổng quan' },
            { key: 'behavior', label: 'Hành vi' },
            { key: 'location', label: 'Vị trí' },
            { key: 'device', label: 'Thiết bị' },
            { key: 'permissions', label: 'Quyền' },
            { key: 'flags', label: 'Cảnh báo' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-b-2 border-indigo-500 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="mt-6 max-h-96 overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Thông tin Phiên</h4>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">ID Phiên:</dt>
                    <dd className="text-sm text-gray-900">{session._id || session.id}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Trạng thái:</dt>
                    <dd className="text-sm text-gray-900">{session.status}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Thời gian bắt đầu:</dt>
                    <dd className="text-sm text-gray-900">{formatDate(session.started_at || session.start_time)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Thời gian kết thúc:</dt>
                    <dd className="text-sm text-gray-900">
                      {session.ended_at || session.end_time ? formatDate(session.ended_at || session.end_time) : 'Chưa kết thúc'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Thời lượng:</dt>
                    <dd className="text-sm text-gray-900">{session.duration_sec ? `${session.duration_sec} giây` : 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">IP:</dt>
                    <dd className="text-sm text-gray-900">{session.ip}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Session Token:</dt>
                    <dd className="text-sm text-gray-900 break-all">{session.session_token}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Thông tin Bài Test</h4>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Test Result ID:</dt>
                    <dd className="text-sm text-gray-900">{(typeof session.test_result_id === 'string' ? session.test_result_id : session.test_result_id?._id) || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Tiêu đề:</dt>
                    <dd className="text-sm text-gray-900">{session.test_result_id?.test_snapshot?.test_title || session.test_snapshot?.test_title || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Loại:</dt>
                    <dd className="text-sm text-gray-900">{session.test_result_id?.test_snapshot?.test_type || session.test_snapshot?.test_type || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Chủ đề:</dt>
                    <dd className="text-sm text-gray-900">{session.test_result_id?.test_snapshot?.main_topic || session.test_snapshot?.main_topic || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Độ khó:</dt>
                    <dd className="text-sm text-gray-900">{session.test_result_id?.test_snapshot?.difficulty || session.test_snapshot?.difficulty || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">User Agent:</dt>
                    <dd className="text-sm text-gray-900 break-all">{session.user_agent}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Socket ID:</dt>
                    <dd className="text-sm text-gray-900">{session.socket_id || 'Chưa kết nối'}</dd>
                  </div>
                </dl>
              </div>
            </div>
          )}

          {activeTab === 'behavior' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Hành vi theo dõi</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h5 className="font-medium text-sm mb-2">Tab Blur</h5>
                    <p className="text-sm text-gray-600">{session.behavior?.tab_blur?.length || 0} sự kiện</p>
                    {session.behavior?.tab_blur?.map((event, index) => (
                      <div key={index} className="text-xs text-gray-500 mt-1 p-2 bg-white rounded border">
                        <div>Thời gian: {event.at ? formatDate(event.at) : 'N/A'}</div>
                        <div>Thời lượng: {event.duration_ms || 0}ms</div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h5 className="font-medium text-sm mb-2">Reloads</h5>
                    <p className="text-sm text-gray-600">{session.behavior?.reloads?.length || 0} sự kiện</p>
                    {session.behavior?.reloads?.map((event, index) => (
                      <div key={index} className="text-xs text-gray-500 mt-1 p-2 bg-white rounded border">
                        <div>Thời gian: {formatDate(event.at)}</div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h5 className="font-medium text-sm mb-2">Socket Disconnects</h5>
                    <p className="text-sm text-gray-600">{session.behavior?.socket_disconnects?.length || 0} sự kiện</p>
                    {session.behavior?.socket_disconnects?.map((event, index) => (
                      <div key={index} className="text-xs text-gray-500 mt-1 p-2 bg-white rounded border">
                        <div>Thời gian: {formatDate(event.at)}</div>
                        <div>Lý do: {event.reason || 'unknown'}</div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h5 className="font-medium text-sm mb-2">Visibility Changes</h5>
                    <p className="text-sm text-gray-600">{session.behavior?.visibility_changes?.length || 0} sự kiện</p>
                    {session.behavior?.visibility_changes?.map((event, index) => (
                      <div key={index} className="text-xs text-gray-500 mt-1 p-2 bg-white rounded border">
                        <div>Thời gian: {formatDate(event.at)}</div>
                        <div>Trạng thái: {event.state === 'visible' ? 'Hiện thị' : 'Ẩn'}</div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h5 className="font-medium text-sm mb-2">Clipboard Events</h5>
                    <p className="text-sm text-gray-600">{session.behavior?.clipboard_events?.length || 0} sự kiện</p>
                    {session.behavior?.clipboard_events?.map((event, index) => (
                      <div key={index} className="text-xs text-gray-500 mt-1 p-2 bg-white rounded border">
                        <div>Thời gian: {event.at ? formatDate(event.at) : 'N/A'}</div>
                        <div>Loại: {event.type || 'unknown'} ({event.source || 'external'})</div>
                        <div>Kích thước: {event.text_length || 0} ký tự</div>
                        {event.text && event.text.length <= 100 && (
                          <div className="mt-1 p-1 bg-gray-100 rounded text-xs">
                            Nội dung: {String(event.text)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Legacy behavior events */}
              {session.behavior_events?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Sự kiện Hành vi (Legacy)</h4>
                  <div className="space-y-2">
                    {session.behavior_events.map((event, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-sm">{event.event_type}</span>
                          <span className="text-xs text-gray-500">
                            {formatDate(event.timestamp)}
                          </span>
                        </div>
                        {event.event_data && (
                          <pre className="text-xs text-gray-600 mt-2 whitespace-pre-wrap">
                            {JSON.stringify(event.event_data, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'location' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Trạng thái Vị trí</h4>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Kích hoạt:</span> {session.location?.enabled ? 'Có' : 'Không'}
                    </div>
                    <div>
                      <span className="font-medium">Khoảng cách tối đa:</span> {session.location?.max_distance_m || 0}m
                    </div>
                  </div>
                </div>
              </div>
              
              {session.location?.address && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Địa chỉ</h4>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Địa chỉ đầy đủ:</span> {session.location.address.formatted || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Thành phố:</span> {session.location.address.city || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Vùng:</span> {session.location.address.region || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Quốc gia:</span> {session.location.address.country || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Nguồn:</span> {session.location.address.source || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Lịch sử Vị trí</h4>
                {session.location?.history?.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {session.location.history.map((loc, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Tọa độ:</span> {loc.lat}, {loc.lng}
                          </div>
                          <div>
                            <span className="font-medium">Độ chính xác:</span> {loc.accuracy}m
                          </div>
                          <div>
                            <span className="font-medium">Thời gian:</span> {formatDate(loc.timestamp)}
                          </div>
                          <div>
                            <span className="font-medium">Tốc độ:</span> {loc.speed || 0} m/s
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">Không có dữ liệu vị trí.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'device' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Thông tin Thiết bị</h4>
                <div className="grid grid-cols-2 gap-6">
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Nền tảng:</dt>
                      <dd className="text-sm text-gray-900">{session.device?.platform}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Hệ điều hành:</dt>
                      <dd className="text-sm text-gray-900">{session.device?.os}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Trình duyệt:</dt>
                      <dd className="text-sm text-gray-900">
                        {session.device?.browser} {session.device?.browser_version}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Pixel Ratio:</dt>
                      <dd className="text-sm text-gray-900">{session.device?.pixel_ratio || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Touch Support:</dt>
                      <dd className="text-sm text-gray-900">{session.device?.touch_support ? 'Có' : 'Không'}</dd>
                    </div>
                  </dl>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Màn hình:</dt>
                      <dd className="text-sm text-gray-900">{session.device?.screen}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">CPU:</dt>
                      <dd className="text-sm text-gray-900">{session.device?.cpu || 'N/A'} cores</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">RAM:</dt>
                      <dd className="text-sm text-gray-900">{session.device?.ram || 'N/A'} GB</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">GPU:</dt>
                      <dd className="text-sm text-gray-900">{session.device?.gpu || 'N/A'}</dd>
                    </div>
                  </dl>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Thông tin Locale</h4>
                <div className="grid grid-cols-2 gap-6">
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Timezone:</dt>
                      <dd className="text-sm text-gray-900">{session.locale?.timezone}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Ngôn ngữ chính:</dt>
                      <dd className="text-sm text-gray-900">{session.locale?.language}</dd>
                    </div>
                  </dl>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Danh sách ngôn ngữ:</dt>
                      <dd className="text-sm text-gray-900">{session.locale?.languages?.join(', ')}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'permissions' && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Quyền của Thiết bị</h4>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(session.permissions || {}).map(([key, value]) => (
                  <div key={key} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm capitalize">
                        {key.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        value === 'granted' ? 'bg-green-100 text-green-800' :
                        value === 'denied' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {activeTab === 'flags' && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Cảnh báo và Flags</h4>
              <div className="space-y-4">
                {/* Flags Object */}
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(session.flags || {}).map(([key, value]) => (
                    <div key={key} className={`p-4 rounded-lg ${
                      value ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
                    }`}>
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">
                          {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          value ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {value ? 'Có' : 'Không'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Additional Notes */}
                {session.notes && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h5 className="font-medium text-sm mb-2">Ghi chú:</h5>
                    <p className="text-sm text-gray-700">{session.notes}</p>
                  </div>
                )}
                
                {/* IP History */}
                {session.ip_history?.length > 1 && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h5 className="font-medium text-sm mb-2">Lịch sử IP ({session.ip_history.length} địa chỉ):</h5>
                    <div className="flex flex-wrap gap-2">
                      {session.ip_history.map((ip, index) => (
                        <span key={index} className={`px-2 py-1 text-xs rounded border ${
                          ip === session.ip ? 'bg-blue-100 border-blue-300 font-medium' : 'bg-white border-gray-300'
                        }`}>
                          {ip} {ip === session.ip && '(hiện tại)'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-6 border-t mt-6">
          <div>
            {session.status === 'active' && !showFlagForm && (
              <button
                onClick={() => setShowFlagForm(true)}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
              >
                🚩 Đánh dấu Phiên
              </button>
            )}

            {showFlagForm && (
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  placeholder="Lý do đánh dấu..."
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                />
                <button
                  onClick={() => handleFlag('manual_review')}
                  className="px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                >
                  Xác nhận
                </button>
                <button
                  onClick={() => {
                    setShowFlagForm(false);
                    setFlagReason('');
                  }}
                  className="px-3 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Hủy
                </button>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminTestSession;
