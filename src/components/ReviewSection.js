import React, { useEffect, useMemo, useState, useRef } from "react";
import { Link } from "react-router-dom";

import { Picker } from "emoji-mart";

const cx = (...a) => a.filter(Boolean).join(" ");

const MAX_STARS = 5;

// Jokes cho mỗi mức rating
const JOKES_3_STARS = [
  "😄 Hey! Nếu bạn cho 4-5 sao, Nhân sẽ mua bạn một ly trà sữa! (Không đùa đâu... Nhân nghĩ vậy thôi 😅)",
  "🍵 Nếu bạn nâng lên 4-5 sao, Nhân sẽ mời bạn uống trà đá (có thể cả trà sữa nữa!) 🥤",
  "⭐ Còn 1-2 sao nữa là bạn sẽ làm Nhân vui nhất trên đời này! Đi mà! 😊",
  "🎁 4-5 sao = Nhân sẽ cảm ơn bạn bằng cả trái tim! (Và có thể là cả cái bụng nữa 🐷)",
  "💝 Bạn có biết không? Nếu bạn cho 4-5 sao, Nhân sẽ nhảy cẫng lên vì vui đó! 🕺",
  "🚀 Nâng lên 4-5 sao đi! Nhân sẽ làm ứng dụng tốt hơn nữa chỉ để cảm ơn bạn!",
  "🌟 Bạn là người tuyệt vời nhất! Chỉ cần thêm 1-2 sao nữa thôi mà! 💕",
  "🍰 Nếu bạn cho 4-5 sao, Nhân sẽ... sẽ... sẽ rất vui và cảm ơn bạn rất nhiều! 🎉",
  "💌 Nhân biết bạn muốn cho điểm cao hơn đúng không? Đi mà, đừng ngại! 😉",
  "🎈 Thêm 1-2 sao nữa thôi là bạn sẽ thấy Nhân vui nhất trên đời! Đáng lắm mà! 🎊"
];

const JOKES_4_STARS = [
  "🎉 Tuyệt vời! Còn 1 sao nữa là đạt mục tiêu 5 sao rồi! Biết đâu bạn sẽ là người may mắn được Nhân cảm ơn đầu tiên? 🍀",
  "🌟 Bạn đã cho 4 sao rồi! Thêm 1 sao nữa thôi là hoàn hảo! Nhân sẽ rất biết ơn bạn! 💝",
  "⚡ Gần đạt rồi! Chỉ còn 1 sao nữa là 5 sao! Bạn có muốn thấy Nhân nhảy múa vì vui không? 🕺💃",
  "🎁 4 sao đã tốt rồi! Nhưng 5 sao sẽ làm Nhân vui nhất! Bạn có muốn làm điều đó không? 😊",
  "💫 Wow! Bạn đã cho 4 sao! Thêm 1 sao nữa là bạn sẽ làm Nhân hạnh phúc nhất trên đời! 🌈",
  "🍀 Bạn đã gần đạt mục tiêu rồi! Chỉ còn 1 sao nữa là 5 sao! Đi mà! 🎯",
  "🎊 Tuyệt vời! 4 sao rồi! Thêm 1 sao nữa là bạn sẽ là người làm Nhân vui nhất! 💕",
  "⭐ Bạn đã cho 4 sao rồi! Chỉ còn 1 bước nữa là hoàn hảo! Nhân sẽ cảm ơn bạn rất nhiều! 🙏",
  "🚀 Gần xong rồi! Chỉ còn 1 sao nữa là 5 sao! Bạn có muốn xem Nhân vui như thế nào không? 😄",
  "💎 4 sao đã xuất sắc! Nhưng 5 sao sẽ là tuyệt vời nhất! Bạn có muốn thử không? ✨"
];

const JOKES_5_STARS = [
  "🌟 Bạn là người tuyệt vời nhất! 5 sao đây rồi! Nhân sẽ nhảy cẫng lên vì vui đó! 💃🕺",
  "🎉 WOW! 5 sao rồi! Nhân sẽ cảm ơn bạn bằng cả trái tim và cả cái bụng nữa! 🐷💝",
  "🏆 Hoàn hảo! 5 sao! Bạn đã làm Nhân hạnh phúc nhất trên đời này! Cảm ơn bạn rất nhiều! 🙏",
  "✨ Bạn là ngôi sao sáng nhất! 5 sao! Nhân sẽ mãi mãi biết ơn bạn! 🌟💕",
  "🎊 TUYỆT VỜI! 5 sao đây rồi! Nhân sẽ làm ứng dụng tốt hơn nữa để xứng đáng với đánh giá của bạn! 🚀",
  "💎 Perfect! 5 sao! Bạn đã làm Nhân vui đến mức nhảy múa! 🕺💃 Cảm ơn bạn!",
  "🌈 Wow! 5 sao rồi! Nhân sẽ nhớ bạn mãi mãi! Bạn là người tuyệt vời nhất! 💖",
  "🎁 Hoàn hảo! 5 sao! Nhân sẽ cảm ơn bạn bằng tất cả những gì có thể! 🎉🙏",
  "⭐ Tuyệt vời nhất! 5 sao! Nhân sẽ làm ứng dụng tốt hơn nữa chỉ vì bạn! Cảm ơn! 🚀💝",
  "🔥 Perfect! 5 sao! Bạn đã làm Nhân vui nhất trên đời! Nhân sẽ mãi mãi biết ơn! 💕🌟"
];

// Jokes nhắc nhở điền bình luận - kiếm kiếp xíu
const COMMENT_REMINDER_JOKES = [
  "💬 Psst! Bạn có muốn để lại bình luận không? Nhân sẽ đọc từng chữ một đó! 👀",
  "✍️ Hey! Viết vài dòng cho Nhân biết ý kiến của bạn đi! Nhân sẽ cảm ơn bạn bằng cả trái tim! 💝",
  "📝 Bạn có thể chia sẻ suy nghĩ của mình không? Nhân sẽ rất vui khi đọc bình luận của bạn! 😊",
  "💭 Muốn nói gì về ứng dụng không? Nhân đang chờ đợi bình luận của bạn đó! ⏰",
  "🎤 Lên tiếng đi! Bình luận của bạn rất quan trọng với Nhân! Nhân sẽ lắng nghe! 👂",
  "💌 Viết gì đó cho Nhân đi! Dù chỉ là 'Ứng dụng tốt' cũng làm Nhân vui rồi! 🥰",
  "📮 Nhân đang chờ bình luận của bạn! Đừng để Nhân chờ lâu nhé! ⏳",
  "🖊️ Bạn có muốn chia sẻ cảm nghĩ không? Nhân sẽ đọc kỹ từng chữ một! 🔍",
  "💬 Để lại bình luận đi! Nhân sẽ cảm ơn bạn bằng một cái like ảo trong tim! ❤️",
  "📝 Hey! Viết gì đó đi! Dù chỉ 1 câu thôi cũng làm Nhân vui lắm đó! 😄"
];

// Jokes dựa trên số từ trong comment - kiếm kiếp xíu
// < 3 từ: 10 câu joke
const JOKES_LESS_THAN_3_WORDS = [
  "😅 Hey! Viết thêm chút nữa đi! Nhân muốn biết bạn nghĩ gì mà! 💭",
  "📝 Bạn có thể viết dài hơn một chút không? Nhân sẽ đọc kỹ lắm đó! 👀",
  "💬 Viết thêm vài từ nữa đi! Nhân muốn hiểu rõ hơn về suy nghĩ của bạn! 🤔",
  "✍️ Hey! Thêm chút nữa thôi! Nhân sẽ cảm ơn bạn bằng cả trái tim! 💝",
  "🎤 Lên tiếng thêm chút nữa đi! Bình luận của bạn rất quan trọng với Nhân! 👂",
  "💌 Viết dài hơn một chút nữa đi! Nhân sẽ đọc từng chữ một! 🔍",
  "📮 Thêm vài từ nữa thôi! Nhân đang chờ đợi bình luận chi tiết hơn! ⏰",
  "🖊️ Bạn có thể chia sẻ thêm không? Nhân muốn biết bạn nghĩ gì! 💭",
  "💬 Viết thêm chút nữa đi! Nhân sẽ rất vui khi đọc bình luận dài hơn! 😊",
  "📝 Hey! Thêm vài từ nữa thôi! Nhân sẽ cảm ơn bạn rất nhiều! 🙏"
];

// 3 <= từ < 5: 10 câu joke
const JOKES_3_TO_4_WORDS = [
  "😊 Tốt lắm! Nhưng bạn có thể viết thêm một chút nữa không? Nhân muốn biết chi tiết hơn! 💭",
  "👍 Gần đạt rồi! Thêm vài từ nữa là hoàn hảo! Nhân sẽ rất vui! 🎉",
  "💡 Bạn đã viết khá rồi! Nhưng viết thêm chút nữa sẽ tốt hơn! Nhân sẽ đọc kỹ lắm! 👀",
  "⭐ Tốt! Nhưng bạn có thể chia sẻ thêm không? Nhân muốn hiểu rõ hơn! 🤔",
  "🎯 Gần xong rồi! Thêm vài từ nữa là bạn sẽ làm Nhân vui nhất! 💝",
  "💬 Bạn đã viết hay rồi! Nhưng viết thêm chút nữa sẽ tuyệt vời hơn! 🌟",
  "📝 Tốt lắm! Nhưng bạn có thể mở rộng thêm không? Nhân sẽ cảm ơn bạn! 🙏",
  "😄 Gần đạt rồi! Thêm một chút nữa là hoàn hảo! Nhân sẽ rất biết ơn! 💕",
  "💭 Bạn đã viết khá rồi! Nhưng viết thêm sẽ làm Nhân vui hơn! 🎊",
  "🎁 Tốt! Nhưng bạn có thể chia sẻ chi tiết hơn không? Nhân sẽ đọc kỹ! 🔍"
];

// 5 <= từ < 7: 10 câu joke
const JOKES_5_TO_6_WORDS = [
  "🎉 Tuyệt vời! Bạn đã viết khá dài rồi! Nhưng thêm chút nữa sẽ hoàn hảo! 💝",
  "🌟 Wow! Bình luận của bạn đã hay rồi! Thêm vài từ nữa là xuất sắc! ⭐",
  "💎 Gần hoàn hảo rồi! Thêm một chút nữa là bạn sẽ làm Nhân vui nhất! 🎊",
  "🔥 Tốt lắm! Bạn đã viết khá chi tiết! Nhưng viết thêm sẽ tuyệt vời hơn! ✨",
  "💫 Bình luận của bạn đã hay! Thêm vài từ nữa là hoàn hảo! Nhân sẽ cảm ơn! 🙏",
  "🎯 Gần đạt rồi! Thêm chút nữa là bạn sẽ làm Nhân hạnh phúc nhất! 💕",
  "⭐ Tuyệt vời! Bạn đã viết khá rồi! Nhưng thêm một chút nữa sẽ tốt hơn! 🌈",
  "💝 Wow! Bình luận của bạn đã tốt! Thêm vài từ nữa là xuất sắc! 🎉",
  "🎁 Gần xong rồi! Thêm một chút nữa là hoàn hảo! Nhân sẽ rất vui! 😊",
  "🌟 Tốt lắm! Bạn đã viết khá chi tiết! Nhưng viết thêm sẽ tuyệt vời! 🚀"
];

// 7 từ trở lên: 10 câu joke
const JOKES_7_PLUS_WORDS = [
  "🎉 WOW! Bình luận của bạn quá tuyệt vời! Nhân sẽ đọc kỹ từng chữ một! 👀💝",
  "🌟 Hoàn hảo! Bạn đã viết rất chi tiết! Nhân sẽ cảm ơn bạn bằng cả trái tim! 💕",
  "💎 Xuất sắc! Bình luận của bạn rất hay! Nhân sẽ học hỏi từ ý kiến của bạn! 📚",
  "🔥 Tuyệt vời nhất! Bạn đã viết rất kỹ lưỡng! Nhân sẽ nhớ mãi bình luận này! 💖",
  "💫 Perfect! Bình luận của bạn quá hay! Nhân sẽ đọc lại nhiều lần! 🔍",
  "🎯 Hoàn hảo! Bạn đã chia sẻ rất chi tiết! Nhân sẽ cảm ơn bạn rất nhiều! 🙏",
  "⭐ WOW! Bình luận của bạn xuất sắc! Nhân sẽ làm ứng dụng tốt hơn nhờ bạn! 🚀",
  "💝 Tuyệt vời! Bạn đã viết rất hay! Nhân sẽ nhớ mãi bình luận này! 🌟",
  "🎁 Perfect! Bình luận của bạn quá chi tiết! Nhân sẽ cảm ơn bạn bằng cả tâm hồn! 💕",
  "🌟 Hoàn hảo nhất! Bạn đã viết rất kỹ! Nhân sẽ học hỏi và cải thiện nhờ bạn! 📖"
];

const ReviewSection = ({
  user,
  reviews,
  reviewStats,
  reviewLoading,
  reviewError,
  reviewForm,
  setReviewForm,
  isSubmittingReview,
  onSubmitReview,
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showLowRatingModal, setShowLowRatingModal] = useState(false);
  const [currentJoke, setCurrentJoke] = useState('');
  const [commentReminderJoke, setCommentReminderJoke] = useState('');
  const [commentLengthJoke, setCommentLengthJoke] = useState('');
  const emojiPickerRef = useRef(null);
  const previousWordCountRef = useRef(0);
  const previousWordCategoryRef = useRef('');

  // Function để random joke
  const getRandomJoke = (rating) => {
    if (rating === 3) {
      return JOKES_3_STARS[Math.floor(Math.random() * JOKES_3_STARS.length)];
    } else if (rating === 4) {
      return JOKES_4_STARS[Math.floor(Math.random() * JOKES_4_STARS.length)];
    } else if (rating === 5) {
      return JOKES_5_STARS[Math.floor(Math.random() * JOKES_5_STARS.length)];
    }
    return '';
  };

  // Function để random joke nhắc nhở bình luận
  const getRandomCommentReminderJoke = () => {
    return COMMENT_REMINDER_JOKES[Math.floor(Math.random() * COMMENT_REMINDER_JOKES.length)];
  };

  // Function để đếm số từ trong comment
  const countWords = (text) => {
    if (!text || !text.trim()) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  // Function để xác định category dựa trên số từ
  const getWordCategory = (wordCount) => {
    if (wordCount < 3) return 'less_than_3';
    if (wordCount >= 3 && wordCount < 5) return '3_to_4';
    if (wordCount >= 5 && wordCount < 7) return '5_to_6';
    if (wordCount >= 7) return '7_plus';
    return '';
  };

  // Function để random joke dựa trên số từ
  const getCommentLengthJoke = (wordCount) => {
    if (wordCount < 3) {
      return JOKES_LESS_THAN_3_WORDS[Math.floor(Math.random() * JOKES_LESS_THAN_3_WORDS.length)];
    } else if (wordCount >= 3 && wordCount < 5) {
      return JOKES_3_TO_4_WORDS[Math.floor(Math.random() * JOKES_3_TO_4_WORDS.length)];
    } else if (wordCount >= 5 && wordCount < 7) {
      return JOKES_5_TO_6_WORDS[Math.floor(Math.random() * JOKES_5_TO_6_WORDS.length)];
    } else if (wordCount >= 7) {
      return JOKES_7_PLUS_WORDS[Math.floor(Math.random() * JOKES_7_PLUS_WORDS.length)];
    }
    return '';
  };

  // Update joke khi comment thay đổi - chỉ khi số từ thay đổi hoặc chuyển category
  useEffect(() => {
    if ((reviewForm.rating || 0) >= 3 && reviewForm.comment) {
      const wordCount = countWords(reviewForm.comment);
      const currentCategory = getWordCategory(wordCount);
      
      // Chỉ update joke khi:
      // 1. Số từ thay đổi (từ 0 → có từ, hoặc từ này sang từ khác)
      // 2. Hoặc category thay đổi (ví dụ: từ < 3 từ → 3-4 từ)
      if (wordCount !== previousWordCountRef.current || currentCategory !== previousWordCategoryRef.current) {
        const newJoke = getCommentLengthJoke(wordCount);
        setCommentLengthJoke(newJoke);
        previousWordCountRef.current = wordCount;
        previousWordCategoryRef.current = currentCategory;
      }
    } else {
      setCommentLengthJoke('');
      previousWordCountRef.current = 0;
      previousWordCategoryRef.current = '';
    }
  }, [reviewForm.comment, reviewForm.rating]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  };

  // ⭐ Star SVG Icon
  const StarIcon = (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );

  // ⭐ Render stars (1-5)
  const renderStars = (rating) =>
    Array.from({ length: MAX_STARS }, (_, i) => (
      <StarIcon
        key={i}
        className={`w-4 h-4 ${i < rating ? "text-yellow-400 fill-yellow-400" : "text-slate-300 fill-slate-300"}`}
      />
    ));

  // Handle emoji selection
  const handleEmojiSelect = (e) => {
    const emojiChar = e?.native || "";
    if (!emojiChar) return;

    setReviewForm((prev) => ({
      ...prev,
      comment: (prev.comment || "") + emojiChar,
    }));
    setShowEmojiPicker(false);
  };

  const totalReviews = Number(reviewStats?.total_reviews || 0);

  // Average rating display (1-5)
  const avgDisplay = useMemo(() => {
    const avg = Number(reviewStats?.average_rating || 0);
    return Number.isFinite(avg) ? avg.toFixed(1) : "0.0";
  }, [reviewStats]);

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/20 bg-gradient-to-r from-blue-50/50 to-cyan-50/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-md shadow-blue-500/25">
            <span className="text-lg">⭐</span>
          </div>

          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-900">Đánh giá ứng dụng</h2>
            <p className="text-xs text-slate-600 mt-0.5">Chia sẻ ý kiến của bạn về ứng dụng</p>
          </div>

          {totalReviews > 0 && (
            <div className="text-right">
              <div className="text-xl font-bold text-blue-600">{avgDisplay}/5</div>
              <div className="text-[10px] text-slate-600 font-medium">{totalReviews} đánh giá</div>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Reviews List */}
        <div>
          <h3 className="text-base font-bold text-slate-900 mb-3">
            Đánh giá từ người dùng ({reviews?.length || 0})
          </h3>

          {reviewLoading ? (
            <div className="text-center py-6">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
              <p className="text-slate-600 mt-2 text-sm">Đang tải đánh giá...</p>
            </div>
          ) : reviewError ? (
            <div className="text-center py-6 text-red-600 text-sm">
              <p>Có lỗi xảy ra: {reviewError}</p>
            </div>
          ) : !reviews || reviews.length === 0 ? (
            <div className="text-center py-6 text-slate-500">
              <div className="text-3xl mb-2">💬</div>
              <p className="text-sm">Chưa có đánh giá nào</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {reviews.map((review) => {
                const rating = Number(review.rating || 0);

                return (
                  <div
                    key={review._id}
                    className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {review.user_id?.avatar_url ? (
                          <img
                            src={review.user_id.avatar_url}
                            alt={review.user_id.full_name || "User"}
                            className="w-14 h-14 rounded-lg object-cover border-2 border-blue-200"
                            onError={(e) => {
                              e.target.style.display = "none";
                              if (e.target.nextSibling) e.target.nextSibling.style.display = "flex";
                            }}
                          />
                        ) : null}

                        <div
                          className={cx(
                            "w-14 h-14 rounded-lg flex items-center justify-center font-bold text-base text-white bg-gradient-to-br from-blue-500 to-cyan-600",
                            review.user_id?.avatar_url && "hidden"
                          )}
                          style={{ display: review.user_id?.avatar_url ? "none" : "flex" }}
                        >
                          {review.user_id?.full_name?.charAt(0)?.toUpperCase() || "👤"}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-1.5">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-900 text-sm mb-0.5">
                              {review.user_id?.full_name || "Người dùng ẩn danh"}
                            </h4>

                            {review.user_id?.email && (
                              <p className="text-xs text-slate-500 break-all line-clamp-1">
                                {review.user_id.email}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-0.5">{renderStars(rating)}</div>
                              <span className="text-xs font-bold text-blue-600">{rating}/5</span>
                            </div>
                            {review.created_at && (
                              <span className="text-[10px] text-slate-500">{formatDate(review.created_at)}</span>
                            )}
                          </div>
                        </div>

                        {review.comment && (
                          <p className="text-slate-700 whitespace-pre-wrap break-words text-sm line-clamp-3">
                            {review.comment}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* My Review Form */}
        {user ? (
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-3 border border-blue-200/50">
            <h3 className="text-base font-bold text-slate-900 mb-3">Đánh giá ứng dụng</h3>

            {/* Star Rating */}
            <div className="mb-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Điểm đánh giá (0-5 sao)
              </label>

              <div className="flex items-center gap-1.5 mb-2">
                {Array.from({ length: MAX_STARS }, (_, i) => {
                  const starValue = i + 1;
                  const currentRating = Number(reviewForm.rating || 0);
                  const isSelected = currentRating >= starValue;
                  
                  return (
                    <button
                      key={starValue}
                      type="button"
                      onClick={() => {
                        if (starValue < 3) {
                          // Hiển thị modal năn nỉ khi chọn < 3 sao
                          setShowLowRatingModal(true);
                        } else {
                          // Cho phép chọn >= 3 sao bình thường và random joke
                          const newRating = starValue;
                          setReviewForm((prev) => ({ ...prev, rating: newRating }));
                          setCurrentJoke(getRandomJoke(newRating));
                          setCommentReminderJoke(getRandomCommentReminderJoke());
                        }
                      }}
                      className={cx(
                        "transition-all duration-200 cursor-pointer hover:scale-110",
                        isSelected
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-slate-300 fill-slate-300 hover:text-yellow-300 hover:fill-yellow-300"
                      )}
                      title={`Chọn ${starValue} sao`}
                    >
                      <StarIcon className="w-8 h-8" />
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-bold text-blue-600">
                  {(reviewForm.rating || 0)}/5
                </span>
                {(reviewForm.rating || 0) > 0 && (
                  <span className="text-[10px] text-slate-600">
                    Bạn đã chọn {reviewForm.rating} sao
                  </span>
                )}
                {(reviewForm.rating || 0) === 0 && (
                  <span className="text-[10px] text-slate-500 italic">
                    Chưa chọn sao đánh giá
                  </span>
                )}
              </div>

              {/* Joke để khuyến khích chọn 4-5 sao - Random mỗi lần chọn */}
              {(reviewForm.rating || 0) === 3 && currentJoke && (
                <div className="bg-gradient-to-r from-yellow-200 to-orange-200 border-2 border-yellow-400 rounded-lg px-3 py-2 mb-2 animate-pulse shadow-md">
                  <p className="text-xs text-orange-800 font-semibold text-center">
                    {currentJoke}
                  </p>
                </div>
              )}

              {(reviewForm.rating || 0) === 4 && currentJoke && (
                <div className="bg-gradient-to-r from-green-200 to-emerald-200 border-2 border-green-400 rounded-lg px-3 py-2 mb-2 shadow-md">
                  <p className="text-xs text-green-800 font-semibold text-center">
                    {currentJoke}
                  </p>
                </div>
              )}

              {(reviewForm.rating || 0) === 5 && currentJoke && (
                <div className="bg-gradient-to-r from-purple-200 to-pink-200 border-2 border-purple-400 rounded-lg px-3 py-2 mb-2 shadow-md">
                  <p className="text-xs text-purple-800 font-semibold text-center">
                    {currentJoke}
                  </p>
                </div>
              )}
            </div>

            {/* Comment + Emoji */}
            <div className="mb-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Bình luận</label>

              <div className="relative">
                <textarea
                  value={reviewForm.comment || ""}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, comment: e.target.value }))}
                  placeholder="Chia sẻ ý kiến của bạn về ứng dụng..."
                  className="w-full px-3 py-2 pr-10 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 resize-none text-sm"
                  rows={3}
                  maxLength={2000}
                />

                <div className="absolute right-2 bottom-2">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-lg"
                    title="Chèn emoji"
                  >
                    😊
                  </button>
                </div>

                {showEmojiPicker && (
                  <div ref={emojiPickerRef} className="absolute right-0 bottom-10 z-50">
                    <div className="rounded-xl overflow-hidden border bg-white shadow-xl">
                      <Picker
                        onEmojiSelect={handleEmojiSelect}
                        theme="light"
                        previewPosition="none"
                        searchPosition="top"
                        navPosition="top"
                      />
                    </div>
                  </div>
                )}
              </div>

              <p className="text-[10px] text-slate-500 mt-1">{(reviewForm.comment || "").length}/2000 ký tự</p>

              {/* Joke nhắc nhở điền bình luận - chỉ hiển thị khi đã chọn sao nhưng chưa có comment */}
              {(reviewForm.rating || 0) >= 3 && (!reviewForm.comment || reviewForm.comment.trim() === '') && commentReminderJoke && (
                <div className="mt-2 bg-gradient-to-r from-cyan-100 to-blue-100 border-2 border-cyan-300 rounded-lg px-3 py-2 shadow-md animate-pulse">
                  <p className="text-xs text-cyan-800 font-semibold text-center">
                    {commentReminderJoke}
                  </p>
                </div>
              )}

              {/* Joke dựa trên số từ trong comment - hiển thị khi đã có comment */}
              {(reviewForm.rating || 0) >= 3 && reviewForm.comment && reviewForm.comment.trim() !== '' && commentLengthJoke && (
                <div className="mt-2 bg-gradient-to-r from-indigo-100 to-purple-100 border-2 border-indigo-300 rounded-lg px-3 py-2 shadow-md">
                  <p className="text-xs text-indigo-800 font-semibold text-center">
                    {commentLengthJoke}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={onSubmitReview}
                disabled={isSubmittingReview || (reviewForm.rating || 0) < 1}
                className={cx(
                  "px-4 py-2 rounded-lg font-bold text-white transition-all duration-300 shadow-md hover:shadow-lg text-sm",
                  "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700",
                  (isSubmittingReview || (reviewForm.rating || 0) < 1) && "opacity-50 cursor-not-allowed"
                )}
              >
                {isSubmittingReview ? "Đang xử lý..." : "Gửi đánh giá"}
              </button>
              {(reviewForm.rating || 0) < 1 && (
                <span className="text-xs text-red-500 italic">
                  Vui lòng chọn ít nhất 1 sao
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg p-3 border border-slate-200 text-center">
            <p className="text-slate-700 text-sm">
              Vui lòng{" "}
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-bold">
                đăng nhập
              </Link>{" "}
              để đánh giá ứng dụng
            </p>
          </div>
        )}
      </div>

      {/* Low Rating Modal - Năn nỉ */}
      {showLowRatingModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-400 to-pink-500 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🥺</span>
                  <h3 className="text-base font-bold text-white">Ồ không!</h3>
                </div>
                <button
                  onClick={() => setShowLowRatingModal(false)}
                  className="text-white/80 hover:text-white transition-colors p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content - Layout ngang */}
            <div className="px-4 py-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cột trái - Message chính */}
                <div className="text-center md:text-left">
                  <div className="text-5xl mb-3">😢</div>
                  <h4 className="text-lg font-bold text-slate-900 mb-2">
                    Bạn phải chọn lớn hơn 3 sao
                  </h4>
                  <p className="text-sm text-slate-600 mb-3 leading-relaxed">
                    Ứng dụng của chúng tôi đã cố gắng rất nhiều! <br />
                    Bạn có thể chọn lại với điểm cao hơn không? 🥺
                  </p>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 mb-3">
                    <p className="text-sm text-orange-700 font-semibold italic">
                      Nhân biết Nhân buồn đó 😔
                    </p>
                  </div>
                  
                  {/* Star Display */}
                  <div className="flex items-center justify-center md:justify-start gap-1 mb-3">
                    {Array.from({ length: MAX_STARS }, (_, i) => {
                      const starValue = i + 1;
                      const shouldHighlight = starValue >= 3;
                      return (
                        <span
                          key={i}
                          className={shouldHighlight ? "text-yellow-400 fill-yellow-400" : "text-slate-300 fill-slate-300"}
                        >
                          <StarIcon className="w-6 h-6" />
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Cột phải - Joke khác */}
                <div className="flex flex-col justify-center">
                  <div className="bg-gradient-to-r from-blue-200 to-cyan-200 border-2 border-blue-400 rounded-lg px-4 py-3 shadow-md">
                    <p className="text-sm text-blue-900 font-semibold text-center leading-relaxed">
                      💡 <strong>Bí mật nhỏ:</strong> Nếu bạn cho 4-5 sao, Nhân sẽ:
                      <br />
                      ✨ Cảm ơn bạn bằng cả trái tim
                      <br />
                      🎁 Gửi bạn một lời chúc may mắn
                      <br />
                      🚀 Nhân sẽ hỗ trợ nhiệt tình đặc biệt là mấy chị em ^^
                      <br />
                      <br />
                      <span className="text-xs italic">(Và có thể... chỉ có thể thôi... Nhân sẽ nhảy vui như điên á hahahaha)</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-4 pb-4 border-t border-slate-100 pt-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => {
                    setShowLowRatingModal(false);
                    setReviewForm((prev) => ({ ...prev, rating: 3 }));
                  }}
                  className="flex-1 bg-gradient-to-r from-orange-400 to-pink-500 text-white py-2.5 px-4 rounded-lg font-semibold hover:from-orange-500 hover:to-pink-600 transition-all duration-200 shadow-md hover:shadow-lg text-sm"
                >
                  Được rồi, mình chọn 3 sao! ⭐
                </button>
                <button
                  onClick={() => setShowLowRatingModal(false)}
                  className="flex-1 text-slate-500 py-2 px-4 rounded-lg font-medium hover:text-slate-700 transition-colors text-sm border border-slate-200"
                >
                  Để mình suy nghĩ thêm...
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewSection;
