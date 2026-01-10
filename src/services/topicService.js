// =========================
// 📘 src/services/topicService.js
// =========================

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

/* =========================
   Helpers
========================= */

const token = () => localStorage.getItem('token') || '';

const jsonHeaders = () => ({
  'Content-Type': 'application/json',
});

const authHeaders = () =>
  token()
    ? { ...jsonHeaders(), Authorization: `Bearer ${token()}` }
    : jsonHeaders();

const addCacheBuster = (url) => {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}_t=${Date.now()}`;
};

const toQuery = (params = {}) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && `${v}` !== '') q.append(k, v);
  });
  const s = q.toString();
  return s ? `?${s}` : '';
};

async function handle(res) {
  const text = await res.text();
  let body = null;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null; // body có thể rỗng/không phải JSON
  }

  if (!res.ok) {
    const msg = body?.message || body?.error || text || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return body?.data || body || null;
}

/* =========================
   Topic Service
========================= */

const TopicService = {
  /* =====================================================
     TOPIC CRUD OPERATIONS
  ===================================================== */

  // Get all topics
  async getAllTopics(includeInactive = false, includeStats = false) {
    const params = {};
    if (includeInactive) params.include_inactive = 'true';
    if (includeStats) params.include_stats = 'true';
    
    const url = `${API_BASE_URL}/topics${toQuery(params)}`;
    const res = await fetch(addCacheBuster(url), { headers: authHeaders() });
    return handle(res);
  },

  // Get topic by name
  async getTopicByName(topicName, includeStats = false) {
    const params = includeStats ? { include_stats: 'true' } : {};
    const url = `${API_BASE_URL}/topics/${encodeURIComponent(topicName)}${toQuery(params)}`;
    const res = await fetch(addCacheBuster(url), { headers: authHeaders() });
    return handle(res);
  },

  // Get subtopics by main topic
  async getSubTopicsByMainTopic(topicName, includeStats = false) {
    const params = includeStats ? { include_stats: 'true' } : {};
    const url = `${API_BASE_URL}/topics/${encodeURIComponent(topicName)}/subtopics${toQuery(params)}`;
    const res = await fetch(addCacheBuster(url), { headers: authHeaders() });
    return handle(res);
  },

  // Create new topic
  async createTopic(topicData) {
    const res = await fetch(`${API_BASE_URL}/topics`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(topicData),
    });
    return handle(res);
  },

  // Update topic
  async updateTopic(topicName, topicData) {
    const res = await fetch(`${API_BASE_URL}/topics/${encodeURIComponent(topicName)}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(topicData),
    });
    return handle(res);
  },

  // Delete topic
  async deleteTopic(topicName) {
    const res = await fetch(`${API_BASE_URL}/topics/${encodeURIComponent(topicName)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return handle(res);
  },

  /* =====================================================
     SUBTOPIC CRUD OPERATIONS
  ===================================================== */

  // Add subtopic to main topic
  async addSubTopic(topicName, subTopicData) {
    const res = await fetch(`${API_BASE_URL}/topics/${encodeURIComponent(topicName)}/subtopics`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(subTopicData),
    });
    return handle(res);
  },

  // Update subtopic
  async updateSubTopic(topicName, subtopicId, subTopicData) {
    const res = await fetch(`${API_BASE_URL}/topics/${encodeURIComponent(topicName)}/subtopics/${encodeURIComponent(subtopicId)}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(subTopicData),
    });
    return handle(res);
  },

  // Delete subtopic
  async deleteSubTopic(topicName, subtopicId) {
    const res = await fetch(`${API_BASE_URL}/topics/${encodeURIComponent(topicName)}/subtopics/${encodeURIComponent(subtopicId)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return handle(res);
  },

  /* =====================================================
     TOPIC STATISTICS & VIEWS
  ===================================================== */

  // Get topic statistics
  async getTopicStatistics() {
    const url = `${API_BASE_URL}/topics/statistics`;
    const res = await fetch(addCacheBuster(url), { headers: authHeaders() });
    return handle(res);
  },

  // Increment topic views
  async incrementTopicViews(topicName, type) {
    const res = await fetch(`${API_BASE_URL}/topics/${encodeURIComponent(topicName)}/views`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ type }),
    });
    return handle(res);
  },

  // Increment subtopic views
  async incrementSubTopicViews(topicName, subtopicId, type) {
    const res = await fetch(`${API_BASE_URL}/topics/${encodeURIComponent(topicName)}/subtopics/${encodeURIComponent(subtopicId)}/views`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ type }),
    });
    return handle(res);
  },

  /* =====================================================
     HELPER METHODS
  ===================================================== */

  // Get specific subtopic by ID
  async getSubTopicById(topicName, subtopicId, includeStats = false) {
    const params = includeStats ? { include_stats: 'true' } : {};
    const url = `${API_BASE_URL}/topics/${encodeURIComponent(topicName)}/subtopics/${encodeURIComponent(subtopicId)}${toQuery(params)}`;
    const res = await fetch(addCacheBuster(url), { headers: authHeaders() });
    return handle(res);
  },

  // Bulk update subtopics
  async bulkUpdateSubTopics(topicName, subtopics) {
    const res = await fetch(`${API_BASE_URL}/topics/${encodeURIComponent(topicName)}/subtopics`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ subtopics }),
    });
    return handle(res);
  },
};

export default TopicService;
