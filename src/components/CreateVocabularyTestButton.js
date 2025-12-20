import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import testService from '../services/testService';
import vocabularyService from '../services/vocabularyService';

/** Ví dụ mặc định */
const SAMPLE_VOCAB = `aisle:lối đi giữa các hàng ghế/kệ:Passengers are walking down the aisle.
schedule:lịch trình:Please check your schedule before the meeting.
colleague:đồng nghiệp:I discussed the project with my colleague.`;

/** Chiều cao đồng nhất cho 2 panel bước 1 (px) */
const PANEL_HEIGHT = 520;

const CreateVocabularyTestButton = ({ className = '' }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Modal state
  const [showModal, setShowModal] = useState(false);
  
  // Steps: 'vocabulary' -> 'test-info' -> 'review' -> 'creating' -> 'success'
  const [currentStep, setCurrentStep] = useState('vocabulary');
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  // Step 1
  const [vocabularyText, setVocabularyText] = useState('');
  const [parsedVocabularies, setParsedVocabularies] = useState([]);
  const [hasSeededSample, setHasSeededSample] = useState(false);
  const [isSampleActive, setIsSampleActive] = useState(false);

  // Step 2
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

  // Reset + close
  const handleClose = () => {
    setCurrentStep('vocabulary');
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
    setErrMsg('');
    setLoading(false);
    setHasSeededSample(false);
    setIsSampleActive(false);
    setCreatedTest(null);
    setShowModal(false);
  };

  // Parse "từ:nghĩa:câu ví dụ (cho phép : trong câu ví dụ)"
  const parseVocabularyText = (text) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    const vocabularies = [];
    const errors = [];
    lines.forEach((line, idx) => {
      const parts = line.split(':').map((s) => s.trim());
      if (parts.length < 2) {
        errors.push(`Dòng ${idx + 1}: Cần tối thiểu "từ:nghĩa"`);
        return;
      }
      const [word, meaning, ...rest] = parts;
      if (!word || !meaning) {
        errors.push(`Dòng ${idx + 1}: Từ vựng và nghĩa không được để trống`);
        return;
      }
      const example_sentence = (rest.join(':') || `Example sentence with ${word}.`).trim();
      vocabularies.push({ word, meaning, example_sentence });
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
  const handleContinueToTestInfo = () => {
    if (!vocabularyText.trim()) return setErrMsg('Vui lòng nhập danh sách từ vựng');
    const { vocabularies, errors } = parseVocabularyText(vocabularyText);
    if (errors.length) return setErrMsg(errors.join('\n'));
    if (!vocabularies.length) return setErrMsg('Không tìm thấy từ vựng hợp lệ nào');
    setParsedVocabularies(vocabularies);
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
      // Ensure visibility is sent as either 'public' or 'private' (defensive)
      const visibilityValue = testInfo.visibility === 'public' ? 'public' : 'private';

      const testData = {
        ...testInfo,
        visibility: visibilityValue,
        test_type: 'vocabulary',
        total_questions: parsedVocabularies.length,
        status: 'active',
      };

      console.debug('CreateVocabularyTestButton - creating test payload:', testData);

      const createdTest = await testService.createTest(testData);
      setCreatedTest(createdTest);

      const vocabularyPromises = parsedVocabularies.map((vocab) =>
        vocabularyService.createVocabulary({
          ...vocab,
          test_id: createdTest._id,
        })
      );

      const results = await Promise.allSettled(vocabularyPromises);
      const rejected = results.filter((r) => r.status === 'rejected');
      if (rejected.length) {
        setErrMsg(`Một số từ vựng tạo không thành công: ${rejected.length}/${parsedVocabularies.length}`);
      }

      setCurrentStep('success');
    } catch (err) {
      console.error('Error creating vocabulary test:', err);
      setErrMsg(err?.message || 'Có lỗi xảy ra khi tạo bài test');
      setCurrentStep('review');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const totalSteps = 3;
  const progressPct =
    currentStep === 'vocabulary' ? (100 / totalSteps) * 1 :
      currentStep === 'test-info' ? (100 / totalSteps) * 2 :
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
                {currentStep === 'vocabulary' && 'Nhập Danh Sách Từ Vựng'}
                {currentStep === 'test-info' && 'Thông Tin Bài Test'}
                {currentStep === 'review' && 'Xem Lại Thông Tin'}
                {currentStep === 'creating' && 'Đang Tạo Bài Test'}
                {currentStep === 'success' && 'Hoàn Thành!'}
              </h2>
              <p className="text-xs text-neutral-600">
                {currentStep === 'vocabulary' && 'Bước 1/3 - Chuẩn bị từ vựng'}
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
                {currentStep === 'vocabulary' ? '1/3' : currentStep === 'test-info' ? '2/3' : '3/3'}
              </span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-neutral-50">
          <div className="p-6 space-y-6">
            {/* STEP 1 */}
            {currentStep === 'vocabulary' && (
              <div className="space-y-6">
                {/* Tips */}
                <div className="bg-white border border-neutral-200 rounded-lg p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-md bg-neutral-200 flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-5 h-5 text-neutral-700"
                        fill="none"
                        stroke="currentColor"
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
                          từ:nghĩa:câu ví dụ
                        </code>
                      </p>
                      <p className="text-xs text-neutral-500">
                        Bạn có thể dùng dấu ":" trong câu ví dụ — hệ thống sẽ tự nhận dạng.
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
                        placeholder="Nhập theo định dạng: từ:nghĩa:câu ví dụ"
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
                    <div className="px-6 py-4 bg-neutral-900">
                      <h3 className="text-base font-semibold text-white">Review từ vựng (cập nhật trực tiếp)</h3>
                      <p className="text-xs text-neutral-300">Định dạng: <span className="font-mono">từ:nghĩa:câu ví dụ</span></p>
                    </div>

                    <div className="flex-1 overflow-auto">
                      <table className="w-full">
                        <thead className="bg-neutral-100 sticky top-0 z-10">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider w-16">STT</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider w-1/4">Từ vựng</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider w-1/4">Nghĩa</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">Câu ví dụ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200">
                          {livePreviewVocabularies.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-4 py-10 text-center text-sm text-neutral-500">
                                Nội dung rỗng — bấm "Dán ví dụ mẫu" hoặc nhập ở khung bên trái.
                              </td>
                            </tr>
                          ) : (
                            livePreviewVocabularies.map((vocab, idx) => (
                              <tr key={`${vocab.word}-${idx}`} className={idx % 2 === 1 ? 'bg-neutral-50' : 'bg-white'}>
                                <td className="px-4 py-2 text-sm font-medium text-neutral-900">{idx + 1}</td>
                                <td className="px-4 py-2 text-sm font-semibold text-neutral-900">{vocab.word}</td>
                                <td className="px-4 py-2 text-sm text-neutral-800">{vocab.meaning}</td>
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

            {/* STEP 2 */}
            {currentStep === 'test-info' && (
              <div className="space-y-4">
                <div className="bg-white border border-neutral-200 rounded-lg p-4">
                  <h3 className="text-base font-semibold text-neutral-900 mb-1">Thông Tin Bài Test</h3>
                  <p className="text-sm text-neutral-700">
                    Đã phân tích <span className="font-semibold text-indigo-700">{parsedVocabularies.length} từ vựng</span>
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
                    <input
                      type="text"
                      value={testInfo.main_topic}
                      onChange={(e) => setTestInfo((p) => ({ ...p, main_topic: e.target.value }))}
                      placeholder="VD: TOEIC, IELTS, Business English"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-neutral-50 text-neutral-900 placeholder-neutral-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-800 mb-1">Phân mục <span className="text-rose-600">*</span></label>
                    <input
                      type="text"
                      value={testInfo.sub_topic}
                      onChange={(e) => setTestInfo((p) => ({ ...p, sub_topic: e.target.value }))}
                      placeholder="VD: Part 1, Daily Conversation"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-neutral-50 text-neutral-900 placeholder-neutral-500"
                    />
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
                  <div className="px-6 py-4 bg-neutral-900">
                    <h3 className="text-base font-semibold text-white">Danh sách từ vựng ({parsedVocabularies.length} từ)</h3>
                  </div>
                  <div className="overflow-x-auto" style={{ maxHeight: 420 }}>
                    <table className="w-full">
                      <thead className="bg-neutral-100 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider w-16">STT</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider w-1/4">Từ vựng</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider w-1/4">Nghĩa</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">Câu ví dụ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200">
                        {parsedVocabularies.map((vocab, index) => (
                          <tr key={`${vocab.word}-${index}`} className={index % 2 === 1 ? 'bg-neutral-50' : 'bg-white'}>
                            <td className="px-4 py-3 text-sm font-medium text-neutral-900">{index + 1}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-neutral-900">{vocab.word}</td>
                            <td className="px-4 py-3 text-sm text-neutral-800">{vocab.meaning}</td>
                            <td className="px-4 py-3 text-sm text-neutral-700 italic">{vocab.example_sentence}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
                  <button
                    onClick={() => {
                      handleClose();
                      navigate(`/vocabulary/test/${createdTest._id}/settings`);
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Làm bài test ngay
                  </button>
                  <button
                    onClick={() => {
                      handleClose();
                      navigate(`/vocabulary/tests/${testInfo.main_topic}/${testInfo.sub_topic}`);
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
            <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-200 bg-white">
              <div className="flex gap-3">
                {currentStep === 'test-info' && (
                  <button
                    type="button"
                    onClick={() => { setCurrentStep('vocabulary'); setErrMsg(''); }}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-neutral-800 bg-white border border-neutral-300 rounded-md hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    Quay lại
                  </button>
                )}
                {currentStep === 'review' && (
                  <button
                    type="button"
                    onClick={() => { setCurrentStep('test-info'); setErrMsg(''); }}
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

                {currentStep === 'vocabulary' && (
                  <button
                    type="button"
                    onClick={handleContinueToTestInfo}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    Tiếp tục
                  </button>
                )}

                {currentStep === 'test-info' && (
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
        <svg
          className="w-4 h-4 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 4v16m8-8H4"
          />
        </svg>
        Tự tạo bài test
      </button>

      {modal}
    </>
  );
};

export default CreateVocabularyTestButton;
