import React from 'react';
import CreateVocabularyWithAIButton from './CreateVocabularyWithAIButton';
import CreateVocabularyTestButton from './CreateVocabularyTestButton';
import CreateMultipleChoiceTestButton from './CreateMultipleChoiceTestButton';

const SmartFilterBar = ({ filters, setFilters }) => {
  return (
    <div className="sticky top-4 z-40 mb-6">
      {/* Search & Filter Bar */}
      <div className="bg-white/95 backdrop-blur-xl rounded-xl shadow-lg border border-white/50 p-3">
        {/* Search & Buttons Row */}
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <div className="flex-1 relative min-w-[200px]">
            <input
              type="text"
              placeholder="🔍 Tìm kiếm chủ đề..."
              value={filters.searchTerm}
              onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
              className="w-full pl-10 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Create Test Buttons - Right side */}
          <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
            <CreateVocabularyWithAIButton className="hidden lg:inline-flex items-center justify-center !h-8 !min-h-0 !min-w-[200px] !px-1.5 !py-1.5 !text-[11px] !font-bold !rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 whitespace-nowrap !gap-2 overflow-visible [&>span:first-child]:!w-6 [&>span:first-child]:!h-6 [&>span:first-child]:!text-sm [&>span:last-child]:!inline-block [&>span:last-child]:!select-none" />
            <CreateVocabularyTestButton className="hidden lg:inline-flex items-center justify-center !h-8 !min-h-0 !px-2.5 !py-1.5 !text-[10px] !font-bold !rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 whitespace-nowrap !gap-1.5 [&>span]:!text-sm [&>span]:!mr-1" />
            <CreateMultipleChoiceTestButton className="hidden lg:inline-flex items-center justify-center !h-8 !min-h-0 !px-2.5 !py-1.5 !text-[10px] !font-bold !rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 whitespace-nowrap !gap-1.5 [&>span]:!text-sm" />
          </div>
        </div>

        {/* Advanced Filters - Always visible */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-200">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Loại test</label>
            <select
              value={filters.testType || 'all'}
              onChange={(e) => setFilters(prev => ({ ...prev, testType: e.target.value }))}
              className="w-full p-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
            >
              <option value="all">Tất cả</option>
              <option value="vocabulary">Từ vựng</option>
              <option value="multiple-choice">Trắc nghiệm</option>
              <option value="grammar">Ngữ pháp</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Trạng thái</label>
            <select
              value={filters.status || 'all'}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full p-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
            >
              <option value="all">Tất cả</option>
              <option value="active">Có bài test</option>
              <option value="empty">Chưa có bài test</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Sắp xếp</label>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
              className="w-full p-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
            >
              <option value="name">Theo tên</option>
              <option value="testCount">Theo số lượng test</option>
              <option value="questions">Theo số câu hỏi</option>
              <option value="views">Theo lượt xem</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Thứ tự</label>
            <select
              value={filters.sortOrder}
              onChange={(e) => setFilters(prev => ({ ...prev, sortOrder: e.target.value }))}
              className="w-full p-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
            >
              <option value="asc">Tăng dần</option>
              <option value="desc">Giảm dần</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartFilterBar;