import React from "react";
import { Link } from "react-router-dom";

// ================= Utils =================
const cx = (...a) => a.filter(Boolean).join(" ");

// ================= Header Color Palette =================
const HEADER_COLORS = [
  "bg-gradient-to-r from-sky-600 to-sky-700",
  "bg-gradient-to-r from-teal-600 to-teal-700",
  "bg-gradient-to-r from-cyan-600 to-cyan-700",
  "bg-gradient-to-r from-blue-600 to-blue-700",
  "bg-gradient-to-r from-indigo-600 to-indigo-700",
  "bg-gradient-to-r from-violet-600 to-violet-700",
  "bg-gradient-to-r from-fuchsia-600 to-fuchsia-700",
  "bg-gradient-to-r from-pink-600 to-pink-700",
  "bg-gradient-to-r from-rose-600 to-rose-700",
  "bg-gradient-to-r from-emerald-600 to-emerald-700",
];

// ================= Config =================
const TYPE = {
  vocabulary: {
    route: "/vocabulary/test",
    action: "Bắt đầu học",
    btn: "bg-indigo-600 hover:bg-indigo-700 text-white",
    btnSoft: "border-indigo-200 text-indigo-700 hover:bg-indigo-50",
    iconBox: "bg-indigo-50 text-indigo-600",
  },
  "multiple-choice": {
    route: "/multiple-choice/test",
    action: "Làm bài",
    btn: "bg-violet-600 hover:bg-violet-700 text-white",
    btnSoft: "border-violet-200 text-violet-700 hover:bg-violet-50",
    iconBox: "bg-violet-50 text-violet-600",
  },
  multiple_choice: {
    route: "/multiple-choice/test",
    action: "Làm bài",
    btn: "bg-violet-600 hover:bg-violet-700 text-white",
    btnSoft: "border-violet-200 text-violet-700 hover:bg-violet-50",
    iconBox: "bg-violet-50 text-violet-600",
  },
};

const DIFFICULTY = {
  easy: {
    label: "Dễ",
    color: "text-emerald-600 bg-emerald-50 border-emerald-100",
  },
  medium: {
    label: "Trung bình",
    color: "text-amber-600 bg-amber-50 border-amber-100",
  },
  hard: {
    label: "Khó",
    color: "text-rose-600 bg-rose-50 border-rose-100",
  },
};

// ================= Visibility Badge =================
const VISIBILITY = {
  public: {
    label: "Công khai",
    className: "text-sky-700 bg-sky-50 border border-sky-100",
  },
  private: {
    label: "Riêng tư",
    className: "text-slate-600 bg-slate-100 border border-slate-200",
  },
};

// ================= Icons (LIST VIEW) =================
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
};

// ================= Component =================
const TestCard = ({
  test,
  type = "vocabulary",
  viewMode = "card",
  onPreviewVocabulary,
  className = "",
}) => {
  const testId = test?._id || test?.id || test?.test_id;
  const createdBy = test?.created_by_full_name || "Ẩn danh";
  const visibilityKey = test?.visibility || "private";
  const visibilityCfg = VISIBILITY[visibilityKey] || VISIBILITY.private;

  const safeTypeKey =
    type === "multiple-choice" || type === "multiple_choice"
      ? "multiple-choice"
      : "vocabulary";

  const cfg = TYPE[safeTypeKey] || TYPE.vocabulary;
  const diff = DIFFICULTY[test?.difficulty] || DIFFICULTY.medium;
  const toSettings = `${cfg.route}/${testId}/settings`;
  const HeaderIcon = safeTypeKey === "vocabulary" ? Icon.Book : Icon.Check;

  const colorIndex =
    String(testId || "")
      .split("")
      .reduce((s, c) => s + c.charCodeAt(0), 0) %
    HEADER_COLORS.length;

  const headerColor = HEADER_COLORS[colorIndex];

  // ======================================================
  // ================= LIST VIEW ==========================
  // ======================================================
  if (viewMode === "list") {
    return (
      <div
        className={cx(
          "group rounded-xl border border-slate-200 bg-white p-3 hover:border-slate-300 hover:shadow-md transition",
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cx(
              "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
              cfg.iconBox
            )}
          >
            <HeaderIcon className="h-5 w-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800 truncate">
                {test?.test_title}
              </h3>
              <span
                className={cx(
                  "px-1.5 py-0.5 text-[10px] font-semibold rounded border",
                  diff.color
                )}
              >
                {diff.label}
              </span>
            </div>

            {/* Created by + Visibility */}
            <div className="flex items-center gap-2 text-[11px] text-slate-400 truncate">
              <span>
                Tạo bởi{" "}
                <span className="font-medium text-slate-500">{createdBy}</span>
              </span>
              <span
                className={cx(
                  "px-1.5 py-0.5 rounded text-[10px] font-semibold",
                  visibilityCfg.className
                )}
              >
                {visibilityCfg.label}
              </span>
            </div>

            <div className="flex gap-3 text-xs text-slate-500 mt-0.5">
              <span>{test?.total_questions || 0} câu</span>
              {test?.time_limit_minutes && (
                <span>{test.time_limit_minutes} phút</span>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {safeTypeKey === "vocabulary" && (
              <button
                onClick={() => onPreviewVocabulary?.(test)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50"
              >
                Xem
              </button>
            )}
            <Link
              to={toSettings}
              className={cx(
                "px-3 py-1.5 text-xs font-semibold rounded-lg",
                cfg.btn
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
    <div
      className={cx(
        "flex flex-col h-full rounded-2xl border border-slate-200 bg-white overflow-hidden hover:-translate-y-1 hover:shadow-lg transition",
        className
      )}
    >
      {/* Header */}
      <div className={cx("px-4 py-3", headerColor)}>
        <h3 className="text-white font-bold text-sm leading-snug line-clamp-2">
          {test?.test_title}
        </h3>

        {(test?.main_topic || test?.sub_topic) && (
          <div className="mt-0.5 text-[11px] text-white/80 truncate">
            {test?.main_topic}
            {test?.sub_topic && (
              <>
                <span className="mx-1">•</span>
                {test.sub_topic}
              </>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-4">
        <div className="flex justify-between items-center mb-1">
          <span
            className={cx(
              "px-2 py-0.5 text-[10px] font-bold uppercase border rounded",
              diff.color
            )}
          >
            {diff.label}
          </span>
          <span className="text-[10px] text-slate-300 font-mono">
            #{String(testId || "").slice(-4)}
          </span>
        </div>

        <p className="text-xs text-slate-500 line-clamp-3 mb-2">
          {test?.description || "Không có mô tả chi tiết."}
        </p>

        <div className="mt-auto grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase">
              Số lượng
            </span>
            <div className="text-xs font-bold text-slate-700">
                   {test?.total_questions || 0} câu
            </div>
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase">
              Thời gian
            </span>
            <div className="text-xs font-bold text-slate-700">
              {test?.time_limit_minutes
                ? `${test.time_limit_minutes} phút`
                : "Tự do"}
            </div>
          </div>
        </div>

        {/* Created by + Visibility */}
        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-3 truncate">
          <span>
            Tạo bởi{" "}
            <span className="font-medium text-slate-500">{createdBy}</span>
          </span>
          <span
            className={cx(
              "px-1.5 py-0.5 rounded text-[10px] font-semibold",
              visibilityCfg.className
            )}
          >
            {visibilityCfg.label}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 pt-0 flex gap-2">
        {safeTypeKey === "vocabulary" && (
          <button
            onClick={() => onPreviewVocabulary?.(test)}
            className={cx(
              "flex-1 px-3 py-2 text-xs font-bold rounded-lg border",
              cfg.btnSoft
            )}
          >
            Xem trước
          </button>
        )}
        <Link
          to={toSettings}
          className={cx(
            "flex-[2] px-3 py-2 text-xs font-bold rounded-lg text-center",
            cfg.btn
          )}
        >
          {cfg.action}
        </Link>
      </div>
    </div>
  );
};

export default TestCard;

// ================= Shortcuts =================
export const VocabularyTestCard = (props) => (
  <TestCard {...props} type="vocabulary" />
);

export const MCPTestCard = (props) => (
  <TestCard {...props} type="multiple-choice" />
);
