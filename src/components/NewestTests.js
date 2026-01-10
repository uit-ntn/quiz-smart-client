import React from 'react';
import TestCard from './TestCard';

const NewestTests = ({ newestTests, onPreviewVocabulary, onPreviewMCP }) => {
  if (newestTests.length === 0) return null;

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg overflow-hidden mt-6">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Bài test mới</h3>
            <p className="text-xs text-slate-600">Vừa được tạo gần đây</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {newestTests.slice(0, 8).map((test, index) => {
            // Transform test data to match TestCard expected format
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
              <div key={test.test_id || test._id || index} className="relative">
                {/* New badge */}
                {index === 0 && (
                  <div className="absolute -top-2 -left-2 z-10 w-6 h-6 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg">
                    NEW
                  </div>
                )}

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
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default NewestTests;