import React, { useCallback, useEffect, useMemo, useState } from "react";
import vocabularyService from "../services/vocabularyService";

const cx = (...a) => a.filter(Boolean).join(" ");

/* ===================== Const ===================== */
const POS_OPTIONS = [
  { value: "noun", label: "Noun (Danh từ)" },
  { value: "verb", label: "Verb (Động từ)" },
  { value: "adjective", label: "Adjective (Tính từ)" },
  { value: "adverb", label: "Adverb (Trạng từ)" },
  { value: "preposition", label: "Preposition (Giới từ)" },
  { value: "conjunction", label: "Conjunction (Liên từ)" },
  { value: "pronoun", label: "Pronoun (Đại từ)" },
  { value: "interjection", label: "Interjection (Thán từ)" },
];

const CEFR_OPTIONS = [
  { value: "A1", label: "A1 - Beginner" },
  { value: "A2", label: "A2 - Elementary" },
  { value: "B1", label: "B1 - Intermediate" },
  { value: "B2", label: "B2 - Upper Intermediate" },
  { value: "C1", label: "C1 - Advanced" },
  { value: "C2", label: "C2 - Proficiency" },
];

const getDefaultVocabData = (testId) => ({
  word: "",
  meaning: "",
  example_sentence: "",
  part_of_speech: "",
  cefr_level: "",
  test_id: testId || "",
});

/* ===================== Shared styles ===================== */
const inputBase =
  "w-full text-sm text-slate-900 placeholder:text-slate-400 outline-none transition";
const ringGood = "focus:border-indigo-400 focus:ring-4 focus:ring-indigo-200/50";
const ringBad = "focus:border-rose-400 focus:ring-4 focus:ring-rose-200/50";

/* =====================
   ✅ IMPORTANT: Move these OUTSIDE component
===================== */
const FieldInput = React.memo(function FieldInput({
  error,
  className = "",
  ...props
}) {
  return (
    <input
      {...props}
      className={cx(
        inputBase,
        "rounded-xl border bg-white px-3 py-2",
        error ? "border-rose-300 bg-rose-50" : "border-slate-200",
        error ? ringBad : ringGood,
        className
      )}
    />
  );
});

const FieldTextarea = React.memo(function FieldTextarea({
  error,
  className = "",
  ...props
}) {
  return (
    <textarea
      {...props}
      className={cx(
        inputBase,
        "resize-none rounded-xl border bg-white px-3 py-2",
        error ? "border-rose-300 bg-rose-50" : "border-slate-200",
        error ? ringBad : ringGood,
        className
      )}
    />
  );
});

const FieldSelect = React.memo(function FieldSelect({
  value,
  onChange,
  error,
  options,
  placeholder,
}) {
  return (
    <div className="relative">
      <select
        value={value ?? ""}
        onChange={onChange}
        className={cx(
          inputBase,
          "appearance-none rounded-xl border bg-white px-3 py-2 pr-9",
          error ? "border-rose-300 bg-rose-50" : "border-slate-200",
          error ? ringBad : ringGood
        )}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
});

/* ===================== Main ===================== */
const AdminVocabularyQuestionModal = ({
  isOpen,
  onClose,
  testId,
  question = null,
  onQuestionSaved,
  allTests = [],
}) => {
  const isEditMode = !!question;
  const questionId = question?._id;

  const [formData, setFormData] = useState(getDefaultVocabData(testId));
  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState("");
  const [errors, setErrors] = useState({});

  const canChooseTest = useMemo(
    () => !isEditMode && (allTests?.length || 0) > 0,
    [isEditMode, allTests]
  );

  // ✅ Init/reset when open OR switch questionId
  useEffect(() => {
    if (!isOpen) return;

    setErrorBanner("");
    setErrors({});

    if (isEditMode && question) {
      setFormData({
        test_id: question.test_id || testId || "",
        word: question.word || "",
        meaning: question.meaning || "",
        example_sentence: question.example_sentence || "",
        part_of_speech: question.part_of_speech || "",
        cefr_level: question.cefr_level || "",
      });
    } else {
      setFormData(getDefaultVocabData(testId));
    }
  }, [isOpen, isEditMode, questionId, testId]); // ✅ stable deps

  // ESC close
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const setField = useCallback((k, v) => {
    setFormData((p) => ({ ...p, [k]: v }));
  }, []);

  const validate = useCallback(() => {
    const next = {};
    if (!formData.word?.trim()) next.word = "Vui lòng nhập từ vựng";
    if (!formData.meaning?.trim()) next.meaning = "Vui lòng nhập nghĩa của từ";
    if (!formData.example_sentence?.trim())
      next.example_sentence = "Vui lòng nhập câu ví dụ";
    if (!formData.part_of_speech?.trim())
      next.part_of_speech = "Vui lòng chọn loại từ";
    if (!formData.cefr_level?.trim())
      next.cefr_level = "Vui lòng chọn trình độ CEFR";
    if (!isEditMode && !formData.test_id?.trim())
      next.test_id = "Vui lòng chọn bài test";

    setErrors(next);
    return Object.keys(next).length === 0;
  }, [formData, isEditMode]);

  const handleSubmit = useCallback(
    async (e) => {
      e?.preventDefault?.();
      if (loading) return;
      if (!validate()) return;

      setLoading(true);
      setErrorBanner("");

      try {
        const payload = { ...formData };
        const res = isEditMode
          ? await vocabularyService.updateVocabulary(questionId, payload)
          : await vocabularyService.createVocabulary(payload);

        onQuestionSaved?.(res, isEditMode ? "update" : "create");
        onClose?.();
      } catch (err) {
        const msg = err?.message || "Có lỗi xảy ra khi lưu từ vựng";
        setErrorBanner(msg);
        onQuestionSaved?.(null, "error", msg);
      } finally {
        setLoading(false);
      }
    },
    [loading, validate, formData, isEditMode, questionId, onQuestionSaved, onClose]
  );

  if (!isOpen) return null;

  const rows = [
    { key: "word", title: "Từ vựng", req: true, hint: "Nhập từ tiếng Anh (hoặc cụm từ)" },
    { key: "meaning", title: "Nghĩa", req: true, hint: "Có thể nhập nhiều nghĩa, xuống dòng" },
    { key: "example_sentence", title: "Câu ví dụ", req: true, hint: "Cung cấp câu ví dụ minh họa" },
    { key: "part_of_speech", title: "Loại từ", req: true, hint: "Danh từ, động từ, tính từ..." },
    { key: "cefr_level", title: "Trình độ CEFR", req: true, hint: "A1, A2, B1, B2, C1, C2" },
  ];

  const renderControl = (key) => {
    switch (key) {
      case "word":
        return (
          <FieldInput
            autoFocus={!isEditMode} // optional
            value={formData.word}
            onChange={(e) => setField("word", e.target.value)}
            placeholder="Ví dụ: compile"
            error={errors.word}
          />
        );
      case "meaning":
        return (
          <FieldTextarea
            rows={2}
            value={formData.meaning}
            onChange={(e) => setField("meaning", e.target.value)}
            placeholder="Ví dụ: biên dịch; tổng hợp"
            error={errors.meaning}
          />
        );
      case "example_sentence":
        return (
          <FieldTextarea
            rows={2}
            value={formData.example_sentence}
            onChange={(e) => setField("example_sentence", e.target.value)}
            placeholder="Ví dụ: The woman is compiling data for the report."
            error={errors.example_sentence}
          />
        );
      case "part_of_speech":
        return (
          <FieldSelect
            value={formData.part_of_speech}
            onChange={(e) => setField("part_of_speech", e.target.value)}
            error={errors.part_of_speech}
            options={POS_OPTIONS}
            placeholder="-- Chọn loại từ --"
          />
        );
      case "cefr_level":
        return (
          <FieldSelect
            value={formData.cefr_level}
            onChange={(e) => setField("cefr_level", e.target.value)}
            error={errors.cefr_level}
            options={CEFR_OPTIONS}
            placeholder="-- Chọn trình độ --"
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div className="fixed inset-0 bg-slate-900/35 backdrop-blur-sm" onClick={onClose} />

      <div className="flex min-h-full items-center justify-center p-1 sm:p-2">
        <div
          role="dialog"
          aria-modal="true"
          className="relative w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative px-3 py-2 border-b border-slate-200">
            <div className="pointer-events-none absolute inset-0 bg-indigo-50 opacity-40" />
            <div className="relative flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 shadow-sm">
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>

                <div className="leading-tight">
                  <h2 className="text-base font-extrabold text-slate-900">
                    {isEditMode ? "Sửa từ vựng" : "Thêm từ vựng"}
                  </h2>
                  <p className="mt-0.5 text-[11px] text-slate-600">
                    {isEditMode ? "Chỉnh sửa thông tin từ vựng" : "Tạo từ vựng mới cho bài kiểm tra"}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="rounded-xl bg-white/80 px-3 py-2 text-slate-700 ring-1 ring-slate-200 hover:bg-white transition"
                aria-label="Đóng"
                type="button"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto px-3 pt-2 pb-3">
              {errorBanner && (
                <div className="mb-2 rounded-xl border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs text-rose-800">
                  {errorBanner}
                </div>
              )}

              {canChooseTest && (
                <div className="mb-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Chọn bài test <span className="text-rose-600">*</span>
                  </label>

                  <FieldSelect
                    value={formData.test_id}
                    onChange={(e) => setField("test_id", e.target.value)}
                    error={errors.test_id}
                    options={(allTests || []).map((t) => ({
                      value: t._id,
                      label: `${t.test_title} (${t.main_topic} - ${t.sub_topic})`,
                    }))}
                    placeholder="-- Chọn bài test --"
                  />

                  {errors.test_id && (
                    <p className="mt-1 text-[11px] text-rose-700">{errors.test_id}</p>
                  )}
                </div>
              )}

              <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-2">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                        />
                      </svg>
                    </span>
                    <h3 className="text-sm font-extrabold text-slate-900">Thông tin từ vựng</h3>
                  </div>

                  <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">
                    {isEditMode ? "Edit" : "New"}
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/70 shadow-sm">
                  <div className="divide-y divide-slate-100">
                    {rows.map((row) => (
                      <div key={row.key} className="p-2">
                        <div className="grid gap-2 sm:grid-cols-[210px,1fr] sm:gap-5">
                          <div className="sm:pt-0.5">
                            <div className="text-xs font-semibold text-slate-700">
                              {row.title} {row.req && <span className="text-rose-600">*</span>}
                            </div>
                            <div className="mt-0.5 text-[11px] text-slate-500">{row.hint}</div>
                          </div>

                          <div>
                            {renderControl(row.key)}
                            {errors[row.key] && (
                              <p className="mt-1 text-[11px] text-rose-700">{errors[row.key]}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <p className="text-[11px] text-slate-500">* Trường bắt buộc</p>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-indigo-400" />
                    <span className="h-2 w-2 rounded-full bg-violet-400" />
                    <span className="h-2 w-2 rounded-full bg-fuchsia-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 px-3 py-2 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-60"
              >
                Hủy
              </button>

              <button
                type="submit"
                disabled={loading}
                className={cx(
                  "rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition",
                  "bg-indigo-600 hover:opacity-95 focus:ring-4 focus:ring-indigo-200/60",
                  "disabled:opacity-70 disabled:cursor-not-allowed"
                )}
              >
                <span className="inline-flex items-center gap-2">
                  {loading && (
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" fill="none" />
                      <path d="M12 2a10 10 0 0110 10h-4a6 6 0 00-6-6V2z" fill="currentColor" className="opacity-75" />
                    </svg>
                  )}
                  {isEditMode ? "Cập nhật" : "Tạo từ vựng"}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminVocabularyQuestionModal;
