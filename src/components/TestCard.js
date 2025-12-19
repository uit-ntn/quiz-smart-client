import React from 'react';
import { Link } from 'react-router-dom';

const TestCard = ({ test, onStartTest, onPreviewVocabulary, viewMode, className = '', type = 'vocabulary' }) => {
  // Handle different ID field names from different APIs
  const testId = test._id || test.id || test.test_id;
  
  // Config for different test types
  const getTypeConfig = (type) => {
    const configs = {
      vocabulary: {
        gradient: 'from-slate-600 to-slate-700',
        hoverBorder: 'hover:border-slate-300',
        hoverText: 'group-hover:text-slate-600',
        icon: (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        ),
        largeIcon: (
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        ),
        badgeBg: 'bg-slate-50',
        badgeText: 'text-slate-700',
        badgeBorder: 'border-slate-200',
        buttonGradient: 'from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800',
        footerGradient: 'from-slate-50 to-gray-50',
        footerBorder: 'border-slate-100',
        route: '/vocabulary/test',
        unitLabel: 'từ vựng',
        unitLabelShort: 'từ',
        actionText: 'Bắt đầu học từ vựng',
        actionTextShort: 'Bắt đầu',
        extraInfo: '3 chế độ học'
      },
      'multiple-choice': {
        gradient: 'from-blue-500 to-indigo-600',
        hoverBorder: 'hover:border-gray-300',
        hoverText: 'group-hover:text-blue-600',
        icon: (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        ),
        largeIcon: (
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        ),
        badgeBg: 'bg-blue-50',
        badgeText: 'text-blue-700',
        badgeBorder: 'border-blue-200',
        buttonGradient: 'from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700',
        footerGradient: 'from-gray-50 to-blue-50',
        footerBorder: 'border-gray-100',
        route: '/multiple-choice/test',
        unitLabel: 'câu hỏi',
        unitLabelShort: 'câu',
        actionText: 'Bắt đầu làm bài',
        actionTextShort: 'Bắt đầu làm bài',
        extraInfo: null
      }
    };
    return configs[type] || configs.vocabulary;
  };
  
  const typeConfig = getTypeConfig(type);
  
  const getDifficultyConfig = (difficulty) => {
    const configs = {
      easy: { 
        bg: type === 'vocabulary' ? 'bg-emerald-100' : 'bg-green-100', 
        text: type === 'vocabulary' ? 'text-emerald-800' : 'text-green-800', 
        label: 'Dễ',
        icon: (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        )
      },
      medium: { 
        bg: type === 'vocabulary' ? 'bg-amber-100' : 'bg-yellow-100', 
        text: type === 'vocabulary' ? 'text-amber-800' : 'text-yellow-800', 
        label: 'Trung bình',
        icon: (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="8" cy="12" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
          </svg>
        )
      },
      hard: { 
        bg: 'bg-red-100', 
        text: 'text-red-800', 
        label: 'Khó',
        icon: (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="6" cy="12" r="1.2" />
            <circle cx="12" cy="12" r="1.2" />
            <circle cx="18" cy="12" r="1.2" />
          </svg>
        )
      }
    };
    return configs[difficulty] || configs.medium;
  };

  const difficultyConfig = getDifficultyConfig(test.difficulty);

  // List view for tests
  if (viewMode === 'list') {
    return (
      <div className={`group bg-white rounded-xl shadow-md border border-gray-200 hover:shadow-lg ${typeConfig.hoverBorder} transition-all duration-300 ${className}`}>
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              {/* Dynamic Icon */}
              <div className={`w-12 h-12 bg-gradient-to-br ${typeConfig.gradient} rounded-lg flex items-center justify-center flex-shrink-0 shadow-md`}>
                {typeConfig.icon}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className={`text-lg font-bold text-gray-800 ${typeConfig.hoverText} transition-colors`}>
                  {test.test_title}
                </h3>
                <p className="text-gray-600 text-sm line-clamp-1">
                  {test.description}
                </p>
              </div>
            </div>

            {/* Badges and Action */}
            <div className="flex items-center space-x-3">
              <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${difficultyConfig.bg} ${difficultyConfig.text}`}>
                {difficultyConfig.icon}
                <span className="ml-1">{difficultyConfig.label}</span>
              </span>
              
              <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${typeConfig.badgeBg} ${typeConfig.badgeText}`}>
                {type === 'vocabulary' ? (
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {test.total_questions} {typeConfig.unitLabelShort}
              </span>

              <div className="flex space-x-2">
                {type === 'vocabulary' && (
                  <button
                    onClick={() => onPreviewVocabulary && onPreviewVocabulary(test)}
                    className="inline-flex items-center px-3 py-2 bg-blue-100 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-200 transition-all duration-200 border border-blue-200"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Xem từ vựng
                  </button>
                )}
                <Link
                  to={`${typeConfig.route}/${testId}/settings`}
                  className={`inline-flex items-center px-4 py-2 bg-gradient-to-r ${typeConfig.buttonGradient} text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md`}
                >
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  {typeConfig.actionTextShort}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Card view (default)
  return (
    <div className={`group bg-white rounded-2xl shadow-lg border-2 border-gray-200 hover:shadow-xl ${typeConfig.hoverBorder} transition-all duration-300 hover:-translate-y-1 ${className}`}>
      <div className="p-6">
        <div className="flex items-start space-x-4">
          {/* Enhanced Dynamic Icon */}
          <div className={`w-14 h-14 bg-gradient-to-br ${typeConfig.gradient} rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg border border-${type === 'vocabulary' ? 'slate' : 'blue'}-200/50`}>
            {typeConfig.largeIcon}
          </div>

          {/* Enhanced Content */}
          <div className="flex-1 min-w-0">
            <h3 className={`text-xl font-bold text-gray-800 mb-2 ${typeConfig.hoverText} transition-colors duration-200`}>
              {test.test_title}
            </h3>
            <p className="text-gray-600 mb-4 line-clamp-2 leading-relaxed">
              {test.description}
            </p>

            {/* Enhanced Badges */}
            <div className="flex flex-wrap gap-3 mb-6">
              <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold border-2 ${difficultyConfig.bg} ${difficultyConfig.text} border-gray-200`}>
                <span className="mr-2">{difficultyConfig.icon}</span>
                {difficultyConfig.label}
              </span>
              <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold ${typeConfig.badgeBg} ${typeConfig.badgeText} border-2 ${typeConfig.badgeBorder}`}>
                {type === 'vocabulary' ? (
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {test.total_questions} {typeConfig.unitLabel}
              </span>
              {test.time_limit_minutes && (
                <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-50 text-gray-700 border-2 border-gray-200">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {test.time_limit_minutes} phút
                </span>
              )}
            </div>

            {/* Enhanced Action Buttons */}
            <div className="flex space-x-3">
              {type === 'vocabulary' && (
                <button
                  onClick={() => onPreviewVocabulary && onPreviewVocabulary(test)}
                  className="inline-flex items-center px-4 py-2.5 bg-blue-50 text-blue-700 text-sm font-medium rounded-xl hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 border border-blue-200 shadow-sm hover:shadow-md"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Xem từ vựng
                </button>
              )}
              <Link
                to={`${typeConfig.route}/${testId}/settings`}
                className={`inline-flex items-center px-6 py-3 bg-gradient-to-r ${typeConfig.buttonGradient} text-white text-sm font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${type === 'vocabulary' ? 'slate' : 'blue'}-500 transition-all duration-200 shadow-lg hover:shadow-xl border border-${type === 'vocabulary' ? 'slate' : 'blue'}-500/20`}
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                {typeConfig.actionText}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Test footer info */}
      <div className={`px-6 py-3 bg-gradient-to-r ${typeConfig.footerGradient} border-t ${typeConfig.footerBorder} rounded-b-2xl`}>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            {/* Creator Info */}
            {test.created_by && (
              <div className="flex items-center text-gray-700">
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="font-medium">{test.created_by?.full_name || test.created_by?.email || 'Admin'}</span>
              </div>
            )}
            
            {/* Visibility Badge */}
            {test.visibility && (
              <div className="flex items-center">
                {test.visibility === 'public' ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Công khai
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Riêng tư
                  </span>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center text-gray-600">
            {type === 'vocabulary' ? (
              <>
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span>{typeConfig.extraInfo}</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span>{test.main_topic} › {test.sub_topic}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestCard;

// Backward compatibility exports
export const VocabularyTestCard = (props) => <TestCard {...props} type="vocabulary" />;
export const MCPTestCard = (props) => <TestCard {...props} type="multiple-choice" />;