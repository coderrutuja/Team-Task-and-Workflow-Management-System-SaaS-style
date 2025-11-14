import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import Dropdown from '../components/common/Dropdown'

export default function AdminUsers() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [role, setRole] = useState('all')
  const [status, setStatus] = useState('all')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [resetFor, setResetFor] = useState(null)
  const me = api.getUser()

  useEffect(() => {
    fetchUsers()
  }, [q, role, status])

  async function fetchUsers(){
    setLoading(true)
    try {
      const data = await api.getUsers({ q, role, status })
      setItems(data)
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-lg font-semibold">Admin · Users</h1>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button className="h-9 px-3 rounded-lg bg-indigo-600 text-white text-sm w-full sm:w-auto" onClick={()=>{ setEditing(null); setOpen(true) }}>New user</button>
        </div>
      </div>

      <div className="surface border border-default rounded-xl p-3 flex items-center gap-2 flex-wrap">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search name or email" className="h-9 w-full sm:flex-1 border border-default rounded-lg px-3 text-sm" />
        <Dropdown
          value={role}
          options={[
            { value:'all', label:'All roles' },
            { value:'admin', label:'admin' },
            { value:'manager', label:'manager' },
            { value:'member', label:'member' },
            { value:'client', label:'client' },
          ]}
          onChange={setRole}
        />
        <Dropdown
          value={status}
          options={[
            { value:'all', label:'All status' },
            { value:'active', label:'active' },
            { value:'inactive', label:'inactive' },
          ]}
          onChange={setStatus}
        />
      </div>

      <div className="surface border border-default rounded-2xl overflow-auto">
        <table className="min-w-[720px] w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-3 py-2">Name</th>
              <th className="text-left px-3 py-2">Email</th>
              <th className="text-left px-3 py-2">Role</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-right px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-500">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-500">No users</td></tr>
            ) : items.map(u => (
              <tr key={u._id} className="border-t border-default">
                <td className="px-3 py-2">{u.name}</td>
                <td className="px-3 py-2 text-gray-600">{u.email}</td>
                <td className="px-3 py-2">{u.role}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] border ${u.status==='active'?'bg-green-50 text-green-700 border-green-200':'bg-gray-100 text-gray-700 border-gray-200'}`}>{u.status}</span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2 justify-end">
                    <button className="h-8 px-2 rounded-md border border-default text-xs" onClick={()=>{ setEditing(u); setOpen(true) }}>Edit</button>
                    {String(me?.id) !== String(u._id) && (
                      <>
                        <button className="h-8 px-2 rounded-md border border-default text-xs" onClick={async()=>{
                          const next = u.status === 'active' ? 'inactive' : 'active'
                          await api.adminSetUserStatus(u._id, next)
                          fetchUsers()
                        }}>{u.status==='active'?'Deactivate':'Activate'}</button>
                        <button className="h-8 px-2 rounded-md border border-default text-xs" onClick={()=> setResetFor(u)}>Reset Password</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <UserModal
          initial={editing}
          onClose={()=>setOpen(false)}
          onSaved={()=>{ setOpen(false); setEditing(null); fetchUsers() }}
        />
      )}
      {resetFor && (
        <ResetPasswordModal
          user={resetFor}
          onClose={()=>setResetFor(null)}
          onSaved={async ()=>{ setResetFor(null); await fetchUsers() }}
        />
      )}
    </div>
  )
}

function ResetPasswordModal({ user, onClose, onSaved }){
  const [pwd, setPwd] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(e){
    e.preventDefault()
    setError('')
    if (pwd.length < 6) { setError('Password must be at least 6 characters'); return }
    setSaving(true)
    try {
      await api.adminResetPassword(user._id, pwd)
      onSaved()
    } catch (e) {
      setError(e?.message || 'Failed to reset password')
    } finally { setSaving(false) }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4 bg-gray-900/20"
      onMouseDown={(e)=>{ if(e.target===e.currentTarget) onClose() }}
      onKeyDown={(e)=>{ if(e.key==='Escape') onClose() }}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
    >
      <div className="w-[420px] max-w-[95vw] surface border border-default rounded-2xl shadow-xl p-4" onMouseDown={(e)=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-base font-semibold">Reset password</div>
          <button className="text-sm text-gray-500 hover:text-gray-800" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div className="text-sm text-gray-600">User: <span className="font-medium text-gray-800">{user?.name || user?.email}</span></div>
          <div>
            <label className="text-sm text-gray-600">New password <span className="text-red-600">*</span></label>
            <div className="relative mt-1">
              <input
                type={show ? 'text' : 'password'}
                value={pwd}
                onChange={e=>setPwd(e.target.value)}
                aria-invalid={!!error && pwd.length < 6}
                className="h-10 w-full border border-default rounded-lg px-3 pr-10 text-sm"
              />
              <button type="button" onClick={()=>setShow(v=>!v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-600 hover:text-gray-800">
                {show ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="text-[11px] text-gray-500 mt-1">Minimum 6 characters.</div>
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="h-9 px-3 rounded-lg border border-default text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="h-9 px-3 rounded-lg bg-indigo-600 text-white text-sm disabled:opacity-60">{saving ? 'Resetting…' : 'Reset Password'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function UserModal({ initial, onClose, onSaved }){
  const [name, setName] = useState(initial?.name || '')
  const [email, setEmail] = useState(initial?.email || '')
  const [role, setRole] = useState(initial?.role || 'member')
  const [status, setStatus] = useState(initial?.status || 'active')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(e){
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('Name is required'); return }
    if (!initial && !email.trim()) { setError('Email is required'); return }
    if (!initial && password.length < 6) { setError('Password must be at least 6 characters'); return }
    setSaving(true)
    try {
      if (initial) {
        await api.adminUpdateUser(initial._id, { name: name.trim(), role, status })
      } else {
        await api.adminCreateUser({ name: name.trim(), email: email.trim(), role, status, password })
      }
      onSaved()
    } catch (e) {
      setError(e?.message || 'Failed to save')
    } finally { setSaving(false) }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4 bg-gray-900/20"
      onMouseDown={(e)=>{ if(e.target===e.currentTarget) onClose() }}
      onKeyDown={(e)=>{ if(e.key==='Escape') onClose() }}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
    >
      <div className="w-[520px] max-w-[95vw] surface border border-default rounded-2xl shadow-xl p-4" onMouseDown={(e)=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-base font-semibold">{initial ? 'Edit user' : 'Create user'}</div>
          <button className="text-sm text-gray-500 hover:text-gray-800" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-sm text-gray-600">Name <span className="text-red-600">*</span></label>
            <input value={name} onChange={e=>setName(e.target.value)} aria-invalid={!!error && !name.trim()} className="mt-1 h-10 w-full border border-default rounded-lg px-3 text-sm" />
            <div className="text-[11px] text-gray-500 mt-1">Enter the full name to display across the app.</div>
          </div>
          {!initial && (
            <div>
              <label className="text-sm text-gray-600">Email <span className="text-red-600">*</span></label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} aria-invalid={!!error && !email.trim()} className="mt-1 h-10 w-full border border-default rounded-lg px-3 text-sm" />
              <div className="text-[11px] text-gray-500 mt-1">Use a valid work email. Invites and alerts go here.</div>
            </div>
          )}
          {!initial && (
            <div>
              <label className="text-sm text-gray-600">Password <span className="text-red-600">*</span></label>
              <div className="relative mt-1">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e=>setPassword(e.target.value)}
                  aria-invalid={!!error && password.length < 6}
                  className="h-10 w-full border border-default rounded-lg px-3 pr-10 text-sm"
                />
                <button type="button" onClick={()=>setShowPwd(v=>!v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-600 hover:text-gray-800">
                  {showPwd ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="text-[11px] text-gray-500 mt-1">Minimum 6 characters.</div>
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-600">Role</label>
              <div className="mt-1">
                <Dropdown
                  value={role}
                  options={[
                    { value:'admin', label:'admin' },
                    { value:'manager', label:'manager' },
                    { value:'member', label:'member' },
                    { value:'client', label:'client' },
                  ]}
                  onChange={setRole}
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-600">Status</label>
              <div className="mt-1">
                <Dropdown
                  value={status}
                  options={[
                    { value:'active', label:'active' },
                    { value:'inactive', label:'inactive' },
                  ]}
                  onChange={setStatus}
                />
              </div>
            </div>
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="h-9 px-3 rounded-lg border border-default text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="h-9 px-3 rounded-lg bg-indigo-600 text-white text-sm disabled:opacity-60">{saving ? (initial ? 'Saving…' : 'Creating…') : (initial ? 'Save' : 'Create')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
