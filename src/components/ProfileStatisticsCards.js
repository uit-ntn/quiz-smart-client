import React from 'react';

const STATS_CONFIG = [
  {
    key: 'total_tests',
    label: 'Tổng bài test',
    emoji: '📋',
    cardBorder: 'border-sky-400',
    cardRing: 'ring-sky-100',
    iconBg: 'bg-sky-600 border-sky-800',
    valueCls: 'text-sky-700',
    icon: (
      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    key: 'average_score',
    label: 'Điểm trung bình',
    suffix: '%',
    emoji: '⭐',
    cardBorder: 'border-emerald-400',
    cardRing: 'ring-emerald-100',
    iconBg: 'bg-emerald-600 border-emerald-800',
    valueCls: 'text-emerald-700',
    icon: (
      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    key: 'total_questions',
    label: 'Tổng câu hỏi',
    emoji: '❓',
    cardBorder: 'border-violet-400',
    cardRing: 'ring-violet-100',
    iconBg: 'bg-violet-600 border-violet-800',
    valueCls: 'text-violet-700',
    icon: (
      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: 'total_correct',
    label: 'Câu trả lời đúng',
    emoji: '✅',
    cardBorder: 'border-orange-400',
    cardRing: 'ring-orange-100',
    iconBg: 'bg-orange-600 border-orange-800',
    valueCls: 'text-orange-700',
    icon: (
      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

const StatisticsCards = ({ statistics, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl border-[3px] border-slate-200 ring-2 ring-slate-100 p-4 animate-pulse">
            <div className="flex items-center justify-between mb-2">
              <div className="h-7 w-12 bg-slate-200 rounded-lg" />
              <div className="w-10 h-10 rounded-xl bg-slate-200" />
            </div>
            <div className="h-3.5 w-24 bg-slate-200 rounded mt-2" />
          </div>
        ))}
      </div>
    );
  }

  if (!statistics) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      {STATS_CONFIG.map((cfg) => {
        const raw = statistics[cfg.key] ?? 0;
        const display = cfg.suffix ? `${Number(raw).toFixed(1)}${cfg.suffix}` : raw;
        return (
          <div key={cfg.key}
            className={`bg-white rounded-2xl border-[3px] ${cfg.cardBorder} ring-2 ${cfg.cardRing} p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className={`text-2xl font-black ${cfg.valueCls} leading-none mb-1`}>{display}</div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">{cfg.label}</div>
              </div>
              <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center shrink-0 shadow-md ${cfg.iconBg}`}>
                {cfg.icon}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatisticsCards;
