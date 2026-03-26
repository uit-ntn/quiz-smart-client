import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import TestService from "../services/testService";
import testResultService from "../services/testResultService";
import { getCorrectAnswerLabels, isCorrectAnswer } from "../utils/correctAnswerHelpers";

import Toast from '../components/Toast';
import ExportMCPModal from '../components/ExportMCPModal';

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

  const [questionPage, setQuestionPage] = useState(0);
  const questionsPerPage = 24;

  const [draftResultId, setDraftResultId] = useState(null);
  const [isSaved, setIsSaved] = useState(false);

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Toast state
  const [toast, setToast] = useState({ message: '', type: 'success', isVisible: false });
  
  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  
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
            questions: stateQuestions,
            userAnswers,
            results: stateResults,
            draftResultId,
            percentage,
          } = location.state;

          // Normalize explanations in questions from state (backward compatibility)
          const normalizedQuestions = (stateQuestions || []).map(q => {
            if (!q.explanation) return q;
            const correctLabels = getCorrectAnswerLabels(q.correct_answers);
            return {
              ...q,
              explanation: {
                correct: (() => {
                  if (!q.explanation.correct) return {};
                  if (typeof q.explanation.correct === 'object' && !Array.isArray(q.explanation.correct)) {
                    return q.explanation.correct;
                  }
                  if (typeof q.explanation.correct === 'string' && q.explanation.correct.trim()) {
                    const correctObj = {};
                    correctLabels.forEach(label => {
                      correctObj[label] = q.explanation.correct;
                    });
                    return correctObj;
                  }
                  return {};
                })(),
                incorrect_choices: q.explanation.incorrect_choices || {}
              }
            };
          });

          // Normalize explanations in results from state (backward compatibility)
          const normalizedResults = (stateResults || []).map(r => {
            if (!r.explanation) return r;
            return {
              ...r,
              explanation: {
                correct: (() => {
                  if (!r.explanation.correct) return {};
                  if (typeof r.explanation.correct === 'object' && !Array.isArray(r.explanation.correct)) {
                    return r.explanation.correct;
                  }
                  if (typeof r.explanation.correct === 'string' && r.explanation.correct.trim()) {
                    const correctLabels = Array.isArray(r.correctAnswer) ? r.correctAnswer : [];
                    const correctObj = {};
                    correctLabels.forEach(label => {
                      correctObj[label] = r.explanation.correct;
                    });
                    return correctObj;
                  }
                  return {};
                })(),
                incorrect_choices: r.explanation.incorrect_choices || {}
              }
            };
          });

          setTest(test);
          setQuestions(normalizedQuestions);
          setUserAnswers(userAnswers || {});
          setResults(normalizedResults);
          setDraftResultId(draftResultId || null);

          if (draftResultId) localStorage.setItem(DRAFT_KEY, String(draftResultId));

          if (percentage !== undefined) setScore(percentage);
          else {
            const correctCnt = normalizedResults.filter((r) => r.isCorrect).length;
            const totalQ = normalizedResults.length;
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
        const builtQuestions = answers.map((a) => {
          // Normalize explanation format if present (backward compatibility)
          let normalizedExplanation = null;
          if (a.explanation) {
            normalizedExplanation = {
              correct: (() => {
                if (!a.explanation.correct) return {};
                // If it's already an object, return it
                if (typeof a.explanation.correct === 'object' && !Array.isArray(a.explanation.correct)) {
                  return a.explanation.correct;
                }
                // If it's a string (old format), convert to object by assigning to all correct labels
                if (typeof a.explanation.correct === 'string' && a.explanation.correct.trim()) {
                  const correctLabels = getCorrectAnswerLabels(a.correct_answers);
                  const correctObj = {};
                  correctLabels.forEach(label => {
                    correctObj[label] = a.explanation.correct;
                  });
                  return correctObj;
                }
                return {};
              })(),
              incorrect_choices: a.explanation.incorrect_choices || {}
            };
          }
          
          return {
            _id: a.question_id,
            question_text: a.question_text,
            options: a.options || [],
            correct_answers: getCorrectAnswerLabels(a.correct_answers),
            explanation: normalizedExplanation,
          };
        });

        // build userAnswers map
        const ua = {};
        answers.forEach((a) => {
          ua[String(a.question_id)] = Array.isArray(a.user_answers) ? a.user_answers : [];
        });

        // build results
        const builtResults = answers.map((a) => {
          // Normalize explanation format if present (backward compatibility)
          let normalizedExplanation = null;
          if (a.explanation) {
            normalizedExplanation = {
              correct: (() => {
                if (!a.explanation.correct) return {};
                if (typeof a.explanation.correct === 'object' && !Array.isArray(a.explanation.correct)) {
                  return a.explanation.correct;
                }
                if (typeof a.explanation.correct === 'string' && a.explanation.correct.trim()) {
                  const correctLabels = getCorrectAnswerLabels(a.correct_answers);
                  const correctObj = {};
                  correctLabels.forEach(label => {
                    correctObj[label] = a.explanation.correct;
                  });
                  return correctObj;
                }
                return {};
              })(),
              incorrect_choices: a.explanation.incorrect_choices || {}
            };
          }
          
          return {
            questionId: a.question_id,
            userAnswer: Array.isArray(a.user_answers) ? a.user_answers : [],
            correctAnswer: getCorrectAnswerLabels(a.correct_answers),
            isCorrect: !!a.is_correct,
            explanation: normalizedExplanation,
          };
        });

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

  const handleExportQuestions = () => {
    if (score < 70) {
      showToast('Bạn cần đạt điểm tối thiểu 70% để xuất câu hỏi!', 'warning');
      return;
    }
    setShowExportModal(true);
  };

  const handleCloseExportModal = () => {
    setShowExportModal(false);
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

  const totalQuestionPages = Math.ceil(questions.length / questionsPerPage);
  const startIndex = questionPage * questionsPerPage;
  const endIndex = startIndex + questionsPerPage;
  const questionsToDisplay = questions.slice(startIndex, endIndex);

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
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(to bottom right, #bae6fd, #dbeafe, #d1fae5)" }}>
        <div className="rounded-2xl border-[3px] border-indigo-400 bg-white shadow-xl p-6 text-center">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-indigo-900 text-sm font-extrabold">Đang tải dữ liệu bài làm…</p>
        </div>
      </div>
    );
  }

  if (!test || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(to bottom right, #bae6fd, #dbeafe, #d1fae5)" }}>
        <div className="rounded-2xl border-[3px] border-rose-500 bg-white shadow-xl p-6 text-center max-w-md">
          <p className="text-rose-700 text-sm font-extrabold">Không có dữ liệu bài làm để hiển thị.</p>
          <p className="text-rose-600 text-xs mt-2 font-bold">{error || "Vui lòng làm bài lại."}</p>
          <button onClick={() => navigate(`/multiple-choice/test/${testId}/settings`)}
            className="mt-4 rounded-xl bg-rose-600 border-[3px] border-rose-900 text-white px-4 py-2 text-sm font-extrabold hover:bg-rose-500 shadow-lg">
            Về trang cài đặt
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(to bottom right, #bae6fd, #dbeafe, #d1fae5)" }}>
      <div className="w-full h-full px-2 sm:px-4 py-2 sm:py-3 flex flex-col pb-6 lg:pb-3">

        {/* Top bar */}
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-violet-800 bg-violet-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-md">
            <span className="inline-flex h-2 w-2 rounded-full bg-lime-400" />
            Xem lại bài
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-sky-800 bg-sky-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-md">
            📌 {questions.length} câu
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-emerald-800 bg-emerald-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-md">
            ✅ {correctCount} đúng • ❌ {incorrectCount} sai
          </span>
          <span className="hidden sm:inline text-[10px] text-slate-800 font-bold ml-auto">(←→: chuyển câu)</span>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-3">
          {/* SIDEBAR */}
          <div className="lg:col-span-4 min-h-0 order-2 lg:order-2">
            <div className="lg:sticky lg:top-4 flex flex-col gap-2 lg:max-h-[calc(100vh-5rem)] lg:overflow-auto">

              {/* Score card — fuchsia */}
              <div className="rounded-2xl border-[3px] border-fuchsia-500 bg-gradient-to-br from-fuchsia-100 to-purple-200 shadow-xl ring-2 ring-fuchsia-300/60 p-3">
                {/* Score row — on mobile show as horizontal strip */}
                <div className="flex items-center gap-3">
                  <Ring value={score} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-extrabold text-fuchsia-900">Điểm số</p>
                    <p className="text-2xl font-extrabold text-slate-900 leading-none">{score}%</p>
                    <p className="text-xs font-extrabold text-purple-800 mt-0.5">{getScoreMessage(score)}</p>
                  </div>
                  {/* Mini stats on same row for mobile */}
                  <div className="flex flex-col gap-1 shrink-0 text-right">
                    <span className="text-[11px] font-extrabold text-emerald-700">✅ {correctCount} đúng</span>
                    <span className="text-[11px] font-extrabold text-rose-700">❌ {incorrectCount} sai</span>
                    <span className="text-[11px] font-extrabold text-amber-700">— {unansweredCount} bỏ</span>
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  <StatMini label="Đúng" value={correctCount} tone="emerald" />
                  <StatMini label="Sai" value={incorrectCount} tone="rose" />
                  <StatMini label="Bỏ qua" value={unansweredCount} tone="amber" />
                </div>

                <div className="mt-2 flex flex-col gap-1.5">
                  {draftResultId && !isSaved && (
                    <button onClick={saveResult} disabled={loading}
                      className={`w-full rounded-xl px-3 py-2 text-sm font-extrabold text-white shadow-lg border-[3px] transition ${loading ? "bg-emerald-400 border-emerald-600" : "bg-emerald-600 border-emerald-900 hover:bg-emerald-500"}`}>
                      {loading ? "Đang lưu…" : "💾 Lưu kết quả"}
                    </button>
                  )}
                  {isSaved && (
                    <div className="w-full rounded-xl border-[3px] border-emerald-700 bg-emerald-500 px-3 py-2 text-sm font-extrabold text-emerald-950 text-center shadow">
                      ✅ Đã lưu kết quả
                    </div>
                  )}

                  <button onClick={handleExportQuestions}
                    className="w-full rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 border-[3px] border-emerald-900 px-3 py-2 text-sm font-extrabold text-white shadow-lg hover:brightness-110">
                    📄 Xuất câu hỏi PDF/DOCX
                  </button>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button onClick={() => navigate(`/multiple-choice/test/${testId}/settings`)}
                      className="rounded-xl bg-blue-700 border-[3px] border-blue-900 px-3 py-2 text-sm font-extrabold text-white shadow-lg hover:bg-blue-600">
                      🔄 Làm lại
                    </button>
                    <button onClick={() => navigate("/topics")}
                      className="rounded-xl border-[3px] border-teal-800 bg-teal-600 px-3 py-2 text-sm font-extrabold text-white shadow-lg hover:bg-teal-500 flex items-center justify-center gap-1">
                      ← Thoát
                    </button>
                  </div>

                  {error && (
                    <div className="rounded-xl border-2 border-rose-600 bg-rose-100 px-3 py-2 text-xs font-extrabold text-rose-900">{error}</div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t-2 border-fuchsia-300">
                  <h4 className="text-xs font-extrabold text-slate-900 mb-2">Thông tin bài kiểm tra</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-1.5 text-xs">
                    <InfoRow label="Tiêu đề" value={testInfo?.test_title || test?.test_title || "—"} />
                    <InfoRow label="Chủ đề" value={`${testInfo?.main_topic || test?.main_topic || "—"} - ${testInfo?.sub_topic || test?.sub_topic || "—"}`} />
                    <InfoRow label="Độ khó" value={(test?.difficulty || "—").toString()} badge />
                    <InfoRow label="Giới hạn" value={`${testInfo?.time_limit_minutes ?? test?.time_limit_minutes ?? "—"} phút`} />
                  </div>
                </div>
              </div>

              {/* Question grid — amber/orange */}
              <div className="rounded-2xl border-[3px] border-orange-600 bg-gradient-to-br from-amber-200 to-orange-300 shadow-lg ring-2 ring-orange-400 overflow-hidden">
                <div className="px-3 py-2 bg-gradient-to-r from-orange-600 to-amber-600 flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-white">Danh sách câu</h4>
                  <span className="text-xs font-extrabold text-orange-100">{questions.length} câu</span>
                </div>

                <div className="p-3 max-h-52 sm:max-h-60 overflow-y-auto">
                  <div className="grid grid-cols-10 sm:grid-cols-12 lg:grid-cols-10 gap-1">
                    {questionsToDisplay.map((question, i) => {
                      const actualIndex = startIndex + i;
                      const result = results[actualIndex];
                      const isCurrent = actualIndex === selectedQuestion;
                      const answered = isAnswered(result.userAnswer);

                      let cls = "aspect-square rounded-lg text-white text-[10px] font-extrabold shadow transition border-2 ";
                      if (result.isCorrect) cls += "bg-emerald-500 border-emerald-800";
                      else if (answered) cls += "bg-rose-500 border-rose-800";
                      else cls += "bg-amber-400 text-amber-950 border-amber-700";

                      return (
                        <button key={String(question._id)} onClick={() => setSelectedQuestion(actualIndex)}
                          className={`${cls} ${isCurrent ? "ring-[3px] ring-blue-700 ring-offset-1 ring-offset-amber-100 scale-105" : "hover:brightness-95"}`}
                          title={`Câu ${actualIndex + 1}`}>
                          {actualIndex + 1}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-slate-900 font-bold">
                    <LegendDot color="bg-emerald-500 border border-emerald-800" label={`Đúng (${correctCount})`} />
                    <LegendDot color="bg-rose-500 border border-rose-800" label={`Sai (${incorrectCount})`} />
                    <LegendDot color="bg-amber-400 border border-amber-700" label={`Chưa làm (${unansweredCount})`} />
                  </div>

                  {totalQuestionPages > 1 && (
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <button onClick={() => setQuestionPage((p) => Math.max(0, p - 1))} disabled={questionPage === 0}
                        className="px-2.5 py-1 text-xs font-extrabold text-white bg-teal-600 border-2 border-teal-900 rounded-lg hover:bg-teal-500 disabled:opacity-50">
                        ← Trước
                      </button>
                      <span className="text-xs font-bold text-slate-900">Trang {questionPage + 1}/{totalQuestionPages}</span>
                      <button onClick={() => setQuestionPage((p) => Math.min(totalQuestionPages - 1, p + 1))} disabled={questionPage === totalQuestionPages - 1}
                        className="px-2.5 py-1 text-xs font-extrabold text-white bg-fuchsia-600 border-2 border-fuchsia-900 rounded-lg hover:bg-fuchsia-500 disabled:opacity-50">
                        Sau →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* MAIN */}
          <div className="lg:col-span-8 min-h-0 flex flex-col order-1 lg:order-1">
            <div className="flex-1 min-h-0 rounded-2xl border-[3px] border-indigo-400 bg-white shadow-xl overflow-hidden flex flex-col ring-2 ring-indigo-200/60">
              {/* header */}
              <div className="px-3 sm:px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-700 shrink-0">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-indigo-200 font-bold">Câu hỏi</p>
                    <h3 className="text-xs sm:text-sm font-extrabold text-white">
                      Câu {selectedQuestion + 1} / {questions.length}
                    </h3>
                  </div>
                  <div className={`shrink-0 inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-extrabold border-2 ${currentResult?.isCorrect ? "bg-emerald-500 text-white border-emerald-900 shadow" : "bg-rose-500 text-white border-rose-900 shadow"}`}>
                    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-white font-extrabold border-2 border-white/40 ${currentResult?.isCorrect ? "bg-emerald-700" : "bg-rose-700"}`}>
                      {currentResult?.isCorrect ? "✓" : "✗"}
                    </span>
                    {currentResult?.isCorrect ? "Đúng" : "Sai"}
                  </div>
                </div>
              </div>

              {/* scrollable content */}
              <div className="p-3 sm:p-4 flex-1 min-h-0 overflow-auto">
                <h4 className="text-xs sm:text-sm font-semibold text-slate-900 leading-relaxed pb-3">
                  {currentQuestion?.question_text}
                </h4>

                <div className="mt-2 space-y-2">
                  {(currentQuestion?.options || []).map((option) => {
                    const isUserAnswer = selectedLabels.includes(option.label);
                    const isAnswerCorrect = isCorrectAnswer(currentQuestion?.correct_answers, option.label);

                    const rowCls = isAnswerCorrect
                      ? "border-[3px] border-emerald-700 bg-emerald-500 text-white shadow-md"
                      : isUserAnswer
                      ? "border-[3px] border-rose-700 bg-rose-500 text-white shadow-md"
                      : "border-[3px] border-indigo-200 bg-indigo-50";

                    const badgeCls = isAnswerCorrect
                      ? "border-2 border-emerald-900 bg-emerald-700 text-white"
                      : isUserAnswer
                      ? "border-2 border-rose-900 bg-rose-700 text-white"
                      : "border-2 border-indigo-400 bg-indigo-500 text-white";

                    return (
                      <div key={option.label} className={`rounded-2xl ${rowCls} px-3 py-2`}>
                        <div className="flex items-start gap-3">
                          <div className={`h-8 w-8 rounded-xl ${badgeCls} flex items-center justify-center font-extrabold text-sm shadow-md shrink-0`}>
                            {option.label}
                          </div>
                          <div className="flex-1">
                            <p className={`text-xs leading-relaxed font-semibold ${isAnswerCorrect || isUserAnswer ? 'text-white' : 'text-slate-800'}`}>{option.text}</p>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {isAnswerCorrect && (
                                <span className="inline-flex items-center rounded-full bg-emerald-700 border border-emerald-900 px-1.5 py-0.5 text-[10px] font-extrabold text-white">✓ Đáp án đúng</span>
                              )}
                              {isUserAnswer && !isAnswerCorrect && (
                                <span className="inline-flex items-center rounded-full bg-rose-700 border border-rose-900 px-1.5 py-0.5 text-[10px] font-extrabold text-white">✗ Bạn chọn</span>
                              )}
                              {isUserAnswer && isAnswerCorrect && (
                                <span className="inline-flex items-center rounded-full bg-emerald-900 px-1.5 py-0.5 text-[10px] font-extrabold text-white">✓ Bạn chọn đúng</span>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0 pt-0.5">
                            {isAnswerCorrect ? (
                              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-700 text-white font-extrabold shadow">✓</span>
                            ) : isUserAnswer ? (
                              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-rose-700 text-white font-extrabold shadow">✗</span>
                            ) : (
                              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border-2 border-indigo-300 text-indigo-400 bg-white">•</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                {currentQuestion?.explanation && (
                  <div className="mt-3 p-3 bg-gradient-to-br from-blue-100 to-indigo-100 border-[3px] border-indigo-400 rounded-xl space-y-2">
                    <h5 className="text-xs font-extrabold text-indigo-900 mb-2">💡 Giải thích</h5>
                    {currentQuestion.explanation.correct && (
                      <div className="bg-emerald-100 border-2 border-emerald-500 rounded-lg p-2">
                        <p className="text-xs font-extrabold text-emerald-900 mb-1">
                          Đáp án đúng ({getCorrectAnswerLabels(currentQuestion.correct_answers).join(', ')})
                        </p>
                        {typeof currentQuestion.explanation.correct === 'object' && Object.keys(currentQuestion.explanation.correct).length > 0 ? (
                          <div className="space-y-1">
                            {Object.entries(currentQuestion.explanation.correct).map(([option, text]) => (
                              <p key={option} className="text-xs text-emerald-800 font-semibold"><span className="font-extrabold">{option}:</span> {text}</p>
                            ))}
                          </div>
                        ) : typeof currentQuestion.explanation.correct === 'string' && currentQuestion.explanation.correct.trim() ? (
                          <p className="text-xs text-emerald-800 font-semibold">{currentQuestion.explanation.correct}</p>
                        ) : null}
                      </div>
                    )}
                    {currentQuestion.explanation.incorrect_choices && Object.keys(currentQuestion.explanation.incorrect_choices).length > 0 && (
                      <div className="bg-rose-100 border-2 border-rose-500 rounded-lg p-2">
                        <p className="text-xs font-extrabold text-rose-900 mb-1">Giải thích đáp án sai:</p>
                        <div className="space-y-1">
                          {Object.entries(currentQuestion.explanation.incorrect_choices)
                            .filter(([, value]) => value && value.trim())
                            .map(([label, value]) => (
                              <p key={label} className="text-xs text-rose-800 font-semibold"><span className="font-extrabold">{label}:</span> {value}</p>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* bottom nav */}
              <div className="shrink-0 px-2 py-2 border-t-2 border-indigo-200 bg-indigo-50">
                <div className="flex items-center justify-between gap-2">
                  <button onClick={goPrev} disabled={selectedQuestion === 0}
                    className="inline-flex items-center justify-center rounded-xl border-[3px] border-teal-800 bg-teal-600 px-3 sm:px-4 py-2 text-xs sm:text-sm font-extrabold text-white shadow-lg hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed">
                    ← Trước
                  </button>
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="text-xs font-extrabold text-indigo-900">
                      {selectedQuestion + 1} / {questions.length}
                    </div>
                    {currentResult && (
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${currentResult.isCorrect ? "bg-emerald-100 border-emerald-400 text-emerald-800" : "bg-rose-100 border-rose-400 text-rose-800"}`}>
                        {currentResult.isCorrect ? "✓ Đúng" : "✗ Sai"}
                      </span>
                    )}
                  </div>
                  <button onClick={goNext} disabled={selectedQuestion === questions.length - 1}
                    className="inline-flex items-center justify-center rounded-xl border-[3px] border-fuchsia-900 bg-fuchsia-600 px-3 sm:px-4 py-2 text-xs sm:text-sm font-extrabold text-white shadow-lg hover:bg-fuchsia-500 disabled:opacity-40 disabled:cursor-not-allowed">
                    Tiếp →
                  </button>
                </div>
              </div>
            </div>
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
      {/* Export Modal */}
      <ExportMCPModal
        isOpen={showExportModal}
        onClose={handleCloseExportModal}
        questions={questions}
        testTitle={test?.test_title || testInfo?.test_title || "Bài kiểm tra trắc nghiệm"}
        testMainTopic={test?.main_topic || testInfo?.main_topic || ""}
        testSubTopic={test?.sub_topic || testInfo?.sub_topic || ""}
      />    </div>
  );
};

function Ring({ value = 0 }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  const color = v >= 90 ? '#059669' : v >= 75 ? '#2563eb' : v >= 50 ? '#f59e0b' : '#e11d48';
  return (
    <div className="relative h-16 w-16 shrink-0">
      <div className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(${color} ${v * 3.6}deg, #c4b5fd 0deg)` }} />
      <div className="absolute inset-[6px] rounded-full bg-white flex items-center justify-center shadow-md">
        <span className="text-xs font-extrabold text-slate-900">{v}%</span>
      </div>
    </div>
  );
}

function StatMini({ label, value, tone }) {
  const map = {
    emerald: "border-emerald-700 bg-emerald-500 text-white",
    rose: "border-rose-700 bg-rose-500 text-white",
    amber: "border-amber-700 bg-amber-400 text-amber-950",
  };
  return (
    <div className={`rounded-xl border-2 px-2 py-2 text-center shadow-sm ${map[tone] || ""}`}>
      <div className="text-lg font-extrabold leading-none">{value}</div>
      <div className="mt-0.5 text-[10px] font-extrabold">{label}</div>
    </div>
  );
}

function InfoRow({ label, value, badge }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-xs text-purple-800 font-bold">{label}</span>
      {badge ? (
        <span className="inline-flex items-center rounded-full border-2 border-indigo-400 bg-indigo-600 text-white px-2 py-0.5 text-xs font-extrabold capitalize shadow-sm">
          {value}
        </span>
      ) : (
        <span className="text-xs font-extrabold text-slate-900 text-right">{value}</span>
      )}
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}

export default MultipleChoiceTestReview;
