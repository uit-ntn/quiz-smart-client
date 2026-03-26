import React from 'react';

const TYPE_LABELS = {
  vocabulary: "📚 Từ vựng",
  multiple_choice: "🎯 Trắc nghiệm",
  grammar: "✏️ Ngữ pháp",
};

const RANK_CONFIG = [
  { medal: "🥇", bg: "bg-amber-500",   text: "text-white" },
  { medal: "🥈", bg: "bg-slate-400",   text: "text-white" },
  { medal: "🥉", bg: "bg-orange-600",  text: "text-white" },
  { medal: null,  bg: "bg-orange-100", text: "text-orange-700" },
];

const TopTestsHot = ({ topTakenTests, onTestClick }) => {
  if (!topTakenTests || topTakenTests.length === 0) return null;

  return (
    <div className="rounded-2xl overflow-hidden shadow-2xl shadow-orange-900/40">
      {/* ── Vivid orange-red header ── */}
      <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">🔥</span>
          </div>
          <div>
            <h3 className="text-lg font-black text-white drop-shadow">Bài test hot nhất</h3>
            <p className="text-xs text-orange-100/80">Được làm nhiều nhất hiện tại</p>
          </div>
        </div>
        <div className="px-3 py-1.5 rounded-full bg-white/20 border border-white/30">
          <span className="text-white font-black text-xs tracking-wide">TOP {Math.min(topTakenTests.length, 6)}</span>
        </div>
      </div>

      {/* ── White background body ── */}
      <div className="bg-orange-50 p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
        {topTakenTests.slice(0, 6).map((test, index) => {
          const rank = RANK_CONFIG[index] || RANK_CONFIG[3];
          const typeLabel = TYPE_LABELS[test.test_type] || "📋 Khác";

          return (
            <button
              key={test.test_id || index}
              type="button"
              onClick={() => onTestClick(test)}
              className="group w-full text-left p-3.5 rounded-xl bg-white hover:bg-orange-50 border border-orange-200 hover:border-orange-400 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 focus:outline-none"
            >
              <div className="flex items-start gap-2.5">
                {/* Rank badge */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shadow-sm ${rank.bg} ${rank.text}`}>
                  {rank.medal ? (
                    <span>{rank.medal}</span>
                  ) : (
                    <span className="text-xs">#{index + 1}</span>
                  )}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 group-hover:text-orange-700 transition-colors line-clamp-2 leading-snug mb-2">
                    {test.test_title || "Chưa có tiêu đề"}
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200 font-bold">
                      👥 {(test.taken_count || 0).toLocaleString()}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium">
                      {typeLabel}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TopTestsHot;
