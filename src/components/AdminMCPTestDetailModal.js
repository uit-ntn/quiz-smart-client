import React, { useEffect, useMemo, useState } from "react";
import testService from "../services/testService";
import multipleChoiceService from "../services/multipleChoiceService";
import { getCorrectAnswerLabels, isCorrectAnswer } from "../utils/correctAnswerHelpers";
import AdminMCPQuestionModal from "./AdminMCPQuestionModal";
import ExportMCPModal from "./ExportMCPModal";

/* =========================
   Small UI helpers
========================= */
const Pill = ({ children, tone = "slate" }) => {
  const map = {
    slate:  "bg-slate-100 text-slate-800 border-slate-300",
    blue:   "bg-sky-100 text-sky-800 border-sky-400",
    green:  "bg-emerald-100 text-emerald-800 border-emerald-500",
    amber:  "bg-amber-100 text-amber-800 border-amber-500",
    rose:   "bg-rose-100 text-rose-800 border-rose-500",
    violet: "bg-violet-100 text-violet-800 border-violet-500",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border-2 ${map[tone]}`}>
      {children}
    </span>
  );
};

const Icon = {
  X: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Edit: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  Trash: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  Spinner: (p) => (
    <svg className="animate-spin" viewBox="0 0 50 50" {...p}>
      <circle cx="25" cy="25" r="20" stroke="currentColor" strokeWidth="5" fill="none" className="opacity-25" />
      <path d="M45 25a20 20 0 00-20-20" stroke="currentColor" strokeWidth="5" className="opacity-80" />
    </svg>
  ),
  Download: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
};

const difficultyTone = (d) => (d === "easy" ? "green" : d === "medium" ? "amber" : d === "hard" ? "rose" : "slate");
const testStatusTone = (s) => (s === "active" ? "green" : s === "inactive" ? "amber" : s === "deleted" ? "rose" : "slate");
const visibilityTone = (v) => (v === "public" ? "green" : v === "private" ? "rose" : "slate");

const clamp = (txt = "", n = 120) => (txt.length > n ? txt.slice(0, n) + "…" : txt);
const getTimeLimit = (t) => Number(t?.time_limit_minutes ?? t?.duration_minutes ?? 0) || 0;

const inputCls = "w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400";
const selectCls = "w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400";

const AdminMCPTestDetailModal = ({ isOpen, onClose, testId, onTestUpdated }) => {
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingTest, setEditingTest] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const [testFormData, setTestFormData] = useState({
    test_title: "", description: "", main_topic: "", sub_topic: "",
    test_type: "multiple_choice", total_questions: 0,
    time_limit_minutes: 0, difficulty: "medium", status: "active", visibility: "public",
  });

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  useEffect(() => { if (isOpen && testId) fetchTestDetails(); }, [isOpen, testId]);

  useEffect(() => {
    if (!test) return;
    setTestFormData({
      test_title: test.test_title || "", description: test.description || "",
      main_topic: test.main_topic || "", sub_topic: test.sub_topic || "",
      test_type: "multiple_choice", total_questions: Number(test.total_questions || 0),
      time_limit_minutes: getTimeLimit(test), difficulty: test.difficulty || "medium",
      status: test.status || "active", visibility: test.visibility || "public",
    });
  }, [test]);

  const fetchTestDetails = async () => {
    try {
      setLoading(true); setError(null);
      const t = await testService.getTestById(testId);
      setTest(t);
      const qs = await multipleChoiceService.getQuestionsByTestId(testId);
      setQuestions(Array.isArray(qs) ? qs : []);
      setCurrentPage(1);
    } catch (e) {
      console.error("Error fetching test details:", e);
      setError(e?.message || "Đã xảy ra lỗi");
    } finally { setLoading(false); }
  };

  const handleTestUpdate = async (e) => {
    e.preventDefault();
    try {
      setLoading(true); setError(null);
      const payload = { ...testFormData, test_type: "multiple_choice",
        time_limit_minutes: Number(testFormData.time_limit_minutes || 0),
        duration_minutes: Number(testFormData.time_limit_minutes || 0),
        total_questions: Number(testFormData.total_questions || 0) };
      await testService.updateTest(testId, payload);
      await fetchTestDetails();
      setEditingTest(false);
      onTestUpdated?.();
    } catch (e) {
      setError(e?.message || "Không thể cập nhật");
    } finally { setLoading(false); }
  };

  const handleEditQuestion = (q) => { setEditingQuestion(q); setQuestionModalOpen(true); };

  const handleQuestionSaved = async () => {
    try {
      await fetchTestDetails();
      setQuestionModalOpen(false);
      setEditingQuestion(null);
      onTestUpdated?.();
    } catch (err) { console.error('Error refreshing test details:', err); }
  };

  const handleDeleteQuestion = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xoá câu hỏi này không?")) return;
    try {
      setLoading(true); setError(null);
      await multipleChoiceService.deleteMultipleChoice(id);
      await fetchTestDetails();
      onTestUpdated?.();
    } catch (e) {
      console.error("Delete error:", e);
      setError(e?.message || "Không thể xoá câu hỏi. Vui lòng thử lại.");
    } finally { setLoading(false); }
  };

  const totalPages = useMemo(() => Math.max(1, Math.ceil(questions.length / itemsPerPage)), [questions.length, itemsPerPage]);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentQuestions = useMemo(() => questions.slice(startIndex, startIndex + itemsPerPage), [questions, startIndex, itemsPerPage]);

  const title = test?.test_title || "Chi tiết bài trắc nghiệm";
  const timeLimit = getTimeLimit(test);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative min-h-full flex items-center justify-center p-3">
        <div className="w-full max-w-6xl max-h-[92vh] rounded-2xl bg-white border-[3px] border-amber-500 ring-2 ring-amber-100 shadow-2xl overflow-hidden flex flex-col">

          {/* Header */}
          <div className="bg-gradient-to-r from-amber-600 to-orange-700 px-5 py-4 flex-shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-white/20 border-2 border-white/40 flex items-center justify-center text-lg">📋</div>
                  <h2 className="text-base font-extrabold text-white truncate">{title}</h2>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Pill tone="amber">Trắc nghiệm</Pill>
                  <Pill tone={visibilityTone(test?.visibility)}>
                    {test?.visibility === "public" ? "Công khai" : test?.visibility === "private" ? "Riêng tư" : "—"}
                  </Pill>
                  <Pill tone={testStatusTone(test?.status)}>{test?.status || "—"}</Pill>
                  <Pill tone={difficultyTone(test?.difficulty)}>{test?.difficulty || "—"}</Pill>
                  <Pill tone="amber">{timeLimit} phút</Pill>
                  <Pill tone="slate">{test?.main_topic || "—"}{test?.sub_topic ? ` / ${test.sub_topic}` : ""}</Pill>
                  <Pill tone="slate">{questions.length} câu hỏi</Pill>
                </div>
              </div>
              <button onClick={onClose}
                className="w-9 h-9 rounded-xl bg-white/20 border-2 border-white/40 flex items-center justify-center text-white hover:bg-white/30 transition-colors shrink-0">
                <Icon.X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Action bar */}
          <div className="px-5 py-3 border-b-2 border-amber-200 bg-amber-50 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              <button onClick={() => setEditingTest((v) => !v)}
                className="inline-flex items-center gap-2 rounded-xl border-[3px] border-amber-700 bg-amber-600 px-3 py-2 text-sm font-extrabold text-white hover:bg-amber-700 transition-colors shadow-sm">
                <Icon.Edit className="w-4 h-4" />
                {editingTest ? "Đóng sửa" : "Sửa thông tin"}
              </button>
              <button onClick={() => setExportModalOpen(true)} disabled={questions.length === 0}
                className="inline-flex items-center gap-2 rounded-xl border-[3px] border-orange-700 bg-orange-600 px-3 py-2 text-sm font-extrabold text-white hover:bg-orange-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                <Icon.Download className="w-4 h-4" />
                Xuất file
              </button>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-bold text-amber-700">Hiển thị</span>
              <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="rounded-xl border-2 border-amber-300 bg-white px-2.5 py-1.5 text-sm font-medium focus:ring-2 focus:ring-amber-300 focus:border-amber-400">
                {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                <option value={questions.length || 1}>Tất cả</option>
              </select>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 bg-gradient-to-br from-amber-50/40 to-orange-50/30">
            {loading ? (
              <div className="py-16 flex flex-col items-center gap-3">
                <Icon.Spinner className="w-8 h-8 text-amber-600" />
                <div className="text-sm font-bold text-amber-700">Đang tải dữ liệu…</div>
              </div>
            ) : error ? (
              <div className="py-12 text-center space-y-3">
                <div className="text-sm font-bold text-rose-700 bg-rose-50 border-2 border-rose-300 rounded-xl px-4 py-3">{error}</div>
                <button onClick={fetchTestDetails}
                  className="rounded-xl border-[3px] border-amber-700 bg-amber-600 px-5 py-2 text-sm font-extrabold text-white hover:bg-amber-700">
                  Thử lại
                </button>
              </div>
            ) : (
              <>
                {/* Edit Test Form */}
                {editingTest && (
                  <div className="mb-5 rounded-2xl border-2 border-amber-200 bg-white p-5 shadow-sm">
                    <div className="text-sm font-extrabold text-amber-800 mb-4 flex items-center gap-2">
                      <span>✏️</span> Cập nhật thông tin bài trắc nghiệm
                    </div>
                    <form onSubmit={handleTestUpdate} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs font-extrabold text-slate-700 mb-1 block">Tên test</label>
                          <input value={testFormData.test_title}
                            onChange={(e) => setTestFormData({ ...testFormData, test_title: e.target.value })}
                            className={inputCls} />
                        </div>
                        <div>
                          <label className="text-xs font-extrabold text-slate-700 mb-1 block">Giới hạn thời gian (phút)</label>
                          <input type="number" min={0} value={testFormData.time_limit_minutes}
                            onChange={(e) => setTestFormData({ ...testFormData, time_limit_minutes: Number(e.target.value || 0) })}
                            className={inputCls} />
                        </div>
                        <div>
                          <label className="text-xs font-extrabold text-slate-700 mb-1 block">Số câu hỏi</label>
                          <input type="number" min={0} value={testFormData.total_questions}
                            onChange={(e) => setTestFormData({ ...testFormData, total_questions: Number(e.target.value || 0) })}
                            className={inputCls} />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-extrabold text-slate-700 mb-1 block">Mô tả</label>
                        <textarea rows={2} value={testFormData.description}
                          onChange={(e) => setTestFormData({ ...testFormData, description: e.target.value })}
                          className={inputCls} />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-extrabold text-slate-700 mb-1 block">Main topic</label>
                          <input value={testFormData.main_topic}
                            onChange={(e) => setTestFormData({ ...testFormData, main_topic: e.target.value })}
                            className={inputCls} />
                        </div>
                        <div>
                          <label className="text-xs font-extrabold text-slate-700 mb-1 block">Sub topic</label>
                          <input value={testFormData.sub_topic}
                            onChange={(e) => setTestFormData({ ...testFormData, sub_topic: e.target.value })}
                            className={inputCls} />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs font-extrabold text-slate-700 mb-1 block">Chế độ</label>
                          <select value={testFormData.visibility}
                            onChange={(e) => setTestFormData({ ...testFormData, visibility: e.target.value })}
                            className={selectCls}>
                            <option value="public">Công khai</option>
                            <option value="private">Riêng tư</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-extrabold text-slate-700 mb-1 block">Trạng thái</label>
                          <select value={testFormData.status}
                            onChange={(e) => setTestFormData({ ...testFormData, status: e.target.value })}
                            className={selectCls}>
                            <option value="active">active</option>
                            <option value="inactive">inactive</option>
                            <option value="deleted">deleted</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-extrabold text-slate-700 mb-1 block">Độ khó</label>
                          <select value={testFormData.difficulty}
                            onChange={(e) => setTestFormData({ ...testFormData, difficulty: e.target.value })}
                            className={selectCls}>
                            <option value="easy">Dễ</option>
                            <option value="medium">Trung bình</option>
                            <option value="hard">Khó</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button type="submit"
                          className="rounded-xl border-[3px] border-amber-700 bg-amber-600 px-5 py-2 text-sm font-extrabold text-white hover:bg-amber-700 shadow-md">
                          Lưu
                        </button>
                        <button type="button" onClick={() => setEditingTest(false)}
                          className="rounded-xl border-[3px] border-slate-300 bg-white px-5 py-2 text-sm font-extrabold text-slate-700 hover:bg-slate-50">
                          Hủy
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Questions list */}
                {currentQuestions.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-3xl mx-auto mb-3">📝</div>
                    <div className="text-sm font-extrabold text-amber-700">Chưa có câu hỏi nào</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentQuestions.map((q, idx) => (
                      <div key={q._id} className="rounded-2xl border-2 border-amber-200 bg-white p-4 hover:border-amber-400 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5 mb-2">
                              <span className="inline-flex items-center rounded-full border-2 border-amber-500 bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-800">
                                #{startIndex + idx + 1}
                              </span>
                              {q.difficulty && <Pill tone={difficultyTone(q.difficulty)}>{q.difficulty}</Pill>}
                              {q.status && <Pill tone={q.status === "active" ? "green" : "rose"}>{q.status}</Pill>}
                            </div>

                            <div className="text-sm font-bold text-slate-900 mb-3">{q.question_text || "—"}</div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {(q.options || []).map((op, i) => {
                                const isCorrect = isCorrectAnswer(q.correct_answers, op.label);
                                return (
                                  <div key={i}
                                    className={`rounded-xl border-2 px-3 py-2 text-sm flex gap-2 items-start ${isCorrect
                                      ? "border-emerald-500 bg-emerald-50"
                                      : "border-slate-200 bg-slate-50"}`}>
                                    <span className={`text-xs font-extrabold w-5 shrink-0 ${isCorrect ? "text-emerald-700" : "text-slate-500"}`}>{op.label}</span>
                                    <span className={`text-sm ${isCorrect ? "text-emerald-900 font-bold" : "text-slate-700 font-medium"}`}>{op.text}</span>
                                  </div>
                                );
                              })}
                            </div>

                            {getCorrectAnswerLabels(q.correct_answers)?.length ? (
                              <div className="text-xs font-medium text-slate-600 mt-2">
                                Đáp án đúng: <span className="font-extrabold text-emerald-700">{getCorrectAnswerLabels(q.correct_answers).join(", ")}</span>
                              </div>
                            ) : null}

                            {(q.explanation?.correct ||
                              (q.explanation?.incorrect_choices && Object.keys(q.explanation.incorrect_choices).length > 0)) && (
                              <div className="mt-3 border-t-2 border-amber-100 pt-3">
                                <div className="text-xs font-extrabold text-amber-800 mb-2">📖 Giải thích đáp án</div>
                                <div className="space-y-2">
                                  {q.explanation.correct && (
                                    <div className="bg-emerald-50 border-2 border-emerald-400 border-l-4 border-l-emerald-700 p-2.5 rounded-xl">
                                      <div className="text-xs font-extrabold text-emerald-800">
                                        ✓ Đáp án đúng ({getCorrectAnswerLabels(q.correct_answers)?.join(", ")}):
                                      </div>
                                      {typeof q.explanation.correct === 'object' && Object.keys(q.explanation.correct).length > 0 ? (
                                        <div className="space-y-1 mt-1">
                                          {Object.entries(q.explanation.correct).map(([option, text]) => (
                                            <div key={option} className="text-xs text-emerald-900">
                                              <span className="font-extrabold">{option}:</span> {text}
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="text-xs text-emerald-900 mt-1">{q.explanation.correct}</div>
                                      )}
                                    </div>
                                  )}
                                  {q.explanation.incorrect_choices && Object.keys(q.explanation.incorrect_choices).length > 0 && (
                                    <div className="space-y-1">
                                      {Object.entries(q.explanation.incorrect_choices)
                                        .filter(([, text]) => text && text.trim())
                                        .map(([label, text]) => (
                                          <div key={label}
                                            className="bg-rose-50 border-2 border-rose-400 border-l-4 border-l-rose-700 p-2.5 rounded-xl">
                                            <div className="flex items-start gap-2">
                                              <span className="text-xs font-extrabold text-rose-800">✗ {label}:</span>
                                              <div className="text-xs text-rose-900">{text}</div>
                                            </div>
                                          </div>
                                        ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex shrink-0 gap-1.5">
                            <button onClick={() => handleEditQuestion(q)}
                              className="p-2 rounded-xl border-[3px] border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors" title="Sửa">
                              <Icon.Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteQuestion(q._id)}
                              className="p-2 rounded-xl border-[3px] border-rose-400 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors" title="Xóa">
                              <Icon.Trash className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                <div className="pt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="text-sm font-bold text-amber-700">
                    Hiển thị {questions.length ? startIndex + 1 : 0}–{Math.min(startIndex + itemsPerPage, questions.length)} / {questions.length}
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                        className="px-3 py-2 text-sm font-extrabold rounded-xl border-2 border-amber-300 bg-white text-amber-700 hover:bg-amber-50 disabled:opacity-40 transition-colors">
                        Trước
                      </button>
                      <div className="px-3 py-2 text-sm font-bold text-amber-800 bg-amber-100 rounded-xl border-2 border-amber-300">
                        {currentPage} / {totalPages}
                      </div>
                      <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                        className="px-3 py-2 text-sm font-extrabold rounded-xl border-2 border-amber-300 bg-white text-amber-700 hover:bg-amber-50 disabled:opacity-40 transition-colors">
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

      <AdminMCPQuestionModal
        isOpen={questionModalOpen}
        onClose={() => { setQuestionModalOpen(false); setEditingQuestion(null); }}
        testId={testId}
        question={editingQuestion}
        onQuestionSaved={handleQuestionSaved}
      />

      <ExportMCPModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        questions={questions}
        testTitle={test?.test_title || ""}
        testMainTopic={test?.main_topic || ""}
        testSubTopic={test?.sub_topic || ""}
        createdBy={test?.created_by_full_name || test?.created_by?.full_name || ""}
      />
    </div>
  );
};

export default AdminMCPTestDetailModal;
