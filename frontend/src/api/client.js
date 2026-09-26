const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function getToken() {
  return localStorage.getItem('nr_token')
}

export function setToken(token) {
  localStorage.setItem('nr_token', token)
}

export function clearToken() {
  localStorage.removeItem('nr_token')
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    let detail = `Request failed (${res.status})`
    try {
      const data = await res.json()
      detail = data.detail || detail
    } catch {
      /* non-JSON error body */
    }
    throw new Error(detail)
  }

  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) return res.json()
  return res.blob()
}

export const api = {
  createGuestSession: () => request('/api/auth/guest', { method: 'POST', auth: false }),
  signup: (data) => request('/api/auth/signup', { method: 'POST', body: data }),
  login: (data) => request('/api/auth/login', { method: 'POST', body: data, auth: false }),
  me: () => request('/api/auth/me'),

  generateQuiz: (data) => request('/api/quiz/generate', { method: 'POST', body: data }),
  submitQuiz: (data) => request('/api/quiz/submit', { method: 'POST', body: data }),

  generateProblem: (data) => request('/api/coding/generate', { method: 'POST', body: data }),
  runCode: (data) => request('/api/coding/run', { method: 'POST', body: data }),

  startInterview: (data) => request('/api/interview/start', { method: 'POST', body: data }),
  replyInterview: (data) => request('/api/interview/reply', { method: 'POST', body: data }),

  createRoom: (data) => request('/api/rooms/create', { method: 'POST', body: data }),
  joinRoom: (data) => request('/api/rooms/join', { method: 'POST', body: data }),

  dashboard: () => request('/api/analytics/dashboard'),
  reportCardUrl: () => `${API_URL}/api/analytics/report-card.pdf`,

  listReviews: () => request('/api/reviews'),
  createReview: (data) => request('/api/reviews', { method: 'POST', body: data }),
}

export function wsUrl(code) {
  const base = API_URL.replace('http', 'ws')
  return `${base}/api/rooms/ws/${code}?token=${getToken()}`
}

export { getToken, API_URL }
