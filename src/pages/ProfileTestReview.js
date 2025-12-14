// src/pages/ProfileTestReview.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VocabularyLayout from '../layout/VocabularyLayout';
import testResultService from '../services/testResultService';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const scoreTone = (pct) => {
  if (pct >= 90) return { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', ring: 'ring-emerald-200', bar: 'bg-emerald-600' };
  if (pct >= 75) return { badge: 'bg-blue-50 text-blue-700 border-blue-200', ring: 'ring-blue-200', bar: 'bg-blue-600' };
  if (pct >= 50) return { badge: 'bg-amber-50 text-amber-800 border-amber-200', ring: 'ring-amber-200', bar: 'bg-amber-600' };
  return { badge: 'bg-rose-50 text-rose-700 border-rose-200', ring: 'ring-rose-200', bar: 'bg-rose-600' };
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
    Number.isFinite(r?.total_questions) ? r.total_questions :
    Number.isFinite(r?.totalQuestions) ? r.totalQuestions :
    answers.length;

  const correct =
    Number.isFinite(r?.correct_count) ? r.correct_count :
    Number.isFinite(r?.correct_answers) ? r.correct_answers :
    answers.filter(a => a?.is_correct || a?.isCorrect).length;

  const pct =
    Number.isFinite(r?.percentage) ? r.percentage :
    Number.isFinite(r?.score) ? r.score :
    (total > 0 ? Math.round((correct / total) * 100) : 0);

  const createdAt = r?.created_at || r?.createdAt || r?.created || null;
  const durationMs = getMs(r);

  const normAnswers = answers.map((a, idx) => ({
    idx,
    isCorrect: !!(a?.is_correct ?? a?.isCorrect),
    questionText: a?.question_text || a?.questionText || a?.word || a?.question?.word || `Câu ${idx + 1}`,
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
    title: r?.test_id?.test_title || r?.test?.test_title || r?.test_title || 'Bài test từ vựng',
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
      <VocabularyLayout>
        <ErrorMessage error="Không tìm thấy kết quả bài test." />
      </VocabularyLayout>
    );
  }

  const durationSec = Math.round((normalized.durationMs || 0) / 1000);

  return (
    <VocabularyLayout>
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-5xl px-3 sm:px-4 py-4 sm:py-6">
          {/* Top bar (mobile: stack, buttons full width) */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                Review
              </div>

              <h1 className="mt-2 text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight truncate">
                {normalized.title}
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold">
                  📅 {fmtDate(normalized.createdAt)}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold">
                  ⏱️ {durationSec ? `${durationSec}s` : '—'}
                </span>
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-semibold ${
                    normalized.status === 'active'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  {normalized.status === 'active' ? '✅ Đã lưu' : '📝 Nháp'}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleteLoading}
                className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 shadow-sm hover:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteLoading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Đang xóa...
                  </>
                ) : (
                  <>🗑️ Xóa</>
                )}
              </button>

              <button
                onClick={() => navigate(-1)}
                className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                ← Quay lại
              </button>
            </div>
          </div>

          {/* Summary + actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Score card */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-extrabold">
                      {normalized.pct}%
                    </div>
                    <div>
                      <div className="text-sm font-extrabold text-slate-900">
                        Bạn đúng {normalized.correct}/{normalized.total} câu
                      </div>
                      <div className="text-xs text-slate-600">
                        Sai {normalized.wrong} • Tổng {normalized.total}
                      </div>
                    </div>
                  </div>

                  <span className={`hidden sm:inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${tone.badge}`}>
                    {normalized.pct >= 90 ? 'Xuất sắc' : normalized.pct >= 75 ? 'Tốt' : normalized.pct >= 50 ? 'Khá' : 'Cần cố gắng'}
                  </span>
                </div>

                <div className="mt-4">
                  <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div className={`h-full ${tone.bar}`} style={{ width: `${Math.max(0, Math.min(100, normalized.pct))}%` }} />
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <MiniStat label="Tổng" value={normalized.total} tone="text-slate-900" />
                    <MiniStat label="Đúng" value={normalized.correct} tone="text-emerald-700" />
                    <MiniStat label="Sai" value={normalized.wrong} tone="text-rose-700" />
                  </div>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => {
                      setTab('wrong');
                      expandAllWrong();
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                  >
                    ❌ Xem câu sai
                  </button>

                  <button
                    onClick={() => {
                      setTab('all');
                      setExpanded(new Set());
                      setQ('');
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    🔄 Reset lọc
                  </button>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 sm:p-5">
              <div className="text-sm font-extrabold text-slate-900">Bộ lọc</div>

              {/* mobile: tabs scrollable if needed */}
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                <TabButton active={tab === 'all'} onClick={() => setTab('all')}>Tất cả</TabButton>
                <TabButton active={tab === 'wrong'} onClick={() => setTab('wrong')}>Sai</TabButton>
                <TabButton active={tab === 'correct'} onClick={() => setTab('correct')}>Đúng</TabButton>
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
                  Hiển thị: <b>{filtered.length}</b> / {normalized.answers.length}
                </div>
              </div>
            </div>
          </div>

          {/* List */}
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-4 sm:px-5 py-3 border-b border-slate-200 flex items-center justify-between gap-3">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900">Chi tiết</h2>
              <div className="hidden sm:block text-xs text-slate-600 font-semibold">
                Chạm vào từng câu để xem đáp án
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
                            <div className="font-extrabold text-slate-900 truncate">
                              {a.questionText}
                            </div>
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
                            <span className="font-semibold">Bạn:</span>{' '}
                            {a.userAnswer ? a.userAnswer : '(Không trả lời)'}
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
                        <svg className={`w-5 h-5 transition ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                            <div className="mt-1 text-sm font-semibold text-slate-900">
                              Giữ vững phong độ! 🎯
                            </div>
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
      </div>

      {/* Delete Confirmation Modal (mobile: full width, safe padding) */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-md">
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-rose-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-extrabold text-slate-900">Xác nhận xóa</h3>
                  <p className="text-sm text-slate-600">Thao tác này không thể hoàn tác</p>
                </div>
              </div>

              <p className="text-sm text-slate-700 mb-5">
                Bạn có chắc chắn muốn xóa kết quả bài test "<strong>{normalized.title}</strong>" không?
                Kết quả sẽ được chuyển vào thùng rác và có thể khôi phục sau.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleteLoading}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleDeleteResult}
                  disabled={deleteLoading}
                  className="flex-1 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleteLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Đang xóa...
                    </span>
                  ) : (
                    'Xóa ngay'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-[84px] flex-1 rounded-xl px-3 py-2 text-xs font-extrabold border transition ${
        active ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
      }`}
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

export default ProfileTestReview;
