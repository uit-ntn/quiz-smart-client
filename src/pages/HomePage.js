import React, { useState } from "react";
import { Link } from "react-router-dom";
import MainLayout from "../layout/MainLayout";

const HomePage = () => {

  return (
    <MainLayout>
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-blue-50 min-h-screen flex items-center">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-indigo-400 rounded-full opacity-20"></div>
          <div className="absolute top-1/3 right-1/4 w-40 h-40 bg-purple-400 rounded-full opacity-20"></div>
          <div className="absolute bottom-1/4 left-1/3 w-36 h-36 bg-blue-400 rounded-full opacity-20"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-black text-indigo-900 mb-6">
              QuizMaster
            </h1>

            <p className="text-2xl md:text-3xl font-bold text-indigo-900 mb-4">
              Nền tảng thi trực tuyến thông minh
            </p>

            <p className="text-lg text-indigo-700 max-w-3xl mx-auto mb-12 leading-relaxed">
              Trải nghiệm làm bài thi hoàn toàn mới với AI hỗ trợ, chấm điểm tức thì,
              và phân tích kết quả chi tiết. Hơn 10,000+ câu hỏi được cập nhật liên tục.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link
                to="/topics"
                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300"
              >
                Khám phá chủ đề học tập
              </Link>

              <Link
                to="/register"
                className="px-8 py-4 bg-white text-indigo-600 font-bold rounded-2xl text-lg border-2 border-indigo-200 hover:border-indigo-400 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
              >
                Đăng ký miễn phí
              </Link>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default HomePage;