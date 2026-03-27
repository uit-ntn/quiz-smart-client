import React, { useEffect } from 'react';

const QuestionResultModal = ({ 
  isOpen, 
  onClose, 
  resultData, 
  currentQuestionIndex, 
  totalQuestions,
  onNextQuestion,
  canGoNext,
  onPreview, // optional: xem trước / xem lại toàn bộ câu hỏi
}) => {
  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen || !resultData) return null;

  const handleNextQuestion = () => {
    onClose();
    onNextQuestion();
  };

  const isCorrect = resultData.isCorrect;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-3">
      <div className={`bg-white rounded-2xl border-[3px] shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col ${
        isCorrect ? 'border-emerald-400 ring-2 ring-emerald-200' : 'border-rose-400 ring-2 ring-rose-200'
      }`}>
        {/* Header */}
        <div className={`px-4 py-3 flex items-center justify-between flex-shrink-0 ${
          isCorrect
            ? 'bg-gradient-to-r from-emerald-600 to-teal-700'
            : 'bg-gradient-to-r from-rose-600 to-red-700'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 border-2 border-white/40 flex items-center justify-center text-xl">
              {isCorrect ? '✅' : '❌'}
            </div>
            <div>
              <p className="text-sm font-extrabold text-white">
                {isCorrect ? 'Trả lời chính xác!' : 'Trả lời chưa chính xác'}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex items-center rounded-full border-2 border-white/40 bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">
                  Câu {currentQuestionIndex + 1} / {totalQuestions}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-xl bg-white/20 border-2 border-white/40 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
          {/* Question */}
          <div className="rounded-xl border-2 border-slate-300 bg-slate-50 p-3">
            <p className="text-[10px] font-extrabold text-slate-700 mb-1.5 uppercase tracking-wide">Câu hỏi</p>
            <p className="text-xs sm:text-sm text-slate-900 font-semibold leading-snug break-words">{resultData.questionText}</p>
          </div>

          {/* Answer Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="rounded-xl border-[3px] border-emerald-500 bg-emerald-100 p-2.5">
              <p className="text-[10px] font-extrabold text-emerald-700 mb-2 uppercase tracking-wide">✓ Đáp án đúng</p>
              <div className="flex flex-wrap gap-1.5">
                {resultData.correctAnswer.map((lbl) => (
                  <span key={lbl} className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-600 border-2 border-emerald-800 text-white font-extrabold text-sm">
                    {lbl}
                  </span>
                ))}
              </div>
            </div>

            <div className={`rounded-xl border-[3px] p-2.5 ${
              resultData.selectedAnswers.length > 0 && resultData.selectedAnswers.every(l => resultData.correctAnswer.includes(l))
                ? 'border-emerald-500 bg-emerald-100'
                : resultData.selectedAnswers.length > 0
                ? 'border-rose-500 bg-rose-100'
                : 'border-slate-300 bg-slate-50'
            }`}>
              <p className={`text-[10px] font-extrabold mb-2 uppercase tracking-wide ${
                resultData.selectedAnswers.length > 0 && resultData.selectedAnswers.every(l => resultData.correctAnswer.includes(l))
                  ? 'text-emerald-700' : resultData.selectedAnswers.length > 0 ? 'text-rose-700' : 'text-slate-500'
              }`}>
                Bạn đã chọn
              </p>
              <div className="flex flex-wrap gap-1.5">
                {resultData.selectedAnswers.length > 0 ? (
                  resultData.selectedAnswers.map((lbl) => (
                    <span key={lbl} className={`inline-flex items-center justify-center w-8 h-8 rounded-xl border-2 font-extrabold text-sm text-white ${
                      resultData.correctAnswer.includes(lbl) ? 'bg-emerald-600 border-emerald-800' : 'bg-rose-600 border-rose-800'
                    }`}>
                      {lbl}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-slate-500 font-bold">Chưa chọn</span>
                )}
              </div>
            </div>
          </div>

          {/* Explanation */}
          {resultData.explanation && (
            <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3 space-y-2.5">
              <p className="text-xs font-extrabold text-amber-800 uppercase tracking-wide">📖 Giải thích</p>

              {resultData.explanation.correct && (
                <div className="p-2.5 bg-emerald-100 border-2 border-emerald-500 rounded-xl">
                  <p className="font-extrabold text-emerald-700 text-[10px] mb-2 uppercase">
                    ✓ Đáp án đúng ({resultData.correctAnswer.join(', ')})
                  </p>
                  {typeof resultData.explanation.correct === 'object' && Object.keys(resultData.explanation.correct).length > 0 ? (
                    <div className="space-y-1.5">
                      {Object.entries(resultData.explanation.correct).map(([opt, text]) => (
                        <div key={opt} className="flex items-start gap-1.5 bg-white rounded-lg p-2 border-2 border-emerald-200">
                          <span className="w-5 h-5 rounded-lg bg-emerald-600 border border-emerald-800 text-white font-extrabold text-[10px] flex items-center justify-center shrink-0">{opt}</span>
                          <p className="text-xs text-emerald-800 leading-snug break-words flex-1">{typeof text === 'string' ? text : String(text || '')}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-800 leading-snug break-words">{typeof resultData.explanation.correct === 'string' ? resultData.explanation.correct : String(resultData.explanation.correct || '')}</p>
                  )}
                </div>
              )}

              {resultData.explanation.incorrect_choices && (() => {
                const incorrectEntries = Object.entries(resultData.explanation.incorrect_choices).filter(([choice, exp]) => {
                  const t = typeof exp === 'string' ? exp : String(exp || '');
                  return t.trim() && !resultData.correctAnswer.includes(choice);
                });
                return incorrectEntries.length > 0 && (
                  <div className="p-2.5 bg-rose-100 border-2 border-rose-500 rounded-xl">
                    <p className="font-extrabold text-rose-700 text-[10px] mb-2 uppercase">✗ Giải thích các đáp án sai</p>
                    <div className="space-y-1.5">
                      {incorrectEntries.map(([choice, exp]) => (
                        <div key={choice} className="flex items-start gap-1.5 bg-white rounded-lg p-2 border-2 border-rose-200">
                          <span className="w-5 h-5 rounded-lg bg-rose-600 border border-rose-800 text-white font-extrabold text-[10px] flex items-center justify-center shrink-0">{choice}</span>
                          <p className="text-xs text-rose-800 leading-snug break-words flex-1">{typeof exp === 'string' ? exp : String(exp || '')}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t-2 border-slate-200 p-3 flex items-center justify-end gap-2">
          <button onClick={onClose}
            className="px-3 py-1.5 rounded-xl border-[3px] border-slate-300 bg-white text-slate-700 font-extrabold text-xs hover:bg-slate-50 transition-colors">
            Đóng
          </button>
          {onPreview && (
            <button onClick={onPreview}
              className="px-3 py-1.5 rounded-xl border-[3px] border-slate-300 bg-white text-slate-700 font-extrabold text-xs hover:bg-slate-100 transition-colors">
              Xem trước
            </button>
          )}
          {canGoNext && (
            <button onClick={handleNextQuestion}
              className="px-4 py-1.5 rounded-xl bg-fuchsia-600 border-[3px] border-fuchsia-800 text-white font-extrabold text-xs hover:bg-fuchsia-700 transition-colors flex items-center gap-1.5">
              Tiếp theo
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestionResultModal;