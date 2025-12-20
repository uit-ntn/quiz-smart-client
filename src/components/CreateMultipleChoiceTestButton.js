import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import testService from '../services/testService';
import MultipleChoiceService from '../services/multipleChoiceService';

/** Ví dụ mẫu cho multiple choice */
const SAMPLE_QUESTIONS = `What is the capital of France?
London: The capital of United Kingdom
Berlin: The capital of Germany  
Paris: The capital of France
Madrid: The capital of Spain
C

Which programming language is known for 'write once, run anywhere'?
Python: A general-purpose programming language
Java: Known for platform independence
C++: A systems programming language
JavaScript: A web programming language
B

What does HTML stand for?
Hyper Text Markup Language: The correct definition
High Tech Modern Language: Not correct
Home Tool Markup Language: Not correct
Hyperlink and Text Markup Language: Not correct
A`;

/** Chiều cao đồng nhất cho 2 panel bước 1 (px) */
const PANEL_HEIGHT = 520;

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

export default function CreateMultipleChoiceTestButton({ label = "Tạo Multiple Choice" }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Modal state
  const [open, setOpen] = useState(false);
  
  // Steps: 'questions' -> 'test-info' -> 'review' -> 'creating' -> 'success'
  const [currentStep, setCurrentStep] = useState('questions');
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  // Step 1
  const [questionsText, setQuestionsText] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [hasSeededSample, setHasSeededSample] = useState(false);
  const [isSampleActive, setIsSampleActive] = useState(false);

  // Step 2
  const [testInfo, setTestInfo] = useState({
    test_title: '',
    description: '',
    main_topic: '',
    sub_topic: '',
    difficulty: 'easy',
    time_limit_minutes: 15,
    visibility: 'public',
  });

  // Created test
  const [createdTest, setCreatedTest] = useState(null);

  // Refs
  const cardRef = useRef(null);
  const redirectTimerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  // Seed sample đúng 1 lần khi mở modal
  useEffect(() => {
    if (open && !hasSeededSample) {
      setQuestionsText(SAMPLE_QUESTIONS);
      setHasSeededSample(true);
      setIsSampleActive(true);
    }
  }, [open, hasSeededSample]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && !loading) {
        handleClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, loading]);

  // Reset + close
  const handleClose = () => {
    setCurrentStep('questions');
    setQuestionsText('');
    setParsedQuestions([]);
    setTestInfo({
      test_title: '',
      description: '',
      main_topic: '',
      sub_topic: '',
      difficulty: 'easy',
      time_limit_minutes: 15,
      visibility: 'public',
    });
    setErrMsg('');
    setLoading(false);
    setHasSeededSample(false);
    setIsSampleActive(false);
    setCreatedTest(null);
    setOpen(false);
  };

  // Parse text format questions
  const parseQuestionsText = (text) => {
    try {
      const sections = text.trim().split(/\n\s*\n/); // Tách theo dòng trắng
      const questions = [];
      const errors = [];

      sections.forEach((section, sectionIdx) => {
        const lines = section.trim().split('\n').map(line => line.trim()).filter(line => line);
        
        if (lines.length < 3) {
          errors.push(`Đoạn ${sectionIdx + 1}: Cần ít nhất 3 dòng (câu hỏi + 2 đáp án + chỉ số đáp án đúng)`);
          return;
        }

        const questionText = lines[0];
        const answerLines = lines.slice(1, -1); // Tất cả dòng trừ dòng đầu và dòng cuối
        const correctAnswerLine = lines[lines.length - 1];

        // Parse đáp án
        const options = [];
        const explanations = [];
        
        answerLines.forEach((line, idx) => {
          const parts = line.split(':');
          if (parts.length < 2) {
            errors.push(`Đoạn ${sectionIdx + 1}, đáp án ${idx + 1}: Cần có dấu ':' để ngăn cách đáp án và giải thích`);
            return;
          }
          
          const answer = parts[0].trim();
          const explanation = parts.slice(1).join(':').trim(); // Cho phép nhiều dấu : trong giải thích
          
          options.push(answer);
          explanations.push(explanation);
        });

        // Parse chỉ số đáp án đúng
        const correctAnswerLetters = correctAnswerLine.split(/\s+/).map(str => str.trim().toUpperCase());
        
        // Chuyển đổi chữ cái thành chỉ số
        const correctAnswerIndices = correctAnswerLetters.map(letter => {
          const index = letter.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3...
          return (index >= 0 && index < options.length) ? index : -1;
        }).filter(idx => idx !== -1);

        if (correctAnswerIndices.length === 0) {
          errors.push(`Đoạn ${sectionIdx + 1}: Chỉ số đáp án đúng không hợp lệ. Phải từ A đến ${String.fromCharCode(64 + options.length)}`);
          return;
        }

        // Hỗ trợ đa đáp án đúng, nhưng lấy cái đầu tiên làm đại diện
        const correctAnswer = correctAnswerIndices[0];

        if (options.length < 2) {
          errors.push(`Đoạn ${sectionIdx + 1}: Cần ít nhất 2 đáp án`);
          return;
        }

        questions.push({
          question: questionText,
          options: options,
          explanations: explanations,
          correct_answer: correctAnswer,
          multiple_correct: correctAnswerIndices // Lưu tất cả đáp án đúng
        });
      });

      return { questions, errors };
    } catch (err) {
      return { questions: [], errors: ['Lỗi phân tích: ' + err.message] };
    }
  };

  // Preview realtime
  const livePreviewQuestions = useMemo(() => {
    try {
      const { questions } = parseQuestionsText(questionsText);
      return questions;
    } catch {
      return [];
    }
  }, [questionsText]);

  const totalSections = useMemo(() => {
    return questionsText.split(/\n\s*\n/).filter(section => section.trim()).length;
  }, [questionsText]);

  // Step handlers
  const handleContinueToTestInfo = () => {
    if (!questionsText.trim()) {
      setErrMsg('Vui lòng nhập danh sách câu hỏi');
      return;
    }
    
    const { questions, errors } = parseQuestionsText(questionsText);
    if (errors.length) {
      setErrMsg('Lỗi định dạng:\n' + errors.join('\n'));
      return;
    }
    
    if (!questions.length) {
      setErrMsg('Cần ít nhất 1 câu hỏi hợp lệ');
      return;
    }

    setParsedQuestions(questions);
    setErrMsg('');
    setCurrentStep('test-info');
  };

  const handleContinueToReview = () => {
    if (!testInfo.test_title.trim()) {
      setErrMsg('Vui lòng nhập tiêu đề bài test');
      return;
    }
    if (!testInfo.main_topic.trim()) {
      setErrMsg('Vui lòng nhập chủ đề chính');
      return;
    }
    if (!testInfo.sub_topic.trim()) {
      setErrMsg('Vui lòng nhập phân mục');
      return;
    }
    
    setErrMsg('');
    setCurrentStep('review');
  };

  const handleCreateTest = async () => {
    setLoading(true);
    setErrMsg('');
    setCurrentStep('creating');

    try {
      // Step 1: Create test metadata
      const testMetadata = {
        test_title: testInfo.test_title,
        description: testInfo.description,
        test_type: 'multiple_choice',
        main_topic: testInfo.main_topic,
        sub_topic: testInfo.sub_topic,
        difficulty: testInfo.difficulty,
        time_limit_minutes: testInfo.time_limit_minutes,
        visibility: testInfo.visibility,
        total_questions: parsedQuestions.length,
        status: 'active',
        created_by: user.id
      };

      console.log('Creating test metadata:', testMetadata);
      const newTest = await testService.createTest(testMetadata);
      const testId = newTest._id || newTest.id;
      
      if (!testId) {
        throw new Error('Test ID not returned from server');
      }
      
      console.log('Test created with ID:', testId);
      
      if (!mountedRef.current) return;

      setCreatedTest(newTest);

      // Step 2: Create individual questions
      const questionPromises = parsedQuestions.map((q, index) => {
        const questionData = {
          test_id: testId,
          question_text: q.question,
          options: q.options.map((text, idx) => ({
            label: String.fromCharCode(65 + idx), // A, B, C, D...
            text: text
          })),
          correct_answers: Array.isArray(q.multiple_correct) && q.multiple_correct.length > 0
            ? q.multiple_correct.map(idx => String.fromCharCode(65 + idx)) // Convert indices to letters
            : [String.fromCharCode(65 + q.correct_answer)], // Single answer as array
          explanation: {
            correct: q.explanations && q.explanations[q.correct_answer] 
              ? q.explanations[q.correct_answer] 
              : `Đáp án đúng là ${String.fromCharCode(65 + q.correct_answer)}`,
            incorrect_choices: q.explanations ? q.options.reduce((acc, _, idx) => {
              if (idx !== q.correct_answer && q.explanations[idx]) {
                acc[String.fromCharCode(65 + idx)] = q.explanations[idx];
              }
              return acc;
            }, {}) : {}
          },
          created_by: user.id,
          updated_by: user.id
        };
        
        console.log(`Creating question ${index + 1}:`, questionData);
        return MultipleChoiceService.createMultipleChoice(questionData);
      });

      await Promise.all(questionPromises);
      
      if (!mountedRef.current) return;

      setCurrentStep('success');

    } catch (err) {
      if (!mountedRef.current) return;
      console.error('Error creating test:', err);
      setCurrentStep('review');
      setErrMsg('Lỗi tạo bài test: ' + (err.response?.data?.message || err.message));
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const totalSteps = 3;
  const progressPct =
    currentStep === 'questions' ? (100 / totalSteps) * 1 :
      currentStep === 'test-info' ? (100 / totalSteps) * 2 :
        100;

  const modal = open ? createPortal(
    <div
      className="fixed inset-0 bg-neutral-900/60 backdrop-blur-[2px] flex items-center justify-center z-[9999] p-4"
      aria-modal="true"
      role="dialog"
    >
      <div
        ref={cardRef}
        className="bg-white rounded-xl shadow-2xl max-w-7xl w-full h-[92vh] overflow-hidden border border-neutral-200 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">
                {currentStep === 'questions' && 'Nhập Danh Sách Câu Hỏi'}
                {currentStep === 'test-info' && 'Thông Tin Bài Test'}
                {currentStep === 'review' && 'Xem Lại Thông Tin'}
                {currentStep === 'creating' && 'Đang Tạo Bài Test'}
                {currentStep === 'success' && 'Hoàn Thành!'}
              </h2>
              <p className="text-xs text-neutral-600">
                {currentStep === 'questions' && 'Bước 1/3 - Chuẩn bị câu hỏi trắc nghiệm'}
                {currentStep === 'test-info' && 'Bước 2/3 - Cấu hình bài test'}
                {currentStep === 'review' && 'Bước 3/3 - Kiểm tra thông tin'}
                {currentStep === 'creating' && 'Đang xử lý...'}
                {currentStep === 'success' && 'Bài test đã được tạo thành công'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-md transition disabled:opacity-50"
            aria-label="Đóng"
            type="button"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress */}
        {(currentStep === 'questions' || currentStep === 'test-info' || currentStep === 'review') && (
          <div className="px-6 py-3 bg-neutral-50 border-b border-neutral-200">
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-neutral-200 rounded-full h-2">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-xs font-medium text-neutral-700">
                {currentStep === 'questions' ? '1/3' : currentStep === 'test-info' ? '2/3' : '3/3'}
              </span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-neutral-50">
          <div className="p-6 space-y-6">
            {/* STEP 1 */}
            {currentStep === 'questions' && (
              <div className="space-y-6">
                {/* Tips */}
                <div className="bg-white border border-neutral-200 rounded-lg p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-md bg-neutral-200 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-neutral-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex flex-col justify-center">
                      <h3 className="font-semibold text-neutral-900 mb-2">Định dạng văn bản</h3>
                      <p className="text-sm text-neutral-700 mb-2 leading-relaxed">
                        Mỗi câu hỏi là một đoạn, các đoạn cách nhau bằng dòng trắng.
                        <br />
                        <strong>Cấu trúc mỗi đoạn:</strong>
                      </p>
                      <ul className="text-xs text-neutral-600 space-y-1 list-disc list-inside">
                        <li>Dòng 1: Câu hỏi</li>
                        <li>Dòng 2-n: Đáp án theo format <code className="bg-neutral-200 px-1 rounded">đáp_án:giải_thích</code></li>
                        <li>Dòng cuối: Chữ cái đáp án đúng (A, B, C, D...)</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 2 cột: textarea & preview */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                  {/* LEFT: Editor Card */}
                  <div
                    className="bg-white border border-neutral-200 rounded-lg flex flex-col overflow-hidden"
                    style={{ height: PANEL_HEIGHT }}
                  >
                    <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
                      <label className="text-sm font-medium text-neutral-900">
                        Danh sách câu hỏi <span className="text-rose-600">*</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-800 bg-neutral-100 px-2 py-1 rounded-full">
                          {totalSections} đoạn
                        </span>
                        <span className="text-xs text-emerald-800 bg-emerald-100 px-2 py-1 rounded-full">
                          {livePreviewQuestions.length} câu hỏi
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 p-3">
                      <textarea
                        value={questionsText}
                        onFocus={() => {
                          if (isSampleActive && questionsText.trim() === SAMPLE_QUESTIONS.trim()) {
                            setQuestionsText('');
                            setIsSampleActive(false);
                          }
                        }}
                        onChange={(e) => {
                          const v = e.target.value;
                          setQuestionsText(v);
                          if (isSampleActive && v !== SAMPLE_QUESTIONS) {
                            setIsSampleActive(false);
                          }
                        }}
                        placeholder={`Nhập theo format:\n\nCâu hỏi của bạn?\nĐáp án A: Giải thích cho đáp án A\nĐáp án B: Giải thích cho đáp án B\nĐáp án C: Giải thích cho đáp án C\nA B\n\nCâu hỏi tiếp theo?\n...`}
                        className={`w-full h-full resize-none px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono text-sm text-neutral-900 placeholder-neutral-500 ${
                          isSampleActive 
                            ? 'bg-blue-50 text-blue-800 border-blue-300' 
                            : 'bg-neutral-50'
                        }`}
                        aria-invalid={!!errMsg}
                      />
                    </div>

                    <div className="px-3 py-2 border-t border-neutral-200 flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setQuestionsText(''); setIsSampleActive(false); }}
                        className="px-3 py-1.5 text-xs font-medium text-neutral-800 bg-white border border-neutral-300 rounded-md hover:bg-neutral-100"
                      >
                        Xoá tất cả
                      </button>
                      <button
                        type="button"
                        onClick={() => { setQuestionsText(SAMPLE_QUESTIONS); setIsSampleActive(true); }}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700"
                      >
                        Dán ví dụ mẫu
                      </button>
                    </div>
                  </div>

                  {/* RIGHT: Preview Card */}
                  <div
                    className="bg-white border border-neutral-200 rounded-lg overflow-hidden flex flex-col"
                    style={{ height: PANEL_HEIGHT }}
                  >
                    <div className="px-6 py-4 bg-neutral-900">
                      <h3 className="text-base font-semibold text-white">Preview câu hỏi (cập nhật trực tiếp)</h3>
                      <p className="text-xs text-neutral-300">Format text với câu hỏi, đáp án:giải thích, chữ cái đáp án đúng (A, B, C...) — hỗ trợ multi-select</p>
                    </div>

                    <div className="flex-1 overflow-auto p-4">
                      {livePreviewQuestions.length === 0 ? (
                        <div className="text-center py-10 text-sm text-neutral-500">
                          Nội dung rỗng — bấm "Dán ví dụ mẫu" hoặc nhập text ở khung bên trái.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {livePreviewQuestions.map((q, idx) => (
                            <div key={idx} className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
                              <div className="font-semibold text-neutral-900 mb-2">
                                {idx + 1}. {q.question}
                              </div>
                              <div className="space-y-1">
                                {q.options.map((option, optIdx) => {
                                  const isCorrect = Array.isArray(q.multiple_correct)
                                    ? q.multiple_correct.includes(optIdx)
                                    : q.correct_answer === optIdx;

                                  return (
                                    <div
                                      key={optIdx}
                                      className={`text-sm p-2 rounded ${
                                        isCorrect
                                          ? 'bg-emerald-100 text-emerald-800 font-medium'
                                          : 'text-neutral-700'
                                      }`}
                                    >
                                      <div className="font-medium">
                                        {String.fromCharCode(65 + optIdx)}. {option}
                                        {isCorrect && ' ✓'}
                                      </div>
                                      {q.explanations && q.explanations[optIdx] && (
                                        <div className="text-xs text-neutral-600 mt-1 italic">
                                          → {q.explanations[optIdx]}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {errMsg && (
                  <div className="bg-rose-50 border border-rose-200 rounded-lg p-3" role="alert" aria-live="assertive">
                    <p className="text-sm text-rose-800 whitespace-pre-line">{errMsg}</p>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2 */}
            {currentStep === 'test-info' && (
              <div className="space-y-4">
                <div className="bg-white border border-neutral-200 rounded-lg p-4">
                  <h3 className="text-base font-semibold text-neutral-900 mb-1">Thông Tin Bài Test</h3>
                  <p className="text-sm text-neutral-700">
                    Đã phân tích <span className="font-semibold text-emerald-700">{parsedQuestions.length} câu hỏi</span>
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-neutral-800 mb-1">Tiêu đề bài test <span className="text-rose-600">*</span></label>
                    <input
                      type="text"
                      value={testInfo.test_title}
                      onChange={(e) => setTestInfo((p) => ({ ...p, test_title: e.target.value }))}
                      placeholder="VD: General Knowledge Quiz"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-neutral-50 text-neutral-900 placeholder-neutral-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-800 mb-1">Chủ đề chính <span className="text-rose-600">*</span></label>
                    <input
                      type="text"
                      value={testInfo.main_topic}
                      onChange={(e) => setTestInfo((p) => ({ ...p, main_topic: e.target.value }))}
                      placeholder="VD: General Knowledge, Science, History"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-neutral-50 text-neutral-900 placeholder-neutral-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-800 mb-1">Phân mục <span className="text-rose-600">*</span></label>
                    <input
                      type="text"
                      value={testInfo.sub_topic}
                      onChange={(e) => setTestInfo((p) => ({ ...p, sub_topic: e.target.value }))}
                      placeholder="VD: Basic Facts, Advanced Topics"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-neutral-50 text-neutral-900 placeholder-neutral-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-800 mb-1">Độ khó</label>
                    <select
                      value={testInfo.difficulty}
                      onChange={(e) => setTestInfo((p) => ({ ...p, difficulty: e.target.value }))}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-neutral-50 text-neutral-900"
                    >
                      <option value="easy">Dễ</option>
                      <option value="medium">Trung bình</option>
                      <option value="hard">Khó</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-800 mb-1">Thời gian (phút)</label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={testInfo.time_limit_minutes}
                      onChange={(e) => {
                        const parsed = parseInt(e.target.value, 10);
                        const clamped = Number.isFinite(parsed) ? Math.max(1, Math.min(120, parsed)) : 15;
                        setTestInfo((p) => ({ ...p, time_limit_minutes: clamped }));
                      }}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-neutral-50 text-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-800 mb-1">Chế độ hiển thị</label>
                    <select
                      value={testInfo.visibility}
                      onChange={(e) => setTestInfo((p) => ({ ...p, visibility: e.target.value }))}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-neutral-50 text-neutral-900"
                    >
                      <option value="public">🌍 Công khai - Mọi người có thể xem</option>
                      <option value="private">🔒 Riêng tư - Chỉ mình tôi</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-800 mb-1">Mô tả</label>
                  <textarea
                    value={testInfo.description}
                    onChange={(e) => setTestInfo((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Mô tả ngắn về bài test này..."
                    rows={3}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-neutral-50 text-neutral-900 placeholder-neutral-500 resize-none"
                  />
                </div>

                {errMsg && (
                  <div className="bg-rose-50 border border-rose-200 rounded-lg p-3" role="alert" aria-live="assertive">
                    <p className="text-sm text-rose-800">{errMsg}</p>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3 */}
            {currentStep === 'review' && (
              <div className="space-y-6">
                <div className="bg-white border border-neutral-200 rounded-lg p-6">
                  <h3 className="text-base font-semibold text-neutral-900 mb-4">Thông tin bài test</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-neutral-50 rounded-md p-3 border border-neutral-200">
                      <p className="text-xs font-medium text-neutral-600 uppercase">Tiêu đề</p>
                      <p className="text-sm font-semibold text-neutral-900 mt-1">{testInfo.test_title || '-'}</p>
                    </div>
                    <div className="bg-neutral-50 rounded-md p-3 border border-neutral-200">
                      <p className="text-xs font-medium text-neutral-600 uppercase">Chủ đề</p>
                      <p className="text-sm font-semibold text-neutral-900 mt-1">
                        {(testInfo.main_topic || '-') + ' - ' + (testInfo.sub_topic || '-')}
                      </p>
                    </div>
                    <div className="bg-neutral-50 rounded-md p-3 border border-neutral-200">
                      <p className="text-xs font-medium text-neutral-600 uppercase">Độ khó</p>
                      <p className="text-sm font-semibold text-neutral-900 mt-1 capitalize">
                        {testInfo.difficulty === 'easy' ? 'Dễ' : testInfo.difficulty === 'medium' ? 'Trung bình' : 'Khó'}
                      </p>
                    </div>
                    <div className="bg-neutral-50 rounded-md p-3 border border-neutral-200">
                      <p className="text-xs font-medium text-neutral-600 uppercase">Thời gian</p>
                      <p className="text-sm font-semibold text-neutral-900 mt-1">{testInfo.time_limit_minutes} phút</p>
                    </div>
                    <div className="bg-neutral-50 rounded-md p-3 border border-neutral-200">
                      <p className="text-xs font-medium text-neutral-600 uppercase">Số câu hỏi</p>
                      <p className="text-sm font-semibold text-neutral-900 mt-1">{parsedQuestions.length} câu</p>
                    </div>
                    <div className="bg-neutral-50 rounded-md p-3 border border-neutral-200">
                      <p className="text-xs font-medium text-neutral-600 uppercase">Chế độ hiển thị</p>
                      <p className="text-sm font-semibold text-neutral-900 mt-1">
                        {testInfo.visibility === 'public' ? '🌍 Công khai' : '🔒 Riêng tư'}
                      </p>
                    </div>
                    {testInfo.description && (
                      <div className="bg-neutral-50 rounded-md p-3 border border-neutral-200 md:col-span-2 lg:col-span-3">
                        <p className="text-xs font-medium text-neutral-600 uppercase">Mô tả</p>
                        <p className="text-sm text-neutral-900 mt-1">{testInfo.description}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
                  <div className="px-6 py-4 bg-neutral-900">
                    <h3 className="text-base font-semibold text-white">Danh sách câu hỏi ({parsedQuestions.length} câu)</h3>
                  </div>
                  <div className="overflow-x-auto p-4" style={{ maxHeight: 420 }}>
                    <div className="space-y-4">
                      {parsedQuestions.map((question, index) => (
                        <div key={index} className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
                          <div className="font-semibold text-neutral-900 mb-3">
                            {index + 1}. {question.question}
                          </div>
                          <div className="mb-2">
                            {Array.isArray(question.multiple_correct) && question.multiple_correct.length > 0 && (
                              <div className="text-sm text-emerald-700 mb-2">Đáp án đúng: {question.multiple_correct.map(i => String.fromCharCode(65 + i)).join(' ')}</div>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {question.options.map((option, optIdx) => {
                              const isCorrect = Array.isArray(question.multiple_correct)
                                ? question.multiple_correct.includes(optIdx)
                                : question.correct_answer === optIdx;

                              return (
                                <div
                                  key={optIdx}
                                  className={`text-sm p-2 rounded border ${
                                    isCorrect
                                      ? 'bg-emerald-100 border-emerald-300 text-emerald-800 font-medium'
                                      : 'bg-white border-neutral-200 text-neutral-700'
                                  }`}
                                >
                                  <div className="font-medium">
                                    {String.fromCharCode(65 + optIdx)}. {option}
                                    {isCorrect && ' ✓'}
                                  </div>
                                  {question.explanations && question.explanations[optIdx] && (
                                    <div className="text-xs text-neutral-600 mt-1 italic">
                                      → {question.explanations[optIdx]}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {errMsg && (
                  <div className="bg-rose-50 border border-rose-200 rounded-lg p-3" role="alert" aria-live="assertive">
                    <p className="text-sm text-rose-800 whitespace-pre-line">{errMsg}</p>
                  </div>
                )}
              </div>
            )}

            {/* STEP 4 */}
            {currentStep === 'creating' && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-2 border-neutral-200 border-t-emerald-600 mx-auto mb-4" />
                <h3 className="text-base font-medium text-neutral-900 mb-2">Đang tạo bài test...</h3>
                <p className="text-sm text-neutral-700">Đang tạo bài test với {parsedQuestions.length} câu hỏi</p>
              </div>
            )}

            {/* STEP 5 */}
            {currentStep === 'success' && (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-emerald-100 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-base font-medium text-neutral-900 mb-2">Tạo thành công!</h3>
                <p className="text-sm text-neutral-700 mb-6">
                  Bài test "<span className="font-semibold">{testInfo.test_title}</span>" đã được tạo với {parsedQuestions.length} câu hỏi.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => {
                      handleClose();
                      navigate(`/multiple-choice/test/${createdTest._id}/settings`);
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                  >
                    Làm bài test ngay
                  </button>
                  <button
                    onClick={() => {
                      handleClose();
                      navigate(`/multiple-choice/tests/${testInfo.main_topic}/${testInfo.sub_topic}`);
                    }}
                    className="px-4 py-2 text-sm font-medium text-emerald-600 bg-white border border-emerald-300 rounded-md hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                  >
                    Xem bài test
                  </button>
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {(currentStep === 'questions' || currentStep === 'test-info' || currentStep === 'review') && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-200 bg-white">
              <div className="flex gap-3">
                {currentStep === 'test-info' && (
                  <button
                    type="button"
                    onClick={() => { setCurrentStep('questions'); setErrMsg(''); }}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-neutral-800 bg-white border border-neutral-300 rounded-md hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
                  >
                    Quay lại
                  </button>
                )}
                {currentStep === 'review' && (
                  <button
                    type="button"
                    onClick={() => { setCurrentStep('test-info'); setErrMsg(''); }}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-neutral-800 bg-white border border-neutral-300 rounded-md hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
                  >
                    Quay lại
                  </button>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-neutral-800 bg-white border border-neutral-300 rounded-md hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
                >
                  Hủy
                </button>

                {currentStep === 'questions' && (
                  <button
                    type="button"
                    onClick={handleContinueToTestInfo}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
                  >
                    Tiếp tục
                  </button>
                )}

                {currentStep === 'test-info' && (
                  <button
                    type="button"
                    onClick={handleContinueToReview}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
                  >
                    Xem lại
                  </button>
                )}

                {currentStep === 'review' && (
                  <button
                    type="button"
                    onClick={handleCreateTest}
                    disabled={loading}
                    className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 border border-transparent rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600 disabled:opacity-50"
                  >
                    {loading ? 'Đang tạo...' : 'Tạo bài test'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        type="button"
      >
        <PlusIcon />
        {label}
      </button>

      {modal}
    </>
  );
}
