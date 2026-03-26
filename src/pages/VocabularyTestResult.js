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
  if (pct >= 90) return { badge: 'bg-emerald-600 text-white border-emerald-900', bar: 'bg-emerald-600', ring: '#059669' };
  if (pct >= 75) return { badge: 'bg-blue-600 text-white border-blue-900', bar: 'bg-blue-600', ring: '#2563eb' };
  if (pct >= 50) return { badge: 'bg-amber-500 text-amber-950 border-amber-800', bar: 'bg-amber-500', ring: '#f59e0b' };
  return { badge: 'bg-rose-600 text-white border-rose-900', bar: 'bg-rose-600', ring: '#e11d48' };
};

const fmtDate = (d) => {
  try {
    return new Date(d).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return ''; }
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

  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [expanded, setExpanded] = useState(() => new Set());

  const totalQuestions = answers.length;
  const correctAnswers = answers.filter((a) => a?.isCorrect).length;
  const wrongAnswers = Math.max(0, totalQuestions - correctAnswers);
  const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
  const tone = useMemo(() => scoreTone(percentage), [percentage]);

  const totalDurationMs = useMemo(() => {
    const ms = answers.reduce((sum, a) => sum + safeNum(a?.timeSpent, 0) * 1000, 0);
    return ms;
  }, [answers]);

  const createdAt = useMemo(() => new Date().toISOString(), []);
  const durationSec = Math.round(totalDurationMs / 1000);

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
      const testSnapshot = {
        test_id: testId, test_title: testInfo?.test_title || 'Vocabulary Test',
        main_topic: testInfo?.main_topic || 'Vocabulary', sub_topic: testInfo?.sub_topic || '',
        test_type: 'vocabulary', difficulty: testInfo?.difficulty || 'medium',
      };
      const formattedAnswers = answers.map((answer) => ({
        question_id: answer?.question?._id, question_collection: 'vocabularies',
        word: answer?.question?.word || '', meaning: answer?.question?.meaning || '',
        example_sentence: answer?.question?.example_sentence || answer?.question?.example || '',
        question_mode: mode, correct_answer: correctAnswerText(mode, answer?.question),
        user_answer: answer?.userAnswer || '', is_correct: !!answer?.isCorrect,
      }));
      const resultData = {
        test_id: testId, test_snapshot: testSnapshot, duration_ms: totalDurationMs,
        start_time: new Date(Date.now() - totalDurationMs), end_time: new Date(),
        answers: formattedAnswers, status: 'draft',
      };
      console.log('Creating draft result with payload:', resultData);
      const res = await testResultService.createTestResult(resultData);
      console.log('Draft result response:', res);
      const id = res?._id || res?.id;
      if (id) setTestResultId(id);
      localStorage.setItem(`vocab_result_${testId}`, JSON.stringify({ ...resultData, resultId: id, testInfo, settings }));
    } catch (err) {
      console.error('Error saving draft result:', err);
      setError('Có lỗi xảy ra khi lưu kết quả tạm thời.');
    } finally { setLoading(false); }
  };

  const saveResult = async () => {
    const id = testResultId || draftResultId;
    console.log('saveResult called with:', { id, testResultId, draftResultId });
    if (!id) { console.error('No result ID found for saving'); setError('Không tìm thấy kết quả để lưu.'); return; }
    try {
      setLoading(true);
      setError(null);
      console.log('Updating status for result ID:', id);
      const updateResult = await testResultService.updateStatusById(id, 'active');
      console.log('Status update result:', updateResult);
      setIsSaved(true);
      setTestResultId(id);
      const savedData = JSON.parse(localStorage.getItem(`vocab_result_${testId}`) || '{}');
      localStorage.setItem(`vocab_result_${testId}`, JSON.stringify({ ...savedData, status: 'active', saved: true }));
    } catch (err) {
      console.error('Error saving result:', err);
      setError(`Lỗi lưu kết quả: ${err?.message || 'Có lỗi xảy ra khi lưu kết quả.'}`);
    } finally { setLoading(false); }
  };

  const playAudio = (text) => {
    if (isPlaying || !text) return;
    setIsPlaying(true);
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US'; u.rate = 0.9;
    u.onend = () => setIsPlaying(false);
    u.onerror = () => setIsPlaying(false);
    speechSynthesis.speak(u);
  };

  const toggleExpand = (idx) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const expandAllWrong = () => {
    setExpanded(() => {
      const s = new Set();
      answers.forEach((a, idx) => { if (!a?.isCorrect) s.add(idx); });
      return s;
    });
  };

  const filtered = useMemo(() => {
    const text = (q || '').trim().toLowerCase();
    const mode = settings?.mode || 'word_to_meaning';
    return answers.map((a, idx) => ({ a, idx })).filter(({ a }) => {
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
      <div className="max-w-5xl mx-auto" style={{ background: "linear-gradient(to bottom right, #bae6fd, #dbeafe, #d1fae5)", borderRadius: "1rem", padding: "0.75rem" }}>

        {/* Top bar */}
        <div className="mb-2 flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-violet-800 bg-violet-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-md">
              <span className="inline-flex h-2 w-2 rounded-full bg-lime-400" />
              Kết quả
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-sky-800 bg-sky-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-md">
              🎯 {modeLabel(mode)}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border-2 border-emerald-800 bg-emerald-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-md">
              ⏱️ {durationSec ? `${durationSec}s` : `${DEFAULT_TIME_PER_QUESTION}s/câu`}
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-full border-2 px-2.5 py-0.5 text-[11px] font-bold shadow-md ${isSaved ? 'bg-lime-500 border-lime-700 text-lime-950' : 'bg-amber-500 border-amber-800 text-amber-950'}`}>
              {isSaved ? '✅ Đã lưu' : '📝 Nháp'}
            </span>
          </div>
          <button onClick={() => navigate(-2)}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border-[3px] border-teal-800 bg-teal-600 px-3 py-1.5 text-xs sm:text-sm font-extrabold text-white shadow-lg hover:bg-teal-500">
            ← Danh sách
          </button>
        </div>

        <div className="mb-2">
          <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight line-clamp-2">
            {testInfo?.test_title || 'Bài test từ vựng'}
          </h1>
        </div>

        {/* Summary + actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Score card — fuchsia */}
          <div className="lg:col-span-2 rounded-2xl border-[3px] border-fuchsia-500 bg-gradient-to-br from-fuchsia-100 to-purple-200 shadow-xl ring-2 ring-fuchsia-300/60 p-3 sm:p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0">
                <div className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(${tone.ring} ${percentage * 3.6}deg, #c4b5fd 0deg)` }} />
                <div className="absolute inset-[5px] sm:inset-[6px] rounded-full bg-white flex items-center justify-center shadow-md">
                  <span className="text-sm font-extrabold text-slate-900">{percentage}%</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="text-sm font-extrabold text-slate-900">Đúng {correctAnswers}/{totalQuestions} câu</div>
                  <span className={`inline-flex items-center rounded-full border-2 px-2.5 py-0.5 text-xs font-extrabold shadow-md ${tone.badge}`}>
                    {percentage >= 90 ? 'Xuất sắc!' : percentage >= 75 ? 'Rất tốt!' : percentage >= 50 ? 'Khá ổn' : 'Cần cố gắng'}
                  </span>
                </div>
                <div className="text-xs text-fuchsia-900 font-bold mt-0.5">Sai {wrongAnswers} • Tổng {totalQuestions}</div>
                <div className="mt-2 grid grid-cols-3 gap-1.5 sm:gap-2 max-w-xs">
                  <MiniStat label="Tổng" value={totalQuestions} tone="indigo" />
                  <MiniStat label="Đúng" value={correctAnswers} tone="emerald" />
                  <MiniStat label="Sai" value={wrongAnswers} tone="rose" />
                </div>
              </div>
            </div>

            <div className="mt-3">
              <div className="h-2 rounded-full bg-purple-200 overflow-hidden">
                <div className={`h-full ${tone.bar} rounded-full transition-all`} style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }} />
              </div>
            </div>

            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <button onClick={() => { setTab('wrong'); expandAllWrong(); }}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 border-[3px] border-rose-900 px-3 py-2 text-xs sm:text-sm font-extrabold text-white hover:bg-rose-500 shadow-lg">
                ❌ Xem câu sai
              </button>
              {!isSaved ? (
                <button onClick={saveResult} disabled={loading}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 border-[3px] border-emerald-900 px-3 py-2 text-xs sm:text-sm font-extrabold text-white hover:bg-emerald-500 shadow-lg disabled:opacity-60">
                  {loading ? 'Đang lưu…' : '💾 Lưu kết quả'}
                </button>
              ) : (
                <div className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border-[3px] border-emerald-700 bg-emerald-500 px-3 py-2 text-xs sm:text-sm font-extrabold text-emerald-950 shadow">
                  ✅ Đã lưu kết quả
                </div>
              )}
            </div>

            {error && (
              <div className="mt-3 rounded-xl border-2 border-rose-600 bg-rose-100 px-3 py-2 text-sm font-extrabold text-rose-900">{error}</div>
            )}
          </div>

          {/* Filters + actions — indigo/amber */}
          <div className="rounded-2xl border-[3px] border-indigo-500 bg-gradient-to-br from-indigo-100 to-violet-200 shadow-xl ring-2 ring-indigo-300/60 p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="text-sm font-extrabold text-slate-900">Bộ lọc</div>
              <div className="text-[10px] text-indigo-900 font-bold bg-white/60 rounded-full px-2 py-0.5 border border-indigo-300">
                {filtered.length}/{answers.length}
              </div>
            </div>
            <div className="flex gap-1.5">
              <TabButton active={tab === 'all'} onClick={() => setTab('all')} tone="blue">Tất cả</TabButton>
              <TabButton active={tab === 'wrong'} onClick={() => setTab('wrong')} tone="rose">Sai</TabButton>
              <TabButton active={tab === 'correct'} onClick={() => setTab('correct')} tone="emerald">Đúng</TabButton>
            </div>

            <div className="mt-2.5">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm từ / đáp án..."
                className="w-full rounded-xl border-2 border-indigo-400 bg-white px-3 py-1.5 text-sm font-semibold outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-300" />
            </div>

            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <button onClick={() => navigate(`/vocabulary/test/${testId}/settings`)}
                className="rounded-xl bg-blue-700 border-[3px] border-blue-900 px-3 py-2 text-xs font-extrabold text-white hover:bg-blue-600 shadow-lg">
                🔄 Làm lại
              </button>
              <button onClick={() => navigate(`/test/${testInfo?.main_topic}/${testInfo?.sub_topic}?type=vocabulary`)}
                className="rounded-xl border-[3px] border-teal-800 bg-teal-600 px-3 py-2 text-xs font-extrabold text-white hover:bg-teal-500 shadow-lg">
                📚 Về DS
              </button>
            </div>

            <div className="mt-2.5 rounded-lg bg-cyan-300 border-2 border-cyan-700 px-2 py-1.5 text-center">
              <div className="text-[10px] text-cyan-950 font-extrabold">📅 {fmtDate(createdAt)}</div>
            </div>
          </div>
        </div>

        {/* Detail list */}
        <div className="mt-3 rounded-2xl border-[3px] border-indigo-400 bg-white shadow-xl overflow-hidden ring-2 ring-indigo-200/60">
          <div className="px-4 py-3 bg-gradient-to-r from-indigo-600 to-violet-700 flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-white">Chi tiết từng câu</h2>
            <div className="text-xs text-indigo-200 font-bold">Chạm để mở rộng</div>
          </div>

          <div className="divide-y divide-indigo-100">
            {filtered.map(({ a, idx }) => {
              const open = expanded.has(idx);
              const isCorrect = !!a?.isCorrect;
              const qTitle = questionTitle(mode, a?.question);
              const ua = a?.userAnswer || '';
              const ca = correctAnswerText(mode, a?.question);

              return (
                <button key={idx} type="button" onClick={() => toggleExpand(idx)}
                  className="w-full text-left px-3 sm:px-4 py-2.5 hover:bg-indigo-50 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                      <div className={`mt-0.5 h-7 w-7 sm:h-9 sm:w-9 rounded-xl flex items-center justify-center text-white font-extrabold shrink-0 border-2 text-xs sm:text-sm ${isCorrect ? 'bg-emerald-500 border-emerald-800' : 'bg-rose-500 border-rose-800'}`}>
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <div className="font-extrabold text-sm text-slate-900 truncate max-w-[180px] sm:max-w-none">{qTitle}</div>
                          <span className={`inline-flex items-center rounded-full border-2 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-extrabold ${isCorrect ? 'border-emerald-700 bg-emerald-500 text-white' : 'border-rose-700 bg-rose-500 text-white'}`}>
                            {isCorrect ? '✓ Đúng' : '✗ Sai'}
                          </span>
                        </div>
                        <div className="mt-0.5 text-xs text-slate-700 font-semibold line-clamp-1">
                          Bạn: {ua || '(Không trả lời)'}
                          {!isCorrect && ca && <span className="ml-1.5 text-indigo-700 font-extrabold">→ {ca}</span>}
                        </div>
                      </div>
                    </div>
                    <svg className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-indigo-400 transition ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {open && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <AnswerBox label="Câu trả lời của bạn" value={ua} tone={isCorrect ? 'emerald' : 'rose'} />
                      {!isCorrect ? (
                        <AnswerBox label="Đáp án đúng" value={ca} tone="emerald" />
                      ) : (
                        <div className="rounded-xl border-2 border-indigo-300 bg-indigo-50 p-3">
                          <div className="text-xs font-extrabold text-indigo-800">Thời gian</div>
                          <div className="mt-1 text-sm font-extrabold text-indigo-900">{safeNum(a?.timeSpent, 0)}s</div>
                        </div>
                      )}

                      <div className="sm:col-span-2">
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={(e) => { e.stopPropagation(); playAudio(a?.question?.word); }}
                            disabled={isPlaying || !a?.question?.word}
                            className="inline-flex items-center gap-2 rounded-xl border-2 border-violet-700 bg-violet-600 px-3 py-2 text-xs font-extrabold text-white hover:bg-violet-500 shadow disabled:opacity-60">
                            🔊 Nghe từ
                          </button>
                          {!!a?.question?.example_sentence && (
                            <button type="button" onClick={(e) => { e.stopPropagation(); playAudio(a?.question?.example_sentence); }}
                              disabled={isPlaying}
                              className="inline-flex items-center gap-2 rounded-xl border-2 border-blue-700 bg-blue-600 px-3 py-2 text-xs font-extrabold text-white hover:bg-blue-500 shadow disabled:opacity-60">
                              🔊 Nghe câu
                            </button>
                          )}
                          <span className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 border-2 border-indigo-900 px-3 py-2 text-xs font-extrabold text-white">
                            ⏱️ {safeNum(a?.timeSpent, 0)}s
                          </span>
                        </div>

                        {!!a?.question?.example_sentence && (
                          <div className="mt-2 rounded-xl border-2 border-sky-400 bg-sky-50 p-3">
                            <div className="text-xs font-extrabold text-sky-800">Câu ví dụ</div>
                            <div className="mt-1 text-sm font-semibold text-slate-900 italic break-words">"{a.question.example_sentence}"</div>
                          </div>
                        )}

                        {(a?.question?.part_of_speech || a?.question?.cefr_level) && (
                          <div className="mt-2 rounded-xl border-2 border-indigo-300 bg-indigo-50 p-3">
                            <div className="text-xs font-extrabold text-indigo-800 mb-2">Thông tin từ vựng</div>
                            <div className="flex flex-wrap gap-1.5">
                              {a?.question?.part_of_speech && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-600 text-white border border-blue-900">
                                  {a.question.part_of_speech === 'noun' ? 'Danh từ' : a.question.part_of_speech === 'verb' ? 'Động từ' : a.question.part_of_speech === 'adjective' ? 'Tính từ' : a.question.part_of_speech === 'adverb' ? 'Trạng từ' : a.question.part_of_speech === 'preposition' ? 'Giới từ' : a.question.part_of_speech === 'conjunction' ? 'Liên từ' : a.question.part_of_speech === 'pronoun' ? 'Đại từ' : 'Thán từ'}
                                </span>
                              )}
                              {a?.question?.cefr_level && (
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${['A1', 'A2'].includes(a.question.cefr_level) ? 'bg-emerald-500 text-white border-emerald-800' : ['B1', 'B2'].includes(a.question.cefr_level) ? 'bg-amber-500 text-amber-950 border-amber-800' : 'bg-red-600 text-white border-red-900'}`}>
                                  CEFR {a.question.cefr_level}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}

            {filtered.length === 0 && (
              <div className="px-4 py-10 text-center">
                <div className="text-sm font-extrabold text-slate-900">Không có kết quả phù hợp</div>
                <div className="mt-1 text-xs text-indigo-800 font-bold">Thử đổi bộ lọc hoặc xoá từ khoá.</div>
              </div>
            )}
          </div>
        </div>

        <div className="h-2" />

        {loading && (
          <div className="fixed inset-0 bg-slate-600/45 backdrop-blur-[2px] flex items-center justify-center z-50">
            <div className="w-full max-w-sm px-3">
              <div className="rounded-2xl border-[3px] border-indigo-400 bg-white shadow-xl p-4">
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
  const map = {
    indigo: 'border-indigo-400 bg-indigo-600 text-white',
    emerald: 'border-emerald-700 bg-emerald-500 text-white',
    rose: 'border-rose-700 bg-rose-500 text-white',
  };
  return (
    <div className={`rounded-xl border-2 p-3 text-center ${map[tone] || 'border-slate-300 bg-white text-slate-900'}`}>
      <div className="text-lg font-extrabold">{value}</div>
      <div className="text-[11px] font-bold">{label}</div>
    </div>
  );
}

function TabButton({ active, onClick, children, tone = 'slate' }) {
  const map = {
    blue: { active: 'bg-blue-600 text-white border-blue-900', inactive: 'bg-white text-blue-700 border-blue-400 hover:bg-blue-50' },
    rose: { active: 'bg-rose-600 text-white border-rose-900', inactive: 'bg-white text-rose-700 border-rose-400 hover:bg-rose-50' },
    emerald: { active: 'bg-emerald-600 text-white border-emerald-900', inactive: 'bg-white text-emerald-700 border-emerald-400 hover:bg-emerald-50' },
  };
  const cls = map[tone] || map.blue;
  return (
    <button type="button" onClick={onClick}
      className={`flex-1 rounded-xl px-2 py-2 text-xs font-extrabold border-2 transition shadow-sm ${active ? cls.active : cls.inactive}`}>
      {children}
    </button>
  );
}

function AnswerBox({ label, value, tone = 'slate' }) {
  const map = {
    emerald: 'border-emerald-600 bg-emerald-100',
    rose: 'border-rose-600 bg-rose-100',
    slate: 'border-indigo-300 bg-indigo-50',
  };
  return (
    <div className={`rounded-xl border-2 p-3 ${map[tone] || map.slate}`}>
      <div className="text-xs font-extrabold text-slate-700">{label}</div>
      <div className="mt-1 text-sm font-bold text-slate-900 break-words">
        {value ? value : <span className="text-slate-500 font-semibold">(Không trả lời)</span>}
      </div>
    </div>
  );
}

export default VocabularyTestResult;
