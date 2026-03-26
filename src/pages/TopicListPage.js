import React, { useEffect, useMemo, useState, useContext, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import testService from "../services/testService";
import userService from "../services/userService";
import topicService from "../services/topicService";
import vocabularyService from "../services/vocabularyService";
import multipleChoiceService from "../services/multipleChoiceService";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import Pagination from "../components/Pagination";
import TestTopicModal from "../components/TestTopicModal";
import AuthContext from "../context/AuthContext";
import MainLayout from "../layout/MainLayout";
import VocabularyPreviewModal from "../components/VocabularyPreviewModal";
import MCPPreviewModal from "../components/MCPPreviewModal";
import ExportVocabularyModal from "../components/ExportVocabularyModal";
import ExportMCPModal from "../components/ExportMCPModal";
import { createReview, updateReview, deleteReview, getMyReview, getAllReviews, getReviewStatistics } from "../services/reviewService";
import Toast from "../components/Toast";

import SmartFilterBar from "../components/SmartFilterBar";
import TopicGrid from "../components/TopicGrid";
import TopTestsHot from "../components/TopTestsHot";
import NewestTests from "../components/NewestTests";
import ModernSidebar from "../components/ModernSidebar";
import UserInfoModal from "../components/UserInfoModal";
import ContributorTestsModal from "../components/ContributorTestsModal";
import ReviewSection from "../components/ReviewSection";
// Footer is already rendered by MainLayout

const fetchWithRetry = async (fetchFn, maxRetries = 3) => {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetchFn();
    } catch (err) {
      lastError = err;
      if (err.message && (err.message.includes('400') || err.message.includes('401') || err.message.includes('403') || err.message.includes('404'))) {
        throw err;
      }
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
};

// Loading skeleton card
const SkeletonCard = () => (
  <div className="rounded-2xl border-2 border-sky-200 bg-sky-50 overflow-hidden animate-pulse">
    <div className="aspect-[4/3] bg-sky-200/70" />
    <div className="p-3 space-y-2">
      <div className="h-3 bg-sky-300/60 rounded w-3/4" />
      <div className="h-2.5 bg-sky-300/50 rounded w-1/2" />
      <div className="h-px bg-sky-200/60" />
      <div className="grid grid-cols-3 gap-1">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-6 bg-sky-300/50 rounded" />
        ))}
      </div>
    </div>
  </div>
);

const TopicListPage = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [allTopics, setAllTopics] = useState([]);
  const [topTakenTests, setTopTakenTests] = useState([]);
  const [newestTests, setNewestTests] = useState([]);
  const [topContributors, setTopContributors] = useState([]);
  const [latestUsers, setLatestUsers] = useState([]);
  const [latestUsersLimit, setLatestUsersLimit] = useState(8);
  const [loadingMoreLatestUsers, setLoadingMoreLatestUsers] = useState(false);
  const [showAllLatestUsers, setShowAllLatestUsers] = useState(false);

  const [loadingTopics, setLoadingTopics] = useState(true);
  const [loadingTopTaken, setLoadingTopTaken] = useState(true);
  const [loadingNewest, setLoadingNewest] = useState(true);
  const [loadingContributors, setLoadingContributors] = useState(true);
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

  const [previewModal, setPreviewModal] = useState({ isOpen: false, test: null, vocabularies: [], loading: false, isPlaying: false });
  const [mcpPreviewModal, setMcpPreviewModal] = useState({ isOpen: false, test: null, questions: [], loading: false });
  const [exportVocabularyModal, setExportVocabularyModal] = useState({ isOpen: false, vocabularies: [], testTitle: '', testMainTopic: '', testSubTopic: '', createdBy: '' });
  const [exportMcpModal, setExportMcpModal] = useState({ isOpen: false, questions: [], testTitle: '', testMainTopic: '', testSubTopic: '', createdBy: '' });

  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState({ average_rating: 0, total_reviews: 0 });
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 0, comment: '' });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });

  const reviewSectionRef = useRef(null);
  const topicListRef = useRef(null);

  useEffect(() => {
    fetchAllTopics();
    fetchTopTakenTests();
    fetchNewestTests();
    fetchTopContributors();
    fetchLatestUsers();
    fetchReviews();
  }, [user]);

  const fetchAllTopics = async () => {
    try {
      setLoadingTopics(true);
      const allTopicsFromService = await fetchWithRetry(() => topicService.getAllTopics());
      const processedTopics = allTopicsFromService
        .filter(topic => topic.active !== false)
        .map((topic) => {
          const types = [];
          if (topic.vocabulary_tests > 0) types.push('vocabulary');
          if (topic.multiple_choice_tests > 0) types.push('multiple-choice');
          if (topic.grammar_tests > 0) types.push('grammar');
          return {
            mainTopic: topic.name,
            testCount: topic.total_tests || 0,
            subTopicCount: topic.total_subtopics || topic.sub_topics?.length || 0,
            total_questions: topic.total_questions || 0,
            types,
            type: types[0] || 'vocabulary',
            views: topic.views || 0,
            avatar_url: topic.avatar_url || null,
            active: topic.active !== undefined ? topic.active : true,
            vocabulary_tests: topic.vocabulary_tests || 0,
            multiple_choice_tests: topic.multiple_choice_tests || 0,
            grammar_tests: topic.grammar_tests || 0,
          };
        });
      setAllTopics(processedTopics);
    } catch (err) {
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
    } catch {
      setTopTakenTests([]);
    } finally {
      setLoadingTopTaken(false);
    }
  };

  const fetchNewestTests = async () => {
    try {
      setLoadingNewest(true);
      const tests = await fetchWithRetry(() => testService.getNewestTests({ limit: 10 }));
      setNewestTests(tests || []);
    } catch {
      setNewestTests([]);
    } finally {
      setLoadingNewest(false);
    }
  };

  const handlePreviewVocabulary = async (test) => {
    setPreviewModal(prev => ({ ...prev, isOpen: true, test, loading: true }));
    try {
      const testId = test.test_id || test._id || test.id;
      const vocabularies = await vocabularyService.getAllVocabulariesByTestId(testId);
      setPreviewModal(prev => ({ ...prev, vocabularies: vocabularies || [], loading: false }));
    } catch {
      setPreviewModal(prev => ({ ...prev, vocabularies: [], loading: false }));
    }
  };

  const handlePreviewMCP = async (test) => {
    setMcpPreviewModal(prev => ({ ...prev, isOpen: true, test, loading: true }));
    try {
      const testId = test.test_id || test._id || test.id;
      const questions = await multipleChoiceService.getQuestionsByTestId(testId);
      setMcpPreviewModal(prev => ({ ...prev, questions: questions || [], loading: false }));
    } catch {
      setMcpPreviewModal(prev => ({ ...prev, questions: [], loading: false }));
    }
  };

  const handleClosePreviewModal = () =>
    setPreviewModal({ isOpen: false, test: null, vocabularies: [], loading: false, isPlaying: false });

  const handleCloseMcpPreviewModal = () =>
    setMcpPreviewModal({ isOpen: false, test: null, questions: [], loading: false });

  const handleStartVocabularyTest = () => {
    const test = previewModal.test;
    if (!test) return;
    window.location.href = `/vocabulary/test/${test.test_id || test._id || test.id}/settings`;
  };

  const handleStartMcpTest = () => {
    const test = mcpPreviewModal.test;
    if (!test) return;
    window.location.href = `/multiple-choice/test/${test.test_id || test._id || test.id}/settings`;
  };

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
    } catch {
      setTopContributors([]);
    } finally {
      setLoadingContributors(false);
    }
  };

  const fetchLatestUsers = async () => {
    try {
      setLoadingLatestUsers(true);
      const users = await fetchWithRetry(() => userService.getLatestUsers(8));
      setLatestUsers(users || []);
      setLatestUsersLimit(8);
      setShowAllLatestUsers(false);
    } catch {
      setLatestUsers([]);
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
    } catch {}
    finally {
      setLoadingMoreLatestUsers(false);
    }
  };

  const handleHideLatestUsers = () => setShowAllLatestUsers(false);

  const fetchReviews = async () => {
    try {
      setReviewLoading(true);
      setReviewError(null);
      const [reviewsResponse, statsResponse] = await Promise.all([
        fetchWithRetry(() => getAllReviews({ limit: 20, offset: 0 })),
        fetchWithRetry(() => getReviewStatistics()),
      ]);
      if (reviewsResponse.success) {
        setReviews(reviewsResponse.data || []);
        if (reviewsResponse.statistics) setReviewStats(reviewsResponse.statistics);
      }
      if (statsResponse.success && statsResponse.data) setReviewStats(statsResponse.data);
    } catch {
      setReviews([]);
      setReviewError(null);
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
      const response = await createReview(reviewForm.rating, reviewForm.comment);
      if (response.success) {
        setToast({ isVisible: true, message: 'Đánh giá thành công!', type: 'success' });
        setReviewForm({ rating: 0, comment: '' });
        fetchReviews();
      } else {
        setToast({ isVisible: true, message: 'Có lỗi xảy ra khi đánh giá', type: 'error' });
      }
    } catch (err) {
      setToast({ isVisible: true, message: err.message || 'Có lỗi xảy ra', type: 'error' });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleTestClick = (test) => {
    if (!test.test_id) return;
    if (test.test_type === 'vocabulary') navigate(`/vocabulary/test/${test.test_id}/settings`);
    else if (test.test_type === 'multiple_choice') navigate(`/multiple-choice/test/${test.test_id}/settings`);
    else navigate(`/test/${test.test_id}`);
  };

  const handleContributorClick = (contributor) => setContributorModal({ isOpen: true, contributor });
  const handleUserInfoClick = (u) => setUserInfoModal({ isOpen: true, user: u });

  const filteredTopics = useMemo(() => {
    let list = [...allTopics];
    const q = filters.searchTerm.trim().toLowerCase();
    if (q) list = list.filter(t => (t.mainTopic || "").toLowerCase().includes(q));
    if (filters.testType && filters.testType !== 'all') {
      list = list.filter(t => {
        if (filters.testType === 'vocabulary') return t.types.includes('vocabulary');
        if (filters.testType === 'multiple-choice') return t.types.includes('multiple-choice');
        if (filters.testType === 'grammar') return t.types.includes('grammar');
        return true;
      });
    }
    if (filters.status && filters.status !== 'all') {
      if (filters.status === 'active') list = list.filter(t => t.testCount > 0);
      else if (filters.status === 'empty') list = list.filter(t => t.testCount === 0);
    }
    list.sort((a, b) => {
      let vA, vB;
      if (filters.sortBy === "testCount") { vA = a.testCount; vB = b.testCount; }
      else if (filters.sortBy === "questions") { vA = a.total_questions || 0; vB = b.total_questions || 0; }
      else if (filters.sortBy === "views") { vA = a.views || 0; vB = b.views || 0; }
      else { vA = (a.mainTopic || "").toLowerCase(); vB = (b.mainTopic || "").toLowerCase(); }
      if (vA < vB) return filters.sortOrder === "asc" ? -1 : 1;
      if (vA > vB) return filters.sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [allTopics, filters.searchTerm, filters.testType, filters.status, filters.sortBy, filters.sortOrder]);

  useEffect(() => {
    setPagination(p => ({ ...p, currentPage: 1 }));
  }, [filters.searchTerm, filters.testType, filters.status, filters.sortBy, filters.sortOrder]);

  const totalPages = Math.ceil(filteredTopics.length / pagination.itemsPerPage);
  const currentTopics = filteredTopics.slice(
    (pagination.currentPage - 1) * pagination.itemsPerPage,
    pagination.currentPage * pagination.itemsPerPage
  );

  const totalTests = allTopics.reduce((sum, t) => sum + (t.testCount || 0), 0);
  const totalQuestions = allTopics.reduce((sum, t) => sum + (t.total_questions || 0), 0);

  return (
    <MainLayout maxWidth="full" className="!px-0 !py-0">
      <div className="min-h-screen text-slate-900" style={{ background: "linear-gradient(to bottom right, #bae6fd, #dbeafe, #d1fae5)" }}>

        {/* ───────── HEADER ───────── */}
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 pt-4 pb-3">
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-1.5">
            Thư viện <span className="text-indigo-700">chủ đề học tập</span>
          </h1>
          <p className="text-slate-600 text-sm font-medium mb-3">
            Khám phá hàng trăm chủ đề, luyện tập từ vựng và trắc nghiệm được tạo bởi cộng đồng.
          </p>
          {/* Vivid pill badges — giống VocabularyTestTake top bar */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-violet-800 bg-violet-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-md">
              <span className="inline-flex h-2 w-2 rounded-full bg-lime-400" />
              Quiz Smart
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-sky-800 bg-sky-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-md">
              📚 {allTopics.length} chủ đề
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-fuchsia-800 bg-fuchsia-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-md">
              📝 {totalTests} bài test
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-emerald-800 bg-emerald-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-md">
              ❓ {totalQuestions.toLocaleString()} câu hỏi
            </span>
            {reviewStats.total_reviews > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-amber-700 bg-amber-500 px-2.5 py-0.5 text-[11px] font-bold text-amber-950 shadow-md">
                ⭐ {Number(reviewStats.average_rating || 0).toFixed(1)} ({reviewStats.total_reviews} đánh giá)
              </span>
            )}
          </div>
        </div>

        {/* ───────── MAIN CONTENT ───────── */}
        <div className="max-w-[1600px] mx-auto px-3 md:px-5 pb-6">
          {/* Filter bar */}
          <div className="mb-5">
            <SmartFilterBar filters={filters} setFilters={setFilters} />
          </div>

          {/* 2-column grid */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">

            {/* ── Main column ── */}
            <div className="xl:col-span-9 space-y-5">

              {/* Topic Grid section */}
              <div ref={topicListRef} className="rounded-2xl overflow-hidden shadow-2xl shadow-blue-900/40">
                {/* Vivid blue gradient header */}
                <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700">
                  <div className="h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                  <div className="px-4 md:px-5 py-3.5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/25 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-base font-black text-white">Danh sách chủ đề</h2>
                      {!loadingTopics && (
                        <p className="text-xs text-blue-100/80 mt-0.5">
                          {filters.searchTerm
                            ? `${filteredTopics.length} kết quả cho "${filters.searchTerm}"`
                            : `${filteredTopics.length} chủ đề`}
                        </p>
                      )}
                    </div>
                    {!loadingTopics && filteredTopics.length > 0 && (
                      <div className="text-right flex-shrink-0 px-3 py-1.5 rounded-full bg-white/15 border border-white/20">
                        <span className="text-base font-black text-white">{filteredTopics.length}</span>
                        <span className="text-xs text-blue-100/80 ml-1">chủ đề</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Grid content */}
                <div className="p-3 md:p-4 bg-gradient-to-br from-sky-100 to-blue-50">
                  {loadingTopics ? (
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                  ) : filteredTopics.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <div className="w-20 h-20 rounded-full bg-white border-2 border-sky-200 flex items-center justify-center mb-4 text-4xl shadow-md">
                        📂
                      </div>
                      <h3 className="text-lg font-bold text-slate-700 mb-1">Không tìm thấy chủ đề</h3>
                      <p className="text-sm text-slate-500">Thử thay đổi từ khóa tìm kiếm</p>
                    </div>
                  ) : (
                    <TopicGrid
                      topics={currentTopics}
                      onOpenModal={(mainTopic, type) => setModalState({ isOpen: true, mainTopic, type })}
                    />
                  )}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-center mt-6">
                      <div className="bg-white rounded-2xl px-4 py-3 border-2 border-sky-300 shadow-md">
                        <Pagination
                          currentPage={pagination.currentPage}
                          totalPages={totalPages}
                          itemsPerPage={pagination.itemsPerPage}
                          totalItems={filteredTopics.length}
                          onPageChange={(p) => {
                            setPagination(x => ({ ...x, currentPage: p }));
                            topicListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Top tests hot */}
              {loadingTopTaken ? (
                <div className="rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 p-6 flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-sm text-white/80 font-medium">Đang tải bài test hot...</span>
                </div>
              ) : (
                <TopTestsHot topTakenTests={topTakenTests} onTestClick={handleTestClick} />
              )}

              {/* Newest tests */}
              {loadingNewest ? (
                <div className="rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-700 p-6 flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-sm text-white/80 font-medium">Đang tải bài test mới...</span>
                </div>
              ) : (
                <NewestTests
                  newestTests={newestTests}
                  onPreviewVocabulary={handlePreviewVocabulary}
                  onPreviewMCP={handlePreviewMCP}
                />
              )}
            </div>

            {/* ── Sidebar ── */}
            <div className="xl:col-span-3">
              {(loadingContributors || loadingLatestUsers) ? (
                <div className="rounded-2xl border-[3px] border-amber-500 bg-gradient-to-br from-amber-200 to-orange-300 p-6 flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-amber-700/40 border-t-amber-700 rounded-full animate-spin" />
                  <span className="text-sm text-amber-900 font-bold">Đang tải...</span>
                </div>
              ) : (
                <ModernSidebar
                  topContributors={topContributors}
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

          {/* Review section */}
          <div ref={reviewSectionRef} className="mt-5">
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

        {/* Floating action buttons */}
        <div className="fixed bottom-5 right-5 md:bottom-7 md:right-7 z-50 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => topicListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="w-11 h-11 md:w-12 md:h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg shadow-indigo-900/40 border-2 border-indigo-800 hover:scale-110 transition-all duration-200 flex items-center justify-center"
            aria-label="Đến danh sách chủ đề"
            title="Đến danh sách chủ đề"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => reviewSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="w-11 h-11 md:w-12 md:h-12 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-full shadow-lg shadow-fuchsia-900/40 border-2 border-fuchsia-800 hover:scale-110 transition-all duration-200 flex items-center justify-center"
            aria-label="Đến phần đánh giá"
            title="Đến phần đánh giá"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
        </div>

        {/* Modals */}
        <TestTopicModal
          isOpen={modalState.isOpen}
          onClose={() => setModalState({ isOpen: false, mainTopic: null, type: null })}
          mainTopic={modalState.mainTopic}
          type={modalState.type}
        />

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

        <UserInfoModal
          isOpen={userInfoModal.isOpen}
          onClose={() => setUserInfoModal({ isOpen: false, user: null })}
          user={userInfoModal.user}
        />

        <Toast
          isVisible={toast.isVisible}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ isVisible: false, message: '', type: 'success' })}
        />
      </div>
    </MainLayout>
  );
};

export default TopicListPage;
