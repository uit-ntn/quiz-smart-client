import React from 'react';

const QuestionResultModal = ({ 
  isOpen, 
  onClose, 
  resultData, 
  currentQuestionIndex, 
  totalQuestions,
  onNextQuestion,
  canGoNext 
}) => {
  if (!isOpen || !resultData) return null;

  const handleNextQuestion = () => {
    onClose();
    onNextQuestion();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-slate-300 w-full max-w-xl">
        <div className="p-4 border-b border-slate-300 flex items-center justify-between">
          <div>
            <p className={`text-sm font-semibold ${resultData.isCorrect ? "text-green-700" : "text-red-700"}`}>
              {resultData.isCorrect ? "Trả lời chính xác" : "Trả lời chưa chính xác"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Câu {currentQuestionIndex + 1} / {totalQuestions}
            </p>
          </div>
          <button onClick={onClose} className="text-xs text-gray-500 hover:text-gray-800">
            Đóng
          </button>
        </div>

        <div className="p-4 space-y-4 text-sm">
          <div>
            <p className="text-gray-900 font-medium mb-1">Câu hỏi</p>
            <p className="text-gray-800 text-sm">{resultData.questionText}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="border border-slate-300 rounded p-3">
              <p className="font-semibold text-gray-900 text-xs mb-2">Đáp án đúng</p>
              <div className="flex flex-wrap gap-2">
                {resultData.correctAnswer.map((lbl) => (
                  <span key={lbl} className="inline-flex items-center px-2 py-1 rounded border border-gray-300 text-xs text-gray-800">
                    {lbl}
                  </span>
                ))}
              </div>
            </div>

            <div className="border border-slate-300 rounded p-3">
              <p className="font-semibold text-gray-900 text-xs mb-2">Bạn đã chọn</p>
              <div className="flex flex-wrap gap-2">
                {resultData.selectedAnswers.length > 0 ? (
                  resultData.selectedAnswers.map((lbl) => (
                    <span
                      key={lbl}
                      className={`inline-flex items-center px-2 py-1 rounded border text-xs ${
                        resultData.correctAnswer.includes(lbl)
                          ? "border-green-500 text-green-700"
                          : "border-red-500 text-red-700"
                      }`}
                    >
                      {lbl}
                    </span>
                  ))
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded border border-gray-300 text-xs text-gray-500">
                    Chưa chọn đáp án
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Explanation Section */}
          {resultData.explanation && (
            <div className="space-y-3">
              <div className="border-t border-gray-200 pt-3">
                <p className="text-gray-900 font-medium mb-2">Giải thích</p>
                
                {/* Correct answer explanation */}
                {resultData.explanation.correct && (
                  <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="font-semibold text-green-800 text-xs mb-1">
                      Đáp án đúng ({resultData.correctAnswer.join(', ')})
                    </p>
                    <p className="text-green-700 text-sm">{resultData.explanation.correct}</p>
                  </div>
                )}

                {/* Incorrect choices explanation */}
                {resultData.explanation.incorrect_choices && Object.keys(resultData.explanation.incorrect_choices).length > 0 && (
                  <div className="space-y-2">
                    <p className="font-semibold text-gray-900 text-xs">Giải thích các đáp án sai:</p>
                    {Object.entries(resultData.explanation.incorrect_choices).map(([choice, explanation]) => (
                      <div key={choice} className="p-2 bg-red-50 border border-red-200 rounded">
                        <p className="text-red-800 text-xs">
                          <span className="font-semibold">{choice}:</span> {explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-300 flex items-center justify-end gap-2 text-xs">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          >
            Đóng
          </button>
          {canGoNext && (
            <button
              onClick={handleNextQuestion}
              className="px-3 py-1.5 rounded bg-gray-900 text-white hover:bg-black"
            >
              Câu tiếp theo
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestionResultModal;