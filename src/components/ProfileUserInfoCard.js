import React from 'react';

const UserInfoCard = ({ user }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'inactive': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'text-purple-600 bg-purple-100';
      case 'teacher': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        Thông tin chi tiết
      </h3>

      <div className="space-y-4">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs font-medium text-gray-500 uppercase mb-1">ID</div>
            <div className="font-mono text-sm text-gray-900 break-all">{user?._id}</div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs font-medium text-gray-500 uppercase mb-1">Tên đăng nhập</div>
            <div className="text-sm text-gray-900">{user?.username}</div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs font-medium text-gray-500 uppercase mb-1">Họ và tên</div>
            <div className="text-sm text-gray-900">{user?.full_name}</div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs font-medium text-gray-500 uppercase mb-1">Email</div>
            <div className="text-sm text-gray-900 break-all">{user?.email}</div>
          </div>
        </div>

        {/* Status & Role */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs font-medium text-gray-500 uppercase mb-2">Vai trò</div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user?.role)}`}>
              {user?.role === 'admin' ? 'Quản trị viên' : 
               user?.role === 'teacher' ? 'Giáo viên' : 'Người dùng'}
            </span>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs font-medium text-gray-500 uppercase mb-2">Trạng thái</div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user?.status)}`}>
              <span className="w-1.5 h-1.5 bg-current rounded-full mr-1"></span>
              {user?.status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
            </span>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs font-medium text-gray-500 uppercase mb-2">Email</div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              user?.email_verified ? 'text-green-600 bg-green-100' : 'text-orange-600 bg-orange-100'
            }`}>
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {user?.email_verified ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                )}
              </svg>
              {user?.email_verified ? 'Đã xác thực' : 'Chưa xác thực'}
            </span>
          </div>
        </div>

        {/* Bio */}
        {user?.bio && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs font-medium text-gray-500 uppercase mb-2">Mô tả</div>
            <div className="text-sm text-gray-900">{user.bio}</div>
          </div>
        )}

        {/* Authentication Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs font-medium text-gray-500 uppercase mb-1">Nhà cung cấp xác thực</div>
            <div className="flex items-center space-x-2">
              {user?.authProvider === 'google' && (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC04" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="text-sm text-gray-900">Google</span>
                </>
              )}
              {user?.authProvider === 'facebook' && (
                <>
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span className="text-sm text-gray-900">Facebook</span>
                </>
              )}
              {!user?.authProvider && (
                <span className="text-sm text-gray-900">Local</span>
              )}
            </div>
          </div>

          {user?.googleId && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs font-medium text-gray-500 uppercase mb-1">Google ID</div>
              <div className="font-mono text-sm text-gray-900 break-all">{user.googleId}</div>
            </div>
          )}
        </div>

        {/* Avatar URL */}
        {user?.avatar_url && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs font-medium text-gray-500 uppercase mb-2">Avatar URL</div>
            <div className="flex items-center space-x-3">
              <img 
                src={user.avatar_url} 
                alt="Avatar" 
                className="w-10 h-10 rounded-full object-cover border border-gray-200"
              />
              <div className="font-mono text-xs text-gray-600 break-all">{user.avatar_url}</div>
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs font-medium text-gray-500 uppercase mb-1">Ngày tạo</div>
            <div className="text-sm text-gray-900">{formatDate(user?.created_at)}</div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs font-medium text-gray-500 uppercase mb-1">Cập nhật cuối</div>
            <div className="text-sm text-gray-900">{formatDate(user?.updated_at)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserInfoCard;