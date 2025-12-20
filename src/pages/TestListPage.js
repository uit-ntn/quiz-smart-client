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

// --- Small Component for Stats ---
const StatBox = ({ label, value, colorClass, iconPath }) => (
  <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 flex items-center gap-3">
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={iconPath} />
      </svg>
    </div>
    <div>
      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">{label}</p>
      <p className="text-lg font-bold text-slate-800 leading-none">{value}</p>
    </div>
  </div>
);

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
        backLink: '/vocabulary/topics',
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
        backLink: '/multiple-choice/topics',
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
  const [itemsPerPage] = useState(8); // Tăng số lượng item vì card nhỏ hơn
  const [filters, setFilters] = useState({ searchTerm: '', sortBy: 'name', sortOrder: 'asc', difficulty: '', status: '' });
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
    
    // Sort logic simplified
    result.sort((a, b) => {
      // Add detailed sort logic here if needed (same as original)
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
        <div className="flex bg-slate-100 rounded-lg p-1">
          <button onClick={() => setViewMode('card')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'card' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Thẻ</button>
          <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>List</button>
        </div>
      }
    >
      {/* 1. COMPACT STATS BAR */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <StatBox label="Tổng số" value={stats.total} colorClass="bg-blue-500" iconPath="M4 6h16M4 10h16M4 14h16M4 18h16" />
        <StatBox label="Dễ" value={stats.easy} colorClass="bg-emerald-500" iconPath="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        <StatBox label="Trung bình" value={stats.medium} colorClass="bg-amber-500" iconPath="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <StatBox label="Khó" value={stats.hard} colorClass="bg-rose-500" iconPath="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        <StatBox label="Hoạt động" value={stats.active} colorClass="bg-violet-500" iconPath="M13 10V3L4 14h7v7l9-11h-7z" />
      </div>

      {/* 2. MAIN CONTENT GRID (Reduced Gap) */}
      {filteredTests.length === 0 ? (
        <EmptyState title="Không tìm thấy bài kiểm tra" description="Thử thay đổi bộ lọc hoặc quay lại sau." />
      ) : (
        <>
          <div className={viewMode === 'card' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6" : "space-y-3 mb-6"}>
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