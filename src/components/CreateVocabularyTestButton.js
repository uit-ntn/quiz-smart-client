import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import testService from '../services/testService';
import vocabularyService from '../services/vocabularyService';
import topicService from '../services/topicService';

/** Ví dụ mặc định */
const SAMPLE_VOCAB = `aisle;noun;A2;lối đi giữa các hàng ghế/kệ;Passengers are walking down the aisle.
schedule;noun;B1;lịch trình;Please check your schedule before the meeting.
colleague;noun;B2;đồng nghiệp;I discussed the project with my colleague.
opportunity;noun;B2;cơ hội;This is a great opportunity for you to learn.
environment;noun;B1;môi trường;We need to protect the environment for future generations.`;

/** Chiều cao đồng nhất cho 2 panel bước 1 (px) */
const PANEL_HEIGHT = 520;

const CreateVocabularyTestButton = ({ className = '' }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Modal state
  const [showModal, setShowModal] = useState(false);
  
  // Steps: 'test-info' -> 'vocabulary' -> 'review' -> 'creating' -> 'success'
  const [currentStep, setCurrentStep] = useState('test-info');
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  // Step
  const [vocabularyText, setVocabularyText] = useState('');
  const [parsedVocabularies, setParsedVocabularies] = useState([]);
  const [hasSeededSample, setHasSeededSample] = useState(false);
  const [isSampleActive, setIsSampleActive] = useState(false);

  // Step 1
  const [testInfo, setTestInfo] = useState({
    test_title: '',
    description: '',
    main_topic: '',
    sub_topic: '',
    difficulty: 'easy',
    time_limit_minutes: 10,
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
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, []);

  // Load main topics when modal opens
  useEffect(() => {
    if (showModal && mainTopics.length === 0) {
      loadMainTopics();
    }
  }, [showModal]);

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

  // Seed sample đúng 1 lần khi mở modal
  useEffect(() => {
    if (showModal && !hasSeededSample) {
      setVocabularyText(SAMPLE_VOCAB);
      setHasSeededSample(true);
      setIsSampleActive(true);
    }
  }, [showModal, hasSeededSample]);

  // ESC to close
  useEffect(() => {
    if (!showModal) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && !loading) handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showModal, loading]);

  // Load main topics
  const loadMainTopics = async () => {
    try {
      setLoadingTopics(true);
      const topics = await topicService.getAllTopics({ include_inactive: true });
      const topicsArray = Array.isArray(topics) ? topics : [];
      const formattedTopics = topicsArray.map(topic => {
        const topicId = topic._id || topic.id || null;
        return {
          id: topicId,
          _id: topicId,
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
      const subtopicsArray = Array.isArray(subtopics) ? subtopics : [];
      const formattedSubtopics = subtopicsArray.map(st => {
        const subtopicId = st._id || st.id || null;
        return {
          id: subtopicId,
          _id: subtopicId,
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
    setVocabularyText('');
    setParsedVocabularies([]);
    setTestInfo({
      test_title: '',
      description: '',
      main_topic: '',
      sub_topic: '',
      difficulty: 'easy',
      time_limit_minutes: 10,
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
    setHasSeededSample(false);
    setIsSampleActive(false);
    setCreatedTest(null);
    setShowModal(false);
  };

  // Parse "từ;từ loại;level;nghĩa;câu ví dụ"
  const parseVocabularyText = (text) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    const vocabularies = [];
    const errors = [];
    
    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      line = line.trim();
      
      if (!line) return; // Skip empty lines
      
      // Split by semicolon - expecting 5 parts: word;part_of_speech;cefr_level;meaning;example
      const parts = line.split(';').map((s) => s.trim());
      
      if (parts.length < 4) {
        errors.push(`Dòng ${lineNum}: Cần ít nhất "từ;từ loại;level;nghĩa" (thiếu dấu ;)`);
        return;
      }
      
      const [word, part_of_speech, cefr_level, meaning, ...rest] = parts;
      
      if (!word) {
        errors.push(`Dòng ${lineNum}: Từ vựng không được để trống`);
        return;
      }
      
      if (!part_of_speech) {
        errors.push(`Dòng ${lineNum}: Từ loại không được để trống`);
        return;
      }
      
      if (!cefr_level) {
        errors.push(`Dòng ${lineNum}: Level không được để trống`);
        return;
      }
      
      if (!meaning) {
        errors.push(`Dòng ${lineNum}: Nghĩa không được để trống`);
        return;
      }
      
      // Validate word length
      if (word.length > 100) {
        errors.push(`Dòng ${lineNum}: Từ vựng quá dài (tối đa 100 ký tự)`);
        return;
      }
      
      // Validate part_of_speech
      const validPartOfSpeech = ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'pronoun', 'interjection'];
      if (!validPartOfSpeech.includes(part_of_speech.toLowerCase())) {
        errors.push(`Dòng ${lineNum}: Từ loại không hợp lệ. Dùng: ${validPartOfSpeech.join(', ')}`);
        return;
      }
      
      // Validate CEFR level
      const validCefrLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
      if (!validCefrLevels.includes(cefr_level.toUpperCase())) {
        errors.push(`Dòng ${lineNum}: Level không hợp lệ. Dùng: ${validCefrLevels.join(', ')}`);
        return;
      }
      
      // Validate meaning length
      if (meaning.length > 200) {
        errors.push(`Dòng ${lineNum}: Nghĩa quá dài (tối đa 200 ký tự)`);
        return;
      }
      
      // Build example sentence - join the rest with semicolons if there are multiple parts
      const example_sentence = rest.length > 0 
        ? rest.join(';').trim() 
        : `Example sentence with ${word}.`;
      
      // Validate example sentence length
      if (example_sentence.length > 500) {
        errors.push(`Dòng ${lineNum}: Câu ví dụ quá dài (tối đa 500 ký tự)`);
        return;
      }
      
      vocabularies.push({ 
        word: word.trim(), 
        meaning: meaning.trim(), 
        example_sentence: example_sentence.trim(),
        part_of_speech: part_of_speech.toLowerCase().trim(),
        cefr_level: cefr_level.toUpperCase().trim()
      });
    });
    
    return { vocabularies, errors };
  };

  // Preview realtime
  const livePreviewVocabularies = useMemo(() => {
    try {
      return parseVocabularyText(vocabularyText).vocabularies || [];
    } catch {
      return [];
    }
  }, [vocabularyText]);

  const totalLines = useMemo(
    () => vocabularyText.split(/\r?\n/).filter((l) => l.trim()).length,
    [vocabularyText]
  );

  // Step handlers
  const handleContinueToVocabulary = () => {
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
    setCurrentStep('vocabulary');
  };

  const handleContinueToReview = () => {
    setErrMsg('');
    
    if (!vocabularyText.trim()) {
      return setErrMsg('Vui lòng nhập danh sách từ vựng');
    }
    
    console.debug('CreateVocabularyTestButton - parsing vocabulary text:', vocabularyText.length, 'characters');
    const { vocabularies, errors } = parseVocabularyText(vocabularyText);
    
    console.debug('CreateVocabularyTestButton - parse result:', {
      vocabulariesCount: vocabularies.length,
      errorsCount: errors.length,
      errors: errors
    });
    
    if (errors.length) {
      return setErrMsg(`Lỗi định dạng:\n${errors.join('\n')}`);
    }
    
    if (!vocabularies.length) {
      return setErrMsg('Không tìm thấy từ vựng hợp lệ nào. Vui lòng kiểm tra định dạng: từ;từ loại;level;nghĩa;câu ví dụ');
    }
    
    // Validate minimum number of vocabularies
    if (vocabularies.length < 2) {
      return setErrMsg('Bài test cần ít nhất 2 từ vựng để tạo câu hỏi');
    }
    
    // Check for duplicate words
    const wordSet = new Set();
    const duplicates = [];
    vocabularies.forEach((vocab, index) => {
      const word = vocab.word.toLowerCase().trim();
      if (wordSet.has(word)) {
        duplicates.push(`Dòng ${index + 1}: "${vocab.word}" đã bị trùng`);
      } else {
        wordSet.add(word);
      }
    });
    
    if (duplicates.length > 0) {
      return setErrMsg(`Từ vựng bị trùng lặp:\n${duplicates.join('\n')}`);
    }
    
    setParsedVocabularies(vocabularies);
    setCurrentStep('review');
  };

  const handleCreateTest = async () => {
    setLoading(true);
    setErrMsg('');
    setCurrentStep('creating');
    try {
      // Validate user authentication
      if (!user || (!user._id && !user.id)) {
        throw new Error('Bạn cần đăng nhập để tạo bài test');
      }

      // Validate parsed vocabularies
      if (!parsedVocabularies || parsedVocabularies.length === 0) {
        throw new Error('Danh sách từ vựng không được để trống');
      }

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
          const response = await topicService.addSubTopic(testInfo.main_topic, {
            name: customSubTopic.trim(),
            active: true
          });
          
          const topicData = response.data || response;
          const subTopicsArray = topicData.sub_topics || [];
          
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

      // Ensure visibility is sent as either 'public' or 'private' (defensive)
      const visibilityValue = testInfo.visibility === 'public' ? 'public' : 'private';

      const testData = {
        test_title: testInfo.test_title,
        description: testInfo.description || '',
        test_type: 'vocabulary',
        topic_id: topicId,
        subtopic_id: subtopicId,
        main_topic: testInfo.main_topic, // Keep for backward compatibility
        sub_topic: testInfo.sub_topic, // Keep for backward compatibility
        difficulty: testInfo.difficulty,
        time_limit_minutes: testInfo.time_limit_minutes,
        visibility: visibilityValue,
        total_questions: parsedVocabularies.length,
        status: 'active',
        created_by: user.id || user._id
      };

      console.debug('CreateVocabularyTestButton - creating test payload:', testData);
      console.debug('CreateVocabularyTestButton - user context:', { userId: user._id || user.id, userName: user.full_name });
      console.debug('CreateVocabularyTestButton - vocabularies count:', parsedVocabularies.length);

      const createdTestResponse = await testService.createTest(testData);
      const createdTest = createdTestResponse.test || createdTestResponse;
      console.debug('CreateVocabularyTestButton - test created:', createdTest);
      setCreatedTest(createdTest);

      const testId = createdTest._id || createdTest.id;
      if (!testId) {
        throw new Error('Test ID not returned from server');
      }

      if (!mountedRef.current) return;

      const vocabularyPromises = parsedVocabularies.map((vocab, index) => {
        console.debug(`CreateVocabularyTestButton - creating vocabulary ${index + 1}:`, vocab);
        return vocabularyService.createVocabulary({
          ...vocab,
          test_id: testId,
        });
      });

      console.debug('CreateVocabularyTestButton - starting vocabulary creation for', parsedVocabularies.length, 'items');
      const results = await Promise.allSettled(vocabularyPromises);
      const rejected = results.filter((r) => r.status === 'rejected');
      
      if (rejected.length) {
        console.error('CreateVocabularyTestButton - vocabulary creation failures:', rejected.map(r => r.reason));
        const errorDetails = rejected.map((r, i) => `Từ ${i + 1}: ${r.reason?.message || r.reason}`).join('\n');
        setErrMsg(`Một số từ vựng tạo không thành công (${rejected.length}/${parsedVocabularies.length}):\n${errorDetails}`);
      }

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      console.log(`CreateVocabularyTestButton - vocabulary creation completed: ${successful}/${parsedVocabularies.length} successful`);
      
      if (!mountedRef.current) return;

      if (rejected.length > 0) {
        setCurrentStep('review');
      } else {
        setCurrentStep('success');
      }
    } catch (err) {
      if (!mountedRef.current) return;
      console.error('CreateVocabularyTestButton - Error creating vocabulary test:', {
        error: err,
        message: err?.message,
        stack: err?.stack,
        testInfo,
        vocabulariesCount: parsedVocabularies?.length || 0
      });
      
      const errorMessage = err.response?.data?.message || err.message || 'Lỗi không xác định';
      
      // Handle specific error messages
      if (errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
        setErrMsg(
          `Tên bài test "${testInfo.test_title}" đã tồn tại trong chủ đề "${testInfo.main_topic}" - "${testInfo.sub_topic}".\n\n` +
          `Vui lòng đổi tên bài test hoặc xóa bài test cũ nếu muốn tạo mới.`
        );
      } else {
        setErrMsg('Lỗi tạo bài test: ' + errorMessage);
      }
      
      setCurrentStep('review');
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const totalSteps = 3;
  const progressPct =
    currentStep === 'test-info' ? (100 / totalSteps) * 1 :
      currentStep === 'vocabulary' ? (100 / totalSteps) * 2 :
        100;

  const handleClick = () => {
    if (!user) {
      localStorage.setItem('authReturnTo', window.location.pathname);
      navigate('/login', {
        state: {
          message: 'Vui lòng đăng nhập để tạo bài test từ vựng của riêng bạn.',
        },
      });
      return;
    }

    setShowModal(true);
  };

  const modal = showModal ? createPortal(
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
            <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">
                {currentStep === 'test-info' && 'Thông Tin Bài Test'}
                {currentStep === 'vocabulary' && 'Nhập Danh Sách Từ Vựng'}
                {currentStep === 'review' && 'Xem Lại Thông Tin'}
                {currentStep === 'creating' && 'Đang Tạo Bài Test'}
                {currentStep === 'success' && 'Hoàn Thành!'}
              </h2>
              <p className="text-xs text-neutral-600">
                {currentStep === 'test-info' && 'Bước 1/3 - Cấu hình bài test'}
                {currentStep === 'vocabulary' && 'Bước 2/3 - Chuẩn bị từ vựng'}
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
        {(currentStep === 'vocabulary' || currentStep === 'test-info' || currentStep === 'review') && (
          <div className="px-6 py-3 bg-neutral-50 border-b border-neutral-200">
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-neutral-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-xs font-medium text-neutral-700">
                {currentStep === 'test-info' ? '1/3' : currentStep === 'vocabulary' ? '2/3' : '3/3'}
              </span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-neutral-50">
          <div className="p-6 space-y-6">
            {/* STEP 2 - VOCABULARY */}
            {currentStep === 'vocabulary' && (
              <div className="space-y-6">
                {/* Tips */}
                <div className="bg-white border border-neutral-200 rounded-lg p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-md bg-neutral-200 flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-5 h-5 text-neutral-700"
                        fill="none"
                        stroke="currentC olor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>

                    <div className="flex flex-col justify-center">
                      <h3 className="font-semibold text-neutral-900 mb-2">
                        Định dạng nhập liệu
                      </h3>
                      <p className="text-sm text-neutral-700 mb-2 leading-relaxed">
                        Mỗi dòng một mục, theo cấu trúc:
                        <br />
                        <code className="bg-neutral-200 px-2 py-1 rounded text-xs font-mono">
                          từ;từ loại;level;nghĩa;câu ví dụ
                        </code>
                      </p>
                      <p className="text-xs text-neutral-500">
                        Từ loại: noun, verb, adjective, adverb, preposition, conjunction, pronoun, interjection<br/>
                        Level: A1, A2, B1, B2, C1, C2. Bạn có thể dùng dấu ";" trong câu ví dụ.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2 cột: textarea & preview (BẰNG CHIỀU CAO) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                  {/* LEFT: Editor Card */}
                  <div
                    className="bg-white border border-neutral-200 rounded-lg flex flex-col overflow-hidden"
                    style={{ height: PANEL_HEIGHT }}
                  >
                    <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
                      <label className="text-sm font-medium text-neutral-900">
                        Danh sách từ vựng <span className="text-rose-600">*</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-700 bg-neutral-100 px-2 py-1 rounded-full">{totalLines} dòng</span>
                        <span className="text-xs text-indigo-800 bg-indigo-100 px-2 py-1 rounded-full">
                          {livePreviewVocabularies.length} hợp lệ
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 p-3">
                      <textarea
                        value={vocabularyText}
                        onFocus={() => {
                          if (isSampleActive && vocabularyText.trim() === SAMPLE_VOCAB.trim()) {
                            setVocabularyText('');
                            setIsSampleActive(false);
                          }
                        }}
                        onChange={(e) => {
                          const v = e.target.value;
                          setVocabularyText(v);
                          if (isSampleActive && v !== SAMPLE_VOCAB) setIsSampleActive(false);
                        }}
                        placeholder="Nhập theo định dạng: từ;từ loại;level;nghĩa;câu ví dụ"
                        className="w-full h-full resize-none px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm bg-neutral-50 text-neutral-900 placeholder-neutral-500"
                        aria-invalid={!!errMsg}
                      />
                    </div>

                    <div className="px-3 py-2 border-t border-neutral-200 flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setVocabularyText(''); setIsSampleActive(false); }}
                        className="px-3 py-1.5 text-xs font-medium text-neutral-800 bg-white border border-neutral-300 rounded-md hover:bg-neutral-100"
                      >
                        Xoá tất cả
                      </button>
                      <button
                        type="button"
                        onClick={() => { setVocabularyText(SAMPLE_VOCAB); setIsSampleActive(true); }}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
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
                    <div className="px-6 py-4 bg-indigo-600">
                      <h3 className="text-base font-semibold text-white">Review từ vựng (cập nhật trực tiếp)</h3>
                      <p className="text-xs text-neutral-300">Định dạng: <span className="font-mono">từ;từ loại;level;nghĩa;câu ví dụ</span></p>
                    </div>

                    <div className="flex-1 overflow-auto">
                      <table className="w-full">
                        <thead className="bg-neutral-100 sticky top-0 z-10">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider w-12">STT</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider w-1/6">Từ vựng</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider w-1/6">Nghĩa</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider w-16">Loại</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider w-12">Level</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">Câu ví dụ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200">
                          {livePreviewVocabularies.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-4 py-10 text-center text-sm text-neutral-500">
                                Nội dung rỗng — bấm "Dán ví dụ mẫu" hoặc nhập ở khung bên trái.
                              </td>
                            </tr>
                          ) : (
                            livePreviewVocabularies.map((vocab, idx) => (
                              <tr key={`${vocab.word}-${idx}`} className={idx % 2 === 1 ? 'bg-neutral-50' : 'bg-white'}>
                                <td className="px-4 py-2 text-sm font-medium text-neutral-900">{idx + 1}</td>
                                <td className="px-4 py-2 text-sm font-semibold text-neutral-900">{vocab.word}</td>
                                <td className="px-4 py-2 text-sm text-neutral-800">{vocab.meaning}</td>
                                <td className="px-4 py-2 text-xs text-neutral-600 capitalize">{vocab.part_of_speech}</td>
                                <td className="px-4 py-2 text-xs font-medium text-indigo-600">{vocab.cefr_level}</td>
                                <td className="px-4 py-2 text-sm text-neutral-700 italic">{vocab.example_sentence}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 1 - TEST INFO */}
            {currentStep === 'test-info' && (
              <div className="space-y-4">
                <div className="bg-white border border-neutral-200 rounded-lg p-4">
                  <h3 className="text-base font-semibold text-neutral-900 mb-1">Thông Tin Bài Test</h3>
                  <p className="text-sm text-neutral-700">
                    Hãy điền thông tin cơ bản cho bài test của bạn
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-neutral-800 mb-1">Tiêu đề bài test <span className="text-rose-600">*</span></label>
                    <input
                      type="text"
                      value={testInfo.test_title}
                      onChange={(e) => setTestInfo((p) => ({ ...p, test_title: e.target.value }))}
                      placeholder="VD: My Custom Vocabulary Test"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-neutral-50 text-neutral-900 placeholder-neutral-500"
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
                          className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-neutral-50 text-neutral-900 placeholder-neutral-500"
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
                          className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-neutral-50 text-neutral-900 disabled:opacity-50"
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
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-neutral-200 border-t-indigo-600"></div>
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
                          className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-neutral-50 text-neutral-900 placeholder-neutral-500"
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
                          className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-neutral-50 text-neutral-900 disabled:opacity-50"
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
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-neutral-200 border-t-indigo-600"></div>
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
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-neutral-50 text-neutral-900"
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
                        const clamped = Number.isFinite(parsed) ? Math.max(1, Math.min(120, parsed)) : 10;
                        setTestInfo((p) => ({ ...p, time_limit_minutes: clamped }));
                      }}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-neutral-50 text-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-800 mb-1">Chế độ hiển thị</label>
                    <select
                      value={testInfo.visibility}
                      onChange={(e) => setTestInfo((p) => ({ ...p, visibility: e.target.value }))}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-neutral-50 text-neutral-900"
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
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-neutral-50 text-neutral-900 placeholder-neutral-500 resize-none"
                  />
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
                      <p className="text-xs font-medium text-neutral-600 uppercase">Số từ vựng</p>
                      <p className="text-sm font-semibold text-neutral-900 mt-1">{parsedVocabularies.length} từ</p>
                    </div>
                    <div className="bg-neutral-50 rounded-md p-3 border border-neutral-200">
                      <p className="text-xs font-medium text-neutral-600 uppercase">Chế độ hiển thị</p>
                      <p className="text-sm font-semibold text-neutral-900 mt-1">
                        {testInfo.visibility === 'public' ? '🌍 Công khai' : '🔒 Riêng tư'}
                      </p>
                    </div>
                    {testInfo.description && (
                      <div className="bg-neutral-50 rounded-md p-3 border border-neutral-200 md:col-span-2 lg:col-span-1">
                        <p className="text-xs font-medium text-neutral-600 uppercase">Mô tả</p>
                        <p className="text-sm text-neutral-900 mt-1">{testInfo.description}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
                  <div className="px-6 py-4 bg-indigo-600">
                    <h3 className="text-base font-semibold text-white">Danh sách từ vựng ({parsedVocabularies.length} từ)</h3>
                  </div>
                  <div className="overflow-x-auto" style={{ maxHeight: 420 }}>
                    <table className="w-full">
                      <thead className="bg-neutral-100 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider w-12">STT</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider w-1/6">Từ vựng</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider w-1/6">Nghĩa</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider w-16">Loại</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider w-12">Level</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">Câu ví dụ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200">
                        {parsedVocabularies.map((vocab, index) => (
                          <tr key={`${vocab.word}-${index}`} className={index % 2 === 1 ? 'bg-neutral-50' : 'bg-white'}>
                            <td className="px-4 py-3 text-sm font-medium text-neutral-900">{index + 1}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-neutral-900">{vocab.word}</td>
                            <td className="px-4 py-3 text-sm text-neutral-800">{vocab.meaning}</td>
                            <td className="px-4 py-3 text-xs text-neutral-600 capitalize">{vocab.part_of_speech}</td>
                            <td className="px-4 py-3 text-xs font-medium text-indigo-600">{vocab.cefr_level}</td>
                            <td className="px-4 py-3 text-sm text-neutral-700 italic">{vocab.example_sentence}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4 */}
            {currentStep === 'creating' && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-2 border-neutral-200 border-t-indigo-600 mx-auto mb-4" />
                <h3 className="text-base font-medium text-neutral-900 mb-2">Đang tạo bài test...</h3>
                <p className="text-sm text-neutral-700">Đang tạo bài test và {parsedVocabularies.length} từ vựng</p>
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
                  Bài test "<span className="font-semibold">{testInfo.test_title}</span>" đã được tạo với {parsedVocabularies.length} từ vựng.
                </p>
                <div className="flex gap-3 justify-center">
                  {createdTest && (createdTest._id || createdTest.id) && (
                    <button
                      onClick={() => {
                        handleClose();
                        navigate(`/vocabulary/test/${createdTest._id || createdTest.id}/settings`);
                      }}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Làm bài test ngay
                    </button>
                  )}
                  <button
                    onClick={() => {
                      handleClose();
                      navigate(`/test/${testInfo.main_topic}/${testInfo.sub_topic}?type=vocabulary`);
                    }}
                    className="px-4 py-2 text-sm font-medium text-indigo-600 bg-white border border-indigo-300 rounded-md hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
          {(currentStep === 'vocabulary' || currentStep === 'test-info' || currentStep === 'review') && (
            <div className="border-t border-neutral-200 bg-white">
              {/* Error Message - Hiển thị ở đây để gần nút actions */}
              {errMsg && (
                <div className="px-6 pt-4 pb-3">
                  <div className="bg-rose-50 border border-rose-200 rounded-lg p-4" role="alert" aria-live="assertive">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-rose-900 mb-2">Lỗi xảy ra!</p>
                        <p className="text-sm text-rose-800 whitespace-pre-line mb-3">{errMsg}</p>
                        {errMsg.includes('đã tồn tại') && (
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentStep('test-info');
                              setErrMsg('');
                            }}
                            className="px-4 py-2 text-sm font-medium text-rose-700 bg-white border border-rose-300 rounded-lg hover:bg-rose-50 transition-colors"
                          >
                            ← Quay lại để đổi tên bài test
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex items-center justify-between px-6 pb-4">
                <div className="flex gap-3">
                  {currentStep === 'vocabulary' && (
                    <button
                      type="button"
                      onClick={() => { setCurrentStep('test-info'); setErrMsg(''); }}
                      disabled={loading}
                      className="px-4 py-2 text-sm font-medium text-neutral-800 bg-white border border-neutral-300 rounded-md hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      Quay lại
                    </button>
                  )}
                  {currentStep === 'review' && (
                    <button
                      type="button"
                      onClick={() => { setCurrentStep('vocabulary'); setErrMsg(''); }}
                      disabled={loading}
                      className="px-4 py-2 text-sm font-medium text-neutral-800 bg-white border border-neutral-300 rounded-md hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
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
                    className="px-4 py-2 text-sm font-medium text-neutral-800 bg-white border border-neutral-300 rounded-md hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    Hủy
                  </button>

                  {currentStep === 'test-info' && (
                    <button
                      type="button"
                      onClick={handleContinueToVocabulary}
                      disabled={loading}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      Tiếp tục
                    </button>
                  )}

                  {currentStep === 'vocabulary' && (
                    <button
                      type="button"
                      onClick={handleContinueToReview}
                      disabled={loading}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
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
        onClick={handleClick}
        className={`inline-flex items-center px-4 py-2 
          bg-blue-600 hover:bg-blue-700 
          text-white text-sm font-medium rounded-lg shadow-md 
          hover:shadow-lg transform hover:scale-105 
          transition-all duration-200 ${className}`}
        title="Tạo bài test từ vựng của riêng bạn"
      >
        <span aria-hidden className="mr-2 text-lg">📝</span>
        Tạo bài test từ vựng
      </button>

      {modal}
    </>
  );
};

export default CreateVocabularyTestButton;
