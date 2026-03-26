// src/components/ProfileTestResultsList.jsx
import React from "react";

const cx = (...a) => a.filter(Boolean).join(" ");

const getScoreTone = (pct = 0) => {
  if (pct >= 80) return { badge: "border-emerald-800 bg-emerald-600", text: "text-white", bar: "bg-emerald-600" };
  if (pct >= 60) return { badge: "border-amber-700 bg-amber-500", text: "text-white", bar: "bg-amber-500" };
  return { badge: "border-rose-800 bg-rose-600", text: "text-white", bar: "bg-rose-600" };
};

const TYPE_CONFIG = {
  vocabulary: {
    label: "Từ vựng",
    border: "border-emerald-400",
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    iconBg: "bg-emerald-600 border-emerald-800",
  },
  multiple_choice: {
    label: "Trắc nghiệm",
    border: "border-violet-400",
    bg: "bg-violet-100",
    text: "text-violet-700",
    iconBg: "bg-violet-600 border-violet-800",
  },
  grammar: {
    label: "Ngữ pháp",
    border: "border-sky-400",
    bg: "bg-sky-100",
    text: "text-sky-700",
    iconBg: "bg-sky-600 border-sky-800",
  },
};

const getTypeConfig = (t) =>
  TYPE_CONFIG[t] || {
    label: "Bài test",
    border: "border-slate-300",
    bg: "bg-slate-100",
    text: "text-slate-700",
    iconBg: "bg-slate-600 border-slate-800",
  };

const TypeIcon = ({ type, className = "w-4 h-4" }) => {
  if (type === "vocabulary")
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    );
  if (type === "multiple_choice")
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    );
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
};

const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN");
};

const formatDuration = (ms) => {
  const s = Math.max(0, Math.round((ms || 0) / 1000));
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m${s % 60 ? `${s % 60}s` : ""}`;
};

const ProfileTestResultsList = ({ results = [], loading, error, onRetry, onViewDetail, onDelete }) => {
  const safeResults = Array.isArray(results) ? results : [];

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border-[3px] border-slate-200 ring-2 ring-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-5 py-3">
          <div className="h-4 w-32 bg-white/20 rounded animate-pulse" />
        </div>
        <div className="divide-y-2 divide-slate-100">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 animate-pulse flex gap-4 items-center">
              <div className="w-12 h-12 rounded-xl bg-slate-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 bg-slate-200 rounded" />
                <div className="h-3 w-32 bg-slate-100 rounded" />
              </div>
              <div className="flex gap-2 shrink-0">
                <div className="h-9 w-16 bg-slate-200 rounded-xl" />
                <div className="h-9 w-9 bg-slate-200 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border-[3px] border-rose-400 ring-2 ring-rose-100 overflow-hidden">
        <div className="bg-gradient-to-r from-rose-600 to-red-700 px-5 py-3">
          <p className="text-sm font-extrabold text-white">Lỗi tải kết quả</p>
        </div>
        <div className="p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 border-2 border-rose-300 flex items-center justify-center mx-auto mb-3 text-2xl">⚠️</div>
          <p className="text-sm font-bold text-slate-800 mb-1">Không tải được danh sách kết quả</p>
          <p className="text-xs text-slate-500 mb-4">{String(error)}</p>
          {onRetry && (
            <button onClick={onRetry}
              className="px-4 py-2 bg-rose-600 border-[3px] border-rose-800 text-white rounded-xl font-extrabold text-sm hover:bg-rose-700 transition-colors">
              Thử lại
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!safeResults.length) {
    return (
      <div className="bg-white rounded-2xl border-[3px] border-indigo-300 ring-2 ring-indigo-100 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-violet-700 px-5 py-3">
          <p className="text-sm font-extrabold text-white">📊 Lịch sử kết quả</p>
        </div>
        <div className="p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-100 border-2 border-indigo-300 flex items-center justify-center mx-auto mb-3 text-3xl">📭</div>
          <h3 className="text-sm font-extrabold text-slate-900 mb-1">Chưa có kết quả nào</h3>
          <p className="text-xs text-slate-500">Làm một bài test để xem lịch sử kết quả ở đây.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border-[3px] border-fuchsia-300 ring-2 ring-fuchsia-100 overflow-hidden">
      <div className="bg-gradient-to-r from-fuchsia-600 to-violet-700 px-5 py-3 flex items-center justify-between">
        <h2 className="text-sm font-extrabold text-white">📊 Lịch sử kết quả</h2>
        <span className="inline-flex items-center rounded-full border-2 border-white/40 bg-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white">
          {safeResults.length} kết quả
        </span>
      </div>

      <div className="divide-y-2 divide-slate-100">
        {safeResults.map((result) => {
          const id = result?._id ?? `${result?.created_at ?? ""}-${Math.random()}`;
          const percentage = Number(result?.percentage ?? 0);
          const total = Number(result?.total_questions ?? 0);
          const correct = Number(result?.correct_count ?? 0);
          const testType = result?.test_id?.test_type;
          const title = result?.test_id?.test_title || "Bài test";
          const mainTopic = result?.test_id?.main_topic;
          const subTopic = result?.test_id?.sub_topic;
          const tone = getScoreTone(percentage);
          const typeCfg = getTypeConfig(testType);

          return (
            <div key={id} className="p-3 sm:p-4 hover:bg-slate-50 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Left */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Score badge */}
                  <div className={cx(
                    "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border-2 font-black text-sm shadow-md",
                    tone.badge, tone.text
                  )}>
                    {percentage}%
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <div className={cx("w-7 h-7 rounded-lg border-2 flex items-center justify-center shrink-0", typeCfg.iconBg)}>
                        <TypeIcon type={testType} className="w-3.5 h-3.5 text-white" />
                      </div>
                      <h3 className="text-sm font-extrabold text-slate-900 truncate max-w-[200px] sm:max-w-xs">{title}</h3>
                      <span className={cx("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border-2", typeCfg.border, typeCfg.bg, typeCfg.text)}>
                        {typeCfg.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 font-medium">
                      <span className="flex items-center gap-1">
                        <span className="font-bold text-slate-700">{correct}/{total}</span> câu đúng
                      </span>
                      <span>⏱ {formatDuration(result?.duration_ms)}</span>
                      <span>📅 {formatDate(result?.created_at)}</span>
                    </div>

                    {mainTopic && (
                      <div className="mt-1.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border-2 border-indigo-300 bg-indigo-100 text-indigo-700">
                          📚 {mainTopic}{subTopic ? ` › ${subTopic}` : ""}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Score bar (desktop) + Actions */}
                <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 shrink-0">
                  <div className="hidden sm:block w-24">
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className={cx("h-full rounded-full transition-all", tone.bar)}
                        style={{ width: `${Math.min(100, percentage)}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => onViewDetail?.(result)}
                      className="px-3 py-1.5 bg-blue-700 border-[3px] border-blue-900 text-white rounded-xl font-extrabold text-xs hover:bg-blue-800 transition-colors shadow-sm">
                      Xem lại
                    </button>
                    {onDelete && (
                      <button onClick={() => onDelete(result)}
                        className="w-8 h-8 rounded-xl bg-rose-600 border-[3px] border-rose-800 text-white flex items-center justify-center hover:bg-rose-700 transition-colors shadow-sm"
                        title="Xóa kết quả">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProfileTestResultsList;
