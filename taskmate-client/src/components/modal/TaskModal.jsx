import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { useTasksStore } from '../../store/useTasksStore'
import Badge from '../common/Badge'
import AvatarGroup from '../common/AvatarGroup'
import { api } from '../../lib/api'
import Dropdown from '../common/Dropdown'

export default function TaskModal() {
  const modal = useTasksStore(s => s.modal)
  const closeTask = useTasksStore(s => s.closeTask)
  const tasks = useTasksStore(s => s.tasks)
  const pushToast = useTasksStore(s => s.pushToast)
  const setTasks = useTasksStore(s => s.setTasks)
  const selectedProjectId = useTasksStore(s => s.selectedProjectId)
  const setSelectedProjectId = useTasksStore(s => s.setSelectedProjectId)

  // local project list for selection when none is chosen
  const [projects, setProjects] = useState([])
  const [loadingProjects, setLoadingProjects] = useState(false)

  // Hooks must be called unconditionally in the same order on every render
  const task = useMemo(() => tasks.find(t => t.id === modal.selectedId) || null, [tasks, modal.selectedId])
  const [closing, setClosing] = useState(false)
  useEffect(()=>{ setClosing(false) }, [modal.open])

  // Load projects when modal opens (to allow selection if none selected)
  useEffect(() => {
    if (!modal.open) return
    setLoadingProjects(true)
    api.getProjects({ status: 'active', page: 1, limit: 50 })
      .then(items => setProjects(Array.isArray(items) ? items : []))
      .catch(() => setProjects([]))
      .finally(() => setLoadingProjects(false))
  }, [modal.open])

  const requestClose = () => { setClosing(true); setTimeout(() => closeTask(), 150) }

  if (!modal.open) return null

  return (
    <div className={`fixed inset-0 z-50 grid place-items-center p-4 transition-opacity duration-150 ${closing ? 'opacity-0' : 'opacity-100'} bg-gray-900/20`} onMouseDown={(e)=>{ if(e.target===e.currentTarget) requestClose() }} onKeyDown={(e)=>{ if(e.key==='Escape') requestClose() }}>
      <div className={`w-[760px] max-w-[95vw] max-h-[90vh] overflow-auto surface border border-default rounded-2xl shadow-xl p-5 transition-transform duration-150 ${closing ? 'scale-95' : 'scale-100'}`} onMouseDown={(e)=>e.stopPropagation()}>
        <Header mode={modal.mode} onClose={closeTask} />
        <Editor
          defaultTask={task}
          mode={modal.mode}
          onClose={requestClose}
          projectSelector={{
            selectedProjectId,
            setSelectedProjectId,
            projects,
            loading: loadingProjects
          }}
          onCreate={async (payload, projectId) => {
            if (!projectId) { pushToast('Select a project first','info'); return null }
            try {
              const created = await api.createTask(projectId, toServerTask(payload))
              // switch the board to the project's tasks and refresh
              if (projectId) {
                setSelectedProjectId(projectId)
                const items = await api.getTasksByProject(projectId, {})
                setTasks(items)
              }
              pushToast('Task created','success')
              return created.id
            } catch (e) {
              pushToast(e?.message || 'Failed to create task','error')
              return null
            }
          }}
          onUpdate={async (id, patch) => {
            if (!selectedProjectId) { pushToast('Select a project first','info'); return }
            try {
              await api.updateTask(id, toServerTask(patch))
              const items = await api.getTasksByProject(selectedProjectId, {})
              setTasks(items)
              pushToast('Task updated','success')
            } catch (e) {
              pushToast(e?.message || 'Failed to update task','error')
            }
          }}
          onDelete={async (id) => {
            if (!selectedProjectId) { pushToast('Select a project first','info'); return }
            try {
              await api.deleteTask(id)
              const items = await api.getTasksByProject(selectedProjectId, {})
              setTasks(items)
              pushToast('Task deleted','success')
              return true
            } catch (e) {
              pushToast(e?.message || 'Failed to delete task','error')
              return false
            }
          }}
        />
      </div>
    </div>
  )
}

function Header({ mode, onClose }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="text-base font-semibold">{mode === 'create' ? 'New Task' : 'Task'}</div>
      <button className="text-sm text-gray-500 hover:text-gray-800" onClick={onClose}>✕</button>
    </div>
  )
}

function Editor({ defaultTask, mode, onClose, onCreate, onUpdate, onDelete, projectSelector }) {
  const { selectedProjectId, setSelectedProjectId, projects, loading } = projectSelector || {}
  const [title, setTitle] = useState(defaultTask?.title || '')
  const [status, setStatus] = useState(defaultTask?.status || 'todo')
  const [due, setDue] = useState(defaultTask?.due || '')
  const [labels, setLabels] = useState(defaultTask?.labels?.join(', ') || '')
  const [description, setDescription] = useState(defaultTask?.description || '')
  const [error, setError] = useState('')
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)
  const me = api.getUser()
  const [attachments, setAttachments] = useState([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [allProjectTasks, setAllProjectTasks] = useState([])
  const [deps, setDeps] = useState(Array.isArray(defaultTask?.predecessors) ? defaultTask.predecessors.map(String) : [])
  const [addingDep, setAddingDep] = useState('')
  const [timeEntries, setTimeEntries] = useState([])
  const [timeHours, setTimeHours] = useState('')
  const [timeNote, setTimeNote] = useState('')
  const [timeLoading, setTimeLoading] = useState(false)
  const [timeTotal, setTimeTotal] = useState(Number(defaultTask?.timeTotalHours || 0))
  // local project selection for CREATE flow (does not change global board)
  const [projectIdForCreate, setProjectIdForCreate] = useState(selectedProjectId || '')

  useEffect(() => {
    if (!defaultTask || mode === 'create') { setComments([]); return }
    let cancelled = false
    setLoadingComments(true)
    api.getTaskComments(defaultTask.id)
      .then(res => { if (!cancelled) setComments(res) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingComments(false) })
    return () => { cancelled = true }
  }, [defaultTask?.id, mode])

  useEffect(() => {
    let active = true
    async function loadFiles() {
      if (!defaultTask || mode === 'create') { setAttachments([]); return }
      const ids = Array.isArray(defaultTask.attachments) ? defaultTask.attachments : []
      if (!ids.length) { setAttachments([]); return }
      setLoadingFiles(true)
      try {
        const files = []
        for (const id of ids) {
          try { files.push(await api.requestFile(id)) } catch {}
        }
        if (active) setAttachments(files)
      } finally { if (active) setLoadingFiles(false) }
    }
    loadFiles()
    return () => { active = false }
  }, [defaultTask?.id, mode])

  useEffect(() => {
    let active = true
    async function loadDepsAndTime() {
      const depsProjectId = mode === 'create' ? (projectIdForCreate || selectedProjectId) : (defaultTask?.projectId || selectedProjectId)
      if (!defaultTask || mode === 'create' || !depsProjectId) { setAllProjectTasks([]); setDeps([]); setTimeEntries([]); setTimeTotal(0); return }
      try {
        const tasks = await api.getTasksByProject(depsProjectId)
        if (active) setAllProjectTasks(tasks || [])
      } catch { if (active) setAllProjectTasks([]) }
      try {
        setTimeLoading(true)
        const te = await api.getTimeEntries(defaultTask.id)
        if (active) { setTimeEntries(Array.isArray(te?.items)?te.items:[]); setTimeTotal(Number(te?.totalHours||0)) }
      } finally { if (active) setTimeLoading(false) }
    }
    loadDepsAndTime()
    return () => { active = false }
  }, [defaultTask?.id, mode, selectedProjectId, projectIdForCreate])

  function handleSave() {
    const trimmed = title.trim()
    if (!trimmed) {
      setError('Title is required')
      return
    }
    const payload = {
      title: title.trim() || 'Untitled',
      status,
      due: due || null,
      labels: labels.split(',').map(s => s.trim()).filter(Boolean),
      description
    }
    ;(async () => {
      try {
        if (mode === 'create') {
          const id = await onCreate(payload, projectIdForCreate || selectedProjectId)
          if (id) await onUpdate(id, { description })
          else return // creation failed; keep modal open
        } else if (defaultTask) {
          await onUpdate(defaultTask.id, payload)
        }
        onClose()
      } catch (e) {
        // errors are handled in onCreate/onUpdate; keep modal open
      }
    })()
  }

  return (
    <div className="space-y-5 pb-20">
      {/* Project selection / display */}
      <div className="flex items-center justify-between gap-3">
        {mode === 'create' ? (
          <div className="flex items-center gap-2 w-full">
            <label className="text-sm text-gray-600 w-28">Project</label>
            <select value={projectIdForCreate || ''} disabled={loading} onChange={e=>setProjectIdForCreate(e.target.value)} className="h-9 border border-default rounded-lg px-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-200">
              <option value="">{loading ? 'Loading projects...' : 'Select a project'}</option>
              {projects.map(p => (
                <option key={p._id||p.id} value={p._id||p.id}>{p.title}</option>
              ))}
            </select>
          </div>
        ) : (
          selectedProjectId ? (
            <div className="text-sm text-gray-700">
              <span className="text-gray-500">Project:</span>{' '}
              <strong>{(() => projects.find(p => String(p._id||p.id) === String(selectedProjectId))?.title || selectedProjectId)()}</strong>
            </div>
          ) : null
        )}
      </div>

      <div className="space-y-2">
        <div>
          <label className="text-sm text-gray-600">Title <span className="text-red-600">*</span></label>
          <input value={title} onChange={e=>{ setTitle(e.target.value); if(error) setError('') }}
                 aria-invalid={!!error || !title.trim()}
                 placeholder="Task title"
                 autoFocus
                 onKeyDown={(e)=>{ if(e.key==='Enter' && (e.metaKey || e.ctrlKey)) handleSave() }}
                 className="mt-1 w-full text-lg font-medium border border-default rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          <div className="text-[11px] text-gray-500 mt-1">A short, clear name for the task.</div>
        </div>
        {error ? <div className="text-red-600 text-sm">{error}</div> : null}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Dropdown
            value={status}
            options={[
              { value:'todo', label:'To do' },
              { value:'doing', label:'Doing' },
              { value:'done', label:'Done' },
            ]}
            onChange={setStatus}
          />
          <div className="flex items-center gap-2">
            <input type="date" value={due||''} onChange={e=>setDue(e.target.value)} className="h-9 border border-default rounded-lg px-2 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            <span className="text-[11px] text-gray-500">optional</span>
          </div>
          <div className="flex-1 min-w-[200px]">
            <input value={labels} onChange={e=>setLabels(e.target.value)} placeholder="labels (comma separated)" className="h-9 w-full border border-default rounded-lg px-2 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            <div className="text-[11px] text-gray-500 mt-1">e.g. urgent, api, bug</div>
          </div>
        </div>
      </div>

      <div>
        <div className="text-sm font-medium mb-1">Description</div>
        <textarea value={description} onChange={e=>setDescription(e.target.value)} rows={4}
                  className="w-full border border-default rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" placeholder="Add a description..." />
      </div>

      {mode !== 'create' && defaultTask ? (
        <div>
          <div className="text-sm font-medium mb-2">Attachments</div>
          <div className="space-y-2 border border-default rounded-lg p-2 bg-white/50">
            {loadingFiles ? <div className="text-xs text-gray-500 px-1 py-1">Loading…</div> : (
              (attachments||[]).length === 0 ? <div className="text-xs text-gray-500 px-1 py-1">No attachments</div> : (
                attachments.map(f => (
                  <div key={f._id} className="flex items-center justify-between gap-2 text-sm">
                    <a className="text-indigo-600 hover:underline truncate" href={f.url} target="_blank" rel="noreferrer">{f.name}</a>
                    <button onClick={async()=>{ await api.detachFileFromTask(defaultTask.id, f._id).catch(()=>{}); setAttachments(prev=>prev.filter(x=>x._id!==f._id)) }} className="h-7 px-2 rounded-md border border-default text-xs text-red-600">Remove</button>
                  </div>
                ))
              )
            )}
            <div className="pt-1">
              <label className="inline-flex items-center gap-2 text-xs cursor-pointer h-8 px-2 rounded-md border border-default bg-white">
                <input type="file" className="hidden" onChange={async(e)=>{
                  const file = e.target.files?.[0]
                  if (!file) return
                  try {
                    const uploaded = await api.uploadFile(file.name, file, file.type)
                    await api.attachFileToTask(defaultTask.id, uploaded._id)
                    setAttachments(prev=>[...(prev||[]), uploaded])
                  } catch {}
                  finally { e.target.value = '' }
                }} />
                <span>Upload file</span>
              </label>
            </div>
          </div>
        </div>
      ) : null}

      {mode !== 'create' && defaultTask ? (
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium mb-2">Dependencies</div>
            <div className="space-y-2 border border-default rounded-lg p-2 bg-white/50">
              {(deps||[]).length === 0 ? (
                <div className="text-xs text-gray-500 px-1 py-1">No predecessors</div>
              ) : (
                deps.map(id => {
                  const t = allProjectTasks.find(x => String(x.id||x._id) === String(id))
                  return (
                    <div key={id} className="flex items-center justify-between gap-2 text-sm">
                      <div className="truncate">{t?.title || id}</div>
                      <button className="h-7 px-2 rounded-md border border-default text-xs" onClick={async()=>{
                        await api.removeTaskDependency(defaultTask.id, id).catch(()=>{})
                        setDeps(prev => prev.filter(x => String(x) !== String(id)))
                      }}>Remove</button>
                    </div>
                  )
                })
              )}
              <div className="pt-1 flex items-center gap-2">
                <select value={addingDep} onChange={e=>setAddingDep(e.target.value)} className="h-8 border border-default rounded-lg px-2 text-xs flex-1">
                  <option value="">Select predecessor</option>
                  {allProjectTasks.filter(x => String(x.id||x._id) !== String(defaultTask.id) && !(deps||[]).includes(String(x.id||x._id))).map(x => (
                    <option key={x.id||x._id} value={x.id||x._id}>{x.title}</option>
                  ))}
                </select>
                <button disabled={!addingDep} className="h-8 px-2 rounded-md border border-default text-xs disabled:opacity-50" onClick={async()=>{
                  if (!addingDep) return
                  await api.addTaskDependency(defaultTask.id, addingDep).catch(()=>{})
                  setDeps(prev => Array.from(new Set([...(prev||[]), String(addingDep)])))
                  setAddingDep('')
                }}>Add</button>
              </div>
              <div className="text-[11px] text-gray-500">Task cannot move to Doing/Done until all predecessors are Done.</div>
            </div>
          </div>
          <div>
            <div className="text-sm font-medium mb-2">Time tracking</div>
            <div className="space-y-2 border border-default rounded-lg p-2 bg-white/50">
              <div className="text-xs text-gray-700">Total: {timeTotal.toFixed(1)}h</div>
              {timeLoading ? (
                <div className="text-xs text-gray-500 px-1 py-1">Loading…</div>
              ) : (timeEntries||[]).length === 0 ? (
                <div className="text-xs text-gray-500 px-1 py-1">No time logged</div>
              ) : (
                <ul className="max-h-36 overflow-auto space-y-1">
                  {timeEntries.map(e => (
                    <li key={e._id} className="flex items-center justify-between text-xs">
                      <div className="truncate">{e.hours}h{e.note?`: ${e.note}`:''}</div>
                      <div className="flex items-center gap-2">
                        <div className="text-[11px] text-gray-500">{e.at ? format(new Date(e.at), 'PP') : ''}</div>
                        <button className="h-6 px-2 rounded-md border border-default" onClick={async()=>{
                          await api.deleteTimeEntry(defaultTask.id, e._id).catch(()=>{})
                          const te = await api.getTimeEntries(defaultTask.id).catch(()=>({ items: [], totalHours: 0 }))
                          setTimeEntries(Array.isArray(te?.items)?te.items:[])
                          setTimeTotal(Number(te?.totalHours||0))
                        }}>Delete</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex items-center gap-2 pt-1">
                <input value={timeHours} onChange={e=>setTimeHours(e.target.value)} placeholder="hours" className="h-8 w-24 border border-default rounded-lg px-2 text-xs" />
                <input value={timeNote} onChange={e=>setTimeNote(e.target.value)} placeholder="note (optional)" className="h-8 flex-1 border border-default rounded-lg px-2 text-xs" />
                <button className="h-8 px-2 rounded-md border border-default text-xs" onClick={async()=>{
                  const h = Number(timeHours)
                  if (!(h>=0)) return
                  await api.addTimeEntry(defaultTask.id, { hours: h, note: timeNote || '' }).catch(()=>{})
                  const te = await api.getTimeEntries(defaultTask.id).catch(()=>({ items: [], totalHours: 0 }))
                  setTimeEntries(Array.isArray(te?.items)?te.items:[])
                  setTimeTotal(Number(te?.totalHours||0))
                  setTimeHours(''); setTimeNote('')
                }}>Add</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {mode !== 'create' && defaultTask ? (
        <div>
          <div className="text-sm font-medium mb-2">Comments</div>
          <div className="space-y-2 max-h-56 overflow-auto border border-default rounded-lg p-2 bg-white/50">
            {loadingComments ? (
              <div className="text-xs text-gray-500 px-1 py-2">Loading…</div>
            ) : comments.length === 0 ? (
              <div className="text-xs text-gray-500 px-1 py-2">No comments yet</div>
            ) : (
              comments.map(c => (
                <div key={c._id || c.id} className="flex items-start justify-between gap-2">
                  <div className="text-sm text-gray-800 whitespace-pre-wrap break-words flex-1">
                    {c.text}
                    <div className="text-[11px] text-gray-500">{c.createdAt ? format(new Date(c.createdAt), 'PPp') : ''}</div>
                  </div>
                  {me && (me.id === String(c.user) || me.role === 'admin' || me.role === 'manager') ? (
                    <button
                      onClick={async ()=>{ await api.deleteTaskComment(defaultTask.id, c._id || c.id).catch(()=>{}); const res = await api.getTaskComments(defaultTask.id).catch(()=>[]); setComments(Array.isArray(res)?res:[]) }}
                      className="h-7 px-2 rounded-md border border-default text-xs text-red-600">
                      Delete
                    </button>
                  ) : null}
                </div>
              ))
            )}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input value={commentText} onChange={e=>setCommentText(e.target.value)} placeholder="Write a comment"
                   className="h-9 flex-1 border border-default rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            <button disabled={!commentText.trim()} onClick={async ()=>{ const text = commentText.trim(); if(!text) return; const res = await api.addTaskComment(defaultTask.id, text).catch(()=>null); if (Array.isArray(res)) setComments(res); setCommentText('') }}
                    className="h-9 px-3 rounded-lg bg-indigo-600 text-white text-sm disabled:opacity-50">Add</button>
          </div>
        </div>
      ) : null}

      <div className="sticky bottom-0 z-10 bg-white -mx-5 -mb-5 p-5 border-t border-default flex justify-between gap-2">
        <div>
          {mode !== 'create' && defaultTask ? (
            <button disabled={!selectedProjectId} onClick={async () => { if (confirm('Delete this task?')) { const ok = await onDelete(defaultTask.id); if (ok) onClose() } }} className="h-9 px-3 rounded-lg border border-default text-sm text-red-600 disabled:opacity-50 disabled:cursor-not-allowed">Delete</button>
          ) : null}
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="h-9 px-3 rounded-lg border border-default text-sm">Cancel</button>
          <button disabled={mode==='create' ? !(projectIdForCreate || selectedProjectId) : !selectedProjectId} onClick={handleSave} className="h-9 px-3 rounded-lg bg-indigo-600 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed">Save</button>
        </div>
      </div>
    </div>
  )
}

function toServerTask(p) {
  return {
    title: p.title,
    status: p.status,
    dueDate: p.due || null,
    labels: p.labels || [],
    description: p.description || '',
  }
}
