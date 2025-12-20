import React from "react";
import { Link } from "react-router-dom";
import MainLayout from "../layout/MainLayout";

const HomePage = () => {
  const features = [
    {
      icon: "📝",
      title: "Bài kiểm tra trắc nghiệm",
      desc: "Luyện tập với hàng trăm câu hỏi trắc nghiệm đa dạng chủ đề"
    },
    {
      icon: "📚",
      title: "Học từ vựng",
      desc: "Nâng cao vốn từ vựng với các bài học và bài kiểm tra tương tác"
    }
  ];

  return (
    <MainLayout maxWidth="full">
      {/* Hero Section */}
      <div className="relative min-h-screen overflow-hidden mx-6 rounded-3xl bg-gradient-to-r from-purple-800 via-indigo-900 to-slate-900 text-white">
        {/* Simple Background Pattern */}
        <div className="relative z-10 w-full pt-20 pb-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl md:text-7xl font-black mb-6">
              <span
                className="text-white"
                style={{ WebkitTextStroke: "1px #000" }}
              >
                Quiz
              </span>
              <span
                className="ml-3 text-blue-600"
                style={{ WebkitTextStroke: "1px #000" }}
              >
                Smart
              </span>
            </h1>

            <p className="text-2xl md:text-3xl font-bold text-slate-100 mb-4">
              Nền tảng học tập thông minh
            </p>

            <p className="text-lg text-slate-200 max-w-3xl mx-auto mb-12 leading-relaxed">
              Học tập hiệu quả với bài kiểm tra trắc nghiệm và từ vựng.
              Chấm điểm tức thì và theo dõi tiến độ học tập của bạn.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link
                to="/topics"
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
              >
                Khám phá chủ đề
              </Link>

              <Link
                to="/register"
                className="px-8 py-4 bg-white text-blue-600 font-bold rounded-xl text-lg border-2 border-blue-200 hover:border-blue-400 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
              >
                Đăng ký miễn phí
              </Link>
            </div>

            {/* Simple Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">2</div>
                <div className="text-sm text-slate-200">Chức năng chính</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">∞</div>
                <div className="text-sm text-slate-200">Câu hỏi</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">🎯</div>
                <div className="text-sm text-slate-200">Chấm điểm tức thì</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">📊</div>
                <div className="text-sm text-slate-200">Theo dõi tiến độ</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Chức năng chính
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Hai công cụ học tập thiết yếu cho việc ôn luyện và nâng cao kiến thức
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-8 bg-blue-50 rounded-2xl border border-blue-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300"
              >
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              to="/topics"
              className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200"
            >
              Bắt đầu học tập
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Simple CTA */}
      <div className="py-16 bg-blue-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold mb-4">
            Sẵn sàng bắt đầu?
          </h2>
          <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
            Tạo tài khoản miễn phí và bắt đầu hành trình học tập của bạn ngay hôm nay.
          </p>

          <Link
            to="/register"
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200"
          >
            Đăng ký ngay
          </Link>
        </div>
      </div>
    </MainLayout>
  );
};

export default HomePage;