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

const pickMainTopics = (data) =>
  asArray(data?.mainTopics || (Array.isArray(data) ? data : []));

const pickSubTopics = (data) =>
  asArray(data?.subTopics || (Array.isArray(data) ? data : []));

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

  async getAllMultipleChoiceMainTopics() {
    const res = await fetch(`${API_BASE_URL}/tests/multiple-choices/main-topics`, {
      headers: authHeaders(),
    });
    const data = await handle(res);
    return pickMainTopics(data);
  },

  async getMultipleChoiceSubTopicsByMainTopic(mainTopic) {
    const res = await fetch(
      `${API_BASE_URL}/tests/multiple-choices/sub-topics/${encodeURIComponent(mainTopic)}`,
      { headers: authHeaders() }
    );
    const data = await handle(res);
    return pickSubTopics(data);
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

  async getAllGrammarsMainTopics() {
    const res = await fetch(`${API_BASE_URL}/tests/grammars/main-topics`, {
      headers: authHeaders(),
    });
    const data = await handle(res);
    return pickMainTopics(data);
  },

  async getGrammarSubTopicsByMainTopic(mainTopic) {
    const res = await fetch(
      `${API_BASE_URL}/tests/grammars/sub-topics/${encodeURIComponent(mainTopic)}`,
      { headers: authHeaders() }
    );
    const data = await handle(res);
    return pickSubTopics(data);
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

  async getAllVocabulariesMainTopics() {
    const res = await fetch(addCacheBuster(`${API_BASE_URL}/tests/vocabularies/main-topics`), {
      headers: authHeaders(),
    });
    const data = await handle(res);
    return pickMainTopics(data);
  },

  async getVocabularySubTopicsByMainTopic(mainTopic) {
    const res = await fetch(
      `${API_BASE_URL}/tests/vocabularies/sub-topics/${encodeURIComponent(mainTopic)}`,
      { headers: authHeaders() }
    );
    const data = await handle(res);
    return pickSubTopics(data);
  },
};

export default TestService;
