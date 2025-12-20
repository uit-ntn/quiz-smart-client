import React from "react";
import { Link } from "react-router-dom";

const cx = (...a) => a.filter(Boolean).join(" ");

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto relative overflow-hidden bg-[#070A14] text-white">
      {/* Decorative glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute -top-20 right-0 h-80 w-80 rounded-full bg-fuchsia-500/15 blur-3xl" />
        <div className="absolute -bottom-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      {/* Top border gradient */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 grid place-items-center mr-3 shadow-[0_12px_40px_-20px_rgba(99,102,241,0.8)]">
                <svg
                  className="w-[16px] h-[16px] text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.663 17h4.673M12 3v1M21 12h-1M4 12H3"
                  />
                </svg>
              </div>
              <div>
                <h5 className="text-lg font-black tracking-tight">QuizSmart</h5>
                <p className="text-xs text-white/60 font-semibold">Học thông minh mỗi ngày</p>
              </div>
            </div>

            <p className="text-white/70 leading-relaxed">
              Nền tảng luyện tập thông minh cho trắc nghiệm, ngữ pháp và từ vựng. Tối ưu trải nghiệm học tập với
              giao diện hiện đại, mượt mà.
            </p>

            {/* Social */}
            <div className="mt-5 flex items-center gap-3">
              <a
                href="https://github.com/uit-ntn"
                target="_blank"
                rel="noreferrer"
                className={cx(
                  "inline-flex items-center justify-center",
                  "h-10 w-10 rounded-xl",
                  "bg-white/5 border border-white/10",
                  "hover:bg-white/10 hover:border-white/20 transition"
                )}
                aria-label="GitHub"
                title="GitHub"
              >
                <svg className="w-5 h-5 text-white/80" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 .5C5.73.5.75 5.64.75 12c0 5.11 3.2 9.43 7.64 10.96.56.1.77-.25.77-.55 0-.27-.01-.98-.02-1.93-3.11.69-3.77-1.54-3.77-1.54-.5-1.32-1.23-1.67-1.23-1.67-1.01-.7.08-.69.08-.69 1.12.08 1.7 1.17 1.7 1.17 1 .1 1.53.7 1.86 1.25.9 1.58 2.36 1.12 2.94.86.09-.67.35-1.12.64-1.38-2.48-.29-5.09-1.27-5.09-5.66 0-1.25.43-2.27 1.15-3.07-.12-.29-.5-1.47.11-3.05 0 0 .94-.31 3.08 1.17a10.4 10.4 0 0 1 2.8-.39c.95 0 1.9.13 2.8.39 2.14-1.48 3.08-1.17 3.08-1.17.61 1.58.23 2.76.11 3.05.71.8 1.15 1.82 1.15 3.07 0 4.4-2.61 5.36-5.1 5.65.36.33.69.98.69 1.98 0 1.43-.01 2.58-.01 2.93 0 .31.2.66.78.55 4.43-1.53 7.63-5.85 7.63-10.96C23.25 5.64 18.27.5 12 .5z" />
                </svg>
              </a>

              <a
                href="mailto:npthanhnhan2003@gmail.com"
                className={cx(
                  "inline-flex items-center gap-2",
                  "h-10 px-4 rounded-xl",
                  "bg-white/5 border border-white/10",
                  "hover:bg-white/10 hover:border-white/20 transition"
                )}
                aria-label="Email"
                title="Email"
              >
                <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l9 6 9-6v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 8l-9 6-9-6 9-6 9 6z" />
                </svg>
                <span className="text-sm font-bold text-white/80">Liên hệ</span>
              </a>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h6 className="text-sm font-black text-white mb-3">Liên kết nhanh</h6>
            <ul className="space-y-2 text-white/70">
              <li>
                <Link className="hover:text-white transition" to="/">
                  Trang chủ
                </Link>
              </li>
              <li>
                <Link className="hover:text-white transition" to="/multiple-choice/topics">
                  Trắc nghiệm
                </Link>
              </li>
              <li>
                <Link className="hover:text-white transition" to="/grammar/topics">
                  Ngữ pháp
                </Link>
              </li>
              <li>
                <Link className="hover:text-white transition" to="/vocabulary/topics">
                  Từ vựng
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h6 className="text-sm font-black text-white mb-3">Tài nguyên</h6>
            <ul className="space-y-2 text-white/70">
              <li>
                <Link className="hover:text-white transition" to="/help">
                  Hướng dẫn
                </Link>
              </li>
              <li>
                <Link className="hover:text-white transition" to="/about">
                  Giới thiệu
                </Link>
              </li>
              <li>
                <a
                  className="hover:text-white transition"
                  href="https://github.com/npthanhnhan2003"
                  target="_blank"
                  rel="noreferrer"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h6 className="text-sm font-black text-white mb-3">Liên hệ</h6>
            <ul className="space-y-2 text-white/70">
              <li>
                <a className="hover:text-white transition" href="mailto:npthanhnhan2003@gmail.com">
                  npthanhnhan2003@gmail.com
                </a>
              </li>
              <li>TP. Hồ Chí Minh, Việt Nam</li>
            </ul>

            {/* Mini badge */}
            <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-bold text-white/80">Online • hỗ trợ nhanh</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative border-t border-white/10 bg-white/[0.03]">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-white/60 font-semibold">
            © {year} QuizSmart. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm font-semibold">
            <Link to="/privacy" className="text-white/60 hover:text-white transition">
              Chính sách bảo mật
            </Link>
            <Link to="/terms" className="text-white/60 hover:text-white transition">
              Điều khoản sử dụng
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
