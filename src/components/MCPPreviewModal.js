import React, { useState, useContext } from 'react';
import AuthContext from '../context/AuthContext';
import LoginPromptModal from './LoginPromptModal';

const MCPPreviewModal = ({ 
  isOpen, 
  onClose, 
  items = [], 
  onStartTest,
  testTitle,
  testMainTopic,
  testSubTopic,
  loading = false,
  showExplanation = false, // Option to show/hide explanation in preview
  onExport = null, // Thêm prop onExport
  createdBy = null // Tên người tạo
}) => {
  const { user } = useContext(AuthContext);
  const [expandedQuestions, setExpandedQuestions] = useState(new Set());
  const [showAnswers, setShowAnswers] = useState(false);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);
  const [showAllExplanations, setShowAllExplanations] = useState(false);
  const [loginModal, setLoginModal] = useState({ isOpen: false, type: '', freeExportsLeft: 2 });

  // Debug: Log the received props to console
  console.log('MCPPreviewModal props:', { testTitle, testMainTopic, testSubTopic });

  // Helper function to get correct answer labels - supports both Array and Map/Object format
  const getCorrectAnswerLabels = (correctAnswers) => {
    if (!correctAnswers) return [];
    if (Array.isArray(correctAnswers)) return correctAnswers;
    if (typeof correctAnswers === 'object' && correctAnswers.constructor === Map) {
      return Array.from(correctAnswers.keys());
    }
    if (typeof correctAnswers === 'object') {
      return Object.keys(correctAnswers);
    }
    return [];
  };

  // Helper function to check if a label is a correct answer
  const isCorrectAnswer = (correctAnswers, label) => {
    if (!correctAnswers || !label) return false;
    if (Array.isArray(correctAnswers)) return correctAnswers.includes(label);
    if (typeof correctAnswers === 'object' && correctAnswers.constructor === Map) {
      return correctAnswers.has(label);
    }
    if (typeof correctAnswers === 'object') {
      return correctAnswers.hasOwnProperty(label);
    }
    return false;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[85vh] overflow-hidden mt-8 flex flex-col relative">
        {/* Icon buttons at top right corner */}
        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
          <button
            onClick={() => {
              if (user && onExport) {
                // User đã login và có function export → gọi export trực tiếp
                onExport();
              } else if (!user) {
                // User chưa login → hiện modal với thông tin free exports
                setLoginModal({ 
                  isOpen: true, 
                  type: 'export',
                  title: loginModal.freeExportsLeft > 0 ? 'Xuất file PDF/DOCX' : 'Đã hết lượt xuất file miễn phí',
                  message: loginModal.freeExportsLeft > 0 
                    ? 'Đăng nhập để xuất file không giới hạn hoặc tiếp tục với tài khoản khách.'
                    : 'Bạn đã hết lượt xuất file miễn phí. Vui lòng đăng nhập để tiếp tục xuất file không giới hạn.',
                  showFreeExports: true,
                  freeExportsLeft: loginModal.freeExportsLeft
                });
              } else {
                // User đã login nhưng không có onExport function → hiện modal thông báo
                setLoginModal({ 
                  isOpen: true, 
                  type: 'export_error',
                  title: 'Không thể xuất file',
                  message: 'Chức năng xuất file hiện không khả dụng. Vui lòng thử lại sau.',
                  showFreeExports: false,
                  freeExportsLeft: 0
                });
              }
            }}
            className="w-8 h-8 sm:w-auto sm:px-3 sm:py-1.5 sm:gap-1.5 flex items-center justify-center rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors shadow-md"
            title="Tải xuống PDF/DOCX"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="hidden sm:inline text-xs font-semibold">Tải xuống PDF/DOCX</span>
          </button>
          <button
            onClick={onClose}
            className="w-8 h-8 sm:w-auto sm:px-3 sm:py-1.5 sm:gap-1.5 flex items-center justify-center rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors shadow-md"
            title="Đóng"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="hidden sm:inline text-xs font-semibold">Đóng</span>
          </button>
        </div>

        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div>
            {/* Main topic and sub topic header */}
            {(testMainTopic || testSubTopic) && (
              <div className="mb-2">
                <h1 className="text-xl font-bold text-blue-900">
                  {testMainTopic && testSubTopic ? `${testMainTopic} - ${testSubTopic}` : (testMainTopic || testSubTopic)}
                </h1>
              </div>
            )}
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2 pr-20 sm:pr-64">
              {testTitle || 'Danh sách câu hỏi trắc nghiệm trong bài kiểm tra'}
            </h2>
            <p className="hidden sm:block text-gray-600 mb-1">Hãy xem qua các câu hỏi trước khi bắt đầu làm bài</p>
            {createdBy && (
              <p className="text-sm text-gray-500">
                Được tạo bởi: <span className="font-semibold text-gray-700">{createdBy}</span>
              </p>
            )}
          </div>
        </div>
        
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-4 text-gray-600">Đang tải câu hỏi...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="px-4 pt-4 pb-2 space-y-3">
                {items.map((item, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                    {/* Question Number and Text */}
                    <div className="mb-2">
                      <div className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900 leading-relaxed">
                            {item.question_text}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Options - Hiển thị khi đã đăng nhập và bật hiển thị */}
                    {user && showAnswers && (
                      <div className="ml-8 space-y-1.5">
                        {item.options && item.options.map((option, optIdx) => {
                          const isCorrect = isCorrectAnswer(item.correct_answers, option.label);
                          const shouldHighlight = showCorrectAnswers && isCorrect;
                          return (
                            <div
                              key={optIdx}
                              className={`flex items-start gap-2 p-2 rounded-lg border transition-colors ${
                                shouldHighlight
                                  ? 'bg-green-50 border-green-200'
                                  : 'bg-gray-50 border-gray-200'
                              }`}
                            >
                              <span
                                className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                                  shouldHighlight
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-300 text-gray-700'
                                }`}
                              >
                                {option.label}
                              </span>
                              <div className="flex-1">
                                <p className={`text-xs ${
                                  shouldHighlight ? 'text-green-900 font-medium' : 'text-gray-700'
                                }`}>
                                  {option.text}
                                </p>
                              </div>
                              {shouldHighlight && (
                                <span className="flex-shrink-0 text-green-600 font-semibold text-[10px]">
                                  ✓ Đúng
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Explanation Section - controlled by global toggle */}
                    {item.explanation && expandedQuestions.has(idx) && (
                      <div className="ml-8 mt-2">
                        <div className="mt-2 space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          {!user ? (
                            <div className="text-center py-3">
                              <p className="text-xs text-gray-600 mb-2">Đăng nhập để xem giải thích chi tiết</p>
                              <button 
                                onClick={() => setLoginModal({ 
                                  isOpen: true, 
                                  type: 'explanation',
                                  title: 'Đăng nhập để xem giải thích',
                                  message: 'Bạn cần đăng nhập để có thể xem giải thích chi tiết cho các câu hỏi.',
                                  showFreeExports: false
                                })}
                                className="px-2 py-1 bg-blue-600 text-white rounded text-[10px] hover:bg-blue-700"
                              >
                                Đăng nhập
                              </button>
                            </div>
                          ) : (
                            <>
                              {/* Correct Answer Explanation */}
                              {item.explanation.correct && typeof item.explanation.correct === 'object' && Object.keys(item.explanation.correct).length > 0 ? (
                                <div>
                                  <div className="text-[10px] font-semibold text-blue-900 mb-1">
                                    Giải thích đáp án đúng:
                                  </div>
                                  <div className="space-y-1">
                                    {Object.entries(item.explanation.correct).map(([option, text]) => (
                                      <div key={option} className="text-xs text-blue-800 bg-white p-2 rounded border border-blue-200">
                                        <span className="font-medium text-blue-900">{option}:</span> {text}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : item.explanation.correct && (
                                <div>
                                  <div className="text-[10px] font-semibold text-blue-900 mb-1">
                                    Giải thích đáp án đúng:
                                  </div>
                                  <div className="text-xs text-blue-800 bg-white p-2 rounded border border-blue-200">
                                    {item.explanation.correct}
                                  </div>
                                </div>
                              )}

                              {/* Incorrect Answer Explanations */}
                              {item.explanation.incorrect_choices && Object.keys(item.explanation.incorrect_choices).length > 0 && (
                                <div className="mt-2">
                                  <div className="text-[10px] font-semibold text-red-900 mb-1.5">
                                    Giải thích các đáp án sai:
                                  </div>
                                  <div className="space-y-1.5">
                                    {Object.entries(item.explanation.incorrect_choices)
                                      .filter(([label, explanation]) => explanation && explanation.trim())
                                      .map(([label, explanation]) => (
                                        <div
                                          key={label}
                                          className="text-xs text-red-800 bg-red-50 p-2 rounded border border-red-200"
                                        >
                                          <span className="font-semibold text-red-900">
                                            {label}:
                                          </span>{' '}
                                          {explanation}
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Tags (if available) */}
                    {item.tags && item.tags.length > 0 && (
                      <div className="ml-8 mt-2 flex flex-wrap gap-1.5">
                        {item.tags.map((tag, tagIdx) => (
                          <span
                            key={tagIdx}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="hidden sm:block p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-gray-600">
              Tổng cộng <span className="font-semibold">{items.length}</span> câu hỏi
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  if (!user) {
                    setLoginModal({ 
                      isOpen: true, 
                      type: 'answers',
                      title: 'Đăng nhập để xem câu trả lời',
                      message: 'Bạn cần đăng nhập để có thể xem tất cả các lựa chọn trả lời.',
                      showFreeExports: false
                    });
                    return;
                  }
                  setShowAnswers(!showAnswers);
                }}
                className={`px-4 py-1.5 text-sm rounded transition-colors font-semibold shadow-sm ${
                  showAnswers 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {showAnswers ? 'Ẩn câu trả lời' : 'Hiện câu trả lời'}
              </button>
              <button
                onClick={() => {
                  if (!user) {
                    setLoginModal({ 
                      isOpen: true, 
                      type: 'correct_answers',
                      title: 'Đăng nhập để xem đáp án',
                      message: 'Bạn cần đăng nhập để có thể xem đáp án chính xác của các câu hỏi.',
                      showFreeExports: false
                    });
                    return;
                  }
                  setShowCorrectAnswers(!showCorrectAnswers);
                }}
                className={`px-4 py-1.5 text-sm rounded transition-colors font-semibold shadow-sm ${
                  showCorrectAnswers 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                {showCorrectAnswers ? 'Ẩn đáp án' : 'Hiện đáp án'}
              </button>
              <button
                onClick={() => {
                  if (!user) {
                    setLoginModal({ 
                      isOpen: true, 
                      type: 'explanations',
                      title: 'Đăng nhập để xem giải thích',
                      message: 'Bạn cần đăng nhập để có thể xem giải thích chi tiết cho tất cả câu hỏi.',
                      showFreeExports: false
                    });
                    return;
                  }
                  setExpandedQuestions(prev => {
                    if (showAllExplanations) {
                      return new Set();
                    }
                    const all = new Set();
                    items.forEach((_, index) => all.add(index));
                    return all;
                  });
                  setShowAllExplanations(prev => !prev);
                }}
                className={`px-4 py-1.5 text-sm rounded transition-colors font-semibold shadow-sm ${
                  showAllExplanations
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-purple-500 text-white hover:bg-purple-600'
                }`}
              >
                {showAllExplanations ? 'Ẩn giải thích' : 'Hiện giải thích'}
              </button>
              <button
                onClick={onStartTest}
                className="px-4 py-1.5 text-sm rounded transition-colors font-semibold shadow-sm bg-orange-500 text-white hover:bg-orange-600"
              >
                Sẵn sàng bắt đầu
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Login Prompt Modal */}
      <LoginPromptModal
        isOpen={loginModal.isOpen}
        onClose={() => setLoginModal({ ...loginModal, isOpen: false })}
        title={loginModal.title}
        message={loginModal.message}
        showFreeExports={loginModal.showFreeExports}
        freeExportsLeft={loginModal.freeExportsLeft}
        showGuestOption={loginModal.type === 'export' && loginModal.freeExportsLeft > 0}
        onLogin={() => {
          // TODO: Implement Google login
          console.log('Login with Google');
          setLoginModal({ ...loginModal, isOpen: false });
        }}
        onContinueGuest={() => {
          if (loginModal.type === 'export' && onExport && loginModal.freeExportsLeft > 0) {
            setLoginModal({ 
              ...loginModal, 
              freeExportsLeft: loginModal.freeExportsLeft - 1, 
              isOpen: false 
            });
            onExport();
          }
        }}
      />
    </div>
  );
};

export default MCPPreviewModal;