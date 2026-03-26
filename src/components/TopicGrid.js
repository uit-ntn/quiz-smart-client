import React from 'react';
import TestTopicCard from './TestTopicCard';

const cx = (...a) => a.filter(Boolean).join(" ");

const TopicGrid = ({ topics, onOpenModal }) => {
  if (topics.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-32 h-32 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
          <span className="text-6xl">📂</span>
        </div>
        <h3 className="text-2xl font-bold text-slate-800 mb-2">Không tìm thấy chủ đề</h3>
        <p className="text-slate-600">Thử thay đổi từ khóa tìm kiếm hoặc tạo chủ đề mới</p>
      </div>
    );
  }

  return (
    <div
      className={cx(
        "grid gap-4 items-stretch",
        "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      )}
    >
      {topics.map((topic, index) => (
        <div
          key={`${topic.type}-${topic.mainTopic}`}
          className="h-full animate-in fade-in duration-500"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <TestTopicCard
            topic={topic.mainTopic}
            mainTopic={topic.mainTopic}
            testCount={topic.testCount}
            subTopicCount={topic.subTopicCount}
            total_questions={topic.total_questions}
            type={topic.type}
            types={topic.types}
            onOpenModal={() => onOpenModal(topic.mainTopic, topic.type)}
            views={topic.views}
            avatar_url={topic.avatar_url}
            active={topic.active}
            total_tests={topic.total_tests}
            vocabulary_tests={topic.vocabulary_tests}
            multiple_choice_tests={topic.multiple_choice_tests}
            grammar_tests={topic.grammar_tests}
            topic_views={topic.topic_views}
            subtopic_views={topic.subtopic_views}
            total_views={topic.total_views}
          />
        </div>
      ))}
    </div>
  );
};

export default TopicGrid;