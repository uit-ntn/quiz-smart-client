import React from 'react';
import Avatar from './Avatar';

const ModernSidebar = ({ 
  topContributors,
  topTestTakers,
  latestUsers, 
  onContributorClick,
  onUserInfoClick,
  onLoadMoreLatestUsers,
  onHideLatestUsers,
  loadingMoreLatestUsers = false,
  showAllLatestUsers = false,
  currentUser = null
}) => {
  return (
    <div className="space-y-6">
      {/* Top Contributors */}
      {topContributors.length > 0 && (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 shadow-xl border border-white/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center">
              <span className="text-xl">🏆</span>
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Top đóng góp</h3>
              <p className="text-xs text-slate-600">Người tạo nhiều test nhất</p>
            </div>
          </div>
          
          {/* Mobile: Grid 4 columns (avatar only), Desktop: Vertical list */}
          <div className="grid grid-cols-4 gap-3 md:grid-cols-1 md:gap-3">
            {topContributors.slice(0, 3).map((user, index) => {
              const userId = user.user_id || user._id;
              const isCurrentUser = currentUser && currentUser._id && userId && String(userId) === String(currentUser._id);
              return (
              <div
                key={user.user_id || index}
                onClick={() => onContributorClick(user)}
                className="group md:p-3 md:bg-gradient-to-r md:from-amber-50 md:to-orange-50 md:hover:from-amber-100 md:hover:to-orange-100 md:rounded-2xl md:border md:border-amber-200/50 md:hover:border-amber-300 transition-all duration-300 cursor-pointer md:hover:shadow-lg md:hover:-translate-y-1 flex flex-col items-center md:items-start md:flex-row"
              >
                <div className="relative">
                  <Avatar
                    src={user.avatar_url}
                    alt={user.full_name || 'User'}
                    fallback={`#${index + 1}`}
                    size="md"
                    borderColor="border-amber-200"
                    gradientFrom="from-amber-500"
                    gradientTo="to-orange-600"
                  />
                  {(user.avatar_url || !user.avatar_url) && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-white z-20 shadow-md">
                      {isCurrentUser ? 'Bạn' : `#${index + 1}`}
                    </div>
                  )}
                </div>
                <div className="hidden md:flex flex-1 min-w-0 md:ml-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm group-hover:text-slate-700 transition-colors break-words line-clamp-2">
                      {user.full_name || 'Người dùng ẩn danh'}
                    </p>
                    <div className="text-xs text-amber-700 font-bold">
                      📝 {user.total_tests || 0} bài test
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Latest Users */}
      {latestUsers.length > 0 && (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 shadow-xl border border-white/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center">
              <span className="text-xl">👋</span>
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Thành viên mới</h3>
              <p className="text-xs text-slate-600">Vừa tham gia</p>
            </div>
          </div>
          
          {/* Mobile: Grid 4 columns (avatar only), Desktop: Vertical list */}
          <div className="grid grid-cols-4 gap-3 md:grid-cols-1 md:gap-3">
            {(showAllLatestUsers ? latestUsers : latestUsers.slice(0, 8)).map((user, index) => {
              const userId = user._id || user.user_id;
              const isCurrentUser = currentUser && currentUser._id && userId && String(userId) === String(currentUser._id);
              return (
              <div
                key={user._id || index}
                onClick={() => onUserInfoClick(user)}
                className="group md:p-3 md:bg-gradient-to-r md:from-blue-50 md:to-indigo-50 md:hover:from-blue-100 md:hover:to-indigo-100 md:rounded-2xl md:border md:border-blue-200/50 md:hover:border-blue-300 transition-all duration-300 cursor-pointer md:hover:shadow-lg md:hover:-translate-y-1 active:scale-[0.98] flex flex-col items-center md:items-start md:flex-row"
              >
                <div className="relative">
                  <Avatar
                    src={user.avatar_url}
                    alt={user.full_name || 'User'}
                    fallback={user.full_name?.charAt(0) || '👤'}
                    size="md"
                    borderColor="border-blue-200"
                    gradientFrom="from-blue-500"
                    gradientTo="to-indigo-600"
                  />
                  {isCurrentUser ? (
                    <div className="absolute -bottom-0.5 -right-0.5 px-1.5 py-0.5 bg-blue-500 text-white text-[9px] font-bold rounded-full border-2 border-white">
                      Bạn
                    </div>
                  ) : (
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-400 rounded-full border-2 border-white" />
                  )}
                </div>
                <div className="hidden md:flex flex-1 min-w-0 md:ml-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm break-words line-clamp-2">
                      {user.full_name || 'Người dùng mới'}
                    </p>
                    <div className="text-xs text-blue-700 font-medium break-all line-clamp-1">
                      {user.email || 'email@example.com'}
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>

          {/* Load More / Hide Button */}
          {onLoadMoreLatestUsers && (
            <div className="mt-4">
              {showAllLatestUsers ? (
                <button
                  onClick={onHideLatestUsers}
                  className="w-full px-4 py-2 bg-gradient-to-r from-slate-500 to-slate-600 text-white rounded-xl hover:from-slate-600 hover:to-slate-700 transition-all duration-200 font-semibold text-sm shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <span>Ẩn đi</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={onLoadMoreLatestUsers}
                  disabled={loadingMoreLatestUsers}
                  className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 font-semibold text-sm shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loadingMoreLatestUsers ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Đang tải...</span>
                    </>
                  ) : (
                    <>
                      <span>Hiển thị thêm</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Top Test Takers */}
      {topTestTakers.length > 0 && (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 shadow-xl border border-white/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center">
              <span className="text-xl">🎯</span>
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Top đã làm bài</h3>
              <p className="text-xs text-slate-600">Người làm bài nhiều nhất</p>
            </div>
          </div>
          
          <div className="space-y-3">
            {topTestTakers.slice(0, 5).map((user, index) => (
              <div
                key={user.user_id || index}
                onClick={() => onUserInfoClick(user)}
                className="group p-3 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 rounded-2xl border border-emerald-200/50 hover:border-emerald-300 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar
                      src={user.avatar_url}
                      alt={user.full_name || 'User'}
                      fallback={`#${index + 1}`}
                      size="md"
                      borderColor="border-emerald-200"
                      gradientFrom="from-emerald-500"
                      gradientTo="to-teal-600"
                    />
                    {user.avatar_url && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-white z-20 shadow-md">
                        #{index + 1}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm group-hover:text-slate-700 transition-colors break-words line-clamp-2">
                      {user.full_name || 'Người dùng ẩn danh'}
                    </p>
                    <div className="text-xs text-emerald-700 font-medium break-all line-clamp-1 mt-0.5">
                      {user.email || 'email@example.com'}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      <div className="text-xs text-emerald-700 font-bold">
                        ✅ {user.total_completed || 0} bài đã làm
                      </div>
                      {user.average_percentage > 0 && (
                        <div className="text-xs text-slate-600 font-medium">
                          • {user.average_percentage}% TB
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModernSidebar;