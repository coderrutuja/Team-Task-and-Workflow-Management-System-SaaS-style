const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

function getToken() {
  return localStorage.getItem('tm_token') || ''
}

function setToken(token) {
  if (token) localStorage.setItem('tm_token', token)
}

function setUser(user) {
  if (user) localStorage.setItem('tm_user', JSON.stringify(user))
}

function getUser() {
  try { return JSON.parse(localStorage.getItem('tm_user')||'null') } catch { return null }
}

async function request(path, { method = 'GET', body, params } = {}) {
  const url = new URL(path, API_URL)
  if (params) Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, v))
  const res = await fetch(url.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    if (res.status === 401) {
      try {
        localStorage.removeItem('tm_token')
        localStorage.removeItem('tm_user')
      } catch {}
      try {
        if (typeof window !== 'undefined') {
          const here = window.location.pathname
          if (!here.startsWith('/auth')) window.location.assign('/auth/login')
        }
      } catch {}
    }
    const msg = (await res.json().catch(()=>({}))).error || (res.status === 401 ? 'Unauthorized. Please sign in again.' : `HTTP ${res.status}`)
    throw new Error(msg)
  }
  return res.json()
}

export const api = {
  setToken,
  getToken,
  getUser,
  async getUsers(params) {
    const res = await request('/users', { params })
    return res?.items || []
  },
  async getNotifications(params) {
    const res = await request('/notifications', { params })
    return { items: res?.items || [], unread: res?.unread || 0 }
  },
  async markNotificationRead(id) {
    return request(`/notifications/${id}/read`, { method: 'PATCH' })
  },
  async triggerDueNotifications() {
    return request('/notifications/trigger-due', { method: 'POST' })
  },
  async requestFile(id) {
    return request(`/files/${id}`)
  },
  async getProject(id) {
    return request(`/projects/${id}`)
  },
  async getUsersMinByIds(ids = []) {
    const url = new URL('/users/min/by-ids', API_URL)
    url.searchParams.set('ids', ids.join(','))
    return request(url.pathname + url.search)
  },
  async register(name, email, password) {
    const data = await request('/auth/register', { method: 'POST', body: { name, email, password } })
    setToken(data.token)
    setUser(data.user)
    return data
  },
  async login(email, password) {
    const data = await request('/auth/login', { method: 'POST', body: { email, password } })
    setToken(data.token)
    setUser(data.user)
    return data
  },
  async getProjects(params) {
    const res = await request('/projects', { params })
    // normalize to array for existing callers
    return res?.items ?? res
  },
  async createProject(payload) {
    return request('/projects', { method: 'POST', body: payload })
  },
  async updateProject(id, payload) {
    return request(`/projects/${id}`, { method: 'PATCH', body: payload })
  },
  async deleteProject(id) {
    return request(`/projects/${id}`, { method: 'DELETE' })
  },
  async getTasksByProject(projectId, params) {
    const res = await request(`/tasks/project/${projectId}`, { params })
    const items = Array.isArray(res) ? res : (res?.items || [])
    return items.map(mapTask)
  },
  async getTasksPaged(projectId, params) {
    const res = await request(`/tasks/project/${projectId}`, { params })
    const items = (res?.items || []).map(mapTask)
    return { items, total: res?.total ?? items.length, page: res?.page ?? 1, size: res?.size ?? (params?.size || items.length) }
  },
  async createTask(projectId, payload) {
    const t = await request(`/tasks/project/${projectId}`, { method: 'POST', body: payload })
    return mapTask(t)
  },
  async updateTask(id, payload) {
    const t = await request(`/tasks/${id}`, { method: 'PATCH', body: payload })
    return mapTask(t)
  },
  async addTaskDependency(id, predecessorId) {
    return request(`/tasks/${id}/dependencies`, { method: 'POST', body: { predecessorId } })
  },
  async removeTaskDependency(id, predecessorId) {
    return request(`/tasks/${id}/dependencies/${predecessorId}`, { method: 'DELETE' })
  },
  async getTimeEntries(id) {
    return request(`/tasks/${id}/time-entries`)
  },
  async addTimeEntry(id, { hours, note, at }) {
    return request(`/tasks/${id}/time-entries`, { method: 'POST', body: { hours, note, at } })
  },
  async deleteTimeEntry(id, entryId) {
    return request(`/tasks/${id}/time-entries/${entryId}`, { method: 'DELETE' })
  },
  async deleteTask(id) {
    return request(`/tasks/${id}`, { method: 'DELETE' })
  },
  async uploadFile(name, blobOrBase64, mime) {
    let contentBase64 = ''
    if (typeof blobOrBase64 === 'string') contentBase64 = blobOrBase64
    else contentBase64 = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve((reader.result||'').toString().split(',')[1] || '')
      reader.onerror = reject
      reader.readAsDataURL(blobOrBase64)
    })
    return request('/files', { method: 'POST', body: { name, contentBase64, mime } })
  },
  async attachFileToTask(taskId, fileId) {
    return request(`/tasks/${taskId}/attachments`, { method: 'POST', body: { fileId } })
  },
  async detachFileFromTask(taskId, fileId) {
    return request(`/tasks/${taskId}/attachments/${fileId}`, { method: 'DELETE' })
  },
  async reorderTask(id, payload) {
    const res = await request(`/tasks/${id}/reorder`, { method: 'PATCH', body: payload })
    return { ...res, items: Array.isArray(res.items) ? res.items.map(mapTask) : [] }
  },
  async getProjectSummary(projectId, params) {
    return request(`/tasks/project/${projectId}/summary`, { params })
  },
  // Groups
  async getGroups(params) {
    const res = await request('/groups', { params })
    return res?.items ?? res
  },
  async createGroup(payload) {
    return request('/groups', { method: 'POST', body: payload })
  },
  async updateGroup(id, payload) {
    return request(`/groups/${id}`, { method: 'PATCH', body: payload })
  },
  async deleteGroup(id) {
    return request(`/groups/${id}`, { method: 'DELETE' })
  },
  // Admin users
  async adminGetUser(id) {
    return request(`/users/${id}`)
  },
  async adminCreateUser(payload) {
    return request('/users', { method: 'POST', body: payload })
  },
  async adminUpdateUser(id, payload) {
    return request(`/users/${id}`, { method: 'PATCH', body: payload })
  },
  async adminSetUserStatus(id, status) {
    return request(`/users/${id}/status`, { method: 'PATCH', body: { status } })
  },
  async adminResetPassword(id, password) {
    return request(`/users/${id}/password`, { method: 'PATCH', body: { password } })
  },
  async getTaskComments(id) {
    const res = await request(`/tasks/${id}/comments`)
    return Array.isArray(res?.comments) ? res.comments : []
  },
  async addTaskComment(id, text) {
    const res = await request(`/tasks/${id}/comments`, { method: 'POST', body: { text } })
    return Array.isArray(res?.comments) ? res.comments : []
  },
  async deleteTaskComment(id, commentId) {
    return request(`/tasks/${id}/comments/${commentId}`, { method: 'DELETE' })
  },
  async getTaskActivity(id) {
    const res = await request(`/tasks/${id}/activity`)
    return Array.isArray(res?.items) ? res.items : []
  },
  exportCsvUrl(projectId, params) {
    const url = new URL(`/tasks/project/${projectId}/export.csv`, API_URL)
    Object.entries(params||{}).forEach(([k,v])=> v!=null && url.searchParams.set(k,v))
    return url.toString()
  },
  exportPdfUrl(projectId, params) {
    const url = new URL(`/tasks/project/${projectId}/export.pdf`, API_URL)
    Object.entries(params||{}).forEach(([k,v])=> v!=null && url.searchParams.set(k,v))
    return url.toString()
  },
  // Placeholder for future XLSX route
  exportXlsxUrl(projectId, params) {
    const url = new URL(`/tasks/project/${projectId}/export.xlsx`, API_URL)
    Object.entries(params||{}).forEach(([k,v])=> v!=null && url.searchParams.set(k,v))
    return url.toString()
  }
}

function mapTask(t) {
  return {
    id: t._id || t.id,
    title: t.title,
    status: t.status,
    due: t.dueDate || t.due || null,
    labels: t.labels || [],
    members: (t.assignees || t.members || []).map(String),
    description: t.description || '',
    priority: t.priority || 'medium',
    projectId: String(t.project || t.projectId || ''),
    updatedAt: t.updatedAt || null,
    attachments: (t.attachments || []).map(String),
    predecessors: (t.predecessors || []).map(String),
    timeTotalHours: t.timeTotalHours || 0,
  }
}
