import React from "react";

const cx = (...a) => a.filter(Boolean).join(" ");

const THEME = {
  vocabulary: {
    label: "Từ vựng",
    border: "border-blue-200",
    borderHover: "hover:border-blue-300",
    top: "bg-blue-500",
    pill: "bg-blue-50 text-blue-700",
    title: "text-slate-900",
    sub: "text-slate-600",
  },
  "multiple-choice": {
    label: "Trắc nghiệm",
    border: "border-emerald-200",
    borderHover: "hover:border-emerald-300",
    top: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-700",
    title: "text-slate-900",
    sub: "text-slate-600",
  },
};

export default function TestTopicCard({
  topic,
  mainTopic,
  testCount = 0,
  type = "vocabulary",
  onOpenModal,
  className = "",
}) {
  const title = (topic || mainTopic || "").trim();
  const safeType =
    type === "multiple-choice" || type === "multiple_choice"
      ? "multiple-choice"
      : "vocabulary";

  const t = THEME[safeType] || THEME.vocabulary;

  return (
    <button
      type="button"
      onClick={onOpenModal}
      className={cx(
        "group w-full text-left rounded-xl bg-white",
        "border transition",
        "hover:shadow-sm hover:-translate-y-[1px]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-black/10",
        t.border,
        t.borderHover,
        className
      )}
    >
      {/* Top bar (solid color) */}
      <div className={cx("h-1 rounded-t-xl", t.top)} />

      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className={cx("text-sm font-extrabold leading-snug line-clamp-2", t.title)}>
            {title || "(Chưa đặt tên)"}
          </h3>

          <span className={cx("shrink-0 px-2 py-0.5 rounded-md text-[10px] font-extrabold", t.pill)}>
            {t.label}
          </span>
        </div>

        <p className={cx("mt-1 text-xs font-semibold", t.sub)}>
          {testCount} Phân mục
        </p>
      </div>
    </button>
  );
}
