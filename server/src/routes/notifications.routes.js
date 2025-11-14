import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import Notification from '../models/Notification.js'
import Task from '../models/Task.js'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  const { page = 1, limit = 50 } = req.query
  const p = Math.max(1, parseInt(page))
  const l = Math.min(100, Math.max(1, parseInt(limit)))
  const [items, total] = await Promise.all([
    Notification.find({ user: req.user.id }).sort({ createdAt: -1 }).skip((p-1)*l).limit(l),
    Notification.countDocuments({ user: req.user.id })
  ])
  const unread = await Notification.countDocuments({ user: req.user.id, readAt: null })
  res.json({ items, total, unread, page: p, limit: l })
})

router.patch('/:id/read', requireAuth, async (req, res) => {
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, { $set: { readAt: new Date() } }, { new: true })
  if (!n) return res.status(404).json({ error: 'Not found' })
  res.json(n)
})

// Manual trigger to generate due/overdue notifications for the next 1 day window
router.post('/trigger-due', requireAuth, requireRole('admin','manager'), async (req, res) => {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  const overdue = await Task.find({ dueDate: { $lt: now }, status: { $ne: 'done' } })
  const duetomorrow = await Task.find({ dueDate: { $gte: now, $lt: tomorrow }, status: { $ne: 'done' } })
  const payloads = []
  function pushFor(task, title, body) {
    const users = Array.isArray(task.assignees) && task.assignees.length ? task.assignees : [task.createdBy].filter(Boolean)
    for (const u of users) {
      payloads.push({ user: u, type: 'alert', title, body, data: { taskId: String(task._id) } })
    }
  }
  overdue.forEach(t => pushFor(t, 'Task overdue', t.title))
  duetomorrow.forEach(t => pushFor(t, 'Task due soon', t.title))
  if (payloads.length) await Notification.insertMany(payloads)
  res.json({ generated: payloads.length })
})

export default router
