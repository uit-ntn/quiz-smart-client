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

const COLORS = ['blue', 'emerald', 'indigo', 'orange'];

const getColorClasses = (color) => {
  const colorMap = {
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      hover: 'hover:bg-blue-100',
      icon: 'text-blue-600'
    },
    emerald: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200', 
      text: 'text-emerald-700',
      hover: 'hover:bg-emerald-100',
      icon: 'text-emerald-600'
    },
    indigo: {
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      text: 'text-indigo-700', 
      hover: 'hover:bg-indigo-100',
      icon: 'text-indigo-600'
    },
    orange: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-700',
      hover: 'hover:bg-orange-100', 
      icon: 'text-orange-600'
    }
  };
  return colorMap[color] || colorMap.blue;
};

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
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal - Centered */}
      <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl transform transition-all animate-in slide-in-from-bottom-4 duration-300 pointer-events-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${typeConfig.gradient} flex items-center justify-center mr-3`}>
                {typeConfig.icon}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{mainTopic}</h2>
                <p className="text-sm text-gray-600">Chọn chủ đề con để bắt đầu ({subTopics.length} chủ đề)</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Search Box */}
            {!loading && !error && subTopics.length > 0 && (
              <div className="mb-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Tìm kiếm chủ đề con..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`block w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 placeholder-gray-500 focus:outline-none focus:ring-2 ${typeConfig.focusColor} transition-all duration-200`}
                  />
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-3 text-gray-600">Đang tải...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-gray-600 mb-4">{error}</p>
                <button
                  onClick={fetchSubTopics}
                  className={`px-4 py-2 ${type === 'vocabulary' ? 'bg-slate-600 hover:bg-slate-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-lg transition-colors`}
                >
                  Thử lại
                </button>
              </div>
            ) : filteredSubTopics.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <p className="text-gray-600">
                  {searchTerm ? `Không tìm thấy "${searchTerm}"` : 'Chưa có chủ đề con nào'}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className={`mt-2 ${type === 'vocabulary' ? 'text-slate-600 hover:text-slate-700' : 'text-blue-600 hover:text-blue-700'} text-sm`}
                  >
                    Xóa tìm kiếm
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                {filteredSubTopics.map((subTopic, index) => {
                  const color = COLORS[index % COLORS.length];
                  const colorClasses = getColorClasses(color);
                  
                  return (
                    <Link
                      key={subTopic}
                      to={`${typeConfig.baseRoute}/${encodeURIComponent(mainTopic)}/${encodeURIComponent(subTopic)}`}
                      onClick={onClose}
                      className={`
                        group p-4 rounded-xl border-2 ${colorClasses.border} ${colorClasses.bg} 
                        ${colorClasses.hover} transition-all duration-200 hover:scale-105 hover:shadow-md
                      `}
                    >
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-lg bg-white flex items-center justify-center mr-3 shadow-sm`}>
                          <div className={`${colorClasses.icon}`}>
                            {typeConfig.itemIcon}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-semibold ${colorClasses.text} group-hover:text-gray-800 transition-colors`}>
                            {subTopic}
                          </h3>
                        </div>
                        <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors ml-2" 
                             fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>
                  );
                })}
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