// src/pages/VocabularyTestResult.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { VocabularyLayout } from '../layout/TestLayout';
import testResultService from '../services/testResultService';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const DEFAULT_TIME_PER_QUESTION = 30;

const scoreTone = (pct) => {
  if (pct >= 90) return { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', bar: 'bg-emerald-600' };
  if (pct >= 75) return { badge: 'bg-blue-50 text-blue-700 border-blue-200', bar: 'bg-blue-600' };
  if (pct >= 50) return { badge: 'bg-amber-50 text-amber-800 border-amber-200', bar: 'bg-amber-600' };
  return { badge: 'bg-rose-50 text-rose-700 border-rose-200', bar: 'bg-rose-600' };
};

const fmtDate = (d) => {
  try {
    return new Date(d).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '';
  }
};

const safeNum = (v, fallback = 0) => (Number.isFinite(v) ? v : fallback);

const modeLabel = (m) => {
  if (m === 'word_to_meaning') return 'Từ → Nghĩa';
  if (m === 'meaning_to_word') return 'Nghĩa → Từ';
  if (m === 'listen_and_type') return 'Nghe & Viết';
  return 'Từ vựng';
};

const questionTitle = (settingsMode, q) => {
  if (!q) return '';
  if (settingsMode === 'word_to_meaning') return `Từ: ${q.word}`;
  if (settingsMode === 'meaning_to_word') return `Nghĩa: ${q.meaning}`;
  if (settingsMode === 'listen_and_type') return `Nghe & viết: ${q.word}`;
  return q.word || q.meaning || '';
};

const correctAnswerText = (settingsMode, q) => {
  if (!q) return '';
  if (settingsMode === 'word_to_meaning') return q.meaning || '';
  return q.word || '';
};

const VocabularyTestResult = () => {
  const { testId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { answers = [], settings = {}, testInfo = {}, draftResultId = null } = location.state || {};

  console.log('VocabularyTestResult initialized with:', { answers: answers.length, settings, testInfo, draftResultId });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [testResultId, setTestResultId] = useState(draftResultId);
  const [isSaved, setIsSaved] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // UI
  const [tab, setTab] = useState('all'); // all | wrong | correct
  const [q, setQ] = useState('');
  const [expanded, setExpanded] = useState(() => new Set()); // index set

  const totalQuestions = answers.length;
  const correctAnswers = answers.filter((a) => a?.isCorrect).length;
  const wrongAnswers = Math.max(0, totalQuestions - correctAnswers);
  const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

  const tone = useMemo(() => scoreTone(percentage), [percentage]);

  const totalDurationMs = useMemo(() => {
    // answers.timeSpent đang là seconds
    const ms = answers.reduce((sum, a) => sum + safeNum(a?.timeSpent, 0) * 1000, 0);
    return ms;
  }, [answers]);

  const createdAt = useMemo(() => new Date().toISOString(), []); // trang này thường hiển thị ngay sau khi làm
  const durationSec = Math.round(totalDurationMs / 1000);

  // Auto-create draft nếu chưa có draftResultId
  useEffect(() => {
    if (answers.length > 0 && user && !draftResultId && !testResultId) {
      saveDraftResult();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, user, draftResultId]);

  const saveDraftResult = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const mode = settings?.mode || 'word_to_meaning';

      // Create test_snapshot for new BE format
      const testSnapshot = {
        test_id: testId,
        test_title: testInfo?.test_title || 'Vocabulary Test',
        main_topic: testInfo?.main_topic || 'Vocabulary',
        sub_topic: testInfo?.sub_topic || '',
        test_type: 'vocabulary',
        difficulty: testInfo?.difficulty || 'medium',
      };

      const formattedAnswers = answers.map((answer) => ({
        question_id: answer?.question?._id,
        question_collection: 'vocabularies',
        // BE yêu cầu đầy đủ các trường vocabulary
        word: answer?.question?.word || '',
        meaning: answer?.question?.meaning || '',
        example_sentence: answer?.question?.example_sentence || answer?.question?.example || '',
        question_mode: mode,
        correct_answer: correctAnswerText(mode, answer?.question),
        user_answer: answer?.userAnswer || '',
        is_correct: !!answer?.isCorrect,
      }));

      const resultData = {
        test_id: testId,
        test_snapshot: testSnapshot,
        duration_ms: totalDurationMs,
        start_time: new Date(Date.now() - totalDurationMs),
        end_time: new Date(),
        answers: formattedAnswers,
        status: 'draft',
      };

      console.log('Creating draft result with payload:', resultData);
      const res = await testResultService.createTestResult(resultData);
      console.log('Draft result response:', res);
      const id = res?._id || res?.id;
      if (id) setTestResultId(id);

      localStorage.setItem(
        `vocab_result_${testId}`,
        JSON.stringify({
          ...resultData,
          resultId: id,
          testInfo,
          settings,
        })
      );
    } catch (err) {
      console.error('Error saving draft result:', err);
      setError('Có lỗi xảy ra khi lưu kết quả tạm thời.');
    } finally {
      setLoading(false);
    }
  };

  const saveResult = async () => {
    const id = testResultId || draftResultId;
    console.log('saveResult called with:', { id, testResultId, draftResultId });
    if (!id) {
      console.error('No result ID found for saving');
      setError('Không tìm thấy kết quả để lưu.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('Updating status for result ID:', id);
      // ✅ dùng service mới (đúng với file service bạn gửi): updateStatusById
      const updateResult = await testResultService.updateStatusById(id, 'active');
      console.log('Status update result:', updateResult);
      setIsSaved(true);
      setTestResultId(id);

      const savedData = JSON.parse(localStorage.getItem(`vocab_result_${testId}`) || '{}');
      localStorage.setItem(
        `vocab_result_${testId}`,
        JSON.stringify({
          ...savedData,
          status: 'active',
          saved: true,
        })
      );
    } catch (err) {
      console.error('Error saving result:', err);
      const errorMsg = err?.message || 'Có lỗi xảy ra khi lưu kết quả.';
      setError(`Lỗi lưu kết quả: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const playAudio = (text) => {
    if (isPlaying || !text) return;
    setIsPlaying(true);

    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.9;

    u.onend = () => setIsPlaying(false);
    u.onerror = () => setIsPlaying(false);

    speechSynthesis.speak(u);
  };

  const toggleExpand = (idx) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const expandAllWrong = () => {
    setExpanded(() => {
      const s = new Set();
      answers.forEach((a, idx) => {
        if (!a?.isCorrect) s.add(idx);
      });
      return s;
    });
  };

  const filtered = useMemo(() => {
    const text = (q || '').trim().toLowerCase();
    const mode = settings?.mode || 'word_to_meaning';

    return answers
      .map((a, idx) => ({ a, idx }))
      .filter(({ a }) => {
        if (tab === 'wrong' && a?.isCorrect) return false;
        if (tab === 'correct' && !a?.isCorrect) return false;

        if (!text) return true;

        const qt = questionTitle(mode, a?.question);
        const ca = correctAnswerText(mode, a?.question);
        const ua = a?.userAnswer || '';
        return `${qt} ${ua} ${ca}`.toLowerCase().includes(text);
      });
  }, [answers, q, tab, settings?.mode]);

  if (!answers.length) {
    return (
      <VocabularyLayout>
        <ErrorMessage error="Không tìm thấy kết quả bài test." onRetry={() => navigate(-1)} />
      </VocabularyLayout>
    );
  }

  const mode = settings?.mode || 'word_to_meaning';

  return (
    <VocabularyLayout>
      <div className="max-w-5xl mx-auto px-2 sm:px-3 py-2 sm:py-3">
          {/* Top bar */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                Kết quả
              </div>

              <h1 className="mt-2 text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight truncate">
                {testInfo?.test_title || 'Bài test từ vựng'}
              </h1>

              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold">
                  🎯 {modeLabel(mode)}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold">
                  ⏱️ {durationSec ? `${durationSec}s` : `${DEFAULT_TIME_PER_QUESTION}s/câu`}
                </span>
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-semibold ${isSaved ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-700'
                    }`}
                >
                  {isSaved ? '✅ Đã lưu' : '📝 Nháp'}
                </span>
              </div>
            </div>

            <button
              onClick={() => navigate(-2)}
              className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-slate-600 to-slate-700 px-3 py-2 text-sm font-semibold text-white shadow-md hover:from-slate-700 hover:to-slate-800 transition-all"
            >
              ← Danh sách
            </button>
          </div>

          {/* Summary + actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Score card */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-extrabold">
                      {percentage}%
                    </div>
                    <div>
                      <div className="text-sm font-extrabold text-slate-900">
                        Đúng {correctAnswers}/{totalQuestions} câu
                      </div>
                      <div className="text-xs text-slate-600">Sai {wrongAnswers} • Tổng {totalQuestions}</div>
                    </div>
                  </div>

                  <span className={`hidden sm:inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${tone.badge}`}>
                    {percentage >= 90 ? 'Xuất sắc' : percentage >= 75 ? 'Tốt' : percentage >= 50 ? 'Khá' : 'Cần cố gắng'}
                  </span>
                </div>

                <div className="mt-4">
                  <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div className={`h-full ${tone.bar}`} style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }} />
                  </div>

                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <MiniStat label="Tổng" value={totalQuestions} tone="text-slate-900" />
                    <MiniStat label="Đúng" value={correctAnswers} tone="text-emerald-700" />
                    <MiniStat label="Sai" value={wrongAnswers} tone="text-rose-700" />
                  </div>
                </div>

                {/* Buttons */}
                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => {
                      setTab('wrong');
                      expandAllWrong();
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                  >
                    ❌ Xem câu sai
                  </button>

                  {!isSaved ? (
                    <button
                      onClick={saveResult}
                      disabled={loading}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {loading ? 'Đang lưu…' : '💾 Lưu kết quả'}
                    </button>
                  ) : (
                    <div className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                      ✅ Đã lưu kết quả
                    </div>
                  )}
                </div>

                {error && (
                  <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                    {error}
                  </div>
                )}
              </div>
            </div>

            {/* Filters + quick actions */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 sm:p-5">
              <div className="text-sm font-extrabold text-slate-900">Bộ lọc</div>

              <div className="mt-3 flex gap-2">
                <TabButton active={tab === 'all'} onClick={() => setTab('all')} tone="blue">Tất cả</TabButton>
                <TabButton active={tab === 'wrong'} onClick={() => setTab('wrong')} tone="rose">Sai</TabButton>
                <TabButton active={tab === 'correct'} onClick={() => setTab('correct')} tone="emerald">Đúng</TabButton>
              </div>

              <div className="mt-3">
                <div className="text-xs font-semibold text-slate-600 mb-1">Tìm nhanh</div>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Nhập từ/đáp án..."
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white"
                />
                <div className="mt-2 text-[11px] text-slate-600">
                  Hiển thị: <b>{filtered.length}</b> / {answers.length}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => navigate(`/vocabulary/test/${testId}/settings`)}
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2 text-xs font-extrabold text-white hover:from-blue-700 hover:to-indigo-700 transition-all"
                >
                  🔄 Làm lại
                </button>
                <button
                  onClick={() => navigate(`/test/${testInfo?.main_topic}/${testInfo?.sub_topic}?type=vocabulary`)}
                  className="rounded-xl bg-gradient-to-r from-slate-600 to-slate-700 px-3 py-2 text-xs font-extrabold text-white hover:from-slate-700 hover:to-slate-800 transition-all"
                >
                  📚 Về DS
                </button>
              </div>

              <div className="mt-4 text-[11px] text-slate-500">
                📅 {fmtDate(createdAt)}
              </div>
            </div>
          </div>

          {/* List */}
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-4 sm:px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900">Chi tiết</h2>
              <div className="text-xs text-slate-600 font-semibold">Chạm để mở</div>
            </div>

            <div className="divide-y divide-slate-100">
              {filtered.map(({ a, idx }) => {
                const open = expanded.has(idx);
                const isCorrect = !!a?.isCorrect;
                const qTitle = questionTitle(mode, a?.question);

                const ua = a?.userAnswer || '';
                const ca = correctAnswerText(mode, a?.question);

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleExpand(idx)}
                    className="w-full text-left px-4 sm:px-5 py-3 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`mt-0.5 h-9 w-9 rounded-xl flex items-center justify-center text-white font-extrabold shrink-0 ${isCorrect ? 'bg-emerald-600' : 'bg-rose-600'
                            }`}
                        >
                          {idx + 1}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="font-extrabold text-slate-900 truncate">{qTitle}</div>
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${isCorrect
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                  : 'border-rose-200 bg-rose-50 text-rose-700'
                                }`}
                            >
                              {isCorrect ? '✓ Đúng' : '✗ Sai'}
                            </span>
                          </div>

                          <div className="mt-1 text-xs text-slate-600 truncate">
                            <span className="font-semibold">Bạn:</span> {ua ? ua : '(Không trả lời)'}
                            {!isCorrect && ca ? (
                              <>
                                <span className="mx-2 text-slate-300">•</span>
                                <span className="font-semibold">Đúng:</span> {ca}
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-slate-400">
                        <svg className={`w-5 h-5 transition ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {open && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <AnswerBox label="Câu trả lời của bạn" value={ua} tone={isCorrect ? 'emerald' : 'rose'} />
                        {!isCorrect ? (
                          <AnswerBox label="Đáp án đúng" value={ca} tone="emerald" />
                        ) : (
                          <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <div className="text-xs font-semibold text-slate-600">Thời gian</div>
                            <div className="mt-1 text-sm font-bold text-slate-900">
                              {safeNum(a?.timeSpent, 0)}s
                            </div>
                          </div>
                        )}

                        {/* Audio row */}
                        <div className="sm:col-span-2">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                playAudio(a?.question?.word);
                              }}
                              disabled={isPlaying || !a?.question?.word}
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                            >
                              🔊 Nghe từ
                            </button>

                            {!!a?.question?.example_sentence && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  playAudio(a?.question?.example_sentence);
                                }}
                                disabled={isPlaying}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                              >
                                🔊 Nghe câu
                              </button>
                            )}

                            <span className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-extrabold text-white">
                              ⏱️ {safeNum(a?.timeSpent, 0)}s
                            </span>
                          </div>

                          {!!a?.question?.example_sentence && (
                            <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                              <div className="text-xs font-semibold text-slate-600">Câu ví dụ</div>
                              <div className="mt-1 text-sm font-semibold text-slate-900 italic break-words">
                                “{a.question.example_sentence}”
                              </div>
                            </div>
                          )}                          
                          {/* New fields display */}
                          {(a?.question?.part_of_speech || a?.question?.cefr_level) && (
                            <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                              <div className="text-xs font-semibold text-slate-600 mb-2">Thông tin từ vựng</div>
                              <div className="flex flex-wrap gap-2">
                                {a?.question?.part_of_speech && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {a.question.part_of_speech === 'noun' ? 'Danh từ' :
                                     a.question.part_of_speech === 'verb' ? 'Động từ' :
                                     a.question.part_of_speech === 'adjective' ? 'Tính từ' :
                                     a.question.part_of_speech === 'adverb' ? 'Trạng từ' :
                                     a.question.part_of_speech === 'preposition' ? 'Giới từ' :
                                     a.question.part_of_speech === 'conjunction' ? 'Liên từ' :
                                     a.question.part_of_speech === 'pronoun' ? 'Đại từ' :
                                     a.question.part_of_speech === 'interjection' ? 'Thán từ' :
                                     a.question.part_of_speech}
                                  </span>
                                )}
                                {a?.question?.cefr_level && (
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    ['A1', 'A2'].includes(a.question.cefr_level) ? 'bg-green-100 text-green-800' :
                                    ['B1', 'B2'].includes(a.question.cefr_level) ? 'bg-yellow-100 text-yellow-800' :
                                    ['C1', 'C2'].includes(a.question.cefr_level) ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    CEFR {a.question.cefr_level}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}                        </div>
                      </div>
                    )}
                  </button>
                );
              })}

              {filtered.length === 0 && (
                <div className="px-4 sm:px-5 py-10 text-center">
                  <div className="text-sm font-extrabold text-slate-900">Không có kết quả phù hợp</div>
                  <div className="mt-1 text-xs text-slate-600">Thử đổi bộ lọc hoặc xoá từ khoá tìm kiếm.</div>
                </div>
              )}
            </div>
          </div>

          <div className="h-2" />

          {/* Overlay loading */}
          {loading && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="w-full max-w-sm px-3">
                <div className="rounded-2xl border border-slate-200 bg-white shadow-xl p-4">
                  <LoadingSpinner message="Đang xử lý..." />
                </div>
              </div>
            </div>
          )}
        </div>
    </VocabularyLayout>
  );
};

function MiniStat({ label, value, tone }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
      <div className={`text-lg font-extrabold ${tone}`}>{value}</div>
      <div className="text-[11px] font-semibold text-slate-600">{label}</div>
    </div>
  );
}

function TabButton({ active, onClick, children, tone = 'slate' }) {
  const getToneClasses = (t) => {
    if (t === 'blue') return { active: 'bg-blue-600 text-white border-blue-600', inactive: 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50' };
    if (t === 'rose') return { active: 'bg-rose-600 text-white border-rose-600', inactive: 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50' };
    if (t === 'emerald') return { active: 'bg-emerald-600 text-white border-emerald-600', inactive: 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50' };
    return { active: 'bg-slate-900 text-white border-slate-900', inactive: 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50' };
  };

  const classes = getToneClasses(tone);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-xl px-3 py-2 text-xs font-extrabold border transition ${active ? classes.active : classes.inactive}`}
    >
      {children}
    </button>
  );
}

function AnswerBox({ label, value, tone = 'slate' }) {
  const toneCls =
    tone === 'emerald'
      ? 'border-emerald-200 bg-emerald-50'
      : tone === 'rose'
        ? 'border-rose-200 bg-rose-50'
        : 'border-slate-200 bg-white';

  return (
    <div className={`rounded-xl border p-3 ${toneCls}`}>
      <div className="text-xs font-semibold text-slate-600">{label}</div>
      <div className="mt-1 text-sm font-bold text-slate-900 break-words">
        {value ? value : <span className="text-slate-500 font-semibold">(Không trả lời)</span>}
      </div>
    </div>
  );
}

export default VocabularyTestResult;
