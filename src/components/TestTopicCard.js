import React, { useMemo, useState, useEffect } from "react";
import testService from "../services/testService";
import topicService from "../services/topicService";

const cx = (...a) => a.filter(Boolean).join(" ");

// Full pre-defined Tailwind classes — light vivid theme (white cards + vivid borders)
const THEMES = [
  {
    // Indigo / Violet
    bannerFrom: "from-indigo-500", bannerTo: "to-violet-600",
    cardBorder: "border-indigo-400", cardHoverBorder: "hover:border-indigo-600",
    cardHoverBg: "hover:bg-indigo-50",
    titleColor: "text-slate-900", statNum: "text-indigo-700",
    divider: "border-indigo-200", colDivider: "border-indigo-200",
    statLabel: "text-indigo-500", glow: "hover:shadow-indigo-300/70",
    badge: "bg-indigo-100 text-indigo-700 border-indigo-300 font-bold",
    viewsColor: "text-indigo-600",
  },
  {
    // Sky / Cyan
    bannerFrom: "from-sky-500", bannerTo: "to-cyan-600",
    cardBorder: "border-sky-400", cardHoverBorder: "hover:border-sky-600",
    cardHoverBg: "hover:bg-sky-50",
    titleColor: "text-slate-900", statNum: "text-sky-700",
    divider: "border-sky-200", colDivider: "border-sky-200",
    statLabel: "text-sky-500", glow: "hover:shadow-sky-300/70",
    badge: "bg-sky-100 text-sky-700 border-sky-300 font-bold",
    viewsColor: "text-sky-600",
  },
  {
    // Emerald / Teal
    bannerFrom: "from-emerald-500", bannerTo: "to-teal-600",
    cardBorder: "border-emerald-400", cardHoverBorder: "hover:border-emerald-600",
    cardHoverBg: "hover:bg-emerald-50",
    titleColor: "text-slate-900", statNum: "text-emerald-700",
    divider: "border-emerald-200", colDivider: "border-emerald-200",
    statLabel: "text-emerald-500", glow: "hover:shadow-emerald-300/70",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-300 font-bold",
    viewsColor: "text-emerald-600",
  },
  {
    // Rose / Pink
    bannerFrom: "from-rose-500", bannerTo: "to-pink-600",
    cardBorder: "border-rose-400", cardHoverBorder: "hover:border-rose-600",
    cardHoverBg: "hover:bg-rose-50",
    titleColor: "text-slate-900", statNum: "text-rose-700",
    divider: "border-rose-200", colDivider: "border-rose-200",
    statLabel: "text-rose-500", glow: "hover:shadow-rose-300/70",
    badge: "bg-rose-100 text-rose-700 border-rose-300 font-bold",
    viewsColor: "text-rose-600",
  },
  {
    // Amber / Orange
    bannerFrom: "from-amber-500", bannerTo: "to-orange-600",
    cardBorder: "border-amber-400", cardHoverBorder: "hover:border-amber-600",
    cardHoverBg: "hover:bg-amber-50",
    titleColor: "text-slate-900", statNum: "text-amber-700",
    divider: "border-amber-200", colDivider: "border-amber-200",
    statLabel: "text-amber-600", glow: "hover:shadow-amber-300/70",
    badge: "bg-amber-100 text-amber-700 border-amber-300 font-bold",
    viewsColor: "text-amber-600",
  },
  {
    // Violet / Purple
    bannerFrom: "from-violet-500", bannerTo: "to-purple-600",
    cardBorder: "border-violet-400", cardHoverBorder: "hover:border-violet-600",
    cardHoverBg: "hover:bg-violet-50",
    titleColor: "text-slate-900", statNum: "text-violet-700",
    divider: "border-violet-200", colDivider: "border-violet-200",
    statLabel: "text-violet-500", glow: "hover:shadow-violet-300/70",
    badge: "bg-violet-100 text-violet-700 border-violet-300 font-bold",
    viewsColor: "text-violet-600",
  },
  {
    // Blue / Indigo
    bannerFrom: "from-blue-500", bannerTo: "to-indigo-600",
    cardBorder: "border-blue-400", cardHoverBorder: "hover:border-blue-600",
    cardHoverBg: "hover:bg-blue-50",
    titleColor: "text-slate-900", statNum: "text-blue-700",
    divider: "border-blue-200", colDivider: "border-blue-200",
    statLabel: "text-blue-500", glow: "hover:shadow-blue-300/70",
    badge: "bg-blue-100 text-blue-700 border-blue-300 font-bold",
    viewsColor: "text-blue-600",
  },
  {
    // Fuchsia / Pink
    bannerFrom: "from-fuchsia-500", bannerTo: "to-pink-600",
    cardBorder: "border-fuchsia-400", cardHoverBorder: "hover:border-fuchsia-600",
    cardHoverBg: "hover:bg-fuchsia-50",
    titleColor: "text-slate-900", statNum: "text-fuchsia-700",
    divider: "border-fuchsia-200", colDivider: "border-fuchsia-200",
    statLabel: "text-fuchsia-500", glow: "hover:shadow-fuchsia-300/70",
    badge: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300 font-bold",
    viewsColor: "text-fuchsia-600",
  },
  {
    // Lime / Green
    bannerFrom: "from-lime-500", bannerTo: "to-green-600",
    cardBorder: "border-lime-500", cardHoverBorder: "hover:border-lime-700",
    cardHoverBg: "hover:bg-lime-50",
    titleColor: "text-slate-900", statNum: "text-lime-700",
    divider: "border-lime-300", colDivider: "border-lime-300",
    statLabel: "text-lime-600", glow: "hover:shadow-lime-300/70",
    badge: "bg-lime-100 text-lime-700 border-lime-300 font-bold",
    viewsColor: "text-lime-700",
  },
  {
    // Cyan / Blue
    bannerFrom: "from-cyan-500", bannerTo: "to-blue-600",
    cardBorder: "border-cyan-400", cardHoverBorder: "hover:border-cyan-600",
    cardHoverBg: "hover:bg-cyan-50",
    titleColor: "text-slate-900", statNum: "text-cyan-700",
    divider: "border-cyan-200", colDivider: "border-cyan-200",
    statLabel: "text-cyan-600", glow: "hover:shadow-cyan-300/70",
    badge: "bg-cyan-100 text-cyan-700 border-cyan-300 font-bold",
    viewsColor: "text-cyan-600",
  },
  {
    // Orange / Red
    bannerFrom: "from-orange-500", bannerTo: "to-red-600",
    cardBorder: "border-orange-400", cardHoverBorder: "hover:border-orange-600",
    cardHoverBg: "hover:bg-orange-50",
    titleColor: "text-slate-900", statNum: "text-orange-700",
    divider: "border-orange-200", colDivider: "border-orange-200",
    statLabel: "text-orange-600", glow: "hover:shadow-orange-300/70",
    badge: "bg-orange-100 text-orange-700 border-orange-300 font-bold",
    viewsColor: "text-orange-600",
  },
  {
    // Pink / Rose
    bannerFrom: "from-pink-500", bannerTo: "to-rose-600",
    cardBorder: "border-pink-400", cardHoverBorder: "hover:border-pink-600",
    cardHoverBg: "hover:bg-pink-50",
    titleColor: "text-slate-900", statNum: "text-pink-700",
    divider: "border-pink-200", colDivider: "border-pink-200",
    statLabel: "text-pink-500", glow: "hover:shadow-pink-300/70",
    badge: "bg-pink-100 text-pink-700 border-pink-300 font-bold",
    viewsColor: "text-pink-600",
  },
];

const TYPE_ICONS = {
  vocabulary: "📚",
  "multiple-choice": "🎯",
  multiple_choice: "🎯",
  grammar: "✏️",
  listening: "🎧",
  spelling: "🔤",
};

const TYPE_LABELS = {
  vocabulary: "Từ vựng",
  "multiple-choice": "Trắc nghiệm",
  multiple_choice: "Trắc nghiệm",
  grammar: "Ngữ pháp",
  listening: "Nghe",
  spelling: "Chính tả",
};

export default function TestTopicCard({
  topic,
  mainTopic,
  testCount = 0,
  total_questions = 0,
  subTopicCount = 0,
  type = "vocabulary",
  types = [],
  onOpenModal,
  className = "",
  views = 0,
  avatar_url = null,
  active = true,
  total_tests = 0,
  vocabulary_tests = 0,
  multiple_choice_tests = 0,
  grammar_tests = 0,
  topic_views = 0,
  subtopic_views = 0,
  total_views = 0,
}) {
  const title = (topic || mainTopic || "").trim();

  const [attemptCount, setAttemptCount] = useState(0);
  const [currentViews, setCurrentViews] = useState(total_views || views);
  const [imageError, setImageError] = useState(false);

  const theme = useMemo(() => {
    const idx = title.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % THEMES.length;
    return THEMES[idx];
  }, [title]);

  useEffect(() => {
    if (!title) return;
    const fetch = async () => {
      try {
        const data = await testService.getTopicAttemptCount(title, type);
        setAttemptCount(data?.attempt_count || 0);
      } catch {
        setAttemptCount(0);
      }
    };
    fetch();
  }, [title, type]);

  const handleCardClick = async () => {
    try {
      await topicService.incrementTopicViews(title, type);
      setCurrentViews((prev) => prev + 1);
    } catch {}
    onOpenModal?.();
  };

  useEffect(() => {
    setImageError(false);
  }, [avatar_url]);

  const displayTests = total_tests || testCount;

  return (
    <button
      type="button"
      onClick={handleCardClick}
      className={cx(
        "group w-full h-full text-left overflow-hidden relative flex flex-col",
        "rounded-2xl border-[3px] bg-white transition-all duration-300 ease-out",
        "hover:-translate-y-2 hover:shadow-2xl",
        theme.cardBorder,
        theme.cardHoverBorder, theme.cardHoverBg,
        theme.glow,
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60",
        className
      )}
      aria-disabled={!active}
    >
      {/* ── Banner image / gradient ── */}
      <div className="relative w-full aspect-[16/9] overflow-hidden flex-shrink-0">
        {avatar_url && !imageError ? (
          <>
            <img
              src={avatar_url}
              alt={title}
              className="w-full h-full object-cover block transition-transform duration-500 group-hover:scale-110"
              onError={() => setImageError(true)}
              loading="lazy"
            />
            {/* Color tint overlay on hover */}
            <div className={cx(
              "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-20 transition-opacity duration-300",
              theme.bannerFrom, theme.bannerTo
            )} />
          </>
        ) : (
          <div className={cx(
            "w-full h-full flex items-center justify-center bg-gradient-to-br relative overflow-hidden",
            theme.bannerFrom, theme.bannerTo
          )}>
            {/* Pattern dots */}
            <div className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
                backgroundSize: "20px 20px"
              }}
            />
            {/* Big initial letter */}
            <span className="relative z-10 text-6xl font-black leading-none text-white/80 select-none drop-shadow-lg">
              {title?.charAt(0)?.toUpperCase() || "?"}
            </span>
          </div>
        )}

        {/* Bottom gradient fade into white card bg */}
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white/80 to-transparent" />

        {/* 🔥 Hot badge */}
        {attemptCount > 0 && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500 shadow-lg shadow-orange-500/40">
            <span className="text-[9px]">🔥</span>
            <span className="text-[9px] font-black text-white">{attemptCount}</span>
          </div>
        )}

        {/* 👁 Views */}
        {currentViews > 0 && (
          <div className="absolute bottom-1.5 right-2 flex items-center gap-1 text-white drop-shadow">
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span className="text-[9px] font-bold">{currentViews.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* ── Card body ── */}
      <div className="flex-1 flex flex-col px-3 pt-2.5 pb-3 gap-2">
        {/* Title */}
        <h3 className={cx(
          "font-bold text-sm leading-snug line-clamp-2 transition-colors duration-200 group-hover:brightness-125",
          theme.titleColor
        )}>
          {title || "(Chưa đặt tên)"}
        </h3>

        {/* Type badges */}
        {types && types.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {types.map((t) => (
              <span
                key={t}
                className={cx(
                  "text-[9px] font-bold px-1.5 py-0.5 rounded-full border",
                  theme.badge
                )}
              >
                {TYPE_ICONS[t] || "📋"} {TYPE_LABELS[t] || t}
              </span>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className={cx("mt-auto pt-2 border-t grid grid-cols-3 gap-1 text-center", theme.divider)}>
          <div className="flex flex-col items-center py-1">
            <span className={cx("text-sm font-black leading-none", theme.statNum)}>{displayTests}</span>
            <span className={cx("text-[9px] font-medium mt-0.5", theme.statLabel)}>bài test</span>
          </div>
          <div className={cx("flex flex-col items-center py-1 border-x", theme.colDivider)}>
            <span className={cx("text-sm font-black leading-none", theme.statNum)}>{subTopicCount}</span>
            <span className={cx("text-[9px] font-medium mt-0.5", theme.statLabel)}>chủ đề con</span>
          </div>
          <div className="flex flex-col items-center py-1">
            <span className={cx("text-sm font-black leading-none", theme.statNum)}>{total_questions}</span>
            <span className={cx("text-[9px] font-medium mt-0.5", theme.statLabel)}>câu hỏi</span>
          </div>
        </div>
      </div>
    </button>
  );
}
