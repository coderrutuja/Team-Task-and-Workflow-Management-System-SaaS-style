import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { useTasksStore } from '../store/useTasksStore'
import Dropdown from '../components/common/Dropdown'

export default function Projects() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(100)
  const [total, setTotal] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const pushToast = useTasksStore(s => s.pushToast)

  useEffect(() => {
    fetchProjects()
  }, [q, status, page, limit])

  async function fetchProjects() {
    setLoading(true)
    try {
      const res = await api.getProjects({ q, status, page, limit })
      // res normalized to array in api, but if backend response present, we may need total
      if (Array.isArray(res)) { setItems(res); setTotal(res.length) }
      else { setItems(res.items || []); setTotal(res.total || 0) }
    } finally { setLoading(false) }
  }

  function openCreate() { setEditing(null); setShowForm(true) }
  function openEdit(p) { setEditing(p); setShowForm(true) }

  async function onDelete(id){
    if (!confirm('Delete this project?')) return
    await api.deleteProject(id)
    pushToast('Project deleted','success')
    fetchProjects()
  }

  const filtered = items

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-lg font-semibold">Projects</h1>
        <button className="h-9 px-3 rounded-lg bg-indigo-600 text-white text-sm w-full sm:w-auto" onClick={openCreate}>New project</button>
      </div>

      <div className="surface border border-default rounded-xl p-3 flex items-center gap-2 flex-wrap">
        <input value={q} onChange={e=>{ setQ(e.target.value); setPage(1) }} placeholder="Search projects..." className="h-9 w-full sm:flex-1 border border-default rounded-lg px-3 text-sm" />
        <Dropdown
          value={status}
          options={[
            { value:'all', label:'All' },
            { value:'active', label:'Active' },
            { value:'on_hold', label:'On hold' },
            { value:'completed', label:'Completed' },
          ]}
          onChange={(v)=>{ setStatus(v); setPage(1) }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? Array.from({length:6}).map((_,i)=> (
          <div key={i} className="surface border border-default rounded-xl p-4 animate-pulse">
            <div className="h-5 w-40 bg-gray-100 rounded" />
            <div className="mt-2 h-3 w-20 bg-gray-100 rounded" />
          </div>
        )) : filtered.map(p => (
          <div key={p._id} className="surface border border-default rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium">{p.title}</div>
                <div className="text-xs text-gray-500">{p.status}</div>
              </div>
              <div className="flex items-center gap-2">
                <button className="h-8 px-2 rounded-md border border-default text-xs" onClick={()=>openEdit(p)}>Edit</button>
                <button className="h-8 px-2 rounded-md border border-default text-xs text-red-600" onClick={()=>onDelete(p._id)}>Delete</button>
              </div>
            </div>
            {p.description ? <div className="mt-2 text-sm text-gray-600 line-clamp-2">{p.description}</div> : null}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-xs text-gray-500">{total} total</div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="h-8 px-2 rounded-md border border-default text-xs">Prev</button>
          <div className="text-xs">Page {page}</div>
          <button disabled={page*limit>=total} onClick={()=>setPage(p=>p+1)} className="h-8 px-2 rounded-md border border-default text-xs">Next</button>
        </div>
      </div>

      {showForm && (
        <ProjectForm initial={editing} onClose={()=>setShowForm(false)} onSaved={()=>{ setShowForm(false); fetchProjects(); pushToast('Project saved','success') }} />
      )}
    </div>
  )
}

function ProjectForm({ initial, onClose, onSaved }){
  const [title, setTitle] = useState(initial?.title || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [status, setStatus] = useState(initial?.status || 'active')
  const [saving, setSaving] = useState(false)
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [manager, setManager] = useState(initial?.manager || '')
  const [members, setMembers] = useState(Array.isArray(initial?.members) ? initial.members.map(String) : [])
  const [groups, setGroups] = useState([])
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [group, setGroup] = useState(initial?.group || '')
  const pushToast = useTasksStore(s => s.pushToast)

  useEffect(() => {
    let cancelled = false
    setLoadingUsers(true)
    api.getUsers({ status: 'active' }).then(res => { if (!cancelled) setUsers(res || []) }).catch(()=>{}).finally(()=>{ if(!cancelled) setLoadingUsers(false) })
    setLoadingGroups(true)
    api.getGroups({ status: 'active' }).then(res => { if (!cancelled) setGroups(res || []) }).catch(()=>{}).finally(()=>{ if(!cancelled) setLoadingGroups(false) })
    return () => { cancelled = true }
  }, [])

  async function onSubmit(e){
    e.preventDefault()
    if (!title.trim()) { pushToast('Title is required','error'); return }
    setSaving(true)
    try {
      const payload = { title, description, status, manager: manager || undefined, members, group: group || undefined }
      if (initial) await api.updateProject(initial._id, payload)
      else await api.createProject(payload)
      onSaved()
    } catch (err) {
      pushToast(err?.message || 'Failed to save project','error')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/20 grid place-items-center p-4" onMouseDown={(e)=>{ if(e.target===e.currentTarget) onClose() }}>
      <div className="w-[520px] surface border border-default rounded-2xl shadow-xl p-4" onMouseDown={(e)=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-base font-semibold">{initial ? 'Edit project' : 'New project'}</div>
          <button className="text-sm text-gray-500 hover:text-gray-800" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="text-sm text-gray-600">Title <span className="text-red-600">*</span></label>
            <input value={title} onChange={e=>setTitle(e.target.value)} aria-invalid={!title.trim()} className="mt-1 h-10 w-full border border-default rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            <div className="text-[11px] text-gray-500 mt-1">Project name shown across the app.</div>
          </div>
          <div>
            <label className="text-sm text-gray-600">Description</label>
            <textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3} className="mt-1 w-full border border-default rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            <div className="text-[11px] text-gray-500 mt-1">Optional. Brief context for the project.</div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-600">Manager</label>
              <div className="mt-1">
                <Dropdown
                  value={manager}
                  options={[{ value:'', label: loadingUsers ? 'Loading…' : 'Select manager' }, ...users.map(u => ({ value: String(u._id), label: `${u.name} (${u.role})` }))]}
                  onChange={setManager}
                  disabled={loadingUsers}
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-600">Members</label>
              <div className="mt-1 max-h-32 overflow-auto border border-default rounded-lg p-2">
                {loadingUsers ? (
                  <div className="text-xs text-gray-500 px-1 py-1">Loading…</div>
                ) : users.length === 0 ? (
                  <div className="text-xs text-gray-500 px-1 py-1">No users</div>
                ) : (
                  users.map(u => (
                    <label key={u._id} className="flex items-center gap-2 text-sm py-1">
                      <input type="checkbox" checked={members.includes(String(u._id))}
                             onChange={(e)=>{
                               const id = String(u._id)
                               setMembers(prev => e.target.checked ? Array.from(new Set([...(prev||[]), id])) : (prev||[]).filter(x => x !== id))
                             }} />
                      <span className="truncate">{u.name} <span className="text-gray-500">({u.email})</span></span>
                    </label>
                  ))
                )}
              </div>
              <div className="text-[11px] text-gray-500 mt-1">Optional. Assign team members to the project.</div>
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-600">Group</label>
            <div className="mt-1">
              <Dropdown
                value={group}
                options={[{ value:'', label: loadingGroups ? 'Loading…' : 'No group' }, ...groups.map(g => ({ value: String(g._id), label: g.name }))]}
                onChange={setGroup}
              />
            </div>
            <div className="text-[11px] text-gray-500 mt-1">Optional. Organize projects under a group.</div>
          </div>
          <div>
            <label className="text-sm text-gray-600">Status</label>
            <div className="mt-1">
              <Dropdown
                value={status}
                options={[
                  { value:'active', label:'active' },
                  { value:'on_hold', label:'on_hold' },
                  { value:'completed', label:'completed' },
                ]}
                onChange={setStatus}
              />
            </div>
            <div className="text-[11px] text-gray-500 mt-1">Change status when pausing or completing the project.</div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="h-9 px-3 rounded-lg border border-default text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200">Cancel</button>
            <button disabled={saving} className="h-9 px-3 rounded-lg bg-indigo-600 text-white text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-200">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
