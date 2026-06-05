const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

/**
 * Core request helper with:
 * - configurable timeout (default 30s)
 * - one automatic retry on network-level failures (not HTTP errors)
 * - clear AbortError message
 */
async function request(path, options = {}, timeoutMs = 30000, _retryCount = 0) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      signal: controller.signal,
      ...options
    })
    clearTimeout(timer)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || data.message || `Server error (${res.status})`)
    return data
  } catch (err) {
    clearTimeout(timer)

    if (err.name === 'AbortError') {
      throw new Error('Request timed out — the server took too long to respond. Please try again.')
    }

    // Retry once on network-level failures (fetch failed, connection refused, etc.)
    if (_retryCount === 0 && (err.message === 'Failed to fetch' || err.message.includes('NetworkError') || err.message.includes('network'))) {
      console.warn(`[api] Network error on ${path}, retrying in 1s...`)
      await new Promise(r => setTimeout(r, 1000))
      return request(path, options, timeoutMs, 1)
    }

    throw err
  }
}

export const api = {
  // Plan generation can take up to 3 minutes for 1-year plans
  generatePlan: (payload) =>
    request('/generate-plan', { method: 'POST', body: JSON.stringify(payload) }, 180000),

  getDashboard: (userId) =>
    request(`/dashboard?userId=${userId}`, {}, 30000),

  getDiscover: (params) => {
    const q = new URLSearchParams(params).toString()
    return request(`/discover?${q}`, {}, 60000)
  },

  getVideos: (params) => {
    const q = new URLSearchParams(params).toString()
    return request(`/videos?${q}`, {}, 30000)
  },

  logProgress: (payload) =>
    request('/progress', { method: 'POST', body: JSON.stringify(payload) }, 30000),

  getProgress: (userId) =>
    request(`/progress?userId=${userId}`, {}, 30000),

  saveSong: (payload) =>
    request('/save-song', { method: 'POST', body: JSON.stringify(payload) }, 30000),

  removeSong: (payload) =>
    request('/save-song', { method: 'DELETE', body: JSON.stringify(payload) }, 30000),

  getProfile: (userId) =>
    request(`/profile?userId=${userId}`, {}, 30000),

  updateProfile: (payload) =>
    request('/profile', { method: 'PATCH', body: JSON.stringify(payload) }, 30000),

  getPlans: (userId) =>
    request(`/plans?userId=${userId}`, {}, 30000),

  setActivePlan: (payload) =>
    request('/plans/active', { method: 'POST', body: JSON.stringify(payload) }, 30000),
}
