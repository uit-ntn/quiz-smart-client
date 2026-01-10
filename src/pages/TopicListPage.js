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
import Avatar from "../components/Avatar";
import Footer from "../components/Footer";

const cx = (...a) => a.filter(Boolean).join(" ");

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
  const [loading, setLoading] = useState(true);
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
      setLoading(true);
      setError(null);

      // ✅ Use topic service to get all topics with their subtopics and stats
      // Backend already calculates total_tests, total_questions, and test types
      const allTopicsFromService = await topicService.getAllTopics();

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
      setError(err?.message || "Có lỗi xảy ra khi tải danh sách chủ đề");
    } finally {
      setLoading(false);
    }
  };

  const fetchTopTakenTests = async () => {
    try {
      const tests = await testService.getTopTakenTests({ limit: 10 });
      setTopTakenTests(tests);
    } catch (err) {
      console.error("Failed to fetch top taken tests:", err);
    }
  };

  const fetchNewestTests = async () => {
    try {
      const tests = await testService.getNewestTests({ limit: 10 });
      setNewestTests(tests);
    } catch (err) {
      console.error("Failed to fetch newest tests:", err);
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
      const contributors = await userService.getTopContributors(5);
      setTopContributors(contributors);
    } catch (err) {
      console.error("Failed to fetch top contributors:", err);
    }
  };

  const fetchTopTestTakers = async () => {
    try {
      const users = await testResultService.getTopTestTakers(5);
      setTopTestTakers(users);
    } catch (err) {
      console.error("Failed to fetch top test takers:", err);
    }
  };

  const fetchLatestUsers = async () => {
    try {
      const users = await userService.getLatestUsers(7);
      setLatestUsers(users);
    } catch (err) {
      console.error("Failed to fetch latest users:", err);
    }
  };

  const fetchReviews = async () => {
    try {
      setReviewLoading(true);
      const [reviewsResponse, statsResponse] = await Promise.all([
        getAllReviews({ limit: 20, offset: 0 }),
        getReviewStatistics(),
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
      setReviewError(err.message);
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

  if (loading) return <LoadingSpinner message="Đang tải dữ liệu..." />;
  if (error) return <ErrorMessage error={error} onRetry={fetchAllTopics} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <Header />
      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-4 pb-4 pt-0 ">
        {/* Search & Filter Bar */}
        <div className="mt-4">
          <SmartFilterBar filters={filters} setFilters={setFilters} />
        </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mt-6">
          {/* Main Content */}
        <div className="xl:col-span-9 space-y-6">
            {/* Topic Grid */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 overflow-hidden">
            {/* Header */}
            <div className="px-5 pt-5 pb-2 border-b border-white/20 bg-gradient-to-r from-slate-50/50 to-white/50">
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
            <div className="px-5 pt-3 pb-5">
              <TopicGrid 
                topics={currentTopics}
                onOpenModal={(mainTopic, type) => setModalState({ isOpen: true, mainTopic, type })}
              />

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
          <TopTestsHot 
            topTakenTests={topTakenTests}
            onTestClick={handleTestClick}
          />

          {/* Newest Tests - Bên trái dưới top tests hot */}
          <NewestTests 
            newestTests={newestTests}
            onPreviewVocabulary={handlePreviewVocabulary}
            onPreviewMCP={handlePreviewMCP}
          />
                      </div>

          {/* Sidebar */}
          <div className="xl:col-span-3">
            <ModernSidebar
              topContributors={topContributors}
              topTestTakers={topTestTakers}
              latestUsers={latestUsers}
              onContributorClick={handleContributorClick}
              onUserInfoClick={handleUserInfoClick}
            />
                      </div>
                    </div>

        {/* Review Section - Full width below grid */}
        <div className="mt-6">
          <ReviewSection
            user={user}
            reviews={reviews}
            reviewStats={reviewStats}
            reviewLoading={reviewLoading}
            reviewError={reviewError}
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
    </div>
  );
};

export default TopicListPage;