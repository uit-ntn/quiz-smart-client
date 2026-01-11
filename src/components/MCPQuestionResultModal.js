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

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-2 sm:p-3">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`p-2.5 sm:p-3 border-b flex items-center justify-between flex-shrink-0 ${
          resultData.isCorrect 
            ? "bg-green-50 border-green-200" 
            : "bg-red-50 border-red-200"
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
              resultData.isCorrect 
                ? "bg-green-600 text-white" 
                : "bg-red-600 text-white"
            }`}>
              {resultData.isCorrect ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <div>
              <p className={`text-sm font-bold ${resultData.isCorrect ? "text-green-800" : "text-red-800"}`}>
                {resultData.isCorrect ? "Trả lời chính xác" : "Trả lời chưa chính xác"}
              </p>
              <p className="text-[10px] text-gray-600 mt-0.5">
                Câu {currentQuestionIndex + 1} / {totalQuestions}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-6 h-6 rounded-md bg-white hover:bg-gray-50 border border-slate-300 flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors"
            aria-label="Đóng"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
          {/* Question */}
          <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200">
            <p className="text-xs text-gray-500 font-medium mb-1.5">Câu hỏi</p>
            <p className="text-xs sm:text-sm text-gray-900 leading-snug">{resultData.questionText}</p>
          </div>

          {/* Answer Comparison */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-green-50 rounded-lg p-2 border border-green-200">
              <p className="text-[10px] font-semibold text-green-800 mb-1.5">Đáp án đúng</p>
              <div className="flex flex-wrap gap-1.5">
                {resultData.correctAnswer.map((lbl) => (
                  <span 
                    key={lbl} 
                    className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-green-600 text-white font-bold text-xs"
                  >
                    {lbl}
                  </span>
                ))}
              </div>
            </div>

            <div className={`rounded-lg p-2 border ${
              resultData.selectedAnswers.length > 0 && resultData.selectedAnswers.every(lbl => resultData.correctAnswer.includes(lbl))
                ? "bg-green-50 border-green-200"
                : resultData.selectedAnswers.length > 0
                ? "bg-red-50 border-red-200"
                : "bg-slate-50 border-slate-200"
            }`}>
              <p className={`text-[10px] font-semibold mb-1.5 ${
                resultData.selectedAnswers.length > 0 && resultData.selectedAnswers.every(lbl => resultData.correctAnswer.includes(lbl))
                  ? "text-green-800"
                  : resultData.selectedAnswers.length > 0
                  ? "text-red-800"
                  : "text-slate-600"
              }`}>
                Bạn đã chọn
              </p>
              <div className="flex flex-wrap gap-1.5">
                {resultData.selectedAnswers.length > 0 ? (
                  resultData.selectedAnswers.map((lbl) => (
                    <span
                      key={lbl}
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-md font-bold text-xs ${
                        resultData.correctAnswer.includes(lbl)
                          ? "bg-green-600 text-white"
                          : "bg-red-600 text-white"
                      }`}
                    >
                      {lbl}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-slate-500">Chưa chọn</span>
                )}
              </div>
            </div>
          </div>

          {/* Explanation Section */}
          {resultData.explanation && (
            <div className="space-y-2.5">
              <div className="border-t border-slate-200 pt-2.5">
                <p className="text-xs font-bold text-gray-900 mb-2">Giải thích</p>
                
                {/* Correct answer explanation */}
                {resultData.explanation.correct && (
                  <div className="mb-2.5 p-2.5 bg-green-50 border border-green-300 rounded-lg">
                    <p className="font-semibold text-green-800 text-[10px] mb-1.5">
                      Đáp án đúng ({resultData.correctAnswer.join(', ')})
                    </p>
                    {typeof resultData.explanation.correct === 'object' && Object.keys(resultData.explanation.correct).length > 0 ? (
                      <div className="space-y-1.5">
                        {Object.entries(resultData.explanation.correct).map(([option, text]) => {
                          const explanationText = typeof text === 'string' ? text : String(text || '');
                          return (
                            <div key={option} className="flex items-start gap-1.5 bg-white/70 rounded p-1.5 border border-green-200">
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-green-600 text-white font-bold text-[10px] flex-shrink-0">
                                {option}
                              </span>
                              <p className="text-xs text-green-800 leading-snug flex-1">{explanationText}</p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-green-800 leading-snug">
                        {typeof resultData.explanation.correct === 'string' 
                          ? resultData.explanation.correct 
                          : String(resultData.explanation.correct || '')}
                      </p>
                    )}
                  </div>
                )}

                {/* Incorrect answer explanations */}
                {resultData.explanation.incorrect_choices && Object.keys(resultData.explanation.incorrect_choices).length > 0 && (() => {
                  // Only show explanations for choices that are NOT correct answers
                  const incorrectEntries = Object.entries(resultData.explanation.incorrect_choices)
                    .filter(([choice, explanation]) => {
                      // Filter out if it's empty or if this choice is actually a correct answer
                      const explanationText = typeof explanation === 'string' ? explanation : String(explanation || '');
                      if (!explanationText || !explanationText.trim()) return false;
                      // Only show if this choice is NOT in the correct answers list
                      return !resultData.correctAnswer.includes(choice);
                    });
                  
                  return incorrectEntries.length > 0 && (
                    <div className="space-y-2">
                      <p className="font-semibold text-red-800 text-[10px] mb-1.5">Giải thích các đáp án sai</p>
                      <div className="space-y-1.5">
                        {incorrectEntries.map(([choice, explanation]) => {
                          const explanationText = typeof explanation === 'string' ? explanation : String(explanation || '');
                          return (
                            <div key={choice} className="flex items-start gap-1.5 bg-red-50 border border-red-200 rounded-lg p-1.5">
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-red-600 text-white font-bold text-[10px] flex-shrink-0">
                                {choice}
                              </span>
                              <p className="text-xs text-red-800 leading-snug flex-1">{explanationText}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-50 p-2.5 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-gray-700 hover:bg-slate-50 font-medium text-xs transition-colors"
          >
            Đóng
          </button>
          {onPreview && (
            <button
              onClick={onPreview}
              className="px-3 py-1.5 rounded-lg border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium text-xs transition-colors"
            >
              Xem trước
            </button>
          )}
          {canGoNext && (
            <button
              onClick={handleNextQuestion}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-semibold text-xs transition-colors flex items-center gap-1.5"
            >
              Tiếp theo
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestionResultModal;