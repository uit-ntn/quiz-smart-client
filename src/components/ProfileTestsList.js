// src/components/ProfileTestsList.jsx
import React from "react";
import { Link } from "react-router-dom";

const cx = (...a) => a.filter(Boolean).join(" ");

const ACCENTS = [
  { headerGrad: "from-sky-600 to-indigo-700", cardBorder: "border-sky-400", cardRing: "ring-sky-100", btnBg: "bg-sky-600 border-sky-800 hover:bg-sky-700", typeBg: "bg-sky-100 border-sky-300 text-sky-700" },
  { headerGrad: "from-violet-600 to-purple-700", cardBorder: "border-violet-400", cardRing: "ring-violet-100", btnBg: "bg-violet-600 border-violet-800 hover:bg-violet-700", typeBg: "bg-violet-100 border-violet-300 text-violet-700" },
  { headerGrad: "from-emerald-600 to-teal-700", cardBorder: "border-emerald-400", cardRing: "ring-emerald-100", btnBg: "bg-emerald-600 border-emerald-800 hover:bg-emerald-700", typeBg: "bg-emerald-100 border-emerald-300 text-emerald-700" },
  { headerGrad: "from-amber-500 to-orange-600", cardBorder: "border-amber-400", cardRing: "ring-amber-100", btnBg: "bg-amber-600 border-amber-800 hover:bg-amber-700", typeBg: "bg-amber-100 border-amber-300 text-amber-700" },
  { headerGrad: "from-rose-600 to-red-700", cardBorder: "border-rose-400", cardRing: "ring-rose-100", btnBg: "bg-rose-600 border-rose-800 hover:bg-rose-700", typeBg: "bg-rose-100 border-rose-300 text-rose-700" },
  { headerGrad: "from-fuchsia-600 to-violet-700", cardBorder: "border-fuchsia-400", cardRing: "ring-fuchsia-100", btnBg: "bg-fuchsia-600 border-fuchsia-800 hover:bg-fuchsia-700", typeBg: "bg-fuchsia-100 border-fuchsia-300 text-fuchsia-700" },
  { headerGrad: "from-indigo-600 to-blue-700", cardBorder: "border-indigo-400", cardRing: "ring-indigo-100", btnBg: "bg-indigo-600 border-indigo-800 hover:bg-indigo-700", typeBg: "bg-indigo-100 border-indigo-300 text-indigo-700" },
  { headerGrad: "from-teal-600 to-emerald-700", cardBorder: "border-teal-400", cardRing: "ring-teal-100", btnBg: "bg-teal-600 border-teal-800 hover:bg-teal-700", typeBg: "bg-teal-100 border-teal-300 text-teal-700" },
];

const hashString = (s = "") => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

const pickAccent = (test, index) => {
  const key = test?._id || `${test?.test_title || ""}-${index}`;
  return ACCENTS[hashString(String(key)) % ACCENTS.length];
};

const getTestTypeName = (t) => {
  switch (t) {
    case "vocabulary": return "📚 Từ vựng";
    case "multiple_choice": return "📝 Trắc nghiệm";
    case "grammar": return "✏️ Ngữ pháp";
    default: return t || "Bài test";
  }
};

const getDifficultyConfig = (d) => {
  switch (d) {
    case "easy": return { text: "Dễ", cls: "border-emerald-400 bg-emerald-100 text-emerald-700" };
    case "medium": return { text: "TB", cls: "border-amber-400 bg-amber-100 text-amber-700" };
    case "hard": return { text: "Khó", cls: "border-rose-400 bg-rose-100 text-rose-700" };
    default: return { text: d || "—", cls: "border-slate-300 bg-slate-100 text-slate-600" };
  }
};

const getVisibilityConfig = (v) =>
  v === "public"
    ? { text: "Public", cls: "border-sky-400 bg-sky-100 text-sky-700", icon: "🌐" }
    : { text: "Private", cls: "border-slate-300 bg-slate-100 text-slate-600", icon: "🔒" };

const getStatusConfig = (s) => {
  switch (s) {
    case "active": return { text: "Hoạt động", dot: "bg-emerald-500", cls: "border-emerald-400 bg-emerald-100 text-emerald-700" };
    case "inactive": return { text: "Tạm dừng", dot: "bg-amber-500", cls: "border-amber-400 bg-amber-100 text-amber-700" };
    case "deleted": return { text: "Đã xóa", dot: "bg-rose-500", cls: "border-rose-400 bg-rose-100 text-rose-700" };
    default: return { text: s || "—", dot: "bg-slate-400", cls: "border-slate-300 bg-slate-100 text-slate-600" };
  }
};

const SkeletonCard = () => (
  <div className="bg-white rounded-2xl border-[3px] border-slate-200 ring-2 ring-slate-100 overflow-hidden h-full animate-pulse">
    <div className="h-12 bg-slate-200" />
    <div className="p-4 space-y-3">
      <div className="flex gap-1.5">
        <div className="h-5 w-16 bg-slate-200 rounded-full" />
        <div className="h-5 w-10 bg-slate-100 rounded-full" />
      </div>
      <div className="h-5 w-3/4 bg-slate-200 rounded" />
      <div className="h-4 w-full bg-slate-100 rounded" />
      <div className="flex gap-2 mt-4">
        <div className="h-10 flex-1 bg-slate-200 rounded-xl" />
        <div className="h-10 flex-1 bg-slate-100 rounded-xl" />
        <div className="h-10 w-10 bg-slate-100 rounded-xl" />
      </div>
    </div>
  </div>
);

const ProfileTestsList = ({ tests, loading, error, onRetry, onTakeTest, onDeleteTest, onViewTestDetail }) => {
  const safeTests = Array.isArray(tests) ? tests : [];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border-[3px] border-rose-400 ring-2 ring-rose-100 overflow-hidden">
        <div className="bg-gradient-to-r from-rose-600 to-red-700 px-5 py-3">
          <p className="text-sm font-extrabold text-white">Lỗi tải bài test</p>
        </div>
        <div className="p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 border-2 border-rose-300 flex items-center justify-center mx-auto mb-3 text-2xl">⚠️</div>
          <p className="text-sm font-bold text-slate-800 mb-4">{String(error)}</p>
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

  if (!safeTests.length) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 bg-white rounded-2xl border-[3px] border-violet-400 ring-2 ring-violet-100 overflow-hidden">
          <div className="bg-gradient-to-r from-violet-600 to-purple-700 px-5 py-3">
            <p className="text-sm font-extrabold text-white">📋 Bài test của tôi</p>
          </div>
          <div className="p-10 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-violet-100 rounded-2xl border-2 border-violet-300 flex items-center justify-center text-3xl">📭</div>
            <h3 className="text-lg font-black text-slate-900 mb-2">Bạn chưa tạo bài test nào</h3>
            <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">Tạo bài test đầu tiên để ôn luyện hoặc chia sẻ. Nên bắt đầu 5–10 câu để dễ hoàn thiện.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/create-test/multiple-choice"
                className="px-5 py-2.5 rounded-xl bg-indigo-600 border-[3px] border-indigo-800 text-white font-extrabold text-sm hover:bg-indigo-700 transition-colors shadow-md flex items-center gap-2">
                📝 Tạo trắc nghiệm
              </Link>
              <Link to="/create-test/vocabulary"
                className="px-5 py-2.5 rounded-xl bg-emerald-600 border-[3px] border-emerald-800 text-white font-extrabold text-sm hover:bg-emerald-700 transition-colors shadow-md flex items-center gap-2">
                📚 Tạo từ vựng
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border-[3px] border-amber-400 ring-2 ring-amber-100 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-3">
            <p className="text-sm font-extrabold text-white">💡 Gợi ý nhanh</p>
          </div>
          <div className="p-5">
            <ul className="space-y-3">
              {["5–10 câu cho bài đầu.", "Tiêu đề rõ + chủ đề cụ thể.", "Mô tả ngắn mục tiêu bài."].map((tip, i) => (
                <li key={i} className="flex gap-2 items-start text-sm text-slate-700">
                  <span className="mt-1 w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-black text-slate-900">
          Bài test <span className="text-violet-700">của bạn</span>
        </h2>
        <span className="inline-flex items-center rounded-full border-2 border-violet-800 bg-violet-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-md">
          {safeTests.length} bài
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        {safeTests.map((test, index) => {
          const accent = pickAccent(test, index);
          const difficulty = getDifficultyConfig(test?.difficulty);
          const visibility = getVisibilityConfig(test?.visibility);
          const status = getStatusConfig(test?.status);

          return (
            <div key={test?._id || index} className="h-full">
              <div className={cx(
                "bg-white rounded-2xl border-[3px] ring-2 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 overflow-hidden h-full flex flex-col",
                accent.cardBorder, accent.cardRing
              )}>
                {/* Header strip */}
                <div className={cx("bg-gradient-to-r px-3 py-2.5", accent.headerGrad)}>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center rounded-full border-2 border-white/40 bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">
                      {getTestTypeName(test?.test_type)}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border-2 border-white/40 bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">
                      <span className={cx("w-1.5 h-1.5 rounded-full", status.dot)} />
                      {status.text}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-3 flex-1 flex flex-col">
                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    <span className={cx("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border-2", difficulty.cls)}>
                      {difficulty.text}
                    </span>
                    <span className={cx("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border-2", visibility.cls)}>
                      {visibility.icon} {visibility.text}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-black text-slate-900 leading-snug line-clamp-2 min-h-[40px] mb-2">
                    {test?.test_title || "Bài test"}
                  </h3>

                  {/* Description */}
                  <div className="min-h-[32px] mb-3">
                    {test?.description
                      ? <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{test.description}</p>
                      : <p className="text-xs text-slate-400 italic">Không có mô tả</p>}
                  </div>

                  {/* Meta pills */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className="inline-flex items-center gap-1 rounded-full border-2 border-sky-300 bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                      ❓ {test?.total_questions || 0} câu
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border-2 border-indigo-300 bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                      ⏱ {test?.time_limit_minutes || 0} phút
                    </span>
                    {test?.main_topic && (
                      <span className="inline-flex items-center gap-1 rounded-full border-2 border-violet-300 bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700 max-w-full">
                        <span className="truncate">
                          📂 {test.main_topic}{test.sub_topic ? ` › ${test.sub_topic}` : ""}
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-auto">
                    <div className={cx("grid gap-1.5", onDeleteTest ? "grid-cols-3" : "grid-cols-2")}>
                      <button onClick={() => onTakeTest?.(test)}
                        className={cx("h-9 rounded-xl text-white font-extrabold text-xs transition-colors border-[3px] shadow-sm col-span-1", accent.btnBg)}>
                        Làm bài
                      </button>
                      <button onClick={() => onViewTestDetail?.(test)}
                        className="h-9 rounded-xl bg-white border-[3px] border-slate-300 text-slate-800 font-extrabold text-xs hover:bg-slate-50 transition-colors">
                        Chi tiết
                      </button>
                      {onDeleteTest && (
                        <button onClick={() => onDeleteTest(test)}
                          className="h-9 rounded-xl bg-rose-100 border-[3px] border-rose-400 text-rose-700 font-extrabold text-xs hover:bg-rose-200 transition-colors"
                          title="Xóa bài test">
                          Xóa
                        </button>
                      )}
                    </div>
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

export default ProfileTestsList;
