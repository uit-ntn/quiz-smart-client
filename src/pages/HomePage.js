import React, { useState } from "react";
import { Link } from "react-router-dom";
import MainLayout from "../layout/MainLayout";

const HomePage = () => {
  const [activeTab, setActiveTab] = useState('features');

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
                to="/multiple-choice/topics"
                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300"
              >
                Làm trắc nghiệm ngay
              </Link>

              <Link
                to="/vocabulary/topics"
                className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300"
              >
                Làm bài từ vựng ngay
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

      {/* Interactive Tabs Section */}
      <div className="py-20 bg-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-indigo-900 mb-4">
              Tại sao chọn QuizMaster?
            </h2>
            <p className="text-xl text-indigo-600 max-w-2xl mx-auto">
              Khám phá những tính năng độc đáo giúp bạn học tập hiệu quả hơn
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap justify-center mb-12 gap-4">
            {[
              { id: 'features', label: 'Tính năng', icon: '⚡' },
              { id: 'ai', label: 'AI Support', icon: '' },
              { id: 'mobile', label: 'Mobile App', icon: '' },
              { id: 'analytics', label: 'Phân tích', icon: '' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 rounded-2xl font-bold text-lg transition-all duration-300 ${activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-lg transform scale-105'
                  : 'bg-gray-100 text-indigo-700 hover:bg-gray-200'
                  }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-3xl p-8 md:p-12 shadow-lg">
            {activeTab === 'features' && (
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <h3 className="text-3xl font-black text-indigo-900 mb-6">
                    Tính năng vượt trội
                  </h3>
                  <div className="space-y-4">
                    {[
                      "⚡ Chấm điểm tức thì với độ chính xác 99.9%",
                      "🎨 Giao diện đẹp mắt, dễ sử dụng",
                      "🔄 Đồng bộ tiến độ trên mọi thiết bị",
                      "🏆 Bảng xếp hạng và thành tích"
                    ].map((feature, index) => (
                      <div key={index} className="flex items-center text-lg text-indigo-700">
                        <span className="mr-3">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-2xl">
                  <div className="h-64 bg-indigo-500 rounded-xl flex items-center justify-center">
                    <span className="text-white text-6xl">⚡</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <h3 className="text-3xl font-black text-indigo-900 mb-6">
                    🤖 AI thông minh
                  </h3>
                  <div className="space-y-4">
                    {[
                      "Gợi ý câu trả lời thông minh",
                      "Tự động tạo đề thi theo năng lực",
                      "Phát hiện điểm yếu và đưa ra lộ trình"].map((feature, index) => (
                        <div key={index} className="flex items-center text-lg text-indigo-700">
                          <span className="mr-3">{feature}</span>
                        </div>
                      ))}
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-2xl">
                  <div className="h-64 bg-purple-500 rounded-xl flex items-center justify-center">
                    <span className="text-white text-6xl">🤖</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'mobile' && (
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <h3 className="text-3xl font-black text-indigo-900 mb-6">
                    📱 Ứng dụng di động
                  </h3>
                  <div className="space-y-4">
                    {[
                      "📲 Tải về miễn phí cho iOS và Android",
                      "⚡ Tốc độ siêu nhanh, giao diện mượt mà",
                      "📴 Làm bài offline khi không có mạng",
                      "🔔 Thông báo nhắc nhở học tập"
                    ].map((feature, index) => (
                      <div key={index} className="flex items-center text-lg text-indigo-700">
                        <span className="mr-3">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-2xl">
                  <div className="h-64 bg-pink-500 rounded-xl flex items-center justify-center">
                    <span className="text-white text-6xl">📱</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <h3 className="text-3xl font-black text-indigo-900 mb-6">
                    📊 Phân tích chi tiết
                  </h3>
                  <div className="space-y-4">
                    {[
                      "📈 Biểu đồ tiến độ học tập trực quan",
                      "🎯 Phân tích điểm mạnh, điểm yếu",
                      "⏱️ Thống kê thời gian làm bài",
                      "🏅 So sánh với các học viên khác"
                    ].map((feature, index) => (
                      <div key={index} className="flex items-center text-lg text-indigo-700">
                        <span className="mr-3">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-2xl">
                  <div className="h-64 bg-blue-500 rounded-xl flex items-center justify-center">
                    <span className="text-white text-6xl">📊</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Study Categories */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-indigo-900 mb-4">
              🎓 Danh mục học tập
            </h2>
            <p className="text-xl text-indigo-600">
              Chọn lĩnh vực bạn muốn chinh phục
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: "📝",
                title: "Trắc nghiệm đa dạng",
                desc: "Hàng nghìn câu hỏi từ cơ bản đến nâng cao",
                color: "bg-blue-500",
                link: "/multiple-choice/topics"
              },
              {
                icon: "📖",
                title: "Từ vựng thông minh",
                desc: "Học từ vựng với phương pháp khoa học",
                color: "bg-purple-500",
                link: "/vocabulary/topics"
              },
              {
                icon: "⚡",
                title: "Luyện thi tốc độ",
                desc: "Rèn luyện kỹ năng làm bài nhanh và chính xác",
                color: "bg-green-500",
                link: "/grammar/topics"
              }
            ].map((category, index) => (
              <Link
                key={index}
                to={category.link}
                className="group relative overflow-hidden bg-white hover:bg-gray-50 rounded-3xl p-8 shadow-xl hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-500"
              >
                <div className="relative">
                  <div className="text-6xl mb-6">{category.icon}</div>
                  <h3 className="text-2xl font-black text-indigo-900 mb-4">{category.title}</h3>
                  <p className="text-indigo-600 mb-6">{category.desc}</p>
                  <div className="flex items-center text-indigo-700 font-bold">
                    Khám phá ngay
                    <svg className="w-5 h-5 ml-2 transform group-hover:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="py-20 bg-indigo-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
            🚀 Sẵn sàng bứt phá?
          </h2>
          <p className="text-xl text-indigo-100 mb-8">
            Tham gia cùng 50,000+ học viên đang thành công với QuizMaster
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/multiple-choice/topics"
              className="px-8 py-4 bg-white text-indigo-600 font-black rounded-2xl text-lg shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 transition-all duration-300"
            >
              Làm trắc nghiệm ngay
            </Link>
            <Link
              to="/vocabulary/topics"
              className="px-8 py-4 bg-white text-indigo-600 font-black rounded-2xl text-lg shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 transition-all duration-300"
            >
              Học từ vựng ngay
            </Link>
            <Link
              to="/login"
              className="px-8 py-4 bg-transparent text-white font-black rounded-2xl text-lg border-2 border-white hover:bg-white hover:text-indigo-600 transition-all duration-300"
            >
              📝 Đăng ký miễn phí
            </Link>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default HomePage;