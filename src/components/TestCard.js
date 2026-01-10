import React from "react";
import { Link, useNavigate } from "react-router-dom";

// ================= Utils =================
const cx = (...a) => a.filter(Boolean).join(" ");

// ================= Color Variants =================
// Only 2 colors: one for vocabulary, one for multiple-choice
const COLOR_VARIANTS = {
  vocabulary: {
    badgeColor: "bg-gradient-to-r from-cyan-500 to-sky-600 text-white border-cyan-600",
    topicBox: "bg-gradient-to-r from-cyan-50 to-sky-50 border-cyan-200/60",
    topicText: "text-cyan-800",
  },
  "multiple-choice": {
    badgeColor: "bg-gradient-to-r from-teal-500 to-cyan-600 text-white border-teal-600",
    topicBox: "bg-gradient-to-r from-teal-50 to-cyan-50 border-teal-200/60",
    topicText: "text-teal-800",
  },
};

// ================= Config =================
const TYPE = {
  vocabulary: {
    route: "/vocabulary/test",
    action: "Làm bài",
    header: "bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600",
    headerAccent: "from-emerald-400/20 to-teal-600/20",
    btnSoft: "border-emerald-200/60 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300",
    iconBox: "bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-600 border-emerald-200/50",
  },
  "multiple-choice": {
    route: "/multiple-choice/test",
    action: "Làm bài",
    header: "bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600",
    headerAccent: "from-violet-400/20 to-indigo-600/20",
    btnSoft: "border-violet-200/60 text-violet-700 hover:bg-violet-50 hover:border-violet-300",
    iconBox: "bg-gradient-to-br from-violet-50 to-purple-50 text-violet-600 border-violet-200/50",
  },
  multiple_choice: {
    route: "/multiple-choice/test",
    action: "Làm bài",
    header: "bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600",
    headerAccent: "from-violet-400/20 to-indigo-600/20",
    btnSoft: "border-violet-200/60 text-violet-700 hover:bg-violet-50 hover:border-violet-300",
    iconBox: "bg-gradient-to-br from-violet-50 to-purple-50 text-violet-600 border-violet-200/50",
  },
};

// Unified button color for all test types
const UNIFIED_BTN_COLOR = "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30";

const DIFFICULTY = {
  easy: { 
    label: "Dễ", 
    color: "text-white bg-gradient-to-r from-emerald-500 to-emerald-600 border-emerald-700 shadow-sm",
    icon: "🟢"
  },
  medium: { 
    label: "Trung bình", 
    color: "text-white bg-gradient-to-r from-amber-500 to-amber-600 border-amber-700 shadow-sm",
    icon: "🟡"
  },
  hard: { 
    label: "Khó", 
    color: "text-white bg-gradient-to-r from-rose-500 to-rose-600 border-rose-700 shadow-sm",
    icon: "🔴"
  },
};

const VISIBILITY = {
  public: { 
    label: "Công khai", 
    className: "text-white bg-gradient-to-r from-cyan-500 to-blue-600 border-cyan-700 shadow-sm",
    icon: "🌐"
  },
  private: { 
    label: "Riêng tư", 
    className: "text-white bg-gradient-to-r from-slate-500 to-slate-600 border-slate-700 shadow-sm",
    icon: "🔒"
  },
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
  
  // Get color variant - only 2 colors: one for vocabulary, one for multiple-choice
  const colorVariant = COLOR_VARIANTS[safeTypeKey] || COLOR_VARIANTS.vocabulary;
  
  // Fixed colors for elements that don't vary
  const attemptBoxColor = "bg-gradient-to-r from-orange-500 to-amber-600 border-orange-700";

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
          "group cursor-pointer rounded-2xl border border-slate-200/60 bg-white backdrop-blur-sm",
          "shadow-lg shadow-slate-200/40 hover:shadow-xl hover:shadow-slate-300/30",
          "hover:-translate-y-1 hover:scale-[1.02] hover:border-slate-300/60",
          "transition-all duration-300 ease-out",
          "relative overflow-hidden",
          dense ? "p-4" : "p-5",
          className
        )}
      >
        {/* Subtle gradient background */}
        <div className={cx(
          "absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300",
          cfg.headerAccent
        )} />
        
        <div className={cx("relative flex items-center gap-4", dense ? "gap-3" : "gap-5")}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className={cx("font-bold text-slate-900 truncate group-hover:text-slate-700", dense ? "text-base" : "text-lg")}>
                {test?.test_title}
              </h3>

              <span className={cx("inline-flex items-center font-semibold rounded-full border transition-all duration-200 whitespace-nowrap", dense ? "px-2.5 py-1 text-xs gap-1" : "px-3 py-1.5 text-xs gap-1.5", diff.color)}>
                <span>{diff.icon}</span>
                {diff.label}
              </span>

              <span className={cx("inline-flex items-center rounded-full font-medium border transition-all duration-200 whitespace-nowrap", dense ? "px-2.5 py-1 text-xs gap-1" : "px-3 py-1.5 text-xs gap-1.5", visibilityCfg.className)}>
                <span>{visibilityCfg.icon}</span>
                {visibilityCfg.label}
              </span>
            </div>

            <div className={cx("flex items-center flex-wrap text-slate-600 group-hover:text-slate-500", dense ? "gap-x-4 gap-y-2 text-sm" : "gap-x-5 gap-y-2 text-sm")}>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-200 bg-white">
                <Icon.Check className={cx(dense ? "h-4 w-4" : "h-4 w-4", "text-slate-700")} />
                <span className="font-medium text-slate-900">{test?.total_questions || 0} câu hỏi</span>
              </div>

              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-200 bg-white">
                <Icon.Clock className={cx(dense ? "h-4 w-4" : "h-4 w-4", "text-slate-700")} />
                <span className="font-medium text-slate-900">{test?.time_limit_minutes ? `${test.time_limit_minutes} phút` : "Không giới hạn"}</span>
              </div>

              {test?.attempt_count > 0 && (
                <div className={cx(
                  "flex items-center gap-1.5 px-2 py-1 rounded-lg",
                  attemptBoxColor
                )}>
                  <Icon.Users className={cx(dense ? "h-4 w-4" : "h-4 w-4", "text-white")} />
                  <span className="font-medium text-white">{test.attempt_count} lượt thực hiện</span>
                </div>
              )}

              <div className="text-slate-500 ml-auto">
                Tạo bởi <span className="font-semibold text-slate-700">{createdBy}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 shrink-0">
            {onPreview && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview(test);
                }}
                className={cx(
                  "inline-flex items-center justify-center rounded-xl border border-slate-700 text-white bg-slate-600",
                  "hover:bg-slate-700 hover:border-slate-800 transition-all duration-300 font-medium",
                  dense ? "px-4 py-2 text-xs" : "px-4 py-2 text-sm"
                )}
              >
                Xem trước
              </button>
            )}
            <Link
              to={toSettings}
              onClick={(e) => e.stopPropagation()}
              className={cx(
                "rounded-xl transition-all duration-300 font-semibold text-center transform hover:scale-105 active:scale-95",
                UNIFIED_BTN_COLOR,
                dense ? "px-5 py-2.5 text-sm" : "px-6 py-3 text-sm"
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
          "group cursor-pointer bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60",
          "shadow-lg shadow-slate-200/40 hover:shadow-xl hover:shadow-slate-300/50",
          "hover:-translate-y-2 hover:scale-[1.03] hover:border-slate-300/60",
          "transition-all duration-500 ease-out overflow-hidden h-full flex flex-col relative",
          className
        )}
      >

        {/* Content */}
        <div className={cx("flex-1 flex flex-col relative", dense ? "p-3 pt-6" : "p-4 pt-8")}>
          {/* Type & Badges Row - Divided evenly */}
          <div className="flex items-center justify-between mb-3">
            <span className={cx("inline-flex items-center gap-1.5 rounded-full font-bold border shadow-sm whitespace-nowrap", dense ? "px-2 py-1 text-xs" : "px-2.5 py-1 text-xs", colorVariant.badgeColor)}>
              {safeTypeKey === 'vocabulary' ? '📚' : '📝'} 
              <span className="hidden sm:inline">{safeTypeKey === 'vocabulary' ? 'Từ vựng' : 'Trắc nghiệm'}</span>
            </span>
            
            <span className={cx("inline-flex items-center gap-1 rounded-full font-bold border whitespace-nowrap", dense ? "px-2 py-1 text-xs" : "px-2.5 py-1 text-xs", diff.color)}>
              {diff.icon} <span className="hidden xs:inline">{diff.label}</span>
            </span>
          </div>

          {/* Title */}
          <h3 className={cx(
            "font-bold text-slate-900 leading-tight line-clamp-2 group-hover:text-slate-700 transition-colors duration-300", 
            dense ? "text-sm min-h-[36px] mb-2" : "text-base min-h-[40px] mb-3"
          )}>
            {test?.test_title}
          </h3>

          {/* Description */}
          <div className={cx(dense ? "min-h-[28px] mb-3" : "min-h-[32px] mb-4")}>
            {test?.description ? (
              <p className={cx("text-slate-600 leading-relaxed line-clamp-2 group-hover:text-slate-500 transition-colors duration-300", dense ? "text-xs" : "text-sm")}>
                {test.description}
              </p>
            ) : (
              <p className={cx("text-slate-400 italic", dense ? "text-xs" : "text-sm")}>Chưa có mô tả</p>
            )}
          </div>

          {/* Compact Stats Grid */}
          <div className={cx("grid grid-cols-2 gap-2", dense ? "mb-3" : "mb-4")}>
            <div className="rounded-lg p-2 border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-1.5">
                <Icon.Check className="h-3 w-3 text-slate-700" />
                <div>
                  <div className={cx("font-bold text-slate-900", dense ? "text-sm" : "text-base")}>{test?.total_questions || 0}</div>
                  <div className="text-[10px] font-medium text-slate-600">câu hỏi</div>
                </div>
              </div>
            </div>

            <div className="rounded-lg p-2 border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-1.5">
                <Icon.Clock className="h-3 w-3 text-slate-700" />
                <div>
                  <div className={cx("font-bold text-slate-900", dense ? "text-sm" : "text-base")}>{test?.time_limit_minutes || 0}</div>
                  <div className="text-[10px] font-medium text-slate-600">{test?.time_limit_minutes ? 'phút' : 'không giới hạn'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Topic Tags */}
          {(test?.main_topic || test?.sub_topic) && (
            <div className={cx(dense ? "mb-2" : "mb-3")}>
              <div className={cx(
                "flex items-center gap-1.5 p-1.5 rounded border",
                colorVariant.topicBox
              )}>
                <span className={cx(
                  "text-[10px] font-medium truncate",
                  colorVariant.topicText
                )}>
                  {test?.main_topic}
                  {test?.sub_topic && ` • ${test.sub_topic}`}
                </span>
              </div>
            </div>
          )}

          {/* Attempt Count Badge */}
          {test?.attempt_count > 0 && (
            <div className={cx(dense ? "mb-2" : "mb-3")}>
              <div className={cx(
                "inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border shadow-sm",
                attemptBoxColor
              )}>
                <Icon.Users className="h-3 w-3 text-white" />
                <span className="text-xs font-bold text-white">
                  🔥 {test.attempt_count}
                </span>
              </div>
            </div>
          )}

          {/* Visibility Mode */}
          <div className={cx("border-t border-slate-200/60 flex items-center justify-between text-slate-500", dense ? "pt-2 mb-2" : "pt-2 mb-2")}>
            <span className="text-[10px] font-medium text-slate-600">Chế độ hiển thị:</span>
            <span className={cx("inline-flex items-center gap-1 rounded-full font-medium border whitespace-nowrap", dense ? "px-2 py-0.5 text-[10px]" : "px-2 py-1 text-xs", visibilityCfg.className)}>
              {visibilityCfg.icon} {visibilityCfg.label}
            </span>
          </div>

          {/* Creator Info */}
          {createdBy && createdBy !== 'Ẩn danh' && (
            <div className={cx("flex items-center gap-1.5 text-slate-500", dense ? "mb-2" : "mb-3")}>
              <div className={cx("rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300/50 flex items-center justify-center shadow-sm", dense ? "w-4 h-4" : "w-5 h-5")}>
                <span className={cx("font-bold text-slate-700", dense ? "text-[8px]" : "text-[10px]")}>  
                  {createdBy?.charAt(0)?.toUpperCase() || "A"}
                </span>
              </div>
              <span className="text-[10px]">
                Được tạo bởi <span className="font-semibold text-slate-700">{createdBy}</span>
              </span>
            </div>
          )}

          {/* Compact Action Button */}
          <div className="mt-auto flex items-center gap-2">
            {onPreview && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview(test);
                }}
                className={cx(
                  "flex-1 items-center justify-center rounded-lg border border-slate-700 text-white bg-slate-600",
                  "hover:bg-slate-700 hover:border-slate-800 transition-all duration-300 font-medium flex",
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
                "flex-1 text-center font-bold transition-all duration-300 rounded-lg",
                "transform hover:scale-[1.02] active:scale-95",
                UNIFIED_BTN_COLOR,
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
