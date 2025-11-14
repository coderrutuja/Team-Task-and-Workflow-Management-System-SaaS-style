import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.register(name, email, password)
      navigate('/dashboard', { replace: true })
    } catch (e) {
      setError(e.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="surface border border-default rounded-2xl p-6">
      <h1 className="text-lg font-semibold mb-4">Create account</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="text-sm text-gray-600">Name</label>
          <input value={name} onChange={e=>setName(e.target.value)} className="mt-1 w-full h-10 border border-default rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
        </div>
        <div>
          <label className="text-sm text-gray-600">Email</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} type="email" className="mt-1 w-full h-10 border border-default rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
        </div>
        <div>
          <label className="text-sm text-gray-600">Password</label>
          <div className="relative mt-1">
            <input
              value={password}
              onChange={e=>setPassword(e.target.value)}
              type={showPwd ? 'text' : 'password'}
              className="w-full h-10 border border-default rounded-lg px-3 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <button type="button" onClick={()=>setShowPwd(v=>!v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-600 hover:text-gray-800">
              {showPwd ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        {error ? <div className="text-red-600 text-sm">{error}</div> : null}
        <button disabled={loading} className="h-10 w-full rounded-lg bg-indigo-600 text-white">
          {loading ? 'Creating...' : 'Create account'}
        </button>
        <div className="text-sm text-gray-600 text-center">Already have an account? <Link className="text-indigo-600" to="/auth/login">Sign in</Link></div>
      </form>
    </div>
  )
}
