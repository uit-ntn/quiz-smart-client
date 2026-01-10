import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { VocabularyLayout } from '../layout/TestLayout';
import vocabularyService from '../services/vocabularyService';
import testService from '../services/testService';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import VocabularyPreviewModal from '../components/VocabularyPreviewModal';
import Toast from '../components/Toast';

const DEFAULT_TOTAL_QUESTIONS = 10;
const DEFAULT_TIME_PER_QUESTION = 30;

const VocabularyTestSettings = () => {
  const { testId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [testInfo, setTestInfo] = useState(null);
  const [vocabularyCount, setVocabularyCount] = useState(0);
  const [vocabularies, setVocabularies] = useState([]);

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const [mode, setMode] = useState('word_to_meaning');
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  
  // Toast state
  const [toast, setToast] = useState({ message: '', type: 'success', isVisible: false });

  useEffect(() => {
    const fetchTestInfo = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!testId || typeof testId !== 'string' || testId.trim().length === 0) {
          setError('Test ID không hợp lệ hoặc bị thiếu');
          return;
        }

        const [test, vocabList] = await Promise.all([
          testService.getTestById(testId),
          vocabularyService.getAllVocabulariesByTestId(testId),
        ]);

        setTestInfo(test);
        setVocabularies(vocabList || []);
        setVocabularyCount((vocabList && vocabList.length) || 0);

        const saved = localStorage.getItem(`vocab_settings_${testId}`);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed?.mode) setMode(parsed.mode);
            if (parsed?.shuffleQuestions !== undefined) setShuffleQuestions(parsed.shuffleQuestions);
          } catch {}
        }
      } catch (err) {
        console.error('Error fetching test info:', err);
        setError(`Không thể tải thông tin bài test: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (testId) fetchTestInfo();
    else {
      setError('Test ID không được tìm thấy trong URL');
      setLoading(false);
    }
  }, [testId]);

  const effective = useMemo(() => {
    const totalQuestions = vocabularyCount || DEFAULT_TOTAL_QUESTIONS;

    return {
      mode,
      totalQuestions,
      timePerQuestion: DEFAULT_TIME_PER_QUESTION,
      showAnswerMode: 'after_each', // mặc định kiểm tra mỗi câu
      shuffleQuestions,
    };
  }, [mode, vocabularyCount, shuffleQuestions]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type, isVisible: true });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, isVisible: false }));
  };

  const handleStartTest = () => {
    if (!vocabularies || vocabularies.length === 0) {
      showToast('Không có từ vựng nào trong bài test này. Vui lòng kiểm tra lại.', 'error');
      return;
    }
    setShowPreviewModal(true);
  };

  const handlePreviewAndStart = () => {
    localStorage.setItem(`vocab_settings_${testId}`, JSON.stringify(effective));
    navigate(`/vocabulary/test/${testId}/take`, { state: { settings: effective } });
  };

  const handlePlayAudio = (text) => {
    if (!text || isPlaying) return;

    setIsPlaying(true);
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.onend = () => setIsPlaying(false);
    u.onerror = () => setIsPlaying(false);
    speechSynthesis.speak(u);
  };

  const modes = [
    {
      value: 'word_to_meaning',
      title: 'Từ → Nghĩa',
      desc: 'Hiển thị từ tiếng Anh, gõ nghĩa tiếng Việt',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4H6" />
        </svg>
      ),
      accent: 'from-blue-500 to-indigo-600',
      ring: 'ring-blue-200',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
    },
    {
      value: 'meaning_to_word',
      title: 'Nghĩa → Từ',
      desc: 'Hiển thị nghĩa tiếng Việt, gõ từ tiếng Anh',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h10M7 12h6M7 17h10" />
        </svg>
      ),
      accent: 'from-emerald-500 to-teal-600',
      ring: 'ring-emerald-200',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
    },
    {
      value: 'listen_and_type',
      title: 'Nghe & Viết',
      desc: 'Nghe âm thanh và gõ từ tiếng Anh',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M6 10v4a1 1 0 001 1h1l4 4V5l-4 4H7a1 1 0 00-1 1z" />
        </svg>
      ),
      accent: 'from-orange-500 to-rose-600',
      ring: 'ring-orange-200',
      bg: 'bg-orange-50',
      text: 'text-orange-700',
    },
    {
      value: 'listen_and_write_sentence',
      title: 'Nghe câu & Viết câu',
      desc: 'Nghe câu ví dụ và viết lại câu hoàn chỉnh',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      accent: 'from-purple-500 to-pink-600',
      ring: 'ring-purple-200',
      bg: 'bg-purple-50',
      text: 'text-purple-700',
    },
  ];

  const selectedMode = modes.find((m) => m.value === mode) || modes[0];

  if (loading) return <LoadingSpinner message="Đang tải cấu hình..." />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <VocabularyLayout>
      <div className="mx-auto max-w-6xl px-3 sm:px-4 py-4 sm:py-6">
        {/* Top header */}
        <div className="mb-4 sm:mb-6 flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              Vocabulary Test
            </div>

            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Cấu hình bài test
            </h1>

            <p className="mt-1 text-sm text-slate-600">
              <span className="font-semibold text-slate-800">{testInfo?.test_title}</span>
              <span className="mx-2 text-slate-300">•</span>
              {vocabularyCount} từ vựng
            </p>
          </div>

          <button
            onClick={() => navigate(-1)}
            className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <span className="text-lg leading-none">←</span> Quay lại
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 sm:mt-6 grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Left: Test Info */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-3 sm:p-4">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 mb-3">Thông tin bài test</h2>
            <div className="space-y-2">
              <InfoLine icon="📝" label="Tiêu đề" value={testInfo?.test_title || "—"} />
              <InfoLine icon="📖" label="Mô tả" value={testInfo?.description || "—"} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <InfoLine icon="🏷️" label="Chủ đề chính" value={testInfo?.main_topic || "—"} />
                <InfoLine icon="📂" label="Chủ đề phụ" value={testInfo?.sub_topic || "—"} />
                <InfoLine icon="🔧" label="Loại test" value={testInfo?.test_type || "—"} />
                <InfoLine icon="❓" label="Số từ" value={vocabularyCount || "—"} />
                <InfoLine icon="⏱️" label="Thời gian" value={`${testInfo?.time_limit_minutes || 0} phút`} />
                <InfoLine icon="📊" label="Độ khó" value={testInfo?.difficulty || "—"} />
                <InfoLine icon="🔒" label="Trạng thái" value={testInfo?.status || "—"} />
                <InfoLine icon="👁️" label="Hiển thị" value={testInfo?.visibility || "—"} />
                <InfoLine icon="👤" label="Tạo bởi" value={testInfo?.created_by_full_name || "—"} />
              </div>
              
              {/* Vocabulary level statistics */}
              {vocabularies.length > 0 && (
                <div className="mt-4 space-y-3">
                  {/* CEFR Level Distribution */}
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                    <div className="text-xs font-semibold text-slate-600 mb-2">Phân bố theo trình độ CEFR</div>
                    <div className="flex flex-wrap gap-1">
                      {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(level => {
                        const count = vocabularies.filter(v => v.cefr_level === level).length;
                        if (count === 0) return null;
                        return (
                          <span key={level} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            ['A1', 'A2'].includes(level) ? 'bg-green-100 text-green-700' :
                            ['B1', 'B2'].includes(level) ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {level}: {count}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Part of Speech Distribution */}
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                    <div className="text-xs font-semibold text-slate-600 mb-2">Phân bố theo loại từ</div>
                    <div className="flex flex-wrap gap-1">
                      {['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'pronoun', 'interjection'].map(pos => {
                        const count = vocabularies.filter(v => v.part_of_speech === pos).length;
                        if (count === 0) return null;
                        const label = pos === 'noun' ? 'Danh từ' :
                                     pos === 'verb' ? 'Động từ' :
                                     pos === 'adjective' ? 'Tính từ' :
                                     pos === 'adverb' ? 'Trạng từ' :
                                     pos === 'preposition' ? 'Giới từ' :
                                     pos === 'conjunction' ? 'Liên từ' :
                                     pos === 'pronoun' ? 'Đại từ' :
                                     pos === 'interjection' ? 'Thán từ' : pos;
                        return (
                          <span key={pos} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            {label}: {count}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Settings */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-3">
            <div className="flex items-center justify-between gap-3 mb-2 sm:mb-3">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900">Chế độ bài test</h2>
                <p className="text-sm text-slate-600 mt-1">Chọn 1 chế độ. Hệ thống sẽ lưu lại cho lần sau.</p>
              </div>
              <span
                className={`hidden sm:inline-flex items-center rounded-xl px-3 py-1 text-xs font-semibold ${selectedMode.bg} ${selectedMode.text}`}
              >
                Đang chọn: {selectedMode.title}
              </span>
            </div>

            {/* Mode picker */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 items-stretch auto-rows-fr mb-3 sm:mb-4">
              {modes.map((m) => {
                const active = mode === m.value;

                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => {
                      setMode(m.value);
                      localStorage.setItem(
                        `vocab_settings_${testId}`,
                        JSON.stringify({ ...effective, mode: m.value })
                      );
                    }}
                    className={`
                      h-full min-h-[120px] sm:min-h-[160px] text-left rounded-2xl border p-2 sm:p-3 transition
                      flex flex-col shadow-sm hover:shadow
                      ${active ? `border-transparent ring-2 ${m.ring} bg-white` : 'border-slate-200 bg-white hover:bg-slate-50'}
                    `}
                  >
                    {/* header */}
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-gradient-to-br ${m.accent} text-white shadow-sm`}
                      >
                        {m.icon}
                      </div>

                      <div
                        className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                          active ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'
                        }`}
                      >
                        <span className={`h-2 w-2 rounded-full ${active ? 'bg-blue-600' : 'bg-slate-200'}`} />
                      </div>
                    </div>

                    {/* body */}
                    <div className="mt-2 flex-1">
                      <div className="font-extrabold text-slate-900 text-sm">{m.title}</div>
                      <div className="mt-1 text-xs text-slate-600 leading-relaxed">{m.desc}</div>
                    </div>

                    {/* footer */}
                    <div className="mt-3">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-semibold
                          ${active ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700'}
                        `}
                      >
                        {active ? '✓ Đang chọn' : 'Chọn'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Shuffle setting */}
            <div className="mt-4 p-4 rounded-2xl border border-slate-200 bg-slate-50">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shuffleQuestions}
                  onChange={(e) => {
                    setShuffleQuestions(e.target.checked);
                    localStorage.setItem(
                      `vocab_settings_${testId}`,
                      JSON.stringify({ ...effective, shuffleQuestions: e.target.checked })
                    );
                  }}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <div className="text-sm font-semibold text-slate-900">Đảo thứ tự câu hỏi</div>
                  <div className="text-xs text-slate-600">Trộn ngẫu nhiên thứ tự các từ vựng trong bài test.</div>
                </div>
              </label>
            </div>

            <div className="mt-6 space-y-3">
              <button
                onClick={() => setShowPreviewModal(true)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                👁️ Xem trước từ vựng
              </button>
              
              <button
                onClick={handleStartTest}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2 text-sm font-bold text-white shadow-lg hover:opacity-95 active:opacity-90"
              >
                Bắt đầu bài test <span className="text-lg">→</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <VocabularyPreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        items={vocabularies}
        isPlaying={isPlaying}
        onPlayAudio={handlePlayAudio}
        onStartTest={handlePreviewAndStart}
        testTitle={testInfo?.test_title}
        createdBy={testInfo?.created_by_full_name || null}
      />

      {/* Toast */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </VocabularyLayout>
  );
};

function InfoLine({ icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
      <div className="flex items-center gap-2 text-sm text-slate-700">
        <span className="text-base">{icon}</span>
        <span className="text-slate-500">{label}</span>
      </div>
      <div className="text-sm font-bold text-slate-900">{value}</div>
    </div>
  );
}

export default VocabularyTestSettings;
