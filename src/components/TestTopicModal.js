import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import testService from '../services/testService';

// Chuẩn hoá nhiều kiểu trả về -> mảng string
const normalizeToSubTopicArray = (raw) => {
  if (!raw) return [];
  // Nếu là mảng thuần
  if (Array.isArray(raw)) {
    // Nếu phần tử là object (e.g. { name: 'VPC' } hoặc { sub_topic: 'VPC' })
    if (raw.length && typeof raw[0] === 'object') {
      return raw
        .map((x) => x?.name ?? x?.sub_topic ?? x?.title ?? x?.label ?? '')
        .filter(Boolean);
    }
    return raw; // mảng string
  }
  // Nếu API trả { data: [...] } / { items: [...] }
  const arr =
    (Array.isArray(raw.data) && raw.data) ||
    (Array.isArray(raw.items) && raw.items) ||
    [];
  return arr.map((x) => (typeof x === 'string' ? x : x?.name ?? x?.sub_topic ?? '')).filter(Boolean);
};

// Simplified modal - no complex color system needed

const TopicModal = ({ isOpen, onClose, mainTopic, type = 'vocabulary' }) => {
  const [subTopics, setSubTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen && mainTopic) {
      fetchSubTopics();
      // Reset search when modal opens
      setSearchTerm('');
    }
  }, [isOpen, mainTopic, type]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const fetchSubTopics = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('TopicModal: Fetching sub topics for:', mainTopic, 'type:', type);
      
      const res = type === 'vocabulary' 
        ? await testService.getVocabularySubTopicsByMainTopic(mainTopic)
        : await testService.getMultipleChoiceSubTopicsByMainTopic(mainTopic);
      
      console.log('TopicModal: Sub topics response:', res);
      const normalized = normalizeToSubTopicArray(res);
      console.log('TopicModal: Normalized sub topics:', normalized);
      setSubTopics(normalized);
    } catch (e) {
      console.error('TopicModal: Error fetching sub topics:', e);
      setError('Không thể tải danh sách chủ đề con.');
    } finally {
      setLoading(false);
    }
  };

  // Filter subtopics based on search term
  const filteredSubTopics = subTopics.filter(subTopic => 
    subTopic.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Config for different types
  const getTypeConfig = (type) => {
    const configs = {
      vocabulary: {
        gradient: 'from-slate-600 to-slate-700',
        icon: (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        ),
        baseRoute: '/vocabulary/tests',
        focusColor: 'focus:ring-slate-500 focus:border-slate-500',
        itemIcon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        )
      },
      'multiple-choice': {
        gradient: 'from-blue-500 to-indigo-600',
        icon: (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        ),
        baseRoute: '/multiple-choice/tests',
        focusColor: 'focus:ring-blue-500 focus:border-blue-500',
        itemIcon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        )
      }
    };
    return configs[type] || configs.vocabulary;
  };

  const typeConfig = getTypeConfig(type);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal - Centered */}
      <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl pointer-events-auto">
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">{mainTopic}</h2>
                <p className="mt-1 text-sm text-gray-500">Chọn chủ đề con để bắt đầu</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {!loading && !error && subTopics.length > 0 && (
              <div className="mt-2 text-xs text-gray-400">
                {subTopics.length} chủ đề có sẵn
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Search Box */}
            {!loading && !error && subTopics.length > 0 && (
              <div className="mb-6">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Tìm kiếm chủ đề..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-white text-sm placeholder-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-colors"
                  />
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-3 text-sm text-gray-600">Đang tải...</span>
              </div>
            ) : error ? (
              <div className="text-center py-16">
                <div className="text-red-500 mb-3">
                  <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">Có lỗi xảy ra</h3>
                <p className="text-sm text-gray-500 mb-4">{error}</p>
                <button
                  onClick={fetchSubTopics}
                  className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Thử lại
                </button>
              </div>
            ) : filteredSubTopics.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-gray-400 mb-3">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">
                  {searchTerm ? 'Không tìm thấy kết quả' : 'Chưa có chủ đề con nào'}
                </h3>
                <p className="text-sm text-gray-500">
                  {searchTerm ? `Không có chủ đề nào khớp với "${searchTerm}"` : 'Chưa có dữ liệu để hiển thị'}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="mt-3 text-sm text-gray-900 hover:text-gray-700 font-medium"
                  >
                    Xóa tìm kiếm
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredSubTopics.map((subTopic) => (
                  <Link
                    key={subTopic}
                    to={`${typeConfig.baseRoute}/${encodeURIComponent(mainTopic)}/${encodeURIComponent(subTopic)}`}
                    onClick={onClose}
                    className="group block p-4 rounded-xl border border-gray-200 bg-white hover:border-gray-900 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900 group-hover:text-gray-900">
                          {subTopic}
                        </h3>
                      </div>
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopicModal;

// Backward compatibility exports
export const VocabularyTopicModal = (props) => <TopicModal {...props} type="vocabulary" />;
export const MCPTopicModal = (props) => <TopicModal {...props} type="multiple-choice" />;