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

const DEFAULT_TOTAL_QUESTIONS = 10;
const DEFAULT_TIME_PER_QUESTION = 30;

const shuffleArray = (arr) => {
  const a = [...(arr || [])];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const sanitizeSettings = (raw = {}) => {
  const modeRaw = raw?.mode || "word_to_meaning";
  // Đã bỏ "listen_and_type" — tự chuyển sang nghe câu / viết câu
  const normalizedRaw =
    modeRaw === "listen_and_type" ? "listen_and_write_sentence" : modeRaw;
  const mode =
    normalizedRaw === "word_to_meaning" ||
    normalizedRaw === "meaning_to_word" ||
    normalizedRaw === "listen_and_write_sentence"
      ? normalizedRaw
      : "word_to_meaning";

  const totalQuestions =
    Number.isFinite(raw?.totalQuestions) && raw.totalQuestions > 0
      ? raw.totalQuestions
      : DEFAULT_TOTAL_QUESTIONS;

  const timePerQuestion =
    Number.isFinite(raw?.timePerQuestion) && raw.timePerQuestion > 0
      ? raw.timePerQuestion
      : DEFAULT_TIME_PER_QUESTION;

  const shuffleQuestions =
    raw?.shuffleQuestions === true || raw?.shuffleQuestions === "true"
      ? true
      : raw?.shuffleQuestions === false || raw?.shuffleQuestions === "false"
      ? false
      : true;

  return {
    mode,
    totalQuestions,
    timePerQuestion,
    showAnswerMode: "after_each",
    shuffleQuestions,
  };
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

/** Giá trị option ổn định cho từng giọng (voiceURI hoặc name::lang). */
const voiceRowValue = (v) => (v && (v.voiceURI || `${v.name}::${v.lang}`)) || "";

const modeLabel = (mode) => {
  if (mode === "word_to_meaning") return "Từ → Nghĩa";
  if (mode === "meaning_to_word") return "Nghĩa → Từ";
  if (mode === "listen_and_write_sentence") return "Nghe câu & Viết câu";
  return "Từ vựng";
};

const modeBadge = (mode) => {
  if (mode === "word_to_meaning") return "Đưa từ đoán nghĩa";
  if (mode === "meaning_to_word") return "Đưa nghĩa đoán từ";
  if (mode === "listen_and_write_sentence") return "Nghe và viết câu";
  return "Từ vựng";
};

const normalize = (s) =>
  (s || "")
    .toString()
    .normalize("NFC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

// Relaxed match for Vietnamese typing variants, e.g. "xóa" vs "xoá".
// We keep this only for single-word/meaning checks, not sentence dictation mode.
const foldVietnameseForCompare = (s) =>
  normalize(s)
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .replace(/đ/g, "d");

const isEquivalentAnswer = (a, b) => {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  return foldVietnameseForCompare(na) === foldVietnameseForCompare(nb);
};

/** Đáp án có thể ghi nhiều nghĩa cách nhau bởi dấu phẩy (vd: "bắt buộc, ràng buộc"). */
const splitAnswerAlternatives = (text) => {
  if (text == null || String(text).trim() === "") return [];
  return String(text)
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
};

const stripParenthetical = (text) =>
  String(text || "")
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const buildAnswerVariants = (text) => {
  const base = normalize(text);
  const noParen = normalize(stripParenthetical(text));
  if (!base && !noParen) return [""];
  if (base && noParen && base !== noParen) return [base, noParen];
  return [base || noParen];
};

/** Đúng nếu người dùng khớp ít nhất một phần sau khi tách theo dấu phẩy. */
const userMatchesCommaSeparated = (userAnswerText, correctText) => {
  const parts = splitAnswerAlternatives(correctText);
  if (parts.length === 0) return normalize(userAnswerText) === "";

  const userVariants = buildAnswerVariants(userAnswerText);
  return parts.some((p) => {
    const correctVariants = buildAnswerVariants(p);
    return correctVariants.some((cv) => userVariants.some((uv) => isEquivalentAnswer(cv, uv)));
  });
};

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
      if (settings.mode === "listen_and_write_sentence") return item.example_sentence || "";
      return "";
    },
    [settings.mode]
  );

  const checkAnswer = useCallback((item, answer, mode) => {
    if (!item) return false;
    const ua = normalize(answer);
    // Câu ví dụ tiếng Anh thường có dấu phẩy → chỉ so khớp nguyên chuỗi
    if (mode === "listen_and_write_sentence") return ua === normalize(item.example_sentence);
    if (mode === "word_to_meaning") return userMatchesCommaSeparated(answer, item.meaning);
    if (mode === "meaning_to_word") return userMatchesCommaSeparated(answer, item.word);
    return false;
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

  const englishVoices = useMemo(() => {
    const list = (availableVoices || []).filter((v) =>
      (v.lang || "").toLowerCase().startsWith("en")
    );
    return [...list].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  }, [availableVoices]);

  const pickVoice = useCallback(() => {
    if (!voiceId) return null;
    const voices = speechSynthesis.getVoices() || [];

    const byKey = voices.find((v) => voiceRowValue(v) === voiceId);
    if (byKey) return byKey;

    const preset = VOICE_PRESETS.find((p) => p.id === voiceId);
    const prefix = preset?.prefix || "";

    const byPrefix = prefix ? voices.find((v) => v.lang?.startsWith(prefix)) : null;
    if (byPrefix) return byPrefix;

    return voices.find((v) => v.lang?.startsWith("en")) || null;
  }, [voiceId]);

  const voiceSelectOptions = useMemo(
    () => (
      <>
        <option value="">🔊 Giọng mặc định (trình duyệt tự chọn)</option>
        <optgroup label="Gợi ý theo vùng">
          {VOICE_PRESETS.filter((p) => p.id).map((p) => (
            <option key={p.id} value={p.id}>
              {p.flag} {p.label}
            </option>
          ))}
        </optgroup>
        {englishVoices.length > 0 ? (
          <optgroup label={`Tất cả giọng tiếng Anh (${englishVoices.length})`}>
            {englishVoices.map((v, i) => {
              const val = voiceRowValue(v);
              if (!val) return null;
              return (
                <option key={val || `v-${i}`} value={val}>
                  {v.name} — {v.lang}
                </option>
              );
            })}
          </optgroup>
        ) : null}
      </>
    ),
    [englishVoices]
  );

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

      speechSynthesis.speak(u);
    },
    [current?._id, index, isPlaying, pickVoice, voiceId]
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

        const shuffled = settings.shuffleQuestions ? shuffleArray(vocab) : [...vocab];
        const maxQ = Math.min(settings.totalQuestions || DEFAULT_TOTAL_QUESTIONS, shuffled.length);

        const selected = shuffled.slice(0, maxQ).map((it, i) => ({
          ...it,
          questionNumber: i + 1,
        }));

        setItems(selected);

        // Debug: Log vocabulary data to check if part_of_speech and cefr_level are present
        console.log('🔍 Vocabulary data loaded:', selected.map(v => ({
          word: v.word,
          part_of_speech: v.part_of_speech,
          cefr_level: v.cefr_level
        })));

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

    if (index < items.length - 1) {
      setIndex((i) => i + 1);
      setCurrentAnswer("");
      setTimeLeft(settings.timePerQuestion || DEFAULT_TIME_PER_QUESTION);
      return;
    }

    // last question => submit
    setShowSubmitConfirm(true);
  }, [index, items.length, settings.timePerQuestion]);

  const handlePrev = useCallback(() => {
    if (index <= 0) return;
    pushHistory();
    setIndex((i) => i - 1);
    setCurrentAnswer("");
    setShowAnswer(false);
    setLastAnswerResult(null);
    setIsPaused(false);
    setTimeLeft(settings.timePerQuestion || DEFAULT_TIME_PER_QUESTION);

  }, [index, pushHistory, settings.timePerQuestion]);

  const handleNext = useCallback(() => {
    if (index >= items.length - 1) return;
    pushHistory();
    setIndex((i) => i + 1);
    setCurrentAnswer("");
    setShowAnswer(false);
    setLastAnswerResult(null);
    setIsPaused(false);
    setTimeLeft(settings.timePerQuestion || DEFAULT_TIME_PER_QUESTION);

  }, [index, items.length, pushHistory, settings.timePerQuestion]);

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
    [answers, getCorrectAnswer, navigate, settings, testId, testInfo, DRAFT_KEY, STORE_KEY]
  );

  const submitNow = useCallback(() => setShowSubmitConfirm(true), []);

  const confirmSubmit = useCallback(async () => {
    setShowSubmitConfirm(false);

    // fill blanks
    const remain = [...answers];
    for (let i = 0; i < items.length; i++) {
      if (!remain[i]) remain[i] = { question: items[i], userAnswer: "", isCorrect: false, timeSpentSec: 0 };
    }
    setAnswers(remain);
    await completeTest(remain);
  }, [answers, completeTest, index, items]);

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
        if (settings.mode === "listen_and_write_sentence" && current?.example_sentence) {
          playAudio(current.example_sentence);
        } else if (current?.word) {
          playAudio(current.word);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [current?.word, current?.example_sentence, settings.mode, handleNext, handlePrev, playAudio, showExitConfirm, showSubmitConfirm]);

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
  const timeWarnLevel =
    timeLeft <= 5 ? "danger" : timeLeft <= 10 ? "warn" : "normal";

  const topHint =
    settings.mode === "word_to_meaning"
      ? "Nhập nghĩa tiếng Việt."
      : settings.mode === "meaning_to_word"
      ? "Nhập từ tiếng Anh. Bấm «Nghe phát âm từ tiếng Anh» hoặc Alt+P trong ô nhập."
      : settings.mode === "listen_and_write_sentence"
      ? "Bấm nghe câu, rồi viết lại câu bạn nghe được."
      : "Nhập câu trả lời.";

  return (
    <TestLayout
      testTitle={testInfo?.test_title || "Bài test từ vựng"}
      currentQuestion={index}
      totalQuestions={items.length}
      timeLeft={timeLeft}
      timePerQuestion={settings.timePerQuestion || DEFAULT_TIME_PER_QUESTION}
      onExit={handleExit}
      maxWidth="full"
      hideHeader
      containerClassName="!px-3 !pt-4 !pb-20 sm:!px-4 sm:!pt-5 sm:!pb-20 lg:!px-5 lg:!pb-4 flex flex-col flex-1 min-h-0 bg-gradient-to-br from-sky-200 via-blue-100 to-emerald-200"
    >
      <div className="flex flex-col flex-1 min-h-0 w-full bg-gradient-to-b from-sky-100/80 to-blue-50/90">
        <div className="w-full max-w-full flex-1 flex flex-col min-h-0 px-0 py-0">
          {/* TOP BAR */}
          <div className="mb-2 flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-violet-800 bg-violet-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-md">
                <span className="inline-flex h-2 w-2 rounded-full bg-lime-400" />
                {modeLabel(settings.mode)}
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-sky-800 bg-sky-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-md">
                📌 {index + 1}/{items.length}
              </span>

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
                ⏱️ <span className="tabular-nums">{timeLeft}s</span>
              </span>

              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border-2 border-emerald-800 bg-emerald-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-md">
                ✅ {correctSoFar} • ❌ {wrongSoFar}
              </span>

              <span
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full border-2 border-lime-700 bg-lime-500 px-2.5 py-0.5 text-[11px] font-bold text-lime-950 shadow-md"
                title="Tiến trình được lưu tự động"
              >
                💾 Tự động lưu
              </span>
            </div>

            <div className="hidden md:flex items-center gap-1.5 min-w-0">
              <div className="text-[11px] text-slate-900 font-bold truncate max-w-[min(100%,28rem)]">{topHint}</div>
              <span className="hidden lg:inline text-[10px] text-slate-800 font-bold shrink-0">
                (Enter: kiểm tra/tiếp tục • Shift+Enter: bỏ qua • ←→: điều hướng • P / Alt+P: phát âm)
              </span>
            </div>
          </div>

          {/* MAIN GRID — flex-1 để kéo cao theo màn hình, cột đều nhau trên desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4 flex-1 min-h-0 lg:items-stretch lg:grid-rows-1">
            {/* LEFT */}
            <div className="lg:col-span-2 flex flex-col min-w-0 min-h-0 flex-1">
              <div className="relative rounded-xl border-[3px] border-indigo-400 bg-white shadow-xl shadow-indigo-200/60 overflow-hidden flex flex-col flex-1 min-h-0 ring-2 ring-indigo-200/80">
                <div className="relative p-3 sm:p-4 md:p-5 flex flex-col flex-1 min-h-0">
                  {/* header row */}
                  <div className="flex items-center justify-between gap-2 shrink-0">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-700 px-2.5 py-1 text-[10px] sm:text-[11px] font-bold text-white shadow-md">
                      {modeBadge(settings.mode)}
                    </span>

                    <div className="w-24 sm:w-36 shrink-0">
                      <div className="h-2 rounded-full bg-indigo-300 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-600 to-blue-600" style={{ width: `${progressPct}%` }} />
                      </div>
                      <div className="mt-0.5 text-[10px] text-indigo-900 font-bold text-right">{progressPct}% hoàn thành</div>
                    </div>
                  </div>

                  {/* prompt — vùng giữa co giãn, căn giữa theo chiều dọc cho vừa màn hình */}
                  <div className="flex-1 flex flex-col justify-center min-h-0 py-2 sm:py-4 overflow-y-auto">
                    <div className="text-center w-full max-w-2xl mx-auto">
                    {settings.mode === "word_to_meaning" && (
                      <>
                        <div className="flex items-center justify-center gap-1.5">
                          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                            {current?.word}
                          </h2>
                          <button
                            onClick={() => playAudio(current?.word)}
                            disabled={isPlaying}
                            className="inline-flex items-center justify-center rounded-full border-2 border-violet-800 bg-violet-600 p-1.5 text-white shadow-md hover:bg-violet-500 disabled:opacity-50"
                            title="Phát âm (P)"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M6 10v4a1 1 0 001 1h1l4 4V5l-4 4H7a1 1 0 00-1 1z"
                              />
                            </svg>
                          </button>
                        </div>
                        <p className="mt-1 text-xs text-indigo-900 font-bold">Nhập nghĩa tiếng Việt cho từ trên.</p>
                        
                        {/* Show part of speech and CEFR level badges */}
                        {current && (
                          <div className="mt-2 flex justify-center flex-wrap gap-1.5">
                            {current.part_of_speech ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white shadow-sm ">
                                {current.part_of_speech === 'noun' ? 'Danh từ' :
                                 current.part_of_speech === 'verb' ? 'Động từ' :
                                 current.part_of_speech === 'adjective' ? 'Tính từ' :
                                 current.part_of_speech === 'adverb' ? 'Trạng từ' :
                                 current.part_of_speech === 'preposition' ? 'Giới từ' :
                                 current.part_of_speech === 'conjunction' ? 'Liên từ' :
                                 current.part_of_speech === 'pronoun' ? 'Đại từ' :
                                 current.part_of_speech === 'interjection' ? 'Thán từ' :
                                 current.part_of_speech}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-600 text-white shadow-sm ">
                                Chưa có loại từ
                              </span>
                            )}
                            {current.cefr_level ? (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                ['A1', 'A2'].includes(current.cefr_level) ? 'bg-green-600 text-white shadow-sm ' :
                                ['B1', 'B2'].includes(current.cefr_level) ? 'bg-amber-500 text-amber-950 shadow-sm ' :
                                ['C1', 'C2'].includes(current.cefr_level) ? 'bg-red-600 text-white shadow-sm ' :
                                'bg-purple-600 text-white shadow-sm '
                              }`}>
                                CEFR {current.cefr_level}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-600 text-white shadow-sm ">
                                Chưa có CEFR
                              </span>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    {settings.mode === "meaning_to_word" && (
                      <>
                        <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug px-1">
                          {current?.meaning}
                        </h2>
                        <p className="mt-1 text-xs text-indigo-900 font-bold">Nhập từ tiếng Anh phù hợp.</p>

                        <div className="mt-2 flex flex-col items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => playAudio(current?.word)}
                            disabled={isPlaying || !current?.word}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-700 hover:bg-blue-600 px-3 py-1.5 text-xs font-extrabold text-white shadow-lg border-2 border-blue-900 disabled:opacity-50"
                          >
                            🔊 <span className="sm:hidden">{isPlaying ? "Đang phát..." : "Nghe từ (EN)"}</span>
                            <span className="hidden sm:inline">{isPlaying ? "Đang phát..." : "Nghe phát âm từ tiếng Anh"}</span>
                          </button>
                          <p className="text-[10px] text-slate-600 max-w-md text-center leading-tight font-semibold">
                            Phát âm theo đáp án — luyện nghe / gợi ý.
                          </p>
                        </div>
                        
                        {/* Show part of speech and CEFR level badges */}
                        {current && (
                          <div className="mt-2 flex justify-center flex-wrap gap-1.5">
                            {current.part_of_speech ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white shadow-sm ">
                                {current.part_of_speech === 'noun' ? 'Danh từ' :
                                 current.part_of_speech === 'verb' ? 'Động từ' :
                                 current.part_of_speech === 'adjective' ? 'Tính từ' :
                                 current.part_of_speech === 'adverb' ? 'Trạng từ' :
                                 current.part_of_speech === 'preposition' ? 'Giới từ' :
                                 current.part_of_speech === 'conjunction' ? 'Liên từ' :
                                 current.part_of_speech === 'pronoun' ? 'Đại từ' :
                                 current.part_of_speech === 'interjection' ? 'Thán từ' :
                                 current.part_of_speech}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-600 text-white shadow-sm ">
                                Chưa có loại từ
                              </span>
                            )}
                            {current.cefr_level ? (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                ['A1', 'A2'].includes(current.cefr_level) ? 'bg-green-600 text-white shadow-sm ' :
                                ['B1', 'B2'].includes(current.cefr_level) ? 'bg-amber-500 text-amber-950 shadow-sm ' :
                                ['C1', 'C2'].includes(current.cefr_level) ? 'bg-red-600 text-white shadow-sm ' :
                                'bg-purple-600 text-white shadow-sm '
                              }`}>
                                CEFR {current.cefr_level}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-600 text-white shadow-sm ">
                                Chưa có CEFR
                              </span>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    {settings.mode === "listen_and_write_sentence" && (
                      <>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <button
                            onClick={() => playAudio(current?.example_sentence)}
                            disabled={isPlaying || !current?.example_sentence}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 px-3 py-1.5 text-xs font-extrabold text-white shadow-lg border-2 border-emerald-900 disabled:opacity-50"
                          >
                            🔊 {isPlaying ? "Đang phát..." : "Nghe câu"}
                          </button>
                          {!current?.example_sentence && (
                            <span className="text-xs text-slate-600">Không có câu ví dụ</span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-indigo-900 font-bold">Nghe câu và viết lại câu bạn nghe được.</p>
                        
                        {/* Show word and meaning for context */}
                        {current && (
                          <div className="mt-2 flex justify-center flex-wrap gap-1.5">
                            {current.word && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white shadow-sm ">
                                Từ: {current.word}
                              </span>
                            )}
                            {current.meaning && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-sm ">
                                Nghĩa: {current.meaning}
                              </span>
                            )}
                            {current.cefr_level && (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                ['A1', 'A2'].includes(current.cefr_level) ? 'bg-green-600 text-white shadow-sm ' :
                                ['B1', 'B2'].includes(current.cefr_level) ? 'bg-amber-500 text-amber-950 shadow-sm ' :
                                ['C1', 'C2'].includes(current.cefr_level) ? 'bg-red-600 text-white shadow-sm ' :
                                'bg-purple-600 text-white shadow-sm '
                              }`}>
                                CEFR {current.cefr_level}
                              </span>
                            )}
                          </div>
                        )}
                      </>
                    )}
                    </div>
                  </div>

                  {/* input */}
                  <div className="mt-2 shrink-0">
                    <div className="rounded-xl border-[3px] border-emerald-600 bg-emerald-200/90 shadow-lg p-3 sm:p-4 ring-2 ring-emerald-400/60">
                      <input
                        type="text"
                        value={currentAnswer}
                        onChange={(e) => setCurrentAnswer(e.target.value)}
                        onKeyDown={(e) => {
                          if ((e.key === "p" || e.key === "P") && e.altKey) {
                            e.preventDefault();
                            if (settings.mode === "listen_and_write_sentence" && current?.example_sentence) {
                              playAudio(current.example_sentence);
                            } else if (current?.word) {
                              playAudio(current.word);
                            }
                            return;
                          }
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
                            : "Viết lại câu tiếng Anh bạn nghe được..."
                        }
                        className="w-full rounded-lg border-2 border-indigo-600 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 placeholder:text-emerald-700 outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-400/50 disabled:opacity-60 read-only:bg-emerald-100"
                        disabled={isSubmitting}
                        readOnly={showAnswer}
                        autoFocus
                      />

                      <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-cyan-800 bg-cyan-600 px-2.5 py-0.5 text-[11px] font-extrabold text-white shadow-md">
                          ⏱️ {timeLeft}s còn lại
                        </span>

                        <span className="hidden sm:inline text-[11px] text-slate-900 font-bold">
                          {settings.mode === "meaning_to_word" || settings.mode === "word_to_meaning"
                            ? "(Enter: kiểm tra/tiếp tục • Shift+Enter: bỏ qua • Alt+P: phát âm)"
                            : settings.mode === "listen_and_write_sentence"
                            ? "(Enter: kiểm tra/tiếp tục • Shift+Enter: bỏ qua • Alt+P: nghe câu)"
                            : "(Enter: kiểm tra/tiếp tục • Shift+Enter: bỏ qua)"}
                        </span>
                      </div>
                    </div>

                    {/* result panel */}
                    {showAnswer && lastAnswerResult && (
                      <div
                        className={`mt-2 rounded-xl border-[3px] p-3 sm:p-4 shadow-lg ${
                          lastAnswerResult.isCorrect
                            ? "border-emerald-700 bg-emerald-200 text-emerald-950 ring-2 ring-emerald-400"
                            : "border-rose-700 bg-rose-200 text-rose-950 ring-2 ring-rose-400"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="flex items-start gap-2 min-w-0">
                            <div
                              className={`h-8 w-8 rounded-xl flex items-center justify-center text-white text-sm font-extrabold shrink-0 ${
                                lastAnswerResult.isCorrect ? "bg-emerald-700 ring-2 ring-emerald-900" : "bg-rose-700 ring-2 ring-rose-900"
                              }`}
                            >
                              {lastAnswerResult.isCorrect ? "✓" : "✗"}
                            </div>

                            <div className="min-w-0">
                              <div
                                className={`text-sm font-extrabold ${
                                  lastAnswerResult.isCorrect ? "text-emerald-900" : "text-rose-900"
                                }`}
                              >
                                {lastAnswerResult.isCorrect ? "Chính xác!" : "Chưa đúng"}
                              </div>

                              {!lastAnswerResult.isCorrect && (
                                <div className="mt-0.5 text-xs text-rose-900 break-words font-semibold">
                                  Đáp án đúng:{" "}
                                  <span className="font-extrabold text-rose-950">{lastAnswerResult.correctAnswer}</span>
                                </div>
                              )}

                              {lastAnswerResult.userAnswer?.trim() && (
                                <div className="mt-0.5 text-[11px] text-indigo-900 font-bold">
                                  Bạn nhập: <span className="font-extrabold">{lastAnswerResult.userAnswer}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={moveNextAfterReveal}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-700 px-3 py-2 text-xs font-extrabold text-white shadow-lg border-2 border-blue-900 hover:bg-blue-600 shrink-0"
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

              {/* Voice on mobile */}
              <div className="block lg:hidden mt-2 shrink-0">
                <div className="rounded-xl border-[3px] border-fuchsia-500 bg-gradient-to-br from-fuchsia-200 to-purple-300 shadow-lg p-3 ring-2 ring-fuchsia-300/80">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-extrabold text-slate-900">Giọng đọc</h3>
                      <p className="text-[10px] text-fuchsia-900 font-bold mt-0.5">Áp dụng khi bấm Nghe.</p>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-fuchsia-600 px-2 py-0.5 text-[10px] font-extrabold text-white shadow-sm">
                      {englishVoices.length} EN
                    </span>
                  </div>

                  <select
                    value={voiceId}
                    onChange={(e) => {
                      setVoiceId(e.target.value);
                      localStorage.setItem(`vocab_voice_${testId}`, e.target.value);
                      showToastMsg("Đã đổi giọng đọc", "success");
                    }}
                    className="mt-2 w-full rounded-lg border border-purple-300 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500"
                  >
                    {voiceSelectOptions}
                  </select>

                  <button
                    type="button"
                    onClick={() => playAudio(current?.word || "hello")}
                    disabled={isPlaying}
                    className="mt-2 w-full inline-flex items-center justify-center gap-1.5 rounded-lg border-2 border-blue-900 bg-blue-700 px-2 py-1.5 text-xs font-extrabold text-white shadow-lg hover:bg-blue-600 disabled:opacity-50"
                  >
                    🔈 Nghe thử
                  </button>
                </div>
              </div>

              {/* ACTION BUTTONS — mt-auto: đẩy xuống đáy cột khi còn khoảng trống dọc */}
              <div className="mt-auto pt-2 shrink-0 w-full">
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => revealAnswer(currentAnswer)}
                    disabled={showAnswer || isSubmitting || (!currentAnswer.trim() && settings.mode !== "listen_and_write_sentence")}
                    className="w-full inline-flex items-center justify-center rounded-lg bg-blue-700 px-2 py-2 text-xs font-extrabold text-white shadow-lg border-2 border-blue-900 hover:bg-blue-600 disabled:opacity-50"
                  >
                    Kiểm tra
                  </button>

                  <button
                    type="button"
                    onClick={() => revealAnswer("")}
                    disabled={showAnswer || isSubmitting}
                    className="w-full inline-flex items-center justify-center rounded-lg border-[3px] border-amber-800 bg-amber-600 px-2 py-2 text-xs font-extrabold text-amber-950 shadow-lg hover:bg-amber-500 disabled:opacity-50"
                  >
                    Bỏ qua
                  </button>

                  <button
                    type="button"
                    onClick={submitNow}
                    disabled={isSubmitting}
                    className="w-full inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-orange-600 via-red-600 to-rose-700 px-2 py-2 text-xs font-extrabold text-white shadow-lg border-2 border-red-900 hover:brightness-110 disabled:opacity-60"
                  >
                    Nộp bài
                  </button>
                </div>

                <div className="mt-1.5 hidden sm:grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={index <= 0 || isSubmitting}
                    className="inline-flex items-center justify-center gap-1 rounded-md border-[3px] border-teal-800 bg-teal-600 px-2 py-1.5 text-[11px] font-extrabold text-white shadow-lg hover:bg-teal-500 disabled:opacity-50"
                    title="Câu trước (←)"
                  >
                    ← Trước
                  </button>

                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={index >= items.length - 1 || isSubmitting}
                    className="inline-flex items-center justify-center gap-1 rounded-md border-[3px] border-fuchsia-900 bg-fuchsia-600 px-2 py-1.5 text-[11px] font-extrabold text-white shadow-lg hover:bg-fuchsia-500 disabled:opacity-50"
                    title="Câu sau (→)"
                  >
                    Sau →
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div className="lg:col-span-1 hidden lg:flex lg:flex-col min-w-0 min-h-0 lg:overflow-y-auto lg:max-h-[min(100%,calc(100dvh-4.5rem))]">
              <div className="space-y-3 flex flex-col min-h-0">
                {/* Voice */}
                <div className="rounded-xl border-[3px] border-fuchsia-500 bg-gradient-to-br from-fuchsia-200 to-purple-300 shadow-lg p-3 ring-2 ring-fuchsia-300/80">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-extrabold text-slate-900">Giọng đọc</h3>
                      <p className="text-[10px] text-fuchsia-900 font-bold mt-0.5">Áp dụng khi bấm Nghe.</p>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-fuchsia-600 px-2 py-0.5 text-[10px] font-extrabold text-white shadow-sm">
                      {englishVoices.length} EN
                    </span>
                  </div>

                  <select
                    value={voiceId}
                    onChange={(e) => {
                      setVoiceId(e.target.value);
                      localStorage.setItem(`vocab_voice_${testId}`, e.target.value);
                      showToastMsg("Đã đổi giọng đọc", "success");
                    }}
                    className="mt-3 w-full rounded-xl border border-purple-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
                  >
                    {voiceSelectOptions}
                  </select>

                  <button
                    type="button"
                    onClick={() => playAudio(current?.word || "hello")}
                    disabled={isPlaying}
                    className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-blue-900 bg-blue-700 px-3 py-2 text-sm font-extrabold text-white shadow-lg hover:bg-blue-600 disabled:opacity-50"
                  >
                    🔈 Nghe thử
                  </button>
                </div>

                {/* Progress */}
                <div className="rounded-2xl border-[3px] border-orange-600 bg-gradient-to-br from-amber-200 to-orange-300 shadow-lg p-4 ring-2 ring-orange-400">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-slate-900">Tiến độ</h3>
                    <span className="text-xs font-extrabold text-orange-800 bg-white/80 px-2 py-0.5 rounded-full border-2 border-orange-600">
                      {progressDone}/{items.length}
                    </span>
                  </div>

                  <div className="mt-2 grid grid-cols-10 gap-1">
                    {items.map((_, idx) => {
                      const st = answeredState(idx);
                      const isCurrent = idx === index;

                      const base =
                        st === "correct"
                          ? "bg-emerald-500 text-white border-2 border-emerald-800 font-extrabold shadow-md"
                          : st === "wrong"
                          ? "bg-rose-500 text-white border-2 border-rose-800 font-extrabold shadow-md"
                          : "bg-amber-400 text-amber-950 border-2 border-amber-700 font-extrabold shadow-sm";

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
                          className={`w-6 h-6 rounded-md ${base} flex items-center justify-center text-[9px] transition ${
                            isCurrent ? "ring-[3px] ring-blue-700 ring-offset-2 ring-offset-amber-100 scale-105" : "hover:brightness-95"
                          }`}
                          disabled={isSubmitting}
                          title={`Câu ${idx + 1}${st === "correct" ? " ✓" : st === "wrong" ? " ✗" : ""}`}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-2 rounded-lg bg-cyan-300 border-2 border-cyan-700 p-2 shadow-inner">
                    <div className="flex items-center justify-between text-[11px] font-extrabold text-cyan-950">
                      <span>Hoàn thành</span>
                      <span>{progressPct}%</span>
                    </div>
                    <div className="mt-1.5 h-2 rounded-full bg-cyan-500/50 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-600 to-blue-700" style={{ width: `${progressPct}%` }} />
                    </div>

                    <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-900 font-bold">
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

          {/* MOBILE STICKY BOTTOM BAR */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t-[3px] border-indigo-300 shadow-2xl px-3 pt-2 pb-2">
            {/* Progress bar */}
            <div className="mb-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-600 to-blue-700 transition-all" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="flex items-center gap-2">
              {/* Timer */}
              <span
                className={`shrink-0 inline-flex items-center gap-2 rounded-xl border-[3px] px-3 py-2 text-sm font-black shadow-lg ${
                  timeWarnLevel === "danger"
                    ? "border-red-900 bg-red-600 text-white ring-2 ring-red-300 animate-pulse"
                    : timeWarnLevel === "warn"
                    ? "border-amber-900 bg-amber-500 text-amber-950 ring-2 ring-amber-200"
                    : "border-indigo-900 bg-indigo-600 text-white ring-2 ring-indigo-200"
                }`}
                title="Thời gian còn lại"
              >
                ⏱ <span className="tabular-nums">{timeLeft}s</span>
              </span>

              {/* Center info */}
              <div className="flex-1 flex flex-col items-center min-w-0">
                <span className="text-xs font-extrabold text-slate-700">
                  Câu {index + 1}/{items.length} · {progressPct}%
                </span>
                <span className="text-[11px] text-slate-500">
                  ✅ {correctSoFar} đúng · ❌ {wrongSoFar} sai
                </span>
              </div>

              {/* Submit */}
              <button
                type="button"
                onClick={submitNow}
                disabled={isSubmitting}
                className="shrink-0 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-orange-600 to-rose-700 border-[3px] border-red-900 px-3 py-1.5 text-xs font-extrabold text-white shadow-lg disabled:opacity-40"
              >
                Nộp bài
              </button>
            </div>
          </div>

          {/* EXIT CONFIRM */}
          {showExitConfirm && (
            <div className="fixed inset-0 bg-slate-600/45 backdrop-blur-[2px] flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full mx-4 border border-slate-200">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-extrabold">
                    !
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900">Xác nhận thoát</h3>
                    <p className="text-sm text-purple-600 mt-1">Bạn có chắc chắn muốn thoát? Tiến trình sẽ bị xóa.</p>
                  </div>
                </div>

                <div className="mt-5 flex justify-end gap-2">
                  <button
                    onClick={cancelExit}
                    className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 font-semibold hover:bg-slate-50"
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
            <div className="fixed inset-0 bg-slate-600/45 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center">
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
                    <div className="bg-sky-200 rounded-2xl p-4 border-[3px] border-sky-600">
                      <h3 className="text-sm font-bold text-slate-900 mb-3">Tóm tắt tiến độ</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{answers.filter(Boolean).length}</div>
                          <div className="text-xs text-slate-700 font-semibold">Đã trả lời</div>
                          <div className="text-xs text-slate-600 font-medium">/{items.length} câu</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{correctSoFar}</div>
                          <div className="text-xs text-slate-700 font-semibold">Đúng</div>
                          <div className="text-xs text-slate-600 font-medium">{wrongSoFar} sai</div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-4">
                        <div className="flex justify-between text-xs text-slate-800 font-semibold mb-1">
                          <span>Hoàn thành</span>
                          <span>{progressPct}%</span>
                        </div>
                        <div className="h-2 bg-sky-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Warning */}
                    <div className="bg-orange-200 border-[3px] border-orange-600 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                          <p className="text-sm font-extrabold text-orange-950">Lưu ý quan trọng</p>
                          <p className="text-xs text-orange-950 mt-1 font-bold">
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
                      className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 font-semibold hover:bg-slate-50 disabled:opacity-50 transition-colors"
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
