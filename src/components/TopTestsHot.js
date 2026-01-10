import React from 'react';

const TopTestsHot = ({ topTakenTests, onTestClick }) => {
  if (topTakenTests.length === 0) return null;

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg overflow-hidden mt-8">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/25">
            <span className="text-xl">🔥</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Bài test hot</h3>
            <p className="text-xs text-slate-600">Được yêu thích nhất</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {topTakenTests.slice(0, 6).map((test, index) => (
            <div
              key={test.test_id || index}
              onClick={() => onTestClick(test)}
              className="group p-4 bg-gradient-to-r from-orange-50 to-red-50 hover:from-orange-100 hover:to-red-100 rounded-xl border border-orange-200/50 hover:border-orange-300 transition-all duration-300 cursor-pointer hover:shadow-lg hover:-translate-y-1"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 text-white rounded-xl flex items-center justify-center font-bold text-sm shadow-md">
                  #{index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-slate-900 line-clamp-2 group-hover:text-slate-700 transition-colors mb-2">
                    {test.test_title || "Chưa có tiêu đề"}
                  </h4>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-2.5 py-1 bg-orange-200 text-orange-800 rounded-full font-bold">
                      👥 {test.taken_count || 0}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      {test.test_type === "vocabulary" ? "📚 Từ vựng" : test.test_type === "multiple_choice" ? "🎯 Trắc nghiệm" : "📖 Ngữ pháp"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TopTestsHot;