// src/layout/ProfileLayout.jsx
import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';

const ProfileLayout = ({ children }) => {
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
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default ProfileLayout;
