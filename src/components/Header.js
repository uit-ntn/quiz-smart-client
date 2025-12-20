import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const cx = (...a) => a.filter(Boolean).join(" ");

const NAV = [
  { to: "/", label: "Trang chủ" },
  { to: "/topics", label: "Chủ đề" },
  { to: "/about", label: "Giới thiệu" },
  { to: "/help", label: "Hướng dẫn" },
];

const MenuIcon = ({ open }) => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth="2"
  >
    {open ? (
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    ) : (
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    )}
  </svg>
);

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const [openMobile, setOpenMobile] = useState(false);
  const [openUser, setOpenUser] = useState(false);
  const userRef = useRef(null);

  // Close user menu when clicking outside
  useEffect(() => {
    const close = (e) => {
      if (userRef.current && !userRef.current.contains(e.target)) {
        setOpenUser(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const navClass = ({ isActive }) =>
    cx(
      "relative px-2 py-1 text-sm font-semibold transition",
      isActive
        ? "text-white after:absolute after:left-0 after:right-0 after:-bottom-1 after:h-0.5 after:bg-cyan-400"
        : "text-white/70 hover:text-white"
    );

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#060B18]">
      <div className="max-w-7xl mx-auto h-14 px-4 flex items-center gap-4">
        {/* Logo */}
        <Link to="/" className="font-black text-white tracking-tight">
          Quiz<span className="text-cyan-400">Smart</span>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center gap-5 ml-6">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === "/"} className={navClass}>
              {n.label}
            </NavLink>
          ))}
        </nav>

        {/* Right */}
        <div className="ml-auto flex items-center gap-3">
          {!isAuthenticated ? (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-1.5 rounded-lg text-sm font-semibold text-cyan-300 border border-cyan-400/30 hover:bg-cyan-400/10"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="px-4 py-1.5 rounded-lg text-sm font-bold bg-cyan-500 text-black hover:bg-cyan-400"
              >
                Đăng ký
              </Link>
            </div>
          ) : (
            <div className="relative" ref={userRef}>
              <button
                onClick={() => setOpenUser((v) => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition"
              >
                <div className="w-7 h-7 rounded-full bg-cyan-500 text-black grid place-items-center text-xs font-black">
                  {user?.full_name?.[0] || "U"}
                </div>
                <span className="hidden sm:block text-sm font-semibold text-white">
                  {user?.full_name}
                </span>
              </button>

              {openUser && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl border border-white/10 bg-[#0B1328] overflow-hidden">
                  <Link
                    to="/profile"
                    onClick={() => setOpenUser(false)}
                    className="block px-4 py-2 text-sm text-white/80 hover:bg-white/10"
                  >
                    Hồ sơ cá nhân
                  </Link>

                  {/* ADMIN ONLY */}
                  {user?.role === "admin" && (
                    <Link
                      to="/admin"
                      onClick={() => setOpenUser(false)}
                      className="block px-4 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-400/10"
                    >
                      Admin Dashboard
                    </Link>
                  )}

                  <button
                    onClick={async () => {
                      setOpenUser(false);
                      await logout();
                      navigate("/");
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-rose-400 hover:bg-rose-500/10"
                  >
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Mobile menu button */}
          <button
            onClick={() => setOpenMobile((v) => !v)}
            className="md:hidden text-white"
            aria-label="Toggle menu"
          >
            <MenuIcon open={openMobile} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {openMobile && (
        <div className="md:hidden border-t border-white/10 bg-[#060B18]">
          <div className="px-4 py-3 flex flex-col gap-3">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                onClick={() => setOpenMobile(false)}
                className="text-sm font-semibold text-white/80"
              >
                {n.label}
              </NavLink>
            ))}

            {!isAuthenticated && (
              <div className="pt-3 flex gap-2">
                <Link
                  to="/login"
                  onClick={() => setOpenMobile(false)}
                  className="flex-1 text-center px-4 py-1.5 rounded-lg text-sm font-semibold text-cyan-300 border border-cyan-400/30"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  onClick={() => setOpenMobile(false)}
                  className="flex-1 text-center px-4 py-1.5 rounded-lg text-sm font-bold bg-cyan-500 text-black"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
