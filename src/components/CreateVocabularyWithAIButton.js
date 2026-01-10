import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import testService from '../services/testService';
import vocabularyService from '../services/vocabularyService';

const cx = (...arr) => arr.filter(Boolean).join(' ');

// Icons
const Icon = {
  Spark: (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    </svg>
  ),
  Close: (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Back: (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
    </svg>
  ),
  Plus: (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
    </svg>
  ),
  Trash: (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  ),
  Check: (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
    </svg>
  ),
  Info: (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
};

// Small UI atoms
const Field = ({ label, hint, required, children }) => (
  <div className="space-y-1.5">
    <div className="flex items-center gap-2">
      <label className="text-[13px] font-semibold text-slate-900">
        {label} {required ? <span className="text-rose-600">*</span> : null}
      </label>
      {hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
    </div>
    {children}
  </div>
);

const inputBase =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition';

const Textarea = (props) => <textarea {...props} className={cx(inputBase, 'resize-none', props.className)} />;

const Button = ({ tone = 'secondary', size = 'md', className = '', ...props }) => {
  const base =
    'inline-flex items-center justify-center rounded-xl font-semibold transition ' +
    'focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = {
    sm: 'px-3 py-2 text-[13px]',
    md: 'px-4 py-2 text-sm',
  };
  const tones = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
    secondary: 'bg-white text-slate-900 border border-slate-200 hover:bg-slate-50',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm',
  };
  return <button {...props} className={cx(base, sizes[size], tones[tone], className)} />;
};

const Alert = ({ tone = 'error', children }) => (
  <div
    className={cx(
      'rounded-xl border p-3 text-sm flex gap-2',
      tone === 'error'
        ? 'bg-rose-50 border-rose-200 text-rose-900'
        : 'bg-slate-50 border-slate-200 text-slate-900'
    )}
  >
    <Icon.Info className={cx('h-5 w-5 flex-shrink-0', tone === 'error' ? 'text-rose-500' : 'text-slate-500')} />
    <div className="whitespace-pre-line leading-relaxed">{children}</div>
  </div>
);

const StepPill = ({ active, done, children }) => (
  <div
    className={cx(
      'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold border',
      done
        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
        : active
        ? 'bg-indigo-600 text-white border-indigo-600'
        : 'bg-white text-slate-600 border-slate-200'
    )}
  >
    <span
      className={cx(
        'inline-flex h-5 w-5 items-center justify-center rounded-full',
        done ? 'bg-emerald-600 text-white' : active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'
      )}
    >
      {done ? <Icon.Check className="h-3.5 w-3.5" /> : <span className="text-[11px] leading-none">•</span>}
    </span>
    {children}
  </div>
);

const SkeletonSpinner = ({ label }) => (
  <div className="py-10 text-center">
    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
    <h3 className="mt-4 text-base font-semibold text-slate-900">{label}</h3>
    <p className="mt-1 text-sm text-slate-600">Vui lòng chờ trong giây lát…</p>
  </div>
);

const CreateVocabularyWithAIButton = ({ className = '' }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Modal state
  const [showModal, setShowModal] = useState(false);

  // Steps: 'ai-config' -> 'generating' -> 'edit-vocabulary' -> 'test-info' -> 'review' -> 'creating' -> 'success'
  const [currentStep, setCurrentStep] = useState('ai-config');
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  // AI Generation config
  const [aiConfig, setAiConfig] = useState({
    topic: '',
    category: '',
    description: '',
    count: 15,
  });

  // Generated vocabularies from AI
  const [generatedVocabularies, setGeneratedVocabularies] = useState([]);

  // Test info
  const [testInfo, setTestInfo] = useState({
    test_title: '',
    description: '',
    main_topic: '',
    sub_topic: '',
    difficulty: 'easy',
    time_limit_minutes: 10,
    visibility: 'public',
  });

  // Created test
  const [createdTest, setCreatedTest] = useState(null);

  // Refs
  const overlayRef = useRef(null);
  const cardRef = useRef(null);
  const redirectTimerRef = useRef(null);
  const mountedRef = useRef(true);

  const isFab = useMemo(
    () => /(^|\s)w-14(\s|$)/.test(className) && /(^|\s)h-14(\s|$)/.test(className),
    [className]
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, []);

  const steps = useMemo(
    () => [
      { key: 'ai-config', label: 'Cấu hình' },
      { key: 'edit-vocabulary', label: 'Từ vựng' },
      { key: 'test-info', label: 'Thông tin' },
      { key: 'review', label: 'Xem lại' },
    ],
    []
  );

  const stepIndex = useMemo(() => steps.findIndex((s) => s.key === currentStep), [steps, currentStep]);

  const computedIndex = useMemo(() => {
    if (currentStep === 'generating') return 0;
    if (currentStep === 'creating' || currentStep === 'success') return 3;
    return Math.max(0, stepIndex);
  }, [currentStep, stepIndex]);

  const progress = useMemo(() => {
    const total = steps.length - 1;
    const pct = total <= 0 ? 0 : Math.round((computedIndex / total) * 100);
    return Math.max(0, Math.min(100, pct));
  }, [computedIndex, steps.length]);

  const title = useMemo(() => {
    const map = {
      'ai-config': 'Tạo từ vựng với AI',
      generating: 'Đang tạo từ vựng…',
      'edit-vocabulary': 'Chỉnh sửa từ vựng',
      'test-info': 'Thiết lập bài test',
      review: 'Xem lại & tạo bài',
      creating: 'Đang tạo bài test…',
      success: 'Hoàn tất!',
    };
    return map[currentStep] || 'Tạo từ vựng với AI';
  }, [currentStep]);

  const subtitle = useMemo(() => {
    const map = {
      'ai-config': 'Nhập chủ đề, số lượng — AI sẽ tạo danh sách từ vựng.',
      generating: 'Vui lòng chờ trong giây lát.',
      'edit-vocabulary': 'Sửa, thêm hoặc xoá từ vựng trước khi tạo bài test.',
      'test-info': 'Nhập tiêu đề, chủ đề, phân mục và chế độ hiển thị.',
      review: 'Kiểm tra lại mọi thứ trước khi tạo.',
      creating: 'Đang lưu bài test và danh sách từ vựng.',
      success: 'Chuyển hướng đến trang cài đặt…',
    };
    return map[currentStep] || '';
  }, [currentStep]);

  const resetState = () => {
    setCurrentStep('ai-config');
    setAiConfig({ topic: '', category: '', description: '', count: 15 });
    setGeneratedVocabularies([]);
    setTestInfo({
      test_title: '',
      description: '',
      main_topic: '',
      sub_topic: '',
      difficulty: 'easy',
      time_limit_minutes: 10,
      visibility: 'public',
    });
    setErrMsg('');
    setLoading(false);
    setCreatedTest(null);
  };

  const handleClose = () => {
    if (loading) return;
    resetState();
    setShowModal(false);
  };

  const handleClick = () => {
    if (!user) {
      localStorage.setItem('authReturnTo', window.location.pathname);
      navigate('/login', { state: { message: 'Vui lòng đăng nhập để tạo bài test từ vựng với AI.' } });
      return;
    }
    setShowModal(true);
  };

  // ESC to close
  useEffect(() => {
    if (!showModal) return;
    const onKey = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModal, loading]);

  // Click outside to close
  const onOverlayClick = (e) => {
    if (loading) return;
    if (cardRef.current && !cardRef.current.contains(e.target)) handleClose();
  };

  const handleAIConfigChange = (field, value) => setAiConfig((prev) => ({ ...prev, [field]: value }));
  const handleTestInfoChange = (field, value) => setTestInfo((prev) => ({ ...prev, [field]: value }));

  const handleGenerateWithAI = async () => {
    if (!user) return;
    if (!aiConfig.topic.trim()) return setErrMsg('Vui lòng nhập chủ đề');

    setLoading(true);
    setErrMsg('');
    setCurrentStep('generating');

    try {
      console.debug('CreateVocabularyWithAIButton - generating with config:', aiConfig);
      const result = await vocabularyService.generateVocabulary(aiConfig);
      console.debug('CreateVocabularyWithAIButton - AI generation result:', result);

      if (result?.success && result?.data?.vocabulary) {
        // Add default values for new required fields to AI-generated vocabularies
        const vocabulariesWithDefaults = result.data.vocabulary.map((vocab, index) => {
          console.debug(`CreateVocabularyWithAIButton - processing vocabulary ${index + 1}:`, vocab);
          return {
            ...vocab,
            part_of_speech: (vocab.part_of_speech || 'noun').toLowerCase().trim(),
            cefr_level: (vocab.cefr_level || 'B1').toUpperCase().trim()
          };
        });
        
        console.debug('CreateVocabularyWithAIButton - vocabularies with defaults:', vocabulariesWithDefaults);
        setGeneratedVocabularies(vocabulariesWithDefaults);

        setTestInfo((prev) => ({
          ...prev,
          test_title: `${aiConfig.topic} - AI Vocabulary Test`,
          description: aiConfig.description || `AI generated vocabulary test for ${aiConfig.topic}`,
          main_topic: aiConfig.topic,
          sub_topic: aiConfig.category || 'General',
        }));

        setCurrentStep('edit-vocabulary');
      } else {
        throw new Error(result?.message || 'Failed to generate vocabulary');
      }
    } catch (error) {
      console.error('CreateVocabularyWithAIButton - Error generating vocabulary:', {
        error,
        message: error?.message,
        stack: error?.stack,
        aiConfig
      });
      
      let errorMessage = error?.message || 'Có lỗi xảy ra khi tạo từ vựng với AI';
      
      // Provide more specific error messages
      if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
        errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
      } else if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
        errorMessage = 'Quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.';
      } else if (errorMessage.includes('500') || errorMessage.includes('server error')) {
        errorMessage = 'Lỗi server. Vui lòng thử lại sau.';
      }
      
      setErrMsg(errorMessage);
      setCurrentStep('ai-config');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  // Vocabulary editing functions
  const handleVocabularyChange = (index, field, value) => {
    setGeneratedVocabularies((prev) => prev.map((v, i) => {
      if (i !== index) return v;
      
      let processedValue = value;
      
      // Normalize part_of_speech to lowercase
      if (field === 'part_of_speech') {
        processedValue = value.toLowerCase().trim();
      }
      
      // Normalize cefr_level to uppercase
      if (field === 'cefr_level') {
        processedValue = value.toUpperCase().trim();
      }
      
      return { ...v, [field]: processedValue };
    }));
  };

  const handleAddVocabulary = () => {
    setGeneratedVocabularies((prev) => [...prev, { 
      word: '', 
      meaning: '', 
      example_sentence: '', 
      part_of_speech: 'noun', 
      cefr_level: 'B1' 
    }]);
  };

  const handleRemoveVocabulary = (index) => {
    setGeneratedVocabularies((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveVocabularies = () => {
    // Validate all required fields
    const invalid = generatedVocabularies.filter((v) => 
      !v.word?.trim() || 
      !v.meaning?.trim() || 
      !v.example_sentence?.trim() || 
      !v.part_of_speech?.trim() || 
      !v.cefr_level?.trim()
    );
    
    if (invalid.length > 0) {
      const invalidIndices = generatedVocabularies
        .map((v, index) => {
          const missing = [];
          if (!v.word?.trim()) missing.push('từ vựng');
          if (!v.part_of_speech?.trim()) missing.push('từ loại');
          if (!v.cefr_level?.trim()) missing.push('level');
          if (!v.meaning?.trim()) missing.push('nghĩa');
          if (!v.example_sentence?.trim()) missing.push('ví dụ');
          return missing.length > 0 ? `Dòng ${index + 1}: thiếu ${missing.join(', ')}` : null;
        })
        .filter(Boolean);
      
      return setErrMsg(`Các trường bắt buộc chưa được điền:\n${invalidIndices.join('\n')}`);
    }
    
    if (generatedVocabularies.length === 0) {
      return setErrMsg('Cần ít nhất 1 từ vựng để tạo bài test.');
    }
    
    // Validate part_of_speech values
    const validPartOfSpeech = ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'pronoun', 'interjection'];
    const invalidPOS = generatedVocabularies.filter(v => !validPartOfSpeech.includes(v.part_of_speech?.toLowerCase()));
    if (invalidPOS.length > 0) {
      return setErrMsg(`Các từ loại không hợp lệ. Dùng: ${validPartOfSpeech.join(', ')}`);
    }
    
    // Validate CEFR levels
    const validCefrLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const invalidCEFR = generatedVocabularies.filter(v => !validCefrLevels.includes(v.cefr_level?.toUpperCase()));
    if (invalidCEFR.length > 0) {
      return setErrMsg(`Các level không hợp lệ. Dùng: ${validCefrLevels.join(', ')}`);
    }
    
    setErrMsg('');
    setCurrentStep('test-info');
  };

  const handleContinueToReview = () => {
    if (!testInfo.test_title.trim()) return setErrMsg('Vui lòng nhập tiêu đề bài test');
    if (!testInfo.main_topic.trim()) return setErrMsg('Vui lòng nhập chủ đề chính');
    if (!testInfo.sub_topic.trim()) return setErrMsg('Vui lòng nhập phân mục');
    setErrMsg('');
    setCurrentStep('review');
  };

  const handleCreateTest = async () => {
    setLoading(true);
    setErrMsg('');
    setCurrentStep('creating');

    try {
      // Validate user authentication
      if (!user || !user._id) {
        throw new Error('Bạn cần đăng nhập để tạo bài test');
      }

      // Validate vocabularies
      if (!generatedVocabularies || generatedVocabularies.length === 0) {
        throw new Error('Danh sách từ vựng không được để trống');
      }

      const visibilityValue = testInfo.visibility === 'public' ? 'public' : 'private';

      const testData = {
        ...testInfo,
        visibility: visibilityValue,
        test_type: 'vocabulary',
        total_questions: generatedVocabularies.length,
        status: 'active',
      };

      console.debug('CreateVocabularyWithAIButton - creating test payload:', testData);
      console.debug('CreateVocabularyWithAIButton - user context:', { userId: user._id, userName: user.full_name });
      console.debug('CreateVocabularyWithAIButton - vocabularies count:', generatedVocabularies.length);

      const createdTest = await testService.createTest(testData);
      console.debug('CreateVocabularyWithAIButton - test created:', createdTest);
      setCreatedTest(createdTest);

      const vocabularyPromises = generatedVocabularies.map((vocab, index) => {
        console.debug(`CreateVocabularyWithAIButton - creating vocabulary ${index + 1}:`, vocab);
        return vocabularyService.createVocabulary({ ...vocab, test_id: createdTest._id });
      });

      console.debug('CreateVocabularyWithAIButton - starting vocabulary creation for', generatedVocabularies.length, 'items');
      const results = await Promise.allSettled(vocabularyPromises);
      const rejected = results.filter((r) => r.status === 'rejected');
      
      if (rejected.length) {
        console.error('CreateVocabularyWithAIButton - vocabulary creation failures:', rejected.map(r => r.reason));
        const errorDetails = rejected.map((r, i) => `Từ ${i + 1}: ${r.reason?.message || r.reason}`).join('\n');
        setErrMsg(`Một số từ vựng tạo không thành công (${rejected.length}/${generatedVocabularies.length}):\n${errorDetails}`);
      }

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      console.log(`CreateVocabularyWithAIButton - vocabulary creation completed: ${successful}/${generatedVocabularies.length} successful`);
      setCurrentStep('success');
    } catch (err) {
      console.error('CreateVocabularyWithAIButton - Error creating vocabulary test:', {
        error: err,
        message: err?.message,
        stack: err?.stack,
        testInfo,
        vocabulariesCount: generatedVocabularies?.length || 0
      });
      
      let errorMessage = err?.message || 'Có lỗi xảy ra khi tạo bài test';
      
      // Provide more specific error messages
      if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
        errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
      } else if (errorMessage.includes('duplicate') || errorMessage.includes('409')) {
        errorMessage = 'Tên bài test đã tồn tại. Vui lòng chọn tên khác.';
      } else if (errorMessage.includes('400') || errorMessage.includes('validation')) {
        errorMessage = 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin.';
      }
      
      setErrMsg(errorMessage);
      setCurrentStep('review');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const goBack = () => {
    setErrMsg('');
    if (currentStep === 'edit-vocabulary') return setCurrentStep('ai-config');
    if (currentStep === 'test-info') return setCurrentStep('edit-vocabulary');
    if (currentStep === 'review') return setCurrentStep('test-info');
  };

  const canShowFooter = ['ai-config', 'edit-vocabulary', 'test-info', 'review'].includes(currentStep);

  const modal = showModal
    ? createPortal(
        <div
          ref={overlayRef}
          onMouseDown={onOverlayClick}
          className={cx(
            'fixed inset-0 z-[9999] flex items-center justify-center p-3',
            'bg-slate-900/55 backdrop-blur-sm'
          )}
          aria-modal="true"
          role="dialog"
        >
          <div
            ref={cardRef}
            onMouseDown={(e) => e.stopPropagation()}
            className={cx(
              'w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200',
              'flex flex-col max-h-[92vh]'
            )}
          >
            {/* Top accent + progress */}
            <div className="h-1.5 bg-slate-100">
              <div className="h-1.5 bg-indigo-600 transition-all" style={{ width: `${progress}%` }} />
            </div>

            {/* Header */}
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-slate-900 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Icon.Spark className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-[17px] sm:text-lg font-bold text-slate-900 truncate">{title}</h2>
                    <p className="text-sm text-slate-600">{subtitle}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className={cx(
                    'rounded-xl p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition',
                    'disabled:opacity-50'
                  )}
                  aria-label="Đóng"
                >
                  <Icon.Close className="h-5 w-5" />
                </button>
              </div>

              {/* Stepper */}
              {canShowFooter && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {steps.map((s, i) => (
                    <StepPill key={s.key} active={i === computedIndex} done={i < computedIndex}>
                      {s.label}
                    </StepPill>
                  ))}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-5 py-5">
                {/* STEP: AI CONFIG */}
                {currentStep === 'ai-config' && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm text-slate-700 leading-relaxed">
                        Gợi ý: nhập <span className="font-semibold text-slate-900">chủ đề</span> +{' '}
                        <span className="font-semibold text-slate-900">phân loại</span> để AI tạo sát nhu cầu hơn.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <Field label="Chủ đề" required hint="VD: Business, Travel, Technology…">
                          <input
                            value={aiConfig.topic}
                            onChange={(e) => handleAIConfigChange('topic', e.target.value)}
                            className={inputBase}
                            placeholder="Nhập chủ đề…"
                          />
                        </Field>
                      </div>

                      <Field label="Phân loại" hint="VD: Airport, Office, Meeting…">
                        <input
                          value={aiConfig.category}
                          onChange={(e) => handleAIConfigChange('category', e.target.value)}
                          className={inputBase}
                          placeholder="Nhập phân loại…"
                        />
                      </Field>

                      <Field label="Số từ vựng" hint="5–50">
                        <input
                          type="number"
                          min={5}
                          max={50}
                          value={aiConfig.count}
                          onChange={(e) => {
                            const v = Math.max(5, Math.min(50, parseInt(e.target.value, 10) || 5));
                            handleAIConfigChange('count', v);
                          }}
                          className={inputBase}
                        />
                      </Field>

                      <div className="md:col-span-2">
                        <Field label="Mô tả thêm" hint="Tuỳ chọn">
                          <Textarea
                            value={aiConfig.description}
                            onChange={(e) => handleAIConfigChange('description', e.target.value)}
                            rows={3}
                            placeholder="Bạn muốn loại từ vựng như thế nào?"
                          />
                        </Field>
                      </div>
                    </div>

                    {!!errMsg && <Alert>{errMsg}</Alert>}
                  </div>
                )}

                {/* STEP: GENERATING */}
                {currentStep === 'generating' && (
                  <SkeletonSpinner label={`AI đang tạo ${aiConfig.count} từ cho "${aiConfig.topic}"…`} />
                )}

                {/* STEP: EDIT VOCAB */}
                {currentStep === 'edit-vocabulary' && (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-slate-600">
                          AI đã tạo <span className="font-semibold text-slate-900">{generatedVocabularies.length}</span> từ.
                          Bạn có thể chỉnh sửa trước khi tạo bài.
                        </p>
                      </div>

                      <Button type="button" onClick={handleAddVocabulary} tone="secondary" className="shrink-0">
                        <Icon.Plus className="h-4 w-4 mr-2" />
                        Thêm từ
                      </Button>
                    </div>

                    <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
                      <div className="hidden md:grid grid-cols-12 bg-slate-50 border-b border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600">
                        <div className="col-span-1">#</div>
                        <div className="col-span-3">Từ vựng</div>
                        <div className="col-span-2">Nghĩa</div>
                        <div className="col-span-3">Ví dụ</div>
                        <div className="col-span-1">Loại từ</div>
                        <div className="col-span-1">CEFR</div>
                        <div className="col-span-1 text-right">Xoá</div>
                      </div>

                      <div className="max-h-[52vh] overflow-y-auto">
                        {generatedVocabularies.map((vocab, index) => (
                          <div
                            key={`${vocab.word || 'v'}-${index}`}
                            className={cx(
                              'px-4 py-4 border-b border-slate-100',
                              'grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-start'
                            )}
                          >
                            <div className="md:col-span-1 flex items-center gap-2">
                              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white text-xs font-bold">
                                {index + 1}
                              </span>
                            </div>

                            <div className="md:col-span-3">
                              <Field label="Từ vựng" required>
                                <input
                                  value={vocab.word || ''}
                                  onChange={(e) => handleVocabularyChange(index, 'word', e.target.value)}
                                  className={inputBase}
                                  placeholder="word"
                                />
                              </Field>
                            </div>

                            <div className="md:col-span-2">
                              <Field label="Nghĩa" required>
                                <input
                                  value={vocab.meaning || ''}
                                  onChange={(e) => handleVocabularyChange(index, 'meaning', e.target.value)}
                                  className={inputBase}
                                  placeholder="meaning"
                                />
                              </Field>
                            </div>

                            <div className="md:col-span-3">
                              <Field label="Ví dụ" required>
                                <Textarea
                                  value={vocab.example_sentence || ''}
                                  onChange={(e) => handleVocabularyChange(index, 'example_sentence', e.target.value)}
                                  rows={2}
                                  placeholder="example sentence…"
                                />
                              </Field>
                            </div>

                            <div className="md:col-span-1">
                              <Field label="Loại từ" required>
                                <select
                                  value={vocab.part_of_speech || 'noun'}
                                  onChange={(e) => handleVocabularyChange(index, 'part_of_speech', e.target.value)}
                                  className={inputBase}
                                >
                                  <option value="noun">Noun</option>
                                  <option value="verb">Verb</option>
                                  <option value="adjective">Adjective</option>
                                  <option value="adverb">Adverb</option>
                                  <option value="preposition">Preposition</option>
                                  <option value="conjunction">Conjunction</option>
                                  <option value="pronoun">Pronoun</option>
                                  <option value="interjection">Interjection</option>
                                </select>
                              </Field>
                            </div>

                            <div className="md:col-span-1">
                              <Field label="CEFR" required>
                                <select
                                  value={vocab.cefr_level || 'B1'}
                                  onChange={(e) => handleVocabularyChange(index, 'cefr_level', e.target.value)}
                                  className={inputBase}
                                >
                                  <option value="A1">A1</option>
                                  <option value="A2">A2</option>
                                  <option value="B1">B1</option>
                                  <option value="B2">B2</option>
                                  <option value="C1">C1</option>
                                  <option value="C2">C2</option>
                                </select>
                              </Field>
                            </div>

                            <div className="md:col-span-1 flex md:justify-end">
                              <button
                                type="button"
                                onClick={() => handleRemoveVocabulary(index)}
                                className="rounded-xl p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                                aria-label="Xóa từ vựng"
                              >
                                <Icon.Trash className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        ))}

                        {generatedVocabularies.length === 0 && (
                          <div className="p-6 text-center text-sm text-slate-600">Chưa có từ vựng nào.</div>
                        )}
                      </div>
                    </div>

                    {!!errMsg && <Alert>{errMsg}</Alert>}
                  </div>
                )}

                {/* STEP: TEST INFO */}
                {currentStep === 'test-info' && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm text-slate-700">
                        Số từ vựng: <span className="font-semibold text-slate-900">{generatedVocabularies.length}</span> — Chủ đề:{' '}
                        <span className="font-semibold text-slate-900">{aiConfig.topic}</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <Field label="Tiêu đề bài test" required>
                          <input
                            value={testInfo.test_title}
                            onChange={(e) => handleTestInfoChange('test_title', e.target.value)}
                            className={inputBase}
                            placeholder="VD: Business Vocabulary - AI Test"
                          />
                        </Field>
                      </div>

                      <Field label="Chủ đề chính" required>
                        <input
                          value={testInfo.main_topic}
                          onChange={(e) => handleTestInfoChange('main_topic', e.target.value)}
                          className={inputBase}
                          placeholder="VD: Business"
                        />
                      </Field>

                      <Field label="Phân mục" required>
                        <input
                          value={testInfo.sub_topic}
                          onChange={(e) => handleTestInfoChange('sub_topic', e.target.value)}
                          className={inputBase}
                          placeholder="VD: Meetings"
                        />
                      </Field>

                      <Field label="Độ khó">
                        <select
                          value={testInfo.difficulty}
                          onChange={(e) => handleTestInfoChange('difficulty', e.target.value)}
                          className={inputBase}
                        >
                          <option value="easy">Dễ</option>
                          <option value="medium">Trung bình</option>
                          <option value="hard">Khó</option>
                        </select>
                      </Field>

                      <Field label="Thời gian" hint="phút">
                        <input
                          type="number"
                          min={1}
                          max={120}
                          value={testInfo.time_limit_minutes}
                          onChange={(e) => {
                            const v = Math.max(1, Math.min(120, parseInt(e.target.value, 10) || 10));
                            handleTestInfoChange('time_limit_minutes', v);
                          }}
                          className={inputBase}
                        />
                      </Field>

                      <div className="md:col-span-2">
                        <Field label="Chế độ hiển thị">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => handleTestInfoChange('visibility', 'public')}
                              className={cx(
                                'rounded-2xl border p-4 text-left transition',
                                'hover:shadow-sm',
                                testInfo.visibility === 'public'
                                  ? 'border-indigo-600 bg-indigo-600 text-white'
                                  : 'border-slate-200 bg-white hover:bg-slate-50'
                              )}
                            >
                              <div className="text-sm font-bold">🌍 Công khai</div>
                              <div className={cx('text-xs mt-1', testInfo.visibility === 'public' ? 'text-white/80' : 'text-slate-500')}>
                                Mọi người có thể xem
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleTestInfoChange('visibility', 'private')}
                              className={cx(
                                'rounded-2xl border p-4 text-left transition',
                                'hover:shadow-sm',
                                testInfo.visibility === 'private'
                                  ? 'border-indigo-600 bg-indigo-600 text-white'
                                  : 'border-slate-200 bg-white hover:bg-slate-50'
                              )}
                            >
                              <div className="text-sm font-bold">🔒 Riêng tư</div>
                              <div className={cx('text-xs mt-1', testInfo.visibility === 'private' ? 'text-white/80' : 'text-slate-500')}>
                                Chỉ mình tôi
                              </div>
                            </button>
                          </div>
                        </Field>
                      </div>

                      <div className="md:col-span-2">
                        <Field label="Mô tả" hint="Tuỳ chọn">
                          <Textarea
                            value={testInfo.description}
                            onChange={(e) => handleTestInfoChange('description', e.target.value)}
                            rows={3}
                            placeholder="Mô tả ngắn về bài test…"
                          />
                        </Field>
                      </div>
                    </div>

                    {!!errMsg && <Alert>{errMsg}</Alert>}
                  </div>
                )}

                {/* STEP: REVIEW */}
                {currentStep === 'review' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div className="lg:col-span-1 rounded-2xl border border-slate-200 p-4 bg-white">
                        <div className="text-sm font-bold text-slate-900">Tóm tắt</div>
                        <div className="mt-3 space-y-2 text-sm text-slate-700">
                          <div className="flex justify-between gap-3">
                            <span className="text-slate-500">Tiêu đề</span>
                            <span className="font-semibold text-slate-900 text-right">{testInfo.test_title}</span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-slate-500">Chủ đề</span>
                            <span className="font-semibold text-slate-900 text-right">
                              {testInfo.main_topic} / {testInfo.sub_topic}
                            </span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-slate-500">Độ khó</span>
                            <span className="font-semibold text-slate-900 capitalize">{testInfo.difficulty}</span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-slate-500">Thời gian</span>
                            <span className="font-semibold text-slate-900">{testInfo.time_limit_minutes} phút</span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-slate-500">Số từ</span>
                            <span className="font-semibold text-slate-900">{generatedVocabularies.length}</span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-slate-500">Hiển thị</span>
                            <span className="font-semibold text-slate-900">
                              {testInfo.visibility === 'public' ? '🌍 Public' : '🔒 Private'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="lg:col-span-2 rounded-2xl border border-slate-200 overflow-hidden bg-white">
                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                          <div className="text-sm font-bold text-slate-900">Danh sách từ vựng</div>
                          <div className="text-xs text-slate-500">{generatedVocabularies.length} từ</div>
                        </div>

                        <div className="max-h-[52vh] overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-white border-b border-slate-100">
                              <tr className="text-left text-xs font-bold text-slate-600">
                                <th className="px-4 py-3 w-14">#</th>
                                <th className="px-4 py-3 w-[28%]">Từ</th>
                                <th className="px-4 py-3 w-[28%]">Nghĩa</th>
                                <th className="px-4 py-3">Ví dụ</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {generatedVocabularies.map((v, i) => (
                                <tr key={`${v.word}-${i}`} className="hover:bg-slate-50 transition">
                                  <td className="px-4 py-3 font-bold text-slate-900">{i + 1}</td>
                                  <td className="px-4 py-3 font-semibold text-slate-900">{v.word}</td>
                                  <td className="px-4 py-3 text-slate-800">{v.meaning}</td>
                                  <td className="px-4 py-3 text-slate-600 italic">{v.example_sentence}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {!!errMsg && <Alert>{errMsg}</Alert>}
                  </div>
                )}

                {/* STEP: CREATING */}
                {currentStep === 'creating' && <SkeletonSpinner label="Đang tạo bài test…" />}

                {/* STEP: SUCCESS */}
                {currentStep === 'success' && (
                  <div className="py-10 text-center">
                    <div className="mx-auto h-12 w-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
                      <Icon.Check className="h-6 w-6 text-emerald-700" />
                    </div>
                    <h3 className="mt-4 text-base font-bold text-slate-900">Tạo thành công!</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Bài test "<span className="font-semibold text-slate-900">{testInfo.test_title}</span>" đã được tạo.
                    </p>
                    <div className="mt-6 flex gap-3 justify-center">
                      <Button
                        type="button"
                        onClick={() => {
                          handleClose();
                          navigate(`/vocabulary/test/${createdTest._id}/settings`);
                        }}
                        tone="primary"
                        size="sm"
                      >
                        Làm bài test ngay
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          handleClose();
                          navigate(`/test/${testInfo.main_topic}/${testInfo.sub_topic}?type=vocabulary`);
                        }}
                        tone="secondary"
                        size="sm"
                      >
                        Xem bài test
                      </Button>
                      <Button
                        type="button"
                        onClick={handleClose}
                        tone="ghost"
                        size="sm"
                      >
                        Đóng
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer (sticky) */}
            {canShowFooter && (
              <div className="border-t border-slate-100 px-5 py-3 bg-white sticky bottom-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {currentStep !== 'ai-config' && (
                      <Button type="button" onClick={goBack} disabled={loading} tone="secondary" size="sm">
                        <Icon.Back className="h-4 w-4 mr-2" />
                        Quay lại
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button type="button" onClick={handleClose} disabled={loading} tone="secondary" size="sm">
                      Hủy
                    </Button>

                    {currentStep === 'ai-config' && (
                      <Button type="button" onClick={handleGenerateWithAI} disabled={loading} tone="primary" size="sm">
                        {loading ? 'Đang tạo…' : 'Tạo danh sách'}
                      </Button>
                    )}

                    {currentStep === 'edit-vocabulary' && (
                      <Button type="button" onClick={handleSaveVocabularies} disabled={loading} tone="primary" size="sm">
                        Tiếp tục
                      </Button>
                    )}

                    {currentStep === 'test-info' && (
                      <Button type="button" onClick={handleContinueToReview} disabled={loading} tone="primary" size="sm">
                        Xem lại
                      </Button>
                    )}

                    {currentStep === 'review' && (
                      <Button type="button" onClick={handleCreateTest} disabled={loading} tone="success" size="sm">
                        {loading ? 'Đang tạo…' : 'Tạo bài test'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title="Tạo bài test từ vựng với AI"
        aria-label="Tạo với AI"
        className={cx(
          // Pill base
          'inline-flex items-center justify-center rounded-full',
          'text-white shadow-lg transition transform duration-200',
          'hover:scale-[1.02] active:scale-95',
          'focus:outline-none focus:ring-4 focus:ring-purple-300/30 focus:ring-offset-2',
          // spacing when not FAB
          isFab ? 'p-0' : 'px-5 py-3 text-sm font-bold gap-3',
          // allow parent to pass gradient or additional classes
          className
        )}
      >
        <span
          className={cx(
            'relative inline-flex items-center justify-center flex-shrink-0 rounded-full',
            isFab ? 'w-11 h-11' : 'w-9 h-9',
            // stronger, contrasted circle so the icon doesn't blend into gradient backgrounds
            'bg-white/20 shadow-sm'
          )}
        >
          <span aria-hidden className={isFab ? 'text-2xl' : 'text-lg'}>🤖</span>
        </span>

        {!isFab && <span className="select-none">Tạo từ vựng với AI</span>}
      </button>

      {modal}
    </>
  );
};

export default CreateVocabularyWithAIButton;
