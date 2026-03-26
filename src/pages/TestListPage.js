import React, { useState, useEffect, useContext } from "react";
import { Link, useParams } from "react-router-dom";
import testService from "../services/testService";
import topicService from "../services/topicService";
import vocabularyService from "../services/vocabularyService";
import multipleChoiceService from "../services/multipleChoiceService";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import TestCard from "../components/TestCard";
import VocabularyPreviewModal from "../components/VocabularyPreviewModal";
import MCPPreviewModal from "../components/MCPPreviewModal";
import ExportVocabularyModal from "../components/ExportVocabularyModal";
import ExportMCPModal from "../components/ExportMCPModal";
import AuthContext from "../context/AuthContext";
import Pagination from "../components/Pagination";
import Header from "../components/Header";

const cx = (...a) => a.filter(Boolean).join(" ");

// ─── Smart Filter Bar ───────────────────────────────────────────────
const SmartFilterBar = ({ filters, setFilters, allTests, onViewModeChange, viewMode }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const uniqueCreators = [...new Set(allTests.map(t => t.created_by_full_name).filter(Boolean))].sort();

  const diffFilters = [
    { key: "all",    label: "Tất cả",     count: allTests.length,                                    color: "bg-white/20 hover:bg-white/30 text-white border-white/20",            activeColor: "bg-white text-indigo-700 border-white" },
    { key: "easy",   label: "🟢 Dễ",       count: allTests.filter(t => t.difficulty === "easy").length,   color: "bg-white/20 hover:bg-white/30 text-white border-white/20",            activeColor: "bg-emerald-400 text-white border-emerald-300" },
    { key: "medium", label: "🟡 Trung bình",count: allTests.filter(t => t.difficulty === "medium").length, color: "bg-white/20 hover:bg-white/30 text-white border-white/20",            activeColor: "bg-amber-400 text-white border-amber-300" },
    { key: "hard",   label: "🔴 Khó",       count: allTests.filter(t => t.difficulty === "hard").length,   color: "bg-white/20 hover:bg-white/30 text-white border-white/20",            activeColor: "bg-red-500 text-white border-red-400" },
  ];

  const selectClass = "w-full py-2 px-3 text-sm rounded-xl bg-white/15 border border-white/25 text-white focus:outline-none focus:bg-white/20 focus:border-white/40 transition-all duration-200 [&>option]:text-slate-800 [&>option]:bg-white";

  return (
    <div className="sticky top-4 z-40 mb-5">
      <div className="bg-gradient-to-r from-indigo-600 via-violet-700 to-purple-700 rounded-2xl shadow-2xl shadow-indigo-900/50 overflow-hidden">
        <div className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

        <div className="px-4 py-3 space-y-3">
          {/* Row 1: Search + view + expand */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Tìm kiếm bài test..."
                value={filters.searchTerm}
                onChange={e => setFilters(p => ({ ...p, searchTerm: e.target.value }))}
                className="w-full pl-10 pr-9 py-2.5 text-sm rounded-xl bg-white/15 border border-white/20 text-white placeholder:text-white/50 focus:bg-white/20 focus:border-white/40 focus:outline-none transition-all duration-200"
              />
              {filters.searchTerm && (
                <button onClick={() => setFilters(p => ({ ...p, searchTerm: "" }))}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* View mode */}
            <div className="flex bg-white/15 rounded-xl p-0.5 gap-0.5 flex-shrink-0">
              <button onClick={() => onViewModeChange("card")}
                className={cx("px-2.5 py-2 rounded-lg transition-all duration-200",
                  viewMode === "card" ? "bg-white text-indigo-700 shadow-sm" : "text-white/70 hover:text-white")}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button onClick={() => onViewModeChange("list")}
                className={cx("px-2.5 py-2 rounded-lg transition-all duration-200",
                  viewMode === "list" ? "bg-white text-indigo-700 shadow-sm" : "text-white/70 hover:text-white")}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>

            {/* Expand filters */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={cx("flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all duration-200 flex-shrink-0",
                isExpanded ? "bg-white text-indigo-700 border-white" : "bg-white/15 text-white border-white/20 hover:bg-white/25")}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
              Lọc
            </button>
          </div>

          {/* Row 2: Quick difficulty filters */}
          <div className="flex flex-wrap gap-2">
            {diffFilters.map(f => {
              const isActive = f.key === "all" ? !filters.difficulty : filters.difficulty === f.key;
              return (
                <button key={f.key}
                  onClick={() => setFilters(p => ({ ...p, difficulty: f.key === "all" ? "" : f.key }))}
                  className={cx("px-3 py-1.5 rounded-xl text-xs font-bold border transition-all duration-200",
                    isActive ? f.activeColor : f.color)}>
                  {f.label} <span className="opacity-70">({f.count})</span>
                </button>
              );
            })}
          </div>

          {/* Advanced filters */}
          {isExpanded && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-white/20">
              <div>
                <label className="block text-xs font-bold text-white/80 mb-1.5">Sắp xếp theo tên</label>
                <select value={filters.sortName} onChange={e => setFilters(p => ({ ...p, sortName: e.target.value }))}
                  className={selectClass}>
                  <option value="">Mặc định</option>
                  <option value="asc">A → Z</option>
                  <option value="desc">Z → A</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-white/80 mb-1.5">Số câu hỏi</label>
                <select value={filters.questionRange} onChange={e => setFilters(p => ({ ...p, questionRange: e.target.value }))}
                  className={selectClass}>
                  <option value="">Tất cả</option>
                  <option value="0-10">1 – 10 câu</option>
                  <option value="11-30">11 – 30 câu</option>
                  <option value="31-50">31 – 50 câu</option>
                  <option value="51-100">51 – 100 câu</option>
                  <option value="101+">100+ câu</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-white/80 mb-1.5">Tác giả</label>
                <select value={filters.creator} onChange={e => setFilters(p => ({ ...p, creator: e.target.value }))}
                  className={selectClass}>
                  <option value="">Tất cả tác giả</option>
                  {uniqueCreators.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>
    </div>
  );
};

// ─── Test Grid ───────────────────────────────────────────────────────
const TestGrid = ({ tests, viewMode, onPreviewVocabulary, onPreviewMCP, typeConfig }) => {
  if (tests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-2xl bg-blue-100 border border-blue-200 flex items-center justify-center text-4xl mb-4">
          🔍
        </div>
        <h3 className="text-lg font-bold text-slate-700 mb-1">Không tìm thấy bài test</h3>
        <p className="text-sm text-slate-400">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
      </div>
    );
  }

  const CardComponent = typeConfig.TestCard;

  return (
    <div className={cx(
      viewMode === "card"
        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
        : "flex flex-col gap-2.5"
    )}>
      {tests.map(test => (
        <CardComponent
          key={test._id || test.id}
          test={test}
          viewMode={viewMode}
          onPreviewVocabulary={onPreviewVocabulary}
          onPreviewMCP={onPreviewMCP}
        />
      ))}
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────
const TestListPage = () => {
  const { mainTopic, subTopic } = useParams();
  const { user } = useContext(AuthContext);

  const [allTests, setAllTests] = useState([]);
  const [filteredTests, setFilteredTests] = useState([]);
  const [topTakenTests, setTopTakenTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [topicInfo, setTopicInfo] = useState({ mainTopic, subTopic });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [filters, setFilters] = useState({
    searchTerm: "", sortName: "", sortQuestions: "",
    difficulty: "", creator: "", questionRange: "",
  });
  const [viewMode, setViewMode] = useState("card");

  const [previewModal, setPreviewModal] = useState({ isOpen: false, test: null, vocabularies: [], loading: false, isPlaying: false });
  const [mcpPreviewModal, setMcpPreviewModal] = useState({ isOpen: false, test: null, questions: [], loading: false });
  const [exportVocabularyModal, setExportVocabularyModal] = useState({ isOpen: false, vocabularies: [], testTitle: "", createdBy: "" });
  const [exportMcpModal, setExportMcpModal] = useState({ isOpen: false, questions: [], testTitle: "", testMainTopic: "", testSubTopic: "", createdBy: "" });

  const typeConfig = {
    loadingMessage: "Đang tải...",
    errorMessage: "Lỗi tải dữ liệu",
    emptyTitle: "Chưa có bài kiểm tra",
    emptyDesc: "Chưa có dữ liệu cho chủ đề này.",
    backLink: "/topics",
    backText: "Quay lại chủ đề",
    TestCard: ({ onPreviewVocabulary, onPreviewMCP, ...rest }) => {
      const testType = rest.test?.test_type || "vocabulary";
      const normalizedType = testType === "multiple_choice" ? "multiple-choice" : "vocabulary";
      const onPreview =
        normalizedType === "vocabulary" && typeof onPreviewVocabulary === "function" ? onPreviewVocabulary :
        normalizedType === "multiple-choice" && typeof onPreviewMCP === "function" ? onPreviewMCP :
        undefined;
      return <TestCard {...rest} type={normalizedType} onPreview={onPreview} />;
    },
    hasPreview: true,
  };

  useEffect(() => {
    const fetchTests = async () => {
      try {
        setLoading(true);
        setError(null);
        if (!mainTopic || !subTopic) throw new Error("Thiếu thông tin chủ đề");
        const allTestsData = await testService.getTestsByTopic(mainTopic, subTopic);
        const filteredByType = allTestsData.filter(t => t.status === "active");
        const enhanced = filteredByType.map(test => ({
          ...test,
          main_topic: test.topic_id?.name || mainTopic,
          sub_topic: subTopic,
          topic_name: test.topic_id?.name,
          subtopic_name: subTopic,
        }));
        setAllTests(enhanced);
        if (enhanced.length > 0 && enhanced[0].topic_id) {
          setTopicInfo({ mainTopic: enhanced[0].topic_id.name || mainTopic, subTopic });
        } else {
          setTopicInfo({ mainTopic, subTopic });
        }
        try {
          const subtopics = await topicService.getSubTopicsByMainTopic(mainTopic, false);
          const current = subtopics.find(st => st.name === subTopic);
          if (current) await topicService.incrementSubTopicViews(mainTopic, current.subtopic_id, "vocabulary");
        } catch {}
      } catch (err) {
        setError(err.message || "Lỗi tải dữ liệu");
      } finally {
        setLoading(false);
      }
    };
    fetchTests();
  }, [mainTopic, subTopic]);

  useEffect(() => {
    const fetchTopTaken = async () => {
      try {
        const subtopics = await topicService.getSubTopicsByMainTopic(mainTopic, false);
        const current = subtopics.find(st => st.name === subTopic);
        if (current) {
          const tests = await testService.getTopTakenTests({ limit: 5, topic_id: current.topic_id, subtopic_id: current.subtopic_id });
          setTopTakenTests(tests);
        } else {
          setTopTakenTests([]);
        }
      } catch {
        setTopTakenTests([]);
      }
    };
    if (mainTopic && subTopic) fetchTopTaken();
  }, [mainTopic, subTopic]);

  const getQuestionCount = t =>
    Number(t.total_questions ?? t.totalQuestions ?? t.question_count ?? t.questions_count ?? 0);

  useEffect(() => {
    let result = [...allTests];
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      result = result.filter(t => (t.test_title || "").toLowerCase().includes(term));
    }
    if (filters.difficulty) result = result.filter(t => t.difficulty === filters.difficulty);
    if (filters.creator) result = result.filter(t => t.created_by_full_name === filters.creator);
    if (filters.questionRange) {
      result = result.filter(t => {
        const q = getQuestionCount(t);
        switch (filters.questionRange) {
          case "0-10":   return q <= 10;
          case "11-30":  return q >= 11 && q <= 30;
          case "31-50":  return q >= 31 && q <= 50;
          case "51-100": return q >= 51 && q <= 100;
          case "101+":   return q >= 101;
          default: return true;
        }
      });
    }
    if (filters.sortName) {
      result.sort((a, b) => {
        const av = (a.test_title || "").toLowerCase();
        const bv = (b.test_title || "").toLowerCase();
        return filters.sortName === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    setFilteredTests(result);
    setCurrentPage(1);
  }, [allTests, filters]);

  const handlePreviewVocabulary = async test => {
    setPreviewModal(p => ({ ...p, isOpen: true, test, loading: true }));
    try {
      const id = test._id || test.id || test.test_id;
      const v = await vocabularyService.getAllVocabulariesByTestId(id);
      setPreviewModal(p => ({ ...p, vocabularies: v || [], loading: false }));
    } catch {
      setPreviewModal(p => ({ ...p, vocabularies: [], loading: false }));
    }
  };

  const handlePreviewMCP = async test => {
    setMcpPreviewModal(p => ({ ...p, isOpen: true, test, loading: true }));
    try {
      const id = test._id || test.id || test.test_id;
      const q = await multipleChoiceService.getQuestionsByTestId(id);
      setMcpPreviewModal(p => ({ ...p, questions: q || [], loading: false }));
    } catch {
      setMcpPreviewModal(p => ({ ...p, questions: [], loading: false }));
    }
  };

  const handleCloseModal = () =>
    setPreviewModal({ isOpen: false, test: null, vocabularies: [], loading: false, isPlaying: false });
  const handleCloseMcpModal = () =>
    setMcpPreviewModal({ isOpen: false, test: null, questions: [], loading: false });

  const handlePlayAudio = text => {
    if (previewModal.isPlaying) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.onend = () => setPreviewModal(p => ({ ...p, isPlaying: false }));
    setPreviewModal(p => ({ ...p, isPlaying: true }));
    window.speechSynthesis.speak(u);
  };

  const handleStartTest = () => {
    const id = previewModal.test._id || previewModal.test.id || previewModal.test.test_id;
    window.location.href = `/vocabulary/test/${id}/settings`;
  };
  const handleStartMcpTest = () => {
    const id = mcpPreviewModal.test._id || mcpPreviewModal.test.id || mcpPreviewModal.test.test_id;
    window.location.href = `/multiple-choice/test/${id}/settings`;
  };
  const handleExportVocabulary = () =>
    setExportVocabularyModal({ isOpen: true, vocabularies: previewModal.vocabularies, testTitle: previewModal.test?.test_title || "", createdBy: previewModal.test?.created_by_full_name || "" });
  const handleExportMCP = () =>
    setExportMcpModal({ isOpen: true, questions: mcpPreviewModal.questions, testTitle: mcpPreviewModal.test?.test_title || "", testMainTopic: mcpPreviewModal.test?.main_topic || "", testSubTopic: mcpPreviewModal.test?.sub_topic || "", createdBy: mcpPreviewModal.test?.created_by_full_name || "" });

  const currentTests = filteredTests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredTests.length / itemsPerPage);

  // Stats
  const vocabCount = allTests.filter(t => t.test_type === "vocabulary").length;
  const mcpCount = allTests.filter(t => t.test_type === "multiple_choice").length;
  const totalQ = allTests.reduce((s, t) => s + getQuestionCount(t), 0);

  if (loading) return <LoadingSpinner message="Đang tải bài test..." />;
  if (error) return <ErrorMessage error={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(to bottom right, #bae6fd, #dbeafe, #d1fae5)" }}>
      <Header />

      {/* ── Header ── */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 pt-3 pb-2">
        {/* Breadcrumb */}
        <nav className="flex flex-wrap items-center gap-1 text-xs text-slate-500 mb-2">
          <Link to="/topics" className="hover:text-indigo-700 font-bold text-slate-600 flex items-center gap-0.5">
            🏠 Trang chủ
          </Link>
          <span className="text-slate-400">›</span>
          <Link to="/topics" className="hover:text-indigo-700 font-bold text-slate-600">Chủ đề</Link>
          <span className="text-slate-400">›</span>
          <span className="text-indigo-600 font-bold truncate max-w-[100px] sm:max-w-none">{topicInfo.mainTopic}</span>
          <span className="text-slate-400">›</span>
          <span className="text-slate-900 font-extrabold truncate max-w-[120px] sm:max-w-none">{topicInfo.subTopic}</span>
        </nav>

        {/* Title row + pills in one compact block */}
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">{topicInfo.subTopic}</h1>
          <span className="text-slate-500 text-sm hidden sm:inline">— Chọn bài test và luyện tập ngay</span>
        </div>

        {/* Vivid pill badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full border-2 border-violet-800 bg-violet-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-md">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-lime-400" />
            {topicInfo.mainTopic}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border-2 border-sky-800 bg-sky-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-md">
            📋 {allTests.length} bài
          </span>
          {vocabCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border-2 border-fuchsia-800 bg-fuchsia-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-md">
              📚 {vocabCount} từ vựng
            </span>
          )}
          {mcpCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border-2 border-indigo-800 bg-indigo-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-md">
              📝 {mcpCount} trắc nghiệm
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full border-2 border-emerald-800 bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-md">
            ❓ {totalQ.toLocaleString()} câu
          </span>
        </div>

        {/* Hot strip — compact */}
        {topTakenTests.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-500 font-extrabold">🔥 Hot:</span>
            {topTakenTests.slice(0, 3).map((t, i) => (
              <div key={t.test_id || i}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 border border-orange-300 text-[11px] text-orange-800">
                <span className="font-extrabold text-orange-600">#{i + 1}</span>
                <span className="font-bold line-clamp-1 max-w-[120px] sm:max-w-[160px]">{t.test_title}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Main Content ── */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 pb-8 pt-1">
        {/* Filter bar */}
        <SmartFilterBar
          filters={filters}
          setFilters={setFilters}
          allTests={allTests}
          onViewModeChange={setViewMode}
          viewMode={viewMode}
        />

        {/* Test grid section */}
        <div className="rounded-2xl overflow-hidden shadow-2xl shadow-blue-900/40">
          {/* Section header */}
          <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-white">📋 Danh sách bài test</span>
              <span className="text-xs text-blue-200">
                {filters.searchTerm ? `· ${filteredTests.length} kết quả` : ""}
              </span>
            </div>
            <span className="bg-white/20 border border-white/30 text-white font-black text-sm px-2.5 py-0.5 rounded-full">
              {filteredTests.length}
            </span>
          </div>

          {/* Body */}
          <div className="bg-blue-50 p-3 sm:p-4">
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
                <div className="bg-blue-100 rounded-2xl px-4 py-3 border border-blue-200 shadow-sm">
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
          </div>
        </div>

        {/* Back button */}
        <div className="text-center mt-6">
          <Link to={typeConfig.backLink}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 border-[3px] border-teal-800 text-white font-extrabold text-sm transition-all duration-200 shadow-lg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {typeConfig.backText}
          </Link>
        </div>
      </div>

      {/* Modals */}
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
          <ExportVocabularyModal
            isOpen={exportVocabularyModal.isOpen}
            onClose={() => setExportVocabularyModal({ isOpen: false, vocabularies: [], testTitle: "", createdBy: "" })}
            vocabularies={exportVocabularyModal.vocabularies}
            testTitle={exportVocabularyModal.testTitle}
            createdBy={exportVocabularyModal.createdBy}
          />
          <ExportMCPModal
            isOpen={exportMcpModal.isOpen}
            onClose={() => setExportMcpModal({ isOpen: false, questions: [], testTitle: "", testMainTopic: "", testSubTopic: "", createdBy: "" })}
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
