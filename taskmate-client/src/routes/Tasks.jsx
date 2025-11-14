import React from 'react'
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
import { PanelsTopLeft, List as ListIcon, Table as TableIcon } from 'lucide-react'
import KanbanBoard from '../components/kanban/KanbanBoard'
import ListView from '../components/list/ListView'
import TableView from '../components/table/TableView'
import PageHeader from '../components/layout/PageHeader'

export default function Tasks() {
  const location = useLocation()
  return (
    <div className="space-y-4">
      <PageHeader title="Task" actions />

      <div className="surface border border-default rounded-xl px-3 py-2">
        <div className="flex items-center gap-5 h-9">
          <Tab to="/tasks/kanban" end label="Kanban" Icon={PanelsTopLeft} />
          <Tab to="/tasks/list" label="List" Icon={ListIcon} />
          <Tab to="/tasks/table" label="Table" Icon={TableIcon} />
        </div>
      </div>

      <ViewFade locationKey={location.pathname}>
        <Routes location={location}>
          <Route index element={<Navigate to="kanban" replace />} />
          <Route path="kanban" element={<KanbanBoard />} />
          <Route path="list" element={<ListView />} />
          <Route path="table" element={<TableView />} />
        </Routes>
      </ViewFade>
    </div>
  )
}

function Tab({ to, label, end = false, Icon }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `relative pb-2 px-1 text-[13px] leading-6 inline-flex items-center gap-1.5 transition-colors duration-300 ease-out ${
          isActive ? 'text-indigo-600 font-semibold' : 'text-gray-600 hover:text-gray-800'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {Icon ? <Icon size={14} strokeWidth={2} /> : null}
          <span className="tracking-[-0.01em]">{label}</span>
          <span
            className={`absolute left-0 bottom-0 h-[2px] rounded-full origin-left transition-transform duration-300 ease-out transform ${
              isActive ? 'bg-indigo-600 w-full scale-x-100' : 'bg-indigo-600 w-full scale-x-0'
            }`}
          />
        </>
      )}
    </NavLink>
  )
}

function ViewFade({ children, locationKey }) {
  const [visible, setVisible] = React.useState(false)
  React.useEffect(() => {
    setVisible(false)
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [locationKey])
  return (
    <div className={`transition-all duration-300 ease-out transform ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}>
      {children}
    </div>
  )
}