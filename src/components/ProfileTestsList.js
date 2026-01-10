// src/components/ProfileTestsList.jsx
import React from "react";
import { Link } from "react-router-dom";

const cx = (...a) => a.filter(Boolean).join(" ");

const ACCENTS = [
  { strip: "from-sky-500 via-cyan-500 to-emerald-500", btn: "bg-sky-600 hover:bg-sky-700", soft: "bg-sky-50 text-sky-700 border-sky-200" },
  { strip: "from-violet-500 via-fuchsia-500 to-pink-500", btn: "bg-violet-600 hover:bg-violet-700", soft: "bg-violet-50 text-violet-700 border-violet-200" },
  { strip: "from-emerald-500 via-teal-500 to-cyan-500", btn: "bg-emerald-600 hover:bg-emerald-700", soft: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { strip: "from-amber-500 via-orange-500 to-rose-500", btn: "bg-amber-600 hover:bg-amber-700", soft: "bg-amber-50 text-amber-700 border-amber-200" },
  { strip: "from-rose-500 via-pink-500 to-fuchsia-500", btn: "bg-rose-600 hover:bg-rose-700", soft: "bg-rose-50 text-rose-700 border-rose-200" },
  { strip: "from-indigo-500 via-blue-500 to-sky-500", btn: "bg-indigo-600 hover:bg-indigo-700", soft: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { strip: "from-lime-500 via-emerald-500 to-teal-500", btn: "bg-lime-600 hover:bg-lime-700", soft: "bg-lime-50 text-lime-700 border-lime-200" },
  { strip: "from-fuchsia-500 via-violet-500 to-indigo-500", btn: "bg-fuchsia-600 hover:bg-fuchsia-700", soft: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200" },
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

const getTestTypeName = (testType) => {
  switch (testType) {
    case "vocabulary":
      return "Từ vựng";
    case "multiple_choice":
      return "Trắc nghiệm";
    case "grammar":
      return "Ngữ pháp";
    default:
      return testType || "Bài test";
  }
};

const getDifficultyConfig = (difficulty) => {
  switch (difficulty) {
    case "easy":
      return { text: "Dễ", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    case "medium":
      return { text: "TB", cls: "bg-amber-50 text-amber-700 border-amber-200" };
    case "hard":
      return { text: "Khó", cls: "bg-rose-50 text-rose-700 border-rose-200" };
    default:
      return { text: difficulty || "—", cls: "bg-slate-50 text-slate-700 border-slate-200" };
  }
};

const getVisibilityConfig = (visibility) => {
  return visibility === "public"
    ? { text: "Public", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: "🌐" }
    : { text: "Private", cls: "bg-slate-50 text-slate-700 border-slate-200", icon: "🔒" };
};

const getStatusConfig = (status) => {
  switch (status) {
    case "active":
      return { text: "Hoạt động", dot: "bg-emerald-500", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    case "inactive":
      return { text: "Tạm dừng", dot: "bg-amber-500", cls: "bg-amber-50 text-amber-700 border-amber-200" };
    case "deleted":
      return { text: "Đã xóa", dot: "bg-rose-500", cls: "bg-rose-50 text-rose-700 border-rose-200" };
    default:
      return { text: status || "—", dot: "bg-slate-400", cls: "bg-slate-50 text-slate-700 border-slate-200" };
  }
};

const SkeletonCard = () => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-full">
    <div className="h-1.5 bg-slate-200" />
    <div className="p-3 space-y-3">
      <div className="h-6 w-40 bg-slate-100 rounded animate-pulse" />
      <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
      <div className="h-4 w-2/3 bg-slate-100 rounded animate-pulse" />
      <div className="flex gap-2">
        <div className="h-10 flex-1 bg-slate-100 rounded-xl animate-pulse" />
        <div className="h-10 flex-1 bg-slate-100 rounded-xl animate-pulse" />
        <div className="h-10 flex-1 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    </div>
  </div>
);

const ProfileTestsList = ({
  tests,
  loading,
  error,
  onRetry,
  onTakeTest,
  onDeleteTest,
  onViewTestDetail,
}) => {
  const safeTests = Array.isArray(tests) ? tests : [];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4 border border-rose-200">
            <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-slate-600 mb-4">{String(error)}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              Thử lại
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!safeTests.length) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center">
            <div className="w-16 h-16 mx-auto mb-5 bg-gradient-to-br from-slate-100 to-slate-50 rounded-2xl flex items-center justify-center border border-slate-200">
              <svg className="w-8 h-8 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Bạn chưa tạo bài test nào</h3>
            <p className="text-slate-600 mb-7 max-w-md mx-auto leading-relaxed">
              Tạo bài test đầu tiên để ôn luyện hoặc chia sẻ. Nên bắt đầu 5–10 câu để dễ hoàn thiện.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
              <Link
                to="/create-test/multiple-choice"
                className="px-5 py-3 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors font-semibold flex items-center justify-center gap-2"
              >
                ✨ Tạo trắc nghiệm
              </Link>
              <Link
                to="/create-test/vocabulary"
                className="px-5 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 transition-colors font-semibold flex items-center justify-center gap-2"
              >
                📚 Tạo từ vựng
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center">
              💡
            </div>
            <h4 className="font-bold text-slate-900">Gợi ý nhanh</h4>
          </div>
          <ul className="space-y-3 text-sm text-slate-700">
            <li className="flex gap-2"><span className="mt-1 w-2 h-2 rounded-full bg-slate-400" /> 5–10 câu cho bài đầu.</li>
            <li className="flex gap-2"><span className="mt-1 w-2 h-2 rounded-full bg-slate-400" /> Tiêu đề rõ + chủ đề cụ thể.</li>
            <li className="flex gap-2"><span className="mt-1 w-2 h-2 rounded-full bg-slate-400" /> Mô tả ngắn mục tiêu bài.</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Bài test của bạn</h2>
          <p className="text-sm text-slate-600">Quản lý, làm lại và chia sẻ bài test.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-700">
            Tổng: <span className="font-semibold text-slate-900">{safeTests.length}</span>
          </div>
        </div>
      </div>

      {/* 4 card / 1 hàng ở lg, đều chiều cao */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
        {safeTests.map((test, index) => {
          const accent = pickAccent(test, index);
          const difficulty = getDifficultyConfig(test?.difficulty);
          const visibility = getVisibilityConfig(test?.visibility);
          const status = getStatusConfig(test?.status);

          return (
            <div key={test?._id || index} className="h-full">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden h-full flex flex-col">
                {/* Strip */}
                <div className={cx("h-1.5 bg-gradient-to-r", accent.strip)} />

                {/* Content */}
                <div className="p-3 flex-1 flex flex-col">
                  {/* Badges (không icon trên đầu nữa) */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cx("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border", accent.soft)}>
                      {getTestTypeName(test?.test_type)}
                    </span>
                    <span className={cx("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border", difficulty.cls)}>
                      {difficulty.text}
                    </span>
                    <span className={cx("inline-flex items-center gap-2 px-2 py-0.5 rounded-full text-xs font-medium border", status.cls)}>
                      <span className={cx("w-2 h-2 rounded-full", status.dot)} />
                      {status.text}
                    </span>
                    <span className={cx("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border", visibility.cls)}>
                      <span>{visibility.icon}</span>
                      {visibility.text}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="mt-3 text-base font-bold text-slate-900 leading-snug line-clamp-2 min-h-[44px]">
                    {test?.test_title || "Bài test"}
                  </h3>

                  {/* Description (giữ 2 dòng để card đều) */}
                  <div className="mt-2 min-h-[40px]">
                    {test?.description ? (
                      <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">
                        {test.description}
                      </p>
                    ) : (
                      <p className="text-sm text-slate-400 italic">Không có mô tả</p>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <span className="font-semibold">{test?.total_questions || 0}</span> câu
                    </span>

                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-semibold">{test?.time_limit_minutes || 0}</span> phút
                    </span>

                    {test?.main_topic && (
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 max-w-full">
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a1.994 1.994 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        <span className="truncate">
                          {test.main_topic}
                          {test.sub_topic ? ` • ${test.sub_topic}` : ""}
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Actions: đẩy xuống đáy để card đều */}
                  <div className="mt-auto pt-3">
                    <div className={cx("grid gap-2", onDeleteTest ? "grid-cols-3" : "grid-cols-2")}>
                      <button
                        onClick={() => onTakeTest?.(test)}
                        className={cx(
                          "h-11 rounded-xl text-white font-semibold text-sm transition-colors shadow-sm",
                          accent.btn
                        )}
                      >
                        Làm bài
                      </button>

                      <button
                        onClick={() => onViewTestDetail?.(test)}
                        className="h-11 rounded-xl bg-white border border-slate-200 text-slate-900 font-semibold text-sm hover:bg-slate-50 transition-colors"
                      >
                        Chi tiết
                      </button>

                      {onDeleteTest && (
                        <button
                          onClick={() => onDeleteTest(test)}
                          className="h-11 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold text-sm hover:bg-rose-100 transition-colors"
                          title="Xóa bài test"
                        >
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
