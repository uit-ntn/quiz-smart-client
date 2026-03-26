import React from "react";
import { Link, useNavigate } from "react-router-dom";

// ================= Utils =================
const cx = (...a) => a.filter(Boolean).join(" ");

// ================= Color Themes =================
// Unified neutral-first palette:
// - Blue is primary accent for light metadata
// - Orange is the only strong CTA color
const THEME = {
  vocabulary: {
    cardBorder: "border-slate-200 hover:border-slate-300",
    headerStrip: "bg-gradient-to-r from-blue-500 to-indigo-500",
    typeBadge: "bg-slate-100 border-slate-200 text-slate-700 font-semibold",
    qBox: "bg-slate-50 border-slate-200 text-slate-700",
    tBox: "bg-slate-50 border-slate-200 text-slate-700",
    topicBox: "bg-slate-50 border-slate-200",
    topicText: "text-slate-600 font-medium",
    divider: "border-slate-200",
    visLabel: "text-slate-500",
  },
  "multiple-choice": {
    cardBorder: "border-slate-200 hover:border-slate-300",
    headerStrip: "bg-gradient-to-r from-blue-500 to-indigo-500",
    typeBadge: "bg-slate-100 border-slate-200 text-slate-700 font-semibold",
    qBox: "bg-slate-50 border-slate-200 text-slate-700",
    tBox: "bg-slate-50 border-slate-200 text-slate-700",
    topicBox: "bg-slate-50 border-slate-200",
    topicText: "text-slate-600 font-medium",
    divider: "border-slate-200",
    visLabel: "text-slate-500",
  },
};

// ================= Config =================
const TYPE = {
  vocabulary: {
    route: "/vocabulary/test",
    action: "Làm bài",
    btnPrimary: "bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-sm",
  },
  "multiple-choice": {
    route: "/multiple-choice/test",
    action: "Làm bài",
    btnPrimary: "bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-sm",
  },
  multiple_choice: {
    route: "/multiple-choice/test",
    action: "Làm bài",
    btnPrimary: "bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-sm",
  },
};

const UNIFIED_PREVIEW_BTN =
  "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-semibold";

// Semantic colors for difficulty — kept meaningful but not competing with card tone
const DIFFICULTY = {
  easy:   { label: "Dễ",        color: "bg-slate-100 border-slate-200 text-emerald-700 font-semibold",  icon: "🟢" },
  medium: { label: "Trung bình", color: "bg-slate-100 border-slate-200 text-amber-700 font-semibold", icon: "🟡" },
  hard:   { label: "Khó",       color: "bg-slate-100 border-slate-200 text-rose-700 font-semibold",  icon: "🔴" },
};

const VISIBILITY = {
  public:  { label: "Công khai", className: "bg-slate-50 border-slate-200 text-slate-600 font-medium", icon: "🌐" },
  private: { label: "Riêng tư",  className: "bg-slate-50 border-slate-200 text-slate-600 font-medium", icon: "🔒" },
};

// ================= Icons =================
const Icon = {
  Book: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19.5V6a2 2 0 0 1 2-2h11a3 3 0 0 1 3 3v12.5" />
      <path d="M6 18h13a2 2 0 0 1 2 2" />
    </svg>
  ),
  Check: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m9 11 3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  Users: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Clock: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12,6 12,12 16,14" />
    </svg>
  ),
};

const TestCard = ({
  test,
  type = "vocabulary",
  viewMode = "card",
  className = "",
  dense = true, // ✅ mặc định nhỏ gọn
  onPreview, // optional: mở modal xem trước bài test
}) => {
  const navigate = useNavigate();

  const testId = test?._id || test?.id || test?.test_id;
  const createdBy = test?.created_by_full_name || "Ẩn danh";

  const visibilityKey = test?.visibility || "private";
  const visibilityCfg = VISIBILITY[visibilityKey] || VISIBILITY.private;

  const safeTypeKey =
    type === "multiple-choice" || type === "multiple_choice" ? "multiple-choice" : "vocabulary";

  const cfg = TYPE[safeTypeKey] || TYPE.vocabulary;
  const diff = DIFFICULTY[test?.difficulty] || DIFFICULTY.medium;
  const theme = THEME[safeTypeKey] || THEME.vocabulary;
  const hasTopic = Boolean(test?.main_topic || test?.sub_topic);

  const toSettings = `${cfg.route}/${testId}/settings`;

  const handleClick = () => navigate(toSettings);

  // ======================================================
  // ================= LIST VIEW ==========================
  // ======================================================
  if (viewMode === "list") {
    return (
      <div
        onClick={handleClick}
        className={cx(
          "group cursor-pointer rounded-2xl border bg-white",
          theme.cardBorder,
          "shadow-sm hover:shadow-md transition-all duration-200 ease-out",
          "p-3 sm:p-4",
          className
        )}
      >
        {/* Top: badges */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
          <span className={cx(
            "inline-flex items-center gap-1 rounded-full border text-[11px] px-2 py-0.5 shrink-0",
            theme.typeBadge
          )}>
            {safeTypeKey === "vocabulary" ? "📚" : "📝"}
            <span>{safeTypeKey === "vocabulary" ? "Từ vựng" : "Trắc nghiệm"}</span>
          </span>

          <span className={cx(
            "inline-flex items-center gap-1 rounded-full border text-[11px] px-2 py-0.5 shrink-0",
            diff.color
          )}>
            {diff.icon} {diff.label}
          </span>

          <span className={cx(
            "inline-flex items-center gap-1 rounded-full border text-[11px] px-2 py-0.5 shrink-0",
            visibilityCfg.className
          )}>
            {visibilityCfg.icon} {visibilityCfg.label}
          </span>
        </div>

        {/* Main row: info + actions */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm sm:text-base text-slate-800 group-hover:text-slate-900 line-clamp-1 mb-1.5">
              {test?.test_title}
            </h3>

            <div className="flex flex-wrap items-center gap-1.5">
              <div className={cx("inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs border", theme.qBox)}>
                <Icon.Check className="h-3.5 w-3.5" />
                <span className="font-bold">{test?.total_questions || 0} câu</span>
              </div>

              <div className={cx("inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs border", theme.tBox)}>
                <Icon.Clock className="h-3.5 w-3.5" />
                <span className="font-bold">
                  {test?.time_limit_minutes ? `${test.time_limit_minutes} phút` : "Không giới hạn"}
                </span>
              </div>

              {test?.attempt_count > 0 && (
                <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs border bg-slate-100 border-slate-200 text-slate-700 font-semibold">
                  <Icon.Users className="h-3.5 w-3.5" />
                  <span>{test.attempt_count} lượt</span>
                </div>
              )}

              <span className="text-[11px] text-slate-400 hidden sm:inline">
                · <span className="font-semibold text-slate-600">{createdBy}</span>
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {onPreview && (
              <button
                onClick={(e) => { e.stopPropagation(); onPreview(test); }}
                className={cx(
                  "inline-flex items-center justify-center rounded-xl transition-all duration-200 text-xs px-3 py-2",
                  UNIFIED_PREVIEW_BTN
                )}
              >
                Xem trước
              </button>
            )}
            <Link
              to={toSettings}
              onClick={(e) => e.stopPropagation()}
              className={cx(
                "inline-flex items-center justify-center rounded-xl text-xs transition-all duration-200 px-3 py-2",
                cfg.btnPrimary
              )}
            >
              {cfg.action}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ======================================================
  // ================= CARD VIEW ==========================
  // ======================================================
  return (
    <div className="h-full">
      <div
        onClick={handleClick}
        className={cx(
          "group cursor-pointer rounded-2xl border bg-white",
          theme.cardBorder,
          "shadow-sm hover:shadow-lg hover:-translate-y-0.5",
          "transition-all duration-300 ease-out overflow-hidden h-full flex flex-col relative",
          className
        )}
      >
        {/* Colored header strip matching card's primary tone */}
        <div className={cx("h-1 w-full", theme.headerStrip)} />

        {/* Content */}
        <div className={cx("flex-1 flex flex-col relative", dense ? "p-3.5" : "p-4")}>

          {/* Type badge + Difficulty badge */}
          <div className="flex items-center justify-between mb-2.5">
            <span className={cx(
              "inline-flex items-center gap-1 rounded-full border text-[11px] px-2 py-0.5",
              theme.typeBadge
            )}>
              {safeTypeKey === "vocabulary" ? "📚" : "📝"}
              <span className="hidden sm:inline">{safeTypeKey === "vocabulary" ? "Từ vựng" : "Trắc nghiệm"}</span>
            </span>

            <span className={cx(
              "inline-flex items-center gap-1 rounded-full border text-[11px] px-2 py-0.5",
              diff.color
            )}>
              {diff.icon} {diff.label}
            </span>
          </div>

          {/* Title */}
          <h3 className={cx(
            "font-bold leading-tight line-clamp-2 text-slate-800 group-hover:text-slate-900 transition-colors",
            dense ? "text-sm min-h-[36px] mb-2" : "text-base min-h-[40px] mb-3"
          )}>
            {test?.test_title}
          </h3>

          {/* Description */}
          <div className={cx(dense ? "min-h-[24px] mb-2.5" : "min-h-[28px] mb-3")}>
            {test?.description ? (
              <p className={cx("text-slate-500 leading-relaxed line-clamp-2", dense ? "text-xs" : "text-sm")}>
                {test.description}
              </p>
            ) : (
              <p className={cx("text-slate-400 italic", dense ? "text-xs" : "text-sm")}>Chưa có mô tả</p>
            )}
          </div>

          {/* Stats — same color family as card */}
          <div className={cx("grid grid-cols-2 gap-1.5", dense ? "mb-2.5" : "mb-3")}>
            <div className={cx("rounded-lg px-2 py-1.5 border flex items-center gap-1.5", theme.qBox)}>
              <Icon.Check className="h-3 w-3 shrink-0" />
              <div>
                <div className={cx("font-extrabold leading-none", dense ? "text-sm" : "text-base")}>{test?.total_questions || 0}</div>
                <div className="text-[10px]">câu hỏi</div>
              </div>
            </div>

            <div className={cx("rounded-lg px-2 py-1.5 border flex items-center gap-1.5", theme.tBox)}>
              <Icon.Clock className="h-3 w-3 shrink-0" />
              <div>
                <div className={cx("font-extrabold leading-none", dense ? "text-sm" : "text-base")}>
                  {test?.time_limit_minutes || "∞"}
                </div>
                <div className="text-[10px]">{test?.time_limit_minutes ? "phút" : "không giới hạn"}</div>
              </div>
            </div>
          </div>

          {/* Topic */}
          <div className={cx(dense ? "mb-2" : "mb-2.5")}>
            <div
              className={cx(
                "px-2 py-1 rounded border",
                hasTopic ? theme.topicBox : "bg-transparent border-transparent"
              )}
            >
              <span
                className={cx("text-[10px] truncate block", theme.topicText, !hasTopic && "invisible")}
              >
                {test?.main_topic}
                {test?.sub_topic && ` · ${test.sub_topic}`}
              </span>
            </div>
          </div>

          {/* Footer row: attempt + creator + visibility */}
          <div className={cx("border-t flex items-center justify-between gap-2 flex-wrap", theme.divider, dense ? "pt-2 mb-2" : "pt-2 mb-2.5")}>
            <div className="flex items-center gap-1.5 min-w-0 min-h-[20px]">
              {test?.attempt_count > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded-full px-1.5 py-0.5">
                  🔥 {test.attempt_count} lượt
                </span>
              )}
              {createdBy && createdBy !== "Ẩn danh" && (
                <span className="text-[10px] text-slate-500 truncate">
                  {test?.attempt_count > 0 ? "" : ""}<span className="font-semibold text-slate-600">{createdBy}</span>
                </span>
              )}
            </div>
            <span className={cx(
              "inline-flex items-center gap-1 rounded-full border text-[10px] px-1.5 py-0.5 shrink-0",
              visibilityCfg.className
            )}>
              {visibilityCfg.icon} {visibilityCfg.label}
            </span>
          </div>

          {/* Action buttons */}
          <div className="mt-auto flex items-center gap-2">
            {onPreview && (
              <button
                onClick={(e) => { e.stopPropagation(); onPreview(test); }}
                className={cx(
                  "flex-1 flex items-center justify-center rounded-xl transition-all duration-200",
                  UNIFIED_PREVIEW_BTN,
                  dense ? "h-8 text-[11px]" : "h-9 text-xs"
                )}
              >
                Xem trước
              </button>
            )}
            <Link
              to={toSettings}
              onClick={(e) => e.stopPropagation()}
              className={cx(
                "flex-1 text-center transition-all duration-200 rounded-xl hover:scale-[1.02] active:scale-95",
                cfg.btnPrimary,
                dense ? "h-8 text-xs leading-8" : "h-10 text-sm leading-10"
              )}
            >
              {cfg.action}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestCard;
