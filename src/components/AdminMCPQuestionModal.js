import React, { useEffect, useMemo, useRef, useState } from "react";
import multipleChoiceService from "../services/multipleChoiceService";
import { getCorrectAnswerLabels, isCorrectAnswer } from "../utils/correctAnswerHelpers";
import Toast from './Toast';

// Giá trị mặc định cho Multiple Choice
const getDefaultMCPData = (testId) => ({
  question_text: "",
  options: [
    { label: "A", text: "" },
    { label: "B", text: "" },
    { label: "C", text: "" },
    { label: "D", text: "" },
    { label: "E", text: "" },
  ],
  correct_answers: [],
  explanation: {
    correct: {},
    incorrect_choices: {},
  },
  difficulty: "easy",
  test_id: testId,
  status: "active",
});

const AdminMCPQuestionModal = ({
  isOpen,
  onClose,
  testId,
  question = null,
  onQuestionSaved,
  allTests = [],
}) => {
  const isEditMode = !!question;

  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState(null);
  const [errors, setErrors] = useState({});
  
  // Toast state
  const [toast, setToast] = useState({ message: '', type: 'success', isVisible: false });
  
  // Parse text mode
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
      console.log('AdminMCPQuestionModal - Edit mode, question data:', question);
      
      const editData = {
        test_id: question.test_id || testId,
        question_text: question.question_text || "",
        options: question.options || [],
        correct_answers: question.correct_answers || [],
        explanation: (() => {
          const expl = question.explanation || { correct: {}, incorrect_choices: {} };
          // Convert old string format to object format if needed
          if (typeof expl.correct === 'string') {
            // If it's a string, try to parse it or create empty object
            expl.correct = {};
          }
          // Ensure correct is always an object
          if (!expl.correct || typeof expl.correct !== 'object') {
            expl.correct = {};
          }
          return expl;
        })(),
        difficulty: question.difficulty || "easy",
        status: question.status || "active",
      };

      // Ensure options format
      if (question.options && Array.isArray(question.options)) {
        editData.options = question.options.map((opt, idx) => ({
          label: opt.label || ["A", "B", "C", "D", "E"][idx],
          text: opt.text || opt || "",
        }));
      }

      // Ensure correct_answers is array
      if (question.correct_answers) {
        editData.correct_answers = Array.isArray(question.correct_answers)
          ? question.correct_answers
          : [question.correct_answers];
      }

      console.log('AdminMCPQuestionModal - Setting edit data:', editData);
      setFormData(editData);
    } else {
      console.log('AdminMCPQuestionModal - Create mode, setting default data');
      setFormData(getDefaultMCPData(testId));
    }
  }, [isOpen, isEditMode, question?._id, testId]);

  const setField = (k, v) => setFormData((p) => ({ ...p, [k]: v }));

  const showToast = (message, type = 'success') => {
    setToast({ message, type, isVisible: true });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, isVisible: false }));
  };

  const handleOptionChange = (index, value) => {
    setFormData((prev) => {
      const newOptions = [...(prev.options || [])];
      if (newOptions[index]) {
        newOptions[index] = { ...newOptions[index], text: value };
      }
      return { ...prev, options: newOptions };
    });
  };

  const toggleCorrectAnswer = (label) => {
    const current = formData.correct_answers || [];
    const newAnswers = current.includes(label)
      ? current.filter((a) => a !== label)
      : [...current, label];
    setField("correct_answers", newAnswers);
  };

  const setIncorrectExplanation = (label, text) => {
    setField("explanation", {
      ...(formData.explanation || {}),
      correct: formData.explanation?.correct || {},
      incorrect_choices: {
        ...(formData.explanation?.incorrect_choices || {}),
        [label]: text,
      },
    });
  };

  const setCorrectExplanation = (label, text) => {
    setField("explanation", {
      ...(formData.explanation || {}),
      correct: {
        ...(formData.explanation?.correct || {}),
        [label]: text,
      },
      incorrect_choices: formData.explanation?.incorrect_choices || {},
    });
  };

  // Parse text format
  const parseQuestionsText = (text) => {
    try {
      const sections = text.trim().split(/\n\s*\n/);
      const questions = [];
      const errors = [];

      sections.forEach((section, sectionIdx) => {
        const lines = section.trim().split('\n').map(line => line.trim()).filter(line => line);
        
        if (lines.length < 3) {
          errors.push(`Đoạn ${sectionIdx + 1}: Cần ít nhất 3 dòng (câu hỏi + 2 đáp án + chỉ số đáp án đúng)`);
          return;
        }

        const question = { options: [], explanation: { correct: {}, incorrect_choices: {} } };
        
        question.question_text = lines[0];
        const lastLine = lines[lines.length - 1];
        const correctAnswerPattern = /^[A-E]$/i;
        
        if (!correctAnswerPattern.test(lastLine)) {
          errors.push(`Đoạn ${sectionIdx + 1}: Dòng cuối phải là chữ cái từ A-E, nhận được: "${lastLine}"`);
          return;
        }
        
        question.correct_answers = [lastLine.toUpperCase()];
        const answerLines = lines.slice(1, -1);
        
        answerLines.forEach((line, idx) => {
          const label = ['A', 'B', 'C', 'D', 'E'][idx];
          if (!label) return;
          
          if (line.includes(';')) {
            const [text, explanation] = line.split(';', 2);
            question.options.push({ label, text: text.trim() });
            if (explanation && explanation.trim()) {
              if (getCorrectAnswerLabels(question.correct_answers).includes(label)) {
                // For new format, create object with correct explanations
                const correctAnswerOptions = Object.keys(question.correct_answers).filter(key => 
                  question.correct_answers[key] === true
                );
                
                if (correctAnswerOptions.length > 0 && explanation.trim()) {
                  const correctExplanationObj = {};
                  correctAnswerOptions.forEach(option => {
                    correctExplanationObj[option] = explanation.trim();
                  });
                  question.explanation.correct = correctExplanationObj;
                } else {
                  // Always use object format, even if empty
                  question.explanation.correct = {};
                }
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

      return { questions, errors };
    } catch (error) {
      return { questions: [], errors: [`Lỗi parse: ${error.message}`] };
    }
  };

  const handleParseText = () => {
    if (!pasteText.trim()) {
      setParseError('Vui lòng nhập text cần parse');
      return;
    }

    const { questions, errors } = parseQuestionsText(pasteText);
    
    if (errors.length > 0) {
      setParseError(errors.join('\n'));
      return;
    }
    
    if (questions.length === 0) {
      setParseError('Không tìm thấy câu hỏi hợp lệ nào');
      return;
    }

    // Apply first question to form
    const firstQuestion = questions[0];
    setFormData(prev => ({
      ...prev,
      ...firstQuestion,
      test_id: testId
    }));
    
    setParseError('');
    setInputMode('manual');
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.question_text?.trim()) {
      newErrors.question_text = "Vui lòng nhập câu hỏi";
    }

    const filledOptions = (formData.options || []).filter(opt => opt?.text?.trim());
    if (filledOptions.length < 2) {
      newErrors.options = "Cần ít nhất 2 lựa chọn";
    }

    if (!formData.correct_answers?.length) {
      newErrors.correct_answers = "Chọn ít nhất 1 đáp án đúng";
    }

    if (!isEditMode && (!formData.test_id || formData.test_id === "")) {
      newErrors.test_id = "Vui lòng chọn bài test";
    }

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
      
      // Filter empty options
      payload.options = (formData.options || []).filter(opt => opt?.text?.trim());

      // When editing, do not send difficulty to avoid changing existing value
      if (isEditMode && payload.hasOwnProperty('difficulty')) {
        delete payload.difficulty;
      }

      let response;
      if (isEditMode) {
        response = await multipleChoiceService.updateMultipleChoice(question._id, payload);
      } else {
        response = await multipleChoiceService.createMultipleChoice(payload);
      }

      if (onQuestionSaved) {
        onQuestionSaved(response);
      }
      
      // Show success toast
      showToast(isEditMode ? 'Cập nhật câu hỏi thành công!' : 'Tạo câu hỏi thành công!', 'success');
      
      // Close modal after a short delay to let user see the toast
      setTimeout(() => {
        onClose();
      }, 1500);
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

  // Styles
  const labelCls = "block text-[11px] font-semibold text-slate-800 mb-1";
  const inputBase = "w-full text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 transition-colors";
  const inputBox = "px-2 py-1.5 rounded-lg border border-slate-300 bg-white focus:border-slate-500";
  const textareaBox = "px-2 py-1.5 rounded-lg border border-slate-300 bg-white focus:border-slate-500";

  const optionWrapClass = (isCorrect) =>
    [
      "p-2 rounded-lg border ring-1 ring-inset transition",
      isCorrect
        ? "bg-emerald-100 border-emerald-500 ring-emerald-200"
        : "bg-white border-slate-300 ring-slate-100 hover:border-slate-400",
    ].join(" ");

  const optionLabelClass = (isCorrect) =>
    [
      "w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold",
      isCorrect ? "bg-emerald-600 text-white" : "bg-slate-800 text-white",
    ].join(" ");

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />

      <div className="flex min-h-full items-center justify-center p-2 sm:p-3">
        <div className="relative bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[95vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-slate-900 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div className="leading-tight">
                <h2 className="text-sm font-semibold text-slate-900">
                  {isEditMode ? "Sửa" : "Thêm"} câu hỏi trắc nghiệm
                </h2>
                <p className="text-[10px] text-slate-500">
                  {isEditMode ? "Chỉnh sửa thông tin câu hỏi" : "Tạo câu hỏi mới cho bài kiểm tra"}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
              aria-label="Đóng"
            >
              <svg className="w-3 h-3 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-3 space-y-3">
              {errorBanner && (
                <div className="bg-rose-100 border border-rose-300 rounded-lg p-2.5 text-xs text-rose-800">
                  {errorBanner}
                </div>
              )}

              {/* Test Selection (only when creating new) */}
              {!isEditMode && allTests.length > 0 && (
                <div>
                  <label className={labelCls}>
                    Chọn bài test <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={formData.test_id || testId || ''}
                    onChange={(e) => setField("test_id", e.target.value)}
                    className={`${inputBase} ${inputBox} ${errors.test_id ? "border-rose-400 bg-rose-50 focus:border-rose-500" : ""}`}
                  >
                    <option value="">-- Chọn bài test --</option>
                    {allTests.map((test) => (
                      <option key={test._id} value={test._id}>
                        {test.test_title} ({test.main_topic} - {test.sub_topic})
                      </option>
                    ))}
                  </select>
                  {errors.test_id && (
                    <p className="mt-1 text-[11px] text-rose-800">{errors.test_id}</p>
                  )}
                </div>
              )}

              {/* Input Mode Tabs - Only for create mode */}
              {!isEditMode && (
                <div className="flex gap-2 border-b border-slate-200">
                  <button
                    type="button"
                    onClick={() => setInputMode('manual')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                      inputMode === 'manual'
                        ? 'border-slate-900 text-slate-900'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Nhập thủ công
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('paste')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                      inputMode === 'paste'
                        ? 'border-slate-900 text-slate-900'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Dán text
                  </button>
                </div>
              )}

              {/* Paste Text Mode */}
              {!isEditMode && inputMode === 'paste' && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div>
                    <label className={labelCls}>
                      Dán text câu hỏi <span className="text-rose-600">*</span>
                    </label>
                    <textarea
                      rows={6}
                      value={pasteText}
                      onChange={(e) => setPasteText(e.target.value)}
                      placeholder={`Nhập theo format:\n\nCâu hỏi của bạn?\nĐáp án A; Giải thích cho đáp án A\nĐáp án B; Giải thích cho đáp án B\nĐáp án C; Giải thích cho đáp án C\nA\n\n(Lưu ý: dùng dấu ; để ngăn cách đáp án và giải thích, dòng cuối là chữ cái đáp án đúng)`}
                      className={`${inputBase} ${textareaBox} font-mono text-[10px]`}
                    />
                  </div>
                  {parseError && (
                    <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-xs text-rose-800 whitespace-pre-line">
                      {parseError}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleParseText}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm font-medium"
                  >
                    Parse và áp dụng
                  </button>
                </div>
              )}

              {/* Question */}
              <div>
                <label className={labelCls}>
                  Câu hỏi <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={2}
                  value={formData.question_text || ""}
                  onChange={(e) => setField("question_text", e.target.value)}
                  placeholder="Nhập câu hỏi trắc nghiệm..."
                  className={[
                    inputBase,
                    textareaBox,
                    errors.question_text ? "border-rose-400 bg-rose-50 focus:border-rose-500" : "",
                  ].join(" ")}
                />
                {errors.question_text && (
                  <p className="mt-1 text-[11px] text-rose-800">{errors.question_text}</p>
                )}
              </div>

              {/* Options */}
              <div>
                <label className={labelCls}>
                  Các lựa chọn <span className="text-rose-600">*</span>
                </label>

                <div className="space-y-2">
                  {(formData.options || []).map((opt, idx) => {
                    const isCorrect = (formData.correct_answers || []).includes(opt?.label);

                    return (
                      <div key={opt?.label || idx} className={optionWrapClass(isCorrect)}>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isCorrect}
                            onChange={() => toggleCorrectAnswer(opt?.label)}
                            className="w-3 h-3 text-emerald-600 border border-slate-400 rounded focus:ring-emerald-500 focus:ring-1"
                          />

                          <div className={optionLabelClass(isCorrect)}>{opt?.label}</div>

                          <input
                            type="text"
                            value={opt?.text || ""}
                            onChange={(e) => handleOptionChange(idx, e.target.value)}
                            placeholder={`Nội dung đáp án ${opt?.label}...`}
                            className="flex-1 bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {errors.options && <p className="mt-1 text-[11px] text-rose-800">{errors.options}</p>}
                {errors.correct_answers && (
                  <p className="mt-1 text-[11px] text-rose-800">{errors.correct_answers}</p>
                )}
              </div>

              {/* Explanations */}
              <div className="space-y-2">
                <div>
                  <label className={labelCls}>Giải thích các đáp án đúng</label>
                  <div className="space-y-1.5">
                    {(formData.options || []).map((opt, idx) => {
                      const isCorrect = (formData.correct_answers || []).includes(opt?.label);
                      if (!isCorrect) return null;

                      return (
                        <div
                          key={idx}
                          className="rounded-lg border border-emerald-300 bg-emerald-50 p-2 border-l-4 border-l-emerald-600"
                        >
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="w-4 h-4 bg-emerald-200 rounded-full flex items-center justify-center text-[10px] font-bold text-emerald-900">
                              {opt?.label}
                            </span>
                            <span className="text-[10px] font-semibold text-emerald-900 line-clamp-1">
                              {opt?.text || "Chưa có nội dung"}
                            </span>
                          </div>
                          <textarea
                            rows={1}
                            value={formData.explanation?.correct?.[opt?.label] || ""}
                            onChange={(e) => setCorrectExplanation(opt?.label, e.target.value)}
                            placeholder={`Giải thích tại sao đáp án ${opt?.label} đúng...`}
                            className={`${inputBase} ${textareaBox} border-emerald-300 bg-white focus:border-emerald-500`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Giải thích các đáp án sai (tùy chọn)</label>
                  <div className="space-y-1.5">
                    {(formData.options || []).map((opt, idx) => {
                      const isCorrect = (formData.correct_answers || []).includes(opt?.label);
                      if (isCorrect) return null;

                      return (
                        <div
                          key={idx}
                          className="rounded-lg border border-rose-300 bg-rose-100 p-2 border-l-4 border-l-rose-600"
                        >
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="w-4 h-4 bg-rose-200 rounded-full flex items-center justify-center text-[10px] font-bold text-rose-900">
                              {opt?.label}
                            </span>
                            <span className="text-[10px] font-semibold text-rose-900 line-clamp-1">
                              {opt?.text || "Chưa có nội dung"}
                            </span>
                          </div>
                          <textarea
                            rows={1}
                            value={formData.explanation?.incorrect_choices?.[opt?.label] || ""}
                            onChange={(e) => setIncorrectExplanation(opt?.label, e.target.value)}
                            placeholder={`Vì sao đáp án ${opt?.label} sai...`}
                            className={`${inputBase} ${textareaBox} border-rose-300 bg-white focus:border-rose-500`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Difficulty removed from edit UI per request */}
            </form>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-slate-200 bg-slate-50/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
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

      {/* Toast */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </div>
  );
};

export default AdminMCPQuestionModal;