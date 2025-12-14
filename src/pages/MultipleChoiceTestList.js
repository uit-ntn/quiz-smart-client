import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import testService from '../services/testService';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import TestCard from '../components/TestCard';
import EmptyState from '../components/EmptyState';
import FilterSidebar from '../components/FilterSidebar';
import Pagination from '../components/Pagination';
import MultipleChoiceLayout from '../layout/MultipleChoiceLayout';

const MultipleChoiceTestList = () => {
  const { mainTopic, subTopic } = useParams();
  const [allTests, setAllTests] = useState([]);
  const [filteredTests, setFilteredTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  
  // Filter state
  const [filters, setFilters] = useState({
    searchTerm: '',
    sortBy: 'name',
    sortOrder: 'asc',
    difficulty: '',
    status: ''
  });

  // View mode state
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'list'

  useEffect(() => {
    fetchTests();
  }, [mainTopic, subTopic]);

  useEffect(() => {
    applyFilters();
  }, [allTests, filters]);

  const fetchTests = async () => {
    try {
      setLoading(true);
      const response = await testService.getTestsByTopic(mainTopic, subTopic);
      // Filter chỉ lấy tests có test_type là 'multiple_choice'
      const multipleChoiceTests = response.filter(test => test.test_type === 'multiple_choice');
      setAllTests(multipleChoiceTests);
      setError(null);
    } catch (err) {
      setError('Không thể tải danh sách bài kiểm tra. Vui lòng thử lại sau.');
      console.error('Error fetching tests:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...allTests];

    // Search filter
    if (filters.searchTerm) {
      filtered = filtered.filter(test =>
        test.test_title?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        test.description?.toLowerCase().includes(filters.searchTerm.toLowerCase())
      );
    }

    // Difficulty filter
    if (filters.difficulty) {
      filtered = filtered.filter(test => test.difficulty === filters.difficulty);
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(test => test.status === filters.status);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (filters.sortBy) {
        case 'name':
          aValue = a.test_title?.toLowerCase() || '';
          bValue = b.test_title?.toLowerCase() || '';
          break;
        case 'created_at':
          aValue = new Date(a.created_at || 0);
          bValue = new Date(b.created_at || 0);
          break;
        case 'updated_at':
          aValue = new Date(a.updated_at || 0);
          bValue = new Date(b.updated_at || 0);
          break;
        case 'difficulty':
          const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
          aValue = difficultyOrder[a.difficulty] || 0;
          bValue = difficultyOrder[b.difficulty] || 0;
          break;
        case 'total_questions':
          aValue = a.total_questions || 0;
          bValue = b.total_questions || 0;
          break;
        default:
          aValue = a.test_title?.toLowerCase() || '';
          bValue = b.test_title?.toLowerCase() || '';
      }
      
      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });

    setFilteredTests(filtered);
    setCurrentPage(1);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      searchTerm: '',
      sortBy: 'name',
      sortOrder: 'asc',
      difficulty: '',
      status: ''
    });
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredTests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTests = filteredTests.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  // Stats calculations
  const stats = {
    total: allTests.length,
    easy: allTests.filter(test => test.difficulty === 'easy').length,
    medium: allTests.filter(test => test.difficulty === 'medium').length,
    hard: allTests.filter(test => test.difficulty === 'hard').length,
    active: allTests.filter(test => test.status === 'active').length
  };

  if (loading) {
    return <LoadingSpinner message="Đang tải danh sách bài kiểm tra..." />;
  }

  if (error) {
    return <ErrorMessage error={error} onRetry={fetchTests} />;
  }

  const headerActions = (
    <div className="flex bg-white/70 backdrop-blur-sm rounded-xl border border-white/50 p-1 shadow-lg">
      <button
        onClick={() => setViewMode('card')}
        className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
          viewMode === 'card' 
            ? 'bg-indigo-100 text-indigo-700 shadow-sm' 
            : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
        }`}
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
        Thẻ
      </button>
      <button
        onClick={() => setViewMode('list')}
        className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
          viewMode === 'list' 
            ? 'bg-indigo-100 text-indigo-700 shadow-sm' 
            : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
        }`}
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
        Danh sách
      </button>
    </div>
  );

  return (
    <MultipleChoiceLayout
      title="Bài kiểm tra trắc nghiệm"
      description={`${mainTopic} - ${subTopic}`}
      actions={headerActions}
    >
      {/* Enhanced Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-6">
                <div className="relative rounded-xl overflow-hidden">
                  <div className="absolute inset-0 bg-white/70 backdrop-blur-sm border border-white/50" />
                  <div className="relative p-2">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Tổng</p>
                        <p className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">{stats.total}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative rounded-xl overflow-hidden">
                  <div className="absolute inset-0 bg-white/70 backdrop-blur-sm border border-white/50" />
                  <div className="relative p-2">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Dễ</p>
                        <p className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text text-transparent">{stats.easy}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative rounded-xl overflow-hidden">
                  <div className="absolute inset-0 bg-white/70 backdrop-blur-sm border border-white/50" />
                  <div className="relative p-2">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Trung bình</p>
                        <p className="text-xl font-bold bg-gradient-to-r from-amber-600 to-amber-700 bg-clip-text text-transparent">{stats.medium}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative rounded-xl overflow-hidden">
                  <div className="absolute inset-0 bg-white/70 backdrop-blur-sm border border-white/50" />
                  <div className="relative p-2">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Khó</p>
                        <p className="text-xl font-bold bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent">{stats.hard}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative rounded-xl overflow-hidden">
                  <div className="absolute inset-0 bg-white/70 backdrop-blur-sm border border-white/50" />
                  <div className="relative p-2">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Hoạt động</p>
                        <p className="text-xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent">{stats.active}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            {filteredTests.length === 0 ? (
              <EmptyState
                icon="inbox"
                title={filters.searchTerm || filters.difficulty || filters.status ? "Không tìm thấy kết quả" : "Chưa có bài kiểm tra nào"}
                description={filters.searchTerm || filters.difficulty || filters.status ? 
                  "Không tìm thấy bài kiểm tra nào phù hợp với bộ lọc hiện tại." : 
                  "Hiện tại chưa có bài kiểm tra trắc nghiệm nào cho chủ đề này."
                }
                action={
                  <div className="flex flex-col sm:flex-row gap-3">
                    {(filters.searchTerm || filters.difficulty || filters.status) && (
                      <button
                        onClick={handleClearFilters}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Xóa bộ lọc
                      </button>
                    )}
                    <Link
                      to={`/multiple-choice/topic/${encodeURIComponent(mainTopic)}`}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      Quay lại
                    </Link>
                  </div>
                }
              />
            ) : (
              <>
                <div className={
                  viewMode === 'card' 
                    ? "grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"
                    : "space-y-4 mb-8"
                }>
                  {currentTests.map((test) => (
                    <div key={test._id || test.id || test.test_id} className="h-full transform hover:scale-105 transition-all duration-200">
                      <TestCard test={test} viewMode={viewMode} className="h-full" />
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    itemsPerPage={itemsPerPage}
                    totalItems={filteredTests.length}
                    onPageChange={handlePageChange}
                    onItemsPerPageChange={handleItemsPerPageChange}
                  />
                )}

                {/* Enhanced Back Button */}
                <div className="flex justify-center mt-8">
                  <Link
                    to={`/multiple-choice/topics`}
                    className="flex items-center px-6 py-3 bg-white/70 backdrop-blur-sm border border-white/50 text-gray-700 rounded-xl hover:bg-white/90 transition-all duration-200 shadow-lg"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Quay lại chủ đề con
                  </Link>
                </div>
              </>
            )}
    </MultipleChoiceLayout>
  );
};

export default MultipleChoiceTestList;
