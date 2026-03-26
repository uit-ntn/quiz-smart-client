// src/pages/MultipleChoiceTestSettings.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import testService from "../services/testService";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import { MultipleChoiceLayout } from "../layout/TestLayout";

const MultipleChoiceTestSettings = () => {
  const { testId } = useParams();
  const navigate = useNavigate();

  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [settings, setSettings] = useState({
    testMode: "flexible", // luôn là flexible
    showTimer: true,
    checkMode: "after_each", // luôn là after_each
    showQuestionNumber: true,
    shuffleQuestions: false,
    shuffleAnswers: false,
    questionTimeLimit: null, // seconds | null
  });

  useEffect(() => {
    const fetchTestDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await testService.getTestById(testId);
        const testData = response?.test || response;
        setTest(testData);

        // load settings đã lưu (nếu có)
        const saved = localStorage.getItem(`test_settings_${testId}`);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setSettings((prev) => ({
              ...prev,
              ...parsed,
              testMode: "flexible",
              checkMode: "after_each",
            }));
          } catch {}
        }
      } catch (err) {
        console.error("Error fetching test details:", err);
        setError("Không thể tải thông tin bài kiểm tra. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    };

    if (testId) fetchTestDetails();
  }, [testId]);

  const handleSettingChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleStartTest = () => {
    try {
      localStorage.setItem(`test_settings_${testId}`, JSON.stringify(settings));
    } catch (e) {
      console.warn("Cannot access localStorage", e);
    }

    navigate(`/multiple-choice/test/${testId}/take`, { state: { settings } });
  };

  const title =
    test?.test_title ||
    [test?.main_topic, test?.sub_topic].filter(Boolean).join(" - ") ||
    "Bài kiểm tra";

  const effective = useMemo(() => {
    const totalQuestions = Number.isFinite(test?.total_questions) ? test.total_questions : 0;
    const timeLimitMinutes = Number.isFinite(test?.time_limit_minutes) ? test.time_limit_minutes : 0;

    return {
      totalQuestions,
      timeLimitMinutes,
      showTimer: !!settings.showTimer,
      showQuestionNumber: !!settings.showQuestionNumber,
      shuffleQuestions: !!settings.shuffleQuestions,
      shuffleAnswers: !!settings.shuffleAnswers,
      checkMode: "Kiểm tra mỗi câu",
      perQuestion:
        Number.isFinite(settings.questionTimeLimit) && settings.questionTimeLimit > 0
          ? `${settings.questionTimeLimit}s`
          : "—",
    };
  }, [test?.total_questions, test?.time_limit_minutes, settings]);

  if (loading) return <LoadingSpinner message="Đang tải thông tin bài kiểm tra..." />;

  if (error || !test) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(to bottom right, #bae6fd, #dbeafe, #d1fae5)" }}>
        <div className="max-w-xl w-full mx-4">
          <div className="rounded-2xl border-[3px] border-rose-500 bg-white shadow-xl p-4">
            <ErrorMessage
              error={error || "Không tìm thấy bài kiểm tra"}
              onRetry={error ? () => window.location.reload() : null}
            />
            <div className="mt-4 text-center">
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 rounded-xl border-[3px] border-teal-800 bg-teal-600 px-3 py-2 text-sm font-extrabold text-white shadow-lg hover:bg-teal-500"
              >
                ← Quay lại
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const displayOptions = [
    {
      id: "showTimer",
      label: "Hiển thị đồng hồ đếm ngược",
      desc: "Xem thời gian còn lại khi làm bài.",
      key: "showTimer",
    },
    {
      id: "showQuestionNumber",
      label: "Hiển thị số thứ tự câu hỏi",
      desc: "Ví dụ: Câu 1/10, Câu 2/10…",
      key: "showQuestionNumber",
    },
    {
      id: "shuffleQuestions",
      label: "Xáo trộn thứ tự câu hỏi",
      desc: "Hiển thị câu hỏi theo thứ tự ngẫu nhiên.",
      key: "shuffleQuestions",
    },
    {
      id: "shuffleAnswers",
      label: "Xáo trộn thứ tự đáp án",
      desc: "Đáp án được xáo trộn và đổi nhãn (A,B,C,D...).",
      key: "shuffleAnswers",
    },
  ];

  return (
    <MultipleChoiceLayout>
      <div style={{ background: "linear-gradient(to bottom right, #bae6fd, #dbeafe, #d1fae5)", borderRadius: "1rem", padding: "0.75rem" }}>

        {/* Top bar */}
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-violet-800 bg-violet-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-md">
              <span className="inline-flex h-2 w-2 rounded-full bg-lime-400" />
              Multiple Choice
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-sky-800 bg-sky-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-md">
              📌 {effective.totalQuestions} câu
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-emerald-800 bg-emerald-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-md">
              ⏱️ {effective.timeLimitMinutes} phút
            </span>
          </div>

          <button
            onClick={() => navigate(-1)}
            className="self-start sm:self-auto shrink-0 inline-flex items-center gap-2 rounded-xl border-[3px] border-teal-800 bg-teal-600 px-3 py-1.5 text-sm font-extrabold text-white shadow-lg hover:bg-teal-500"
          >
            ← Quay lại
          </button>
        </div>

        {/* Title */}
        <div className="mb-3">
          <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight">Cấu hình bài test</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-indigo-900 font-bold line-clamp-2">{title}</p>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Left: Test Info — fuchsia card */}
          <div className="rounded-2xl border-[3px] border-fuchsia-500 bg-gradient-to-br from-fuchsia-100 to-purple-200 shadow-xl ring-2 ring-fuchsia-300/60 p-4">
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 mb-3 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-fuchsia-600 text-white text-xs font-extrabold shadow">📋</span>
              Thông tin bài test
            </h2>
            <div className="space-y-1.5">
              <InfoLine icon="📝" label="Tiêu đề" value={test?.test_title || "—"} />
              <InfoLine icon="📖" label="Mô tả" value={test?.description || "—"} />
              <div className="grid grid-cols-2 gap-1.5">
                <InfoLine icon="🏷️" label="Chủ đề chính" value={test?.main_topic || "—"} />
                <InfoLine icon="📂" label="Chủ đề phụ" value={test?.sub_topic || "—"} />
                <InfoLine icon="🔧" label="Loại test" value={test?.test_type || "—"} />
                <InfoLine icon="❓" label="Số câu" value={test?.total_questions || "—"} />
                <InfoLine icon="⏱️" label="Thời gian" value={`${test?.time_limit_minutes || 0} phút`} />
                <InfoLine icon="📊" label="Độ khó" value={test?.difficulty || "—"} />
                <InfoLine icon="🔒" label="Trạng thái" value={test?.status || "—"} />
                <InfoLine icon="👁️" label="Hiển thị" value={test?.visibility || "—"} />
                <InfoLine icon="👤" label="Tạo bởi" value={test?.created_by_full_name || "—"} className="col-span-2" />
              </div>
            </div>
          </div>

          {/* Right: Settings — indigo/amber card */}
          <div className="rounded-2xl border-[3px] border-indigo-500 bg-gradient-to-br from-indigo-100 to-violet-200 shadow-xl ring-2 ring-indigo-300/60 p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs shadow">⚙️</span>
                  Tùy chọn hiển thị
                </h2>
                <p className="text-xs text-indigo-900 font-bold mt-0.5">Bật/tắt các yếu tố giao diện khi làm bài.</p>
              </div>
              <span className="hidden sm:inline-flex items-center rounded-full border-2 border-indigo-700 bg-indigo-600 px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow">
                Kiểm tra: sau mỗi câu
              </span>
            </div>

            <div className="grid grid-cols-1 gap-1.5 mb-3">
              {displayOptions.map((item) => (
                <label
                  key={item.id}
                  htmlFor={item.id}
                  className={`flex items-start gap-2.5 rounded-xl px-3 py-2 shadow-sm transition cursor-pointer border-[3px] ${
                    settings[item.key]
                      ? 'border-indigo-600 bg-white ring-2 ring-indigo-300'
                      : 'border-white/70 bg-white/60 hover:bg-white hover:border-indigo-300'
                  }`}
                >
                  <input
                    id={item.id}
                    type="checkbox"
                    checked={!!settings[item.key]}
                    onChange={(e) => handleSettingChange(item.key, e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-indigo-600 rounded border-indigo-400"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-slate-900">{item.label}</div>
                    <div className="mt-0.5 text-xs text-indigo-900 font-bold leading-tight">{item.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            {/* Per-question time limit */}
            <div className="rounded-xl border-[3px] border-amber-500 bg-amber-100 p-3 shadow-md">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Giới hạn thời gian mỗi câu</h3>
                  <p className="text-xs text-amber-900 font-bold mt-0.5">Để trống nếu muốn theo tổng thời gian bài.</p>
                </div>
                <span className="text-xs font-extrabold text-amber-800 bg-white px-2 py-0.5 rounded-full border-2 border-amber-500">
                  {effective.perQuestion}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="number"
                  min={5}
                  step={5}
                  value={Number.isFinite(settings.questionTimeLimit) ? settings.questionTimeLimit : ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    handleSettingChange("questionTimeLimit", v === "" ? null : Number(v));
                  }}
                  placeholder="Ví dụ: 30"
                  className="w-24 sm:w-28 rounded-lg border-2 border-amber-400 bg-white px-2 py-1.5 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-300"
                />
                <span className="text-sm font-extrabold text-amber-900">giây</span>
                <button
                  type="button"
                  onClick={() => handleSettingChange("questionTimeLimit", null)}
                  className="ml-auto inline-flex items-center rounded-lg border-2 border-rose-600 bg-rose-500 px-2.5 py-1.5 text-xs font-extrabold text-white shadow hover:bg-rose-400"
                >
                  Reset
                </button>
              </div>
            </div>

            <button
              onClick={handleStartTest}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 via-red-600 to-rose-700 px-3 py-2.5 text-sm font-extrabold text-white shadow-lg border-[3px] border-red-900 hover:brightness-110"
            >
              Bắt đầu làm bài →
            </button>
          </div>
        </div>
      </div>
    </MultipleChoiceLayout>
  );
};

function InfoLine({ icon, label, value, className = "" }) {
  return (
    <div className={`flex items-center justify-between gap-2 rounded-lg border-2 border-purple-300 bg-white px-2 py-1.5 shadow-sm ${className}`}>
      <div className="flex items-center gap-1.5 text-xs min-w-0">
        <span className="text-sm shrink-0">{icon}</span>
        <span className="text-purple-800 font-bold truncate">{label}</span>
      </div>
      <div className="text-xs font-extrabold text-slate-900 truncate text-right ml-2 max-w-[50%]">{value}</div>
    </div>
  );
}

export default MultipleChoiceTestSettings;
