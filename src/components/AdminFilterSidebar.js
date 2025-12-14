import React from 'react';

const FilterSidebar = ({ 
  isOpen, 
  onClose, 
  filters, 
  onFilterChange, 
  onClearFilters,
  filterOptions = {}
}) => {
  const {
    searchTerm = '',
    sortBy = 'name',
    sortOrder = 'asc',
    difficulty = '',
    status = ''
  } = filters;

  const handleInputChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose} />
        </div>
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 z-50 h-full w-80 bg-slate-800/95 backdrop-blur-sm shadow-2xl transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:z-0 lg:shadow-lg lg:rounded-lg border border-slate-700/50
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700/50 bg-gradient-to-r from-blue-600/80 to-purple-600/80 text-white">
            <h3 className="text-lg font-semibold flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
              </svg>
              Bộ lọc
            </h3>
            <button
              onClick={onClose}
              className="lg:hidden p-1 rounded-lg hover:bg-white/20 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Filter Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Tìm kiếm
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleInputChange('searchTerm', e.target.value)}
                  placeholder="Nhập từ khóa..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-white placeholder-slate-400"
                />
                <svg className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Sắp xếp theo
              </label>
              <select
                value={sortBy}
                onChange={(e) => handleInputChange('sortBy', e.target.value)}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-white"
              >
                <option value="name">Tên</option>
                <option value="created_at">Ngày tạo</option>
                <option value="updated_at">Cập nhật gần đây</option>
                {filterOptions.showDifficulty && <option value="difficulty">Độ khó</option>}
                {filterOptions.showQuestionCount && <option value="total_questions">Số câu hỏi</option>}
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Thứ tự
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="asc"
                    checked={sortOrder === 'asc'}
                    onChange={(e) => handleInputChange('sortOrder', e.target.value)}
                    className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="ml-2 text-sm text-white">Tăng dần</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="desc"
                    checked={sortOrder === 'desc'}
                    onChange={(e) => handleInputChange('sortOrder', e.target.value)}
                    className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="ml-2 text-sm text-white">Giảm dần</span>
                </label>
              </div>
            </div>

            {/* Difficulty Filter (for tests) */}
            {filterOptions.showDifficulty && (
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Độ khó
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => handleInputChange('difficulty', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-white"
                >
                  <option value="">Tất cả</option>
                  <option value="easy">Dễ</option>
                  <option value="medium">Trung bình</option>
                  <option value="hard">Khó</option>
                </select>
              </div>
            )}

            {/* Status Filter */}
            {filterOptions.showStatus && (
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Trạng thái
                </label>
                <select
                  value={status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-white"
                >
                  <option value="">Tất cả</option>
                  <option value="active">Hoạt động</option>
                  <option value="draft">Nháp</option>
                  <option value="archived">Lưu trữ</option>
                </select>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 space-y-3">
            <button
              onClick={onClearFilters}
              className="w-full px-4 py-2 text-sm font-medium text-slate-300 bg-slate-600/50 border border-slate-500/50 rounded-lg hover:bg-slate-600/70 hover:border-slate-400/50 transition-colors"
            >
              <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Xóa bộ lọc
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default FilterSidebar;