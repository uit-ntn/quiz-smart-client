import React, { useEffect, useMemo, useRef, useState } from "react";
import multipleChoiceService from "../services/multipleChoiceService";
import vocabularyService from "../services/vocabularyService";
import grammarService from "../services/grammarService";

// Nhãn hiển thị
const TYPE_LABELS = {
  multiple_choice: "Trắc nghiệm",
  vocabulary: "Từ vựng",
  grammar: "Ngữ pháp",
};

// Giá trị mặc định theo loại test
const defaultByType = (type, testId) => {
  switch (type) {
    case "multiple_choice":
      return {
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
          correct: "",
          incorrect_choices: {},
        },
        difficulty: "easy",
        tags: [],
        test_id: testId,
        status: "active",
      };
    case "vocabulary":
      return {
        word: "",
        meaning: "",
        example_sentence: "",
        test_id: testId,
      };
    case "grammar":
      return {
        question_text: "",
        correct_answer: "",
        options: ["", "", "", ""],
        explanation: "",
        difficulty: "medium",
        points: 1,
        test_id: testId,
      };
    default:
      return {};
  }
};

const AdminQuestionModal = ({
  isOpen,
  onClose,
  testId,
  testType, // type cố định truyền từ ngoài (khi edit thì khóa luôn)
  question = null,
  onQuestionSaved,
}) => {
  const isEditMode = !!question;

  // KHÓA test type khi edit, không hiển thị dropdown đổi type
  const initialLockedType = useMemo(
    () => (isEditMode ? question?.test_type || testType : testType),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isEditMode, question?._id]
  );
  const lockedTypeRef = useRef(initialLockedType);
  const lockedType = lockedTypeRef.current;

  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isOpen) return;
    setErrorBanner(null);
    setErrors({});

    if (isEditMode) {
      const base = defaultByType(lockedType, testId);
      let mergedData = { ...base, ...question, test_id: testId };

      // Fix multiple choice data format
      if (lockedType === "multiple_choice" && question) {
        if (question.options && Array.isArray(question.options)) {
          mergedData.options = question.options.map((opt, idx) => ({
            label: opt.label || ["A", "B", "C", "D", "E"][idx],
            text: opt.text || opt || "",
          }));
        }

        // Ensure correct_answers is array
        if (question.correct_answers) {
          mergedData.correct_answers = Array.isArray(question.correct_answers)
            ? question.correct_answers
            : [question.correct_answers];
        }

        // Ensure explanation format
        if (question.explanation) {
          mergedData.explanation = {
            correct: question.explanation.correct || "",
            incorrect_choices: question.explanation.incorrect_choices || {},
          };
        }
      }

      setFormData(mergedData);
    } else {
      setFormData(defaultByType(lockedType, testId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isEditMode, question?._id, lockedType, testId]);

  const setField = (k, v) => setFormData((p) => ({ ...p, [k]: v }));

  const handleOptionChange = (index, value) => {
    const next = Array.isArray(formData.options) ? [...formData.options] : [];
    if (lockedType === "multiple_choice") {
      const defaultLabels = ["A", "B", "C", "D", "E"];
      next[index] = {
        label: (next[index] && next[index].label) || defaultLabels[index],
        text: value,
      };
    } else {
      next[index] = value;
    }
    setField("options", next);
  };

  const toggleCorrectAnswer = (label) => {
    const cur = formData.correct_answers || [];
    setField(
      "correct_answers",
      cur.includes(label) ? cur.filter((v) => v !== label) : [...cur, label]
    );
  };

  const setIncorrectExplanation = (label, text) => {
    const currentExplanation = formData.explanation || { correct: "", incorrect_choices: {} };
    const incorrectChoices = currentExplanation.incorrect_choices || {};
    setField("explanation", {
      ...currentExplanation,
      incorrect_choices: { ...incorrectChoices, [label]: text },
    });
  };

  // validate
  const validate = () => {
    const v = {};
    if (lockedType === "multiple_choice") {
      if (!formData.question_text?.trim()) v.question_text = "Câu hỏi không được để trống";

      const validOpts = (formData.options || []).filter((o) => o?.text?.trim());
      if (validOpts.length < 2) v.options = "Cần ít nhất 2 đáp án";

      const correctAnswers = formData.correct_answers || [];
      if (!correctAnswers.length) {
        v.correct_answers = "Phải chọn ít nhất 1 đáp án đúng";
      } else {
        const validLabels = (formData.options || []).map((o) => o?.label).filter(Boolean);
        const invalidCorrectAnswers = correctAnswers.filter((ans) => !validLabels.includes(ans));
        if (invalidCorrectAnswers.length > 0) {
          v.correct_answers = `Đáp án đúng không hợp lệ: ${invalidCorrectAnswers.join(", ")}`;
        }
      }
    }

    if (lockedType === "vocabulary") {
      if (!formData.word?.trim()) v.word = "Từ vựng không được để trống";
      if (!formData.meaning?.trim()) v.meaning = "Nghĩa không được để trống";
    }

    if (lockedType === "grammar") {
      if (!formData.question_text?.trim()) v.question_text = "Câu hỏi không được để trống";
      if (!formData.correct_answer?.trim()) v.correct_answer = "Đáp án đúng không được để trống";
    }

    setErrors(v);
    return Object.keys(v).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);
      setErrorBanner(null);
      let response;

      if (lockedType === "multiple_choice") {
        const cleanedData = {
          ...formData,
          options: (formData.options || [])
            .filter((opt) => opt?.text?.trim())
            .map((opt) => ({ label: opt.label, text: opt.text.trim() })),
          correct_answers: formData.correct_answers || [],
          explanation: {
            correct: formData.explanation?.correct || "",
            incorrect_choices: formData.explanation?.incorrect_choices || {},
          },
        };

        response = isEditMode
          ? await multipleChoiceService.updateMultipleChoice(question._id, cleanedData)
          : await multipleChoiceService.createMultipleChoice(cleanedData);
      } else if (lockedType === "vocabulary") {
        response = isEditMode
          ? await vocabularyService.updateVocabulary(question._id, formData)
          : await vocabularyService.createVocabulary(formData);
      } else if (lockedType === "grammar") {
        const token = localStorage.getItem("token");
        response = isEditMode
          ? await grammarService.updateGrammar(question._id, formData, token)
          : await grammarService.createGrammar(formData, token);
      }

      onQuestionSaved?.(response);
      onClose?.();
    } catch (err) {
      console.error(err);
      setErrorBanner(err?.message || "Đã xảy ra lỗi khi lưu câu hỏi");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // ====== Neutral + đậm hơn (không nhạt) ======
  const labelCls = "block text-xs font-semibold text-slate-800 mb-1.5";
  const inputBase =
    "w-full text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 transition-colors";
  const inputBox =
    "px-3 py-2 rounded-lg border border-slate-300 bg-white focus:border-slate-500";
  const textareaBox =
    "px-3 py-2 rounded-lg border border-slate-300 bg-white focus:border-slate-500";

  const optionWrapClass = (isCorrect) =>
    [
      "p-3 rounded-lg border ring-1 ring-inset transition",
      isCorrect
        ? "bg-emerald-100 border-emerald-500 ring-emerald-200"
        : "bg-white border-slate-300 ring-slate-100 hover:border-slate-400",
    ].join(" ");

  const optionLabelClass = (isCorrect) =>
    [
      "w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold",
      isCorrect ? "bg-emerald-600 text-white" : "bg-slate-800 text-white",
    ].join(" ");

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* backdrop */}
      <div className="fixed inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />

      <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
        <div className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[88vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div className="leading-tight">
                <h2 className="text-base font-semibold text-slate-900">
                  {isEditMode ? "Sửa" : "Thêm"} câu hỏi {TYPE_LABELS[lockedType]}
                </h2>
                <p className="text-[11px] text-slate-500">
                  {isEditMode ? "Chỉnh sửa thông tin câu hỏi" : "Tạo câu hỏi mới cho bài kiểm tra"}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
              aria-label="Đóng"
            >
              <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Banner type locked */}
          {isEditMode && (
            <div className="mx-4 mt-3 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              Loại câu hỏi: <span className="font-semibold">{TYPE_LABELS[lockedType]}</span> (đã khóa khi cập nhật)
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {errorBanner && (
                <div className="bg-rose-100 border border-rose-300 rounded-lg p-2.5 text-xs text-rose-800">
                  {errorBanner}
                </div>
              )}

              {/* MULTIPLE CHOICE */}
              {lockedType === "multiple_choice" && (
                <>
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
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={isCorrect}
                                onChange={() => toggleCorrectAnswer(opt?.label)}
                                className="w-4 h-4 text-emerald-600 border border-slate-400 rounded focus:ring-emerald-500 focus:ring-2"
                              />

                              <div className={optionLabelClass(isCorrect)}>{opt?.label}</div>

                              <input
                                type="text"
                                value={opt?.text || ""}
                                onChange={(e) => handleOptionChange(idx, e.target.value)}
                                placeholder={`Nội dung đáp án ${opt?.label}...`}
                                className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
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
                  <div className="space-y-3">
                    <div>
                      <label className={labelCls}>Giải thích đáp án đúng</label>
                      <textarea
                        rows={2}
                        value={formData.explanation?.correct || ""}
                        onChange={(e) =>
                          setField("explanation", {
                            ...(formData.explanation || {}),
                            correct: e.target.value,
                          })
                        }
                        placeholder="Giải thích tại sao đáp án này đúng..."
                        className={`${inputBase} ${textareaBox}`}
                      />
                    </div>

                    <div>
                      <label className={labelCls}>Giải thích các đáp án sai (tùy chọn)</label>
                      <div className="space-y-2">
                        {(formData.options || []).map((opt, idx) => {
                          const isCorrect = (formData.correct_answers || []).includes(opt?.label);
                          if (isCorrect) return null;

                          return (
                            <div
                              key={idx}
                              className="rounded-lg border border-rose-300 bg-rose-100 p-3 border-l-4 border-l-rose-600"
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <span className="w-5 h-5 bg-rose-200 rounded-full flex items-center justify-center text-[11px] font-bold text-rose-900">
                                  {opt?.label}
                                </span>
                                <span className="text-xs font-semibold text-rose-900 line-clamp-1">
                                  {opt?.text || "Chưa có nội dung"}
                                </span>
                              </div>
                              <textarea
                                rows={2}
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

                  {/* Additional fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Độ khó</label>
                      <select
                        value={formData.difficulty || "easy"}
                        onChange={(e) => setField("difficulty", e.target.value)}
                        className={`${inputBase} ${inputBox}`}
                      >
                        <option value="easy">Dễ</option>
                        <option value="medium">Trung bình</option>
                        <option value="hard">Khó</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Tags</label>
                      <input
                        type="text"
                        value={Array.isArray(formData.tags) ? formData.tags.join(", ") : ""}
                        onChange={(e) =>
                          setField(
                            "tags",
                            e.target.value
                              .split(",")
                              .map((t) => t.trim())
                              .filter(Boolean)
                          )
                        }
                        placeholder="toeic, part1, photos..."
                        className={`${inputBase} ${inputBox}`}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* VOCABULARY */}
              {lockedType === "vocabulary" && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-300">
                  <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                    Thông tin từ vựng
                  </h3>

                  <div className="overflow-hidden rounded-lg border border-slate-300 bg-white">
                    <table className="w-full">
                      <tbody>
                        <tr className="border-b border-slate-300">
                          <td className="w-1/3 px-3 py-3 bg-slate-100 text-xs font-semibold text-slate-800">
                            Từ vựng <span className="text-rose-600">*</span>
                          </td>
                          <td className="px-3 py-3 bg-white">
                            <input
                              type="text"
                              value={formData.word || ""}
                              onChange={(e) => setField("word", e.target.value)}
                              placeholder="Nhập từ vựng..."
                              className={[
                                inputBase,
                                inputBox,
                                errors.word ? "border-rose-400 bg-rose-50 focus:border-rose-500" : "",
                              ].join(" ")}
                            />
                            {errors.word && <p className="mt-1 text-[11px] text-rose-800">{errors.word}</p>}
                          </td>
                        </tr>

                        <tr className="border-b border-slate-300">
                          <td className="w-1/3 px-3 py-3 bg-slate-100 text-xs font-semibold text-slate-800">
                            Nghĩa <span className="text-rose-600">*</span>
                          </td>
                          <td className="px-3 py-3 bg-white">
                            <input
                              type="text"
                              value={formData.meaning || ""}
                              onChange={(e) => setField("meaning", e.target.value)}
                              placeholder="Nhập nghĩa..."
                              className={[
                                inputBase,
                                inputBox,
                                errors.meaning ? "border-rose-400 bg-rose-50 focus:border-rose-500" : "",
                              ].join(" ")}
                            />
                            {errors.meaning && <p className="mt-1 text-[11px] text-rose-800">{errors.meaning}</p>}
                          </td>
                        </tr>

                        <tr>
                          <td className="w-1/3 px-3 py-3 bg-slate-100 text-xs font-semibold text-slate-800">
                            Câu ví dụ
                          </td>
                          <td className="px-3 py-3 bg-white">
                            <textarea
                              rows={2}
                              value={formData.example_sentence || ""}
                              onChange={(e) => setField("example_sentence", e.target.value)}
                              placeholder="Nhập câu ví dụ..."
                              className={`${inputBase} ${textareaBox}`}
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Loại từ</label>
                      <select
                        value={formData.word_type || ""}
                        onChange={(e) => setField("word_type", e.target.value)}
                        className={`${inputBase} ${inputBox}`}
                      >
                        <option value="">Chọn loại từ</option>
                        <option value="noun">Danh từ (noun)</option>
                        <option value="verb">Động từ (verb)</option>
                        <option value="adjective">Tính từ (adjective)</option>
                        <option value="adverb">Trạng từ (adverb)</option>
                        <option value="preposition">Giới từ (preposition)</option>
                        <option value="other">Khác</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Độ khó</label>
                      <select
                        value={formData.difficulty || "easy"}
                        onChange={(e) => setField("difficulty", e.target.value)}
                        className={`${inputBase} ${inputBox}`}
                      >
                        <option value="easy">Dễ</option>
                        <option value="medium">Trung bình</option>
                        <option value="hard">Khó</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* GRAMMAR */}
              {lockedType === "grammar" && (
                <>
                  <div>
                    <label className={labelCls}>
                      Câu hỏi <span className="text-rose-600">*</span>
                    </label>
                    <textarea
                      rows={2}
                      value={formData.question_text || ""}
                      onChange={(e) => setField("question_text", e.target.value)}
                      placeholder="Nhập câu hỏi ngữ pháp…"
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

                  <div>
                    <label className={labelCls}>
                      Đáp án đúng <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.correct_answer || ""}
                      onChange={(e) => setField("correct_answer", e.target.value)}
                      placeholder="Nhập đáp án đúng…"
                      className={[
                        inputBase,
                        inputBox,
                        errors.correct_answer ? "border-rose-400 bg-rose-50 focus:border-rose-500" : "",
                      ].join(" ")}
                    />
                    {errors.correct_answer && (
                      <p className="mt-1 text-[11px] text-rose-800">{errors.correct_answer}</p>
                    )}
                  </div>

                  <div>
                    <label className={labelCls}>Đáp án khác (tùy chọn)</label>
                    <div className="space-y-2">
                      {(formData.options || []).map((opt, idx) => (
                        <input
                          key={idx}
                          type="text"
                          value={opt || ""}
                          onChange={(e) => handleOptionChange(idx, e.target.value)}
                          placeholder={`Đáp án ${idx + 1}…`}
                          className={`${inputBase} ${inputBox}`}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Giải thích</label>
                    <textarea
                      rows={2}
                      value={formData.explanation || ""}
                      onChange={(e) => setField("explanation", e.target.value)}
                      placeholder="Giải thích đáp án (tùy chọn)…"
                      className={`${inputBase} ${textareaBox}`}
                    />
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-300 text-sm"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 flex items-center text-sm"
                >
                  {loading && (
                    <span className="mr-2 inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  {isEditMode ? "Cập nhật" : "Tạo mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminQuestionModal;
