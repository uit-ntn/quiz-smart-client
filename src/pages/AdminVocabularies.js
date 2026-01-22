import React, { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout, { useSidebar } from "../layout/AdminLayout";
import vocabularyService from "../services/vocabularyService";
import testService from "../services/testService";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import AdminVocabularyQuestionModal from "../components/AdminVocabularyQuestionModal";
import Toast from "../components/Toast";

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
   Main Component
========================= */

const AdminVocabularies = () => {
  const { sidebarCollapsed } = useSidebar();
  const [vocabularies, setVocabularies] = useState([]);
  const [testsById, setTestsById] = useState({});
  const [allTests, setAllTests] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTestId, setSelectedTestId] = useState("");
  const [selectedMainTopic, setSelectedMainTopic] = useState("");
  const [selectedSubTopic, setSelectedSubTopic] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [duplicateFilter, setDuplicateFilter] = useState("");
  const [mainTopics, setMainTopics] = useState([]);
  const [subTopics, setSubTopics] = useState([]);

  const filteredSubTopics = useMemo(() => {
    if (!selectedMainTopic) return subTopics;
    return [...new Set(allTests.filter(t => t.main_topic === selectedMainTopic).map(t => t.sub_topic).filter(Boolean))];
  }, [allTests, selectedMainTopic, subTopics]);

  // Map of word -> count to detect duplicates
  const duplicatesMap = useMemo(() => {
    const map = {};
    (vocabularies || []).forEach((v) => {
      const key = (v.word || "").toString().trim().toLowerCase();
      if (!key) return;
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [vocabularies]);

  const filteredTests = useMemo(() => {
    let filtered = [...allTests];
    
    if (selectedMainTopic) {
      filtered = filtered.filter(t => t.main_topic === selectedMainTopic);
    }
    
    if (selectedSubTopic) {
      filtered = filtered.filter(t => t.sub_topic === selectedSubTopic);
    }
    
    return filtered;
  }, [allTests, selectedMainTopic, selectedSubTopic]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  
  // Bulk selection state
  const [selectedVocabs, setSelectedVocabs] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  const [selectedVocab, setSelectedVocab] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");

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

      // Extract unique main topics and sub topics
      setMainTopics([...new Set(vocabularyTests.map(t => t.main_topic).filter(Boolean))]);
      setSubTopics([...new Set(vocabularyTests.map(t => t.sub_topic).filter(Boolean))]);

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
    let filtered = vocabularies;
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((v) => {
        const w = (v.word || "").toLowerCase();
        const m = (v.meaning || "").toLowerCase();
        return w.includes(q) || m.includes(q);
      });
    }
    if (selectedTestId) {
      filtered = filtered.filter((v) => v.test_id === selectedTestId);
    }
    if (selectedMainTopic) {
      filtered = filtered.filter((v) => {
        const t = testsById[v.test_id];
        return t?.main_topic === selectedMainTopic;
      });
    }
    if (selectedSubTopic) {
      filtered = filtered.filter((v) => {
        const t = testsById[v.test_id];
        return t?.sub_topic === selectedSubTopic;
      });
    }

    // Filter by CEFR level
    if (selectedLevel) {
      filtered = filtered.filter((v) => (v.cefr_level || "").toUpperCase() === selectedLevel.toUpperCase());
    }

    

    // Filter duplicates / unique words
    if (duplicateFilter === 'unique') {
      filtered = filtered.filter((v) => {
        const key = (v.word || "").toString().trim().toLowerCase();
        return (duplicatesMap[key] || 0) === 1;
      });
    } else if (duplicateFilter === 'duplicate') {
      filtered = filtered.filter((v) => {
        const key = (v.word || "").toString().trim().toLowerCase();
        return (duplicatesMap[key] || 0) > 1;
      });
    }
    return filtered;
  }, [vocabularies, searchTerm, selectedTestId, selectedMainTopic, selectedSubTopic, selectedLevel, testsById, duplicateFilter, duplicatesMap]);

  // Reset sub topic when main topic changes
  useEffect(() => {
    if (selectedMainTopic && !filteredSubTopics.includes(selectedSubTopic)) {
      setSelectedSubTopic("");
    }
  }, [selectedMainTopic, filteredSubTopics, selectedSubTopic]);

  // Reset test when main topic or sub topic changes
  useEffect(() => {
    if ((selectedMainTopic || selectedSubTopic) && !filteredTests.some(t => t._id === selectedTestId)) {
      setSelectedTestId("");
    }
  }, [selectedMainTopic, selectedSubTopic, filteredTests, selectedTestId]);

  // Clear selection when filters change
  useEffect(() => {
    setSelectedVocabs([]);
    setSelectAll(false);
  }, [searchTerm, selectedTestId, selectedMainTopic, selectedSubTopic, selectedLevel, duplicateFilter]);

  // Bulk selection functions
  const handleSelectAll = (checked) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedVocabs(filteredVocabs.map(v => v._id));
    } else {
      setSelectedVocabs([]);
    }
  };

  const handleSelectVocab = (vocabId, checked) => {
    if (checked) {
      const newSelected = [...selectedVocabs, vocabId];
      setSelectedVocabs(newSelected);
      if (newSelected.length === filteredVocabs.length) {
        setSelectAll(true);
      }
    } else {
      const newSelected = selectedVocabs.filter(id => id !== vocabId);
      setSelectedVocabs(newSelected);
      setSelectAll(false);
    }
  };

  const openBulkDelete = () => {
    if (selectedVocabs.length > 0) {
      setShowBulkDeleteModal(true);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedVocabs.length === 0) return;

    try {
      // Delete all selected vocabularies
      await Promise.all(selectedVocabs.map(id => vocabularyService.deleteVocabulary(id)));
      
      // Remove deleted items from state
      setVocabularies(prev => prev.filter(v => !selectedVocabs.includes(v._id)));
      
      // Clear selection
      setSelectedVocabs([]);
      setSelectAll(false);
      setShowBulkDeleteModal(false);
      
      // Show success message
      setToastMessage(`Đã xóa ${selectedVocabs.length} từ vựng`);
      setToastType('success');
      setShowToast(true);
    } catch (err) {
      console.error('Error bulk deleting vocabularies:', err);
      setToastMessage('Không thể xóa một số từ vựng. Vui lòng thử lại!');
      setToastType('error');
      setShowToast(true);
    }
  };

  const openCreate = () => {
    setSelectedVocab(null);
    setShowCreateModal(true);
  };

  const openEdit = (vocab) => {
    setSelectedVocab(vocab);
    setShowEditModal(true);
  };

  const openDelete = (vocab) => {
    setSelectedVocab(vocab);
    setShowDeleteModal(true);
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

  const handleVocabSaved = (response, action, message) => {
    // Refresh vocabularies list
    loadPageData();
    // Close modals
    setShowCreateModal(false);
    setShowEditModal(false);
    setSelectedVocab(null);
    // Show toast
    if (action === 'error') {
      setToastMessage(message || 'Có lỗi khi lưu từ vựng');
      setToastType('error');
      setShowToast(true);
      return;
    }

    const msg = action === 'update' ? 'Cập nhật từ vựng thành công' : 'Tạo từ vựng thành công';
    setToastMessage(msg);
    setToastType('success');
    setShowToast(true);
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
      <div className="w-full px-2 sm:px-5 lg:px-8 py-2 space-y-4">
        {/* Content */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Compact Filter Toolbar */}
          <div className="px-4 py-3 border-b border-gray-100 bg-white">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 mr-4">
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm theo từ vựng hoặc nghĩa..."
                  className="w-full px-2 py-1 border border-gray-200 rounded-md bg-white text-sm"
                />
              </div>

              <div className="flex items-center space-x-3">
                {selectedVocabs.length > 0 && (
                  <button
                    onClick={openBulkDelete}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-red-500 hover:bg-red-600 text-white"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Xóa ({selectedVocabs.length})</span>
                  </button>
                )}
                <button
                  onClick={loadPageData}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  <Icon.Refresh className="w-4 h-4" />
                  <span className="hidden sm:inline">Làm mới</span>
                </button>
                <button
                  onClick={openCreate}
                  className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white h-9 px-3 text-sm rounded-lg inline-flex items-center gap-2"
                >
                  <Icon.Plus className="w-4 h-4" />
                  <span>Thêm từ</span>
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select
                value={duplicateFilter}
                onChange={(e) => setDuplicateFilter(e.target.value)}
                className="px-2 py-1 border border-gray-200 rounded-md text-sm bg-white"
                title="Lọc trùng lặp"
              >
                <option value="">Tất cả</option>
                <option value="unique">Chỉ từ không trùng</option>
                <option value="duplicate">Chỉ từ trùng</option>
              </select>

              <select
                value={selectedTestId}
                onChange={(e) => setSelectedTestId(e.target.value)}
                className="px-2 py-1 border border-gray-200 rounded-md text-sm bg-white"
              >
                <option value="">Tất cả Bài Test</option>
                {filteredTests.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.test_title}
                  </option>
                ))}
              </select>

              <select
                value={selectedMainTopic}
                onChange={(e) => setSelectedMainTopic(e.target.value)}
                className="px-2 py-1 border border-gray-200 rounded-md text-sm bg-white"
              >
                <option value="">Tất cả Chủ Đề</option>
                {mainTopics.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
              </select>

              <select
                value={selectedSubTopic}
                onChange={(e) => setSelectedSubTopic(e.target.value)}
                className="px-2 py-1 border border-gray-200 rounded-md text-sm bg-white"
              >
                <option value="">Tất cả Chủ Đề Phụ</option>
                {filteredSubTopics.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
              </select>

              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="px-2 py-1 border border-gray-200 rounded-md text-sm bg-white"
              >
                <option value="">Tất cả CEFR Level</option>
                <option value="A1">A1</option>
                <option value="A2">A2</option>
                <option value="B1">B1</option>
                <option value="B2">B2</option>
                <option value="C1">C1</option>
                <option value="C2">C2</option>
              </select>

              {/* removed updated-from date filter */}
            </div>

            {error ? (
              <div className="mt-3">
                <ErrorMessage message={error} />
              </div>
            ) : null}
          </div>
          {/* Desktop table */}
          <div className="hidden lg:block">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Từ vựng</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nghĩa</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[200px] max-w-[200px]">Ví dụ</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại từ</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CEFR</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bài kiểm tra</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chủ đề</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredVocabs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-4 text-center text-sm text-gray-500">
                        {searchTerm ? "Không tìm thấy từ vựng phù hợp" : "Chưa có từ vựng nào"}
                      </td>
                    </tr>
                  ) : (
                    filteredVocabs.map((v) => {
                      const t = testsById[v.test_id];
                      return (
                        <tr key={v._id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedVocabs.includes(v._id)}
                              onChange={(e) => handleSelectVocab(v._id, e.target.checked)}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{v.word}</div>
                            {v.phonetic ? <div className="text-xs text-gray-500 mt-0.5">/{v.phonetic}/</div> : null}
                          </td>

                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {v.meaning?.length > 40 ? `${v.meaning.slice(0, 40)}...` : v.meaning || "—"}
                            </div>
                          </td>

                          <td className="px-4 py-3 w-[200px] max-w-[200px]">
                            <div className="text-xs text-slate-700">
                              {v.example_sentence ? (
                                <>
                                  <div className="truncate max-w-[180px]" title={v.example_sentence}>
                                    "{v.example_sentence}"
                                  </div>
                                  {v.example_meaning ? (
                                    <div className="text-slate-500 mt-1 truncate max-w-[180px]" title={v.example_meaning}>
                                      → {v.example_meaning}
                                    </div>
                                  ) : null}
                                </>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </div>
                          </td>

                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {v.part_of_speech ? (
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                  {v.part_of_speech === 'noun' ? 'Danh từ' :
                                   v.part_of_speech === 'verb' ? 'Động từ' :
                                   v.part_of_speech === 'adjective' ? 'Tính từ' :
                                   v.part_of_speech === 'adverb' ? 'Trạng từ' :
                                   v.part_of_speech === 'preposition' ? 'Giới từ' :
                                   v.part_of_speech === 'conjunction' ? 'Liên từ' :
                                   v.part_of_speech === 'pronoun' ? 'Đại từ' :
                                   v.part_of_speech === 'interjection' ? 'Thán từ' :
                                   v.part_of_speech}
                                </span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </div>
                          </td>

                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {v.cefr_level ? (
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  v.cefr_level === 'A1' ? 'bg-green-100 text-green-800' :
                                  v.cefr_level === 'A2' ? 'bg-green-100 text-green-800' :
                                  v.cefr_level === 'B1' ? 'bg-yellow-100 text-yellow-800' :
                                  v.cefr_level === 'B2' ? 'bg-yellow-100 text-yellow-800' :
                                  v.cefr_level === 'C1' ? 'bg-red-100 text-red-800' :
                                  v.cefr_level === 'C2' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {v.cefr_level}
                                </span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </div>
                          </td>

                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="text-sm text-gray-900 truncate max-w-[220px]" title={t?.test_title}>
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
          <div className="lg:hidden">
            {filteredVocabs.length > 0 && (
              <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Chọn tất cả ({filteredVocabs.length})
                </label>
                {selectedVocabs.length > 0 && (
                  <button
                    onClick={openBulkDelete}
                    className="px-3 py-1.5 text-xs rounded-lg bg-red-500 hover:bg-red-600 text-white"
                  >
                    Xóa ({selectedVocabs.length})
                  </button>
                )}
              </div>
            )}
            <div className="p-3 space-y-3">
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
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedVocabs.includes(v._id)}
                        onChange={(e) => handleSelectVocab(v._id, e.target.checked)}
                        className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-900">{v.word}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {v.phonetic ? `/${v.phonetic}/ • ` : ""}
                          {v.meaning || "—"}
                        </div>
                        {(v.part_of_speech || v.cefr_level) && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {v.part_of_speech && (
                              <span className="inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-50 text-blue-700">
                                {v.part_of_speech === 'noun' ? 'Danh từ' :
                                 v.part_of_speech === 'verb' ? 'Động từ' :
                                 v.part_of_speech === 'adjective' ? 'Tính từ' :
                                 v.part_of_speech === 'adverb' ? 'Trạng từ' :
                                 v.part_of_speech}
                              </span>
                            )}
                            {v.cefr_level && (
                              <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded ${
                                v.cefr_level === 'A1' || v.cefr_level === 'A2' ? 'bg-green-50 text-green-700' :
                                v.cefr_level === 'B1' || v.cefr_level === 'B2' ? 'bg-yellow-50 text-yellow-700' :
                                v.cefr_level === 'C1' || v.cefr_level === 'C2' ? 'bg-red-50 text-red-700' :
                                'bg-gray-50 text-gray-700'
                              }`}>
                                {v.cefr_level}
                              </span>
                            )}
                          </div>
                        )}
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
      </div>


      {/* Create Modal */}
      <AdminVocabularyQuestionModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
        }}
        testId={null}
        question={null}
        onQuestionSaved={handleVocabSaved}
        allTests={allTests}
      />

      {/* Edit Modal */}
      <AdminVocabularyQuestionModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedVocab(null);
        }}
        testId={selectedVocab?.test_id}
        question={selectedVocab}
        onQuestionSaved={handleVocabSaved}
        allTests={allTests}
      />

      {/* Toast */}
      <Toast isVisible={showToast} message={toastMessage} type={toastType} onClose={() => setShowToast(false)} />

      {/* Bulk Delete Modal */}
      {showBulkDeleteModal && (
        <ModalShell
          title="Xác nhận xóa nhiều"
          subtitle="Hành động này không thể hoàn tác"
          onClose={() => setShowBulkDeleteModal(false)}
          maxWidth="max-w-md"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center">
              <Icon.Warning className="w-5 h-5 text-rose-600" />
            </div>
            <div className="min-w-0">
              <div className="text-sm text-slate-800">
                Bạn có chắc chắn muốn xóa <span className="font-semibold">{selectedVocabs.length} từ vựng</span> đã chọn?
              </div>
              <div className="text-xs text-slate-500 mt-1">Tất cả từ vựng được chọn sẽ bị xóa khỏi hệ thống.</div>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setShowBulkDeleteModal(false)}
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              onClick={handleBulkDeleteConfirm}
              className="flex-1 px-3 py-2 text-sm rounded-lg bg-rose-600 text-white hover:bg-rose-700"
            >
              Xóa {selectedVocabs.length} từ
            </button>
          </div>
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
