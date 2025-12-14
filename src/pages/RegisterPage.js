import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import authService from "../services/authService";
import Toast from "../components/Toast";

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Toast state
  const [toast, setToast] = useState({ message: '', type: 'success', isVisible: false });
  
  const navigate = useNavigate();

  const showToast = (message, type = 'success') => {
    setToast({ message, type, isVisible: true });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, isVisible: false }));
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const validateForm = () => {
    if (!formData.full_name.trim()) return setError("Vui lòng nhập họ tên");
    if (!formData.email.trim()) return setError("Vui lòng nhập email");
    if (!formData.password) return setError("Vui lòng nhập mật khẩu");
    if (formData.password.length < 6)
      return setError("Mật khẩu phải có ít nhất 6 ký tự");
    if (formData.password !== formData.confirmPassword)
      return setError("Mật khẩu xác nhận không khớp");
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError("");

    try {
      const { full_name, email, password } = formData;
      const result = await authService.register({ full_name, email, password });
      navigate("/verify-otp", {
        state: {
          email,
          message: result.message || "OTP đã được gửi đến email của bạn.",
        },
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await authService.initiateGoogleLogin();
    } catch (error) {
      if (
        error.message.includes("backend server") ||
        error.message.includes("Server không phản hồi")
      ) {
        showToast("Backend server chưa chạy. Vui lòng khởi động backend trước khi đăng nhập bằng Google.", "error");
      } else {
        setError(error.message);
      }
    }
  };

  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden">
      {/* LEFT: Branding */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-800 text-white items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" />
        <div className="z-10 p-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-6 border border-white/20">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.663 17h4.673M12 3v1M21 12h-1M4 12H3"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-2 tracking-tight">QuizSmart</h1>
          <p className="text-indigo-100 font-medium text-sm">
            Học thông minh mỗi ngày, mở khóa tiềm năng của bạn
          </p>
          <div className="mt-8 text-sm text-indigo-100/80 leading-relaxed max-w-md mx-auto">
            <p>
              Tạo tài khoản để bắt đầu hành trình học tập hiệu quả với hệ thống
              bài luyện tập, test, và từ vựng được cá nhân hóa.
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT: Register Form */}
      <div className="flex-1 flex items-center justify-center bg-neutral-50 px-4 md:px-6">
        <div className="w-full max-w-md bg-white shadow-xl rounded-2xl border border-neutral-200 p-6 md:p-7 max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="text-center mb-4">
            <h2 className="text-xl md:text-2xl font-bold text-neutral-900 mb-1">
              Tạo tài khoản mới
            </h2>
            <p className="text-xs md:text-sm text-neutral-600">
              Đã có tài khoản?{" "}
              <Link
                to="/login"
                className="font-semibold text-blue-600 hover:text-blue-500"
              >
                Đăng nhập ngay
              </Link>
            </p>
          </div>

          {error && (
            <div className="mb-3 p-3 bg-red-50 border-l-4 border-red-400 rounded-r-xl text-xs md:text-sm text-red-700">
              {error}
            </div>
          )}

          {/* FORM: scroll nội bộ nếu cần */}
          <div className="flex-1 overflow-y-auto pr-1">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label
                  htmlFor="full_name"
                  className="block text-xs md:text-sm font-semibold text-neutral-700 mb-1"
                >
                  Họ và tên
                </label>
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  autoComplete="name"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-neutral-50 focus:bg-white transition-all"
                  placeholder="Nhập họ và tên của bạn"
                />
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs md:text-sm font-semibold text-neutral-700 mb-1"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-neutral-50 focus:bg-white transition-all"
                  placeholder="Nhập email của bạn"
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-xs md:text-sm font-semibold text-neutral-700 mb-1"
                >
                  Mật khẩu
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-neutral-50 focus:bg-white transition-all"
                  placeholder="Nhập mật khẩu (ít nhất 6 ký tự)"
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs md:text-sm font-semibold text-neutral-700 mb-1"
                >
                  Xác nhận mật khẩu
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-neutral-50 focus:bg-white transition-all"
                  placeholder="Nhập lại mật khẩu"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-md hover:shadow-lg disabled:opacity-50"
              >
                {loading ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
              </button>

              {/* Divider */}
              <div className="flex items-center my-3">
                <div className="flex-grow border-t border-neutral-300" />
                <span className="mx-2 text-neutral-500 text-[11px] font-medium">
                  HOẶC
                </span>
                <div className="flex-grow border-t border-neutral-300" />
              </div>

              {/* Google Register */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full inline-flex items-center justify-center py-2.5 px-3 border border-neutral-300 rounded-lg bg-white text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-all shadow-sm hover:shadow-md"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Đăng ký bằng Google
              </button>
            </form>
          </div>

          {/* Terms */}
          <p className="text-[11px] md:text-xs text-neutral-500 text-center mt-4">
            Bằng việc tạo tài khoản, bạn đồng ý với{" "}
            <Link
              to="/terms"
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              Điều khoản dịch vụ
            </Link>{" "}
            và{" "}
            <Link
              to="/privacy"
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              Chính sách bảo mật
            </Link>{" "}
            của chúng tôi.
          </p>

          {/* Toast */}
          <Toast
            message={toast.message}
            type={toast.type}
            isVisible={toast.isVisible}
            onClose={hideToast}
          />
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
