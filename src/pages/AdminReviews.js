import React, { useState, useEffect, useMemo } from "react";
import AdminLayout from "../layout/AdminLayout";
import { getAllReviews, getReviewStatistics, deleteReview, updateReview } from "../services/reviewService";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import Toast from "../components/Toast";

/* =========================
   Icons
========================= */
const Icon = {
  Search: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Refresh: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M4 4v6h6M20 20v-6h-6M20 9a8 8 0 00-14.9-2M4 15a8 8 0 0014.9 2"
      />
    </svg>
  ),
  Trash: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  X: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Star: (p) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
};

/* =========================
   Modal Shell
========================= */
const ModalShell = ({ title, subtitle, onClose, children, maxWidth = "max-w-md" }) => {
  useEffect(() => {
    const onKeyDown = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative min-h-full flex items-center justify-center p-3">
        <div className={`w-full ${maxWidth} rounded-xl bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden`}>
          <div className="px-4 py-3 border-b flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-base font-semibold text-slate-900 truncate">{title}</div>
              {subtitle ? <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div> : null}
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
              aria-label="Đóng"
            >
              <Icon.X className="w-4 h-4 text-slate-700" />
            </button>
          </div>
          <div className="p-4">{children}</div>
        </div>
      </div>
    </div>
  );
};

const AdminReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ average_rating: 0, total_reviews: 0, rating_distribution: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [selectedReview, setSelectedReview] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editForm, setEditForm] = useState({ rating: 0, comment: '' });
  const [isUpdating, setIsUpdating] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  useEffect(() => {
    fetchReviews();
    fetchStatistics();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAllReviews({ limit: 100, offset: 0 });
      if (response.success) {
        setReviews(response.data || []);
      }
    } catch (err) {
      setError(err.message || "Có lỗi xảy ra khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await getReviewStatistics();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch statistics:", err);
    }
  };

  const handleDeleteReview = async () => {
    if (!selectedReview) return;
    try {
      await deleteReview(selectedReview._id);
      setShowDeleteModal(false);
      setSelectedReview(null);
      showToast("Xóa đánh giá thành công", "success");
      fetchReviews();
      fetchStatistics();
    } catch (err) {
      showToast("Lỗi: " + (err.message || "Không thể xóa đánh giá"), "error");
    }
  };

  const handleEditReview = async () => {
    if (!selectedReview) return;
    if (editForm.rating < 1 || editForm.rating > 5) {
      showToast("Vui lòng chọn điểm từ 1 đến 5", "error");
      return;
    }

    try {
      setIsUpdating(true);
      const response = await updateReview(
        selectedReview._id,
        editForm.rating,
        editForm.comment
      );
      if (response.success) {
        setShowEditModal(false);
        setSelectedReview(null);
        setEditForm({ rating: 0, comment: '' });
        showToast("Cập nhật đánh giá thành công", "success");
        fetchReviews();
        fetchStatistics();
      }
    } catch (err) {
      showToast("Lỗi: " + (err.message || "Không thể cập nhật đánh giá"), "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const openEditModal = (review) => {
    setSelectedReview(review);
    setEditForm({ rating: review.rating, comment: review.comment || '' });
    setShowEditModal(true);
  };

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Chưa có";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Chưa có";
    }
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Icon.Star
        key={i}
        className={`w-4 h-4 ${i < rating ? "text-yellow-400 fill-yellow-400" : "text-slate-300 fill-slate-300"}`}
      />
    ));
  };

  const filteredReviews = useMemo(() => {
    let filtered = [...reviews];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (review) =>
          review.user_id?.full_name?.toLowerCase().includes(term) ||
          review.user_id?.email?.toLowerCase().includes(term) ||
          review.comment?.toLowerCase().includes(term)
      );
    }

    // Rating filter
    if (ratingFilter !== "all") {
      const rating = parseInt(ratingFilter);
      filtered = filtered.filter((review) => review.rating === rating);
    }

    return filtered;
  }, [reviews, searchTerm, ratingFilter]);

  if (loading) return <LoadingSpinner message="Đang tải dữ liệu..." />;
  if (error) return <ErrorMessage error={error} onRetry={fetchReviews} />;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Quản lý đánh giá</h1>
            <p className="text-sm text-slate-600 mt-1">Quản lý và xem tất cả đánh giá từ người dùng</p>
          </div>
          <button
            onClick={() => {
              fetchReviews();
              fetchStatistics();
            }}
            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium flex items-center gap-2 transition-colors"
          >
            <Icon.Refresh className="w-4 h-4" />
            Làm mới
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-4 text-white shadow-lg">
            <div className="text-sm font-medium opacity-90">Tổng đánh giá</div>
            <div className="text-3xl font-bold mt-2">{stats.total_reviews}</div>
          </div>
          <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl p-4 text-white shadow-lg">
            <div className="text-sm font-medium opacity-90">Điểm trung bình</div>
            <div className="text-3xl font-bold mt-2">{stats.average_rating.toFixed(1)}/5</div>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-4 text-white shadow-lg">
            <div className="text-sm font-medium opacity-90">Đánh giá đang hiển thị</div>
            <div className="text-3xl font-bold mt-2">
              {reviews.length}
            </div>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-4 text-white shadow-lg">
            <div className="text-sm font-medium opacity-90">Đã lọc</div>
            <div className="text-3xl font-bold mt-2">{filteredReviews.length}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative">
              <Icon.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên, email, bình luận..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            {/* Rating Filter */}
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="all">Tất cả điểm</option>
              {Array.from({ length: 5 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1} sao
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Reviews Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Điểm</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Bình luận</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Ngày tạo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredReviews.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                      Không tìm thấy đánh giá nào
                    </td>
                  </tr>
                ) : (
                  filteredReviews.map((review) => (
                    <tr key={review._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {review.user_id?.avatar_url ? (
                            <img
                              src={review.user_id.avatar_url}
                              alt={review.user_id.full_name || "User"}
                              className="w-10 h-10 rounded-full object-cover border-2 border-slate-200"
                              onError={(e) => {
                                e.target.style.display = "none";
                                e.target.nextSibling.style.display = "flex";
                              }}
                            />
                          ) : null}
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white ${
                              review.user_id?.avatar_url ? "hidden" : ""
                            } bg-gradient-to-br from-purple-500 to-pink-600`}
                            style={{ display: review.user_id?.avatar_url ? "none" : "flex" }}
                          >
                            {review.user_id?.full_name?.charAt(0).toUpperCase() || "👤"}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">
                              {review.user_id?.full_name || "Người dùng ẩn danh"}
                            </div>
                            <div className="text-xs text-slate-500">
                              {review.user_id?.email || "N/A"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-0.5">
                            {renderStars(review.rating)}
                          </div>
                          <span className="font-bold text-purple-600">{review.rating}/5</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-xs">
                          {review.comment ? (
                            <p className="text-sm text-slate-700 line-clamp-2">{review.comment}</p>
                          ) : (
                            <span className="text-xs text-slate-400">Không có bình luận</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-slate-600">{formatDate(review.created_at)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedReview(review);
                              setShowDetailModal(true);
                            }}
                            className="min-w-[80px] px-3 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-medium transition-colors text-center"
                          >
                            Chi tiết
                          </button>
                          <button
                            onClick={() => openEditModal(review)}
                            className="min-w-[80px] px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-medium transition-colors text-center"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => {
                              setSelectedReview(review);
                              setShowDeleteModal(true);
                            }}
                            className="min-w-[80px] px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium transition-colors flex items-center justify-center gap-1"
                          >
                            <Icon.Trash className="w-3 h-3" />
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedReview && (
        <ModalShell
          title="Chi tiết đánh giá"
          subtitle={`Đánh giá từ ${selectedReview.user_id?.full_name || "Người dùng ẩn danh"}`}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedReview(null);
          }}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4">
            {/* User Info */}
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
              {selectedReview.user_id?.avatar_url ? (
                <img
                  src={selectedReview.user_id.avatar_url}
                  alt={selectedReview.user_id.full_name || "User"}
                  className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "flex";
                  }}
                />
              ) : null}
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl text-white ${
                  selectedReview.user_id?.avatar_url ? "hidden" : ""
                } bg-gradient-to-br from-purple-500 to-pink-600`}
                style={{ display: selectedReview.user_id?.avatar_url ? "none" : "flex" }}
              >
                {selectedReview.user_id?.full_name?.charAt(0).toUpperCase() || "👤"}
              </div>
              <div>
                <div className="font-bold text-slate-900">
                  {selectedReview.user_id?.full_name || "Người dùng ẩn danh"}
                </div>
                <div className="text-sm text-slate-600">{selectedReview.user_id?.email || "N/A"}</div>
              </div>
            </div>

            {/* Rating */}
            <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
              <div className="text-sm font-semibold text-slate-700 mb-2">Điểm đánh giá</div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {renderStars(selectedReview.rating)}
                </div>
                <span className="text-2xl font-bold text-purple-600">{selectedReview.rating}/5</span>
              </div>
            </div>

            {/* Comment */}
            {selectedReview.comment && (
              <div className="p-4 bg-white rounded-lg border border-slate-200">
                <div className="text-sm font-semibold text-slate-700 mb-2">Bình luận</div>
                <p className="text-slate-700 whitespace-pre-wrap">{selectedReview.comment}</p>
              </div>
            )}

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="text-xs font-semibold text-slate-600 mb-1">Ngày tạo</div>
                <div className="text-sm font-medium text-slate-900">{formatDate(selectedReview.created_at)}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="text-xs font-semibold text-slate-600 mb-1">Cập nhật lần cuối</div>
                <div className="text-sm font-medium text-slate-900">{formatDate(selectedReview.updated_at)}</div>
              </div>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedReview && (
        <ModalShell
          title="Sửa đánh giá"
          subtitle={`Đánh giá từ ${selectedReview.user_id?.full_name || "Người dùng ẩn danh"}`}
          onClose={() => {
            setShowEditModal(false);
            setSelectedReview(null);
            setEditForm({ rating: 0, comment: '' });
          }}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            {/* Star Rating */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Điểm đánh giá (1-10 sao)
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {Array.from({ length: 5 }, (_, i) => {
                  const starValue = i + 1;
                  return (
                    <button
                      key={starValue}
                      type="button"
                      onClick={() => setEditForm(prev => ({ ...prev, rating: starValue }))}
                      className={`w-10 h-10 rounded-lg border-2 transition-all duration-200 font-bold text-sm ${
                        editForm.rating >= starValue
                          ? "bg-yellow-400 border-yellow-500 text-yellow-900 shadow-md scale-110"
                          : "bg-white border-slate-300 text-slate-400 hover:border-yellow-400 hover:bg-yellow-50"
                      }`}
                    >
                      {starValue}
                    </button>
                  );
                })}
              </div>
              {editForm.rating > 0 && (
                <p className="text-xs text-slate-600 mt-2">
                  Đã chọn {editForm.rating} sao
                </p>
              )}
            </div>

            {/* Comment */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Bình luận (tùy chọn)
              </label>
              <textarea
                value={editForm.comment}
                onChange={(e) => setEditForm(prev => ({ ...prev, comment: e.target.value }))}
                placeholder="Chia sẻ ý kiến của bạn về ứng dụng..."
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 resize-none"
                rows={4}
                maxLength={2000}
              />
              <p className="text-xs text-slate-500 mt-1">
                {editForm.comment.length}/2000 ký tự
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleEditReview}
                disabled={isUpdating || editForm.rating < 1}
                className={`flex-1 px-4 py-2 rounded-lg font-bold text-white transition-all duration-300 ${
                  isUpdating || editForm.rating < 1
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                }`}
              >
                {isUpdating ? 'Đang cập nhật...' : 'Cập nhật'}
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedReview(null);
                  setEditForm({ rating: 0, comment: '' });
                }}
                className="flex-1 px-4 py-2 rounded-lg font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 transition-all duration-300"
              >
                Hủy
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedReview && (
        <ModalShell
          title="Xác nhận xóa đánh giá"
          subtitle="Bạn có chắc muốn xóa đánh giá này?"
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedReview(null);
          }}
        >
          <div className="space-y-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-sm font-medium text-red-900">
                Đánh giá từ: <span className="font-bold">{selectedReview.user_id?.full_name || "Người dùng ẩn danh"}</span>
              </div>
              <div className="text-sm text-red-700 mt-1">
                Điểm: <span className="font-bold">{selectedReview.rating}/5</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDeleteReview}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Xóa
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedReview(null);
                }}
                className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
              >
                Hủy
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Toast */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ show: false, message: "", type: "success" })}
        />
      )}
    </AdminLayout>
  );
};

export default AdminReviews;

