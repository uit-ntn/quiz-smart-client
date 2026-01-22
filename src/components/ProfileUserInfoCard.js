import React from "react";

const UserInfoCard = ({ user }) => {
  const formatDate = (dateString) =>
    dateString
      ? new Date(dateString).toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-";

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "text-emerald-700 bg-emerald-100";
      case "inactive":
        return "text-zinc-700 bg-zinc-200";
      default:
        return "text-zinc-700 bg-zinc-200";
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "admin":
        return "text-fuchsia-700 bg-fuchsia-100";
      case "teacher":
        return "text-indigo-700 bg-indigo-100";
      default:
        return "text-sky-700 bg-sky-100";
    }
  };

  const initials = (name) =>
    name
      ? name
          .split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase()
      : "U";

  return (
    <div className="w-full bg-white rounded-2xl shadow-lg border border-zinc-100 overflow-hidden">
      <div className="p-6 sm:p-8">
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex-shrink-0">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user?.full_name || "avatar"}
                className="w-20 h-20 rounded-full object-cover ring-4 ring-sky-50"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-sky-50 to-emerald-50 flex items-center justify-center text-2xl font-semibold text-sky-700">
                {initials(user?.full_name || user?.username)}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-semibold text-zinc-900 truncate">
              {user?.full_name || user?.username || "Người dùng"}
            </h2>
            <p className="text-sm text-zinc-500 truncate">{user?.email || "-"}</p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getRoleColor(user?.role)}`}>
                {user?.role === "admin" ? "Quản trị viên" : user?.role === "teacher" ? "Giáo viên" : "Người dùng"}
              </span>

              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(user?.status)}`}>
                <span className="w-2 h-2 bg-current rounded-full mr-2" />
                {user?.status === "active" ? "Hoạt động" : "Không hoạt động"}
              </span>

              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${user?.email_verified ? "text-emerald-700 bg-emerald-100" : "text-amber-700 bg-amber-100"}`}>
                {user?.email_verified ? "Đã xác thực" : "Chưa xác thực"}
              </span>
            </div>
          </div>

          <div className="hidden sm:flex sm:flex-col sm:items-end sm:gap-2">
            <button className="px-4 py-2 border border-teal-200 rounded-lg text-sm text-teal-700 hover:bg-teal-50">Đổi mật khẩu</button>
          </div>
        </div>

        <div className="mt-6 border-t border-zinc-100 pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">ID</div>
              <div className="text-sm text-zinc-800 font-mono break-all">{user?._id || '-'}</div>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">Tên đăng nhập</div>
              <div className="text-sm text-zinc-800">{user?.username || '-'}</div>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">Nhà cung cấp xác thực</div>
              <div className="text-sm text-zinc-800">{user?.authProvider || 'local'}</div>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">Google ID</div>
              <div className="text-sm text-zinc-800 font-mono break-all">{user?.googleId || '-'}</div>
            </div>

            {user?.bio && (
              <div className="sm:col-span-2">
                <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1">Mô tả</div>
                <div className="text-sm text-zinc-800">{user.bio}</div>
              </div>
            )}

            <div className="space-y-2">
              <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">Ngày tạo</div>
              <div className="text-sm text-zinc-800">{formatDate(user?.created_at)}</div>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">Cập nhật cuối</div>
              <div className="text-sm text-zinc-800">{formatDate(user?.updated_at)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserInfoCard;
