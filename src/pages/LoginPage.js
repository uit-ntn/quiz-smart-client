import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import authService from "../services/authService";
import Toast from "../components/Toast";

const LoginPage = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Toast state
  const [toast, setToast] = useState({ message: '', type: 'success', isVisible: false });
  
  const navigate = useNavigate();
  const location = useLocation();

  // Check if user is already authenticated on mount and redirect if needed
  useEffect(() => {
    // Only check if not currently logging in (to avoid redirect during login process)
    const isLoggingIn = sessionStorage.getItem('isLoggingIn') === 'true';
    
    if (!isLoggingIn && authService.isAuthenticated()) {
      const authReturnTo = localStorage.getItem('authReturnTo');
      const from = location.state?.from?.pathname;
      const redirectTo = authReturnTo || from || '/topics';
      if (authReturnTo) localStorage.removeItem('authReturnTo');
      navigate(redirectTo, { replace: true });
      return;
    }
    
    console.log('🔍 LoginPage mounted:');
    console.log('- location.state:', location.state);
    console.log('- location.pathname:', location.pathname);
    console.log('- authReturnTo in localStorage:', localStorage.getItem('authReturnTo'));
  }, [location, navigate]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type, isVisible: true });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, isVisible: false }));
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError("");
    if (toast.isVisible) hideToast();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await authService.login(formData.email, formData.password);
      
      // Debug logs to check redirect logic
      const authReturnTo = localStorage.getItem("authReturnTo");
      const fromState = location.state?.from?.pathname;
      console.log("🔍 Login redirect debug:");
      console.log("- authReturnTo from localStorage:", authReturnTo);
      console.log("- location.state?.from?.pathname:", fromState);
      console.log("- location.state:", location.state);
      
      // Default to /topics for successful login (if no return path specified)
      const returnTo = authReturnTo || fromState || "/topics";
      console.log("- Final returnTo:", returnTo);
      
      // Remove authReturnTo immediately to prevent ProtectedRoute from using it
      localStorage.removeItem("authReturnTo");
      
      // Dispatch events to notify AuthContext and ProtectedRoute to update
      window.dispatchEvent(new CustomEvent('profileUpdated', { 
        detail: { user: result.user || authService.getCurrentUserData() } 
      }));
      window.dispatchEvent(new CustomEvent('authStateChanged'));
      
      // Show success toast
      showToast("Đăng nhập thành công!", "success");
      
      // Navigate after a short delay to ensure toast is visible
      setTimeout(() => {
        console.log("🚀 Navigating to:", returnTo);
        navigate(returnTo, { replace: true });
      }, 800);
    } catch (error) {
      setError(error.message);
      showToast("Đăng nhập thất bại: " + error.message, "error");
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const authReturnTo = localStorage.getItem("authReturnTo");
      const fromState = location.state?.from?.pathname;
      
      console.log("🔍 Google login redirect debug:");
      console.log("- authReturnTo from localStorage:", authReturnTo);
      console.log("- location.state?.from?.pathname:", fromState);
      
      const returnTo = authReturnTo || fromState || "/";
      console.log("- Final returnTo for Google:", returnTo);
      
      localStorage.setItem("authReturnTo", returnTo);
      await authService.initiateGoogleLogin();
    } catch (error) {
      if (
        error.message.includes("Backend server chưa chạy") ||
        error.message.includes("Backend server is not running")
      ) {
        showToast("Backend server chưa chạy. Vui lòng khởi động backend trước khi đăng nhập bằng Google.", "error");
      } else {
        setError(error.message);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* LEFT: Branding */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-800 text-white items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"></div>
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
            Học thông minh mỗi ngày, đạt kết quả vượt trội
          </p>
          <div className="mt-10 text-sm text-indigo-100/80 leading-relaxed max-w-md mx-auto">
            <p>
              Nền tảng giúp bạn luyện thi, học từ vựng và kiểm tra kiến thức
              hiệu quả hơn với công nghệ tự động hóa thông minh.
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT: Login Form */}
      <div className="flex-1 flex items-center justify-center bg-neutral-50 px-6 py-10">
        <div className="w-full max-w-md bg-white shadow-xl rounded-2xl border border-neutral-200 p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 mb-1">
              Đăng nhập tài khoản
            </h2>
            <p className="text-sm text-neutral-600">
              Chưa có tài khoản?{" "}
              <Link
                to="/register"
                className="font-semibold text-blue-600 hover:text-blue-500"
              >
                Đăng ký ngay
              </Link>
            </p>
          </div>

          {/* System messages */}
          {location.state?.message && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm text-center">
              {location.state.message}
            </div>
          )}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-r-xl">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-neutral-700 mb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-neutral-300 rounded-lg text-black text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-neutral-50 focus:bg-white transition-all"
                placeholder="Nhập email của bạn"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-neutral-700 mb-1.5"
              >
                Mật khẩu
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-neutral-300 rounded-lg text-black text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-neutral-50 focus:bg-white transition-all"
                placeholder="Nhập mật khẩu"
              />
            </div>

            <div className="flex justify-between text-sm mt-1">
              <Link
                to="/forgot-password"
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                Quên mật khẩu?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>

            {/* Divider */}
            <div className="flex items-center my-6">
              <div className="flex-grow border-t border-neutral-300"></div>
              <span className="mx-3 text-neutral-500 text-xs font-medium">
                HOẶC
              </span>
              <div className="flex-grow border-t border-neutral-300"></div>
            </div>

            {/* Google Login */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full inline-flex items-center justify-center py-3 px-4 border border-neutral-300 rounded-lg bg-white text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-all shadow-sm hover:shadow-md"
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
              Đăng nhập bằng Google
            </button>
          </form>

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

export default LoginPage;
