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
            if (parsed?.mode) {
              const m = parsed.mode === "listen_and_type" ? "listen_and_write_sentence" : parsed.mode;
              setMode(m);
              if (parsed.mode === "listen_and_type") {
                localStorage.setItem(
                  `vocab_settings_${testId}`,
                  JSON.stringify({ ...parsed, mode: "listen_and_write_sentence" })
                );
              }
            }
            if (parsed?.shuffleQuestions !== undefined) {
              const parsedShuffle =
                parsed.shuffleQuestions === true || parsed.shuffleQuestions === "true"
                  ? true
                  : parsed.shuffleQuestions === false || parsed.shuffleQuestions === "false"
                  ? false
                  : true;
              setShuffleQuestions(parsedShuffle);
            }
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
      <div className="mx-auto max-w-7xl" style={{ background: "linear-gradient(to bottom right, #bae6fd, #dbeafe, #d1fae5)", borderRadius: "1rem", padding: "0.75rem" }}>

        {/* Top bar */}
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-violet-800 bg-violet-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-md">
              <span className="inline-flex h-2 w-2 rounded-full bg-lime-400" />
              Vocabulary Test
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-sky-800 bg-sky-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-md">
              📌 {vocabularyCount} từ
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border-2 border-emerald-800 bg-emerald-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-md">
              ⏱️ {testInfo?.time_limit_minutes || 0} phút
            </span>
          </div>

          <button
            onClick={() => navigate(-1)}
            className="shrink-0 self-start inline-flex items-center gap-1.5 rounded-xl border-[3px] border-teal-800 bg-teal-600 px-3 py-1.5 text-xs sm:text-sm font-extrabold text-white shadow-lg hover:bg-teal-500"
          >
            ← Quay lại
          </button>
        </div>

        {/* Title */}
        <div className="mb-2.5">
          <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Cấu hình bài test
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-indigo-900 font-bold line-clamp-2">
            {testInfo?.test_title}
          </p>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Left: Test Info — fuchsia card like Voice card in Voca */}
          <div className="rounded-2xl border-[3px] border-fuchsia-500 bg-gradient-to-br from-fuchsia-100 to-purple-200 shadow-xl ring-2 ring-fuchsia-300/60 p-3 sm:p-4">
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 mb-2.5 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-fuchsia-600 text-white text-xs font-extrabold shadow">📋</span>
              Thông tin bài test
            </h2>
            <div className="space-y-1.5">
              <InfoLine icon="📝" label="Tiêu đề" value={testInfo?.test_title || "—"} />
              <InfoLine icon="📖" label="Mô tả" value={testInfo?.description || "—"} />
              <div className="grid grid-cols-2 gap-1.5">
                <InfoLine icon="🏷️" label="Chủ đề" value={testInfo?.main_topic || "—"} />
                <InfoLine icon="📂" label="Phụ đề" value={testInfo?.sub_topic || "—"} />
                <InfoLine icon="❓" label="Số từ" value={vocabularyCount || "—"} />
                <InfoLine icon="⏱️" label="Thời gian" value={`${testInfo?.time_limit_minutes || 0} phút`} />
                <InfoLine icon="📊" label="Độ khó" value={testInfo?.difficulty || "—"} />
                <InfoLine icon="👁️" label="Hiển thị" value={testInfo?.visibility || "—"} />
                <InfoLine icon="👤" label="Tạo bởi" value={testInfo?.created_by_full_name || "—"} className="col-span-2" />
              </div>

              {/* Vocabulary statistics */}
              {vocabularies.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl border-2 border-indigo-400 bg-white shadow-sm">
                    <div className="text-[10px] font-extrabold text-indigo-900 mb-1.5">Phân bố CEFR</div>
                    <div className="flex flex-wrap gap-1">
                      {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(level => {
                        const count = vocabularies.filter(v => v.cefr_level === level).length;
                        if (count === 0) return null;
                        return (
                          <span key={level} className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            ['A1', 'A2'].includes(level) ? 'bg-emerald-500 text-white border-emerald-800' :
                            ['B1', 'B2'].includes(level) ? 'bg-amber-500 text-amber-950 border-amber-800' :
                            'bg-red-600 text-white border-red-900'
                          }`}>
                            {level}: {count}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl border-2 border-blue-400 bg-white shadow-sm">
                    <div className="text-[10px] font-extrabold text-blue-900 mb-1.5">Phân bố loại từ</div>
                    <div className="flex flex-wrap gap-1">
                      {['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'pronoun', 'interjection'].map(pos => {
                        const count = vocabularies.filter(v => v.part_of_speech === pos).length;
                        if (count === 0) return null;
                        const label = pos === 'noun' ? 'D.từ' : pos === 'verb' ? 'Đ.từ' : pos === 'adjective' ? 'T.từ' : pos === 'adverb' ? 'Tr.từ' : pos === 'preposition' ? 'G.từ' : pos === 'conjunction' ? 'L.từ' : pos === 'pronoun' ? 'Đ.từ' : 'Th.từ';
                        return (
                          <span key={pos} className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-600 text-white border border-blue-900">
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

          {/* Right: Settings — indigo/amber card */}
          <div className="rounded-2xl border-[3px] border-indigo-500 bg-gradient-to-br from-indigo-100 to-violet-200 shadow-xl ring-2 ring-indigo-300/60 p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3 mb-2.5">
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs shadow">⚙️</span>
                  Chế độ bài test
                </h2>
                <p className="text-xs text-indigo-900 font-bold mt-0.5">Chọn 1 chế độ. Hệ thống sẽ lưu lại cho lần sau.</p>
              </div>
              <span className="hidden sm:inline-flex items-center rounded-full border-2 border-indigo-700 bg-indigo-600 px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow">
                {selectedMode.title}
              </span>
            </div>

            {/* Mode picker */}
            <div className="grid grid-cols-3 sm:grid-cols-2 gap-2 items-stretch auto-rows-fr mb-3">
              {modes.map((m) => {
                const active = mode === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => {
                      setMode(m.value);
                      localStorage.setItem(`vocab_settings_${testId}`, JSON.stringify({ ...effective, mode: m.value }));
                    }}
                    className={`h-full min-h-[80px] sm:min-h-[100px] text-left rounded-xl p-2 sm:p-2.5 transition flex flex-col shadow-md border-[3px] ${
                      active
                        ? 'border-indigo-600 bg-white ring-2 ring-indigo-300 shadow-lg'
                        : 'border-white/70 bg-white/60 hover:bg-white hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className={`inline-flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-gradient-to-br ${m.accent} text-white shadow-md`}>
                        {m.icon}
                      </div>
                      <div className={`h-4 w-4 sm:h-5 sm:w-5 rounded-full border-2 flex items-center justify-center shadow-sm shrink-0 ${
                        active ? 'border-indigo-600 bg-indigo-600' : 'border-indigo-300 bg-white'
                      }`}>
                        {active && <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-white" />}
                      </div>
                    </div>
                    <div className="mt-1.5 flex-1">
                      <div className="font-extrabold text-slate-900 text-[11px] sm:text-xs leading-tight">{m.title}</div>
                      <div className="hidden sm:block mt-0.5 text-[10px] text-slate-700 leading-snug font-semibold">{m.desc}</div>
                    </div>
                    <div className="mt-1.5">
                      <span className={`inline-flex items-center gap-1 rounded-full px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-extrabold border ${
                        active ? 'bg-indigo-600 text-white border-indigo-900' : 'bg-white/80 text-indigo-700 border-indigo-300'
                      }`}>
                        {active ? '✓ Chọn' : 'Chọn'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Shuffle setting */}
            <div className="p-3 rounded-xl border-[3px] border-amber-500 bg-amber-100 shadow-md">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shuffleQuestions}
                  onChange={(e) => {
                    setShuffleQuestions(e.target.checked);
                    localStorage.setItem(`vocab_settings_${testId}`, JSON.stringify({ ...effective, shuffleQuestions: e.target.checked }));
                  }}
                  className="w-4 h-4 accent-amber-600 rounded border-amber-400"
                />
                <div>
                  <div className="text-xs font-extrabold text-slate-900">Đảo thứ tự câu hỏi</div>
                  <div className="text-[10px] text-amber-900 font-bold">Trộn ngẫu nhiên thứ tự các từ vựng trong bài test.</div>
                </div>
              </label>
            </div>

            <div className="mt-3 space-y-2">
              <button
                onClick={() => setShowPreviewModal(true)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border-[3px] border-fuchsia-700 bg-fuchsia-500 px-3 py-2 text-xs font-extrabold text-white shadow-lg hover:bg-fuchsia-400"
              >
                👁️ Xem trước từ vựng
              </button>

              <button
                onClick={handleStartTest}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 via-red-600 to-rose-700 px-3 py-2.5 text-sm font-extrabold text-white shadow-lg border-[3px] border-red-900 hover:brightness-110"
              >
                Bắt đầu bài test →
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

function InfoLine({ icon, label, value, className = "" }) {
  return (
    <div className={`flex items-center justify-between gap-2 rounded-lg border-2 border-purple-300 bg-white px-2 py-1.5 shadow-sm ${className}`}>
      <div className="flex items-center gap-1.5 text-xs min-w-0">
        <span className="text-sm shrink-0">{icon}</span>
        <span className="text-purple-800 font-bold truncate">{label}</span>
      </div>
      <div className="text-xs font-extrabold text-slate-900 truncate text-right ml-2 max-w-[55%]">{value}</div>
    </div>
  );
}

export default VocabularyTestSettings;
