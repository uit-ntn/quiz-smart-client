import React from 'react';

const LoginPromptModal = ({ 
  isOpen, 
  onClose, 
  title = "Yêu cầu đăng nhập",
  message = "Vui lòng đăng nhập để sử dụng tính năng này",
  showFreeExports = false,
  freeExportsLeft = 3,
  onLogin = null,
  onContinueGuest = null,
  showGuestOption = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white">{title}</h3>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="px-4 py-4 space-y-3 overflow-y-auto flex-1">
          {/* Message */}
          <div className="text-center">
            <p className="text-sm text-gray-700 leading-relaxed">{message}</p>
          </div>

          {/* Free Exports Info */}
          {showFreeExports && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-green-800 text-sm">Xuất file miễn phí</h4>
                  <p className="text-xs text-green-700">Dành cho khách vãng lai</p>
                </div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-green-600 mb-0.5">
                  {freeExportsLeft}
                </div>
                <p className="text-xs text-green-700">lần xuất file miễn phí còn lại</p>
                {freeExportsLeft === 0 && (
                  <p className="text-xs text-red-600 mt-1.5 font-medium">
                    Đã hết lượt xuất file miễn phí. Vui lòng đăng nhập để tiếp tục.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Benefits of logging in */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-1.5 text-sm">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Lợi ích khi đăng nhập
            </h4>
            <ul className="space-y-1.5 text-xs text-blue-700">
              <li className="flex items-start gap-2">
                <svg className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Xuất file không giới hạn</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Xem nghĩa từ vựng và giải thích chi tiết</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Lưu kết quả làm bài và theo dõi tiến độ</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Tạo và chia sẻ bài test riêng</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Actions - Fixed at bottom */}
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 flex-shrink-0">
          <div className="flex flex-col gap-2">
            <button
              onClick={onLogin}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-2.5 px-4 rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-md shadow-blue-500/25 text-sm"
            >
              Đăng nhập với Google
            </button>
            
            {showGuestOption && freeExportsLeft > 0 && onContinueGuest && (
              <button
                onClick={onContinueGuest}
                className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors border border-gray-200 text-sm"
              >
                Xuất không cần đăng nhập
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPromptModal;