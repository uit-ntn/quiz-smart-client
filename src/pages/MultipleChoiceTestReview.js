import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import TestService from "../services/testService";
import testResultService from "../services/testResultService";

import Toast from '../components/Toast';

const MultipleChoiceTestReview = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const DRAFT_KEY = `mc_draft_${testId}`;

  const [testInfo, setTestInfo] = useState(null);

  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState({}); // qid -> [labels]
  const [results, setResults] = useState([]);

  const [score, setScore] = useState(0);
  const [selectedQuestion, setSelectedQuestion] = useState(0);

  const [draftResultId, setDraftResultId] = useState(null);
  const [isSaved, setIsSaved] = useState(false);

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Toast state
  const [toast, setToast] = useState({ message: '', type: 'success', isVisible: false });
  
  const isAnswered = (ua) => (Array.isArray(ua) ? ua.length > 0 : !!ua);

  // helper: get draft id from query
  const getDraftIdFromQuery = () => {
    const sp = new URLSearchParams(location.search);
    const id = sp.get("draft");
    return id && id.trim() ? id.trim() : null;
  };

  // fetch test info (optional UI)
  useEffect(() => {
    const fetchTestData = async () => {
      try {
        const data = await TestService.getTestById(testId);
        setTestInfo(data?.test || data);
      } catch (err) {
        console.error("Error fetching test data:", err);
      }
    };
    fetchTestData();
  }, [testId]);

  // init from location.state OR fetch draft from DB
  useEffect(() => {
    const init = async () => {
      try {
        setPageLoading(true);
        setError(null);

        // 1) if have state -> use it immediately
        if (location.state?.test && location.state?.questions?.length) {
          const {
            test,
            questions,
            userAnswers,
            results,
            draftResultId,
            percentage,
          } = location.state;

          setTest(test);
          setQuestions(questions || []);
          setUserAnswers(userAnswers || {});
          setResults(results || []);
          setDraftResultId(draftResultId || null);

          if (draftResultId) localStorage.setItem(DRAFT_KEY, String(draftResultId));

          if (percentage !== undefined) setScore(percentage);
          else {
            const correctCnt = (results || []).filter((r) => r.isCorrect).length;
            const totalQ = (results || []).length;
            setScore(totalQ > 0 ? Math.round((correctCnt / totalQ) * 100) : 0);
          }

          setPageLoading(false);
          return;
        }

        // 2) if no state -> try to fetch draft by id (query or localStorage)
        const draftFromQuery = getDraftIdFromQuery();
        const draftFromLocal = localStorage.getItem(DRAFT_KEY);
        const draftId = draftFromQuery || draftFromLocal;

        if (!draftId) {
          navigate(`/multiple-choice/test/${testId}/settings`);
          return;
        }

        setDraftResultId(draftId);

        // fetch draft result
        const doc = await testResultService.getTestResultById(draftId);

        // status check
        if (doc?.status === "active") setIsSaved(true);

        // build questions from snapshot answers
        const answers = Array.isArray(doc?.answers) ? doc.answers : [];
        const builtQuestions = answers.map((a) => ({
          _id: a.question_id,
          question_text: a.question_text,
          options: a.options || [],
          correct_answers: a.correct_answers || [],
          // explanation không có trong snapshot BE mới (nếu bạn muốn thì thêm vào schema/payload)
          explanation: a.explanation || null,
        }));

        // build userAnswers map
        const ua = {};
        answers.forEach((a) => {
          ua[String(a.question_id)] = Array.isArray(a.user_answers) ? a.user_answers : [];
        });

        // build results
        const builtResults = answers.map((a) => ({
          questionId: a.question_id,
          userAnswer: Array.isArray(a.user_answers) ? a.user_answers : [],
          correctAnswer: Array.isArray(a.correct_answers) ? a.correct_answers : [],
          isCorrect: !!a.is_correct,
          explanation: a.explanation || null,
        }));

        // compute score
        const correctCnt = builtResults.filter((r) => r.isCorrect).length;
        const totalQ = builtResults.length;
        const pct = totalQ > 0 ? Math.round((correctCnt / totalQ) * 100) : 0;

        setQuestions(builtQuestions);
        setUserAnswers(ua);
        setResults(builtResults);

        // build simple test from snapshot
        setTest({
          test_title: doc?.test_snapshot?.test_title,
          main_topic: doc?.test_snapshot?.main_topic,
          sub_topic: doc?.test_snapshot?.sub_topic,
          difficulty: doc?.test_snapshot?.difficulty,
          test_type: doc?.test_snapshot?.test_type,
          time_limit_minutes: doc?.test_snapshot?.time_limit_minutes,
        });

        setScore(pct);
        setPageLoading(false);
      } catch (e) {
        console.error(e);
        setError(e?.message || "Không thể tải dữ liệu bài làm");
        setPageLoading(false);
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type, isVisible: true });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, isVisible: false }));
  };

  const saveResult = async () => {
    if (!draftResultId) {
      setError("Không tìm thấy bản nháp kết quả để lưu");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await testResultService.updateStatusById(draftResultId, "active");
      setIsSaved(true);

      // optional: giữ draftId để mở lại
      localStorage.setItem(DRAFT_KEY, String(draftResultId));

      showToast('Đã lưu kết quả thành công!', 'success');
    } catch (err) {
      console.error("Error saving result:", err);
      setError(err?.message || "Không thể lưu kết quả. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  const getScoreMessage = (s) => {
    if (s >= 90) return "Xuất sắc!";
    if (s >= 80) return "Rất tốt!";
    if (s >= 65) return "Khá ổn!";
    if (s >= 50) return "Trung bình";
    return "Cần cố gắng hơn";
  };

  const correctCount = useMemo(() => results.filter((r) => r.isCorrect).length, [results]);
  const incorrectCount = useMemo(
    () => results.filter((r) => !r.isCorrect && isAnswered(r.userAnswer)).length,
    [results]
  );
  const unansweredCount = useMemo(() => results.filter((r) => !isAnswered(r.userAnswer)).length, [results]);

  const currentQuestion = questions[selectedQuestion];
  const currentResult = results.find((r) => String(r.questionId) === String(currentQuestion?._id));

  const selectedLabels = Array.isArray(userAnswers[currentQuestion?._id])
    ? userAnswers[currentQuestion._id]
    : [];

  const goPrev = useCallback(() => setSelectedQuestion((x) => Math.max(0, x - 1)), []);
  const goNext = useCallback(
    () => setSelectedQuestion((x) => Math.min(Math.max(questions.length - 1, 0), x + 1)),
    [questions.length]
  );

  // keyboard nav (desktop)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext]);

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-md p-6 text-center">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-600 text-sm">Đang tải dữ liệu bài làm…</p>
        </div>
      </div>
    );
  }

  if (!test || questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 shadow-md p-6 text-center max-w-md">
          <p className="text-rose-700 text-sm font-semibold">Không có dữ liệu bài làm để hiển thị.</p>
          <p className="text-rose-600 text-xs mt-2">{error || "Vui lòng làm bài lại."}</p>
          <button
            onClick={() => navigate(`/multiple-choice/test/${testId}/settings`)}
            className="mt-4 rounded-xl bg-rose-600 text-white px-4 py-2 text-sm font-semibold hover:bg-rose-700"
          >
            Về trang cài đặt
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-100 overflow-hidden">
      {/* container */}
      <div className="mx-auto max-w-7xl h-full px-3 sm:px-4 py-3 sm:py-4 flex flex-col">
        {/* top bar */}
        <div className="mb-3 flex items-center justify-between gap-2 shrink-0">
          <button
            onClick={() => navigate("/multiple-choice/topics")}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-md hover:bg-slate-50"
          >
            <span className="text-lg leading-none">←</span>
            Về danh sách
          </button>

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs text-slate-500">Câu hiện tại</span>
            <span className="rounded-lg bg-white border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 shadow-md">
              {selectedQuestion + 1}/{questions.length}
            </span>
          </div>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
          {/* MAIN */}
          <div className="lg:col-span-8 min-h-0 flex flex-col">
            <div className="flex-1 min-h-0 rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden flex flex-col">
              {/* header */}
              <div className="px-3 sm:px-4 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500">Câu hỏi</p>
                    <h3 className="text-sm sm:text-base font-bold text-slate-800">
                      Câu {selectedQuestion + 1} / {questions.length}
                    </h3>
                  </div>

                  <div
                    className={`shrink-0 inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold border ${
                      currentResult?.isCorrect
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}
                  >
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-lg text-white ${
                        currentResult?.isCorrect ? "bg-emerald-600" : "bg-rose-600"
                      }`}
                    >
                      {currentResult?.isCorrect ? "✓" : "✗"}
                    </span>
                    {currentResult?.isCorrect ? "Đúng" : "Sai"}
                  </div>
                </div>
              </div>

              {/* scrollable content */}
              <div className="p-3 sm:p-4 flex-1 min-h-0 overflow-auto">
                <h4 className="text-sm sm:text-base font-semibold text-slate-900 leading-relaxed">
                  {currentQuestion?.question_text}
                </h4>

                {/* options */}
                <div className="mt-3 space-y-1.5">
                  {(currentQuestion?.options || []).map((option) => {
                    const isUserAnswer = selectedLabels.includes(option.label);
                    const isCorrectAnswer = (currentQuestion?.correct_answers || []).includes(option.label);

                    const tone = isCorrectAnswer
                      ? "border-emerald-200 bg-emerald-50"
                      : isUserAnswer
                      ? "border-rose-200 bg-rose-50"
                      : "border-slate-200 bg-white";

                    const badgeTone = isCorrectAnswer
                      ? "border-emerald-200 text-emerald-700 bg-white"
                      : isUserAnswer
                      ? "border-rose-200 text-rose-700 bg-white"
                      : "border-slate-200 text-slate-600 bg-white";

                    return (
                      <div
                        key={option.label}
                        className={`rounded-2xl border ${tone} px-3 py-2 transition hover:shadow-md`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`h-8 w-8 rounded-xl border ${badgeTone} flex items-center justify-center font-bold text-sm shadow-md`}
                          >
                            {option.label}
                          </div>

                          <div className="flex-1">
                            <p className="text-sm text-slate-800 leading-relaxed">{option.text}</p>

                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {isCorrectAnswer && (
                                <span className="inline-flex items-center rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                                  Đáp án đúng
                                </span>
                              )}
                              {isUserAnswer && !isCorrectAnswer && (
                                <span className="inline-flex items-center rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                                  Bạn chọn
                                </span>
                              )}
                              {isUserAnswer && isCorrectAnswer && (
                                <span className="inline-flex items-center rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white">
                                  Bạn chọn đúng
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0 pt-0.5">
                            {isCorrectAnswer ? (
                              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md">
                                ✓
                              </span>
                            ) : isUserAnswer ? (
                              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-rose-600 text-white shadow-md">
                                ✗
                              </span>
                            ) : (
                              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 bg-white">
                                •
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* bottom nav */}
              <div className="shrink-0 px-3 sm:px-4 py-3 border-t border-slate-200 bg-white">
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={goPrev}
                    disabled={selectedQuestion === 0}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Trước
                  </button>

                  <div className="text-xs text-slate-500">
                    {selectedQuestion + 1} / {questions.length}
                  </div>

                  <button
                    onClick={goNext}
                    disabled={selectedQuestion === questions.length - 1}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Tiếp →
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="lg:col-span-4 min-h-0">
            <div className="lg:sticky lg:top-4 min-h-0 flex flex-col gap-3 lg:max-h-[calc(100vh-2rem)] lg:overflow-auto">
              {/* score card */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-md p-3 sm:p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500">Điểm số</p>
                    <p className="text-lg sm:text-xl font-extrabold text-slate-900">{score}%</p>
                    <p className="text-sm font-semibold text-slate-700">{getScoreMessage(score)}</p>
                  </div>

                  <Ring value={score} />
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <StatMini label="Đúng" value={correctCount} tone="emerald" />
                  <StatMini label="Sai" value={incorrectCount} tone="rose" />
                  <StatMini label="Chưa làm" value={unansweredCount} tone="amber" />
                </div>

                <div className="mt-3 flex flex-col gap-2">
                  {draftResultId && !isSaved && (
                    <button
                      onClick={saveResult}
                      disabled={loading}
                      className={`w-full rounded-xl px-3 py-2 text-sm font-semibold text-white shadow-md transition ${
                        loading ? "bg-emerald-400" : "bg-emerald-600 hover:bg-emerald-700"
                      }`}
                    >
                      {loading ? "Đang lưu…" : "Lưu kết quả"}
                    </button>
                  )}

                  {isSaved && (
                    <div className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 text-center">
                      ✓ Đã lưu kết quả
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => navigate(`/multiple-choice/test/${testId}/settings`)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-md hover:bg-slate-50"
                    >
                      Làm lại
                    </button>
                    <button
                      onClick={() => navigate("/multiple-choice/topics")}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-md hover:bg-slate-50"
                    >
                      Danh sách
                    </button>
                  </div>

                  {error && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                      {error}
                    </div>
                  )}
                </div>
              </div>

              {/* test info */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-md p-3 sm:p-4">
                <h4 className="text-sm font-bold text-slate-900">Thông tin bài kiểm tra</h4>
                <div className="mt-2 space-y-2 text-sm">
                  <InfoRow label="Tiêu đề" value={testInfo?.test_title || test?.test_title || "—"} />
                  <InfoRow
                    label="Chủ đề"
                    value={`${testInfo?.main_topic || test?.main_topic || "—"} - ${testInfo?.sub_topic || test?.sub_topic || "—"}`}
                  />
                  <InfoRow label="Độ khó" value={(test?.difficulty || "—").toString()} badge />
                  <InfoRow label="Giới hạn" value={`${testInfo?.time_limit_minutes ?? test?.time_limit_minutes ?? "—"} phút`} />
                </div>
              </div>

              {/* question grid */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden">
                <div className="px-3 sm:px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900">Danh sách câu</h4>
                  <span className="text-xs text-slate-500">{questions.length} câu</span>
                </div>

                <div className="p-3 sm:p-4">
                  <div className="grid grid-cols-10 sm:grid-cols-12 lg:grid-cols-10 gap-1.5">
                    {results.map((result, index) => {
                      const isCurrent = index === selectedQuestion;
                      const answered = isAnswered(result.userAnswer);

                      let tone = "bg-amber-500";
                      if (result.isCorrect) tone = "bg-emerald-600";
                      else if (answered) tone = "bg-rose-600";

                      return (
                        <button
                          key={String(result.questionId)}
                          onClick={() => setSelectedQuestion(index)}
                          className={`aspect-square rounded-xl text-white text-xs font-bold shadow-md transition hover:opacity-90 ${tone} ${
                            isCurrent ? "ring-2 ring-blue-500 ring-offset-2" : "ring-0"
                          }`}
                          title={`Câu ${index + 1}`}
                        >
                          {index + 1}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                    <LegendDot color="bg-emerald-600" label={`Đúng (${correctCount})`} />
                    <LegendDot color="bg-rose-600" label={`Sai (${incorrectCount})`} />
                    <LegendDot color="bg-amber-500" label={`Chưa làm (${unansweredCount})`} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* end sidebar */}
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

function Ring({ value = 0 }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0">
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(#10b981 ${v * 3.6}deg, #e2e8f0 0deg)`,
        }}
      />
      <div className="absolute inset-[6px] rounded-full bg-white flex items-center justify-center shadow-md">
        <span className="text-xs font-bold text-slate-700">{v}%</span>
      </div>
    </div>
  );
}

function StatMini({ label, value, tone }) {
  const map = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
  };
  return (
    <div className={`rounded-2xl border px-3 py-2 text-center ${map[tone] || ""}`}>
      <div className="text-lg font-extrabold leading-none">{value}</div>
      <div className="mt-1 text-[11px] font-semibold">{label}</div>
    </div>
  );
}

function InfoRow({ label, value, badge }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-slate-500">{label}</span>
      {badge ? (
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700 capitalize">
          {value}
        </span>
      ) : (
        <span className="text-sm font-semibold text-slate-800 text-right">{value}</span>
      )}
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}

export default MultipleChoiceTestReview;
