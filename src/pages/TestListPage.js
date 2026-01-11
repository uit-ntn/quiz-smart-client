import React, { useState, useEffect, useContext } from "react";
import { Link, useParams } from "react-router-dom";
import testService from "../services/testService";
import topicService from "../services/topicService";
import vocabularyService from "../services/vocabularyService";
import multipleChoiceService from "../services/multipleChoiceService";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import TestCard from "../components/TestCard";
import EmptyState from "../components/EmptyState";
import VocabularyPreviewModal from "../components/VocabularyPreviewModal";
import MCPPreviewModal from "../components/MCPPreviewModal";
import ExportVocabularyModal from "../components/ExportVocabularyModal";
import ExportMCPModal from "../components/ExportMCPModal";
import AuthContext from "../context/AuthContext";
import Pagination from "../components/Pagination";
import Header from "../components/Header";


// --- Smart Filter Bar ---
const SmartFilterBar = ({ filters, setFilters, allTests, onViewModeChange, viewMode }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const uniqueCreators = [...new Set(allTests.map(t => t.created_by_full_name).filter(Boolean))].sort();

  const quickFilters = [
    { key: 'all', label: 'Tất cả', count: allTests.length },
    { key: 'easy', label: 'Dễ', count: allTests.filter(t => t.difficulty === 'easy').length },
    { key: 'medium', label: 'Trung bình', count: allTests.filter(t => t.difficulty === 'medium').length },
    { key: 'hard', label: 'Khó', count: allTests.filter(t => t.difficulty === 'hard').length }
  ];

  return (
    <div className="sticky top-4 z-40 mb-4">
      <div className="bg-white/95 backdrop-blur-xl rounded-xl shadow-lg border border-white/50 p-3">
        {/* Top Row */}
        <div className="flex items-center justify-between mb-3">
          {/* Search */}
          <div className="flex-1 max-w-md relative">
            <input
              type="text"
              placeholder="Tìm kiếm bài test..."
              value={filters.searchTerm}
              onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
              className="w-full pl-3 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
            />
          </div>

          {/* View Mode & Advanced Filter Toggle */}
          <div className="flex items-center gap-2">
            {/* View Mode */}
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => onViewModeChange('card')}
                className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${
                  viewMode === 'card' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => onViewModeChange('list')}
                className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${
                  viewMode === 'list' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>

            {/* Advanced Filter Toggle */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${
                isExpanded ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <svg className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2 mb-3">
          {quickFilters.map(filter => (
            <button
              key={filter.key}
              onClick={() => setFilters(prev => ({ 
                ...prev, 
                difficulty: filter.key === 'all' ? '' : filter.key 
              }))}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${
                (filter.key === 'all' && !filters.difficulty) || filters.difficulty === filter.key
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {filter.label} ({filter.count})
            </button>
          ))}
        </div>

        {/* Advanced Filters */}
        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Sắp xếp theo tên</label>
              <select
                value={filters.sortName}
                onChange={(e) => setFilters(prev => ({ ...prev, sortName: e.target.value }))}
                className="w-full p-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
              >
                <option value="">Mặc định</option>
                <option value="asc">A → Z</option>
                <option value="desc">Z → A</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Số câu hỏi</label>
              <select
                value={filters.questionRange}
                onChange={(e) => setFilters(prev => ({ ...prev, questionRange: e.target.value }))}
                className="w-full p-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
              >
                <option value="">Tất cả</option>
                <option value="0-10">1-10 câu</option>
                <option value="11-30">11-30 câu</option>
                <option value="31-50">31-50 câu</option>
                <option value="51-100">51-100 câu</option>
                <option value="101+">100+ câu</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Tác giả</label>
              <select
                value={filters.creator}
                onChange={(e) => setFilters(prev => ({ ...prev, creator: e.target.value }))}
                className="w-full p-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
              >
                <option value="">Tất cả tác giả</option>
                {uniqueCreators.map(creator => (
                  <option key={creator} value={creator}>{creator}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Test Grid Component ---
const TestGrid = ({ tests, viewMode, onPreviewVocabulary, onPreviewMCP, typeConfig }) => {
  if (tests.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">🔍</span>
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">Không tìm thấy bài test</h3>
        <p className="text-sm text-slate-600">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
      </div>
    );
  }

  const TestCard = typeConfig.TestCard;

  return (
    <div className={
      viewMode === 'card' 
        ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4"
        : "grid grid-cols-1 md:grid-cols-2 gap-3"
    }>
      {tests.map((test, index) => (
        <div 
          key={test._id || test.id}
          className="animate-in fade-in duration-500"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <TestCard
            test={test}
            viewMode={viewMode}
            onPreviewVocabulary={onPreviewVocabulary}
            onPreviewMCP={onPreviewMCP}
          />
        </div>
      ))}
    </div>
  );
};

// --- Main Component ---
const TestListPage = () => {
  const { mainTopic, subTopic } = useParams();
  const { user } = useContext(AuthContext);

  const [allTests, setAllTests] = useState([]);
  const [filteredTests, setFilteredTests] = useState([]);
  const [topTakenTests, setTopTakenTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [topicInfo, setTopicInfo] = useState({ mainTopic: mainTopic, subTopic: subTopic });

  // Pagination & Filter State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [filters, setFilters] = useState({
    searchTerm: "",
    sortName: "",
    sortQuestions: "",
    difficulty: "",
    creator: "",
    questionRange: "",
  });

  const [viewMode, setViewMode] = useState("card");
  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    test: null,
    vocabularies: [],
    loading: false,
    isPlaying: false,
  });

  const [mcpPreviewModal, setMcpPreviewModal] = useState({
    isOpen: false,
    test: null,
    questions: [],
    loading: false,
  });

  // Export modals
  const [exportVocabularyModal, setExportVocabularyModal] = useState({
    isOpen: false,
    vocabularies: [],
    testTitle: '',
    createdBy: '',
  });

  const [exportMcpModal, setExportMcpModal] = useState({
    isOpen: false,
    questions: [],
    testTitle: '',
    testMainTopic: '',
    testSubTopic: '',
    createdBy: '',
  });

  const [hasExportedOnce, setHasExportedOnce] = useState(false);

  // Config - simplified, no type distinction
  const typeConfig = {
        loadingMessage: "Đang tải...",
        errorMessage: "Lỗi tải dữ liệu",
        emptyTitle: "Chưa có bài kiểm tra",
        emptyDesc: "Chưa có dữ liệu cho chủ đề này.",
        backLink: "/topics",
        backText: "Quay lại chủ đề",
    TestCard: (props) => {
      // Tách riêng handler preview từ props
      const { onPreviewVocabulary, onPreviewMCP, ...rest } = props;

      // Auto-detect type from test data
      const testType = rest.test?.test_type || 'vocabulary';
      const normalizedType = testType === 'multiple_choice' ? 'multiple-choice' : 'vocabulary';

      // Chọn handler preview tương ứng với loại test
      const onPreview = 
        normalizedType === "vocabulary" && typeof onPreviewVocabulary === "function"
          ? onPreviewVocabulary
          : normalizedType === "multiple-choice" && typeof onPreviewMCP === "function"
          ? onPreviewMCP
          : undefined;

      return (
        <TestCard
          {...rest}
          type={normalizedType}
          onPreview={onPreview}
        />
      );
    },
    hasPreview: true, // Show preview for vocabulary tests
  };

  // --- Fetch Data ---
  useEffect(() => {
    const fetchTests = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!mainTopic || !subTopic) throw new Error("Thiếu thông tin chủ đề");

        // ✅ Use endpoint /api/tests/topic/:mainTopic/:subTopic
        // This endpoint internally uses topic_id/subtopic_id from Topic model
        const allTestsData = await testService.getTestsByTopic(mainTopic, subTopic);
        
        // Filter by status only (show all test types in subtopic)
        const filteredByType = allTestsData.filter(test => 
          test.status === 'active'
        );

        // ✅ Enhance tests with topic and subtopic names for display
        const enhancedTests = filteredByType.map(test => ({
          ...test,
          // Add topic and subtopic names for backward compatibility with UI components
          main_topic: test.topic_id?.name || mainTopic,
          sub_topic: subTopic,
          // Keep original topic references
          topic_name: test.topic_id?.name,
          subtopic_name: subTopic
        }));

        setAllTests(enhancedTests);

        // ✅ Update topic info from actual data
        if (enhancedTests.length > 0 && enhancedTests[0].topic_id) {
          setTopicInfo({
            mainTopic: enhancedTests[0].topic_id.name || mainTopic,
            subTopic: subTopic
          });
        } else {
          setTopicInfo({
            mainTopic: mainTopic,
            subTopic: subTopic
          });
        }

        // ✅ Get subtopic info for incrementing views
        try {
          const subtopics = await topicService.getSubTopicsByMainTopic(mainTopic, false);
          const currentSubtopic = subtopics.find(st => st.name === subTopic);
          if (currentSubtopic) {
            // Increment views without specifying test type
            await topicService.incrementSubTopicViews(mainTopic, currentSubtopic.subtopic_id, 'vocabulary');
          }
        } catch (viewError) {
          console.warn("Failed to increment subtopic views:", viewError);
        }

      } catch (err) {
        setError(err.message || "Lỗi tải dữ liệu");
      } finally {
        setLoading(false);
      }
    };

    fetchTests();
  }, [mainTopic, subTopic]);

  // --- Fetch Top Taken Tests ---
  useEffect(() => {
    const fetchTopTaken = async () => {
      try {
        // ✅ Use topic-based filtering for top taken tests (all types)
        // First get subtopic info for topic_id and subtopic_id
        const subtopics = await topicService.getSubTopicsByMainTopic(mainTopic, false);
        const currentSubtopic = subtopics.find(st => st.name === subTopic);
        
        if (currentSubtopic) {
        const tests = await testService.getTopTakenTests({
          limit: 5,
            topic_id: currentSubtopic.topic_id,
            subtopic_id: currentSubtopic.subtopic_id,
            // No test_type filter - show all types
        });
        setTopTakenTests(tests);
        } else {
          setTopTakenTests([]);
        }
      } catch (err) {
        console.error("Failed to fetch top taken tests:", err);
        setTopTakenTests([]);
      }
    };

    if (mainTopic && subTopic) {
      fetchTopTaken();
    }
  }, [mainTopic, subTopic]);

  // --- Helpers ---
  const getQuestionCount = (t) =>
    Number(
      t.total_questions ??
        t.totalQuestions ??
        t.question_count ??
        t.questions_count ??
        0
    );

  // --- Filter + Sort Logic ---
  useEffect(() => {
    let result = [...allTests];

    // Search
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      result = result.filter((t) =>
        (t.test_title || "").toLowerCase().includes(term)
      );
    }

    // Difficulty
    if (filters.difficulty) {
      result = result.filter((t) => t.difficulty === filters.difficulty);
    }

    // Creator
    if (filters.creator) {
      result = result.filter((t) => t.created_by_full_name === filters.creator);
    }

    // Question range filter
    if (filters.questionRange) {
      result = result.filter((t) => {
        const q = getQuestionCount(t);
        switch (filters.questionRange) {
          case "0-10":
            return q >= 0 && q <= 10;
          case "11-30":
            return q >= 11 && q <= 30;
          case "31-50":
            return q >= 31 && q <= 50;
          case "51-100":
            return q >= 51 && q <= 100;
          case "101+":
            return q >= 101;
          default:
            return true;
        }
      });
    }

    // Sort by name
    if (filters.sortName) {
      result.sort((a, b) => {
        const aVal = (a.test_title || "").toLowerCase();
        const bVal = (b.test_title || "").toLowerCase();
        if (aVal < bVal) return filters.sortName === "asc" ? -1 : 1;
        if (aVal > bVal) return filters.sortName === "asc" ? 1 : -1;
        return 0;
      });
    }

    setFilteredTests(result);
    setCurrentPage(1);
  }, [allTests, filters]);

  // --- Handlers ---
  const handlePreviewVocabulary = async (test) => {
    setPreviewModal((prev) => ({ ...prev, isOpen: true, test, loading: true }));
    try {
      const testId = test._id || test.id || test.test_id;
      const vocabularies = await vocabularyService.getAllVocabulariesByTestId(
        testId
      );
      setPreviewModal((prev) => ({
        ...prev,
        vocabularies: vocabularies || [],
        loading: false,
      }));
    } catch (e) {
      setPreviewModal((prev) => ({
        ...prev,
        vocabularies: [],
        loading: false,
      }));
    }
  };

  const handlePreviewMCP = async (test) => {
    setMcpPreviewModal((prev) => ({ ...prev, isOpen: true, test, loading: true }));
    try {
      const testId = test._id || test.id || test.test_id;
      const questions = await multipleChoiceService.getQuestionsByTestId(
        testId
      );
      setMcpPreviewModal((prev) => ({
        ...prev,
        questions: questions || [],
        loading: false,
      }));
    } catch (e) {
      setMcpPreviewModal((prev) => ({
        ...prev,
        questions: [],
        loading: false,
      }));
    }
  };

  const handleCloseModal = () =>
    setPreviewModal({
      isOpen: false,
      test: null,
      vocabularies: [],
      loading: false,
      isPlaying: false,
    });

  const handleCloseMcpModal = () =>
    setMcpPreviewModal({
      isOpen: false,
      test: null,
      questions: [],
      loading: false,
    });

  const handlePlayAudio = (text) => {
    if (previewModal.isPlaying) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.onend = () =>
      setPreviewModal((prev) => ({ ...prev, isPlaying: false }));
    setPreviewModal((prev) => ({ ...prev, isPlaying: true }));
    window.speechSynthesis.speak(utterance);
  };

  const handleStartTest = () => {
    const testId =
      previewModal.test._id || previewModal.test.id || previewModal.test.test_id;
    window.location.href = `/vocabulary/test/${testId}/settings`;
  };

  const handleStartMcpTest = () => {
    const testId =
      mcpPreviewModal.test._id || mcpPreviewModal.test.id || mcpPreviewModal.test.test_id;
    window.location.href = `/multiple-choice/test/${testId}/settings`;
  };

  // Export handlers
  const handleExportVocabulary = () => {
    setExportVocabularyModal({
      isOpen: true,
      vocabularies: previewModal.vocabularies,
      testTitle: previewModal.test?.test_title || '',
    });
  };

  const handleExportMCP = () => {
    setExportMcpModal({
      isOpen: true,
      questions: mcpPreviewModal.questions,
      testTitle: mcpPreviewModal.test?.test_title || '',
      testMainTopic: mcpPreviewModal.test?.main_topic || '',
      testSubTopic: mcpPreviewModal.test?.sub_topic || '',
      createdBy: mcpPreviewModal.test?.created_by_full_name || mcpPreviewModal.test?.created_by?.full_name || '',
    });
  };

  // --- Stats Data ---
  const stats = {
    total: allTests.length,
    easy: allTests.filter((t) => t.difficulty === "easy").length,
    medium: allTests.filter((t) => t.difficulty === "medium").length,
    hard: allTests.filter((t) => t.difficulty === "hard").length,
    active: allTests.filter((t) => t.status === "active").length,
  };

  // --- Pagination Slice ---
  const currentTests = filteredTests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredTests.length / itemsPerPage);

  if (loading) return <LoadingSpinner message={typeConfig.loadingMessage} />;
  if (error)
    return (
      <ErrorMessage error={error} onRetry={() => window.location.reload()} />
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <Header />
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 pb-12 pt-4">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-slate-500 mb-3">
          <Link to="/topics" className="hover:text-slate-700 transition-colors">Chủ đề</Link>
          <span>→</span>
          <span className="font-semibold text-slate-700">{topicInfo.mainTopic}</span>
          <span>→</span>
          <span className="font-semibold text-slate-900">{topicInfo.subTopic}</span>
        </nav>

        {/* Topic Header */}
        <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/50 p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900 mb-1">
                {topicInfo.subTopic}
              </h1>
              <p className="text-sm text-slate-600">
                Chủ đề: <span className="font-semibold">{topicInfo.mainTopic}</span>
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">{stats.total}</div>
                <div className="text-xs text-slate-500">Tổng bài test</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">{stats.active}</div>
                <div className="text-xs text-slate-500">Đang hoạt động</div>
              </div>
            </div>
          </div>
        </div>
        {/* Smart Filter Bar */}
        <SmartFilterBar
          filters={filters}
          setFilters={setFilters}
          allTests={allTests}
          onViewModeChange={setViewMode}
          viewMode={viewMode}
        />

        {/* Test Grid */}
        <TestGrid
          tests={currentTests}
          viewMode={viewMode}
          onPreviewVocabulary={typeConfig.hasPreview ? handlePreviewVocabulary : undefined}
          onPreviewMCP={typeConfig.hasPreview ? handlePreviewMCP : undefined}
          typeConfig={typeConfig}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-6">
            <div className="bg-white/80 backdrop-blur-xl rounded-xl p-3 shadow-lg border border-white/50">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                totalItems={filteredTests.length}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        )}

        {/* Back to Topics */}
        <div className="text-center mt-8">
          <Link
            to={typeConfig.backLink}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/80 backdrop-blur-xl border border-white/50 text-slate-700 rounded-xl hover:bg-white hover:scale-105 transition-all duration-300 shadow-lg font-bold text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {typeConfig.backText}
          </Link>
        </div>
      </div>

      {/* Preview Modals */}
      {typeConfig.hasPreview && (
        <>
        <VocabularyPreviewModal
          isOpen={previewModal.isOpen}
          onClose={handleCloseModal}
          items={previewModal.vocabularies}
          isPlaying={previewModal.isPlaying}
          onPlayAudio={handlePlayAudio}
          onStartTest={handleStartTest}
          testTitle={previewModal.test?.test_title}
          loading={previewModal.loading}
            onExport={handleExportVocabulary}
            createdBy={previewModal.test?.created_by_full_name || previewModal.test?.created_by?.full_name || null}
          />
          
          <MCPPreviewModal
            isOpen={mcpPreviewModal.isOpen}
            onClose={handleCloseMcpModal}
            items={mcpPreviewModal.questions}
            onStartTest={handleStartMcpTest}
            testTitle={mcpPreviewModal.test?.test_title}
            loading={mcpPreviewModal.loading}
            onExport={handleExportMCP}
            createdBy={mcpPreviewModal.test?.created_by_full_name || mcpPreviewModal.test?.created_by?.full_name || null}
          />

          {/* Export Modals */}
          <ExportVocabularyModal
            isOpen={exportVocabularyModal.isOpen}
            onClose={() => setExportVocabularyModal({ isOpen: false, vocabularies: [], testTitle: '', createdBy: '' })}
            vocabularies={exportVocabularyModal.vocabularies}
            testTitle={exportVocabularyModal.testTitle}
            createdBy={exportVocabularyModal.createdBy}
          />

          <ExportMCPModal
            isOpen={exportMcpModal.isOpen}
            onClose={() => setExportMcpModal({ isOpen: false, questions: [], testTitle: '', testMainTopic: '', testSubTopic: '', createdBy: '' })}
            questions={exportMcpModal.questions}
            testTitle={exportMcpModal.testTitle}
            testMainTopic={exportMcpModal.testMainTopic}
            testSubTopic={exportMcpModal.testSubTopic}
            createdBy={exportMcpModal.createdBy}
          />
        </>
      )}
    </div>
  );
};

export default TestListPage;
