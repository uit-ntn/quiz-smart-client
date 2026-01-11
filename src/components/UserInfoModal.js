import React from 'react';

const UserInfoModal = ({ isOpen, onClose, user }) => {
  if (!isOpen || !user) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'Chưa có thông tin';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'Chưa có thông tin';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-white/50">
        {/* Header */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-slate-200/50 bg-gradient-to-r from-blue-50/80 to-indigo-50/80">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Thông tin người dùng</h3>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-white/80 hover:bg-white flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content - Vertical Layout */}
        <div className="p-4">
          {/* Avatar - Centered at top */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              {user.avatar_url ? (
                <img 
                  src={user.avatar_url} 
                  alt={user.full_name || 'User'}
                  className="w-20 h-20 md:w-24 md:h-24 rounded-xl object-cover border-2 border-white shadow-lg"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className={`w-20 h-20 md:w-24 md:h-24 rounded-xl flex items-center justify-center font-bold text-3xl md:text-4xl text-white shadow-lg ${
                  user.avatar_url ? 'hidden' : ''
                } bg-gradient-to-br from-blue-500 to-indigo-600`}
                style={{ display: user.avatar_url ? 'none' : 'flex' }}
              >
                {user.full_name?.charAt(0).toUpperCase() || '👤'}
              </div>
            </div>
          </div>

          {/* User Info - Below avatar, single column list */}
          <div className="space-y-2">
            {/* Full Name */}
            <div className="px-3 py-2 bg-slate-50/80 rounded-lg border border-slate-200/50">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-600">Họ và tên:</div>
                <div className="text-sm font-bold text-slate-900 break-words text-right ml-2">
                  {user.full_name || 'Chưa có thông tin'}
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="px-3 py-2 bg-slate-50/80 rounded-lg border border-slate-200/50">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-600">Email:</div>
                <div className="text-sm font-bold text-slate-900 break-all text-right ml-2">
                  {user.email || 'Chưa có thông tin'}
                </div>
              </div>
            </div>

            {/* Join Date */}
            <div className="px-3 py-2 bg-slate-50/80 rounded-lg border border-slate-200/50">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-600">Ngày tham gia:</div>
                <div className="text-sm font-bold text-slate-900 text-right ml-2">
                  {formatDate(user.created_at)}
                </div>
              </div>
            </div>

            {/* Additional Info for Top Test Takers */}
            {user.total_completed !== undefined && (
              <div className="px-3 py-2 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border border-emerald-200/50">
                <div className="text-xs font-semibold text-emerald-700 mb-1.5">Thống kê:</div>
                <div className="text-sm font-bold text-emerald-900 space-y-0.5">
                  <div>✅ {user.total_completed || 0} bài đã làm</div>
                  {user.average_percentage > 0 && (
                    <div>📊 {user.average_percentage}% điểm TB</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-4 py-3 border-t border-slate-200/50 bg-slate-50/80">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg hover:from-slate-700 hover:to-slate-800 transition-colors text-sm font-semibold"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserInfoModal;