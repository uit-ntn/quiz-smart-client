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
        <div className="flex-shrink-0 p-4 border-b border-slate-200/50 bg-gradient-to-r from-blue-50/80 to-indigo-50/80">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-900">Thông tin người dùng</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/80 hover:bg-white flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content - Horizontal Layout */}
        <div className="p-6 flex gap-6">
          {/* Left: Avatar */}
          <div className="flex-shrink-0">
            <div className="relative">
              {user.avatar_url ? (
                <img 
                  src={user.avatar_url} 
                  alt={user.full_name || 'User'}
                  className="w-48 h-48 rounded-xl object-cover border-4 border-white shadow-xl"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className={`w-48 h-48 rounded-xl flex items-center justify-center font-bold text-5xl text-white shadow-xl ${
                  user.avatar_url ? 'hidden' : ''
                } bg-gradient-to-br from-blue-500 to-indigo-600`}
                style={{ display: user.avatar_url ? 'none' : 'flex' }}
              >
                {user.full_name?.charAt(0).toUpperCase() || '👤'}
              </div>
            </div>
          </div>

          {/* Right: User Info */}
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/50">
                <div className="text-xs font-semibold text-slate-600 mb-1">Họ và tên</div>
                <div className="text-base font-bold text-slate-900 break-words">
                  {user.full_name || 'Chưa có thông tin'}
                </div>
              </div>

              {/* Email */}
              <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/50">
                <div className="text-xs font-semibold text-slate-600 mb-1">Email</div>
                <div className="text-base font-bold text-slate-900 break-all line-clamp-2">
                  {user.email || 'Chưa có thông tin'}
                </div>
              </div>

              {/* Join Date */}
              <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/50">
                <div className="text-xs font-semibold text-slate-600 mb-1">Ngày tham gia</div>
                <div className="text-base font-bold text-slate-900">
                  {formatDate(user.created_at)}
                </div>
              </div>

              {/* Additional Info for Top Test Takers */}
              {user.total_completed !== undefined && (
                <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200/50">
                  <div className="text-xs font-semibold text-emerald-700 mb-1">Thống kê</div>
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-emerald-900">
                      ✅ {user.total_completed || 0} bài đã làm
                    </div>
                    {user.average_percentage > 0 && (
                      <div className="text-sm font-bold text-emerald-900">
                        📊 {user.average_percentage}% điểm TB
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t border-slate-200/50 bg-slate-50/80">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-xl hover:from-slate-700 hover:to-slate-800 transition-all duration-300 font-bold shadow-lg hover:shadow-xl hover:-translate-y-1"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserInfoModal;