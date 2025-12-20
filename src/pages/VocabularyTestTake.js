// src/pages/VocabularyTestTake.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import TestLayout from "../layout/TestLayout";
import vocabularyService from "../services/vocabularyService";
import testService from "../services/testService";
import testResultService from "../services/testResultService";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import Toast from "../components/Toast";
import { useTestSession } from "../hooks/useTestSession";

const DEFAULT_TOTAL_QUESTIONS = 10;
const DEFAULT_TIME_PER_QUESTION = 30;

const sanitizeSettings = (raw = {}) => {
  const modeRaw = raw?.mode || "word_to_meaning";
  const mode =
    modeRaw === "word_to_meaning" ||
    modeRaw === "meaning_to_word" ||
    modeRaw === "listen_and_type"
      ? modeRaw
      : "word_to_meaning";

  const totalQuestions =
    Number.isFinite(raw?.totalQuestions) && raw.totalQuestions > 0
      ? raw.totalQuestions
      : DEFAULT_TOTAL_QUESTIONS;

  const timePerQuestion =
    Number.isFinite(raw?.timePerQuestion) && raw.timePerQuestion > 0
      ? raw.timePerQuestion
      : DEFAULT_TIME_PER_QUESTION;

  return { mode, totalQuestions, timePerQuestion, showAnswerMode: "after_each" };
};

// map select id -> lang prefix
const VOICE_PRESETS = [
  { id: "", label: "Giọng mặc định", flag: "🔊", prefix: "" },
  { id: "en-US-1", label: "American", flag: "🇺🇸", prefix: "en-US" },
  { id: "en-GB-1", label: "British", flag: "🇬🇧", prefix: "en-GB" },
  { id: "en-AU-1", label: "Australian", flag: "🇦🇺", prefix: "en-AU" },
  { id: "en-CA-1", label: "Canadian", flag: "🇨🇦", prefix: "en-CA" },
  { id: "en-IN-1", label: "Indian", flag: "🇮🇳", prefix: "en-IN" },
];

const modeLabel = (mode) => {
  if (mode === "word_to_meaning") return "Từ → Nghĩa";
  if (mode === "meaning_to_word") return "Nghĩa → Từ";
  return "Nghe & Viết";
};

const modeBadge = (mode) => {
  if (mode === "word_to_meaning") return "Đưa từ đoán nghĩa";
  if (mode === "meaning_to_word") return "Đưa nghĩa đoán từ";
  return "Nghe và ghi từ";
};

const normalize = (s) => (s || "").toLowerCase().trim();

const VocabularyTestTake = () => {
  const { testId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // ===== settings =====
  const settings = useMemo(() => {
    const fromState = location.state?.settings;
    const fromLS = JSON.parse(localStorage.getItem(`vocab_settings_${testId}`) || "{}");
    return sanitizeSettings(fromState || fromLS);
  }, [location.state, testId]);

  // ===== session tracking =====
  const [testResultId, setTestResultId] = useState(null);
  const { initializeSession, endSession, recordBehavior, isTracking } = useTestSession(testResultId);

  // ===== states =====
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [testInfo, setTestInfo] = useState(null);
  const [items, setItems] = useState([]);
  const [index, setIndex] = useState(0);

  // answers[i] = { question, userAnswer, isCorrect, timeSpentSec }
  const [answers, setAnswers] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState("");

  const [timeLeft, setTimeLeft] = useState(settings.timePerQuestion || DEFAULT_TIME_PER_QUESTION);
  const [isPaused, setIsPaused] = useState(false);

  const [showAnswer, setShowAnswer] = useState(false);
  const [lastAnswerResult, setLastAnswerResult] = useState(null);

  const [toast, setToast] = useState({ show: false, message: "", type: "info" });
  const showToastMsg = useCallback((message, type = "info") => {
    setToast({ show: true, message, type });
    window.clearTimeout(showToastMsg._t);
    showToastMsg._t = window.setTimeout(() => setToast({ show: false, message: "", type: "info" }), 2500);
  }, []);
  // eslint-disable-next-line
  showToastMsg._t = showToastMsg._t || null;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // ===== speech =====
  const [isPlaying, setIsPlaying] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [voiceId, setVoiceId] = useState(() => localStorage.getItem(`vocab_voice_${testId}`) || "");

  // ===== refs =====
  const timerRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  const STORE_KEY = `vocab_take_state_${testId}`;
  const DRAFT_KEY = `vocab_draft_${testId}`;

  // ===== undo/redo =====
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const MAX_STACK = 30;

  const pushHistory = useCallback(() => {
    undoStackRef.current.push({
      index,
      currentAnswer,
      answers: [...answers],
      timeLeft,
      timestamp: Date.now(),
    });
    if (undoStackRef.current.length > MAX_STACK) undoStackRef.current.shift();
    redoStackRef.current = [];
  }, [answers, currentAnswer, index, timeLeft]);

  // ===== helpers =====
  const current = useMemo(() => items[index], [items, index]);

  const getCorrectAnswer = useCallback(
    (item) => {
      if (!item) return "";
      if (settings.mode === "word_to_meaning") return item.meaning || "";
      if (settings.mode === "meaning_to_word") return item.word || "";
      return item.word || ""; // listen_and_type
    },
    [settings.mode]
  );

  const checkAnswer = useCallback((item, answer, mode) => {
    if (!item) return false;
    const ua = normalize(answer);
    if (mode === "word_to_meaning") return ua === normalize(item.meaning);
    if (mode === "meaning_to_word") return ua === normalize(item.word);
    return ua === normalize(item.word);
  }, []);

  const answeredState = useCallback(
    (idx) => {
      const a = answers[idx];
      if (!a) return "idle";
      return a.isCorrect ? "correct" : "wrong";
    },
    [answers]
  );

  // ===== voices load =====
  useEffect(() => {
    const loadVoices = () => setAvailableVoices(speechSynthesis.getVoices() || []);
    loadVoices();
    speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  const pickVoice = useCallback(() => {
    if (!voiceId) return null;
    const voices = speechSynthesis.getVoices() || [];
    const preset = VOICE_PRESETS.find((p) => p.id === voiceId);
    const prefix = preset?.prefix || "";

    const byPrefix = prefix ? voices.find((v) => v.lang?.startsWith(prefix)) : null;
    if (byPrefix) return byPrefix;

    return voices.find((v) => v.lang?.startsWith("en")) || null;
  }, [voiceId]);

  const playAudio = useCallback(
    (text) => {
      if (!text || isPlaying) return;
      setIsPlaying(true);

      const u = new SpeechSynthesisUtterance(text);
      let lang = "en-US";

      const v = pickVoice();
      if (v) {
        u.voice = v;
        lang = v.lang || lang;
      }
      u.lang = lang;
      u.rate = 0.85;
      u.pitch = 1;
      u.volume = 1;

      u.onend = () => setIsPlaying(false);
      u.onerror = () => setIsPlaying(false);

      recordBehavior?.("audio_playback", {
        question_index: index,
        question_id: current?._id,
        voice_id: voiceId,
        voice_lang: lang,
        text_length: (text || "").length,
      });

      speechSynthesis.speak(u);
    },
    [current?._id, index, isPlaying, pickVoice, recordBehavior, voiceId]
  );

  // ===== fetch + restore =====
  useEffect(() => {
    let mounted = true;

    const restoreIfPossible = (selectedCount) => {
      try {
        const raw = localStorage.getItem(STORE_KEY);
        if (!raw) return null;
        const state = JSON.parse(raw);

        const tooOld = Date.now() - (state?.timestamp || 0) > 4 * 60 * 60 * 1000;
        if (tooOld) {
          localStorage.removeItem(STORE_KEY);
          return null;
        }

        if (!Array.isArray(state?.answers)) return null;
        if (state.answers.length !== selectedCount) return null;

        const answeredCount = state.answers.filter(Boolean).length;
        if (!answeredCount) return null;

        return {
          answers: state.answers,
          index: typeof state.index === "number" ? state.index : 0,
          currentAnswer: typeof state.currentAnswer === "string" ? state.currentAnswer : "",
          timeLeft: typeof state.timeLeft === "number" ? state.timeLeft : settings.timePerQuestion,
          answeredCount,
          minutesAgo: Math.round((Date.now() - (state.timestamp || 0)) / 60000),
        };
      } catch (e) {
        localStorage.removeItem(STORE_KEY);
        return null;
      }
    };

    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const [test, vocab] = await Promise.all([
          testService.getTestById(testId),
          vocabularyService.getAllVocabulariesByTestId(testId),
        ]);

        if (!mounted) return;

        setTestInfo(test);

        if (!Array.isArray(vocab) || vocab.length === 0) {
          setError(`Không tìm thấy câu hỏi nào cho bài test ${testId}.`);
          return;
        }

        const shuffled = [...vocab].sort(() => Math.random() - 0.5);
        const maxQ = Math.min(settings.totalQuestions || DEFAULT_TOTAL_QUESTIONS, shuffled.length);

        const selected = shuffled.slice(0, maxQ).map((it, i) => ({
          ...it,
          questionNumber: i + 1,
        }));

        setItems(selected);

        // init start time
        startTimeRef.current = Date.now();

        // restore first, else init fresh
        const restored = restoreIfPossible(selected.length);
        if (restored) {
          setAnswers(restored.answers);
          setIndex(Math.min(restored.index, selected.length - 1));
          setCurrentAnswer(restored.currentAnswer);
          setTimeLeft(restored.timeLeft || settings.timePerQuestion);
          setShowAnswer(false);
          setLastAnswerResult(null);
          setIsPaused(false);
          showToastMsg(`🔄 Đã khôi phục (${restored.answeredCount} câu, ${restored.minutesAgo} phút trước)`, "success");
        } else {
          setAnswers(new Array(selected.length).fill(null));
          setIndex(0);
          setCurrentAnswer("");
          setTimeLeft(settings.timePerQuestion || DEFAULT_TIME_PER_QUESTION);
          setShowAnswer(false);
          setLastAnswerResult(null);
          setIsPaused(false);
        }

        // create draft result for session tracking (optional)
        try {
          const testSnapshot = {
            test_id: testId,
            test_title: test?.test_title || "Vocabulary Test",
            main_topic: test?.main_topic || "Vocabulary",
            sub_topic: test?.sub_topic || "",
            test_type: test?.test_type || "vocabulary",
            difficulty: test?.difficulty || "medium",
          };

          const first = selected[0];
          const draftPayload = {
            test_id: testId,
            test_snapshot: testSnapshot,
            answers: [
              {
                question_id: first?._id || "placeholder",
                question_collection: "vocabularies",
                word: first?.word || "",
                meaning: first?.meaning || "",
                example_sentence: first?.example_sentence || "",
                question_mode: settings.mode,
                correct_answer: "",
                user_answer: "",
                is_correct: false,
                time_spent_ms: 0,
              },
            ],
            duration_ms: 0,
            start_time: new Date(startTimeRef.current),
            end_time: null,
            status: "in_progress",
          };

          const draft = await testResultService.createTestResult(draftPayload);
          const id = draft?._id || draft?.id;
          if (id) {
            setTestResultId(id);
            localStorage.setItem(DRAFT_KEY, id);
          }
        } catch (e) {
          // ignore: still allow do test without session tracking
        }
      } catch (e) {
        console.error(e);
        if (mounted) setError(`Có lỗi xảy ra khi tải câu hỏi: ${e?.message || "Unknown error"}`);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [DRAFT_KEY, STORE_KEY, settings.mode, settings.timePerQuestion, settings.totalQuestions, showToastMsg, testId]);

  // ===== init session when have testResultId =====
  useEffect(() => {
    if (testResultId && !isTracking) initializeSession?.();
  }, [initializeSession, isTracking, testResultId]);

  // ===== cleanup session on unmount =====
  useEffect(() => {
    return () => {
      if (isTracking) endSession?.();
    };
  }, [endSession, isTracking]);

  // ===== autosave =====
  useEffect(() => {
    if (!items.length) return;
    try {
      localStorage.setItem(
        STORE_KEY,
        JSON.stringify({
          answers,
          index,
          currentAnswer,
          timeLeft,
          timestamp: Date.now(),
        })
      );
    } catch (e) {
      // ignore
    }
  }, [STORE_KEY, answers, currentAnswer, index, items.length, timeLeft]);

  // ===== timer =====
  useEffect(() => {
    if (loading || !items.length || showAnswer || isPaused || isSubmitting) return;

    timerRef.current && clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // auto submit empty
          // note: revealAnswer uses current state safely
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => timerRef.current && clearInterval(timerRef.current);
  }, [isPaused, isSubmitting, items.length, loading, showAnswer]);

  // when timeLeft hits 0 => reveal empty once
  useEffect(() => {
    if (loading || !items.length) return;
    if (timeLeft !== 0) return;
    if (showAnswer || isPaused) return;

    // time-out
    // eslint-disable-next-line
    revealAnswer("");
    // reset happens inside revealAnswer
  }, [timeLeft, loading, items.length, showAnswer, isPaused]);

  // ===== reveal answer =====
  const revealAnswer = useCallback(
    (answerText) => {
      if (!current) return;
      if (showAnswer) return;

      timerRef.current && clearInterval(timerRef.current);

      const isCorrect = checkAnswer(current, answerText, settings.mode);
      const timeSpentSec = (settings.timePerQuestion || DEFAULT_TIME_PER_QUESTION) - (timeLeft || 0);

      const nextAnswers = [...answers];
      nextAnswers[index] = {
        question: current,
        userAnswer: answerText,
        isCorrect,
        timeSpentSec: Math.max(0, timeSpentSec),
      };

      setAnswers(nextAnswers);

      const resultData = {
        isCorrect,
        correctAnswer: getCorrectAnswer(current),
        userAnswer: answerText,
        question: current,
        timeSpentSec: Math.max(0, timeSpentSec),
        questionIndex: index + 1,
        totalQuestions: items.length,
      };

      setLastAnswerResult(resultData);
      setShowAnswer(true);
      setIsPaused(true);

      recordBehavior?.("answer_submitted", {
        question_index: index,
        question_id: current?._id,
        mode: settings.mode,
        time_spent_sec: Math.max(0, timeSpentSec),
        is_correct: isCorrect,
        answer_length: (answerText || "").length,
      });

      // keep timeLeft stable
      setTimeLeft(settings.timePerQuestion || DEFAULT_TIME_PER_QUESTION);
    },
    [
      answers,
      checkAnswer,
      current,
      getCorrectAnswer,
      index,
      items.length,
      recordBehavior,
      settings.mode,
      settings.timePerQuestion,
      showAnswer,
      timeLeft,
    ]
  );

  const moveNextAfterReveal = useCallback(async () => {
    setShowAnswer(false);
    setLastAnswerResult(null);
    setIsPaused(false);

    recordBehavior?.("question_navigation", {
      from_question: index,
      to_question: index < items.length - 1 ? index + 1 : "completed",
      action: "next_after_reveal",
    });

    if (index < items.length - 1) {
      setIndex((i) => i + 1);
      setCurrentAnswer("");
      setTimeLeft(settings.timePerQuestion || DEFAULT_TIME_PER_QUESTION);
      return;
    }

    // last question => submit
    setShowSubmitConfirm(true);
  }, [index, items.length, recordBehavior, settings.timePerQuestion]);

  const handlePrev = useCallback(() => {
    if (index <= 0) return;
    pushHistory();
    setIndex((i) => i - 1);
    setCurrentAnswer("");
    setShowAnswer(false);
    setLastAnswerResult(null);
    setIsPaused(false);
    setTimeLeft(settings.timePerQuestion || DEFAULT_TIME_PER_QUESTION);

    recordBehavior?.("question_navigation", { from_question: index, to_question: index - 1, action: "manual_prev" });
  }, [index, pushHistory, recordBehavior, settings.timePerQuestion]);

  const handleNext = useCallback(() => {
    if (index >= items.length - 1) return;
    pushHistory();
    setIndex((i) => i + 1);
    setCurrentAnswer("");
    setShowAnswer(false);
    setLastAnswerResult(null);
    setIsPaused(false);
    setTimeLeft(settings.timePerQuestion || DEFAULT_TIME_PER_QUESTION);

    recordBehavior?.("question_navigation", { from_question: index, to_question: index + 1, action: "manual_next" });
  }, [index, items.length, pushHistory, recordBehavior, settings.timePerQuestion]);

  // ===== submit =====
  const completeTest = useCallback(
    async (finalAnswers) => {
      const aList = Array.isArray(finalAnswers) ? finalAnswers : answers;

      try {
        setIsSubmitting(true);

        const timeTakenMs = Date.now() - startTimeRef.current;

        const testSnapshot = {
          test_id: testId,
          test_title: testInfo?.test_title || "Vocabulary Test",
          main_topic: testInfo?.main_topic || "Vocabulary",
          sub_topic: testInfo?.sub_topic || "",
          test_type: testInfo?.test_type || "vocabulary",
          difficulty: testInfo?.difficulty || "medium",
        };

        const payload = {
          test_id: testId,
          test_snapshot: testSnapshot,
          answers: aList.map((a) => ({
            question_id: a?.question?._id || a?.question?.id,
            question_collection: "vocabularies",
            word: a?.question?.word || "",
            meaning: a?.question?.meaning || "",
            example_sentence: a?.question?.example_sentence || a?.question?.example || "",
            question_mode: settings.mode,
            correct_answer: getCorrectAnswer(a?.question),
            user_answer: a?.userAnswer ?? "",
            is_correct: !!a?.isCorrect,
            time_spent_ms: Math.max(0, (a?.timeSpentSec || 0) * 1000),
          })),
          duration_ms: timeTakenMs,
          start_time: new Date(startTimeRef.current),
          end_time: new Date(),
          status: "draft",
        };

        const finalResult = await testResultService.createTestResult(payload);

        if (isTracking) {
          try {
            await endSession?.();
          } catch (e) {
            // ignore
          }
        }

        // cleanup
        try {
          localStorage.removeItem(STORE_KEY);
          localStorage.removeItem(DRAFT_KEY);
        } catch (e) {}

        navigate(`/vocabulary/test/${testId}/result`, {
          state: {
            answers: aList,
            settings,
            testInfo,
            draftResultId: finalResult?._id || finalResult?.id,
          },
        });
      } catch (err) {
        console.error(err);
        // fallback FE
        navigate(`/vocabulary/test/${testId}/result`, {
          state: { answers: aList, settings, testInfo },
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [answers, endSession, getCorrectAnswer, isTracking, navigate, settings, testId, testInfo, DRAFT_KEY, STORE_KEY]
  );

  const submitNow = useCallback(() => setShowSubmitConfirm(true), []);

  const confirmSubmit = useCallback(async () => {
    setShowSubmitConfirm(false);

    recordBehavior?.("test_submission", {
      action: "submit",
      current_question: index,
      total_questions: items.length,
      answered_questions: answers.filter(Boolean).length,
    });

    // fill blanks
    const remain = [...answers];
    for (let i = 0; i < items.length; i++) {
      if (!remain[i]) remain[i] = { question: items[i], userAnswer: "", isCorrect: false, timeSpentSec: 0 };
    }
    setAnswers(remain);
    await completeTest(remain);
  }, [answers, completeTest, index, items, recordBehavior]);

  // ===== keyboard shortcuts (global) =====
  useEffect(() => {
    const onKeyDown = (e) => {
      // ignore shortcuts when modal open
      if (showExitConfirm || showSubmitConfirm) return;

      // ignore when typing input (we handle Enter in input itself)
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") {
        // still allow arrows & P maybe? skip
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      }
      if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        if (current?.word) playAudio(current.word);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [current?.word, handleNext, handlePrev, playAudio, showExitConfirm, showSubmitConfirm]);

  // ===== exit =====
  const handleExit = () => setShowExitConfirm(true);
  const confirmExit = useCallback(() => {
    setShowExitConfirm(false);
    try {
      localStorage.removeItem(STORE_KEY);
      localStorage.removeItem(DRAFT_KEY);
    } catch (e) {}
    navigate(-1);
  }, [DRAFT_KEY, STORE_KEY, navigate]);

  const cancelExit = () => setShowExitConfirm(false);

  // ===== UI stats =====
  if (loading) return <LoadingSpinner message="Đang tải câu hỏi..." />;
  if (error) return <ErrorMessage error={error} onRetry={() => window.location.reload()} />;
  if (!items.length) return <ErrorMessage error="Không có câu hỏi nào." />;

  const progressDone = answers.filter(Boolean).length;
  const progressPct = items.length ? Math.round((progressDone / items.length) * 100) : 0;
  const correctSoFar = answers.filter((a) => a?.isCorrect).length;
  const wrongSoFar = answers.filter((a) => a && !a.isCorrect).length;

  const topHint =
    settings.mode === "word_to_meaning"
      ? "Nhập nghĩa tiếng Việt."
      : settings.mode === "meaning_to_word"
      ? "Nhập từ tiếng Anh."
      : "Bấm nghe, rồi gõ từ bạn nghe được.";

  return (
    <TestLayout
      testTitle={testInfo?.test_title || "Bài test từ vựng"}
      currentQuestion={index}
      totalQuestions={items.length}
      timeLeft={timeLeft}
      timePerQuestion={settings.timePerQuestion || DEFAULT_TIME_PER_QUESTION}
      onExit={handleExit}
    >
      <div className="min-h-[calc(100svh-136px)] bg-zinc-50">
        <div className="mx-auto w-full max-w-7xl px-3 md:px-4 py-3">
          {/* TOP BAR */}
          <div className="mb-3 hidden sm:flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 shadow-sm">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                {modeLabel(settings.mode)}
              </span>

              <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 shadow-sm">
                ⏱️ {timeLeft}s
              </span>

              <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 shadow-sm">
                📌 Câu {index + 1}/{items.length}
              </span>

              <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 shadow-sm">
                ✅ {correctSoFar} • ❌ {wrongSoFar}
              </span>

              <span
                className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm"
                title="Tiến trình được lưu tự động"
              >
                💾 Tự động lưu
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden md:block text-xs text-zinc-600 font-medium">{topHint}</div>
              <span className="hidden sm:inline text-xs text-zinc-500 font-medium">
                (Enter: kiểm tra/tiếp tục • Shift+Enter: bỏ qua • ←→: điều hướng • P: phát âm)
              </span>
            </div>
          </div>

          {/* MAIN GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* LEFT */}
            <div className="lg:col-span-2 flex flex-col">
              <div className="relative rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_10%_0%,rgba(124,58,237,0.08),transparent)]" />
                <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_90%_100%,rgba(16,185,129,0.06),transparent)]" />

                <div className="relative p-4 sm:p-5">
                  {/* header row */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white">
                      {modeBadge(settings.mode)}
                    </span>

                    <div className="w-28 sm:w-44">
                      <div className="h-2 rounded-full bg-zinc-200 overflow-hidden">
                        <div className="h-full bg-violet-600" style={{ width: `${progressPct}%` }} />
                      </div>
                      <div className="mt-1 text-[11px] text-zinc-600 font-medium text-right">{progressPct}% hoàn thành</div>
                    </div>
                  </div>

                  {/* prompt */}
                  <div className="mt-6 text-center">
                    {settings.mode === "word_to_meaning" && (
                      <>
                        <div className="flex items-center justify-center gap-2">
                          <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight">
                            {current?.word}
                          </h2>
                          <button
                            onClick={() => playAudio(current?.word)}
                            disabled={isPlaying}
                            className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white p-2 text-zinc-700 shadow-sm hover:bg-zinc-50 disabled:opacity-50"
                            title="Phát âm (P)"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M6 10v4a1 1 0 001 1h1l4 4V5l-4 4H7a1 1 0 00-1 1z"
                              />
                            </svg>
                          </button>
                        </div>
                        <p className="mt-2 text-sm text-zinc-600">Nhập nghĩa tiếng Việt cho từ trên.</p>
                      </>
                    )}

                    {settings.mode === "meaning_to_word" && (
                      <>
                        <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-900 leading-relaxed">
                          {current?.meaning}
                        </h2>
                        <p className="mt-2 text-sm text-zinc-600">Nhập từ tiếng Anh phù hợp.</p>
                      </>
                    )}

                    {settings.mode === "listen_and_type" && (
                      <>
                        <div className="flex items-center justify-center gap-3">
                          <button
                            onClick={() => playAudio(current?.word)}
                            disabled={isPlaying}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg hover:opacity-95 disabled:opacity-50"
                          >
                            🔊 {isPlaying ? "Đang phát..." : "Nghe từ"}
                          </button>
                          {!!current?.example_sentence && (
                            <button
                              onClick={() => playAudio(current?.example_sentence)}
                              disabled={isPlaying}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-700 shadow-lg hover:bg-zinc-50 disabled:opacity-50"
                            >
                              📖 Nghe câu
                            </button>
                          )}
                        </div>
                        <p className="mt-2 text-sm text-zinc-600">Nghe và gõ từ bạn nghe được.</p>
                      </>
                    )}
                  </div>

                  {/* input */}
                  <div className="mt-6">
                    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-3 sm:p-4">
                      <input
                        type="text"
                        value={currentAnswer}
                        onChange={(e) => setCurrentAnswer(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && e.shiftKey) {
                            e.preventDefault();
                            if (!showAnswer && !isSubmitting) revealAnswer("");
                            return;
                          }
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (showAnswer) moveNextAfterReveal();
                            else if (!isSubmitting) revealAnswer(currentAnswer);
                          }
                        }}
                        placeholder={
                          settings.mode === "word_to_meaning"
                            ? "Gõ nghĩa tiếng Việt..."
                            : settings.mode === "meaning_to_word"
                            ? "Gõ từ tiếng Anh..."
                            : "Gõ từ tiếng Anh bạn nghe được..."
                        }
                        className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-violet-500"
                        disabled={showAnswer || isSubmitting}
                        autoFocus
                      />

                      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                        <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm">
                          ⏱️ {timeLeft}s còn lại
                        </span>

                        <span className="hidden sm:inline text-[11px] text-zinc-500 font-medium">
                          (Enter: kiểm tra/tiếp tục • Shift+Enter: bỏ qua)
                        </span>
                      </div>
                    </div>

                    {/* result panel */}
                    {showAnswer && lastAnswerResult && (
                      <div
                        className={`mt-4 rounded-2xl border p-4 shadow-sm ${
                          lastAnswerResult.isCorrect ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div
                              className={`h-10 w-10 rounded-2xl flex items-center justify-center text-white font-extrabold ${
                                lastAnswerResult.isCorrect ? "bg-emerald-600" : "bg-rose-600"
                              }`}
                            >
                              {lastAnswerResult.isCorrect ? "✓" : "✗"}
                            </div>

                            <div>
                              <div
                                className={`font-extrabold ${
                                  lastAnswerResult.isCorrect ? "text-emerald-800" : "text-rose-800"
                                }`}
                              >
                                {lastAnswerResult.isCorrect ? "Chính xác!" : "Chưa đúng"}
                              </div>

                              {!lastAnswerResult.isCorrect && (
                                <div className="mt-1 text-sm text-rose-800">
                                  Đáp án đúng:{" "}
                                  <span className="font-extrabold">{lastAnswerResult.correctAnswer}</span>
                                </div>
                              )}

                              {lastAnswerResult.userAnswer?.trim() && (
                                <div className="mt-1 text-xs text-zinc-700">
                                  Bạn nhập: <span className="font-semibold">{lastAnswerResult.userAnswer}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={moveNextAfterReveal}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-violet-700"
                            disabled={isSubmitting}
                          >
                            {index === items.length - 1 ? "Hoàn thành" : "Tiếp tục"} →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="mt-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => revealAnswer(currentAnswer)}
                    disabled={showAnswer || isSubmitting || (!currentAnswer.trim() && settings.mode !== "listen_and_type")}
                    className="w-full inline-flex items-center justify-center rounded-xl bg-violet-600 px-3 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"
                  >
                    Kiểm tra
                  </button>

                  <button
                    type="button"
                    onClick={() => revealAnswer("")}
                    disabled={showAnswer || isSubmitting}
                    className="w-full inline-flex items-center justify-center rounded-xl bg-zinc-900 px-3 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50"
                  >
                    Bỏ qua
                  </button>

                  <button
                    type="button"
                    onClick={submitNow}
                    disabled={isSubmitting}
                    className="w-full inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-3 py-3 text-sm font-extrabold text-white shadow-lg hover:opacity-95 disabled:opacity-60"
                  >
                    Nộp bài
                  </button>
                </div>

                <div className="mt-2 hidden sm:grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={index <= 0 || isSubmitting}
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-2 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 disabled:opacity-50"
                    title="Câu trước (←)"
                  >
                    ← Trước
                  </button>

                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={index >= items.length - 1 || isSubmitting}
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-2 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 disabled:opacity-50"
                    title="Câu sau (→)"
                  >
                    Sau →
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div className="lg:col-span-1 hidden lg:block">
              <div className="space-y-3">
                {/* Voice */}
                <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-extrabold text-zinc-900">Giọng đọc</h3>
                      <p className="text-xs text-zinc-600 mt-0.5">Áp dụng ngay khi bấm “Nghe”.</p>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                      {availableVoices.filter((v) => v.lang?.startsWith("en")).length} EN
                    </span>
                  </div>

                  <select
                    value={voiceId}
                    onChange={(e) => {
                      setVoiceId(e.target.value);
                      localStorage.setItem(`vocab_voice_${testId}`, e.target.value);
                      showToastMsg("Đã đổi giọng đọc", "success");
                    }}
                    className="mt-3 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500"
                  >
                    {VOICE_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.flag} {p.label}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => playAudio(current?.word || "hello")}
                    disabled={isPlaying}
                    className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-bold text-zinc-800 shadow-sm hover:bg-zinc-50 disabled:opacity-50"
                  >
                    🔈 Nghe thử
                  </button>
                </div>

                {/* Progress */}
                <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-zinc-900">Tiến độ</h3>
                    <span className="text-xs font-semibold text-zinc-600">
                      {progressDone}/{items.length}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-10 gap-1.5">
                    {items.map((_, idx) => {
                      const st = answeredState(idx);
                      const isCurrent = idx === index;

                      const base =
                        st === "correct"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                          : st === "wrong"
                          ? "bg-rose-100 text-rose-800 border-rose-200"
                          : "bg-zinc-100 text-zinc-700 border-zinc-200";

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            pushHistory();
                            setIndex(idx);
                            setCurrentAnswer("");
                            setShowAnswer(false);
                            setLastAnswerResult(null);
                            setIsPaused(false);
                            setTimeLeft(settings.timePerQuestion || DEFAULT_TIME_PER_QUESTION);
                          }}
                          className={`w-7 h-7 rounded-lg border ${base} flex items-center justify-center text-[10px] font-semibold transition ${
                            isCurrent ? "ring-2 ring-violet-400 ring-offset-1" : "hover:opacity-90"
                          }`}
                          disabled={isSubmitting}
                          title={`Câu ${idx + 1}${st === "correct" ? " ✓" : st === "wrong" ? " ✗" : ""}`}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3 rounded-xl bg-zinc-50 p-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-zinc-700">
                      <span>Hoàn thành</span>
                      <span>{progressPct}%</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-zinc-200 overflow-hidden">
                      <div className="h-full bg-violet-600" style={{ width: `${progressPct}%` }} />
                    </div>

                    <div className="mt-2 flex items-center gap-3 text-[11px] text-zinc-600 font-medium">
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" /> Đúng: {correctSoFar}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-rose-500" /> Sai: {wrongSoFar}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* EXIT CONFIRM */}
          {showExitConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full mx-4 border border-zinc-200">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-extrabold">
                    !
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-zinc-900">Xác nhận thoát</h3>
                    <p className="text-sm text-zinc-600 mt-1">Bạn có chắc chắn muốn thoát? Tiến trình sẽ bị xóa.</p>
                  </div>
                </div>

                <div className="mt-5 flex justify-end gap-2">
                  <button
                    onClick={cancelExit}
                    className="px-4 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-700 font-semibold hover:bg-zinc-50"
                  >
                    Tiếp tục
                  </button>
                  <button onClick={confirmExit} className="px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700">
                    Thoát
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SUBMIT CONFIRM */}
          {showSubmitConfirm && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-zinc-200 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Hoàn thành bài thi</h2>
                      <p className="text-blue-100 text-sm mt-1">Xác nhận nộp bài của bạn</p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="space-y-4">
                    {/* Progress Summary */}
                    <div className="bg-zinc-50 rounded-2xl p-4">
                      <h3 className="text-sm font-bold text-zinc-900 mb-3">Tóm tắt tiến độ</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{answers.filter(Boolean).length}</div>
                          <div className="text-xs text-zinc-600">Đã trả lời</div>
                          <div className="text-xs text-zinc-500">/{items.length} câu</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{correctSoFar}</div>
                          <div className="text-xs text-zinc-600">Đúng</div>
                          <div className="text-xs text-zinc-500">{wrongSoFar} sai</div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-4">
                        <div className="flex justify-between text-xs text-zinc-600 mb-1">
                          <span>Hoàn thành</span>
                          <span>{progressPct}%</span>
                        </div>
                        <div className="h-2 bg-zinc-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Warning */}
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-orange-800">Lưu ý quan trọng</p>
                          <p className="text-xs text-orange-700 mt-1">
                            Các câu chưa trả lời sẽ được tính là sai. Bạn có thể quay lại làm bài sau khi nộp.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={() => setShowSubmitConfirm(false)}
                      disabled={isSubmitting}
                      className="flex-1 px-4 py-3 rounded-xl border-2 border-zinc-200 bg-white text-zinc-700 font-semibold hover:bg-zinc-50 disabled:opacity-50 transition-colors"
                    >
                      Quay lại làm bài
                    </button>
                    <button
                      onClick={confirmSubmit}
                      disabled={isSubmitting}
                      className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Đang nộp...
                        </div>
                      ) : (
                        "Nộp bài ngay"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TOAST */}
          <Toast
            isVisible={toast.show}
            message={toast.message}
            type={toast.type}
            onClose={() => setToast({ show: false, message: "", type: "info" })}
          />
        </div>
      </div>
    </TestLayout>
  );
};

export default VocabularyTestTake;
