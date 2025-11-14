import React, { useEffect, useMemo, useState } from 'react'
import { useTasksStore } from '../../store/useTasksStore'
import { api } from '../../lib/api'

export default function ListView() {
  const columns = useTasksStore(s => s.columns)
  const selectedProjectId = useTasksStore(s => s.selectedProjectId)

  // server-side filters and pagination
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('none') // none | dueAsc | dueDesc
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(25)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [reload, setReload] = useState(0)

  // debounce search
  const [qDeb, setQDeb] = useState('')
  useEffect(() => {
    const id = setTimeout(() => setQDeb(q), 250)
    return () => clearTimeout(id)
  }, [q])

  useEffect(() => {
    if (!selectedProjectId) { setItems([]); setTotal(0); return }
    let cancelled = false
    ;(async () => {
      setLoading(true); setError('')
      try {
        if (selectedProjectId === '_all') {
          const projects = await api.getProjects({ status: 'active' })
          const all = []
          for (const p of (projects||[])) {
            try {
              const res = await api.getTasksPaged(p._id, { page: 1, size: 500, q: qDeb || undefined, status, sort })
              all.push(...(res.items||[]))
            } catch {}
          }
          if (!cancelled) { setItems(all); setTotal(all.length) }
        } else {
          const res = await api.getTasksPaged(selectedProjectId, { page, size, q: qDeb || undefined, status, sort })
          if (!cancelled) { setItems(res.items); setTotal(res.total) }
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Failed to load tasks')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [selectedProjectId, page, size, qDeb, status, sort, reload])

  const byStatus = useMemo(() => {
    const groups = { todo: [], doing: [], done: [] }
    for (const t of items) {
      if (groups[t.status]) groups[t.status].push(t)
    }
    return groups
  }, [items])

  return (
    <div className="space-y-3">
      <div className="surface border border-default rounded-xl p-3 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={e=>{ setQ(e.target.value); setPage(1) }}
          placeholder="Search tasks..."
          className="h-9 flex-1 min-w-[220px] border border-default rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
        <select value={status} onChange={e=>{ setStatus(e.target.value); setPage(1) }} className="h-9 border border-default rounded-lg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200">
          <option value="all">All statuses</option>
          <option value="todo">To do</option>
          <option value="doing">Doing</option>
          <option value="done">Done</option>
        </select>
        <select value={sort} onChange={e=>{ setSort(e.target.value); setPage(1) }} className="h-9 border border-default rounded-lg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200">
          <option value="none">Sort: Default</option>
          <option value="dueAsc">Sort: Due ↑</option>
          <option value="dueDesc">Sort: Due ↓</option>
        </select>
        <div className="ml-auto flex items-center gap-2 w-full sm:w-auto">
          <select value={size} onChange={e=>{ setSize(parseInt(e.target.value,10)); setPage(1) }} className="h-9 border border-default rounded-lg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200">
            {[10,25,50,100].map(n => <option key={n} value={n}>{n}/page</option>)}
          </select>
          <div className="text-xs text-gray-600">{total} total</div>
          <a
            href={selectedProjectId && selectedProjectId !== '_all' ? api.exportCsvUrl(selectedProjectId, { q: q || undefined, status }) : '#'}
            className="h-9 px-3 inline-flex items-center rounded-lg border border-default text-sm hover:bg-gray-50 disabled:opacity-50"
            onClick={(e)=>{ if(!selectedProjectId || selectedProjectId === '_all') e.preventDefault() }}
          >Export CSV</a>
          <a
            href={selectedProjectId && selectedProjectId !== '_all' ? api.exportXlsxUrl(selectedProjectId, { q: q || undefined, status }) : '#'}
            className="h-9 px-3 inline-flex items-center rounded-lg border border-default text-sm hover:bg-gray-50 disabled:opacity-50"
            onClick={(e)=>{ if(!selectedProjectId || selectedProjectId === '_all') e.preventDefault() }}
          >Export XLSX</a>
        </div>
      </div>

      <div className="surface border border-default rounded-2xl">
        {loading && <div className="p-8 text-sm text-gray-500 text-center">Loading…</div>}
        {!loading && error && <div className="p-8 text-sm text-red-600 text-center">{error}</div>}
        {!loading && !error && columns.map(col => {
          const list = byStatus[col.id] || []
          return (
            <section key={col.id} className="p-4 border-t first:border-t-0 border-default">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${dotColor(col.id)}`}></span>
                  <div className="text-sm font-medium">{col.name}</div>
                </div>
                <div className="text-xs text-gray-500">{list.length}</div>
              </div>
              <ul className="space-y-2">
                {list.map(t => (
                  <li key={t.id} className="flex items-center justify-between rounded-lg p-3 bg-gray-50/60 border border-default hover:bg-gray-100/50">
                    <div className="min-w-0 pr-4">
                      <div className="text-sm truncate">{t.title}</div>
                      <div className="mt-1 text-[11px] text-gray-600 flex items-center gap-2">
                        <span>Deps: {(t.predecessors||[]).length}</span>
                        <span>Time: {(t.timeTotalHours||0).toFixed(1)}h</span>
                      </div>
                    </div>
                    <div className="text-[11px] text-gray-500 whitespace-nowrap flex items-center gap-2">
                      {t.due ? new Date(t.due).toLocaleDateString() : '-'}
                      {t.due ? (() => { const d = getDueInfo(t.due); return d ? <span className={`inline-flex items-center px-2 py-0.5 rounded-full border ${d.badge}`}>{d.label}</span> : null })() : null}
                      <button className="h-7 px-2 rounded-md border border-default text-[11px] hover:bg-gray-50" onClick={async()=>{
                        const v = prompt('Log time (hours): eg. 1.5')
                        if (v==null) return
                        const h = Number(v)
                        if (!(h>=0)) return alert('Invalid hours')
                        try { await api.addTimeEntry(t.id, { hours: h }) ; setReload(r=>r+1) } catch(e){ alert(e?.message||'Failed') }
                      }}>Log time</button>
                    </div>
                  </li>
                ))}
                {!list.length && <li className="text-xs text-gray-500">No tasks</li>}
              </ul>
            </section>
          )
        })}
      </div>

      <Pagination page={page} size={size} total={total} onPage={setPage} />
    </div>
  )
}

function dotColor(id) {
  if (id === 'todo') return 'bg-amber-400'
  if (id === 'doing') return 'bg-sky-400'
  if (id === 'done') return 'bg-emerald-500'
  return 'bg-gray-300'
}

function getDueInfo(due) {
  if (!due) return null
  const now = new Date()
  const d = new Date(due)
  const startOfDay = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate())
  const today = startOfDay(now)
  const dueDay = startOfDay(d)
  const msInDay = 24*60*60*1000
  const diffDays = Math.floor((dueDay - today) / msInDay)
  if (diffDays < 0) return { label: 'Overdue', badge: 'border-red-200 bg-red-50 text-red-700' }
  if (diffDays === 0) return { label: 'Due today', badge: 'border-amber-200 bg-amber-50 text-amber-700' }
  if (diffDays <= 3) return { label: 'Due soon', badge: 'border-sky-200 bg-sky-50 text-sky-700' }
  return null
}

function Pagination({ page, size, total, onPage }){
  const pages = Math.max(Math.ceil((total||0) / (size||1)), 1)
  const canPrev = page > 1
  const canNext = page < pages
  return (
    <div className="flex items-center justify-between text-sm text-gray-600">
      <div>Page {page} of {pages}</div>
      <div className="flex items-center gap-2">
        <button disabled={!canPrev} onClick={()=>onPage(1)} className="h-8 px-2 rounded-lg border border-default disabled:opacity-50">First</button>
        <button disabled={!canPrev} onClick={()=>onPage(page-1)} className="h-8 px-3 rounded-lg border border-default disabled:opacity-50">Prev</button>
        <button disabled={!canNext} onClick={()=>onPage(page+1)} className="h-8 px-3 rounded-lg border border-default disabled:opacity-50">Next</button>
        <button disabled={!canNext} onClick={()=>onPage(pages)} className="h-8 px-2 rounded-lg border border-default disabled:opacity-50">Last</button>
      </div>
    </div>
  )
}