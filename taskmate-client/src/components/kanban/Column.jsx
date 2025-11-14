import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import TaskCard from './TaskCard'
import { useState } from 'react'
import { useTasksStore } from '../../store/useTasksStore'
import { useDroppable, useDndContext } from '@dnd-kit/core'
import { api } from '../../lib/api'

export default function Column({ column, tasks, renderTask }) {
  const createTask = useTasksStore(s => s.createTask)
  const setTasks = useTasksStore(s => s.setTasks)
  const pushToast = useTasksStore(s => s.pushToast)
  const selectedProjectId = useTasksStore(s => s.selectedProjectId)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const { setNodeRef } = useDroppable({ id: `col-${column.id}` })
  const { over, active } = useDndContext() || {}
  const isOverColumn = over && String(over.id).startsWith('col-') && String(over.id) === `col-${column.id}`
  const projectId = selectedProjectId || ''

  async function onSubmit(e) {
    e.preventDefault()
    const t = title.trim()
    if (!t) return
    try {
      if (projectId && projectId !== '_all' && api.getToken()) {
        await api.createTask(projectId, { title: t, status: column.id, labels: [], dueDate: null, assignees: [] })
        const items = await api.getTasksByProject(projectId)
        setTasks(items)
        pushToast('Task created', 'success')
      } else {
        pushToast('Select a specific project to add tasks','info')
      }
    } finally {
      setTitle('')
      setAdding(false)
    }
  }
  return (
    <div className="rounded-2xl border border-default surface p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-gray-50 border border-default">
          <span className={`h-2 w-2 rounded-full ${dotColor(column.id)}`}></span>
          <div className="font-medium text-sm">{column.name}</div>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] border border-default bg-white text-gray-600">{tasks.length}</span>
        </div>
        <button onClick={()=>setAdding(v=>!v)} disabled={!projectId || projectId==='_all'} className="h-7 w-7 grid place-items-center rounded-md border border-default text-sm hover:bg-gray-50 disabled:opacity-50" title={!projectId || projectId==='_all' ? 'Select a specific project to add tasks' : 'Add task'}>+</button>
      </div>

      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`space-y-2 min-h-[120px] transition-all duration-150 ${isOverColumn ? 'bg-indigo-50/40 border border-dashed border-indigo-200/60 rounded-xl p-2' : ''}`}
        >
          {tasks.map((t, i) => (
            renderTask ? renderTask(t, i) : <TaskCard key={t.id} task={t} index={i} columnId={column.id} />
          ))}
        </div>
      </SortableContext>

      <div className="mt-3">
        {adding ? (
          <form onSubmit={onSubmit} className="space-y-2">
            <input
              autoFocus
              value={title}
              onChange={e=>setTitle(e.target.value)}
              placeholder="Task title"
              className="w-full h-9 text-sm rounded-lg border border-default px-2"
            />
            <div className="flex items-center gap-2">
              <button type="submit" disabled={!projectId || projectId==='_all'} className="h-8 px-3 rounded-lg bg-indigo-600 text-white text-xs hover:bg-indigo-700 disabled:opacity-50">Add</button>
              <button type="button" onClick={()=>{setAdding(false); setTitle('')}} className="h-8 px-3 rounded-lg border border-default text-xs hover:bg-gray-50">Cancel</button>
            </div>
          </form>
        ) : (
          <button onClick={()=>setAdding(true)} disabled={!projectId || projectId==='_all'} className="h-8 w-full text-left text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg px-2 disabled:opacity-50" title={!projectId || projectId==='_all' ? 'Select a specific project to add tasks' : 'Add task'}>+ Add Task</button>
        )}
      </div>
    </div>
  )
}

function dotColor(id) {
  if (id === 'todo') return 'bg-amber-400'
  if (id === 'doing') return 'bg-sky-400'
  if (id === 'done') return 'bg-emerald-500'
  return 'bg-gray-300'
}