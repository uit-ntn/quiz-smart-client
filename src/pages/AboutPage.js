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
  FiAward
} from "react-icons/fi";

import MainLayout from "../layout/MainLayout";

const teamMembers = [
  {
    name: "Nguyễn Thanh Nhân",
    role: "Web Developer",
    image: "https://via.placeholder.com/240",
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

function AboutPage() {
  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        {/* HERO */}
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white">
          <div className="absolute -top-24 -right-24 w-[28rem] h-[28rem] bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-[28rem] h-[28rem] bg-white/10 rounded-full blur-3xl" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <span className="inline-flex items-center text-xs font-semibold uppercase tracking-wider text-white/80 bg-white/10 border border-white/20 rounded-full px-3 py-1">
                  Về QuizSmart
                </span>
                <h1 className="mt-5 text-4xl lg:text-5xl font-extrabold leading-tight">
                  Biến học tập thành trải nghiệm
                  <span className="block bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                    thú vị & hiệu quả
                  </span>
                </h1>
                <p className="mt-4 text-white/90 text-lg leading-relaxed">
                  QuizSmart giúp học từ vựng và luyện thi trở nên mạch lạc,
                  có lộ trình và đo lường được tiến bộ.
                </p>

                <div className="mt-8 grid grid-cols-3 gap-4 max-w-xl">
                  <Stat
                    value="2025"
                    label="Năm thành lập"
                    icon={<FiCalendar className="w-5 h-5 text-blue-700" />}
                  />
                  <Stat
                    value="500+"
                    label="Người dùng"
                    icon={<FiUsers className="w-5 h-5 text-indigo-700" />}
                  />
                  <Stat
                    value="3"
                    label="Chế độ quiz"
                    icon={<FiZap className="w-5 h-5 text-purple-700" />}
                  />
                </div>
              </div>

              {/* Visual */}
              <div className="relative">
                <div className="aspect-[4/3] rounded-3xl bg-white/10 border border-white/20 backdrop-blur shadow-2xl" />
                <div className="absolute inset-0 -z-10 bg-gradient-to-tr from-white/10 via-transparent to-white/10 rounded-3xl blur-2xl" />
              </div>
            </div>
          </div>
        </section>

        {/* MISSION / VISION / VALUES */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">
                Sứ mệnh, Tầm nhìn & Giá trị
              </h2>
              <p className="mt-3 text-gray-600 max-w-2xl mx-auto">
                Hướng tới một nền tảng học tập có tác động bền vững.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <KVCard
                icon={<FiTarget className="w-5 h-5 text-white" />}
                title="Sứ mệnh"
                desc="Giúp mọi người học dễ hơn, nhớ lâu hơn, học ở bất kỳ đâu."
                gradient="from-blue-600 to-indigo-600"
              />
              <KVCard
                icon={<FiEye className="w-5 h-5 text-white" />}
                title="Tầm nhìn"
                desc="Trở thành nền tảng học từ vựng & luyện thi hàng đầu Việt Nam."
                gradient="from-emerald-600 to-teal-600"
              />
              <KVCard
                icon={<FiHeart className="w-5 h-5 text-white" />}
                title="Giá trị"
                desc="Đổi mới, chất lượng, cộng đồng và phát triển bền vững."
                gradient="from-pink-600 to-rose-600"
              />
            </div>
          </div>
        </section>

        {/* TIMELINE */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">
                Hành trình phát triển
              </h2>
              <p className="mt-3 text-gray-600">
                Những cột mốc quan trọng của QuizSmart.
              </p>
            </div>

            <ol className="relative border-l border-gray-200">
              {milestones.map((m, i) => (
                <li key={i} className="mb-10 ml-6">
                  <span className="absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full ring-8 ring-gray-50 bg-gradient-to-br from-blue-600 to-indigo-600">
                    <FiAward className="w-3.5 h-3.5 text-white" />
                  </span>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5">
                      {m.year}
                    </span>
                    <h4 className="text-base md:text-lg font-semibold text-gray-900">{m.title}</h4>
                  </div>
                  <p className="text-gray-600">{m.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* TEAM */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">
                Đội ngũ
              </h2>
              <p className="mt-3 text-gray-600">
                Những người xây dựng nên trải nghiệm học tập tốt hơn.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teamMembers.map((m, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition overflow-hidden"
                >
                  <div className="p-8">
                    <div className="w-28 h-28 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-600 mx-auto shadow-md">
                      {m.image ? (
                        <img
                          src={m.image}
                          alt={m.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                          {getInitials(m.name)}
                        </div>
                      )}
                    </div>

                    <h5 className="mt-5 text-lg font-bold text-gray-900 text-center">
                      {m.name}
                    </h5>
                    <p className="text-blue-600 font-medium text-center">
                      {m.role}
                    </p>
                    <p className="mt-3 text-gray-600 text-sm text-center leading-relaxed">
                      {m.description}
                    </p>

                    <div className="mt-5 flex justify-center gap-3">
                      <a
                        href={`mailto:${m.email}`}
                        className="w-10 h-10 rounded-full bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition"
                        title="Email"
                      >
                        <SiGmail size={18} className="text-[#EA4335]" />
                      </a>
                      <a
                        href={m.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition"
                        title="GitHub"
                      >
                        <SiGithub size={18} className="text-[#181717]" />
                      </a>
                      <a
                        href={m.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition"
                        title="LinkedIn"
                      >
                        <SiLinkedin size={18} className="text-[#0A66C2]" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="bg-white rounded-2xl border border-gray-200 p-10 shadow-sm">
              <h3 className="text-2xl md:text-3xl font-extrabold text-gray-900">
                Đồng hành cùng QuizSmart
              </h3>
              <p className="mt-3 text-gray-600">
                Tham gia cộng đồng học tập hiệu quả ngay hôm nay.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href="mailto:npthanhnhan2003@gmail.com"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-lg text-white font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md transition"
                >
                  Liên hệ hợp tác
                </a>
                <a
                  href="https://github.com/npthanhnhan2003"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-lg font-semibold border border-gray-300 text-gray-800 hover:bg-gray-50 transition"
                >
                  Xem mã nguồn
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}



/* ----------- small presentational components ----------- */

const Stat = ({ value, label, icon }) => (
  <div className="bg-white/10 rounded-xl border border-white/20 p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-white/80 text-sm">{label}</p>
      </div>
      <div className="p-3 rounded-lg bg-white/10 border border-white/20">
        {icon}
      </div>
    </div>
  </div>
);

const KVCard = ({ icon, title, desc, gradient = "from-blue-600 to-indigo-600" }) => (
  <div className="h-full bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition">
    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center shadow-md`}>
      {icon}
    </div>
    <h4 className="mt-4 text-lg font-semibold text-gray-900">{title}</h4>
    <p className="mt-2 text-gray-600 leading-relaxed">{desc}</p>
  </div>
);

const getInitials = (fullName = "") => {
  const parts = fullName.trim().split(/\s+/);
  if (!parts.length) return "QS";
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (first + last).toUpperCase();
};

export default AboutPage;
