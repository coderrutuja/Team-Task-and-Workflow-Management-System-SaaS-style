import { useMemo } from 'react'
import { useTasksStore } from '../../store/useTasksStore'
import Badge from '../common/Badge'
import Skeleton from '../feedback/Skeleton'
import { Tag } from 'lucide-react'

function applyFilter(tasks, filter) {
  const q = filter?.q?.toLowerCase() || ''
  let arr = (tasks || []).filter(t => {
    const matchesQ = q ? (t.title?.toLowerCase().includes(q) || (t.labels||[]).some(l => String(l).toLowerCase().includes(q))) : true
    const matchesStatus = filter?.status === 'all' ? true : t.status === filter?.status
    return matchesQ && matchesStatus
  })
  if (filter?.sort === 'dueAsc') arr.sort((a,b)=>new Date(a.due||0)-new Date(b.due||0))
  else if (filter?.sort === 'dueDesc') arr.sort((a,b)=>new Date(b.due||0)-new Date(a.due||0))
  return arr
}

export default function TableView() {
  const tasksRaw = useTasksStore(s => s.tasks)
  const filter = useTasksStore(s => s.filter)
  const loading = useTasksStore(s => s.loading)
  const tasks = useMemo(() => applyFilter(tasksRaw, filter), [tasksRaw, filter])
  return (
    <div className="surface border border-default rounded-2xl overflow-auto">
      <table className="min-w-[900px] w-full text-sm">
        <thead className="bg-gray-50 text-gray-600 sticky top-0 z-10">
          <tr>
            <th className="text-left px-4 py-3 w-[40%]">Task Name</th>
            <th className="text-left px-4 py-3">Due Date</th>
            <th className="text-left px-4 py-3">Labels</th>
            <th className="text-left px-4 py-3">Status</th>
            <th className="text-left px-4 py-3">Member</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 6 }).map((_, idx) => (
              <tr key={idx} className={`${idx % 2 ? 'bg-gray-50/60' : 'bg-white'} border-t border-default`}>
                <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                <td className="px-4 py-3"><div className="flex gap-2"><Skeleton className="h-6 w-6 rounded-full" /><Skeleton className="h-6 w-6 rounded-full" /></div></td>
              </tr>
            ))
          ) : tasks.map((t, idx) => (
            <tr key={t.id} className={`${idx % 2 ? 'bg-gray-50/60' : 'bg-white'} border-t border-default hover:bg-gray-100/40`}>
              <td className="px-4 py-3 max-w-0">
                <div className="truncate" title={t.title}>{t.title}</div>
              </td>
              <td className="px-4 py-3">{t.due || '-'}</td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  {(t.labels||[]).slice(0,3).map((l,i)=>(<Badge key={i}>{l}</Badge>))}
                  {Array.isArray(t.labels) && t.labels.length > 3 && (
                    <span className="inline-flex items-center gap-1 text-gray-500 text-xs ml-1"><Tag className="h-3 w-3"/>+{t.labels.length - 3}</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 capitalize">{t.status}</td>
              <td className="px-4 py-3">
                <div className="flex -space-x-2">
                  {(t.members||[]).slice(0,3).map((m,i)=> (
                    <div key={i} className="w-6 h-6 rounded-full bg-gray-200 text-[10px] grid place-items-center ring-2 ring-white">
                      {String(m).toUpperCase().slice(0,2)}
                    </div>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}