import React, { useEffect, useState } from "react";
import multipleChoiceService from "../services/multipleChoiceService";
import { getCorrectAnswerLabels, isCorrectAnswer } from "../utils/correctAnswerHelpers";
import Toast from './Toast';

const getDefaultMCPData = (testId) => ({
  question_text: "",
  options: [
    { label: "A", text: "" }, { label: "B", text: "" }, { label: "C", text: "" },
    { label: "D", text: "" }, { label: "E", text: "" },
  ],
  correct_answers: [],
  explanation: { correct: {}, incorrect_choices: {} },
  difficulty: "easy",
  test_id: testId,
  status: "active",
});

const AdminMCPQuestionModal = ({ isOpen, onClose, testId, question = null, onQuestionSaved, allTests = [] }) => {
  const isEditMode = !!question;

  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState(null);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ message: '', type: 'success', isVisible: false });
  const [inputMode, setInputMode] = useState('manual');
  const [pasteText, setPasteText] = useState('');
  const [parseError, setParseError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setErrorBanner(null);
    setErrors({});
    setInputMode('manual');
    setPasteText('');
    setParseError('');

    if (isEditMode && question) {
      const normalizeToPlainMap = (raw) => {
        const out = {};
        if (!raw) return out;

        if (raw instanceof Map) {
          raw.forEach((v, k) => {
            const key = String(k || "").trim();
            if (!key) return;
            out[key] = String(v || "").trim();
          });
          return out;
        }

        if (typeof raw === "object" && !Array.isArray(raw)) {
          Object.entries(raw).forEach(([k, v]) => {
            const key = String(k || "").trim();
            if (!key) return;
            out[key] = String(v || "").trim();
          });
          return out;
        }

        return out;
      };

      const editData = {
        test_id: question.test_id || testId,
        question_text: question.question_text || "",
        options: question.options || [],
        correct_answers: question.correct_answers || [],
        explanation: { correct: {}, incorrect_choices: {} },
        difficulty: question.difficulty || "easy",
        status: question.status || "active",
      };
      if (question.options && Array.isArray(question.options)) {
        editData.options = question.options.map((opt, idx) => ({
          label: String(opt?.label || ["A", "B", "C", "D", "E"][idx] || "").trim(),
          text: opt.text || opt || "",
        }));
      }
      if (question.correct_answers) {
        editData.correct_answers = getCorrectAnswerLabels(question.correct_answers);
      }

      // Keep original explanation data when editing:
      // - correct can be string or map/object
      // - incorrect_choices can be map/object
      const correctLabels = getCorrectAnswerLabels(editData.correct_answers || []);
      const expl = question.explanation || {};
      const correctRaw = expl.correct;
      const incorrectRaw = expl.incorrect_choices;

      const correctMap = normalizeToPlainMap(correctRaw);
      const incorrectMap = normalizeToPlainMap(incorrectRaw);

      // Legacy case: explanation.correct is a plain string => attach to all correct labels
      if (typeof correctRaw === "string" && correctRaw.trim()) {
        correctLabels.forEach((lb) => {
          if (lb) correctMap[lb] = correctRaw.trim();
        });
      }

      editData.explanation = {
        correct: correctMap,
        incorrect_choices: incorrectMap,
      };

      setFormData(editData);
    } else {
      setFormData(getDefaultMCPData(testId));
    }
  }, [isOpen, isEditMode, question?._id, testId]);

  const setField = (k, v) => setFormData((p) => ({ ...p, [k]: v }));
  const showToast = (message, type = 'success') => setToast({ message, type, isVisible: true });
  const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }));

  const handleOptionChange = (index, value) => {
    setFormData((prev) => {
      const newOptions = [...(prev.options || [])];
      if (newOptions[index]) newOptions[index] = { ...newOptions[index], text: value };
      return { ...prev, options: newOptions };
    });
  };

  const toggleCorrectAnswer = (label) => {
    const current = formData.correct_answers || [];
    setField("correct_answers", current.includes(label) ? current.filter((a) => a !== label) : [...current, label]);
  };

  const setIncorrectExplanation = (label, text) => {
    setField("explanation", {
      ...(formData.explanation || {}),
      correct: formData.explanation?.correct || {},
      incorrect_choices: { ...(formData.explanation?.incorrect_choices || {}), [label]: text },
    });
  };

  const setCorrectExplanation = (label, text) => {
    setField("explanation", {
      ...(formData.explanation || {}),
      correct: { ...(formData.explanation?.correct || {}), [label]: text },
      incorrect_choices: formData.explanation?.incorrect_choices || {},
    });
  };

  const parseQuestionsText = (text) => {
    try {
      const sections = text.trim().split(/\n\s*\n/);
      const questions = [];
      const errs = [];
      sections.forEach((section, sectionIdx) => {
        const lines = section.trim().split('\n').map(line => line.trim()).filter(line => line);
        if (lines.length < 3) { errs.push(`Đoạn ${sectionIdx + 1}: Cần ít nhất 3 dòng`); return; }
        const question = { options: [], explanation: { correct: {}, incorrect_choices: {} } };
        question.question_text = lines[0];
        const lastLine = lines[lines.length - 1];
        if (!/^[A-E]$/i.test(lastLine)) { errs.push(`Đoạn ${sectionIdx + 1}: Dòng cuối phải là A-E`); return; }
        question.correct_answers = [lastLine.toUpperCase()];
        lines.slice(1, -1).forEach((line, idx) => {
          const label = ['A', 'B', 'C', 'D', 'E'][idx];
          if (!label) return;
          if (line.includes(';')) {
            const [text2, explanation] = line.split(';', 2);
            question.options.push({ label, text: text2.trim() });
            if (explanation?.trim()) {
              if (getCorrectAnswerLabels(question.correct_answers).includes(label)) {
                question.explanation.correct = {};
              } else {
                question.explanation.incorrect_choices[label] = explanation.trim();
              }
            }
          } else {
            question.options.push({ label, text: line.trim() });
          }
        });
        questions.push(question);
      });
      return { questions, errors: errs };
    } catch (error) {
      return { questions: [], errors: [`Lỗi parse: ${error.message}`] };
    }
  };

  const handleParseText = () => {
    if (!pasteText.trim()) { setParseError('Vui lòng nhập text cần parse'); return; }
    const { questions, errors: errs } = parseQuestionsText(pasteText);
    if (errs.length > 0) { setParseError(errs.join('\n')); return; }
    if (questions.length === 0) { setParseError('Không tìm thấy câu hỏi hợp lệ nào'); return; }
    setFormData(prev => ({ ...prev, ...questions[0], test_id: testId }));
    setParseError('');
    setInputMode('manual');
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.question_text?.trim()) newErrors.question_text = "Vui lòng nhập câu hỏi";
    if ((formData.options || []).filter(opt => opt?.text?.trim()).length < 2) newErrors.options = "Cần ít nhất 2 lựa chọn";
    if (!formData.correct_answers?.length) newErrors.correct_answers = "Chọn ít nhất 1 đáp án đúng";
    if (!isEditMode && (!formData.test_id || formData.test_id === "")) newErrors.test_id = "Vui lòng chọn bài test";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrorBanner(null);
    try {
      const payload = { ...formData };

      // Normalize options to stable A-E labels and plain strings
      const normalizedOptions = (formData.options || [])
        .filter((opt) => opt?.text?.trim())
        .map((opt, idx) => ({
          label: String(opt?.label || ["A", "B", "C", "D", "E"][idx] || "").trim(),
          text: String(opt?.text || "").trim(),
        }))
        .filter((opt) => opt.label && opt.text);
      payload.options = normalizedOptions;

      const validLabels = new Set(normalizedOptions.map((opt) => opt.label));
      payload.correct_answers = getCorrectAnswerLabels(formData.correct_answers || []).filter((lb) =>
        validLabels.has(lb)
      );

      // Ensure test_id is always an id string (not populated object)
      if (payload.test_id && typeof payload.test_id === "object") {
        payload.test_id = payload.test_id._id || payload.test_id.id || "";
      }
      if (payload.test_id != null) payload.test_id = String(payload.test_id);

      // Convert explanation maps to plain object with string keys only
      const toPlainMap = (raw) => {
        const out = {};
        if (!raw) return out;

        if (raw instanceof Map) {
          raw.forEach((v, k) => {
            const key = String(k || "").trim();
            if (!key) return;
            out[key] = String(v || "").trim();
          });
          return out;
        }

        if (Array.isArray(raw)) {
          raw.forEach((entry) => {
            if (Array.isArray(entry) && entry.length >= 2) {
              const key = String(entry[0] || "").trim();
              if (!key) return;
              out[key] = String(entry[1] || "").trim();
              return;
            }
            if (entry && typeof entry === "object") {
              const key = String(entry.key ?? entry.label ?? "").trim();
              const val = String(entry.value ?? entry.text ?? "").trim();
              if (key) out[key] = val;
            }
          });
          return out;
        }

        if (typeof raw === "object") {
          Object.entries(raw).forEach(([k, v]) => {
            const key = String(k || "").trim();
            if (!key) return;
            out[key] = String(v || "").trim();
          });
          return out;
        }

        return out;
      };

      const correctMapRaw = toPlainMap(formData.explanation?.correct);
      const incorrectMapRaw = toPlainMap(formData.explanation?.incorrect_choices);
      const correctMap = {};
      const incorrectMap = {};

      Object.entries(correctMapRaw).forEach(([k, v]) => {
        if (validLabels.has(k) && v) correctMap[k] = v;
      });
      Object.entries(incorrectMapRaw).forEach(([k, v]) => {
        if (validLabels.has(k) && v) incorrectMap[k] = v;
      });

      payload.explanation = {
        correct: correctMap,
        incorrect_choices: incorrectMap,
      };

      if (isEditMode && payload.hasOwnProperty('difficulty')) delete payload.difficulty;
      const response = isEditMode
        ? await multipleChoiceService.updateMultipleChoice(question._id, payload)
        : await multipleChoiceService.createMultipleChoice(payload);
      if (onQuestionSaved) onQuestionSaved(response);
      showToast(isEditMode ? 'Cập nhật câu hỏi thành công!' : 'Tạo câu hỏi thành công!', 'success');
      setTimeout(() => { onClose(); }, 1500);
    } catch (error) {
      console.error('Error saving question:', error);
      const errorMessage = error.message || 'Có lỗi xảy ra khi lưu câu hỏi';
      setErrorBanner(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="flex min-h-full items-center justify-center p-2 sm:p-3">
        <div className="relative bg-white rounded-2xl border-[3px] border-amber-500 ring-2 ring-amber-100 shadow-2xl max-w-3xl w-full max-h-[95vh] flex flex-col">

          {/* Header */}
          <div className="bg-gradient-to-r from-amber-600 to-orange-700 px-4 py-4 flex-shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 border-2 border-white/40 flex items-center justify-center text-lg">
                  {isEditMode ? "✏️" : "➕"}
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-white">
                    {isEditMode ? "Sửa" : "Thêm"} câu hỏi trắc nghiệm
                  </h2>
                  <p className="text-[11px] text-violet-200 font-medium">
                    {isEditMode ? "Chỉnh sửa thông tin câu hỏi" : "Tạo câu hỏi mới cho bài kiểm tra"}
                  </p>
                </div>
              </div>
              <button onClick={onClose}
                className="w-8 h-8 rounded-xl bg-white/20 border-2 border-white/40 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto bg-gradient-to-br from-amber-50/40 to-orange-50/30">
            <form onSubmit={handleSubmit} className="p-4 space-y-4">

              {errorBanner && (
                <div className="rounded-xl border-2 border-rose-400 bg-rose-50 p-3 text-xs font-bold text-rose-800">
                  ⚠️ {errorBanner}
                </div>
              )}

              {/* Test Selection */}
              {!isEditMode && allTests.length > 0 && (
                <div>
                  <label className="block text-xs font-extrabold text-amber-800 mb-1.5">
                    Chọn bài test <span className="text-rose-600">*</span>
                  </label>
                  <select value={formData.test_id || testId || ''}
                    onChange={(e) => setField("test_id", e.target.value)}
                    className={`w-full text-xs text-slate-900 px-2.5 py-2 rounded-xl border-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 ${errors.test_id ? "border-rose-400 bg-rose-50" : "border-amber-300"}`}>
                    <option value="">-- Chọn bài test --</option>
                    {allTests.map((test) => (
                      <option key={test._id} value={test._id}>{test.test_title} ({test.main_topic} - {test.sub_topic})</option>
                    ))}
                  </select>
                  {errors.test_id && <p className="mt-1 text-[11px] font-bold text-rose-800">{errors.test_id}</p>}
                </div>
              )}

              {/* Mode Tabs */}
              {!isEditMode && (
                <div className="flex gap-1 bg-amber-100 p-1 rounded-xl border-2 border-amber-200">
                  {['manual', 'paste'].map((mode) => (
                    <button key={mode} type="button" onClick={() => setInputMode(mode)}
                      className={`flex-1 px-3 py-2 text-xs font-extrabold rounded-lg transition-colors ${inputMode === mode
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-amber-700 hover:bg-amber-200'}`}>
                      {mode === 'manual' ? '✏️ Nhập thủ công' : '📋 Dán text'}
                    </button>
                  ))}
                </div>
              )}

              {/* Paste Mode */}
              {!isEditMode && inputMode === 'paste' && (
                <div className="space-y-3 bg-white rounded-2xl border-2 border-amber-200 p-4">
                  <div>
                    <label className="block text-xs font-extrabold text-amber-800 mb-1.5">
                      Dán text câu hỏi <span className="text-rose-600">*</span>
                    </label>
                    <textarea rows={6} value={pasteText} onChange={(e) => setPasteText(e.target.value)}
                      placeholder={`Nhập theo format:\n\nCâu hỏi của bạn?\nĐáp án A; Giải thích\nĐáp án B; Giải thích\nĐáp án C\nA\n\n(Dòng cuối là chữ cái đáp án đúng)`}
                      className="w-full px-3 py-2 rounded-xl border-2 border-amber-200 bg-amber-50 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400" />
                  </div>
                  {parseError && (
                    <div className="rounded-xl border-2 border-rose-400 bg-rose-50 p-2.5 text-xs font-bold text-rose-800 whitespace-pre-line">
                      {parseError}
                    </div>
                  )}
                  <button type="button" onClick={handleParseText}
                    className="px-4 py-2 rounded-xl border-[3px] border-emerald-700 bg-emerald-600 text-white font-extrabold text-xs hover:bg-emerald-700 transition-colors shadow-sm">
                    Parse và áp dụng
                  </button>
                </div>
              )}

              {/* Question Text */}
              <div className="bg-white rounded-2xl border-2 border-amber-200 p-4">
                <label className="block text-xs font-extrabold text-amber-800 mb-1.5">
                  Câu hỏi <span className="text-rose-600">*</span>
                </label>
                <textarea rows={2} value={formData.question_text || ""}
                  onChange={(e) => setField("question_text", e.target.value)}
                  placeholder="Nhập câu hỏi trắc nghiệm..."
                  className={`w-full text-sm text-slate-900 placeholder:text-slate-400 px-3 py-2 rounded-xl border-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 ${errors.question_text ? "border-rose-400 bg-rose-50" : "border-amber-200"}`} />
                {errors.question_text && <p className="mt-1 text-[11px] font-bold text-rose-800">{errors.question_text}</p>}
              </div>

              {/* Options */}
              <div className="bg-white rounded-2xl border-2 border-amber-200 p-4">
                <label className="block text-xs font-extrabold text-amber-800 mb-2.5">
                  Các lựa chọn <span className="text-rose-600">*</span>
                </label>
                <div className="space-y-2">
                  {(formData.options || []).map((opt, idx) => {
                    const isCorrect = (formData.correct_answers || []).includes(opt?.label);
                    return (
                      <div key={opt?.label || idx}
                        className={`p-2.5 rounded-xl border-2 transition-colors ${isCorrect
                          ? "bg-emerald-50 border-emerald-500 ring-1 ring-emerald-200"
                          : "bg-white border-amber-200 hover:border-amber-400"}`}>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={isCorrect} onChange={() => toggleCorrectAnswer(opt?.label)}
                            className="w-3.5 h-3.5 text-emerald-600 border-2 border-slate-400 rounded focus:ring-emerald-500" />
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-extrabold ${isCorrect ? "bg-emerald-600 text-white" : "bg-amber-700 text-white"}`}>
                            {opt?.label}
                          </span>
                          <input type="text" value={opt?.text || ""}
                            onChange={(e) => handleOptionChange(idx, e.target.value)}
                            placeholder={`Nội dung đáp án ${opt?.label}...`}
                            className="flex-1 bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none font-medium" />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {errors.options && <p className="mt-1.5 text-[11px] font-bold text-rose-800">{errors.options}</p>}
                {errors.correct_answers && <p className="mt-1 text-[11px] font-bold text-rose-800">{errors.correct_answers}</p>}
              </div>

              {/* Explanations */}
              <div className="space-y-3">
                {/* Correct explanations */}
                {(formData.options || []).some(opt => (formData.correct_answers || []).includes(opt?.label)) && (
                  <div className="bg-white rounded-2xl border-2 border-emerald-200 p-4">
                    <label className="block text-xs font-extrabold text-emerald-800 mb-2">💡 Giải thích đáp án đúng</label>
                    <div className="space-y-2">
                      {(formData.options || []).map((opt, idx) => {
                        const isCorrect = (formData.correct_answers || []).includes(opt?.label);
                        if (!isCorrect) return null;
                        return (
                          <div key={idx} className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-2.5 border-l-4 border-l-emerald-700">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <span className="w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white">
                                {opt?.label}
                              </span>
                              <span className="text-[10px] font-extrabold text-emerald-900 line-clamp-1">
                                {opt?.text || "Chưa có nội dung"}
                              </span>
                            </div>
                            <textarea rows={1} value={formData.explanation?.correct?.[opt?.label] || ""}
                              onChange={(e) => setCorrectExplanation(opt?.label, e.target.value)}
                              placeholder={`Giải thích tại sao đáp án ${opt?.label} đúng...`}
                              className="w-full px-2.5 py-1.5 rounded-xl border-2 border-emerald-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Incorrect explanations */}
                {(formData.options || []).some(opt => !(formData.correct_answers || []).includes(opt?.label)) && (
                  <div className="bg-white rounded-2xl border-2 border-rose-200 p-4">
                    <label className="block text-xs font-extrabold text-rose-800 mb-2">💬 Giải thích đáp án sai (tùy chọn)</label>
                    <div className="space-y-2">
                      {(formData.options || []).map((opt, idx) => {
                        const isCorrect = (formData.correct_answers || []).includes(opt?.label);
                        if (isCorrect) return null;
                        return (
                          <div key={idx} className="rounded-xl border-2 border-rose-300 bg-rose-50 p-2.5 border-l-4 border-l-rose-700">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <span className="w-5 h-5 bg-rose-600 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white">
                                {opt?.label}
                              </span>
                              <span className="text-[10px] font-extrabold text-rose-900 line-clamp-1">
                                {opt?.text || "Chưa có nội dung"}
                              </span>
                            </div>
                            <textarea rows={1} value={formData.explanation?.incorrect_choices?.[opt?.label] || ""}
                              onChange={(e) => setIncorrectExplanation(opt?.label, e.target.value)}
                              placeholder={`Vì sao đáp án ${opt?.label} sai...`}
                              className="w-full px-2.5 py-1.5 rounded-xl border-2 border-rose-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-500" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t-2 border-amber-200 bg-amber-50">
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 text-sm font-extrabold text-slate-700 bg-white border-[3px] border-slate-300 rounded-xl hover:bg-slate-50 transition-colors">
              Hủy
            </button>
            <button type="submit" onClick={handleSubmit} disabled={loading}
              className="px-5 py-2.5 text-sm font-extrabold text-white bg-amber-600 border-[3px] border-amber-800 rounded-xl hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md flex items-center gap-2">
              {loading && (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" fill="none" />
                  <path d="M12 2a10 10 0 0110 10h-4a6 6 0 00-6-6V2z" fill="currentColor" className="opacity-75" />
                </svg>
              )}
              {isEditMode ? "Cập nhật" : "Tạo câu hỏi"}
            </button>
          </div>
        </div>
      </div>

      <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={hideToast} />
    </div>
  );
};

export default AdminMCPQuestionModal;
