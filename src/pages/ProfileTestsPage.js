import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProfileLayout from '../layout/ProfileLayout';
import testService from '../services/testService';
import ProfileTestsList from '../components/ProfileTestsList';
import ProfileStatisticsCards from '../components/ProfileStatisticsCards';
import Toast from '../components/Toast';
import AdminVocabularyTestDetailModal from '../components/AdminVocabularyTestDetailModal';
import AdminMCPTestDetailModal from '../components/AdminMCPTestDetailModal';

const ProfileTestsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [myTests, setMyTests] = useState([]);
  const [testsLoading, setTestsLoading] = useState(false);
  const [testsError, setTestsError] = useState(null);

  const [deleteTestLoading, setDeleteTestLoading] = useState(false);
  const [showDeleteTestConfirm, setShowDeleteTestConfirm] = useState(false);
  const [testToDelete, setTestToDelete] = useState(null);

  // Modal states for test details
  const [selectedTest, setSelectedTest] = useState(null);
  const [vocabularyModalOpen, setVocabularyModalOpen] = useState(false);
  const [mcpModalOpen, setMCPModalOpen] = useState(false);

  const [toast, setToast] = useState({ message: "", type: "success", isVisible: false });

  const fetchMyTests = useCallback(async () => {
    try {
      setTestsLoading(true);
      setTestsError(null);
      const data = await testService.getMyTests();
      setMyTests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching my tests:', error);
      setTestsError('Không thể tải danh sách bài test');
    } finally {
      setTestsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchMyTests();
    }
  }, [fetchMyTests, user]);

  const showToast = (message, type = "success") => setToast({ message, type, isVisible: true });
  const hideToast = () => setToast((p) => ({ ...p, isVisible: false }));

  const handleTakeTest = (test) => {
    if (test.test_type === 'vocabulary' || test.test_type === 'vocab') {
      navigate(`/vocabulary/test/${test._id}/settings`);
    } else if (test.test_type === 'multiple-choice' || test.test_type === 'multiple_choice') {
      navigate(`/multiple-choice/test/${test._id}/settings`);
    }
  };

  const handleEditTest = () => showToast("Tính năng chỉnh sửa đang phát triển", "warning");

  const handleViewTestDetail = (test) => {
    console.log('Opening detail modal for test:', test);
    setSelectedTest(test);
    if (test.test_type === 'vocabulary') {
      setVocabularyModalOpen(true);
    } else if (test.test_type === 'multiple_choice') {
      setMCPModalOpen(true);
    } else {
      showToast(`Loại test "${test.test_type}" chưa được hỗ trợ xem chi tiết`, "warning");
    }
  };

  const handleDeleteTest = async (test) => {
    setTestToDelete(test);
    setShowDeleteTestConfirm(true);
  };

  const confirmDeleteTest = async () => {
    if (!testToDelete) return;

    try {
      setDeleteTestLoading(true);
      await testService.deleteTest(testToDelete._id);
      setMyTests(prev => prev.filter(t => t._id !== testToDelete._id));
      showToast('Đã xóa bài test thành công');
      setShowDeleteTestConfirm(false);
      setTestToDelete(null);
    } catch (error) {
      console.error('Error deleting test:', error);
      showToast('Không thể xóa bài test', 'error');
    } finally {
      setDeleteTestLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/25">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full animate-ping opacity-75" />
          </div>
          
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Không thể tải thông tin</h2>
          <p className="text-slate-600 mb-8 leading-relaxed">
            Có lỗi xảy ra khi tải dữ liệu hồ sơ của bạn. Vui lòng thử lại sau.
          </p>
          
          <button
            onClick={() => navigate('/')}
            className="w-full px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-semibold hover:from-violet-700 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-violet-500/25"
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Về trang chủ
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <ProfileLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-5">
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-1.5">
            Bài test <span className="text-violet-700">của tôi</span>
          </h1>
          <p className="text-slate-600 text-sm font-medium mb-3">Quản lý và theo dõi các bài test bạn đã tạo</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-violet-800 bg-violet-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-md">
              📋 {myTests.length} bài test
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-sky-800 bg-sky-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-md">
              ❓ {myTests.reduce((s, t) => s + (Number(t.total_questions) || 0), 0)} câu hỏi
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-5">
          <ProfileStatisticsCards
            statistics={{
              total_tests: myTests.length,
              average_score: 0,
              total_questions: myTests.reduce((s, t) => s + (Number(t.total_questions) || 0), 0),
              total_correct: 0,
            }}
            loading={testsLoading}
          />
        </div>

        {/* Filter Bar */}
        <div className="mb-5 bg-white rounded-2xl border-[3px] border-indigo-300 ring-2 ring-indigo-100 shadow-lg p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input type="text" placeholder="Tìm kiếm bài test..."
                  className="pl-9 pr-4 py-2 border-2 border-indigo-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 w-full sm:w-56 bg-white font-medium text-slate-800 placeholder-indigo-300" />
              </div>
              <select className="px-3 py-2 border-2 border-violet-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white font-medium text-slate-700">
                <option value="">Tất cả loại</option>
                <option value="multiple_choice">📝 Trắc nghiệm</option>
                <option value="vocabulary">📚 Từ vựng</option>
              </select>
              <select className="px-3 py-2 border-2 border-emerald-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white font-medium text-slate-700">
                <option value="">Tất cả trạng thái</option>
                <option value="active">✅ Hoạt động</option>
                <option value="draft">📄 Nháp</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative group">
                <button className="px-4 py-2 bg-violet-600 border-[3px] border-violet-800 text-white rounded-xl font-extrabold text-sm shadow-md hover:bg-violet-700 transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Tạo bài test mới
                </button>
                <div className="absolute right-0 mt-2 w-60 bg-white border-[3px] border-violet-300 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 overflow-hidden">
                  <button onClick={() => navigate('/create-test/multiple-choice')}
                    className="w-full text-left px-4 py-3 hover:bg-violet-50 flex items-center gap-3 transition-colors border-b border-violet-100">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 border-2 border-indigo-800 flex items-center justify-center shadow-md shrink-0">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-900 text-sm">📝 Trắc nghiệm</p>
                      <p className="text-xs text-slate-500">Tạo câu hỏi nhiều lựa chọn</p>
                    </div>
                  </button>
                  <button onClick={() => navigate('/create-test/vocabulary')}
                    className="w-full text-left px-4 py-3 hover:bg-emerald-50 flex items-center gap-3 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 border-2 border-emerald-800 flex items-center justify-center shadow-md shrink-0">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-900 text-sm">📚 Từ vựng</p>
                      <p className="text-xs text-slate-500">Tạo bài test từ vựng</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tests List */}
        <ProfileTestsList
          tests={myTests}
          loading={testsLoading}
          error={testsError}
          onRetry={fetchMyTests}
          onTakeTest={handleTakeTest}
          onEditTest={handleEditTest}
          onDeleteTest={handleDeleteTest}
          onViewTestDetail={handleViewTestDetail}
        />

        {/* Delete Test Confirmation Modal */}
        {showDeleteTestConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl border-[3px] border-rose-500 ring-2 ring-rose-200 shadow-2xl max-w-md w-full overflow-hidden">
              <div className="bg-gradient-to-r from-rose-600 to-red-700 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 border-2 border-white/40 flex items-center justify-center text-xl">🗑️</div>
                  <div>
                    <h3 className="text-base font-extrabold text-white">Xác nhận xóa bài test</h3>
                    <p className="text-xs text-rose-200 font-medium">Hành động này không thể hoàn tác</p>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <div className="bg-rose-50 border-2 border-rose-300 rounded-xl p-3 mb-4">
                  <p className="text-sm text-slate-800 font-bold">
                    Bạn có chắc muốn xóa bài test{' '}
                    <span className="text-rose-700">"{testToDelete?.test_title}"</span>?
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowDeleteTestConfirm(false)} disabled={deleteTestLoading}
                    className="flex-1 px-4 py-2.5 text-slate-700 bg-white border-[3px] border-slate-300 rounded-xl font-extrabold text-sm hover:bg-slate-50 disabled:opacity-50 transition-colors">
                    Hủy bỏ
                  </button>
                  <button onClick={confirmDeleteTest} disabled={deleteTestLoading}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 border-[3px] border-red-900 text-white rounded-xl font-extrabold text-sm hover:from-rose-700 hover:to-red-700 disabled:opacity-50 transition-colors shadow-md">
                    {deleteTestLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Đang xóa...
                      </span>
                    ) : '🗑️ Xóa ngay'}
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

        {/* Test Detail Modals */}
        {vocabularyModalOpen && selectedTest && (
          <AdminVocabularyTestDetailModal 
            isOpen={vocabularyModalOpen}
            onClose={() => {
              setVocabularyModalOpen(false);
              setSelectedTest(null);
            }}
            testId={selectedTest._id}
            onTestUpdated={() => {
              fetchMyTests(); // Refresh list after update
              showToast('Bài test đã được cập nhật');
            }}
          />
        )}

        {mcpModalOpen && selectedTest && (
          <AdminMCPTestDetailModal 
            isOpen={mcpModalOpen}
            onClose={() => {
              setMCPModalOpen(false);
              setSelectedTest(null);
            }}
            testId={selectedTest._id}
            onTestUpdated={() => {
              fetchMyTests(); // Refresh list after update
              showToast('Bài test đã được cập nhật');
            }}
          />
        )}
      </div>
    </ProfileLayout>
  );
};

export default ProfileTestsPage;