import React from "react";
import {
  SiGmail,
  SiGithub,
  SiLinkedin
} from "react-icons/si";
import {
  FiTarget,
  FiEye,
  FiHeart,
  FiUsers,
  FiCalendar,
  FiZap,
  FiAward,
  FiBookOpen,
  FiTrendingUp
} from "react-icons/fi";

import MainLayout from "../layout/MainLayout";

const teamMembers = [
  {
    name: "Nguyễn Thanh Nhân",
    role: "Web Developer",
    image: "https://avatars.githubusercontent.com/u/95362896?v=4",
    description:
      "Sinh viên Đại học Công nghệ Thông tin, đam mê phát triển ứng dụng web và cloud.",
    email: "npthanhnhan2003@gmail.com",
    github: "https://github.com/npthanhnhan2003",
    linkedin: "https://linkedin.com/in/npthanhnhan2003",
  },
];

const milestones = [
  {
    year: "11/2025",
    title: "Ý tưởng khởi nguồn",
    description:
      "Sinh viên Nguyễn Thanh Nhân bắt đầu nghiên cứu và phát triển ý tưởng ứng dụng quizz thông minh.",
  },
  {
    year: "12/2025",
    title: "Phát triển MVP",
    description:
      "Hoàn thành phiên bản đầu tiên với tính năng quizz đa dạng, phát âm AI và giao diện thân thiện.",
  },
  {
    year: "12/2025",
    title: "Ra mắt QuizSmart",
    description: "Chính thức giới thiệu ứng dụng với cộng đồng học tập, nhận phản hồi tích cực từ người dùng.",
  },
  {
    year: "12/2025",
    title: "Cải tiến UX và sửa lỗi",
    description:
      "Đơn giản hóa cài đặt test, sửa lỗi lưu kết quả, thêm chức năng xóa kết quả và thay thế alert bằng toast notifications.",
  },
  {
    year: "2026",
    title: "Tương lai",
    description:
      "Mở rộng tính năng AI cá nhân hóa, cộng đồng học tập và tích hợp thêm nhiều ngôn ngữ.",
  },
];

const features = [
  {
    icon: <FiBookOpen className="w-6 h-6 text-blue-600" />,
    title: "Học từ vựng",
    desc: "Quizz từ vựng với phát âm AI chính xác."
  },
  {
    icon: <FiTrendingUp className="w-6 h-6 text-green-600" />,
    title: "Luyện thi",
    desc: "Bài tập trắc nghiệm đa dạng theo chủ đề."
  },
  {
    icon: <FiZap className="w-6 h-6 text-purple-600" />,
    title: "AI Tạo bài",
    desc: "Tự động tạo bài test từ văn bản đầu vào."
  }
];

function AboutPage() {
  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="relative py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center">
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
                Chào mừng đến với <span className="text-blue-600">QuizSmart</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                Nền tảng học tập thông minh giúp bạn ôn tập từ vựng và luyện thi một cách hiệu quả với công nghệ AI.
              </p>
              <div className="flex justify-center space-x-4">
                <button className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
                  Bắt đầu học
                </button>
                <button className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition">
                  Tìm hiểu thêm
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900">Tính năng nổi bật</h2>
              <p className="text-gray-600 mt-4">Những gì QuizSmart mang lại cho bạn</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div key={index} className="text-center p-6 bg-gray-50 rounded-lg">
                  <div className="flex justify-center mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Mission, Vision, Values */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900">Sứ mệnh, Tầm nhìn & Giá trị</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center p-6 bg-white rounded-lg shadow">
                <FiTarget className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Sứ mệnh</h3>
                <p className="text-gray-600">Giúp mọi người học dễ hơn, nhớ lâu hơn, học ở bất kỳ đâu.</p>
              </div>
              <div className="text-center p-6 bg-white rounded-lg shadow">
                <FiEye className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Tầm nhìn</h3>
                <p className="text-gray-600">Trở thành nền tảng học từ vựng & luyện thi hàng đầu Việt Nam.</p>
              </div>
              <div className="text-center p-6 bg-white rounded-lg shadow">
                <FiHeart className="w-12 h-12 text-red-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Giá trị</h3>
                <p className="text-gray-600">Đổi mới, chất lượng, cộng đồng và phát triển bền vững.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900">Hành trình phát triển</h2>
            </div>
            <div className="space-y-8">
              {milestones.map((milestone, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                      <FiAward className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-sm font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded">{milestone.year}</span>
                      <h3 className="text-lg font-semibold text-gray-900">{milestone.title}</h3>
                    </div>
                    <p className="text-gray-600">{milestone.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900">Đội ngũ</h2>
            </div>
            <div className="grid md:grid-cols-1 gap-8 justify-center">
              {teamMembers.map((member, index) => (
                <div key={index} className="bg-white p-8 rounded-lg shadow text-center">
                  <img src={member.image} alt={member.name} className="w-24 h-24 rounded-full mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{member.name}</h3>
                  <p className="text-blue-600 mb-4">{member.role}</p>
                  <p className="text-gray-600 mb-6">{member.description}</p>
                  <div className="flex justify-center space-x-4">
                    <a href={`mailto:${member.email}`} className="text-gray-500 hover:text-blue-600">
                      <SiGmail size={24} />
                    </a>
                    <a href={member.github} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-900">
                      <SiGithub size={24} />
                    </a>
                    <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-700">
                      <SiLinkedin size={24} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-blue-600 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold mb-4">Đồng hành cùng QuizSmart</h2>
            <p className="text-blue-100 mb-8">Tham gia cộng đồng học tập hiệu quả ngay hôm nay.</p>
            <div className="flex justify-center space-x-4">
              <a href="mailto:npthanhnhan2003@gmail.com" className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition">
                Liên hệ hợp tác
              </a>
              <a href="https://github.com/npthanhnhan2003" target="_blank" rel="noopener noreferrer" className="border border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition">
                Xem mã nguồn
              </a>
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}

export default AboutPage;
