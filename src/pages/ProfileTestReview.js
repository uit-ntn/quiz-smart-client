// src/pages/ProfileTestReview.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProfileLayout from '../layout/ProfileLayout';
import testResultService from '../services/testResultService';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const scoreTone = (pct) => {
  if (pct >= 90)
    return {
      badge: 'border-2 border-emerald-800 bg-emerald-600 text-white',
      bar: 'bg-emerald-600',
      label: '🏆 Xuất sắc',
      cardBorder: 'border-emerald-400',
      cardRing: 'ring-emerald-100',
      headerGrad: 'from-emerald-600 to-teal-700',
    };
  if (pct >= 75)
    return {
      badge: 'border-2 border-sky-800 bg-sky-600 text-white',
      bar: 'bg-sky-600',
      label: '🎯 Tốt',
      cardBorder: 'border-sky-400',
      cardRing: 'ring-sky-100',
      headerGrad: 'from-sky-600 to-indigo-700',
    };
  if (pct >= 50)
    return {
      badge: 'border-2 border-amber-800 bg-amber-500 text-white',
      bar: 'bg-amber-500',
      label: '👍 Khá',
      cardBorder: 'border-amber-400',
      cardRing: 'ring-amber-100',
      headerGrad: 'from-amber-500 to-orange-600',
    };
  return {
    badge: 'border-2 border-rose-800 bg-rose-600 text-white',
    bar: 'bg-rose-600',
    label: '💪 Cần cố gắng',
    cardBorder: 'border-rose-400',
    cardRing: 'ring-rose-100',
    headerGrad: 'from-rose-600 to-red-700',
  };
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

const getMs = (result) => {
  if (Number.isFinite(result?.duration_ms)) return result.duration_ms;
  if (Number.isFinite(result?.time_taken)) return result.time_taken * 1000;
  return 0;
};

const normalizeResult = (r) => {
  const answers = Array.isArray(r?.answers) ? r.answers : [];

  const total =
    Number.isFinite(r?.total_questions)
      ? r.total_questions
      : Number.isFinite(r?.totalQuestions)
      ? r.totalQuestions
      : answers.length;

  const correct =
    Number.isFinite(r?.correct_count)
      ? r.correct_count
      : Number.isFinite(r?.correct_answers)
      ? r.correct_answers
      : answers.filter((a) => a?.is_correct || a?.isCorrect).length;

  const pct =
    Number.isFinite(r?.percentage)
      ? r.percentage
      : Number.isFinite(r?.score)
      ? r.score
      : total > 0
      ? Math.round((correct / total) * 100)
      : 0;

  const createdAt = r?.created_at || r?.createdAt || r?.created || null;
  const durationMs = getMs(r);

  const normAnswers = answers.map((a, idx) => ({
    idx,
    isCorrect: !!(a?.is_correct ?? a?.isCorrect),
    questionText:
      a?.question_text ||
      a?.questionText ||
      a?.word ||
      a?.question?.word ||
      `Câu ${idx + 1}`,
    userAnswer: a?.user_answer ?? a?.userAnswer ?? '',
    correctAnswer: a?.correct_answer ?? a?.correctAnswer ?? '',
    word: a?.word || a?.question?.word || '',
  }));

  return {
    raw: r,
    total,
    correct,
    wrong: Math.max(0, total - correct),
    pct,
    createdAt,
    durationMs,
    status: r?.status || 'draft',
    title:
      r?.test_id?.test_title ||
      r?.test?.test_title ||
      r?.test_title ||
      'Bài test từ vựng',
    answers: normAnswers,
  };
};

const ProfileTestReview = () => {
  const { resultId } = useParams();
  const navigate = useNavigate();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [expanded, setExpanded] = useState(() => new Set());
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await testResultService.getTestResultById(resultId);
        setResult(data);
      } catch (err) {
        console.error('Error fetching test result:', err);
        setError('Không thể tải kết quả bài test.');
      } finally {
        setLoading(false);
      }
    };
    if (resultId) fetchResult();
  }, [resultId]);

  const normalized = useMemo(() => (result ? normalizeResult(result) : null), [result]);
  const tone = useMemo(() => scoreTone(normalized?.pct || 0), [normalized?.pct]);

  const filtered = useMemo(() => {
    if (!normalized) return [];
    const text = (q || '').trim().toLowerCase();
    return normalized.answers.filter((a) => {
      if (tab === 'wrong' && a.isCorrect) return false;
      if (tab === 'correct' && !a.isCorrect) return false;
      if (!text) return true;
      const hay = `${a.questionText} ${a.userAnswer} ${a.correctAnswer}`.toLowerCase();
      return hay.includes(text);
    });
  }, [normalized, q, tab]);

  const toggleExpand = (idx) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const expandAllWrong = () => {
    if (!normalized) return;
    setExpanded(() => {
      const s = new Set();
      normalized.answers.forEach((a) => {
        if (!a.isCorrect) s.add(a.idx);
      });
      return s;
    });
  };

  const handleDeleteResult = async () => {
    try {
      setDeleteLoading(true);
      await testResultService.softDeleteTestResult(resultId);
      setShowDeleteConfirm(false);
      navigate('/profile', {
        state: { message: 'Đã xóa kết quả bài test thành công', type: 'success' },
      });
    } catch (err) {
      console.error('Error deleting test result:', err);
      setError('Không thể xóa kết quả bài test. Vui lòng thử lại.');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) return <LoadingSpinner message="Đang tải kết quả..." />;
  if (error) return <ErrorMessage error={error} />;

  if (!normalized) {
    return (
      <ProfileLayout>
        <ErrorMessage error="Không tìm thấy kết quả bài test." />
      </ProfileLayout>
    );
  }

  const durationSec = Math.round((normalized.durationMs || 0) / 1000);

  return (
    <ProfileLayout>
      <div className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Page Header */}
          <div className="mb-5">
            <div className={`bg-white rounded-2xl border-[3px] ${tone.cardBorder} ring-2 ${tone.cardRing} shadow-lg overflow-hidden`}>
              <div className={`bg-gradient-to-r ${tone.headerGrad} px-5 py-4`}>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-white/40 bg-white/20 px-2.5 py-0.5 text-[11px] font-bold text-white">
                        <span className="inline-flex h-2 w-2 rounded-full bg-lime-400 animate-pulse" />
                        Xem lại kết quả
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${tone.badge}`}>
                        {tone.label}
                      </span>
                    </div>
                    <h1 className="text-xl font-black text-white leading-tight mb-2">{normalized.title}</h1>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full border-2 border-white/40 bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">
                        🕐 {fmtDate(normalized.createdAt)}
                      </span>
                      {durationSec > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full border-2 border-white/40 bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">
                          ⏱ {durationSec}s
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 rounded-full border-2 border-white/40 bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">
                        {normalized.status === 'active' ? '✅ Đã lưu' : '📄 Nháp'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => navigate(-1)}
                      className="px-3 py-1.5 bg-white/20 border-2 border-white/40 text-white rounded-xl font-extrabold text-xs hover:bg-white/30 transition-colors flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      Quay lại
                    </button>
                    <button onClick={() => setShowDeleteConfirm(true)} disabled={deleteLoading}
                      className="w-8 h-8 rounded-xl bg-rose-500 border-2 border-rose-700 flex items-center justify-center text-white hover:bg-rose-600 transition-colors disabled:opacity-50"
                      title="Xóa kết quả">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Score + Filters */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
            {/* Score card */}
            <div className={`lg:col-span-2 bg-white rounded-2xl border-[3px] ${tone.cardBorder} ring-2 ${tone.cardRing} shadow-lg overflow-hidden`}>
              <div className="bg-slate-50 border-b-2 border-slate-200 px-5 py-3">
                <h2 className="text-sm font-extrabold text-slate-800">📊 Kết quả tổng quan</h2>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-4 mb-4">
                  <div className={`h-16 w-16 rounded-2xl text-white flex items-center justify-center font-black text-xl shadow-lg ${tone.bar}`}>
                    {normalized.pct}%
                  </div>
                  <div>
                    <div className="text-lg font-black text-slate-900">Đúng {normalized.correct}/{normalized.total} câu</div>
                    <div className="text-sm text-slate-500 font-medium mt-0.5">Sai {normalized.wrong} câu</div>
                  </div>
                </div>
                <div className="mb-5">
                  <div className="h-3 rounded-full bg-slate-200 overflow-hidden">
                    <div className={`h-full transition-all duration-700 rounded-full ${tone.bar}`}
                      style={{ width: `${Math.max(0, Math.min(100, normalized.pct))}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="text-center p-3 bg-white rounded-xl border-[3px] border-slate-200">
                    <div className="text-2xl font-black text-slate-900">{normalized.total}</div>
                    <div className="text-[10px] font-extrabold text-slate-500 mt-0.5 uppercase tracking-wide">Tổng câu</div>
                  </div>
                  <div className="text-center p-3 bg-emerald-100 rounded-xl border-[3px] border-emerald-400">
                    <div className="text-2xl font-black text-emerald-700">{normalized.correct}</div>
                    <div className="text-[10px] font-extrabold text-emerald-600 mt-0.5 uppercase tracking-wide">✓ Đúng</div>
                  </div>
                  <div className="text-center p-3 bg-rose-100 rounded-xl border-[3px] border-rose-400">
                    <div className="text-2xl font-black text-rose-700">{normalized.wrong}</div>
                    <div className="text-[10px] font-extrabold text-rose-600 mt-0.5 uppercase tracking-wide">✗ Sai</div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button onClick={() => { setTab('wrong'); expandAllWrong(); }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 border-[3px] border-rose-800 text-white px-4 py-2 font-extrabold text-sm hover:bg-rose-700 transition-colors shadow-md">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Xem câu sai ({normalized.wrong})
                  </button>
                  <button onClick={() => { setTab('all'); setExpanded(new Set()); setQ(''); }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-white border-[3px] border-slate-300 text-slate-700 px-4 py-2 font-extrabold text-sm hover:bg-slate-50 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Xem tất cả
                  </button>
                </div>
              </div>
            </div>

            {/* Filters sidebar */}
            <div className="bg-white rounded-2xl border-[3px] border-indigo-300 ring-2 ring-indigo-100 shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-violet-700 px-4 py-3">
                <h3 className="text-sm font-extrabold text-white">🔍 Bộ lọc</h3>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-xs font-extrabold text-slate-700 mb-2 block uppercase tracking-wide">Loại câu hỏi</label>
                  <div className="flex gap-1.5">
                    <TabButton active={tab === 'all'} onClick={() => setTab('all')}>Tất cả</TabButton>
                    <TabButton active={tab === 'wrong'} onClick={() => setTab('wrong')}>Sai</TabButton>
                    <TabButton active={tab === 'correct'} onClick={() => setTab('correct')}>Đúng</TabButton>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-extrabold text-slate-700 mb-2 block uppercase tracking-wide">Tìm kiếm</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nhập từ/đáp án..."
                      className="w-full pl-9 pr-4 py-2 rounded-xl border-2 border-indigo-200 text-sm outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 font-medium text-slate-800 placeholder-indigo-300" />
                  </div>
                </div>
                <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50 px-3 py-2">
                  <p className="text-xs text-indigo-700 font-bold">
                    Hiển thị <span className="text-indigo-900 font-black">{filtered.length}</span> / {normalized.answers.length} câu
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Answer List */}
          <div className="bg-white rounded-2xl border-[3px] border-slate-300 ring-2 ring-slate-100 shadow-lg overflow-hidden mb-4">
            <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-5 py-3 flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-white">📋 Chi tiết từng câu</h2>
              <span className="inline-flex items-center rounded-full border-2 border-white/40 bg-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white">
                Nhấn để xem chi tiết
              </span>
            </div>
            <div className="divide-y-2 divide-slate-100">
              {filtered.map((a) => {
                const open = expanded.has(a.idx);
                return (
                  <button key={a.idx} type="button" onClick={() => toggleExpand(a.idx)}
                    className={`w-full text-left px-4 sm:px-5 py-3 transition-colors ${open ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`mt-0.5 h-8 w-8 rounded-xl flex items-center justify-center text-white font-black text-xs shrink-0 border-2 ${
                          a.isCorrect ? 'bg-emerald-600 border-emerald-800' : 'bg-rose-600 border-rose-800'
                        }`}>
                          {a.idx + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-slate-900 text-sm">{a.questionText}</span>
                            <span className={`inline-flex items-center rounded-full border-2 px-2 py-0.5 text-[10px] font-bold ${
                              a.isCorrect ? 'border-emerald-400 bg-emerald-100 text-emerald-700' : 'border-rose-400 bg-rose-100 text-rose-700'
                            }`}>
                              {a.isCorrect ? '✓ Đúng' : '✗ Sai'}
                            </span>
                          </div>
                          <div className="mt-0.5 text-xs text-slate-500 font-medium truncate">
                            <span className="font-bold text-slate-700">Bạn:</span> {a.userAnswer || '(Không trả lời)'}
                            {!a.isCorrect && a.correctAnswer && (
                              <> <span className="text-slate-300 mx-1">•</span> <span className="font-bold text-emerald-700">Đúng:</span> {a.correctAnswer}</>
                            )}
                          </div>
                        </div>
                      </div>
                      <svg className={`w-4 h-4 text-slate-400 shrink-0 transition-transform mt-1 ${open ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    {open && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <AnswerBox label="Câu trả lời của bạn" value={a.userAnswer} tone={a.isCorrect ? 'emerald' : 'rose'} />
                        {!a.isCorrect ? (
                          <AnswerBox label="Đáp án đúng" value={a.correctAnswer} tone="emerald" />
                        ) : (
                          <div className="rounded-xl border-[3px] border-sky-300 bg-sky-50 p-3">
                            <div className="text-[10px] font-extrabold text-sky-600 uppercase tracking-wide mb-1">Gợi ý</div>
                            <div className="text-sm font-extrabold text-sky-900">Giữ vững phong độ! 🎯</div>
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <div className="px-4 py-12 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 border-2 border-slate-200 flex items-center justify-center mx-auto mb-3 text-2xl">🔍</div>
                  <div className="text-sm font-extrabold text-slate-900 mb-1">Không có kết quả phù hợp</div>
                  <div className="text-xs text-slate-500">Thử đổi bộ lọc hoặc xóa từ khóa tìm kiếm.</div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl border-[3px] border-rose-500 ring-2 ring-rose-200 shadow-2xl max-w-md w-full overflow-hidden">
              <div className="bg-gradient-to-r from-rose-600 to-red-700 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 border-2 border-white/40 flex items-center justify-center text-xl">🗑️</div>
                  <div>
                    <h3 className="text-base font-extrabold text-white">Xác nhận xóa kết quả</h3>
                    <p className="text-xs text-rose-200 font-medium">Thao tác này không thể hoàn tác</p>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <div className="bg-rose-50 border-2 border-rose-300 rounded-xl p-3 mb-4">
                  <p className="text-sm text-slate-800 font-bold">
                    Bạn có chắc muốn xóa kết quả bài test{' '}
                    <span className="text-rose-700">"{normalized.title}"</span>?
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Kết quả sẽ được chuyển vào thùng rác.</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowDeleteConfirm(false)} disabled={deleteLoading}
                    className="flex-1 px-4 py-2.5 text-slate-700 bg-white border-[3px] border-slate-300 rounded-xl font-extrabold text-sm hover:bg-slate-50 disabled:opacity-50 transition-colors">
                    Hủy bỏ
                  </button>
                  <button onClick={handleDeleteResult} disabled={deleteLoading}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 border-[3px] border-red-900 text-white rounded-xl font-extrabold text-sm hover:from-rose-700 hover:to-red-700 disabled:opacity-50 transition-colors shadow-md">
                    {deleteLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Đang xóa...
                      </span>
                    ) : '🗑️ Xóa ngay'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProfileLayout>
  );
};

function TabButton({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex-1 rounded-xl px-3 py-1.5 text-xs font-extrabold border-2 transition-all duration-200 ${
        active
          ? 'bg-violet-600 border-violet-800 text-white shadow-md'
          : 'bg-white text-slate-700 border-slate-300 hover:border-violet-300 hover:bg-violet-50'
      }`}>
      {children}
    </button>
  );
}

function AnswerBox({ label, value, tone = 'slate' }) {
  const toneCls =
    tone === 'emerald'
      ? 'border-emerald-400 bg-emerald-100'
      : tone === 'rose'
      ? 'border-rose-400 bg-rose-100'
      : 'border-slate-300 bg-white';

  const textCls =
    tone === 'emerald' ? 'text-emerald-900' : tone === 'rose' ? 'text-rose-900' : 'text-slate-900';

  const labelCls =
    tone === 'emerald' ? 'text-emerald-700' : tone === 'rose' ? 'text-rose-700' : 'text-slate-600';

  return (
    <div className={`rounded-xl border-[3px] p-3 ${toneCls}`}>
      <div className={`text-[10px] font-extrabold uppercase tracking-wide mb-1.5 ${labelCls}`}>{label}</div>
      <div className={`text-sm font-extrabold break-words ${textCls}`}>
        {value ? value : <span className="italic font-medium opacity-60">(Không trả lời)</span>}
      </div>
    </div>
  );
}

export default ProfileTestReview;
