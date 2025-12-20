import React from 'react';

const VocabularyPreviewModal = ({ 
  isOpen, 
  onClose, 
  items, 
  isPlaying, 
  onPlayAudio, 
  onStartTest,
  testTitle,
  loading = false 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[85vh] overflow-hidden mt-8 flex flex-col">
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{testTitle || 'Danh sách từ vựng trong bài kiểm tra'}</h2>
          <p className="text-gray-600">Hãy xem qua các từ vựng trước khi bắt đầu làm bài</p>
        </div>
        
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-4 text-gray-600">Đang tải từ vựng...</span>
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16 hidden">
                    STT
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                    Từ vựng
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                    Nghĩa
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden">
                    Câu mẫu
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 hidden">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-gray-900">{item.word}</div>
                        </div>
                        <button
                          onClick={() => onPlayAudio(item.word)}
                          disabled={isPlaying}
                          className="p-1.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50 flex-shrink-0"
                          title="Nghe phát âm"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.797l-4.146-3.32a1 1 0 00-.632-.227H2a1 1 0 01-1-1V7a1 1 0 011-1h1.605a1 1 0 00.632-.227l4.146-3.32a1 1 0 011.6.623zM14 7a3 3 0 013 3v0a3 3 0 01-3 3" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-xs text-gray-900">{item.meaning}</div>
                    </td>
                    <td className="px-4 py-4 hidden">
                      {item.example_sentence ? (
                        <div className="flex items-start space-x-3">
                          <div className="flex-1">
                            <p className="text-xs text-gray-700 italic">"{item.example_sentence}"</p>
                          </div>
                          <button
                            onClick={() => onPlayAudio(item.example_sentence, true)}
                            disabled={isPlaying}
                            className="p-1 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors disabled:opacity-50 flex-shrink-0"
                            title="Nghe câu mẫu"
                          >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.797l-4.146-3.32a1 1 0 00-.632-.227H2a1 1 0 01-1-1V7a1 1 0 011-1h1.605a1 1 0 00.632-.227l4.146-3.32a1 1 0 011.6.623zM14 7a3 3 0 013 3v0a3 3 0 01-3 3" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Không có câu mẫu</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
        
        <div className="p-6 border-t border-gray-200 flex justify-between items-center bg-gray-50 flex-shrink-0">
          <div className="text-sm text-gray-600">
            Tổng cộng <span className="font-semibold">{items.length}</span> từ vựng
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-2 py-1 sm:px-3 sm:py-1.5 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
            >
              Quay lại
            </button>
            <button
              onClick={onStartTest}
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg"
            >
              Sẵn sàng bắt đầu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VocabularyPreviewModal;