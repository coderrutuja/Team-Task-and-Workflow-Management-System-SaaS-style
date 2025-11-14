import { create } from 'zustand'
import { seed } from '../mocks/tasks'

export const useTasksStore = create((set, get) => ({
  columns: seed.columns,
  tasks: seed.tasks,
  loading: false,
  toasts: [],
  selectedProjectId: (typeof window !== 'undefined' && window.localStorage.getItem('tm_project')) || import.meta?.env?.VITE_PROJECT_ID || '',
  filter: { q: '', label: 'all', status: 'all', sort: 'none' },
  modal: { open: false, selectedId: null, mode: 'view' },

  moveTask(taskId, toColumnId, toIndex) {
    const { tasks } = get()
    const t = tasks.find(x => x.id === taskId)
    if (!t) return
    t.status = toColumnId
    // reorder within column
    const same = tasks.filter(x => x.status === toColumnId && x.id !== taskId)
    same.splice(toIndex, 0, t)
    const others = tasks.filter(x => x.status !== toColumnId)
    set({ tasks: [...others, ...same] })
  },

  setTasks(newTasks) {
    set({ tasks: Array.isArray(newTasks) ? newTasks : [] })
  },

  setLoading(v) { set({ loading: !!v }) },
  setSelectedProjectId(id) { 
    const val = id || ''
    if (typeof window !== 'undefined') window.localStorage.setItem('tm_project', val)
    set({ selectedProjectId: val }) 
  },
  pushToast(message, type = 'info') {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2,6)}`
    set({ toasts: [...get().toasts, { id, message, type }] })
    setTimeout(() => {
      const cur = get().toasts
      set({ toasts: cur.filter(t => t.id !== id) })
    }, 2500)
  },

  createTask(payload) {
    const id = payload.id || `t_${Date.now()}`
    set({ tasks: [...get().tasks, { id, ...payload }] })
    return id
  },

  updateTask(id, patch) {
    set({ tasks: get().tasks.map(t => t.id === id ? {...t, ...patch} : t) })
  },

  openTask(id) {
    set({ modal: { open: true, selectedId: id || null, mode: id ? 'edit' : 'create' } })
  },
  closeTask() {
    set({ modal: { open: false, selectedId: null, mode: 'view' } })
  },
  selectedTask() {
    const { modal, tasks } = get()
    return tasks.find(t => t.id === modal.selectedId) || null
  },

  setFilter(patch) {
    set({ filter: { ...get().filter, ...patch } })
  },
  tasksFiltered() {
    const { tasks, filter } = get()
    const q = filter.q?.toLowerCase() || ''
    const filtered = tasks.filter(t => {
      const matchesQ = q ? (t.title?.toLowerCase().includes(q) || (t.labels||[]).some(l => l.toLowerCase().includes(q))) : true
      const matchesStatus = filter.status === 'all' ? true : t.status === filter.status
      return matchesQ && matchesStatus
    })
    if (filter.sort === 'dueAsc') return [...filtered].sort((a,b)=>new Date(a.due||'2100-01-01')-new Date(b.due||'2100-01-01'))
    if (filter.sort === 'dueDesc') return [...filtered].sort((a,b)=>new Date(b.due||'1900-01-01')-new Date(a.due||'1900-01-01'))
    return filtered
  }
}))