import React from "react";

const TYPE_META = {
  vocabulary: {
    label: "Từ vựng",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  },
  "multiple-choice": {
    label: "Trắc nghiệm",
    dot: "bg-blue-500",
    badge: "bg-blue-50 text-blue-700 ring-blue-100",
  },
};

const Icon = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
    />
  </svg>
);

const Chevron = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
  </svg>
);

const Pill = ({ type }) => {
  const meta = TYPE_META[type] || TYPE_META.vocabulary;
  return (
    <span className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold bg-white ring-1 ring-gray-200 text-gray-700">
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
};

const CountBadge = ({ type, testCount }) => {
  const meta = TYPE_META[type] || TYPE_META.vocabulary;
  const suffix = type === "vocabulary" ? "phân mục" : "bài";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${meta.badge}`}>
      {testCount} {suffix}
    </span>
  );
};

const TestTopicCard = ({
  topic,
  mainTopic,
  testCount = 0,
  type = "vocabulary",
  buttonLabel = "Mở danh sách",
  onOpenModal,
  className = "",
}) => {
  const title = topic || mainTopic;

  return (
    <div
      className={[
        "group relative rounded-2xl border border-gray-200 bg-white",
        "transition-all duration-200",
        "hover:border-gray-300 hover:shadow-[0_10px_30px_-18px_rgba(0,0,0,0.35)] hover:-translate-y-0.5",
        className,
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onOpenModal}
        className="w-full text-left p-5"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-gray-500">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gray-50 ring-1 ring-gray-100">
                <Icon className="w-5 h-5 text-gray-700" />
              </span>
              <Pill type={type} />
              {testCount > 0 && <CountBadge type={type} testCount={testCount} />}
            </div>

            <h3 className="mt-3 text-[16px] md:text-[17px] font-bold text-gray-900 leading-snug line-clamp-2">
              {title}
            </h3>

            <p className="mt-1 text-sm text-gray-500 line-clamp-1">
              Nhấn để xem danh sách phân mục
            </p>
          </div>

          <Chevron className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors mt-1" />
        </div>

        {/* Footer action (subtle) */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-indigo-600 group-hover:text-indigo-700 transition">
            {buttonLabel}
          </span>
          <span className="text-xs text-gray-400">
            {type === "vocabulary" ? "Vocabulary" : "Multiple choice"}
          </span>
        </div>
      </button>
    </div>
  );
};

export default TestTopicCard;
