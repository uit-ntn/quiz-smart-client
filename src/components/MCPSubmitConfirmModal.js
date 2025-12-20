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
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-slate-300 w-full max-w-md">
        <div className="p-4 border-b border-slate-300">
          <p className="text-sm font-semibold text-gray-900">Xác nhận nộp bài</p>
          <p className="text-xs text-gray-600 mt-1">
            Bạn đã trả lời <span className="font-semibold">{answeredCount}</span>/{totalQuestions} câu.
          </p>
        </div>

        <div className="p-4 text-sm">
          {unansweredCount > 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900 text-xs">
              Bạn còn <span className="font-semibold">{unansweredCount}</span> câu chưa trả lời. Bạn vẫn muốn nộp bài chứ?
            </div>
          ) : (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-900 text-xs">
              Bạn đã trả lời tất cả câu hỏi. Nộp bài ngay?
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-300 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 rounded border border-gray-300 bg-white text-gray-700 text-xs hover:bg-gray-50"
          >
            Quay lại
          </button>
          <button
            onClick={handleConfirm}
            className="px-3 py-2 rounded bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
          >
            Nộp bài
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubmitConfirmModal;