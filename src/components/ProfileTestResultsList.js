// src/components/ProfileTestResultsList.jsx
import React from "react";

const cx = (...a) => a.filter(Boolean).join(" ");

const ProfileTestResultsList = ({
  results = [],
  loading,
  error,
  onRetry,
  onViewDetail,
  onDelete,
}) => {
  const safeResults = Array.isArray(results) ? results : [];

  const getScoreColor = (percentage = 0) => {
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBg = (percentage = 0) => {
    if (percentage >= 80) return "bg-green-100";
    if (percentage >= 60) return "bg-yellow-100";
    return "bg-red-100";
  };

  const getTestTypeIcon = (testType) => {
    switch (testType) {
      case "vocabulary":
        return (
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        );
      case "multiple_choice":
        return (
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
        );
      case "grammar":
        return (
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        );
    }
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
        return "Bài test";
    }
  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("vi-VN");
  };

  const formatDuration = (ms) => {
    const s = Math.max(0, Math.round((ms || 0) / 1000));
    return `${s}s`;
  };

  // ---------- UI states ----------
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-40 bg-slate-100 rounded" />
          <div className="h-16 bg-slate-100 rounded" />
          <div className="h-16 bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-rose-100 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-rose-700">Không tải được kết quả</p>
            <p className="text-xs text-rose-600 mt-1">{String(error)}</p>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-3 py-2 rounded-lg text-xs font-medium bg-rose-600 text-white hover:bg-rose-700"
            >
              Thử lại
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!safeResults.length) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 p-6 text-center">
        <p className="text-sm font-semibold text-slate-900">Chưa có kết quả nào</p>
        <p className="text-xs text-slate-500 mt-1">Làm một bài test để xem lịch sử kết quả ở đây.</p>
      </div>
    );
  }

  // ---------- List ----------
  return (
    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
      <div className="divide-y divide-slate-100">
        {safeResults.map((result) => {
          const id = result?._id ?? `${result?.created_at ?? ""}-${Math.random()}`;
          const percentage = Number(result?.percentage ?? 0);
          const total = Number(result?.total_questions ?? 0);
          const correct = Number(result?.correct_count ?? 0);

          const testType = result?.test_id?.test_type;
          const title = result?.test_id?.test_title || "Bài test";
          const mainTopic = result?.test_id?.main_topic;
          const subTopic = result?.test_id?.sub_topic;

          return (
            <div key={id} className="p-3 sm:p-4 hover:bg-slate-50 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Left */}
                <div className="flex-1">
                  <div className="flex items-start gap-3">
                    {/* Score */}
                    <div
                      className={cx(
                        "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0",
                        getScoreBg(percentage)
                      )}
                    >
                      <span className={cx("text-sm sm:text-lg font-bold", getScoreColor(percentage))}>
                        {percentage}%
                      </span>
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                          {getTestTypeIcon(testType)}
                        </span>

                        <h3 className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                          {title}
                        </h3>

                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {getTestTypeName(testType)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-slate-600">
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                            />
                          </svg>
                          {correct}/{total} câu đúng
                        </span>

                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatDuration(result?.duration_ms)}
                        </span>

                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m4 4a2 2 0 00-2-2h-2a2 2 0 00-2 2m0 0a2 2 0 002 2h2a2 2 0 002-2m0 0v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6m0 0V9a2 2 0 012-2h8a2 2 0 012 2v6z"
                            />
                          </svg>
                          {formatDate(result?.created_at)}
                        </span>
                      </div>

                      {mainTopic && (
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                            {mainTopic}
                            {subTopic ? ` › ${subTopic}` : ""}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-row sm:flex-col items-stretch sm:items-end gap-2 sm:gap-2 sm:ml-4">
                  <button
                    onClick={() => onViewDetail?.(result)}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm"
                  >
                    Xem
                  </button>

                  

                  {onDelete && (
                    <button
                      onClick={() => onDelete(result)}
                      className="px-3 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors text-xs sm:text-sm flex items-center justify-center gap-1"
                      title="Xóa kết quả"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      <span className="hidden sm:inline">Xóa</span>
                    </button>
                  )}
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
