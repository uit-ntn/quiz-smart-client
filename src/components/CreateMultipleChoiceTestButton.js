import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import testService from '../services/testService';
import topicService from '../services/topicService';
import MultipleChoiceService from '../services/multipleChoiceService';
import { getCorrectAnswerLabels } from '../utils/correctAnswerHelpers';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const isLikelyColdStartNetworkError = (err) => {
  const msg = String(err?.message || err || '').toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network error') ||
    msg.includes('load failed') ||
    msg.includes('the network connection was lost') ||
    msg.includes('timeout') ||
    msg.includes('timed out')
  );
};

const withRetry = async (fn, { attempts = 3, baseDelayMs = 1500 } = {}) => {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn(i);
    } catch (e) {
      lastErr = e;
      if (!isLikelyColdStartNetworkError(e) || i === attempts - 1) throw e;
      await sleep(baseDelayMs * Math.pow(2, i));
    }
  }
  throw lastErr;
};

/** Ví dụ mẫu cho multiple choice */
const SAMPLE_QUESTIONS = `What is the capital of France?
London; The capital of United Kingdom
Berlin; The capital of Germany  
Paris; The capital of France
Madrid; The capital of Spain
C

Which programming language is known for 'write once, run anywhere'?
Python; A general-purpose programming language
Java; Known for platform independence
C++; A systems programming language
JavaScript; A web programming language
B

What does HTML stand for?
Hyper Text Markup Language; The correct definition
High Tech Modern Language; Not correct
Home Tool Markup Language; Not correct
Hyperlink and Text Markup Language; Not correct
A`;

/** Chiều cao đồng nhất cho 2 panel bước 1 (px) */
const PANEL_HEIGHT = 520;

const PlusIcon = (props) => (
  <svg {...props} className={`w-4 h-4 ${props.className || ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

export default function CreateMultipleChoiceTestButton({ label = "Tạo bài test trắc nghiệm", className = '' }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Modal state
  const [open, setOpen] = useState(false);
  
  // Steps: 'test-info' -> 'questions' -> 'review' -> 'creating' -> 'success'
  const [currentStep, setCurrentStep] = useState('test-info');
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [warmupSecLeft, setWarmupSecLeft] = useState(0);

  // Step 1: Test Info
  const [testInfo, setTestInfo] = useState({
    test_title: '',
    description: '',
    main_topic: '',
    sub_topic: '',
    difficulty: 'easy',
    time_limit_minutes: 15,
    visibility: 'public',
  });
  
  // Topics data
  const [mainTopics, setMainTopics] = useState([]);
  const [subTopics, setSubTopics] = useState([]);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [customMainTopic, setCustomMainTopic] = useState('');
  const [customSubTopic, setCustomSubTopic] = useState('');
  const [showCustomMainTopic, setShowCustomMainTopic] = useState(false);
  const [showCustomSubTopic, setShowCustomSubTopic] = useState(false);

  // Step 2: Questions
  const [questionsText, setQuestionsText] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [hasSeededSample, setHasSeededSample] = useState(false);
  const [isSampleActive, setIsSampleActive] = useState(false);

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

  // Load main topics when modal opens
  useEffect(() => {
    if (open && mainTopics.length === 0) {
      loadMainTopics();
    }
  }, [open]);

  // Load sub topics when main topic changes
  useEffect(() => {
    if (testInfo.main_topic && testInfo.main_topic !== 'other') {
      loadSubTopics(testInfo.main_topic);
      setShowCustomSubTopic(false);
    } else {
      setSubTopics([]);
      if (showCustomMainTopic) {
        setShowCustomSubTopic(true);
        setTestInfo(p => ({ ...p, sub_topic: '' }));
      }
    }
  }, [testInfo.main_topic, showCustomMainTopic]);

  // Seed sample when entering questions step
  useEffect(() => {
    if (currentStep === 'questions' && !hasSeededSample) {
      setQuestionsText(SAMPLE_QUESTIONS);
      setHasSeededSample(true);
      setIsSampleActive(true);
    }
  }, [currentStep, hasSeededSample]);

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

  // Load main topics
  const loadMainTopics = async () => {
    try {
      setLoadingTopics(true);
      const topics = await topicService.getAllTopics({ include_inactive: true });
      // Ensure topics is an array
      const topicsArray = Array.isArray(topics) ? topics : [];
      // Transform to format expected by component
      const formattedTopics = topicsArray.map(topic => {
        const topicId = topic._id || topic.id || null;
        return {
          id: topicId,
          _id: topicId, // Keep both for compatibility
          mainTopic: topic.name || '',
          total_tests: topic.total_tests || 0,
          total_questions: topic.total_questions || 0,
          total_subtopics: topic.total_subtopics || 0
        };
      });
      setMainTopics(formattedTopics);
    } catch (error) {
      console.error('Error loading main topics:', error);
      setErrMsg('Lỗi tải danh sách chủ đề chính: ' + (error.message || 'Lỗi không xác định'));
    } finally {
      setLoadingTopics(false);
    }
  };

  // Load sub topics
  const loadSubTopics = async (mainTopic) => {
    try {
      setLoadingTopics(true);
      const subtopics = await topicService.getSubTopicsByMainTopic(mainTopic);
      // Ensure subtopics is an array
      const subtopicsArray = Array.isArray(subtopics) ? subtopics : [];
      // Transform to format expected by component
      const formattedSubtopics = subtopicsArray.map(st => {
        const subtopicId = st._id || st.id || null;
        return {
          id: subtopicId,
          _id: subtopicId, // Keep both for compatibility
          subTopic: st.name || '',
          main_topic: mainTopic,
          total_tests: st.total_tests || 0,
          total_questions: st.total_questions || 0
        };
      });
      setSubTopics(formattedSubtopics);
    } catch (error) {
      console.error('Error loading sub topics:', error);
      setErrMsg('Lỗi tải danh sách phân mục: ' + (error.message || 'Lỗi không xác định'));
    } finally {
      setLoadingTopics(false);
    }
  };

  // Reset + close
  const handleClose = () => {
    setCurrentStep('test-info');
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
    setMainTopics([]);
    setSubTopics([]);
    setCustomMainTopic('');
    setCustomSubTopic('');
    setShowCustomMainTopic(false);
    setShowCustomSubTopic(false);
    setErrMsg('');
    setLoading(false);
    setWarmupSecLeft(0);
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
          const parts = line.split(';');
          if (parts.length < 2) {
            errors.push(`Đoạn ${sectionIdx + 1}, đáp án ${idx + 1}: Cần có dấu ';' để ngăn cách đáp án và giải thích`);
            return;
          }
          
          const answer = parts[0].trim();
          const explanation = parts.slice(1).join(';').trim(); // Cho phép nhiều dấu ; trong giải thích
          
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
  const handleContinueToQuestions = () => {
    if (!testInfo.test_title.trim()) {
      setErrMsg('Vui lòng nhập tiêu đề bài test');
      return;
    }
    
    const finalMainTopic = showCustomMainTopic ? customMainTopic.trim() : testInfo.main_topic;
    const finalSubTopic = showCustomSubTopic ? customSubTopic.trim() : testInfo.sub_topic;
    
    if (!finalMainTopic) {
      setErrMsg('Vui lòng chọn hoặc nhập chủ đề chính');
      return;
    }
    if (!finalSubTopic) {
      setErrMsg('Vui lòng chọn hoặc nhập phân mục');
      return;
    }
    
    // Update testInfo with final values
    setTestInfo(prev => ({
      ...prev,
      main_topic: finalMainTopic,
      sub_topic: finalSubTopic
    }));
    
    setErrMsg('');
    setCurrentStep('questions');
  };

  const handleContinueToReview = () => {
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
    setCurrentStep('review');
  };

  const handleCreateTest = async () => {
    setLoading(true);
    setErrMsg('');
    setWarmupSecLeft(0);
    setCurrentStep('creating');

    try {
      // Step: Get or create topic and subtopic IDs
      let topicId = null;
      let subtopicId = null;

      // Handle main topic
      if (showCustomMainTopic && customMainTopic.trim()) {
        // Create new main topic
        try {
          const newTopic = await topicService.createTopic({
            name: customMainTopic.trim(),
            active: true
          });
          topicId = newTopic._id || newTopic.id;
          if (!topicId) {
            throw new Error('Không nhận được ID từ chủ đề chính mới tạo');
          }
        } catch (error) {
          console.error('Error creating main topic:', error);
          throw new Error('Không thể tạo chủ đề chính mới: ' + (error.message || 'Lỗi không xác định'));
        }
      } else {
        // Find existing main topic ID from loaded data first
        const existingTopic = mainTopics.find(topic => topic.mainTopic === testInfo.main_topic);
        if (existingTopic && (existingTopic.id || existingTopic._id)) {
          topicId = existingTopic.id || existingTopic._id;
        } else {
          // Fallback: Fetch topic by name to get ID
          try {
            console.log('Fetching topic by name:', testInfo.main_topic);
            const topicData = await topicService.getTopicByName(testInfo.main_topic);
            topicId = topicData._id || topicData.id;
            if (!topicId) {
              throw new Error('Không tìm thấy ID của chủ đề chính: ' + testInfo.main_topic);
            }
          } catch (error) {
            console.error('Error fetching topic by name:', error);
            throw new Error('Không thể tìm chủ đề chính: ' + testInfo.main_topic);
          }
        }
      }

      // Handle sub topic
      if (showCustomSubTopic && customSubTopic.trim()) {
        // Create new subtopic using addSubTopic
        try {
          if (!topicId) {
            throw new Error('Cần ID chủ đề chính để tạo phân mục mới');
          }
          // addSubTopic returns the updated topic with sub_topics array
          const response = await topicService.addSubTopic(testInfo.main_topic, {
            name: customSubTopic.trim(),
            active: true
          });
          
          // Response format from service: { success: true, data: topic } or just topic object
          // Topic has sub_topics array, find the newly created one by name
          const topicData = response.data || response;
          const subTopicsArray = topicData.sub_topics || [];
          
          // Find the newly created subtopic from the response
          const newSubtopic = subTopicsArray.find(st => {
            const stName = String(st.name || '').trim();
            const searchName = customSubTopic.trim();
            return stName.toLowerCase() === searchName.toLowerCase();
          });
          
          if (newSubtopic) {
            subtopicId = newSubtopic._id || newSubtopic.id || newSubtopic.subtopic_id;
          }
          
          // Fallback: If not found in response, fetch subtopics using API
          if (!subtopicId) {
            console.log('Subtopic ID not found in response, fetching from API...');
            const updatedSubtopics = await topicService.getSubTopicsByMainTopic(testInfo.main_topic);
            const foundSubtopic = updatedSubtopics.find(st => {
              const stName = String(st.name || '').trim();
              const searchName = customSubTopic.trim();
              return stName.toLowerCase() === searchName.toLowerCase();
            });
            if (foundSubtopic) {
              // getSubTopicsByMainTopic returns format: { subtopic_id, name, ... }
              subtopicId = foundSubtopic.subtopic_id || foundSubtopic._id || foundSubtopic.id;
            }
          }
          
          if (!subtopicId) {
            throw new Error('Không nhận được ID từ phân mục mới tạo. Vui lòng thử lại.');
          }
        } catch (error) {
          console.error('Error creating subtopic:', error);
          throw new Error('Không thể tạo phân mục mới: ' + (error.message || 'Lỗi không xác định'));
        }
      } else {
        // Find existing subtopic ID from loaded data first
        const searchName = String(testInfo.sub_topic || '').trim().toLowerCase();
        const existingSubtopic = subTopics.find(st => {
          const stName = String(st.subTopic || st.name || '').trim().toLowerCase();
          return stName === searchName;
        });
        
        if (existingSubtopic) {
          // Check multiple possible ID fields
          subtopicId = existingSubtopic.subtopic_id || existingSubtopic.id || existingSubtopic._id;
        }
        
        // Fallback: If not found in loaded data, fetch from API
        if (!subtopicId) {
          try {
            console.log('Subtopic not found in loaded data, fetching from API:', testInfo.sub_topic, 'in topic:', testInfo.main_topic);
            const subtopicsData = await topicService.getSubTopicsByMainTopic(testInfo.main_topic);
            const foundSubtopic = subtopicsData.find(st => {
              const stName = String(st.name || '').trim().toLowerCase();
              return stName === searchName;
            });
            if (foundSubtopic) {
              // getSubTopicsByMainTopic returns format: { subtopic_id, name, ... }
              subtopicId = foundSubtopic.subtopic_id || foundSubtopic._id || foundSubtopic.id;
            }
            
            if (!subtopicId) {
              throw new Error('Không tìm thấy phân mục "' + testInfo.sub_topic + '" trong chủ đề "' + testInfo.main_topic + '"');
            }
          } catch (error) {
            console.error('Error fetching subtopic:', error);
            throw new Error('Không thể tìm phân mục "' + testInfo.sub_topic + '": ' + (error.message || 'Lỗi không xác định'));
          }
        }
      }

      // Validate that we have both IDs
      if (!topicId) {
        throw new Error('Thiếu ID chủ đề chính. Vui lòng thử lại.');
      }
      if (!subtopicId) {
        throw new Error('Thiếu ID phân mục. Vui lòng thử lại.');
      }

      // Step: Create test metadata
      const testMetadata = {
        test_title: testInfo.test_title,
        description: testInfo.description || '',
        test_type: 'multiple_choice',
        topic_id: topicId,
        subtopic_id: subtopicId,
        main_topic: testInfo.main_topic, // Keep for backward compatibility
        sub_topic: testInfo.sub_topic, // Keep for backward compatibility
        difficulty: testInfo.difficulty,
        time_limit_minutes: testInfo.time_limit_minutes,
        visibility: testInfo.visibility,
        total_questions: parsedQuestions.length,
        status: 'active',
        created_by: user.id || user._id
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

      // Cold start warm-up: đợi 5–10s trước khi bắn hàng loạt request tạo câu hỏi
      const WARMUP_SECONDS = 7;
      setWarmupSecLeft(WARMUP_SECONDS);
      for (let s = WARMUP_SECONDS; s > 0; s--) {
        if (!mountedRef.current) return;
        setWarmupSecLeft(s);
        await sleep(1000);
      }
      setWarmupSecLeft(0);

      // Step 1: Create individual questions
      const questionPromises = parsedQuestions.map((q, index) => {
        const questionData = {
          test_id: testId,
          question_text: q.question,
          options: q.options.map((text, idx) => ({
            label: String.fromCharCode(65 + idx), // A, B, C, D...
            text: text
          })),
          // Convert to Map format: {"A": true, "B": false, "C": false, "D": false}
          correct_answers: (() => {
            const correctMap = {};
            q.options.forEach((_, idx) => {
              const optionLetter = String.fromCharCode(65 + idx);
              const isCorrect = Array.isArray(q.multiple_correct) && q.multiple_correct.length > 0
                ? q.multiple_correct.includes(idx)
                : q.correct_answer === idx;
              correctMap[optionLetter] = isCorrect;
            });
            return correctMap;
          })(),
          explanation: {
            // explanation.correct is now an object like incorrect_choices
            correct: (() => {
              const correctObj = {};
              const correctIndices = Array.isArray(q.multiple_correct) && q.multiple_correct.length > 0
                ? q.multiple_correct
                : [q.correct_answer];
              
              correctIndices.forEach(idx => {
                const optionLetter = String.fromCharCode(65 + idx);
                const explanationText = q.explanations && q.explanations[idx] 
                  ? q.explanations[idx]
                  : `Đáp án đúng là ${optionLetter}`;
                correctObj[optionLetter] = explanationText;
              });
              
              return correctObj;
            })(),
            incorrect_choices: q.explanations ? q.options.reduce((acc, _, idx) => {
              const isCorrectAnswer = Array.isArray(q.multiple_correct) && q.multiple_correct.length > 0
                ? q.multiple_correct.includes(idx)
                : q.correct_answer === idx;
              
              if (!isCorrectAnswer && q.explanations[idx]) {
                acc[String.fromCharCode(65 + idx)] = q.explanations[idx];
              }
              return acc;
            }, {}) : {}
          },
          created_by: user.id,
          updated_by: user.id
        };
        
        console.log(`Creating question ${index + 1}:`, questionData);
        return withRetry(() => MultipleChoiceService.createMultipleChoice(questionData), {
          attempts: 3,
          baseDelayMs: 1500,
        });
      });

      await Promise.all(questionPromises);
      
      if (!mountedRef.current) return;

      setCurrentStep('success');

    } catch (err) {
      if (!mountedRef.current) return;
      console.error('Error creating test:', err);
      setCurrentStep('review');
      
      // Handle specific error messages
      const errorMessage = err.response?.data?.message || err.message || 'Lỗi không xác định';
      
      if (errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
        setErrMsg(
          `Tên bài test "${testInfo.test_title}" đã tồn tại trong chủ đề "${testInfo.main_topic}" - "${testInfo.sub_topic}".\n\n` +
          `Vui lòng đổi tên bài test hoặc xóa bài test cũ nếu muốn tạo mới.`
        );
      } else {
        setErrMsg('Lỗi tạo bài test: ' + errorMessage);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const totalSteps = 3;
  const progressPct =
    currentStep === 'test-info' ? (100 / totalSteps) * 1 :
      currentStep === 'questions' ? (100 / totalSteps) * 2 :
        100;

  const modal = open ? createPortal(
    <div
      className="fixed inset-0 bg-neutral-900/60 backdrop-blur-[2px] flex items-center justify-center z-[9999] p-4"
      aria-modal="true"
      role="dialog"
    >
      <div
        ref={cardRef}
        className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full h-[92vh] overflow-hidden border-[3px] border-emerald-400 ring-2 ring-emerald-200 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 border-2 border-white/40 text-white flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">
                {currentStep === 'test-info' && 'Thông Tin Bài Test'}
                {currentStep === 'questions' && 'Nhập Danh Sách Câu Hỏi'}
                {currentStep === 'review' && 'Xem Lại Thông Tin'}
                {currentStep === 'creating' && 'Đang Tạo Bài Test'}
                {currentStep === 'success' && 'Hoàn Thành! 🎉'}
              </h2>
              <p className="text-xs text-emerald-100 font-medium">
                {currentStep === 'test-info' && 'Bước 1/3 — Cấu hình bài test'}
                {currentStep === 'questions' && 'Bước 2/3 — Chuẩn bị câu hỏi trắc nghiệm'}
                {currentStep === 'review' && 'Bước 3/3 — Kiểm tra thông tin'}
                {currentStep === 'creating' && 'Đang xử lý...'}
                {currentStep === 'success' && 'Bài test đã được tạo thành công'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="w-8 h-8 rounded-xl bg-white/20 border-2 border-white/40 flex items-center justify-center text-white hover:bg-white/30 transition disabled:opacity-50"
            aria-label="Đóng"
            type="button"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress */}
        {(currentStep === 'test-info' || currentStep === 'questions' || currentStep === 'review') && (
          <div className="px-5 py-2.5 bg-emerald-50 border-b-2 border-emerald-200 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-emerald-200 rounded-full h-2.5">
                <div
                  className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="inline-flex items-center rounded-full border-2 border-emerald-400 bg-emerald-100 px-2 py-0.5 text-[11px] font-extrabold text-emerald-700">
                {currentStep === 'test-info' ? '1/3' : currentStep === 'questions' ? '2/3' : '3/3'}
              </span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 flex flex-col bg-gradient-to-br from-sky-50 to-blue-50 min-h-0">
          <div className="flex-1 p-6 overflow-y-auto">
            {/* STEP 1: TEST INFO */}
            {currentStep === 'test-info' && (
              <div className="space-y-4">
                <div className="bg-white border border-neutral-200 rounded-lg p-4">
                  <h3 className="text-base font-semibold text-neutral-900 mb-1">Thông Tin Bài Test</h3>
                  <p className="text-sm text-neutral-700">
                    Cấu hình thông tin cơ bản cho bài test trắc nghiệm
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
                    {showCustomMainTopic ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customMainTopic}
                          onChange={(e) => setCustomMainTopic(e.target.value)}
                          placeholder="Nhập chủ đề chính mới..."
                          className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-neutral-50 text-neutral-900 placeholder-neutral-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setShowCustomMainTopic(false);
                            setCustomMainTopic('');
                          }}
                          className="px-3 py-2 text-sm text-neutral-600 bg-neutral-100 border border-neutral-300 rounded-lg hover:bg-neutral-200"
                        >
                          Hủy
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <select
                          value={testInfo.main_topic}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === 'other') {
                              setShowCustomMainTopic(true);
                              setTestInfo(p => ({ ...p, main_topic: '' }));
                            } else {
                              setTestInfo(p => ({ ...p, main_topic: value }));
                            }
                          }}
                          disabled={loadingTopics}
                          className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-neutral-50 text-neutral-900 disabled:opacity-50"
                        >
                          <option value="">-- Chọn chủ đề chính --</option>
                          {mainTopics.map((topic) => (
                            <option key={topic.mainTopic} value={topic.mainTopic}>
                              {topic.mainTopic} ({topic.total_tests} bài test)
                            </option>
                          ))}
                          <option value="other">🆕 Khác (tự nhập)</option>
                        </select>
                        {loadingTopics && (
                          <div className="flex items-center px-3">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-neutral-200 border-t-emerald-600"></div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-800 mb-1">Phân mục <span className="text-rose-600">*</span></label>
                    {showCustomSubTopic ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customSubTopic}
                          onChange={(e) => setCustomSubTopic(e.target.value)}
                          placeholder="Nhập phân mục mới..."
                          className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-neutral-50 text-neutral-900 placeholder-neutral-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setShowCustomSubTopic(false);
                            setCustomSubTopic('');
                          }}
                          className="px-3 py-2 text-sm text-neutral-600 bg-neutral-100 border border-neutral-300 rounded-lg hover:bg-neutral-200"
                        >
                          Hủy
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <select
                          value={testInfo.sub_topic}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === 'other') {
                              setShowCustomSubTopic(true);
                              setTestInfo(p => ({ ...p, sub_topic: '' }));
                            } else {
                              setTestInfo(p => ({ ...p, sub_topic: value }));
                            }
                          }}
                          disabled={loadingTopics || (!testInfo.main_topic && !showCustomMainTopic)}
                          className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-neutral-50 text-neutral-900 disabled:opacity-50"
                        >
                          <option value="">-- Chọn phân mục --</option>
                          {subTopics.map((topic) => (
                            <option key={topic.subTopic} value={topic.subTopic}>
                              {topic.subTopic} ({topic.total_tests} bài test)
                            </option>
                          ))}
                          <option value="other">🆕 Khác (tự nhập)</option>
                        </select>
                        {loadingTopics && (
                          <div className="flex items-center px-3">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-neutral-200 border-t-emerald-600"></div>
                          </div>
                        )}
                      </div>
                    )}
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
              </div>
            )}

            {/* STEP 2: QUESTIONS */}
            {currentStep === 'questions' && (
              <div className="h-full flex flex-col space-y-4">
                <div className="bg-white border border-neutral-200 rounded-lg p-4 flex-shrink-0">
                  <h3 className="text-base font-semibold text-neutral-900 mb-2">Nhập Danh Sách Câu Hỏi</h3>
                  <div className="text-xs text-neutral-700">
                    <p className="mb-3 text-xs">Nhập các câu hỏi trắc nghiệm theo định dạng sau. Mỗi câu hỏi cách nhau một dòng trống:</p>

                    <div className="flex flex-col lg:flex-row gap-4">
                      {/* Left: example block */}
                      <div className="flex-1 bg-neutral-50 border border-neutral-200 rounded-md p-3 text-xs font-mono">
                        <div className="space-y-1">
                          <div><span className="text-blue-600 font-medium">Câu hỏi cần hỏi?</span></div>
                          <div><span className="text-rose-600">Đáp án</span>; <span className="text-neutral-600">Giải thích cho đáp án</span></div>
                          <div><span className="text-rose-600">Đáp án</span>; <span className="text-neutral-600">Giải thích cho đáp án</span></div>
                          <div><span className="text-rose-600">Đáp án</span>; <span className="text-neutral-600">Giải thích cho đáp án</span></div>
                          <div><span className="text-emerald-600 font-bold">A</span> <span className="text-neutral-500">(đáp án đúng)</span></div>
                        </div>
                      </div>

                      {/* Right: rules / notes */}
                      <div className="flex-1 bg-white border border-neutral-200 rounded-md p-3 text-xs text-neutral-700">
                        <ul className="list-disc pl-5 space-y-2 text-neutral-500 text-xs">
                          <li>Dấu ";" ngăn cách đáp án và giải thích</li>
                          <li>Mỗi câu hỏi cách nhau một dòng trống</li>
                          <li>Hỗ trợ đa đáp án đúng: Liệt kê các chữ cái đáp án đúng ở dòng cuối, cách nhau bởi dấu cách (ví dụ: A C)</li>
                          <li>Không ghi label đáp án (A, B, C, D...); hệ thống sẽ tự thêm</li>
                          <li>Chữ cái cuối là đáp án đúng (A, B, C, D...)</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
                  {/* Left Panel - Input */}
                  <div className="bg-white border border-neutral-200 rounded-xl flex flex-col">
                    <div className="flex items-center justify-between p-4 border-b border-neutral-200 flex-shrink-0">
                      <h2 className="text-lg font-bold text-neutral-900">Danh sách câu hỏi</h2>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setQuestionsText(SAMPLE_QUESTIONS);
                            setIsSampleActive(true);
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100"
                        >
                          📝 Tải mẫu
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setQuestionsText('');
                            setIsSampleActive(false);
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100"
                        >
                          🗑️ Xóa tất cả
                        </button>
                      </div>
                    </div>

                    <textarea
                      value={questionsText}
                      onChange={(e) => {
                        setQuestionsText(e.target.value);
                        setIsSampleActive(false);
                      }}
                      placeholder={`Ví dụ:

What is the capital of France?
London; The capital of United Kingdom
Berlin; The capital of Germany
Paris; The capital of France
Madrid; The capital of Spain
C

Which programming language is known for 'write once, run anywhere'?
Python; A general-purpose programming language
Java; Known for platform independence
C++; A systems programming language
JavaScript; A web programming language
B`}
                      className="flex-1 resize-none px-4 py-3 text-sm font-mono border-0 focus:outline-none bg-neutral-50 text-neutral-900 placeholder-neutral-500"
                    />
                  </div>

                  {/* Right Panel - Preview */}
                  <div className="bg-white border border-neutral-200 rounded-xl flex flex-col">
                    <div className="flex items-center justify-between p-4 border-b border-neutral-200 flex-shrink-0">
                      <h2 className="text-lg font-bold text-neutral-900">Xem trước</h2>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="px-2 py-1 bg-neutral-100 text-neutral-700 rounded text-xs font-medium">
                          {totalSections} đoạn
                        </span>
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
                          {livePreviewQuestions.length} câu hỏi
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 p-4 overflow-y-auto">
                      {livePreviewQuestions.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-neutral-500">
                          <div className="text-center">
                            <svg className="w-12 h-12 mx-auto mb-3 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-sm text-neutral-500 font-medium">Chưa có câu hỏi nào</p>
                            <p className="text-xs text-neutral-400 mt-1">Nhập câu hỏi bên trái để xem trước</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {livePreviewQuestions.map((question, index) => (
                            <div key={index} className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
                              <div className="font-semibold text-neutral-900 mb-2 text-sm leading-tight">
                                <span className="text-emerald-600 font-bold">{index + 1}.</span> {question.question}
                              </div>

                              <div className="space-y-2">
                                {question.options.map((option, optIdx) => {
                                  const isCorrect = Array.isArray(question.multiple_correct)
                                    ? question.multiple_correct.includes(optIdx)
                                    : question.correct_answer === optIdx;

                                  return (
                                    <div
                                      key={optIdx}
                                      className={`text-sm p-2 rounded-md border ${
                                        isCorrect
                                          ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                                          : 'bg-white border-neutral-200 text-neutral-700'
                                      }`}
                                    >
                                      <div className="font-medium flex items-start">
                                        <span className={`mr-2 font-bold ${
                                          isCorrect ? 'text-emerald-700' : 'text-neutral-600'
                                        }`}>
                                          {String.fromCharCode(65 + optIdx)}.
                                        </span>
                                        <span className="flex-1">{option}</span>
                                        {isCorrect && <span className="text-emerald-600 ml-2">✓</span>}
                                      </div>
                                      {question.explanations && question.explanations[optIdx] && (
                                        <div className="text-xs text-neutral-600 mt-1 ml-4 italic">
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
                      )}
                    </div>
                  </div>
                </div>
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
              </div>
            )}

            {/* STEP 4 */}
            {currentStep === 'creating' && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-2 border-neutral-200 border-t-emerald-600 mx-auto mb-4" />
                <h3 className="text-base font-medium text-neutral-900 mb-2">Đang tạo bài test...</h3>
                <p className="text-sm text-neutral-700">
                  {warmupSecLeft > 0
                    ? `Đang khởi động server... (${warmupSecLeft}s) — sau đó sẽ tạo ${parsedQuestions.length} câu hỏi`
                    : `Đang tạo bài test với ${parsedQuestions.length} câu hỏi`}
                </p>
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
                      navigate(`/test/${testInfo.main_topic}/${testInfo.sub_topic}?type=multiple-choice`);
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
          {(currentStep === 'test-info' || currentStep === 'questions' || currentStep === 'review') && (
            <div className="border-t-2 border-emerald-200 bg-emerald-50 flex-shrink-0">
              {errMsg && (
                <div className="px-5 pt-3 pb-2">
                  <div className="bg-rose-100 border-2 border-rose-400 rounded-xl p-3" role="alert" aria-live="assertive">
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-xs font-extrabold text-rose-900 mb-1">Lỗi xảy ra!</p>
                        <p className="text-xs text-rose-800 whitespace-pre-line mb-2">{errMsg}</p>
                        {errMsg.includes('đã tồn tại') && (
                          <button type="button" onClick={() => { setCurrentStep('test-info'); setErrMsg(''); }}
                            className="px-3 py-1.5 text-xs font-extrabold text-rose-700 bg-white border-2 border-rose-400 rounded-lg hover:bg-rose-50 transition-colors">
                            ← Quay lại để đổi tên
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between px-5 py-3">
                <div className="flex gap-2">
                  {currentStep === 'questions' && (
                    <button type="button" onClick={() => { setCurrentStep('test-info'); setErrMsg(''); }} disabled={loading}
                      className="px-4 py-2 text-xs font-extrabold text-slate-700 bg-white border-[3px] border-slate-300 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors">
                      ← Quay lại
                    </button>
                  )}
                  {currentStep === 'review' && (
                    <button type="button" onClick={() => { setCurrentStep('questions'); setErrMsg(''); }} disabled={loading}
                      className="px-4 py-2 text-xs font-extrabold text-slate-700 bg-white border-[3px] border-slate-300 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors">
                      ← Quay lại
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={handleClose} disabled={loading}
                    className="px-4 py-2 text-xs font-extrabold text-slate-700 bg-white border-[3px] border-slate-300 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors">
                    Hủy
                  </button>
                  {currentStep === 'test-info' && (
                    <button type="button" onClick={handleContinueToQuestions} disabled={loading}
                      className="px-4 py-2 text-xs font-extrabold text-white bg-emerald-600 border-[3px] border-emerald-800 rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                      Tiếp tục →
                    </button>
                  )}
                  {currentStep === 'questions' && (
                    <button type="button" onClick={handleContinueToReview} disabled={loading}
                      className="px-4 py-2 text-xs font-extrabold text-white bg-emerald-600 border-[3px] border-emerald-800 rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                      Xem lại →
                    </button>
                  )}
                  {currentStep === 'review' && (
                    <button type="button" onClick={handleCreateTest} disabled={loading}
                      className="px-5 py-2 text-xs font-extrabold text-white bg-gradient-to-r from-emerald-600 to-teal-600 border-[3px] border-emerald-800 rounded-xl hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 transition-colors shadow-md">
                      {loading ? 'Đang tạo...' : '✅ Tạo bài test'}
                    </button>
                  )}
                </div>
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
        className={`inline-flex items-center gap-2 rounded-xl px-3.5 h-10 min-h-[44px] text-sm font-extrabold text-white bg-emerald-600 border-[3px] border-emerald-800 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-md transition-colors ${className}`}
        type="button"
      >
        <span aria-hidden className="text-lg">🧩</span>
        {label}
      </button>

      {modal}
    </>
  );
}

