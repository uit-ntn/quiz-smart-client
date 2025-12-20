import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import testService from "../services/testService";
import MultipleChoiceService from "../services/multipleChoiceService";
import testResultService from "../services/testResultService";
import { useTestSession } from "../hooks/useTestSession";
import QuestionResultModal from "../components/MCPQuestionResultModal";
import SubmitConfirmModal from "../components/MCPSubmitConfirmModal";

// ===================== utils =====================
const shuffleArray = (arr) => {
  const a = [...(arr || [])];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const safeJsonParse = (s, fallback) => {
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
};

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

function getSelectionOffsets(containerEl) {
  const sel = window.getSelection?.();
  if (!sel || sel.rangeCount === 0) return null;

  const range = sel.getRangeAt(0);
  if (!range || range.collapsed) return null;

  const common = range.commonAncestorContainer;
  if (!containerEl.contains(common)) return null;

  const preRange = document.createRange();
  preRange.selectNodeContents(containerEl);
  preRange.setEnd(range.startContainer, range.startOffset);
  const start = preRange.toString().length;

  const selectedText = range.toString();
  const end = start + selectedText.length;

  if (!selectedText.trim()) return null;
  return { start, end, text: selectedText };
}

function renderTextWithHighlights(text, highlights = []) {
  const t = text || "";
  if (!highlights.length) return t;

  const sorted = [...highlights]
    .map((h) => ({
      ...h,
      start: Math.max(0, Math.min(t.length, h.start)),
      end: Math.max(0, Math.min(t.length, h.end)),
    }))
    .filter((h) => h.end > h.start)
    .sort((a, b) => a.start - b.start);

  const merged = [];
  for (const h of sorted) {
    if (!merged.length) merged.push({ ...h });
    else {
      const last = merged[merged.length - 1];
      if (h.start <= last.end) last.end = Math.max(last.end, h.end);
      else merged.push({ ...h });
    }
  }

  const parts = [];
  let idx = 0;
  merged.forEach((h, i) => {
    if (idx < h.start)
      parts.push(<span key={`n-${i}-${idx}`}>{t.slice(idx, h.start)}</span>);
    parts.push(
      <mark key={`m-${i}-${h.start}`} className="rounded px-0.5 bg-yellow-200/80">
        {t.slice(h.start, h.end)}
      </mark>
    );
    idx = h.end;
  });
  if (idx < t.length) parts.push(<span key={`tail-${idx}`}>{t.slice(idx)}</span>);
  return parts;
}

// ===================== component =====================
const MultipleChoiceTestTake = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Test session tracking
  const [testResultId, setTestResultId] = useState(null);
  const { initializeSession, endSession, recordBehavior, isTracking } =
    useTestSession(testResultId);

  // ✅ tránh React 18 StrictMode gọi effect 2 lần gây tạo draft 2 lần
  const didCreateInitialDraftRef = useRef(false);

  // -------- data ----------
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // -------- answers / result ----------
  const [userAnswers, setUserAnswers] = useState({}); // qid -> [labels]
  const [lockedQuestions, setLockedQuestions] = useState({}); // qid -> true
  const [showResult, setShowResult] = useState({}); // qid -> result obj

  // mark for review
  const [markedQuestions, setMarkedQuestions] = useState({}); // qid -> true

  // -------- highlight ----------
  const [isHighlightMode, setIsHighlightMode] = useState(false);
  const [highlights, setHighlights] = useState({}); // qid -> {question: [{start,end}], options: {label: [{start,end}]}}
  const questionTextRef = useRef(null);
  const optionTextRefs = useRef({}); // label -> el

  // -------- timers ----------
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [questionTimeRemaining, setQuestionTimeRemaining] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isQuestionTimerPaused, setIsQuestionTimerPaused] = useState(false);

  // -------- modals ----------
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultModalData, setResultModalData] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitMeta, setSubmitMeta] = useState(null);
  
  // Autosave indicator
  const [lastSaved, setLastSaved] = useState(null);
  useEffect(() => {
    setLastSaved(new Date());
  }, [userAnswers, markedQuestions, highlights, currentQuestionIndex]);

  // -------- settings ----------
  const [settings, setSettings] = useState({
    testMode: "flexible", // flexible | question_timer
    showTimer: true,
    checkMode: "after_each", // after_each
    showQuestionNumber: true,
    shuffleQuestions: false,
    shuffleAnswers: false,
    questionTimeLimit: 30,
  });

  // -------- storage keys ----------
  const STORE_KEY = `mc_take_state_${testId}`;
  const SETTINGS_KEY = `test_settings_${testId}`;
  const DRAFT_KEY = `mc_draft_${testId}`;

  // -------- refs (avoid stale closures) ----------
  const questionsRef = useRef(questions);
  const testRef = useRef(test);
  const settingsRef = useRef(settings);
  const userAnswersRef = useRef(userAnswers);
  const markedRef = useRef(markedQuestions);
  const highlightsRef = useRef(highlights);

  const timeRemainingRef = useRef(timeRemaining);
  const totalTimeRef = useRef(totalTime);
  const isSubmittedRef = useRef(isSubmitted);

  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);
  useEffect(() => {
    testRef.current = test;
  }, [test]);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
  useEffect(() => {
    userAnswersRef.current = userAnswers;
  }, [userAnswers]);
  useEffect(() => {
    markedRef.current = markedQuestions;
  }, [markedQuestions]);
  useEffect(() => {
    highlightsRef.current = highlights;
  }, [highlights]);
  useEffect(() => {
    timeRemainingRef.current = timeRemaining;
  }, [timeRemaining]);
  useEffect(() => {
    totalTimeRef.current = totalTime;
  }, [totalTime]);
  useEffect(() => {
    isSubmittedRef.current = isSubmitted;
  }, [isSubmitted]);

  // ===================== UNDO/REDO =====================
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const MAX_STACK = 60;

  const pushHistory = useCallback(() => {
    undoStackRef.current.push({
      userAnswers: userAnswersRef.current,
      markedQuestions: markedRef.current,
      highlights: highlightsRef.current,
      currentQuestionIndex,
    });
    if (undoStackRef.current.length > MAX_STACK) undoStackRef.current.shift();
    redoStackRef.current = [];
  }, [currentQuestionIndex]);

  const undo = useCallback(() => {
    const prev = undoStackRef.current.pop();
    if (!prev) return;

    redoStackRef.current.push({
      userAnswers: userAnswersRef.current,
      markedQuestions: markedRef.current,
      highlights: highlightsRef.current,
      currentQuestionIndex,
    });
    if (redoStackRef.current.length > MAX_STACK) redoStackRef.current.shift();

    setUserAnswers(prev.userAnswers || {});
    setMarkedQuestions(prev.markedQuestions || {});
    setHighlights(prev.highlights || {});
    if (typeof prev.currentQuestionIndex === "number")
      setCurrentQuestionIndex(prev.currentQuestionIndex);
  }, [currentQuestionIndex]);

  const redo = useCallback(() => {
    const next = redoStackRef.current.pop();
    if (!next) return;

    undoStackRef.current.push({
      userAnswers: userAnswersRef.current,
      markedQuestions: markedRef.current,
      highlights: highlightsRef.current,
      currentQuestionIndex,
    });
    if (undoStackRef.current.length > MAX_STACK) undoStackRef.current.shift();

    setUserAnswers(next.userAnswers || {});
    setMarkedQuestions(next.markedQuestions || {});
    setHighlights(next.highlights || {});
    if (typeof next.currentQuestionIndex === "number")
      setCurrentQuestionIndex(next.currentQuestionIndex);
  }, [currentQuestionIndex]);

  // ===================== derived =====================
  const currentQuestion = useMemo(() => {
    return questions?.length ? questions[currentQuestionIndex] : null;
  }, [questions, currentQuestionIndex]);

  const answeredCount = useMemo(() => {
    return Object.values(userAnswers).filter(
      (a) => Array.isArray(a) && a.length > 0
    ).length;
  }, [userAnswers]);

  const isLocked = useCallback((qid) => !!lockedQuestions[qid], [lockedQuestions]);
  const isMarked = useCallback((qid) => !!markedQuestions[qid], [markedQuestions]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const isMultiChoice = useCallback((q) => {
    if (!q) return false;
    if (typeof q.allow_multiple === "boolean") return q.allow_multiple;
    return (q.correct_answers || []).length > 1;
  }, []);

  const computeResult = useCallback((q, selected) => {
    const correctSet = new Set(q.correct_answers || []);
    const selectedSet = new Set(selected || []);
    const isCorrect =
      correctSet.size === selectedSet.size &&
      [...correctSet].every((c) => selectedSet.has(c));

    const wrongSelected = [...selectedSet].filter((s) => !correctSet.has(s));

    return {
      isCorrect,
      correctAnswer: [...correctSet],
      selectedAnswers: [...selectedSet],
      wrongSelected,
      explanation: q.explanation || {},
      questionText: q.question_text,
    };
  }, []);

  // ===================== autosave/resume =====================
  useEffect(() => {
    const payload = {
      userAnswers,
      markedQuestions,
      highlights,
      currentQuestionIndex,
      timestamp: Date.now(),
    };
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(payload));
      // Show subtle autosave indicator (uncomment if needed)
      // console.log('📝 Autosaved progress');
    } catch (e) {
      console.warn('Cannot save state to localStorage:', e);
    }
  }, [STORE_KEY, userAnswers, markedQuestions, highlights, currentQuestionIndex]);

  // Resume from autosave
  useEffect(() => {
    if (questions.length === 0 || Object.keys(userAnswers).length > 0) return;
    
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        const timeDiff = Date.now() - (state.timestamp || 0);
        
        // Only resume if saved within last 4 hours
        if (timeDiff < 4 * 60 * 60 * 1000) {
          const answeredCount = Object.values(state.userAnswers || {}).filter(a => a && a.length > 0).length;
          if (answeredCount > 0) {
            if (state.userAnswers) setUserAnswers(state.userAnswers);
            if (state.markedQuestions) setMarkedQuestions(state.markedQuestions);
            if (state.highlights) setHighlights(state.highlights);
            if (typeof state.currentQuestionIndex === 'number') {
              setCurrentQuestionIndex(Math.max(0, Math.min(state.currentQuestionIndex, questions.length - 1)));
            }
            
            const timeAgo = Math.round(timeDiff / 60000); // minutes
            // Toast notification would need to be added to MultipleChoiceTestTake
            console.log(`🔄 Resumed progress: ${answeredCount} answers, ${timeAgo} minutes ago`);
          }
        } else {
          // Clear old save data
          localStorage.removeItem(STORE_KEY);
        }
      }
    } catch (e) {
      console.warn('Cannot restore state from localStorage:', e);
      // Clear corrupted data
      localStorage.removeItem(STORE_KEY);
    }
  }, [STORE_KEY, questions.length, userAnswers]);

  // ===================== load settings + fetch =====================
  useEffect(() => {
    const loadSettingsAndData = async () => {
      try {
        setLoading(true);
        setError(null);

        // load settings
        let newSettings = { ...settingsRef.current };
        const savedSettings = localStorage.getItem(SETTINGS_KEY);
        if (savedSettings) newSettings = safeJsonParse(savedSettings, newSettings);
        else if (location.state?.settings) newSettings = location.state.settings;

        setSettings(newSettings);

        // fetch
        const [testResponse, questionsData] = await Promise.all([
          testService.getTestById(testId),
          MultipleChoiceService.getQuestionsByTestId(testId),
        ]);

        const testData = testResponse?.test || testResponse;

        if (!testData || !questionsData?.length) {
          throw new Error("Không thể tải dữ liệu bài test hoặc bài test không có câu hỏi");
        }

        setTest(testData);

        let processed = [...questionsData];

        if (newSettings.shuffleQuestions) processed = shuffleArray(processed);

        // ✅ Shuffle answers: chỉ A–E (khớp BE)
        if (newSettings.shuffleAnswers) {
          processed = processed.map((q) => {
            const options = q.options || [];
            if (options.length === 0) return q;

            const allowedLabels = ["A", "B", "C", "D", "E"];
            if (options.length > allowedLabels.length) {
              throw new Error(
                `Câu hỏi có ${options.length} lựa chọn (>5). Hiện hệ thống chỉ hỗ trợ tối đa 5 lựa chọn (A–E).`
              );
            }

            const shuffledOptions = shuffleArray([...options]);
            const labelMapping = {}; // oldLabel -> newLabel

            shuffledOptions.forEach((shuffledOption, newIndex) => {
              labelMapping[shuffledOption.label] = allowedLabels[newIndex];
            });

            const newOptions = shuffledOptions.map((option, index) => ({
              ...option,
              label: allowedLabels[index],
            }));

            const newCorrectAnswers = (q.correct_answers || []).map(
              (oldLabel) => labelMapping[oldLabel] || oldLabel
            );

            return {
              ...q,
              options: newOptions,
              correct_answers: newCorrectAnswers,
            };
          });
        } else {
          processed.forEach((q) => {
            if ((q.options || []).length > 5) {
              throw new Error(
                `Câu hỏi có ${(q.options || []).length} lựa chọn (>5). Hiện hệ thống chỉ hỗ trợ tối đa 5 lựa chọn (A–E).`
              );
            }
          });
        }

        setQuestions(processed);

        const limitSeconds = (testData?.time_limit_minutes || 0) * 60;
        setTimeRemaining(limitSeconds);
        setTotalTime(limitSeconds);

        if (newSettings.testMode === "question_timer") {
          setQuestionTimeRemaining(newSettings.questionTimeLimit || 30);
          setIsQuestionTimerPaused(false);
        } else {
          setQuestionTimeRemaining(0);
        }

        // restore state
        const saved = safeJsonParse(localStorage.getItem(STORE_KEY), null);
        if (saved) {
          setUserAnswers(saved.userAnswers || {});
          setMarkedQuestions(saved.markedQuestions || {});
          setHighlights(saved.highlights || {});
          if (typeof saved.currentQuestionIndex === "number") {
            setCurrentQuestionIndex(
              clamp(saved.currentQuestionIndex, 0, Math.max(processed.length - 1, 0))
            );
          } else {
            setCurrentQuestionIndex(0);
          }
        } else {
          setUserAnswers({});
          setMarkedQuestions({});
          setHighlights({});
          setCurrentQuestionIndex(0);
        }

        undoStackRef.current = [];
        redoStackRef.current = [];

        setIsSubmitted(false);
        setLockedQuestions({});
        setShowResult({});
        setShowResultModal(false);
        setResultModalData(null);
        setShowSubmitModal(false);
        setSubmitMeta(null);

        // ✅ Create initial draft result for session tracking (VALID STATUS)
        if (!didCreateInitialDraftRef.current) {
          didCreateInitialDraftRef.current = true;

          try {
            const firstQuestion = processed?.[0];
            const opts = Array.isArray(firstQuestion?.options) ? firstQuestion.options : [];
            const fallbackCorrect =
              opts?.[0]?.label ? [opts[0].label] : [];

            const correctAnswers =
              Array.isArray(firstQuestion?.correct_answers) && firstQuestion.correct_answers.length > 0
                ? firstQuestion.correct_answers
                : fallbackCorrect;

            // chỉ tạo nếu đủ điều kiện validate BE (options >=2, correct_answers non-empty)
            if (opts.length >= 2 && correctAnswers.length > 0) {
              const initialPayload = {
                test_id: testId,
                // test_snapshot optional (BE tự build nếu không gửi)
                test_snapshot: {
                  test_title: testData?.test_title || "Multiple Choice Test",
                  main_topic: testData?.main_topic || "Multiple Choice",
                  sub_topic: testData?.sub_topic || "",
                  test_type: testData?.test_type || "multiple_choice",
                  difficulty: testData?.difficulty || "medium",
                },
                answers: [
                  {
                    question_id: firstQuestion?._id,
                    question_collection: "multiple_choices",
                    question_text: firstQuestion?.question_text || "Placeholder question",
                    options: opts.map((o) => ({
                      label: o.label,
                      text: o.text,
                    })),
                    correct_answers: correctAnswers,
                    user_answers: [],
                    is_correct: false,
                  },
                ],
                duration_ms: 0,
                start_time: new Date(),
                end_time: new Date(),
                status: "draft", // ✅ FIX: KHÔNG DÙNG "in_progress"
              };

              const draftResult = await testResultService.createTestResult(initialPayload);
              setTestResultId(draftResult?._id || draftResult?.id);

              console.log("✅ Initial draft created:", draftResult?._id || draftResult?.id);
            } else {
              console.warn("⚠️ Skip initial draft: invalid first question snapshot for BE validation");
            }
          } catch (err) {
            console.error("❌ Failed to create initial draft result:", err);
          }
        }

        setLoading(false);
      } catch (e) {
        console.error(e);
        setError(e.message || "Có lỗi xảy ra khi tải bài test");
        setLoading(false);
      }
    };

    loadSettingsAndData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  // Initialize test session when testResultId is available
  useEffect(() => {
    if (testResultId && !isTracking) {
      initializeSession();
    }
  }, [testResultId, isTracking, initializeSession]);

  // Cleanup session on unmount
  useEffect(() => {
    return () => {
      if (isTracking) {
        endSession();
      }
    };
  }, [isTracking, endSession]);

  // ===================== submit =====================
  const doSubmitTest = useCallback(
    async ({ reason = "manual_confirm" } = {}) => {
      if (isSubmittedRef.current) return;
      setIsSubmitted(true);

      const qs = questionsRef.current || [];
      const ua = userAnswersRef.current || {};
      const t = testRef.current;

      const results = qs.map((q) => {
        const selected = ua[q._id] || [];
        const r = computeResult(q, selected);
        return {
          questionId: q._id,
          userAnswer: selected,
          correctAnswer: r.correctAnswer,
          isCorrect: r.isCorrect,
          explanation: r.explanation,
        };
      });

      const correctAnswers = results.filter((r) => r.isCorrect).length;
      const totalQuestions = results.length;
      const percentage =
        totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

      const tt = totalTimeRef.current || 0;
      const tr = timeRemainingRef.current || 0;
      const timeTakenMs = tt > 0 ? (tt - tr) * 1000 : 0;

      try {
        // ✅ FIX: LUÔN POST createTestResult để lưu full answers (không dùng PUT /:id)
        const payload = {
          test_id: testId,
          duration_ms: timeTakenMs,
          start_time: new Date(Date.now() - timeTakenMs),
          end_time: new Date(),
          status: "draft",
          answers: qs.map((q) => {
            const selected = Array.isArray(ua[q._id]) ? ua[q._id] : [];
            const r = computeResult(q, selected);

            return {
              question_id: q._id,
              question_collection: "multiple_choices",
              question_text: q.question_text || "",
              options: (q.options || []).map((o) => ({
                label: o.label, // A–E
                text: o.text,
              })),
              correct_answers: Array.isArray(q.correct_answers) ? q.correct_answers : [],
              user_answers: selected,
              is_correct: !!r.isCorrect,
            };
          }),
        };

        const finalResult = await testResultService.createTestResult(payload);
        const draftId = finalResult?._id || finalResult?.id;

        if (draftId) localStorage.setItem(DRAFT_KEY, String(draftId));
        localStorage.removeItem(STORE_KEY);

        // End test session tracking BEFORE navigation
        if (isTracking) {
          try {
            await endSession();
            console.log("✅ Test session ended successfully");
          } catch (err) {
            console.error("❌ Failed to end test session:", err);
          }
        }

        // (Optional) dọn rác: xoá mềm bản placeholder draft ban đầu
        if (testResultId && draftId && String(testResultId) !== String(draftId)) {
          try {
            await testResultService.softDeleteTestResult(testResultId);
          } catch (e) {
            // ignore
          }
        }

        navigate(`/multiple-choice/test/${testId}/review?draft=${draftId || ""}`, {
          state: {
            test: t,
            questions: qs,
            userAnswers: ua,
            results,
            settings: settingsRef.current,
            draftResultId: draftId,
            percentage,
            correctCount: correctAnswers,
            totalQuestions,
            timeTaken: timeTakenMs,
            reason,
          },
        });
      } catch (err) {
        console.error("Error creating draft result:", err);

        navigate(`/multiple-choice/test/${testId}/review`, {
          state: {
            test: t,
            questions: qs,
            userAnswers: ua,
            results,
            settings: settingsRef.current,
            percentage,
            correctCount: correctAnswers,
            totalQuestions,
            timeTaken: timeTakenMs,
            reason,
            draftCreateError: err?.message || "Không thể lưu bản nháp",
          },
        });
      }
    },
    [DRAFT_KEY, STORE_KEY, computeResult, navigate, testId, endSession, isTracking, testResultId]
  );

  // total timer
  useEffect(() => {
    if (!settings.showTimer || isSubmitted || totalTime === 0) return;

    const id = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          doSubmitTest({ reason: "timeout_total" });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [settings.showTimer, isSubmitted, totalTime, doSubmitTest]);

  // per question timer
  useEffect(() => {
    if (settings.testMode !== "question_timer" || isSubmitted || isQuestionTimerPaused) return;

    const id = setInterval(() => {
      setQuestionTimeRemaining((prev) => {
        if (prev <= 1) {
          const qs = questionsRef.current || [];
          if (qs.length && currentQuestionIndex < qs.length - 1) {
            setCurrentQuestionIndex((i) => i + 1);
            setIsQuestionTimerPaused(false);
            return settings.questionTimeLimit || 30;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [
    currentQuestionIndex,
    settings.testMode,
    settings.questionTimeLimit,
    isSubmitted,
    isQuestionTimerPaused,
  ]);

  // ===================== actions =====================
  const toggleAnswer = useCallback(
    (qid, label) => {
      if (isSubmittedRef.current || isLocked(qid)) return;

      pushHistory();

      const q = (questionsRef.current || []).find((x) => x._id === qid);
      const multi = isMultiChoice(q);

      setUserAnswers((prev) => {
        const current = prev[qid] || [];
        const wasSelected = current.includes(label);
        const action = multi ? (wasSelected ? "deselect" : "select") : "choose";

        recordBehavior("answer_selection", {
          question_id: qid,
          question_index: currentQuestionIndex,
          selected_option: label,
          is_multi_choice: multi,
          action,
        });

        if (!multi) return { ...prev, [qid]: [label] };

        const next = wasSelected ? current.filter((x) => x !== label) : [...current, label];
        return { ...prev, [qid]: next };
      });
    },
    [isLocked, isMultiChoice, pushHistory, currentQuestionIndex, recordBehavior]
  );

  const toggleMarkCurrent = useCallback(() => {
    if (!currentQuestion) return;
    if (isSubmittedRef.current) return;

    pushHistory();

    const qid = currentQuestion._id;
    setMarkedQuestions((prev) => {
      const next = { ...prev };
      const wasMarked = next[qid];
      if (next[qid]) delete next[qid];
      else next[qid] = true;

      recordBehavior("mark_for_review", {
        question_id: qid,
        question_index: currentQuestionIndex,
        action: wasMarked ? "unmark" : "mark",
      });

      return next;
    });
  }, [currentQuestion, pushHistory, currentQuestionIndex, recordBehavior]);

  const handleCheckAnswer = useCallback(() => {
    if (!currentQuestion) return;
    const qid = currentQuestion._id;
    const selected = userAnswersRef.current[qid] || [];
    if (!selected.length) return;

    const result = computeResult(currentQuestion, selected);

    setShowResult((prev) => ({ ...prev, [qid]: result }));
    setLockedQuestions((prev) => ({ ...prev, [qid]: true }));
    setResultModalData(result);
    setShowResultModal(true);

    recordBehavior("check_answer", {
      question_id: qid,
      question_index: currentQuestionIndex,
      selected_options: selected,
      is_correct: result.isCorrect,
      time_spent:
        questionTimeRemaining > 0
          ? settings.questionTimeLimit - questionTimeRemaining
          : 0,
    });

    if (settingsRef.current.testMode === "question_timer") setIsQuestionTimerPaused(true);
  }, [
    computeResult,
    currentQuestion,
    currentQuestionIndex,
    questionTimeRemaining,
    settings.questionTimeLimit,
    recordBehavior,
  ]);

  const handleCloseResultModal = useCallback(() => {
    setShowResultModal(false);
    if (settingsRef.current.testMode === "question_timer") setIsQuestionTimerPaused(false);
  }, []);

  const handleNext = useCallback(() => {
    const qs = questionsRef.current || [];
    if (currentQuestionIndex < qs.length - 1) {
      recordBehavior("question_navigation", {
        from_question: currentQuestionIndex,
        to_question: currentQuestionIndex + 1,
        action: "next",
      });

      setCurrentQuestionIndex((i) => i + 1);
      if (settingsRef.current.testMode === "question_timer") {
        setQuestionTimeRemaining(settingsRef.current.questionTimeLimit || 30);
        setIsQuestionTimerPaused(false);
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentQuestionIndex, recordBehavior]);

  const handlePrev = useCallback(() => {
    if (settingsRef.current.testMode !== "flexible") return;
    if (currentQuestionIndex > 0) {
      recordBehavior("question_navigation", {
        from_question: currentQuestionIndex,
        to_question: currentQuestionIndex - 1,
        action: "prev",
      });

      setCurrentQuestionIndex((i) => i - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentQuestionIndex, recordBehavior]);

  const handleSubmitClick = useCallback(() => {
    if (isSubmittedRef.current) return;

    recordBehavior("submit_attempt", {
      total_questions: questions.length,
      answered_questions: answeredCount,
      unanswered_questions: questions.length - answeredCount,
      current_question: currentQuestionIndex,
    });

    setShowSubmitModal(true);
  }, [questions.length, answeredCount, currentQuestionIndex, recordBehavior]);

  // ===================== highlight handlers =====================
  const addHighlightFromSelection = useCallback(
    (type = "question", optionLabel = null) => {
      if (!isHighlightMode) return;
      if (!currentQuestion) return;

      let container;
      if (type === "question") container = questionTextRef.current;
      else if (type === "option" && optionLabel)
        container = optionTextRefs.current[optionLabel];
      if (!container) return;

      const off = getSelectionOffsets(container);
      if (!off) return;

      const qid = currentQuestion._id;
      pushHistory();

      setHighlights((prev) => {
        const questionData = prev[qid] || { question: [], options: {} };

        if (type === "question") {
          const list = questionData.question ? [...questionData.question] : [];
          list.push({ start: off.start, end: off.end });
          return {
            ...prev,
            [qid]: { ...questionData, question: list },
          };
        }

        if (type === "option" && optionLabel) {
          const optionList = questionData.options[optionLabel]
            ? [...questionData.options[optionLabel]]
            : [];
          optionList.push({ start: off.start, end: off.end });
          return {
            ...prev,
            [qid]: {
              ...questionData,
              options: { ...questionData.options, [optionLabel]: optionList },
            },
          };
        }

        return prev;
      });

      const sel = window.getSelection?.();
      sel?.removeAllRanges?.();
    },
    [currentQuestion, isHighlightMode, pushHistory]
  );

  const clearHighlightsCurrent = useCallback(() => {
    if (!currentQuestion) return;
    const qid = currentQuestion._id;

    const questionData = highlightsRef.current?.[qid];
    const hasQuestionHighlights = (questionData?.question || []).length > 0;
    const hasOptionHighlights = Object.values(questionData?.options || {}).some(
      (arr) => arr.length > 0
    );
    const has = hasQuestionHighlights || hasOptionHighlights;
    if (!has) return;

    pushHistory();
    setHighlights((prev) => {
      const next = { ...prev };
      delete next[qid];
      return next;
    });
  }, [currentQuestion, pushHistory]);

  // ===================== keyboard shortcuts =====================
  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      const editable = document.activeElement?.isContentEditable;
      if (tag === "input" || tag === "textarea" || editable) return;

      const isMac = /mac/i.test(navigator.platform);
      const mod = isMac ? e.metaKey : e.ctrlKey;

      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }

      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();

      if (e.key.toLowerCase() === "h") setIsHighlightMode((v) => !v);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleNext, handlePrev, redo, undo]);

  // ===================== timer UI helpers =====================
  const timePercent = useMemo(() => {
    if (!totalTime) return 0;
    return Math.max(0, Math.min(100, (timeRemaining / totalTime) * 100));
  }, [timeRemaining, totalTime]);

  const timeWarnLevel = useMemo(() => {
    if (!totalTime) return "normal";
    const p = timeRemaining / totalTime;
    if (p <= 0.1) return "danger";
    if (p <= 0.25) return "warn";
    return "normal";
  }, [timeRemaining, totalTime]);

  const timerBoxClass =
    timeWarnLevel === "danger"
      ? "bg-red-50 border-red-200 text-red-800"
      : timeWarnLevel === "warn"
      ? "bg-amber-50 border-amber-200 text-amber-800"
      : "bg-indigo-50 border-indigo-100 text-indigo-800";

  const timerBarClass =
    timeWarnLevel === "danger"
      ? "bg-red-500"
      : timeWarnLevel === "warn"
      ? "bg-amber-500"
      : "bg-indigo-500";

  const questionTimePercent = useMemo(() => {
    const limit = settings.questionTimeLimit || 30;
    if (settings.testMode !== "question_timer" || !limit) return 0;
    return Math.max(0, Math.min(100, (questionTimeRemaining / limit) * 100));
  }, [questionTimeRemaining, settings.testMode, settings.questionTimeLimit]);

  // ===================== render guards =====================
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-3" />
          <p className="text-indigo-600 text-sm font-medium">Đang tải bài kiểm tra...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">Lỗi tải bài test</h3>
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <div className="space-x-3">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
            >
              Thử lại
            </button>
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
            >
              Quay lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion || !test || !questions.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-indigo-600 text-sm font-medium">Đang tải câu hỏi...</p>
      </div>
    );
  }

  // ===================== locals for render =====================
  const qid = currentQuestion._id;
  const selectedForQ = userAnswers[qid] || [];
  const isCurrentLocked = isLocked(qid);
  const currentComputed = showResult[qid];
  const multi = isMultiChoice(currentQuestion);

  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const canGoPrev = settings.testMode === "flexible" && currentQuestionIndex > 0;
  const canGoNext = settings.testMode === "flexible" && currentQuestionIndex < questions.length - 1;

  const currentHighlights = highlights[qid] || { question: [], options: {} };

  // ===================== UI =====================
  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        <div className="grid grid-cols-12 gap-4 lg:gap-6">
          {/* MAIN */}
          <div className="col-span-12 lg:col-span-9">
            <div className="border border-slate-300 rounded-2xl bg-white shadow-sm p-4 sm:p-6">
              {/* header */}
              <div className="mb-4 sm:mb-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {settings.showQuestionNumber && (
                      <div className="bg-blue-600 text-white font-semibold w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0">
                        {currentQuestionIndex + 1}
                      </div>
                    )}

                    <div>
                      <h2 className="text-base sm:text-lg font-medium mb-1 text-gray-900">
                        <span
                          ref={questionTextRef}
                          onMouseUp={() => addHighlightFromSelection("question")}
                          className={isHighlightMode ? "cursor-text select-text" : ""}
                        >
                          {renderTextWithHighlights(
                            currentQuestion.question_text,
                            currentHighlights.question || []
                          )}
                        </span>
                      </h2>

                      <p className="text-xs sm:text-sm text-gray-600">
                        {multi ? "Chọn (có thể nhiều đáp án)" : "Chọn 1 đáp án phù hợp"}{" "}
                        {isCurrentLocked && "(câu này đã khóa)"}
                      </p>
                    </div>
                  </div>

                  {/* Mark button */}
                  <button
                    type="button"
                    onClick={toggleMarkCurrent}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition ${
                      isMarked(qid)
                        ? "bg-amber-50 border-amber-200 text-amber-800"
                        : "bg-white border-slate-300 text-gray-700 hover:bg-gray-50"
                    }`}
                    title="Đánh dấu để xem lại"
                  >
                    {isMarked(qid) ? "★ Đã đánh dấu" : "☆ Đánh dấu"}
                  </button>
                </div>

                {/* hint */}
                <div className="mt-3 text-xs text-gray-500 space-y-1">
                  <div>
                    Mẹo: dùng phím <span className="font-semibold">←</span> /{" "}
                    <span className="font-semibold">→</span> để chuyển câu.{" "}
                    <span className="font-semibold">H</span> để bật/tắt highlight.{" "}
                    <span className="font-semibold">Ctrl+Z</span> để hoàn tác.
                  </div>
                  {isHighlightMode && (
                    <div className="text-amber-700">✍️ Chọn text để đánh dấu!</div>
                  )}
                </div>
              </div>

              {/* OPTIONS */}
              <div className="space-y-3 sm:space-y-4">
                {currentQuestion?.options?.map((op) => {
                  const isSelected = selectedForQ.includes(op.label);
                  return (
                    <div
                      key={op.label}
                      className={`w-full flex items-start gap-3 px-3 py-3 sm:px-4 sm:py-4 rounded-xl border text-sm sm:text-base transition-colors ${
                        isCurrentLocked ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                      } ${
                        isSelected
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-300 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                      onClick={() => {
                        if (!isCurrentLocked && !isSubmitted) toggleAnswer(qid, op.label);
                      }}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        <div
                          className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? "border-blue-500 bg-blue-600" : "border-gray-300 bg-white"
                          }`}
                        >
                          {isSelected && (
                            <svg
                              className="w-3.5 h-3.5 text-white"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-start gap-2">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-blue-100 text-blue-700 text-xs sm:text-sm font-semibold flex-shrink-0">
                            {op.label}
                          </span>
                          <p
                            ref={(el) => {
                              if (el) optionTextRefs.current[op.label] = el;
                            }}
                            onMouseUp={(e) => {
                              if (isHighlightMode) {
                                e.stopPropagation();
                                addHighlightFromSelection("option", op.label);
                              }
                            }}
                            className={`leading-relaxed ${
                              isSelected ? "text-gray-900 font-medium" : "text-gray-800"
                            } ${isHighlightMode ? "cursor-text select-text" : ""}`}
                          >
                            {renderTextWithHighlights(
                              op.text,
                              currentHighlights.options?.[op.label] || []
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Highlight toolbar */}
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsHighlightMode((v) => !v)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold border transition flex items-center gap-2 ${
                    isHighlightMode
                      ? "bg-yellow-100 border-yellow-200 text-yellow-900"
                      : "bg-white border-slate-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span>✏️</span>
                  {isHighlightMode ? "Đang đánh dấu" : "Bật đánh dấu"}
                </button>

                <button
                  type="button"
                  onClick={clearHighlightsCurrent}
                  className="px-4 py-2 rounded-lg text-xs font-semibold border border-slate-300 bg-white text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  🗑️ Xóa
                </button>

                <button
                  type="button"
                  onClick={undo}
                  className="px-4 py-2 rounded-lg text-xs font-semibold border border-slate-300 bg-white text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  ↩️ Hoàn tác
                </button>

                <button
                  type="button"
                  onClick={redo}
                  className="px-4 py-2 rounded-lg text-xs font-semibold border border-slate-300 bg-white text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  ↪️ Làm lại
                </button>
              </div>
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="col-span-12 lg:col-span-3 flex flex-col">
            <div className="flex-1 rounded-2xl border border-slate-300 shadow-sm bg-white p-4 flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-xs font-semibold text-indigo-700">
                    {test?.main_topic} {test?.sub_topic && "·"} {test?.sub_topic}
                  </h4>
                  {settings.showQuestionNumber && (
                    <div className="text-xs text-gray-600 mt-0.5 flex items-center gap-2">
                      <span>Câu {currentQuestionIndex + 1} / {questions.length}</span>
                      {lastSaved && (
                        <span className="text-green-600 flex items-center gap-1" title="Tiến trình được tự động lưu">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Đã lưu
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {settings.showTimer && (
                    <div className={`px-2 py-1 rounded-md border flex flex-col items-center ${timerBoxClass}`}>
                      <span className="text-[10px] opacity-90">Toàn bài</span>
                      <span className="text-xs font-semibold">{formatTime(timeRemaining)}</span>
                      <div className="w-20 h-1 bg-white/60 rounded mt-1 overflow-hidden">
                        <div className={`h-full ${timerBarClass}`} style={{ width: `${timePercent}%` }} />
                      </div>
                    </div>
                  )}

                  {settings.testMode === "question_timer" && (
                    <div className="px-2 py-1 rounded-md bg-orange-50 border border-orange-100 flex flex-col items-center">
                      <span className="text-[10px] text-orange-700">Mỗi câu</span>
                      <span className="text-xs font-semibold text-orange-800">
                        {formatTime(questionTimeRemaining)}
                      </span>
                      <div className="w-20 h-1 bg-orange-100 rounded mt-1 overflow-hidden">
                        <div className="h-full bg-orange-500" style={{ width: `${questionTimePercent}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span>Đã trả lời</span>
                  <span className="font-medium">
                    {answeredCount}/{questions.length}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${(answeredCount / Math.max(questions.length || 1, 1)) * 100}%` }}
                  />
                </div>
              </div>

              {/* Auto-save indicator */}
              <div className="px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-center" title="Tiến trình tự động được lưu. Bạn có thể load lại trang mà không lo mất tiến trình.">
                <div className="text-[10px] text-emerald-700 font-medium flex items-center justify-center gap-1">
                  💾 Tự động lưu tiến trình
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-2 text-[10px] text-gray-600">
                <span className="inline-flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-purple-600" /> Đang làm
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-emerald-500" /> Đã trả lời
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-gray-200 border border-gray-300" /> Chưa trả lời
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-amber-400" /> Đánh dấu
                </span>
              </div>

              {/* Grid */}
              <div className="flex-1 min-h-0 overflow-auto">
                <div className="grid grid-cols-6 sm:grid-cols-5 gap-2">
                  {questions.map((q, idx) => {
                    const answered = (userAnswers[q._id] || []).length > 0;
                    const current = idx === currentQuestionIndex;
                    const marked = !!markedQuestions[q._id];

                    let cls =
                      "w-8 h-8 sm:w-9 sm:h-9 rounded-lg text-xs font-semibold flex items-center justify-center transition-all ";
                    if (current) cls += "bg-purple-600 text-white shadow ring-2 ring-purple-300";
                    else if (marked) cls += "bg-amber-400 text-white hover:bg-amber-500";
                    else if (answered) cls += "bg-emerald-500 text-white hover:bg-emerald-600";
                    else cls += "bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200";

                    const disabled = settings.testMode === "question_timer" && idx !== currentQuestionIndex;

                    return (
                      <button
                        key={q._id}
                        type="button"
                        className={cls}
                        onClick={() => {
                          if (settings.testMode === "flexible") {
                            setCurrentQuestionIndex(idx);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }
                        }}
                        disabled={disabled}
                        title={marked ? "Đã đánh dấu xem lại" : ""}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SUBMIT */}
              <button
                type="button"
                onClick={handleSubmitClick}
                disabled={answeredCount === 0}
                className={`mt-auto w-full px-4 py-3 rounded-lg text-sm font-semibold ${
                  answeredCount === 0
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-red-600 text-white hover:bg-red-700"
                }`}
              >
                Nộp bài ({answeredCount}/{questions.length})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM ACTION BAR */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-300 bg-white/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {settings.testMode === "flexible" && (
              <button
                type="button"
                onClick={handlePrev}
                disabled={!canGoPrev}
                className={`w-full sm:w-auto px-3 py-2 rounded-lg text-sm border ${
                  !canGoPrev
                    ? "bg-gray-100 text-gray-400 border-slate-300 cursor-not-allowed"
                    : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
                }`}
              >
                Câu trước
              </button>
            )}

            <div className="flex-1 flex flex-col sm:flex-row gap-2 sm:gap-3">
              {!currentComputed && selectedForQ.length > 0 && (
                <button
                  type="button"
                  onClick={handleCheckAnswer}
                  className="flex-1 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
                >
                  Kiểm tra đáp án
                </button>
              )}

              {canGoNext && (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 px-3 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700"
                >
                  Câu tiếp theo
                </button>
              )}

              {isLastQuestion && (
                <button
                  type="button"
                  onClick={handleSubmitClick}
                  disabled={answeredCount === 0}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold ${
                    answeredCount === 0
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-green-600 text-white hover:bg-green-700"
                  }`}
                >
                  Nộp bài
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODALS */}
      <QuestionResultModal
        isOpen={showResultModal}
        onClose={handleCloseResultModal}
        resultData={resultModalData}
        currentQuestionIndex={currentQuestionIndex}
        totalQuestions={questions.length}
        onNextQuestion={handleNext}
        canGoNext={questions && currentQuestionIndex < questions.length - 1}
      />

      <SubmitConfirmModal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        onConfirm={() => doSubmitTest({ reason: "manual_confirm" })}
        answeredCount={answeredCount}
        totalQuestions={questions.length}
      />
    </div>
  );
};

export default MultipleChoiceTestTake;
