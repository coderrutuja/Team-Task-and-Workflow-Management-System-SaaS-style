import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'

export default function Login() {
  const [email, setEmail] = useState('admin@example.com')
  const [password, setPassword] = useState('admin123')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.login(email, password)
      navigate('/dashboard', { replace: true })
    } catch (e) {
      setError(e.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-20">
      <div className="surface border border-default rounded-2xl p-6">
        <h1 className="text-lg font-semibold mb-4">Sign in</h1>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="text-sm text-gray-600">Email</label>
            <input value={email} onChange={e=>setEmail(e.target.value)} type="email" className="mt-1 w-full h-10 border border-default rounded-lg px-3" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Password</label>
            <div className="relative mt-1">
              <input
                value={password}
                onChange={e=>setPassword(e.target.value)}
                type={showPwd ? 'text' : 'password'}
                className="w-full h-10 border border-default rounded-lg px-3 pr-10"
              />
              <button type="button" onClick={()=>setShowPwd(v=>!v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-600 hover:text-gray-800">
                {showPwd ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          {error ? <div className="text-red-600 text-sm">{error}</div> : null}
          <button disabled={loading} className="h-10 w-full rounded-lg bg-indigo-600 text-white">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
          <div className="text-sm text-center text-gray-600">
            Don’t have an account? <Link to="/auth/register" className="text-indigo-600 hover:text-indigo-700">Create</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
