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
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      ring: 'ring-emerald-200',
      bar: 'bg-emerald-600',
    };
  if (pct >= 75)
    return {
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
      ring: 'ring-blue-200',
      bar: 'bg-blue-600',
    };
  if (pct >= 50)
    return {
      badge: 'bg-amber-50 text-amber-800 border-amber-200',
      ring: 'ring-amber-200',
      bar: 'bg-amber-600',
    };
  return {
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    ring: 'ring-rose-200',
    bar: 'bg-rose-600',
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

  // UI state
  const [tab, setTab] = useState('all'); // all | wrong | correct
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
      {/* Wrapper duy nhất để tránh lỗi “Adjacent JSX elements...” khi lỡ lệch thẻ */}
      <div className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-8">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                        <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        Xem lại kết quả
                      </div>
                    </div>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3 leading-tight">
                    {normalized.title}
                  </h1>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center gap-2 rounded-xl bg-white/70 backdrop-blur-sm border border-white/20 px-4 py-2 text-sm font-medium text-slate-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4m-6 0v1m0-1h6m-6 0H6a2 2 0 00-2 2v9a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-2"
                        />
                      </svg>
                      {fmtDate(normalized.createdAt)}
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-xl bg-white/70 backdrop-blur-sm border border-white/20 px-4 py-2 text-sm font-medium text-slate-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {durationSec ? `${durationSec}s` : '—'}
                    </div>

                    <div
                      className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold ${
                        normalized.status === 'active'
                          ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                          : 'border-slate-200 bg-white/70 text-slate-700'
                      }`}
                    >
                      {normalized.status === 'active' ? (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          Đã lưu
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                          Nháp
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 lg:items-start">
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={deleteLoading}
                    className="px-4 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl hover:from-red-600 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all duration-200 shadow-lg shadow-red-500/25"
                  >
                    {deleteLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                        Đang xóa...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        Xóa kết quả
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => navigate(-1)}
                    className="px-4 py-3 bg-white/70 backdrop-blur-sm border border-white/20 text-slate-700 rounded-xl hover:bg-white transition-all duration-200 font-semibold shadow-lg"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M10 19l-7-7m0 0l7-7m-7 7h18"
                        />
                      </svg>
                      Quay lại
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Summary + actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Score card */}
            <div className="lg:col-span-2 bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-4">
                    <div
                      className={`h-16 w-16 rounded-2xl text-white flex items-center justify-center font-bold text-xl shadow-lg ${tone.bar}`}
                    >
                      {normalized.pct}%
                    </div>
                    <div>
                      <div className="text-lg font-bold text-slate-900">
                        Bạn đúng {normalized.correct}/{normalized.total} câu
                      </div>
                      <div className="text-sm text-slate-600 mt-1">
                        Sai {normalized.wrong} • Tổng {normalized.total} câu hỏi
                      </div>
                    </div>
                  </div>

                  <div className={`hidden sm:inline-flex items-center rounded-xl border px-4 py-2 text-sm font-semibold ${tone.badge}`}>
                    {normalized.pct >= 90
                      ? '🏆 Xuất sắc'
                      : normalized.pct >= 75
                      ? '🎯 Tốt'
                      : normalized.pct >= 50
                      ? '👍 Khá'
                      : '💪 Cần cố gắng'}
                  </div>
                </div>

                <div className="mb-6">
                  <div className="h-3 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${tone.bar}`}
                      style={{ width: `${Math.max(0, Math.min(100, normalized.pct))}%` }}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-white/70 backdrop-blur-sm rounded-xl border border-white/20">
                      <div className="text-2xl font-bold text-slate-900">{normalized.total}</div>
                      <div className="text-xs font-semibold text-slate-600 mt-1">Tổng câu</div>
                    </div>
                    <div className="text-center p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                      <div className="text-2xl font-bold text-emerald-700">{normalized.correct}</div>
                      <div className="text-xs font-semibold text-emerald-600 mt-1">Đúng</div>
                    </div>
                    <div className="text-center p-3 bg-rose-50 rounded-xl border border-rose-200">
                      <div className="text-2xl font-bold text-rose-700">{normalized.wrong}</div>
                      <div className="text-xs font-semibold text-rose-600 mt-1">Sai</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      setTab('wrong');
                      expandAllWrong();
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white px-4 py-3 font-semibold hover:from-red-600 hover:to-rose-700 transition-all duration-200 shadow-lg shadow-red-500/25"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Xem câu sai
                  </button>

                  <button
                    onClick={() => {
                      setTab('all');
                      setExpanded(new Set());
                      setQ('');
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-white/70 backdrop-blur-sm border border-white/20 text-slate-700 px-4 py-3 font-semibold hover:bg-white transition-all duration-200 shadow-lg"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Reset lọc
                  </button>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900">Bộ lọc</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-2 block">Loại câu hỏi</label>
                  <div className="flex gap-2">
                    <TabButton active={tab === 'all'} onClick={() => setTab('all')}>
                      Tất cả
                    </TabButton>
                    <TabButton active={tab === 'wrong'} onClick={() => setTab('wrong')}>
                      Sai
                    </TabButton>
                    <TabButton active={tab === 'correct'} onClick={() => setTab('correct')}>
                      Đúng
                    </TabButton>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-2 block">Tìm kiếm</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Nhập từ/đáp án..."
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white/70 backdrop-blur-sm"
                    />
                  </div>

                  <div className="mt-2 text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                    Hiển thị <span className="font-semibold text-slate-900">{filtered.length}</span> / {normalized.answers.length} câu
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* List */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-white/20 bg-gradient-to-r from-slate-50/50 to-white/50">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                      />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">Chi tiết từng câu</h2>
                </div>
                <div className="hidden sm:block text-sm text-slate-600 font-medium bg-white/70 backdrop-blur-sm rounded-lg px-3 py-1 border border-white/20">
                  Nhấn để xem chi tiết
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {filtered.map((a) => {
                const open = expanded.has(a.idx);
                return (
                  <button
                    key={a.idx}
                    type="button"
                    onClick={() => toggleExpand(a.idx)}
                    className="w-full text-left px-4 sm:px-5 py-3 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`mt-0.5 h-9 w-9 rounded-xl flex items-center justify-center text-white font-extrabold shrink-0 ${
                            a.isCorrect ? 'bg-emerald-600' : 'bg-rose-600'
                          }`}
                        >
                          {a.idx + 1}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="font-extrabold text-slate-900 truncate">{a.questionText}</div>
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                                a.isCorrect
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                  : 'border-rose-200 bg-rose-50 text-rose-700'
                              }`}
                            >
                              {a.isCorrect ? '✓ Đúng' : '✗ Sai'}
                            </span>
                          </div>

                          <div className="mt-1 text-xs text-slate-600 truncate">
                            <span className="font-semibold">Bạn:</span> {a.userAnswer ? a.userAnswer : '(Không trả lời)'}
                            {!a.isCorrect && a.correctAnswer ? (
                              <>
                                <span className="mx-2 text-slate-300">•</span>
                                <span className="font-semibold">Đúng:</span> {a.correctAnswer}
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-slate-400">
                        <svg
                          className={`w-5 h-5 transition ${open ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {open && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <AnswerBox
                          label="Câu trả lời của bạn"
                          value={a.userAnswer}
                          tone={a.isCorrect ? 'emerald' : 'rose'}
                        />
                        {!a.isCorrect ? (
                          <AnswerBox label="Đáp án đúng" value={a.correctAnswer} tone="emerald" />
                        ) : (
                          <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <div className="text-xs font-semibold text-slate-600">Gợi ý</div>
                            <div className="mt-1 text-sm font-semibold text-slate-900">Giữ vững phong độ! 🎯</div>
                          </div>
                        )}
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
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl w-full max-w-md border border-white/20">
              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/25">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xl font-bold text-slate-900">Xác nhận xóa kết quả</h3>
                    <p className="text-sm text-slate-600 mt-1">Thao tác này không thể hoàn tác</p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 mb-6">
                  <p className="text-sm text-slate-700 leading-relaxed">
                    Bạn có chắc chắn muốn xóa kết quả bài test{' '}
                    <span className="font-semibold text-slate-900">"{normalized.title}"</span> không?
                  </p>
                  <p className="text-xs text-slate-500 mt-2">Kết quả sẽ được chuyển vào thùng rác và có thể khôi phục sau.</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleteLoading}
                    className="flex-1 px-4 py-3 border border-slate-200 bg-white text-slate-700 rounded-xl hover:bg-slate-50 disabled:opacity-50 font-semibold transition-all duration-200"
                  >
                    Hủy bỏ
                  </button>

                  <button
                    onClick={handleDeleteResult}
                    disabled={deleteLoading}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:from-red-700 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all duration-200 shadow-lg shadow-red-500/25"
                  >
                    {deleteLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                        Đang xóa...
                      </div>
                    ) : (
                      'Xóa ngay'
                    )}
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

function MiniStat({ label, value, tone }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
      <div className={`text-lg font-extrabold ${tone}`}>{value}</div>
      <div className="text-[11px] font-semibold text-slate-600">{label}</div>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold border transition-all duration-200 ${
        active
          ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white border-transparent shadow-lg shadow-violet-500/25'
          : 'bg-white/70 backdrop-blur-sm text-slate-700 border-white/20 hover:bg-white hover:shadow-md'
      }`}
    >
      {children}
    </button>
  );
}

function AnswerBox({ label, value, tone = 'slate' }) {
  const toneCls =
    tone === 'emerald'
      ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50'
      : tone === 'rose'
      ? 'border-rose-200 bg-gradient-to-br from-rose-50 to-rose-100/50'
      : 'border-slate-200 bg-gradient-to-br from-white to-slate-50/50';

  return (
    <div className={`rounded-xl border p-4 backdrop-blur-sm ${toneCls}`}>
      <div className="text-xs font-semibold text-slate-600 mb-2">{label}</div>
      <div className="text-sm font-semibold text-slate-900 break-words">
        {value ? value : <span className="text-slate-500 italic">(Không trả lời)</span>}
      </div>
    </div>
  );
}

export default ProfileTestReview;
