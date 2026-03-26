import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { updateReview } from "../services/reviewService";

const cx = (...a) => a.filter(Boolean).join(" ");
const MAX_STARS = 5;

const StarIcon = ({ filled, size = "w-5 h-5", interactive = false, onClick, onMouseEnter, onMouseLeave }) => (
  <button
    type="button"
    onClick={onClick}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    className={cx(
      "transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded",
      interactive && "hover:scale-110 cursor-pointer",
      !interactive && "cursor-default pointer-events-none"
    )}
  >
    <svg viewBox="0 0 24 24" className={cx(size, filled ? "text-amber-400" : "text-slate-300")} fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  </button>
);

const Stars = ({ rating, size = "w-3.5 h-3.5" }) => (
  <div className="flex items-center gap-0.5">
    {Array.from({ length: MAX_STARS }, (_, i) => (
      <StarIcon key={i} filled={i < rating} size={size} interactive={false} />
    ))}
  </div>
);

const ReviewAvatar = ({ src, name }) => {
  const [err, setErr] = useState(false);
  const initial = name?.charAt(0)?.toUpperCase() || "?";
  const color = "bg-slate-200 text-slate-700";

  if (src && !err) {
    return (
      <img
        src={src}
        alt=""
        onError={() => setErr(true)}
        className="w-9 h-9 rounded-lg object-cover border border-slate-200 flex-shrink-0"
      />
    );
  }
  return (
    <div className={cx("w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0", color)}>
      {initial}
    </div>
  );
};

const STAR_LABELS = ["", "Rất tệ", "Tệ", "Bình thường", "Tốt", "Xuất sắc"];

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
  editingReviewId = null,
  onRefresh = null,
}) => {
  const [hoverRating, setHoverRating] = useState(0);
  const [showLowRatingModal, setShowLowRatingModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [editForm, setEditForm] = useState({ rating: 0, comment: "" });
  const [isUpdating, setIsUpdating] = useState(false);

  const isCurrentUserReview = (review) => {
    if (!user || !review) return false;
    const reviewUserId = review.user_id?._id || review.user_id;
    const currentUserId = user._id || user.user_id;
    return reviewUserId && currentUserId && String(reviewUserId) === String(currentUserId);
  };

  const handleEditClick = (review) => {
    setEditingReview(review);
    setEditForm({ rating: review.rating || 0, comment: review.comment || "" });
    setShowEditModal(true);
  };

  const handleUpdateReview = async () => {
    if (!editingReview || editForm.rating < 1 || editForm.rating > 5) return;
    try {
      setIsUpdating(true);
      const response = await updateReview(editingReview._id, editForm.rating, editForm.comment || "");
      if (response.success) {
        setShowEditModal(false);
        setEditingReview(null);
        setEditForm({ rating: 0, comment: "" });
        onRefresh?.();
      }
    } catch (err) {
      console.error("Error updating review:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return "";
    try {
      return new Date(d).toLocaleDateString("vi-VN", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  const getReviewEmail = (review) =>
    review?.user_id?.email ||
    review?.email ||
    review?.user_email ||
    review?.created_by_email ||
    "";

  const totalReviews = Number(reviewStats?.total_reviews || 0);
  const avgDisplay = useMemo(() => {
    const a = Number(reviewStats?.average_rating || 0);
    return Number.isFinite(a) ? a.toFixed(1) : "0.0";
  }, [reviewStats]);

  const displayRating = hoverRating || reviewForm.rating || 0;

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header — một dòng, trung tính */}
      <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-slate-800">Đánh giá</h2>
        {totalReviews > 0 ? (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{avgDisplay}</span>
            <Stars rating={Math.round(Number(avgDisplay))} size="w-3.5 h-3.5" />
            <span className="text-slate-400">·</span>
            <span>{totalReviews} lượt</span>
          </div>
        ) : (
          <span className="text-sm text-slate-500">Chưa có đánh giá</span>
        )}
      </div>

      <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Danh sách */}
        <div className="lg:col-span-2 space-y-2 min-w-0 order-2 lg:order-1">
          {reviewLoading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-slate-500 text-sm">
              <div className="w-4 h-4 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
              Đang tải…
            </div>
          ) : reviewError ? (
            <p className="text-center py-8 text-red-600 text-sm">{reviewError}</p>
          ) : !reviews?.length ? (
            <p className="text-center py-10 text-slate-500 text-sm">Chưa có bình luận nào.</p>
          ) : (
            <ul className="space-y-2 max-h-[min(420px,50vh)] overflow-y-auto pr-1">
              {reviews.map((review) => {
                const rating = Number(review.rating || 0);
                const isMine = isCurrentUserReview(review);
                const email = getReviewEmail(review);
                return (
                  <li
                    key={review._id}
                    className={cx(
                      "group rounded-lg border px-3 py-2.5 text-sm",
                      isMine ? "border-indigo-200 bg-indigo-50/50" : "border-slate-100 bg-slate-50/80"
                    )}
                  >
                    <div className="flex gap-2.5">
                      <ReviewAvatar src={review.user_id?.avatar_url} name={review.user_id?.full_name} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-semibold text-slate-800">
                              {review.user_id?.full_name || "Ẩn danh"}
                              {isMine && (
                                <span className="ml-1.5 text-[10px] font-medium text-indigo-600">(bạn)</span>
                              )}
                            </span>
                            {email && (
                              <div className="text-[11px] text-slate-500 font-medium truncate max-w-[min(100%,28rem)]">
                                {email}
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                              <Stars rating={rating} size="w-3 h-3" />
                              <span>{rating}/5</span>
                              {review.created_at && <span>{formatDate(review.created_at)}</span>}
                            </div>
                          </div>
                          {isMine && (
                            <button
                              type="button"
                              onClick={() => handleEditClick(review)}
                              className="opacity-70 hover:opacity-100 p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-white shrink-0"
                              title="Sửa"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}
                        </div>
                        {review.comment && (
                          <p className="mt-1.5 text-slate-600 leading-relaxed whitespace-pre-wrap break-words line-clamp-6">
                            {review.comment}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Form — gọn */}
        <div className="order-1 lg:order-2 lg:col-span-1">
          {user ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 lg:sticky lg:top-20">
              <p className="text-xs font-medium text-slate-600 mb-3">Viết đánh giá</p>

              <div className="flex items-center gap-0.5 mb-1">
                {Array.from({ length: MAX_STARS }, (_, i) => {
                  const val = i + 1;
                  return (
                    <StarIcon
                      key={val}
                      filled={displayRating >= val}
                      size="w-7 h-7"
                      interactive
                      onClick={() => {
                        if (val < 3) setShowLowRatingModal(true);
                        else setReviewForm((p) => ({ ...p, rating: val }));
                      }}
                      onMouseEnter={() => setHoverRating(val)}
                      onMouseLeave={() => setHoverRating(0)}
                    />
                  );
                })}
              </div>
              {displayRating > 0 && (
                <p className="text-xs text-slate-600 mb-3">{STAR_LABELS[displayRating]}</p>
              )}
              {displayRating === 0 && <p className="text-xs text-slate-400 mb-3">Chọn số sao</p>}

              <textarea
                value={reviewForm.comment || ""}
                onChange={(e) => setReviewForm((p) => ({ ...p, comment: e.target.value }))}
                placeholder="Bình luận (không bắt buộc)"
                rows={3}
                maxLength={2000}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 text-sm placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
              />
              <p className="text-[10px] text-slate-400 mt-1">{(reviewForm.comment || "").length}/2000</p>

              <button
                type="button"
                onClick={onSubmitReview}
                disabled={isSubmittingReview || (reviewForm.rating || 0) < 1}
                className="mt-3 w-full py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmittingReview ? "Đang gửi…" : editingReviewId ? "Cập nhật" : "Gửi đánh giá"}
              </button>
              {(reviewForm.rating || 0) < 1 && (
                <p className="text-center text-[11px] text-slate-400 mt-2">Chọn ít nhất 1 sao</p>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm">
              <p className="text-slate-600 mb-3">Đăng nhập để đánh giá</p>
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
              >
                Đăng nhập
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Sửa đánh giá */}
      {showEditModal && editingReview && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-slate-200">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Sửa đánh giá</h3>
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingReview(null);
                  setEditForm({ rating: 0, comment: "" });
                }}
                className="p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <p className="text-xs text-slate-500 mb-2">Số sao</p>
                <div className="flex gap-0.5">
                  {Array.from({ length: MAX_STARS }, (_, i) => {
                    const val = i + 1;
                    return (
                      <StarIcon
                        key={val}
                        filled={editForm.rating >= val}
                        size="w-8 h-8"
                        interactive
                        onClick={() => setEditForm((p) => ({ ...p, rating: val }))}
                      />
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-2">Bình luận</p>
                <textarea
                  value={editForm.comment || ""}
                  onChange={(e) => setEditForm((p) => ({ ...p, comment: e.target.value }))}
                  rows={4}
                  maxLength={2000}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleUpdateReview}
                  disabled={isUpdating || editForm.rating < 1}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40"
                >
                  {isUpdating ? "Đang lưu…" : "Lưu"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingReview(null);
                    setEditForm({ rating: 0, comment: "" });
                  }}
                  className="flex-1 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Điểm thấp — tối giản */}
      {showLowRatingModal && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-800 mb-2">Đánh giá từ 3 sao trở lên</p>
            <p className="text-sm text-slate-600 mb-4">
              Vui lòng chọn từ 3 đến 5 sao, hoặc đóng hộp thoại này nếu bạn muốn suy nghĩ thêm.
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowLowRatingModal(false);
                  setReviewForm((p) => ({ ...p, rating: 3 }));
                }}
                className="w-full py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Chọn 3 sao
              </button>
              <button
                type="button"
                onClick={() => setShowLowRatingModal(false)}
                className="w-full py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
};

export default ReviewSection;
