// =========================
// 📘 src/services/testService.js (final)
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

  return body ?? { success: true };
}

/* =========================
   Normalizers
========================= */

const asArray = (x) => (Array.isArray(x) ? x : []);
const pickTests = (data) => asArray(data?.tests || (Array.isArray(data) ? data : []));
const pickTest = (data) => data?.test || data;

/* =========================
   Service
========================= */

const TestService = {
  /* ---------- CREATE ---------- */
  async createTest(payload) {
    const res = await fetch(`${API_BASE_URL}/tests`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await handle(res);
    return pickTest(data);
  },

  /* ---------- READ ---------- */
  async getAllTests(filters = {}) {
    // ✅ Support both old (main_topic/sub_topic) and new (topic_id/subtopic_id) filters
    const res = await fetch(`${API_BASE_URL}/tests${toQuery(filters)}`, {
      headers: authHeaders(),
    });
    const data = await handle(res);
    return pickTests(data);
  },

  async getMyTests(filters = {}) {
    const res = await fetch(`${API_BASE_URL}/tests/my-tests${toQuery(filters)}`, {
      headers: authHeaders(),
    });
    const data = await handle(res);
    return pickTests(data);
  },

  async getTestById(id) {
    const res = await fetch(`${API_BASE_URL}/tests/${id}`, {
      headers: authHeaders(),
    });
    const data = await handle(res);
    return pickTest(data);
  },

  /* ---------- UPDATE ---------- */
  async updateTest(id, payload) {
    const res = await fetch(`${API_BASE_URL}/tests/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await handle(res);
    return pickTest(data);
  },

  /* ---------- DELETE ---------- */
  async softDeleteTest(id) {
    const res = await fetch(`${API_BASE_URL}/tests/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return handle(res); // { success, message, test }
  },

  async hardDeleteTest(id) {
    const res = await fetch(`${API_BASE_URL}/tests/${id}/hard-delete`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return handle(res); // { success, message }
  },

  /* ---------- SEARCH ---------- */
  async searchTests(keyword) {
    const res = await fetch(
      `${API_BASE_URL}/tests/search?q=${encodeURIComponent(keyword)}`,
      { headers: authHeaders() }
    );
    const data = await handle(res);
    return pickTests(data);
  },

  /* ---------- FILTER BY TYPE ---------- */
  async getTestsByType(testType) {
    const res = await fetch(`${API_BASE_URL}/tests/type/${testType}`, {
      headers: authHeaders(),
    });
    const data = await handle(res);
    return pickTests(data);
  },

  /* ---------- FILTER BY TOPIC ---------- */
  async getTestsByTopic(mainTopic, subTopic) {
    const url = subTopic
      ? `${API_BASE_URL}/tests/topic/${encodeURIComponent(mainTopic)}/${encodeURIComponent(subTopic)}`
      : `${API_BASE_URL}/tests/topic/${encodeURIComponent(mainTopic)}`;

    const res = await fetch(addCacheBuster(url), { headers: authHeaders() });
    const data = await handle(res);
    return pickTests(data);
  },

  // ✅ NEW: Get tests by topic_id and subtopic_id (using new Topic model)
  async getTestsByTopicId(topicId, subtopicId = null, filters = {}) {
    const queryParams = {
      topic_id: topicId,
      ...filters
    };
    
    if (subtopicId) {
      queryParams.subtopic_id = subtopicId;
    }

    const res = await fetch(`${API_BASE_URL}/tests${toQuery(queryParams)}`, {
      headers: authHeaders(),
    });
    const data = await handle(res);
    return pickTests(data);
  },


  /* =====================================================
     MULTIPLE CHOICE
  ===================================================== */
  async getAllMultipleChoicesTests() {
    const res = await fetch(`${API_BASE_URL}/tests/multiple-choices`, {
      headers: authHeaders(),
    });
    const data = await handle(res);
    return pickTests(data);
  },

  /* =====================================================
     GRAMMAR
  ===================================================== */
  async getAllGrammarsTests() {
    const res = await fetch(`${API_BASE_URL}/tests/grammars`, {
      headers: authHeaders(),
    });
    const data = await handle(res);
    return pickTests(data);
  },

  /* =====================================================
     VOCABULARY
  ===================================================== */
  async getAllVocabulariesTests() {
    const res = await fetch(addCacheBuster(`${API_BASE_URL}/tests/vocabularies`), {
      headers: authHeaders(),
    });
    const data = await handle(res);
    return pickTests(data);
  },

  /* =====================================================
     STATISTICS & ANALYTICS
  ===================================================== */
  async getTopTakenTests(filters = {}) {
    const queryString = toQuery(filters);
    const url = `${API_BASE_URL}/tests/top-taken${queryString}`;
    
    const res = await fetch(url, {
      method: 'GET',
      headers: authHeaders(),
    });
    
    const data = await handle(res);
    return data.tests || (Array.isArray(data) ? data : []);
  },

  // Get top scoring tests (highest average scores)
  async getTopScoringTests(filters = {}) {
    const queryString = toQuery(filters);
    const url = `${API_BASE_URL}/tests/top-scoring${queryString}`;
    
    const res = await fetch(url, {
      method: 'GET',
      headers: authHeaders(),
    });
    
    const data = await handle(res);
    return data.tests || (Array.isArray(data) ? data : []);
  },

  // Get newest tests (most recently created)
  async getNewestTests(filters = {}) {
    const queryString = toQuery(filters);
    const url = `${API_BASE_URL}/tests/newest${queryString}`;
    
    const res = await fetch(url, {
      method: 'GET',
      headers: authHeaders(),
    });
    
    const data = await handle(res);
    return data.tests || (Array.isArray(data) ? data : []);
  },

  // Get test attempt count
  async getTestAttemptCount(testId) {
    const res = await fetch(`${API_BASE_URL}/tests/${testId}/attempt-count`, {
      method: 'GET',
      headers: authHeaders(),
    });
    
    const data = await handle(res);
    return data;
  },

  // Get topic attempt count
  async getTopicAttemptCount(mainTopic, testType = null) {
    const queryString = testType ? `?test_type=${encodeURIComponent(testType)}` : '';
    const url = `${API_BASE_URL}/tests/topic/${encodeURIComponent(mainTopic)}/attempt-count${queryString}`;
    
    const res = await fetch(url, {
      method: 'GET',
      headers: authHeaders(),
    });
    
    const data = await handle(res);
    return data;
  },


  /* =====================================================
     TEST MANAGEMENT
  ===================================================== */
  // Merge multiple tests into one target test
  async mergeTests(targetTestId, sourceTestIds) {
    const res = await fetch(`${API_BASE_URL}/tests/merge`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        targetTestId,
        sourceTestIds
      }),
    });
    
    return handle(res);
  },

  // Move a multiple choice question to another test
  async moveMultipleChoiceQuestion(questionId, targetTestId) {
    const res = await fetch(`${API_BASE_URL}/multiple-choices/${questionId}/move`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({
        target_test_id: targetTestId
      }),
    });
    
    return handle(res);
  },
};

export default TestService;
