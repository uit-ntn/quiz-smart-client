import React, { useState } from 'react';

const AdminDeleteTestModal = ({ isOpen, onClose, test, onDeleteConfirmed }) => {
  const [deleteType, setDeleteType] = useState('soft'); // 'soft' or 'hard'
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleDelete = async () => {
    if (deleteType === 'hard' && confirmText !== test?.test_title) {
      return;
    }

    try {
      setLoading(true);
      await onDeleteConfirmed(deleteType);
      onClose();
    } catch (error) {
      console.error('Error deleting test:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setDeleteType('soft');
    setConfirmText('');
    setLoading(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen || !test) return null;

  const isHardDeleteConfirmed = deleteType === 'soft' || confirmText === test.test_title;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={handleClose} />
      
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Xóa bài kiểm tra</h2>
                <p className="text-sm text-gray-600">Chọn loại xóa phù hợp</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Test Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-gray-900 mb-1">{test.test_title}</h3>
              <p className="text-sm text-gray-600">{test.description}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span>🔖 {test.test_type}</span>
                <span>📝 {test.total_questions || 0} câu hỏi</span>
                <span>⏱️ {test.duration_minutes} phút</span>
              </div>
            </div>

            {/* Delete Options */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Chọn loại xóa:
                </label>
                <div className="space-y-3">
                  {/* Soft Delete Option */}
                  <div
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                      deleteType === 'soft'
                        ? 'border-orange-300 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setDeleteType('soft')}
                  >
                    <div className="flex items-start">
                      <input
                        type="radio"
                        name="deleteType"
                        value="soft"
                        checked={deleteType === 'soft'}
                        onChange={() => setDeleteType('soft')}
                        className="mt-1 mr-3"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">🗂️ Chuyển vào thùng rác</span>
                          <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">
                            Xóa mềm
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          Test sẽ được ẩn khỏi danh sách nhưng vẫn có thể khôi phục sau này. 
                          Dữ liệu và kết quả test sẽ được bảo toàn.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Hard Delete Option */}
                  <div
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                      deleteType === 'hard'
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setDeleteType('hard')}
                  >
                    <div className="flex items-start">
                      <input
                        type="radio"
                        name="deleteType"
                        value="hard"
                        checked={deleteType === 'hard'}
                        onChange={() => setDeleteType('hard')}
                        className="mt-1 mr-3"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">🔥 Xóa vĩnh viễn</span>
                          <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                            Xóa cứng
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          Test sẽ bị xóa hoàn toàn khỏi hệ thống. 
                          <span className="font-medium text-red-600"> Không thể khôi phục!</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hard Delete Confirmation */}
              {deleteType === 'hard' && (
                <div className="border-2 border-red-200 bg-red-50 rounded-lg p-4">
                  <div className="flex items-start mb-3">
                    <svg className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <h4 className="font-medium text-red-900 mb-1">Xác nhận xóa vĩnh viễn</h4>
                      <p className="text-sm text-red-700 mb-3">
                        Để xác nhận, vui lòng nhập chính xác tên test: 
                        <span className="font-mono bg-red-100 px-1 rounded">"{test.test_title}"</span>
                      </p>
                      <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="Nhập tên test để xác nhận..."
                        className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleDelete}
                disabled={loading || !isHardDeleteConfirmed}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center ${
                  deleteType === 'soft'
                    ? 'bg-orange-600 hover:bg-orange-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Đang xóa...
                  </>
                ) : (
                  <>
                    {deleteType === 'soft' ? '🗂️ Chuyển vào thùng rác' : '🔥 Xóa vĩnh viễn'}
                  </>
                )}
              </button>
            </div>

            {/* Warning Footer */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 text-center">
                💡 <span className="font-medium">Gợi ý:</span> Nên sử dụng "Chuyển vào thùng rác" để có thể khôi phục sau này
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDeleteTestModal;