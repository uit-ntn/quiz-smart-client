import React, { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../layout/AdminLayout";
import vocabularyService from "../services/vocabularyService";
import testService from "../services/testService";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";

/* =========================
   Small UI helpers
========================= */
const Icon = {
  Search: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Refresh: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M4 4v6h6M20 20v-6h-6M20 9a8 8 0 00-14.9-2M4 15a8 8 0 0014.9 2"
      />
    </svg>
  ),
  Plus: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v14M5 12h14" />
    </svg>
  ),
  X: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Warning: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M12 9v2m0 4h.01M10.29 3.86l-8.2 14.2A2 2 0 003.83 21h16.34a2 2 0 001.74-2.94l-8.2-14.2a2 2 0 00-3.42 0z"
      />
    </svg>
  ),
};

const ModalShell = ({ title, subtitle, onClose, children, maxWidth = "max-w-2xl" }) => {
  useEffect(() => {
    const onKeyDown = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative min-h-full flex items-center justify-center p-3">
        <div className={`w-full ${maxWidth} rounded-xl bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden`}>
          <div className="px-4 py-3 border-b flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-base font-semibold text-slate-900 truncate">{title}</div>
              {subtitle ? <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div> : null}
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
              aria-label="Đóng"
            >
              <Icon.X className="w-4 h-4 text-slate-700" />
            </button>
          </div>

          <div className="p-4">{children}</div>
        </div>
      </div>
    </div>
  );
};

/* =========================
   Vocab Form (compact, modern)
========================= */
const VocabForm = ({ onSubmit, buttonText, formData, setFormData, allTests, onCancel }) => {
  const update = (k) => (e) => setFormData((p) => ({ ...p, [k]: e.target.value }));

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">
          Bài kiểm tra <span className="text-rose-500">*</span>
        </label>
        <select
          value={formData.test_id}
          onChange={update("test_id")}
          required
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="">Chọn bài kiểm tra...</option>
          {allTests.map((t) => (
            <option key={t._id} value={t._id}>
              {t.test_title} {t.main_topic ? `- ${t.main_topic}` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Từ vựng <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={formData.word}
            onChange={update("word")}
            required
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Nhập từ vựng..."
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Phiên âm</label>
          <input
            type="text"
            value={formData.phonetic}
            onChange={update("phonetic")}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Ví dụ: /ˈaɪəl/"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">
          Nghĩa <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          value={formData.meaning}
          onChange={update("meaning")}
          required
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="Nghĩa của từ..."
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Ví dụ</label>
          <textarea
            value={formData.example_sentence}
            onChange={update("example_sentence")}
            rows={2}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Câu ví dụ..."
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Nghĩa ví dụ</label>
          <textarea
            value={formData.example_meaning}
            onChange={update("example_meaning")}
            rows={2}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Nghĩa của câu ví dụ..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">URL hình ảnh</label>
          <input
            type="url"
            value={formData.image_url}
            onChange={update("image_url")}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="https://..."
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">URL audio</label>
          <input
            type="url"
            value={formData.audio_url}
            onChange={update("audio_url")}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="https://..."
          />
        </div>
      </div>

      <div className="pt-1 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
        >
          Hủy
        </button>
        <button
          type="submit"
          className="flex-1 px-3 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
        >
          {buttonText}
        </button>
      </div>
    </form>
  );
};

const AdminVocabularies = () => {
  const [vocabularies, setVocabularies] = useState([]);
  const [testsById, setTestsById] = useState({});
  const [allTests, setAllTests] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [selectedVocab, setSelectedVocab] = useState(null);

  const [formData, setFormData] = useState({
    word: "",
    meaning: "",
    example_sentence: "",
    example_meaning: "",
    phonetic: "",
    image_url: "",
    audio_url: "",
    test_id: "",
  });

  const normalizeTests = (data) => {
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object") return data.data || data.tests || data.results || data.items || [];
    return [];
  };

  const loadPageData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [vocabsData, testsDataRaw] = await Promise.all([
        vocabularyService.getAllVocabularies(),
        testService.getAllTests(),
      ]);

      const testsArray = normalizeTests(testsDataRaw);

      // Filter only vocabulary tests for dropdown
      const vocabularyTests = testsArray.filter((t) => t.test_type === "vocabulary" || t.test_type === "vocab");
      setAllTests(vocabularyTests);

      // Map tests by id for quick lookup in table/cards
      const map = {};
      testsArray.forEach((t) => {
        if (t?._id) map[t._id] = t;
      });
      setTestsById(map);

      setVocabularies(Array.isArray(vocabsData) ? vocabsData : []);
    } catch (err) {
      console.error("Load vocabularies/tests error:", err);
      setError("Không thể tải danh sách từ vựng");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  const filteredVocabs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return vocabularies;

    return vocabularies.filter((v) => {
      const w = (v.word || "").toLowerCase();
      const m = (v.meaning || "").toLowerCase();
      return w.includes(q) || m.includes(q);
    });
  }, [vocabularies, searchTerm]);

  const openCreate = () => {
    setSelectedVocab(null);
    setFormData({
      word: "",
      meaning: "",
      example_sentence: "",
      example_meaning: "",
      phonetic: "",
      image_url: "",
      audio_url: "",
      test_id: "",
    });
    setShowCreateModal(true);
  };

  const openEdit = (vocab) => {
    setSelectedVocab(vocab);
    setFormData({
      word: vocab.word || "",
      meaning: vocab.meaning || "",
      example_sentence: vocab.example_sentence || "",
      example_meaning: vocab.example_meaning || "",
      phonetic: vocab.phonetic || "",
      image_url: vocab.image_url || "",
      audio_url: vocab.audio_url || "",
      test_id: vocab.test_id || "",
    });
    setShowEditModal(true);
  };

  const openDelete = (vocab) => {
    setSelectedVocab(vocab);
    setShowDeleteModal(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      const newVocab = await vocabularyService.createVocabulary(formData);
      setVocabularies((prev) => [newVocab, ...prev]);
      setShowCreateModal(false);
    } catch (err) {
      console.error("Error creating vocabulary:", err);
      alert("Không thể tạo từ vựng. Vui lòng thử lại!");
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVocab) return;

    try {
      const updated = await vocabularyService.updateVocabulary(selectedVocab._id, formData);
      setVocabularies((prev) => prev.map((v) => (v._id === selectedVocab._id ? updated : v)));
      setShowEditModal(false);
      setSelectedVocab(null);
    } catch (err) {
      console.error("Error updating vocabulary:", err);
      alert("Không thể cập nhật từ vựng. Vui lòng thử lại!");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedVocab) return;

    try {
      await vocabularyService.deleteVocabulary(selectedVocab._id);
      setVocabularies((prev) => prev.filter((v) => v._id !== selectedVocab._id));
      setShowDeleteModal(false);
      setSelectedVocab(null);
    } catch (err) {
      console.error("Error deleting vocabulary:", err);
      alert("Không thể xóa từ vựng. Vui lòng thử lại!");
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <LoadingSpinner message="Đang tải danh sách từ vựng..." />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 py-5 space-y-4">
        {/* Top header / toolbar */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="px-4 py-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold text-slate-900 truncate">Quản lý Từ vựng</h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Tổng số: <span className="font-medium text-slate-700">{filteredVocabs.length}</span> từ
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={loadPageData}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <Icon.Refresh className="w-4 h-4" />
                <span className="hidden sm:inline">Làm mới</span>
              </button>

              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <Icon.Plus className="w-4 h-4" />
                <span>Thêm từ</span>
              </button>
            </div>
          </div>

          <div className="px-4 py-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative flex-1">
                <Icon.Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm theo từ vựng hoặc nghĩa..."
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {searchTerm ? (
                <button
                  onClick={() => setSearchTerm("")}
                  className="px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  Xóa lọc
                </button>
              ) : null}
            </div>

            {error ? (
              <div className="mt-3">
                <ErrorMessage message={error} />
              </div>
            ) : null}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {/* Desktop table */}
          <div className="hidden lg:block">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                  <tr className="text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 text-left">Từ vựng</th>
                    <th className="px-4 py-3 text-left">Nghĩa</th>
                    <th className="px-4 py-3 text-left">Ví dụ</th>
                    <th className="px-4 py-3 text-left">Bài kiểm tra</th>
                    <th className="px-4 py-3 text-left">Chủ đề</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredVocabs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center">
                        <div className="text-sm font-medium text-slate-700">
                          {searchTerm ? "Không tìm thấy từ vựng phù hợp" : "Chưa có từ vựng nào"}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {searchTerm ? "Thử từ khóa khác hoặc xóa lọc." : "Bấm “Thêm từ” để tạo từ vựng mới."}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredVocabs.map((v) => {
                      const t = testsById[v.test_id];
                      return (
                        <tr key={v._id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-slate-900">{v.word}</div>
                            {v.phonetic ? <div className="text-xs text-slate-500 mt-0.5">/{v.phonetic}/</div> : null}
                          </td>

                          <td className="px-4 py-3">
                            <div className="text-sm text-slate-800">
                              {v.meaning?.length > 40 ? `${v.meaning.slice(0, 40)}...` : v.meaning || "—"}
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <div className="text-xs text-slate-700">
                              {v.example_sentence ? (
                                <>
                                  <div className="truncate max-w-[360px]" title={v.example_sentence}>
                                    “{v.example_sentence}”
                                  </div>
                                  {v.example_meaning ? (
                                    <div className="text-slate-500 mt-1 truncate max-w-[360px]" title={v.example_meaning}>
                                      → {v.example_meaning}
                                    </div>
                                  ) : null}
                                </>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <div className="text-sm text-slate-800 truncate max-w-[220px]" title={t?.test_title}>
                              {t?.test_title || "—"}
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <div className="text-sm text-slate-800 truncate max-w-[200px]" title={t?.main_topic}>
                              {t?.main_topic || "—"}
                            </div>
                            {t?.sub_topic ? (
                              <div className="text-xs text-slate-500 truncate max-w-[200px]" title={t.sub_topic}>
                                {t.sub_topic}
                              </div>
                            ) : null}
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => openEdit(v)}
                                className="px-2.5 py-1.5 text-xs rounded-lg text-indigo-700 hover:bg-indigo-50"
                              >
                                Sửa
                              </button>
                              <button
                                onClick={() => openDelete(v)}
                                className="px-2.5 py-1.5 text-xs rounded-lg text-rose-700 hover:bg-rose-50"
                              >
                                Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden p-3 space-y-3">
            {filteredVocabs.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-sm font-medium text-slate-700">
                  {searchTerm ? "Không tìm thấy từ vựng phù hợp" : "Chưa có từ vựng nào"}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {searchTerm ? "Thử từ khóa khác hoặc xóa lọc." : "Bấm “Thêm từ” để tạo từ vựng mới."}
                </div>
              </div>
            ) : (
              filteredVocabs.map((v) => {
                const t = testsById[v.test_id];
                return (
                  <div key={v._id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900">{v.word}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {v.phonetic ? `/${v.phonetic}/ • ` : ""}
                          {v.meaning || "—"}
                        </div>
                      </div>

                      <div className="flex gap-1">
                        <button
                          onClick={() => openEdit(v)}
                          className="px-2.5 py-1.5 text-xs rounded-lg text-indigo-700 hover:bg-indigo-50"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => openDelete(v)}
                          className="px-2.5 py-1.5 text-xs rounded-lg text-rose-700 hover:bg-rose-50"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>

                    {v.example_sentence ? (
                      <div className="mt-2 text-xs text-slate-700">
                        <div className="italic">“{v.example_sentence}”</div>
                        {v.example_meaning ? <div className="text-slate-500 mt-1">→ {v.example_meaning}</div> : null}
                      </div>
                    ) : null}

                    {t ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {t.test_title ? (
                          <span className="px-2 py-1 text-[11px] rounded-full bg-slate-100 text-slate-700">
                            {t.test_title}
                          </span>
                        ) : null}
                        {t.main_topic ? (
                          <span className="px-2 py-1 text-[11px] rounded-full bg-indigo-50 text-indigo-700">
                            {t.main_topic}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <ModalShell
          title="Thêm từ vựng"
          subtitle="Tạo một từ vựng mới cho bài kiểm tra"
          onClose={() => setShowCreateModal(false)}
          maxWidth="max-w-2xl"
        >
          <VocabForm
            onSubmit={handleCreateSubmit}
            buttonText="Tạo mới"
            formData={formData}
            setFormData={setFormData}
            allTests={allTests}
            onCancel={() => setShowCreateModal(false)}
          />
        </ModalShell>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <ModalShell
          title="Chỉnh sửa từ vựng"
          subtitle={selectedVocab?.word ? `Đang sửa: ${selectedVocab.word}` : ""}
          onClose={() => setShowEditModal(false)}
          maxWidth="max-w-2xl"
        >
          <VocabForm
            onSubmit={handleEditSubmit}
            buttonText="Cập nhật"
            formData={formData}
            setFormData={setFormData}
            allTests={allTests}
            onCancel={() => setShowEditModal(false)}
          />
        </ModalShell>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <ModalShell
          title="Xác nhận xóa"
          subtitle="Hành động này không thể hoàn tác"
          onClose={() => setShowDeleteModal(false)}
          maxWidth="max-w-md"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center">
              <Icon.Warning className="w-5 h-5 text-rose-600" />
            </div>
            <div className="min-w-0">
              <div className="text-sm text-slate-800">
                Bạn có chắc chắn muốn xóa từ <span className="font-semibold">“{selectedVocab?.word}”</span>?
              </div>
              <div className="text-xs text-slate-500 mt-1">Từ vựng sẽ bị xóa khỏi hệ thống.</div>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              onClick={handleDeleteConfirm}
              className="flex-1 px-3 py-2 text-sm rounded-lg bg-rose-600 text-white hover:bg-rose-700"
            >
              Xóa
            </button>
          </div>
        </ModalShell>
      )}
    </AdminLayout>
  );
};

export default AdminVocabularies;
