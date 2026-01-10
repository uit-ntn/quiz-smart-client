const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

/* =====================================================
 * HELPERS
 * ===================================================== */
const getToken = () => localStorage.getItem('token') || '';

const jsonHeaders = () => ({
  'Content-Type': 'application/json',
});

const authHeaders = () =>
  getToken()
    ? { ...jsonHeaders(), Authorization: `Bearer ${getToken()}` }
    : jsonHeaders();

const toQuery = (obj = {}) => {
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined && v !== null && `${v}` !== '') {
      p.append(k, v);
    }
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
    console.error('❌ HTTP Error:', {
      status: res.status,
      statusText: res.statusText,
      url: res.url,
      body,
      text
    });

    if (res.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      try {
        window.location.href = '/login';
      } catch {}
    }

    const msg =
      (body && (body.message || body.error)) ||
      text ||
      `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return body ?? { success: true };
}

/* =====================================================
 * SERVICE
 * ===================================================== */
const testResultService = {
  /* -------------------------------------------------
   * CREATE
   * BE sẽ tự build test_snapshot
   * ------------------------------------------------- */
  async createTestResult(payload) {
    console.log('🚀 testResultService.createTestResult called with:', payload);
    
    const res = await fetch(`${API_BASE_URL}/test-results`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });

    console.log('📡 Response status:', res.status, res.statusText);
    
    const data = await handle(res);
    console.log('📥 Response data:', data);
    
    return data.result;
  },

  /* -------------------------------------------------
   * LIST (ADMIN / USER)
   * filters: { test_id?, user_id?, status? }
   * ------------------------------------------------- */
  async getAllTestResults(filters = {}) {
    const res = await fetch(
      `${API_BASE_URL}/test-results${toQuery(filters)}`,
      {
        method: 'GET',
        headers: authHeaders(),
      }
    );

    const data = await handle(res);
    return data.results || [];
  },

  /* -------------------------------------------------
   * GET BY ID
   * ------------------------------------------------- */
  async getTestResultById(id) {
    const res = await fetch(
      `${API_BASE_URL}/test-results/${id}`,
      {
        method: 'GET',
        headers: authHeaders(),
      }
    );

    const data = await handle(res);
    return data.result;
  },

  /* -------------------------------------------------
   * UPDATE METADATA ONLY
   * ------------------------------------------------- */
  async updateTestResult(id, payload) {
    const res = await fetch(
      `${API_BASE_URL}/test-results/${id}`,
      {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      }
    );

    const data = await handle(res);
    return data.result;
  },

  /* -------------------------------------------------
   * STATUS
   * owner: draft -> active
   * admin: free
   * ------------------------------------------------- */
  async updateStatusById(id, status) {
    console.log('🔄 testResultService.updateStatusById called:', { id, status });
    
    const res = await fetch(
      `${API_BASE_URL}/test-results/${id}/status`,
      {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      }
    );

    console.log('📡 Status update response:', res.status, res.statusText);
    
    const data = await handle(res);
    console.log('📥 Status update data:', data);
    
    return data.result;
  },

  /* -------------------------------------------------
   * STATISTICS
   * ------------------------------------------------- */
  async getMyStatistics() {
    const res = await fetch(
      `${API_BASE_URL}/test-results/my-statistics`,
      {
        method: 'GET',
        headers: authHeaders(),
      }
    );

    const data = await handle(res);
    return data.statistics;
  },

  async getUserStatistics(userId) {
    const res = await fetch(
      `${API_BASE_URL}/test-results/user/${userId}/statistics`,
      {
        method: 'GET',
        headers: authHeaders(),
      }
    );

    const data = await handle(res);
    return data.statistics;
  },


   async getMyTestResults(filters = {}) {
    const res = await fetch(
      `${API_BASE_URL}/test-results/my-results${toQuery(filters)}`,
      {
        method: 'GET',
        headers: authHeaders(),
      }
    );

    const data = await handle(res);
    return data.results || [];
  },


  /* -------------------------------------------------
   * DELETE / RESTORE
   * ------------------------------------------------- */
  async softDeleteTestResult(id) {
    const res = await fetch(
      `${API_BASE_URL}/test-results/${id}`,
      {
        method: 'DELETE',
        headers: authHeaders(),
      }
    );

    const data = await handle(res);
    return data.result;
  },

  async hardDeleteTestResult(id) {
    const res = await fetch(
      `${API_BASE_URL}/test-results/${id}/hard-delete`,
      {
        method: 'DELETE',
        headers: authHeaders(),
      }
    );

    const data = await handle(res);
    return data.result;
  },

  async restoreTestResult(id) {
    const res = await fetch(
      `${API_BASE_URL}/test-results/${id}/restore`,
      {
        method: 'PATCH',
        headers: authHeaders(),
      }
    );

    const data = await handle(res);
    return data.result;
  },

  // Get top test takers (users who completed the most tests)
  async getTopTestTakers(limit = 5) {
    const res = await fetch(
      `${API_BASE_URL}/test-results/top-test-takers?limit=${limit}`,
      {
        method: 'GET',
        headers: authHeaders(),
      }
    );

    const data = await handle(res);
    return data.users || [];
  },
};

export default testResultService;
