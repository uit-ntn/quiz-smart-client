// src/pages/VocabularyTestTake.jsx
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import TestLayout from '../layout/TestLayout';
import vocabularyService from '../services/vocabularyService';
import testService from '../services/testService';
import testResultService from '../services/testResultService';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import Toast from '../components/Toast';

import { useTestSession } from '../hooks/useTestSession';

const DEFAULT_TOTAL_QUESTIONS = 10;
const DEFAULT_TIME_PER_QUESTION = 30;

const sanitizeSettings = (raw = {}) => {
  const mode = raw.mode || 'word_to_meaning';
  const totalQuestions =
    Number.isFinite(raw.totalQuestions) && raw.totalQuestions > 0 ? raw.totalQuestions : DEFAULT_TOTAL_QUESTIONS;
  const timePerQuestion =
    Number.isFinite(raw.timePerQuestion) && raw.timePerQuestion > 0 ? raw.timePerQuestion : DEFAULT_TIME_PER_QUESTION;

  return {
    mode,
    totalQuestions,
    timePerQuestion,
    showAnswerMode: 'after_each',
  };
};

// map select id -> lang prefix
const VOICE_PRESETS = [
  { id: '', label: 'Giọng mặc định', flag: '🔊', prefix: '' },
  { id: 'en-US-1', label: 'American', flag: '🇺🇸', prefix: 'en-US' },
  { id: 'en-GB-1', label: 'British', flag: '🇬🇧', prefix: 'en-GB' },
  { id: 'en-AU-1', label: 'Australian', flag: '🇦🇺', prefix: 'en-AU' },
  { id: 'en-CA-1', label: 'Canadian', flag: '🇨🇦', prefix: 'en-CA' },
  { id: 'en-IN-1', label: 'Indian', flag: '🇮🇳', prefix: 'en-IN' },
];

const modeLabel = (mode) => {
  if (mode === 'word_to_meaning') return 'Từ → Nghĩa';
  if (mode === 'meaning_to_word') return 'Nghĩa → Từ';
  return 'Nghe & Viết';
};

const modeBadge = (mode) => {
  if (mode === 'word_to_meaning') return 'Đưa từ đoán nghĩa';
  if (mode === 'meaning_to_word') return 'Đưa nghĩa đoán từ';
  return 'Nghe và ghi từ';
};

const VocabularyTestTake = () => {
  const { testId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Test session tracking
  const [testResultId, setTestResultId] = useState(null);
  const {
    initializeSession,
    endSession,
    recordBehavior,
    isTracking
  } = useTestSession(testResultId);

  const initialSettings = useMemo(() => {
    const fromState = location.state?.settings;
    const fromLS = JSON.parse(localStorage.getItem(`vocab_settings_${testId}`) || '{}');
    return sanitizeSettings(fromState || fromLS);
  }, [location.state, testId]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [testInfo, setTestInfo] = useState(null);
  const [settings] = useState(initialSettings);

  const [items, setItems] = useState([]);
  const [index, setIndex] = useState(0);

  const [answers, setAnswers] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState('');

  // Mark for review
  const [markedQuestions, setMarkedQuestions] = useState({}); // idx -> true

  const [timeLeft, setTimeLeft] = useState(settings.timePerQuestion || DEFAULT_TIME_PER_QUESTION);
  const [isPaused, setIsPaused] = useState(false);

  const [showAnswer, setShowAnswer] = useState(false);
  const [lastAnswerResult, setLastAnswerResult] = useState(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);

  const [voiceId, setVoiceId] = useState(() => localStorage.getItem(`vocab_voice_${testId}`) || '');

  // Modals
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultModalData, setResultModalData] = useState(null);
  
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timerRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  // Storage keys
  const STORE_KEY = `vocab_take_state_${testId}`;
  const DRAFT_KEY = `vocab_draft_${testId}`;

  // Refs to avoid stale closures
  const itemsRef = useRef(items);
  const settingsRef = useRef(settings);
  const answersRef = useRef(answers);
  const markedRef = useRef(markedQuestions);
  const indexRef = useRef(index);
  const timeLeftRef = useRef(timeLeft);
  
  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { markedRef.current = markedQuestions; }, [markedQuestions]);
  useEffect(() => { indexRef.current = index; }, [index]);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

  // ===================== UNDO/REDO =====================
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const MAX_STACK = 30;

  const pushHistory = useCallback(() => {
    const state = {
      index,
      currentAnswer,
      answers: [...answers],
      markedQuestions: { ...markedQuestions },
      timestamp: Date.now(),
    };
    
    undoStackRef.current.push(state);
    if (undoStackRef.current.length > MAX_STACK) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = []; // clear redo when new action
  }, [index, currentAnswer, answers, markedQuestions]);

  const undo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    
    const currentState = {
      index,
      currentAnswer, 
      answers: [...answers],
      markedQuestions: { ...markedQuestions },
      timestamp: Date.now(),
    };
    
    redoStackRef.current.push(currentState);
    
    const prevState = undoStackRef.current.pop();
    setIndex(prevState.index);
    setCurrentAnswer(prevState.currentAnswer);
    setAnswers(prevState.answers);
    setMarkedQuestions(prevState.markedQuestions);
    
    setShowAnswer(false);
    setLastAnswerResult(null);
    setIsPaused(false);
    setTimeLeft(settings.timePerQuestion || DEFAULT_TIME_PER_QUESTION);
    
    showToastMsg('Đã hoàn tác', 'info');
  }, [index, currentAnswer, answers, markedQuestions, settings.timePerQuestion]);

  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    
    const currentState = {
      index,
      currentAnswer,
      answers: [...answers], 
      markedQuestions: { ...markedQuestions },
      timestamp: Date.now(),
    };
    
    undoStackRef.current.push(currentState);
    
    const nextState = redoStackRef.current.pop();
    setIndex(nextState.index);
    setCurrentAnswer(nextState.currentAnswer);
    setAnswers(nextState.answers);
    setMarkedQuestions(nextState.markedQuestions);
    
    setShowAnswer(false);
    setLastAnswerResult(null);
    setIsPaused(false);
    setTimeLeft(settings.timePerQuestion || DEFAULT_TIME_PER_QUESTION);
    
    showToastMsg('Đã làm lại', 'info');
  }, [index, currentAnswer, answers, markedQuestions, settings.timePerQuestion]);

  // Load voices
  useEffect(() => {
    const loadVoices = () => setAvailableVoices(speechSynthesis.getVoices() || []);
    loadVoices();
    speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

  // Fetch test + vocab
  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const [test, data] = await Promise.all([
          testService.getTestById(testId),
          vocabularyService.getAllVocabulariesByTestId(testId),
        ]);

        setTestInfo(test);

        if (!Array.isArray(data) || data.length === 0) {
          setError(`Không tìm thấy câu hỏi nào cho bài test ${testId}. Vui lòng kiểm tra lại.`);
          return;
        }

        const shuffled = [...data].sort(() => 0.5 - Math.random());
        const maxQ = Math.min(settings.totalQuestions || DEFAULT_TOTAL_QUESTIONS, data.length);

        const selected = shuffled.slice(0, maxQ).map((it, i) => ({
          ...it,
          questionNumber: i + 1,
        }));

        setItems(selected);
        setAnswers(new Array(selected.length).fill(null));

        setIndex(0);
        setCurrentAnswer('');
        setShowAnswer(false);
        setLastAnswerResult(null);
        setIsPaused(false);
        setTimeLeft(settings.timePerQuestion || DEFAULT_TIME_PER_QUESTION);

        startTimeRef.current = Date.now();

        // Create initial draft test result for session tracking
        try {
          const testSnapshot = {
            test_id: testId,
            test_title: test?.test_title || 'Vocabulary Test',
            main_topic: test?.main_topic || 'Vocabulary',
            sub_topic: test?.sub_topic || '',
            test_type: test?.test_type || 'vocabulary',
            difficulty: test?.difficulty || 'medium',
          };

          const initialPayload = {
            test_id: testId,
            test_snapshot: testSnapshot,
            answers: [
              {
                question_id: selected[0]?._id || 'placeholder',
                question_collection: 'vocabularies',
                word: selected[0]?.word || '',
                meaning: selected[0]?.meaning || '',
                example_sentence: selected[0]?.example_sentence || '',
                question_mode: settings.mode || 'word_to_meaning',
                correct_answer: '',
                user_answer: '',
                is_correct: false,
                time_spent_ms: 0,
              }
            ], // ✅ Must be non-empty array for BE validation
            duration_ms: 0,
            start_time: new Date(startTimeRef.current),
            end_time: null,
            status: 'in_progress',
          };

          const draftResult = await testResultService.createTestResult(initialPayload);
          setTestResultId(draftResult?._id || draftResult?.id);

          console.log('✅ Initial draft result created for session tracking:', draftResult?._id || draftResult?.id);
        } catch (err) {
          console.error('❌ Failed to create initial draft result:', err);
          // Continue without session tracking if this fails
        }
      } catch (e) {
        console.error('Error fetching test data:', e);
        setError(`Có lỗi xảy ra khi tải câu hỏi: ${e.message}. Vui lòng thử lại.`);
      } finally {
        setLoading(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  // ===================== autosave/resume =====================
  useEffect(() => {
    if (!items.length) return;
    
    const state = {
      answers,
      markedQuestions,
      index,
      currentAnswer,
      timeLeft,
      timestamp: Date.now(),
    };
    
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Cannot save state to localStorage:', e);
    }
  }, [STORE_KEY, answers, markedQuestions, index, currentAnswer, timeLeft]);

  // Resume from autosave
  useEffect(() => {
    if (!items.length || answers.length > 0) return;
    
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        const timeDiff = Date.now() - (state.timestamp || 0);
        
        // Only resume if saved within last 4 hours
        if (timeDiff < 4 * 60 * 60 * 1000) {
          const answeredCount = (state.answers || []).filter(Boolean).length;
          if (answeredCount > 0) {
            if (Array.isArray(state.answers)) setAnswers(state.answers);
            if (state.markedQuestions) setMarkedQuestions(state.markedQuestions);
            if (typeof state.index === 'number') setIndex(state.index);
            if (typeof state.currentAnswer === 'string') setCurrentAnswer(state.currentAnswer);
            if (typeof state.timeLeft === 'number') setTimeLeft(state.timeLeft);
            
            const timeAgo = Math.round(timeDiff / 60000); // minutes
            showToastMsg(`🔄 Đã khôi phục tiến trình (${answeredCount} câu, ${timeAgo} phút trước)`, 'success');
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
  }, [STORE_KEY, items.length, answers.length]);

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

  const getCorrectAnswer = useCallback(
    (item) => {
      if (!item) return '';
      if (settings.mode === 'word_to_meaning') return item.meaning;
      if (settings.mode === 'meaning_to_word') return item.word;
      return item.word; // listen_and_type
    },
    [settings.mode]
  );

  const checkAnswer = useCallback((item, answer, mode) => {
    const ua = (answer || '').toLowerCase().trim();
    if (mode === 'word_to_meaning') return ua === (item.meaning || '').toLowerCase().trim();
    if (mode === 'meaning_to_word') return ua === (item.word || '').toLowerCase().trim();
    return ua === (item.word || '').toLowerCase().trim();
  }, []);

  const showToastMsg = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 2500);
  };

  const pickVoice = useCallback(() => {
    if (!voiceId) return null;
    const voices = speechSynthesis.getVoices() || [];

    const preset = VOICE_PRESETS.find((p) => p.id === voiceId);
    const prefix = preset?.prefix || '';

    const byPrefix = prefix ? voices.find((v) => v.lang?.startsWith(prefix)) : null;
    if (byPrefix) return byPrefix;

    const anyEn = voices.find((v) => v.lang?.startsWith('en')) || null;
    return anyEn;
  }, [voiceId]);

  const playAudio = useCallback(
    (text) => {
      if (!text || isPlaying) return;
      setIsPlaying(true);

      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';

      const v = pickVoice();
      if (v) {
        u.voice = v;
        u.lang = v.lang || 'en-US';
      }

      u.rate = 0.85;
      u.pitch = 1.0;
      u.volume = 1.0;

      u.onend = () => setIsPlaying(false);
      u.onerror = () => setIsPlaying(false);

      // Record audio playback
      recordBehavior('audio_playback', {
        question_index: index,
        text_length: text.length,
        voice_id: voiceId,
        voice_lang: v?.lang || 'en-US'
      });

      speechSynthesis.speak(u);
    },
    [isPlaying, pickVoice, index, voiceId, recordBehavior]
  );

  const toggleMarkCurrent = useCallback(() => {
    if (!items[index]) return;
    
    pushHistory();
    
    setMarkedQuestions(prev => {
      const next = { ...prev };
      if (next[index]) {
        delete next[index];
        showToastMsg('Đã bỏ đánh dấu câu hỏi', 'info');
      } else {
        next[index] = true;
        showToastMsg('Đã đánh dấu câu hỏi để xem lại', 'info');
      }
      return next;
    });
    
    // Record behavior
    recordBehavior('question_marked', {
      question_index: index,
      question_id: items[index]?._id,
      marked: !markedQuestions[index]
    });
  }, [index, items, markedQuestions, pushHistory, recordBehavior]);

  const revealAnswer = useCallback(
    (answerText) => {
      timerRef.current && clearInterval(timerRef.current);

      const current = items[index];
      const isCorrect = checkAnswer(current, answerText, settings.mode);

      const next = [...answers];
      next[index] = {
        question: current,
        userAnswer: answerText,
        isCorrect,
        timeSpent: (settings.timePerQuestion || DEFAULT_TIME_PER_QUESTION) - timeLeft,
      };
      setAnswers(next);

      const resultData = {
        isCorrect,
        correctAnswer: getCorrectAnswer(current),
        userAnswer: answerText,
        question: current,
        timeSpent: (settings.timePerQuestion || DEFAULT_TIME_PER_QUESTION) - timeLeft,
        questionIndex: index + 1,
        totalQuestions: items.length,
      };
      
      setLastAnswerResult(resultData);
      setResultModalData(resultData);
      setShowAnswer(true);
      setShowResultModal(true);
      setIsPaused(true);

      // Record answer submission behavior
      recordBehavior('answer_submitted', {
        question_index: index,
        question_id: current?._id,
        mode: settings.mode,
        time_spent: (settings.timePerQuestion || DEFAULT_TIME_PER_QUESTION) - timeLeft,
        is_correct: isCorrect,
        answer_length: answerText?.length || 0
      });
    },
    [answers, checkAnswer, getCorrectAnswer, index, items, settings.mode, settings.timePerQuestion, timeLeft, recordBehavior]
  );

  const completeTest = useCallback(
    async (finalAnswers = null) => {
      let payload = null; // Declare outside try block for catch access
      
      try {
        setIsSubmitting(true);

        const aList = Array.isArray(finalAnswers) ? finalAnswers : answers;
        const timeTakenMs = Date.now() - startTimeRef.current;

        // ✅ BE mới: lưu snapshot thông tin bài test
        const testSnapshot = {
          test_id: testId,
          test_title: testInfo?.test_title || 'Vocabulary Test',
          main_topic: testInfo?.main_topic || 'Vocabulary',
          sub_topic: testInfo?.sub_topic || '',
          test_type: testInfo?.test_type || 'vocabulary',
          difficulty: testInfo?.difficulty || 'medium',
        };

        payload = {
          test_id: testId, // giữ lại cho tiện filter / join nếu BE vẫn dùng
          test_snapshot: testSnapshot,
          answers: aList.map((answer) => ({
            question_id: answer?.question?._id || answer?.question?.id,
            question_collection: 'vocabularies',
            // BE yêu cầu đầy đủ các trường vocabulary
            word: answer?.question?.word || '',
            meaning: answer?.question?.meaning || '',
            example_sentence: answer?.question?.example_sentence || answer?.question?.example || '',
            question_mode: settings?.mode || 'word_to_meaning',
            correct_answer: getCorrectAnswer(answer?.question),
            user_answer: answer?.userAnswer ?? '',
            is_correct: !!answer?.isCorrect,
          })),
          duration_ms: timeTakenMs,
          start_time: new Date(startTimeRef.current),
          end_time: new Date(),
          status: 'draft',
        };

        console.log('📤 Sending payload to BE:', JSON.stringify(payload, null, 2));
        
        // ✅ Luôn tạo mới test result khi submit (không update draft tracking)
        // Draft tracking (in_progress) chỉ dùng cho session tracking
        console.log('📝 Creating new draft TestResult');
        const finalResult = await testResultService.createTestResult(payload);
        console.log('✅ TestResult created:', finalResult);

        // End test session tracking BEFORE navigation
        if (isTracking) {
          try {
            await endSession();
            console.log('✅ Test session ended successfully');
          } catch (err) {
            console.error('❌ Failed to end test session:', err);
            // Continue anyway
          }
        }

        // Clean up localStorage
        try {
          localStorage.removeItem(STORE_KEY);
          localStorage.removeItem(DRAFT_KEY);
        } catch (e) {
          console.warn('Cannot clean localStorage:', e);
        }
        
        navigate(`/vocabulary/test/${testId}/result`, {
          state: {
            answers: aList,
            settings,
            testInfo,
            draftResultId: finalResult?._id || finalResult?.id,
          },
        });
      } catch (err) {
        console.error('❌ Error creating draft result:', err);
        if (payload) {
          console.error('📤 Failed payload was:', JSON.stringify(payload, null, 2));
        }
        // fallback vẫn cho xem kết quả FE
        navigate(`/vocabulary/test/${testId}/result`, {
          state: { answers: finalAnswers || answers, settings, testInfo },
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [answers, getCorrectAnswer, navigate, settings, testId, testInfo, endSession, isTracking, STORE_KEY, DRAFT_KEY]
  );

  const moveNextAfterReveal = useCallback(async () => {
    setShowAnswer(false);
    setLastAnswerResult(null);
    setShowResultModal(false);
    setResultModalData(null);
    setIsPaused(false);

    // Record question navigation
    recordBehavior('question_navigation', {
      from_question: index,
      to_question: index < items.length - 1 ? index + 1 : 'completed',
      action: 'next_after_reveal'
    });

    if (index < items.length - 1) {
      setIndex((i) => i + 1);
      setCurrentAnswer('');
      setTimeLeft(settings.timePerQuestion || DEFAULT_TIME_PER_QUESTION);
    } else {
      await completeTest();
    }
  }, [completeTest, index, items.length, settings.timePerQuestion, recordBehavior]);

  const handleNext = useCallback(() => {
    if (index >= items.length - 1) return;
    
    pushHistory();
    setIndex(i => i + 1);
    setCurrentAnswer('');
    setShowAnswer(false);
    setLastAnswerResult(null);
    setShowResultModal(false);
    setResultModalData(null);
    setIsPaused(false);
    setTimeLeft(settings.timePerQuestion || DEFAULT_TIME_PER_QUESTION);
    
    recordBehavior('question_navigation', {
      from_question: index,
      to_question: index + 1,
      action: 'manual_next'
    });
  }, [index, items.length, pushHistory, recordBehavior, settings.timePerQuestion]);

  const handlePrev = useCallback(() => {
    if (index <= 0) return;
    
    pushHistory();
    setIndex(i => i - 1);
    setCurrentAnswer('');
    setShowAnswer(false);
    setLastAnswerResult(null);
    setShowResultModal(false);
    setResultModalData(null);
    setIsPaused(false);
    setTimeLeft(settings.timePerQuestion || DEFAULT_TIME_PER_QUESTION);
    
    recordBehavior('question_navigation', {
      from_question: index,
      to_question: index - 1,
      action: 'manual_prev'
    });
  }, [index, pushHistory, recordBehavior, settings.timePerQuestion]);

  // Define current question early for use in callbacks
  const current = useMemo(() => items[index], [items, index]);

  // ===================== keyboard shortcuts =====================
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts when typing in input or modal is open
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || 
          showResultModal || showSubmitConfirm || showExitConfirm) {
        return;
      }
      
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          handlePrev();
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          handleNext();
          break;
        case 'Enter':
          e.preventDefault();
          if (showAnswer) {
            moveNextAfterReveal();
          } else if (currentAnswer.trim()) {
            revealAnswer(currentAnswer);
          }
          break;
        case ' ':
          if (showAnswer) {
            e.preventDefault();
            moveNextAfterReveal();
          }
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMarkCurrent();
          break;
        case 'z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
          }
          break;
        case 'y':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            redo();
          }
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          if (current?.word) {
            playAudio(current.word);
          }
          break;
        default:
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, moveNextAfterReveal, toggleMarkCurrent, undo, redo, showAnswer, showResultModal, showSubmitConfirm, showExitConfirm, playAudio, current]);

  const submitNow = useCallback(() => {
    setShowSubmitConfirm(true);
  }, []);

  const confirmSubmit = useCallback(async () => {
    setShowSubmitConfirm(false);
    
    // Record early submission
    recordBehavior('test_submission', {
      action: 'early_submit',
      current_question: index,
      total_questions: items.length,
      answered_questions: answers.filter(a => a !== null).length
    });

    const remain = [...answers];
    for (let i = 0; i < items.length; i++) {
      if (!remain[i]) {
        remain[i] = { question: items[i], userAnswer: '', isCorrect: false, timeSpent: 0 };
      }
    }

    // đảm bảo state cũng sync
    setAnswers(remain);
    await completeTest(remain);
  }, [answers, completeTest, items, index, recordBehavior]);

  // Timer
  useEffect(() => {
    if (loading || showAnswer || isPaused || !items.length) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          revealAnswer('');
          return settings.timePerQuestion || DEFAULT_TIME_PER_QUESTION;
        }
        return prev - 1;
      });
    }, 1000);

    return () => timerRef.current && clearInterval(timerRef.current);
  }, [loading, showAnswer, isPaused, items.length, revealAnswer, settings.timePerQuestion]);

  const handleExit = () => setShowExitConfirm(true);
  const confirmExit = useCallback(() => {
    setShowExitConfirm(false);
    
    // Clean up localStorage on exit
    try {
      localStorage.removeItem(STORE_KEY);
      localStorage.removeItem(DRAFT_KEY);
    } catch (e) {
      console.warn('Cannot clean localStorage:', e);
    }
    
    navigate(-1);
  }, [navigate, STORE_KEY, DRAFT_KEY]);
  const cancelExit = () => setShowExitConfirm(false);

  const answeredState = (idx) => {
    const a = answers[idx];
    if (!a) return 'idle';
    return a.isCorrect ? 'correct' : 'wrong';
  };

  const isMarked = useCallback((idx) => !!markedQuestions[idx], [markedQuestions]);
  
  const handleResultModalNext = useCallback(() => {
    moveNextAfterReveal();
  }, [moveNextAfterReveal]);

  // Show autosave status - must be before early returns
  const [lastSaved, setLastSaved] = useState(null);
  useEffect(() => {
    setLastSaved(new Date());
  }, [answers, markedQuestions, index]);

  if (loading) return <LoadingSpinner message="Đang tải câu hỏi..." />;
  if (error) return <ErrorMessage error={error} onRetry={() => window.location.reload()} />;
  if (!items.length) return <ErrorMessage error="Không có câu hỏi nào." />;
  const progressDone = answers.filter(Boolean).length;
  const progressPct = items.length ? Math.round((progressDone / items.length) * 100) : 0;

  const topHint =
    settings.mode === 'word_to_meaning'
      ? 'Nhập nghĩa tiếng Việt.'
      : settings.mode === 'meaning_to_word'
      ? 'Nhập từ tiếng Anh.'
      : 'Bấm nghe, rồi gõ từ bạn nghe được.';

  const correctSoFar = answers.filter((a) => a?.isCorrect).length;
  const wrongSoFar = answers.filter((a) => a && !a.isCorrect).length;

  return (
    <TestLayout
      testTitle={testInfo?.test_title || 'Bài test từ vựng'}
      currentQuestion={index}
      totalQuestions={items.length}
      timeLeft={timeLeft}
      timePerQuestion={settings.timePerQuestion || DEFAULT_TIME_PER_QUESTION}
      onExit={handleExit}
    >
      <div className="min-h-[calc(100svh-136px)] bg-zinc-50">
        <div className="mx-auto w-full max-w-7xl px-3 md:px-4 py-3">
          {/* Top bar */}
          <div className="mb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 shadow-sm">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                {modeLabel(settings.mode)}
              </span>

              <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 shadow-sm">
                ⏱️ {timeLeft}s
              </span>

              <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 shadow-sm">
                📌 Câu {current.questionNumber}/{items.length}
              </span>

              <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 shadow-sm">
                ✅ {correctSoFar} • ❌ {wrongSoFar}
              </span>

              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm" title="Tiến trình tự động được lưu. Bạn có thể load lại trang mà không lo mất tiến trình.">
                💾 Tự động lưu
              </span>
              
              {isMarked(index) && (
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 shadow-sm">
                  🏷️ Đã đánh dấu
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden md:block text-xs text-zinc-600 font-medium">{topHint}</div>
              <span className="hidden sm:inline text-xs text-zinc-500 font-medium">(Enter: kiểm tra/tiếp tục, Shift+Enter: bỏ qua, M: đánh dấu, ←→: điều hướng, P: phát âm)</span>
            </div>
          </div>

          {/* Main layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* LEFT */}
            <div className="lg:col-span-2 flex flex-col">
              {/* Question card */}
              <div className="relative rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden flex flex-col">
                <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_10%_0%,rgba(59,130,246,0.10),transparent)]" />
                <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_90%_100%,rgba(236,72,153,0.08),transparent)]" />

                <div className="relative p-4 sm:p-5">
                  {/* Header */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white">
                      {modeBadge(settings.mode)}
                    </span>

                    <div className="flex items-center gap-2">
                      <div className="w-28 sm:w-44">
                        <div className="h-2 rounded-full bg-zinc-200 overflow-hidden">
                          <div className="h-full bg-blue-600" style={{ width: `${progressPct}%` }} />
                        </div>
                        <div className="mt-1 text-[11px] text-zinc-600 font-medium text-right">
                          {progressPct}% hoàn thành
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Prompt */}
                  <div className="mt-6 text-center">
                    {settings.mode === 'word_to_meaning' && (
                      <>
                        <div className="flex items-center justify-center gap-2">
                          <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight">
                            {current?.word}
                          </h2>
                          <button
                            onClick={() => playAudio(current?.word)}
                            disabled={isPlaying}
                            className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white p-2 text-zinc-700 shadow-sm hover:bg-zinc-50 disabled:opacity-50"
                            aria-label="Phát âm"
                            title="Phát âm"
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

                    {settings.mode === 'meaning_to_word' && (
                      <>
                        <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-900 leading-relaxed">
                          {current?.meaning}
                        </h2>
                        <p className="mt-2 text-sm text-zinc-600">Nhập từ tiếng Anh phù hợp.</p>
                      </>
                    )}

                    {settings.mode === 'listen_and_type' && (
                      <>
                        <button
                          onClick={() => playAudio(current?.word)}
                          disabled={isPlaying}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg hover:opacity-95 disabled:opacity-50"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M6 10v4a1 1 0 001 1h1l4 4V5l-4 4H7a1 1 0 00-1 1z"
                            />
                          </svg>
                          {isPlaying ? 'Đang phát...' : 'Nghe từ'}
                        </button>
                        <p className="mt-2 text-sm text-zinc-600">Nghe và gõ từ bạn nghe được.</p>
                      </>
                    )}
                  </div>

                  {/* Input */}
                  <div className="mt-6">
                    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-3 sm:p-4">
                      <input
                        type="text"
                        value={currentAnswer}
                        onChange={(e) => setCurrentAnswer(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault(); // Prevent default, let global handler manage it
                          }
                        }}
                        placeholder={
                          settings.mode === 'word_to_meaning'
                            ? 'Gõ nghĩa tiếng Việt...'
                            : settings.mode === 'meaning_to_word'
                            ? 'Gõ từ tiếng Anh...'
                            : 'Gõ từ tiếng Anh bạn nghe được...'
                        }
                        className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                        disabled={showAnswer || isSubmitting}
                        autoFocus
                      />

                      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                        <button
                          onClick={() => playAudio(current?.word)}
                          disabled={isPlaying}
                          className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 disabled:opacity-50"
                        >
                          🔊 Nghe từ
                        </button>

                        {!!current?.example_sentence && (
                          <button
                            onClick={() => playAudio(current?.example_sentence)}
                            disabled={isPlaying}
                            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 disabled:opacity-50"
                          >
                            📖 Nghe câu
                          </button>
                        )}

                        <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm">
                          ⏱️ {timeLeft}s còn lại
                        </span>

                        <span className="hidden sm:inline text-[11px] text-zinc-500 font-medium">(Enter: kiểm tra • Shift+Enter: bỏ qua)</span>
                      </div>
                    </div>

                    {/* Result panel */}
                    {showAnswer && lastAnswerResult && (
                      <div
                        className={`mt-4 rounded-2xl border p-4 shadow-sm ${
                          lastAnswerResult.isCorrect ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div
                              className={`h-10 w-10 rounded-2xl flex items-center justify-center text-white font-extrabold ${
                                lastAnswerResult.isCorrect ? 'bg-emerald-600' : 'bg-rose-600'
                              }`}
                            >
                              {lastAnswerResult.isCorrect ? '✓' : '✗'}
                            </div>

                            <div>
                              <div
                                className={`font-extrabold ${
                                  lastAnswerResult.isCorrect ? 'text-emerald-800' : 'text-rose-800'
                                }`}
                              >
                                {lastAnswerResult.isCorrect ? 'Chính xác!' : 'Chưa đúng'}
                              </div>

                              {!lastAnswerResult.isCorrect && (
                                <div className="mt-1 text-sm text-rose-800">
                                  Đáp án đúng: <span className="font-extrabold">{lastAnswerResult.correctAnswer}</span>
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
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
                            disabled={isSubmitting}
                          >
                            {index === items.length - 1 ? 'Hoàn thành' : 'Tiếp tục'} →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ✅ BUTTONS SECTION */}
              <div className="mt-3">
                {/* Main action buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => revealAnswer(currentAnswer)}
                    disabled={showAnswer || isSubmitting || !currentAnswer.trim()}
                    className="w-full inline-flex items-center justify-center rounded-xl bg-blue-600 px-3 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    Kiểm tra
                  </button>

                  <button
                    type="button"
                    onClick={() => revealAnswer('')}
                    disabled={showAnswer || isSubmitting}
                    className="w-full inline-flex items-center justify-center rounded-xl bg-zinc-900 px-3 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50"
                    title="Bỏ qua câu này"
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
                
                {/* Navigation and utility buttons */}
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                  
                  <button
                    type="button"
                    onClick={toggleMarkCurrent}
                    disabled={isSubmitting}
                    className={`inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs font-semibold shadow-sm hover:opacity-90 disabled:opacity-50 ${
                      isMarked(index) 
                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                        : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                    }`}
                    title="Đánh dấu để xem lại (M)"
                  >
                    🏷️ {isMarked(index) ? 'Bỏ dấu' : 'Đánh dấu'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={undo}
                    disabled={undoStackRef.current.length === 0 || isSubmitting}
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-2 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 disabled:opacity-50"
                    title="Hoàn tác (Ctrl+Z)"
                  >
                    ↶ Hoàn tác
                  </button>
                </div>

                <p className="mt-2 text-center text-[11px] text-zinc-600">Enter: kiểm tra đáp án hoặc chuyển câu tiếp • Shift+Enter: bỏ qua câu hiện tại • Nộp bài bất cứ lúc nào</p>
              </div>
            </div>

            {/* RIGHT */}
            <div className="lg:col-span-1">
              <div className="space-y-3">
                {/* Voice card */}
                <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-extrabold text-zinc-900">Giọng đọc</h3>
                      <p className="text-xs text-zinc-600 mt-0.5">Áp dụng ngay khi bấm “Nghe”.</p>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                      {availableVoices.filter((v) => v.lang?.startsWith('en')).length} EN
                    </span>
                  </div>

                  <select
                    value={voiceId}
                    onChange={(e) => {
                      setVoiceId(e.target.value);
                      localStorage.setItem(`vocab_voice_${testId}`, e.target.value);
                      showToastMsg('Đã đổi giọng đọc', 'success');
                    }}
                    className="mt-3 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    {VOICE_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.flag} {p.label}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      const sample = current?.word || 'hello';
                      playAudio(sample);
                    }}
                    disabled={isPlaying}
                    className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-bold text-zinc-800 shadow-sm hover:bg-zinc-50 disabled:opacity-50"
                  >
                    🔈 Nghe thử
                  </button>
                </div>

                {/* Progress card */}
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
                      const marked = isMarked(idx);

                      let cls = 'bg-zinc-100 text-zinc-700 border-zinc-200';
                      if (st === 'correct') cls = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                      if (st === 'wrong') cls = 'bg-rose-100 text-rose-800 border-rose-200';
                      
                      if (marked && st === 'idle') {
                        cls = 'bg-amber-100 text-amber-800 border-amber-200';
                      }

                      const isCurrent = idx === index;

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            pushHistory();
                            setIndex(idx);
                            setCurrentAnswer('');
                            setShowAnswer(false);
                            setLastAnswerResult(null);
                            setShowResultModal(false);
                            setResultModalData(null);
                            setIsPaused(false);
                            setTimeLeft(settings.timePerQuestion || DEFAULT_TIME_PER_QUESTION);
                          }}
                          className={`w-7 h-7 rounded-lg border ${cls} flex items-center justify-center text-[10px] font-semibold transition relative ${
                            isCurrent ? 'ring-2 ring-blue-400 ring-offset-1' : 'hover:opacity-90'
                          }`}
                          title={`Câu ${idx + 1}${marked ? ' (Đã đánh dấu)' : ''}${st === 'correct' ? ' ✓' : st === 'wrong' ? ' ✗' : ''}`}
                          disabled={isSubmitting}
                        >
                          {idx + 1}
                          {marked && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full" />
                          )}
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
                      <div className="h-full bg-blue-600" style={{ width: `${progressPct}%` }} />
                    </div>

                    <div className="mt-2 flex items-center gap-3 text-[11px] text-zinc-600 font-medium">
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" /> Đúng: {correctSoFar}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-rose-500" /> Sai: {wrongSoFar}
                      </span>
                      {Object.keys(markedQuestions).length > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-amber-500" /> Đánh dấu: {Object.keys(markedQuestions).length}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Exit Confirmation Modal */}
          {showExitConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full mx-4 border border-zinc-200">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-extrabold">
                    !
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-zinc-900">Xác nhận thoát</h3>
                    <p className="text-sm text-zinc-600 mt-1">Bạn có chắc chắn muốn thoát? Kết quả sẽ không được lưu.</p>
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

          {/* Submit Confirmation Modal */}
          {showSubmitConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full mx-4 border border-zinc-200">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-extrabold">
                    ?
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-zinc-900">Xác nhận nộp bài</h3>
                    <p className="text-sm text-zinc-600 mt-1">Bạn có chắc chắn muốn nộp bài? Các câu chưa trả lời sẽ được tính là sai.</p>
                  </div>
                </div>

                <div className="mt-5 flex justify-end gap-2">
                  <button
                    onClick={() => setShowSubmitConfirm(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-700 font-semibold hover:bg-zinc-50 disabled:opacity-50"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={confirmSubmit}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white font-semibold hover:opacity-95 disabled:opacity-60"
                  >
                    {isSubmitting ? 'Đang nộp...' : 'Nộp bài'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Result Modal - Will be implemented later */}
          {showResultModal && resultModalData && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full mx-4 border border-zinc-200">
                <div className="text-center">
                  <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl mb-4 ${
                    resultModalData.isCorrect ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                  }`}>
                    {resultModalData.isCorrect ? '✓' : '✗'}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">
                    {resultModalData.isCorrect ? 'Chính xác!' : 'Chưa đúng'}
                  </h3>
                  {!resultModalData.isCorrect && (
                    <p className="text-sm text-slate-600 mb-4">
                      Đáp án đúng: <span className="font-bold">{resultModalData.correctAnswer}</span>
                    </p>
                  )}
                  <button
                    onClick={handleResultModalNext}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-xl font-semibold hover:bg-blue-700"
                  >
                    {index === items.length - 1 ? 'Hoàn thành' : 'Tiếp tục'}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Submit Confirmation Modal */}
          {showSubmitConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full mx-4 border border-zinc-200">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-extrabold">
                    ?
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-zinc-900">Xác nhận nộp bài</h3>
                    <p className="text-sm text-zinc-600 mt-1">Bạn có chắc chắn muốn nộp bài? Các câu chưa trả lời sẽ được tính là sai.</p>
                    <div className="mt-3 text-xs text-zinc-500">
                      <p>Đã trả lời: {answers.filter(a => a !== null).length}/{items.length}</p>
                      <p>Đúng: {correctSoFar} • Sai: {wrongSoFar}</p>
                      {Object.keys(markedQuestions).length > 0 && (
                        <p>Đã đánh dấu: {Object.keys(markedQuestions).length}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    onClick={() => setShowSubmitConfirm(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-700 font-semibold hover:bg-zinc-50 disabled:opacity-50"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={confirmSubmit}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white font-semibold hover:opacity-95 disabled:opacity-60"
                  >
                    {isSubmitting ? 'Đang nộp...' : 'Nộp bài'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Toast */}
          <Toast
            show={toast.show}
            message={toast.message}
            type={toast.type}
            onClose={() => setToast({ show: false, message: '', type: 'info' })}
          />
        </div>
      </div>
    </TestLayout>
  );
};

export default VocabularyTestTake;
