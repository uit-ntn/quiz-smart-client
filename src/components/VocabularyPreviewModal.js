import React, { useContext, useState } from 'react';
import AuthContext from '../context/AuthContext';
import LoginPromptModal from './LoginPromptModal';

const VocabularyPreviewModal = ({ 
  isOpen, 
  onClose, 
  items, 
  isPlaying, 
  onPlayAudio, 
  onStartTest,
  testTitle,
  testMainTopic,
  testSubTopic,
  loading = false,
  onPreview, // optional: mở chế độ xem trước từ nơi khác nếu cần
  onExport = null, // Thêm prop onExport
  createdBy = null // Tên người tạo
}) => {
  const { user } = useContext(AuthContext);
  const [loginModal, setLoginModal] = useState({ isOpen: false, type: '', freeExportsLeft: 2 });
  
  // Debug: Log the received props to console
  console.log('VocabularyPreviewModal props:', { testTitle, testMainTopic, testSubTopic });
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[85vh] overflow-hidden mt-8 flex flex-col relative">
        {/* Icon buttons at top right corner */}
        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
          <button
            onClick={() => {
              if (user && onExport) {
                // User đã login và có function export → gọi export trực tiếp
                onExport();
              } else if (!user) {
                // User chưa login → hiện modal với thông tin free exports
                setLoginModal({ 
                  isOpen: true, 
                  type: 'export',
                  title: loginModal.freeExportsLeft > 0 ? 'Xuất file PDF/DOCX' : 'Đã hết lượt xuất file miễn phí',
                  message: loginModal.freeExportsLeft > 0 
                    ? 'Đăng nhập để xuất file không giới hạn hoặc tiếp tục với tài khoản khách.'
                    : 'Bạn đã hết lượt xuất file miễn phí. Vui lòng đăng nhập để tiếp tục xuất file không giới hạn.',
                  showFreeExports: true,
                  freeExportsLeft: loginModal.freeExportsLeft
                });
              } else {
                // User đã login nhưng không có onExport function → hiện modal thông báo
                setLoginModal({ 
                  isOpen: true, 
                  type: 'export_error',
                  title: 'Không thể xuất file',
                  message: 'Chức năng xuất file hiện không khả dụng. Vui lòng thử lại sau.',
                  showFreeExports: false,
                  freeExportsLeft: 0
                });
              }
            }}
            className="w-8 h-8 sm:w-auto sm:px-3 sm:py-1.5 sm:gap-1.5 flex items-center justify-center rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors shadow-md"
            title="Tải xuống PDF/DOCX"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="hidden sm:inline text-xs font-semibold">Tải xuống PDF/DOCX</span>
          </button>
          <button
            onClick={onClose}
            className="w-8 h-8 sm:w-auto sm:px-3 sm:py-1.5 sm:gap-1.5 flex items-center justify-center rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors shadow-md"
            title="Đóng"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="hidden sm:inline text-xs font-semibold">Đóng</span>
          </button>
        </div>

        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div>
            {/* Main topic and sub topic header */}
            {(testMainTopic || testSubTopic) && (
              <div className="mb-2">
                <h1 className="text-xl font-bold text-blue-900">
                  {testMainTopic && testSubTopic ? `${testMainTopic} - ${testSubTopic}` : (testMainTopic || testSubTopic)}
                </h1>
              </div>
            )}
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2 pr-20 sm:pr-64">{testTitle || 'Danh sách từ vựng trong bài kiểm tra'}</h2>
            <p className="hidden sm:block text-gray-600 mb-1">Hãy xem qua các từ vựng trước khi bắt đầu làm bài</p>
            {createdBy && (
              <p className="text-sm text-gray-500">
                Được tạo bởi: <span className="font-semibold text-gray-700">{createdBy}</span>
              </p>
            )}
          </div>
        </div>
        
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-4 text-gray-600">Đang tải từ vựng...</span>
            </div>
          ) : (
          <div className="overflow-x-auto">
            <div className="px-4 pt-4 pb-2">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider w-16 hidden">
                    STT
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider w-1/5">
                    Từ vựng
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider w-1/5">
                    Nghĩa
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider w-1/5">
                    Loại từ
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider w-1/5">
                    CEFR
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider hidden">
                    Câu mẫu
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900 hidden">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1">
                          <div className="text-xs font-semibold text-gray-900">{item.word}</div>
                        </div>
                        <button
                          onClick={() => onPlayAudio(item.word)}
                          disabled={isPlaying}
                          className="p-1 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50 flex-shrink-0"
                          title="Nghe phát âm"
                        >
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.797l-4.146-3.32a1 1 0 00-.632-.227H2a1 1 0 01-1-1V7a1 1 0 011-1h1.605a1 1 0 00.632-.227l4.146-3.32a1 1 0 011.6.623zM14 7a3 3 0 013 3v0a3 3 0 01-3 3" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-[10px] text-gray-900">
                        {user ? item.meaning : '••••••••••••••••••••'}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800">
                        {item.part_of_speech === 'noun' ? 'Danh từ' :
                         item.part_of_speech === 'verb' ? 'Động từ' :
                         item.part_of_speech === 'adjective' ? 'Tính từ' :
                         item.part_of_speech === 'adverb' ? 'Trạng từ' :
                         item.part_of_speech === 'preposition' ? 'Giới từ' :
                         item.part_of_speech === 'conjunction' ? 'Liên từ' :
                         item.part_of_speech === 'pronoun' ? 'Đại từ' :
                         item.part_of_speech === 'interjection' ? 'Thán từ' :
                         item.part_of_speech || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        ['A1', 'A2'].includes(item.cefr_level) ? 'bg-green-100 text-green-800' :
                        ['B1', 'B2'].includes(item.cefr_level) ? 'bg-yellow-100 text-yellow-800' :
                        ['C1', 'C2'].includes(item.cefr_level) ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {item.cefr_level || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2 hidden">
                      {item.example_sentence ? (
                        <div className="flex items-start space-x-2">
                          <div className="flex-1">
                            <p className="text-[10px] text-gray-700 italic">"{item.example_sentence}"</p>
                          </div>
                          <button
                            onClick={() => onPlayAudio(item.example_sentence, true)}
                            disabled={isPlaying}
                            className="p-1 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors disabled:opacity-50 flex-shrink-0"
                            title="Nghe câu mẫu"
                          >
                            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.797l-4.146-3.32a1 1 0 00-.632-.227H2a1 1 0 01-1-1V7a1 1 0 011-1h1.605a1 1 0 00.632-.227l4.146-3.32a1 1 0 011.6.623zM14 7a3 3 0 013 3v0a3 3 0 01-3 3" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-400 italic">Không có câu mẫu</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
          )}
        </div>
        
        <div className="hidden sm:block p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          {/* Control buttons for showing meanings */}
          {!user && (
            <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg text-center">
              <p className="text-xs text-blue-700 mb-2">
                Đăng nhập để xem nghĩa từ vựng và xuất file
              </p>
              <div className="flex justify-center space-x-2">
                <button
                  onClick={() => setLoginModal({ 
                    isOpen: true, 
                    type: 'meanings',
                    title: 'Đăng nhập để xem nghĩa từ vựng',
                    message: 'Bạn cần đăng nhập để có thể xem nghĩa của các từ vựng trong bài test này.',
                    showFreeExports: false
                  })}
                  className="px-2 py-1 text-[10px] rounded bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Hiện nghĩa từ vựng
                </button>
                <button 
                  onClick={() => {
                    if (user && onExport) {
                      // User đã login và có function export → gọi export trực tiếp
                      onExport();
                    } else if (!user) {
                      // User chưa login → hiện modal với thông tin free exports
                      setLoginModal({ 
                        isOpen: true, 
                        type: 'export',
                        title: loginModal.freeExportsLeft > 0 ? 'Xuất file PDF/DOCX' : 'Đã hết lượt xuất file miễn phí',
                        message: loginModal.freeExportsLeft > 0 
                          ? 'Đăng nhập để xuất file không giới hạn hoặc tiếp tục với tài khoản khách.'
                          : 'Bạn đã hết lượt xuất file miễn phí. Vui lòng đăng nhập để tiếp tục xuất file không giới hạn.',
                        showFreeExports: true,
                        freeExportsLeft: loginModal.freeExportsLeft
                      });
                    } else {
                      // User đã login nhưng không có onExport function → hiện modal thông báo
                      setLoginModal({ 
                        isOpen: true, 
                        type: 'export_error',
                        title: 'Không thể xuất file',
                        message: 'Chức năng xuất file hiện không khả dụng. Vui lòng thử lại sau.',
                        showFreeExports: false,
                        freeExportsLeft: 0
                      });
                    }
                  }}
                  className="px-2 py-1 bg-blue-600 text-white rounded text-[10px] hover:bg-blue-700 transition-colors"
                >
                  Xuất file
                </button>
              </div>
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-600">
              Tổng cộng <span className="font-semibold">{items.length}</span> từ vựng
            </div>
            <div className="flex space-x-2">
              {onPreview && (
                <button
                  onClick={onPreview}
                  className="hidden sm:inline-flex px-3 py-1.5 border border-blue-200 text-blue-700 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors font-medium text-sm"
                >
                  Xem trước
                </button>
              )}
              <button
                onClick={onStartTest}
                className="px-4 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors font-semibold shadow-sm"
              >
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

export default VocabularyPreviewModal;