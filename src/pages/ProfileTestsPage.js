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
        <div className="mb-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Bài test của tôi</h1>
                <p className="text-slate-600 mt-1">Quản lý và theo dõi các bài test bạn đã tạo</p>
              </div>
            </div>
            
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
        </div>

        {/* Actions & Filters Bar */}
        <div className="mb-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Tìm kiếm bài test..."
                    className="pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent w-full sm:w-64 bg-white/70 backdrop-blur-sm"
                  />
                </div>

                <select className="px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white/70 backdrop-blur-sm">
                  <option value="">Tất cả loại</option>
                  <option value="multiple_choice">Trắc nghiệm</option>
                  <option value="vocabulary">Từ vựng</option>
                  <option value="grammar">Ngữ pháp</option>
                </select>

                <select className="px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white/70 backdrop-blur-sm">
                  <option value="">Tất cả trạng thái</option>
                  <option value="active">Hoạt động</option>
                  <option value="draft">Nháp</option>
                  <option value="deleted">Đã xóa</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button className="px-4 py-3 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-white/70 transition-all duration-200 text-sm font-medium bg-white/50 backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
                    </svg>
                    Bộ lọc
                  </div>
                </button>

                {/* Create Test Button */}
                <div className="relative group">
                  <button className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl hover:from-violet-700 hover:to-purple-700 transition-all duration-200 text-sm font-semibold shadow-lg shadow-violet-500/25">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                      </svg>
                      Tạo bài test mới
                    </div>
                  </button>
                  
                  {/* Dropdown menu */}
                  <div className="absolute right-0 mt-2 w-64 bg-white/95 backdrop-blur-sm border border-white/20 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                    <div className="p-3">
                      <button 
                        onClick={() => navigate('/create-test/multiple-choice')}
                        className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-white/70 rounded-xl flex items-center gap-3 transition-all duration-200"
                      >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">Trắc nghiệm</p>
                          <p className="text-xs text-slate-500">Tạo câu hỏi nhiều lựa chọn</p>
                        </div>
                      </button>
                      
                      <button 
                        onClick={() => navigate('/create-test/vocabulary')}
                        className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-white/70 rounded-xl flex items-center gap-3 transition-all duration-200"
                      >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">Từ vựng</p>
                          <p className="text-xs text-slate-500">Tạo bài test từ vựng</p>
                        </div>
                      </button>
                    </div>
                  </div>
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
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 max-w-md w-full border border-white/20 shadow-2xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/25">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Xác nhận xóa bài test</h3>
                  <p className="text-sm text-slate-600 mt-1">Hành động này không thể hoàn tác</p>
                </div>
              </div>
              
              <div className="bg-slate-50 rounded-xl p-4 mb-6">
                <p className="text-slate-700 text-sm leading-relaxed">
                  Bạn có chắc chắn muốn xóa bài test <span className="font-semibold text-slate-900">"{testToDelete?.test_title}"</span> không?
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteTestConfirm(false)}
                  disabled={deleteTestLoading}
                  className="flex-1 px-4 py-3 text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 font-semibold transition-all duration-200"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={confirmDeleteTest}
                  disabled={deleteTestLoading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:from-red-700 hover:to-rose-700 disabled:opacity-50 font-semibold transition-all duration-200 shadow-lg shadow-red-500/25"
                >
                  {deleteTestLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Đang xóa...
                    </div>
                  ) : (
                    'Xóa ngay'
                  )}
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