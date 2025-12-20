import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../layout/AdminLayout';
import testService from '../services/testService';
import userService from '../services/userService';
import testResultService from '../services/testResultService';
import LoadingSpinner from '../components/LoadingSpinner';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTests: 0,
    totalUsers: 0,
    totalResults: 0,
    totalVocabularies: 0,
    totalMultipleChoices: 0,
    recentTests: [],
    recentUsers: [],
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [tests, users, testResults] = await Promise.all([
        testService.getAllTests(),
        userService.getAllUsers(),
        testResultService.getAllTestResults(),
      ]);

      setStats({
        totalTests: tests.length || 0,
        totalUsers: users.length || 0,
        totalTestResults: testResults.length || 0,
        totalVocabularies: tests.filter(t => t.test_type === 'vocabulary').length || 0,
        totalMultipleChoices: tests.filter(t => t.test_type === 'multiple_choice').length || 0,
        totalAdmins: users.filter(u => u.role === 'admin').length || 0,
        totalRegularUsers: users.filter(u => u.role === 'user').length || 0,
        totalPublicTests: tests.filter(t => t.visibility === 'public').length || 0,
        totalPrivateTests: tests.filter(t => t.visibility === 'private').length || 0,
        recentTests: tests.slice(0, 5) || [],
        recentUsers: users.slice(0, 5) || [],
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data
  const pieData = [
    { name: 'Vocabulary', value: stats.totalVocabularies, color: '#8884d8' },
    { name: 'Multiple Choice', value: stats.totalMultipleChoices, color: '#82ca9d' },
  ];

  const userRoleData = [
    { name: 'Admin', value: stats.totalAdmins, color: '#ff7300' },
    { name: 'User', value: stats.totalRegularUsers, color: '#00ff00' },
  ];

  const testVisibilityData = [
    { name: 'Public', value: stats.totalPublicTests, color: '#0088fe' },
    { name: 'Private', value: stats.totalPrivateTests, color: '#ffbb28' },
  ];

  const barData = [
    { name: 'Tests', value: stats.totalTests },
    { name: 'Users', value: stats.totalUsers },
    { name: 'Test Results', value: stats.totalTestResults },
  ];

  const recentTestsQuestionsData = stats.recentTests.map(test => ({
    name: test.test_title.length > 10 ? test.test_title.slice(0, 10) + '...' : test.test_title,
    questions: test.total_questions,
  }));

  // Sample data for line chart (user growth over months)
  const userGrowthData = [
    { month: 'Jan', users: 10 },
    { month: 'Feb', users: 25 },
    { month: 'Mar', users: 40 },
    { month: 'Apr', users: 60 },
    { month: 'May', users: 85 },
    { month: 'Jun', users: stats.totalUsers }, // Current total
  ];

  if (loading) {
    return (
      <AdminLayout>
        <LoadingSpinner message="Đang tải dashboard..." />
      </AdminLayout>
    );
  }

  const statCards = [
    {
      title: 'Tổng số Tests',
      value: stats.totalTests,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: 'from-blue-500 to-blue-600',
      link: '/admin/vocabulary-tests',
    },
    {
      title: 'Tổng Users',
      value: stats.totalUsers,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      color: 'from-green-500 to-green-600',
      link: '/admin/users',
    },
    {
      title: 'Vocabulary Tests',
      value: stats.totalVocabularies,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      color: 'from-purple-500 to-purple-600',
      link: '/admin/vocabulary-tests',
    },
    {
      title: 'Multiple Choice Tests',
      value: stats.totalMultipleChoices,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      color: 'from-orange-500 to-orange-600',
      link: '/admin/multiple-choice-tests',
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Tổng quan hệ thống QuizSmart</p>
          </div>
          <button
            onClick={fetchDashboardData}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Làm mới</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((card, index) => (
            <Link
              key={index}
              to={card.link}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">{card.title}</p>
                  <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                </div>
                <div className={`w-16 h-16 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center text-white shadow-lg`}>
                  {card.icon}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Phân bố Tests</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tổng quan</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Phân bố Users</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={userRoleData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {userRoleData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Visibility Tests</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={testVisibilityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {testVisibilityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Tests Questions</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={recentTestsQuestionsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="questions" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Growth</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="users" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Data Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Tests */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Tests mới nhất</h2>
              <Link
                to="/admin/vocabulary-tests"
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Xem tất cả →
              </Link>
            </div>
            <div className="divide-y divide-gray-200">
              {stats.recentTests.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500">
                  Chưa có test nào
                </div>
              ) : (
                stats.recentTests.map((test) => (
                  <div key={test._id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {test.test_title}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            test.test_type === 'vocabulary' ? 'bg-purple-100 text-purple-800' :
                            test.test_type === 'multiple_choice' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {test.test_type === 'vocabulary' ? 'Từ vựng' :
                             test.test_type === 'multiple_choice' ? 'Trắc nghiệm' :
                             test.test_type}
                          </span>
                          <span className="text-xs text-gray-500">
                            {test.total_questions} câu
                          </span>
                        </div>
                      </div>
                      <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        test.visibility === 'public' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {test.visibility === 'public' ? '🌍 Công khai' : '🔒 Riêng tư'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Users */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Users mới nhất</h2>
              <Link
                to="/admin/users"
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Xem tất cả →
              </Link>
            </div>
            <div className="divide-y divide-gray-200">
              {stats.recentUsers.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500">
                  Chưa có user nào
                </div>
              ) : (
                stats.recentUsers.map((user) => (
                  <div key={user._id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                        {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user.full_name || user.email}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
