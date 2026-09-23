const API_BASE_URL = 'http://localhost:8000';

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = window.localStorage.getItem('edurag-auth-token');
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

function hasAuthToken(): boolean {
  if (typeof window === 'undefined') return false;
  return !!window.localStorage.getItem('edurag-auth-token');
}

export async function apiDelete(endpoint: string, ids: string[]): Promise<boolean> {
  const isQuizzesEndpoint = endpoint.startsWith('/api/quizzes');
  if (!isQuizzesEndpoint && !hasAuthToken()) {
    console.warn(`[API] Delete request to ${endpoint} was skipped because no auth token is available.`, { ids });
    return false;
  }
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ ids }),
    });
    if (res.status === 401 && !isQuizzesEndpoint) {
      clearAuthToken();
    }
    if (res.ok) {
      console.log(`[MongoDB Backend] Successfully deleted items from ${endpoint}:`, ids);
    } else {
      const responseBody = await res.text().catch(() => 'Unable to read response body.');
      console.error(`[API] Delete request to ${endpoint} failed.`, {
        ids,
        status: res.status,
        statusText: res.statusText,
        responseBody,
      });
    }
    return res.ok;
  } catch (err) {
    console.warn(`[API] Delete request to ${endpoint} failed (backend offline or unavailable):`, err);
    return false;
  }
}

export async function apiPost(endpoint: string, data: any): Promise<boolean> {
  const isPublicAuthEndpoint =
    endpoint === '/api/auth' ||
    endpoint === '/api/auth/register' ||
    endpoint.startsWith('/api/quizzes') ||
    endpoint.startsWith('/api/quiz-');
  if (!isPublicAuthEndpoint && !hasAuthToken()) return false;
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    if (res.status === 401 && !isPublicAuthEndpoint) {
      clearAuthToken();
    }
    if (res.ok) {
      console.log(`[MongoDB Backend] Successfully posted to ${endpoint}:`, data);
    }
    return res.ok;
  } catch (err) {
    console.warn(`[API] Post request to ${endpoint} failed:`, err);
    return false;
  }
}

export async function apiPut(endpoint: string, data: any): Promise<boolean> {
  const isQuizzesEndpoint = endpoint.startsWith('/api/quizzes') || endpoint.startsWith('/api/quiz-');
  if (!isQuizzesEndpoint && !hasAuthToken()) return false;
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    if (res.status === 401 && !isQuizzesEndpoint) {
      clearAuthToken();
    }
    if (res.ok) {
      console.log(`[MongoDB Backend] Successfully updated ${endpoint}:`, data);
    }
    return res.ok;
  } catch (err) {
    console.warn(`[API] Put request to ${endpoint} failed:`, err);
    return false;
  }
}

export async function apiGet<T>(endpoint: string): Promise<T | null> {
  const isPublicEndpoint =
    endpoint === '/api/auth' ||
    endpoint.startsWith('/api/quizzes') ||
    endpoint.startsWith('/api/quiz-');
  if (!isPublicEndpoint && !hasAuthToken()) return null;
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: getAuthHeader(),
    });
    if (res.status === 401 && !isPublicEndpoint) {
      clearAuthToken();
    }
    if (res.ok) {
      return await res.json() as T;
    }
    return null;
  } catch (err) {
    console.warn(`[API] Get request to ${endpoint} failed:`, err);
    return null;
  }
}

function clearAuthToken() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('edurag-auth-token');
  }
}
