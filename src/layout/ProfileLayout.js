// src/layout/ProfileLayout.jsx
import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';

const ProfileLayout = ({ children, title, description, headerActions }) => {
  const { user } = useAuth();

  const getUserInitials = (u) => {
    if (u?.full_name) {
      const names = u.full_name.trim().split(' ').filter(Boolean);
      if (names.length >= 2) return (names[0][0] + names[names.length - 1][0]).toUpperCase();
      return (names[0][0] || 'U').toUpperCase();
    }
    return (u?.email?.[0] || 'U').toUpperCase();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const Pill = ({ children, tone = 'slate' }) => {
    const tones = {
      slate: 'bg-slate-100 text-slate-700 border-slate-200',
      green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      blue: 'bg-blue-50 text-blue-700 border-blue-200',
      purple: 'bg-violet-50 text-violet-700 border-violet-200',
      red: 'bg-rose-50 text-rose-700 border-rose-200',
    };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${tones[tone] || tones.slate}`}>
        {children}
      </span>
    );
  };

  const RolePill = (role) => {
    if (role === 'admin') return <Pill tone="purple">Quản trị viên</Pill>;
    if (role === 'teacher') return <Pill tone="blue">Giáo viên</Pill>;
    return <Pill tone="slate">Người dùng</Pill>;
  };

  const StatusPill = (status) => {
    if (status === 'active') return <Pill tone="green">Hoạt động</Pill>;
    if (status === 'inactive') return <Pill tone="slate">Không hoạt động</Pill>;
    return null;
  };

  const ProviderPill = (provider) => {
    if (provider === 'google') return <Pill tone="red">Google</Pill>;
    if (provider === 'facebook') return <Pill tone="blue">Facebook</Pill>;
    return <Pill tone="slate">Local</Pill>;
  };

  return (
    <div className="min-h-screen bg-[#f6f8fc]">
      {/* nền nhẹ để không trùng content */}
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-[0.55] bg-[radial-gradient(circle_at_15%_10%,rgba(59,130,246,0.14),transparent_42%),radial-gradient(circle_at_85%_0%,rgba(99,102,241,0.12),transparent_45%),radial-gradient(circle_at_50%_100%,rgba(14,165,233,0.10),transparent_55%)]" />

      <Header />

      {/* khu vực header profile có nền khác (không còn trắng trùng card) */}
      <div className="border-b border-slate-200 bg-gradient-to-b from-white to-[#f6f8fc]">
        <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm ring-1 ring-black/5 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              <div className="flex-shrink-0">
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name || user.username}
                    className="w-16 h-16 rounded-2xl object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-lg font-extrabold">
                    {getUserInitials(user)}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 truncate">
                      {user?.full_name || user?.username || 'Người dùng'}
                    </h1>

                    <div className="mt-1 text-sm text-slate-600 break-words">
                      <span className="font-semibold text-slate-800">@{user?.username}</span>
                      <span className="mx-2 text-slate-300">•</span>
                      <span>{user?.email}</span>
                    </div>

                    {user?.bio && (
                      <p className="mt-3 text-sm text-slate-700 leading-relaxed">
                        {user.bio}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {RolePill(user?.role)}
                      {StatusPill(user?.status)}
                      {ProviderPill(user?.authProvider)}
                      {user?.email_verified && <Pill tone="green">Email đã xác thực</Pill>}
                    </div>
                  </div>

                  <div className="flex-shrink-0 w-full lg:w-auto">
                    <div className="flex flex-col gap-3 lg:items-end">
                      <div className="text-sm text-slate-600">
                        <span className="text-slate-500">Tham gia từ:</span>{' '}
                        <span className="font-semibold text-slate-900">{formatDate(user?.created_at)}</span>
                      </div>

                      {headerActions && (
                        <div className="flex flex-wrap gap-2 justify-start lg:justify-end">
                          {headerActions}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {(title || description) && (
                  <div className="mt-5 pt-4 border-t border-slate-200">
                    {title && <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">{title}</h2>}
                    {description && <p className="mt-1 text-sm sm:text-base text-slate-700">{description}</p>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        {children}
      </main>

      <Footer />
    </div>
  );
};

export default ProfileLayout;
