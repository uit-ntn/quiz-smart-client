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

  const handleExportClick = () => {
    if (user && onExport) { onExport(); }
    else if (!user) {
      setLoginModal({
        isOpen: true, type: 'export',
        title: loginModal.freeExportsLeft > 0 ? 'Xuất file PDF/DOCX' : 'Đã hết lượt xuất file miễn phí',
        message: loginModal.freeExportsLeft > 0
          ? 'Đăng nhập để xuất file không giới hạn hoặc tiếp tục với tài khoản khách.'
          : 'Bạn đã hết lượt xuất file miễn phí. Vui lòng đăng nhập để tiếp tục.',
        showFreeExports: true, freeExportsLeft: loginModal.freeExportsLeft
      });
    } else {
      setLoginModal({ isOpen: true, type: 'export_error', title: 'Không thể xuất file', message: 'Chức năng xuất file hiện không khả dụng.', showFreeExports: false, freeExportsLeft: 0 });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl border-[3px] border-emerald-400 ring-2 ring-emerald-200 w-full max-w-7xl max-h-[90vh] overflow-hidden mt-4 flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-5 py-4 flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {(testMainTopic || testSubTopic) && (
                <p className="text-emerald-200 text-xs font-bold mb-1">
                  {testMainTopic && testSubTopic ? `${testMainTopic} › ${testSubTopic}` : (testMainTopic || testSubTopic)}
                </p>
              )}
              <h2 className="text-lg font-extrabold text-white leading-tight pr-4 line-clamp-2">
                {testTitle || 'Danh sách từ vựng'}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full border-2 border-orange-300 bg-orange-100 px-2.5 py-0.5 text-[11px] font-extrabold text-orange-800 shadow-sm">
                  📚 {items.length} từ vựng
                </span>
                {createdBy && (
                  <span className="inline-flex items-center gap-1 rounded-full border-2 border-violet-300 bg-violet-100 px-2.5 py-0.5 text-[11px] font-extrabold text-violet-800 shadow-sm">
                    👤 {createdBy}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={handleExportClick}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-600 border-[3px] border-orange-900 text-white text-xs font-extrabold shadow-md hover:bg-orange-700 transition-colors"
                title="Tải xuống PDF/DOCX">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="hidden sm:inline">Tải xuống</span>
              </button>
              <button onClick={onClose}
                className="w-8 h-8 rounded-xl bg-rose-500 border-2 border-rose-700 flex items-center justify-center text-white hover:bg-rose-600 transition-colors"
                title="Đóng">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-10 h-10 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
              <span className="ml-4 text-emerald-700 font-bold">Đang tải từ vựng...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="px-4 pt-4 pb-2">
                <table className="w-full">
                  <thead className="sticky top-0">
                    <tr className="bg-emerald-50 border-b-2 border-emerald-200">
                      <th className="px-3 py-2.5 text-left text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider w-1/5">Từ vựng</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider w-1/5">Nghĩa</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider w-1/5">Loại từ</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider w-1/5">CEFR</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-emerald-100">
                    {items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-emerald-50 transition-colors">
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-slate-900">{item.word}</span>
                            <button
                              onClick={() => onPlayAudio(item.word)}
                              disabled={isPlaying}
                              className="p-1 bg-violet-600 border border-violet-800 text-white rounded-full hover:bg-violet-700 transition-colors disabled:opacity-50 shrink-0"
                              title="Nghe phát âm">
                              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.797l-4.146-3.32a1 1 0 00-.632-.227H2a1 1 0 01-1-1V7a1 1 0 011-1h1.605a1 1 0 00.632-.227l4.146-3.32a1 1 0 011.6.623zM14 7a3 3 0 013 3v0a3 3 0 01-3 3" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-[11px] font-semibold text-slate-800">
                            {user ? item.meaning : <span className="text-slate-400 italic">••••••••••</span>}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-300">
                            {item.part_of_speech === 'noun' ? 'Danh từ' : item.part_of_speech === 'verb' ? 'Động từ' :
                             item.part_of_speech === 'adjective' ? 'Tính từ' : item.part_of_speech === 'adverb' ? 'Trạng từ' :
                             item.part_of_speech === 'preposition' ? 'Giới từ' : item.part_of_speech === 'conjunction' ? 'Liên từ' :
                             item.part_of_speech === 'pronoun' ? 'Đại từ' : item.part_of_speech === 'interjection' ? 'Thán từ' :
                             item.part_of_speech || '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            ['A1', 'A2'].includes(item.cefr_level) ? 'bg-emerald-100 text-emerald-700 border-emerald-300' :
                            ['B1', 'B2'].includes(item.cefr_level) ? 'bg-amber-100 text-amber-700 border-amber-300' :
                            ['C1', 'C2'].includes(item.cefr_level) ? 'bg-rose-100 text-rose-700 border-rose-300' :
                            'bg-slate-100 text-slate-600 border-slate-300'
                          }`}>
                            {item.cefr_level || '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t-2 border-emerald-800 bg-gradient-to-r from-emerald-600 to-teal-700 flex-shrink-0">
          {!user && (
            <div className="mb-3 p-2.5 bg-indigo-100 border-2 border-indigo-300 rounded-xl text-center">
              <p className="text-xs text-indigo-700 font-bold mb-2">Đăng nhập để xem nghĩa từ vựng và xuất file</p>
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => setLoginModal({ isOpen: true, type: 'meanings', title: 'Đăng nhập để xem nghĩa', message: 'Bạn cần đăng nhập để xem nghĩa các từ vựng.', showFreeExports: false })}
                  className="px-3 py-1 text-[11px] font-extrabold rounded-lg bg-white border-2 border-indigo-300 text-indigo-700 hover:bg-indigo-50 transition-colors">
                  Hiện nghĩa
                </button>
                <button onClick={handleExportClick}
                  className="px-3 py-1 bg-blue-700 border-2 border-blue-900 text-white rounded-lg text-[11px] font-extrabold hover:bg-blue-800 transition-colors">
                  Xuất file
                </button>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1 rounded-full border-2 border-orange-300 bg-orange-100 px-3 py-1 text-xs font-extrabold text-orange-800">
              📚 {items.length} từ vựng
            </span>
            <div className="flex gap-2">
              {onPreview && (
                <button onClick={onPreview}
                  className="px-4 py-2 border-[3px] border-indigo-300 text-indigo-700 rounded-xl bg-white hover:bg-indigo-50 font-extrabold text-sm transition-colors">
                  Xem trước
                </button>
              )}
              <button onClick={onStartTest}
                className="px-5 py-2 text-sm rounded-xl bg-blue-700 border-[3px] border-blue-900 text-white hover:bg-blue-800 font-extrabold shadow-md transition-colors">
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