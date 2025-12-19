import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { path: "/", label: "Trang chủ" },
  { path: "/topics", label: "Chủ đề học tập" },
  // { path: "/grammar/topics", label: "Ngữ pháp" },
  { path: "/about", label: "Giới thiệu" },
  { path: "/help", label: "Hướng dẫn" },
];

const Header = () => {
  const location = useLocation();
  const { user, isAuthenticated, loading, logout } = useAuth();

  const [openMobile, setOpenMobile] = useState(false);
  const [openUser, setOpenUser] = useState(false);
  const userMenuRef = useRef(null);

  const isActive = (p) => location.pathname === p;

  const initials = useMemo(() => {
    if (!user?.full_name) return "U";
    const parts = user.full_name.trim().split(/\s+/);
    const a = parts[0]?.[0];
    const b = parts[parts.length - 1]?.[0];
    return (a + (b || "")).toUpperCase();
  }, [user]);

  // Đóng menus khi đổi route
  useEffect(() => {
    setOpenMobile(false);
    setOpenUser(false);
  }, [location.pathname]);

  // Click outside để đóng user menu
  useEffect(() => {
    if (!openUser) return;
    const onClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setOpenUser(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [openUser]);

  const handleLogout = async () => {
    try {
      await logout();
      // chuyển về trang chủ
      window.location.href = "/";
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-14 flex items-center justify-between">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white grid place-items-center shadow-sm">
              <svg
                className="w-[18px] h-[18px]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1M21 12h-1M4 12H3" />
              </svg>
            </div>
            <div className="leading-tight">
              <span className="text-base font-semibold tracking-tight text-slate-900">
                QuizSmart
              </span>
              <span className="block text-[11px] text-slate-500">
                Học thông minh mỗi ngày
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1.5">
            {NAV_ITEMS.map((n) => (
              <Link
                key={n.path}
                to={n.path}
                className={[
                  "px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150",
                  isActive(n.path)
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:text-slate-900 hover:bg-slate-100",
                ].join(" ")}
              >
                {n.label}
              </Link>
            ))}
          </div>

          {/* Right section */}
          <div className="flex items-center gap-2">
            {/* Loading state: placeholder để tránh nhảy layout */}
            {loading ? (
              <div className="hidden md:block w-44 h-9 rounded-lg bg-slate-100 animate-pulse" />
            ) : isAuthenticated && user ? (
              // USER MENU
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setOpenUser((v) => !v)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-sm"
                >
                  <div className="w-7 h-7 rounded-md bg-indigo-600 text-white grid place-items-center font-semibold">
                    {initials}
                  </div>
                  <span className="hidden sm:inline max-w-[10rem] truncate">
                    {user.full_name}
                  </span>
                  <svg
                    className={`w-4 h-4 transition-transform ${openUser ? "rotate-180" : ""}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {openUser && (
                  <div className="absolute right-0 mt-2 w-60 bg-white/95 backdrop-blur-xl rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
                    <div className="px-3 py-2 border-b border-slate-200">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {user.full_name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>
                    <Link
                      to="/profile"
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 text-sm text-slate-700"
                      onClick={() => setOpenUser(false)}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Hồ sơ cá nhân
                    </Link>
                    {user?.role === "admin" && (
                      <Link
                        to="/admin"
                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-indigo-50 text-sm text-indigo-600"
                        onClick={() => setOpenUser(false)}
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        Admin Dashboard
                      </Link>
                    )}
                    <Link
                      to="/settings"
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 text-sm text-slate-700"
                      onClick={() => setOpenUser(false)}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Cài đặt
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-red-50 text-sm text-red-600"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // Not authenticated
              <div className="hidden md:flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Đăng ký
                </Link>
              </div>
            )}

            {/* Mobile toggle */}
            <button
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              onClick={() => setOpenMobile((v) => !v)}
              aria-label="Mở menu"
            >
              {openMobile ? (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {openMobile && (
          <div className="md:hidden border-t border-slate-200 py-3">
            <div className="space-y-1.5">
              {NAV_ITEMS.map((n) => (
                <Link
                  key={n.path}
                  to={n.path}
                  onClick={() => setOpenMobile(false)}
                  className={[
                    "block px-3 py-2 rounded-lg text-sm font-medium",
                    isActive(n.path)
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
                  ].join(" ")}
                >
                  {n.label}
                </Link>
              ))}

              <div className="border-t border-slate-200 pt-2 mt-2">
                {loading ? (
                  <div className="px-3 py-2">
                    <div className="h-9 rounded-lg bg-slate-100 animate-pulse" />
                  </div>
                ) : isAuthenticated && user ? (
                  <>
                    <div className="px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">
                      Tài khoản
                    </div>
                    <div className="px-3 py-1 text-sm text-slate-600">
                      <p className="font-medium truncate">{user.full_name}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setOpenMobile(false)}
                      className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    >
                      Hồ sơ cá nhân
                    </Link>
                    {user?.role === "admin" && (
                      <Link
                        to="/admin"
                        onClick={() => setOpenMobile(false)}
                        className="block px-3 py-2 rounded-lg text-sm font-medium text-indigo-600 hover:bg-indigo-50"
                      >
                        Admin Dashboard
                      </Link>
                    )}
                    <Link
                      to="/settings"
                      onClick={() => setOpenMobile(false)}
                      className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    >
                      Cài đặt
                    </Link>
                    <button
                      onClick={() => {
                        setOpenMobile(false);
                        handleLogout();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Đăng xuất
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setOpenMobile(false)}
                      className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    >
                      Đăng nhập
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setOpenMobile(false)}
                      className="block px-3 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Đăng ký
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Header;
