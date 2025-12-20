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

const StatCard = ({ label, value, tone }) => {
  const map = {
    blue: "bg-blue-600 text-white",
    green: "bg-emerald-600 text-white",
    dark: "bg-slate-900 text-white",
  };
  const cls = map[tone] || map.dark;

  return (
    <div className={cx("rounded-xl p-3", cls)}>
      <p className="text-[11px] font-extrabold uppercase tracking-wide opacity-95">{label}</p>
      <div className="mt-1 flex items-end gap-2">
        <span className="text-2xl font-black leading-none">{value}</span>
        <span className="text-xs font-semibold opacity-90 pb-0.5">mục</span>
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, label, count, tone }) => {
  const activeCls =
    tone === "green"
      ? "bg-emerald-600 text-white"
      : "bg-blue-600 text-white";

  const idleCls =
    tone === "green"
      ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
      : "bg-blue-50 text-blue-800 hover:bg-blue-100";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "h-10 px-3 rounded-lg text-sm font-extrabold transition inline-flex items-center gap-2",
        active ? activeCls : idleCls
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

  // ✅ default = trắc nghiệm
  const [activeTab, setActiveTab] = useState("multiple-choice");

  const [filters, setFilters] = useState({
    searchTerm: "",
    sortBy: "name", // name | testCount
    sortOrder: "asc", // asc | desc
  });

  const [pagination, setPagination] = useState({ currentPage: 1, itemsPerPage: 12 });
  const [modalState, setModalState] = useState({ isOpen: false, mainTopic: null, type: null });

  useEffect(() => {
    fetchAllTopics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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
    "h-10 px-3 text-sm font-extrabold rounded-lg transition active:scale-[0.98] inline-flex items-center justify-center gap-2 whitespace-nowrap";

  const btnAI = cx(btnBase, "bg-violet-600 text-white hover:bg-violet-700");
  const btnOutline = cx(btnBase, "bg-blue-900 text-slate-900 border border-slate-300 hover:bg-slate-50");
  const btnPrimary = cx(btnBase, "bg-emerald-600 text-white hover:bg-emerald-700");

  return (
    <TestLayout containerClassName="py-4">
      {/* Top row (compact) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
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

      {/* Stats (solid, đậm) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <StatCard
          label="Tổng số chủ đề"
          value={vocabularyTopics.length + multipleChoiceTopics.length}
          tone="dark"
        />
        <StatCard label="Từ vựng" value={vocabularyTopics.length} tone="blue" />
        <StatCard label="Trắc nghiệm" value={multipleChoiceTopics.length} tone="green" />
      </div>

      {/* Controls (compact) */}
      <Surface className="p-3 mb-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
          {/* Tabs */}
          <div className="lg:col-span-4 flex gap-2">
            <TabButton
              active={activeTab === "vocabulary"}
              onClick={() => setActiveTab("vocabulary")}
              label="Từ vựng"
              count={vocabularyTopics.length}
              tone="blue"
            />
            <TabButton
              active={activeTab === "multiple-choice"}
              onClick={() => setActiveTab("multiple-choice")}
              label="Trắc nghiệm"
              count={multipleChoiceTopics.length}
              tone="green"
            />
          </div>

          {/* Search */}
          <div className="lg:col-span-6">
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
          </div>

          {/* Sort */}
          <div className="lg:col-span-2 flex gap-2">
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
          {/* ✅ Card nhỏ + grid dày hơn */}
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
                onPageChange={(p) => {
                  setPagination((x) => ({ ...x, currentPage: p }));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            </div>
          )}
        </>
      )}

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
