import React from 'react';
import Avatar from './Avatar';

const RANK_MEDALS = ["🥇", "🥈", "🥉"];

const ModernSidebar = ({
  topContributors,
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
    <div className="space-y-4">

      {/* ── Top Contributors ── */}
      {topContributors.length > 0 && (
        <div className="rounded-2xl overflow-hidden shadow-2xl shadow-amber-900/40">
          {/* Vivid amber header */}
          <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0">
              <span className="text-xl">🏆</span>
            </div>
            <div>
              <h3 className="text-sm font-black text-white drop-shadow">Top đóng góp</h3>
              <p className="text-[10px] text-amber-100/80">Tạo nhiều bài test nhất</p>
            </div>
          </div>

          {/* White/light body */}
          <div className="bg-amber-50 p-3 grid grid-cols-4 gap-2 md:grid-cols-1 md:gap-2">
            {topContributors.slice(0, 3).map((user, index) => {
              const userId = user.user_id || user._id;
              const isMe = currentUser?._id && userId && String(userId) === String(currentUser._id);

              return (
                <button
                  key={user.user_id || index}
                  type="button"
                  onClick={() => onContributorClick(user)}
                  className="group flex flex-col items-center md:flex-row md:gap-3 md:p-2.5 md:rounded-xl md:bg-white md:hover:bg-amber-50 md:border md:border-amber-200 md:hover:border-amber-400 md:shadow-sm md:hover:shadow-md transition-all duration-200 focus:outline-none text-center md:text-left"
                >
                  <div className="relative flex-shrink-0">
                    <Avatar
                      src={user.avatar_url}
                      alt={user.full_name || 'User'}
                      fallback={user.full_name?.charAt(0) || '?'}
                      size="md"
                      borderColor="border-amber-300"
                      gradientFrom="from-amber-600"
                      gradientTo="to-orange-700"
                    />
                    <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-sm shadow-md border-2 border-white">
                      {isMe ? "★" : (RANK_MEDALS[index] || `#${index + 1}`)}
                    </div>
                  </div>
                  <div className="hidden md:flex flex-1 min-w-0 flex-col">
                    <p className="text-sm font-bold text-slate-800 group-hover:text-amber-700 truncate transition-colors">
                      {isMe ? `${user.full_name} (Bạn)` : user.full_name || 'Ẩn danh'}
                    </p>
                    <p className="text-[11px] text-amber-600 font-semibold">
                      {user.total_tests || 0} bài test
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Latest Members ── */}
      {latestUsers.length > 0 && (
        <div className="rounded-2xl overflow-hidden shadow-2xl shadow-emerald-900/40">
          {/* Vivid green header */}
          <div className="bg-gradient-to-r from-emerald-500 via-green-600 to-teal-600 px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0">
              <span className="text-xl">👋</span>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-black text-white drop-shadow">Thành viên mới</h3>
              <p className="text-[10px] text-emerald-100/80">Vừa tham gia</p>
            </div>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
            </span>
          </div>

          {/* White/light body */}
          <div className="bg-emerald-50 p-3 grid grid-cols-4 gap-2 md:grid-cols-1 md:gap-1">
            {(showAllLatestUsers ? latestUsers : latestUsers.slice(0, 8)).map((user, index) => {
              const userId = user._id || user.user_id;
              const isMe = currentUser?._id && userId && String(userId) === String(currentUser._id);

              return (
                <button
                  key={user._id || index}
                  type="button"
                  onClick={() => onUserInfoClick(user)}
                  className="group flex flex-col items-center md:flex-row md:gap-2.5 md:p-2 md:rounded-xl md:hover:bg-white md:border md:border-transparent md:hover:border-emerald-200 md:hover:shadow-sm transition-all duration-200 focus:outline-none text-center md:text-left"
                >
                  <div className="relative flex-shrink-0">
                    <Avatar
                      src={user.avatar_url}
                      alt={user.full_name || 'User'}
                      fallback={user.full_name?.charAt(0) || '👤'}
                      size="sm"
                      borderColor="border-emerald-300"
                      gradientFrom="from-emerald-600"
                      gradientTo="to-teal-700"
                    />
                    {isMe ? (
                      <div className="absolute -bottom-0.5 -right-0.5 px-1 py-px bg-emerald-600 text-white text-[7px] font-black rounded-full">
                        Bạn
                      </div>
                    ) : (
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <div className="hidden md:flex flex-1 min-w-0 flex-col">
                    <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 truncate transition-colors">
                      {user.full_name || 'Người dùng mới'}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">{user.email || ''}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Load More / Hide */}
          {onLoadMoreLatestUsers && (
            <div className="bg-emerald-50 px-3 pb-3">
              {showAllLatestUsers ? (
                <button type="button" onClick={onHideLatestUsers}
                  className="w-full py-2 rounded-xl text-xs font-bold text-emerald-700 bg-white hover:bg-emerald-100 border border-emerald-200 hover:border-emerald-400 transition-all flex items-center justify-center gap-1.5 shadow-sm">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                  </svg>
                  Ẩn bớt
                </button>
              ) : (
                <button type="button" onClick={onLoadMoreLatestUsers} disabled={loadingMoreLatestUsers}
                  className="w-full py-2 rounded-xl text-xs font-bold text-emerald-700 bg-white hover:bg-emerald-100 border border-emerald-200 hover:border-emerald-400 transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50">
                  {loadingMoreLatestUsers ? (
                    <>
                      <div className="w-3 h-3 border-2 border-emerald-300 border-t-emerald-700 rounded-full animate-spin" />
                      Đang tải...
                    </>
                  ) : (
                    <>
                      Xem thêm
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ModernSidebar;
