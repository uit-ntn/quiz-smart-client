import React, { useEffect, useMemo, useState, useContext, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import testService from "../services/testService";
import userService from "../services/userService";
import topicService from "../services/topicService";
import testResultService from "../services/testResultService";
import vocabularyService from "../services/vocabularyService";
import multipleChoiceService from "../services/multipleChoiceService";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import Pagination from "../components/Pagination";
import TestTopicModal from "../components/TestTopicModal";
import AuthContext from "../context/AuthContext";
import Header from "../components/Header";
import VocabularyPreviewModal from "../components/VocabularyPreviewModal";
import MCPPreviewModal from "../components/MCPPreviewModal";
import ExportVocabularyModal from "../components/ExportVocabularyModal";
import ExportMCPModal from "../components/ExportMCPModal";
import { createReview, updateReview, deleteReview, getMyReview, getAllReviews, getReviewStatistics } from "../services/reviewService";
import Toast from "../components/Toast";


// Import các components mới
import SmartFilterBar from "../components/SmartFilterBar";
import TopicGrid from "../components/TopicGrid";
import TopTestsHot from "../components/TopTestsHot";
import NewestTests from "../components/NewestTests";
import ModernSidebar from "../components/ModernSidebar";
import UserInfoModal from "../components/UserInfoModal";
import ContributorTestsModal from "../components/ContributorTestsModal";
import ReviewSection from "../components/ReviewSection";
import Footer from "../components/Footer";

const cx = (...a) => a.filter(Boolean).join(" ");

// Helper function for retry with exponential backoff (for cold server start)
const fetchWithRetry = async (fetchFn, maxRetries = 3) => {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await fetchFn();
      return result;
    } catch (err) {
      lastError = err;
      console.log(`Fetch attempt ${attempt}/${maxRetries} failed:`, err.message);
      
      // Don't retry on 4xx errors (client errors)
      if (err.message && (err.message.includes('400') || err.message.includes('401') || err.message.includes('403') || err.message.includes('404'))) {
        throw err;
      }
      
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
};

// --- Main Component ---
const TopicListPage = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [allTopics, setAllTopics] = useState([]);
  const [topTakenTests, setTopTakenTests] = useState([]);
  const [newestTests, setNewestTests] = useState([]);
  const [topContributors, setTopContributors] = useState([]);
  const [topTestTakers, setTopTestTakers] = useState([]);
  const [latestUsers, setLatestUsers] = useState([]);
  const [latestUsersLimit, setLatestUsersLimit] = useState(8);
  const [loadingMoreLatestUsers, setLoadingMoreLatestUsers] = useState(false);
  const [showAllLatestUsers, setShowAllLatestUsers] = useState(false);
  
  // Separate loading states for progressive rendering
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [loadingTopTaken, setLoadingTopTaken] = useState(true);
  const [loadingNewest, setLoadingNewest] = useState(true);
  const [loadingContributors, setLoadingContributors] = useState(true);
  const [loadingTestTakers, setLoadingTestTakers] = useState(true);
  const [loadingLatestUsers, setLoadingLatestUsers] = useState(true);
  
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    searchTerm: "",
    testType: "all",
    status: "all",
    sortBy: "name",
    sortOrder: "asc",
  });

  const [pagination, setPagination] = useState({ currentPage: 1, itemsPerPage: 20 });
  const [modalState, setModalState] = useState({ isOpen: false, mainTopic: null, type: null });
  const [contributorModal, setContributorModal] = useState({ isOpen: false, contributor: null });
  const [userInfoModal, setUserInfoModal] = useState({ isOpen: false, user: null });

  // Preview modals for newest tests
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
    testMainTopic: '',
    testSubTopic: '',
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

  // Review states
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState({ average_rating: 0, total_reviews: 0 });
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 0, comment: '' });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });
  
  // Refs for scroll sections
  const reviewSectionRef = useRef(null);
  const topicListRef = useRef(null);

  useEffect(() => {
    fetchAllTopics();
    fetchTopTakenTests();
    fetchNewestTests();
    fetchTopContributors();
    fetchTopTestTakers();
    fetchLatestUsers();
    fetchReviews();
  }, [user]);

  const fetchAllTopics = async () => {
    try {
      setLoadingTopics(true);
      setError(null);

      // ✅ Use topic service to get all topics with their subtopics and stats
      // Backend already calculates total_tests, total_questions, and test types
      const allTopicsFromService = await fetchWithRetry(() => topicService.getAllTopics());

      // ✅ Process topics using backend topic data directly
      const processedTopics = allTopicsFromService
        .filter(topic => topic.active !== false) // Only show active topics
        .map((topic) => {
          // Build types array from test type breakdown
          const types = [];
          if (topic.vocabulary_tests > 0) types.push('vocabulary');
          if (topic.multiple_choice_tests > 0) types.push('multiple-choice');
          if (topic.grammar_tests > 0) types.push('grammar');
        
        return {
          mainTopic: topic.name,
            testCount: topic.total_tests || 0,
            subTopicCount: topic.total_subtopics || topic.sub_topics?.length || 0,
            total_questions: topic.total_questions || 0,
          types: types, // Array of types this topic has tests for
          type: types[0] || 'vocabulary', // Default type for modal opening
          views: topic.views || 0,
          avatar_url: topic.avatar_url || null,
          active: topic.active !== undefined ? topic.active : true,
            // Additional stats from backend
            vocabulary_tests: topic.vocabulary_tests || 0,
            multiple_choice_tests: topic.multiple_choice_tests || 0,
            grammar_tests: topic.grammar_tests || 0,
        };
        });

      setAllTopics(processedTopics);
    } catch (err) {
      console.error('Error fetching topics:', err);
      // Don't set error for topics - just show empty state
      setAllTopics([]);
    } finally {
      setLoadingTopics(false);
    }
  };

  const fetchTopTakenTests = async () => {
    try {
      setLoadingTopTaken(true);
      const tests = await fetchWithRetry(() => testService.getTopTakenTests({ limit: 10 }));
      setTopTakenTests(tests || []);
    } catch (err) {
      console.error("Failed to fetch top taken tests:", err);
      setTopTakenTests([]); // Show empty state instead of error
    } finally {
      setLoadingTopTaken(false);
    }
  };

  const fetchNewestTests = async () => {
    try {
      setLoadingNewest(true);
      const tests = await fetchWithRetry(() => testService.getNewestTests({ limit: 10 }));
      setNewestTests(tests || []);
    } catch (err) {
      console.error("Failed to fetch newest tests:", err);
      setNewestTests([]); // Show empty state instead of error
    } finally {
      setLoadingNewest(false);
    }
  };

  // ===== Preview handlers for newest tests =====
  const handlePreviewVocabulary = async (test) => {
    console.log('handlePreviewVocabulary - test object:', test);
    setPreviewModal((prev) => ({ ...prev, isOpen: true, test, loading: true }));
    try {
      const testId = test.test_id || test._id || test.id;
      const vocabularies = await vocabularyService.getAllVocabulariesByTestId(testId);
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
    console.log('handlePreviewMCP - test object:', test);
    setMcpPreviewModal((prev) => ({ ...prev, isOpen: true, test, loading: true }));
    try {
      const testId = test.test_id || test._id || test.id;
      const questions = await multipleChoiceService.getQuestionsByTestId(testId);
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

  const handleClosePreviewModal = () =>
    setPreviewModal({
      isOpen: false,
      test: null,
      vocabularies: [],
      loading: false,
      isPlaying: false,
    });

  const handleCloseMcpPreviewModal = () =>
    setMcpPreviewModal({
      isOpen: false,
      test: null,
      questions: [],
      loading: false,
    });

  const handleStartVocabularyTest = () => {
    const test = previewModal.test;
    if (!test) return;
    const testId = test.test_id || test._id || test.id;
    window.location.href = `/vocabulary/test/${testId}/settings`;
  };

  const handleStartMcpTest = () => {
    const test = mcpPreviewModal.test;
    if (!test) return;
    const testId = test.test_id || test._id || test.id;
    window.location.href = `/multiple-choice/test/${testId}/settings`;
  };

  // Export handlers
  const handleExportVocabulary = () => {
    setExportVocabularyModal({
      isOpen: true,
      vocabularies: previewModal.vocabularies,
      testTitle: previewModal.test?.test_title || '',
      testMainTopic: previewModal.test?.main_topic || '',
      testSubTopic: previewModal.test?.sub_topic || '',
      createdBy: previewModal.test?.created_by_full_name || previewModal.test?.created_by?.full_name || '',
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

  const fetchTopContributors = async () => {
    try {
      setLoadingContributors(true);
      const contributors = await fetchWithRetry(() => userService.getTopContributors(5));
      setTopContributors(contributors || []);
    } catch (err) {
      console.error("Failed to fetch top contributors:", err);
      setTopContributors([]); // Show empty state instead of error
    } finally {
      setLoadingContributors(false);
    }
  };

  const fetchTopTestTakers = async () => {
    try {
      setLoadingTestTakers(true);
      const users = await fetchWithRetry(() => testResultService.getTopTestTakers(5));
      setTopTestTakers(users || []);
    } catch (err) {
      console.error("Failed to fetch top test takers:", err);
      setTopTestTakers([]); // Show empty state instead of error
    } finally {
      setLoadingTestTakers(false);
    }
  };

  const fetchLatestUsers = async () => {
    try {
      setLoadingLatestUsers(true);
      const users = await fetchWithRetry(() => userService.getLatestUsers(8));
      setLatestUsers(users || []);
      setLatestUsersLimit(8);
      setShowAllLatestUsers(false);
    } catch (err) {
      console.error("Failed to fetch latest users:", err);
      setLatestUsers([]); // Show empty state instead of error
    } finally {
      setLoadingLatestUsers(false);
    }
  };

  const handleLoadMoreLatestUsers = async () => {
    try {
      setLoadingMoreLatestUsers(true);
      const users = await fetchWithRetry(() => userService.getLatestUsers(28));
      setLatestUsers(users || []);
      setLatestUsersLimit(28);
      setShowAllLatestUsers(true);
    } catch (err) {
      console.error("Failed to load more latest users:", err);
    } finally {
      setLoadingMoreLatestUsers(false);
    }
  };

  const handleHideLatestUsers = () => {
    setShowAllLatestUsers(false);
    // Không cần fetch lại, chỉ cần slice array hiện tại
  };

  const fetchReviews = async () => {
    try {
      setReviewLoading(true);
      setReviewError(null); // Clear any previous error
      const [reviewsResponse, statsResponse] = await Promise.all([
        fetchWithRetry(() => getAllReviews({ limit: 20, offset: 0 })),
        fetchWithRetry(() => getReviewStatistics()),
      ]);
      
      if (reviewsResponse.success) {
        setReviews(reviewsResponse.data || []);
        if (reviewsResponse.statistics) {
          setReviewStats(reviewsResponse.statistics);
        }
      }
      
      if (statsResponse.success && statsResponse.data) {
        setReviewStats(statsResponse.data);
      }
    } catch (err) {
      console.error("Failed to fetch reviews:", err);
      // Don't set error - just show empty reviews and keep loading a bit longer for cold start
      setReviews([]);
      setReviewError(null); // Explicitly clear error to prevent showing error message
    } finally {
      setReviewLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!user) {
      setToast({ isVisible: true, message: 'Vui lòng đăng nhập để đánh giá', type: 'warning' });
      return;
    }
    if (reviewForm.rating < 1 || reviewForm.rating > 5) {
      setToast({ isVisible: true, message: 'Vui lòng chọn điểm từ 1 đến 5', type: 'error' });
      return;
    }

    try {
      setIsSubmittingReview(true);
      // User có thể tạo nhiều đánh giá
      const response = await createReview(
        reviewForm.rating,
        reviewForm.comment
      );
      if (response.success) {
        setToast({ isVisible: true, message: 'Đánh giá thành công!', type: 'success' });
        // Reset form để user có thể tạo đánh giá mới
        setReviewForm({ rating: 0, comment: '' });
        fetchReviews();
      } else {
        setToast({ isVisible: true, message: 'Có lỗi xảy ra khi đánh giá', type: 'error' });
      }
    } catch (err) {
      setToast({ isVisible: true, message: err.message || 'Có lỗi xảy ra khi đánh giá', type: 'error' });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleTestClick = (test) => {
    if (!test.test_id) return;
    
    if (test.test_type === 'vocabulary') {
      navigate(`/vocabulary/test/${test.test_id}/settings`);
    } else if (test.test_type === 'multiple_choice') {
      navigate(`/multiple-choice/test/${test.test_id}/settings`);
    } else {
      navigate(`/test/${test.test_id}`);
    }
  };

  const handleContributorClick = (contributor) => {
    setContributorModal({ isOpen: true, contributor });
  };

  const handleUserInfoClick = (user) => {
    setUserInfoModal({ isOpen: true, user });
  };

  const filteredTopics = useMemo(() => {
    let list = [...allTopics];

    // Search filter
    const q = filters.searchTerm.trim().toLowerCase();
    if (q) list = list.filter((t) => (t.mainTopic || "").toLowerCase().includes(q));

    // Test type filter
    if (filters.testType && filters.testType !== 'all') {
      list = list.filter((t) => {
        if (filters.testType === 'vocabulary') return t.types.includes('vocabulary');
        if (filters.testType === 'multiple-choice') return t.types.includes('multiple-choice');
        if (filters.testType === 'grammar') return t.types.includes('grammar');
        return true;
      });
    }

    // Status filter
    if (filters.status && filters.status !== 'all') {
      if (filters.status === 'active') {
        list = list.filter((t) => t.testCount > 0);
      } else if (filters.status === 'empty') {
        list = list.filter((t) => t.testCount === 0);
      }
    }

    // Sort
    list.sort((a, b) => {
      let vA, vB;
      if (filters.sortBy === "testCount") {
        vA = a.testCount;
        vB = b.testCount;
      } else if (filters.sortBy === "questions") {
        vA = a.total_questions || 0;
        vB = b.total_questions || 0;
      } else if (filters.sortBy === "views") {
        vA = a.views || 0;
        vB = b.views || 0;
      } else {
        vA = (a.mainTopic || "").toLowerCase();
        vB = (b.mainTopic || "").toLowerCase();
      }
      
      if (vA < vB) return filters.sortOrder === "asc" ? -1 : 1;
      if (vA > vB) return filters.sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [allTopics, filters.searchTerm, filters.testType, filters.status, filters.sortBy, filters.sortOrder]);

  useEffect(() => {
    setPagination((p) => ({ ...p, currentPage: 1 }));
  }, [filters.searchTerm, filters.testType, filters.status, filters.sortBy, filters.sortOrder]);

  const totalPages = Math.ceil(filteredTopics.length / pagination.itemsPerPage);
  const currentTopics = filteredTopics.slice(
    (pagination.currentPage - 1) * pagination.itemsPerPage,
    pagination.currentPage * pagination.itemsPerPage
  );

  // Don't block entire page - show progressive loading
  // if (loading) return <LoadingSpinner message="Đang tải dữ liệu..." />;
  // if (error) return <ErrorMessage error={error} onRetry={fetchAllTopics} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <Header />
      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-2 md:px-4 pb-4 pt-0 ">
        {/* Search & Filter Bar */}
        <div className="mt-4">
          <SmartFilterBar filters={filters} setFilters={setFilters} />
        </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mt-6">
          {/* Main Content */}
        <div className="xl:col-span-9 space-y-6">
            {/* Topic Grid */}
          <div ref={topicListRef} className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 overflow-hidden">
            {/* Header */}
            <div className="px-3 md:px-5 pt-5 pb-2 border-b border-white/20 bg-gradient-to-r from-slate-50/50 to-white/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-slate-900">Danh sách các chủ đề</h2>
                  <p className="text-sm text-slate-600 mt-0.5">
                    Hiển thị {currentTopics.length} / {filteredTopics.length} chủ đề
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-slate-900">{filteredTopics.length}</div>
                  <div className="text-xs text-slate-600 font-medium">Tổng cộng</div>
                </div>
              </div>
            </div>

            {/* Topic Grid Content */}
            <div className="px-2 md:px-5 pt-3 pb-5">
              {loadingTopics ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm text-slate-600">Đang tải danh sách chủ đề...</p>
                  </div>
                </div>
              ) : (
                <TopicGrid 
                  topics={currentTopics}
                  onOpenModal={(mainTopic, type) => setModalState({ isOpen: true, mainTopic, type })}
                />
              )}

              {/* Pagination */}
                {totalPages > 1 && (
                <div className="flex justify-center mt-8">
                  <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-4 shadow-xl border border-white/50">
                    <Pagination
                      currentPage={pagination.currentPage}
                      totalPages={totalPages}
                      itemsPerPage={pagination.itemsPerPage}
                      totalItems={filteredTopics.length}
                      onPageChange={(p) => {
                        setPagination((x) => ({ ...x, currentPage: p }));
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    />
                  </div>
                  </div>
                )}
              </div>
          </div>

          {/* Top Tests Hot - Bên trái dưới danh sách topic */}
          {loadingTopTaken ? (
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg overflow-hidden mt-8 p-6">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-10 h-10 border-4 border-slate-200 border-t-orange-600 rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-sm text-slate-600">Đang tải bài test hot...</p>
                </div>
              </div>
            </div>
          ) : (
            <TopTestsHot 
              topTakenTests={topTakenTests}
              onTestClick={handleTestClick}
            />
          )}

          {/* Newest Tests - Bên trái dưới top tests hot */}
          {loadingNewest ? (
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg overflow-hidden mt-6 p-6">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-sm text-slate-600">Đang tải bài test mới...</p>
                </div>
              </div>
            </div>
          ) : (
            <NewestTests 
              newestTests={newestTests}
              onPreviewVocabulary={handlePreviewVocabulary}
              onPreviewMCP={handlePreviewMCP}
            />
          )}
                      </div>

          {/* Sidebar */}
          <div className="xl:col-span-3">
            {(loadingContributors || loadingTestTakers || loadingLatestUsers) ? (
              <div className="space-y-6">
                {(loadingContributors || loadingTestTakers || loadingLatestUsers) && (
                  <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 shadow-xl border border-white/50">
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <div className="w-10 h-10 border-4 border-slate-200 border-t-amber-600 rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-sm text-slate-600">Đang tải sidebar...</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <ModernSidebar
                topContributors={topContributors}
                topTestTakers={topTestTakers}
                latestUsers={latestUsers}
                onContributorClick={handleContributorClick}
                onUserInfoClick={handleUserInfoClick}
                onLoadMoreLatestUsers={handleLoadMoreLatestUsers}
                onHideLatestUsers={handleHideLatestUsers}
                loadingMoreLatestUsers={loadingMoreLatestUsers}
                showAllLatestUsers={showAllLatestUsers}
                currentUser={user}
              />
            )}
                      </div>
                    </div>

        {/* Review Section - Full width below grid */}
        <div ref={reviewSectionRef} className="mt-6">
          <ReviewSection
            user={user}
            reviews={reviews}
            reviewStats={reviewStats}
            reviewLoading={reviewLoading}
            reviewError={null}
            reviewForm={reviewForm}
            setReviewForm={setReviewForm}
            isSubmittingReview={isSubmittingReview}
            onSubmitReview={handleSubmitReview}
          />
        </div>
        </div>

      {/* Topic & Test Modals */}
      <TestTopicModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, mainTopic: null, type: null })}
        mainTopic={modalState.mainTopic}
        type={modalState.type}
      />

      {/* Preview Modals for newest tests */}
      <VocabularyPreviewModal
        isOpen={previewModal.isOpen}
        onClose={handleClosePreviewModal}
        items={previewModal.vocabularies}
        isPlaying={previewModal.isPlaying}
        onPlayAudio={() => {}}
        onStartTest={handleStartVocabularyTest}
        testTitle={previewModal.test?.test_title}
        testMainTopic={previewModal.test?.main_topic}
        testSubTopic={previewModal.test?.sub_topic}
        loading={previewModal.loading}
        onExport={handleExportVocabulary}
        createdBy={previewModal.test?.created_by_full_name || previewModal.test?.created_by?.full_name || null}
      />

      <MCPPreviewModal
        isOpen={mcpPreviewModal.isOpen}
        onClose={handleCloseMcpPreviewModal}
        items={mcpPreviewModal.questions}
        onStartTest={handleStartMcpTest}
        testTitle={mcpPreviewModal.test?.test_title}
        testMainTopic={mcpPreviewModal.test?.main_topic}
        testSubTopic={mcpPreviewModal.test?.sub_topic}
        loading={mcpPreviewModal.loading}
        onExport={handleExportMCP}
        createdBy={mcpPreviewModal.test?.created_by_full_name || mcpPreviewModal.test?.created_by?.full_name || null}
      />

      {/* Export Modals */}
      <ExportVocabularyModal
        isOpen={exportVocabularyModal.isOpen}
        onClose={() => setExportVocabularyModal({ isOpen: false, vocabularies: [], testTitle: '', testMainTopic: '', testSubTopic: '', createdBy: '' })}
        vocabularies={exportVocabularyModal.vocabularies}
        testTitle={exportVocabularyModal.testTitle}
        testMainTopic={exportVocabularyModal.testMainTopic}
        testSubTopic={exportVocabularyModal.testSubTopic}
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

      {contributorModal.isOpen && (
        <ContributorTestsModal
          isOpen={contributorModal.isOpen}
          onClose={() => setContributorModal({ isOpen: false, contributor: null })}
          contributor={contributorModal.contributor}
          onTestClick={handleTestClick}
        />
      )}

      {/* User Info Modal */}
      <UserInfoModal
        isOpen={userInfoModal.isOpen}
        onClose={() => setUserInfoModal({ isOpen: false, user: null })}
        user={userInfoModal.user}
      />

      {/* Toast */}
      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ isVisible: false, message: '', type: 'success' })}
      />
      <Footer></Footer>
      
      {/* Floating buttons to scroll to sections */}
      <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 flex flex-col gap-2 md:gap-3">
        {/* Button to scroll to topic list */}
        <button
          onClick={() => {
            topicListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 flex items-center justify-center"
          aria-label="Đến danh sách chủ đề"
          title="Đến danh sách chủ đề"
        >
          <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </button>
        
        {/* Button to scroll to review section */}
        <button
          onClick={() => {
            reviewSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 flex items-center justify-center"
          aria-label="Đến phần đánh giá"
          title="Đến phần đánh giá"
        >
          <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default TopicListPage;