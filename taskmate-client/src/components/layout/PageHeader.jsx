import React, { useMemo } from 'react'
import { useTasksStore } from '../../store/useTasksStore'
import { api } from '../../lib/api'

export default function PageHeader({ title, actions }) {
  const filter = useTasksStore(s => s.filter)
  const setFilter = useTasksStore(s => s.setFilter)
  const openTask = useTasksStore(s => s.openTask)
  const tasks = useTasksStore(s => s.tasks)
  const labels = useMemo(() => {
    try {
      const lblSet = new Set()
      const arr = Array.isArray(tasks) ? tasks : []
      arr.forEach(t => (Array.isArray(t.labels) ? t.labels : []).forEach(l => lblSet.add(l)))
      return Array.from(lblSet)
    } catch { return [] }
  }, [tasks])
  
function ExportMenu(){
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef(null)
  const selectedProjectId = useTasksStore(s => s.selectedProjectId)
  const filter = useTasksStore(s => s.filter)
  const pushToast = useTasksStore(s => s.pushToast)
  React.useEffect(() => {
    function onDoc(e){ if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])
  const params = { status: filter.status, q: filter.q, sort: filter.sort }
  const ensureProject = () => {
    if (!selectedProjectId) { pushToast && pushToast('Select a project first','info'); return false }
    return true
  }
  async function download(u, fallbackName){
    if (!ensureProject()) return
    try {
      const res = await fetch(u, { headers: { Authorization: `Bearer ${api.getToken()}` } })
      if (!res.ok) {
        const msg = res.status === 403 ? 'Export requires admin/manager role' : `Export failed (HTTP ${res.status})`
        pushToast && pushToast(msg, 'error')
        return
      }
      const blob = await res.blob()
      const cd = res.headers.get('content-disposition') || ''
      const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(cd)
      const fname = decodeURIComponent((match && (match[1] || match[2])) || fallbackName)
      const urlObj = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = urlObj
      a.download = fname
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(urlObj)
      setOpen(false)
    } catch (e) {
      pushToast && pushToast('Export failed', 'error')
    }
  }
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={()=>setOpen(o=>!o)} className="h-9 px-3 rounded-lg border border-default bg-white text-sm inline-flex items-center gap-2 hover:bg-gray-50 shadow-sm">
        <span>Import/Export</span>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" className={`transition-transform ${open?'rotate-180':''}`}><path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 min-w-40 bg-white border border-default rounded-lg shadow-lg py-1 z-30">
          <button onClick={()=>download(api.exportCsvUrl(selectedProjectId, params), `tasks-${selectedProjectId}.csv`)} className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${selectedProjectId? 'text-gray-700' : 'text-gray-400 cursor-not-allowed'}`}>Export CSV</button>
          <button onClick={()=>download(api.exportPdfUrl(selectedProjectId, params), `tasks-${selectedProjectId}.pdf`)} className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${selectedProjectId? 'text-gray-700' : 'text-gray-400 cursor-not-allowed'}`}>Export PDF</button>
          <button onClick={()=>download(api.exportXlsxUrl(selectedProjectId, params), `tasks-${selectedProjectId}.xlsx`)} className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${selectedProjectId? 'text-gray-700' : 'text-gray-400 cursor-not-allowed'}`}>Export XLSX</button>
        </div>
      )}
    </div>
  )
}
  const safeSetFilter = typeof setFilter === 'function' ? setFilter : () => {}
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-xl font-semibold">{title}</h1>
        {actions ? (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <ExportMenu />
            <button onClick={() => openTask(null)} className="h-9 px-3 rounded-lg bg-indigo-600 text-white text-sm w-full sm:w-auto">Add Task</button>
          </div>
        ) : null}
      </div>

      <div className="surface border border-default rounded-xl p-2 flex items-center gap-2 flex-wrap">
        <input
          value={filter.q}
          onChange={e=>safeSetFilter({ q: e.target.value })}
          className="h-9 w-full sm:w-[260px] rounded-lg border border-default px-3 text-sm focus:outline-none focus:ring-2 ring-primary"
          placeholder="Search tasks..."
          />
        <div className="flex items-center gap-1 flex-wrap">
          {['all','todo','doing','done'].map(s => (
            <Chip key={s} active={filter.status===s} onClick={()=>safeSetFilter({ status: s })}>
              {s==='all' ? 'All Tabs' : s.charAt(0).toUpperCase()+s.slice(1)}
            </Chip>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2 w-full sm:w-auto justify-end">
          <Dropdown
            value={filter.label}
            display={val => val==='all' ? 'All labels' : val}
            options={[{value:'all', label:'All labels'}, ...labels.map(l=>({value:l,label:l}))]}
            onChange={v=>safeSetFilter({ label: v })}
          />
          <Dropdown
            value={filter.sort}
            display={val => ({none:'Sort', dueAsc:'Due date ↑', dueDesc:'Due date ↓'})[val] || 'Sort'}
            options={[
              { value:'none', label:'Sort' },
              { value:'dueAsc', label:'Due date ↑' },
              { value:'dueDesc', label:'Due date ↓' },
            ]}
            onChange={v=>safeSetFilter({ sort: v })}
          />
        </div>
      </div>
    </div>
  )
}

function Chip({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`h-8 px-3 rounded-lg text-sm border ${active ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'border-default text-gray-600 hover:bg-gray-50'}`}
    >{children}</button>
  )
}

function Dropdown({ value, options, onChange, display }) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef(null)
  React.useEffect(() => {
    function onDoc(e){ if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])
  const label = (typeof display === 'function' ? display(value) : value) || ''
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={()=>setOpen(o=>!o)}
        className="h-9 px-3 rounded-lg border border-default bg-white text-sm inline-flex items-center gap-2 hover:bg-gray-50 shadow-sm"
      >
        <span>{label}</span>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" className={`transition-transform ${open?'rotate-180':''}`}><path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 min-w-40 bg-white border border-default rounded-lg shadow-lg py-1 z-30">
          {options.map(opt => {
            const selected = value===opt.value
            return (
              <button
                key={opt.value}
                onClick={()=>{ onChange(opt.value); setOpen(false) }}
                className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between ${
                  selected ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>{opt.label}</span>
                {selected && (
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M5 10.5l3.5 3L15 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
