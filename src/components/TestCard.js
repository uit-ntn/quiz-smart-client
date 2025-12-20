import React, { useMemo } from "react";
import { Link } from "react-router-dom";

// Helper styles
const cx = (...a) => a.filter(Boolean).join(" ");

// Cấu hình màu sắc (Tím/Indigo theo ảnh)
const TYPE = {
  vocabulary: {
    route: "/vocabulary/test",
    action: "Bắt đầu học",
    label: "Từ vựng",
    accent: "indigo"
  },
  "multiple-choice": { // Key khớp với logic của trang cha
    route: "/multiple-choice/test",
    action: "Làm bài",
    label: "Trắc nghiệm",
    accent: "violet"
  },
  // Fallback cho key cũ nếu có
  multiple_choice: {
    route: "/multiple-choice/test",
    action: "Làm bài",
    label: "Trắc nghiệm",
    accent: "violet"
  }
};

const DIFFICULTY = {
  easy: { label: "Dễ", color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
  medium: { label: "Trung bình", color: "text-amber-600 bg-amber-50 border-amber-100" },
  hard: { label: "Khó", color: "text-rose-600 bg-rose-50 border-rose-100" },
};

const ACCENT = {
  indigo: {
    header: "bg-gradient-to-r from-indigo-600 to-indigo-700",
    btn: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200",
    btnSoft: "border-indigo-200 text-indigo-700 hover:bg-indigo-50",
    iconBox: "bg-indigo-50 text-indigo-600",
  },
  violet: {
    header: "bg-gradient-to-r from-violet-600 to-fuchsia-700",
    btn: "bg-violet-600 hover:bg-violet-700 text-white shadow-violet-200",
    btnSoft: "border-violet-200 text-violet-700 hover:bg-violet-50",
    iconBox: "bg-violet-50 text-violet-600",
  },
};

// Icons
const Icon = {
  Book: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 19.5V6a2 2 0 0 1 2-2h11a3 3 0 0 1 3 3v12.5" /><path d="M6 18h13a2 2 0 0 1 2 2v0" /></svg>,
  Check: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m9 11 3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>,
  Clock: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
  Trophy: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>
};

const TestCard = ({ test, type = "vocabulary", viewMode = "card", onPreviewVocabulary, className = "" }) => {
  const testId = test?._id || test?.id || test?.test_id;
  
  // Xử lý key type để lấy config đúng
  const safeTypeKey = type === 'multiple-choice' || type === 'multiple_choice' ? 'multiple-choice' : 'vocabulary';
  const cfg = TYPE[safeTypeKey] || TYPE.vocabulary;
  
  const accent = ACCENT[cfg.accent] || ACCENT.indigo;
  const diff = DIFFICULTY[test?.difficulty] || DIFFICULTY.medium;
  const HeaderIcon = safeTypeKey === "vocabulary" ? Icon.Book : Icon.Check;
  const toSettings = `${cfg.route}/${testId}/settings`;

  // === LIST VIEW (Compact) ===
  if (viewMode === "list") {
    return (
      <div className={cx("group relative rounded-xl border border-slate-200 bg-white p-3 hover:shadow-md transition-all hover:border-slate-300", className)}>
        <div className="flex items-center gap-3">
          <div className={cx("shrink-0 h-10 w-10 flex items-center justify-center rounded-lg", accent.iconBox)}>
            <HeaderIcon className="h-5 w-5" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-bold text-slate-800 text-sm truncate">{test?.test_title}</h3>
              <span className={cx("px-1.5 py-0.5 rounded text-[10px] font-semibold border", diff.color)}>{diff.label}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
               <span className="flex items-center gap-1"><Icon.Trophy className="h-3 w-3" /> {test?.total_questions || 0} câu</span>
               {test?.time_limit_minutes && (
                 <span className="flex items-center gap-1"><Icon.Clock className="h-3 w-3" /> {test.time_limit_minutes}p</span>
               )}
            </div>
          </div>

          <div className="flex gap-2">
            {safeTypeKey === "vocabulary" && (
              <button onClick={() => onPreviewVocabulary?.(test)} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors">
                Xem
              </button>
            )}
            <Link to={toSettings} className={cx("px-3 py-1.5 text-xs font-semibold rounded-lg transition-all active:scale-95", accent.btn)}>
              {cfg.action}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // === CARD VIEW (Compact Grid) ===
  return (
    <div className={cx("group flex flex-col h-full rounded-2xl border border-slate-200 bg-white overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1", className)}>
      {/* HEADER: Chiều cao giảm còn h-20 (80px) */}
      <div className={cx("relative h-20 shrink-0 px-4 py-3 flex justify-between items-start", accent.header)}>
        {/* Decorative Circles */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
        
        <div className="relative z-10 w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white border border-white/20">
          <HeaderIcon className="h-5 w-5" />
        </div>
        
        <div className="relative z-10">
          <span className="inline-block px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-[10px] font-bold text-white uppercase tracking-wider">
            {cfg.label}
          </span>
        </div>
      </div>

      {/* BODY: Padding giảm còn p-4 */}
      <div className="flex flex-col flex-1 p-4">
        <div className="flex justify-between items-center mb-2">
          <span className={cx("px-2 py-0.5 rounded text-[10px] font-bold uppercase border", diff.color)}>
            {diff.label}
          </span>
          <span className="text-[10px] text-slate-300 font-mono">#{String(testId || "").slice(-4)}</span>
        </div>

        <h3 className="text-[15px] font-bold text-slate-800 leading-snug mb-1 line-clamp-2 min-h-[2.5rem]">
          {test?.test_title}
        </h3>
        
        <p className="text-xs text-slate-500 line-clamp-2 mb-4 h-8">
          {test?.description || "Không có mô tả chi tiết."}
        </p>

        <div className="mt-auto grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-0.5">Số lượng</span>
            <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs">
               <Icon.Trophy className="h-3.5 w-3.5 text-slate-400" />
               {test?.total_questions || 0} câu
            </div>
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-0.5">Thời gian</span>
            <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs">
               <Icon.Clock className="h-3.5 w-3.5 text-slate-400" />
               {test?.time_limit_minutes ? `${test.time_limit_minutes} phút` : 'Tự do'}
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER: Padding nhỏ */}
      <div className="p-3 pt-0 flex gap-2">
        {safeTypeKey === "vocabulary" && (
          <button
            onClick={() => onPreviewVocabulary?.(test)}
            className={cx("flex-1 px-3 py-2 text-xs font-bold rounded-lg border transition-all active:scale-95", accent.btnSoft)}
          >
            Xem trước
          </button>
        )}
        <Link
          to={toSettings}
          className={cx("flex-[2] px-3 py-2 text-xs font-bold rounded-lg text-center shadow-sm transition-all active:scale-95", accent.btn)}
        >
          {cfg.action}
        </Link>
      </div>
    </div>
  );
};

export default TestCard;

export const VocabularyTestCard = (props) => <TestCard {...props} type="vocabulary" />;
export const MCPTestCard = (props) => <TestCard {...props} type="multiple-choice" />;