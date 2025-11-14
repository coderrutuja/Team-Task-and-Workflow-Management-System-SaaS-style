import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import Topbar from './components/layout/Topbar'
import { useEffect, useState } from 'react'
import Dashboard from './routes/Dashboard'
import Tasks from './routes/Tasks'
import TaskModal from './components/modal/TaskModal'
import Login from './routes/Login'
import AuthLayout from './components/layout/AuthLayout'
import Register from './routes/Register'
import Toasts from './components/feedback/Toasts'
import Projects from './routes/Projects'
import Groups from './routes/Groups'
import AdminUsers from './routes/AdminUsers'

export default function App() {
  const authed = !!localStorage.getItem('tm_token')
  return (
    <>
      <Routes>
        <Route path="/auth/*" element={<AuthLayout />}> 
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
        </Route>

        <Route path="/*" element={<AppShell authed={authed} />} />
      </Routes>
      <Toasts />
    </>
  )
}

function AppShell({ authed }) {
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const sidebarWidth = isMobile ? 0 : (collapsed ? 80 : 260)
  useEffect(() => {
    function handle() {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      setCollapsed(mobile ? true : collapsed)
      if (!mobile) setMobileOpen(false)
    }
    handle()
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])
  return (
    <div
      className="h-full grid"
      style={{ gridTemplateColumns: `${sidebarWidth}px 1fr`, transition: 'grid-template-columns 200ms ease' }}
    >
      <aside className="border-r border-default surface overflow-hidden hidden lg:block">
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      </aside>
      <main className="flex flex-col min-w-0">
        <Topbar onMenu={()=>setMobileOpen(true)} />
        <div className="p-4 sm:p-6 max-w-[1280px] mx-auto w-full min-w-0">
          <Routes>
            <Route path="/" element={<Navigate to={authed ? '/tasks' : '/auth/login'} replace />} />
            <Route path="/dashboard" element={authed ? <Dashboard /> : <Navigate to="/auth/login" replace />} />
            <Route path="/projects" element={authed ? <Projects /> : <Navigate to="/auth/login" replace />} />
            <Route path="/groups" element={authed ? <Groups /> : <Navigate to="/auth/login" replace />} />
            <Route path="/tasks/*" element={authed ? <Tasks /> : <Navigate to="/auth/login" replace />} />
            <Route path="/admin/users" element={authed ? <AdminUsers /> : <Navigate to="/auth/login" replace />} />
          </Routes>
        </div>
        <TaskModal />
      </main>

      {/* Mobile drawer */}
      {isMobile && mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/30" onClick={()=>setMobileOpen(false)} aria-hidden="true" />
          <div className="absolute left-0 top-0 bottom-0 w-[280px] bg-white border-r border-default shadow-xl animate-[slideIn_.2s_ease-out]">
            <Sidebar collapsed={false} setCollapsed={()=>{}} />
          </div>
        </div>
      )}
    </div>
  )
}