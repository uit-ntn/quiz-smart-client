// src/pages/ProfilePage.jsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProfileLayout from '../layout/ProfileLayout';
import ProfileTabs from '../components/ProfileTabs';
import ProfileUserInfoCard from '../components/ProfileUserInfoCard';
import StatisticsCards from '../components/ProfileStatisticsCards';
import ProfileTestResultsList from '../components/ProfileTestResultsList';
import ProfileTestList from '../components/ProfileTestsList';
import Toast from '../components/Toast';
import testResultService from '../services/testResultService';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('info');

  // Results
  const [results, setResults] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [statisticsLoading, setStatisticsLoading] = useState(false);

  // Delete result state
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [resultToDelete, setResultToDelete] = useState(null);

  // Toast state
  const [toast, setToast] = useState({ message: '', type: 'success', isVisible: false });

  // My tests
  const [myTests, setMyTests] = useState([]);
  const [testsLoading, setTestsLoading] = useState(false);
  const [testsError, setTestsError] = useState(null);

  const resultsCount = useMemo(() => results.length, [results]);
  const testsCount = useMemo(() => myTests.length, [myTests]);

  const fetchResults = useCallback(async () => {
    try {
      setResultsLoading(true);
      setResultsError(null);

      const data = await testResultService.getMyTestResults();
      const list = Array.isArray(data) ? data : [];
      setResults(list.filter((r) => r?.status === 'active'));
    } catch (err) {
      console.error('Error fetching test results:', err);
      setResultsError('Không thể tải danh sách kết quả.');
      setResults([]);
    } finally {
      setResultsLoading(false);
    }
  }, []);

  const fetchStatistics = useCallback(async () => {
    try {
      setStatisticsLoading(true);
      const stats = await testResultService.getMyStatistics();
      setStatistics(stats);
    } catch (err) {
      console.error('Error fetching statistics:', err);
    } finally {
      setStatisticsLoading(false);
    }
  }, []);

  const fetchMyTests = useCallback(async () => {
    try {
      setTestsLoading(true);
      setTestsError(null);

      const base = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
      const response = await fetch(`${base}/tests/my-tests`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch my tests');

      const data = await response.json();
      setMyTests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching my tests:', err);
      setTestsError('Không thể tải danh sách bài test của bạn.');
      setMyTests([]);
    } finally {
      setTestsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    if (activeTab === 'results') {
      fetchResults();
      fetchStatistics();
    } else if (activeTab === 'my-tests') {
      fetchMyTests();
    }
  }, [activeTab, fetchResults, fetchStatistics, fetchMyTests, user]);

  const handleViewDetail = (result) => {
    const resultId = result?._id || result?.id;
    if (resultId) navigate(`/vocabulary/test-result/${resultId}/review`);
    else console.error('No result ID found:', result);
  };

  const handleRetakeTest = (result) => {
    const testType = result?.test_id?.test_type;
    const testId = result?.test_id?._id || result?.test_id?.id || result?.test_id;

    if (!testId) {
      showToast('Không thể tìm thấy thông tin bài test để làm lại.', 'error');
      return;
    }

    if (testType === 'vocabulary') navigate(`/vocabulary/test/${testId}/settings`);
    else if (testType === 'multiple_choice') navigate(`/multiple-choice/test/${testId}/settings`);
    else showToast('Loại bài test không được hỗ trợ.', 'error');
  };

  const handleTakeTest = (test) => {
    const testId = test?._id || test?.id;
    if (!testId) {
      showToast('Không thể tìm thấy ID bài test.', 'error');
      return;
    }

    if (test?.test_type === 'vocabulary') navigate(`/vocabulary/test/${testId}/settings`);
    else if (test?.test_type === 'multiple_choice') navigate(`/multiple-choice/test/${testId}/settings`);
    else showToast('Loại bài test không được hỗ trợ.', 'error');
  };

  const handleEditTest = () => showToast('Tính năng chỉnh sửa đang phát triển', 'warning');

  const showToast = (message, type = 'success') => {
    setToast({ message, type, isVisible: true });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, isVisible: false }));
  };

  const handleDeleteResult = async (result) => {
    setResultToDelete(result);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteResult = async () => {
    if (!resultToDelete) return;

    try {
      setDeleteLoading(true);
      await testResultService.softDeleteTestResult(resultToDelete._id);
      
      // Remove from local state
      setResults(prev => prev.filter(r => r._id !== resultToDelete._id));
      
      showToast('Đã xóa kết quả bài test thành công', 'success');
      setShowDeleteConfirm(false);
      setResultToDelete(null);
    } catch (err) {
      console.error('Error deleting test result:', err);
      showToast('Không thể xóa kết quả bài test. Vui lòng thử lại.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'info':
        return <ProfileUserInfoCard user={user} />;

      case 'results':
        return (
          <div className="space-y-5">
            <StatisticsCards statistics={statistics} loading={statisticsLoading} />
            <ProfileTestResultsList
              results={results}
              loading={resultsLoading}
              error={resultsError}
              onRetry={fetchResults}
              onViewDetail={handleViewDetail}
              onRetakeTest={handleRetakeTest}
              onDelete={handleDeleteResult}
            />
          </div>
        );

      case 'my-tests':
        return (
          <ProfileTestList
            tests={myTests}
            loading={testsLoading}
            error={testsError}
            onRetry={fetchMyTests}
            onTakeTest={handleTakeTest}
            onEditTest={handleEditTest}
          />
        );

      default:
        return null;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 ring-1 ring-black/5 p-8">
          <div className="text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Chưa đăng nhập</h2>
            <p className="text-slate-600 mb-6">Vui lòng đăng nhập để xem thông tin hồ sơ.</p>
            <button
              onClick={() => navigate('/login')}
              className="w-full px-5 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              Đăng nhập ngay
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProfileLayout>
      {/* Top: tabs area (simple + modern) */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-black/5">
        <div className="p-3 sm:p-4 border-b border-slate-200">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-extrabold text-slate-900 truncate">Điều khiển</div>
              <div className="text-xs text-slate-600">
                {activeTab === 'results'
                  ? `Bạn có ${resultsCount} kết quả`
                  : activeTab === 'my-tests'
                  ? `Bạn có ${testsCount} bài test`
                  : 'Cập nhật thông tin cá nhân'}
              </div>
            </div>
          </div>

          {/* Tabs: mobile scroll */}
          <div className="mt-3 overflow-x-auto">
            <div className="min-w-max">
              <ProfileTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                resultsCount={resultsCount}
                testsCount={testsCount}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {renderTabContent()}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && resultToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-rose-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">Xác nhận xóa</h3>
                  <p className="text-sm text-slate-600">Thao tác này không thể hoàn tác</p>
                </div>
              </div>
              
              <p className="text-sm text-slate-700 mb-5">
                Bạn có chắc chắn muốn xóa kết quả bài test "<strong>{resultToDelete.test_id?.test_title || 'Bài test'}</strong>" không? 
                Kết quả sẽ được chuyển vào thùng rác và có thể khôi phục sau.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setResultToDelete(null);
                  }}
                  disabled={deleteLoading}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  onClick={confirmDeleteResult}
                  disabled={deleteLoading}
                  className="flex-1 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleteLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Đang xóa...
                    </span>
                  ) : (
                    'Xóa ngay'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </ProfileLayout>
  );
};

export default ProfilePage;
