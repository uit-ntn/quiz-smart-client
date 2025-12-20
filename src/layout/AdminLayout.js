import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/Footer';

const AdminLayout = ({ children }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { title: 'Dashboard', path: '/admin' },
    { title: 'Tests Từ Vựng', path: '/admin/vocabulary-tests' },
    { title: 'Tests Trắc Nghiệm', path: '/admin/multiple-choice-tests' },
    { title: 'Tests Ngữ Pháp', path: '/admin/grammar-tests' },
    { title: 'Quản lý Vocabulary', path: '/admin/vocabularies' },
    { title: 'Quản lý Multiple Choice', path: '/admin/multiple-choices' },
    { title: 'Quản lý Users', path: '/admin/users' },
    { title: 'Kết quả Tests', path: '/admin/test-results' },
    { title: 'Phiên Tests', path: '/admin/test-sessions' },
  ];

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-indigo-700 via-indigo-800 to-indigo-900
        transform transition-transform duration-300 lg:static lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-6 py-5 border-b border-white/10">
            <Link to="/admin" className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center shadow">
                <span className="text-indigo-700 font-extrabold text-lg">Q</span>
              </div>
              <div>
                <h1 className="text-white font-bold text-lg">QuizSmart</h1>
                <p className="text-indigo-200 text-xs">Admin Panel</p>
              </div>
            </Link>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`group relative flex items-center px-4 py-3 rounded-xl transition-all
                  ${
                    active
                      ? 'bg-white text-indigo-700 shadow'
                      : 'text-indigo-100 hover:bg-white/10'
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-2 bottom-2 w-1 bg-indigo-600 rounded-r" />
                  )}
                  <span className="font-medium text-sm">{item.title}</span>
                </Link>
              );
            })}
          </nav>

          {/* User */}
          <div className="px-4 py-4 border-t border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600
              flex items-center justify-center text-white font-bold ring-2 ring-white/20">
                {(user?.full_name || user?.email || 'A')[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold truncate">
                  {user?.full_name || user?.email}
                </p>
                <p className="text-indigo-300 text-xs">Administrator</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full py-2 rounded-lg bg-red-500/90 hover:bg-red-600
              text-white text-sm font-medium transition"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-gray-200">
          <div className="px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              ☰
            </button>

            <Link
              to="/"
              className="text-sm font-medium text-gray-700 hover:text-indigo-600"
            >
              ← Về trang chủ
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6">{children}</main>

        <Footer />
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminLayout;
