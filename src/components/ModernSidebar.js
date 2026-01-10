import React from 'react';
import Avatar from './Avatar';

const ModernSidebar = ({ 
  topContributors,
  topTestTakers,
  latestUsers, 
  onContributorClick,
  onUserInfoClick
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
          
          <div className="space-y-3">
            {topContributors.slice(0, 3).map((user, index) => (
              <div
                key={user.user_id || index}
                onClick={() => onContributorClick(user)}
                className="group p-3 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 rounded-2xl border border-amber-200/50 hover:border-amber-300 transition-all duration-300 cursor-pointer hover:shadow-lg hover:-translate-y-1"
              >
                <div className="flex items-center gap-3">
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
                    {user.avatar_url && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-white z-20 shadow-md">
                        #{index + 1}
                      </div>
                    )}
                  </div>
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
            ))}
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
          
          <div className="space-y-3">
            {latestUsers.slice(0, 7).map((user, index) => (
              <div
                key={user._id || index}
                onClick={() => onUserInfoClick(user)}
                className="group p-3 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-2xl border border-blue-200/50 hover:border-blue-300 transition-all duration-300 cursor-pointer hover:shadow-lg hover:-translate-y-1 active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
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
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-400 rounded-full border-2 border-white" />
                  </div>
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
            ))}
          </div>
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