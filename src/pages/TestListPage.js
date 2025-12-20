import React, { useState, useEffect, useContext } from 'react';
import { Link, useParams } from 'react-router-dom';
import testService from '../services/testService';
import vocabularyService from '../services/vocabularyService';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { VocabularyTestCard, MCPTestCard } from '../components/TestCard';
import EmptyState from '../components/EmptyState';
import { VocabularyLayout, MultipleChoiceLayout } from '../layout/TestLayout';
import VocabularyPreviewModal from '../components/VocabularyPreviewModal';
import AuthContext from '../context/AuthContext';
import Pagination from '../components/Pagination';

// --- Small Component for Stats ---
const StatBox = ({ label, value, colorClass, iconPath }) => (
  <div className="bg-white rounded-lg p-2 shadow-sm border border-slate-100 flex items-center gap-2">
    <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${colorClass}`}>
      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={iconPath} />
      </svg>
    </div>
    <div>
      <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wide">{label}</p>
      <p className="text-sm font-bold text-slate-800 leading-none">{value}</p>
    </div>
  </div>
);

// --- Filter Component ---
const FilterSection = ({ filters, setFilters, allTests }) => {
  const uniqueCreators = [...new Set(allTests.map(t => t.created_by_full_name).filter(Boolean))].sort();
  
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-200 mb-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Sort By */}
        <div className="min-w-0">
          <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Sắp xếp</label>
          <select
            value={filters.sortBy}
            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
            className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="name">Tên</option>
            <option value="difficulty">Mức độ</option>
            <option value="creator">Người tạo</option>
          </select>
        </div>

        {/* Sort Order */}
        <div className="min-w-0">
          <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Thứ tự</label>
          <select
            value={filters.sortOrder}
            onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
            className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="asc">↑ Tăng</option>
            <option value="desc">↓ Giảm</option>
          </select>
        </div>

        {/* Difficulty Filter */}
        <div className="min-w-0">
          <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Mức độ</label>
          <select
            value={filters.difficulty}
            onChange={(e) => handleFilterChange('difficulty', e.target.value)}
            className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tất cả</option>
            <option value="easy">Dễ</option>
            <option value="medium">TB</option>
            <option value="hard">Khó</option>
          </select>
        </div>

        {/* Creator Filter */}
        <div className="min-w-0">
          <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Người tạo</label>
          <select
            value={filters.creator}
            onChange={(e) => handleFilterChange('creator', e.target.value)}
            className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tất cả</option>
            {uniqueCreators.map(creator => (
              <option key={creator} value={creator}>{creator}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

const TestListPage = ({ type = 'vocabulary' }) => {
  const { mainTopic, subTopic } = useParams();
  const { user } = useContext(AuthContext);
  const [allTests, setAllTests] = useState([]);
  
  // Config
  const getTypeConfig = (type) => {
    const configs = {
      vocabulary: {
        title: 'Bài kiểm tra từ vựng',
        testType: 'vocabulary',
        loadingMessage: 'Đang tải...',
        errorMessage: 'Lỗi tải dữ liệu',
        emptyTitle: 'Chưa có bài kiểm tra',
        emptyDesc: 'Chưa có dữ liệu cho chủ đề này.',
        backLink: '/topics',
        backText: 'Quay lại',
        Layout: VocabularyLayout,
        TestCard: VocabularyTestCard,
        hasPreview: true
      },
      'multiple-choice': {
        title: 'Bài kiểm tra trắc nghiệm',
        testType: 'multiple_choice',
        loadingMessage: 'Đang tải...',
        errorMessage: 'Lỗi tải dữ liệu',
        emptyTitle: 'Chưa có bài kiểm tra',
        emptyDesc: 'Chưa có dữ liệu cho chủ đề này.',
        backLink: '/topics',
        backText: 'Quay lại',
        Layout: MultipleChoiceLayout,
        TestCard: MCPTestCard,
        hasPreview: false
      }
    };
    return configs[type] || configs.vocabulary;
  };

  const typeConfig = getTypeConfig(type);
  const [filteredTests, setFilteredTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination & Filter State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(16); // Số bài test mỗi trang
  const [filters, setFilters] = useState({ searchTerm: '', sortBy: 'name', sortOrder: 'asc', difficulty: '', creator: '' });
  const [viewMode, setViewMode] = useState('card');
  const [previewModal, setPreviewModal] = useState({ isOpen: false, test: null, vocabularies: [], loading: false, isPlaying: false });

  // --- Fetch Data ---
  useEffect(() => {
    const fetchTests = async () => {
      try {
        setLoading(true);
        if (!mainTopic || !subTopic) throw new Error('Thiếu thông tin chủ đề');
        
        const response = await testService.getTestsByTopic(mainTopic, subTopic);
        const allTestsData = Array.isArray(response) ? response : [];
        // Filter by type safely
        const filteredByType = allTestsData.filter(test => test.test_type === typeConfig.testType);
        
        setAllTests(filteredByType);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTests();
  }, [mainTopic, subTopic, type, typeConfig.testType]);

  // --- Filter Logic ---
  useEffect(() => {
    let result = [...allTests];
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      result = result.filter(t => t.test_title?.toLowerCase().includes(term));
    }
    if (filters.difficulty) result = result.filter(t => t.difficulty === filters.difficulty);
    if (filters.creator) result = result.filter(t => t.created_by_full_name === filters.creator);
    
    // Sort logic
    result.sort((a, b) => {
      let aVal, bVal;
      switch (filters.sortBy) {
        case 'name':
          aVal = a.test_title?.toLowerCase() || '';
          bVal = b.test_title?.toLowerCase() || '';
          break;
        case 'difficulty':
          const diffOrder = { easy: 1, medium: 2, hard: 3 };
          aVal = diffOrder[a.difficulty] || 0;
          bVal = diffOrder[b.difficulty] || 0;
          break;
        case 'creator':
          aVal = a.created_by_full_name?.toLowerCase() || '';
          bVal = b.created_by_full_name?.toLowerCase() || '';
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredTests(result);
    setCurrentPage(1);
  }, [allTests, filters]);

  // --- Handlers ---
  const handlePreviewVocabulary = async (test) => {
    setPreviewModal(prev => ({ ...prev, isOpen: true, test, loading: true }));
    try {
      const testId = test._id || test.id || test.test_id;
      const vocabularies = await vocabularyService.getAllVocabulariesByTestId(testId);
      setPreviewModal(prev => ({ ...prev, vocabularies: vocabularies || [], loading: false }));
    } catch (e) {
      setPreviewModal(prev => ({ ...prev, vocabularies: [], loading: false }));
    }
  };

  const handleCloseModal = () => setPreviewModal({ isOpen: false, test: null, vocabularies: [], loading: false, isPlaying: false });
  
  const handlePlayAudio = (text) => {
    if (previewModal.isPlaying) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.onend = () => setPreviewModal(prev => ({ ...prev, isPlaying: false }));
    setPreviewModal(prev => ({ ...prev, isPlaying: true }));
    window.speechSynthesis.speak(utterance);
  };

  const handleStartTest = () => {
    const testId = previewModal.test._id || previewModal.test.id || previewModal.test.test_id;
    window.location.href = `/vocabulary/test/${testId}/settings`;
  };

  // --- Stats Data ---
  const stats = {
    total: allTests.length,
    easy: allTests.filter(t => t.difficulty === 'easy').length,
    medium: allTests.filter(t => t.difficulty === 'medium').length,
    hard: allTests.filter(t => t.difficulty === 'hard').length,
    active: allTests.filter(t => t.status === 'active').length
  };

  // --- Pagination Slice ---
  const currentTests = filteredTests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredTests.length / itemsPerPage);

  if (loading) return <LoadingSpinner message={typeConfig.loadingMessage} />;
  if (error) return <ErrorMessage error={error} onRetry={() => window.location.reload()} />;

  const Layout = typeConfig.Layout;
  const TestCard = typeConfig.TestCard;

  return (
    <Layout
      title={typeConfig.title}
      description={`${mainTopic} / ${subTopic}`}
      type={type}
      actions={
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Tìm kiếm bài kiểm tra..."
              value={filters.searchTerm}
              onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
              className="w-64 pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <svg className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* View Mode Toggle */}
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button onClick={() => setViewMode('card')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'card' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Thẻ</button>
            <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>List</button>
          </div>
        </div>
      }
    >
      {/* 1. COMPACT STATS BAR */}
      <div className="hidden sm:grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
        <StatBox label="Tổng số" value={stats.total} colorClass="bg-blue-500" iconPath="M4 6h16M4 10h16M4 14h16M4 18h16" />
        <StatBox label="Dễ" value={stats.easy} colorClass="bg-emerald-500" iconPath="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        <StatBox label="Trung bình" value={stats.medium} colorClass="bg-amber-500" iconPath="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <StatBox label="Khó" value={stats.hard} colorClass="bg-rose-500" iconPath="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        <StatBox label="Hoạt động" value={stats.active} colorClass="bg-violet-500" iconPath="M13 10V3L4 14h7v7l9-11h-7z" />
      </div>

      {/* 2. FILTERS */}
      <FilterSection filters={filters} setFilters={setFilters} allTests={allTests} />

      {/* 3. MAIN CONTENT GRID (Reduced Gap) */}
      {filteredTests.length === 0 ? (
        <EmptyState title="Không tìm thấy bài kiểm tra" description="Thử thay đổi bộ lọc hoặc quay lại sau." />
      ) : (
        <>
          <div className={viewMode === 'card' ? "grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6" : "space-y-3 mb-6"}>
            {currentTests.map((test) => (
              <div key={test._id || test.id} className="h-full">
                <TestCard 
                  test={test} 
                  viewMode={viewMode} 
                  onPreviewVocabulary={typeConfig.hasPreview ? handlePreviewVocabulary : undefined}
                />
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mb-6">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                totalItems={filteredTests.length}
                onPageChange={setCurrentPage}
              />
            </div>
          )}

          {/* Pagination or Back Button */}
          <div className="flex justify-center mt-6">
             <Link
                to={typeConfig.backLink}
                className="flex items-center px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all shadow-sm text-sm font-medium"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                {typeConfig.backText}
              </Link>
          </div>
        </>
      )}

      {/* Preview Modal */}
      {typeConfig.hasPreview && (
        <VocabularyPreviewModal
          isOpen={previewModal.isOpen}
          onClose={handleCloseModal}
          items={previewModal.vocabularies}
          isPlaying={previewModal.isPlaying}
          onPlayAudio={handlePlayAudio}
          onStartTest={handleStartTest}
          testTitle={previewModal.test?.test_title}
          loading={previewModal.loading}
        />
      )}
    </Layout>
  );
};

export default TestListPage;

// Compatibility Exports
export const VocabularyTestList = (props) => <TestListPage {...props} type="vocabulary" />;
export const MultipleChoiceTestList = (props) => <TestListPage {...props} type="multiple-choice" />;