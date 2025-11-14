import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import User from '../models/User.js'
import bcrypt from 'bcryptjs'

const router = Router()

// List users for selection in UI (restrict to admin/manager)
router.get('/', requireAuth, requireRole('admin','manager'), async (req, res) => {
  const { q, role, status, ids, page = 1, limit = 50 } = req.query
  const match = {}
  if (ids) {
    const list = String(ids).split(',').map(s=>s.trim()).filter(Boolean)
    match._id = { $in: list }
  }
  if (q) match.$or = [
    { name: new RegExp(q, 'i') },
    { email: new RegExp(q, 'i') }
  ]
  if (role && role !== 'all') match.role = role
  if (status && status !== 'all') match.status = status
  const p = Math.max(1, parseInt(page))
  const l = Math.min(100, Math.max(1, parseInt(limit)))
  const [items, total] = await Promise.all([
    User.find(match).sort({ name: 1 }).skip((p-1)*l).limit(l).select('_id name email role status avatarUrl'),
    User.countDocuments(match)
  ])
  res.json({ items, total, page: p, limit: l })
})

export default router

// Minimal user info by ids (auth only)
router.get('/min/by-ids', requireAuth, async (req, res) => {
  const { ids = '' } = req.query
  const list = String(ids).split(',').map(s=>s.trim()).filter(Boolean)
  if (!list.length) return res.json([])
  const items = await User.find({ _id: { $in: list } }).select('_id name email avatarUrl role status')
  res.json(items)
})

// Get single user (admin only)
router.get('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const u = await User.findById(req.params.id).select('_id name email role status avatarUrl createdAt updatedAt')
  if (!u) return res.status(404).json({ error: 'Not found' })
  res.json(u)
})

// Admin: create user
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, email, password, role = 'member', status = 'active' } = req.body || {}
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' })
  const existing = await User.findOne({ email })
  if (existing) return res.status(409).json({ error: 'Email already registered' })
  const passwordHash = await bcrypt.hash(password, 10)
  const u = await User.create({ name, email, passwordHash, role, status })
  res.status(201).json({ _id: u._id, name: u.name, email: u.email, role: u.role, status: u.status })
})

// Admin: update user (name, role, avatar, status)
router.patch('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, role, status, avatarUrl } = req.body || {}
  const u = await User.findByIdAndUpdate(
    req.params.id,
    { $set: { name, role, status, avatarUrl } },
    { new: true }
  ).select('_id name email role status avatarUrl')
  if (!u) return res.status(404).json({ error: 'Not found' })
  res.json(u)
})

// Admin: set status (activate/deactivate)
router.patch('/:id/status', requireAuth, requireRole('admin'), async (req, res) => {
  const { status } = req.body || {}
  if (!['active','inactive'].includes(status)) return res.status(400).json({ error: 'Invalid status' })
  const u = await User.findByIdAndUpdate(
    req.params.id,
    { $set: { status } },
    { new: true }
  ).select('_id name email role status')
  if (!u) return res.status(404).json({ error: 'Not found' })
  res.json(u)
})

// Admin: reset password
router.patch('/:id/password', requireAuth, requireRole('admin'), async (req, res) => {
  const { password } = req.body || {}
  if (!password || String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })
  const passwordHash = await bcrypt.hash(password, 10)
  const u = await User.findByIdAndUpdate(
    req.params.id,
    { $set: { passwordHash } },
    { new: true }
  ).select('_id name email role status')
  if (!u) return res.status(404).json({ error: 'Not found' })
  res.json({ ok: true })
})
