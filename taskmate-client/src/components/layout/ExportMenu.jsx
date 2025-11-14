import React from 'react'
import { useTasksStore } from '../../store/useTasksStore'
import { api } from '../../lib/api'

export default function ExportMenu(){
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
