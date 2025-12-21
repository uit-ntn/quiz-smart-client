import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AdminLayout from '../layout/AdminLayout';
import testService from '../services/testService';
import CreateVocabularyTestButton from '../components/CreateVocabularyTestButton';
import CreateVocabularyWithAIButton from '../components/CreateVocabularyWithAIButton';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import DeleteTestModal from '../components/AdminDeleteTestModal';
import TestDetailModal from '../components/AdminTestDetailModal';

const AdminVocabularyTests = () => {
  const { user } = useAuth();
  const [tests, setTests] = useState([]);
  const [filteredTests, setFilteredTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVisibility, setFilterVisibility] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('created_by_full_name');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState(null);
  const [testToDelete, setTestToDelete] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Toast state
  const [toast, setToast] = useState({
    isVisible: false,
    message: '',
    type: 'success'
  });

  // Toast helper function
  const showToast = (message, type = 'success') => {
    setToast({
      isVisible: true,
      message,
      type
    });
  };

  const closeToast = () => {
    setToast(prev => ({ ...prev, isVisible: false }));
  };

  useEffect(() => {
    fetchVocabularyTests();
  }, []);

  useEffect(() => {
    filterTests();
  }, [tests, searchTerm, filterVisibility, filterDifficulty, filterStatus, sortBy, sortOrder]);

  const fetchVocabularyTests = async () => {
    try {
      setLoading(true);
      const data = await testService.getAllVocabulariesTests();
      setTests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching vocabulary tests:', err);
      setError(err.message);
      showToast('Có lỗi xảy ra khi tải danh sách bài test từ vựng', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle sorting
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Sort icon component
  const SortIcon = ({ field }) => {
    if (sortBy !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortOrder === 'asc' ? (
      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const filterTests = () => {
    let filtered = [...tests];

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(test =>
        test.test_title?.toLowerCase().includes(term) ||
        test.main_topic?.toLowerCase().includes(term) ||
        test.sub_topic?.toLowerCase().includes(term) ||
        test.description?.toLowerCase().includes(term)
      );
    }

    // Filter by visibility
    if (filterVisibility !== 'all') {
      filtered = filtered.filter(test => test.visibility === filterVisibility);
    }

    // Filter by difficulty
    if (filterDifficulty !== 'all') {
      filtered = filtered.filter(test => test.difficulty === filterDifficulty);
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(test => test.status === filterStatus);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue = a[sortBy] || '';
      let bValue = b[sortBy] || '';

      if (sortBy === 'created_at') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    setFilteredTests(filtered);
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredTests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTests = filteredTests.slice(startIndex, endIndex);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterVisibility, filterDifficulty, filterStatus, sortBy, sortOrder]);

  const handleDeleteClick = (test) => {
    setTestToDelete(test);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async (deleteType) => {
    if (!testToDelete) return;

    try {
      if (deleteType === 'soft') {
        await testService.softDeleteTest(testToDelete._id);
        showToast(`Bài test "${testToDelete.test_title}" đã được xóa mềm`, 'success');
      } else {
        await testService.hardDeleteTest(testToDelete._id);
        showToast(`Bài test "${testToDelete.test_title}" đã được xóa vĩnh viễn`, 'success');
      }
      
      setShowDeleteModal(false);
      setTestToDelete(null);
      await fetchVocabularyTests();
    } catch (err) {
      console.error('Error deleting test:', err);
      showToast(err.message || 'Có lỗi xảy ra khi xóa bài test', 'error');
    }
  };

  const handleDetailClick = (testId) => {
    setSelectedTestId(testId);
    setShowDetailModal(true);
  };

  const handleTestUpdated = () => {
    fetchVocabularyTests();
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Stats Cards and Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2">
          <div className="bg-blue-500 rounded-lg shadow-sm p-2">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center">
                  <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-3 flex items-center justify-between flex-1">
                <p className="text-xs sm:text-sm font-medium text-white">Tổng số</p>
                <p className="text-base sm:text-lg font-semibold text-white">{tests.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-500 rounded-lg shadow-sm p-2">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center">
                  <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div className="ml-3 flex items-center justify-between flex-1">
                <p className="text-xs sm:text-sm font-medium text-white">Kích hoạt</p>
                <p className="text-base sm:text-lg font-semibold text-white">
                  {tests.filter(test => test.status === 'active').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-500 rounded-lg shadow-sm p-2">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center">
                  <svg className="w-3 h-3 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <div className="ml-3 flex items-center justify-between flex-1">
                <p className="text-xs sm:text-sm font-medium text-white">Tạm dừng</p>
                <p className="text-base sm:text-lg font-semibold text-white">
                  {tests.filter(test => test.status === 'inactive').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-purple-500 rounded-lg shadow-sm p-2">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center">
                  <svg className="w-3 h-3 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-3 flex items-center justify-between flex-1">
                <p className="text-xs sm:text-sm font-medium text-white">Công khai</p>
                <p className="text-base sm:text-lg font-semibold text-white">
                  {tests.filter(test => test.visibility === 'public').length}
                </p>
              </div>
            </div>
          </div>
        </div>

          </div>

          <div className="flex-shrink-0">
            <div className="flex space-x-3">
              <CreateVocabularyWithAIButton className="min-w-[140px]" />
              <CreateVocabularyTestButton className="bg-blue-600 hover:bg-blue-700 min-w-[140px]" />
            </div>
          </div>
        </div>

        {/* Tests Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Compact Filter Toolbar */}
          <div className="px-4 py-3 border-b border-gray-100 bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex-1 mr-4">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm theo tên, chủ đề..."
                  className="w-full px-2 py-1 border border-gray-200 rounded-md bg-white text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={filterVisibility}
                  onChange={(e) => setFilterVisibility(e.target.value)}
                  className="px-2 py-1 border border-gray-200 rounded-md text-sm bg-white"
                >
                  <option value="all">Tất cả</option>
                  <option value="public">Công khai</option>
                  <option value="private">Riêng tư</option>
                </select>

                <select
                  value={filterDifficulty}
                  onChange={(e) => setFilterDifficulty(e.target.value)}
                  className="px-2 py-1 border border-gray-200 rounded-md text-sm bg-white"
                >
                  <option value="all">Tất cả</option>
                  <option value="easy">Dễ</option>
                  <option value="medium">Trung bình</option>
                  <option value="hard">Khó</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-2 py-1 border border-gray-200 rounded-md text-sm bg-white"
                >
                  <option value="all">Tất cả</option>
                  <option value="active">Kích hoạt</option>
                  <option value="inactive">Tạm dừng</option>
                  <option value="deleted">Đã xóa</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-2 py-1 border border-gray-200 rounded-md text-sm bg-white"
                >
                  <option value="created_by_full_name">Được tạo bởi</option>
                  <option value="test_title">Tên test</option>
                  <option value="main_topic">Chủ đề chính</option>
                  <option value="total_questions">Số câu hỏi</option>
                </select>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('test_title')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Tên Test</span>
                      <SortIcon field="test_title" />
                    </div>
                  </th>
                  <th 
                    className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('main_topic')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Chủ đề</span>
                      <SortIcon field="main_topic" />
                    </div>
                  </th>
                  <th 
                    className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('total_questions')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Số câu</span>
                      <SortIcon field="total_questions" />
                    </div>
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Độ khó
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hiển thị
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th 
                    className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('created_by_full_name')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Được tạo bởi</span>
                      <SortIcon field="created_by_full_name" />
                    </div>
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedTests.length > 0 ? (
                  paginatedTests.map((test) => (
                    <tr key={test._id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900">{test.test_title}</div>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{test.main_topic}</div>
                        <div className="text-sm text-gray-500">{test.sub_topic}</div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                        {test.total_questions}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          test.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                          test.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {test.difficulty === 'easy' ? 'Dễ' : test.difficulty === 'medium' ? 'Trung bình' : 'Khó'}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          test.visibility === 'public' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {test.visibility === 'public' ? '🌍 Công khai' : '🔒 Riêng tư'}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          test.status === 'active' ? 'bg-green-100 text-green-800' :
                          test.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {test.status === 'active' ? 'Kích hoạt' : test.status === 'inactive' ? 'Tạm dừng' : 'Đã xóa'}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        {test.created_by_full_name || test.created_by || (test.created_at ? new Date(test.created_at).toLocaleDateString('vi-VN') : '—')}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleDetailClick(test._id)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Chi tiết
                          </button>
                          <button
                            onClick={() => handleDeleteClick(test)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="px-6 py-4 text-center text-sm text-gray-500">
                      Không tìm thấy bài test nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between items-center">
                <div className="text-sm text-gray-700">
                  Hiển thị {startIndex + 1} đến {Math.min(endIndex, filteredTests.length)} trong {filteredTests.length} kết quả
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Trước
                  </button>
                  <span className="px-3 py-1 text-sm font-medium text-gray-900">
                    Trang {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Sau
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <DeleteTestModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        test={testToDelete}
        onDeleteConfirmed={handleDeleteConfirm}
      />

      <TestDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        testId={selectedTestId}
        onTestUpdated={handleTestUpdated}
      />

      {/* Toast */}
      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={closeToast}
      />
    </AdminLayout>
  );
};

export default AdminVocabularyTests;