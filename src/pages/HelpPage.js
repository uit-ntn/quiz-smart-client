import React from 'react';
import { Link } from 'react-router-dom';
import TestLayout from '../layout/TestLayout';

const HelpPage = () => {
  return (
    <TestLayout
      title="Hướng dẫn sử dụng"
      description="Tìm hiểu cách sử dụng Quiz Smart"
    >
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Giới thiệu */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Chào mừng đến với Quiz Smart</h2>
          <p className="text-slate-600 leading-relaxed">
            Quiz Smart là nền tảng học tập trực tuyến giúp bạn tạo và thực hiện các bài kiểm tra từ vựng và trắc nghiệm một cách dễ dàng.
            Với công nghệ AI tiên tiến, bạn có thể tạo bài test từ vựng chỉ trong vài phút.
          </p>
        </div>

        {/* Các tính năng chính */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Tính năng chính</h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Tạo bài test từ vựng */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-900">📚 Tạo bài test từ vựng</h3>
              <ul className="text-sm text-slate-600 space-y-2">
                <li>• <strong>Tự tạo:</strong> Nhập danh sách từ vựng theo định dạng "từ:nghĩa:câu ví dụ"</li>
                <li>• <strong>AI tạo:</strong> Mô tả chủ đề và để AI tạo từ vựng tự động</li>
                <li>• <strong>Chỉnh sửa:</strong> Thêm, sửa, xóa từ vựng trước khi tạo bài test</li>
              </ul>
            </div>

            {/* Tạo bài test trắc nghiệm */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-900">📝 Tạo bài test trắc nghiệm</h3>
              <ul className="text-sm text-slate-600 space-y-2">
                <li>• Nhập câu hỏi theo định dạng có cấu trúc</li>
                <li>• Hỗ trợ đa đáp án đúng</li>
                <li>• Thêm giải thích cho từng đáp án</li>
              </ul>
            </div>

            {/* Làm bài test */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-900">🎯 Làm bài test</h3>
              <ul className="text-sm text-slate-600 space-y-2">
                <li>• Chế độ làm bài với thời gian giới hạn</li>
                <li>• Hiển thị tiến độ và thời gian còn lại</li>
                <li>• Lưu tiến độ tự động</li>
              </ul>
            </div>

            {/* Xem kết quả */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-900">📊 Xem kết quả</h3>
              <ul className="text-sm text-slate-600 space-y-2">
                <li>• Chi tiết điểm số và phân tích</li>
                <li>• Xem lại câu trả lời đúng/sai</li>
                <li>• Nghe phát âm từ vựng</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Hướng dẫn chi tiết */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Hướng dẫn chi tiết</h2>

          <div className="space-y-6">
            {/* Bước 1: Đăng ký */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">1. Đăng ký tài khoản</h3>
              <p className="text-slate-600 mb-3">
                Tạo tài khoản miễn phí để bắt đầu sử dụng tất cả tính năng của Quiz Smart.
              </p>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-700">
                  <strong>Đăng ký:</strong> Truy cập <Link to="/register" className="text-blue-600 hover:underline">trang đăng ký</Link> và điền thông tin cần thiết.
                </p>
              </div>
            </div>

            {/* Bước 2: Tạo bài test */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">2. Tạo bài test</h3>
              <p className="text-slate-600 mb-3">
                Chọn loại bài test bạn muốn tạo và làm theo hướng dẫn từng bước.
              </p>
              <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                <p className="text-sm text-slate-700">
                  <strong>Từ vựng:</strong> Đến <Link to="/topics" className="text-blue-600 hover:underline">Danh sách chủ đề</Link> và chọn "Tạo với AI" hoặc "Tự tạo bài test".
                </p>
                <p className="text-sm text-slate-700">
                  <strong>Trắc nghiệm:</strong> Đến <Link to="/topics" className="text-blue-600 hover:underline">Danh sách chủ đề</Link> và chọn "Tạo Multiple Choice".
                </p>
              </div>
            </div>

            {/* Bước 3: Làm bài test */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">3. Làm bài test</h3>
              <p className="text-slate-600 mb-3">
                Sau khi tạo bài test, bạn có thể bắt đầu làm ngay hoặc chia sẻ với người khác.
              </p>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-700">
                  Nhấp vào "Làm bài test ngay" sau khi tạo xong, hoặc truy cập link chia sẻ để bắt đầu.
                </p>
              </div>
            </div>

            {/* Bước 4: Xem kết quả */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">4. Xem kết quả</h3>
              <p className="text-slate-600 mb-3">
                Sau khi hoàn thành bài test, bạn sẽ thấy kết quả chi tiết và phân tích.
              </p>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-700">
                  Xem điểm số, câu trả lời đúng/sai, và nghe phát âm từ vựng (đối với bài test từ vựng).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Định dạng dữ liệu */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Định dạng dữ liệu</h2>

          <div className="space-y-6">
            {/* Từ vựng */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">📚 Định dạng từ vựng</h3>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-700 mb-3">
                  Mỗi dòng một từ vựng, theo cấu trúc:
                </p>
                <code className="block bg-slate-800 text-slate-100 p-3 rounded text-sm font-mono">
                  từ_vựng:nghĩa_của_từ:câu_ví_dụ
                </code>
                <p className="text-sm text-slate-700 mt-3">
                  <strong>Ví dụ:</strong>
                </p>
                <code className="block bg-slate-800 text-slate-100 p-3 rounded text-sm font-mono">
                  schedule:lịch trình:Please check your schedule before the meeting.
                </code>
              </div>
            </div>

            {/* Trắc nghiệm */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">📝 Định dạng trắc nghiệm</h3>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-700 mb-3">
                  Mỗi câu hỏi là một đoạn, các đoạn cách nhau bằng dòng trắng:
                </p>
                <code className="block bg-slate-800 text-slate-100 p-3 rounded text-sm font-mono whitespace-pre">
{`Câu hỏi của bạn?
Đáp án A: Giải thích cho đáp án A
Đáp án B: Giải thích cho đáp án B
Đáp án C: Giải thích cho đáp án C
A`}
                </code>
                <p className="text-sm text-slate-700 mt-3">
                  <strong>Lưu ý:</strong> Có thể có nhiều đáp án đúng (A B C), và giải thích là tùy chọn.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Liên hệ hỗ trợ */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Cần hỗ trợ?</h2>
          <p className="text-slate-600 mb-4">
            Nếu bạn gặp vấn đề hoặc có câu hỏi, hãy liên hệ với chúng tôi.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/profile"
              className="inline-flex items-center px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition"
            >
              📧 Liên hệ hỗ trợ
            </Link>
            <Link
              to="/topics"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
            >
              🚀 Bắt đầu ngay
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-8">
          <p className="text-slate-500 text-sm">
            Cảm ơn bạn đã sử dụng Quiz Smart! 🎉
          </p>
        </div>
      </div>
    </TestLayout>
  );
};

export default HelpPage;