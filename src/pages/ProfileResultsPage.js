import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProfileLayout from '../layout/ProfileLayout';
import testResultService from '../services/testResultService';
import ProfileTestResultsList from '../components/ProfileTestResultsList';
import ProfileStatisticsCards from '../components/ProfileStatisticsCards';
import Toast from '../components/Toast';

const ProfileResultsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [results, setResults] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [statisticsLoading, setStatisticsLoading] = useState(false);

  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [resultToDelete, setResultToDelete] = useState(null);

  const [toast, setToast] = useState({ message: "", type: "success", isVisible: false });

  const fetchResults = useCallback(async () => {
    try {
      setResultsLoading(true);
      setResultsError(null);
      const data = await testResultService.getMyTestResults();
      setResults(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching results:', error);
      setResultsError('Không thể tải danh sách kết quả');
    } finally {
      setResultsLoading(false);
    }
  }, []);

  const fetchStatistics = useCallback(async () => {
    try {
      setStatisticsLoading(true);
      const data = await testResultService.getMyStatistics();
      setStatistics(data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setStatisticsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchResults();
      fetchStatistics();
    }
  }, [fetchResults, fetchStatistics, user]);

  const showToast = (message, type = "success") => setToast({ message, type, isVisible: true });
  const hideToast = () => setToast((p) => ({ ...p, isVisible: false }));

  const handleViewDetail = (result) => {
    if (result.test_snapshot?.test_type === 'vocabulary') {
      navigate(`/vocabulary/result/${result._id}/review`);
    } else if (result.test_snapshot?.test_type === 'multiple_choice') {
      navigate(`/multiple-choice/result/${result._id}/review`);
    } else {
      showToast('Không thể xem chi tiết bài test này', 'error');
    }
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
      setResults(prev => prev.filter(r => r._id !== resultToDelete._id));
      showToast('Đã xóa kết quả thành công');
      setShowDeleteConfirm(false);
      setResultToDelete(null);
    } catch (error) {
      console.error('Error deleting result:', error);
      showToast('Không thể xóa kết quả', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-zinc-900 mb-2">Không thể tải thông tin người dùng</h2>
          <p className="text-zinc-600 mb-6">Có lỗi xảy ra khi tải dữ liệu hồ sơ của bạn.</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <ProfileLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Statistics Cards */}
        <ProfileStatisticsCards statistics={statistics} loading={statisticsLoading} />

        {/* Test Results */}
        <ProfileTestResultsList
          results={results}
          loading={resultsLoading}
          error={resultsError}
          onRetry={fetchResults}
          onViewDetail={handleViewDetail}
          onDelete={handleDeleteResult}
        />

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Xác nhận xóa</h3>
                  <p className="text-sm text-gray-500">Hành động này không thể hoàn tác</p>
                </div>
              </div>
              
              <p className="text-gray-700 mb-6">
                Bạn có chắc chắn muốn xóa kết quả bài test "{resultToDelete?.test?.test_title}" không?
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleteLoading}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  onClick={confirmDeleteResult}
                  disabled={deleteLoading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteLoading ? 'Đang xóa...' : 'Xóa'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast.isVisible && (
          <Toast
            message={toast.message}
            type={toast.type}
            isVisible={toast.isVisible}
            onClose={hideToast}
          />
        )}
      </div>
    </ProfileLayout>
  );
};

export default ProfileResultsPage;