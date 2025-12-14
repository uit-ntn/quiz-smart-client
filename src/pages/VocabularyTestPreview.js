import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VocabularyLayout from '../layout/VocabularyLayout';
import vocabularyService from '../services/vocabularyService';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const VocabularyTestPreview = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const fetchVocabularies = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await vocabularyService.getAllVocabulariesByTestId(testId);

        if (!data || !Array.isArray(data) || data.length === 0) {
          setError(`Không tìm thấy từ vựng nào cho bài test ${testId}.`);
          return;
        }

        setItems(data);
      } catch (e) {
        console.error('Error fetching vocabularies:', e);
        setError(`Có lỗi xảy ra khi tải từ vựng: ${e.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (testId) {
      fetchVocabularies();
    } else {
      setError('Test ID không hợp lệ');
      setLoading(false);
    }
  }, [testId]);

  const playAudio = (text, isExample = false) => {
    if (isPlaying) return;

    setIsPlaying(true);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;

    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
  };

  if (loading) return <LoadingSpinner message="Đang tải danh sách từ vựng..." />;
  if (error) return <ErrorMessage error={error} onRetry={() => window.location.reload()} />;

  return (
    <VocabularyLayout
      title="Danh sách từ vựng"
      description="Xem qua tất cả từ vựng trong bài kiểm tra"
      maxWidth="7xl"
    >
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Danh sách từ vựng</h1>
              <p className="text-gray-600">
                Tổng cộng <span className="font-semibold text-slate-600">{items.length}</span> từ vựng
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => navigate(-1)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Quay lại
              </button>
              <button
                onClick={() => navigate(`/vocabulary/test/${testId}/settings`)}
                className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
              >
                Bắt đầu kiểm tra
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  STT
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                  Từ vựng
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                  Nghĩa
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Câu mẫu
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {idx + 1}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex-1">
                        <div className="text-lg font-bold text-gray-900">{item.word}</div>
                      </div>
                      <button
                        onClick={() => playAudio(item.word)}
                        disabled={isPlaying}
                        className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50 flex-shrink-0"
                        title="Nghe phát âm"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.797l-4.146-3.32a1 1 0 00-.632-.227H2a1 1 0 01-1-1V7a1 1 0 011-1h1.605a1 1 0 00.632-.227l4.146-3.32a1 1 0 011.6.623zM14 7a3 3 0 013 3v0a3 3 0 01-3 3" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{item.meaning}</div>
                  </td>
                  <td className="px-6 py-4">
                    {item.example_sentence ? (
                      <div className="flex items-start space-x-3">
                        <div className="flex-1">
                          <p className="text-sm text-gray-700 italic">"{item.example_sentence}"</p>
                        </div>
                        <button
                          onClick={() => playAudio(item.example_sentence, true)}
                          disabled={isPlaying}
                          className="p-1.5 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors disabled:opacity-50 flex-shrink-0"
                          title="Nghe câu mẫu"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.797l-4.146-3.32a1 1 0 00-.632-.227H2a1 1 0 01-1-1V7a1 1 0 011-1h1.605a1 1 0 00.632-.227l4.146-3.32a1 1 0 011.6.623zM14 7a3 3 0 013 3v0a3 3 0 01-3 3" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400 italic">Không có câu mẫu</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </VocabularyLayout>
  );
};

export default VocabularyTestPreview;