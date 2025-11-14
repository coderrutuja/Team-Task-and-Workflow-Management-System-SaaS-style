import { NavLink, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { useTasksStore } from '../../store/useTasksStore'
import Dropdown from '../common/Dropdown'
import { LayoutDashboard, KanbanSquare, ChevronDown, ChevronRight, ChevronLeft, FolderCog, Users, Shield } from 'lucide-react'
import logo from '../../assets/meowow.png'

export default function Sidebar({ collapsed = false, setCollapsed = () => {} }) {
  const [openMain, setOpenMain] = useState(true)
  const [openLabels, setOpenLabels] = useState(true)
  const sampleLabels = ['bug', 'feature', 'urgent', 'review']
  const me = api.getUser()
  const isAdmin = String(me?.role) === 'admin'
  return (
    <div className={`h-full flex flex-col ${collapsed ? 'p-3' : 'p-4'} gap-4 bg-white`}> 
      <div className="flex items-center gap-2">
        <img src={logo} alt="Code Crafters" className={`${collapsed ? 'h-8 w-8' : 'h-8 w-auto'}`} />
        {!collapsed && <span className="font-semibold tracking-[-0.01em] text-gray-800">Taskmate</span>}
        <button
          onClick={() => setCollapsed(v => !v)}
          className={`ml-auto rounded-lg border border-default hover:bg-gray-50 ${collapsed ? 'h-8 w-8 grid place-items-center' : 'h-8 px-2'}`}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {!collapsed && <ProjectSwitcher />}

      {!collapsed && <SectionHeader open={openMain} onToggle={()=>setOpenMain(v=>!v)} title="Main Menu" />}
      {(collapsed || openMain) && (
        <nav className="flex flex-col gap-1 text-sm">
          <Item collapsed={collapsed} to="/dashboard" label="Dashboard" icon={<LayoutDashboard className="h-4 w-4" />} />
          <Item collapsed={collapsed} to="/tasks" label="Tasks" icon={<KanbanSquare className="h-4 w-4" />} />
          <Item collapsed={collapsed} to="/projects" label="Projects" icon={<FolderCog className="h-4 w-4" />} />
          <Item collapsed={collapsed} to="/groups" label="Groups" icon={<Users className="h-4 w-4" />} />
          {isAdmin && <Item collapsed={collapsed} to="/admin/users" label="Admin · Users" icon={<Shield className="h-4 w-4" />} />}
        </nav>
      )}

      {!collapsed && <SectionHeader open={openLabels} onToggle={()=>setOpenLabels(v=>!v)} title="Labels" />}
      {!collapsed && openLabels && (
        <div className="flex flex-wrap gap-1">
          {sampleLabels.map(l => (
            <span key={l} className="px-2 py-1 rounded-full bg-gray-50 border border-default text-[11px] text-gray-700">{l}</span>
          ))}
        </div>
      )}

      <div className="mt-auto text-xs text-gray-400">{collapsed ? '' : 'Taskmate'}</div>
    </div>
  )
}

function Item({ to, label, icon, collapsed }){
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `relative ${collapsed ? 'justify-center' : ''} px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${isActive ? 'bg-indigo-50 text-indigo-700 border-l-2 border-indigo-600' : 'text-gray-700 hover:bg-gray-50'}`}
      aria-label={label}
      title={collapsed ? label : undefined}
    >
      <span className={`inline-flex items-center justify-center ${collapsed ? 'h-8 w-8' : 'h-5 w-5'}`}>{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  )
}

function ProjectSwitcher(){
  const selected = useTasksStore(s => s.selectedProjectId)
  const setSelected = useTasksStore(s => s.setSelectedProjectId)
  const setLoading = useTasksStore(s => s.setLoading)
  const setTasks = useTasksStore(s => s.setTasks)
  const [projects, setProjects] = useState([])
  const current = projects.find(p => String(p._id) === String(selected))

  useEffect(() => {
    api.getProjects({ status: 'all', page: 1, limit: 1000 }).then(setProjects).catch(()=>{})
  }, [])

  async function onChange(e){
    const id = e.target.value
    setSelected(id)
    setLoading(true)
    try {
      if (id === '_all') {
        const active = (projects || []).filter(p => p.status === 'active')
        const all = []
        for (const p of active) {
          try { const items = await api.getTasksByProject(p._id); all.push(...items) } catch {}
        }
        setTasks(all)
      } else if (id) {
        const items = await api.getTasksByProject(id)
        setTasks(items)
      } else {
        setTasks([])
      }
    } finally { setLoading(false) }
  }

  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">Project</div>
      <Dropdown
        value={selected ?? ''}
        options={[{ value: '_all', label: 'Anything (all projects)' }, { value: '', label: 'Select project…' }, ...projects.map(p => ({ value: String(p._id), label: p.title }))]}
        onChange={(v)=> onChange({ target: { value: v } })}
      />
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {selected === '_all' ? <span className="text-xs text-gray-600">All active projects</span> : current ? <StatusBadge status={current.status} /> : <span className="text-xs text-gray-400">No project selected</span>}
        </div>
        <Link to="/projects" className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-1"><FolderCog className="h-3.5 w-3.5"/>Manage projects</Link>
      </div>
    </div>
  )
}

function StatusBadge({ status }){
  const map = {
    active: 'bg-green-50 text-green-700 border-green-200',
    on_hold: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    completed: 'bg-gray-100 text-gray-700 border-gray-200'
  }
  const cls = map[status] || 'bg-gray-50 text-gray-700 border-default'
  return <span className={`px-2 py-0.5 rounded-full text-[11px] border ${cls}`}>{status?.replace('_',' ') || 'unknown'}</span>
}

function SectionHeader({ title, open, onToggle }){
  return (
    <button onClick={onToggle} className="w-full flex items-center justify-between text-xs text-gray-500">
      <span>{title}</span>
      {open ? <ChevronDown className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}
    </button>
  )
}
