import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTasksStore } from '../store/useTasksStore'
import { Plus, KanbanSquare, List as ListIcon, Table as TableIcon, Calendar, Clock } from 'lucide-react'
import { api } from '../lib/api'

function StatusPill({ status }) {
  const s = (status || '').toLowerCase()
  const styles = {
    todo: 'border-amber-200 bg-amber-50 text-amber-700',
    doing: 'border-sky-200 bg-sky-50 text-sky-700',
    done: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  }
  const label = s ? s.toUpperCase() : 'UNKNOWN'
  const cls = styles[s] || 'border-gray-200 bg-gray-50 text-gray-700'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border ${cls}`}>{label}</span>
  )
}

export default function Dashboard() {
  const openTask = useTasksStore(s => s.openTask)
  const selectedProjectId = useTasksStore(s => s.selectedProjectId)

  const [summary, setSummary] = useState({ total: 0, todo: 0, doing: 0, done: 0, upcoming: 0, recent: [], topLabels: [], spark: [], perMember: [], onTimeRate: 0 })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!selectedProjectId) { setSummary({ total:0,todo:0,doing:0,done:0,upcoming:0,recent:[],topLabels:[],spark:[], perMember: [], onTimeRate: 0 }); return }
    ;(async () => {
      setLoading(true)
      try {
        const data = await api.getProjectSummary(selectedProjectId)
        if (!cancelled) setSummary(data)
      } catch {
        if (!cancelled) setSummary(prev => prev)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [selectedProjectId])

  const { total, todo, doing, done, upcoming, recent, topLabels, spark, perMember, onTimeRate } = summary

  return (
    <div className="space-y-6">
      {/* Project summary + top labels */}
      <div className="surface border border-default rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-600 inline-flex items-center justify-center font-semibold">P</div>
          <div className="min-w-0">
            <div className="text-sm text-gray-500">Current project</div>
            <div className="font-medium text-gray-800 truncate">{selectedProjectId || 'No project selected'}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(() => {
            const items = topLabels.length ? topLabels : []
            const visible = items.slice(0,4)
            const more = Math.max(items.length - visible.length, 0)
            return (
              <>
                {visible.map(([label,count]) => (
                  <span key={label} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border border-default bg-white text-gray-700 shadow-sm">
                    {label}
                    <span className="text-gray-500">{count}</span>
                  </span>
                ))}
                {more>0 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs border border-default bg-white text-gray-600 shadow-sm">+{more}</span>
                )}
              </>
            )
          })()}
        </div>
        <div className="ml-auto w-full sm:w-auto flex items-center gap-2 justify-end">
          <Link to="/projects" className="h-8 px-3 inline-flex items-center gap-2 rounded-lg border border-default text-sm hover:bg-gray-50">Manage projects</Link>
        </div>
      </div>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold text-gray-800">Dashboard</h1>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link to="/tasks/kanban" className="h-9 px-3 inline-flex items-center gap-2 rounded-lg border border-default text-sm hover:bg-gray-50">
            <KanbanSquare size={16} /> Board
          </Link>
          <button onClick={()=>openTask(null)} className="h-9 px-3 inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 w-full sm:w-auto">
            <Plus size={16} /> Add Task
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total tasks" value={total} tint="indigo" spark={spark} />
        <StatCard label="To do" value={todo} tint="amber" />
        <StatCard label="Doing" value={doing} tint="sky" />
        <StatCard label="Done" value={done} tint="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="surface border border-default rounded-2xl p-4 lg:col-span-2 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-gray-800">Recent tasks</h2>
            <Link to="/tasks/list" className="text-sm text-indigo-600 hover:text-indigo-700">View all</Link>
          </div>
          <div className="divide-y divide-default">
            {recent.length === 0 && (
              <div className="text-sm text-gray-500 py-8 text-center">No tasks yet</div>
            )}
            {recent.map(t => (
              <div key={t.id} className="flex items-center justify-between py-3 hover:bg-gray-50/40 rounded-lg px-2 -mx-2 transition-colors">
                <div className="min-w-0">
                  <div className="font-medium text-gray-800 truncate">{t.title}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-3 mt-0.5">
                    <StatusPill status={t.status} />
                    {t.due && <span className="inline-flex items-center gap-1"><Calendar size={14} />{new Date(t.due).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={()=>openTask(t.id)} className="h-8 px-3 inline-flex items-center rounded-lg border border-default text-sm hover:bg-gray-50">Open</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="surface border border-default rounded-2xl p-4 shadow-sm">
          <h2 className="font-medium text-gray-800 mb-3">Upcoming this week</h2>
          <div className="text-3xl font-semibold text-gray-800">{upcoming}</div>
          <div className="text-sm text-gray-500 mt-1">Tasks with due dates in the next 7 days</div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Link to="/tasks/kanban" className="h-9 px-3 inline-flex items-center justify-center gap-2 rounded-lg border border-default text-sm hover:bg-gray-50"><KanbanSquare size={14}/>Kanban</Link>
            <Link to="/tasks/list" className="h-9 px-3 inline-flex items-center justify-center gap-2 rounded-lg border border-default text-sm hover:bg-gray-50"><ListIcon size={14}/>List</Link>
            <Link to="/tasks/table" className="h-9 px-3 inline-flex items-center justify-center gap-2 rounded-lg border border-default text-sm hover:bg-gray-50"><TableIcon size={14}/>Table</Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="surface border border-default rounded-2xl p-4 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-gray-800">Team performance</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2 pr-2">Member</th>
                  <th className="py-2 pr-2">To do</th>
                  <th className="py-2 pr-2">Doing</th>
                  <th className="py-2 pr-2">Done</th>
                </tr>
              </thead>
              <tbody>
                {(perMember||[]).length === 0 ? (
                  <tr><td className="py-3 text-gray-500" colSpan={4}>No members yet</td></tr>
                ) : (
                  perMember.map(row => (
                    <tr key={row.userId} className="border-t border-default">
                      <td className="py-2 pr-2 text-gray-800">{row.userId}</td>
                      <td className="py-2 pr-2">{row.todo}</td>
                      <td className="py-2 pr-2">{row.doing}</td>
                      <td className="py-2 pr-2">{row.done}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="surface border border-default rounded-2xl p-4 shadow-sm">
          <h2 className="font-medium text-gray-800 mb-2">On-time completion</h2>
          <div className="text-3xl font-semibold text-gray-800">{onTimeRate}%</div>
          <div className="text-sm text-gray-500 mt-1">Share of done tasks completed by due date</div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, tint = 'indigo', spark = [] }) {
  const color = {
    indigo: 'text-indigo-600 bg-indigo-50',
    amber: 'text-amber-600 bg-amber-50',
    sky: 'text-sky-600 bg-sky-50',
    emerald: 'text-emerald-600 bg-emerald-50'
  }[tint] || 'text-gray-600 bg-gray-50'
  return (
    <div className="surface border border-default rounded-2xl p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <div className="text-2xl font-semibold text-gray-900">{value}</div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${color}`}>Today</span>
      </div>
      {Array.isArray(spark) && spark.length > 0 && (
        <div className="mt-3 h-8 flex items-end gap-1.5">
          {(() => {
            const max = Math.max(...spark, 1)
            return spark.map((v, i) => (
              <div
                key={i}
                className="flex-1 bg-indigo-100 rounded-sm"
                style={{ height: `${Math.max(10, Math.round((v / max) * 100))}%` }}
              >
                <div className="w-full h-full bg-indigo-500/70 rounded-sm" />
              </div>
            ))
          })()}
        </div>
      )}
    </div>
  )
}
