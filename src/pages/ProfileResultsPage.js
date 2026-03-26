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
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-1.5">
            Kết quả <span className="text-fuchsia-700">bài test</span>
          </h1>
          <p className="text-slate-600 text-sm font-medium mb-3">Xem lại lịch sử và kết quả các bài test của bạn</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-fuchsia-800 bg-fuchsia-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-md">
              📊 {results.length} kết quả
            </span>
            {statistics?.total_tests > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-emerald-800 bg-emerald-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-md">
                ⭐ TB {Number(statistics?.average_score || 0).toFixed(1)}%
              </span>
            )}
          </div>
        </div>

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
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl border-[3px] border-rose-500 ring-2 ring-rose-200 shadow-2xl max-w-md w-full overflow-hidden">
              <div className="bg-gradient-to-r from-rose-600 to-red-700 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 border-2 border-white/40 flex items-center justify-center text-xl">🗑️</div>
                  <div>
                    <h3 className="text-base font-extrabold text-white">Xác nhận xóa kết quả</h3>
                    <p className="text-xs text-rose-200 font-medium">Hành động này không thể hoàn tác</p>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <div className="bg-rose-50 border-2 border-rose-300 rounded-xl p-3 mb-4">
                  <p className="text-sm text-slate-800 font-bold">
                    Bạn có chắc muốn xóa kết quả bài test{' '}
                    <span className="text-rose-700">"{resultToDelete?.test?.test_title}"</span>?
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowDeleteConfirm(false)} disabled={deleteLoading}
                    className="flex-1 px-4 py-2.5 text-slate-700 bg-white border-[3px] border-slate-300 rounded-xl font-extrabold text-sm hover:bg-slate-50 disabled:opacity-50 transition-colors">
                    Hủy
                  </button>
                  <button onClick={confirmDeleteResult} disabled={deleteLoading}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 border-[3px] border-red-900 text-white rounded-xl font-extrabold text-sm hover:from-rose-700 hover:to-red-700 disabled:opacity-50 transition-colors shadow-md">
                    {deleteLoading ? 'Đang xóa...' : '🗑️ Xóa ngay'}
                  </button>
                </div>
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