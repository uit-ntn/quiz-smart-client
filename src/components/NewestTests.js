import React from 'react';
import TestCard from './TestCard';

const NewestTests = ({ newestTests, onPreviewVocabulary, onPreviewMCP }) => {
  if (!newestTests || newestTests.length === 0) return null;

  return (
    <div className="rounded-2xl overflow-hidden shadow-2xl shadow-cyan-900/40">
      {/* ── Vivid cyan-blue header ── */}
      <div className="bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-700 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-black text-white drop-shadow">Bài test mới nhất</h3>
            <p className="text-xs text-cyan-100/80">Vừa được cộng đồng tạo</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 border border-white/30">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
          </span>
          <span className="text-white font-black text-xs tracking-wide">LIVE</span>
        </div>
      </div>

      {/* ── Light blue body with white cards ── */}
      <div className="bg-blue-50 p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 items-stretch auto-rows-fr">
        {newestTests.slice(0, 8).map((test, index) => {
          const testData = {
            _id: test.test_id || test._id || test.id,
            id: test.test_id || test._id || test.id,
            test_id: test.test_id || test._id || test.id,
            test_title: test.test_title,
            test_type: test.test_type,
            difficulty: test.difficulty || 'medium',
            visibility: test.visibility || 'public',
            total_questions: test.total_questions || 0,
            time_limit_minutes: test.time_limit_minutes || 0,
            attempt_count: test.attempt_count || 0,
            created_by_full_name: test.created_by_full_name || 'Ẩn danh',
            created_at: test.created_at,
            main_topic: test.main_topic || '',
            sub_topic: test.sub_topic || '',
            description: test.description || '',
          };

          return (
            <div key={test.test_id || test._id || index} className="relative h-full">
              {index === 0 && (
                <div className="absolute -top-1.5 -left-1.5 z-10">
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/40">
                    <span className="text-white text-[9px] font-black tracking-wide">✨ MỚI NHẤT</span>
                  </div>
                </div>
              )}
              {/* White card wrapper for contrast */}
              <div className="rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md border border-blue-100 hover:border-blue-300 transition-all duration-200 hover:-translate-y-0.5 h-full">
                <TestCard
                  test={testData}
                  type={test.test_type === "multiple_choice" ? "multiple-choice" : test.test_type || "vocabulary"}
                  viewMode="card"
                  dense={true}
                  className="h-full"
                  onPreview={
                    (test.test_type === "multiple_choice"
                      ? onPreviewMCP
                      : onPreviewVocabulary) || undefined
                  }
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NewestTests;
