import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AdminLayout from '../layout/AdminLayout';
import testService from '../services/testService';
import CreateMultipleChoiceTestButton from '../components/CreateMultipleChoiceTestButton';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import DeleteTestModal from '../components/AdminDeleteTestModal';
import AdminMCPTestDetailModal from '../components/AdminMCPTestDetailModal';

const AdminMultipleChoiceTests = () => {
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
  const [filterCreator, setFilterCreator] = useState('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState(null);
  const [testToDelete, setTestToDelete] = useState(null);

  // Bulk selection state
  const [selectedTests, setSelectedTests] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

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
    fetchMultipleChoiceTests();
  }, []);

  useEffect(() => {
    filterTests();
  }, [tests, searchTerm, filterVisibility, filterDifficulty, filterStatus, sortBy, sortOrder, filterCreator]);

  const fetchMultipleChoiceTests = async () => {
    try {
      setLoading(true);
      const data = await testService.getAllMultipleChoicesTests();
      console.log('Multiple choice tests from API:', data);
      setTests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching multiple choice tests:', err);
      setError(err.message);
      showToast('Có lỗi xảy ra khi tải danh sách bài test trắc nghiệm', 'error');
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

    // Filter by creator
    if (filterCreator !== 'all') {
      filtered = filtered.filter(test => {
        const creator = test.created_by_full_name || test.created_by || '';
        return creator === filterCreator;
      });
    }

    // (date range filter removed)

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
  }, [searchTerm, filterVisibility, filterDifficulty, filterStatus, sortBy, sortOrder, filterCreator]);

  // Clear selection when filters change
  useEffect(() => {
    setSelectedTests([]);
    setSelectAll(false);
  }, [searchTerm, filterVisibility, filterDifficulty, filterStatus, sortBy, sortOrder, filterCreator]);

  // Bulk selection functions
  const handleSelectAll = (checked) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedTests(paginatedTests.map(test => test._id));
    } else {
      setSelectedTests([]);
    }
  };

  const handleSelectTest = (testId, checked) => {
    if (checked) {
      const newSelected = [...selectedTests, testId];
      setSelectedTests(newSelected);
      if (newSelected.length === paginatedTests.length) {
        setSelectAll(true);
      }
    } else {
      const newSelected = selectedTests.filter(id => id !== testId);
      setSelectedTests(newSelected);
      setSelectAll(false);
    }
  };

  const openBulkDelete = () => {
    if (selectedTests.length > 0) {
      setShowBulkDeleteModal(true);
    }
  };

  const openBulkMerge = () => {
    if (selectedTests.length >= 2) {
      setShowMergeModal(true);
    }
  };

  const handleMergeConfirm = async (targetTestId) => {
    if (selectedTests.length < 2 || !targetTestId) return;

    const sourceTestIds = selectedTests.filter(id => id !== targetTestId);
    
    if (sourceTestIds.length === 0) {
      showToast('Vui lòng chọn ít nhất 2 bài test để gộp', 'error');
      return;
    }

    try {
      const response = await testService.mergeTests(targetTestId, sourceTestIds);
      
      showToast(
        `Đã gộp ${response.moved_questions} câu hỏi từ ${sourceTestIds.length} bài test. Tổng câu hỏi: ${response.target_total_questions}`,
        'success'
      );
      
      // Clear selection and refresh data
      setSelectedTests([]);
      setSelectAll(false);
      setShowMergeModal(false);
      await fetchMultipleChoiceTests();
      
    } catch (err) {
      console.error('Error merging tests:', err);
      showToast(`Không thể gộp bài test: ${err.message}`, 'error');
    }
  };

  const handleBulkDeleteConfirm = async (deleteType) => {
    if (selectedTests.length === 0) return;

    try {
      // Delete all selected tests
      if (deleteType === 'soft') {
        await Promise.all(selectedTests.map(id => testService.softDeleteTest(id)));
        showToast(`Đã xóa mềm ${selectedTests.length} bài test`, 'success');
      } else {
        await Promise.all(selectedTests.map(id => testService.hardDeleteTest(id)));
        showToast(`Đã xóa vĩnh viễn ${selectedTests.length} bài test`, 'success');
      }
      
      // Clear selection and refresh data
      setSelectedTests([]);
      setSelectAll(false);
      setShowBulkDeleteModal(false);
      await fetchMultipleChoiceTests();
      
    } catch (err) {
      console.error('Error bulk deleting tests:', err);
      showToast('Không thể xóa một số bài test. Vui lòng thử lại!', 'error');
    }
  };

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
      await fetchMultipleChoiceTests();
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
    fetchMultipleChoiceTests();
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
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-2 space-y-4">
        {/* Stats Cards and Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2">
          <div className="bg-emerald-500 rounded-lg shadow-sm p-2">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center">
                  <svg className="w-3 h-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <CreateMultipleChoiceTestButton label="Tạo Test" className="h-10 px-3.5" />
          </div>
        </div>

        
        

        {/* Tests List - Mobile First Design */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Compact Filter Toolbar (moved onto table) */}
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
                {selectedTests.length > 0 && (
                  <>
                    {selectedTests.length >= 2 && (
                      <button
                        onClick={openBulkMerge}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-green-500 hover:bg-green-600 text-white"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span>Gộp ({selectedTests.length})</span>
                      </button>
                    )}
                    <button
                      onClick={openBulkDelete}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-red-500 hover:bg-red-600 text-white"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Xóa ({selectedTests.length})</span>
                    </button>
                  </>
                )}
                <select
                  value={filterVisibility}
                  onChange={(e) => setFilterVisibility(e.target.value)}
                  className="px-2 py-1 border border-gray-200 rounded-md text-sm bg-white"
                >
                  <option value="all">Tất cả Trạng Thái</option>
                  <option value="public">Công khai</option>
                  <option value="private">Riêng tư</option>
                </select>

                <select
                  value={filterDifficulty}
                  onChange={(e) => setFilterDifficulty(e.target.value)}
                  className="px-2 py-1 border border-gray-200 rounded-md text-sm bg-white"
                >
                  <option value="all">Tất cả Độ Khó</option>
                  <option value="easy">Dễ</option>
                  <option value="medium">Trung bình</option>
                  <option value="hard">Khó</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-2 py-1 border border-gray-200 rounded-md text-sm bg-white"
                >
                  <option value="all">Tất cả Trạng Thái</option>
                  <option value="active">Kích hoạt</option>
                  <option value="inactive">Tạm dừng</option>
                  <option value="deleted">Đã xóa</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-2 py-1 border border-gray-200 rounded-md text-sm bg-white"
                >
                  <option value="all">Mặc định</option>
                  <option value="test_title">Tên test</option>
                  <option value="main_topic">Chủ đề</option>
                  <option value="total_questions">Số câu hỏi</option>
                </select>

                <select
                  value={filterCreator}
                  onChange={(e) => setFilterCreator(e.target.value)}
                  className="px-2 py-1 border border-gray-200 rounded-md text-sm bg-white"
                >
                  <option value="all">Tất cả</option>
                  {(Array.from(new Set(tests.map(t => t.created_by_full_name || t.created_by).filter(Boolean)))).map((c, idx) => (
                    <option key={idx} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </th>
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
                        <span>Câu hỏi</span>
                        <SortIcon field="total_questions" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Độ khó
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedTests.length > 0 ? (
                    paginatedTests.map((test) => (
                      <tr key={test._id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedTests.includes(test._id)}
                            onChange={(e) => handleSelectTest(test._id, e.target.checked)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="max-w-xs">
                            <div className="text-sm font-medium text-gray-900 truncate">{test.test_title}</div>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="max-w-xs">
                            <div className="text-sm text-gray-900 truncate">{test.main_topic}</div>
                            <div className="text-xs text-gray-500 truncate">{test.sub_topic}</div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          {test.total_questions}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            test.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                            test.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {test.difficulty === 'easy' ? 'Dễ' : test.difficulty === 'medium' ? 'TB' : 'Khó'}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col space-y-1">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              test.status === 'active' ? 'bg-green-100 text-green-800' :
                              test.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {test.status === 'active' ? 'Hoạt động' : test.status === 'inactive' ? 'Tạm dừng' : 'Đã xóa'}
                            </span>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              test.visibility === 'public' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {test.visibility === 'public' ? 'Công khai' : 'Riêng tư'}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500">
                          {test.created_by_full_name || test.created_by || (test.created_at ? new Date(test.created_at).toLocaleDateString('vi-VN') : '—')}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col space-y-1">
                            <button
                              onClick={() => handleDetailClick(test._id)}
                              className="text-xs text-emerald-600 hover:text-emerald-900 text-left"
                            >
                              Chi tiết
                            </button>
                            <button
                              onClick={() => handleDeleteClick(test)}
                              className="text-xs text-red-600 hover:text-red-900 text-left"
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="px-4 py-8 text-center text-sm text-gray-500">
                        Không tìm thấy bài test nào
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="block lg:hidden">
            <div className="space-y-3 p-4">
              {paginatedTests.length > 0 ? (
                paginatedTests.map((test) => (
                  <div key={test._id} className="bg-gray-50 rounded-lg p-4 space-y-3">
                    {/* Title and Topic */}
                    <div>
                      <h3 className="font-medium text-gray-900 text-sm">{test.test_title}</h3>
                      <p className="text-xs text-gray-600 mt-1">
                        {test.main_topic} {test.sub_topic && `• ${test.sub_topic}`}
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {test.total_questions} câu hỏi
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                         test.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                        test.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {test.difficulty === 'easy' ? 'Dễ' : test.difficulty === 'medium' ? 'Trung bình' : 'Khó'}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        test.status === 'active' ? 'bg-green-100 text-green-800' :
                        test.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {test.status === 'active' ? 'Hoạt động' : test.status === 'inactive' ? 'Tạm dừng' : 'Đã xóa'}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        test.visibility === 'public' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {test.visibility === 'public' ? 'Công khai' : 'Riêng tư'}
                      </span>
                    </div>

                    {/* Date and Actions */}
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">
                        Được tạo bởi: {test.created_by_full_name || test.created_by || (test.created_at ? new Date(test.created_at).toLocaleDateString('vi-VN') : '—')}
                      </span>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleDetailClick(test._id)}
                          className="text-sm text-emerald-600 hover:text-emerald-900 font-medium"
                        >
                          Chi tiết
                        </button>
                        <button
                          onClick={() => handleDeleteClick(test)}
                          className="text-sm text-red-600 hover:text-red-900 font-medium"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">Không tìm thấy bài test nào</p>
                </div>
              )}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-xs sm:text-sm text-gray-700 text-center sm:text-left">
                  Hiển thị {startIndex + 1} - {Math.min(endIndex, filteredTests.length)} trong {filteredTests.length} kết quả
                </div>
                <div className="flex justify-center items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ‹
                  </button>
                  <span className="px-3 py-1 text-sm font-medium text-gray-900">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ›
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {/* Bulk Delete Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowBulkDeleteModal(false)} />
          <div className="relative bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-black">Xác nhận xóa nhiều</h4>
                <p className="text-sm text-indigo-900/70">Hành động này không thể hoàn tác</p>
              </div>
            </div>
            <p className="text-black mb-6">Bạn có chắc chắn muốn xóa <span className="font-semibold">{selectedTests.length} bài test</span> đã chọn?</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleBulkDeleteConfirm('soft')}
                className="w-full px-4 py-2 rounded-lg bg-yellow-600 text-white hover:bg-yellow-700"
              >
                Xóa mềm {selectedTests.length} bài test
              </button>
              <button
                onClick={() => handleBulkDeleteConfirm('hard')}
                className="w-full px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
              >
                Xóa vĩnh viễn {selectedTests.length} bài test
              </button>
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                className="w-full px-4 py-2 rounded-lg border border-indigo-200 bg-white text-indigo-900 hover:bg-indigo-50"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteTestModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        test={testToDelete}
        onDeleteConfirmed={handleDeleteConfirm}
      />

      <AdminMCPTestDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        testId={selectedTestId}
        onTestUpdated={handleTestUpdated}
      />

      {/* Merge Tests Modal */}
      {showMergeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowMergeModal(false)} />
          <div className="relative bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-black">Gộp bài test</h4>
                <p className="text-sm text-indigo-900/70">Chọn bài test đích</p>
              </div>
            </div>
            <p className="text-black mb-4">Chọn bài test sẽ nhận tất cả câu hỏi từ {selectedTests.length - 1} bài test khác:</p>
            <select 
              className="w-full px-3 py-2 border border-gray-200 rounded-lg mb-4"
              onChange={(e) => e.target.value && handleMergeConfirm(e.target.value)}
              defaultValue=""
            >
              <option value="">-- Chọn bài test đích --</option>
              {selectedTests.map(testId => {
                const test = tests.find(t => t._id === testId);
                return test ? (
                  <option key={testId} value={testId}>
                    {test.test_title} ({test.total_questions || 0} câu hỏi)
                  </option>
                ) : null;
              })}
            </select>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Lưu ý:</strong> Các bài test nguồn sẽ bị xóa mềm sau khi gộp. Hành động này không thể hoàn tác.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowMergeModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-indigo-200 bg-white text-indigo-900 hover:bg-indigo-50"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

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

export default AdminMultipleChoiceTests;