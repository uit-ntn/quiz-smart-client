import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import userService from "../services/userService";

const HomePage = () => {
  const navigate = useNavigate();
  const [latestUsers, setLatestUsers] = useState([]);
  const [topContributors, setTopContributors] = useState([]);
  const [topPerformers, setTopPerformers] = useState([]);
  const [systemStats, setSystemStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedContributor, setSelectedContributor] = useState(null);
  const [showContributorModal, setShowContributorModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [users, contributors, performers, stats] = await Promise.all([
          userService.getLatestUsers(5),
          userService.getTopContributors(5),
          userService.getTopPerformers(5),
          userService.getSystemOverview()
        ]);
        setLatestUsers(users);
        setTopContributors(contributors);
        setTopPerformers(performers);
        setSystemStats(stats);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleTestClick = (test) => {
    if (!test.test_id) return;
    
    // Navigate to test settings page based on test type
    if (test.test_type === 'vocabulary') {
      navigate(`/vocabulary/test/${test.test_id}/settings`);
    } else if (test.test_type === 'multiple_choice') {
      navigate(`/multiple-choice/test/${test.test_id}/settings`);
    } else {
      // For other test types, navigate to general test page
      navigate(`/test/${test.test_id}`);
    }
    
    // Close modal after navigation
    setShowContributorModal(false);
  };

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

  const UserCard = ({ user, index, type = "latest" }) => {
    const isContributor = type === "contributor";
    const isPerformer = type === "performer";
    
    const bgColor = isContributor ? "bg-amber-50 hover:bg-amber-100" : 
                   isPerformer ? "bg-green-50 hover:bg-green-100" : 
                   "bg-blue-50 hover:bg-blue-100";
    
    const iconColor = isContributor ? "bg-amber-600" : 
                     isPerformer ? "bg-green-600" : 
                     "bg-blue-600";

    return (
      <div 
        className={`flex items-center gap-4 p-4 ${bgColor} rounded-xl transition-all duration-200 ${isContributor ? 'cursor-pointer' : ''}`}
        onClick={isContributor ? () => {
          setSelectedContributor(user);
          setShowContributorModal(true);
        } : undefined}
      >
        <div className={`w-12 h-12 ${iconColor} text-white rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0`}>
          {isContributor || isPerformer ? `#${index + 1}` : user.full_name?.charAt(0).toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-slate-900 truncate">{user.full_name || 'N/A'}</h4>
          <p className="text-sm text-slate-600 truncate">{user.email}</p>
          {isContributor && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-amber-700 font-bold text-sm">{user.total_tests || 0} bài test</span>
              {user.vocabulary_tests > 0 && <span className="text-xs text-slate-500">📚 {user.vocabulary_tests}</span>}
              {user.multiple_choice_tests > 0 && <span className="text-xs text-slate-500">📝 {user.multiple_choice_tests}</span>}
            </div>
          )}
          {isPerformer && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-green-700 font-bold text-sm">{user.average_percentage}% TB</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-600 text-sm">{user.total_tests} bài</span>
            </div>
          )}
        </div>
        {isContributor && (
          <div className="text-xs text-slate-400">Chi tiết →</div>
        )}
      </div>
    );
  };

  return (
    <MainLayout maxWidth="full">
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
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