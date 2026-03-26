import React from 'react';
import { isCorrectAnswer } from '../utils/correctAnswerHelpers';

const AdminMCPQuestionDetailModal = ({ isOpen, onClose, question, testInfo }) => {
  if (!isOpen || !question) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl border-[3px] border-amber-500 ring-2 ring-amber-100 shadow-2xl w-[80vw] h-[80vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-700 px-5 py-4 flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-white/20 border-2 border-white/40 flex items-center justify-center text-lg">📝</div>
                <h3 className="text-base font-extrabold text-white">Chi tiết câu hỏi</h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {testInfo?.test_title && (
                  <span className="inline-flex items-center rounded-full border-2 border-white/40 bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">
                    📋 {testInfo.test_title}
                  </span>
                )}
                {testInfo?.main_topic && (
                  <span className="inline-flex items-center rounded-full border-2 border-white/40 bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">
                    📚 {testInfo.main_topic}{testInfo.sub_topic ? ` / ${testInfo.sub_topic}` : ''}
                  </span>
                )}
                {testInfo?.visibility && (
                  <span className="inline-flex items-center rounded-full border-2 border-white/40 bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">
                    {testInfo.visibility === 'public' ? '🌍 Công khai' : '🔒 Riêng tư'}
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/20 border-2 border-white/40 flex items-center justify-center text-white hover:bg-white/30 transition-colors shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 bg-gradient-to-br from-amber-50/40 to-orange-50/30">
          <div className="space-y-4">

            {/* Question text */}
            <div className="rounded-2xl border-[3px] border-amber-400 bg-white overflow-hidden">
              <div className="bg-amber-600 px-4 py-2">
                <span className="text-xs font-extrabold text-white uppercase tracking-wide">📖 Câu hỏi</span>
              </div>
              <div className="p-4">
                <p className="text-slate-900 text-sm font-medium whitespace-pre-wrap break-words leading-relaxed">
                  {question.question_text}
                </p>
              </div>
            </div>

            {/* 2-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Left – Options */}
              <div className="rounded-2xl border-[3px] border-orange-400 bg-white overflow-hidden">
                <div className="bg-orange-600 px-4 py-2">
                  <span className="text-xs font-extrabold text-white uppercase tracking-wide">✅ Các đáp án</span>
                </div>
                <div className="p-4 space-y-2">
                  {question.options?.map((op, i) => {
                    const isCorrect = isCorrectAnswer(question.correct_answers, op.label);
                    return (
                      <div key={i}
                        className={`flex items-start gap-2.5 p-3 rounded-xl border-2 ${isCorrect
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-slate-200 bg-slate-50'}`}>
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-extrabold shrink-0 ${isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-500 text-white'}`}>
                          {op.label}
                        </span>
                        <span className={`flex-1 text-sm ${isCorrect ? 'font-bold text-emerald-900' : 'font-medium text-slate-800'}`}>
                          {op.text}
                        </span>
                        {isCorrect && (
                          <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right – Explanations */}
              <div className="rounded-2xl border-[3px] border-amber-400 bg-white overflow-hidden">
                <div className="bg-amber-700 px-4 py-2">
                  <span className="text-xs font-extrabold text-white uppercase tracking-wide">💡 Giải thích</span>
                </div>
                <div className="p-4 space-y-2">
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
                      <div key={i}
                        className={`p-3 rounded-xl border-l-4 border-2 ${isCorrect
                          ? 'bg-emerald-50 border-emerald-400 border-l-emerald-700'
                          : 'bg-amber-50 border-amber-400 border-l-amber-700'}`}>
                        <div className="flex items-start gap-2">
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-extrabold shrink-0 ${isCorrect ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'}`}>
                            {option.label}
                          </span>
                          <p className={`text-sm font-medium ${isCorrect ? 'text-emerald-800' : 'text-amber-900'}`}>
                            {explanation}
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  {!question.explanation?.correct &&
                    (!question.explanation?.incorrect_choices || Object.keys(question.explanation.incorrect_choices).length === 0) && (
                      <div className="p-4 rounded-xl border-2 border-slate-200 bg-slate-50 text-center">
                        <p className="text-slate-500 text-sm font-medium">Không có giải thích</p>
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-amber-200 bg-amber-50 px-5 py-3 flex justify-end">
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl border-[3px] border-amber-700 bg-amber-600 text-sm font-extrabold text-white hover:bg-amber-700 transition-colors shadow-md">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminMCPQuestionDetailModal;
