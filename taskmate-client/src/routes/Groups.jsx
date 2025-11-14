import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { useTasksStore } from '../store/useTasksStore'
import Dropdown from '../components/common/Dropdown'

export default function Groups() {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [groups, setGroups] = useState([])
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(false)
  const pushToast = useTasksStore(s => s.pushToast)

  useEffect(() => {
    fetchGroups()
  }, [q])

  async function fetchGroups() {
    setLoading(true)
    try {
      const res = await api.getGroups({ q })
      setGroups(Array.isArray(res) ? res : (res?.items || []))
    } catch (e) {
      // ignore
    } finally { setLoading(false) }
  }

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return groups
    return groups.filter(g => (g.name||'').toLowerCase().includes(term) || (g.description||'').toLowerCase().includes(term))
  }, [q, groups])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-800">Groups</h1>
        <button onClick={()=>{ setEditing(null); setOpen(true) }} className="h-9 px-3 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700">New group</button>
      </div>

      <div className="surface border border-default rounded-xl p-3 flex items-center gap-2">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search groups..." className="h-9 flex-1 border border-default rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
      </div>

      <div className="surface border border-default rounded-2xl p-3">
        {loading ? (
          <div className="p-8 text-sm text-gray-600 text-center">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-sm text-gray-600 text-center">No groups yet. Create your first group.</div>
        ) : (
          <ul className="divide-y divide-default">
            {filtered.map(g => (
              <li key={g._id} className="py-3 px-2 -mx-2 rounded-lg hover:bg-gray-50/50 transition-colors">
                <div className="grid grid-cols-12 items-center gap-2">
                  <div className="col-span-5 min-w-0">
                    <div className="font-medium text-gray-800 truncate">{g.name}</div>
                    {g.description && <div className="text-sm text-gray-600 truncate">{g.description}</div>}
                  </div>
                  <div className="col-span-4 flex items-center gap-2">
                    <span className="text-xs text-gray-600">{(g.members || []).length} members</span>
                  </div>
                  <div className="col-span-3 flex items-center justify-end gap-2 whitespace-nowrap">
                    <div className="text-xs text-gray-500">{g.createdAt ? new Date(g.createdAt).toLocaleDateString() : ''}</div>
                    <button
                      className="h-8 px-3 rounded-lg border border-default text-xs hover:bg-gray-50"
                      onClick={()=>{ setEditing(g); setOpen(true) }}
                    >Edit</button>
                    <button
                      className="h-8 px-3 rounded-lg bg-red-50 text-red-600 text-xs hover:bg-red-100"
                      onClick={async()=>{
                        if (!confirm('Delete this group?')) return
                        await api.deleteGroup(g._id)
                        pushToast('Group deleted','success')
                        fetchGroups()
                      }}
                    >Delete</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {open && (
        <GroupModal
          initial={editing}
          onClose={()=>setOpen(false)}
          onSaved={()=>{ setOpen(false); setEditing(null); fetchGroups(); pushToast('Group saved','success') }}
        />
      )}
    </div>
  )
}

function GroupModal({ initial, onClose, onSaved }){
  const [name, setName] = useState(initial?.name || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [status, setStatus] = useState(initial?.status || 'active')
  const [manager, setManager] = useState(initial?.manager || '')
  const [members, setMembers] = useState(Array.isArray(initial?.members) ? initial.members.map(String) : [])
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoadingUsers(true)
    api.getUsers({ status: 'active' }).then(res => { if (!cancelled) setUsers(res || []) }).catch(()=>{}).finally(()=>{ if(!cancelled) setLoadingUsers(false) })
    return () => { cancelled = true }
  }, [])

  async function submit(e){
    e.preventDefault()
    setError('')
    const n = name.trim()
    if (!n) { setError('Name is required'); return }
    setSaving(true)
    try {
      const payload = { name: n, description: description.trim(), status, manager: manager || undefined, members }
      if (initial?._id) await api.updateGroup(initial._id, payload)
      else await api.createGroup(payload)
      onSaved()
    } catch (err) {
      setError(err?.message || 'Failed to save')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-gray-900/20" onMouseDown={(e)=>{ if(e.target===e.currentTarget) onClose() }}>
      <div className="w-[560px] surface border border-default rounded-2xl shadow-xl p-4" onMouseDown={(e)=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-base font-semibold">{initial ? 'Edit group' : 'Create group'}</div>
          <button className="text-sm text-gray-500 hover:text-gray-800" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-sm text-gray-600">Name</label>
            <input value={name} onChange={e=>setName(e.target.value)} className="mt-1 h-10 w-full border border-default rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Description</label>
            <textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3} className="mt-1 w-full border border-default rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
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
            </div>
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
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="h-9 px-3 rounded-lg border border-default text-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="h-9 px-3 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-60">{saving ? (initial ? 'Saving…' : 'Creating…') : (initial ? 'Save' : 'Create')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
