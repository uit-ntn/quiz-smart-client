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
      <div className="min-h-screen bg-slate-50 py-8">
        <div className="max-w-xl mx-auto px-4">
          <div className="rounded-2xl border border-red-200 bg-white shadow-sm">
            <div className="p-5">
              <ErrorMessage
                error={error || "Không tìm thấy bài kiểm tra"}
                onRetry={error ? () => window.location.reload() : null}
              />
              <div className="mt-4 text-center">
                <button
                  onClick={() => navigate(-1)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  <span className="text-lg leading-none">←</span> Quay lại
                </button>
              </div>
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
        {/* Top header */}
        <div className="mb-4 sm:mb-6 flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
              <span className="inline-flex h-2 w-2 rounded-full bg-blue-600" />
              Multiple Choice
            </div>

            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Cấu hình bài test
            </h1>

            <p className="mt-1 text-sm text-slate-600">
              <span className="font-semibold text-slate-800">{title}</span>
              <span className="mx-2 text-slate-300">•</span>
              {effective.totalQuestions} câu hỏi
            </p>
          </div>

          <button
            onClick={() => navigate(-1)}
            className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <span className="text-lg leading-none">←</span> Quay lại
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 sm:mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Settings card (2/3) */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-sm p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900">Tùy chọn hiển thị</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Bật/tắt một số yếu tố giao diện khi làm bài.
                </p>
              </div>

              <span className="hidden sm:inline-flex items-center rounded-xl px-3 py-1 text-xs font-semibold bg-blue-50 text-blue-700">
                Kiểm tra: sau mỗi câu
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {displayOptions.map((item) => (
                <label
                  key={item.id}
                  htmlFor={item.id}
                  className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:bg-slate-50 transition cursor-pointer"
                >
                  <input
                    id={item.id}
                    type="checkbox"
                    checked={!!settings[item.key]}
                    onChange={(e) => handleSettingChange(item.key, e.target.checked)}
                    className="mt-1 w-4 h-4 accent-slate-900 rounded border-slate-300"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-slate-900">{item.label}</div>
                    <div className="mt-1 text-xs text-slate-600 leading-relaxed">{item.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            {/* optional: per-question time limit (nhẹ nhàng, giống style) */}
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Giới hạn thời gian mỗi câu</h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Để trống nếu muốn theo tổng thời gian bài.
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  {effective.perQuestion}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2">
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
                  className="w-40 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
                <span className="text-sm text-slate-600">giây</span>

                <button
                  type="button"
                  onClick={() => handleSettingChange("questionTimeLimit", null)}
                  className="ml-auto inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Summary card (1/3) */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">Tóm tắt</h2>
            <p className="text-sm text-slate-600 mt-1">Kiểm tra nhanh trước khi bắt đầu.</p>

            <div className="mt-4 space-y-3">
              <InfoLine icon="📝" label="Số câu" value={`${effective.totalQuestions}`} />
              <InfoLine icon="⏱️" label="Thời gian" value={`${effective.timeLimitMinutes} phút`} />
              <InfoLine icon="✅" label="Đáp án" value={effective.checkMode} />
              <InfoLine icon="🔀" label="Xáo câu" value={effective.shuffleQuestions ? "Bật" : "Tắt"} />
              <InfoLine icon="🔁" label="Xáo đáp án" value={effective.shuffleAnswers ? "Bật" : "Tắt"} />
              <InfoLine icon="⌛" label="Mỗi câu" value={effective.perQuestion} />
            </div>

            <button
              onClick={handleStartTest}
              className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg hover:opacity-95 active:opacity-90"
            >
              Bắt đầu làm bài <span className="text-lg">→</span>
            </button>

            {/* mobile helper spacing */}
            <div className="h-1" />
          </div>
        </div>
    </MultipleChoiceLayout>
  );
};

function InfoLine({ icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
      <div className="flex items-center gap-2 text-sm text-slate-700">
        <span className="text-base">{icon}</span>
        <span className="text-slate-500">{label}</span>
      </div>
      <div className="text-sm font-bold text-slate-900">{value}</div>
    </div>
  );
}

export default MultipleChoiceTestSettings;
