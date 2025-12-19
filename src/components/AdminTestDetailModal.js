import React, { useEffect, useMemo, useState } from "react";
import testService from "../services/testService";
import multipleChoiceService from "../services/multipleChoiceService";
import vocabularyService from "../services/vocabularyService";
import grammarService from "../services/grammarService";
import AdminQuestionModal from "./AdminQuestionModal";

/* =========================
   Small UI helpers
========================= */
const Pill = ({ children, tone = "slate" }) => {
  const map = {
    slate: "bg-slate-200 text-slate-900 border-slate-300",
    blue: "bg-blue-200 text-blue-950 border-blue-400",
    green: "bg-emerald-200 text-emerald-950 border-emerald-600",
    amber: "bg-amber-200 text-amber-950 border-amber-500",
    rose: "bg-rose-200 text-rose-950 border-rose-600",
    violet: "bg-violet-200 text-violet-950 border-violet-500",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border ${map[tone]}`}>
      {children}
    </span>
  );
};

const Icon = {
  X: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Edit: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  ),
  Trash: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  ),
  Plus: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v14M5 12h14" />
    </svg>
  ),
  Spinner: (p) => (
    <svg className="animate-spin" viewBox="0 0 50 50" {...p}>
      <circle cx="25" cy="25" r="20" stroke="currentColor" strokeWidth="5" fill="none" className="opacity-25" />
      <path d="M45 25a20 20 0 00-20-20" stroke="currentColor" strokeWidth="5" className="opacity-80" />
    </svg>
  ),
};

const difficultyTone = (d) => (d === "easy" ? "green" : d === "medium" ? "amber" : d === "hard" ? "rose" : "slate");
const testStatusTone = (s) => (s === "active" ? "green" : s === "inactive" ? "amber" : s === "deleted" ? "rose" : "slate");
const visibilityTone = (v) => (v === "public" ? "green" : v === "private" ? "rose" : "slate");

const clamp = (txt = "", n = 120) => (txt.length > n ? txt.slice(0, n) + "…" : txt);

// Support cả 2 tên field (FE cũ vs BE)
const getTimeLimit = (t) => Number(t?.time_limit_minutes ?? t?.duration_minutes ?? 0) || 0;

const TestDetailModal = ({ isOpen, onClose, testId, onTestUpdated }) => {
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [editingTest, setEditingTest] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Question modal
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);

  // Edit form (đã thêm status + visibility + difficulty + time_limit_minutes)
  const [testFormData, setTestFormData] = useState({
    test_title: "",
    description: "",
    main_topic: "",
    sub_topic: "",
    test_type: "",
    total_questions: 0,
    time_limit_minutes: 0,
    difficulty: "medium",
    status: "active",
    visibility: "public",
  });

  // ESC close
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && testId) fetchTestDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, testId]);

  useEffect(() => {
    if (!test) return;

    setTestFormData({
      test_title: test.test_title || "",
      description: test.description || "",
      main_topic: test.main_topic || "",
      sub_topic: test.sub_topic || "",
      test_type: test.test_type || "",
      total_questions: Number(test.total_questions || 0),
      time_limit_minutes: getTimeLimit(test),
      difficulty: test.difficulty || "medium",
      status: test.status || "active",
      visibility: test.visibility || "public",
    });
  }, [test]);

  const fetchTestDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const t = await testService.getTestById(testId);
      setTest(t);

      let qs = [];
      if (t.test_type === "multiple_choice") {
        qs = await multipleChoiceService.getQuestionsByTestId(testId);
      } else if (t.test_type === "vocabulary") {
        qs = await vocabularyService.getAllVocabulariesByTestId(testId);
      } else if (t.test_type === "grammar") {
        qs = await grammarService.getGrammarsByTestId(testId);
      }

      setQuestions(Array.isArray(qs) ? qs : []);
      setCurrentPage(1);
    } catch (e) {
      console.error("Error fetching test details:", e);
      setError(e?.message || "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  };

  const handleTestUpdate = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      // gửi ưu tiên BE: time_limit_minutes
      // kèm duration_minutes để không gãy nếu BE/FE cũ đang dùng tên này
      const payload = {
        ...testFormData,
        time_limit_minutes: Number(testFormData.time_limit_minutes || 0),
        duration_minutes: Number(testFormData.time_limit_minutes || 0),
        total_questions: Number(testFormData.total_questions || 0),
      };

      await testService.updateTest(testId, payload);
      await fetchTestDetails();
      setEditingTest(false);
      onTestUpdated?.();
    } catch (e) {
      setError(e?.message || "Không thể cập nhật");
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = () => {
    setEditingQuestion(null);
    setQuestionModalOpen(true);
  };

  const handleEditQuestion = (q) => {
    setEditingQuestion(q);
    setQuestionModalOpen(true);
  };

  const handleQuestionSaved = () => {
    fetchTestDetails();
    setQuestionModalOpen(false);
    setEditingQuestion(null);
  };

  const handleDeleteQuestion = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xoá câu hỏi này không?")) return;

    try {
      setLoading(true);
      setError(null);

      if (test?.test_type === "multiple_choice") {
        await multipleChoiceService.deleteMultipleChoice(id);
      } else if (test?.test_type === "vocabulary") {
        await vocabularyService.deleteVocabulary(id);
      } else if (test?.test_type === "grammar") {
        await grammarService.deleteGrammar(id, localStorage.getItem("token"));
      }

      await fetchTestDetails();
      onTestUpdated?.();
    } catch (e) {
      console.error("Delete error:", e);
      setError(e?.message || "Không thể xoá câu hỏi. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const totalPages = useMemo(() => Math.max(1, Math.ceil(questions.length / itemsPerPage)), [questions.length, itemsPerPage]);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentQuestions = useMemo(
    () => questions.slice(startIndex, startIndex + itemsPerPage),
    [questions, startIndex, itemsPerPage]
  );

  const title = test?.test_title || "Chi tiết bài kiểm tra";
  const timeLimit = getTimeLimit(test);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative min-h-full flex items-center justify-center p-3">
        <div className="w-full max-w-6xl max-h-[92vh] rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden">
          {/* Header */}
          <div className="px-4 sm:px-5 py-3 border-b border-slate-200 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-base sm:text-lg font-semibold text-slate-900 truncate">{title}</div>

              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                <Pill tone="blue">{test?.test_type || "—"}</Pill>

                {/* Chế độ */}
                <Pill tone={visibilityTone(test?.visibility)}>
                  {test?.visibility === "public" ? "Công khai" : test?.visibility === "private" ? "Riêng tư" : "—"}
                </Pill>

                {/* Trạng thái test */}
                <Pill tone={testStatusTone(test?.status)}>{test?.status || "—"}</Pill>

                {/* Độ khó */}
                <Pill tone={difficultyTone(test?.difficulty)}>{test?.difficulty || "—"}</Pill>

                {/* Time limit */}
                <Pill tone="violet">{timeLimit} phút</Pill>

                <Pill tone="slate">
                  {test?.main_topic || "—"}
                  {test?.sub_topic ? ` / ${test.sub_topic}` : ""}
                </Pill>

                <Pill tone="slate">{questions.length} câu hỏi</Pill>
              </div>
            </div>

            <button
              onClick={onClose}
              className="h-9 w-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
              aria-label="Đóng"
            >
              <Icon.X className="w-4 h-4 text-slate-700" />
            </button>
          </div>

          {/* Action bar */}
          <div className="px-4 sm:px-5 py-3 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditingTest((v) => !v)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Icon.Edit className="w-4 h-4" />
                {editingTest ? "Đóng chỉnh sửa" : "Sửa thông tin"}
              </button>

              <button
                onClick={handleAddQuestion}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-3.5 py-2 text-sm font-semibold text-white hover:bg-blue-800"
              >
                <Icon.Plus className="w-4 h-4" />
                Thêm câu hỏi
              </button>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-600">Hiển thị</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="rounded-xl border border-slate-200 px-2.5 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={questions.length || 1}>Tất cả</option>
              </select>
            </div>
          </div>

          {/* Body */}
          <div className="px-4 sm:px-5 py-4 overflow-y-auto max-h-[72vh]">
            {loading ? (
              <div className="py-16 flex flex-col items-center text-slate-700">
                <Icon.Spinner className="w-8 h-8 text-blue-700" />
                <div className="mt-3 text-sm">Đang tải dữ liệu…</div>
              </div>
            ) : error ? (
              <div className="py-12 text-center">
                <div className="text-sm text-slate-700">{error}</div>
                <button
                  onClick={fetchTestDetails}
                  className="mt-4 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  Thử lại
                </button>
              </div>
            ) : (
              <>
                {/* Edit Test */}
                {editingTest && (
                  <div className="mb-4 rounded-2xl border border-slate-200 p-4 bg-slate-50">
                    <div className="text-sm font-semibold text-slate-900 mb-3">Cập nhật thông tin</div>

                    <form onSubmit={handleTestUpdate} className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-slate-700">Tên test</label>
                          <input
                            value={testFormData.test_title}
                            onChange={(e) => setTestFormData({ ...testFormData, test_title: e.target.value })}
                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-medium text-slate-700">Loại test</label>
                          <select
                            value={testFormData.test_type}
                            onChange={(e) => setTestFormData({ ...testFormData, test_type: e.target.value })}
                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                          >
                            <option value="multiple_choice">Trắc nghiệm</option>
                            <option value="vocabulary">Từ vựng</option>
                            <option value="grammar">Ngữ pháp</option>
                            <option value="spelling">Spelling</option>
                            <option value="listening">Listening</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-slate-700">Mô tả</label>
                        <textarea
                          rows={2}
                          value={testFormData.description}
                          onChange={(e) => setTestFormData({ ...testFormData, description: e.target.value })}
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-slate-700">Main topic</label>
                          <input
                            value={testFormData.main_topic}
                            onChange={(e) => setTestFormData({ ...testFormData, main_topic: e.target.value })}
                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-700">Sub topic</label>
                          <input
                            value={testFormData.sub_topic}
                            onChange={(e) => setTestFormData({ ...testFormData, sub_topic: e.target.value })}
                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                          />
                        </div>
                      </div>

                      {/* NEW: status + visibility + difficulty + time limit */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                          <label className="text-xs font-medium text-slate-700">Chế độ</label>
                          <select
                            value={testFormData.visibility}
                            onChange={(e) => setTestFormData({ ...testFormData, visibility: e.target.value })}
                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                          >
                            <option value="public">Công khai</option>
                            <option value="private">Riêng tư</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-medium text-slate-700">Trạng thái</label>
                          <select
                            value={testFormData.status}
                            onChange={(e) => setTestFormData({ ...testFormData, status: e.target.value })}
                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                          >
                            <option value="active">active</option>
                            <option value="inactive">inactive</option>
                            <option value="deleted">deleted</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-medium text-slate-700">Độ khó</label>
                          <select
                            value={testFormData.difficulty}
                            onChange={(e) => setTestFormData({ ...testFormData, difficulty: e.target.value })}
                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                          >
                            <option value="easy">easy</option>
                            <option value="medium">medium</option>
                            <option value="hard">hard</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-medium text-slate-700">Giới hạn thời gian (phút)</label>
                          <input
                            type="number"
                            min={0}
                            value={testFormData.time_limit_minutes}
                            onChange={(e) =>
                              setTestFormData({ ...testFormData, time_limit_minutes: Number(e.target.value || 0) })
                            }
                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                        >
                          Lưu
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTest(false)}
                          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
                        >
                          Hủy
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Questions */}
                {currentQuestions.length === 0 ? (
                  <div className="py-16 text-center text-slate-700">
                    <div className="text-sm font-medium">Chưa có câu hỏi nào</div>
                    <div className="text-xs text-slate-500 mt-1">Bấm “Thêm câu hỏi” để tạo mới.</div>
                  </div>
                ) : test?.test_type === "vocabulary" ? (
                  /* Vocabulary table */
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr className="text-xs text-slate-500 uppercase tracking-wide">
                          <th className="px-3 py-2 text-left w-14">#</th>
                          <th className="px-3 py-2 text-left">Từ</th>
                          <th className="px-3 py-2 text-left">Nghĩa</th>
                          <th className="px-3 py-2 text-left">Ví dụ</th>
                          <th className="px-3 py-2 text-left w-28">Độ khó</th>
                          <th className="px-3 py-2 text-left w-28">Trạng thái</th>
                          <th className="px-3 py-2 text-right w-24">Thao tác</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {currentQuestions.map((q, idx) => (
                          <tr key={q._id} className="hover:bg-slate-50">
                            <td className="px-3 py-2 text-sm text-slate-700">{startIndex + idx + 1}</td>
                            <td className="px-3 py-2 text-sm font-medium text-slate-900">{q.word || "—"}</td>
                            <td className="px-3 py-2 text-sm text-slate-800">{q.meaning || "—"}</td>
                            <td className="px-3 py-2 text-sm text-slate-700 italic">
                              {q.example_sentence ? `“${clamp(q.example_sentence, 60)}”` : "—"}
                            </td>
                            <td className="px-3 py-2">
                              {q.difficulty ? <Pill tone={difficultyTone(q.difficulty)}>{q.difficulty}</Pill> : <span className="text-slate-400">—</span>}
                            </td>
                            <td className="px-3 py-2">{q.status ? <Pill tone={q.status === "active" ? "green" : "rose"}>{q.status}</Pill> : <span className="text-slate-400">—</span>}</td>
                            <td className="px-3 py-2">
                              <div className="flex justify-end gap-1">
                                <button
                                  onClick={() => handleEditQuestion(q)}
                                  className="p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-white"
                                  title="Sửa"
                                >
                                  <Icon.Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteQuestion(q._id)}
                                  className="p-2 rounded-lg border border-rose-300 text-rose-800 hover:bg-rose-100"
                                  title="Xóa"
                                >
                                  <Icon.Trash className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* Multiple choice / grammar cards */
                  <div className="space-y-2">
                    {currentQuestions.map((q, idx) => (
                      <div key={q._id} className="rounded-2xl border border-slate-200 p-3 hover:bg-slate-50">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <Pill tone="blue">#{startIndex + idx + 1}</Pill>
                              {q.difficulty ? <Pill tone={difficultyTone(q.difficulty)}>{q.difficulty}</Pill> : null}
                              {q.status ? <Pill tone={q.status === "active" ? "green" : "rose"}>{q.status}</Pill> : null}
                            </div>

                            {test?.test_type === "multiple_choice" ? (
                              <>
                                <div className="text-sm font-medium text-slate-900">{q.question_text || "—"}</div>

                                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {(q.options || []).map((op, i) => {
                                    const isCorrect = q.correct_answers?.includes(op.label);
                                    return (
                                      <div
                                        key={i}
                                        className={`rounded-xl border px-3 py-2 text-sm ${
                                          isCorrect ? "border-emerald-600 bg-emerald-200" : "border-slate-200 bg-white"
                                        }`}
                                      >
                                        <div className="flex gap-2">
                                          <span className="text-xs font-semibold text-slate-700 w-5">{op.label}</span>
                                          <span className={`text-sm ${isCorrect ? "text-emerald-950 font-semibold" : "text-slate-800"}`}>
                                            {op.text}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                {q.correct_answers?.length ? (
                                  <div className="mt-2 text-xs text-slate-600">
                                    Đáp án đúng: <span className="font-semibold text-slate-900">{q.correct_answers.join(", ")}</span>
                                  </div>
                                ) : null}

                                {/* Explanation */}
                                {(q.explanation?.correct ||
                                  (q.explanation?.incorrect_choices && Object.keys(q.explanation.incorrect_choices).length > 0)) && (
                                  <div className="mt-3 border-t border-slate-200 pt-3">
                                    <div className="text-xs font-semibold text-slate-900 mb-2 flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1M21 12h-1M4 12H3" />
                                      </svg>
                                      Giải thích đáp án
                                    </div>

                                    <div className="space-y-2">
                                      {q.explanation.correct && (
                                        <div className="bg-emerald-200 border border-emerald-600 border-l-4 border-l-emerald-800 p-2 rounded-lg">
                                          <div className="text-xs font-semibold text-emerald-950">
                                            ✓ Đáp án đúng ({q.correct_answers?.join(", ")}):
                                          </div>
                                          <div className="text-xs text-emerald-950 mt-1">{q.explanation.correct}</div>
                                        </div>
                                      )}

                                      {q.explanation.incorrect_choices && Object.keys(q.explanation.incorrect_choices).length > 0 && (
                                        <div className="space-y-1">
                                          {Object.entries(q.explanation.incorrect_choices)
                                            .filter(([, text]) => text && text.trim())
                                            .map(([label, text]) => (
                                              <div
                                                key={label}
                                                className="bg-rose-200 border border-rose-600 border-l-4 border-l-rose-800 p-2 rounded-lg"
                                              >
                                                <div className="flex items-start gap-2">
                                                  <span className="text-xs font-semibold text-rose-950">✗ {label}:</span>
                                                  <div className="text-xs text-rose-950">{text}</div>
                                                </div>
                                              </div>
                                            ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </>
                            ) : (
                              <>
                                <div className="text-sm font-medium text-slate-900">{q.question_text || "—"}</div>
                                {q.correct_answer ? (
                                  <div className="mt-2 text-sm text-emerald-950">
                                    Đáp án: <span className="font-semibold">{q.correct_answer}</span>
                                  </div>
                                ) : null}
                              </>
                            )}
                          </div>

                          <div className="flex shrink-0 gap-1">
                            <button
                              onClick={() => handleEditQuestion(q)}
                              className="p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-white"
                              title="Sửa"
                            >
                              <Icon.Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteQuestion(q._id)}
                              className="p-2 rounded-lg border border-rose-300 text-rose-800 hover:bg-rose-100"
                              title="Xóa"
                            >
                              <Icon.Trash className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                <div className="pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="text-sm text-slate-700">
                    Hiển thị {questions.length ? startIndex + 1 : 0}–{Math.min(startIndex + itemsPerPage, questions.length)} /{" "}
                    {questions.length}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 text-sm rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                      >
                        Trước
                      </button>

                      <div className="px-3 py-2 text-sm text-slate-800">
                        {currentPage} / {totalPages}
                      </div>

                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 text-sm rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                      >
                        Sau
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Question Modal */}
      <AdminQuestionModal
        isOpen={questionModalOpen}
        onClose={() => {
          setQuestionModalOpen(false);
          setEditingQuestion(null);
        }}
        testId={testId}
        testType={test?.test_type}
        question={editingQuestion}
        onQuestionSaved={handleQuestionSaved}
      />
    </div>
  );
};

export default TestDetailModal;
