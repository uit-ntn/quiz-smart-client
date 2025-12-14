// =========================
// 📘 src/services/vocabularyService.js (functions)
// =========================
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// ---- Helpers
const token = () => localStorage.getItem('token') || '';
const jsonHeaders = () => ({ 'Content-Type': 'application/json' });
const authHeaders = () =>
  token() ? { ...jsonHeaders(), Authorization: `Bearer ${token()}` } : jsonHeaders();

const toQuery = (obj = {}) => {
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined && v !== null && `${v}` !== '') p.append(k, v);
  });
  const s = p.toString();
  return s ? `?${s}` : '';
};

async function handle(res) {
  const text = await res.text();
  let body = null;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  if (!res.ok) {
    const msg = body?.message || body?.error || text || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return body ?? { success: true };
}

/* =========================
   READ
========================= */

export async function getAllVocabularies(filters = {}) {
  const res = await fetch(`${API_BASE_URL}/vocabularies${toQuery(filters)}`, {
    headers: authHeaders(),
  });
  const data = await handle(res);
  return Array.isArray(data.vocabularies) ? data.vocabularies : (Array.isArray(data) ? data : []);
}

export async function getAllVocabulariesByTestId(testId) {
  const res = await fetch(`${API_BASE_URL}/vocabularies/test/${testId}`, {
    headers: authHeaders(),
  });
  const data = await handle(res);
  return Array.isArray(data.vocabularies) ? data.vocabularies : (Array.isArray(data) ? data : []);
}

export async function getVocabularyById(id) {
  const res = await fetch(`${API_BASE_URL}/vocabularies/${id}`, {
    headers: authHeaders(),
  });
  const data = await handle(res);
  return data.vocabulary || data;
}

export async function searchVocabularies(q) {
  const res = await fetch(`${API_BASE_URL}/vocabularies/search?q=${encodeURIComponent(q)}`, {
    headers: authHeaders(),
  });
  const data = await handle(res);
  return Array.isArray(data.vocabularies) ? data.vocabularies : (Array.isArray(data) ? data : []);
}

export async function getRandomVocabularies(count = 10, filters = {}) {
  const list = await getAllVocabularies(filters);
  if (!list.length) return [];
  const shuffled = [...list].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/* =========================
   WRITE (auth required)
========================= */

export async function createVocabulary(payload) {
  const res = await fetch(`${API_BASE_URL}/vocabularies`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await handle(res);
  return data.vocabulary || data;
}

export async function updateVocabulary(id, payload) {
  const res = await fetch(`${API_BASE_URL}/vocabularies/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await handle(res);
  return data.vocabulary || data;
}

export async function deleteVocabulary(id) {
  const res = await fetch(`${API_BASE_URL}/vocabularies/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = await handle(res);
  return data.vocabulary || data || { success: true };
}

/* =========================
   DEFAULT EXPORT
========================= */
const VocabularyService = {
  getAllVocabularies,
  getAllVocabulariesByTestId,
  getVocabularyById,
  searchVocabularies,
  getRandomVocabularies,
  createVocabulary,
  updateVocabulary,
  deleteVocabulary,
};

export default VocabularyService;


/*
Vocaburaly Schema sample:
{
  _id: ObjectId(),
  test_id: ObjectId("670abcd123456789..."),
  word: "curriculum",
  meaning: "chương trình học",
  example_sentence: "Our school has introduced a new curriculum.",
  created_by: ObjectId("adminId"),
  created_at: ISODate(),
  updated_at: ISODate()
}
*/