import React, { useMemo, useState, useEffect } from "react";
import testService from "../services/testService";
import topicService from "../services/topicService";

const cx = (...a) => a.filter(Boolean).join(" ");

const ACCENTS = [
  "from-blue-500 via-indigo-500 to-purple-600",
  "from-emerald-500 via-teal-500 to-cyan-600",
  "from-violet-500 via-purple-500 to-pink-600",
  "from-amber-500 via-orange-500 to-red-600",
  "from-rose-500 via-pink-500 to-fuchsia-600",
  "from-teal-500 via-cyan-500 to-blue-600",
  "from-lime-500 via-green-500 to-emerald-600",
  "from-indigo-500 via-blue-500 to-cyan-600",
  "from-purple-500 via-violet-500 to-indigo-600",
  "from-orange-500 via-amber-500 to-yellow-600",
];

const CARD_COLORS = [
  { bg: "from-blue-50/90 via-indigo-50/80 to-purple-50/90" },
  { bg: "from-emerald-50/90 via-teal-50/80 to-cyan-50/90" },
  { bg: "from-violet-50/90 via-purple-50/80 to-pink-50/90" },
  { bg: "from-amber-50/90 via-orange-50/80 to-red-50/90" },
  { bg: "from-rose-50/90 via-pink-50/80 to-fuchsia-50/90" },
];

const pickEmoji = (title = "") => {
  const t = title.toLowerCase();
  if (t.includes("cloud")) return "☁️";
  if (t.includes("dsa") || t.includes("data")) return "🧩";
  if (t.includes("erp")) return "📦";
  if (t.includes("oop")) return "🧠";
  if (t.includes("ai")) return "🤖";
  return "📚";
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
  // ✅ Enhanced BE fields from topic API
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

  const accent = useMemo(() => {
    const s = String(title || "");
    const idx =
      s.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0) %
      ACCENTS.length;
    return ACCENTS[idx];
  }, [title]);

  const cardColor = useMemo(() => {
    const s = String(title || "");
    const idx =
      s.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0) %
      CARD_COLORS.length;
    return CARD_COLORS[idx];
  }, [title]);

  const emoji = useMemo(() => pickEmoji(title), [title]);

  // Fetch attempt count for this topic
  useEffect(() => {
    if (!title) return;

    const fetchAttemptCount = async () => {
      try {
        const data = await testService.getTopicAttemptCount(title, type);
        setAttemptCount(data?.attempt_count || 0);
      } catch (error) {
        console.error("Failed to fetch topic attempt count:", error);
        setAttemptCount(0);
      }
    };

    fetchAttemptCount();
  }, [title, type]);

  // Handle click to increment views
  const handleCardClick = async () => {
    try {
      await topicService.incrementTopicViews(title, type);
      setCurrentViews((prev) => prev + 1);
    } catch (error) {
      console.error("Failed to increment topic views:", error);
    }

    onOpenModal?.();
  };

  useEffect(() => {
    setImageError(false);
  }, [avatar_url]);

  return (
    <button
      type="button"
      onClick={handleCardClick}
      className={cx(
        "group w-full h-full text-left overflow-hidden relative",
        "rounded-xl transition-all duration-500 ease-out transform-gpu",
        "hover:-translate-y-2 hover:scale-[1.03] active:scale-[0.97]",
        "focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 focus-visible:ring-offset-2",
        "bg-white/95 shadow-xl hover:shadow-2xl",
        "border border-slate-100/60 hover:border-slate-200/80",
        "flex flex-col",
        className
      )}
      style={{
        background: `linear-gradient(135deg, ${cardColor.bg.replace(
          "bg-gradient-to-br ",
          ""
        )} 0%, rgba(255,255,255,0.9) 100%)`,
        backdropFilter: "blur(20px) saturate(180%)",
      }}
      aria-disabled={!active}
    >
      {/* Content section */}
      <div className="p-3 flex-1 flex flex-col min-h-0">
        {/* Title section - Flexible height */}
        <div className="flex-1 flex flex-col min-h-0 space-y-2 mb-2">
          <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-200/60">
            <h3 className="font-black text-base text-slate-900 leading-tight group-hover:text-slate-700 transition-colors duration-300 break-words flex-1">
              {title || "(Chưa đặt tên)"}
            </h3>

            {attemptCount > 0 && (
              <div className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 bg-orange-100 rounded-full border border-orange-200">
                <span className="text-orange-500 text-[10px]">🔥</span>
                <span className="text-[9px] font-black text-orange-800">
                  {attemptCount}
                </span>
              </div>
            )}
          </div>

          {/* Test Types */}
          {types && types.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {types.map((testType) => (
                <div 
                  key={testType}
                  className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${
                    testType === 'vocabulary' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : testType === 'multiple_choice'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : testType === 'grammar'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : testType === 'listening'
                      ? 'bg-orange-50 text-orange-700 border-orange-200'
                      : testType === 'spelling'
                      ? 'bg-pink-50 text-pink-700 border-pink-200'
                      : 'bg-gray-50 text-gray-700 border-gray-200'
                  }`}
                >
                  {testType === 'vocabulary' ? '📚 Từ vựng' : 
                   testType === 'multiple_choice' ? '🎯 Trắc nghiệm' :
                   testType === 'grammar' ? '📝 Ngữ pháp' :
                   testType === 'listening' ? '🎧 Nghe' :
                   testType === 'spelling' ? '✍️ Chính tả' : 
                   `📋 ${testType}`}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats section - Fixed position from bottom, cách đều với avatar */}
        <div className="pt-2 border-t border-slate-200/60 mt-auto">
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-slate-600 font-medium w-full">
            {/* Row 1 */}
            <div className="flex items-center gap-1 min-h-[16px]">
              <span className="font-semibold">
                {subTopicCount} chủ đề con
              </span>
            </div>
            <div className="flex items-center gap-1 min-h-[16px]">
              <span className="font-semibold">{total_tests || testCount} bài test</span>
            </div>

            {/* Row 2 */}
            <div className="flex items-center gap-1 min-h-[16px]">
              <span>{total_questions} câu hỏi</span>
            </div>

            <div className="flex items-center gap-0.5 text-slate-600 min-h-[16px]">
              {currentViews > 0 ? (
                <>
                  <svg
                    className="w-2.5 h-2.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                  <span>{currentViews.toLocaleString()}</span>
                </>
              ) : (
                <span className="text-transparent">0</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Avatar section - Fixed at bottom */}
      <div className="w-full rounded-b-xl overflow-hidden mt-auto">
        {avatar_url && !imageError ? (
          <img
            src={avatar_url}
            alt={title}
            className="block w-full aspect-square object-cover"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div
            className={cx(
              "w-full aspect-square flex items-center justify-center",
              "text-4xl font-black text-white",
              "bg-gradient-to-br",
              accent
            )}
          >
            {title?.charAt(0)?.toUpperCase() || "?"}
          </div>
        )}
      </div>
    </button>
  );
}
