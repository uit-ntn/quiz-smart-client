import React, { useEffect, useMemo, useState, useContext } from "react";
import { Link } from "react-router-dom";
import testService from "../services/testService";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import EmptyState from "../components/EmptyState";
import Pagination from "../components/Pagination";
import TestTopicCard from "../components/TestTopicCard";
import TestTopicModal from "../components/TestTopicModal";
import TestLayout from "../layout/TestLayout";
import AuthContext from "../context/AuthContext";

import CreateVocabularyTestButton from "../components/CreateVocabularyTestButton";
import CreateVocabularyWithAIButton from "../components/CreateVocabularyWithAIButton";
import CreateMultipleChoiceTestButton from "../components/CreateMultipleChoiceTestButton";

const cx = (...a) => a.filter(Boolean).join(" ");

/* ---------------- Icons ---------------- */
const Icon = {
  Search: (p) => (
    <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Swap: (p) => (
    <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  ),
};

/* ---------------- UI atoms (compact) ---------------- */
const Surface = ({ className = "", children }) => (
  <div className={cx("rounded-xl bg-white border border-slate-200 shadow-sm", className)}>
    {children}
  </div>
);

const TabButton = ({ active, onClick, label, count, tone }) => {
  const activeCls =
    tone === "green"
      ? "bg-green-600 text-white border-green-600"
      : "bg-blue-600 text-white border-blue-600";

  const idleCls =
    tone === "green"
      ? "bg-green-400 text-green-900 hover:bg-green-500 border-green-500"
      : "bg-blue-400 text-blue-900 hover:bg-blue-500 border-blue-500";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "h-10 px-3 rounded-lg text-xs font-extrabold transition inline-flex items-center gap-2 border z-20",
        active ? activeCls : idleCls,
        !active ? "animate-pulse" : ""
      )}
    >
      <span>{label}</span>
      <span className={cx("px-2 h-5 rounded-full text-[11px] font-black", active ? "bg-white/20" : "bg-white/70")}>
        {count}
      </span>
    </button>
  );
};

const TopicListPage = () => {
  const { user } = useContext(AuthContext);

  const [vocabularyTopics, setVocabularyTopics] = useState([]);
  const [multipleChoiceTopics, setMultipleChoiceTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isHighlighting, setIsHighlighting] = useState(() => {
    return !localStorage.getItem('hasSeenTopicHighlight');
  });

  // ✅ default = trắc nghiệm
  const [activeTab, setActiveTab] = useState("multiple-choice");

  const [filters, setFilters] = useState({
    searchTerm: "",
    sortBy: "name", // name | testCount
    sortOrder: "asc", // asc | desc
  });

  const [pagination, setPagination] = useState({ currentPage: 1, itemsPerPage: 16 });
  const [modalState, setModalState] = useState({ isOpen: false, mainTopic: null, type: null });

  useEffect(() => {
    fetchAllTopics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (isHighlighting) {
      const timer = setTimeout(() => {
        setIsHighlighting(false);
        localStorage.setItem('hasSeenTopicHighlight', 'true');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isHighlighting]);

  const fetchAllTopics = async () => {
    try {
      setLoading(true);
      setError(null);

      const [vocabResponse, mcResponse] = await Promise.all([
        testService.getAllVocabulariesMainTopics(),
        testService.getAllMultipleChoiceMainTopics(),
      ]);

      const process = async (topics, type, fetchSub) => {
        if (!Array.isArray(topics)) return [];
        return Promise.all(
          topics.map(async (main) => {
            try {
              const subs = await fetchSub(main);
              return { mainTopic: main, testCount: subs?.length || 0, type };
            } catch {
              return { mainTopic: main, testCount: 0, type };
            }
          })
        );
      };

      setVocabularyTopics(
        await process(vocabResponse, "vocabulary", testService.getVocabularySubTopicsByMainTopic)
      );
      setMultipleChoiceTopics(
        await process(mcResponse, "multiple-choice", testService.getMultipleChoiceSubTopicsByMainTopic)
      );
    } catch (err) {
      setError(err?.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  const currentTabTopics = useMemo(
    () => (activeTab === "vocabulary" ? vocabularyTopics : multipleChoiceTopics),
    [activeTab, vocabularyTopics, multipleChoiceTopics]
  );

  const filteredTopics = useMemo(() => {
    let list = [...currentTabTopics];

    const q = filters.searchTerm.trim().toLowerCase();
    if (q) list = list.filter((t) => (t.mainTopic || "").toLowerCase().includes(q));

    list.sort((a, b) => {
      const vA = filters.sortBy === "testCount" ? a.testCount : (a.mainTopic || "").toLowerCase();
      const vB = filters.sortBy === "testCount" ? b.testCount : (b.mainTopic || "").toLowerCase();
      if (vA < vB) return filters.sortOrder === "asc" ? -1 : 1;
      if (vA > vB) return filters.sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [currentTabTopics, filters]);

  useEffect(() => {
    setPagination((p) => ({ ...p, currentPage: 1 }));
  }, [activeTab, filters.searchTerm, filters.sortBy, filters.sortOrder]);

  const totalPages = Math.ceil(filteredTopics.length / pagination.itemsPerPage);
  const currentTopics = filteredTopics.slice(
    (pagination.currentPage - 1) * pagination.itemsPerPage,
    pagination.currentPage * pagination.itemsPerPage
  );

  if (loading) return <LoadingSpinner message="Đang tải dữ liệu..." />;
  if (error) return <ErrorMessage error={error} onRetry={fetchAllTopics} />;

  // Buttons: bớt margin/padding, không nhạt
  const btnBase =
    "h-10 px-3 min-w-[140px] text-sm font-extrabold rounded-lg transition active:scale-[0.98] inline-flex items-center justify-center gap-2 whitespace-nowrap z-20";

  const btnAI = cx(btnBase, "bg-violet-600 text-white hover:bg-violet-700");
  const btnOutline = cx(btnBase, "bg-blue-600 text-white hover:bg-blue-700");
  const btnPrimary = cx(btnBase, "bg-emerald-600 text-white hover:bg-emerald-700");

  return (
    <TestLayout containerClassName="py-4">
      {isHighlighting && (
        <div className="fixed inset-0 bg-black/50 z-10 transition-opacity duration-500" />
      )}
      {/* Top row (compact) */}
      <div className="hidden sm:flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-6">
        <div>
          <nav className="text-sm font-semibold text-slate-500">
            <Link to="/" className="hover:text-slate-900">Trang chủ</Link>
            <span className="mx-2 text-slate-300">/</span>
            <span className="text-slate-900">Chủ đề</span>
          </nav>
          <h1 className="mt-1 text-2xl font-black text-slate-900">Quản lý chủ đề</h1>
          <p className="mt-0.5 text-sm text-slate-600 font-semibold">
            Tạo và quản lý nhóm chủ đề học tập.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CreateVocabularyWithAIButton className={btnAI} />
          <CreateVocabularyTestButton className={btnOutline} />
          <CreateMultipleChoiceTestButton className={btnPrimary} />
        </div>
      </div>

      {/* Layout: Sidebar + Content */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <Surface className="lg:w-80 space-y-4 p-4">
          {/* Tabs Section */}
          <div className="flex justify-center lg:justify-start relative">
            <div className="flex gap-3">
              <TabButton
                active={activeTab === "vocabulary"}
                onClick={() => setActiveTab("vocabulary")}
                label="Từ vựng"
                count={vocabularyTopics.length}
                tone="green"
              />
              <TabButton
                active={activeTab === "multiple-choice"}
                onClick={() => setActiveTab("multiple-choice")}
                label="Trắc nghiệm"
                count={multipleChoiceTopics.length}
                tone="blue"
              />
            </div>
            {isHighlighting && (
              <>
                <div className="absolute -top-6 left-4 animate-bounce z-30">
                  <svg className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="absolute -top-6 right-4 animate-bounce z-30">
                  <svg className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </>
            )}
          </div>

          {/* Controls */}
          <Surface className="p-3">
            <div className="space-y-3">
              {/* Search */}
              <div className="relative">
                <Icon.Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={filters.searchTerm}
                  onChange={(e) => setFilters((f) => ({ ...f, searchTerm: e.target.value }))}
                  placeholder="Tìm chủ đề..."
                  className={cx(
                    "w-full h-10 pl-9 pr-3 rounded-lg text-sm font-semibold",
                    "bg-white border border-slate-300",
                    "focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                  )}
                />
              </div>

              {/* Sort */}
              <div className="flex gap-2">
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters((f) => ({ ...f, sortBy: e.target.value }))}
                  className={cx(
                    "flex-1 h-10 px-3 rounded-lg text-sm font-semibold",
                    "bg-white border border-slate-300",
                    "focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                  )}
                >
                  <option value="name">Tên</option>
                  <option value="testCount">Số lượng</option>
                </select>

                <button
                  type="button"
                  onClick={() => setFilters((f) => ({ ...f, sortOrder: f.sortOrder === "asc" ? "desc" : "asc" }))}
                  className={cx(
                    "h-10 w-10 rounded-lg",
                    "bg-white border border-slate-300",
                    "hover:bg-slate-50 transition flex items-center justify-center"
                  )}
                  title="Đổi chiều sắp xếp"
                >
                  <Icon.Swap className="w-4 h-4 text-slate-700" />
                </button>
              </div>
            </div>
          </Surface>
        </Surface>

        {/* Main Content */}
        <div className="flex-1">
          {/* Content */}
          {filteredTopics.length === 0 ? (
            <Surface className="p-8 text-center">
              <EmptyState
                icon="folder"
                title={`Không có chủ đề ${activeTab === "vocabulary" ? "từ vựng" : "trắc nghiệm"}`}
                description="Thử đổi từ khóa hoặc tạo mới."
              />
            </Surface>
          ) : (
            <>
              {totalPages > 1 && (
                <div className="mb-5 flex justify-center">
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
              )}

              {/* Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {currentTopics.map((t) => (
                  <TestTopicCard
                    key={`${t.type}-${t.mainTopic}`}
                    topic={t.mainTopic}
                    mainTopic={t.mainTopic}
                    testCount={t.testCount}
                    type={t.type}
                    onOpenModal={() => setModalState({ isOpen: true, mainTopic: t.mainTopic, type: t.type })}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-5 flex justify-center">
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
              )}
            </>
          )}
        </div>
      </div>

      <TestTopicModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, mainTopic: null, type: null })}
        mainTopic={modalState.mainTopic}
        type={modalState.type}
      />
    </TestLayout>
  );
};

export default TopicListPage;
export const MultipleChoiceListTopic = () => <TopicListPage />;
export const VocabularyListTopic = () => <TopicListPage />;
