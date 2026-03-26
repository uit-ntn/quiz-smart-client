import React, { useState, useContext } from 'react';
import AuthContext from '../context/AuthContext';
import LoginPromptModal from './LoginPromptModal';
import { getCorrectAnswerLabels, isCorrectAnswer } from '../utils/correctAnswerHelpers';

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

  if (!isOpen) return null;

  const handleExportClick = () => {
    if (user && onExport) { onExport(); }
    else if (!user) {
      setLoginModal({ isOpen: true, type: 'export', title: loginModal.freeExportsLeft > 0 ? 'Xuất file PDF/DOCX' : 'Đã hết lượt xuất file miễn phí', message: loginModal.freeExportsLeft > 0 ? 'Đăng nhập để xuất file không giới hạn.' : 'Bạn đã hết lượt xuất file miễn phí.', showFreeExports: true, freeExportsLeft: loginModal.freeExportsLeft });
    } else {
      setLoginModal({ isOpen: true, type: 'export_error', title: 'Không thể xuất file', message: 'Chức năng xuất file hiện không khả dụng.', showFreeExports: false, freeExportsLeft: 0 });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl border-[3px] border-violet-400 ring-2 ring-violet-200 w-full max-w-7xl max-h-[90vh] overflow-hidden mt-4 flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-purple-700 px-5 py-4 flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {(testMainTopic || testSubTopic) && (
                <p className="text-violet-200 text-xs font-bold mb-1">
                  {testMainTopic && testSubTopic ? `${testMainTopic} › ${testSubTopic}` : (testMainTopic || testSubTopic)}
                </p>
              )}
              <h2 className="text-lg font-extrabold text-white leading-tight pr-4 line-clamp-2">
                {testTitle || 'Danh sách câu hỏi trắc nghiệm'}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full border-2 border-white/40 bg-white/20 px-2.5 py-0.5 text-[11px] font-bold text-white">
                  📝 {items.length} câu hỏi
                </span>
                {createdBy && (
                  <span className="inline-flex items-center gap-1 rounded-full border-2 border-white/40 bg-white/20 px-2.5 py-0.5 text-[11px] font-bold text-white">
                    👤 {createdBy}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={handleExportClick}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-600 border-[3px] border-orange-900 text-white text-xs font-extrabold shadow-md hover:bg-orange-700 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="hidden sm:inline">Tải xuống</span>
              </button>
              <button onClick={onClose}
                className="w-8 h-8 rounded-xl bg-rose-500 border-2 border-rose-700 flex items-center justify-center text-white hover:bg-rose-600 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Questions list */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-10 h-10 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
              <span className="ml-4 text-violet-700 font-bold">Đang tải câu hỏi...</span>
            </div>
          ) : (
            <div className="px-4 pt-4 pb-2 space-y-2.5">
              {items.map((item, idx) => (
                <div key={idx} className="border-2 border-violet-200 rounded-xl p-3.5 hover:border-violet-400 hover:bg-violet-50 transition-all">
                  <div className="flex items-start gap-2.5 mb-2">
                    <span className="shrink-0 w-7 h-7 rounded-xl bg-violet-600 border-2 border-violet-800 text-white font-extrabold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <p className="text-sm font-semibold text-slate-900 leading-relaxed flex-1">{item.question_text}</p>
                  </div>

                  {user && showAnswers && (
                    <div className="ml-9 space-y-1.5">
                      {item.options && item.options.map((option, optIdx) => {
                        const isCorrect = isCorrectAnswer(item.correct_answers, option.label);
                        const shouldHighlight = showCorrectAnswers && isCorrect;
                        return (
                          <div key={optIdx} className={`flex items-start gap-2 p-2 rounded-lg border-2 transition-colors ${shouldHighlight ? 'bg-emerald-50 border-emerald-400' : 'bg-white border-violet-200'}`}>
                            <span className={`shrink-0 w-5 h-5 rounded-lg flex items-center justify-center font-extrabold text-[10px] ${shouldHighlight ? 'bg-emerald-600 text-white' : 'bg-violet-500 text-white'}`}>
                              {option.label}
                            </span>
                            <p className={`text-xs flex-1 ${shouldHighlight ? 'text-emerald-900 font-bold' : 'text-slate-700'}`}>{option.text}</p>
                            {shouldHighlight && <span className="shrink-0 text-emerald-600 font-extrabold text-[10px]">✓ Đúng</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {item.explanation && expandedQuestions.has(idx) && (
                    <div className="ml-9 mt-2 p-3 bg-indigo-50 rounded-xl border-2 border-indigo-300">
                      {!user ? (
                        <div className="text-center py-2">
                          <p className="text-xs text-slate-600 font-bold mb-2">Đăng nhập để xem giải thích chi tiết</p>
                          <button onClick={() => setLoginModal({ isOpen: true, type: 'explanation', title: 'Đăng nhập để xem giải thích', message: 'Bạn cần đăng nhập để xem giải thích.', showFreeExports: false })}
                            className="px-3 py-1 bg-violet-600 border-2 border-violet-800 text-white rounded-lg text-[10px] font-extrabold hover:bg-violet-700">
                            Đăng nhập
                          </button>
                        </div>
                      ) : (
                        <>
                          {item.explanation.correct && (
                            <div className="mb-2">
                              <div className="text-[10px] font-extrabold text-emerald-700 mb-1">✓ Giải thích đáp án đúng:</div>
                              {typeof item.explanation.correct === 'object' ? (
                                <div className="space-y-1">
                                  {Object.entries(item.explanation.correct).map(([opt, text]) => (
                                    <div key={opt} className="text-xs text-emerald-800 bg-white p-2 rounded-lg border-2 border-emerald-200">
                                      <span className="font-extrabold">{opt}:</span> {text}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-xs text-emerald-800 bg-white p-2 rounded-lg border-2 border-emerald-200">{item.explanation.correct}</div>
                              )}
                            </div>
                          )}
                          {item.explanation.incorrect_choices && Object.keys(item.explanation.incorrect_choices).length > 0 && (
                            <div>
                              <div className="text-[10px] font-extrabold text-rose-700 mb-1">✗ Giải thích các đáp án sai:</div>
                              <div className="space-y-1">
                                {Object.entries(item.explanation.incorrect_choices).filter(([, e]) => e && String(e).trim()).map(([label, exp]) => (
                                  <div key={label} className="text-xs text-rose-800 bg-white p-2 rounded-lg border-2 border-rose-200">
                                    <span className="font-extrabold">{label}:</span> {exp}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {item.tags && item.tags.length > 0 && (
                    <div className="ml-9 mt-2 flex flex-wrap gap-1.5">
                      {item.tags.map((tag, tagIdx) => (
                        <span key={tagIdx} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-700 border border-violet-300">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t-2 border-violet-800 bg-gradient-to-r from-violet-600 to-purple-700 flex-shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1 rounded-full border-2 border-violet-400 bg-violet-100 px-3 py-1 text-xs font-extrabold text-violet-700">
              📝 {items.length} câu hỏi
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => { if (!user) { setLoginModal({ isOpen: true, type: 'answers', title: 'Đăng nhập để xem câu trả lời', message: 'Bạn cần đăng nhập để xem các lựa chọn.', showFreeExports: false }); return; } setShowAnswers(!showAnswers); }}
                className={`px-3 py-1.5 text-xs rounded-xl border-[3px] font-extrabold shadow-sm transition-colors ${showAnswers ? 'bg-blue-700 border-blue-900 text-white' : 'bg-blue-600 border-blue-800 text-white hover:bg-blue-700'}`}>
                {showAnswers ? 'Ẩn câu trả lời' : 'Hiện câu trả lời'}
              </button>
              <button
                onClick={() => { if (!user) { setLoginModal({ isOpen: true, type: 'correct_answers', title: 'Đăng nhập để xem đáp án', message: 'Bạn cần đăng nhập để xem đáp án.', showFreeExports: false }); return; } setShowCorrectAnswers(!showCorrectAnswers); }}
                className={`px-3 py-1.5 text-xs rounded-xl border-[3px] font-extrabold shadow-sm transition-colors ${showCorrectAnswers ? 'bg-emerald-700 border-emerald-900 text-white' : 'bg-emerald-600 border-emerald-800 text-white hover:bg-emerald-700'}`}>
                {showCorrectAnswers ? 'Ẩn đáp án' : 'Hiện đáp án'}
              </button>
              <button
                onClick={() => { if (!user) { setLoginModal({ isOpen: true, type: 'explanations', title: 'Đăng nhập để xem giải thích', message: 'Bạn cần đăng nhập để xem giải thích.', showFreeExports: false }); return; } setExpandedQuestions(prev => { if (showAllExplanations) return new Set(); const all = new Set(); items.forEach((_, i) => all.add(i)); return all; }); setShowAllExplanations(prev => !prev); }}
                className={`px-3 py-1.5 text-xs rounded-xl border-[3px] font-extrabold shadow-sm transition-colors ${showAllExplanations ? 'bg-fuchsia-700 border-fuchsia-900 text-white' : 'bg-fuchsia-600 border-fuchsia-800 text-white hover:bg-fuchsia-700'}`}>
                {showAllExplanations ? 'Ẩn giải thích' : 'Hiện giải thích'}
              </button>
              <button onClick={onStartTest}
                className="px-4 py-1.5 text-sm rounded-xl bg-gradient-to-r from-orange-600 to-red-600 border-[3px] border-red-900 text-white font-extrabold shadow-md hover:from-orange-700 hover:to-red-700 transition-colors">
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