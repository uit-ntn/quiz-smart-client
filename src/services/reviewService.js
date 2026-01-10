// services/reviewService.js
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

async function handle(res) {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Network error' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Tạo đánh giá mới
 */
async function createReview(rating, comment = '') {
  const res = await fetch(`${API_BASE_URL}/reviews`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ rating, comment }),
  });
  return handle(res);
}

/**
 * Cập nhật đánh giá
 */
async function updateReview(reviewId, rating, comment = '') {
  const res = await fetch(`${API_BASE_URL}/reviews/${reviewId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ rating, comment }),
  });
  return handle(res);
}

/**
 * Xóa đánh giá
 */
async function deleteReview(reviewId) {
  const res = await fetch(`${API_BASE_URL}/reviews/${reviewId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handle(res);
}

/**
 * Lấy đánh giá của user hiện tại
 */
async function getMyReview() {
  const res = await fetch(`${API_BASE_URL}/reviews/my-review`, {
    method: 'GET',
    headers: authHeaders(),
  });
  return handle(res);
}

/**
 * Lấy danh sách đánh giá
 */
async function getAllReviews(filters = {}) {
  const { limit = 10, offset = 0, sort_by = 'created_at', sort_order = 'desc' } = filters;
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
    sort_by,
    sort_order,
  });
  
  const res = await fetch(`${API_BASE_URL}/reviews?${params}`, {
    method: 'GET',
    headers: authHeaders(),
  });
  return handle(res);
}

/**
 * Lấy thống kê đánh giá
 */
async function getReviewStatistics() {
  const res = await fetch(`${API_BASE_URL}/reviews/statistics`, {
    method: 'GET',
    headers: authHeaders(),
  });
  return handle(res);
}

export {
  createReview,
  updateReview,
  deleteReview,
  getMyReview,
  getAllReviews,
  getReviewStatistics,
};
