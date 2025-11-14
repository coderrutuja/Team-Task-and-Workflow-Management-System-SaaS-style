import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { format } from 'date-fns'
import Badge from '../common/Badge'
import { Tag, MessageSquare, Paperclip } from 'lucide-react'
import AvatarGroup from '../common/AvatarGroup'
import { members as membersMap } from '../../mocks/members'
import { useTasksStore } from '../../store/useTasksStore'

export default function TaskCard({ task, index, columnId, overlay, userMap = {} }) {
  const id = task.id
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, data: { index, columnId }, disabled: overlay })
  const openTask = useTasksStore(s => s.openTask)

  const style = {
    transform: transform ? CSS.Transform.toString(transform) : undefined,
    transition,
    opacity: isDragging ? 0.6 : 1,
    touchAction: 'none'
  }

  const people = (task.members || []).map(id => (userMap?.[String(id)] || membersMap[id])).filter(Boolean)
  const dueInfo = getDueInfo(task.due)

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      id={`${columnId}__${index}`} /* used as drop target id */
      onDoubleClick={() => openTask(task.id)}
      tabIndex={0}
      className={`relative p-3 rounded-xl border border-default bg-white select-none group transition-all duration-150 cursor-grab active:cursor-grabbing outline-none ${overlay ? 'shadow-xl shadow-gray-900/10 ring-1 ring-gray-900/5' : 'hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-2 focus-visible:ring-indigo-200'}`}
    >
      <div className={`flex items-start justify-between ${(!overlay && isDragging) ? 'opacity-0' : ''}`}>
        <div className="text-[13px] font-medium leading-5 pr-2">{task.title}</div>
        <div className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
          <button className="h-6 w-6 grid place-items-center rounded-md hover:bg-gray-100 text-gray-500" aria-label="More">⋯</button>
          <button className="h-6 w-6 grid place-items-center rounded-md text-gray-400" aria-label="Drag">↕</button>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-600">
        {task.labels?.slice(0,2).map((l, i) => (
          <Badge key={i} color={labelColor(l)}>{l}</Badge>
        ))}
        {Array.isArray(task.labels) && task.labels.length > 2 && (
          <span className="inline-flex items-center gap-1 text-gray-500"><Tag className="h-3 w-3"/>+{task.labels.length - 2}</span>
        )}
        {task.due && (
          <>
            <span className="text-gray-500">Due {format(new Date(task.due), 'dd MMM yyyy')}</span>
            {dueInfo && dueInfo.badge ? (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full border ${dueInfo.badge}`}>{dueInfo.label}</span>
            ) : null}
          </>
        )}
      </div>
      <div className={`mt-3 flex items-center justify-between ${(!overlay && isDragging) ? 'opacity-0' : ''}`}>
        <AvatarGroup users={people} size={6} />
        <div className="flex items-center gap-3 text-[11px] text-gray-500">
          <span className="inline-flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5"/>2</span>
          <span className="inline-flex items-center gap-1"><Paperclip className="h-3.5 w-3.5"/>1</span>
        </div>
      </div>
      {(!overlay && isDragging) && (
        <div className="absolute inset-0 rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/40 pointer-events-none" />
      )}
    </div>
  )
}

function labelColor(label) {
  const l = label.toLowerCase()
  if (l.includes('urgent') || l.includes('high')) return 'red'
  if (l.includes('review') || l.includes('internal')) return 'indigo'
  if (l.includes('marketing')) return 'violet'
  if (l.includes('done') || l.includes('success')) return 'green'
  if (l.includes('warn') || l.includes('bug')) return 'amber'
  return 'gray'
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