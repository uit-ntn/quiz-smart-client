import React from 'react';
import { Link } from 'react-router-dom';

const ProfileTestResultsList = ({ results, loading, error, onRetry, onViewDetail, onRetakeTest, onDelete }) => {
  const getScoreColor = (percentage) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (percentage) => {
    if (percentage >= 80) return 'bg-green-100';
    if (percentage >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getTestTypeIcon = (testType) => {
    switch (testType) {
      case 'vocabulary':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        );
      case 'multiple_choice':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        );
      case 'grammar':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  const getTestTypeName = (testType) => {
    switch (testType) {
      case 'vocabulary': return 'Từ vựng';
      case 'multiple_choice': return 'Trắc nghiệm';
      case 'grammar': return 'Ngữ pháp';
      default: return testType;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
        <div className="flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-gray-600">Đang tải kết quả...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-600 mb-3">{error}</p>
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm relative pb-6">
      {!Array.isArray(results) || results.length === 0 ? (
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-8 flex flex-col items-center justify-center">
              <div className="text-gray-400 mb-3">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Chưa có kết quả nào</h3>
              <p className="text-gray-600 mb-4 text-center max-w-xl">
                Bạn chưa hoàn thành bài test nào. Dưới đây là một vài gợi ý để bắt đầu luyện tập — làm một bài test hoặc khám phá các chủ đề phù hợp với bạn.
              </p>
              <div className="flex gap-3 mt-3">
                <Link to="/multiple-choice/topics" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Làm bài trắc nghiệm</Link>
                <Link to="/vocabulary/topics" className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Luyện từ vựng</Link>
                <Link to="/grammar/topics" className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700">Học ngữ pháp</Link>
              </div>
            </div>

            <aside className="bg-white rounded-xl border border-gray-200 shadow-sm p-3">
              <h4 className="text-sm font-semibold text-gray-800 mb-3">Gợi ý nhanh</h4>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 grid place-items-center">1</div>
                  <div>
                    <div className="font-medium text-gray-800">Bắt đầu với bài kiểm tra ngắn</div>
                    <div className="text-xs">Chọn bài 10 câu để làm quen.</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 grid place-items-center">2</div>
                  <div>
                    <div className="font-medium text-gray-800">Luyện theo chủ đề</div>
                    <div className="text-xs">Tập trung vào chủ đề bạn yếu.</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 grid place-items-center">3</div>
                  <div>
                    <div className="font-medium text-gray-800">Xem thống kê</div>
                    <div className="text-xs">Theo dõi tiến bộ sau mỗi lần làm bài.</div>
                  </div>
                </li>
              </ul>
            </aside>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {results.map((result) => (
            <div key={result._id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4">
                    {/* Score Badge */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getScoreBg(result.percentage)}`}>
                      <span className={`text-lg font-bold ${getScoreColor(result.percentage)}`}>
                        {result.percentage}%
                      </span>
                    </div>
                    
                    {/* Test Info */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                          {getTestTypeIcon(result.test_id?.test_type)}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {result.test_id?.test_title || 'Bài test'}
                        </h3>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {getTestTypeName(result.test_id?.test_type)}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          {result.correct_count}/{result.total_questions} câu đúng
                        </span>
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {Math.round(result.duration_ms / 1000)}s
                        </span>
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m4 4a2 2 0 00-2-2h-2a2 2 0 00-2 2m0 0a2 2 0 002 2h2a2 2 0 002-2m0 0v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6m0 0V9a2 2 0 012-2h8a2 2 0 012 2v6z" />
                          </svg>
                          {new Date(result.created_at).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                      
                      {result.test_id?.main_topic && (
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {result.test_id.main_topic}
                            {result.test_id?.sub_topic && ` › ${result.test_id.sub_topic}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center space-x-3 ml-6">
                  <button
                    onClick={() => onViewDetail(result)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Xem chi tiết
                  </button>
                  
                  <button
                    onClick={() => onRetakeTest(result)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                  >
                    Làm lại
                  </button>
                  
                  {onDelete && (
                    <button
                      onClick={() => onDelete(result)}
                      className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors text-sm flex items-center gap-1"
                      title="Xóa kết quả"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Xóa
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProfileTestResultsList;