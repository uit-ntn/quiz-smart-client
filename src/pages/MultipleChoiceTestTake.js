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
import QuestionResultModal from "../components/MCPQuestionResultModal";
import SubmitConfirmModal from "../components/MCPSubmitConfirmModal";
import { getCorrectAnswerLabels, isCorrectAnswer } from "../utils/correctAnswerHelpers";

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
      <mark key={`m-${i}-${h.start}`} className="rounded px-0.5 bg-amber-500/20 text-amber-100">
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
    return getCorrectAnswerLabels(q.correct_answers).length > 1;
  }, []);

  const computeResult = useCallback((q, selected) => {
    const correctLabels = getCorrectAnswerLabels(q.correct_answers);
    const correctSet = new Set(correctLabels);
    const selectedSet = new Set(selected || []);
    const isCorrect =
      correctSet.size === selectedSet.size &&
      [...correctSet].every((c) => selectedSet.has(c));

    const wrongSelected = [...selectedSet].filter((s) => !correctSet.has(s));

    // Normalize explanation format: ensure correct is always an object (backward compatibility)
    const explanation = q.explanation || {};
    
    // Normalize correct explanations
    let normalizedCorrect = {};
    if (explanation.correct) {
      // If it's already an object, use it
      if (typeof explanation.correct === 'object' && !Array.isArray(explanation.correct)) {
        normalizedCorrect = { ...explanation.correct };
      }
      // If it's a string (old format), convert to object by assigning to all correct labels
      else if (typeof explanation.correct === 'string' && explanation.correct.trim()) {
        correctLabels.forEach(label => {
          normalizedCorrect[label] = explanation.correct;
        });
      }
    }
    
    // Normalize incorrect_choices: remove any entries that are actually correct answers
    const normalizedIncorrect = {};
    if (explanation.incorrect_choices && typeof explanation.incorrect_choices === 'object') {
      Object.entries(explanation.incorrect_choices).forEach(([label, text]) => {
        // Only include if this label is NOT a correct answer and has content
        if (text && text.trim() && !correctSet.has(label)) {
          normalizedIncorrect[label] = text;
        }
        // If this label is actually a correct answer but was in incorrect_choices (data inconsistency),
        // move it to correct explanations if not already there
        else if (text && text.trim() && correctSet.has(label) && !normalizedCorrect[label]) {
          normalizedCorrect[label] = text;
        }
      });
    }
    
    const normalizedExplanation = {
      correct: normalizedCorrect,
      incorrect_choices: normalizedIncorrect
    };

    return {
      isCorrect,
      correctAnswer: correctLabels,
      selectedAnswers: [...selectedSet],
      wrongSelected,
      explanation: normalizedExplanation,
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

            const correctLabels = getCorrectAnswerLabels(q.correct_answers);
            const newCorrectAnswers = correctLabels.map(
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
              Array.isArray(firstQuestion?.correct_answers) && getCorrectAnswerLabels(firstQuestion.correct_answers).length > 0
                ? getCorrectAnswerLabels(firstQuestion.correct_answers)
                : fallbackCorrect;

            // chỉ tạo nếu đủ điều kiện validate BE (options >=2, correct_answers non-empty)
            if (opts.length >= 2 && correctAnswers.length > 0) {
              const initialPayload = {
                test_id: testId,
                // test_snapshot optional (BE tự build nếu không gửi)
                test_snapshot: {
                  test_id: testId,
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
              correct_answers: getCorrectAnswerLabels(q.correct_answers),
              user_answers: selected,
              is_correct: !!r.isCorrect,
            };
          }),
        };

        const finalResult = await testResultService.createTestResult(payload);
        const draftId = finalResult?._id || finalResult?.id;

        if (draftId) localStorage.setItem(DRAFT_KEY, String(draftId));
        localStorage.removeItem(STORE_KEY);

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
    [DRAFT_KEY, STORE_KEY, computeResult, navigate, testId, testResultId]
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

        if (!multi) return { ...prev, [qid]: [label] };

        const next = wasSelected ? current.filter((x) => x !== label) : [...current, label];
        return { ...prev, [qid]: next };
      });
    },
    [isLocked, isMultiChoice, pushHistory, currentQuestionIndex]
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

      return next;
    });
  }, [currentQuestion, pushHistory, currentQuestionIndex]);

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

    if (settingsRef.current.testMode === "question_timer") setIsQuestionTimerPaused(true);
  }, [
    computeResult,
    currentQuestion,
    currentQuestionIndex,
    questionTimeRemaining,
    settings.questionTimeLimit,
  ]);

  const handleCloseResultModal = useCallback(() => {
    setShowResultModal(false);
    if (settingsRef.current.testMode === "question_timer") setIsQuestionTimerPaused(false);
  }, []);

  const handleNext = useCallback(() => {
    const qs = questionsRef.current || [];
    if (currentQuestionIndex < qs.length - 1) {
      setCurrentQuestionIndex((i) => i + 1);
      if (settingsRef.current.testMode === "question_timer") {
        setQuestionTimeRemaining(settingsRef.current.questionTimeLimit || 30);
        setIsQuestionTimerPaused(false);
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentQuestionIndex]);

  const handlePrev = useCallback(() => {
    if (settingsRef.current.testMode !== "flexible") return;
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((i) => i - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentQuestionIndex]);

  const handleSubmitClick = useCallback(() => {
    if (isSubmittedRef.current) return;

    setShowSubmitModal(true);
  }, [questions.length, answeredCount, currentQuestionIndex]);

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
      ? "bg-red-950 border-red-600 text-red-200"
      : timeWarnLevel === "warn"
      ? "bg-amber-950 border-amber-600 text-amber-200"
      : "bg-indigo-950 border-indigo-600 text-indigo-200";

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-200 via-blue-100 to-emerald-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-400 border-t-indigo-700 mx-auto mb-3" />
          <p className="text-indigo-900 text-sm font-bold">Đang tải bài kiểm tra...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-200 via-blue-100 to-emerald-200">
        <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full mx-4 border-[3px] border-rose-400">
          <div className="text-rose-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-extrabold text-slate-900 mb-2 text-center">Lỗi tải bài test</h3>
          <p className="text-sm text-slate-800 font-medium mb-4 text-center">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm font-extrabold hover:bg-blue-600 border-2 border-blue-900 shadow-lg"
            >
              Thử lại
            </button>
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-slate-200 text-slate-900 rounded-lg text-sm font-bold hover:bg-slate-300 border-2 border-slate-400"
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-200 via-blue-100 to-emerald-200">
        <p className="text-indigo-900 text-sm font-bold">Đang tải câu hỏi...</p>
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

  const currentHighlights = highlights[qid] || { question: [], options: {} };

  // ===================== UI =====================
  return (
    <div className="min-h-screen flex flex-col text-slate-900" style={{ background: "linear-gradient(to bottom right, #bae6fd, #dbeafe, #d1fae5)" }}>
      <div className="flex flex-col flex-1 min-h-0 w-full bg-gradient-to-b from-sky-100/80 to-blue-50/90">
        <div className="w-full max-w-full flex-1 flex flex-col min-h-0 px-3 sm:px-4 lg:px-5 pt-3 sm:pt-4 lg:pt-5 pb-20 sm:pb-20 lg:pb-4">

          {/* TOP BAR */}
          <div className="mb-2 flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-violet-800 bg-violet-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-md">
                <span className="inline-flex h-2 w-2 rounded-full bg-lime-400" />
                Trắc nghiệm
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-sky-800 bg-sky-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-md">
                📌 {currentQuestionIndex + 1}/{questions.length}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-emerald-800 bg-emerald-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-md">
                ✅ {Object.values(showResult).filter(r => r?.isCorrect).length} • ❌ {Object.values(showResult).filter(r => r && !r.isCorrect).length}
              </span>
              {settings.showTimer && (
                <span
                  className={`inline-flex items-center gap-2 rounded-xl border-[3px] px-3 py-1.5 text-sm font-black shadow-lg lg:hidden ${
                    timeWarnLevel === "danger"
                      ? "border-red-900 bg-red-600 text-white ring-2 ring-red-300 animate-pulse"
                      : timeWarnLevel === "warn"
                      ? "border-amber-900 bg-amber-500 text-amber-950 ring-2 ring-amber-200"
                      : "border-indigo-900 bg-indigo-600 text-white ring-2 ring-indigo-200"
                  }`}
                  title="Thời gian còn lại"
                >
                  ⏱ <span className="tabular-nums">{formatTime(timeRemaining)}</span>
                </span>
              )}
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border-2 border-lime-700 bg-lime-500 px-2.5 py-0.5 text-[11px] font-bold text-lime-950 shadow-md" title="Tiến trình được lưu tự động">
                💾 Tự động lưu
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="hidden lg:inline text-[10px] text-slate-800 font-bold shrink-0">
                (←→: chuyển câu • H: highlight • Ctrl+Z: hoàn tác)
              </span>
            </div>
          </div>

          {/* MAIN GRID — same as VocabularyTestTake: 2/3 left + 1/3 right */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4 flex-1 min-h-0 lg:items-stretch lg:grid-rows-1">

            {/* LEFT — question card */}
            <div className="lg:col-span-2 flex flex-col min-w-0 min-h-0 flex-1">
              <div className="relative rounded-xl border-[3px] border-indigo-400 bg-white shadow-xl shadow-indigo-200/60 overflow-hidden flex flex-col flex-1 min-h-0 ring-2 ring-indigo-200/80">
                <div className="relative p-3 sm:p-4 md:p-5 flex flex-col flex-1 min-h-0">

                  {/* header row */}
                  <div className="flex items-center justify-between gap-2 shrink-0 mb-4">
                    <div className="flex items-center gap-2">
                      {settings.showQuestionNumber && (
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white font-extrabold text-sm shadow-lg flex-shrink-0">
                          {currentQuestionIndex + 1}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-700 px-2.5 py-1 text-[10px] sm:text-[11px] font-bold text-white shadow-md">
                        {multi ? "Nhiều đáp án" : "Một đáp án"}
                      </span>
                      {isCurrentLocked && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white border border-rose-800">Đã khóa</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-20 sm:w-28 shrink-0">
                        <div className="h-2 rounded-full bg-indigo-300 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-indigo-600 to-blue-600" style={{ width: `${(answeredCount / Math.max(questions.length, 1)) * 100}%` }} />
                        </div>
                        <div className="mt-0.5 text-[10px] text-indigo-900 font-bold text-right">{answeredCount}/{questions.length} câu</div>
                      </div>

                      {/* Mark button */}
                      <button
                        type="button"
                        onClick={toggleMarkCurrent}
                        className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-extrabold border-2 transition ${
                          isMarked(qid)
                            ? "bg-amber-500 border-amber-800 text-amber-950 shadow-md"
                            : "bg-amber-100 border-amber-400 text-amber-800 hover:bg-amber-200"
                        }`}
                        title="Đánh dấu để xem lại"
                      >
                        {isMarked(qid) ? "★ Đánh dấu" : "☆ Đánh dấu"}
                      </button>
                    </div>
                  </div>

                  {/* question text — scrollable middle area */}
                  <div className="flex-1 flex flex-col min-h-0 py-1 sm:py-2 overflow-y-auto">
                    <div className="w-full">
                      <h2 className="text-base sm:text-lg font-semibold mb-3 text-slate-900 leading-snug">
                        <span
                          ref={questionTextRef}
                          onMouseUp={() => addHighlightFromSelection("question")}
                          className={isHighlightMode ? "cursor-text select-text" : ""}
                        >
                          {renderTextWithHighlights(currentQuestion.question_text, currentHighlights.question || [])}
                        </span>
                      </h2>

                      {isHighlightMode && (
                        <div className="mb-2 text-xs text-orange-700 font-extrabold">✍️ Chọn text để đánh dấu!</div>
                      )}

                      {/* OPTIONS */}
                      <div className="space-y-2 sm:space-y-2.5">
                        {currentQuestion?.options?.map((op) => {
                          const isSelected = selectedForQ.includes(op.label);
                          return (
                            <div
                              key={op.label}
                              className={`w-full flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border-[3px] text-sm transition-all ${
                                isCurrentLocked ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                              } ${
                                isSelected
                                  ? "border-blue-600 bg-blue-200 shadow-lg ring-2 ring-blue-400"
                                  : "border-indigo-300 bg-indigo-50 hover:border-indigo-500 hover:bg-indigo-100"
                              }`}
                              onClick={() => { if (!isCurrentLocked && !isSubmitted) toggleAnswer(qid, op.label); }}
                            >
                              <div className="flex-shrink-0">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                  isSelected ? "border-blue-700 bg-blue-600 ring-2 ring-blue-400" : "border-indigo-400 bg-white"
                                }`}>
                                  {isSelected && (
                                    <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>
                              </div>
                              <div className="flex-1 flex items-center gap-2.5">
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-extrabold flex-shrink-0 transition-all ${
                                  isSelected ? "bg-blue-700 text-white border-2 border-blue-900" : "bg-indigo-500 text-white border-2 border-indigo-700"
                                }`}>
                                  {op.label}
                                </span>
                                <p
                                  ref={(el) => { if (el) optionTextRefs.current[op.label] = el; }}
                                  onMouseUp={(e) => { if (isHighlightMode) { e.stopPropagation(); addHighlightFromSelection("option", op.label); } }}
                                  className={`leading-relaxed font-semibold ${isSelected ? "text-slate-900" : "text-slate-800"} ${isHighlightMode ? "cursor-text select-text" : ""}`}
                                >
                                  {renderTextWithHighlights(op.text, currentHighlights.options?.[op.label] || [])}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Highlight toolbar */}
                  <div className="mt-3 shrink-0 hidden sm:flex flex-wrap items-center gap-1.5">
                    <button type="button" onClick={() => setIsHighlightMode((v) => !v)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold border-2 transition flex items-center gap-1.5 ${
                        isHighlightMode ? "bg-amber-500 border-amber-800 text-amber-950 shadow-md" : "bg-amber-100 border-amber-400 text-amber-800 hover:bg-amber-200"
                      }`}>
                      ✏️ {isHighlightMode ? "Đang đánh dấu" : "Bật đánh dấu"}
                    </button>
                    <button type="button" onClick={clearHighlightsCurrent}
                      className="px-3 py-1.5 rounded-lg text-xs font-extrabold border-2 border-rose-700 bg-rose-500 text-white hover:bg-rose-600 flex items-center gap-1.5 transition shadow-md">
                      🗑️ Xóa
                    </button>
                    <button type="button" onClick={undo}
                      className="px-3 py-1.5 rounded-lg text-xs font-extrabold border-2 border-teal-700 bg-teal-500 text-white hover:bg-teal-600 flex items-center gap-1.5 transition shadow-md">
                      ↩️ Hoàn tác
                    </button>
                    <button type="button" onClick={redo}
                      className="px-3 py-1.5 rounded-lg text-xs font-extrabold border-2 border-fuchsia-700 bg-fuchsia-500 text-white hover:bg-fuchsia-600 transition flex items-center gap-1.5 shadow-md">
                      ↪️ Làm lại
                    </button>
                  </div>

                  {/* ACTION BUTTONS — same position as VocabularyTestTake */}
                  <div className="mt-auto pt-3 shrink-0 w-full">
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={handleCheckAnswer}
                        disabled={!!currentComputed || selectedForQ.length === 0}
                        className="w-full inline-flex items-center justify-center rounded-lg bg-blue-700 px-2 py-2 text-xs font-extrabold text-white shadow-lg border-2 border-blue-900 hover:bg-blue-600 disabled:opacity-40"
                      >
                        Kiểm tra
                      </button>

                      <button
                        type="button"
                        onClick={handleSubmitClick}
                        disabled={answeredCount === 0}
                        className="w-full inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-orange-600 via-red-600 to-rose-700 px-2 py-2 text-xs font-extrabold text-white shadow-lg border-2 border-red-900 hover:brightness-110 disabled:opacity-40"
                      >
                        Nộp bài
                      </button>

                      <button
                        type="button"
                        onClick={toggleMarkCurrent}
                        className={`w-full inline-flex items-center justify-center rounded-lg px-2 py-2 text-xs font-extrabold border-[3px] transition ${
                          isMarked(qid) ? "bg-amber-500 border-amber-800 text-amber-950 shadow-md" : "bg-amber-100 border-amber-400 text-amber-800 hover:bg-amber-200"
                        }`}
                      >
                        {isMarked(qid) ? "★ Đánh dấu" : "☆ Đánh dấu"}
                      </button>
                    </div>

                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT sidebar — two separate cards, same as VocabularyTestTake */}
            <div className="lg:col-span-1 hidden lg:flex lg:flex-col min-w-0 min-h-0 lg:overflow-y-auto lg:max-h-[min(100%,calc(100dvh-4.5rem))]">
              <div className="space-y-3 flex flex-col min-h-0">

                {/* Card 1: Test info + Timer (fuchsia — same as Voice card in Voca) */}
                <div className="rounded-xl border-[3px] border-fuchsia-500 bg-gradient-to-br from-fuchsia-200 to-purple-300 shadow-lg p-3 ring-2 ring-fuchsia-300/80">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-extrabold text-slate-900">
                        {test?.main_topic || "Bài test"}
                      </h3>
                      {test?.sub_topic && (
                        <p className="text-[10px] text-fuchsia-900 font-bold mt-0.5">{test.sub_topic}</p>
                      )}
                    </div>
                    <span className="inline-flex items-center rounded-full bg-fuchsia-600 px-2 py-0.5 text-[10px] font-extrabold text-white shadow-sm">
                      {questions.length} câu
                    </span>
                  </div>

                  {settings.showTimer && (
                    <div className={`mt-3 w-full rounded-xl border-2 px-3 py-2 flex items-center justify-between ${timerBoxClass}`}>
                      <div>
                        <div className="text-[10px] font-bold opacity-80">Toàn bài</div>
                        <div className="text-base font-extrabold">{formatTime(timeRemaining)}</div>
                      </div>
                      <div className="w-20 h-2 bg-white/20 rounded mt-1 overflow-hidden">
                        <div className={`h-full ${timerBarClass}`} style={{ width: `${timePercent}%` }} />
                      </div>
                    </div>
                  )}

                  {settings.testMode === "question_timer" && (
                    <div className="mt-2 w-full rounded-xl bg-white/30 border-2 border-purple-400 px-3 py-2 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-purple-900 font-bold">Mỗi câu</div>
                        <div className="text-base font-extrabold text-purple-950">{formatTime(questionTimeRemaining)}</div>
                      </div>
                      <div className="w-20 h-2 bg-purple-300 rounded overflow-hidden">
                        <div className="h-full bg-blue-600" style={{ width: `${questionTimePercent}%` }} />
                      </div>
                    </div>
                  )}

                  {lastSaved && (
                    <div className="mt-2 rounded-lg bg-cyan-300 border-2 border-cyan-700 px-2 py-1 text-center">
                      <div className="text-[10px] text-cyan-950 font-extrabold flex items-center justify-center gap-1">
                        💾 Tiến trình đã lưu
                      </div>
                    </div>
                  )}
                </div>

                {/* Card 2: Progress + Question Grid (amber/orange — same as Progress card in Voca) */}
                <div className="rounded-2xl border-[3px] border-orange-600 bg-gradient-to-br from-amber-200 to-orange-300 shadow-lg p-4 ring-2 ring-orange-400">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-slate-900">Tiến độ</h3>
                    <span className="text-xs font-extrabold text-orange-800 bg-white/80 px-2 py-0.5 rounded-full border-2 border-orange-600">
                      {answeredCount}/{questions.length}
                    </span>
                  </div>

                  {/* Legend */}
                  <div className="mt-2 flex flex-wrap gap-x-2.5 gap-y-1 text-[10px] text-slate-900 font-bold">
                    <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-violet-500 border border-violet-800" /> Đang làm</span>
                    <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500 border border-emerald-800" /> Đã trả lời</span>
                    <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-400 border border-amber-700" /> Chưa trả lời</span>
                    <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-orange-600 border border-orange-900" /> Đánh dấu</span>
                  </div>

                  {/* Question grid */}
                  <div className="mt-2 grid grid-cols-10 gap-1">
                    {questions.map((q, idx) => {
                      const answered = (userAnswers[q._id] || []).length > 0;
                      const current = idx === currentQuestionIndex;
                      const marked = !!markedQuestions[q._id];
                      const disabled = settings.testMode === "question_timer" && idx !== currentQuestionIndex;

                      let cls = "w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-extrabold transition border-2 ";
                      if (current) cls += "bg-violet-500 text-white border-violet-800 shadow-md ring-[3px] ring-blue-700 ring-offset-2 ring-offset-amber-100 scale-105";
                      else if (marked) cls += "bg-orange-600 text-white border-orange-900 shadow-sm hover:brightness-95";
                      else if (answered) cls += "bg-emerald-500 text-white border-emerald-800 shadow-md hover:brightness-95";
                      else cls += "bg-amber-400 text-amber-950 border-amber-700 shadow-sm hover:brightness-95";

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
                          title={marked ? "Đã đánh dấu xem lại" : `Câu ${idx + 1}`}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3 rounded-lg bg-cyan-300 border-2 border-cyan-700 p-2 shadow-inner">
                    <div className="flex items-center justify-between text-[11px] font-extrabold text-cyan-950">
                      <span>Hoàn thành</span>
                      <span>{Math.round((answeredCount / Math.max(questions.length, 1)) * 100)}%</span>
                    </div>
                    <div className="mt-1.5 h-2 rounded-full bg-cyan-500/50 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-600 to-blue-700 transition-all"
                        style={{ width: `${(answeredCount / Math.max(questions.length, 1)) * 100}%` }} />
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-900 font-bold">
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" /> Đúng: {Object.values(showResult).filter(r => r?.isCorrect).length}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-rose-500" /> Sai: {Object.values(showResult).filter(r => r && !r.isCorrect).length}
                      </span>
                    </div>
                  </div>

                  {/* Submit button */}
                  <button
                    type="button"
                    onClick={handleSubmitClick}
                    disabled={answeredCount === 0}
                    className={`mt-3 w-full px-3 py-2.5 rounded-xl text-sm font-extrabold transition-all border-[3px] ${
                      answeredCount === 0
                        ? "bg-amber-200 text-amber-500 border-amber-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-orange-600 via-red-600 to-rose-700 text-white border-red-900 hover:brightness-110 shadow-lg"
                    }`}
                  >
                    Nộp bài ({answeredCount}/{questions.length})
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE STICKY BOTTOM BAR */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t-[3px] border-indigo-300 shadow-2xl px-3 pt-2 pb-safe pb-2">
        {/* Progress bar */}
        <div className="mb-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-600 to-blue-700 transition-all"
            style={{ width: `${(answeredCount / Math.max(questions.length, 1)) * 100}%` }}
          />
        </div>
        <div className="flex items-center gap-2">
          {/* Center: progress + timer */}
          <div className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
            <span className="text-xs font-extrabold text-slate-700">
              {answeredCount}/{questions.length} câu đã làm
            </span>
            {settings.showTimer && (
              <span
                className={`inline-flex items-center gap-2 rounded-xl border-[3px] px-3 py-1.5 text-sm font-black shadow-md ${
                  timeWarnLevel === "danger"
                    ? "border-red-900 bg-red-50 text-red-800 ring-2 ring-red-200 animate-pulse"
                    : timeWarnLevel === "warn"
                    ? "border-amber-900 bg-amber-50 text-amber-800 ring-2 ring-amber-200"
                    : "border-indigo-900 bg-indigo-50 text-indigo-800 ring-2 ring-indigo-200"
                }`}
                title="Thời gian còn lại"
              >
                ⏱ <span className="tabular-nums">{formatTime(timeRemaining)}</span>
              </span>
            )}
          </div>

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmitClick}
            disabled={answeredCount === 0}
            className="shrink-0 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-orange-600 to-rose-700 border-[3px] border-red-900 px-3 py-1.5 text-xs font-extrabold text-white shadow-lg disabled:opacity-40"
          >
            Nộp bài
          </button>
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
