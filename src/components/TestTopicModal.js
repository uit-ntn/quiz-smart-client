import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import testService from '../services/testService';
import topicService from '../services/topicService';

// Chuẩn hoá nhiều kiểu trả về -> mảng objects với { subTopic, total_tests, total_questions }
const normalizeToSubTopicArray = (raw) => {
  if (!raw) return [];
  // Nếu là mảng thuần
  if (Array.isArray(raw)) {
    // Nếu phần tử là object (e.g. { sub_topic: 'VPC', total_tests: 5 })
    if (raw.length && typeof raw[0] === 'object') {
      return raw
        .map((x) => {
          const subTopic = x?.subTopic ?? x?.sub_topic ?? x?.name ?? x?.title ?? x?.label ?? '';
          if (!subTopic) return null;
          return {
            subTopic,
            total_tests: x?.total_tests ?? x?.totalTests ?? 0,
            total_questions: x?.total_questions ?? x?.totalQuestions ?? 0
          };
        })
        .filter(Boolean);
    }
    // Nếu là mảng string, convert thành object
    return raw.map(subTopic => ({
      subTopic,
      total_tests: 0,
      total_questions: 0
    }));
  }
  // Nếu API trả { data: [...] } / { items: [...] }
  const arr =
    (Array.isArray(raw.data) && raw.data) ||
    (Array.isArray(raw.items) && raw.items) ||
    [];
  return arr.map((x) => {
    if (typeof x === 'string') {
      return { subTopic: x, total_tests: 0, total_questions: 0 };
    }
    const subTopic = x?.subTopic ?? x?.sub_topic ?? x?.name ?? x?.title ?? x?.label ?? '';
    if (!subTopic) return null;
    return {
      subTopic,
      total_tests: x?.total_tests ?? x?.totalTests ?? 0,
      total_questions: x?.total_questions ?? x?.totalQuestions ?? 0
    };
  }).filter(Boolean);
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
      
      // ✅ Use topicService to get subtopics with comprehensive stats
      const subtopics = await topicService.getSubTopicsByMainTopic(mainTopic);
      
      console.log('TopicModal: Subtopics with stats:', subtopics);
      
      // Transform to expected format for the component
      const transformedSubtopics = subtopics.map(subtopic => ({
        subTopic: subtopic.name,
        subtopic_id: subtopic.subtopic_id,
        // Use test counts based on current type or show total
        total_tests: type === 'vocabulary' 
          ? subtopic.vocabulary_tests 
          : type === 'multiple-choice' 
            ? subtopic.multiple_choice_tests 
            : subtopic.total_tests,
        total_questions: type === 'vocabulary' 
          ? subtopic.vocabulary_questions 
          : type === 'multiple-choice' 
            ? subtopic.multiple_choice_questions 
            : subtopic.total_questions,
        views: subtopic.views || 0,
        active: subtopic.active !== undefined ? subtopic.active : true,
        main_topic: subtopic.main_topic || mainTopic,
        // Include all test type counts for display
        vocabulary_tests: subtopic.vocabulary_tests || 0,
        multiple_choice_tests: subtopic.multiple_choice_tests || 0,
        grammar_tests: subtopic.grammar_tests || 0
      })).filter(subtopic => subtopic.active !== false);
      
      console.log('TopicModal: Transformed subtopics:', transformedSubtopics);
      setSubTopics(transformedSubtopics);
    } catch (e) {
      console.error('TopicModal: Error fetching sub topics:', e);
      setError('Không thể tải danh sách chủ đề con.');
    } finally {
      setLoading(false);
    }
  };

  // Filter subtopics based on search term
  const filteredSubTopics = subTopics.filter(item => {
    const subTopic = typeof item === 'string' ? item : item.subTopic;
    return subTopic.toLowerCase().includes(searchTerm.toLowerCase());
  });

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
        baseRoute: '/test',
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
        baseRoute: '/test',
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

  const isVocab = type === 'vocabulary';
  const headerGradient = isVocab
    ? 'bg-gradient-to-r from-indigo-600 to-violet-700'
    : 'bg-gradient-to-r from-sky-600 to-indigo-700';
  const borderColor = isVocab ? 'border-indigo-400' : 'border-sky-400';
  const accentRing = isVocab ? 'ring-indigo-200' : 'ring-sky-200';

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div className={`relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border-[3px] ${borderColor} ring-2 ${accentRing} pointer-events-auto overflow-hidden`}>

          {/* Header */}
          <div className={`${headerGradient} px-5 py-4`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold text-white leading-tight">{mainTopic}</h2>
                <p className="mt-1 text-sm text-white/80 font-medium">Chọn chủ đề con để bắt đầu</p>
                {!loading && !error && subTopics.length > 0 && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full border-2 border-white/40 bg-white/20 px-2.5 py-0.5 text-[11px] font-bold text-white">
                      📚 {subTopics.length} chủ đề có sẵn
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className="shrink-0 w-8 h-8 rounded-xl bg-white/20 border-2 border-white/40 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-5">
            {/* Search Box */}
            {!loading && !error && subTopics.length > 0 && (
              <div className="mb-4">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Tìm kiếm chủ đề..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border-2 border-indigo-300 rounded-xl bg-white text-sm placeholder-indigo-300 text-slate-800 font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors"
                  />
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-14">
                <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                <span className="ml-3 text-sm text-indigo-700 font-bold">Đang tải...</span>
              </div>
            ) : error ? (
              <div className="text-center py-14">
                <div className="w-16 h-16 rounded-2xl bg-rose-100 border-2 border-rose-300 flex items-center justify-center mx-auto mb-3 text-3xl">⚠️</div>
                <h3 className="text-sm font-extrabold text-slate-800 mb-1">Có lỗi xảy ra</h3>
                <p className="text-xs text-slate-500 mb-4">{error}</p>
                <button
                  onClick={fetchSubTopics}
                  className="px-4 py-2 bg-indigo-600 border-[3px] border-indigo-800 text-white text-sm font-extrabold rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  Thử lại
                </button>
              </div>
            ) : filteredSubTopics.length === 0 ? (
              <div className="text-center py-14">
                <div className="w-16 h-16 rounded-2xl bg-sky-100 border-2 border-sky-300 flex items-center justify-center mx-auto mb-3 text-3xl">📂</div>
                <h3 className="text-sm font-extrabold text-slate-800 mb-1">
                  {searchTerm ? 'Không tìm thấy kết quả' : 'Chưa có chủ đề con nào'}
                </h3>
                <p className="text-xs text-slate-500">
                  {searchTerm ? `Không có chủ đề nào khớp với "${searchTerm}"` : 'Chưa có dữ liệu để hiển thị'}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="mt-3 text-xs text-indigo-700 hover:text-indigo-900 font-extrabold border-b border-indigo-400"
                  >
                    Xóa tìm kiếm
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {filteredSubTopics.map((item) => {
                  const subTopic = typeof item === 'string' ? item : item.subTopic;
                  const totalTests = typeof item === 'object' ? (item.total_tests || 0) : 0;
                  const totalQuestions = typeof item === 'object' ? (item.total_questions || 0) : 0;
                  const views = typeof item === 'object' ? (item.views || 0) : 0;

                  const handleSubTopicClick = async () => {
                    try {
                      const subtopicIdentifier = typeof item === 'object' && item.subtopic_id
                        ? item.subtopic_id
                        : subTopic;
                      await topicService.incrementSubTopicViews(mainTopic, subtopicIdentifier, type);
                    } catch (error) {
                      console.error("Failed to increment subtopic views:", error);
                    }
                    onClose();
                  };

                  return (
                    <Link
                      key={subTopic}
                      to={`${typeConfig.baseRoute}/${encodeURIComponent(mainTopic)}/${encodeURIComponent(subTopic)}`}
                      onClick={handleSubTopicClick}
                      className="group block p-3.5 rounded-xl border-2 border-indigo-200 bg-white hover:border-indigo-500 hover:bg-indigo-50 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-extrabold text-slate-900 group-hover:text-indigo-800 mb-1.5 text-sm">
                            {subTopic}
                          </h3>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 rounded-full border-2 border-sky-300 bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                              📋 {totalTests} bài test
                            </span>
                            {totalQuestions > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full border-2 border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                ❓ {totalQuestions} câu hỏi
                              </span>
                            )}
                            {views > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full border-2 border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                👁 {views.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <svg className="w-4 h-4 text-indigo-400 group-hover:text-indigo-600 transition-colors shrink-0 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
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