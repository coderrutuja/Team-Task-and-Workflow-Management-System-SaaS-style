import { Outlet, Link } from 'react-router-dom'
import logo from '../../assets/meowow.png'

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Link to="/auth/login" className="inline-block">
            <img src={logo} alt="Code Crafter Services" className="h-10 w-auto mx-auto" />
          </Link>
        </div>
        <Outlet />
        <div className="mt-8 text-center text-xs text-gray-500">© {new Date().getFullYear()} Taskmate</div>
      </div>
    </div>
  )
}
