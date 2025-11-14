import { useTasksStore } from '../../store/useTasksStore'

export default function Toasts() {
  const toasts = useTasksStore(s => s.toasts)
  return (
    <div className="fixed top-4 right-4 z-[60] space-y-2">
      {toasts.map(t => (
        <div key={t.id} className={`px-3 py-2 rounded-lg shadow-md border text-sm surface border-default transition-all duration-200 ${
          t.type==='success' ? 'bg-green-50 border-green-200 text-green-700' : t.type==='error' ? 'bg-red-50 border-red-200 text-red-700' : ''
        }`}>
          {t.message}
        </div>
      ))}
    </div>
  )
}
