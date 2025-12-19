import React, { useEffect, useMemo, useState, useContext } from "react";
import testService from "../services/testService";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import EmptyState from "../components/EmptyState";
import Pagination from "../components/Pagination";
import TestTopicCard from "../components/TestTopicCard";
import TestTopicModal from "../components/TestTopicModal";
import TestLayout from "../layout/TestLayout";
import AuthContext from "../context/AuthContext";

const cx = (...a) => a.filter(Boolean).join(" ");

const TopicListPage = () => {
  const { user } = useContext(AuthContext);

  const [vocabularyTopics, setVocabularyTopics] = useState([]);
  const [multipleChoiceTopics, setMultipleChoiceTopics] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1 filter chung cho cả trang
  const [filters, setFilters] = useState({
    searchTerm: "",
    sortBy: "name", // name | testCount
    sortOrder: "asc", // asc | desc
    type: "all", // all | vocabulary | multiple-choice
  });

  // 1 pagination chung
  const [pagination, setPagination] = useState({
    currentPage: 1,
    itemsPerPage: 12,
  });

  const [modalState, setModalState] = useState({
    isOpen: false,
    mainTopic: null,
    type: null,
  });

  const config = {
    title: "Chủ đề học tập",
    description:
      "Khám phá chủ đề từ vựng và trắc nghiệm trong một trang duy nhất. Tìm nhanh, lọc gọn, học liền.",
    breadcrumbItems: [
      { label: "Trang chủ", path: "/" },
      { label: "Chủ đề học tập", path: "/topics" },
    ],
  };

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

      if (!Array.isArray(vocabResponse) || !Array.isArray(mcResponse)) {
        throw new Error("API responses are not arrays");
      }

      const vocabMainTopics = vocabResponse || [];
      const mcMainTopics = mcResponse || [];

      const vocabTopicsWithSubs = await Promise.all(
        vocabMainTopics.map(async (mainTopic) => {
          try {
            const subTopics = await testService.getVocabularySubTopicsByMainTopic(mainTopic);
            return {
              mainTopic,
              subTopics: subTopics || [],
              testCount: subTopics ? subTopics.length : 0,
              type: "vocabulary",
            };
          } catch (err) {
            return { mainTopic, subTopics: [], testCount: 0, type: "vocabulary" };
          }
        })
      );

      const mcTopicsWithSubs = await Promise.all(
        mcMainTopics.map(async (mainTopic) => {
          try {
            const subTopics = await testService.getMultipleChoiceSubTopicsByMainTopic(mainTopic);
            return {
              mainTopic,
              subTopics: subTopics || [],
              testCount: subTopics ? subTopics.length : 0,
              type: "multiple-choice",
            };
          } catch (err) {
            return { mainTopic, subTopics: [], testCount: 0, type: "multiple-choice" };
          }
        })
      );

      setVocabularyTopics(vocabTopicsWithSubs);
      setMultipleChoiceTopics(mcTopicsWithSubs);
    } catch (err) {
      setError(`Không thể tải danh sách chủ đề: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const allTopics = useMemo(() => {
    // gộp 2 loại vào 1 list
    return [...vocabularyTopics, ...multipleChoiceTopics];
  }, [vocabularyTopics, multipleChoiceTopics]);

  const stats = useMemo(() => {
    const vocabCount = vocabularyTopics.length;
    const mcCount = multipleChoiceTopics.length;
    const total = vocabCount + mcCount;

    const vocabSubs = vocabularyTopics.reduce((sum, t) => sum + (t.testCount || 0), 0);
    const mcSubs = multipleChoiceTopics.reduce((sum, t) => sum + (t.testCount || 0), 0);

    return { total, vocabCount, mcCount, vocabSubs, mcSubs };
  }, [vocabularyTopics, multipleChoiceTopics]);

  const filteredTopics = useMemo(() => {
    let list = [...allTopics];

    // filter type (tùy chọn)
    if (filters.type !== "all") {
      list = list.filter((t) => t.type === filters.type);
    }

    // search
    if (filters.searchTerm.trim()) {
      const q = filters.searchTerm.toLowerCase();
      list = list.filter(
        (t) =>
          t.mainTopic.toLowerCase().includes(q) ||
          (t.subTopics || []).some((s) => String(s).toLowerCase().includes(q))
      );
    }

    // sort
    list.sort((a, b) => {
      let aValue, bValue;
      if (filters.sortBy === "testCount") {
        aValue = a.testCount || 0;
        bValue = b.testCount || 0;
      } else {
        aValue = a.mainTopic.toLowerCase();
        bValue = b.mainTopic.toLowerCase();
      }
      if (filters.sortOrder === "asc") return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
    });

    return list;
  }, [allTopics, filters]);

  // reset page khi filter đổi
  useEffect(() => {
    setPagination((p) => ({ ...p, currentPage: 1 }));
  }, [filters.searchTerm, filters.sortBy, filters.sortOrder, filters.type]);

  const totalPages = Math.ceil(filteredTopics.length / pagination.itemsPerPage);
  const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
  const endIndex = startIndex + pagination.itemsPerPage;
  const currentTopics = filteredTopics.slice(startIndex, endIndex);

  const pickColor = (i) => (["green", "blue", "indigo", "purple", "orange"][i % 5]);

  if (loading) return <LoadingSpinner message="Đang tải danh sách chủ đề..." />;
  if (error) return <ErrorMessage error={error} onRetry={fetchAllTopics} />;

  const hasActiveFilters =
    filters.searchTerm || filters.sortBy !== "name" || filters.sortOrder !== "asc" || filters.type !== "all";

  return (
    <TestLayout
      title={config.title}
      description={config.description}
      breadcrumbItems={config.breadcrumbItems}
      type="topics"
    >
      {/* HERO */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-200/70 bg-white mb-6 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.35)]">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 via-white to-emerald-50" />
        <div className="relative p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="max-w-2xl">
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">
                Chủ đề học tập
              </h1>
              <p className="mt-2 text-gray-600">
                Tất cả <b>từ vựng</b> và <b>trắc nghiệm</b> được hiển thị chung một nơi — tìm nhanh, lọc gọn, học liền.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatPill label="Tổng chủ đề" value={stats.total} />
              <StatPill label="Từ vựng" value={stats.vocabCount} tone="green" />
              <StatPill label="Trắc nghiệm" value={stats.mcCount} tone="blue" />
              <StatPill label="Phân mục TV" value={stats.vocabSubs} tone="green" />
              <StatPill label="Bài TN" value={stats.mcSubs} tone="blue" />
            </div>
          </div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="sticky top-3 z-10 mb-6">
        <div className="relative rounded-2xl overflow-hidden border border-gray-200/70 bg-white shadow-[0_10px_30px_-18px_rgba(0,0,0,0.35)]">
          <div className="absolute inset-0 bg-white/70 backdrop-blur-xl" />
          <div className="relative p-4 md:p-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              {/* Search */}
              <div className="flex-1 max-w-2xl">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35m1.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Tìm theo chủ đề chính hoặc phân mục con..."
                    value={filters.searchTerm}
                    onChange={(e) => setFilters((f) => ({ ...f, searchTerm: e.target.value }))}
                    className="block w-full pl-11 pr-3 py-2.5 border border-gray-200 rounded-xl text-base text-gray-900 bg-white/90 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Type chips (không phải tab, chỉ là filter nhẹ) */}
                <Chip
                  active={filters.type === "all"}
                  onClick={() => setFilters((f) => ({ ...f, type: "all" }))}
                >
                  Tất cả
                </Chip>
                <Chip
                  active={filters.type === "vocabulary"}
                  onClick={() => setFilters((f) => ({ ...f, type: "vocabulary" }))}
                >
                  Từ vựng
                </Chip>
                <Chip
                  active={filters.type === "multiple-choice"}
                  onClick={() => setFilters((f) => ({ ...f, type: "multiple-choice" }))}
                >
                  Trắc nghiệm
                </Chip>

                <div className="h-8 w-px bg-gray-200 mx-1 hidden md:block" />

                <div className="flex items-center bg-white/90 rounded-xl border border-gray-200 p-1">
                  <select
                    value={filters.sortBy}
                    onChange={(e) => setFilters((f) => ({ ...f, sortBy: e.target.value }))}
                    className="px-3 py-1.5 text-sm border-0 rounded-lg bg-transparent text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="name">Sắp xếp theo tên</option>
                    <option value="testCount">Sắp xếp theo số lượng</option>
                  </select>
                </div>

                <button
                  onClick={() =>
                    setFilters((f) => ({ ...f, sortOrder: f.sortOrder === "asc" ? "desc" : "asc" }))
                  }
                  className="inline-flex items-center px-3 py-2 text-sm bg-white/90 border border-gray-200 rounded-xl text-gray-900 hover:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d={
                        filters.sortOrder === "asc"
                          ? "M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
                          : "M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"
                      }
                    />
                  </svg>
                  {filters.sortOrder === "asc" ? "Tăng dần" : "Giảm dần"}
                </button>

                {hasActiveFilters && (
                  <button
                    onClick={() =>
                      setFilters({ searchTerm: "", sortBy: "name", sortOrder: "asc", type: "all" })
                    }
                    className="inline-flex items-center px-3 py-2 text-sm bg-rose-50 border border-rose-200 text-rose-700 rounded-xl hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-500 transition"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Xóa lọc
                  </button>
                )}
              </div>
            </div>

            {/* tiny hint row */}
            <div className="mt-3 text-xs text-gray-500 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" /> Từ vựng
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" /> Trắc nghiệm
              </span>
              <span className="ml-auto hidden md:inline">
                Hiển thị: <b className="text-gray-700">{filteredTopics.length}</b> chủ đề
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      {filteredTopics.length === 0 ? (
        <EmptyState
          icon="inbox"
          title={filters.searchTerm ? "Không tìm thấy kết quả" : "Chưa có chủ đề nào"}
          description={
            filters.searchTerm
              ? `Không tìm thấy chủ đề phù hợp với "${filters.searchTerm}".`
              : "Hiện tại chưa có chủ đề từ vựng hoặc trắc nghiệm nào."
          }
          action={
            hasActiveFilters && (
              <button
                onClick={() =>
                  setFilters({ searchTerm: "", sortBy: "name", sortOrder: "asc", type: "all" })
                }
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition"
              >
                Xóa bộ lọc
              </button>
            )
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {currentTopics.map((topicData, idx) => (
              <TestTopicCard
                key={`${topicData.type}-${topicData.mainTopic}`}
                topic={topicData.mainTopic}
                mainTopic={topicData.mainTopic}
                testCount={topicData.testCount}
                type={topicData.type}
                color={pickColor(idx)}
                buttonLabel="Mở danh sách"
                onOpenModal={() =>
                  setModalState({
                    isOpen: true,
                    mainTopic: topicData.mainTopic,
                    type: topicData.type,
                  })
                }
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 relative rounded-2xl overflow-hidden shadow-[0_10px_30px_-18px_rgba(0,0,0,0.35)] border border-gray-200/70">
              <div className="absolute inset-0 bg-white/70 backdrop-blur-xl" />
              <div className="relative p-6">
                <Pagination
                  currentPage={pagination.currentPage}
                  totalPages={totalPages}
                  itemsPerPage={pagination.itemsPerPage}
                  totalItems={filteredTopics.length}
                  onPageChange={(page) => {
                    setPagination((p) => ({ ...p, currentPage: page }));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  onItemsPerPageChange={(n) => setPagination({ currentPage: 1, itemsPerPage: n })}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal */}
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

// Backward compatibility exports
export const MultipleChoiceListTopic = () => <TopicListPage />;
export const VocabularyListTopic = () => <TopicListPage />;

/* ---------------- small UI pieces ---------------- */

const StatPill = ({ label, value, tone = "slate" }) => {
  const map = {
    slate: "bg-white/80 text-gray-800 ring-gray-200",
    green: "bg-emerald-50 text-emerald-800 ring-emerald-100",
    blue: "bg-blue-50 text-blue-800 ring-blue-100",
  };
  return (
    <div className={cx("px-3 py-2 rounded-xl ring-1", map[tone] || map.slate)}>
      <div className="text-[11px] font-semibold opacity-80">{label}</div>
      <div className="text-lg font-extrabold leading-tight">{value}</div>
    </div>
  );
};

const Chip = ({ active, children, onClick }) => (
  <button
    onClick={onClick}
    className={cx(
      "px-3 py-2 rounded-xl text-sm font-semibold transition",
      "border focus:outline-none focus:ring-2 focus:ring-indigo-500",
      active
        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
        : "bg-white/90 text-gray-800 border-gray-200 hover:bg-white"
    )}
  >
    {children}
  </button>
);
