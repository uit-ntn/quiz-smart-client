import React, { useEffect, useMemo, useState } from "react";
import testService from "../services/testService";
import vocabularyService from "../services/vocabularyService";
import AdminVocabularyQuestionModal from "./AdminVocabularyQuestionModal";
import ExportVocabularyModal from "./ExportVocabularyModal";

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
  Book: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  Download: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
  Spinner: (p) => (
    <svg className="animate-spin" viewBox="0 0 50 50" {...p}>
      <circle cx="25" cy="25" r="20" stroke="currentColor" strokeWidth="5" fill="none" className="opacity-25" />
      <path d="M45 25a20 20 0 00-20-20" stroke="currentColor" strokeWidth="5" className="opacity-80" />
    </svg>
  ),
};

const testStatusTone = (s) => (s === "active" ? "green" : s === "inactive" ? "amber" : s === "deleted" ? "rose" : "slate");
const visibilityTone = (v) => (v === "public" ? "green" : v === "private" ? "rose" : "slate");

const clamp = (txt = "", n = 120) => (txt.length > n ? txt.slice(0, n) + "…" : txt);
const getTimeLimit = (t) => Number(t?.time_limit_minutes ?? t?.duration_minutes ?? 0) || 0;

const inputCls = "w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400";
const selectCls = "w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400";

const AdminVocabularyTestDetailModal = ({ isOpen, onClose, testId, onTestUpdated }) => {
  const [test, setTest] = useState(null);
  const [vocabularies, setVocabularies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingTest, setEditingTest] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [vocabularyModalOpen, setVocabularyModalOpen] = useState(false);
  const [editingVocabulary, setEditingVocabulary] = useState(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const [testFormData, setTestFormData] = useState({
    test_title: "", description: "", main_topic: "", sub_topic: "",
    test_type: "vocabulary", total_questions: 0,
    time_limit_minutes: 0, status: "active", visibility: "public",
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
      test_type: "vocabulary", total_questions: Number(test.total_questions || 0),
      time_limit_minutes: getTimeLimit(test),
      status: test.status || "active", visibility: test.visibility || "public",
    });
  }, [test]);

  const fetchTestDetails = async () => {
    try {
      setLoading(true); setError(null);
      const t = await testService.getTestById(testId);
      setTest(t);
      const vocabs = await vocabularyService.getAllVocabulariesByTestId(testId);
      setVocabularies(Array.isArray(vocabs) ? vocabs : []);
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
      const payload = { ...testFormData, test_type: "vocabulary",
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

  const handleEditVocabulary = (vocab) => { setEditingVocabulary(vocab); setVocabularyModalOpen(true); };

  const handleVocabularySaved = async () => {
    try {
      await fetchTestDetails();
      setVocabularyModalOpen(false);
      setEditingVocabulary(null);
      onTestUpdated?.();
    } catch (err) { console.error('Error refreshing test details:', err); }
  };

  const handleDeleteVocabulary = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xoá từ vựng này không?")) return;
    try {
      setLoading(true); setError(null);
      await vocabularyService.deleteVocabulary(id);
      await fetchTestDetails();
      onTestUpdated?.();
    } catch (e) {
      console.error("Delete error:", e);
      setError(e?.message || "Không thể xoá từ vựng. Vui lòng thử lại.");
    } finally { setLoading(false); }
  };

  const totalPages = useMemo(() => Math.max(1, Math.ceil(vocabularies.length / itemsPerPage)), [vocabularies.length, itemsPerPage]);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentVocabularies = useMemo(() => vocabularies.slice(startIndex, startIndex + itemsPerPage), [vocabularies, startIndex, itemsPerPage]);

  const title = test?.test_title || "Chi tiết bài từ vựng";
  const timeLimit = getTimeLimit(test);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative min-h-full flex items-center justify-center p-3">
        <div className="w-full max-w-6xl max-h-[92vh] rounded-2xl bg-white border-[3px] border-emerald-400 ring-2 ring-emerald-100 shadow-2xl overflow-hidden flex flex-col">

          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-5 py-4 flex-shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-white/20 border-2 border-white/40 flex items-center justify-center">
                    <Icon.Book className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-base font-extrabold text-white truncate">{title}</h2>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Pill tone="blue">Từ vựng</Pill>
                  <Pill tone={visibilityTone(test?.visibility)}>
                    {test?.visibility === "public" ? "Công khai" : test?.visibility === "private" ? "Riêng tư" : "—"}
                  </Pill>
                  <Pill tone={testStatusTone(test?.status)}>{test?.status || "—"}</Pill>
                  <Pill tone="violet">{timeLimit} phút</Pill>
                  <Pill tone="slate">{test?.main_topic || "—"}{test?.sub_topic ? ` / ${test.sub_topic}` : ""}</Pill>
                  <Pill tone="slate">{vocabularies.length} từ vựng</Pill>
                </div>
              </div>
              <button onClick={onClose}
                className="w-9 h-9 rounded-xl bg-white/20 border-2 border-white/40 flex items-center justify-center text-white hover:bg-white/30 transition-colors shrink-0">
                <Icon.X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Action bar */}
          <div className="px-5 py-3 border-b-2 border-emerald-200 bg-emerald-50 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              <button onClick={() => setEditingTest((v) => !v)}
                className="inline-flex items-center gap-2 rounded-xl border-[3px] border-emerald-600 bg-emerald-600 px-3 py-2 text-sm font-extrabold text-white hover:bg-emerald-700 transition-colors shadow-sm">
                <Icon.Edit className="w-4 h-4" />
                {editingTest ? "Đóng sửa" : "Sửa thông tin"}
              </button>
              <button onClick={() => setExportModalOpen(true)} disabled={vocabularies.length === 0}
                className="inline-flex items-center gap-2 rounded-xl border-[3px] border-teal-600 bg-teal-600 px-3 py-2 text-sm font-extrabold text-white hover:bg-teal-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                <Icon.Download className="w-4 h-4" />
                Xuất file
              </button>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-bold text-emerald-700">Hiển thị</span>
              <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="rounded-xl border-2 border-emerald-300 bg-white px-2.5 py-1.5 text-sm font-medium focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400">
                {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                <option value={vocabularies.length || 1}>Tất cả</option>
              </select>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 bg-gradient-to-br from-emerald-50/40 to-teal-50/30">
            {loading ? (
              <div className="py-16 flex flex-col items-center gap-3">
                <Icon.Spinner className="w-8 h-8 text-emerald-600" />
                <div className="text-sm font-bold text-emerald-700">Đang tải dữ liệu…</div>
              </div>
            ) : error ? (
              <div className="py-12 text-center space-y-3">
                <div className="text-sm font-bold text-rose-700 bg-rose-50 border-2 border-rose-300 rounded-xl px-4 py-3">{error}</div>
                <button onClick={fetchTestDetails}
                  className="rounded-xl border-[3px] border-emerald-700 bg-emerald-600 px-5 py-2 text-sm font-extrabold text-white hover:bg-emerald-700">
                  Thử lại
                </button>
              </div>
            ) : (
              <>
                {/* Edit Test Form */}
                {editingTest && (
                  <div className="mb-5 rounded-2xl border-2 border-emerald-200 bg-white p-5 shadow-sm">
                    <div className="text-sm font-extrabold text-emerald-800 mb-4 flex items-center gap-2">
                      <span>✏️</span> Cập nhật thông tin bài từ vựng
                    </div>
                    <form onSubmit={handleTestUpdate} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-extrabold text-slate-700 mb-1 block">Chế độ</label>
                          <select value={testFormData.visibility}
                            onChange={(e) => setTestFormData({ ...testFormData, visibility: e.target.value })}
                            className={selectCls}>
                            <option value="public">Công khai</option>
                            <option value="private">Riêng tư</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button type="submit"
                          className="rounded-xl border-[3px] border-emerald-700 bg-emerald-600 px-5 py-2 text-sm font-extrabold text-white hover:bg-emerald-700 shadow-md">
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

                {/* Vocabulary Table */}
                {currentVocabularies.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center mx-auto mb-3">
                      <Icon.Book className="w-8 h-8 text-emerald-500" />
                    </div>
                    <div className="text-sm font-extrabold text-emerald-700">Chưa có từ vựng nào</div>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border-2 border-emerald-200 shadow-sm">
                    <table className="w-full">
                      <thead className="bg-emerald-600">
                        <tr className="text-[11px] text-white font-extrabold uppercase tracking-wide">
                          <th className="px-3 py-3 text-left w-12">#</th>
                          <th className="px-3 py-3 text-left">Từ</th>
                          <th className="px-3 py-3 text-left">Nghĩa</th>
                          <th className="px-3 py-3 text-left">Ví dụ</th>
                          <th className="px-3 py-3 text-left">Loại từ</th>
                          <th className="px-3 py-3 text-left">CEFR</th>
                          <th className="px-3 py-3 text-right w-24">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-emerald-100">
                        {currentVocabularies.map((vocab, idx) => (
                          <tr key={vocab._id} className="hover:bg-emerald-50 transition-colors bg-white">
                            <td className="px-3 py-2.5 text-sm font-bold text-emerald-700">{startIndex + idx + 1}</td>
                            <td className="px-3 py-2.5 text-sm font-extrabold text-slate-900">{vocab.word || "—"}</td>
                            <td className="px-3 py-2.5 text-sm font-medium text-slate-800">{vocab.meaning || "—"}</td>
                            <td className="px-3 py-2.5 text-sm text-slate-600 italic">
                              {vocab.example_sentence ? `"${clamp(vocab.example_sentence, 60)}"` : "—"}
                            </td>
                            <td className="px-3 py-2.5">
                              <Pill tone="blue">
                                {vocab.part_of_speech === 'noun' ? 'Danh từ' :
                                 vocab.part_of_speech === 'verb' ? 'Động từ' :
                                 vocab.part_of_speech === 'adjective' ? 'Tính từ' :
                                 vocab.part_of_speech === 'adverb' ? 'Trạng từ' :
                                 vocab.part_of_speech === 'preposition' ? 'Giới từ' :
                                 vocab.part_of_speech === 'conjunction' ? 'Liên từ' :
                                 vocab.part_of_speech === 'pronoun' ? 'Đại từ' :
                                 vocab.part_of_speech === 'interjection' ? 'Thán từ' :
                                 vocab.part_of_speech || '—'}
                              </Pill>
                            </td>
                            <td className="px-3 py-2.5">
                              <Pill tone={['A1', 'A2'].includes(vocab.cefr_level) ? 'green' :
                                         ['B1', 'B2'].includes(vocab.cefr_level) ? 'amber' :
                                         ['C1', 'C2'].includes(vocab.cefr_level) ? 'rose' : 'slate'}>
                                {vocab.cefr_level || '—'}
                              </Pill>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex justify-end gap-1.5">
                                <button onClick={() => handleEditVocabulary(vocab)}
                                  className="p-1.5 rounded-xl border-[3px] border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors" title="Sửa">
                                  <Icon.Edit className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleDeleteVocabulary(vocab._id)}
                                  className="p-1.5 rounded-xl border-[3px] border-rose-400 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors" title="Xóa">
                                  <Icon.Trash className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination */}
                <div className="pt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="text-sm font-bold text-emerald-700">
                    Hiển thị {vocabularies.length ? startIndex + 1 : 0}–{Math.min(startIndex + itemsPerPage, vocabularies.length)} / {vocabularies.length}
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                        className="px-3 py-2 text-sm font-extrabold rounded-xl border-2 border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 transition-colors">
                        Trước
                      </button>
                      <div className="px-3 py-2 text-sm font-bold text-emerald-800 bg-emerald-100 rounded-xl border-2 border-emerald-300">
                        {currentPage} / {totalPages}
                      </div>
                      <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                        className="px-3 py-2 text-sm font-extrabold rounded-xl border-2 border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 transition-colors">
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

      <AdminVocabularyQuestionModal
        isOpen={vocabularyModalOpen}
        onClose={() => { setVocabularyModalOpen(false); setEditingVocabulary(null); }}
        testId={testId}
        question={editingVocabulary}
        onQuestionSaved={handleVocabularySaved}
      />

      <ExportVocabularyModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        vocabularies={vocabularies}
        testTitle={test?.test_title || 'Bài từ vựng'}
        createdBy={test?.created_by_full_name || test?.created_by?.full_name || ""}
      />
    </div>
  );
};

export default AdminVocabularyTestDetailModal;
