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

        if (question.correct_answers) {
          mergedData.correct_answers = Array.isArray(question.correct_answers)
            ? question.correct_answers
            : [question.correct_answers];
        }

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
    const currentExplanation = formData.explanation || {
      correct: "",
      incorrect_choices: {},
    };
    const incorrectChoices = currentExplanation.incorrect_choices || {};

    setField("explanation", {
      ...currentExplanation,
      incorrect_choices: {
        ...incorrectChoices,
        [label]: text,
      },
    });
  };

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

  // ====== Compact UI helpers ======
  const labelCls = "block text-xs font-semibold text-gray-900 mb-1.5";
  const inputBase =
    "w-full text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0 transition-colors";
  const inputBox = "px-3 py-2 rounded-lg border";
  const textareaBox = "px-3 py-2 rounded-lg border";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* backdrop */}
      <div className="fixed inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />

      <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
        <div className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[88vh] flex flex-col">
          {/* Header (compact) */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-sky-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div className="leading-tight">
                <h2 className="text-base font-semibold text-gray-900">
                  {isEditMode ? "Sửa" : "Thêm"} câu hỏi {TYPE_LABELS[lockedType]}
                </h2>
                <p className="text-[11px] text-indigo-900/70">
                  {isEditMode ? "Chỉnh sửa thông tin câu hỏi" : "Tạo câu hỏi mới cho bài kiểm tra"}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-indigo-50 hover:bg-indigo-100 flex items-center justify-center transition-colors"
              aria-label="Đóng"
            >
              <svg className="w-4 h-4 text-indigo-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Banner type locked (compact) */}
          {isEditMode && (
            <div className="mx-4 mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Loại câu hỏi: <span className="font-semibold">{TYPE_LABELS[lockedType]}</span> (đã khóa khi cập nhật)
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {errorBanner && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs text-red-700">
                  {errorBanner}
                </div>
              )}

              {/* MULTIPLE CHOICE */}
              {lockedType === "multiple_choice" && (
                <>
                  {/* Question Text */}
                  <div>
                    <label className={labelCls}>
                      Câu hỏi <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      value={formData.question_text || ""}
                      onChange={(e) => setField("question_text", e.target.value)}
                      placeholder="Nhập câu hỏi trắc nghiệm..."
                      className={[
                        inputBase,
                        textareaBox,
                        errors.question_text
                          ? "border-red-300 bg-red-50 focus:border-red-400"
                          : "border-blue-200 bg-blue-50 focus:border-blue-400 hover:border-blue-300",
                        "placeholder:text-blue-400",
                      ].join(" ")}
                    />
                    {errors.question_text && (
                      <p className="mt-1 text-[11px] text-red-600">{errors.question_text}</p>
                    )}
                  </div>

                  {/* Options List (compact) */}
                  <div>
                    <label className={labelCls}>
                      Các lựa chọn <span className="text-red-500">*</span>
                    </label>

                    <div className="space-y-2">
                      {(formData.options || []).map((opt, idx) => {
                        const isCorrect = (formData.correct_answers || []).includes(opt?.label);

                        const optionColors = {
                          A: isCorrect ? "border-emerald-300 bg-emerald-50" : "border-blue-200 bg-blue-50",
                          B: isCorrect ? "border-emerald-300 bg-emerald-50" : "border-purple-200 bg-purple-50",
                          C: isCorrect ? "border-emerald-300 bg-emerald-50" : "border-orange-200 bg-orange-50",
                          D: isCorrect ? "border-emerald-300 bg-emerald-50" : "border-pink-200 bg-pink-50",
                          E: isCorrect ? "border-emerald-300 bg-emerald-50" : "border-teal-200 bg-teal-50",
                        };

                        const labelColors = {
                          A: isCorrect ? "bg-emerald-600 text-white" : "bg-blue-600 text-white",
                          B: isCorrect ? "bg-emerald-600 text-white" : "bg-purple-600 text-white",
                          C: isCorrect ? "bg-emerald-600 text-white" : "bg-orange-600 text-white",
                          D: isCorrect ? "bg-emerald-600 text-white" : "bg-pink-600 text-white",
                          E: isCorrect ? "bg-emerald-600 text-white" : "bg-teal-600 text-white",
                        };

                        return (
                          <div
                            key={opt?.label || idx}
                            className={`p-3 rounded-lg border ${optionColors[opt?.label] || "border-gray-200 bg-gray-50"}`}
                          >
                            <div className="flex items-center gap-2.5">
                              {/* Correct */}
                              <input
                                type="checkbox"
                                checked={isCorrect}
                                onChange={() => toggleCorrectAnswer(opt?.label)}
                                className="w-4 h-4 text-emerald-600 border border-gray-300 rounded focus:ring-emerald-500 focus:ring-2"
                              />

                              {/* Label */}
                              <div
                                className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold ${
                                  labelColors[opt?.label] || "bg-gray-600 text-white"
                                }`}
                              >
                                {opt?.label}
                              </div>

                              {/* Text */}
                              <input
                                type="text"
                                value={opt?.text || ""}
                                onChange={(e) => handleOptionChange(idx, e.target.value)}
                                placeholder={`Nội dung đáp án ${opt?.label}...`}
                                className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {errors.options && <p className="mt-1 text-[11px] text-red-600">{errors.options}</p>}
                    {errors.correct_answers && (
                      <p className="mt-1 text-[11px] text-red-600">{errors.correct_answers}</p>
                    )}
                  </div>

                  {/* Explanations (compact) */}
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
                        className={[
                          inputBase,
                          textareaBox,
                          "border-green-200 bg-green-50 focus:border-green-400 hover:border-green-300 placeholder:text-green-500",
                        ].join(" ")}
                      />
                    </div>

                    <div>
                      <label className={labelCls}>Giải thích các đáp án sai (tùy chọn)</label>
                      <div className="space-y-2">
                        {(formData.options || []).map((opt, idx) => {
                          const isCorrect = (formData.correct_answers || []).includes(opt?.label);
                          if (isCorrect) return null;

                          return (
                            <div key={idx} className="bg-red-50 rounded-lg border border-red-200 p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="w-5 h-5 bg-red-200 rounded-full flex items-center justify-center text-[11px] font-bold text-red-800">
                                  {opt?.label}
                                </span>
                                <span className="text-xs font-medium text-red-900 line-clamp-1">
                                  {opt?.text || "Chưa có nội dung"}
                                </span>
                              </div>
                              <textarea
                                rows={2}
                                value={formData.explanation?.incorrect_choices?.[opt?.label] || ""}
                                onChange={(e) => setIncorrectExplanation(opt?.label, e.target.value)}
                                placeholder={`Vì sao đáp án ${opt?.label} sai...`}
                                className={[
                                  inputBase,
                                  textareaBox,
                                  "border-red-300 bg-white focus:border-red-400 hover:border-red-300 placeholder:text-red-400",
                                ].join(" ")}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Additional Fields (compact) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Độ khó</label>
                      <select
                        value={formData.difficulty || "easy"}
                        onChange={(e) => setField("difficulty", e.target.value)}
                        className={`${inputBase} ${inputBox} border-indigo-200 bg-indigo-50 focus:border-indigo-400`}
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
                        className={`${inputBase} ${inputBox} border-yellow-200 bg-yellow-50 focus:border-yellow-400 placeholder:text-yellow-600`}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* VOCABULARY - Compact table */}
              {lockedType === "vocabulary" && (
                <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-4 rounded-xl border border-teal-200">
                  <h3 className="text-sm font-bold text-teal-900 mb-3 flex items-center">
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

                  <div className="overflow-hidden rounded-lg border border-white shadow-sm">
                    <table className="w-full">
                      <tbody>
                        <tr className="border-b border-teal-100">
                          <td className="w-1/3 px-3 py-3 bg-teal-100 text-xs font-semibold text-teal-900">
                            Từ vựng <span className="text-red-500">*</span>
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
                                errors.word
                                  ? "border-red-300 bg-red-50 focus:border-red-400"
                                  : "border-teal-200 bg-teal-50 focus:border-teal-400 hover:border-teal-300",
                                "placeholder:text-teal-500",
                              ].join(" ")}
                            />
                            {errors.word && <p className="mt-1 text-[11px] text-red-600">{errors.word}</p>}
                          </td>
                        </tr>

                        <tr className="border-b border-teal-100">
                          <td className="w-1/3 px-3 py-3 bg-teal-100 text-xs font-semibold text-teal-900">
                            Nghĩa <span className="text-red-500">*</span>
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
                                errors.meaning
                                  ? "border-red-300 bg-red-50 focus:border-red-400"
                                  : "border-teal-200 bg-teal-50 focus:border-teal-400 hover:border-teal-300",
                                "placeholder:text-teal-500",
                              ].join(" ")}
                            />
                            {errors.meaning && <p className="mt-1 text-[11px] text-red-600">{errors.meaning}</p>}
                          </td>
                        </tr>

                        <tr>
                          <td className="w-1/3 px-3 py-3 bg-teal-100 text-xs font-semibold text-teal-900">
                            Câu ví dụ
                          </td>
                          <td className="px-3 py-3 bg-white">
                            <textarea
                              rows={2}
                              value={formData.example_sentence || ""}
                              onChange={(e) => setField("example_sentence", e.target.value)}
                              placeholder="Nhập câu ví dụ..."
                              className={`${inputBase} ${textareaBox} border-teal-200 bg-teal-50 focus:border-teal-400 hover:border-teal-300 placeholder:text-teal-500`}
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-teal-900 mb-1.5">Loại từ</label>
                      <select
                        value={formData.word_type || ""}
                        onChange={(e) => setField("word_type", e.target.value)}
                        className={`${inputBase} ${inputBox} border-cyan-200 bg-cyan-50 focus:border-cyan-400`}
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
                      <label className="block text-xs font-semibold text-teal-900 mb-1.5">Độ khó</label>
                      <select
                        value={formData.difficulty || "easy"}
                        onChange={(e) => setField("difficulty", e.target.value)}
                        className={`${inputBase} ${inputBox} border-cyan-200 bg-cyan-50 focus:border-cyan-400`}
                      >
                        <option value="easy">Dễ</option>
                        <option value="medium">Trung bình</option>
                        <option value="hard">Khó</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* GRAMMAR (compact) */}
              {lockedType === "grammar" && (
                <>
                  <div>
                    <label className={labelCls}>
                      Câu hỏi <span className="text-red-600">*</span>
                    </label>
                    <textarea
                      rows={2}
                      value={formData.question_text || ""}
                      onChange={(e) => setField("question_text", e.target.value)}
                      placeholder="Nhập câu hỏi ngữ pháp…"
                      className={`${inputBase} ${textareaBox} ${
                        errors.question_text ? "border-red-300 bg-red-50" : "border-sky-100 bg-indigo-50"
                      } focus:border-indigo-400 placeholder:text-indigo-400`}
                    />
                    {errors.question_text && (
                      <p className="mt-1 text-[11px] text-red-600">{errors.question_text}</p>
                    )}
                  </div>

                  <div>
                    <label className={labelCls}>
                      Đáp án đúng <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.correct_answer || ""}
                      onChange={(e) => setField("correct_answer", e.target.value)}
                      placeholder="Nhập đáp án đúng…"
                      className={`${inputBase} ${inputBox} ${
                        errors.correct_answer ? "border-red-300 bg-red-50" : "border-sky-100 bg-indigo-50"
                      } focus:border-indigo-400 placeholder:text-indigo-400`}
                    />
                    {errors.correct_answer && (
                      <p className="mt-1 text-[11px] text-red-600">{errors.correct_answer}</p>
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
                          className={`${inputBase} ${inputBox} border-sky-100 bg-indigo-50 focus:border-indigo-400 placeholder:text-indigo-400`}
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
                      className={`${inputBase} ${textareaBox} border-sky-100 bg-indigo-50 focus:border-indigo-400 placeholder:text-indigo-400`}
                    />
                  </div>
                </>
              )}

              {/* Actions (compact) */}
              <div className="flex justify-end gap-2 pt-3 border-t border-sky-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-sky-50 text-indigo-900 hover:bg-sky-100 border border-sky-100 text-sm"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center text-sm"
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
