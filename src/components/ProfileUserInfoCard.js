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
        return "text-violet-700 bg-violet-100";
      case "teacher":
        return "text-indigo-700 bg-indigo-100";
      default:
        return "text-zinc-700 bg-zinc-100";
    }
  };

  const labelCls =
    "text-[10px] sm:text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1";
  const cardCls = "bg-white rounded-lg p-2 border border-zinc-200 shadow-sm";
  const valueCls = "text-xs text-zinc-800 break-all min-w-0";

  return (
    <div className="w-full bg-zinc-50 rounded-xl border border-zinc-200 shadow-sm p-3">
      <h3 className="text-base font-semibold text-zinc-800 mb-3 flex items-center">
        <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </span>
        Thông tin chi tiết
      </h3>

      <div className="space-y-2">
        {/* Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ["ID", user?._id, true],
            ["Tên đăng nhập", user?.username],
            ["Họ và tên", user?.full_name],
            ["Email", user?.email],
          ].map(([label, value, mono]) => (
            <div key={label} className={cardCls}>
              <div className={labelCls}>{label}</div>
              <div className={`${valueCls} ${mono ? "font-mono" : ""}`}>
                {value || "-"}
              </div>
            </div>
          ))}
        </div>

        {/* Status & Role */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className={cardCls}>
            <div className={labelCls}>Vai trò</div>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${getRoleColor(user?.role)}`}>
              {user?.role === "admin" ? "Quản trị viên" : user?.role === "teacher" ? "Giáo viên" : "Người dùng"}
            </span>
          </div>

          <div className={cardCls}>
            <div className={labelCls}>Trạng thái</div>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(user?.status)}`}>
              <span className="w-1.5 h-1.5 bg-current rounded-full mr-1" />
              {user?.status === "active" ? "Hoạt động" : "Không hoạt động"}
            </span>
          </div>

          <div className={cardCls}>
            <div className={labelCls}>Email</div>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                user?.email_verified ? "text-emerald-700 bg-emerald-100" : "text-amber-700 bg-amber-100"
              }`}
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {user?.email_verified ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                )}
              </svg>
              {user?.email_verified ? "Đã xác thực" : "Chưa xác thực"}
            </span>
          </div>
        </div>

        {/* Bio */}
        {user?.bio && (
          <div className={cardCls}>
            <div className={labelCls}>Mô tả</div>
            <div className="text-xs text-zinc-800">{user.bio}</div>
          </div>
        )}

        {/* Auth */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className={cardCls}>
            <div className={labelCls}>Nhà cung cấp xác thực</div>
            <div className="text-xs text-zinc-800 capitalize">{user?.authProvider || "local"}</div>
          </div>

          {user?.googleId && (
            <div className={cardCls}>
              <div className={labelCls}>Google ID</div>
              <div className="font-mono text-xs text-zinc-800 break-all">{user.googleId}</div>
            </div>
          )}
        </div>

        {/* Avatar */}
        {user?.avatar_url && (
          <div className={cardCls}>
            <div className={labelCls}>Avatar</div>
            <div className="flex items-center gap-2 min-w-0">
              <img src={user.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full ring-2 ring-violet-200" />
              <div className="font-mono text-xs text-zinc-600 break-all min-w-0">{user.avatar_url}</div>
            </div>
          </div>
        )}

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className={cardCls}>
            <div className={labelCls}>Ngày tạo</div>
            <div className="text-xs text-zinc-800">{formatDate(user?.created_at)}</div>
          </div>

          <div className={cardCls}>
            <div className={labelCls}>Cập nhật cuối</div>
            <div className="text-xs text-zinc-800">{formatDate(user?.updated_at)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserInfoCard;
