import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Footer from "../components/Footer";

const AdminLayout = ({ children }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    {
      title: "Dashboard",
      path: "/admin",
      icon: "📊",
      description: "Tổng quan hệ thống",
    },
    {
      title: "Tests Từ Vựng",
      path: "/admin/vocabulary-tests",
      icon: "📚",
      description: "Quản lý bài test từ vựng",
    },
    {
      title: "Tests Trắc Nghiệm",
      path: "/admin/multiple-choice-tests",
      icon: "📝",
      description: "Quản lý bài test trắc nghiệm",
    },
    {
      title: "Tests Ngữ Pháp",
      path: "/admin/grammar-tests",
      icon: "📖",
      description: "Quản lý bài test ngữ pháp",
    },
    {
      title: "Quản lý Vocabulary",
      path: "/admin/vocabularies",
      icon: "📋",
      description: "Từ vựng và định nghĩa",
    },
    {
      title: "Quản lý Multiple Choice",
      path: "/admin/multiple-choices",
      icon: "❓",
      description: "Câu hỏi trắc nghiệm",
    },
    {
      title: "Quản lý Topics",
      path: "/admin/topics",
      icon: "🏷️",
      description: "Chủ đề và chủ đề con",
    },
    {
      title: "Quản lý Users",
      path: "/admin/users",
      icon: "👥",
      description: "Người dùng và quyền hạn",
    },
    {
      title: "Kết quả Tests",
      path: "/admin/test-results",
      icon: "📈",
      description: "Thống kê và kết quả",
    },
    {
      title: "Quản lý Đánh giá",
      path: "/admin/reviews",
      icon: "⭐",
      description: "Đánh giá từ người dùng",
    },
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error("Logout failed:", e);
    } finally {
      window.location.href = "/";
    }
  };

  // active helper (để route con vẫn active item cha)
  const isActivePath = (itemPath) => {
    if (itemPath === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(itemPath);
  };

  const displayName = user?.full_name || user?.email || "Admin";
  const avatarChar = (displayName?.trim()?.[0] || "A").toUpperCase();

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900
        transform transition-all duration-300 lg:static lg:translate-x-0 shadow-2xl
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-600/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-indigo-500/10 to-cyan-600/10 rounded-full blur-3xl"></div>
        </div>

        <div className="flex flex-col h-full relative z-10">
          {/* Logo + Close button (mobile) */}
          <div className="px-6 py-6 border-b border-white/10 flex items-center justify-between gap-3">
            <Link
              to="/admin"
              className="group flex items-center gap-4 transition-all duration-300 hover:scale-105"
              onClick={() => setSidebarOpen(false)}
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl group-hover:shadow-2xl transition-all duration-300">
                  <span className="text-white font-black text-xl">Q</span>
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-900"></div>
              </div>

              <div>
                <h1 className="text-white font-black text-xl bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                  QuizSmart
                </h1>
                <p className="text-slate-400 text-sm font-medium">Admin Dashboard</p>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-xl hover:bg-white/10 text-slate-200"
              aria-label="Đóng menu"
              title="Đóng"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-4 py-6 pb-4 space-y-2 overflow-y-auto">
            {navItems.map((item, index) => {
              const active = isActivePath(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)} // ✅ fix typo + close on click
                  className={`group relative flex items-center px-4 py-2 rounded-2xl transition-all duration-300 transform hover:scale-[1.01]
                  ${
                    active
                      ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-xl shadow-blue-500/25"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Active indicator */}
                  {active && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl opacity-100" />
                  )}

                  {/* Content */}
                  <div className="relative flex items-center w-full">
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-xl mr-3 transition-all duration-300
                      ${
                        active
                          ? "bg-white/20 text-white"
                          : "bg-slate-700/50 text-slate-400 group-hover:bg-slate-600/50 group-hover:text-white"
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-semibold text-sm truncate transition-colors duration-300
                        ${active ? "text-white" : "text-slate-300 group-hover:text-white"}`}
                      >
                        {item.title}
                      </p>
                      <p
                        className={`text-xs truncate transition-colors duration-300
                        ${active ? "text-blue-100" : "text-slate-500 group-hover:text-slate-400"}`}
                      >
                        {item.description}
                      </p>
                    </div>

                    {/* Arrow indicator */}
                    <div
                      className={`transition-all duration-300 ${
                        active
                          ? "opacity-100 translate-x-0"
                          : "opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-gray-200/50 shadow-sm">
          <div className="px-6 py-4 flex items-center justify-between">
            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden group p-3 rounded-2xl hover:bg-gray-100 transition-all duration-200 hover:scale-105"
              aria-label="Mở menu"
              title="Mở menu"
            >
              <svg
                className="w-6 h-6 text-gray-600 group-hover:text-gray-900 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Breadcrumb / title */}
            <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="font-medium">Admin Panel</span>
            </div>

            {/* Actions + Profile */}
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="group inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 hover:text-gray-900 transition-all duration-200"
              >
                <svg
                  className="w-4 h-4 transition-transform group-hover:-translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Về trang chủ
              </Link>

              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white font-bold">
                    {avatarChar}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{displayName}</p>
                    <p className="text-xs text-emerald-500">Administrator</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Đăng xuất
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 bg-gradient-to-br from-gray-50 to-gray-100/50">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>

        <Footer />
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-all duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminLayout;
