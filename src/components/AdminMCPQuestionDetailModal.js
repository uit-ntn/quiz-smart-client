import React from 'react';
import { isCorrectAnswer } from '../utils/correctAnswerHelpers';

const AdminMCPQuestionDetailModal = ({ 
  isOpen, 
  onClose, 
  question, 
  testInfo 
}) => {
  if (!isOpen || !question) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-[80vw] h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Chi tiết câu hỏi</h3>
            {/* Test Info Horizontal */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <span className="font-medium">Bài:</span>
                <span>{testInfo?.test_title || '—'}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-medium">Chủ đề:</span>
                <span>{testInfo?.main_topic || '—'}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-medium">Chủ đề con:</span>
                <span>{testInfo?.sub_topic || '—'}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-medium">Trạng thái:</span>
                <span>{testInfo?.visibility === 'public' ? '🌍 Công khai' : '🔒 Riêng tư'}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {/* Question */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-2 text-sm">Câu hỏi</h4>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-900 text-sm whitespace-pre-wrap break-words">{question.question_text}</p>
              </div>
            </div>

            {/* Answers and Explanations - 2 Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left Column - Options */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 text-sm">Các đáp án</h4>
                <div className="space-y-2">
                  {question.options?.map((op, i) => {
                    const isCorrect = isCorrectAnswer(question.correct_answers, op.label);
                    const optionText = op.text;
                    const optionLabel = op.label;
                    
                    return (
                      <div
                        key={i}
                        className={`flex items-start gap-2 p-3 rounded-lg border-2 ${
                          isCorrect 
                            ? 'border-emerald-500 bg-emerald-100 text-emerald-900' 
                            : 'border-gray-300 bg-gray-50 text-gray-800'
                        }`}
                      >
                        <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                          isCorrect ? 'bg-emerald-600 text-white' : 'bg-gray-500 text-white'
                        }`}>
                          {optionLabel}
                        </span>
                        <span className={`flex-1 text-sm ${
                          isCorrect ? 'font-bold' : 'font-medium'
                        }`}>
                          {optionText}
                        </span>
                        {isCorrect && (
                          <span className="text-emerald-600">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column - Explanations */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 text-sm">Giải thích</h4>
                <div className="space-y-2">
                  {question.options?.map((option, i) => {
                    const isCorrect = isCorrectAnswer(question.correct_answers, option.label);
                    let explanation = '';
                    
                    if (isCorrect && question.explanation?.correct) {
                      if (typeof question.explanation.correct === 'object') {
                        explanation = question.explanation.correct[option.label] || Object.values(question.explanation.correct)[0] || '';
                      } else {
                        explanation = question.explanation.correct;
                      }
                    } else if (!isCorrect && question.explanation?.incorrect_choices?.[option.label]) {
                      explanation = question.explanation.incorrect_choices[option.label];
                    }
                    
                    if (!explanation) return null;
                    
                    return (
                      <div
                        key={i}
                        className={`p-3 rounded-lg border-l-4 ${
                          isCorrect 
                            ? 'bg-emerald-50 border-emerald-500' 
                            : 'bg-amber-50 border-amber-500'
                        }`}
                      >
                        <div className="flex items-start">
                          <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0 ${
                            isCorrect ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                          }`}>
                            {option.label}
                          </span>
                          <div className="flex-1">
                            <p className={`text-sm ${
                              isCorrect ? 'text-emerald-700' : 'text-amber-800'
                            }`}>
                              {explanation}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Show message if no explanations */}
                  {!question.explanation?.correct && 
                   (!question.explanation?.incorrect_choices || Object.keys(question.explanation.incorrect_choices).length === 0) && (
                    <div className="p-3 bg-gray-100 rounded-lg text-center">
                      <p className="text-gray-500 text-sm">Không có giải thích</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminMCPQuestionDetailModal;