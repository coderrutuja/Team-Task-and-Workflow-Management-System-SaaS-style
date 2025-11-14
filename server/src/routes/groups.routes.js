import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import ProjectGroup from '../models/ProjectGroup.js'

const router = Router()

// List groups with filters
router.get('/', requireAuth, async (req, res) => {
  const { q, status = 'all', page = 1, limit = 20 } = req.query
  const match = {}
  if (q) match.name = new RegExp(q, 'i')
  if (status && status !== 'all') match.status = status
  const p = Math.max(1, parseInt(page))
  const l = Math.min(100, Math.max(1, parseInt(limit)))
  const [items, total] = await Promise.all([
    ProjectGroup.find(match).sort({ createdAt: -1 }).skip((p-1)*l).limit(l),
    ProjectGroup.countDocuments(match)
  ])
  res.json({ items, total, page: p, limit: l })
})

// Create group (admin/manager)
router.post('/', requireAuth, requireRole('admin','manager'), async (req, res) => {
  const { name, description, status, manager, members } = req.body || {}
  if (!name || !manager) return res.status(400).json({ error: 'name and manager required' })
  const mem = Array.isArray(members) ? members : []
  const doc = await ProjectGroup.create({ name, description, status, manager, members: mem })
  res.status(201).json(doc)
})

// Get single group
router.get('/:id', requireAuth, async (req, res) => {
  const g = await ProjectGroup.findById(req.params.id)
  if (!g) return res.status(404).json({ error: 'Not found' })
  res.json(g)
})

// Update group (admin/manager)
router.patch('/:id', requireAuth, requireRole('admin','manager'), async (req, res) => {
  const { name, description, status, manager, members } = req.body || {}
  const g = await ProjectGroup.findByIdAndUpdate(
    req.params.id,
    { $set: { name, description, status, manager, members } },
    { new: true }
  )
  if (!g) return res.status(404).json({ error: 'Not found' })
  res.json(g)
})

// Delete group (admin/manager)
router.delete('/:id', requireAuth, requireRole('admin','manager'), async (req, res) => {
  const g = await ProjectGroup.findByIdAndDelete(req.params.id)
  if (!g) return res.status(404).json({ error: 'Not found' })
  res.json({ ok: true })
})

export default router
