import React from 'react';
import CreateVocabularyWithAIButton from './CreateVocabularyWithAIButton';
import CreateVocabularyTestButton from './CreateVocabularyTestButton';
import CreateMultipleChoiceTestButton from './CreateMultipleChoiceTestButton';

const SmartFilterBar = ({ filters, setFilters }) => {
  return (
    <div className="sticky top-4 z-40">
      <div className="bg-gradient-to-r from-indigo-700 via-violet-700 to-purple-700 rounded-2xl shadow-2xl shadow-indigo-900/50 overflow-hidden">
        {/* Shine line */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

        <div className="px-4 py-3">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="flex-1 relative min-w-[200px]">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-700 pointer-events-none">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Tìm kiếm chủ đề..."
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                className="w-full pl-10 pr-9 py-2.5 text-sm rounded-xl bg-white border-[3px] border-amber-300 text-slate-900 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-200/60 transition-all duration-200 shadow-md shadow-black/10"
              />
              {filters.searchTerm && (
                <button
                  onClick={() => setFilters(prev => ({ ...prev, searchTerm: '' }))}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-amber-700 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
              <CreateVocabularyWithAIButton className="hidden lg:inline-flex items-center justify-center !h-9 !min-h-0 !min-w-[200px] !px-3 !py-2 !text-[11px] !font-extrabold !rounded-xl !bg-emerald-600 !hover:bg-emerald-700 !border-[3px] !border-emerald-900 !text-white !shadow-md !shadow-emerald-900/30 !transition-all !duration-200 whitespace-nowrap !gap-2 overflow-visible [&>span:first-child]:!w-5 [&>span:first-child]:!h-5 [&>span:first-child]:!text-xs [&>span:last-child]:!inline-block" />
              <CreateVocabularyTestButton className="hidden lg:inline-flex items-center justify-center !h-9 !min-h-0 !px-3 !py-2 !text-[11px] !font-extrabold !rounded-xl !bg-orange-600 !hover:bg-orange-700 !border-[3px] !border-orange-900 !text-white !shadow-md !shadow-orange-900/30 !transition-all !duration-200 whitespace-nowrap !gap-1.5 [&>span]:!text-xs" />
              <CreateMultipleChoiceTestButton className="hidden lg:inline-flex items-center justify-center !h-9 !min-h-0 !px-3 !py-2 !text-[11px] !font-extrabold !rounded-xl !bg-rose-600 !hover:bg-rose-700 !border-[3px] !border-rose-900 !text-white !shadow-md !shadow-rose-900/30 !transition-all !duration-200 whitespace-nowrap !gap-1.5 [&>span]:!text-xs" />
            </div>
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>
    </div>
  );
};

export default SmartFilterBar;
