import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import userService from "../services/userService";

const HomePage = () => {
  const [systemStats, setSystemStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const stats = await userService.getSystemOverview();
        setSystemStats(stats);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const StatCard = ({ icon, title, value, subtitle, color = "blue" }) => {
    const colorClasses = {
      blue: "from-blue-500 to-blue-600 shadow-blue-500/25",
      indigo: "from-indigo-500 to-indigo-600 shadow-indigo-500/25",
      purple: "from-purple-500 to-purple-600 shadow-purple-500/25",
      green: "from-green-500 to-green-600 shadow-green-500/25",
      orange: "from-orange-500 to-orange-600 shadow-orange-500/25",
      red: "from-red-500 to-red-600 shadow-red-500/25"
    };

    return (
      <div className={`bg-gradient-to-r ${colorClasses[color]} rounded-2xl p-6 text-white shadow-lg transform hover:scale-105 transition-all duration-300`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm font-medium">{title}</p>
            <p className="text-3xl font-bold mt-1">{loading ? "..." : value}</p>
            {subtitle && <p className="text-white/70 text-xs mt-1">{subtitle}</p>}
          </div>
          <div className="text-4xl opacity-80">{icon}</div>
        </div>
      </div>
    );
  };

  return (
    <MainLayout maxWidth="full" className="!px-0 !py-0">
      {/* Hero Section with Stats */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-black mb-4">
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Quiz Smart
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-300 mb-2">Nền tảng học tập thông minh</p>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Học tập hiệu quả với bài kiểm tra trắc nghiệm và từ vựng. Chấm điểm tức thì và theo dõi tiến độ học tập.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="hidden md:grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
            <StatCard
              icon="👥"
              title="Người dùng"
              value={systemStats?.users?.total || '0'}
              subtitle={`${systemStats?.users?.active_last_30_days || 0} hoạt động`}
              color="blue"
            />
            <StatCard
              icon="📁"
              title="Chủ đề chính"
              value={systemStats?.topics?.total_main_topics || '0'}
              subtitle="Danh mục"
              color="indigo"
            />
            <StatCard
              icon="📂"
              title="Chủ đề phụ"
              value={systemStats?.topics?.total_sub_topics || '0'}
              subtitle="Phân loại"
              color="purple"
            />
            <StatCard
              icon="📚"
              title="Bài test"
              value={systemStats?.tests?.total || '0'}
              subtitle="Tổng bài test trong hệ thống"
              color="green"
            />
            <StatCard
              icon="✅"
              title="Lượt làm bài"
              value={systemStats?.test_results?.total || '0'}
              subtitle="Tổng lượt làm bài"
              color="orange"
            />
            <StatCard
              icon="🎯"
              title="Điểm trung bình"
              value={`${systemStats?.test_results?.average_score || '0'}%`}
              subtitle="Toàn hệ thống"
              color="red"
            />
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/topics"
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 text-center"
            >
              🚀 Khám phá chủ đề
            </Link>
            <Link
              to="/register"
              className="px-8 py-4 bg-white text-blue-600 font-bold rounded-xl text-lg border-2 border-blue-200 hover:border-blue-400 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 text-center"
            >
              ✨ Đăng ký miễn phí
            </Link>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default HomePage;