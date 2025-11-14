import { useState, useRef, useEffect } from 'react'
import { Bell, Menu } from 'lucide-react'
import { api } from '../../lib/api'

export default function Topbar({ onMenu }) {
  const [open, setOpen] = useState(null)
  const ref = useRef(null)
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)
  useEffect(() => {
    function onDocClick(e){ if (ref.current && !ref.current.contains(e.target)) setOpen(null) }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  useEffect(() => {
    if (open !== 'notif') return
    let cancelled = false
    api.getNotifications({ page: 1, limit: 20 })
      .then(res => { if (!cancelled) { setNotifications(res.items||[]); setUnread(res.unread||0) } })
      .catch(()=>{})
    return () => { cancelled = true }
  }, [open])

  function logout(){
    localStorage.removeItem('tm_token')
    window.location.href = '/auth/login'
  }

  const user = api.getUser()
  const initial = (user?.name || user?.email || 'U').trim()[0]?.toUpperCase() || 'U'

  return (
    <div className="h-16 border-b border-default surface flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        {typeof onMenu === 'function' && (
          <button onClick={onMenu} className="h-9 w-9 grid place-items-center rounded-md hover:bg-gray-100 lg:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5 text-gray-700" />
          </button>
        )}
      </div>
      <div className="relative flex items-center gap-1" ref={ref}>
        <button onClick={()=>setOpen(open=>open==='notif'?null:'notif')} className="relative h-9 w-9 grid place-items-center rounded-full hover:bg-gray-100" aria-label="Notifications">
          <Bell className="h-5 w-5 text-gray-700" />
          {unread>0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] grid place-items-center">{Math.min(unread,9)}</span>
          )}
        </button>
        <button onClick={()=>setOpen(open=>open==='user'?null:'user')} className="h-9 w-9 grid place-items-center rounded-full hover:bg-gray-100" aria-label="User menu">
          <span className="inline-block h-7 w-7 rounded-full bg-gray-200 text-[12px] grid place-items-center font-medium">{initial}</span>
        </button>
        {open==='notif' && (
          <div className="absolute right-12 top-12 w-72 surface border border-default rounded-lg shadow-md py-2 transition-all duration-150 opacity-100 translate-y-0 z-[1100]">
            <div className="px-3 pb-2 text-sm font-medium">Notifications</div>
            <ul className="max-h-64 overflow-auto text-sm">
              {(notifications||[]).length===0 ? (
                <li className="px-3 py-2 text-gray-500">No notifications</li>
              ) : notifications.map(n => (
                <li key={n._id} className="px-3 py-2 hover:bg-gray-50 flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-gray-800 text-[13px]">{n.title}</div>
                    {n.body ? <div className="text-[12px] text-gray-600">{n.body}</div> : null}
                  </div>
                  {!n.readAt ? (
                    <button onClick={async()=>{ await api.markNotificationRead(n._id).catch(()=>{}); const res = await api.getNotifications({}); setNotifications(res.items||[]); setUnread(res.unread||0) }} className="text-[12px] text-indigo-600">Mark read</button>
                  ) : null}
                </li>
              ))}
            </ul>
            <div className="px-3 pt-2 text-xs text-gray-500 flex items-center justify-between">
              <button onClick={async()=>{ await api.triggerDueNotifications().catch(()=>{}); const res = await api.getNotifications({}); setNotifications(res.items||[]); setUnread(res.unread||0) }} className="text-indigo-600">Generate due alerts</button>
              <span>{unread} unread</span>
            </div>
          </div>
        )}
        {open==='user' && (
          <div className="absolute right-0 top-12 w-44 surface border border-default rounded-lg shadow-md py-1 transition-all duration-150 opacity-100 translate-y-0 z-[1100]">
            <div className="px-3 py-2 text-sm text-gray-600">{user?.name || user?.email}</div>
            <hr className="border-default" />
            <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">Profile</button>
            <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">Settings</button>
            <button onClick={logout} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">Logout</button>
          </div>
        )}
      </div>
    </div>
  )
}
