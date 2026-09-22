const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request(endpoint, options = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  const res = await fetch(`${API_URL}${endpoint}`, config);

  // Handle CSV downloads
  if (res.headers.get('content-type')?.includes('text/csv')) {
    const blob = await res.blob();
    return blob;
  }

  const data = await res.json();

  if (!res.ok) {
    throw new ApiError(
      data?.error?.message || 'Something went wrong',
      res.status,
      data?.error?.code
    );
  }

  return data;
}

// Auth
export const api = {
  auth: {
    login: (credentials) => request('/api/auth/login', { method: 'POST', body: credentials }),
    me: () => request('/api/auth/me'),
    getMe: () => request('/api/auth/me'),
    changePassword: (data) => request('/api/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),
    updatePassword: (data) => request('/api/auth/update-password', { method: 'POST', body: JSON.stringify(data) }),
  },

  // Admin
  admin: {
    // Teams
    getTeams: (query = '') => request(`/api/admin/teams?${query}`),
    getTeam: (id) => request(`/api/admin/teams/${id}`),
    createTeam: (data) => request('/api/admin/teams', { method: 'POST', body: data }),
    bulkCreateTeams: (data) => request('/api/admin/teams/bulk', { method: 'POST', body: data }),
    updateTeam: (id, data) => request(`/api/admin/teams/${id}`, { method: 'PATCH', body: data }),
    deleteTeam: (id) => request(`/api/admin/teams/${id}`, { method: 'DELETE' }),
    getTeamReport: (format = 'csv') => request(`/api/admin/teams/export?format=${format}`),

    // Bulk Import
    previewBulkImport: (formData) => request('/api/admin/teams/bulk-import/preview', { method: 'POST', body: formData }),
    confirmBulkImport: (data) => request('/api/admin/teams/bulk-import/confirm', { method: 'POST', body: data }),

    // Reset Password
    resetPassword: (id, newPassword) => request(`/api/admin/teams/${id}/reset-password`, { method: 'POST', body: { newPassword } }),

    // Events
    getEvents: () => request('/api/admin/events'),
    getEvent: (id) => request(`/api/admin/events/${id}`),
    createEvent: (body) => request('/api/admin/events', { method: 'POST', body }),
    updateEvent: (id, body) => request(`/api/admin/events/${id}`, { method: 'PATCH', body }),
    startEvent: (id) => request(`/api/admin/events/${id}/start`, { method: 'POST' }),
    pauseEvent: (id) => request(`/api/admin/events/${id}/pause`, { method: 'POST' }),
    resumeEvent: (id) => request(`/api/admin/events/${id}/resume`, { method: 'POST' }),
    endEvent: (id) => request(`/api/admin/events/${id}/end`, { method: 'POST' }),
    deleteEvent: (id) => request(`/api/admin/events/${id}`, { method: 'DELETE' }),
    validateEvent: (id) => request(`/api/admin/events/${id}/validate`),

    // Rounds
    getRounds: (eventId) => request(`/api/admin/rounds?eventId=${eventId || ''}`),
    getRound: (id) => request(`/api/admin/rounds/${id}`),
    createRound: (body) => request('/api/admin/rounds', { method: 'POST', body }),
    updateRound: (id, body) => request(`/api/admin/rounds/${id}`, { method: 'PATCH', body }),
    deleteRound: (id) => request(`/api/admin/rounds/${id}`, { method: 'DELETE' }),
    startRound: (id) => request(`/api/admin/rounds/${id}/start`, { method: 'POST' }),
    pauseRound: (id) => request(`/api/admin/rounds/${id}/pause`, { method: 'POST' }),
    resumeRound: (id) => request(`/api/admin/rounds/${id}/resume`, { method: 'POST' }),
    endRound: (id) => request(`/api/admin/rounds/${id}/end`, { method: 'POST' }),

    // Tasks
    getTasks: (roundId) => request(`/api/admin/tasks?roundId=${roundId || ''}`),
    getTask: (id) => request(`/api/admin/tasks/${id}`),
    createTask: (body) => request('/api/admin/tasks', { method: 'POST', body }),
    updateTask: (id, body) => request(`/api/admin/tasks/${id}`, { method: 'PATCH', body }),
    deleteTask: (id) => request(`/api/admin/tasks/${id}`, { method: 'DELETE' }),

    // Locations
    getLocations: (eventId) => request(`/api/admin/locations?eventId=${eventId || ''}`),
    createLocation: (body) => request('/api/admin/locations', { method: 'POST', body }),
    updateLocation: (id, body) => request(`/api/admin/locations/${id}`, { method: 'PATCH', body }),
    deleteLocation: (id) => request(`/api/admin/locations/${id}`, { method: 'DELETE' }),

    // QR
    getQRCodes: () => request('/api/admin/qr'),
    getQR: (taskId) => request(`/api/admin/qr/${taskId}`),
    regenerateQR: (taskId) => request(`/api/admin/qr/${taskId}/regenerate`, { method: 'POST' }),

    // Results
    getOverview: () => request('/api/admin/results/overview'),
    getLiveProgress: () => request(`/api/admin/results/live-leaderboard`),
    getRoundResults: (roundId) => request(`/api/admin/results/round/${roundId}`),
    getRecentActivity: () => request('/api/admin/results/recent-activity'),

    // Reports
    getTeamReport: (format) => request(`/api/admin/reports/teams?format=${format || ''}`),
    getRoundReport: (roundId, format) => request(`/api/admin/reports/round-results/${roundId}?format=${format || ''}`),
    getTaskReport: (roundId, format) => request(`/api/admin/reports/task-results/${roundId}?format=${format || ''}`),
    getFullReport: (format) => request(`/api/admin/reports/full?format=${format || ''}`),

    // Round 2 Config
    getRound2Config: (roundId) => request(`/api/admin/round2-config/${roundId}`),
    updateRound2Config: (roundId, body) => request(`/api/admin/round2-config/${roundId}`, { method: 'PUT', body }),

    // Assignments
    getRoundAssignments: (roundId) => request(`/api/admin/rounds/${roundId}/assignments`),
  },

  // Team
  team: {
    getDashboard: () => request('/api/team/dashboard'),
    getTask: (token) => request(`/api/team/tasks/${token}`),
    submitAnswer: (taskId, answer) => request(`/api/team/tasks/${taskId}/answer`, { method: 'POST', body: { answer } }),
    getProgress: () => request('/api/team/progress'),
    getRound2: (roundId) => request(`/api/team/tasks/round2/${roundId}`),
  },
};

export { ApiError };
export default api;
