import { DndContext, MouseSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, DragOverlay, closestCorners, pointerWithin } from '@dnd-kit/core'
import { restrictToWindowEdges, snapCenterToCursor } from '@dnd-kit/modifiers'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import Column from './Column'
import TaskCard from './TaskCard'
import { useTasksStore } from '../../store/useTasksStore'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/api'
import Skeleton from '../feedback/Skeleton'

export default function KanbanBoard() {
  const columns = useTasksStore(s => s.columns)
  const tasksRaw = useTasksStore(s => s.tasks)
  const filter = useTasksStore(s => s.filter)
  const moveTask = useTasksStore(s => s.moveTask)
  const setTasks = useTasksStore(s => s.setTasks)
  const setLoading = useTasksStore(s => s.setLoading)
  const pushToast = useTasksStore(s => s.pushToast)
  const loading = useTasksStore(s => s.loading)
  const selectedProjectId = useTasksStore(s => s.selectedProjectId)
  const [activeTask, setActiveTask] = useState(null)
  const projectId = selectedProjectId || import.meta.env.VITE_PROJECT_ID || ''
  const [userMap, setUserMap] = useState({})

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 2 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  )

  // Prefer columns when the pointer is inside them; otherwise use the default closestCorners
  function columnFriendlyCollisionDetection(args) {
    const intersections = pointerWithin(args)
    if (intersections.length > 0) {
      const columnsOnly = intersections.filter(i => String(i.id).startsWith('col-'))
      if (columnsOnly.length > 0) return columnsOnly
      return intersections
    }
    return closestCorners(args)
  }

  const tasks = useMemo(() => applyFilter(tasksRaw, filter), [tasksRaw, filter])
  const itemsByCol = id => tasks.filter(t => t.status === id)

  useEffect(() => {
    if (!projectId) {
      setTasks([])
      setLoading(false)
      setUserMap({})
      return
    }
    setLoading(true)
    ;(async () => {
      try {
        if (projectId === '_all') {
          const projects = await api.getProjects({ status: 'active' })
          const all = []
          for (const p of (projects||[])) {
            try {
              const items = await api.getTasksByProject(p._id, { status: filter.status, q: filter.q, sort: filter.sort })
              all.push(...items)
            } catch {}
          }
          setTasks(all)
        } else {
          const items = await api.getTasksByProject(projectId, { status: filter.status, q: filter.q, sort: filter.sort })
          setTasks(items)
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [projectId, filter.status, filter.q, filter.sort])

  // Load project members -> minimal user info map for avatars
  useEffect(() => {
    let cancelled = false
    async function loadUsers() {
      if (!projectId || projectId === '_all') { setUserMap({}); return }
      try {
        const p = await api.getProject(projectId)
        const memberIds = Array.isArray(p?.members) ? p.members.map(String) : []
        if (!memberIds.length) { setUserMap({}); return }
        const users = await api.getUsersMinByIds(memberIds)
        if (!cancelled) {
          const map = {}
          for (const u of users) map[String(u._id)] = { id: String(u._id), name: u.name || u.email || 'User', avatar: u.avatarUrl || '' }
          setUserMap(map)
        }
      } catch {
        if (!cancelled) setUserMap({})
      }
    }
    loadUsers()
    return () => { cancelled = true }
  }, [projectId])

  function onDragStart(e) {
    const task = tasks.find(t => t.id === e.active.id)
    setActiveTask(task || null)
  }

function applyFilter(tasks, filter) {
  const q = filter.q?.toLowerCase() || ''
  const filtered = (tasks||[]).filter(t => {
    const matchesQ = q ? (t.title?.toLowerCase().includes(q) || (t.labels||[]).some(l => l.toLowerCase().includes(q))) : true
    const matchesStatus = filter.status === 'all' ? true : t.status === filter.status
    const matchesLabel = filter.label === 'all' ? true : (t.labels||[]).includes(filter.label)
    return matchesQ && matchesStatus && matchesLabel
  })
  if (filter.sort === 'dueAsc') return [...filtered].sort((a,b)=>new Date(a.due||'2100-01-01')-new Date(b.due||'2100-01-01'))
  if (filter.sort === 'dueDesc') return [...filtered].sort((a,b)=>new Date(b.due||'1900-01-01')-new Date(a.due||'1900-01-01'))
  return filtered
}

  function onDragOver(e) {
    const { active, over } = e
    if (!over) return
    const activeTaskObj = tasks.find(t => t.id === active.id)
    if (!activeTaskObj) return

    // If dragging over a task, move before that task within its column
    const overTask = tasks.find(t => t.id === over.id)
    if (overTask) {
      const toColumnId = overTask.status
      const colTasks = itemsByCol(toColumnId)
      const toIndex = colTasks.findIndex(t => t.id === overTask.id)
      // Only move if position actually changes to avoid extra updates
      if (activeTaskObj.status !== toColumnId || colTasks[toIndex]?.id !== activeTaskObj.id) {
        moveTask(active.id, toColumnId, toIndex)
      }
      return
    }

    // Over a column container -> move to end of that column
    if (String(over.id).startsWith('col-')) {
      const toColumnId = String(over.id).replace('col-','')
      const toIndex = itemsByCol(toColumnId).length
      moveTask(active.id, toColumnId, toIndex)
    }
  }

  function onDragEnd(e) {
    const { active, over } = e
    if (!over) return setActiveTask(null)
    // If dropped over another task, position to that task's index/column
    const overTask = tasks.find(t => t.id === over.id)
    if (overTask) {
      const toColumnId = overTask.status
      const colTasks = itemsByCol(toColumnId)
      const toIndex = colTasks.findIndex(t => t.id === overTask.id)
      // optimistic
      moveTask(active.id, toColumnId, toIndex)
      if (projectId) {
        api.reorderTask(active.id, { status: toColumnId, order: toIndex })
          .then(({ items }) => { setTasks(items); pushToast('Task moved', 'success') })
          .catch(() => {})
      }
    } else if (String(over.id).startsWith('col-')) {
      const toColumnId = String(over.id).replace('col-','')
      const toIndex = itemsByCol(toColumnId).length
      moveTask(active.id, toColumnId, toIndex)
      if (projectId) {
        api.reorderTask(active.id, { status: toColumnId, order: toIndex })
          .then(({ items }) => { setTasks(items); pushToast('Task moved', 'success') })
          .catch(() => {})
      }
    }
    setActiveTask(null)
  }

  return (
    <div className="surface border border-default rounded-2xl p-4 relative">
      {!projectId ? (
        <div className="text-sm text-gray-600">
          <div className="font-medium mb-1">Select a project</div>
          <div>No project is selected. Choose a project from the left sidebar or create one in Projects.</div>
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <div className="grid gap-4 min-w-max" style={{gridTemplateColumns: `repeat(${columns.length}, minmax(280px, 1fr))`}}>
          <DndContext sensors={sensors} autoScroll collisionDetection={columnFriendlyCollisionDetection} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragOver={onDragOver}>
            {columns.map(col => (
              <div key={col.id}>
                {loading ? (
                  <div className="rounded-2xl border border-default surface p-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-gray-50 border border-default">
                        <span className="h-2 w-2 rounded-full bg-gray-300"></span>
                        <div className="h-4 w-16 bg-gray-100 rounded" />
                        <span className="h-3 w-6 bg-gray-100 rounded" />
                      </div>
                      <div className="h-7 w-7 bg-gray-100 rounded-md" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-16" />
                      <Skeleton className="h-16" />
                      <Skeleton className="h-16" />
                    </div>
                  </div>
                ) : (
                  <Column column={col} tasks={itemsByCol(col.id)} renderTask={(t,i)=> (
                    <TaskCard key={t.id} task={t} index={i} columnId={col.id} userMap={userMap} />
                  )} />
                )}
              </div>
            ))}
            <DragOverlay adjustScale={false} dropAnimation={{ duration: 150, easing: 'ease-out' }} modifiers={[snapCenterToCursor, restrictToWindowEdges]}>
              {activeTask ? <TaskCard task={activeTask} overlay /> : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>
      {activeTask && (
        <div className="absolute inset-0 pointer-events-none z-10">
          <div className="grid gap-4 p-4 min-w-max" style={{gridTemplateColumns: `repeat(${columns.length}, minmax(280px, 1fr))`}}>
            {columns.map(c => (
              <div key={`sk-${c.id}`} className="rounded-2xl border border-dashed border-indigo-200/60 bg-indigo-50/40 animate-pulse h-24" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}