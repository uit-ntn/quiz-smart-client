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
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    </svg>
  ),
  Close: (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Back: (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
    </svg>
  ),
  Plus: (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
    </svg>
  ),
  Trash: (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  ),
  Check: (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
    </svg>
  ),
  Info: (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
};

// Components
const Field = ({ label, hint, required, children }) => (
  <div className="space-y-1.5">
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-gray-900">
        {label} {required ? <span className="text-rose-600">*</span> : null}
      </label>
      {hint ? <span className="text-xs text-gray-500">{hint}</span> : null}
    </div>
    {children}
  </div>
);

const inputBase =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition';

const btnBase =
  'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition ' +
  'focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

const StepPill = ({ active, done, children }) => (
  <div
    className={cx(
      'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold border',
      done
        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
        : active
        ? 'bg-gray-900 text-white border-gray-900'
        : 'bg-white text-gray-600 border-gray-200'
    )}
  >
    <span
      className={cx(
        'inline-flex h-5 w-5 items-center justify-center rounded-full',
        done ? 'bg-emerald-600 text-white' : active ? 'bg-white/15 text-white' : 'bg-gray-100 text-gray-600'
      )}
    >
      {done ? <Icon.Check className="h-3.5 w-3.5" /> : <span className="text-[11px] leading-none">•</span>}
    </span>
    {children}
  </div>
);

const Alert = ({ tone = 'error', children }) => (
  <div
    className={cx(
      'rounded-xl border p-3 text-sm flex gap-2',
      tone === 'error' ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-gray-50 border-gray-200 text-gray-900'
    )}
  >
    <Icon.Info className={cx('h-5 w-5 flex-shrink-0', tone === 'error' ? 'text-rose-500' : 'text-gray-500')} />
    <div className="whitespace-pre-line">{children}</div>
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

  // Refs
  const overlayRef = useRef(null);
  const cardRef = useRef(null);
  const redirectTimerRef = useRef(null);
  const mountedRef = useRef(true);

  const isFab = useMemo(() => className.includes('w-14') && className.includes('h-14'), [className]);

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
      'edit-vocabulary': 'Bạn có thể sửa, thêm hoặc xoá trước khi tạo bài test.',
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
  };

  const handleClose = () => {
    if (loading) return;
    resetState();
    setShowModal(false);
  };

  const handleClick = () => {
    if (!user) {
      localStorage.setItem('authReturnTo', window.location.pathname);
      navigate('/login', {
        state: { message: 'Vui lòng đăng nhập để tạo bài test từ vựng với AI.' },
      });
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
    if (cardRef.current && !cardRef.current.contains(e.target)) {
      handleClose();
    }
  };

  const handleAIConfigChange = (field, value) => setAiConfig((prev) => ({ ...prev, [field]: value }));
  const handleTestInfoChange = (field, value) => setTestInfo((prev) => ({ ...prev, [field]: value }));

  const handleGenerateWithAI = async () => {
    if (!user) return;
    if (!aiConfig.topic.trim()) {
      setErrMsg('Vui lòng nhập chủ đề');
      return;
    }

    setLoading(true);
    setErrMsg('');
    setCurrentStep('generating');

    try {
      const result = await vocabularyService.generateVocabulary(aiConfig);

      if (result?.success && result?.data?.vocabulary) {
        setGeneratedVocabularies(result.data.vocabulary);

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
      console.error('Error generating vocabulary:', error);
      setErrMsg(error?.message || 'Có lỗi xảy ra khi tạo từ vựng với AI');
      setCurrentStep('ai-config');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  // Vocabulary editing functions
  const handleVocabularyChange = (index, field, value) => {
    setGeneratedVocabularies((prev) => prev.map((v, i) => (i === index ? { ...v, [field]: value } : v)));
  };

  const handleAddVocabulary = () => {
    setGeneratedVocabularies((prev) => [...prev, { word: '', meaning: '', example_sentence: '' }]);
  };

  const handleRemoveVocabulary = (index) => {
    setGeneratedVocabularies((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveVocabularies = () => {
    const invalid = generatedVocabularies.filter((v) => !v.word?.trim() || !v.meaning?.trim());
    if (invalid.length > 0) {
      setErrMsg('Vui lòng điền đầy đủ "Từ vựng" và "Nghĩa" cho tất cả các mục.');
      return;
    }
    if (generatedVocabularies.length === 0) {
      setErrMsg('Cần ít nhất 1 từ vựng để tạo bài test.');
      return;
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
      const visibilityValue = testInfo.visibility === 'public' ? 'public' : 'private';

      const testData = {
        ...testInfo,
        visibility: visibilityValue,
        test_type: 'vocabulary',
        total_questions: generatedVocabularies.length,
        status: 'active',
      };

      console.debug('CreateVocabularyWithAI - creating test payload:', testData);

      const createdTest = await testService.createTest(testData);

      const vocabularyPromises = generatedVocabularies.map((vocab) =>
        vocabularyService.createVocabulary({ ...vocab, test_id: createdTest._id })
      );

      const results = await Promise.allSettled(vocabularyPromises);
      const rejected = results.filter((r) => r.status === 'rejected');
      if (rejected.length) {
        setErrMsg(`Một số từ vựng tạo không thành công: ${rejected.length}/${generatedVocabularies.length}`);
      }

      setCurrentStep('success');

      redirectTimerRef.current = setTimeout(() => {
        navigate(`/vocabulary/test/${createdTest._id}/settings`);
        if (mountedRef.current) handleClose();
      }, 1200);
    } catch (err) {
      console.error('Error creating vocabulary test:', err);
      setErrMsg(err?.message || 'Có lỗi xảy ra khi tạo bài test');
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

  const modal = showModal ? createPortal(
    <div
      ref={overlayRef}
      onMouseDown={onOverlayClick}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 backdrop-blur-sm p-3"
      aria-modal="true"
      role="dialog"
    >
      <div
        ref={cardRef}
        onMouseDown={(e) => e.stopPropagation()}
        className={cx(
          'w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-200',
          'flex flex-col max-h-[92vh]'
        )}
      >
        {/* Header */}
        <div className="border-b border-gray-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="h-10 w-10 rounded-2xl bg-gray-900 text-white flex items-center justify-center flex-shrink-0">
                <Icon.Spark className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">{title}</h2>
                <p className="text-sm text-gray-600">{subtitle}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className={cx(
                'rounded-xl p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition',
                'disabled:opacity-50'
              )}
              aria-label="Đóng"
            >
              <Icon.Close className="h-5 w-5" />
            </button>
          </div>

          {/* Stepper */}
          {canShowFooter && (
            <div className="mt-4 flex flex-wrap gap-2">
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
          <div className="px-6 py-6">
            {/* STEP: AI CONFIG */}
            {currentStep === 'ai-config' && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm text-gray-700">
                    Gợi ý: nhập <span className="font-semibold text-gray-900">chủ đề</span> +{' '}
                    <span className="font-semibold text-gray-900">phân loại</span> để AI tạo sát nhu cầu hơn.
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
                      <textarea
                        value={aiConfig.description}
                        onChange={(e) => handleAIConfigChange('description', e.target.value)}
                        rows={3}
                        className={cx(inputBase, 'resize-none')}
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
              <div className="py-10 text-center">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />
                <h3 className="mt-4 text-base font-semibold text-gray-900">AI đang tạo từ vựng…</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Đang tạo <span className="font-semibold text-gray-900">{aiConfig.count}</span> từ cho chủ đề "
                  {aiConfig.topic}"
                </p>
              </div>
            )}

            {/* STEP: EDIT VOCAB */}
            {currentStep === 'edit-vocabulary' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-gray-600">
                      AI đã tạo <span className="font-semibold text-gray-900">{generatedVocabularies.length}</span> từ.
                      Bạn có thể chỉnh sửa trước khi tạo bài.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddVocabulary}
                    className={cx(btnBase, 'bg-white border border-gray-200 text-gray-900 hover:bg-gray-50')}
                  >
                    <Icon.Plus className="h-4 w-4 mr-2" />
                    Thêm từ
                  </button>
                </div>

                <div className="rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="hidden md:grid grid-cols-12 gap-0 bg-gray-50 border-b border-gray-200 px-4 py-3 text-xs font-semibold text-gray-600">
                    <div className="col-span-1">#</div>
                    <div className="col-span-3">Từ vựng</div>
                    <div className="col-span-3">Nghĩa</div>
                    <div className="col-span-4">Ví dụ</div>
                    <div className="col-span-1 text-right">Xoá</div>
                  </div>

                  <div className="max-h-[52vh] overflow-y-auto">
                    {generatedVocabularies.map((vocab, index) => (
                      <div
                        key={`${vocab.word || 'v'}-${index}`}
                        className={cx(
                          'px-4 py-4 border-b border-gray-100',
                          'grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-start'
                        )}
                      >
                        <div className="md:col-span-1 flex items-center gap-2">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-white text-xs font-semibold">
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

                        <div className="md:col-span-3">
                          <Field label="Nghĩa" required>
                            <input
                              value={vocab.meaning || ''}
                              onChange={(e) => handleVocabularyChange(index, 'meaning', e.target.value)}
                              className={inputBase}
                              placeholder="meaning"
                            />
                          </Field>
                        </div>

                        <div className="md:col-span-4">
                          <Field label="Ví dụ">
                            <textarea
                              value={vocab.example_sentence || ''}
                              onChange={(e) => handleVocabularyChange(index, 'example_sentence', e.target.value)}
                              className={cx(inputBase, 'resize-none')}
                              rows={2}
                              placeholder="example sentence…"
                            />
                          </Field>
                        </div>

                        <div className="md:col-span-1 flex md:justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveVocabulary(index)}
                            className="rounded-xl p-2 text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition"
                            aria-label="Xóa từ vựng"
                          >
                            <Icon.Trash className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {generatedVocabularies.length === 0 && (
                      <div className="p-6 text-center text-sm text-gray-600">Chưa có từ vựng nào.</div>
                    )}
                  </div>
                </div>

                {!!errMsg && <Alert>{errMsg}</Alert>}
              </div>
            )}

            {/* STEP: TEST INFO */}
            {currentStep === 'test-info' && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm text-gray-700">
                    Số từ vựng: <span className="font-semibold text-gray-900">{generatedVocabularies.length}</span> — Chủ
                    đề: <span className="font-semibold text-gray-900">{aiConfig.topic}</span>
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
                            testInfo.visibility === 'public'
                              ? 'border-gray-900 bg-gray-900 text-white'
                              : 'border-gray-200 bg-white hover:bg-gray-50'
                          )}
                        >
                          <div className="text-sm font-semibold">🌍 Công khai</div>
                          <div
                            className={cx(
                              'text-xs mt-1',
                              testInfo.visibility === 'public' ? 'text-white/80' : 'text-gray-500'
                            )}
                          >
                            Mọi người có thể xem
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleTestInfoChange('visibility', 'private')}
                          className={cx(
                            'rounded-2xl border p-4 text-left transition',
                            testInfo.visibility === 'private'
                              ? 'border-gray-900 bg-gray-900 text-white'
                              : 'border-gray-200 bg-white hover:bg-gray-50'
                          )}
                        >
                          <div className="text-sm font-semibold">🔒 Riêng tư</div>
                          <div
                            className={cx(
                              'text-xs mt-1',
                              testInfo.visibility === 'private' ? 'text-white/80' : 'text-gray-500'
                            )}
                          >
                            Chỉ mình tôi
                          </div>
                        </button>
                      </div>
                    </Field>
                  </div>

                  <div className="md:col-span-2">
                    <Field label="Mô tả" hint="Tuỳ chọn">
                      <textarea
                        value={testInfo.description}
                        onChange={(e) => handleTestInfoChange('description', e.target.value)}
                        rows={3}
                        className={cx(inputBase, 'resize-none')}
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
              <div className="space-y-5">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-1 rounded-2xl border border-gray-200 p-4">
                    <div className="text-sm font-semibold text-gray-900">Tóm tắt</div>
                    <div className="mt-3 space-y-2 text-sm text-gray-700">
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-500">Tiêu đề</span>
                        <span className="font-semibold text-gray-900 text-right">{testInfo.test_title}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-500">Chủ đề</span>
                        <span className="font-semibold text-gray-900 text-right">
                          {testInfo.main_topic} / {testInfo.sub_topic}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-500">Độ khó</span>
                        <span className="font-semibold text-gray-900 capitalize">{testInfo.difficulty}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-500">Thời gian</span>
                        <span className="font-semibold text-gray-900">{testInfo.time_limit_minutes} phút</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-500">Số từ</span>
                        <span className="font-semibold text-gray-900">{generatedVocabularies.length}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-500">Hiển thị</span>
                        <span className="font-semibold text-gray-900">
                          {testInfo.visibility === 'public' ? '🌍 Public' : '🔒 Private'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-2 rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                      <div className="text-sm font-semibold text-gray-900">Danh sách từ vựng</div>
                      <div className="text-xs text-gray-500">{generatedVocabularies.length} từ</div>
                    </div>

                    <div className="max-h-[52vh] overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-white border-b border-gray-100">
                          <tr className="text-left text-xs font-semibold text-gray-600">
                            <th className="px-4 py-3 w-14">#</th>
                            <th className="px-4 py-3 w-[28%]">Từ</th>
                            <th className="px-4 py-3 w-[28%]">Nghĩa</th>
                            <th className="px-4 py-3">Ví dụ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {generatedVocabularies.map((v, i) => (
                            <tr key={`${v.word}-${i}`} className="hover:bg-gray-50 transition">
                              <td className="px-4 py-3 font-semibold text-gray-900">{i + 1}</td>
                              <td className="px-4 py-3 font-semibold text-gray-900">{v.word}</td>
                              <td className="px-4 py-3 text-gray-800">{v.meaning}</td>
                              <td className="px-4 py-3 text-gray-600 italic">{v.example_sentence}</td>
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
            {currentStep === 'creating' && (
              <div className="py-10 text-center">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />
                <h3 className="mt-4 text-base font-semibold text-gray-900">Đang tạo bài test…</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Đang lưu <span className="font-semibold text-gray-900">{generatedVocabularies.length}</span> từ vựng.
                </p>
              </div>
            )}

            {/* STEP: SUCCESS */}
            {currentStep === 'success' && (
              <div className="py-10 text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Icon.Check className="h-6 w-6 text-emerald-700" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-gray-900">Tạo thành công!</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Bài test "<span className="font-semibold text-gray-900">{testInfo.test_title}</span>" đã được tạo.
                </p>
                <p className="mt-3 text-xs text-gray-500">Đang chuyển hướng…</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        {canShowFooter && (
          <div className="border-t border-gray-100 px-6 py-4 bg-white">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {currentStep !== 'ai-config' && (
                  <button
                    type="button"
                    onClick={goBack}
                    disabled={loading}
                    className={cx(btnBase, 'bg-white border border-gray-200 text-gray-900 hover:bg-gray-50')}
                  >
                    <Icon.Back className="h-4 w-4 mr-2" />
                    Quay lại
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className={cx(btnBase, 'bg-white border border-gray-200 text-gray-900 hover:bg-gray-50')}
                >
                  Hủy
                </button>

                {currentStep === 'ai-config' && (
                  <button
                    type="button"
                    onClick={handleGenerateWithAI}
                    disabled={loading}
                    className={cx(btnBase, 'bg-gray-900 text-white hover:bg-gray-800')}
                  >
                    {loading ? 'Đang tạo…' : 'Tạo danh sách'}
                  </button>
                )}

                {currentStep === 'edit-vocabulary' && (
                  <button
                    type="button"
                    onClick={handleSaveVocabularies}
                    disabled={loading}
                    className={cx(btnBase, 'bg-gray-900 text-white hover:bg-gray-800')}
                  >
                    Tiếp tục
                  </button>
                )}

                {currentStep === 'test-info' && (
                  <button
                    type="button"
                    onClick={handleContinueToReview}
                    disabled={loading}
                    className={cx(btnBase, 'bg-gray-900 text-white hover:bg-gray-800')}
                  >
                    Xem lại
                  </button>
                )}

                {currentStep === 'review' && (
                  <button
                    type="button"
                    onClick={handleCreateTest}
                    disabled={loading}
                    className={cx(btnBase, 'bg-emerald-600 text-white hover:bg-emerald-700')}
                  >
                    {loading ? 'Đang tạo…' : 'Tạo bài test'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title="Tạo bài test từ vựng với AI"
        className={[
          'inline-flex items-center justify-center rounded-xl',
          'bg-gray-900 text-white hover:bg-gray-800',
          'shadow-sm hover:shadow-md transition',
          'focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2',
          isFab ? 'p-0' : 'px-4 py-2 text-sm font-semibold gap-2',
          className,
        ].join(' ')}
      >
        <span
          className={[
            'inline-flex items-center justify-center rounded-lg',
            isFab ? '' : 'bg-white/10',
            isFab ? '' : 'w-8 h-8',
          ].join(' ')}
        >
          <Icon.Spark className={isFab ? 'w-6 h-6' : 'w-4 h-4'} />
        </span>
        {!isFab && <span>Tạo với AI</span>}
      </button>

      {modal}
    </>
  );
};

export default CreateVocabularyWithAIButton;
