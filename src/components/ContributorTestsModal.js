import React from 'react';

const ContributorTestsModal = ({ isOpen, onClose, contributor, onTestClick }) => {
  if (!isOpen || !contributor) return null;

  const getTestTypeIcon = (testType) => {
    switch (testType) {
      case 'vocabulary': return '📚';
      case 'multiple_choice': return '🎯';
      case 'grammar': return '📖';
      default: return '📝';
    }
  };

  const getTestTypeLabel = (testType) => {
    switch (testType) {
      case 'vocabulary': return 'Từ vựng';
      case 'multiple_choice': return 'Trắc nghiệm';
      case 'grammar': return 'Ngữ pháp';
      default: return 'Khác';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-white/50">
        {/* Header */}
        <div className="flex-shrink-0 p-6 border-b border-slate-200/50 bg-gradient-to-r from-amber-50/80 to-orange-50/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {contributor.avatar_url ? (
                <img 
                  src={contributor.avatar_url} 
                  alt={contributor.full_name || 'User'}
                  className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-lg"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className={`w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl flex items-center justify-center font-bold text-lg shadow-lg ${contributor.avatar_url ? 'hidden' : ''}`}
                style={{ display: contributor.avatar_url ? 'none' : 'flex' }}
              >
                {contributor.full_name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">{contributor.full_name || 'Người dùng ẩn danh'}</h3>
                {contributor.email && (
                  <p className="text-xs text-slate-600 font-medium mb-1">{contributor.email}</p>
                )}
                <p className="text-sm text-slate-600 font-medium">{contributor.total_tests} bài test đã tạo</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-2xl bg-white/80 hover:bg-white flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-shrink-0 p-4 bg-slate-50/80 border-b border-slate-200/50">
          <div className="grid grid-cols-4 gap-3">
            {/* Total Tests */}
            <div className="text-center p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-sm">
              <div className="text-xl font-black text-white">{contributor.total_tests || 0}</div>
              <div className="text-xs text-white font-bold mt-1">Tổng số</div>
            </div>
            
            {contributor.vocabulary_tests > 0 && (
              <div className="text-center p-3 bg-white/80 rounded-2xl shadow-sm">
                <div className="text-lg font-black text-emerald-600">{contributor.vocabulary_tests}</div>
                <div className="text-xs text-slate-600 font-bold">Từ vựng</div>
              </div>
            )}
            {contributor.multiple_choice_tests > 0 && (
              <div className="text-center p-3 bg-white/80 rounded-2xl shadow-sm">
                <div className="text-lg font-black text-blue-600">{contributor.multiple_choice_tests}</div>
                <div className="text-xs text-slate-600 font-bold">Trắc nghiệm</div>
              </div>
            )}
            {contributor.grammar_tests > 0 && (
              <div className="text-center p-3 bg-white/80 rounded-2xl shadow-sm">
                <div className="text-lg font-black text-purple-600">{contributor.grammar_tests}</div>
                <div className="text-xs text-slate-600 font-bold">Ngữ pháp</div>
              </div>
            )}
          </div>
        </div>

        {/* Tests List */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          <h4 className="text-sm font-black text-slate-900 mb-3">Danh sách bài test ({contributor.tests?.length || 0})</h4>
          
          {contributor.tests && contributor.tests.length > 0 ? (
            <div className="space-y-3">
              {contributor.tests.map((test, index) => (
                <div
                  key={test.test_id || index}
                  onClick={() => {
                    onTestClick({ test_id: test.test_id, test_type: test.test_type });
                    onClose();
                  }}
                  className="p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 hover:border-slate-300/60 hover:shadow-lg transition-all cursor-pointer hover:-translate-y-1"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center text-lg shadow-sm">
                      {getTestTypeIcon(test.test_type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h5 className="font-bold text-slate-900 text-sm truncate mb-2" title={test.test_title}>
                        {test.test_title}
                      </h5>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs px-3 py-1 bg-slate-100 text-slate-700 rounded-full font-bold">
                          {getTestTypeLabel(test.test_type)}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          {test.main_topic} {test.sub_topic && `• ${test.sub_topic}`}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        ID: {test.test_id}
                      </div>
                    </div>

                    <div className="flex-shrink-0 text-slate-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <div className="text-4xl mb-2">📝</div>
              <p className="text-sm">Chưa có bài test nào</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t border-slate-200/50 bg-slate-50/80">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-2xl hover:from-slate-700 hover:to-slate-800 transition-all duration-300 font-bold shadow-lg hover:shadow-xl hover:-translate-y-1"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContributorTestsModal;