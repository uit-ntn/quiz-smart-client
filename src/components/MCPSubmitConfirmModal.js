import React from 'react';

const SubmitConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  answeredCount, 
  totalQuestions 
}) => {
  if (!isOpen) return null;

  const unansweredCount = totalQuestions - answeredCount;

  const handleConfirm = () => {
    onClose();
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border-[3px] border-orange-500 ring-2 ring-orange-200 shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 border-2 border-white/40 flex items-center justify-center text-xl">
              📋
            </div>
            <div>
              <p className="text-base font-extrabold text-white">Xác nhận nộp bài</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="inline-flex items-center gap-1 rounded-full border-2 border-white/40 bg-white/20 px-2 py-0.5 text-[11px] font-bold text-white">
                  ✅ {answeredCount}/{totalQuestions} câu đã trả lời
                </span>
                {unansweredCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border-2 border-white/40 bg-white/20 px-2 py-0.5 text-[11px] font-bold text-white">
                    ⚠️ {unansweredCount} câu bỏ trống
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5">
          {unansweredCount > 0 ? (
            <div className="rounded-xl border-[3px] border-amber-500 bg-amber-100 p-4 text-amber-900 text-sm font-bold">
              ⚠️ Bạn còn <span className="text-amber-700 font-extrabold">{unansweredCount}</span> câu chưa trả lời. Bạn vẫn muốn nộp bài chứ?
            </div>
          ) : (
            <div className="rounded-xl border-[3px] border-emerald-500 bg-emerald-100 p-4 text-emerald-900 text-sm font-bold">
              ✅ Bạn đã trả lời tất cả <span className="text-emerald-700 font-extrabold">{totalQuestions}</span> câu hỏi. Nộp bài ngay?
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex items-center justify-end gap-2.5">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl border-[3px] border-slate-300 bg-white text-slate-700 text-sm font-extrabold hover:bg-slate-50 transition-colors">
            Quay lại
          </button>
          <button onClick={handleConfirm}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 border-[3px] border-red-900 text-white text-sm font-extrabold hover:from-orange-700 hover:to-red-700 transition-colors shadow-md">
            Nộp bài
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubmitConfirmModal;